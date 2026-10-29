// GET  /api/approval-delegates — 委托关系列表（我委托出去的 / 委托给我的）
// POST /api/approval-delegates — 新建委托
//
// V3.17.9 修复差距 11（审批委托）。迁移 0075 建表。
//
// 为什么要一张独立的委托关系表，而不是在用户表上加个「代理人」字段：
//   · 委托有**时间段**：出差 3 天和长期授权是两回事，加字段表达不了；
//   · 委托有**范围**：只委托「采购类」和委托全部，是两种授权强度；
//   · 委托有**历史**：谁在什么时候把审批权交给了谁，是要能被审计追问的。
import { getUserFromRequest, json } from '../../_shared/auth';
import { rlsCondition } from '../../_shared/rls';
import { writeAudit } from '../../_shared/auditLog';
import { isDelegateActive, todayStr } from '../../_shared/approvalInstance';

export async function onRequestGet(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const url = new URL(context.request.url);
  // view=out 我委托出去的；view=in 别人委托给我的；不传则两者都返回
  const view = url.searchParams.get('view');

  // ★ 与 approval-instances 同一个坑：org_id 必须**无条件**进 where。
  //   原先 view=out 只推入 'delegator_id = ?'，而 params 里已有 org_id →
  //   占位符 1 个、绑定 2 个 → 500。线上验收同批抓出。
  const where: string[] = ['org_id = ?'];
  const params: any[] = [user.org_id];

  const rls = rlsCondition(user, 'approval_delegates');
  if (rls.clause !== '1=1') {
    where.push(rls.clause);
    params.push(...rls.params);
  }

  if (view === 'out') {
    where.push('delegator_id = ?');
    params.push(user.id);
  } else if (view === 'in') {
    where.push('delegate_id = ?');
    params.push(user.id);
  } else {
    where.push('(delegator_id = ? OR delegate_id = ?)');
    params.push(user.id, user.id);
  }

  const res = await db
    .prepare(
      `SELECT * FROM approval_delegates
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC LIMIT 200`
    )
    .bind(...params)
    .all();

  // 生效与否由服务端算好再下发，避免前端各处各写一遍日期区间判定
  const today = todayStr();
  const rows = ((res.results || []) as any[]).map((r) => ({ ...r, effective: isDelegateActive(r, today) }));

  return json({ ok: true, data: rows, today });
}

export async function onRequestPost(context) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const db = context.env.DB;
  const body = await context.request.json().catch(() => ({}));
  const { delegateId, delegateName, module, startDate, endDate, reason } = body;

  if (!delegateId) return json({ error: '缺少必填字段：delegateId' }, 400);
  if (!startDate || !endDate) return json({ error: '缺少必填字段：startDate, endDate' }, 400);
  if (String(endDate) < String(startDate)) {
    return json({ error: '结束日期不能早于开始日期' }, 400);
  }
  if (delegateId === user.id) {
    return json({ error: '不能把审批权委托给自己' }, 400);
  }

  // 受委托人必须在同一组织内且处于启用状态 —— 否则会造出一条永远不会生效的委托，
  // 而用户在界面上看不出来（他以为已经安排了代班）。
  const target = await db
    .prepare(`SELECT id, name, status FROM users WHERE id = ? AND org_id = ?`)
    .bind(String(delegateId), user.org_id)
    .first();
  if (!target) return json({ error: '受委托人不存在或不属于当前组织' }, 404);
  if (target.status && target.status !== 'active') {
    return json({ error: '受委托人账号未启用，无法接受委托' }, 400);
  }

  // 同一委托人 + 同一范围 的**有效期重叠**委托只允许一条，避免同一时刻有两套路由规则
  const overlap = await db
    .prepare(
      `SELECT id FROM approval_delegates
        WHERE org_id = ? AND delegator_id = ? AND active = 1
          AND COALESCE(module, '') = COALESCE(?, '')
          AND start_date <= ? AND end_date >= ?`
    )
    .bind(user.org_id, user.id, module || null, String(endDate), String(startDate))
    .first();
  if (overlap) {
    return json({ error: '该时间段内已存在同范围的委托，请先撤销原委托或调整日期', id: overlap.id }, 409);
  }

  const id = 'ad-' + crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO approval_delegates
           (id, org_id, delegator_id, delegator_name, delegate_id, delegate_name, module,
            start_date, end_date, reason, active, created_at, updated_at, created_by, owner_id, dept_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
      )
      .bind(
        id, user.org_id, user.id, user.name || user.username || '',
        String(delegateId), String(delegateName || target.name || ''), module || null,
        String(startDate), String(endDate), reason || null,
        now, now, user.id, user.id, user.department || null,
      )
      .run();
  } catch (e: any) {
    return json({ error: e?.message || '创建委托失败' }, 500);
  }

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name || user.username || null },
    entity: 'approval_delegate',
    action: 'create',
    entityId: id,
    summary: `建立审批委托：${user.name || user.id} → ${delegateName || target.name}（${startDate} ~ ${endDate}）`,
  });

  return json({ ok: true, data: { id } }, 201);
}
