// /api/open/keys — API Key 管理（session 管理员鉴权，明文 key 仅返回一次）
//
// 【V3.2.0 变更 · 评测 M-12 / L-02 整改】
//   - 创建时支持指定有效期（expiresInDays；不传 = 默认 90 天，显式传 null = 永久）；
//   - 列表返回 expires_at / rotated_at，供前端展示「有效 / 即将到期 / 已过期」；
//   - 明文密钥生成收敛到 _shared/apiKey.ts 的 generateApiKey()，与轮换接口同源，
//     避免两处各写一份随机数逻辑（历史教训：同一逻辑两份实现必然漂移）。
import { getUserFromRequest, json, uid } from '../../_shared/auth';
import {
  sha256,
  generateApiKey,
  normalizeExpiresDays,
  expiresAtFromDays,
  DEFAULT_EXPIRES_DAYS,
} from '../../_shared/apiKey';

import { audit } from '../../_shared/auditLog';
function isAdmin(user: any): boolean {
  // super_admin 为新增平台超管，需一并纳入，避免超管无法管理 API Key
  return ['super_admin', 'admin'].includes(user.role);
}

export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const rows = await context.env.DB.prepare(
    `SELECT id, label, scopes, created_by, revoked, rate_limit, created_at, revoked_at,
            expires_at, rotated_at
     FROM api_keys WHERE org_id = ? ORDER BY created_at DESC`
  )
    .bind(user.org_id)
    .all();
  return json({
    data: rows.results || [],
    defaultExpiresDays: DEFAULT_EXPIRES_DAYS,
    now: new Date().toISOString(),
  });
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const body = await context.request.json().catch(() => ({}));
  const label = body.label || '未命名';
  const scopes = body.scopes || 'read';

  // 未显式给出有效期字段 → 采用默认（90 天）；显式给 null/'forever' → 永久。
  const hasExpiry = Object.prototype.hasOwnProperty.call(body, 'expiresInDays');
  const days = hasExpiry ? normalizeExpiresDays(body.expiresInDays) : DEFAULT_EXPIRES_DAYS;
  const expiresAt = expiresAtFromDays(days);

  const plain = generateApiKey();
  const hash = await sha256(plain);
  const now = new Date().toISOString();
  const keyId = uid('ak');

  await context.env.DB.prepare(
    `INSERT INTO api_keys (id, org_id, key_hash, label, scopes, created_by, revoked, rate_limit, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 60, ?, ?)`
  )
    .bind(keyId, user.org_id, hash, label, scopes, user.username, now, expiresAt)
    .run();

  await audit(context.env.DB, user.org_id, user, 'api_keys', 'create', `创建开放接口密钥「${label}」，有效期 ${days ?? '永久'} 天`);
  return json(
    {
      ok: true,
      id: keyId,
      plainKey: plain,
      label,
      scopes,
      createdAt: now,
      expiresAt,
      expiresInDays: days,
    },
    201
  );
}
