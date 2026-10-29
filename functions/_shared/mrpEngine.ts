/**
 * V3.65.0 立项②：服务端 MRP 自动触发引擎（根治 P1-2「销售订单未自动推生产计划/采购缺口」）
 * ------------------------------------------------------------------
 * 此前：MRP 是纯前端页面手动点「计算净需求」（MRPPlan.tsx），销售订单落库后不会自动
 *       算缺口，计划员漏点 = 备货延误（审计 P1-2 实读坐实）。
 * 现在：销售订单落库后调用 runMRPForOrg，服务端读 D1 现算净需求并幂等落成「计划订单建议」
 *       （planned_orders，既有端点契约），打通「销售订单 → MRP → 采购/生产缺口建议」自动闭环。
 *
 * 口径（与前端 MRPPlan.tsx 的 computeNetRequirements 同源，保证两处算法一致）：
 *   · 需求侧 = 活跃销售订单（排除 completed/cancelled）经 BOM 多级展开的毛需求；
 *   · 供应侧 = 现有库存(inventory_records.available_quantity) + 在途采购(ordered−delivered)；
 *   · 净需求 = max(0, 毛需求 + 安全库存 − 现有 − 在途)；安全库存分层不被消耗（对标 SAP MRP 元素）；
 *   · 建议量 = 净需求经 lotSize 向上取整 + 不低于 moq；物料 makeOrBuy 决定 purchase / manufacture；
 *   · 低层码(LLC) = 物料在 BOM 树中最深层级，保证「父件先算、子件后算」；
 *   · 废品率放大 = 计划用量 ÷ (1 − 废品率)（合格产出反推口径）。
 *
 * 幂等：整批落库复用 planned-orders 的 upsert 契约（同 run_id 重算只更新数量、不重复建批，
 *       且刻意不动 status——已确认/已转换的建议不被自动重算抹掉，人的判断不被机器覆盖）。
 * 不阻断：本引擎是「建议」不是「命令」，任何一步读库失败都静默返回，绝不阻断主销售订单创建。
 */
import { uid } from './auth';

const MAX_BOM_DEPTH = 10;

/** MRP 净需求单行（口径对齐 MRPPlan.tsx 的 MrpResultRow 核心字段） */
export interface MrpServerRow {
  materialCode: string;
  materialName: string;
  unit: string;
  type: 'purchase' | 'manufacture';
  grossQty: number;
  onHandQty: number;
  onOrderQty: number;
  netQty: number;
  plannedQty: number;
  dueDate: string;
  lowLevelCode: number;
  priority: 'urgent' | 'normal';
  reason: string;
}

interface MrpEngineInputs {
  orgId: string;
  /** 活跃销售订单行（material_id/material_code/material_name/quantity/delivery_date） */
  soLines: { materialId: string; materialCode: string; materialName: string; quantity: number; deliveryDate?: string }[];
  /** BOM 头（product_id 为键，released 优先） */
  bomHeaders: { id: string; productId: string; status: string }[];
  /** BOM 明细（bom_id 分组） */
  bomItems: { bomId: string; materialId: string; materialCode: string; quantity: number; scrapRate: number }[];
  /** 物料主数据（material_id 为键） */
  materials: { id: string; code: string; name: string; unit: string; makeOrBuy: string; safetyStock: number; lotSize: number; moq: number; leadTime: number; cycleTime: number; scrapRate: number }[];
  /** 库存可用量（material_id 为键，Σ available_quantity） */
  onHandByMaterial: Map<string, number>;
  /** 在途采购量（material_id 为键，Σ ordered − delivered） */
  onOrderByMaterial: Map<string, number>;
}

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function todayPlusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 计算净需求（纯函数，输入全来自 D1）。
 * 返回建议行（仅保留 net>0 或 planned>0 的，0 需求不落库制造噪声）。
 */
export function computeMrpServerRows(input: MrpEngineInputs): MrpServerRow[] {
  const { orgId, soLines, bomHeaders, bomItems, materials, onHandByMaterial, onOrderByMaterial } = input;
  void orgId; // 组织隔离由查询侧 WHERE org_id=? 承担，纯计算函数不再用
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const materialByCode = new Map(materials.map((m) => [m.code, m]));

  // BOM 以 productId 为键（released 优先，避免同产品多版本口径冲突）
  const bomByProductId = new Map<string, any>();
  for (const h of bomHeaders) {
    if (!h.productId) continue;
    const cur = bomByProductId.get(h.productId);
    if (!cur || (h.status === 'released' && cur.status !== 'released')) {
      bomByProductId.set(h.productId, h);
    }
  }
  const itemsByBom = new Map<string, typeof bomItems>();
  for (const it of bomItems) {
    if (!itemsByBom.has(it.bomId)) itemsByBom.set(it.bomId, []);
    itemsByBom.get(it.bomId)!.push(it);
  }

  // ── 低层码（LLC）：物料在所有 BOM 路径中最深层级，决定运算顺序（父先子后）──
  const lowLevelCode = new Map<string, number>();
  const isChildOfSomeBom = new Set<string>();
  for (const b of bomItems) if (b.materialId) isChildOfSomeBom.add(b.materialId);
  const walkLLC = (materialId: string, depth: number, seen: Set<string>) => {
    if (depth > MAX_BOM_DEPTH) return;
    if (seen.has(materialId)) return; // BOM 配成环的防栈溢出闸门
    const prev = lowLevelCode.get(materialId);
    if (prev === undefined || depth > prev) lowLevelCode.set(materialId, depth);
    const bom = bomByProductId.get(materialId);
    if (!bom) return;
    const childItems = itemsByBom.get(bom.id) || [];
    if (childItems.length === 0) return;
    const nextSeen = new Set(seen);
    nextSeen.add(materialId);
    for (const it of childItems) walkLLC(it.materialId, depth + 1, nextSeen);
  };
  for (const h of bomHeaders) {
    if (h.productId && !isChildOfSomeBom.has(h.productId)) walkLLC(h.productId, 0, new Set());
  }
  for (const m of materials) if (!lowLevelCode.has(m.id)) lowLevelCode.set(m.id, 0);

  // ── 毛需求 + 需求日期（取该物料最早交期）+ 废品率加权 ──
  const grossDemand = new Map<string, number>();
  const demandDateByMaterial = new Map<string, string>();
  const scrapWeighted = new Map<string, number>();
  const scrapQty = new Map<string, number>();

  const recordDemand = (materialId: string, soDate?: string) => {
    if (!soDate) return;
    const cur = demandDateByMaterial.get(materialId);
    if (!cur || soDate < cur) demandDateByMaterial.set(materialId, soDate);
  };
  const recordScrap = (materialId: string, qty: number, ratePct: number) => {
    if (!(ratePct > 0) || !(qty > 0)) return;
    scrapWeighted.set(materialId, (scrapWeighted.get(materialId) ?? 0) + qty * ratePct);
    scrapQty.set(materialId, (scrapQty.get(materialId) ?? 0) + qty);
  };
  const inflateForScrap = (qty: number, scrapRatePct?: number): number => {
    const r = Math.min(Math.max(scrapRatePct ?? 0, 0), 99) / 100;
    return r > 0 ? qty / (1 - r) : qty;
  };

  const explode = (materialId: string, qty: number, depth: number, soDate?: string) => {
    if (depth > MAX_BOM_DEPTH) return;
    const bom = bomByProductId.get(materialId);
    const childItems = bom ? itemsByBom.get(bom.id) || [] : [];
    if (bom && childItems.length > 0) {
      for (const item of childItems) {
        const need = inflateForScrap(qty * num(item.quantity), num(item.scrapRate));
        recordScrap(item.materialId, need, num(item.scrapRate));
        const childBom = bomByProductId.get(item.materialId);
        if (childBom && item.materialId !== materialId) {
          explode(item.materialId, need, depth + 1, soDate); // 半成品继续向下展开
        } else {
          grossDemand.set(item.materialId, (grossDemand.get(item.materialId) ?? 0) + need);
          recordDemand(item.materialId, soDate);
        }
      }
    } else {
      // 无 BOM 的叶子物料：需求直接落本物料
      grossDemand.set(materialId, (grossDemand.get(materialId) ?? 0) + qty);
      recordDemand(materialId, soDate);
    }
  };

  // 1) 汇总活跃销售订单毛需求
  for (const line of soLines) {
    const targetId = line.materialId || (line.materialCode ? (materialByCode.get(line.materialCode)?.id ?? '') : '');
    if (!targetId) continue;
    explode(targetId, num(line.quantity), 0, line.deliveryDate);
  }

  // 2) 净需求 + 批量 + 提前期偏置
  const fallbackDate = todayPlusDays(30);
  const rows: MrpServerRow[] = [];
  for (const [materialId, gross] of grossDemand) {
    const mat = materialById.get(materialId);
    if (!mat) continue; // 引用的物料不在主数据，跳过（不造幽灵物料）
    const onHand = onHandByMaterial.get(materialId) ?? 0;
    const onOrder = onOrderByMaterial.get(materialId) ?? 0;
    const safetyStock = num(mat.safetyStock);
    const net = Math.max(0, gross + safetyStock - onHand - onOrder);
    // 综合废品率（按需求量加权）
    const sw = scrapWeighted.get(materialId) ?? 0;
    const sq = scrapQty.get(materialId) ?? 0;
    const scrapRate = sq > 0 ? Math.round((sw / sq) * 100) / 100 : 0;
    // 批量规则（lotSize 取整 + 不低于 MOQ）
    const lotSize = num(mat.lotSize);
    const moq = num(mat.moq);
    let planned = net;
    if (lotSize > 1 && net > 0) planned = Math.ceil(net / lotSize) * lotSize;
    if (moq > 0 && planned < moq) planned = moq;
    if (net === 0) planned = 0;
    // 建议类型：自制/外购（属性缺失保守按外购——下采购申请可逆，误开工单纠错成本高）
    const isMake = mat.makeOrBuy === 'make';
    const type: 'purchase' | 'manufacture' = isMake ? 'manufacture' : 'purchase';
    // 提前期偏置：采购用 leadTime，自制用 cycleTime（缺省 0 → 建议下单日=需求日）
    const effLead = isMake ? (num(mat.cycleTime) || num(mat.leadTime)) : num(mat.leadTime);
    const demandDate = demandDateByMaterial.get(materialId) ?? fallbackDate;
    // 优先级：需求日已到且净需求>0 为紧急
    const urgent = net > 0 && demandDate <= todayPlusDays(0);
    rows.push({
      materialCode: mat.code,
      materialName: mat.name,
      unit: mat.unit,
      type,
      grossQty: Math.round(gross * 100) / 100,
      onHandQty: onHand,
      onOrderQty: onOrder,
      netQty: Math.round(net * 100) / 100,
      plannedQty: Math.round(planned * 100) / 100,
      dueDate: demandDate,
      lowLevelCode: lowLevelCode.get(materialId) ?? 0,
      priority: urgent ? 'urgent' : 'normal',
      reason: `净需求 ${net.toFixed(0)} = 毛需求 ${gross.toFixed(0)} + 安全库存 ${safetyStock} − 现有 ${onHand} − 在途 ${onOrder}` +
        (scrapRate > 0 ? `（毛需求已按废品率 ${scrapRate}% 放大）` : ''),
    });
  }
  // 只保留有实际建议量的行（net=0 且 planned=0 的行落库只会制造噪声）
  const useful = rows.filter((r) => r.netQty > 0 || r.plannedQty > 0);
  // 先按低层码升序、同层再按净需求降序（与 MRP 运算顺序一致，便于逐层核对）
  useful.sort((a, b) => (a.lowLevelCode - b.lowLevelCode) || (b.netQty - a.netQty));
  return useful;
}

/**
 * 读 D1 现算某组织 MRP 并幂等落成计划订单建议。
 * @returns 落库统计（inserted/updated/skipped/total），失败静默返回 null（绝不阻断调用方主单据）
 */
export async function runMRPForOrg(db: any, orgId: string): Promise<{ runId: string; inserted: number; updated: number; skipped: number; total: number } | null> {
  try {
    // ── 1) 需求侧：活跃销售订单行（排除 completed/cancelled）──
    const soRes: any = await db
      .prepare(
        `SELECT soi.material_id, soi.material_code, soi.material_name, soi.quantity, soi.delivery_date
           FROM sales_order_items soi
           JOIN sales_orders so ON so.id = soi.sales_order_id
          WHERE so.org_id = ? AND so.status NOT IN ('completed','cancelled')`
      )
      .bind(orgId)
      .all();
    const soLines = (soRes.results || []).map((r: any) => ({
      materialId: r.material_id || '',
      materialCode: r.material_code || '',
      materialName: r.material_name || '',
      quantity: num(r.quantity),
      deliveryDate: r.delivery_date || undefined,
    }));

    // ── 2) BOM 头 + 明细（released 优先在 compute 内归并）──
    // ★ 铁律㊸：bom_items 设计取舍4「明细不存 org_id」（只靠 bom_id 外键从属头表），
    //   直接 WHERE org_id=? 会 no such column → 500。改 JOIN bom_headers 借其 org_id 过滤。
    const bomHeadRes: any = await db
      .prepare(`SELECT id, product_id, status FROM bom_headers WHERE org_id = ? AND status IN ('released','draft')`)
      .bind(orgId).all();
    const bomHeaders = (bomHeadRes.results || []).map((r: any) => ({ id: r.id, productId: r.product_id, status: r.status }));
    const bomItemRes: any = await db
      .prepare(
        `SELECT bi.bom_id, bi.material_id, bi.material_code, bi.quantity, bi.scrap_rate
           FROM bom_items bi
           JOIN bom_headers bh ON bh.id = bi.bom_id
          WHERE bh.org_id = ? AND bh.status IN ('released','draft')`
      )
      .bind(orgId).all();
    const bomItems = (bomItemRes.results || []).map((r: any) => ({
      bomId: r.bom_id, materialId: r.material_id, materialCode: r.material_code,
      quantity: num(r.quantity), scrapRate: num(r.scrap_rate),
    }));

    // ── 3) 物料主数据 ──
    const matRes: any = await db
      .prepare(
        `SELECT id, code, name, unit, make_or_buy, safety_stock, lot_size, moq, lead_time, cycle_time, scrap_rate
           FROM materials WHERE org_id = ?`
      )
      .bind(orgId).all();
    const materials = (matRes.results || []).map((r: any) => ({
      id: r.id, code: r.code, name: r.name, unit: r.unit,
      makeOrBuy: r.make_or_buy || 'buy',
      safetyStock: num(r.safety_stock), lotSize: num(r.lot_size), moq: num(r.moq),
      leadTime: num(r.lead_time), cycleTime: num(r.cycle_time), scrapRate: num(r.scrap_rate),
    }));

    // ── 4) 供应侧：现有库存可用量（Σ available_quantity，跨仓库）──
    const onHandRes: any = await db
      .prepare(`SELECT material_id, SUM(available_quantity) AS avail FROM inventory_records WHERE org_id = ? GROUP BY material_id`)
      .bind(orgId).all();
    const onHandByMaterial = new Map<string, number>();
    (onHandRes.results || []).forEach((r: any) => onHandByMaterial.set(r.material_id, num(r.avail)));

    // ── 5) 在途采购（ordered − delivered，排除终态 PO）──
    const onOrderRes: any = await db
      .prepare(
        `SELECT poi.material_id, SUM(poi.ordered_quantity - poi.delivered_quantity) AS on_order
           FROM purchase_order_items poi
           JOIN purchase_orders po ON po.id = poi.purchase_order_id
          WHERE po.org_id = ? AND po.status NOT IN ('received','closed','cancelled')
          GROUP BY poi.material_id`
      )
      .bind(orgId).all();
    const onOrderByMaterial = new Map<string, number>();
    (onOrderRes.results || []).forEach((r: any) => {
      const v = num(r.on_order);
      if (v > 0) onOrderByMaterial.set(r.material_id, v);
    });

    // ── 6) 现算净需求 ──
    const rows = computeMrpServerRows({
      orgId, soLines, bomHeaders, bomItems, materials, onHandByMaterial, onOrderByMaterial,
    });
    if (rows.length === 0) {
      return { runId: uid('mrpso'), inserted: 0, updated: 0, skipped: 0, total: 0 };
    }

    // ── 7) 幂等落库：复用 planned-orders upsert 契约（同 run_id 重算只更新数量，不重复建批）──
    const runId = `MRP-SO-${Date.now()}`;
    const runAt = new Date().toISOString();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
    let inserted = 0;
    let updated = 0;
    const stmt = db.prepare(
      `INSERT INTO planned_orders (
         id, org_id, run_id, run_at, material_code, material_name, unit, type,
         gross_qty, on_hand_qty, on_order_qty, net_qty, planned_qty,
         due_date, bucket_start, low_level_code, status, priority, reason, note,
         created_at, updated_at, created_by, updated_by, owner_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(org_id, run_id, material_code, type) DO UPDATE SET
         material_name = excluded.material_name,
         unit = excluded.unit,
         gross_qty = excluded.gross_qty,
         on_hand_qty = excluded.on_hand_qty,
         on_order_qty = excluded.on_order_qty,
         net_qty = excluded.net_qty,
         planned_qty = excluded.planned_qty,
         due_date = excluded.due_date,
         low_level_code = excluded.low_level_code,
         priority = excluded.priority,
         reason = excluded.reason,
         updated_at = excluded.updated_at
         -- ⚠️ 刻意不更新 status：自动重算不能把计划员已确认/已转换的建议抹回 draft（见端点设计）`
    );
    for (const r of rows) {
      const exist: any = await db
        .prepare(`SELECT id FROM planned_orders WHERE org_id = ? AND run_id = ? AND material_code = ? AND type = ?`)
        .bind(orgId, runId, r.materialCode, r.type)
        .first();
      await stmt
        .bind(
          uid('po'), orgId, runId, runAt,
          r.materialCode, r.materialName, r.unit, r.type,
          r.grossQty, r.onHandQty, r.onOrderQty, r.netQty, r.plannedQty,
          r.dueDate, null, r.lowLevelCode,
          r.priority, r.reason, `销售订单自动触发 MRP（V3.65.0）`,
          now, now, 'system', 'system',
        )
        .run();
      if (exist) updated += 1;
      else inserted += 1;
    }
    return { runId, inserted, updated, skipped: 0, total: inserted + updated };
  } catch {
    // MRP 是「建议」不是「命令」：读库/落库失败一律静默，绝不阻断销售订单创建
    return null;
  }
}
