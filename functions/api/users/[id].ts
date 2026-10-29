// PUT /api/users/:id — 审批 / 调整用户（仅超管/管理员）
// 规则护栏见下方注释，核心：不可授予 super_admin、不可改动 super_admin、admin 不可提权他人为 admin。
import { getUserFromRequest, json } from '../../_shared/auth';
import { errorResponse } from '../../_shared/errors';
// V3.5.0 B6：补齐写审计（用户审批与角色提权是权限体系的根，必须逐次留痕）
import { writeAudit } from '../../_shared/auditLog';

// 可访问用户管理的角色
const ADMIN_ROLES = new Set(['super_admin', 'admin']);
// 有效角色集合（与迁移 0040 归一化一致；super_admin 不可经此接口授予，故不含）
// ★ V3.51.0 补 sales_manager / salesperson：此前它们是"悬空角色"（后端矩阵有、
//   但此白名单缺，导致管理员界面授不出来、前端类型也不认），现正式纳入。
const VALID_ROLES = new Set([
  'admin', 'rd_engineer', 'process_engineer', 'qa_engineer', 'qa_inspector',
  'warehouse_keeper', 'logistics', 'finance_manager', 'accountant', 'buyer',
  'prod_manager', 'prod_leader', 'vendor', 'sales_manager', 'salesperson', 'user',
]);
const VALID_STATUS = new Set(['active', 'pending', 'rejected']);

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const me = await getUserFromRequest(request, env.DB);
  if (!me) return json({ error: '未登录' }, 401);
  if (!ADMIN_ROLES.has(me.role)) return json({ error: '无权访问用户管理' }, 403);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const target = await env.DB.prepare(
    `SELECT id, org_id, username, name, role, department, status, email, phone, is_owner, created_at
     FROM users WHERE id = ?`
  ).bind(params.id).first();
  if (!target) return json({ error: '用户不存在' }, 404);
  const t = target as any;

  // 可见范围：admin 仅能操作本组织用户
  if (me.role !== 'super_admin' && t.org_id !== me.org_id) {
    return json({ error: '无权操作该用户' }, 403);
  }

  // V2.97.0 修复（安全审计 A3）：禁止对自己执行审批 / 角色 / 状态变更，
  // 避免管理员误把自己「驳回」或降级造成自我锁定（组织内再无人可管）。
  if (t.id === me.id) {
    return json({ error: '不能对自己的账号执行审批或权限变更' }, 403);
  }

  // 护栏：super_admin 账号不可通过本接口修改/降级（即使调用者本身是 super_admin 也不行），
  //   避免误操作锁死系统的唯一超管；超管调整只能由数据库运维直接执行。
  if (t.role === 'super_admin') {
    return json({ error: '超级管理员账号不可通过此接口修改' }, 403);
  }

  const setClauses: string[] = [];
  const setParams: any[] = [];

  // 1) 审批动作：approve → active；reject → rejected
  const action = String(body.action ?? '');
  if (action === 'approve') { setClauses.push('status = ?'); setParams.push('active'); }
  else if (action === 'reject') { setClauses.push('status = ?'); setParams.push('rejected'); }
  else if (action) return json({ error: '未知的操作类型' }, 400);

  // 2) 显式 status 变更（无 action 时生效）
  if (!action && body.status !== undefined && body.status !== null && String(body.status) !== '') {
    const s = String(body.status);
    if (!VALID_STATUS.has(s)) return json({ error: '无效的账号状态' }, 400);
    setClauses.push('status = ?');
    setParams.push(s);
  }

  // 3) role 变更
  if (body.role !== undefined && body.role !== null && String(body.role) !== '') {
    const r = String(body.role);
    // 任何情况下都不允许经接口设置超管
    if (r === 'super_admin') return json({ error: '不能将用户设为超级管理员' }, 400);
    if (!VALID_ROLES.has(r)) return json({ error: '无效的角色' }, 400);
    // 提权护栏：仅 super_admin 可授予 admin
    if (r === 'admin' && me.role !== 'super_admin') {
      return json({ error: '仅超级管理员可授予管理员角色' }, 403);
    }
    setClauses.push('role = ?');
    setParams.push(r);
  }

  // 4) department 变更
  if (body.department !== undefined && body.department !== null) {
    setClauses.push('department = ?');
    setParams.push(String(body.department).trim() || null);
  }

  if (!setClauses.length) return json({ error: '没有需要更新的字段' }, 400);

  try {
    await env.DB.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...setParams, params.id)
      .run();
  } catch (e: any) {
    return errorResponse(e, '更新');
  }

  // V2.96.0：批准新公司首注册者时，同步启用其所属组织（org.status: pending → active），
  // 这样该公司才算真正成立，之后其成员的注册申请才由该公司管理员自行审批。
  let orgActivated: string | null = null;
  if (action === 'approve' && t.is_owner) {
    const orgRow = (await env.DB.prepare('SELECT id, name, status FROM orgs WHERE id = ?')
      .bind(t.org_id)
      .first()) as any;
    if (orgRow && orgRow.status === 'pending') {
      await env.DB.prepare("UPDATE orgs SET status = 'active' WHERE id = ?").bind(orgRow.id).run();
      orgActivated = orgRow.name || orgRow.id;
    }
  }

  // V3.15.8：回执带上「该公司现在有没有管理员」，并对「超管代管无主公司」这一情形留痕。
  //   为什么要在回执里给：批准新公司创建人时若没选「管理员」，该公司立刻进入「无管理员」状态——
  //   前端据此可以当场提示「已列入需代管清单」，而不是让缺口无声存在到下一个人来踩。
  //   为什么审计里要写：代管审批与常规审批的责任主体不同（本该公司管理员批，实由平台超管批），
  //   事后追责/回溯时必须一眼看得出这次是谁替谁做的决定。
  const adminCntRow = (await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM users
      WHERE org_id = ? AND role = 'admin' AND IFNULL(status, 'active') = 'active'`
  ).bind(t.org_id).first()) as any;
  const orgHasAdmin = ((adminCntRow?.cnt as number) || 0) > 0;
  // 「代管」的判据只取「该公司没人能管」——即本公司管理员缺位，这件事除了平台超管没人做得了。
  // 不再附加「是否本人所属组织」：对超管而言那不是治理差别，只会把文案搞得绕。
  const caretakerMode = me.role === 'super_admin' && !orgHasAdmin;

  const updated = await env.DB.prepare(
    `SELECT id, org_id, username, name, role, department, status, email, phone, is_owner, created_at
     FROM users WHERE id = ?`
  ).bind(params.id).first();

  // B6 审计：用户审批与角色变更属于「权限体系的根」——把一个人的角色从 user 提到
  //   admin，等于把该组织的全部管理权限交出去。这类动作的审计必须写清三件事：
  //     ① 对象是谁（用户名 + 姓名，不写 id，因为人看 id 认不出是谁）；
  //     ② 变了什么（角色 / 状态的前后值，写成 a → b）；
  //     ③ 谁授的权（actor 即操作人，另有 approve 时组织被激活的结果）。
  //   旧的 role / status 已在前面查 target 时取出，这里直接复用，无需再查一次。
  const changes: string[] = [];
  if (action === 'approve') changes.push(`审批状态：${(t as any).status || '-'} → 已批准（active）`);
  else if (action === 'reject') changes.push(`审批状态：${(t as any).status || '-'} → 已驳回（rejected）`);
  else if (body.status !== undefined && String(body.status) !== '' && String(body.status) !== String((t as any).status)) {
    changes.push(`账号状态：${(t as any).status || '-'} → ${body.status}`);
  }
  if (body.role !== undefined && String(body.role) !== '' && String(body.role) !== String((t as any).role)) {
    changes.push(`角色：${(t as any).role || '-'} → ${body.role}`);
  }
  if (body.department !== undefined && String(body.department) !== String((t as any).department ?? '')) {
    changes.push(`部门：${(t as any).department || '-'} → ${body.department || '-'}`);
  }

  await writeAudit(env.DB, {
    orgId: (t as any).org_id,
    actor: { id: me.id, name: me.name },
    entity: 'users',
    entityId: params.id,
    action: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'update',
    summary:
      `对用户「${(t as any).name || (t as any).username}」（${(t as any).username}）执行变更：` +
      (changes.join('；') || '无实际变化') +
      (orgActivated ? `；同时激活组织「${orgActivated}」` : '') +
      (caretakerMode ? '；本次属**代管审批**（该公司暂无管理员，由平台超管代为处理）' : '') +
      (!orgHasAdmin ? '；注意：该公司当前无管理员，无人能审批成员或管理邀请码' : '') +
      (me.role === 'super_admin' ? '【操作人身份：超级管理员】' : '【操作人身份：管理员】'),
  });

  return json({
    success: true,
    data: formatUser(updated as any),
    orgActivated,
    /** 变更后该公司是否存在启用中的管理员（V3.15.8），false 时前端提示已进入需代管清单 */
    orgHasAdmin,
    /** 本次是否为「超管代管无主公司」的审批（V3.15.8） */
    caretakerMode,
  });
}

function formatUser(r: any) {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    role: r.role,
    department: r.department ?? null,
    status: r.status ?? 'active',
    email: r.email ?? null,
    phone: r.phone ?? null,
    isOwner: !!r.is_owner,
    orgId: r.org_id,
    createdAt: r.created_at,
  };
}
