// 本地孤岛 store 迁 D1 的统一辅助（V3.77.0 全模块联动审计整改）
// 配合迁移 0101（统一 payload 列范式）+ 后端通用实体路由 /api/entities/<resource>。
//
// 范式：整对象 JSON 序列化进 payload 列（含 id/org_id/审计列由端点自动补齐）。
//   - 多集合同表（一个 store 持有多个数组）用 __kind 标记在 payload 内，水合时分流。
//   - 本地乐观更新 + 登录态 fire-and-forget 写穿 + 未登录/离线种子兜底 + 页面挂载水合。
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';

/** 整对象 JSON 落 payload 列：解析回对象数组 */
export function parsePayload<T = any>(rows: any[]): T[] {
  return (rows || []).map((r: any) =>
    typeof r?.payload === 'string' ? JSON.parse(r.payload) : r?.payload,
  ) as T[];
}

const KIND = '__kind';
/** 给对象打上集合种类标记（多集合同表时用于水合分流） */
export function withKind(kind: string, item: any): any {
  return { [KIND]: kind, ...item };
}
/** 去掉集合种类标记，还原为干净业务对象（不污染组件消费的数据） */
export function stripKind<T = any>(row: any): T {
  if (!row || typeof row !== 'object') return row;
  const { [KIND]: _drop, ...rest } = row;
  return rest as T;
}
/** 按 __kind 从已解析的 payload 数组分流 */
export function splitByKind<T = any>(rows: any[], kind: string): T[] {
  return (rows || [])
    .filter((r) => r && r[KIND] === kind)
    .map((r) => stripKind<T>(r));
}

/**
 * 本地乐观更新后，登录态 fire-and-forget 写穿 D1（payload 范式：body={payload}）。
 * P0-1A：改用 entityRepo.upsert —— 内部先 update 覆盖编辑，记录不存在(404)或网络/5xx
 * 时 fallback create（带显式 id 建首条），且仅最终 create 失败才入队（消除双队列项）。
 */
export function writeRow(resource: string, id: string, item: any): void {
  if (!isAuthed()) return;
  void entityRepo.upsert(resource, id, { payload: item } as any).catch(() => {});
}

/** 写穿：整对象作为单条配置（config 类 store，单 id 行） */
export function writeConfig(resource: string, id: string, cfg: Record<string, unknown>): void {
  if (!isAuthed()) return;
  void entityRepo.upsert(resource, id, { payload: cfg } as any).catch(() => {});
}
