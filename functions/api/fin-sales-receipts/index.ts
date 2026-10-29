// 销售收款单端点（V3.61.0 · P0-2 · 补齐应收账款冲减侧）
// GET    /api/fin-sales-receipts        列表（分页 / keyword / RLS）
// POST   /api/fin-sales-receipts        创建（自动生成收款凭证：借1002 银行存款 / 贷1122 应收账款）
// GET    /api/fin-sales-receipts/:id    单条读取
// DELETE /api/fin-sales-receipts/:id    删除（连带删除其凭证，避免账实不符）
//
// ── 为什么必须有这个端点 ───────────────────────────────────────────
// V3.60.0 补齐了「销售开票确认应收」（借1122/贷6001/贷2221，即应收**增加**侧），
//   但**收款冲减侧从未存在**：全库无销售收款端点，1002 只出现在采购付款里。
//   后果：应收 1122 只增不减 → 应收账龄/周转率/DSO 永久失真；
//   且与采购侧不对称（供应商付款会冲应付，客户收款不会冲应收）。
//   本端点把「客户收款」这一业务动作接上权威凭证通道，与采购付款同范式。
//
// ── 会计口径（对标金蝶/用友/SAP）────────────────────────────────
//   借 1002 银行存款 [收款额] /贷 1122 应收账款 [收款额]
//   借贷平衡由 writeVoucher 最后一道闸兜底（Σ借=Σ贷 容差 0.005）。
//
// ── 幂等 ─────────────────────────────────────────────────────────
// 以 source='sales-receipt' + source_no=`RCPT-<receiptNo>` 查重，重复提交不双记银行存款。
import { pcList, pcCreate, pcGet, pcRemove } from '../../_shared/parentChild';
import { SALES_RECEIPT_PC } from '../../_shared/finConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { generateSalesReceiptVoucher } from '../../_shared/arapPosting';
import { roundAmount } from '../../_shared/money';

export async function onRequestGet(context: any) {
  return pcList(SALES_RECEIPT_PC, context);
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const body: any = await request.json().catch(() => ({}));

  // 金额服务端规范化：2 位小数、> 0 才能记账（与发票/付款同口径）
  body.amount = roundAmount(Number(body.amount) || 0);
  if (body.amount <= 0) {
    return json({ error: '收款金额必须大于 0', code: 'INVALID_AMOUNT' }, 400);
  }
  // 默认状态posted：收款是既成事实（草稿态不记账，与付款计划 pending 语义一致）
  if (!body.status) body.status = 'posted';

  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });

  const res = await pcCreate(SALES_RECEIPT_PC, { ...context, request: newRequest });

  // 自动记账（后置非阻断，与发票/付款同范式）
  try {
    const payload: any = await res.clone().json().catch(() => null);
    if (payload && payload.id) {
      const rc: any = await env.DB
        .prepare(`SELECT * FROM fin_sales_receipts WHERE org_id = ? AND id = ?`)
        .bind(user.org_id, payload.id)
        .first();
      if (rc && String(rc.status) !== 'cancelled') {
        const vid = await generateSalesReceiptVoucher(env.DB, user.org_id, user, rc);
        if (vid) {
          // 回写标记位（只写真实存在的列：fin_sales_receipts 与发票/付款计划同构，无 updated_by）
          await env.DB
            .prepare(`UPDATE fin_sales_receipts SET voucher_generated = 1, updated_at = ? WHERE id = ? AND org_id = ?`)
            .bind(new Date().toISOString(), payload.id, user.org_id)
            .run();
        }
      }
    }
  } catch (e: any) {
    console.error('[fin-sales-receipts POST] 收款入账后置处理失败（非阻断）：', e?.message || e);
  }

  return res;
}
