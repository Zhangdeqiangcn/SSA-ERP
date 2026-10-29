import { create } from 'zustand';
import type { UserRole } from '@/types/settings';
import { approvalFlowDomainApi, APPROVAL_FLOW_PAGE_SIZE } from '@/services/approvalFlowApi';
import { snakeToCamel } from '@/utils/case';
import { hasSession } from '@/stores/persistStorage';

/**
 * 审批流配置单一数据源（全面 store 化 · V2.14；深度定制 · V2.55.19；C1 关系化 · V3.10.0）
 * ------------------------------------------------------------
 * 将审批流配置从 ApprovalFlowTab 的 `defaultFlows` 硬编码 +
 * localStorage `ssa-approval-flows` 收敛到唯一 zustand store。
 * 各业务审批队列（供应商准入 / 采购申请等）与 FlowTracker 通过
 * `approvalFlowConfig.ts` 的读取器统一消费本 store，消除「设置页一份、
 * 读取器又一份 DEFAULT_FLOWS」的双源不一致隐患。
 *
 * ── V3.10.0：C1 第五个域，从 app_state 迁入 D1 关系表 ──────────────
 *
 * ■ 改造前的状态
 *   整域（20 个流程定义 + 全部节点）存在 `app_state` 的一个 JSON 大对象里
 *   （persist name: 'ssa-erp-approval-flows'），实测 6799 字节。
 *   与财务/销售域同款的后果：**换台电脑打开，审批流配置全没了**，
 *   且没有任何报错；更麻烦的是这是**公司级公共配置** ——
 *   张三在设置页把「采购入库」审批关掉，李四那边照样能走，两人看到的是两套世界。
 *
 * ■ 与销售域最大的一处不同：本域的写入点用的是**函数式更新**
 *   销售域 10 个写调用点都是 `store.addXxx(item)` 这类显式方法调用。
 *   审批流则集中在两个页面的 `setFlows(prev => prev.map(...))` ——
 *   拿到的是一整个数组，**落库时需要先算出「谁变了」**（见 commitFlows 注释）。
 *   这也是本域唯一需要新增内部工具的地方。
 *
 * ■ 动手前量化出的一个既有数据缺陷（顺带修掉）
 *   生产库里**只有 13 个流程**，而代码 `DEFAULT_APPROVAL_FLOWS` 有 **20 个**。
 *   具体核实过：少的 7 个（customer / inquiry / comparison / check_task /
 *   inbound_order / outbound_order / quality_inspeCTION）是 V2.91.0 之后才加进
 *   代码的默认值。persist 的 `seedFlows()` 只在「旧 localStorage 没有数据」时
 *   播种，已有数据的库**永远不会补新流程** ——
 *   于是这 7 个审批流在生产环境从来没出现过，用户在设置页也看不到它们。
 *   本轮迁移改成「D1 为空才播种」，首次上线即按当前代码补齐到 20 个。
 *
 * ■ 逐字段比对后保留的一条真实用户改动
 *   13 个库里流程中有 12 个的 `status` 是 `'system'` —— 但这**不是用户改的**，
 *   是 persist 的 v1→v2 迁移（见原 migrate 函数）批量补的标志位。
 *   真正的用户改动只有一处：`inbound.enabled` 从 `false` 改成了 `true`
 *   （用户在设置页启用了「采购入库」审批）。因此首次回填必须**以库里数据为准**，
 *   不能拿代码默认值覆盖 —— 否则这个开关会被打回 false，且用户不会收到任何提示。
 */

/** 审批人类型（SAP Agent Determination 思路：按岗位/层级/具体人定审批人，而非写死一个人） */
export type ApproverType =
  | 'role'          // 角色（如财务主管）
  | 'position'      // 职位（如采购经理）
  | 'supervisor'    // 发起人上级
  | 'dept_head'     // 部门负责人
  | 'specific_user';// 指定用户

/** 会签模式（SAP Flexible Workflow 串行/并行步骤） */
export type ApprovalMode =
  | 'serial'        // 串签：依次审批，全部通过
  | 'parallel'      // 并签：同时审批，全部通过
  | 'or';           // 或签：任一通过即可

/** 条件比较运算符 */
export type ConditionOperator = '>' | '>=' | '<' | '<=' | '==' | '!=' | 'in' | 'not_in';

/** 单条结构化条件（如 金额 > 100000） */
export interface ApprovalCondition {
  field: string;                                  // 条件字段 key（注册于 approvalFlowConfig 的 CONDITION_FIELDS）
  operator: ConditionOperator;
  value: string | number;
}

/** 条件组：组内条件以 and/or 逻辑组合（SAP Release Strategy 特性组合） */
export interface ConditionGroup {
  logic: 'and' | 'or';
  conditions: ApprovalCondition[];
}

/** 跳过规则：when 命中时对该节点执行 skip（跳过）或 auto_approve（自动通过） */
export interface SkipRule {
  when: ConditionGroup;
  action: 'skip' | 'auto_approve';
}

/** 超时升级：节点超过 timeout 小时后升级给 escalateTo 指定的审批人，并通知 notify 角色/用户 */
export interface EscalationRule {
  timeout: number;                 // 升级触发小时数（通常为节点 timeout，可更短）
  escalateTo: ApproverType;
  targetRole?: UserRole;           // escalateTo = role 时生效
  targetUserId?: string;           // escalateTo = specific_user 时生效
  notify?: string[];               // 需通知的角色 id 或用户 id 列表
}

export interface ApprovalNode {
  id: string;
  name: string;
  role: string;                    // 主审批角色 id（向后兼容，单审批人场景）
  roleName: string;                // 主审批角色名称（向后兼容）
  condition?: string;              // 旧版自由文本条件（向后兼容，新配置优先用 conditions）
  timeout?: number;                // 超时小时
  order: number;
  // —— V2.55.19 深度定制新增（全部可选） ——
  approverType?: ApproverType;     // 审批人类型，默认 'role'
  approverRoles?: UserRole[];      // 多角色会签（approverType=role 且 mode 为 parallel/or 时）
  approverUserIds?: string[];      // 指定用户列表（approverType=specific_user 时）
  mode?: ApprovalMode;             // 会签模式，多审批人时生效，默认 'serial'
  conditions?: ConditionGroup;     // 结构化审批条件（取代自由文本 condition）
  skipRule?: SkipRule;             // 跳过/自动通过规则
  escalation?: EscalationRule;     // 超时升级规则
  optional?: boolean;
  fields?: string[];               // 该步骤可编辑/采集的业务字段（物料审批需按步录入主数据字段时使用）
}

/** 兼容历史命名（approvalFlowConfig.ts 使用 ApprovalFlowNode） */
export type ApprovalFlowNode = ApprovalNode;

/** 流程级配置：标准 / 简化 */
export type ApprovalProfile = 'standard' | 'simplified';

/** 流程状态（V2.87.0 自定义审批流） */
export type FlowStatus = 'system' | 'draft' | 'pending' | 'published';

export interface ApprovalFlowConfig {
  id: string;
  module: string;
  moduleLabel: string;
  enabled: boolean;
  profile?: ApprovalProfile;       // 标准 / 简化，默认 'standard'
  nodes: ApprovalNode[];
  /* —— V2.87.0 自定义流程字段（系统预置流程不填或为默认值） —— */
  status?: FlowStatus;             // 默认 'system'
  createdBy?: string;              // 创建人用户 ID
  approvedBy?: string;             // 审批发布人用户 ID
  createdAt?: string;              // 创建时间 ISO
  approvedAt?: string;             // 发布时间 ISO
  orgId?: string;                  // 组织编号（隔离用）
  visibleRoles?: string[];         // 可见角色 ID 列表（空=全部可见）
  description?: string;            // 流程描述
}

/** 条件字段注册表（供 UI 构造结构化条件 + 求值器类型识别），详情见 approvalFlowConfig.ts */
export type ConditionFieldType = 'number' | 'string' | 'enum';

/** 默认审批流（与历史 ApprovalFlowTab 的 defaultFlows 保持一致，并补充 V2.55.19 结构化能力） */
export const DEFAULT_APPROVAL_FLOWS: ApprovalFlowConfig[] = [
  {
    id: 'sales_order', module: 'sales_order', moduleLabel: '销售订单', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'so-1', name: '销售经理审批', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 100000 }] },
      },
      {
        id: 'so-2', name: '财务审批', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 500000 }] },
        optional: true,
      },
    ],
  },
  {
    id: 'purchase_request', module: 'purchase_request', moduleLabel: '采购申请', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'pr-1', name: '部门经理审批', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'dept_head', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 50000 }] },
      },
      {
        id: 'pr-2', name: '财务审批', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'pr-3', name: '总经理审批', role: 'admin', roleName: '系统管理员', timeout: 72, order: 3,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 500000 }] },
        optional: true,
      },
    ],
  },
  {
    id: 'purchase_order', module: 'purchase_order', moduleLabel: '采购订单', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'po-1', name: '采购经理确认', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'position', mode: 'serial',
      },
      {
        id: 'po-2', name: '财务审核', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 200000 }] },
      },
    ],
  },
  {
    id: 'price_approval', module: 'price_approval', moduleLabel: '价格审批', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'pa-1', name: '采购经理审核', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'position', mode: 'serial',
      },
      {
        id: 'pa-2', name: '财务主管审批', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'pa-3', name: '总经理或签', role: 'admin', roleName: '系统管理员', timeout: 48, order: 3,
        approverType: 'role', mode: 'or', approverRoles: ['admin', 'finance_manager'],
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 1000000 }] },
        optional: true,
        escalation: { timeout: 24, escalateTo: 'role', targetRole: 'admin', notify: ['admin'] },
      },
    ],
  },
  {
    id: 'work_order', module: 'work_order', moduleLabel: '生产工单', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'wo-1', name: '生产主管审批', role: 'prod_manager', roleName: '生产主管', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'inbound', module: 'inbound', moduleLabel: '采购入库', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'ib-1', name: '质检确认', role: 'qa_engineer', roleName: '质量工程师', timeout: 8, order: 1,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'outbound', module: 'outbound', moduleLabel: '出库单', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'ob-1', name: '库管审核', role: 'warehouse_keeper', roleName: '库管员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'quality_dispose', module: 'quality_dispose', moduleLabel: '不合格品处置', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'qd-1', name: '质量工程师判定', role: 'qa_engineer', roleName: '质量工程师', timeout: 8, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'qd-2', name: '质量主管审批', role: 'qa_engineer', roleName: '质量工程师', timeout: 24, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 10000 }] },
      },
    ],
  },
  {
    id: 'invoice', module: 'invoice', moduleLabel: '发票', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'iv-1', name: '会计审核', role: 'accountant', roleName: '会计', timeout: 48, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'iv-2', name: '财务主管审批', role: 'finance_manager', roleName: '财务主管', timeout: 72, order: 2,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'payment_plan', module: 'payment_plan', moduleLabel: '付款计划', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'pp-1', name: '财务主管审批', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'pp-2', name: '总经理审批', role: 'admin', roleName: '系统管理员', timeout: 72, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 1000000 }] },
        optional: true,
      },
    ],
  },
  {
    id: 'vendor_register', module: 'vendor_register', moduleLabel: '供应商注册', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'vr-1', name: '采购初审', role: 'buyer', roleName: '采购员', timeout: 48, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'vr-2', name: '质量审核', role: 'qa_engineer', roleName: '质量工程师', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'vr-3', name: '管理员终审', role: 'admin', roleName: '系统管理员', timeout: 72, order: 3,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'material', module: 'material', moduleLabel: '物料新增(外购)', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'mat-1', name: '发起申请（基本属性）', role: 'rd_engineer', roleName: '研发工程师', timeout: 48, order: 1,
        approverType: 'role', mode: 'serial',
        fields: ['name', 'unit', 'specification', 'model', 'makeOrBuy', 'materialType', 'categoryId', 'safetyStock', 'minStock', 'maxStock', 'price', 'currency', 'remarks'],
      },
      {
        id: 'mat-2', name: '采购审核（采购属性）', role: 'buyer', roleName: '采购员', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        fields: ['leadTime', 'moq', 'mpq', 'defaultVendorId', 'defaultVendorName', 'purchaseUnit', 'unitConversion'],
      },
      {
        id: 'mat-3', name: '批准生效', role: 'admin', roleName: '系统管理员', timeout: 72, order: 3,
        approverType: 'role', mode: 'serial',
        fields: [],
      },
    ],
  },
  {
    id: 'material_make', module: 'material_make', moduleLabel: '物料新增(自制)', enabled: true, profile: 'standard',
    nodes: [
      {
        id: 'matm-1', name: '发起申请（基本属性）', role: 'rd_engineer', roleName: '研发工程师', timeout: 48, order: 1,
        approverType: 'role', mode: 'serial',
        fields: ['name', 'unit', 'specification', 'model', 'makeOrBuy', 'materialType', 'categoryId', 'safetyStock', 'minStock', 'maxStock', 'price', 'currency', 'remarks'],
      },
      {
        id: 'matm-2', name: '工艺审核（工艺属性）', role: 'process_engineer', roleName: '工艺工程师', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        fields: ['routing', 'workCenter', 'cycleTime', 'scrapRate', 'inspectionPoint'],
      },
      {
        id: 'matm-3', name: '批准生效', role: 'admin', roleName: '系统管理员', timeout: 72, order: 3,
        approverType: 'role', mode: 'serial',
        fields: [],
      },
    ],
  },
  // V2.91.0 新增模块审批流
  {
    id: 'customer', module: 'customer', moduleLabel: '客户新增', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'cust-1', name: '销售主管审核', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'cust-2', name: '财务备案', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'creditLimit', operator: '>', value: 50000 }] },
        optional: true,
      },
    ],
  },
  {
    id: 'inquiry', module: 'inquiry', moduleLabel: '询价单', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'inq-1', name: '采购经理审核', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'comparison', module: 'comparison', moduleLabel: '比价单', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'cmp-1', name: '采购主管确认', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'cmp-2', name: '财务审批', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'amount', operator: '>', value: 100000 }] },
        optional: true,
      },
    ],
  },
  {
    id: 'check_task', module: 'check_task', moduleLabel: '盘点单', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'ck-1', name: '库管确认', role: 'warehouse_keeper', roleName: '库管员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'ck-2', name: '财务复核', role: 'finance_manager', roleName: '财务主管', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        conditions: { logic: 'and', conditions: [{ field: 'varianceAmount', operator: '>', value: 10000 }] },
        optional: true,
      },
    ],
  },
  {
    id: 'inbound_order', module: 'inbound_order', moduleLabel: '入库单', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'ibo-1', name: '质检确认', role: 'qa_inspector', roleName: '质检员', timeout: 8, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'ibo-2', name: '库管签收', role: 'warehouse_keeper', roleName: '库管员', timeout: 24, order: 2,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'outbound_order', module: 'outbound_order', moduleLabel: '出库单', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'obo-1', name: '销售确认', role: 'buyer', roleName: '采购员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'obo-2', name: '库管出库', role: 'warehouse_keeper', roleName: '库管员', timeout: 24, order: 2,
        approverType: 'role', mode: 'serial',
      },
    ],
  },
  {
    id: 'quality_inspeCTION', module: 'quality_inspeCTION', moduleLabel: '质检报告', enabled: false, profile: 'standard',
    nodes: [
      {
        id: 'qi-1', name: '质检工程师判定', role: 'qa_inspector', roleName: '质检员', timeout: 24, order: 1,
        approverType: 'role', mode: 'serial',
      },
      {
        id: 'qi-2', name: '质量主管确认', role: 'qa_engineer', roleName: '质量工程师', timeout: 48, order: 2,
        approverType: 'role', mode: 'serial',
        optional: true,
      },
    ],
  },
];

/** 深拷贝一份默认流程（避免调用方就地改动污染 DEFAULT_APPROVAL_FLOWS 这个模块级常量） */
const cloneDefaults = (): ApprovalFlowConfig[] =>
  DEFAULT_APPROVAL_FLOWS.map((f) => ({ ...f, nodes: f.nodes.map((n) => ({ ...n })) }));

/** 首次空库回填标记（防多端重复写入，也让「用户删空了」不会被当成需要播种） */
const BACKFILL_FLAG = 'ssa-erp-approval-flows-backfilled';

/** localStorage 在隐私模式 / 无痕下会抛异常，读写一律包一层 */
function flagGet(k: string): string | null {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function flagSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* 忽略 */ }
}

/** 读旧的 Blob（仅用于首次回填，迁完之后这条路径自然废弃） */
function readLegacyFlows(): ApprovalFlowConfig[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-approval-flows');
    if (!raw) return [];
    const st = JSON.parse(raw)?.state;
    if (st && Array.isArray(st.flows) && st.flows.length > 0) return st.flows as ApprovalFlowConfig[];
  } catch { /* ignore */ }
  return [];
}

/** 把接口异常转成强哥看得懂的一句话（不暴露堆栈与状态码术语） */
function readableError(e: any): string {
  const status = e?.response?.status ?? e?.status;
  if (status === 401) return '登录已过期，请重新登录后重试';
  if (status === 403) return '当前账号没有审批流配置的修改权限';
  if (status === 409) return '该流程编号与服务器已有记录重复，请换一个编号';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

/**
 * 归一化一个流程对象，补齐后端契约要求的字段。
 *
 * ★ 为什么必须做（这是本域最容易漏的一处）：
 *   后端 `pickCols` 只写入**值 !== undefined** 的列，`nodes` 不传时
 *   `replaceAllChildren` 会走「未改动」分支 —— 这在**更新**时正是我们要的语义
 *   （只拨开关不清节点）。但**创建**时若不传 nodes，会建出一个零节点的流程，
 *   界面上是个空壳。因此创建路径必须显式带上 `nodes: []`。
 *   同理 `visibleRoles` 不传时父表那列会是 NULL，读回时 `parseJsonArray` 给 `[]`，
 *   但为了前后端表现一致，这里统一补成数组。
 */
function normalizeFlow(f: ApprovalFlowConfig): ApprovalFlowConfig {
  return {
    ...f,
    profile: f.profile ?? 'standard',
    status: f.status ?? 'system',
    nodes: (f.nodes || []).map((n) => ({ ...n, order: n.order ?? 0 })),
    visibleRoles: f.visibleRoles || [],
  };
}

/**
 * 判断两个流程在**存储层面**是否相同（决定要不要发 PUT）。
 *
 * ★ 为什么不能用引用比较：`setFlows(prev => prev.map(f => ...))` 里
 *   `map` 每次都会产生新数组，但**未命中的流程对象是同一个引用** ——
 *   对引用做比较看似可行。真正的坑在 `MaterialApprovalTab.handleSave`：
 *   它对 material 与 material_make 两个流程都构造了新对象
 *   （`{ ...f, nodes: local.steps.map(...) }`），即便用户没改任何东西，
 *   对象引用也变了；若按引用判断就会每次都发两个 PUT，白白触发审计写库。
 *   因此用「序列化后逐字符比较」—— 审批流对象很小（最大数百字节），
 *   20 个流程全比一遍的开销可以忽略，换来的是「只保存真正变了的」。
 */
function sameFlow(a: ApprovalFlowConfig, b: ApprovalFlowConfig): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

interface ApprovalFlowState {
  flows: ApprovalFlowConfig[];

  /**
   * 整体替换流程列表（保持 V2.14 以来的原签名：接受数组或函数式更新）。
   *
   * ★ 语义与改造前完全一致：调用方**不需要**知道这里有网络往返。
   *   内部做「同步先改内存 → 异步只落库真正变了的流程 → 失败回滚」，
   *   因此 `handleCreateSave` 里 `addCustomFlow` 之后立刻
   *   `getState().flows.find(...)` 依然拿得到新流程。
   */
  setFlows: (flows: ApprovalFlowConfig[] | ((prev: ApprovalFlowConfig[]) => ApprovalFlowConfig[])) => void;
  resetFlows: () => void;

  /* —— V2.87.0 自定义审批流方法 —— */
  /** 新建自定义流程（草稿态）。返回新流程 id —— 调用方拿它立刻打开编辑器，故必须同步返回。 */
  addCustomFlow: (flow: Omit<ApprovalFlowConfig, 'status' | 'enabled'>) => string;
  /** 提交审核（draft → pending） */
  submitForApproval: (id: string) => void;
  /** 批准发布（pending → published） */
  approveFlow: (id: string, approverId: string) => void;
  /** 驳回（pending → draft） */
  rejectFlow: (id: string) => void;
  /** 删除自定义流程（仅 draft/pending，不可删 system/published） */
  deleteCustomFlow: (id: string) => void;

  /* —— C1 关系化（V3.10.0）—— */
  /** D1 同步状态（页面可据此显示加载态 / 失败原因） */
  loaded: boolean;
  syncError: string;
  /** 从 D1 拉取全部审批流；空库首次按当前代码默认值播种（补齐历史缺失的 7 个流程） */
  load: () => Promise<void>;
}

export const useApprovalFlowStore = create<ApprovalFlowState>()((set, get) => {
  /**
   * 同步改内存 → 异步只落库「真正变了的」流程 → 失败回滚内存并记下可读原因。
   *
   * ── 为什么这里要算差量，而不是直接整体重写 ──────────────────────
   * 端点是「一条流程一个资源」（PUT /api/approval-flows/:id），
   * 没有「整表替换」语义。而调用方给的是**整个数组**，
   * 所以要逐个比对出 changed / added / removed 三类，分别发 PUT / POST / DELETE。
   *
   * ── 回滚策略：整体还原为一个数组快照 ────────────────────────────
   * 不用「逐条反向操作」—— 一轮 setFlows 可能同时新增+修改+删除多条，
   * 逐条回滚一旦中途再失败就会留下混合状态。直接换回调用前的数组快照最稳，
   * 且界面表现一致（用户看到的是「操作没生效」而不是「一半生效」）。
   *
   * ── 失败必须是吵闹的 ────────────────────────────────────────────
   * 回滚 + 可读中文原因，绝不静默 —— 否则管理员以为配置已保存，
   * 实际全公司还在走旧的审批链，而没人知道。
   */
  const commitFlows = (next: ApprovalFlowConfig[]) => {
    const prev = get().flows;
    set({ flows: next }); // ① 同步改内存（满足「改完立刻读」的隐式依赖）

    const prevById = new Map(prev.map((f) => [f.id, f]));
    const nextById = new Map(next.map((f) => [f.id, f]));

    const added = next.filter((f) => !prevById.has(f.id));
    const removed = prev.filter((f) => !nextById.has(f.id));
    const changed = next.filter((f) => {
      const old = prevById.get(f.id);
      return old && !sameFlow(old, f);
    });

    if (added.length === 0 && removed.length === 0 && changed.length === 0) return;

    // ② 异步落库（不阻塞调用方，也不 await 结果 —— 全部消费方都不依赖返回值）
    void (async () => {
      try {
        for (const f of added) {
          await approvalFlowDomainApi.create(normalizeFlow(f));
        }
        for (const f of changed) {
          // ★ 只改 enabled 等父表字段时，**刻意不带 nodes** ——
          //   后端语义是「不传子数组 = 保持原样」；若这里总把 nodes 一起 PUT，
          //   遇到「用旧版数据编辑后节点被截断」这类问题时会非常难查。
          //   因此只在节点确实变了的时候才带上。
          const old = prevById.get(f.id);
          const nodesChanged = !old || JSON.stringify(old.nodes) !== JSON.stringify(f.nodes);
          await approvalFlowDomainApi.update(f.id, nodesChanged ? f : { ...f, nodes: undefined });
        }
        for (const f of removed) {
          await approvalFlowDomainApi.remove(f.id);
        }
        if (get().syncError) set({ syncError: '' });
      } catch (e: any) {
        set({ flows: prev, syncError: `审批流配置保存到服务器失败，已还原：${readableError(e)}` });
      }
    })();
  };

  /** 把「数组或函数」解析成结果数组（两种调用方式统一处理） */
  const resolve = (
    updater: ApprovalFlowConfig[] | ((prev: ApprovalFlowConfig[]) => ApprovalFlowConfig[])
  ): ApprovalFlowConfig[] =>
    typeof updater === 'function'
      ? (updater as (prev: ApprovalFlowConfig[]) => ApprovalFlowConfig[])(get().flows)
      : updater;

  return {
    // 初始值 = 代码默认流程，**只存在于内存**；load() 成功后被 D1 数据整体覆盖。
    // 保留内存种子是为了「离线 / 未登录时设置页仍可打开」，而不是当成持久层。
    flows: cloneDefaults(),
    loaded: false,
    syncError: '',

    setFlows: (updater) => commitFlows(resolve(updater)),

    /**
     * 恢复默认：把 20 个系统流程的节点/开关重置为代码默认值。
     *
     * ★ 注意它是「逐条还原」而不是「删表重建」：
     *   走 commitFlows 后会算出「哪些流程变了」并发 PUT，
     *   自定义流程（custom-xxx）不在默认列表里，会被判为 removed 而**发 DELETE** ——
     *   这与改造前的行为不同（改造前 resetFlows 直接覆盖整个数组，自定义流程确实会消失），
     *   实际上是一致的：旧版也把自定义流程一起冲掉了，只是没落库而已。
     *   这里保留该行为（按钮叫「恢复默认」，把非系统流程一并清掉是用户预期）。
     */
    resetFlows: () => commitFlows(cloneDefaults()),

    /* —— V2.87.0 自定义审批流方法 —— */
    addCustomFlow: (flow) => {
      const id = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();
      const newFlow: ApprovalFlowConfig = {
        ...flow,
        id,
        status: 'draft',
        enabled: false,
        createdAt: now,
        // ★ 显式给节点数组：创建路径若不带 nodes，后端会插一个零节点的空壳流程
        nodes: (flow.nodes || []).map((n) => ({ ...n, order: n.order ?? 0 })),
        visibleRoles: flow.visibleRoles || [],
      };
      // 同步返回 id（调用方立刻用它 find 出新流程并打开编辑器，见 handleCreateSave）
      commitFlows([...get().flows, newFlow]);
      return id;
    },
    submitForApproval: (id) =>
      commitFlows(
        get().flows.map((f) => (f.id === id && f.status === 'draft' ? { ...f, status: 'pending' } : f))
      ),
    approveFlow: (id, approverId) => {
      const target = get().flows.find((f) => f.id === id);
      commitFlows(
        get().flows.map((f) =>
          f.id === id && f.status === 'pending'
            ? { ...f, status: 'published', enabled: true, approvedBy: approverId, approvedAt: new Date().toISOString() }
            : f
        )
      );
      // 状态变更失败时 commitFlows 已整体回滚并写了 syncError；
      // 这里仅保留原逻辑的「只对 pending 生效」语义（target 仅用于可读性，避免未使用告警）
      void target;
    },
    rejectFlow: (id) =>
      commitFlows(
        get().flows.map((f) => (f.id === id && f.status === 'pending' ? { ...f, status: 'draft' } : f))
      ),
    /**
     * 删除自定义流程（system / published 不可删）。
     *
     * ★ 与改造前的关键差异：旧版只是从数组里 filter 掉。
     *   现在必须**真的调 DELETE**，否则刷新页面流程又回来了（数据还在 D1）。
     *   因此这里用 commitFlows 的差量机制（removed 分支），而不是自己 set() ——
     *   自己 set 的话内存改了、库没改，是最典型的「看起来没问题」缺陷。
     */
    deleteCustomFlow: (id) => {
      const target = get().flows.find((f) => f.id === id);
      if (!target) return;
      // 沿用旧版保护规则：system 与已发布流程不允许删
      if (target.status === 'system' || target.status === 'published') {
        set({ syncError: `「${target.moduleLabel || id}」是系统预置或已发布流程，不允许删除` });
        return;
      }
      commitFlows(get().flows.filter((f) => f.id !== id));
    },

    /**
     * 从 D1 拉取全部审批流。
     *
     * ── 空库播种：本轮顺带修掉的一个既有数据缺陷 ──────────────────
     * 旧 persist 的 `seedFlows()` 只在「旧 localStorage 无数据」时播种，
     * 已用过的库**永远不会补新流程** —— 于是 V2.91.0 之后新增的 7 个默认流程
     * 在生产环境从未出现过（实测库里只有 13 条 vs 代码 20 条）。
     * 现在改为「D1 为空才播种」，首次上线即按当前代码补齐到 20 个。
     *
     * ── 播种来源优先级：旧 Blob > 代码默认值 ──────────────────────
     * 与销售域同款。旧 Blob 里可能有用户配置过的流程
     * （实测生产库唯一的真实改动是 `inbound.enabled: false → true`），
     * 用代码默认值覆盖会把它打回 false 且没有任何提示。
     *
     * flag 落 localStorage：避免多端首次同时打开时互相重复写入，
     * 也避免「用户把流程全删了」之后重新长回来。
     */
    load: async () => {
      // ★ V3.10.1：未登录直接跳过，不发请求。
      //   本 store 走的是**独立端点** `/api/approval-flows`（不经 persistStorage），
      //   因此没有「无 token 回退本地」那层保护；未登录时硬打只会得到 401，
      //   而 401 会触发会话失效处理 → 整页跳转（历史上正是刷新循环的一环）。
      //   启动拉取已由 App.tsx 按登录态驱动，这里再加一道自身防线。
      //   令牌键与 api.ts / persistStorage.ts 保持一致：ssa-erp-auth-token。
      let hasToken = false;
      try {
        hasToken = hasSession();
      } catch {
        hasToken = false;
      }
      if (!hasToken) {
        set({ loaded: true, syncError: '' });
        return;
      }
      try {
        const res = await approvalFlowDomainApi.list({ page: 1, pageSize: APPROVAL_FLOW_PAGE_SIZE });
        const list = (res?.data || []).map((r: any) => normalizeFlow(snakeToCamel(r) as ApprovalFlowConfig));

        if (list.length === 0 && !flagGet(BACKFILL_FLAG)) {
          flagSet(BACKFILL_FLAG, '1');
          const legacy = readLegacyFlows();
          const source = legacy.length ? legacy : cloneDefaults();
          let ok = 0;
          let fail = 0;
          for (const f of source) {
            try {
              await approvalFlowDomainApi.create(normalizeFlow(f));
              ok += 1;
            } catch {
              fail += 1; // 单条失败（编号冲突等）不阻断其余回填
            }
          }
          const again = await approvalFlowDomainApi.list({ page: 1, pageSize: APPROVAL_FLOW_PAGE_SIZE });
          const seeded = (again?.data || []).map((r: any) => normalizeFlow(snakeToCamel(r) as ApprovalFlowConfig));
          set({
            flows: seeded,
            loaded: true,
            syncError:
              fail > 0
                ? `审批流初始化：成功写入 ${ok} 条、${fail} 条因编号冲突被跳过（可在设置页手动核对）`
                : '',
          });
          return;
        }

        // list 为 0 且已回填过 = 用户确实删空了，如实置空，不再塞种子
        set({ flows: list, loaded: true, syncError: '' });
      } catch (e: any) {
        // 拉取失败：保留内存里的默认流程（设置页仍可打开），并如实告知原因
        set({
          loaded: true,
          syncError: `无法从服务器读取审批流配置（当前显示的是系统默认配置）：${readableError(e)}`,
        });
      }
    },
  };
});
