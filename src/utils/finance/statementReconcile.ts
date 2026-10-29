// 供应商对账单 · 跨端核对算法（V3.118.0 新增）
// ─────────────────────────────────────────────────────────────────────────────
// 业务背景（强哥需求）：
//   供应商在**门户**提交对账单 → 门户侧只是"供应商说自己该收多少"；
//   主 ERP 财务要判断这张对账单**能不能认**，靠三件事交叉核对：
//     ① 对账单里的每张采购订单，ERP 里真的存在吗？金额/税额/数量对得上吗？
//     ② 对账单声称"已开票"的发票号，财务发票台账里真有这张票吗？
//     ③ 这张对账单的确认结论，回写进主 ERP 往来对账记录了没有？
//   三者缺一，财务报表上的应付就是**供应商单方面口径**，不是双方认可的金额。
//
// 为什么单独抽成纯函数（不写在页面里）：
//   · 口径必须唯一 —— 列表「核对结论」列、详情面板、KPI 卡、单测必须算的是同一套数字；
//     写进组件就会出现"列表说有差异、详情说没差异"这种谁也不信的页面。
//   · 不 import 任何 store —— 结构化入参（行、PO、入库、发票、对账记录），便于单测兜住
//     边界场景（单号体系不同源、部分到货、发票号不存在、多订单一张对账单…）。
//
// ★ 核对口径（务必与三单匹配区分开，两者不是一回事）：
//   · 三单匹配（ThreeWayMatch）：发票 ↔ 采购订单 ↔ 入库单，判断**能不能付款**；
//   · 本模块（对账核对）：门户对账单 ↔ 采购订单/入库/发票台账，判断**金额认不认**。
//     故不复用三单匹配的"含税总额必须完全相等"，而是分维度给差异 + 给容差。
//     理由：对账争议金额通常以「不含税」为主（税额差异走税务途径），且允许小额尾差。
// ─────────────────────────────────────────────────────────────────────────────

/** 金额比较容差（元）：1 元内视为一致 —— 分位四舍五入导致的尾差不应报成争议 */
export const AMOUNT_TOLERANCE = 1;
/** 数量比较容差：0.001（吨/千克等计量单位允许的浮点误差） */
export const QTY_TOLERANCE = 0.001;

/**
 * 单号归一化：去除非字母数字并转小写。
 * 为什么必须做：门户与主 ERP 的单号体系天然不同源 ——
 *   门户对账单行写 `PO20240506001`，财务发票台账写 `PO-2024-0321`，
 *   同一张单在两套系统里长得不一样。不归一化就永远是"匹配不上"，
 *   而"匹配不上"与"金额有差异"是两件完全不同的事，混在一起会误导财务。
 * （与 ThreeWayMatch.tsx 的 norm() 同一实现，保持全站口径一致）
 */
export const normNo = (s?: string | null): string =>
  (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

/** 一行对账明细（对账单 items 数组的元素；字段名与门户 VendorStatement.items 一致） */
export interface ReconcileLine {
  id?: string;
  purchaseOrderNo?: string;
  inboundNo?: string;
  materialCode?: string;
  materialName?: string;
  qty?: number;
  unitPrice?: number;
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  invoiced?: boolean;
  invoiceNo?: string;
}

/** 核对入参：由调用方从各 store 取好再传进来（本模块不碰 store） */
export interface ReconcileInput {
  /** 对账单基础信息 */
  statement: {
    statementNo: string;
    vendorId?: string;
    vendorName?: string;
    statementPeriod?: string;
    subtotal?: number;
    taxTotal?: number;
    grandTotal?: number;
    /** 门户侧状态（draft/submitted/reviewing/sent/confirmed/disputed/closed） */
    status?: string;
    items?: ReconcileLine[];
  };
  /** ERP 采购订单（只需这几个字段） */
  purchaseOrders: Array<{
    orderNo: string;
    vendorName?: string;
    totalAmount?: number;
    totalTaxAmount?: number;
    grandTotal?: number;
    items?: Array<{
      materialCode?: string;
      orderedQuantity?: number;
      unitPrice?: number;
      amount?: number;
      taxAmount?: number;
      amountWithTax?: number;
    }>;
  }>;
  /** ERP 入库单（用于判断"对账的这批货真的收到了没有"） */
  inboundOrders?: Array<{
    inboundNo: string;
    type?: string;
    sourceNo?: string;
    status?: string;
    items?: Array<{ materialCode?: string; actualQuantity?: number; expectedQuantity?: number }>;
  }>;
  /** 财务发票台账（用于判断"行上声称的发票号真的存在吗"） */
  invoices?: Array<{ invoiceNo: string; purchaseOrderNo?: string; totalAmount?: number }>;
  /** 主 ERP 往来对账记录（判断是否已回写确认结论） */
  reconciliations?: Array<{ statementNo: string; vendorId?: string; status?: string; amount?: number }>;
}

/** 单条明细行的核对结果 */
export interface LineCheck {
  lineNo: number;
  materialCode: string;
  materialName: string;
  purchaseOrderNo: string;
  inboundNo: string;
  /** 对账单口径 */
  stmtQty: number;
  stmtAmount: number;
  stmtTax: number;
  stmtTotal: number;
  /** ERP 采购订单口径（按物料编码在订单行里找；找不到则 matched=false 且金额为 0） */
  poFound: boolean;
  poQty: number;
  poAmount: number;
  poTax: number;
  poTotal: number;
  /** 差异 = 对账单 − 采购订单（正数＝供应商多报） */
  qtyDiff: number;
  amountDiff: number;
  taxDiff: number;
  totalDiff: number;
  /** 已入库数量（按入库单 + 物料编码汇总；无入库单则 0） */
  inboundQty: number;
  /** 行上声称的发票号是否在财务台账里存在 */
  invoiceNo: string;
  invoiceFound: boolean;
  /** 该行最严重的差异级别 */
  level: DiffLevel;
  /** 差异说明（给财务看的自然语言，不写"字段不匹配"这种技术话术） */
  issues: string[];
}

/** 差异级别：ok=一致 / warn=小额尾差 / error=实质差异 / missing=缺单据无法核对 */
export type DiffLevel = 'ok' | 'warn' | 'error' | 'missing';

/** 整张对账单的核对结果 */
export interface StatementCheck {
  statementNo: string;
  vendorId: string;
  vendorName: string;
  period: string;
  /** 门户口径合计 */
  stmtSubtotal: number;
  stmtTax: number;
  stmtGrandTotal: number;
  /** ERP 采购订单口径合计（按明细行命中的订单行汇总） */
  poAmount: number;
  poTax: number;
  poTotal: number;
  /** 差异（对账单 − 采购订单） */
  amountDiff: number;
  taxDiff: number;
  totalDiff: number;
  /** 差异率（按价税合计算，PO 为 0 时为 null，避免除零给出 0% 的假结论） */
  diffRate: number | null;
  /** 明细行核对 */
  lines: LineCheck[];
  /** 汇总问题清单（供列表/详情展示；为空表示完全一致） */
  issues: string[];
  /** 未匹配到采购订单的行数 */
  missingPoLines: number;
  /** 声称已开票但台账查不到的发票号 */
  missingInvoices: string[];
  /** 已入库数量合计 / 对账数量合计 */
  inboundQty: number;
  stmtQty: number;
  /** 主 ERP 是否已回写对账确认 */
  reconciled: boolean;
  reconciledAtFrom?: string;
  reconciledAmount?: number;
  /** 门户侧状态 */
  portalStatus: string;
  /** 总体结论（页面 Chip 直接渲染这个值，避免各处各算一套） */
  conclusion: Conclusion;
  /** 结论中文说明（一句话说清"为什么是这个结论"） */
  conclusionText: string;
}

/** 总体结论取值：一致 / 有差异 / 待核对（缺单据） */
export type Conclusion = 'matched' | 'diff' | 'incomplete';

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 金额是否一致（带容差） */
const moneyEq = (a: number, b: number): boolean => Math.abs(a - b) <= AMOUNT_TOLERANCE;
/** 数量是否一致（带容差） */
const qtyEq = (a: number, b: number): boolean => Math.abs(a - b) <= QTY_TOLERANCE;

/**
 * 核心：核对一张供应商对账单。
 *
 * 判定顺序（先严重、后轻微，保证最终结论取最严重的那一条）：
 *   ① 行上的采购订单在 ERP 里不存在       → missing（无法核对，必须人工处理）
 *   ② 数量或金额存在超出容差的差异         → error
 *   ③ 行声称已开票但发票台账查不到         → error（金额无法进入应付）
 *   ④ 门户状态与主 ERP 回写结论对不上       → warn
 *   ⑤ 仅在容差内的尾差                    → warn
 *   ⑥ 以上都没有                          → ok
 */
export function reconcileStatement(input: ReconcileInput): StatementCheck {
  const st = input.statement;
  const items = Array.isArray(st.items) ? st.items : [];
  const pos = Array.isArray(input.purchaseOrders) ? input.purchaseOrders : [];
  const inbounds = Array.isArray(input.inboundOrders) ? input.inboundOrders : [];
  const invoices = Array.isArray(input.invoices) ? input.invoices : [];
  const recs = Array.isArray(input.reconciliations) ? input.reconciliations : [];

  // 采购订单按归一化单号索引（门户与 ERP 单号体系不同源，必须归一化后才能对上）
  const poMap = new Map<string, (typeof pos)[number]>();
  for (const p of pos) {
    const k = normNo(p.orderNo);
    if (k && !poMap.has(k)) poMap.set(k, p);
  }
  // 发票号索引（同样归一化：门户写 FP20240510001，台账写 02300245，至少能先按号找）
  const invoiceSet = new Set(invoices.map((v) => normNo(v.invoiceNo)).filter(Boolean));

  const lines: LineCheck[] = [];
  /** 已核对过的采购订单（同一 PO 出现在多行时，PO 侧金额只应计一次） */
  const countedPo = new Set<string>();
  /** 已核对过的物料行（同一 PO + 同物料多行时，PO 数量只应计一次） */
  const countedPoLine = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const it = items[i] ?? {};
    const issues: string[] = [];
    let level: DiffLevel = 'ok';

    const poNoRaw = String(it.purchaseOrderNo || '');
    const poKey = normNo(poNoRaw);
    const po = poKey ? poMap.get(poKey) : undefined;
    const poFound = !!po;

    const stmtQty = num(it.qty);
    const stmtAmount = num(it.amount);
    const stmtTax = num(it.taxAmount);
    const stmtTotal = num(it.totalAmount) || stmtAmount + stmtTax;

    // ── 在采购订单行里定位同一物料 ──
    // 优先按物料编码（两套系统物料编码同源），找不到再退回按物料名称（容错）。
    const matCode = String(it.materialCode || '');
    const matName = String(it.materialName || '');
    const poItem = po
      ? (po.items ?? []).find((x) => matCode && String(x.materialCode || '') === matCode)
        ?? (po.items ?? []).find((x) => matName && String((x as any).materialName || '') === matName)
      : undefined;

    let poQty = 0;
    let poAmount = 0;
    let poTax = 0;
    let poTotal = 0;
    const lineKey = `${poKey}|${matCode}`;
    if (poItem && !countedPoLine.has(lineKey)) {
      countedPoLine.add(lineKey);
      poQty = num(poItem.orderedQuantity);
      poAmount = num(poItem.amount) || num(poItem.orderedQuantity) * num(poItem.unitPrice);
      poTax = num(poItem.taxAmount);
      poTotal = num(poItem.amountWithTax) || poAmount + poTax;
    } else if (po && !poItem) {
      // 订单存在但没有这个物料 —— 这是实质性问题：供应商在对一张不相干的订单
      issues.push(`采购订单 ${poNoRaw} 中没有物料 ${matCode || matName || '(空)'}`);
      level = 'error';
    }

    // ── 已入库数量：按入库单 + 物料编码汇总 ──
    // 只统计"来源单号 = 本行采购订单"的入库单；允许一张订单多次到货。
    let inboundQty = 0;
    for (const io of inbounds) {
      if (poKey && normNo(io.sourceNo) !== poKey) {
        // 也接受按入库单号精确匹配（对账单行给了 inboundNo 的情况）
        if (!it.inboundNo || normNo(io.inboundNo) !== normNo(it.inboundNo)) continue;
      }
      for (const ii of io.items ?? []) {
        if (matCode && String(ii.materialCode || '') !== matCode) continue;
        inboundQty += num(ii.actualQuantity);
      }
    }

    // ── 发票存在性 ──
    const invNo = String(it.invoiceNo || '');
    const invoiceFound = !invNo ? false : invoiceSet.has(normNo(invNo));

    // ── 差异计算 ──
    const qtyDiff = poFound && poItem ? stmtQty - poQty : 0;
    const amountDiff = poFound && poItem ? stmtAmount - poAmount : 0;
    const taxDiff = poFound && poItem ? stmtTax - poTax : 0;
    const totalDiff = poFound && poItem ? stmtTotal - poTotal : 0;

    if (!poFound) {
      issues.push(`采购订单 ${poNoRaw || '(未填)'} 在 ERP 中不存在，无法核对金额`);
      level = worse(level, 'missing');
    } else if (poItem) {
      if (!qtyEq(stmtQty, poQty)) {
        issues.push(`对账数量 ${fmtQty(stmtQty)} ≠ 订单数量 ${fmtQty(poQty)}（差 ${fmtQty(qtyDiff)}）`);
        level = worse(level, 'error');
      }
      if (!moneyEq(stmtAmount, poAmount)) {
        issues.push(`对账金额 ${fmtMoney(stmtAmount)} ≠ 订单金额 ${fmtMoney(poAmount)}（差 ${fmtMoney(amountDiff)}）`);
        level = worse(level, 'error');
      }
      if (!moneyEq(stmtTax, poTax)) {
        issues.push(`对账税额 ${fmtMoney(stmtTax)} ≠ 订单税额 ${fmtMoney(poTax)}（差 ${fmtMoney(taxDiff)}）`);
        // 税额尾差（<1 元）只算提示，不上升到实质差异 —— 税额差异通常由税率/四舍五入引起
        level = worse(level, Math.abs(taxDiff) > AMOUNT_TOLERANCE ? 'error' : 'warn');
      }
    }

    // 行声称已开票，但台账查不到 → 实质问题（对方的票没进本系统，付不了款）
    if (it.invoiced && invNo && !invoiceFound) {
      issues.push(`行标注已开票，但发票台账中查不到 ${invNo}`);
      level = worse(level, 'error');
    }
    // 已确认状态的对账单行却没开票号 → 提示（可能是月结未开票，属正常业务，只提示）
    if (it.invoiced && !invNo) {
      issues.push('行标注已开票但未填发票号');
      level = worse(level, 'warn');
    }

    lines.push({
      lineNo: i + 1,
      materialCode: matCode,
      materialName: matName,
      purchaseOrderNo: poNoRaw,
      inboundNo: String(it.inboundNo || ''),
      stmtQty,
      stmtAmount,
      stmtTax,
      stmtTotal,
      poFound,
      poQty,
      poAmount,
      poTax,
      poTotal,
      qtyDiff,
      amountDiff,
      taxDiff,
      totalDiff,
      inboundQty,
      invoiceNo: invNo,
      invoiceFound,
      level,
      issues,
    });
  }

  // ── 表头合计 ──
  // 门户侧合计：优先用对账单自己的 subtotal/taxTotal/grandTotal（那是供应商提交的数字），
  // 缺失时按明细行累加 —— 不用明细行强行覆盖，否则"表头与明细不一致"这个异常会被抹平。
  const stmtSubtotal = num(st.subtotal) || lines.reduce((s, l) => s + l.stmtAmount, 0);
  const stmtTaxTotal = num(st.taxTotal) || lines.reduce((s, l) => s + l.stmtTax, 0);
  const stmtGrandTotal = num(st.grandTotal) || lines.reduce((s, l) => s + l.stmtTotal, 0);

  // ERP 口径：优先按订单表头金额汇总（订单表头 = 供应商下单时确认过的总金额，
  // 比逐行相加更权威）；命中的订单去重，避免一单多行时重复计金额。
  let poAmountSum = 0;
  let poTaxSum = 0;
  let poTotalSum = 0;
  for (const l of lines) {
    const k = normNo(l.purchaseOrderNo);
    if (!k || countedPo.has(k) || !l.poFound) continue;
    const po = poMap.get(k);
    if (!po) continue;
    countedPo.add(k);
    poAmountSum += num(po.totalAmount) || (po.items ?? []).reduce((s, x) => s + num(x.amount), 0);
    poTaxSum += num(po.totalTaxAmount) || (po.items ?? []).reduce((s, x) => s + num(x.taxAmount), 0);
    poTotalSum += num(po.grandTotal) || poAmountSum + poTaxSum;
  }

  const amountDiff = stmtSubtotal - poAmountSum;
  const taxDiff = stmtTaxTotal - poTaxSum;
  const totalDiff = stmtGrandTotal - poTotalSum;
  const diffRate = poTotalSum > 0 ? totalDiff / poTotalSum : null;

  const issues: string[] = [];
  const missingPoLines = lines.filter((l) => !l.poFound).length;
  const missingInvoices = Array.from(
    new Set(lines.filter((l) => l.invoiceNo && !l.invoiceFound).map((l) => l.invoiceNo))
  );

  if (lines.length === 0) issues.push('对账单没有明细行，无法核对');
  if (missingPoLines > 0) issues.push(`${missingPoLines} 行找不到对应的采购订单`);
  if (missingInvoices.length > 0) issues.push(`${missingInvoices.length} 张发票在台账中不存在：${missingInvoices.join('、')}`);
  // 数量差异必须单独汇总：它是最典型的对账争议（供应商多报数量），
  // 只记在行级 issues 里的话，表头问题清单只剩"合计金额差异"，
  // 财务看不出差异是"多报数量"还是"单价抬高" —— 两者处理方式完全不同。
  const qtyDiffLines = lines.filter((l) => l.poFound && !qtyEq(l.stmtQty, l.poQty));
  if (qtyDiffLines.length > 0) {
    issues.push(`${qtyDiffLines.length} 行数量与采购订单不一致（合计差 ${fmtQty(
      qtyDiffLines.reduce((s, l) => s + l.qtyDiff, 0)
    )}）`);
  }
  if (countedPo.size > 0 && !moneyEq(stmtSubtotal, poAmountSum)) {
    issues.push(`不含税合计差异 ${fmtMoney(amountDiff)}（对账单 ${fmtMoney(stmtSubtotal)} vs 订单 ${fmtMoney(poAmountSum)}）`);
  }
  if (countedPo.size > 0 && !moneyEq(stmtTaxTotal, poTaxSum)) {
    issues.push(`税额合计差异 ${fmtMoney(taxDiff)}（对账单 ${fmtMoney(stmtTaxTotal)} vs 订单 ${fmtMoney(poTaxSum)}）`);
  }

  // ── 回写状态 ──
  const rec = recs.find(
    (r) => normNo(r.statementNo) === normNo(st.statementNo)
      && (!r.vendorId || !st.vendorId || String(r.vendorId) === String(st.vendorId))
  );
  const reconciled = !!rec && rec.status === 'confirmed';
  // 门户显示"已确认"但主 ERP 没有对账确认记录 → 两边结论不一致，必须让财务看见
  const portalConfirmed = st.status === 'confirmed' || st.status === 'closed';
  if (portalConfirmed && !reconciled) {
    issues.push('门户已确认，但主 ERP 尚未回写对账结论');
  }

  // ── 总体结论 ──
  let conclusion: Conclusion = 'matched';
  if (lines.length === 0 || missingPoLines > 0) conclusion = 'incomplete';
  else if (missingInvoices.length > 0) conclusion = 'diff';
  else if (countedPo.size > 0 && (!moneyEq(stmtSubtotal, poAmountSum) || !moneyEq(stmtTaxTotal, poTaxSum))) conclusion = 'diff';
  else if (lines.some((l) => l.level === 'error')) conclusion = 'diff';

  let conclusionText: string;
  if (conclusion === 'matched') {
    conclusionText = countedPo.size === 0
      ? '无可核对的采购订单（对账单未填订单号）'
      : `金额与数量与 ${countedPo.size} 张采购订单一致`;
  } else if (conclusion === 'incomplete') {
    conclusionText = missingPoLines > 0
      ? `${missingPoLines} 行采购订单在 ERP 中不存在，需人工补充`
      : '对账单无明细行，无法核对';
  } else if (moneyEq(stmtSubtotal, poAmountSum) && moneyEq(stmtTaxTotal, poTaxSum) && missingInvoices.length > 0) {
    // 金额与订单完全一致，但票没进台账 —— 必须说清"差在哪"，
    // 否则页面出现「金额一致 + 存在差异」两个看似矛盾的信号，用户不知道信哪个。
    conclusionText = `金额与采购订单一致，但 ${missingInvoices.length} 张发票未进财务台账`;
  } else {
    conclusionText = issues[0] || '存在差异，需人工核对';
  }

  return {
    statementNo: st.statementNo,
    vendorId: String(st.vendorId || ''),
    vendorName: String(st.vendorName || ''),
    period: String(st.statementPeriod || ''),
    stmtSubtotal,
    stmtTax: stmtTaxTotal,
    stmtGrandTotal,
    poAmount: poAmountSum,
    poTax: poTaxSum,
    poTotal: poTotalSum,
    amountDiff,
    taxDiff,
    totalDiff,
    diffRate,
    lines,
    issues,
    missingPoLines,
    missingInvoices,
    inboundQty: lines.reduce((s, l) => s + l.inboundQty, 0),
    stmtQty: lines.reduce((s, l) => s + l.stmtQty, 0),
    reconciled,
    reconciledAtFrom: rec && 'confirmedAt' in rec ? String((rec as any).confirmedAt || '') : undefined,
    reconciledAmount: rec ? num(rec.amount) : undefined,
    portalStatus: String(st.status || ''),
    conclusion,
    conclusionText,
  };
}

/** 批量核对（列表页直接用） */
export function reconcileStatements(inputs: ReconcileInput[]): StatementCheck[] {
  return inputs.map(reconcileStatement);
}

/** 汇总统计（KPI 卡用；只依赖核对结果，不重复算差异） */
export interface ReconcileSummary {
  total: number;
  matched: number;
  diff: number;
  incomplete: number;
  /** 待回写确认（门户已确认 / 已关闭，但主 ERP 无对账记录） */
  pendingWriteBack: number;
  /** 差异金额合计（绝对值，按价税合计） */
  diffAmount: number;
  /** 对账单金额合计 */
  totalAmount: number;
}

export function summarize(checks: StatementCheck[]): ReconcileSummary {
  const s: ReconcileSummary = {
    total: checks.length, matched: 0, diff: 0, incomplete: 0,
    pendingWriteBack: 0, diffAmount: 0, totalAmount: 0,
  };
  for (const c of checks) {
    if (c.conclusion === 'matched') s.matched += 1;
    else if (c.conclusion === 'diff') s.diff += 1;
    else s.incomplete += 1;
    if ((c.portalStatus === 'confirmed' || c.portalStatus === 'closed') && !c.reconciled) s.pendingWriteBack += 1;
    s.diffAmount += Math.abs(c.totalDiff);
    s.totalAmount += c.stmtGrandTotal;
  }
  return s;
}

/** 差异级别排序（取"更严重"的那个）：missing 最重，其次 error / warn / ok */
const LEVEL_ORDER: Record<DiffLevel, number> = { ok: 0, warn: 1, error: 2, missing: 3 };
function worse(a: DiffLevel, b: DiffLevel): DiffLevel {
  return LEVEL_ORDER[b] > LEVEL_ORDER[a] ? b : a;
}

const fmtMoney = (n: number): string =>
  `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtQty = (n: number): string =>
  n.toLocaleString('zh-CN', { maximumFractionDigits: 3 });
