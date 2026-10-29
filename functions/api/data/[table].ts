// 统一数据 API · 集合端点
//   GET  /api/data/:table          列表（分页 + filter 等值 + sort/order）
//   POST /api/data/:table          新增单条
//
// 鉴权：API Key（Bearer sk_，需对应作用域）优先；否则会话（需管理员）。
// 范围：任意业务主表 / 明细表（系统表被 discoverTables 自动排除）。
// 返回：数据库原始列名（snake_case）行——面向外部集成/同步引擎。
import { resolveDataRequester, requesterHasScope, daList, daInsert } from '../../_shared/dataAccess';
import { errorResponse } from '../../_shared/errors';
import { json } from '../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'read')) return json({ error: 'API Key 缺 read 权限' }, 403);
  try {
    return await daList(env, r, context.params.table, new URL(request.url));
  } catch (e: any) {
    return errorResponse(e, '数据查询');
  }
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const body = await request.json().catch(() => ({}));
    return await daInsert(env, r, context.params.table, body);
  } catch (e: any) {
    return errorResponse(e, '数据新增');
  }
}
