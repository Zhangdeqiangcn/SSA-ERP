// 采购订单履约 / 结算状态聚合（V3.114.0）
// ─────────────────────────────────────────────────────────────────────────────
// 目的：采购订单列表与详情页此前只能看到「订单状态」（已创建/部分收货/已收货…），
//       但业务真正关心的是"这张单走到哪一步了"：
//         订了 10 个 → 入库 8 个（还差 2 个未入库）→ 供应商开票了吗 → 对账了吗 → 钱结清了吗。
//       这几件事分散在 4 个 store（入库 / 发票 / 应付 / 付款计划），订单表上没有任何字段
//       能直接回答，于是一张单的真实进度只能靠人脑把四张表拼起来。
//
// 本模块把四路数据按订单号汇成一束派生字段（getFulfillment），供列表列、筛选、详情页共用，
// 保证「列表看到的」与「详情页看到的」是同一套口径 —— 不允许两处各算一遍。
//
// 口径（务必与财务侧一致，写在这里以备对照）：
//   1) 入库数量：优先取入库单（sourceNo = 订单号）实收数量合计；无入库单时回退订单行的
//      deliveredQuantity（历史 mock 数据没有入库单，回退可避免显示 0 造成"完全没到货"的错觉）。
//   2) 开票：finInvoice.purchaseOrderNo = 订单号，作废（cancelled）发票不计；
//      金额用「价税合计」口径（Invoice.totalAmount）与订单 grandTotal 对齐。
//   3) 对账：以「发票已认证（verified）或已生成应付单」为已对账依据 ——
//      应付台账只有对过账的发票才进得去，这是系统内唯一可追溯的对账痕迹。
//      （供应商门户的 Reconciliation 只到"供应商 + 账期"粒度，挂不到订单，故不参与订单级判定。）
//   4) 结算：应付单 paidAmount 合计优先；无应付记录时回退付款计划 paidAmount，
//      两者取较大值，避免同一笔钱被算两遍又算成零。
//   5) 完结：收货齐 + 开票齐 + 结清，或订单本身已 closed。任一维度欠账都算未完结。
//
// 注意：本模块不写库、不改数据，纯派生。金额比较留 1% 容差（与付款闸门口径一致）。
// ─────────────────────────────────────────────────────────────────────────────

import type { PurchaseOrder } from '@/types/purchase';
import type { InboundOrder } from '@/types/warehouse';
import type { Invoice, PaymentPlan, Payable } from '@/types/finance';

/** 单一维度的完成度 */
export type FulfillStage = 'none' | 'partial' | 'full';

/** 订单履约与结算派生状态（会以扁平字段挂到订单行上，供列/筛选直接读取） */
export interface PoFulfillment {
  /** 订购数量合计 */
  orderedQty: number;
  /** 已入库数量合计（含回退口径） */
  receivedQty: number;
  /** 未入库数量（= 订购 - 已入库，最小 0） */
  remainingQty: number;
  /** 入库进度文案，如 "8/10" */
  receiptProgress: string;
  /** 入库完成度 */
  receiptStage: FulfillStage;
  /** 关联入库单号 */
  inboundNos: string[];

  /** 关联发票号 */
  invoiceNos: string[];
  /** 已开票价税合计 */
  invoicedAmount: number;
  /** 开票完成度 */
  invoiceStage: FulfillStage;

  /** 已对账金额（可追溯的已认证/已入应付部分） */
  reconciledAmount: number;
  /** 对账完成度 */
  reconcileStage: FulfillStage;

  /** 已结算金额 */
  settledAmount: number;
  /** 结算完成度 */
  settleStage: FulfillStage;

  /** 完结判定：closed=已完结 / open=未完结 / cancelled=已取消 */
  closeState: 'closed' | 'open' | 'cancelled';
  /** 一句话欠账摘要，如「未入库 2 件 · 未开票」，用于 tooltip 与详情页 */
  pendingNote: string;
}

/** 聚合所需的数据源（由调用方从各 store 取，便于测试时直接注入） */
export interface FulfillmentSources {
  inbounds: InboundOrder[];
  invoices: Invoice[];
  payables: Payable[];
  paymentPlans: PaymentPlan[];
}

export const EMPTY_SOURCES: FulfillmentSources = {
  inbounds: [],
  invoices: [],
  payables: [],
  paymentPlans: [],
};

/** 金额容差：与付款闸门一致的 1% 相对容差（下限 0.01 元，避免小额单被浮点误差判成差异） */
function amountEnough(covered: number, target: number): boolean {
  if (target <= 0) return covered >= 0;
  return covered >= target - Math.max(0.01, Math.abs(target) * 0.01);
}

function stageOf(covered: number, target: number, hasAny: boolean): FulfillStage {
  if (!hasAny && covered <= 0) return 'none';
  if (amountEnough(covered, target)) return 'full';
  return covered > 0 ? 'partial' : 'none';
}

function norm(v: unknown): string {
  return String(v ?? '').trim().toUpperCase();
}

/** 订单价税合计（兼容未迁移的存量单据：缺 grandTotal 时用未税 + 税） */
export function poGrandTotal(order: PurchaseOrder): number {
  if (typeof order.grandTotal === 'number' && order.grandTotal > 0) return order.grandTotal;
  const net = order.totalAmount ?? 0;
  const tax = order.totalTaxAmount ?? 0;
  return net + tax;
}

/** 多维索引：一次遍历建立，避免列表每行重复全表扫描 */
export interface FulfillmentIndex {
  inboundByOrder: Map<string, { qty: number; nos: string[] }>;
  invoiceByOrder: Map<string, Invoice[]>;
  payableByInvoice: Map<string, Payable[]>;
  planByOrder: Map<string, PaymentPlan[]>;
}

export function buildFulfillmentIndex(src: FulfillmentSources): FulfillmentIndex {
  // 防御：store 水合中间态 / 云端返回包裹对象时，数组字段可能不是数组，
  // 直接 for...of 会抛错让整个列表白屏。这里统一收口成空数组。
  const asArray = <T,>(v: T[] | undefined | null): T[] => (Array.isArray(v) ? v : []);

  const inboundByOrder = new Map<string, { qty: number; nos: string[] }>();
  for (const ib of asArray(src?.inbounds)) {
    if (!ib || ib.status === 'cancelled') continue;
    const key = norm(ib.sourceNo);
    if (!key) continue;
    const qty = (ib.items ?? []).reduce((s, it) => s + (Number(it.actualQuantity) || 0), 0);
    const hit = inboundByOrder.get(key);
    if (hit) {
      hit.qty += qty;
      if (!hit.nos.includes(ib.inboundNo)) hit.nos.push(ib.inboundNo);
    } else {
      inboundByOrder.set(key, { qty, nos: [ib.inboundNo] });
    }
  }

  const invoiceByOrder = new Map<string, Invoice[]>();
  for (const inv of asArray(src?.invoices)) {
    if (!inv || inv.status === 'cancelled') continue;
    const key = norm(inv.purchaseOrderNo);
    if (!key) continue;
    const arr = invoiceByOrder.get(key);
    if (arr) arr.push(inv);
    else invoiceByOrder.set(key, [inv]);
  }

  const payableByInvoice = new Map<string, Payable[]>();
  for (const p of asArray(src?.payables)) {
    if (!p) continue;
    const key = norm(p.invoiceNo);
    if (!key) continue;
    const arr = payableByInvoice.get(key);
    if (arr) arr.push(p);
    else payableByInvoice.set(key, [p]);
  }

  const planByOrder = new Map<string, PaymentPlan[]>();
  for (const pl of asArray(src?.paymentPlans)) {
    if (!pl) continue;
    const key = norm(pl.purchaseOrderNo);
    if (!key) continue;
    const arr = planByOrder.get(key);
    if (arr) arr.push(pl);
    else planByOrder.set(key, [pl]);
  }

  return { inboundByOrder, invoiceByOrder, payableByInvoice, planByOrder };
}

/** 单张订单的履约/结算状态（基于已建好的索引，O(1) 查表） */
export function getFulfillment(order: PurchaseOrder, idx: FulfillmentIndex): PoFulfillment {
  const key = norm(order.orderNo);
  const items = order.items ?? [];
  const orderedQty = items.reduce((s, i) => s + (Number(i.orderedQuantity) || 0), 0);
  const deliveredOnOrder = items.reduce((s, i) => s + (Number(i.deliveredQuantity) || 0), 0);

  const inbound = idx.inboundByOrder.get(key);
  // 入库单与订单行已收数量取较大者：入库单是权威源，订单行是历史回退
  const receivedQty = Math.max(inbound?.qty ?? 0, deliveredOnOrder);
  const remainingQty = Math.max(0, orderedQty - receivedQty);
  const receiptStage: FulfillStage =
    orderedQty <= 0
      ? receivedQty > 0
        ? 'full'
        : 'none'
      : remainingQty === 0
        ? 'full'
        : receivedQty > 0
          ? 'partial'
          : 'none';

  const invoices = idx.invoiceByOrder.get(key) ?? [];
  const grandTotal = poGrandTotal(order);
  const invoicedAmount = invoices.reduce((s, inv) => s + (Number(inv.totalAmount) || 0), 0);
  const invoiceStage = stageOf(invoicedAmount, grandTotal, invoices.length > 0);

  // 对账：发票已认证，或已生成应付单
  let reconciledAmount = 0;
  for (const inv of invoices) {
    const pays = idx.payableByInvoice.get(norm(inv.invoiceNo)) ?? [];
    const hasPayable = pays.length > 0;
    if (hasPayable || inv.status === 'verified' || inv.status === 'paid') {
      reconciledAmount += Number(inv.totalAmount) || 0;
    }
  }
  const reconcileStage = stageOf(reconciledAmount, grandTotal, invoices.length > 0);

  // 结算：应付已付优先，回退付款计划已付
  const payablePaid = invoices.reduce((s, inv) => {
    const pays = idx.payableByInvoice.get(norm(inv.invoiceNo)) ?? [];
    return s + pays.reduce((a, p) => a + (Number(p.paidAmount) || 0), 0);
  }, 0);
  const planPaid = (idx.planByOrder.get(key) ?? []).reduce(
    (s, p) => s + (Number(p.paidAmount) || 0),
    0
  );
  const settledAmount = Math.max(payablePaid, planPaid);
  const settleStage = stageOf(settledAmount, grandTotal, settledAmount > 0);

  const isCancelled = order.status === 'cancelled';
  const closeState: PoFulfillment['closeState'] = isCancelled
    ? 'cancelled'
    : order.status === 'closed' ||
        (receiptStage === 'full' && invoiceStage === 'full' && settleStage === 'full')
      ? 'closed'
      : 'open';

  const notes: string[] = [];
  if (remainingQty > 0) notes.push(`未入库 ${remainingQty} 件`);
  if (invoiceStage !== 'full') notes.push(invoiceStage === 'none' ? '未开票' : '部分开票');
  if (reconcileStage !== 'full') notes.push(reconcileStage === 'none' ? '未对账' : '部分对账');
  if (settleStage !== 'full') notes.push(settleStage === 'none' ? '未结算' : '部分结算');

  return {
    orderedQty,
    receivedQty,
    remainingQty,
    receiptProgress: `${receivedQty}/${orderedQty}`,
    receiptStage,
    inboundNos: inbound?.nos ?? [],
    invoiceNos: invoices.map((i) => i.invoiceNo),
    invoicedAmount,
    invoiceStage,
    reconciledAmount,
    reconcileStage,
    settledAmount,
    settleStage,
    closeState,
    pendingNote: notes.length ? notes.join(' · ') : '已完结',
  };
}

/** 批量：给订单数组挂上履约/结算派生字段（列表页直接用） */
export function withFulfillment<T extends PurchaseOrder>(
  orders: T[],
  src: FulfillmentSources
): Array<T & PoFulfillment> {
  const idx = buildFulfillmentIndex(src);
  return orders.map((o) => ({ ...o, ...getFulfillment(o, idx) }));
}

/** 阶段中文（列表 chip / 详情页共用，避免各处写死不一致） */
export const STAGE_LABELS: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  none: { label: '未开始', color: 'default' },
  partial: { label: '进行中', color: 'warning' },
  full: { label: '已完成', color: 'success' },
};

/** 维度的中文短标签 */
export const DIMENSION_LABELS = {
  receipt: { none: '未入库', partial: '部分入库', full: '已入库' },
  invoice: { none: '未开票', partial: '部分开票', full: '已开票' },
  reconcile: { none: '未对账', partial: '部分对账', full: '已对账' },
  settle: { none: '未结算', partial: '部分结算', full: '已结算' },
  close: { closed: '已完结', open: '未完结', cancelled: '已取消' },
} as const;

/** 筛选下拉选项（列表筛选条与列元信息复用同一份） */
export const STAGE_FILTER_OPTIONS = {
  receipt: [
    { value: 'none', label: '未入库' },
    { value: 'partial', label: '部分入库' },
    { value: 'full', label: '已入库' },
  ],
  invoice: [
    { value: 'none', label: '未开票' },
    { value: 'partial', label: '部分开票' },
    { value: 'full', label: '已开票' },
  ],
  reconcile: [
    { value: 'none', label: '未对账' },
    { value: 'partial', label: '部分对账' },
    { value: 'full', label: '已对账' },
  ],
  settle: [
    { value: 'none', label: '未结算' },
    { value: 'partial', label: '部分结算' },
    { value: 'full', label: '已结算' },
  ],
  close: [
    { value: 'open', label: '未完结' },
    { value: 'closed', label: '已完结' },
    { value: 'cancelled', label: '已取消' },
  ],
};
