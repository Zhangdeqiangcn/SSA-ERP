// 销售收款单·单条端点（V3.61.0 · P0-2）
// GET    /api/fin-sales-receipts/:id读取
// PUT    /api/fin-sales-receipts/:id    更新（若首次入账则记账；已入账不重复记）
// DELETE /api/fin-sales-receipts/:id    删除（★连带删除其凭证，避免「收款单没了但银行存款凭证还在」）
//
// ★ 为什么删除必须连带删凭证：凭证是权威账，单据是源。若只删单据，
//   银行存款 1002 会凭空多一笔、应收 1122 会被冲减一次而单据已不存在——
//   这正是铁律㊴治理的「数字对不上且无法自愈」。parentChild.pcRemove 只清业务表，
//   凭证在 vouchers 表，必须显式按 source/source_no 清理。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { SALES_RECEIPT_PC } from '../../_shared/finConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { generateSalesReceiptVoucher } from '../../_shared/arapPosting';
import { roundAmount } from '../../_shared/money';

export async function onRequestGet(context: any) {
  return pcGet(SALES_RECEIPT_PC, context);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const body: any = await request.json().catch(() => ({}));
  if (body.amount !== undefined) {
    body.amount = roundAmount(Number(body.amount) || 0);
    if (body.amount <= 0) {
      return json({ error: '收款金额必须大于 0', code: 'INVALID_AMOUNT' }, 400);
    }
  }

  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });
  const res = await pcUpdate(SALES_RECEIPT_PC, { ...context, request: newRequest });

  // 记账：generateSalesReceiptVoucher 内部按 source+source_no 幂等，
  //   已生成的收款单改状态为 cancelled 后再改回 posted 也不会双记。
  try {
    const rc: any = await env.DB
      .prepare(`SELECT * FROM fin_sales_receipts WHERE org_id = ? AND id = ?`)
      .bind(user.org_id, params.id)
      .first();
    if (rc && String(rc.status) !== 'cancelled' && !rc.voucher_generated) {
      const vid = await generateSalesReceiptVoucher(env.DB, user.org_id, user, rc);
      if (vid) {
        await env.DB
          .prepare(`UPDATE fin_sales_receipts SET voucher_generated = 1, updated_at = ? WHERE id = ? AND org_id = ?`)
          .bind(new Date().toISOString(), params.id, user.org_id)
          .run();
      }
    }
  } catch (e: any) {
    console.error('[fin-sales-receipts PUT] 收款入账后置处理失败（非阻断）：', e?.message || e);
  }

  return res;
}

export async function onRequestDelete(context: any) {
  const { env, params } = context;
  const user = await getUserFromRequest(context.request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const rc: any = await env.DB
    .prepare(`SELECT id, receipt_no FROM fin_sales_receipts WHERE org_id = ? AND id = ?`)
    .bind(user.org_id, params.id)
    .first();
  if (!rc) return json({ error: '销售收款单不存在' }, 404);

  const res = await pcRemove(SALES_RECEIPT_PC, context);

  // 连带清理其凭证（先查凭证 id → 删 voucher_items → 删 vouchers，与 vouchers/[id].ts 同语义）
  try {
    const sourceNo = `RCPT-${rc.receipt_no}`;
    const v: any = await env.DB
      .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source = 'sales-receipt' AND source_no = ?`)
      .bind(user.org_id, sourceNo)
      .first();
    if (v?.id) {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM voucher_items WHERE voucher_id = ?`).bind(v.id),
        env.DB.prepare(`DELETE FROM vouchers WHERE id = ? AND org_id = ?`).bind(v.id, user.org_id),
      ]);
    }
  } catch (e: any) {
    console.error('[fin-sales-receipts DELETE] 连带清理收款凭证失败：', e?.message || e);
  }

  return res;
}
