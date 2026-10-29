/**
 * 采购订单已交量回写 · 共用助手（V3.61.0 · D-02 / D-03）
 * ------------------------------------------------------------------
 * 背景（审计 D-02，生产坐实）：
 *   入库过账后服务端只回写**订单头** `purchase_orders.delivered_quantity`，
 *   **行级** `purchase_order_items.delivered_quantity` 全库无任何 UPDATE 语句
 *   → 行级恒为 0。生产探针实测：订单 100 / 入库 30 → 头=30（正确）、行=0（错误）。
 *
 * 为什么行级必须写：① 三单匹配行级比对以订单行为基准比对入库/发票行；
 *   ② 前端采购订单列表按行显示「已交/未交」，行级为 0 会让每行都显示未交；
 *   ③ D-03 状态推进需要「Σ行已交 vs Σ行订购」来判断是否收齐。
 *
 * 匹配键：优先用**行锚点** order_item_id（V3.61.0 P0-3 已要求前端上送），
 *   锚点缺失时回退「物料编码」匹配——保证历史数据（无锚点）也能回写。
 *
 * 幂等：按锚点/物料匹配到行后做 `+ qty` 累加，与订单头同口径。
 *   ⚠️ 调用方必须只在「过账成功」后调用一次（inventory_posted 已抢占），
 *   重复过账由调用方的条件 UPDATE 抢占挡住，本函数不做幂等。
 */

/** 单条入库明细 → 可能的订单行锚点 */
function anchorOf(it: any): string | null {
  const a = it?.orderItemId || it?.order_item_id;
  return a ? String(a) : null;
}

/** 物料编码（匹配回退用） */
function codeOf(it: any): string | null {
  const c = it?.materialCode || it?.material_code || it?.materialCode;
  return c ? String(c) : null;
}

/**
 * 回写采购订单已交量（行级 + 头级）。
 * @param db D1
 * @param orgId 组织
 * @param poNo 采购订单号（= 入库单 source_no）
 * @param items 入库明细行（camel 或 snake 均可）
 * @returns { head: 订单头本次累加量, lines: 行级本次累加的行数 }
 */
export async function writeBackPurchaseDelivered(
  db: any,
  orgId: string,
  poNo: string,
  items: any[]
): Promise<{ head: number; lines: number }> {
  let head = 0;
  let lines = 0;
  if (!poNo || !Array.isArray(items) || items.length === 0) return { head, lines };

  for (const it of items) {
    const qty = Number(it?.actualQuantity ?? it?.actual_quantity) || 0;
    if (qty <= 0) continue;
    head += qty;

    const anchor = anchorOf(it);
    const code = codeOf(it);
    if (!anchor && !code) continue; // 两个键都没有 → 无法定位行，留给头级回写兜底

    // 一次 UPDATE 覆盖两种匹配方式：优先锚点，锚点为空时用物料编码
    const r = await db
      .prepare(
        `UPDATE purchase_order_items
            SET delivered_quantity = COALESCE(delivered_quantity, 0) + ?
          WHERE purchase_order_id = (SELECT id FROM purchase_orders WHERE org_id = ? AND order_no = ? LIMIT 1)
            AND ( (? <> '' AND id = ?) OR (? <> '' AND material_code = ?) )`
      )
      .bind(
        qty,
        orgId,
        poNo,
        anchor || '', anchor || '',
        code || '', code || ''
      )
      .run();
    // D-12：命中 0 行说明锚点与物料编码都没匹配上（源单号不存在或物料对不上）→ 留痕
    const changed = Number((r as any)?.meta?.changes ?? (r as any)?.changes ?? 0);
    if (changed > 0) lines += 1;
    else console.error(`[inbound-po] 行级回写未命中（po=${poNo} anchor=${anchor || '-'} code=${code || '-'}）`);
  }

  // 头级：一次汇总累加（避免逐行 UPDATE）
  if (head > 0) {
    await db
      .prepare(
        `UPDATE purchase_orders
            SET delivered_quantity = COALESCE(delivered_quantity, 0) + ?, updated_at = ?
          WHERE org_id = ? AND order_no = ?`
      )
      .bind(head, new Date().toISOString(), orgId, poNo)
      .run();
  }
  return { head, lines };
}

/**
 * 按已交进度推进采购订单状态（D-03）。
 * 口径：Σ已交 >= Σ订购 → received；部分已交 → partial；否则不动。
 * 只在「当前状态允许推进」时改（sent/draft/approved 可推；cancelled/received 不动），
 * 避免把已取消订单复活、也避免覆盖人工置的其他状态。
 */
export async function advancePurchaseOrderStatus(
  db: any,
  orgId: string,
  poNo: string
): Promise<string | null> {
  const po: any = await db
    .prepare(`SELECT id, status FROM purchase_orders WHERE org_id = ? AND order_no = ? LIMIT 1`)
    .bind(orgId, poNo)
    .first();
  if (!po) return null;
  // 仅这些状态允许被过账进度推进（cancelled=已取消、received=已收齐，都不该被改写）
  const advanceable = ['draft', 'sent', 'approved', 'partial'];
  if (!advanceable.includes(String(po.status || ''))) return null;

  const agg: any = await db
    .prepare(
      `SELECT COALESCE(SUM(ordered_quantity), 0) AS ordered,
              COALESCE(SUM(delivered_quantity), 0) AS delivered
         FROM purchase_order_items
        WHERE purchase_order_id = ?`
    )
    .bind(po.id)
    .first();
  const ordered = Number(agg?.ordered) || 0;
  const delivered = Number(agg?.delivered) || 0;
  if (ordered <= 0) return null; // 无订购量，不判（避免 0>=0 直接置 received）

  const next = delivered >= ordered ? 'received' : delivered > 0 ? 'partial' : null;
  if (!next || next === String(po.status)) return null;

  await db
    .prepare(`UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ? AND org_id = ?`)
    .bind(next, new Date().toISOString(), po.id, orgId)
    .run();
  return next;
}

/**
 * 读工单已归集的人工成本（V3.61.0 W-C3 · 生产成本完整结转用）
 * ------------------------------------------------------------------
 * 背景：完工入库凭证原先只按材料成本冲减 5001，人工（借5001/贷2211，倒冲时已归集）
 *   留在 5001 永不结转 → 成品成本系统性低估。本助手让完工入库能取到人工额一起结转。
 *
 * 匹配：入库单 source_no = 工单号（work_orders.order_no）；查不到按 0 计（不虚增成本）。
 */
export async function readWorkOrderLaborCost(db: any, orgId: string, orderNo: string): Promise<number> {
  if (!orderNo) return 0;
  try {
    const row: any = await db
      .prepare(`SELECT actual_labor_cost FROM work_orders WHERE org_id = ? AND order_no = ? LIMIT 1`)
      .bind(orgId, orderNo)
      .first();
    const v = Number(row?.actual_labor_cost) || 0;
    return v > 0 ? v : 0;
  } catch (e: any) {
    console.error('[readWorkOrderLaborCost] 读取工单人工成本失败（按 0 计，不阻断过账）：', e?.message || e);
    return 0;
  }
}

/**
 * 读工单归集的「人工 + 折旧 + 制造费用」（V3.62.0 边界① · 生产成本完整结转用）
 * ------------------------------------------------------------------
 * 背景：完工入库凭证须按「该工单归集的全部生产成本」结转 5001（材料 + 人工 + 折旧 + 制造费用），
 *   此前只含材料 + 人工，折旧与制造费用系统性低估（见 inventoryPosting.ts 生产分支）。
 * 匹配：入库单 source_no = 工单号（work_orders.order_no）；查不到按 0 计（不虚增）。
 * 折旧/制造费用为工单 manual 录入（分配动作另立项，本期不自动从固定资产计提分摊）。
 */
export async function readWorkOrderCosts(
  db: any,
  orgId: string,
  orderNo: string
): Promise<{ laborCost: number; depreciationCost: number; overheadCost: number }> {
  const zero = { laborCost: 0, depreciationCost: 0, overheadCost: 0 };
  if (!orderNo) return zero;
  try {
    const row: any = await db
      .prepare(`SELECT actual_labor_cost, depreciation_cost, overhead_cost FROM work_orders WHERE org_id = ? AND order_no = ? LIMIT 1`)
      .bind(orgId, orderNo)
      .first();
    if (!row) return zero;
    return {
      laborCost: Math.max(0, Number(row.actual_labor_cost) || 0),
      depreciationCost: Math.max(0, Number(row.depreciation_cost) || 0),
      overheadCost: Math.max(0, Number(row.overhead_cost) || 0),
    };
  } catch (e: any) {
    console.error('[readWorkOrderCosts] 读取工单成本失败（按 0 计，不阻断过账）：', e?.message || e);
    return zero;
  }
}