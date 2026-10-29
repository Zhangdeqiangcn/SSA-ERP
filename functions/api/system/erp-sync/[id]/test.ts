// 外部 ERP 同步 · 连通性测试
//   POST /api/system/erp-sync/:id/test   对 base_url 发一次探测，返回可达性与状态码。
import { resolveDataRequester, requesterHasScope } from '../../../../_shared/dataAccess';
import { testConnection, SyncConnection } from '../../../../_shared/erpSync';
import { json } from '../../../../_shared/auth';
import { errorResponse } from '../../../../_shared/errors';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'read')) return json({ error: 'API Key 缺 read 权限' }, 403);
  try {
    const id = context.params.id;
    const conn = await env.DB.prepare(`SELECT * FROM erp_sync_connections WHERE id = ? AND org_id = ?`).bind(id, r.org_id).first();
    if (!conn) return json({ error: '连接不存在' }, 404);

    const res = await testConnection(conn as SyncConnection);
    return json(res, res.ok ? 200 : 502);
  } catch (e: any) {
    return errorResponse(e, '测试连接');
  }
}
