// /api/finance/closing-periods — 会计期间结账状态（V3.46.0 第2批②）
// ------------------------------------------------------------------
// 为什么要有这个端点：结账状态此前只存在 app_state（浏览器大对象）里，
// 任何登录用户都能覆写、且无审计；isPeriodClosed 还因此是 fail-open
// （键损坏即全部期间锁失效）。这是对标 SAP TFASTAT + F.OB52 的核心差距 ——
// 标杆系统的期间状态由数据库表承载、只能通过"重新打开期间"授权动作变更并写审计。
//
// 本端点提供：
//   GET    ?period=YYYY-MM   查期间状态；不带 period 则返回全部
//   POST                   结账（需 finance.update 权限；带结账前检查）
//   PUT                    反结账（需 finance.delete 权限 + 强制填原因 + 审计）
//
// 权限口径复用 operationGuard：finance 模块的 update 用于结账、delete 用于反结账。
// 反结账比结账更敏感（它解除的是管控），故要求更高的操作权限。
import { getUserFromRequest, json } from '../../../_shared/auth';
import { guardOperation } from '../../../_shared/operationGuard';
import { writeAudit } from '../../../_shared/auditLog';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, '');

export async function onRequestGet(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;
  const url = new URL(context.request.url);
  const period = (url.searchParams.get('period') || '').trim();

  try {
    if (period) {
      const row = await db
        .prepare('SELECT * FROM fin_closing_periods WHERE org_id = ? AND period = ? LIMIT 1')
        .bind(user.org_id, period)
        .first();
      return json({ data: row || null, period });
    }
    const rows = await db
      .prepare('SELECT * FROM fin_closing_periods WHERE org_id = ? ORDER BY period DESC LIMIT 60')
      .bind(user.org_id)
      .all();
    return json({ data: rows.results || [] });
  } catch (e: any) {
    return json({ error: '期间状态表暂不可用：' + (e?.message || e) }, 503);
  }
}

/** 结账前检查（对标金蝶/用友"期末处理"逐项确认、SAP Closing Cockpit） */
async function runClosingChecks(db: any, orgId: string, period: string) {
  const issues: string[] = [];

  // ① 试算平衡：本期凭证借贷是否平
  try {
    const bal = await db
      .prepare(
        `SELECT IFNULL(SUM(debit),0) AS d, IFNULL(SUM(credit),0) AS c
           FROM voucher_items vi JOIN vouchers v ON v.id = vi.voucher_id
          WHERE v.org_id = ? AND v.period = ?`
      )
      .bind(orgId, period)
      .first();
    const d = Number(bal?.d || 0), c = Number(bal?.c || 0);
    if (Math.abs(d - c) >= 0.01) {
      issues.push(`试算不平：借方合计 ${d.toFixed(2)}，贷方合计 ${c.toFixed(2)}，差额 ${(d - c).toFixed(2)}`);
    }
  } catch { /* 表不可用时不阻断结账，交由月末总账核对 */ }

  // ② 凭证日期是否都落在本期内（跨期凭证会让"本期已结账"名不副实）
  try {
    const cross = await db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM vouchers
          WHERE org_id = ? AND period = ? AND date IS NOT NULL AND substr(date, 1, 7) != ?`
      )
      .bind(orgId, period, period)
      .first();
    if (Number(cross?.cnt || 0) > 0) {
      issues.push(`存在 ${Number(cross.cnt)} 张期间与日期不一致的凭证（跨期），请先修正`);
    }
  } catch { /* 同上 */ }

  // ③ 折旧是否已计提（固定资产台账与总账会背离）
  try {
    const unDep = await db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM fixed_assets
          WHERE org_id = ? AND status = 'in_use' AND original_value > 0
            AND (last_depreciation_period IS NULL OR last_depreciation_period < ?)`
      )
      .bind(orgId, period)
      .first();
    if (Number(unDep?.cnt || 0) > 0) {
      issues.push(`有 ${Number(unDep.cnt)} 项在用固定资产本期未计提折旧`);
    }
  } catch { /* 同上 */ }

  return issues;
}

export async function onRequestPost(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;

  // 结账 = 财务修改权限（与凭证过账同级）
  const guard = await guardOperation(user, 'finance', 'update', db, user.org_id);
  if (guard) return guard;

  const body = await context.request.json().catch(() => ({}));
  const period = String(body.period || '').trim();
  if (!PERIOD_RE.test(period)) {
    return json({ error: '期间格式应为 YYYY-MM（如 2026-06）', code: 'INVALID_PERIOD' }, 400);
  }

  const now = nowIso();
  // V3.83.0 三态结账：action='profit_close' 落中间态 profit_closed（损益已结转、尚未最终结账，
  //   凭证仍可记账），跳过结账前硬检查；缺省/'close' 维持原最终结账（closed）语义。
  const targetStatus: string = body.action === 'profit_close' ? 'profit_closed' : 'closed';

  const existing = await db
    .prepare('SELECT * FROM fin_closing_periods WHERE org_id = ? AND period = ? LIMIT 1')
    .bind(user.org_id, period)
    .first();

  // 已最终结账（closed）不能再退回中间态，需先反结账
  if (targetStatus === 'profit_closed' && existing && String(existing.status) === 'closed') {
    return json({ error: `会计期间 ${period} 已结账，请先反结账`, code: 'ALREADY_CLOSED' }, 400);
  }
  // 重复最终结账拦截（保持原语义）
  if (targetStatus === 'closed' && existing && String(existing.status) === 'closed') {
    return json({ error: `会计期间 ${period} 已结账`, code: 'ALREADY_CLOSED' }, 400);
  }

  // 结账前检查：仅最终结账（closed）需要「试算/跨期/折旧」硬检查；
  // 中间态 profit_closed 不锁凭证、是可记账的过渡态，不做硬检查。
  let issues: string[] = [];
  if (targetStatus === 'closed') {
    issues = await runClosingChecks(db, user.org_id, period);
    if (issues.length > 0 && !body.force) {
      return json({
        error: `结账前检查未通过（${issues.length} 项）：${issues.join('；')}`,
        code: 'CLOSING_CHECKS_FAILED',
        issues,
        hint: '处理后可重新结账；确需强制结账请传 force=true（会留审计）',
      }, 400);
    }
  }

  // 幂等 upsert：中间态不记 closed_by/closed_at（不算锁定），最终结账才记
  await db
    .prepare(
      `INSERT INTO fin_closing_periods
         (id, org_id, period, status, closed_by, closed_at, profit_voucher_no, fx_voucher_no, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(org_id, period) DO UPDATE SET
         status = excluded.status, closed_by = excluded.closed_by, closed_at = excluded.closed_at,
         profit_voucher_no = excluded.profit_voucher_no, fx_voucher_no = excluded.fx_voucher_no,
         updated_at = excluded.updated_at`
    )
    .bind(
      `fcp-${user.org_id}-${period}`, user.org_id, period, targetStatus,
      targetStatus === 'closed' ? user.name : null,
      targetStatus === 'closed' ? now : null,
      body.profitVoucherNo || null,
      body.fxVoucherNo || null,
      now, now,
    )
    .run();

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'fin_closing_periods',
    entityId: `fcp-${user.org_id}-${period}`,
    action: targetStatus === 'profit_closed' ? 'profit_close' : 'close',
    summary:
      targetStatus === 'profit_closed'
        ? `损益结转会计期间 ${period}（中间态，凭证 ${body.profitVoucherNo || '未填'}）`
        : `结账会计期间 ${period}` +
          `${body.profitVoucherNo ? `（损益结转凭证 ${body.profitVoucherNo}）` : ''}` +
          `${body.fxVoucherNo ? `（汇兑结转凭证 ${body.fxVoucherNo}）` : ''}` +
          `${body.force ? '【强制结账：存在未过检查项】' : ''}` +
          `${issues.length ? `（检查未过项：${issues.join('；')}）` : ''}`,
  });

  return json({ ok: true, period, status: targetStatus, issues, forced: !!body.force });
}

export async function onRequestPut(context: any) {
  const user = await getUserFromRequest(context.request, context.env.DB);
  if (!user) return json({ error: '未登录' }, 401);
  const db = context.env.DB;

  // 反结账 = 财务删除权限（比结账更敏感：它解除的是管控，故要求更高权限）
  const guard = await guardOperation(user, 'finance', 'delete', db, user.org_id);
  if (guard) return guard;

  const body = await context.request.json().catch(() => ({}));
  const period = String(body.period || '').trim();
  const reason = String(body.reason || '').trim();

  if (!PERIOD_RE.test(period)) {
    return json({ error: '期间格式应为 YYYY-MM（如 2026-06）', code: 'INVALID_PERIOD' }, 400);
  }
  // ★ 强制填原因：反结账是审计事件，无原因的口头操作等于没有管控
  if (reason.length < 4) {
    return json({ error: '反结账必须填写原因（至少 4 个字），该操作会记入审计', code: 'REASON_REQUIRED' }, 400);
  }

  const existing = await db
    .prepare('SELECT * FROM fin_closing_periods WHERE org_id = ? AND period = ? LIMIT 1')
    .bind(user.org_id, period)
    .first();
  if (!existing) {
    return json({ error: `会计期间 ${period} 未结账，无需反结账`, code: 'NOT_CLOSED' }, 400);
  }

  const now = nowIso();
  await db
    .prepare(
      `UPDATE fin_closing_periods
          SET status = 'open', closed_by = NULL, closed_at = NULL, updated_at = ?
        WHERE org_id = ? AND period = ?`
    )
    .bind(now, user.org_id, period)
    .run();

  await writeAudit(db, {
    orgId: user.org_id,
    actor: { id: user.id, name: user.name },
    entity: 'fin_closing_periods',
    entityId: `fcp-${user.org_id}-${period}`,
    action: 'reopen',
    summary: `反结账会计期间 ${period}｜原因：${reason}`
      + `${existing.closed_by ? `（原结账人：${existing.closed_by}，原结账时间：${existing.closed_at || '未记录'}）` : ''}`,
  });

  return json({ ok: true, period, status: 'open' });
}
