// 角色操作权限 / 脱敏 纯函数（从 dataPermissionStore 提取，不依赖 zustand，便于白盒测试）。
// V3.44.0 提取：把"操作权限判定""脱敏""豁免角色"三处纯逻辑从 store 中剥离，
// 既消除测试对 store 初始化的耦合，又能白盒锁死 V3.28 操作守卫的核心判定。

export type RoleModuleOperation = {
  role: string;
  module: string;
  operations: { create: boolean; read: boolean; update: boolean; delete: boolean };
};

/** 豁免角色：组织内超管/管理员看全部（与后端 RLS_PRIVILEGED 一致） */
export const RLS_PRIVILEGED = new Set(['super_admin', 'admin']);

/** 脱敏：保留首位与末位，中间以掩码字符替换；过短则整体掩码 */
export const maskValue = (value: string, mask = '•'): string => {
  const v = String(value ?? '');
  if (!v) return '';
  if (v.length <= 1) return mask.repeat(3);
  if (v.length === 2) return `${v[0]}${mask.repeat(2)}`;
  return `${v[0]}${mask.repeat(v.length - 2)}${v[v.length - 1]}`;
};

/**
 * 操作权限判定（V3.28 操作守卫核心，纯函数化便于白盒锁死）：
 *  - 豁免角色（super_admin/admin）默认全权限
 *  - 优先精确匹配 角色×模块
 *  - 否则回退到通配符 角色×'*'
 *  - 都没有 → false（默认拒绝，符合最小权限 + 默认拒绝铁律）
 */
export function checkRoleOperation(
  roleModuleOps: RoleModuleOperation[],
  role: string,
  module: string,
  operation: 'create' | 'read' | 'update' | 'delete'
): boolean {
  if (RLS_PRIVILEGED.has(role)) return true;
  const exact = roleModuleOps.find((r) => r.role === role && r.module === module);
  if (exact?.operations[operation] !== undefined) return exact.operations[operation];
  const wildcard = roleModuleOps.find((r) => r.role === role && r.module === '*');
  return wildcard?.operations[operation] ?? false;
}
