// 通用命名转换：后端 D1 关系表返回 snake_case 行（含 items 数组），
// 前端业务对象使用 camelCase。统一在此映射，避免每个 store 手写 30+ 字段映射。
export function snakeToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map((x) => snakeToCamel(x)) as unknown as T;
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const out: any = {};
    for (const key of Object.keys(obj)) {
      const camel = key.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
      out[camel] = snakeToCamel((obj as any)[key]);
    }
    return out as T;
  }
  return obj as T;
}
