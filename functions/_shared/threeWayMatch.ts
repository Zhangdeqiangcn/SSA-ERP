// ============================================================
// 三单匹配（采购订单 / 入库单 / 发票）—— 付款闸门的权威判定
// ============================================================
// 【为什么要收敛到单一来源】
// 此前项目里同一个业务判定存在三套互不一致的实现：
//   ① functions/api/three-way-match/create.ts —— 1% 相对容差、结论写库，但前端零调用
//   ② src/pages/Finance/ThreeWayMatch.tsx    —— 金额绝对 0.01 元、结论只看 PO 命中
//   ③ src/pages/Purchase/OrderDetail.tsx     —— 数量要求精确相等
// 同一个「能不能付款」有三种答案，等于没有答案。
// 本文件是唯一实现，其余位置一律引用这里（改动判定口径只需改这一处）。
//
// 【口径】统一按**不含税金额**比对。
//   三张表都有语义明确的不含税字段：
//     purchase_order_items.amount / inbound_order_items.amount / fin_invoices.amount
//   fin_invoices 的注释写明 amount 是「不含税金额」；若混用含税字段
//   （grand_total / total_amount），13% 的税率差会直接制造误拦。
//   跨表对比采用「各自金额 ÷ 同一张订单金额」的比例形式，
//   使两边口径偏差同向抵消，比绝对值相减更稳。
//
// 【数量维度：V3.47.0 起已参与硬拦】
//   历史说明（保留以说明演进）：此前「数量不参与硬拦」是因为 fin_invoices
//   没有明细行、不存在「发票数量」这个数据。当时只能把数量放进 detail
//   作参考，不参与放行/拦截判断。
//   V3.47.0 第3批 3-05 建了 fin_invoice_items（迁移 0083）后，该前提已改变：
//   现在按「订单行」逐行比累计入库量与累计开票量（threeWayLineMatch.matchLines），
//   能识破「金额自洽但某一行既没到货也没开票」的蒙混过关场景。
//   ★ 兼容策略：**发票明细表为空时跳过行级判定**（存量发票都没有明细行，
//     硬判会把所有历史付款全拦掉），并在 detail.lineMatchSkipped 标注原因，
//     如实记录"本次未做行级比对"而不是假装已比对。
//
// 【闸门语义：只拦风险侧，不拦合法的少付】
//   发票金额少于订单金额是正常业务（分批开票、分批到货），不拦。
//   拦的是两类真实付款风险：
//     · 开票超过订单（可能超付）
//     · 入库不足却要付款（未足额收货先付钱）
//   另加一条：本次付款金额不得超过发票金额。
//
// 【为什么入库不要求 inventory_posted = 1】
//   入库单一旦建立即代表货物已到厂，财务不应因仓库尚未点「过账」而拒绝付款。
//   已过账数量仍单独统计进 detail 供参考，但不作门槛。
//   （曾考虑强制要求已过账，会让「货到了、仓库还没点过账」这种日常场景被硬拦。）
import { matchLines } from './threeWayLineMatch';
import { writeAudit } from './auditLog';

/** 容差 1%。修改此处即全项目生效（判定只在本文件实现）。 */
export const TWM_TOLERANCE = 0.01;

/** 视为作废/无效的入库单状态（不参与入库合计） */
const INBOUND_VOID_STATUS = ['cancelled', 'void', 'rejected'];
/** 视为作废/无效的发票状态（不参与开票合计） */
const INVOICE_VOID_STATUS = ['cancelled', 'void', 'rejected'];

export type TwmCode =
  | 'NO_PO'                 // 付款计划没有关联采购订单号
  | 'PO_NOT_FOUND'          // 订单号在系统里查不到
  | 'PO_AMOUNT_INVALID'     // 订单明细金额为 0，不能作为付款依据
  | 'NO_INVOICE'            // 没有对应发票（非预付款）
  | 'OVER_PO'               // 开票超过订单金额（超付风险）
  | 'INSUFFICIENT_INBOUND'  // 入库金额不足，未足额收货
  | 'OVER_INVOICE'          // 本次付款金额超过发票金额
  | 'ADVANCE_OK'            // 预付款，无发票放行
  | 'LINE_MISMATCH'         // 行级比对不通过（某行欠交/欠票/超交，超出容差）
  | 'OK';

export interface TwmInput {
  /** 采购订单号（付款计划上的 purchase_order_no） */
  poNo?: string | null;
  /** 发票号（可选；为空则按采购订单号汇总该订单下的全部有效发票） */
  invoiceNo?: string | null;
  /** 本次要付的金额（不含税口径）；0 表示不校验付款金额上限 */
  payAmount?: number;
  /** 预付款金额，> 0 时允许「无发票」这一情形 */
  advanceAmount?: number;
}

export interface TwmDetail {
  poId: string | null;
  poNo: string | null;
  invoiceNo: string | null;
  /** 订单不含税金额（明细合计） */
  poAmount: number;
  /** 订单订购数量合计 */
  orderedQty: number;
  /** 入库不含税金额合计 */
  inboundAmount: number;
  /** 入库实际数量合计 */
  inboundQty: number;
  /** 其中已过账的数量（参考值，不作门槛） */
  inboundPostedQty: number;
  /** 入库单张数 */
  inboundCount: number;
  /** 发票不含税金额合计（用于与订单不含税金额比对） */
  invoiceAmount: number;
  /** 发票价税合计（含税）。
   *  为什么同时保留两个口径：付款计划的金额是**含税**的（实际要付出去的钱），
   *  而订单/入库明细的不含税金额才与发票不含税金额同口径。
   *  若混用（拿含税付款额去比不含税发票额），13% 的税率差会直接造成误拦。 */
  invoiceTotalWithTax: number;
  /** 发票张数 */
  invoiceCount: number;
  /** 本次付款金额 */
  payAmount: number;
  /** 到货率 = 入库金额 / 订单金额 */
  arrivalRate: number;
  tolerance: number;
}

export interface TwmCheck {
  ok: boolean;
  code: TwmCode;
  /** 面向业务人员的中文原因，可直接展示在界面上 */
  message: string;
  detail: TwmDetail;
}

const round2 = (n: any): number => Math.round((Number(n) || 0) * 100) / 100;

/**
 * 执行三单匹配判定。**只读**，不写库（留档由 recordThreeWayMatch 负责）。
 * 任何一步数据缺失都返回明确的 code，而不是含糊的「校验失败」——
 * 付款被拦时必须让业务人员知道「差什么、差多少」，否则只能打电话问开发。
 */
export async function evaluateThreeWayMatch(
  db: any,
  orgId: string,
  input: TwmInput,
): Promise<TwmCheck> {
  const tol = TWM_TOLERANCE;
  const poNo = String(input.poNo ?? '').trim() || null;
  const invoiceNo = String(input.invoiceNo ?? '').trim() || null;
  const payAmount = round2(input.payAmount);
  const advanceAmount = round2(input.advanceAmount);

  const detail: TwmDetail = {
    poId: null,
    poNo,
    invoiceNo,
    poAmount: 0,
    orderedQty: 0,
    inboundAmount: 0,
    inboundQty: 0,
    inboundPostedQty: 0,
    inboundCount: 0,
    invoiceAmount: 0,
    invoiceTotalWithTax: 0,
    invoiceCount: 0,
    payAmount,
    arrivalRate: 0,
    tolerance: tol,
  };
  const fail = (code: TwmCode, message: string): TwmCheck => ({ ok: false, code, message, detail });
  const pass = (code: TwmCode, message: string): TwmCheck => ({ ok: true, code, message, detail });

  // ① 必须有采购订单号
  //    付款计划上的 purchase_order_no 为空时无法判定「付的这笔对不对」。
  //    这是三单匹配的起点，缺失即拦。
  if (!poNo) {
    return fail(
      'NO_PO',
      '这张付款计划没有关联采购订单号，无法完成三单匹配。请在计划上补填采购订单号后再执行付款。',
    );
  }

  // ② 订单必须存在
  const po: any = await db
    .prepare(`SELECT id, order_no FROM purchase_orders WHERE org_id = ? AND order_no = ?`)
    .bind(orgId, poNo)
    .first();
  if (!po) {
    return fail(
      'PO_NOT_FOUND',
      `系统里查不到采购订单 ${poNo}。可能是订单号填写有误，或该订单属于其他公司。`,
    );
  }
  detail.poId = po.id;

  // ③ 订单金额（不含税明细合计）
  const poSum: any = await db
    .prepare(
      `SELECT IFNULL(SUM(amount), 0) AS amt, IFNULL(SUM(ordered_quantity), 0) AS qty
         FROM purchase_order_items WHERE purchase_order_id = ?`,
    )
    .bind(po.id)
    .first();
  detail.poAmount = round2(poSum?.amt);
  detail.orderedQty = Number(poSum?.qty) || 0;
  if (!(detail.poAmount > 0)) {
    return fail(
      'PO_AMOUNT_INVALID',
      `采购订单 ${poNo} 的明细金额为 0，无法作为付款依据。请先补齐订单明细（物料、数量、单价）。`,
    );
  }

  // ④ 已入库合计（排除作废状态）
  // ★ V3.45.0 修正「入库金额恒为 0」硬伤：原式 `SUM(i.amount)`，而
  //   inbound-orders/index.ts 写入的是 `Number(item.amount) || 0`，且前端
  //   InboundForm 建单时**只传数量、根本不传单价与金额** ⇒ amount 列恒为 0。
  //   连带后果：⑧ 判定 `inboundAmount < invoiceAmount×(1-tol)` 必然触发
  //   INSUFFICIENT_INBOUND ⇒ **有发票的正常采购付款被 100% 拦截**；到货率永远 0%。
  //   修法：金额按「实收数量 × 单价」实算（单价列 postInbound 已从库读出并落库），
  //   并对历史脏数据（单价也为空）回退到 amount 列，避免老单据金额归零。
  const voidIn = INBOUND_VOID_STATUS.map(() => '?').join(',');
  const inSum: any = await db
    .prepare(
      `SELECT IFNULL(SUM(CASE
                          WHEN IFNULL(i.unit_price, 0) > 0
                            THEN i.actual_quantity * i.unit_price
                          ELSE IFNULL(i.amount, 0)
                        END), 0) AS amt,
              IFNULL(SUM(i.actual_quantity), 0) AS qty,
              IFNULL(SUM(CASE WHEN o.inventory_posted = 1 THEN i.actual_quantity ELSE 0 END), 0) AS postedQty,
              COUNT(DISTINCT o.id) AS cnt
         FROM inbound_orders o
         JOIN inbound_order_items i ON i.inbound_order_id = o.id
        WHERE o.org_id = ? AND o.source_no = ?
          AND LOWER(IFNULL(o.status, '')) NOT IN (${voidIn})`,
    )
    .bind(orgId, poNo, ...INBOUND_VOID_STATUS)
    .first();
  detail.inboundAmount = round2(inSum?.amt);
  detail.inboundQty = round2(inSum?.qty);
  detail.inboundPostedQty = round2(inSum?.postedQty);
  detail.inboundCount = Number(inSum?.cnt) || 0;

  // ⑤ 发票合计（排除作废状态）
  //    指定发票号时按发票号精确取；否则汇总该采购订单下的全部有效发票。
  const voidIv = INVOICE_VOID_STATUS.map(() => '?').join(',');
  const invSum: any = invoiceNo
    ? await db
        .prepare(
          `SELECT IFNULL(SUM(amount), 0) AS amt, IFNULL(SUM(total_amount), 0) AS totalWithTax, COUNT(*) AS cnt
             FROM fin_invoices
            WHERE org_id = ? AND invoice_no = ?
              AND LOWER(IFNULL(status, '')) NOT IN (${voidIv})`,
        )
        .bind(orgId, invoiceNo, ...INVOICE_VOID_STATUS)
        .first()
    : await db
        .prepare(
          `SELECT IFNULL(SUM(amount), 0) AS amt, IFNULL(SUM(total_amount), 0) AS totalWithTax, COUNT(*) AS cnt
             FROM fin_invoices
            WHERE org_id = ? AND purchase_order_no = ?
              AND LOWER(IFNULL(status, '')) NOT IN (${voidIv})`,
        )
        .bind(orgId, poNo, ...INVOICE_VOID_STATUS)
        .first();
  detail.invoiceAmount = round2(invSum?.amt);
  detail.invoiceTotalWithTax = round2(invSum?.totalWithTax);
  detail.invoiceCount = Number(invSum?.cnt) || 0;
  detail.arrivalRate = detail.poAmount > 0 ? Math.round((detail.inboundAmount / detail.poAmount) * 10000) / 10000 : 0;

  // ★ V3.47.0 3-05：行级三单比对（数量维度）
  //   此前只能比金额 —— 代码里写明的能力边界是「fin_invoices 没有明细行，
  //   不存在发票数量」。迁移 0083 建了 fin_invoice_items 后这个前提已改变。
  //   真实风险：订单 A×100 + B×50，实际只到 A×100、发票也只开 A×100，
  //   付款金额与「已到货部分」完全吻合 ⇒ 金额维度全通过 ⇒ 放行，
  //   但 B 料既没到货也没收到发票，系统却报"三单匹配通过"。
  //   行级比对能识破这种「金额自洽但行缺失」的蒙混过关。
  //
  //   ★ 安全设计：**发票明细为空时跳过行级判定**（存量发票都没有明细行，
  //   若此时硬判会把所有历史付款全部拦住）。跳过时在 detail 里如实标注，
  //   便于日后核对而不假装已比对。
  try {
    const invItemsExist = await db
      .prepare(`SELECT 1 AS x FROM fin_invoice_items WHERE org_id = ? LIMIT 1`)
      .bind(orgId)
      .first();
    if (invItemsExist) {
      const [poLines, inLines, ivLines] = await Promise.all([
        // 排序用 rowid：purchase_order_items **没有 sequence 列**（0005 建表时未设），
        //   写 ORDER BY sequence 会抛 no such column。实测踩过。
        // ★ 用 AS 别名映射成 matchLines 期望的驼峰：matchLines 读 `orderedQuantity`，
        //   而 D1 行是 snake_case（ordered_quantity）—— 不映射则数量恒 0、
        //   每行都判 pending，行级比对形同虚设（实测踩过，探针才看清）。
        db.prepare(`SELECT id, material_id AS materialId, material_code AS materialCode,
                           material_name AS materialName, unit, ordered_quantity AS orderedQuantity
                      FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY rowid`)
          .bind(detail.poId).all(),
        db.prepare(
          `SELECT i.order_item_id AS orderItemId, i.material_id AS materialId,
                  i.material_code AS materialCode, i.actual_quantity AS quantity
             FROM inbound_order_items i
             JOIN inbound_orders o ON o.id = i.inbound_order_id
            WHERE o.org_id = ? AND o.source_no = ?
              AND LOWER(IFNULL(o.status, '')) NOT IN (${INBOUND_VOID_STATUS.map(() => '?').join(',')})`,
        ).bind(orgId, poNo, ...INBOUND_VOID_STATUS).all(),
        db.prepare(
          `SELECT ii.order_item_id AS orderItemId, ii.material_id AS materialId,
                  ii.material_code AS materialCode, ii.quantity, ii.tolerance_rate AS toleranceRate
             FROM fin_invoice_items ii
             JOIN fin_invoices iv ON iv.id = ii.invoice_id
            WHERE ii.org_id = ?
              AND (iv.purchase_order_no = ? ${invoiceNo ? 'OR iv.invoice_no = ?' : ''})
              AND LOWER(IFNULL(iv.status, '')) NOT IN (${INVOICE_VOID_STATUS.map(() => '?').join(',')})`,
        ).bind(orgId, poNo, ...(invoiceNo ? [invoiceNo] : []), ...INVOICE_VOID_STATUS).all(),
      ]);

      const lineResult = matchLines(
        ((poLines as any).results || []) as any[],
        ((inLines as any).results || []) as any[],
        ((ivLines as any).results || []) as any[],
        { globalTolerance: tol },
      );
      (detail as any).lineMatch = lineResult;
      if (!lineResult.ok) {
        return fail('LINE_MISMATCH', `行级比对不通过：${lineResult.summary}。请补齐欠交/欠票行或调整发票明细后再付款。`);
      }
    } else {
      (detail as any).lineMatchSkipped = 'NO_INVOICE_ITEMS';
    }
  } catch (e: any) {
    // 行级比对是增强能力，查询失败**不得拦住正常付款**（否则一次异常就停摆全公司付款）
    console.error('[twm-line-match] failed, non-blocking:', e?.message || e);
    (detail as any).lineMatchError = String(e?.message || e);
  }

  // ⑥ 必须有发票（预付款例外）
  if (detail.invoiceCount === 0) {
    if (advanceAmount > 0) {
      return pass('ADVANCE_OK', `预付款 ${advanceAmount} 元，尚无对应发票，按预付方式放行。`);
    }
    return fail(
      'NO_INVOICE',
      `采购订单 ${poNo} 下没有找到有效发票，无法确认应付金额。请先录入并校验发票；若确需先行预付，请在计划上填写预付款金额。`,
    );
  }

  // ⑦ 开票不得超过订单（超付风险）—— 最严重的一类，优先报出
  if (detail.invoiceAmount > detail.poAmount * (1 + tol)) {
    const over = round2(detail.invoiceAmount - detail.poAmount);
    return fail(
      'OVER_PO',
      `开票金额 ${detail.invoiceAmount} 元已超出采购订单金额 ${detail.poAmount} 元，超出 ${over} 元（容差 ${tol * 100}%）。请先核实是订单漏变更还是发票开错。`,
    );
  }

  // ⑧ 入库金额不得少于开票金额（未足额收货不得付款）
  if (detail.inboundAmount < detail.invoiceAmount * (1 - tol)) {
    const shortfall = round2(detail.invoiceAmount - detail.inboundAmount);
    return fail(
      'INSUFFICIENT_INBOUND',
      `该订单已入库 ${detail.inboundAmount} 元（到货率 ${(detail.arrivalRate * 100).toFixed(1)}%），少于发票金额 ${detail.invoiceAmount} 元，尚差 ${shortfall} 元货未到。请等待收货完成后再付款。`,
    );
  }

  // ⑨ 本次付款不得超过发票金额
  if (payAmount > 0 && payAmount > detail.invoiceTotalWithTax * (1 + tol)) {
    const over = round2(payAmount - detail.invoiceTotalWithTax);
    return fail(
      'OVER_INVOICE',
      `本次付款金额 ${payAmount} 元超过发票价税合计 ${detail.invoiceTotalWithTax} 元，超出 ${over} 元。付款金额不得超过发票金额。`,
    );
  }

  return pass(
    'OK',
    `三单匹配通过：订单不含税 ${detail.poAmount} 元、已入库 ${detail.inboundAmount} 元（到货率 ${(detail.arrivalRate * 100).toFixed(1)}%）、发票不含税 ${detail.invoiceAmount} 元（价税合计 ${detail.invoiceTotalWithTax} 元）。`,
  );
}

/**
 * 把一次判定结果留档到 three_way_match 表（并写审计）。
 * 为什么要留档：将来若发现付错款，第一个要回答的问题是
 * 「当时是谁、依据什么数据、得出什么结论」。
 * 留档失败绝不影响主流程（付款是否放行由返回值决定，不由留档决定）。
 */
export async function recordThreeWayMatch(
  db: any,
  orgId: string,
  actor: { id?: string | null; name?: string | null },
  input: TwmInput,
  check: TwmCheck,
): Promise<string | null> {
  const now = new Date().toISOString();
  const id = `twm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const d = check.detail;

  // 单位口径单价：订单金额/订购数量 与 发票金额/入库数量。
  // 发票表没有明细行、没有数量，因此用「发票金额 ÷ 已入库数量」作为发票侧单位口径，
  // 这是可解释的代理值，不是真实发票单价。真实发票单价需先给发票建明细表。
  const poUnitPrice = d.orderedQty > 0 ? round2(d.poAmount / d.orderedQty) : 0;
  const invUnitPrice = d.inboundQty > 0 ? round2(d.invoiceAmount / d.inboundQty) : 0;

  try {
    await db
      .prepare(
        `INSERT INTO three_way_match (
           id, org_id, po_id, po_no, inbound_id, inbound_no, invoice_id, invoice_no,
           match_status, po_quantity, inbound_quantity, qty_variance, qty_match,
           po_unit_price, invoice_unit_price, price_variance, price_match,
           po_amount, inbound_amount, invoice_amount, amount_variance, amount_match,
           matched_by, matched_at, discrepancy, remarks, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, orgId, d.poId, d.poNo, null, null, null, d.invoiceNo,
        check.ok ? 'matched' : 'discrepancy',
        d.orderedQty, d.inboundQty, round2(Math.abs(d.inboundQty - d.orderedQty)),
        Math.abs(d.inboundQty - d.orderedQty) <= d.orderedQty * d.tolerance ? 1 : 0,
        poUnitPrice, invUnitPrice, round2(Math.abs(invUnitPrice - poUnitPrice)),
        poUnitPrice > 0 && Math.abs(invUnitPrice - poUnitPrice) <= poUnitPrice * d.tolerance ? 1 : 0,
        d.poAmount, d.inboundAmount, d.invoiceAmount, round2(Math.abs(d.invoiceAmount - d.poAmount)),
        check.ok ? 1 : 0,
        actor.name || null, check.ok ? now : null,
        check.ok ? null : `[${check.code}] ${check.message}`,
        `付款闸门判定（服务端权威口径，容差 ${d.tolerance * 100}%）：${check.message}`
          + `｜入库单 ${d.inboundCount} 张、发票 ${d.invoiceCount} 张、已过账数量 ${d.inboundPostedQty}`
          + `｜注意：数量与单价维度因发票无明细表，仅作参考，不参与放行判断`,
        now, now,
      )
      .run();
  } catch {
    // 留档失败不阻断：付款是否放行由判定结果决定，留档是追溯用途。
    // 审计仍会记录，因此不会出现「完全无痕」。
  }

  await writeAudit(db, {
    orgId,
    actor: { id: actor.id, name: actor.name },
    entity: 'three_way_match',
    entityId: id,
    action: 'gate_check',
    summary:
      `付款闸门判定【${check.ok ? '放行' : '拦截'}·${check.code}】：${check.message}` +
      `（订单 ${d.poAmount}／入库 ${d.inboundAmount}／发票 ${d.invoiceAmount}，本单付款 ${d.payAmount}）`,
  });

  return id;
}
