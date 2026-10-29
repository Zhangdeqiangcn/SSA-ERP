/**
 * ★ V3.47.0 第3批 3-05：三单匹配的**行级**比对（数量维度）
 *
 * ── 为什么必须做行级（这是真实的数据准确性风险）────────────────────
 * 此前三单匹配只能比金额（`threeWayMatch.ts:21-25` 已写明能力边界：
 * 「fin_invoices 表没有明细行，也就不存在『发票数量』这个数据」）。
 * 于是这个场景能**蒙混过关**：订单订 A×100(@10) + B×50(@20) = 1500 元；
 *   实际只收到 A×100，收 B×0；发票也只开 A×100 = 1000 元。
 *   付款 1000 元 → 金额维度全部通过 → 放行。
 *   但 **B 料既没到货、也没收到发票**，系统却报告"三单匹配通过"。
 *   若 B 料是外购件且已被下游工单领用，成本就凭空少了 1000 元。
 *   对标金蝶/用友/SAP：三单匹配必须**按订单行**比数量，超差需审批。
 *
 * ── 行级判定的三条规则（各自对标标杆）────────────────────────────
 * ① 逐行比「累计入库量」与「累计开票量」，而不是比单张单据
 *    （分批到货、分批开票是常态，只比单张必然误判）
 * ② 容差按行判定（`tolerance_rate`，默认 2%）—— 行级比金额更易受计量与
 *    尾差影响，无容差会把正常尾差判成超差（对标 SAP 采购容差配置）
 * ③ 只拦风险侧：欠交（short）与超交（over）都拦，**恰好等于或轻微少交不拦**
 *    （少交可能是部分到货，付款给已到货部分属正常）
 */

/** 订单行（来自 purchase_order_items） */
export interface OrderLine {
  id: string;
  materialId?: string | null;
  materialCode?: string | null;
  materialName?: string | null;
  unit?: string | null;
  orderedQuantity: number;
  unitPrice?: number;
}

/** 入库行（来自 inbound_order_items，quantity 用实收数量 actual_quantity） */
export interface InboundLine {
  orderItemId?: string | null;
  materialId?: string | null;
  materialCode?: string | null;
  quantity: number;
}

/** 发票行（来自 fin_invoice_items，迁移 0083） */
export interface InvoiceLine {
  orderItemId?: string | null;
  materialId?: string | null;
  materialCode?: string | null;
  quantity: number;
  /** 行级容差（比例），不传用全局默认 */
  toleranceRate?: number | null;
}

export type LineMatchStatus = 'matched' | 'short' | 'over' | 'pending';

export interface LineMatchResult {
  orderItemId: string | null;
  materialCode: string;
  materialName: string;
  unit: string;
  orderedQty: number;
  inboundQty: number;
  invoicedQty: number;
  status: LineMatchStatus;
  /** 差异量 = min(入库, 开票) − 订单量（负=欠交，正=超交） */
  diffQty: number;
  /** 该行是否超差（超出容差） */
  exceeded: boolean;
  note: string;
}

export interface LineMatchSummary {
  lines: LineMatchResult[];
  /** 全部行通过 */
  ok: boolean;
  /** 超差行数 */
  exceededCount: number;
  /** 欠交行数 */
  shortCount: number;
  /** 汇总说明（可直接给业务人员看，要说清"差什么、差多少"） */
  summary: string;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round4 = (n: number): number => Math.round((Number(n) || 0) * 10000) / 10000;

/** 全局默认容差 2%（与金额维度的 TWM_TOLERANCE 保持同一量级） */
export const LINE_TOLERANCE_DEFAULT = 0.02;

/**
 * 行匹配键：优先 orderItemId（行级精确），退回 物料编码+单位。
 *
 * ★ 订单行的锚点字段名是 `id`（不是 orderItemId）—— 首次实现时统一按
 *   `orderItemId` 取键，导致订单行算出 `mc:A#个` 而入库行算出 `oi:oi-1`，
 *   两者永不相等 ⇒ 累计入库量恒 0、每行都判 short（单测一次抓出）。
 *   这里显式接受 `id`（订单行）或 `orderItemId`（入库/发票行）。
 */
const keyOf = (l: {
  id?: string | null;
  orderItemId?: string | null;
  materialId?: string | null;
  materialCode?: string | null;
  unit?: string | null;
}, opts: { asOrderLine?: boolean } = {}): string => {
  // 订单行的锚点是自身 id；入库/发票行的锚点是 order_item_id（可能为空）
  const anchor = opts.asOrderLine ? l.id : l.orderItemId;
  if (anchor) return `oi:${String(anchor)}`;
  const code = l.materialCode || l.materialId || '';
  return `mc:${code}#${l.unit || ''}`;
};

/**
 * 行级三单比对
 *
 * @param orderLines  订单行（必需，决定比对基准）
 * @param inboundLines 累计入库行（可空 → 全部行判 short）
 * @param invoiceLines 累计开票行（可空 → 不参与数量判定，仅记录）
 * @param opts.globalTolerance 全局容差，默认 2%
 */
export function matchLines(
  orderLines: OrderLine[],
  inboundLines: InboundLine[],
  invoiceLines: InvoiceLine[],
  opts: { globalTolerance?: number } = {}
): LineMatchSummary {
  const globalTol = Number.isFinite(opts.globalTolerance) ? Number(opts.globalTolerance) : LINE_TOLERANCE_DEFAULT;
  const orders = Array.isArray(orderLines) ? orderLines.filter((l) => l && l.id) : [];
  if (orders.length === 0) {
    return { lines: [], ok: true, exceededCount: 0, shortCount: 0, summary: '订单无明细行，跳过行级比对' };
  }

  const sumBy = (rows: any[], keyFn: (r: any) => string) => {
    const m = new Map<string, number>();
    for (const r of Array.isArray(rows) ? rows : []) {
      if (!r) continue;
      const k = keyFn(r);
      m.set(k, round4((m.get(k) || 0) + num(r.quantity)));
    }
    return m;
  };
  const inMap = sumBy(inboundLines, (r) => keyOf(r as any));
  const invMap = sumBy(invoiceLines, (r) => keyOf(r as any));

  const lines: LineMatchResult[] = orders.map((o) => {
    const k = keyOf(o as any, { asOrderLine: true });
    const inboundQty = inMap.get(k) || 0;
    const invoicedQty = invMap.get(k) || 0;
    const orderedQty = round4(num(o.orderedQuantity));
    // 比对基准取「入库」与「开票」的较小者：
    //   两者都齐了才算这一行真对上（只到货没开票 → 还不能付这一行的钱）
    const effective = Math.min(inboundQty, invoicedQty);
    const diff = round4(effective - orderedQty);
    // 容差：行级可用自己的 toleranceRate（发票行上的），否则用全局
    const lineInvoiceTol = (invoiceLines || []).find((r) => r && keyOf(r as any) === k)?.toleranceRate;
    const tol = Number.isFinite(lineInvoiceTol as number) ? Number(lineInvoiceTol) : globalTol;

    let status: LineMatchStatus;
    let note: string;
    if (orderedQty <= 0) {
      status = 'pending';
      note = '订单数量为 0，无法比对';
    } else if (Math.abs(diff) <= orderedQty * tol) {
      status = 'matched';
      note = diff === 0 ? '数量一致' : `差异 ${diff} 在容差 ${(tol * 100).toFixed(1)}% 内`;
    } else if (diff < 0) {
      status = 'short';
      note = `欠交/欠票 ${Math.abs(diff)}${o.unit || ''}（入库 ${inboundQty}、开票 ${invoicedQty}、订单 ${orderedQty}）`;
    } else {
      status = 'over';
      note = `超交/超票 ${diff}${o.unit || ''}（入库 ${inboundQty}、开票 ${invoicedQty}、订单 ${orderedQty}）`;
    }

    return {
      orderItemId: o.id,
      materialCode: o.materialCode || '',
      materialName: o.materialName || '',
      unit: o.unit || '',
      orderedQty,
      inboundQty,
      invoicedQty,
      status,
      diffQty: diff,
      // matched 与 pending 不算超差（pending 是数据不足，不是数据错误）
      exceeded: status === 'short' || status === 'over',
      note,
    };
  });

  const exceeded = lines.filter((l) => l.exceeded);
  const short = lines.filter((l) => l.status === 'short');
  const ok = exceeded.length === 0;
  const summary = ok
    ? (short.length === 0
      ? `行级比对通过：${lines.length} 行数量均在容差 ${(globalTol * 100).toFixed(1)}% 内`
      : `行级比对通过（${lines.length} 行；${short.length} 行轻微欠交在容差内）`)
    : `行级比对不通过：${exceeded.length}/${lines.length} 行超差 —— ` +
      exceeded.slice(0, 5).map((l) => `${l.materialCode || l.orderItemId} ${l.note}`).join('；') +
      (exceeded.length > 5 ? ` 等 ${exceeded.length} 行` : '');

  return { lines, ok, exceededCount: exceeded.length, shortCount: short.length, summary };
}
