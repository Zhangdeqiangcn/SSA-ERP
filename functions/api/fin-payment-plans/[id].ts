// 付款计划单条端点
// GET    /api/fin-payment-plans/:id   读取（计划 + 分期明细）
// PUT    /api/fin-payment-plans/:id   更新（不传 installments = 分期保持原样；传 [] = 清空）
// DELETE /api/fin-payment-plans/:id   删除（连带删除分期）
//
// 「不传」与「传空数组」必须区分（见 _shared/parentChild.ts 文件头不变量 ③）：
// 付款计划的典型操作是「只把状态改成已付清」，若把「不传 installments」当成清空，
// 一次状态变更会把全部分期删掉 —— 已付记录随之消失，对账无从查起。
//
// ── V3.19.0：付款闸门（三单匹配）────────────────────────────────────
// 本端点是**真正掏钱**的位置：逐期付款会把 paid_amount 加上去、
// 付清会把 status 改成 paid。因此这里必须拦。
//
// 但本端点同时承担日常编辑（改备注、改到期日），一律拦截会让用户
// 很快要求关掉这个功能，所以先判断「是否属于付款动作」：
//   · status 由非 paid 变为 paid
//   · paid_amount 增加
// 只有命中这两种才算付款，才走闸门；改备注、改到期日完全不受影响。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { PAYMENT_PLAN_PC } from '../../_shared/finConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { guardPaymentRow } from '../../_shared/paymentGate';
import { generatePaymentVoucher } from '../../_shared/arapPosting';
import { roundAmount } from '../../_shared/money';

export async function onRequestGet(context: any) {
  return pcGet(PAYMENT_PLAN_PC, context);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  // 取当前库中状态：判断「是否付款动作」必须与库里的真实值比，
  // 不能信任前端传来的旧值（前端可能带着过期的 paid_amount 提交）。
  const existing: any = await env.DB.prepare(
    `SELECT * FROM ${PAYMENT_PLAN_PC.parentTable} WHERE id = ? AND org_id = ?`,
  )
    .bind(params.id, user.org_id)
    .first();
  if (!existing) return json({ error: '付款计划不存在' }, 404);

  const body: any = await request
    .clone()
    .json()
    .catch(() => ({}));

  // 四个写入点共用同一个守卫：判断「是否付款动作 + 本次付多少 + 该不该拦」都在里面
  const blocked = await guardPaymentRow(env.DB, user, body, existing);
  if (blocked) return blocked;

  const res = await pcUpdate(PAYMENT_PLAN_PC, context);

  // ★ V3.60.0 P0-2/P2-3：付款（实付金额增加）时自动记账
  //   （借 2202 应付账款 / 贷 1002 银行存款），并写回 voucher_generated 标记位。后置非阻断。
  try {
    const updated = await env.DB
      .prepare(`SELECT * FROM fin_payment_plans WHERE org_id = ? AND id = ?`)
      .bind(user.org_id, params.id)
      .first();
    if (updated) {
      const oldPaid = roundAmount(Number(existing.paid_amount) || 0);
      const newPaid = roundAmount(Number(updated.paid_amount) || 0);
      const delta = roundAmount(newPaid - oldPaid);
      if (delta > 0) {
        const vid = await generatePaymentVoucher(env.DB, user.org_id, user, updated, delta, newPaid);
        if (vid) {
          // ★ 只写 fin_payment_plans 真实存在的列（迁移 0053）：该表无 updated_by
          //   （框架 parentChild.auditCols 早有同结论）。写不存在的列会抛
          //   no such column 被外层 catch 吞掉 → 标记位永远不回写的假成功。
          await env.DB
            .prepare(`UPDATE fin_payment_plans SET voucher_generated = 1, updated_at = ? WHERE id = ? AND org_id = ?`)
            .bind(new Date().toISOString(), params.id, user.org_id)
            .run();
        }
      }
    }
  } catch (e: any) {
    console.error('[fin-payment-plans PUT] 付款入账后置处理失败（非阻断）：', e?.message || e);
  }

  return res;
}

export async function onRequestDelete(context: any) {
  return pcRemove(PAYMENT_PLAN_PC, context);
}
