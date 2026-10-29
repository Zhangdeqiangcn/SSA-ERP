// GET /api/users — 用户管理列表（仅超管/管理员可访问）
// 可见范围：super_admin 全量（可按 orgId 过滤）；admin 仅本组织。
// V2.96.0 增补：关联 orgs 返回所属公司名称与状态，便于超级管理员识别「新公司待审批」的申请，
//   并新增 newCompanyCount 供前端显示待批公司角标。
// V3.15.8 增补：新增「公司是否有管理员」判定与「需超管代管」清单。
//   背景：V3.15.5 起「建公司者不再自动成为管理员」，若批准时没给他选「管理员」，
//   该公司就会处于「无管理员」状态——本公司没人能审批成员、没人能管理邀请码。
//   为此接口补两类信息，让这类申请**自动**浮到超级管理员面前，而不是靠人想起来去翻：
//     · 逐行 orgHasAdmin  —— 事实字段，前端据此给公司名打「暂无管理员」标记；
//     · 顶层 orphanOrgs    —— 需代管清单（已生效 + 无启用的管理员 + 有真实成员），
//                            前端置顶为警示横幅，并可一键「只看需代管」。
//   判定口径的两个关键取舍（都有生产数据支撑，见 §判定口径）：
//     ① 用 IFNULL(status,'active') —— users.status 历史上可能为空值（login.ts 亦如此兜底），
//        直接写 status='active' 会把「状态为空的管理员」漏算，进而把有管理员的公司误报成无主；
//     ② 只认「已生效(active) 且 有非超管成员」的公司 —— 新公司待批(status=pending)本就有
//        「新公司待批」角标覆盖，重复计入只会让横幅变成噪音；只有平台超管挂名的空壳公司
//        也不该算「没人管事」（超管本人即可处置）。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';

// 可访问用户管理的角色（只读列表与审批均需此权限）
export const ADMIN_ROLES = new Set(['super_admin', 'admin']);

function toInt(v: string | null, def: number, min: number, max: number): number {
  const n = parseInt(v || '', 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

const SELECT_FIELDS = `u.id, u.org_id, u.username, u.name, u.role, u.department, u.status,
       u.email, u.alt_email, u.phone, u.is_owner, u.created_at,
       o.name AS org_name, o.status AS org_status, o.company_code AS org_code,
       IFNULL(adm.cnt, 0) AS org_admin_cnt`;

const JOIN_SQL = ` FROM users u
       LEFT JOIN orgs o ON o.id = u.org_id
       LEFT JOIN (
         SELECT org_id, COUNT(*) AS cnt FROM users
          WHERE role = 'admin' AND IFNULL(status, 'active') = 'active'
          GROUP BY org_id
       ) adm ON adm.org_id = u.org_id`;

/** 需代管公司清单的最大返回条数（前端只需展示前几条 + 总数） */
const ORPHAN_LIST_LIMIT = 10;

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (!ADMIN_ROLES.has(me.role)) return json({ error: '无权访问用户管理' }, 403);

  const url = new URL(request.url);
  const page = toInt(url.searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = toInt(url.searchParams.get('pageSize'), 20, 1, 100);
  const offset = (page - 1) * pageSize;
  const status = (url.searchParams.get('status') || '').trim();
  const keyword = safeKeyword(url.searchParams.get('keyword'));
  const orgStatus = (url.searchParams.get('orgStatus') || '').trim();
  // super_admin 可选按组织过滤；admin 强制限定自己组织
  const orgIdParam = (url.searchParams.get('orgId') || '').trim();
  const scopeOrgId = me.role === 'super_admin' ? (orgIdParam || null) : me.org_id;
  // 只看「所在公司暂无管理员」的账号（前端「只看需代管」按钮）
  const orphanOnly = (url.searchParams.get('orphan') || '').trim() === '1';

  const where: string[] = [];
  const params: any[] = [];
  if (scopeOrgId) { where.push('u.org_id = ?'); params.push(scopeOrgId); }
  if (status) { where.push('u.status = ?'); params.push(status); }
  if (orgStatus) { where.push("IFNULL(o.status,'active') = ?"); params.push(orgStatus); }
  // ★ orphan=1 必须与上方横幅（loadOrphanOrgs）**完全同口径**，三条一个都不能少。
  //   只写第一条（公司无管理员）会漏掉后两条，实测后果：线上「只看需代管」返回 132 条，
  //   其中 120 条来自「尚未批准的新公司」（各自创建人，本就在「新公司待批」队列里），
  //   而横幅明明说「有 3 家公司需要您代管」——同一屏两个数字互相打脸，用户会认为功能不准。
  if (orphanOnly) {
    where.push('IFNULL(adm.cnt, 0) = 0');
    where.push("IFNULL(o.status, 'active') = 'active'");
    where.push('EXISTS (SELECT 1 FROM users s WHERE s.org_id = u.org_id AND s.role <> \'super_admin\')');
  }
  if (keyword) {
    where.push('(u.username LIKE ? ESCAPE \'\\\' OR u.name LIKE ? ESCAPE \'\\\' OR IFNULL(o.name, \'\') LIKE ? ESCAPE \'\\\')');
    const kw = likePattern(keyword);
    params.push(kw, kw, kw);
  }
  const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

  const rows = await env.DB.prepare(
    `SELECT ${SELECT_FIELDS}${JOIN_SQL}${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, pageSize, offset).all();
  const data = (rows.results || []).map(formatUser);

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS cnt${JOIN_SQL}${whereSql}`)
    .bind(...params).first();
  const total = (countRow as any)?.cnt || 0;

  // pendingCount：可见范围内的待审批账号数（不受 status/keyword 过滤影响，供角标提醒）
  const pendingWhere: string[] = ["u.status = 'pending'"];
  const pendingParams: any[] = [];
  if (scopeOrgId) { pendingWhere.push('u.org_id = ?'); pendingParams.push(scopeOrgId); }
  const pendingRow = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM users u WHERE ${pendingWhere.join(' AND ')}`
  ).bind(...pendingParams).first();
  const pendingCount = (pendingRow as any)?.cnt || 0;

  // newCompanyCount：可见范围内「尚未批准启用的新公司」数量（组织状态为 pending）
  const newCompanyWhere: string[] = ["status = 'pending'"];
  const newCompanyParams: any[] = [];
  if (scopeOrgId) { newCompanyWhere.push('id = ?'); newCompanyParams.push(scopeOrgId); }
  const newCompanyRow = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM orgs WHERE ${newCompanyWhere.join(' AND ')}`
  ).bind(...newCompanyParams).first();
  const newCompanyCount = (newCompanyRow as any)?.cnt || 0;

  // 需超管代管：已生效公司中「没有任何启用中的管理员」且「有真实成员（非平台超管）」的。
  // 仅超级管理员可见——管理员无权处置其它公司，返回给他们只会造成误解。
  const orphan = me.role === 'super_admin'
    ? await loadOrphanOrgs(env.DB)
    : { list: [] as any[], total: 0, pendingTotal: 0 };
  const orphanOrgs = orphan.list;
  const orphanCompanyCount = orphan.total;
  const orphanPendingCount = orphan.pendingTotal;

  return json({
    data, total, page, pageSize, pendingCount, newCompanyCount,
    orphanOrgs, orphanCompanyCount, orphanPendingCount,
  });
}

/**
 * 需代管公司清单（按「卡住的程度」排序：待审批人数 → 成员数）
 * 判定条件（三者同时满足）：
 *   ① 公司已生效：IFNULL(status,'active') = 'active'（pending 的新公司由「新公司待批」角标覆盖）
 *   ② 公司内没有任何「启用中的管理员」：NOT EXISTS(... role='admin' AND IFNULL(status,'active')='active')
 *   ③ 公司内有真实成员：至少一位非 super_admin 的用户（只有平台超管挂名的空壳公司不算——超管本人就能处置）
 */
async function loadOrphanOrgs(DB: any) {
  const rows = await DB.prepare(
    `SELECT o.id, o.name, o.status,
            (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id) AS member_count,
            (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id AND u.status = 'pending') AS pending_count,
            (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id AND u.role <> 'super_admin') AS staff_count
       FROM orgs o
      WHERE IFNULL(o.status, 'active') = 'active'
        AND NOT EXISTS (
              SELECT 1 FROM users a
               WHERE a.org_id = o.id AND a.role = 'admin' AND IFNULL(a.status, 'active') = 'active'
            )
      ORDER BY o.created_at`
  ).all();

  const all = (rows.results || [])
    .filter((r: any) => (r.staff_count || 0) > 0)
    .map((r: any) => ({
      orgId: r.id,
      orgName: r.name ?? null,
      orgStatus: r.status ?? 'active',
      memberCount: r.member_count || 0,
      pendingCount: r.pending_count || 0,
    }))
    .sort((a: any, b: any) => (b.pendingCount - a.pendingCount) || (b.memberCount - a.memberCount));

  return {
    list: all.slice(0, ORPHAN_LIST_LIMIT),
    // 总数与待审批合计按**全量**计算，不能被展示用的截断影响（否则横幅数字会假性停在 10）
    total: all.length,
    pendingTotal: all.reduce((sum: number, o: any) => sum + o.pendingCount, 0),
  };
}

export function formatUser(r: any) {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    role: r.role,
    department: r.department ?? null,
    status: r.status ?? 'active',
    email: r.email ?? null,
    altEmail: r.alt_email ?? null,
    phone: r.phone ?? null,
    isOwner: !!r.is_owner,
    orgId: r.org_id,
    orgName: r.org_name ?? null,
    orgStatus: r.org_status ?? 'active',
    orgCode: r.org_code ?? null,
    /** 所属公司是否存在「启用中的管理员」（V3.15.8）；false 表示该公司暂无人能审批成员 / 管邀请码 */
    orgHasAdmin: (r.org_admin_cnt ?? 0) > 0,
    createdAt: r.created_at,
  };
}
