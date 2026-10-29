// GET /api/org-members — 当前组织成员名录（登录用户均可读）
//
// ── 为什么需要它（V3.17.9 修复差距 11 的配套）──────────────────────
// 「审批委托」要选受委托人，而唯一能列出用户的 /api/users 只对
// admin / super_admin 开放（那是用户管理入口，含邮箱、手机号、角色等敏感字段）。
// 结果就是：普通审批人（如财务主管、采购主管）根本拉不到人选列表，
// 「委托」功能对他们等于不可用 —— 功能存在、位置不对，与差距19 是同一类问题。
//
// ── 刻意只返回什么 ──────────────────────────────────────────────
// 只回 id / name / department / role，**不回** email、phone、alt_email、
// is_owner、created_at 等。理由：办事协作只需要「知道该找谁」，
// 不需要把账号信息一览无余地摊开；少回一个字段就少一份泄露面。
// 在 ERP 里，组织成员名录本身是内部公开信息（找人、转单、指派都要用），
// 因此这里不做角色限制，但**严格限定在本组织 + 启用状态**。
import { safeKeyword, likePattern } from '../../_shared/searchKeyword';
import { getUserFromRequest, json } from '../../_shared/auth';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  const limit = Math.min(Number(url.searchParams.get('pageSize')) || 500, 1000);
  const keyword = safeKeyword(url.searchParams.get('q'));

  // IFNULL(status,'active') 与 /api/users、登录链路口径一致：
  //   users.status 历史上存在空值，直接写 status='active' 会把这批人漏掉，
  //   表现为「明明是同事却搜不到、选不了」。
  const where = [`u.org_id = ?`, `IFNULL(u.status, 'active') = 'active'`];
  const params: any[] = [user.org_id];
  if (keyword) {
    where.push(`(u.name LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\')`);
    params.push(likePattern(keyword), likePattern(keyword));
  }
  params.push(limit);

  const res = await db
    .prepare(
      `SELECT u.id, u.name, u.username, u.department, u.role
         FROM users u
        WHERE ${where.join(' AND ')}
        ORDER BY u.name ASC
        LIMIT ?`
    )
    .bind(...params)
    .all()
    .catch(() => ({ results: [] }));

  const data = ((res.results || []) as any[]).map((r) => ({
    id: String(r.id),
    name: String(r.name || r.username || r.id),
    department: r.department || null,
    role: r.role || null,
  }));

  return json({ ok: true, data });
}
