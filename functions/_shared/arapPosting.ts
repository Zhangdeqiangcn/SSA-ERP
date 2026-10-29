/**
 * 往来/收入自动凭证（业务域↔财务联动 · V3.60.0 专项修复）
 * ------------------------------------------------------------------
 * 之前：采购发票只落库不记账、付款只改状态不记账、销售只结转成本不确认
 * 收入与应收 —— 应付账款(2202)/应收账款(1122)/主营业务收入(6001)/银行存款
 * (1002) 在整个后端完全没有业务单据去写（全局检索零命中）。
 *
 * 现在：把"发票审核通过"和"付款"这两个已经存在的业务动作，接上凭证生成，
 * 复用 inventoryPosting 已在用的 writeVoucher 通道，金额用服务端已落库的
 * 权威值（invoice.amount / paid_amount），不再信任前端自报。
 *
 * 借贷平衡由 writeVoucher 最后一道闸兜底（Σ借=Σ贷 容差 0.005）。
 *
 * 会计口径（对标金蝶/用友/SAP 标准）：
 *   · 采购发票（fin_invoices 表，全部为采购发票管理模块的进项发票）审核通过：
 *       借 2201 物资采购(GR/IR暂估) [净额] / 贷 2202 应付账款 [净额]
 *       —— 把收货时挂的暂估（借1403/贷2201）从暂估转入正式应付。
 *   · 销售发票（独立的销售管理→销售开票前端实体，走 /api/finance/sales-invoice-voucher）：
 *       借 1122 应收账款 [价税合计] / 贷 6001 主营业务收入 [净额]
 *       / 贷 2221 应交税费-应交增值税(销项税额) [税额]
 *   · 付款（付款计划实付金额增加）：
 *       借 2202 应付账款 [增量] / 贷 1002 银行存款 [增量]
 *
 * 幂等：全部以 source + source_no 查重，重复触发（重试/重复提交）不会双记。
 */
import { writeVoucher } from './voucherWriter';
import { roundAmount } from './money';
// V3.63.0 P0-ST-1：凭证模板优先（根治"模板建了不生效"）——自动凭证先读本组织默认模板分录，未命中回退内置
import { resolveTemplateVoucher } from './voucherTemplate';

const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, '');

/**
 * 采购发票过账：fin_invoices（采购发票管理模块）审核通过(verified)时生成财务凭证。
 * @param inv 已落库的发票行（snake_case：invoice_no / status /
 *            amount / vendor_name / invoice_date）
 * @returns 成功返回凭证 id；不应生成 / 已生成 / 金额非法返回 null
 */
export async function generateInvoiceVoucher(
  db: any,
  orgId: string,
  user: any,
  inv: any
): Promise<string | null> {
  const invoiceNo = inv?.invoice_no;
  if (!invoiceNo) return null; // 无发票号无法定位，跳过
  const amount = roundAmount(Number(inv.amount) || 0);
  if (amount <= 0) return null;

  const sourceNo = `INV-${invoiceNo}`;
  const ex = await db
    .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source = 'invoice' AND source_no = ?`)
    .bind(orgId, sourceNo)
    .first();
  if (ex) return null; // 已生成过，跳过

  // ★ 修正（V3.60.0 复审）：fin_invoices 表全部为「采购发票」（采购发票管理模块），
  //   invoice_type 取值是 vat_special/vat_normal/receipt（发票种类），不存在 purchase/sales 方向。
  //   销售发票是独立的前端实体，走 /api/finance/sales-invoice-voucher 另一通道。
  //   故此处统一按采购发票入账：冲暂估 + 确认应付账款（净额）。
  const date = (inv.invoice_date || '').slice(0, 10) || nowIso().slice(0, 10);
  const period = date.slice(0, 7);
  // ★ V3.63.0 P0-ST-1 凭证模板优先：先读本组织默认模板分录，未命中/异常回退内置（绝不卡业务）
  const invoiceItems: any[] = [
    { summary: `采购发票入账·冲暂估 ${invoiceNo}`, accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: amount, credit: 0 },
    { summary: `确认应付账款 ${inv.vendor_name || invoiceNo}`, accountCode: '2202', accountName: '应付账款', debit: 0, credit: amount },
  ];
  const tv = await resolveTemplateVoucher(db, orgId, 'purchase_invoice', { items: invoiceItems }, amount);
  const items = tv.items;
  const totalDebit = tv.totalDebit;
  const totalCredit = tv.totalCredit;
  return writeVoucher(db, orgId, user, {
    voucherNo: `INV-${invoiceNo}`,
    voucherType: '转',
    date,
    period,
    description: `发票入账 ${invoiceNo}${tv.fromTemplate ? '（凭证模板）' : ''}`,
    source: 'invoice',
    sourceNo,
    status: 'posted',
    totalDebit,
    totalCredit,
    items,
  });
}

/**
 * 发票"审核通过(verified)"时自动入账的封装（供 POST/PUT 端点复用）。
 * 幂等双重保险：① invoice.voucher_generated=true 直接跳过；② generateInvoiceVoucher
 *   内部按 source+source_no 查重。生成成功后回写 voucher_generated 标记位（修复 P2-3）。
 * @returns 是否成功生成了凭证（true=新生成；false=跳过/无需）
 */
export async function ensureInvoiceVoucher(
  db: any,
  orgId: string,
  user: any,
  inv: any
): Promise<boolean> {
  if (!inv) return false;
  if (String(inv.status) !== 'verified') return false;       // 未审核通过，不入账
  if (inv.voucher_generated) return false;                    // 已入账标记，跳过
  try {
    const vid = await generateInvoiceVoucher(db, orgId, user, inv);
    if (vid) {
      // ★ 只写 fin_invoices 真实存在的列（迁移 0053）：该表有 voucher_generated /
      //   updated_at / owner_id，**没有 updated_by**（框架 parentChild.auditCols
      //   早有同结论，见其 682 行注释）。写不存在的列会抛 no such column 被 catch
      //   吞掉，导致「凭证已生成但标记位永远不回写」的假成功。
      await db
        .prepare(`UPDATE fin_invoices SET voucher_generated = 1, updated_at = ? WHERE id = ? AND org_id = ?`)
        .bind(new Date().toISOString(), inv.id, orgId)
        .run();
      return true;
    }
  } catch (e: any) {
    // 凭证生成失败不阻断发票保存（与库存/折旧"吞错留痕"同策略），仅告警。
    console.error('[invoice-voucher] 发票入账失败（已留痕，可重试）：', e?.message || e);
  }
  return false;
}

/**
 * 付款过账：付款计划实付金额增加时生成凭证。
 * 增量记账：key 含累计付款额，同一累计额只出一张；部分付款每次递增累计额即出新凭证。
 * @param delta      本次新增实付金额（newPaid − oldPaid）
 * @param cumulativePaid 付款后累计实付金额（用于幂等 key 与凭证号）
 */
export async function generatePaymentVoucher(
  db: any,
  orgId: string,
  user: any,
  plan: any,
  delta: number,
  cumulativePaid: number
): Promise<string | null> {
  const d = roundAmount(delta);
  if (d <= 0) return null;
  const safeCum = roundAmount(cumulativePaid);
  const sourceNo = `PAY-${plan.id}-${safeCum}`;
  const ex = await db
    .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source = 'payment' AND source_no = ?`)
    .bind(orgId, sourceNo)
    .first();
  if (ex) return null;

  const date = (plan.paid_date || '').slice(0, 10) || nowIso().slice(0, 10);
  const period = date.slice(0, 7);
  // ★ V3.64.0 P1-4 结算偏离核验（诚实最小实现）：累计实付超计划总额时，在凭证摘要留痕告警。
  //   数据源 = fin_payment_plans.total_amount（真实存在、非造基准）；不阻断业务（超付仍记账，仅留痕）。
  //   注：完整"协议价浮动区间核验"需供应商框架协议价基准表（vendor_master 当前无价格列，未立项），
  //   本轮不造假基准，只对有数据的"超计划总额"做留痕——符合"够用"原则。
  const planTotal = roundAmount(Number(plan.total_amount) || 0);
  const overpaid = planTotal > 0 && safeCum > planTotal;
  // ★ V3.65.0 立项④ 协议价偏离核验（升级 P1-4 最小实现为完整基准校验）：
  //   付款前对照该供应商「生效框架协议」的物料 ceiling_price（协议价上限），
  //   经付款计划 purchase_order_no → 采购订单明细行单价，逐行判定是否超协议价。
  //   数据源 = framework_agreement_items.ceiling_price（真实协议价基准，V3.65 立项④ 建表）；
  //   无协议 / 无采购单号 / 查询失败 → 静默回退（诚实降级，绝不造假基准），仅保留既有累计超付留痕。
  let frameworkDeviation = '';
  try {
    const poNo = plan.purchase_order_no;
    const vendorId = plan.vendor_id;
    if (poNo && vendorId) {
      const poRow: any = await db
        .prepare(`SELECT id FROM purchase_orders WHERE org_id = ? AND order_no = ?`)
        .bind(orgId, poNo)
        .first();
      if (poRow) {
        const poItems: any = await db
          .prepare(`SELECT material_id, material_code, unit_price FROM purchase_order_items WHERE purchase_order_id = ?`)
          .bind(poRow.id)
          .all();
        const poRows = poItems.results || [];
        // 该供应商生效（active 且未过期）框架协议的物料协议价上限
        const todayStr = nowIso().slice(0, 10);
        const faItems: any = await db
          .prepare(
            `SELECT i.material_id, i.material_code, i.ceiling_price
               FROM framework_agreement_items i
               JOIN framework_agreements f ON f.id = i.agreement_id
              WHERE f.org_id = ? AND f.vendor_id = ? AND f.status = 'active'
                AND (f.end_date IS NULL OR f.end_date = '' OR f.end_date >= ?)`
          )
          .bind(orgId, vendorId, todayStr)
          .all();
        const ceilings = new Map<string, number>();
        (faItems.results || []).forEach((r: any) => {
          const cap = Number(r.ceiling_price) || 0;
          if (cap <= 0) return;
          const key = r.material_id ? `id:${r.material_id}` : r.material_code ? `code:${r.material_code}` : '';
          if (key) ceilings.set(key, cap);
        });
        const overLines: string[] = [];
        for (const li of poRows) {
          const unitPrice = Number(li.unit_price) || 0;
          if (unitPrice <= 0) continue;
          const key = li.material_id ? `id:${li.material_id}` : li.material_code ? `code:${li.material_code}` : '';
          const cap = key ? ceilings.get(key) : undefined;
          if (cap && unitPrice > cap * 1.0001) {
            overLines.push(`${li.material_code || li.material_id || '?'} 单价 ${unitPrice} 超协议价 ${cap}`);
          }
        }
        if (overLines.length) frameworkDeviation = overLines.slice(0, 5).join('；') + (overLines.length > 5 ? ` 等${overLines.length}项` : '');
      }
    }
  } catch (e: any) {
    // 协议价核验失败不阻断付款（与凭证生成吞错同策略），仅回退到累计超付留痕
    console.error('[payment-framework] 协议价偏离核验失败（已留痕，不阻断）：', e?.message || e);
  }
  // ★ V3.63.0 P0-ST-1 凭证模板优先：付款凭证先读本组织默认模板分录，未命中回退内置
  const payItems: any[] = [
    { summary: `支付应付账款 ${plan.plan_no || plan.id}`, accountCode: '2202', accountName: '应付账款', debit: d, credit: 0 },
    { summary: `银行存款支付 ${plan.vendor_name || ''}`, accountCode: '1002', accountName: '银行存款', debit: 0, credit: d },
  ];
  const tv = await resolveTemplateVoucher(db, orgId, 'payment', { items: payItems }, d);
  const payDesc = `付款 ${plan.plan_no || plan.id}${tv.fromTemplate ? '（凭证模板）' : ''}`
    + (overpaid ? ` ⚠累计实付 ${safeCum} 超计划总额 ${planTotal}（待财务复核）` : '')
    + (frameworkDeviation ? ` ⚠协议价偏离：${frameworkDeviation}（超供应商生效框架协议 ceiling_price，待财务复核）` : '');
  return writeVoucher(db, orgId, user, {
    voucherNo: `PAY-${(plan.plan_no || plan.id)}-${safeCum}`,
    voucherType: '付',
    date,
    period,
    description: payDesc,
    source: 'payment',
    sourceNo,
    status: 'posted',
    totalDebit: tv.totalDebit,
    totalCredit: tv.totalCredit,
    items: tv.items,
  });
}

/**
 * 销售收款过账（V3.61.0 P0-2）——补齐应收账款的「冲减侧」
 * ------------------------------------------------------------------
 * 缺陷背景：V3.60.0 补齐了「销售开票确认应收」（借1122/贷6001/贷2221，即应收**增加**侧），
 *   但**收款冲减侧从未存在** —— 全库没有销售收款端点，1002 只出现在采购付款里。
 *   后果：应收 1122 只增不减 → 应收账款账龄/周转率/DSO 永久失真，且与采购侧不对称
 *   （供应商付款会冲应付，客户收款不会冲应收）。
 *
 * 会计口径（对标金蝶/用友/SAP 标准）：
 *   借 1002 银行存款 [收款额] /贷 1122 应收账款 [收款额]
 *
 * 幂等：以 source='sales-receipt' + source_no=`RCPT-<receiptNo>` 查重，重复提交不双记。
 */
export async function generateSalesReceiptVoucher(
  db: any,
  orgId: string,
  user: any,
  receipt: any
): Promise<string | null> {
  const receiptNo = receipt?.receipt_no || receipt?.receiptNo;
  if (!receiptNo) return null;                // 无收款单号无法定位幂等键，跳过
  const amount = roundAmount(
    Number(receipt?.amount ?? receipt?.received_amount ?? receipt?.receivedAmount) || 0
  );
  if (amount <= 0) return null;               // 金额非法不记账

  const sourceNo = `RCPT-${receiptNo}`;
  const ex = await db
    .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source = 'sales-receipt' AND source_no = ?`)
    .bind(orgId, sourceNo)
    .first();
  if (ex) return null;                        // 已生成过，幂等跳过

  const date = String(receipt?.receipt_date || receipt?.receiptDate || '').slice(0, 10) || nowIso().slice(0, 10);
  const period = date.slice(0, 7);
  const customer = receipt?.customer_name || receipt?.customerName || '';
  // ★ V3.63.0 P0-ST-1 凭证模板优先：销售收款凭证先读本组织默认模板分录，未命中回退内置
  const rcptItems: any[] = [
    { summary: `收到客户货款 ${receiptNo}`, accountCode: '1002', accountName: '银行存款', debit: amount, credit: 0 },
    { summary: `冲减应收账款 ${customer || receiptNo}`, accountCode: '1122', accountName: '应收账款', debit: 0, credit: amount },
  ];
  const tv = await resolveTemplateVoucher(db, orgId, 'sales_receipt', { items: rcptItems }, amount);
  return writeVoucher(db, orgId, user, {
    voucherNo: `RCPT-${receiptNo}`,
    voucherType: '收',
    date,
    period,
    description: `销售收款 ${receiptNo}${tv.fromTemplate ? '（凭证模板）' : ''}`,
    source: 'sales-receipt',
    sourceNo,
    status: 'posted',
    totalDebit: tv.totalDebit,
    totalCredit: tv.totalCredit,
    items: tv.items,
  });
}
