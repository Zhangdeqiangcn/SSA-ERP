// 行级安全(RLS)应用层策略 —— D1/SQLite 无原生 RLS，统一在此强制。
// 所有关系表查询在 org_id 隔离基础上，按 user.role 追加 owner/dept 可见性。
import type { SessionUser } from './auth';

// 表 → 可见性范围
//  'all'  : 全员可见（共享主数据，不按角色切）
//  'own'  : 仅 owner_id = 本人，或遗留数据(owner_id IS NULL)全员可见
//  'dept' : 仅 dept_id = 本人部门
export type RlsScope = 'all' | 'own' | 'dept';

export const TABLE_RLS: Record<string, RlsScope> = {
  materials: 'all',          // 物料 = 共享主数据
  work_orders: 'all',        // 工单 = 共享
  vouchers: 'all',           // 凭证 = 共享
  customers: 'own',          // 销售看自己客户
  sales_orders: 'own',       // 销售看自己订单
  vendors: 'own',            // 采购看自己供应商
  purchase_orders: 'own',    // 采购看自己订单
  inbound_orders: 'dept',    // 仓库按部门
  outbound_orders: 'dept',
  inventory_records: 'dept',
};

// 豁免角色：看全部（组织内管理员/老板）
export const RLS_PRIVILEGED = new Set(['admin', 'owner', 'boss']);

export function isRlsPrivileged(role: string): boolean {
  return RLS_PRIVILEGED.has(role);
}

/**
 * 生成追加到 `WHERE org_id = ?` 之后的片段。
 * 返回 { clause, param }；clause === '1=1' 表示不过滤（调用方跳过拼接）。
 */
export function rlsFragment(user: SessionUser, table: string): { clause: string; param?: string } {
  if (isRlsPrivileged(user.role)) return { clause: '1=1' };
  const scope = TABLE_RLS[table] ?? 'all';
  if (scope === 'all') return { clause: '1=1' };
  if (scope === 'own') return { clause: '(owner_id = ? OR owner_id IS NULL)', param: user.id };
  return { clause: '(dept_id = ? OR dept_id IS NULL)', param: user.department || '' };
}

/** 写操作（新建）时填入的 owner_id */
export function rlsOwnerId(user: SessionUser): string {
  return user.id;
}

/** 写操作（更新/删除）前校验归属；privileged 或 'all' 表直接放行 */
export function assertRlsOwnership(user: SessionUser, row: any, table: string): boolean {
  if (isRlsPrivileged(user.role)) return true;
  const scope = TABLE_RLS[table] ?? 'all';
  if (scope === 'all') return true;
  if (scope === 'own') return !row?.owner_id || row.owner_id === user.id;
  return !row?.dept_id || row.dept_id === (user.department || '');
}
