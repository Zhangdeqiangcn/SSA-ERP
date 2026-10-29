// 统一数据 API · 单条端点
//   GET    /api/data/:table/:id    读取单条
//   PUT    /api/data/:table/:id    更新单条
//   DELETE /api/data/:table/:id    删除单条
import { resolveDataRequester, requesterHasScope, daGet, daUpdate, daDelete } from '../../../_shared/dataAccess';
import { errorResponse } from '../../../_shared/errors';
import { json } from '../../../_shared/auth';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'read')) return json({ error: 'API Key 缺 read 权限' }, 403);
  try {
    return await daGet(env, r, context.params.table, context.params.id);
  } catch (e: any) {
    return errorResponse(e, '数据查询');
  }
}

export async function onRequestPut(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const body = await request.json().catch(() => ({}));
    return await daUpdate(env, r, context.params.table, context.params.id, body);
  } catch (e: any) {
    return errorResponse(e, '数据更新');
  }
}

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    return await daDelete(env, r, context.params.table, context.params.id);
  } catch (e: any) {
    return errorResponse(e, '数据删除');
  }
}
