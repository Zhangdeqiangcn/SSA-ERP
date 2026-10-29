// 统一数据 API · 批量端点
//   POST /api/data/:table/bulk   批量 upsert / delete（幂等、失败聚合不中断）
//
// body: { rows: [...], mode: 'upsert' | 'delete' }
// 用途：外部 ERP 同步引擎的回写、批量初始化、跨系统对账修复。
import { resolveDataRequester, requesterHasScope, daBulk } from '../../../_shared/dataAccess';
import { errorResponse } from '../../../_shared/errors';
import { json } from '../../../_shared/auth';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const body = await request.json().catch(() => ({}));
    return await daBulk(env, r, context.params.table, body);
  } catch (e: any) {
    return errorResponse(e, '批量数据操作');
  }
}
