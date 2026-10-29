// 发票单条端点（V3.56.0 · G3 数据对齐 · 父子表）
// GET    /api/fin-invoices/:id   读取（发票头 + 明细行）
// PUT    /api/fin-invoices/:id   更新（不传 items = 明细保持原样；传 [] = 清空明细）
// DELETE /api/fin-invoices/:id   删除（连带删除明细行）
//
// 「不传」与「传空数组」必须区分（见 _shared/parentChild.ts 文件头不变量 ③）：
// 发票的典型操作是「审核/改状态」，若把「不传 items」当成清空，
// 一次状态变更会把全部明细删掉 —— 三单匹配会因此跳过行级判定。
import { pcGet, pcUpdate, pcRemove } from '../../_shared/parentChild';
import { INVOICE_PC } from '../../_shared/finConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { ensureInvoiceVoucher } from '../../_shared/arapPosting';

export async function onRequestGet(context: any) {
  return pcGet(INVOICE_PC, context);
}

export async function onRequestPut(context: any) {
  const { request, env, params } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const body: any = await request.json().catch(() => ({}));

  // ★ V3.56.0 数据对齐（G3 补丁）：编辑时头表金额同样以 Σ明细 复核覆盖
  if (Array.isArray(body.items) && body.items.length > 0) {
    let sumAmount = 0, sumTax = 0, sumTotal = 0;
    for (const raw of body.items) {
      const it = (raw && typeof raw === 'object') ? raw : {};
      sumAmount += Number(it.amount) || 0;
      sumTax += Number(it.taxAmount) || 0;
      sumTotal += Number(it.totalAmount) || 0;
    }
    body.amount = Math.round(sumAmount * 100) / 100;
    body.taxAmount = Math.round(sumTax * 100) / 100;
    body.totalAmount = Math.round(sumTotal * 100) / 100;
  }

  // 重新包装 request：pcUpdate 内部会读 request.json()
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });

  const res = await pcUpdate(INVOICE_PC, { ...context, request: newRequest });

  // ★ V3.60.0 P0-1/P0-3/P2-3：发票审核通过(verified)时自动入账
  //   （采购→冲暂估+应付 2202；销售→应收 1122+收入 6001）。后置非阻断处理。
  try {
    const inv = await env.DB
      .prepare(`SELECT * FROM fin_invoices WHERE org_id = ? AND id = ?`)
      .bind(user.org_id, params.id)
      .first();
    if (inv) await ensureInvoiceVoucher(env.DB, user.org_id, user, inv);
  } catch (e: any) {
    console.error('[fin-invoices PUT] 入账后置处理失败（非阻断）：', e?.message || e);
  }

  return res;
}

export async function onRequestDelete(context: any) {
  return pcRemove(INVOICE_PC, context);
}
