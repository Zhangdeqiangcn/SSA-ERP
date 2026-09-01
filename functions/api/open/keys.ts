// /api/open/keys — API Key 管理（session 管理员鉴权，明文 key 仅返回一次）
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import { sha256 } from '../../_shared/apiKey';

function isAdmin(user: any): boolean {
  return ['admin', 'owner', 'boss'].includes(user.role);
}

function genKey(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return 'sk_' + Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const rows = await context.env.DB.prepare(
    `SELECT id, label, scopes, created_by, revoked, rate_limit, created_at, revoked_at
     FROM api_keys WHERE org_id = ? ORDER BY created_at DESC`
  ).bind(user.org_id).all();
  return json({ data: rows.results || [] });
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const body = await context.request.json().catch(() => ({}));
  const label = body.label || '未命名';
  const scopes = body.scopes || 'read';
  const plain = genKey();
  const hash = await sha256(plain);
  const now = new Date().toISOString();

  await context.env.DB.prepare(
    `INSERT INTO api_keys (id, org_id, key_hash, label, scopes, created_by, revoked, rate_limit, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 60, ?)`
  ).bind(uid('ak'), user.org_id, hash, label, scopes, user.username, now).run();

  return json({ ok: true, id: uid('ak'), plainKey: plain, label, scopes }, 201);
}
