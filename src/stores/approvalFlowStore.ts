import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types/settings';

/**
 * 审批流配置单一数据源（全面 store 化 · V2.14；深度定制 · V2.55.19）
 * ------------------------------------------------------------
 * 将审批流配置从 ApprovalFlowTab 的 `defaultFlows` 硬编码 +
 * localStorage `ssa-approval-flows` 收敛到唯一 zustand persist store。
 * 各业务审批队列（供应商准入 / 采购申请等）与 FlowTracker 通过
 * `approvalFlowConfig.ts` 的读取器统一消费本 store，消除「设置页一份、
 * 读取器又一份 DEFAULT_FLOWS」的双源不一致隐患。
 * 首次启动从旧的 `ssa-approval-flows` 一次性迁移（若有用户自定义），否则播种默认流程。
 *
 * V2.55.19 审批流深度定制（对照 SAP Release Strategy / Flexible Workflow / Agent Determination）：
 *   - 审批人类型 approverType：角色 / 职位 / 上级 / 部门负责人 / 指定用户
 *   - 会签模式 mode：串签 serial / 并签 parallel / 或签 or（多审批人时生效）
 *   - 结构化条件 conditions：字段 + 运算符 + 值，支持 AND/OR 组合（取代自由文本 condition）
 *   - 跳过规则 skipRule：满足某条件组时「跳过」或「自动通过」该节点
 *   - 超时升级 escalation：节点超时后升级给指定审批人并通知
 *   - 可省略 optional：简化 profile 下可省略该节点
 *   - 流程级 profile：standard 标准 / simplified 简化
 * 所有新增字段均为可选，旧持久化数据（仅含 role/condition 等）完全兼容。
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
  optional?: boolean;              // 简化 profile 下可省略
}

/** 兼容历史命名（approvalFlowConfig.ts 使用 ApprovalFlowNode） */
export type ApprovalFlowNode = ApprovalNode;

/** 流程级配置：标准 / 简化 */
export type ApprovalProfile = 'standard' | 'simplified';

export interface ApprovalFlowConfig {
  id: string;
  module: string;
  moduleLabel: string;
  enabled: boolean;
  profile?: ApprovalProfile;       // 标准 / 简化，默认 'standard'
  nodes: ApprovalNode[];
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
];

/** 从旧的 ApprovalFlowTab localStorage 一次性迁移（若有用户自定义配置） */
const seedFlows = (): ApprovalFlowConfig[] => {
  try {
    const raw = localStorage.getItem('ssa-approval-flows');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.removeItem('ssa-approval-flows');
        // 兼容旧数据：补齐 profile 缺省值
        return (parsed as ApprovalFlowConfig[]).map((f) => ({
          ...f,
          profile: f.profile ?? 'standard',
          nodes: f.nodes.map((n) => ({ ...n, order: n.order ?? 0 })),
        }));
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_APPROVAL_FLOWS.map((f) => ({ ...f, nodes: f.nodes.map((n) => ({ ...n })) }));
};

interface ApprovalFlowState {
  flows: ApprovalFlowConfig[];
  setFlows: (flows: ApprovalFlowConfig[] | ((prev: ApprovalFlowConfig[]) => ApprovalFlowConfig[])) => void;
  resetFlows: () => void;
}

export const useApprovalFlowStore = create<ApprovalFlowState>()(
  persist(
    (set) => ({
      flows: seedFlows(),
      setFlows: (updater) =>
        set((state) => ({
          flows: typeof updater === 'function' ? (updater as (prev: ApprovalFlowConfig[]) => ApprovalFlowConfig[])(state.flows) : updater,
        })),
      resetFlows: () =>
        set({ flows: DEFAULT_APPROVAL_FLOWS.map((f) => ({ ...f, nodes: f.nodes.map((n) => ({ ...n })) })) }),
    }),
    { name: 'ssa-erp-approval-flows', version: 1 }
  )
);
