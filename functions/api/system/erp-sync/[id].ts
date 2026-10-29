// 外部 ERP 同步 · 单连接详情 / 更新 / 删除 + 运行历史
//   GET    /api/system/erp-sync/:id   连接详情 + 最近运行与逐行结果
//   PUT    /api/system/erp-sync/:id   更新连接配置
//   DELETE /api/system/erp-sync/:id   删除连接（级联删除其运行历史）
import { resolveDataRequester, requesterHasScope } from '../../../_shared/dataAccess';
import { json } from '../../../_shared/auth';
import { errorResponse } from '../../../_shared/errors';
import { writeAudit } from '../../../_shared/auditLog';

const AUTH_TYPES = ['bearer', 'basic', 'apikey', 'none'];
const DIRECTIONS = ['push', 'pull', 'both'];

function maskAuth(authConfig?: string | null): any {
  const cfg = (() => { try { return authConfig ? JSON.parse(authConfig) : {}; } catch { return {}; } })();
  const out = { ...cfg };
  if (out.token) out.token = '***';
  if (out.password) out.password = '***';
  return out;
}
function publicConn(row: any) {
  if (!row) return row;
  return { ...row, auth_config: maskAuth(row.auth_config) };
}

async function loadOwned(env: any, orgId: string, id: string) {
  return env.DB.prepare(`SELECT * FROM erp_sync_connections WHERE id = ? AND org_id = ?`).bind(id, orgId).first();
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'read')) return json({ error: 'API Key 缺 read 权限' }, 403);
  try {
    const conn = await loadOwned(env, r.org_id, context.params.id);
    if (!conn) return json({ error: '连接不存在' }, 404);

    const runs = await env.DB.prepare(
      `SELECT * FROM erp_sync_runs WHERE connection_id = ? AND org_id = ? ORDER BY started_at DESC LIMIT 20`
    ).bind(context.params.id, r.org_id).all();
    const runItems = await env.DB.prepare(
      `SELECT * FROM erp_sync_run_items WHERE connection_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 200`
    ).bind(context.params.id, r.org_id).all();

    return json({ connection: publicConn(conn), runs: runs.results || [], runItems: runItems.results || [] });
  } catch (e: any) {
    return errorResponse(e, '查询同步连接');
  }
}

export async function onRequestPut(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const conn = await loadOwned(env, r.org_id, context.params.id);
    if (!conn) return json({ error: '连接不存在' }, 404);

    const body = await request.json().catch(() => ({}));
    const sets: string[] = [];
    const vals: any[] = [];

    if (body.name != null) { sets.push('name = ?'); vals.push(String(body.name)); }
    if (body.base_url != null) {
      const u = String(body.base_url);
      if (!/^https?:\/\//i.test(u)) return json({ error: 'base_url 必须是 http(s) 地址' }, 400);
      sets.push('base_url = ?'); vals.push(u);
    }
    if (body.auth_type != null) {
      const authMsg = 'auth_type 必须是 ' + AUTH_TYPES.join('/');
      if (!AUTH_TYPES.includes(String(body.auth_type))) return json({ error: authMsg }, 400);
      sets.push('auth_type = ?'); vals.push(String(body.auth_type));
    }
    if (body.direction != null) {
      const dirMsg = 'direction 必须是 ' + DIRECTIONS.join('/');
      if (!DIRECTIONS.includes(String(body.direction))) return json({ error: dirMsg }, 400);
      sets.push('direction = ?'); vals.push(String(body.direction));
    }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.schedule_cron !== undefined) { sets.push('schedule_cron = ?'); vals.push(body.schedule_cron || null); }

    if (body.mapping_profile != null) {
      const s = typeof body.mapping_profile === 'string' ? body.mapping_profile : JSON.stringify(body.mapping_profile);
      try { JSON.parse(s); } catch { return json({ error: 'mapping_profile 不是合法 JSON' }, 400); }
      sets.push('mapping_profile = ?'); vals.push(s);
    }
    if (body.auth_config != null) {
      const s = typeof body.auth_config === 'string' ? body.auth_config : JSON.stringify(body.auth_config);
      try { JSON.parse(s); } catch { return json({ error: 'auth_config 不是合法 JSON' }, 400); }
      sets.push('auth_config = ?'); vals.push(s);
    }

    if (!sets.length) return json({ error: '无可更新字段' }, 400);
    sets.push('updated_at = ?'); vals.push(new Date().toISOString());
    sets.push('updated_by = ?'); vals.push(r.actorId);
    vals.push(context.params.id, r.org_id);

    await env.DB.prepare(`UPDATE erp_sync_connections SET ${sets.join(', ')} WHERE id = ? AND org_id = ?`)
      .bind(...vals).run();

    await writeAudit(env.DB, {
      orgId: r.org_id,
      actor: { id: r.actorId, name: r.actorName },
      entity: 'erp_sync',
      action: 'update',
      entityId: context.params.id,
      summary: `更新外部 ERP 同步连接 ${context.params.id}`,
    });

    const updated = await env.DB.prepare(`SELECT * FROM erp_sync_connections WHERE id = ?`).bind(context.params.id).first();
    return json(publicConn(updated));
  } catch (e: any) {
    return errorResponse(e, '更新同步连接');
  }
}

export async function onRequestDelete(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const conn = await loadOwned(env, r.org_id, context.params.id);
    if (!conn) return json({ error: '连接不存在' }, 404);

    await env.DB.prepare(`DELETE FROM erp_sync_run_items WHERE connection_id = ? AND org_id = ?`).bind(context.params.id, r.org_id).run();
    await env.DB.prepare(`DELETE FROM erp_sync_runs WHERE connection_id = ? AND org_id = ?`).bind(context.params.id, r.org_id).run();
    await env.DB.prepare(`DELETE FROM erp_sync_connections WHERE id = ? AND org_id = ?`).bind(context.params.id, r.org_id).run();

    await writeAudit(env.DB, {
      orgId: r.org_id,
      actor: { id: r.actorId, name: r.actorName },
      entity: 'erp_sync',
      action: 'delete',
      entityId: context.params.id,
      summary: `删除外部 ERP 同步连接 ${context.params.id}`,
    });
    return json({ ok: true });
  } catch (e: any) {
    return errorResponse(e, '删除同步连接');
  }
}
