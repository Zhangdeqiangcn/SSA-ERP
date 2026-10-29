// /api/open/keys/:id — 单条 API Key 操作（session 管理员鉴权）
//   DELETE 吊销指定 Key（终态，不可恢复）
//   POST   轮换：原地替换密钥哈希，返回新明文一次（旧密钥同一时刻失效）
//
// 独立路由文件：Pages Functions 将 /api/open/keys/:id 路由到此文件，
// 原 keys.ts 仅匹配 /api/open/keys（集合）。
//
// 【V3.2.0 变更 · 评测 L-02 整改】新增轮换（rotate）。
//   为什么轮换要「原地替换」而不是「新建一条 + 吊销旧的」：
//     调用方在第三方系统里配置的是「密钥字符串」，还需要记住它对应哪条记录。
//     原地替换让 Key 的编号、标签、权限范围、限流与审计归属全部保持不变，
//     使用方只需把配置里的字符串换掉，不必重建整个集成配置，运营成本最低。
import { getUserFromRequest, json } from '../../../_shared/auth';
import {
  sha256,
  generateApiKey,
  normalizeExpiresDays,
  expiresAtFromDays,
} from '../../../_shared/apiKey';

import { audit } from '../../../_shared/auditLog';
function isAdmin(user: any): boolean {
  // super_admin 为新增平台超管，需一并纳入，避免超管无法管理 API Key
  return ['super_admin', 'admin'].includes(user.role);
}

/** D1 的受影响行数在 meta.changes（旧写法 res.changes 恒为 undefined，会把 404 误报成 200） */
function changedRows(res: any): number {
  return Number(res?.meta?.changes ?? res?.changes ?? 0);
}

/**
 * 轮换后的到期时间：
 *   - 显式指定了 expiresInDays → 按指定值（null = 永久）
 *   - 未指定且原为永久 → 仍永久
 *   - 未指定且原为限期 → 保留「原来的有效期总长度」，从当前时刻重新起算
 *     （推不出时长时按默认 90 天，绝不因为推断失败而给出永久密钥）
 */
function nextExpiryForRotation(row: any, days: number | null, hasExpiry: boolean): string | null {
  if (hasExpiry) return expiresAtFromDays(days);
  const old = row?.expires_at ? String(row.expires_at) : '';
  if (!old) return null;
  const oldT = new Date(old).getTime();
  const createdT = new Date(String(row?.created_at || '')).getTime();
  const span = Number.isFinite(oldT) && Number.isFinite(createdT) ? oldT - createdT : 0;
  const effDays = span > 0 ? Math.round(span / 86400000) : 90;
  return expiresAtFromDays(normalizeExpiresDays(effDays) ?? 90);
}

export async function onRequestDelete(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const id = context.params.id;
  if (!id) return json({ error: '缺少 id' }, 400);
  const res = await context.env.DB.prepare(
    'UPDATE api_keys SET revoked = 1, revoked_at = ? WHERE id = ? AND org_id = ?'
  )
    .bind(new Date().toISOString(), id, user.org_id)
    .run();
  if (changedRows(res) === 0) return json({ error: 'Key 不存在' }, 404);
  await audit(context.env.DB, user.org_id, user, 'api_keys', 'revoke', `吊销开放接口密钥 ${id}`);
  return json({ ok: true });
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  if (!isAdmin(user)) return json({ error: '需管理员权限' }, 403);

  const id = context.params.id;
  if (!id) return json({ error: '缺少 id' }, 400);

  // 先确认该 Key 属于本组织且尚未吊销：吊销是终态，不支持「轮换即复活」，
  // 否则等于给了一条绕过「吊销后不可恢复」这个安全承诺的路径。
  const row = await context.env.DB.prepare(
    'SELECT id, label, revoked, expires_at, created_at FROM api_keys WHERE id = ? AND org_id = ?'
  )
    .bind(id, user.org_id)
    .first();
  if (!row) return json({ error: 'Key 不存在' }, 404);
  if ((row as any).revoked) {
    return json({ error: '已吊销的 Key 不支持轮换，请新建', code: 'REVOKED' }, 409);
  }

  const body = await context.request.json().catch(() => ({}));
  const hasExpiry = Object.prototype.hasOwnProperty.call(body, 'expiresInDays');
  const days = hasExpiry ? normalizeExpiresDays(body.expiresInDays) : null;
  const expiresAt = nextExpiryForRotation(row, days, hasExpiry);

  const plain = generateApiKey();
  const hash = await sha256(plain);
  const now = new Date().toISOString();

  const res = await context.env.DB.prepare(
    `UPDATE api_keys
        SET key_hash = ?, expires_at = ?, rotated_at = ?, revoked = 0, revoked_at = NULL
      WHERE id = ? AND org_id = ?`
  )
    .bind(hash, expiresAt, now, id, user.org_id)
    .run();
  if (changedRows(res) === 0) return json({ error: 'Key 不存在' }, 404);

  await audit(context.env.DB, user.org_id, user, 'api_keys', 'rotate', `轮换开放接口密钥 ${id}`);
  return json({
    ok: true,
    id,
    label: (row as any).label,
    plainKey: plain,
    rotatedAt: now,
    expiresAt,
  });
}
