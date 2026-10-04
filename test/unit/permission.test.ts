import { describe, it, expect } from 'vitest';
import type { RoleModuleOperation } from '@/utils/roleOperation';
import { maskValue, checkRoleOperation, RLS_PRIVILEGED } from '@/utils/roleOperation';

// ─────────────────────────────────────────────────────────────
// 权限判定 / 脱敏 纯函数白盒单测（FE-001 第二批）。
// checkRoleOperation 是 V3.28 操作守卫的核心判定（已提取为纯函数），
// 其"默认拒绝 + 精确优先 + 通配回退"逻辑必须用白盒锁死，防回归成"静默放行"。
// ─────────────────────────────────────────────────────────────

// 精简但覆盖关键分支的测试矩阵（与 defaultRoleModuleOps 语义对齐）
const matrix: RoleModuleOperation[] = [
  { role: 'super_admin', module: '*', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'user', module: '*', operations: { create: false, read: true, update: false, delete: false } },
  { role: 'buyer', module: 'purchase', operations: { create: true, read: true, update: true, delete: true } },
  { role: 'salesperson', module: 'sales', operations: { create: true, read: true, update: true, delete: false } },
];

describe('RLS_PRIVILEGED 豁免角色集合', () => {
  it('包含 super_admin 与 admin', () => {
    expect(RLS_PRIVILEGED.has('super_admin')).toBe(true);
    expect(RLS_PRIVILEGED.has('admin')).toBe(true);
    expect(RLS_PRIVILEGED.has('buyer')).toBe(false);
  });
});

describe('checkRoleOperation 操作权限判定', () => {
  it('豁免角色（super_admin/admin）任意模块/操作均放行', () => {
    expect(checkRoleOperation(matrix, 'super_admin', 'finance', 'delete')).toBe(true);
    expect(checkRoleOperation(matrix, 'admin', 'unknown', 'create')).toBe(true);
  });

  it('精确匹配：buyer 对 purchase 有删除权', () => {
    expect(checkRoleOperation(matrix, 'buyer', 'purchase', 'delete')).toBe(true);
  });

  it('通配符回退：user 对未精确配置的模块只读', () => {
    expect(checkRoleOperation(matrix, 'user', 'purchase', 'read')).toBe(true);
    expect(checkRoleOperation(matrix, 'user', 'sales', 'create')).toBe(false);
  });

  it('未配置角色 → 默认拒绝（绝不静默放行）', () => {
    expect(checkRoleOperation(matrix, 'buyer', 'sales', 'delete')).toBe(false);
    expect(checkRoleOperation(matrix, 'salesperson', 'quality', 'read')).toBe(false);
  });

  it('精确匹配优先于通配符（精确 false 不被通配 true 覆盖）', () => {
    // salesperson 对 sales 精确配置 delete=false，即便有通配也不应放行
    const m2: RoleModuleOperation[] = [
      ...matrix,
      { role: 'salesperson', module: '*', operations: { create: true, read: true, update: true, delete: true } },
    ];
    expect(checkRoleOperation(m2, 'salesperson', 'sales', 'delete')).toBe(false);
  });
});

describe('maskValue 脱敏（保留首尾、中间掩码）', () => {
  it('空串 → 空串', () => {
    expect(maskValue('')).toBe('');
  });
  it('单字符 → 三个掩码', () => {
    expect(maskValue('A')).toBe('•••');
  });
  it('两字符 → 首 + 两掩码', () => {
    expect(maskValue('AB')).toBe('A••');
  });
  it('三字符及以上 → 首尾保留、中间掩码', () => {
    expect(maskValue('ABC')).toBe('A•C');
    expect(maskValue('ABCD')).toBe('A••D');
    expect(maskValue('13800138000')).toBe('1' + '•'.repeat(9) + '0');
  });
  it('自定义掩码字符', () => {
    expect(maskValue('ABCD', '#')).toBe('A##D');
  });
});
