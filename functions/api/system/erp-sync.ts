// 外部 ERP 同步 · 连接列表 + 新建
//   GET  /api/system/erp-sync       列出本组织全部连接 + 最近运行概览
//   POST /api/system/erp-sync       新建连接配置（校验 base_url / 鉴权 / 方向 / 映射）
//
// 鉴权：会话需管理员；或 API Key（read 列 / write 建）。
// 安全：返回的 auth_config 中 token / password 以 *** 遮盖，避免凭据在传输/日志中泄露。
import { resolveDataRequester, requesterHasScope } from '../../_shared/dataAccess';
import { runSync, testConnection } from '../../_shared/erpSync';
import { json, uid } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
import { writeAudit } from '../../_shared/auditLog';

const AUTH_TYPES = ['bearer', 'basic', 'apikey', 'none'];
const DIRECTIONS = ['push', 'pull', 'both'];

/** 遮盖 auth_config 中的敏感字段。 */
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

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'read')) return json({ error: 'API Key 缺 read 权限' }, 403);
  try {
    const rows = await env.DB.prepare(
      `SELECT * FROM erp_sync_connections WHERE org_id = ? ORDER BY created_at DESC`
    ).bind(r.org_id).all();
    const conns = (rows.results || []).map(publicConn);

    // 最近运行概览（组织内最新 10 条）
    const runs = await env.DB.prepare(
      `SELECT * FROM erp_sync_runs WHERE org_id = ? ORDER BY started_at DESC LIMIT 10`
    ).bind(r.org_id).all();

    await writeAudit(env.DB, {
      orgId: r.org_id,
      actor: { id: r.actorId, name: r.actorName },
      entity: 'erp_sync',
      action: 'list',
      summary: `查看外部 ERP 同步连接（${conns.length} 个）`,
    });

    return json({ connections: conns, recentRuns: runs.results || [] });
  } catch (e: any) {
    return errorResponse(e, '查询同步连接');
  }
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const r = await resolveDataRequester(request, env);
  if (r instanceof Response) return r;
  if (!requesterHasScope(r, 'write')) return json({ error: 'API Key 缺 write 权限' }, 403);
  try {
    const body = await request.json().catch(() => ({}));
    const name = (body.name || '').toString().trim();
    const base_url = (body.base_url || '').toString().trim();
    const auth_type = (body.auth_type || 'bearer').toString();
    const direction = (body.direction || 'push').toString();
    const target_type = (body.target_type || 'rest').toString();

    if (!name) return json({ error: 'name 必填' }, 400);
    if (!/^https?:\/\//i.test(base_url)) return json({ error: 'base_url 必须是 http(s) 地址' }, 400);
    const authMsg = 'auth_type 必须是 ' + AUTH_TYPES.join('/');
    if (!AUTH_TYPES.includes(auth_type)) return json({ error: authMsg }, 400);
    const dirMsg = 'direction 必须是 ' + DIRECTIONS.join('/');
    if (!DIRECTIONS.includes(direction)) return json({ error: dirMsg }, 400);

    // mapping_profile 必须是合法 JSON（可空）
    let mappingProfile: string | null = null;
    if (body.mapping_profile != null) {
      if (typeof body.mapping_profile === 'string') {
        try { JSON.parse(body.mapping_profile); mappingProfile = body.mapping_profile; } catch { return json({ error: 'mapping_profile 不是合法 JSON' }, 400); }
      } else {
        mappingProfile = JSON.stringify(body.mapping_profile);
      }
    }
    let authConfig: string | null = null;
    if (body.auth_config != null) {
      if (typeof body.auth_config === 'string') {
        try { JSON.parse(body.auth_config); authConfig = body.auth_config; } catch { return json({ error: 'auth_config 不是合法 JSON' }, 400); }
      } else {
        authConfig = JSON.stringify(body.auth_config);
      }
    }

    const id = uid('esc');
    const now = new Date().toISOString();
    const enabled = body.enabled === false ? 0 : 1;
    await env.DB.prepare(
      `INSERT INTO erp_sync_connections (id, org_id, name, enabled, target_type, base_url, auth_type, auth_config, mapping_profile, direction, schedule_cron, last_synced_at, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, r.org_id, name, enabled, target_type, base_url, auth_type, authConfig, mappingProfile, direction,
      body.schedule_cron || null, null, now, now, r.actorId, r.actorId).run();

    await writeAudit(env.DB, {
      orgId: r.org_id,
      actor: { id: r.actorId, name: r.actorName },
      entity: 'erp_sync',
      action: 'create',
      entityId: id,
      summary: `新建外部 ERP 同步连接「${name}」（${direction}）`,
    });

    const created = await env.DB.prepare(`SELECT * FROM erp_sync_connections WHERE id = ?`).bind(id).first();
    return json(publicConn(created), 201);
  } catch (e: any) {
    return errorResponse(e, '新建同步连接');
  }
}
