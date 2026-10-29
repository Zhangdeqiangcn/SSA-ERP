// 物流面单 · 轨迹回写（POST /api/logistics/track）：接收承运商推送的轨迹，去重落库并推导运单状态
// 纪律：轨迹必须归一化校验后才落库；运单状态由最新轨迹推导写回，绝不静默写入脏状态。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { audit } from '../../_shared/auditLog';
import { errorResponse } from '../../_shared/errors';
import { guardOperation } from '../../_shared/operationGuard';
import { deriveWaybillStatus, parseTrackPayload } from '../../_shared/logistics';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const _g = await guardOperation(user, 'logistics', 'update', env.DB, user.org_id);
  if (_g) return _g;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }
  const { waybillNo, carrier, payload } = body;
  if (!waybillNo) return json({ error: '运单号必填' }, 400);

  // 校验运单存在且归属本组织
  const wb: any = await env.DB
    .prepare(`SELECT id, org_id, carrier FROM waybills WHERE org_id = ? AND waybill_no = ?`)
    .bind(user.org_id, waybillNo)
    .first();
  if (!wb) return json({ error: '运单不存在' }, 404);

  const events = parseTrackPayload(payload);
  if (events.length === 0) return json({ error: '轨迹报文无有效节点' }, 400);

  const now = new Date().toISOString();
  let status = 'created';
  try {
    for (const e of events) {
      const id = uid('tk');
      await env.DB
        .prepare(
          `INSERT OR IGNORE INTO logistics_tracks (id, org_id, carrier, waybill_no, event_time, status, location, description, raw, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(
          id, user.org_id, carrier || wb.carrier || null, waybillNo,
          e.eventTime, e.status, e.location ?? null, e.description ?? null,
          JSON.stringify(payload), now
        )
        .run();
    }
    // 重新拉全量轨迹，去重后推导运单状态写回
    const all: any = await env.DB
      .prepare(`SELECT event_time, status FROM logistics_tracks WHERE org_id = ? AND waybill_no = ?`)
      .bind(user.org_id, waybillNo)
      .all();
    const tracks = (all.results || []).map((r: any) => ({ eventTime: r.event_time, status: r.status }));
    status = deriveWaybillStatus(tracks);
    await env.DB
      .prepare(`UPDATE waybills SET status = ?, updated_at = ? WHERE org_id = ? AND waybill_no = ?`)
      .bind(status, now, user.org_id, waybillNo)
      .run();
  } catch (e: any) {
    return errorResponse(e, '写入物流轨迹');
  }

  await audit(
    env.DB,
    user.org_id,
    user,
    'logistics',
    'update',
    `运单 ${waybillNo} 回写 ${events.length} 条轨迹，状态→${status}`
  );
  return json({ ok: true, eventCount: events.length, status }, 201);
}
