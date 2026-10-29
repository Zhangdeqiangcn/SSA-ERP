// 发票集合端点（V3.56.0 · G3 数据对齐 · 父子表）
// GET  /api/fin-invoices   列表（分页 / keyword / RLS，含发票明细行）
// POST /api/fin-invoices   创建（发票头 + items 明细原子写入）
//
// ── 为什么从通用实体路由迁移到专用端点 ──────────────────────────────
// 原走 /api/entities/finInvoice（平表路由），items 数组被静默丢弃 →
// fin_invoice_items 表永远为空 → 行级三单匹配读不到发票明细 →
// threeWayMatch 走 NO_INVOICE_ITEMS 跳过 → 行级闸门形同虚设。
// 现在走 parentChild 框架：头 + items 在 db.batch 原子写入，与付款计划/项目核算同范式。
//
// ── 头表金额服务端复核（同 G1/G6 范式）──────────────────────────────
// 当存在明细行时，头表的 amount / taxAmount / totalAmount 以 Σ明细 覆盖，
// 杜绝「头金额=前端自报、和明细对不上」。前端正常路径下覆盖结果一致；
// 若客户端传错/被篡改，服务端以明细合计为准纠正。
import { pcList, pcCreate } from '../../_shared/parentChild';
import { INVOICE_PC } from '../../_shared/finConfig';
import { getUserFromRequest, json } from '../../_shared/auth';
import { ensureInvoiceVoucher } from '../../_shared/arapPosting';

export async function onRequestGet(context: any) {
  return pcList(INVOICE_PC, context);
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const user = await getUserFromRequest(request, env.DB);
  if (!user) return json({ error: '未登录' }, 401);

  const body: any = await request.json().catch(() => ({}));

  // ★ V3.56.0 数据对齐（G3 补丁）：头表金额服务端以 Σ明细 复核覆盖
  //   口径与采购单/销售单 G1/G6 完全一致：只覆盖不拒绝（正常路径覆盖值一致，
  //   异常路径以明细为准纠正）。仅当存在明细行时才覆盖（头单无明细保持原值）。
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

  // 重新包装 request：pcCreate 内部会读 request.json()，所以用新 body 构造新 request
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body),
  });

  const res = await pcCreate(INVOICE_PC, { ...context, request: newRequest });

  // ★ V3.60.0 P0-1/P0-3/P2-3：发票审核通过(verified)时自动入账
  //   （采购→冲暂估+应付 2202；销售→应收 1122+收入 6001）。后置非阻断处理。
  try {
    const payload: any = await res.clone().json().catch(() => null);
    if (payload && payload.id) {
      const inv = await env.DB
        .prepare(`SELECT * FROM fin_invoices WHERE org_id = ? AND id = ?`)
        .bind(user.org_id, payload.id)
        .first();
      if (inv) await ensureInvoiceVoucher(env.DB, user.org_id, user, inv);
    }
  } catch (e: any) {
    console.error('[fin-invoices POST] 入账后置处理失败（非阻断）：', e?.message || e);
  }

  return res;
}
