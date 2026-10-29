// GET /api/orgs — 公司（组织）列表（登录态，仅 超级管理员 / 管理员）
// ─────────────────────────────────────────────────────────────
// V3.15.8 新增。存在的理由：
//   V3.15.5 起「建公司者不再自动成为管理员」，于是会出现「公司已生效、但内部没有任何
//   管理员」的状态。此时该公司的邀请码没人能改（OrgInviteCodeTab 对管理员锁定为本公司，
//   超管虽被后端允许用 ?orgId= 代管，前端却没有公司可选）——**能力在、入口缺**。
//   本接口提供公司清单（含「有无管理员」判定），供超管在邀请码页挑选要代管的公司。
//
// 权限边界（严格）：
//   · 非 super_admin / admin 一律 403；
//   · super_admin → 可列全部公司；
//   · admin       → **只返回本公司**（不返回错误，而是天然收窄，前端表现为「只有一家可选」）。
//   注意：本接口**不返回邀请码本身**。邀请码是「加入凭证」，只应由本公司管理员 / 超管在
//   邀请码页按公司逐个查看；清单接口一旦带上码值，就等于把全平台加入凭证一次性下发。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';
import { RLS_PRIVILEGED } from '../../_shared/rls';

/** 默认/最大返回条数（公司数可能很多，前端用可搜索下拉，不需要一次拉全） */
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;

function toInt(v: string | null, def: number, min: number, max: number): number {
  const n = parseInt(v || '', 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (!RLS_PRIVILEGED.has(me.role)) return json({ error: '无权查看公司列表' }, 403);

  const url = new URL(request.url);
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const limit = toInt(url.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  // 只看「需代管」（无启用中的管理员且有真实成员）的公司
  const orphanOnly = (url.searchParams.get('orphan') || '').trim() === '1';

  const where: string[] = [];
  const params: any[] = [];

  if (me.role !== 'super_admin') {
    // 管理员：锁定本公司（即使传了 keyword 也只在本公司内搜）
    where.push('o.id = ?');
    params.push(me.org_id);
  }
  if (keyword) {
    where.push('(o.name LIKE ? ESCAPE \'\\\' OR o.company_code LIKE ? ESCAPE \'\\\')');
    const kw = likePattern(keyword);
    params.push(kw, kw);
  }
  if (orphanOnly) {
    where.push(`NOT EXISTS (
      SELECT 1 FROM users a
       WHERE a.org_id = o.id AND a.role = 'admin' AND IFNULL(a.status, 'active') = 'active'
    )`);
    where.push(`EXISTS (
      SELECT 1 FROM users s WHERE s.org_id = o.id AND s.role <> 'super_admin'
    )`);
  }

  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  // 「需代管」的公司排最前（超管最可能想操作它们），其后按待审批人数、成员数、名称排序
  const rows = await env.DB.prepare(
    `SELECT o.id, o.name, o.status, o.code_disabled, o.code_expires_at, o.code_rotated_at,
            (SELECT COUNT(*) FROM users u  WHERE u.org_id = o.id) AS member_count,
            (SELECT COUNT(*) FROM users u  WHERE u.org_id = o.id
               AND u.role = 'admin' AND IFNULL(u.status, 'active') = 'active') AS admin_count,
            (SELECT COUNT(*) FROM users u  WHERE u.org_id = o.id AND u.status = 'pending') AS pending_count,
            (SELECT COUNT(*) FROM users u  WHERE u.org_id = o.id AND u.role <> 'super_admin') AS staff_count
       FROM orgs o${whereSql}
      ORDER BY
        CASE WHEN NOT EXISTS (
               SELECT 1 FROM users a
                WHERE a.org_id = o.id AND a.role = 'admin' AND IFNULL(a.status, 'active') = 'active'
             )
             AND EXISTS (
               SELECT 1 FROM users s WHERE s.org_id = o.id AND s.role <> 'super_admin'
             ) THEN 0 ELSE 1 END,
        (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id AND u.status = 'pending') DESC,
        (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id) DESC,
        o.name
      LIMIT ?`
  ).bind(...params, limit).all();

  const data = (rows.results || []).map((r: any) => {
    const adminCount = r.admin_count || 0;
    const staffCount = r.staff_count || 0;
    return {
      id: r.id,
      name: r.name ?? null,
      status: r.status ?? 'active',
      memberCount: r.member_count || 0,
      adminCount,
      pendingCount: r.pending_count || 0,
      /** 是否存在「启用中的管理员」 */
      hasAdmin: adminCount > 0,
      /** 需超管代管：已生效 + 无管理员 + 有真实成员（非平台超管） */
      needsCare: (r.status ?? 'active') === 'active' && adminCount === 0 && staffCount > 0,
      codeDisabled: !!r.code_disabled,
      codeExpiresAt: r.code_expires_at ?? null,
      codeRotatedAt: r.code_rotated_at ?? null,
    };
  });

  return json({ success: true, data, total: data.length, viewerRole: me.role });
}
