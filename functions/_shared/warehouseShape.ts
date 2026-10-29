/**
 * 仓库主数据 行 ↔ 前端形态 互转（W4 整改：仓库迁真实 D1）。
 * DB 列 snake_case；locations 以 JSON 文本内联存储，读取时解析为数组。
 */
export function parseLocations(s: any): any[] {
  if (!s) return [];
  try {
    const a = typeof s === 'string' ? JSON.parse(s) : s;
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function prevToWh(r: any) {
  if (!r) return r;
  return {
    id: r.id,
    orgId: r.org_id,
    code: r.code,
    name: r.name,
    type: r.type,
    address: r.address,
    manager: r.manager,
    status: r.status,
    locations: parseLocations(r.locations),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}
