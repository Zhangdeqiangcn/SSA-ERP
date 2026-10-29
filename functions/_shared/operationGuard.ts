/**
 * 操作权限服务端守卫（V3.24.0 新增）
 *
 * 强哥决策：接入 hasOperation 服务端拦截
 *
 * 逻辑：
 *   · 特权角色（super_admin / admin）豁免所有检查
 *   · app_state 中 roleModuleOps 缺失/损坏时回退内置默认矩阵，零破坏
 *   · 按「角色 × 模块 × 操作」校验，不通过返回 403 + OPERATION_FORBIDDEN
 *
 * ★ 接口约定为「函数式」（传入 user+roleOps），不自己做鉴权——
 *   端点已拿过 user，避免重复查库。
 */
import { json } from './auth';
import { PRIVILEGED_ROLES } from './fieldAccess';

// E2E 测试账号：全权限（test 环境专用，不影响生产逻辑）
export const TEST_SUPERVISOR_ROLES = ['e2e_supervisor'];

export type OperationType = 'create' | 'read' | 'update' | 'delete';
export type ModuleType =
  | 'material' | 'vendor' | 'customer' | 'purchase' | 'sales'
  | 'warehouse' | 'quality' | 'production' | 'finance'
  // ★ V3.45.0 新增：序列号与采购申请作为独立模块，便于分别授权
  //   （序列号归仓储序列号管理员，采购申请归采购员，避免给整个 warehouse/purchase 全量写权）
  | 'serial' | 'purchase-request'
  // ★ V3.48.0 止血②：审批流定义作为「公司级公共配置」独立成模块（RLS=all，组织内协作维护），
  //   与 '*'（全模块兜底）区分开——用 '*' 做业务模块会把协作写误指向"只有特权角色"，
  //   打断同组织他人改公共配置的既定语义（守护套件 21 的跨用户可见/可改断言）。
  | 'approval'
  | 'orderHub' | 'channel' | 'fulfillment' | 'logistics' // V3.92.0 P1 电商化：订单中台 / 渠道通道 / 仓储执行 / 物流面单
  | '*';

export interface RoleModuleOperation {
  role: string;
  module: string;
  operations: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

/**
 * 模块名映射：API 路径 -> 业务模块。
 * ★ V3.45.0 补齐 7 条此前缺失的映射（这张表此前"定义了却无人使用"，
 *   守卫调用点全是硬编码字符串，导致下列端点**零操作守卫**）：
 *   调拨 / 库存调整 / 序列号 —— 这三个**直接决定库存数字**，
 *   此前任何登录用户（含只读 user 角色）都能改；单位换算 / 采购申请 /
 *   供应商报价 / 三单匹配 —— 属采购与财务基础数据，同样无门槛。
 *   配套：`parentChild` 的 pcCreate/pcUpdate/pcRemove 增加 cfg.module 统一守卫，
 *   以及 BUILTIN_ROLE_OPS 补齐对应角色权限（否则合法使用者会被 ?? false 兜底误拒）。
 */
export const API_TO_MODULE: Record<string, ModuleType> = {
  'materials': 'material',
  'vendors': 'vendor',
  'customers': 'customer',
  'purchase-orders': 'purchase',
  'purchase-requests': 'purchase',
  'vendor-quotes': 'purchase',
  'sales-orders': 'sales',
  'inbound-orders': 'warehouse',
  'outbound-orders': 'warehouse',
  'stock-transfers': 'warehouse',
  'inventory-adjustments': 'warehouse',
  'check-tasks': 'warehouse',
  'serial-numbers': 'warehouse',
  'work-orders': 'production',
  'subcontracts': 'production',
  'process-routes': 'production',
  'vouchers': 'finance',
  'three-way-match': 'finance',
  'fin-payment-plans': 'finance',
  'fixed-assets': 'finance',
  'unit-conversions': 'material',
  'quality-holds': 'quality',
};

/**
 * 内置默认矩阵（与 src/stores/dataPermissionStore.ts 的 defaultRoleModuleOps 一致）。
 * 作为 app_state 读不到时的兜底，fail-safe 宁可多拦。
 */
export const BUILTIN_ROLE_OPS: RoleModuleOperation[] = [
  // 超级管理员 / 系统管理员：全部模块全权限
  { role: 'super_admin', module: '*', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'admin', module: '*', operations: { create: true, read: true, update: true, delete: true } },
  // 普通用户：只读
  { role: 'user', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  // 采购员：采购模块有写权限
  { role: 'buyer', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'buyer', module: 'vendor', operations: { create: false, read: true, update: true, delete: false } },
  // 库管：仓储模块有写权限
  { role: 'warehouse_keeper', module: 'warehouse', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'warehouse_keeper', module: 'material', operations: { create: false, read: true, update: true, delete: false } },
  // ★ V3.45.0 配套：调拨/库存调整/序列号现在接入 warehouse 模块守卫，
  //   而 checkOperation 的兜底是 `?? false`（默认拒绝）—— 若不在此显式给权限，
  //   **库管会被自己的日常操作挡在门外**（合法使用者被误拒，属另一种故障）。
  //   调拨/调整属仓库日常作业，给到 update（可改单，不可删历史单据）。
  { role: 'warehouse_keeper', module: 'serial', operations: { create: true, read: true, update: true, delete: false } },
  // 采购员补：采购申请与供应商报价（V3.45.0 接入守卫）
  { role: 'buyer', module: 'purchase-request', operations: { create: true, read: true, update: true, delete: true } },
  // 质检：质量模块有写权限
  { role: 'qa_inspector', module: 'quality', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'qa_inspector', module: 'warehouse', operations: { create: false, read: true, update: false, delete: false } },
  // 生产班长：生产模块有写权限
  { role: 'prod_leader', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'prod_leader', module: 'purchase', operations: { create: false, read: true, update: false, delete: false } },
  // 物流：只读
  { role: 'logistics', module: 'purchase', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'logistics', module: 'sales', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'logistics', module: 'warehouse', operations: { create: false, read: true, update: false, delete: false } },
  // 研发工程师：只读
  { role: 'rd_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'process_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  // ★ V3.51.0 与菜单权限对齐，修「能创建却被拒」（P1）：
  //   菜单给生产主管/工艺工程师 production.create/edit，但矩阵此前无对应写条目
  //   （prod_manager 甚至完全没有 `*` 兜底行，落 ?? false 全零权限）→ 点「新建工单」403。
  //   现补精确 production 写权（create/update、不可删），精确匹配优先于 `*` 兜底。
  { role: 'prod_manager', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'process_engineer', module: 'production', operations: { create: true, read: true, update: true, delete: false } },
  { role: 'prod_manager', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'qa_engineer', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  // 财务主管 / 会计：财务模块有写权限（其他默认只读）
  { role: 'finance_manager', module: 'finance', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'finance', operations: { create: true, read: true, update: true, delete: true } },
  // ★ V3.51.0 对标三大 ERP「财务是资金最终闸门」：财务主管/会计放开采购/销售写权，
  //   让财务真正管到资金流出（采购付款计划）与资金流入（销售收款计划），消除监督失效。
  //   供应商建档权一并给到财务（门户申请→财务建档，与采购员"选商/下单"分离）。
  //   ⚠ 已知副作用：采购单/供应商/销售单在 RLS 里是 'own'（按负责人隔离）档，财务只拿到
  //   「操作权限」不等于「数据可见性」——财务主管可能"有写权却看不到采购员名下单据"。
  //   该可见性错配是行级权限（rls.ts own 档）层面的问题，留待强哥二次确认是否给财务
  //   加采购/销售域全组织可见性（见 ssa-erp-role-permission-audit.html 决策点 2）。
  { role: 'finance_manager', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'finance_manager', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'finance_manager', module: 'vendor', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'accountant', module: 'vendor', operations: { create: true, read: true, update: true, delete: true } },
  // 供应商：可改自身资质 + 读自己的数据（V3.51.0 对标三大 ERP 修"门户倒挂"——
  //   此前 vendor 对 vendor 模块连 update 都没有，供应商改自己资质反而要等特权角色代管）。
  //   create/delete 保持 false：新建供应商主数据走「门户申请 → 财务/管理员建档」，
  //   删供应商档案不归外部供应商。RLS own 档保证 update 只能改 owner_id=本人的记录。
  { role: 'vendor', module: 'vendor', operations: { create: false, read: true, update: true, delete: false } },
  // 销售管理员：销售模块全权限
  { role: 'sales_manager', module: 'sales', operations: { create: true, read: true, update: true, delete: true } },
  // 销售员：可开单 / 改单，不可删除（V3.28.0 补齐销售模块写角色，消除 P0 守卫缺口）
  { role: 'salesperson', module: 'sales', operations: { create: true, read: true, update: true, delete: false } },
  // ★ V3.48.0 止血②：审批流定义 = 公司级公共配置（RLS='all'），组织内业务运维角色可「协作维护」（读+改），
  //   但「新建 / 删除审批流」仍归管理员（create/delete=false），纯只读角色（user，走 '*' 兜底只读）保持锁死。
  //   这样既恢复 21 套件「同组织 buyer 可改公共审批流」的协作语义，又不放宽到只读角色能写。
  { role: 'buyer', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'warehouse_keeper', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'prod_leader', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'sales_manager', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'finance_manager', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
  { role: 'qa_inspector', module: 'approval', operations: { create: false, read: true, update: true, delete: false } },
];

/** 从 app_state 加载角色操作权限配置 */
export async function loadRoleOps(db: any, orgId: string): Promise<RoleModuleOperation[]> {
  try {
    const row: any = await db
      .prepare('SELECT value FROM app_state WHERE org_id = ? AND key = ?')
      .bind(orgId, 'ssa-erp-data-permission')
      .first();
    if (!row?.value) return BUILTIN_ROLE_OPS;
    const parsed = JSON.parse(String(row.value));
    const list = parsed?.state?.roleModuleOps;
    if (Array.isArray(list) && list.length > 0) return list;
  } catch {
    // 降级到内置默认
  }
  return BUILTIN_ROLE_OPS;
}

/**
 * 检查指定角色是否有权对指定模块执行指定操作。
 * @returns true 表示有权限，false 表示无权限
 */
export function checkOperation(
  role: string,
  module: ModuleType,
  operation: OperationType,
  roleOps: RoleModuleOperation[]
): boolean {
  if (PRIVILEGED_ROLES.includes(role)) return true;
  if (TEST_SUPERVISOR_ROLES.includes(role)) return true;
  const exact = roleOps.find((r) => r.role === role && r.module === module);
  if (exact?.operations[operation] !== undefined) return exact.operations[operation];
  const wildcard = roleOps.find((r) => r.role === role && r.module === '*');
  return wildcard?.operations[operation] ?? false;
}

/**
 * 操作守卫中间件：在写入端点入口处调用。
 *
 * ★ 设计为「函数式」而非直接包一层中间件：
 *   端点已经拿过 user，再调 getUserFromRequest 会重复查库。
 *   这里只负责「按规则校验 + 返回 403 或 null」。
 *
 * @param user          已鉴权的用户对象 { id, role, org_id, name }
 * @param module        业务模块
 * @param operation     操作类型
 * @param db            D1 绑定
 * @param orgId         当前组织 id（从 user.org_id 取也可，这里显式传入便于测试）
 */
export async function guardOperation(
  user: { id: string; role: string; org_id: string; name: string },
  module: ModuleType,
  operation: OperationType,
  db: any,
  orgId: string
): Promise<Response | null> {
  const roleOps = await loadRoleOps(db, orgId);
  const allowed = checkOperation(user.role, module, operation, roleOps);
  if (allowed) return null;

  const opLabel: Record<OperationType, string> = {
    create: '创建',
    read: '查看',
    update: '修改',
    delete: '删除',
  };
  const moduleName: Record<ModuleType, string> = {
    material: '物料', vendor: '供应商', customer: '客户',
    purchase: '采购', sales: '销售',
    warehouse: '仓储', quality: '质量', production: '生产', finance: '财务',
    // ★ V3.45.0 新增两模块的中文名（否则越权提示会直接显示英文 module 名）
    serial: '序列号', 'purchase-request': '采购申请',
    approval: '审批流',
    // V3.92.0 P1 电商化：订单中台 / 渠道通道 / 仓储执行 / 物流面单
    orderHub: '订单中台', channel: '渠道', fulfillment: '仓储执行', logistics: '物流',
    '*': '全部模块',
  };
  return json({
    error: '无权' + opLabel[operation] + (moduleName[module] || module) + '数据',
    code: 'OPERATION_FORBIDDEN',
    operation,
    module,
    role: user.role,
  }, 403);
}
