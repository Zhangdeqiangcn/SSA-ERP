/**
 * 审批实例公共助手（V3.17.9 修复差距9/10/11）
 * ------------------------------------------------------------------
 * 三件事共用这里的判定，避免「撤回/催办/委托」各写一份口径：
 *   ① 委托路由：某人有生效委托时，他的待办实际该由谁处理；
 *   ② 反向查询：我作为受委托人，在委托期内代理了谁的待办；
 *   ③ 撤回的业务回退：把业务单据从「审批中」退回「草稿」，否则撤回只是
 *      改了我们自己这张表、单据状态还挂着审核中，属于「看起来撤回成功」。
 *
 * 设计口径（与项目既有约定一致）：
 * · 委托生效判定 = active=1 且「今天落在 [start_date, end_date] 闭区间内」。
 *   不用数据库默认值/触发器兜，业务判定写在代码里、可读可测。
 * · 日期一律按 YYYY-MM-DD 字符串比较（与全项目日期口径一致，避免时区歧义）。
 * · 委托可限定 module；module 为空表示全模块。
 */
import { writeAudit } from './auditLog';

/** 生效范围内的日期：与项目其它模块一致，取本地日期的 YYYY-MM-DD 部分 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 判定一条委托记录在指定日期是否生效（闭区间） */
export function isDelegateActive(row: any, onDate: string): boolean {
  if (!row) return false;
  if (Number(row.active) !== 1) return false;
  const s = String(row.start_date || '');
  const e = String(row.end_date || '');
  if (!s || !e) return false;
  return onDate >= s && onDate <= e;
}

/**
 * 制单与审核分离（SoD，Segregation of Duties）纯函数判定。
 *
 * 三大 ERP（金蝶 KIS「录入≠审核」、用友「制单/审核/记账三权分立」、
 *   SAP 授权对象内互斥事务码）都强制：**提交人不能审批自己提交的单据**。
 *
 * 为什么是纯函数：端点拿到 submitterId 与 effectiveApproverId 后调一次即可，
 *   不依赖 db / user，便于单测锁死「自审被拦」与「他人审通过」成对断言
 *   （铁律㊹：加闸门必须同时断言合法路径没被拦死）。
 *
 * 判定口径：
 *   · submitterId / approverId 任一为空 → 不拦截（空审批人由端点其它逻辑处理，
 *     例如末节点无需推进、或委托路由尚未解析）。SoD 只回答「同一个人自审」。
 *   · 两者相同（trim 去首尾空格，防御脏数据；用户 id 是稳定生成值，按精确匹配
 *     语义判定，**不做大小写折叠**——折叠会掩盖真实的不同 id）→ 判定为自审，
 *     返回 true 表示「需要拦截」。
 *
 * @returns true 表示构成自审、调用方应 403 拦截；false 表示放行。
 */
export function assertSoD(submitterId: string | null | undefined, approverId: string | null | undefined): boolean {
  if (!submitterId || !approverId) return false;
  return String(submitterId).trim() === String(approverId).trim();
}

/**
 * 委托路由：给定「配置上本应的审批人」，返回委托期内实际应处理的人。
 * @returns 命中委托时返回 { id, name, delegatorId, delegatorName }；无委托返回 null
 */
export async function resolveDelegate(
  db: any,
  orgId: string,
  approverId: string | null,
  module: string,
  onDate: string,
): Promise<{ id: string; name: string; delegatorId: string; delegatorName: string } | null> {
  if (!approverId) return null;
  const res = await db
    .prepare(
      `SELECT * FROM approval_delegates
        WHERE org_id = ? AND delegator_id = ? AND active = 1
          AND start_date <= ? AND end_date >= ?
        ORDER BY created_at DESC`
    )
    .bind(orgId, approverId, onDate, onDate)
    .all()
    .catch(() => ({ results: [] }));

  for (const row of res.results || []) {
    if (!isDelegateActive(row, onDate)) continue;
    // module 为空 = 全模块；否则必须与当前模块一致
    if (row.module && row.module !== module) continue;
    // 不允许把审批权委托给自己（会形成空转）；此人仍按原审批人处理
    if (row.delegate_id === approverId) continue;
    return {
      id: String(row.delegate_id),
      name: String(row.delegate_name || ''),
      delegatorId: String(row.delegator_id),
      delegatorName: String(row.delegator_name || ''),
    };
  }
  return null;
}

/**
 * 反向查询：我（受委托人）在委托期内代理了哪些人。
 * 用途：审批中心列出「委托给我的」待办时，先把被代理人的审批人 id 集合算出来。
 * @returns [{ delegatorId, delegatorName, module }]
 */
export async function listDelegatorsForMe(
  db: any,
  orgId: string,
  delegateId: string,
  onDate: string,
): Promise<Array<{ delegatorId: string; delegatorName: string; module: string | null }>> {
  const res = await db
    .prepare(
      `SELECT * FROM approval_delegates
        WHERE org_id = ? AND delegate_id = ? AND active = 1
          AND start_date <= ? AND end_date >= ?`
    )
    .bind(orgId, delegateId, onDate, onDate)
    .all()
    .catch(() => ({ results: [] }));

  return (res.results || [])
    .filter((row: any) => isDelegateActive(row, onDate))
    .map((row: any) => ({
      delegatorId: String(row.delegator_id),
      delegatorName: String(row.delegator_name || ''),
      module: row.module ? String(row.module) : null,
    }));
}

/**
 * 撤回时把业务单据退回草稿，让「撤回」在业务侧真正成立。
 *
 * 边界（刻意不做的事，写在这里免得后来者以为是漏了）：
 * · 只回退**本迁移之前就已落 D1 的**业务单据（当前 = purchase_requests）。
 *   价格审批 / 物料申请的状态还在前端浏览器存储里，服务端没有可回退的行，
 *   强行 UPDATE 一张不存在的表只会 500 —— 因此返回 'not_server_side'，
 *   由前端自行把本地状态退回草稿。
 * · 不回退已进入后续动作的单据：若单据已不是 pending/审批中状态（例如已下单），
 *   撤回不该悄悄改状态，返回 false 让调用方如实告诉用户。
 *
 * @returns 'ok' 已回退 | 'not_server_side' 该模块前端自管 | 'skipped' 状态不允许回退 | 'missing' 单据不存在
 */
export async function withdrawBusinessDoc(
  db: any,
  orgId: string,
  module: string,
  entityId: string,
  reason: string,
  actorName: string,
): Promise<'ok' | 'not_server_side' | 'skipped' | 'missing'> {
  if (module === 'purchase_request') {
    const row = await db
      .prepare(`SELECT id, status FROM purchase_requests WHERE id = ? AND org_id = ?`)
      .bind(entityId, orgId)
      .first()
      .catch(() => null);
    if (!row) return 'missing';
    if (row.status !== 'pending' && row.status !== 'reviewing') return 'skipped';
    await db
      .prepare(
        `UPDATE purchase_requests SET status = 'draft', current_step = 0, updated_at = ?, updated_by = ?
          WHERE id = ? AND org_id = ?`
      )
      .bind(new Date().toISOString(), actorName, entityId, orgId)
      .run();
    return 'ok';
  }

  if (module === 'sales_order') {
    const row = await db
      .prepare(`SELECT id, status FROM sales_orders WHERE id = ? AND org_id = ?`)
      .bind(entityId, orgId)
      .first()
      .catch(() => null);
    if (!row) return 'missing';
    if (row.status !== 'pending') return 'skipped';
    await db
      .prepare(`UPDATE sales_orders SET status = 'draft', updated_at = ?, updated_by = ? WHERE id = ? AND org_id = ?`)
      .bind(new Date().toISOString(), actorName, entityId, orgId)
      .run();
    return 'ok';
  }

  // 其余模块（价格审批 / 物料申请 / ECN…）状态在前端存储，服务端无行可改
  void reason;
  return 'not_server_side';
}

/** 写一条审批动作流水（只追加）。失败不阻断主流程，但会写审计降级留痕。 */
export async function writeApprovalAction(
  db: any,
  input: {
    orgId: string;
    instanceId: string;
    action: string;
    nodeOrder?: number | null;
    nodeName?: string | null;
    actorId?: string | null;
    actorName?: string | null;
    targetId?: string | null;
    targetName?: string | null;
    comment?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await db
      .prepare(
        `INSERT INTO approval_actions
           (id, org_id, instance_id, action, node_order, node_name, actor_id, actor_name, target_id, target_name, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        'aa-' + crypto.randomUUID(),
        input.orgId,
        input.instanceId,
        input.action,
        input.nodeOrder ?? null,
        input.nodeName ?? null,
        input.actorId ?? null,
        input.actorName ?? null,
        input.targetId ?? null,
        input.targetName ?? null,
        input.comment ?? null,
        now,
      )
      .run();
  } catch (e: any) {
    // 动作流水写失败不能把一次成功的审批动作变成失败（业务连续性优先），
    // 但必须留痕，否则「谁批的」将永久缺失。
    await writeAudit(db, {
      orgId: input.orgId,
      actor: { id: input.actorId || null, name: input.actorName || null },
      entity: 'approval_action',
      action: 'create',
      entityId: input.instanceId,
      summary: `审批动作流水写入失败（${input.action}）：${e?.message || e}`,
    });
  }
}
