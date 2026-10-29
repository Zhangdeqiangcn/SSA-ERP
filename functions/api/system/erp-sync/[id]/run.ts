// 外部 ERP 同步 · 触发一次运行
//   POST /api/system/erp-sync/:id/run   { direction?, full? }
//     direction 覆盖连接配置（push/pull/both）；full=true 忽略增量游标做全量。
import { resolveDataRequester, requesterHasScope } from '../../../../_shared/dataAccess';
import { runSync, SyncConnection } from '../../../../_shared/erpSync';
import { json } from '../../../../_shared/auth';
import { errorResponse } from '../../../../_shared/errors';
import { writeAudit } from '../../../../_shared/auditLog';

const DIRECTIONS = ['push', 'pull', 'both'];

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const id = context.params.id;
    const conn = await env.DB.prepare(`SELECT * FROM erp_sync_connections WHERE id = ? AND org_id = ?`).bind(id, r.org_id).first();
    if (!conn) return json({ error: '连接不存在' }, 404);

    const body = await request.json().catch(() => ({}));
    let direction = body.direction || conn.direction;
    const dirMsg = 'direction 必须是 ' + DIRECTIONS.join('/');
    if (!DIRECTIONS.includes(direction)) return json({ error: dirMsg }, 400);
    const full = !!body.full;

    const result = await runSync(env, conn as SyncConnection, { direction, full });

    await writeAudit(env.DB, {
      orgId: r.org_id,
      actor: { id: r.actorId, name: r.actorName },
      entity: 'erp_sync',
      action: 'run',
      entityId: id,
      summary: `触发同步「${conn.name}」（${direction}）：${result.summary}`,
    });

    return json(result, 200);
  } catch (e: any) {
    return errorResponse(e, '执行同步');
  }
}
