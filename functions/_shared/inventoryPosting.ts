/**
 * 库存过账（服务端权威实现）—— N1 架构级改造（2026-09-20 强哥拍板落地）
 * ------------------------------------------------------------------
 * 之前：入库/出库单只存单据，库存数量与移动均价在前端浏览器里算，绕开界面
 *       直接调接口建单时库存/成本完全不动（演示级 vs 生产级的核心分界）。
 * 现在：入库单/出库单状态变为 completed 时，由本模块在服务端事务内统一过账，
 *       直接写 D1 的 inventory_records 与 materials 表，成为唯一权威源。
 *
 * 口径严格对齐前端 src/utils/cost.ts（双轨比对已验证 6/6 一致）：
 *  - 入库：移动平均价滚动 = (原金额 + 本次入库未税金额) / (原数量 + 本次数量)
 *  - 出库：结转成本 = 出库数量 × 当前移动平均价；单价不变，只减数量与金额
 *  - 金额 2 位小数、单价 4 位小数
 *
 * 超发策略（强哥 2026-09-20 拍板：两账本都卡 0）：
 *  - inventory_records.quantity / available_quantity 取 MAX(0, ...) 不出负
 *  - materials.current_stock / stock_value 取 Math.max(0, ...) 不出负
 *    （不再静默归零隐藏成本：归零后 costAmount 仍按真实数量×单价计提，
 *     利润虚高风险由「超发本就是异常、需人工冲正」的业务语义兜住）
 *
 * 幂等：调用方必须用单据的 inventory_posted 守卫，已 posted 不再过账。
 */
import { writeVoucher } from './voucherWriter';
import { roundAmount, roundPrice } from './money';
import { insertSerialMovement } from './serial';
import { isPeriodClosed } from './appState';
// ★ V3.113.3 P0-3：扣留「占用实物」状态词表全链路唯一来源（避免三处各写一份清单而分叉）。
import { HOLD_OCCUPYING_STATUSES } from './qualityHoldStatus';

const nowIso = (): string => new Date().toISOString().replace(/\.\d{3}Z$/, '');

/**
 * 写一条库存变动流水（V3.46.0 第2批① · 对标 SAP MATDOC / 金蝶库存流水账）
 * ------------------------------------------------------------------
 * 为什么必须有流水：inventory_records 只是**当前余额快照**，过账只做
 * `quantity = quantity + ?` 原地累加。此前全库没有任何一张表记录"为什么变"，
 * 于是「超发卡 0 / 手工改库存 / 盘点不过账 / 调拨不过账 / 双轨滚成本」
 * 这五类差异全被静默吸收，事后无从追溯。
 *
 * 有流水之后：
 *   · 余额可由 SUM(qty_delta) 重建，与 inventory_records 互为校验（对账作业会比对）；
 *   · 每笔变动都能反查来源单据（doc_type + doc_no + doc_id）；
 *   · 可按会计期间汇总，回答"这个月库存到底怎么变的"。
 *
 * 设计取舍：qty_delta / value_delta **带符号**（入库为正、出库为负），
 *   这样 SUM 即可得余额，无需按类型分类聚合。
 *
 * 流水**只作废不删除**（is_voided=1）：它是账实追溯依据，删单据时作废而非删行。
 */
export interface InvTxnRow {
  materialId: string;
  materialCode?: string | null;
  materialName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  locationId?: string | null;
  batchNo?: string | null;
  unit?: string | null;
  qtyDelta: number;
  valueDelta: number;
  unitCost?: number;
  txnType: string;
  docType?: string | null;
  docNo?: string | null;
  docId?: string | null;
  docDate?: string | null;
  deptId?: string | null;
  remark?: string | null;
}

/**
 * P0-3：构造一条「**未执行**」的库存流水 INSERT 语句。
 * 让过账方可以把「物料余额 + 流水 + 库存记录」三条语句收进**同一个 db.batch** 原子提交——
 * 流水写失败会随整批回滚，杜绝「库存余额已实动、流水却缺失」的半状态
 * （原 writeInvTxn 单独 await 且吞错，正是审计 S-05 的根因）。
 */
export function invTxnStatement(db: any, orgId: string, user: any, row: InvTxnRow): { stmt: any; id: string } {
  const qty = Number(row.qtyDelta) || 0;
  const val = Number(row.valueDelta) || 0;
  const id = 'invtxn-' + crypto.randomUUID();
  const stmt = db
    .prepare(
      `INSERT INTO inventory_transactions
         (id, org_id, material_id, material_code, material_name, warehouse_id, warehouse_name,
          location_id, batch_no, unit, qty_delta, value_delta, unit_cost,
          txn_type, doc_type, doc_no, doc_id, doc_date, period, dept_id, user_id, user_name,
          remark, is_voided, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .bind(
      id, orgId, row.materialId,
      // ★ 全部字符串字段显式归一为 null：Cloudflare D1 对 undefined 参数直接抛
      //   "Type 'undefined' not supported"，而各调用方传的对象字段并不统一
      //   （入库传 order.id、调拨传 order.transfer_no…），漏一个就整条流水写不进去。
      row.materialCode ?? null, row.materialName ?? null,
      row.warehouseId ?? null, row.warehouseName ?? null, row.locationId ?? null,
      row.batchNo ?? null, row.unit ?? null,
      qty, val, Number(row.unitCost) || 0,
      row.txnType, row.docType ?? null, row.docNo ?? null, row.docId ?? null,
      row.docDate ?? null,
      (row.docDate || '').slice(0, 7) || null,
      row.deptId ?? user?.department ?? null, user?.id ?? null, user?.name ?? null,
      row.remark ?? null, nowIso()
    );
  return { stmt, id };
}

/**
 * 写一条库存变动流水（V3.46.0 第2批① · 对标 SAP MATDOC / 金蝶库存流水账）
 * ------------------------------------------------------------------
 * 为什么必须有流水：inventory_records 只是**当前余额快照**，过账只做
 * `quantity = quantity + ?` 原地累加。此前全库没有任何一张表记录"为什么变"，
 * 于是「超发卡 0 / 手工改库存 / 盘点不过账 / 调拨不过账 / 双轨滚成本」
 * 这五类差异全被静默吸收，事后无从追溯。
 *
 * 有流水之后：
 *   · 余额可由 SUM(qty_delta) 重建，与 inventory_records 互为校验（对账作业会比对）；
 *   · 每笔变动都能反查来源单据（doc_type + doc_no + doc_id）；
 *   · 可按会计期间汇总，回答"这个月库存到底怎么变的"。
 *
 * 设计取舍：qty_delta / value_delta **带符号**（入库为正、出库为负），
 *   这样 SUM 即可得余额，无需按类型分类聚合。
 *
 * 流水**只作废不删除**（is_voided=1）：它是账实追溯依据，删单据时作废而非删行。
 *
 * P0-3 说明：本函数是「单独写一条流水」的独立入口（供对账补录等场景），
 *   保留吞错语义（流水缺失不阻断业务、靠对账发现）；但**过账主路径已改走
 *   invTxnStatement + db.batch 原子提交**，正常入库/出库不再经过这里。
 */
export async function writeInvTxn(
  db: any,
  orgId: string,
  user: any,
  row: InvTxnRow
): Promise<string | null> {
  if (!row?.materialId || !row.txnType) return null;
  const qty = Number(row.qtyDelta) || 0;
  const val = Number(row.valueDelta) || 0;
  if (qty === 0 && val === 0) return null; // 无变动不写流水，避免噪声
  const { stmt, id } = invTxnStatement(db, orgId, user, row);
  try {
    await stmt.run();
    return id;
  } catch (e: any) {
    // 流水写失败**不回滚库存**（账已实动）—— 与凭证失败同策略：记日志、不阻断业务。
    // 代价是这笔变动没有流水，差异需靠对账作业（比对流水合计 vs inventory_records）发现。
    console.error('[writeInvTxn] 库存流水写入失败（余额已变动，需对账修复）：', e?.message || e);
    return null;
  }
}

/** 取物料现行成本单价（与前端 getUnitCost 一致）：移动均价 > 标准价 > 采购价 */
const getUnitCost = (m: any): number => {
  if (!m) return 0;
  if (typeof m.moving_avg_price === 'number' && m.moving_avg_price > 0) return m.moving_avg_price;
  if (typeof m.standard_price === 'number' && m.standard_price > 0) return m.standard_price;
  return typeof m.price === 'number' ? m.price : 0;
};

/**
 * 物料余额更新已改为**相对原子 UPDATE**（见 postInbound / postOutbound 内联实现，
 * V3.62.0 边界⑤ W-A7 修复：消除「读-算-绝对值 SET」的并发丢更新窗口）。
 * 原 rollIn / rollOut 移动均价滚动函数已弃用删除（其口径已内联进相对原子 UPDATE）。
 */

/** 按 物料+仓库+库位 定位库存行；库位为空时忽略维度（与前端 postInboundToInventory 匹配语义一致） */
const findInvRow = async (db: any, orgId: string, materialId: string, warehouseId: string, locId: string | null) =>
  db
    .prepare(
      `SELECT * FROM inventory_records WHERE org_id = ? AND material_id = ? AND warehouse_id = ? AND (? IS NULL OR location_id = ?) LIMIT 1`
    )
    .bind(orgId, materialId, warehouseId, locId, locId)
    .first();

/**
 * ★ V3.113.3 P0-3 · 质量冻结量（frozen_quantity）统一读写
 * ------------------------------------------------------------------
 * 缺陷背景（实测复验）：`inventory_records.frozen_quantity` 这一列**全链路无人写、无人读**：
 *   · postInbound 建库存行时该列**写死 0**（见下方 INSERT 的常量 0）；
 *   · 质检扣留（quality_holds）只写自己的表，从不动冻结量；
 *   · 前端 ATP / MRP 用**前端内存里的 qualityHolds 数组**算可用量，与本列完全脱钩；
 *   · 「库存查询」页的「冻结数量」列恒显示 0。
 *   后果：两套口径分裂 —— ATP 说「扣了」、库存台账说「没扣」，审计对不上。
 *
 * 正确口径（三家标杆通行）：**可用量 = 现有量 − 冻结量 − 占用量**，
 *   且冻结量必须在**库存台账这一层**落地，ATP / MRP / 出库三处共用同一口径。
 *
 * 本模块提供：
 *   · adjustFrozenQuantity —— 按 (物料,仓库,批次) 把冻结量加/减，并**同步扣减 available_quantity**
 *     （可用量 = 现有量 − 冻结量；冻结即从可用中扣除）。
 *   · getFrozenQuantity —— 读某物料在某仓的冻结量（出库前校验用）。
 *
 * 批次语义：inventory_records 的唯一索引是 (org_id, material_id, warehouse_id)，
 *   **不含批次** —— 冻结量按「物料+仓库」聚合存放（批次维度在 quality_holds 里保留），
 *   这是当前表的物理约束下的唯一一致口径。若将来库存表加批次维度，此处需同步细化。
 */
export async function adjustFrozenQuantity(
  db: any,
  orgId: string,
  user: any,
  params: { materialId: string; warehouseId?: string | null; delta: number; reason?: string }
): Promise<{ ok: boolean; frozen: number; available: number; message?: string }> {
  const { materialId, warehouseId, delta } = params;
  if (!materialId) return { ok: false, frozen: 0, available: 0, message: '缺少物料 id' };
  const qty = Number(delta) || 0;
  if (qty === 0) {
    const cur = await db.prepare(
      `SELECT COALESCE(frozen_quantity,0) AS f FROM inventory_records WHERE org_id = ? AND material_id = ? AND (? IS NULL OR warehouse_id = ?) LIMIT 1`
    ).bind(orgId, materialId, warehouseId ?? null, warehouseId ?? null).first();
    return { ok: true, frozen: Number(cur?.f) || 0, available: 0 };
  }

  const now = nowIso();

  if (qty > 0) {
    // 冻结：frozen += qty，available = MAX(0, available - qty)
    const r = await db.prepare(
      `UPDATE inventory_records
          SET frozen_quantity = COALESCE(frozen_quantity, 0) + ?,
              available_quantity = MAX(0, COALESCE(available_quantity, 0) - ?),
              updated_at = ?
        WHERE org_id = ? AND material_id = ? AND (? IS NULL OR warehouse_id = ?)`
    ).bind(qty, qty, now, orgId, materialId, warehouseId ?? null, warehouseId ?? null).run();
    if (((r as any)?.meta?.changes ?? 0) === 0) {
      return { ok: false, frozen: 0, available: 0, message: '未找到对应库存记录，无法冻结（该物料在本仓无库存行）' };
    }
  } else {
    // 解冻：frozen = MAX(0, frozen + delta)（delta 为负），available += 实际解冻量
    // 实际解冻量不能超过当前冻结量（防止重复解冻把可用量虚增）
    const cur = await db.prepare(
      `SELECT COALESCE(frozen_quantity,0) AS f FROM inventory_records WHERE org_id = ? AND material_id = ? AND (? IS NULL OR warehouse_id = ?) LIMIT 1`
    ).bind(orgId, materialId, warehouseId ?? null, warehouseId ?? null).first();
    const curFrozen = Number(cur?.f) || 0;
    const release = Math.min(curFrozen, -qty);
    if (release <= 0) {
      return { ok: true, frozen: curFrozen, available: 0, message: '当前无冻结量可解冻' };
    }
    await db.prepare(
      `UPDATE inventory_records
          SET frozen_quantity = MAX(0, COALESCE(frozen_quantity, 0) - ?),
              available_quantity = COALESCE(available_quantity, 0) + ?,
              updated_at = ?
        WHERE org_id = ? AND material_id = ? AND (? IS NULL OR warehouse_id = ?)`
    ).bind(release, release, now, orgId, materialId, warehouseId ?? null, warehouseId ?? null).run();
  }

  const after = await db.prepare(
    `SELECT COALESCE(frozen_quantity,0) AS f, COALESCE(available_quantity,0) AS a FROM inventory_records WHERE org_id = ? AND material_id = ? AND (? IS NULL OR warehouse_id = ?) LIMIT 1`
  ).bind(orgId, materialId, warehouseId ?? null, warehouseId ?? null).first();

  return { ok: true, frozen: Number(after?.f) || 0, available: Number(after?.a) || 0 };
}

/** 读某物料在某仓的冻结量（出库前校验用） */
export async function getFrozenQuantity(
  db: any, orgId: string, materialId: string, warehouseId?: string | null
): Promise<number> {
  const r = await db.prepare(
    `SELECT COALESCE(frozen_quantity,0) AS f FROM inventory_records WHERE org_id = ? AND material_id = ? AND (? IS NULL OR warehouse_id = ?) LIMIT 1`
  ).bind(orgId, materialId, warehouseId ?? null, warehouseId ?? null).first();
  return Number(r?.f) || 0;
}

/**
 * ★ V3.61.0 P0-1 · 期末结账守卫（库存链路统一入口）
 * ------------------------------------------------------------------
 * 之前：`isPeriodClosed` 只挂在「凭证手工端点」与「折旧端点」，入库/出库/调拨/
 *   盘点/倒冲的服务端过账与自动凭证一律无拦 → 已关账月份仍可动账并写 posted 凭证
 *   （生产坐实：隔离组织关 2026-08 后同月入库单 201 被接受）。
 * 现在：守卫下沉到**过账中枢**，一处覆盖全部库存过账路径；凭证侧在 writeVoucher
 *   再设第二道防线（覆盖发票/付款/开票等非库存来源的自动凭证）。
 *
 * ★ 关键教训（V3.61.0 首次实现踩坑）：守卫**只放在过账中枢抛错是不够的**——
 *   单据端点把 postInbound/postOutbound 包在 try 里、catch 中只回滚
 *   inventory_posted 抢占标志并「建单照常返回 201」→ 守卫被catch 吞掉，
 *   表现为「入库单建成功、实际没过账」的假成功（探针实测：守卫抛错但接口仍返 201）。
 *   正确做法：**端点在抢占 inventory_posted 之前先调assertPeriodOpen 并直接返回
 *   4xx**，让整条请求失败；中枢内的本校验降级为「兜底」（防止未来新增调用点绕过端点）。
 *
 * 口径：期间取**单据业务日期**（inboundDate/outboundDate/transferDate/date）所属月份，
 *   与折旧端点一致；无日期时用当天（与凭证生成兜底同口径）。
 *
 * @returns 无异常即放行；已结账则抛 PERIOD_CLOSED 错误
 */
export async function assertPeriodOpen(
  db: any,
  orgId: string,
  order: any,
  kind: string
): Promise<void> {
  const date = String(
    order?.date || order?.inboundDate || order?.outboundDate || order?.transferDate || ''
  ).slice(0, 10);
  const period = date ? date.slice(0, 7) : nowIso().slice(0, 7);
  if (await isPeriodClosed(db, orgId, period)) {
    throw new Error(`PERIOD_CLOSED:${kind} 所属会计期间 ${period} 已结账，禁止过账（请先反结账或改单据日期）`);
  }
}

/**
 * 入库过账：滚动物料移动均价 + upsert 库存记录（按 物料+仓库+库位 聚合）
 * @returns { totalCost } 本次入库未税总金额（与前端 rollInboundCost 同口径，供单据 total_cost 回写）
 */
/**
 * V3.63.0 质量拦截（根治审计 P0「被冻结/来料检不合格的物料仍可出入库」）：
 * 入库/出库前校验物料（可选批次）是否被质量冻结或来料检不合格卡住。
 * ① quality_holds：status 为 pending/active 的冻结，命中 material（+batch 可选）。
 * ② failedInspection=true（出库/领用场景）：额外拦截「来料检不合格且未处置闭环」的物料/批次，
 *    判定 = 存在 incoming 且 status='failed' 的检验任务，且无对应 dispositionStatus='completed' 的不合格品。
 *    入库场景不拦检验（否则"未收货先卡"形成循环：必须先收货才能检验）。
 * 返回 null 表示放行；返回字符串为拦截原因（调用方据此跳过本行并留痕，绝不静默放行）。
 */
async function checkQualityBlocked(
  db: any, orgId: string, materialId: string | null, materialCode: string, batchNo: string, opts?: { failedInspection?: boolean }
): Promise<string | null> {
  if (!materialId) return null;
  const m = String(materialId);
  const b = batchNo || '';
  const hold = await db
    .prepare(
      `SELECT id, status, batch_no, reason FROM quality_holds
         WHERE org_id = ? AND material_id = ?
           AND status IN (${HOLD_OCCUPYING_STATUSES.map(() => '?').join(',')})
           AND (batch_no IS NULL OR batch_no = '' OR batch_no = ?)`
    )
    .bind(orgId, m, ...HOLD_OCCUPYING_STATUSES, b)
    .first();
  if (hold) {
    return `物料 ${materialCode} 处于质量冻结（quality_holds ${hold.id}，原因：${hold.reason || '未填写'}），已被拦截，未经质量释放不得出入库。`;
  }
  if (opts?.failedInspection) {
    const failed = await db
      .prepare(
        `SELECT it.id FROM inspection_tasks it
           WHERE it.org_id = ? AND it.type = 'incoming' AND it.status = 'failed'
             AND it.material_id = ? AND (it.batch_no IS NULL OR it.batch_no = '' OR it.batch_no = ?)
             AND NOT EXISTS (
               SELECT 1 FROM unqualified_items uq
                 WHERE uq.org_id = ? AND uq.inspection_task_id = it.id AND uq.disposition_status = 'completed'
             )
           LIMIT 1`
      )
      .bind(orgId, m, b, orgId)
      .first();
    if (failed) {
      return `物料 ${materialCode} 存在来料检不合格（inspection_tasks ${failed.id}）且未处置闭环，已被拦截，需先在质量模块完成不合格品处置（报废/返工/退货/让步接收）。`;
    }
  }
  return null;
}

export async function postInbound(db: any, orgId: string, user: any, order: any): Promise<{ totalCost: number; voucherIssues: string[] }> {
  await assertPeriodOpen(db, orgId, order, '入库单');
  let totalCost = 0;
  // ★ R4 吞错留痕：凭证生成失败不阻断库存过账（账已实动不回滚），但失败原因必须回传，
  //   否则「库存已动、凭证缺失」在调用方响应里零痕迹（对标序列号 serialIssues 留痕范式）。
  const voucherIssues: string[] = [];
  for (const item of order.items || []) {
    const qty = Number(item.actualQuantity) || Number(item.expectedQuantity) || 0;
    if (qty <= 0) continue;
    const materialId = item.materialId || null;

    // ★ V3.63.0 质量拦截：入库前校验物料/批次是否被质量冻结（来料检不合格不在入库拦截，避免"未收货先卡"循环）
    const _qbIn = await checkQualityBlocked(db, orgId, materialId, item.materialCode || item.materialName || materialId || '?', item.batchNo || '');
    if (_qbIn) {
      voucherIssues.push(_qbIn);
      continue;
    }

    // ★ V3.61.0 修正 W-A8 的副作用：物料无效/未传id 时**不再直接 continue**。
    //   旧写法「if (!materialId) continue; if (!material) continue;」把整行走掉，
    //   连「成本累加」也跳过了 → totalCost 恒 0 → generateInboundVouchers判cost<=0 早退
    //   → **库存没入、账也没记，且零留痕**（生产坐实：成品料未建物料时完工入库 201 但凭证 0 条）。
    //   现在：物料有效 → 照旧滚库存 + 累成本；物料无效 → 跳过库存滚算，
    //   但**仍按单据单价×数量累加成本**，让凭证照常生成（账实差异由调用方留痕提示）。
    const material = materialId
      ? await db
          .prepare(`SELECT id, current_stock, stock_value, moving_avg_price, standard_price, price FROM materials WHERE id = ? AND org_id = ?`)
          .bind(materialId, orgId)
          .first()
      : null;
    if (!material) {
      const docUnitPrice = Number(item.unitPrice) || 0;
      totalCost += roundAmount(qty * docUnitPrice);
      voucherIssues.push(
        `物料 ${item.materialCode || item.materialName || materialId || '未指定'} 在本组织不存在：库存未入账，凭证按单据金额 ${roundAmount(qty * docUnitPrice)} 记账。请先补建物料主数据后重新过账。`
      );
      continue;
    }

    // ★ V3.45.0 第3批：支持**指定成本价**（costPriceOverride）。
    //   用途：库存调拨。调拨是同一公司内存货的**位置转移**，成本不应变 ——
    //   若调入仓按自己的采购价/移动均价重新取值，同一物料在两个仓库会出现两个成本
    //   （成本漂移），调拨一批货反而会"改变"存货价值，属对标报告 S-05/S-18 的问题。
    //   对标 SAP：调拨（移动类型 301）按**调出仓成本**结转，不重新评估。
    //   不传该参数时行为与原先完全一致（取 getUnitCost）。
    const _override = Number((item as any).costPriceOverride) > 0 ? Number((item as any).costPriceOverride) : 0;
    const unitPrice = _override > 0 ? _override
      : (Number(item.unitPrice) > 0 ? Number(item.unitPrice) : getUnitCost(material));
    // ★ V3.62.0 边界⑤ W-A7：物料余额改为**相对原子更新**（current_stock = current_stock + ?），
    //   消除「SELECT 当前值 → 算绝对值 → UPDATE 绝对值」在并发请求下的丢更新窗口。
    //   原写法先读出 current_stock 再算新值写回：两个并发入库若读到同一旧值，
    //   后写的绝对值会覆盖先写、丢失其中一笔增量（D1 单写者串行、但读可被另一请求先改后读，仍存竞态）。
    //   相对 UPDATE 是单条 SQL 原子读改写，彻底消除该窗口；口径与 rollIn 完全一致
    //   （nextQty=q0+qi、nextValue=v0+qi*pi、movingAvg=(v0+qi*pi)/(q0+qi)）。
    const inValueDelta = roundAmount(qty * unitPrice);
    const materialStmt = db
      .prepare(
        `UPDATE materials
            SET current_stock = COALESCE(current_stock, 0) + ?,
                stock_value  = COALESCE(stock_value, 0) + ?,
                moving_avg_price = CASE WHEN (COALESCE(current_stock, 0) + ?) > 0
                                       THEN (COALESCE(stock_value, 0) + ?) / (COALESCE(current_stock, 0) + ?)
                                       ELSE 0 END,
                updated_at = ?, updated_by = ?
          WHERE id = ? AND org_id = ?`
      )
      .bind(qty, inValueDelta, qty, inValueDelta, qty, nowIso(), user.name, materialId, orgId);

    const locId = item.locationId || null;
    const existing = await findInvRow(db, orgId, materialId, order.warehouseId, locId);

    // ② 库存变动流水（余额可重建的底座，对标 SAP MATDOC）—— 未执行语句，随批次原子提交
    const txn = invTxnStatement(db, orgId, user, {
      materialId, materialCode: item.materialCode, materialName: item.materialName,
      warehouseId: order.warehouseId, warehouseName: order.warehouseName,
      locationId: locId, batchNo: item.batchNo, unit: item.unit,
      qtyDelta: qty, valueDelta: roundAmount(qty * unitPrice), unitCost: unitPrice,
      txnType: order.type === 'production' ? 'production'
        : order.type === 'transfer' ? 'transfer_in'
        : order.type === 'adjust_gain' ? 'adjust_gain'
        : 'inbound',
      docType: 'inbound_order', docNo: order.inboundNo || null, docId: order.id || null,
      docDate: order.inboundDate, remark: order.type || null,
    });

    // ③ 库存记录（余额快照）：有行累加、无行新建
    let invStmt: any;
    if (existing) {
      invStmt = db
        .prepare(
          `UPDATE inventory_records SET quantity = quantity + ?, available_quantity = available_quantity + ?, last_inbound_date = ?, updated_at = ? WHERE id = ?`
        )
        .bind(qty, qty, order.inboundDate, nowIso(), existing.id);
    } else {
      invStmt = db
        .prepare(
          `INSERT INTO inventory_records (id, org_id, material_id, material_code, material_name, warehouse_id, warehouse_name, location_id, location_name, quantity, available_quantity, frozen_quantity, unit, last_inbound_date, created_at, updated_at, dept_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
        )
        .bind(
          'inv-' + crypto.randomUUID(),
          orgId,
          materialId,
          item.materialCode || '',
          item.materialName || '',
          order.warehouseId,
          order.warehouseName,
          locId,
          item.locationName || null,
          qty,
          qty,
          item.unit || '',
          order.inboundDate,
          nowIso(),
          nowIso(),
          // ★ V3.61.0 W-F11：写部门，使 rls.ts 登记的 'dept' 范围真正生效
          //   （此前恒NULL → 登记形同虚设，实际退化为全组织可见）。
          //   口径与 inventory_transactions.dept_id 一致（同为 user.department）。
          order.deptId ?? (user as any)?.department ?? null
        );
    }

    // ★ 原子批次：物料余额 + 流水 + 库存记录要么全成、要么全回滚。
    //   任一条失败（含流水 INSERT）整批回滚，杜绝「余额变了没流水」的半状态（P0-3 根治）。
    try {
      await db.batch([materialStmt, txn.stmt, invStmt]);
    } catch (e: any) {
      console.error('[postInbound] 入库过账原子批次失败（已回滚，库存与流水均未变动）：', e?.message || e);
      // 向上抛，让端点的 inventory_posted 守卫保持 0（下次可重试），绝不把脏状态标成已 posting
      throw e;
    }
    totalCost += roundAmount(qty * unitPrice);
  }

  // ★ #7 服务端采购暂估 / 入库过账权威账本（2026-09-20 强哥拍板"服务端算账"）：
  //   入库过账时顺带生成业务凭证，金额用服务端反推的 totalCost，不再依赖前端物料主数据；
  //   绕开界面直接建单也会生成（闭合 #7"后端不复核"的漏洞）。
  //   幂等靠下方 generateInboundVouchers 内的 source_no 查重（已存在则跳过）。
  try {
    await generateInboundVouchers(db, orgId, user, order, totalCost);
  } catch (e: any) {
    // 凭证按 source_no 幂等查重（已生成过则跳过），失败后重新触发过账/手工补录可安全重试。
    console.error('[inbound-voucher] failed（已留痕回传，可重试补录）：', e?.message || e);
    voucherIssues.push(`入库凭证生成失败：${String(e?.message || e)}`);
  }

  // ★ 序列号自动驱动（V3.17.9 修复差距4）：
  //   入库过账时，为每个序列号在 serial_masters 创建或更新记录，并写入 serial_movements
  try {
    await handleSerialMovements(db, orgId, user, order, order.items || [], 'inbound');
  } catch (e) {
    console.warn('[serial-inbound] failed, non-fatal', e);
  }

  return { totalCost, voucherIssues };
}

/**
 * 出库过账：扣减库存（卡 0）+ 滚动物料成本（卡 0），返回带 unitCost/costAmount 的明细（供后续凭证用）
 */
export async function postOutbound(db: any, orgId: string, user: any, order: any): Promise<{ enrichedItems: any[]; serialIssues: SerialPostingIssue[]; voucherIssues: string[] }> {
  await assertPeriodOpen(db, orgId, order, '出库单');
  const enriched: any[] = [];
  // ★ R4 吞错留痕：出库凭证生成失败不阻断库存扣减，但失败原因必须回传（同 serialIssues 范式）。
  const voucherIssues: string[] = [];
  for (const item of order.items || []) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) {
      enriched.push(item);
      continue;
    }
    const materialId = item.materialId || null;
    const material = materialId
      ? await db
          .prepare(`SELECT id, current_stock, stock_value, moving_avg_price, standard_price, price, valuation_class FROM materials WHERE id = ? AND org_id = ?`)
          .bind(materialId, orgId)
          .first()
      : null;
    const unitCost = material ? (Number(material.moving_avg_price) > 0 ? Number(material.moving_avg_price) : getUnitCost(material)) : 0;
    const costAmount = roundAmount(qty * unitCost);

    // ★ V3.61.0 W-A8：物料在库中查不到时**不写流水**（此前余额不更新但流水恒写
    //   → inventory_transactions 与materials/inventory_records 反向不一致：
    //   流水能重建出余额、但余额表没动，对账作业会把差额判成「账实不符」却查不出原因）。
    //   改为：物料无效 → 跳过本行（与库存记录同口径：都写不了就不写），并把原因留痕回传。
    if (!material) {
      voucherIssues.push(
        `出库行「${item.materialCode || item.materialName || materialId || '?'}」：物料主数据不存在或不属于本组织，本行未过账（未扣库存、未写流水）`
      );
      enriched.push(item);
      continue;
    }

    // ★ V3.63.0 质量拦截：出库/领用前校验质量冻结 + 来料检不合格未闭环
    const _qbOut = await checkQualityBlocked(db, orgId, materialId, item.materialCode || item.materialName || materialId || '?', item.batchNo || '', { failedInspection: true });
    if (_qbOut) {
      voucherIssues.push(_qbOut);
      enriched.push(item);
      continue;
    }

    // P0-3：三条写库语句先构建、不立即执行，最后收进同一个 db.batch 原子提交。
    //   物料余额（有物料才滚）与库存记录（有行才扣）各自条件化，流水恒写。
    const batch: any[] = [];
    {
      // ★ V3.62.0 边界⑤ W-A7：出库余额改为**相对原子扣减**（MAX(0,...) 与 rollOut 钳制口径一致），
      //   同样消除「读-算-绝对值 SET」的并发丢更新窗口。出库不改变移动均价（= 单位成本），
      //   故此处不更新 moving_avg_price（与 rollOut 返回 movingAvgPrice=unitCost 的口径一致）。
      const outValueDelta = roundAmount(qty * unitCost);
      batch.push(
        db.prepare(
          `UPDATE materials
              SET current_stock = MAX(0, COALESCE(current_stock, 0) - ?),
                  stock_value  = MAX(0, COALESCE(stock_value, 0) - ?),
                  updated_at = ?, updated_by = ?
            WHERE id = ? AND org_id = ?`
        ).bind(qty, outValueDelta, nowIso(), user.name, materialId, orgId)
      );
    }

    // 库存变动流水（qty_delta 为负；记**真实出库量**，超发被 MAX(0,..) 吞掉的差额由此暴露）
    batch.push(
      invTxnStatement(db, orgId, user, {
        materialId, materialCode: item.materialCode, materialName: item.materialName,
        warehouseId: order.warehouseId, warehouseName: order.warehouseName,
        locationId: item.locationId || null, batchNo: item.batchNo, unit: item.unit,
        qtyDelta: -qty, valueDelta: -roundAmount(qty * unitCost), unitCost,
        txnType: order.type === 'pick' ? 'outbound'
          : order.type === 'scrap' ? 'scrap'
          : order.type === 'subcontract' ? 'transfer_out'
          : order.type === 'adjust_loss' ? 'adjust_loss'
          : order.type === 'transfer' ? 'transfer_out'
          : 'outbound',
        docType: 'outbound_order', docNo: order.outboundNo || null, docId: order.id || null,
        docDate: order.outboundDate, remark: order.type || null,
      }).stmt
    );

    // 扣减库存记录（超发：库存不足时只扣到 0，不出现负库存）—— 无行则不产生语句
    const locId = item.locationId || null;
    const existing = await findInvRow(db, orgId, materialId, order.warehouseId, locId);
    if (existing) {
      // ★ V3.113.3 P0-3：出库扣减必须尊重**冻结量**。
      //   可用量 = 现有量 − 冻结量。冻结部分（质量扣留中）不得出库，
      //   否则「判不合格的料照样能出库」——正是本条 P0 的原症状。
      //   判定：本次要出 qty，若现有可用量不足，则该行**不扣库存**并留痕，
      //   由调用方把 voucherIssues 回传给用户（不静默吞掉）。
      const availableNow = Number(existing.available_quantity) || 0;
      const frozenNow = Number(existing.frozen_quantity) || 0;
      if (availableNow < qty) {
        voucherIssues.push(
          `物料 ${item.materialCode || item.materialName || materialId} 可用量不足：` +
          `现有量 ${Number(existing.quantity) || 0}，冻结量 ${frozenNow}，` +
          `可用量 ${availableNow} < 本次出库 ${qty}${frozenNow > 0 ? '（其中冻结部分为质量扣留中物料，不可出库）' : ''}。本行未过账。`
        );
        continue;
      }
      batch.push(
        db.prepare(
          `UPDATE inventory_records SET quantity = MAX(0, quantity - ?), available_quantity = MAX(0, available_quantity - ?), last_outbound_date = ?, updated_at = ? WHERE id = ?`
        ).bind(qty, qty, order.outboundDate, nowIso(), existing.id)
      );
    }

    // ★ 原子批次：物料余额 + 流水 + 库存记录要么全成、要么全回滚（P0-3 根治半状态）
    try {
      await db.batch(batch);
    } catch (e: any) {
      console.error('[postOutbound] 出库过账原子批次失败（已回滚，库存与流水均未变动）：', e?.message || e);
      throw e;
    }
    enriched.push({ ...item, unitCost, costAmount, valuationClass: material ? material.valuation_class : undefined });
  }

  // ★ #6 服务端出库成本结转权威账本（2026-09-20 强哥拍板"服务端算账"）：
  //   出库过账时按服务端 unitCost×qty 生成 COGS 凭证，成本口径与库存扣减完全一致，
  //   绕开界面直接建单也会生成（闭合 #6"前端算、后端不复核"的漏洞）。
  try {
    await generateOutboundVouchers(db, orgId, user, order, enriched);
  } catch (e: any) {
    // 凭证按 source_no 幂等查重（已生成过则跳过），失败后重新触发过账/手工补录可安全重试。
    console.error('[outbound-voucher] failed（已留痕回传，可重试补录）：', e?.message || e);
    voucherIssues.push(`出库凭证生成失败：${String(e?.message || e)}`);
  }

  // ★ 序列号自动驱动（V3.17.9 修复差距4）：
  //   出库过账时，更新序列号状态并写入 serial_movements
  // ★ V3.47.0 3-05：序列号校验结果必须回传，不能只 console.warn
  //   库存已实动（不因序列号问题回滚），但用户必须知道哪些序列号没成功发货 ——
  //   否则台账与实物脱节却无人察觉（对标金蝶/用友：序列号不符会提示并要求处理）。
  const serialIssues: SerialPostingIssue[] = [];
  try {
    await handleSerialMovements(db, orgId, user, order, order.items || [], 'outbound', serialIssues);
  } catch (e) {
    console.warn('[serial-outbound] failed, non-fatal', e);
  }
  if (serialIssues.length > 0) {
    console.warn(`[serial-outbound] ${serialIssues.length} 个序列号未更新：`, serialIssues.map((i) => `${i.serialNo}(${i.reason})`).join('; '));
  }

  return { enrichedItems: enriched, serialIssues, voucherIssues };
}

/**
 * 处理序列号流转记录写入（V3.17.9 新增）
 * - 入库：为每个序列号创建或更新 serial_masters，写入 inbound movement
 * - 出库：校验「在库 + 同物料」后更新为 shipped，写入 outbound movement
 */
/**
 * ★ V3.47.0 3-05：序列号状态统一为前端 `SerialMaster['status']` 认得的枚举。
 *
 * 修之前的三个真缺陷（全在下面这段代码里）：
 *  ① **状态值分裂**：出库写 `'out_stock'`，但前端类型
 *     `status: 'in_stock' | 'shipped' | 'scrapped' | 'in_transit'` 里**根本没有
 *     'out_stock' 这个值**（也没搜到任何前端引用）⇒ 序列号出库后，
 *     前端按枚举取不到对应标签，状态列显示空白/走 else 分支。
 *     正确值是 `'shipped'`（已发货）。新建时写的 `'active'` 同样不在枚举内。
 *  ② **出库不校验当前状态**：已报废(scrapped)或已发货(shipped)的序列号
 *     还能被再次出库 ⇒ 一台设备可以"发货两次"，序列号台账与实物彻底脱节。
 *     对标 SAP 序列号管理：出库前必须校验「在库」状态。
 *  ③ **物料不匹配不校验**：同一序列号可挂在不同物料上（串号）。
 */
const SERIAL_STATUS = {
  inStock: 'in_stock',
  shipped: 'shipped',
  scrapped: 'scrapped',
  inTransit: 'in_transit',
} as const;

/** 出库允许的起始状态：在库 / 在途（在途到货未入库前不应出库，故只放行在库） */
const OUTBOUND_ALLOWED_FROM = new Set<string>([SERIAL_STATUS.inStock]);

/** 出库时若序列号状态不合法的处理结果（供调用方汇总并回报，不静默吞掉） */
export interface SerialPostingIssue {
  serialNo: string;
  reason: string;
  currentStatus: string;
}

async function handleSerialMovements(
  db: any,
  orgId: string,
  user: any,
  order: any,
  items: any[],
  type: 'inbound' | 'outbound',
  issues: SerialPostingIssue[] = []
): Promise<void> {
  const now = nowIso();
  const docNo = order.orderNo || order.inboundNo || order.outboundNo || '';

  for (const item of items) {
    const serialNosStr = item.serialNos;
    if (!serialNosStr) continue;

    let serialNos: string[] = [];
    try {
      serialNos = typeof serialNosStr === 'string' ? JSON.parse(serialNosStr) : serialNosStr;
    } catch {
      continue;
    }

    if (!Array.isArray(serialNos) || serialNos.length === 0) continue;

    const materialId = item.materialId;
    const materialName = item.materialName || '';

    for (const sn of serialNos) {
      if (!sn || typeof sn !== 'string') continue;

      // 查找或创建序列号主档
      const master = await db
        .prepare(`SELECT id, status, material_id FROM serial_masters WHERE org_id = ? AND serial_no = ? LIMIT 1`)
        .bind(orgId, sn)
        .first();

      if (!master) {
        // 创建新序列号主档
        const masterId = 'sm-' + crypto.randomUUID();
        // ★ 状态用统一枚举（原先写 'active'，不在前端类型枚举内）
        await db
          .prepare(`INSERT INTO serial_masters (id, org_id, serial_no, material_id, material_name, status, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(masterId, orgId, sn, materialId, materialName,
                type === 'inbound' ? SERIAL_STATUS.inStock : SERIAL_STATUS.shipped, now, now)
          .run();

        // 写入流转记录
        await insertSerialMovement(db, masterId, {
          type,
          docNo,
          date: now,
          status: type === 'inbound' ? SERIAL_STATUS.inStock : SERIAL_STATUS.shipped,
          note: type === 'inbound' ? '入库' : '出库',
        }, user, now);
      } else {
        // ★ 出库前校验：① 序列号必须在库；② 必须挂在同一物料下（防串号）
        //   校验失败**不抛异常中断整笔过账**（库存已实动），而是记入 issues 由
        //   调用方回报给用户 —— 静默跳过会让人以为序列号已发货。
        if (type === 'outbound') {
          const cur = String(master.status || '');
          if (!OUTBOUND_ALLOWED_FROM.has(cur)) {
            issues.push({
              serialNo: sn,
              reason: cur === SERIAL_STATUS.scrapped ? '序列号已报废，不能出库'
                : cur === SERIAL_STATUS.shipped ? '序列号已发货（可能重复出库）'
                : `序列号当前状态「${cur || '未知'}」不允许出库`,
              currentStatus: cur,
            });
            continue;
          }
          if (master.material_id && materialId && String(master.material_id) !== String(materialId)) {
            issues.push({
              serialNo: sn,
              reason: `序列号挂在物料 ${master.material_id}，与本行物料 ${materialId} 不一致（串号）`,
              currentStatus: cur,
            });
            continue;
          }
        }
        // 更新现有序列号主档
        const newStatus = type === 'inbound' ? SERIAL_STATUS.inStock : SERIAL_STATUS.shipped;
        await db
          .prepare(`UPDATE serial_masters SET status = ?, updated_at = ? WHERE id = ?`)
          .bind(newStatus, now, master.id)
          .run();

        // 写入流转记录
        await insertSerialMovement(db, master.id, {
          type,
          docNo,
          date: now,
          status: newStatus,
          note: type === 'inbound' ? '入库' : '出库',
        }, user, now);
      }
    }
  }
}

/**
 * 入库业务凭证（#7 服务端采购暂估 / 入库过账权威账本）
 * - purchase：借 1403 原材料 / 贷 2201 GR/IR暂估（金额 = 服务端 totalCost）
 * - subcontract：借 1405 库存商品（totalCost）/ 贷 1408 委托加工物资（materialCost）/
 *   贷 2201 GR/IR暂估（加工费 = totalCost − materialCost）
 *   —— #14（V3.17.6）按 order.subcontractMaterialCost 拆账：材料成本在发料时已转出至 1408，
 *      收货时应自 1408 结转；原实现「简化不拆分、全额挂 2201」会让 1408 永不结转、2201 虚挂材料成本。
 * - production：借 1405 库存商品 / 贷 5001 生产成本（cost = 服务端 totalCost，仅当 >0）
 * - return：销售退货红冲 —— 借 6001 收入 / 借 2221 销项 / 贷 1122 应收（V3.61.0 补，之前完全不写账）
 * - transfer 等：不挂暂估
 * 幂等：source_no 已存在对应凭证则跳过（防历史重复 / 重复过账）。
 */
async function generateInboundVouchers(
  db: any,
  orgId: string,
  user: any,
  order: any,
  totalCost: number
): Promise<void> {
  const sourceNo = order.inboundNo;
  if (!sourceNo || !totalCost || totalCost <= 0) return;

  const ex = await db
    .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source_no = ? AND source IN ('inventory', 'production') LIMIT 1`)
    .bind(orgId, sourceNo)
    .first();
  if (ex) return; // 已生成过，跳过

  const date = order.inboundDate;
  const period = (date || '').slice(0, 7);
  const items: any[] = [];
  let source = 'inventory';

  if (order.type === 'purchase') {
    items.push({ summary: `采购暂估入库 ${sourceNo}`, accountCode: '1403', accountName: '原材料', debit: totalCost, credit: 0 });
    items.push({ summary: `GR/IR暂估 ${order.vendorName || sourceNo}`, accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: 0, credit: totalCost });
  } else if (order.type === 'subcontract') {
    // ★ #14（V3.17.6）委外成本拆账：材料成本在发料时已由「委外发料」凭证转出到 1408 委托加工物资，
    //   收货入账时必须把它从 1408 结转掉，只有加工费部分才挂 GR/IR 暂估。原实现「简化不拆分、
    //   全额挂 2201」会让 1408 借方余额永远挂着、2201 虚挂材料成本，这正是「委外成本分配对不平」。
    //   借 1405 库存商品 = totalCost；贷 1408 委托加工物资 = materialCost；贷 2201 暂估 = 加工费。
    //   兼容：materialCost 缺失或为 0 时退化为全额挂 2201（与旧行为一致）；materialCost 超过 totalCost
    //   时钳制到 totalCost（避免贷方大于借方造成凭证不平）。
    const matCost = roundAmount(Math.min(Math.max(Number(order.subcontractMaterialCost) || 0, 0), totalCost));
    const feeCost = roundAmount(totalCost - matCost);
    items.push({ summary: `委外成品入库 ${sourceNo}`, accountCode: '1405', accountName: '库存商品', debit: totalCost, credit: 0 });
    if (matCost > 0) {
      items.push({ summary: `委外收料结转 ${sourceNo}`, accountCode: '1408', accountName: '委托加工物资', debit: 0, credit: matCost });
    }
    if (feeCost > 0) {
      items.push({ summary: `委外加工费暂估 ${order.vendorName || sourceNo}`, accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: 0, credit: feeCost });
    }
  } else if (order.type === 'production') {
    // ★ V3.61.0 W-C3：生产成本结转补全（此前只结转材料，人工永久挂账）
    //   缺陷：完工入库按「材料成本 totalCost」冲减 5001，而人工（借5001/贷2211，倒冲时已归集）
    //   与生产折旧（借5001）留在 5001 里永不结转 → 5001 期末长期挂账、成品成本系统性低估、
    //   毛利率虚高。对标金蝶/用友：完工入库应按「该工单归集的全部生产成本」结转。
    //   口径：材料 totalCost（倒冲/领料已归集到 5001）+ 工单 actual_labor_cost（人工归集额）。
    //   折旧与制造费用：work_orders 尚无对应字段（本轮诚实标注为遗留边界，见 MEMORY 待办）。
    const materialCost = roundAmount(order.totalCost || totalCost || 0);
    // 人工成本：倒冲时已写 work_orders.actual_labor_cost；缺失时按 0 计（不虚增）
    const laborCost = roundAmount(
      Number(order.laborCost ?? order.actualLaborCost ?? order.actual_labor_cost) || 0
    );
    // ★ V3.62.0 边界①：折旧与制造费用（工单 manual 录入，经 finished_goods_inbounds 完工入库带入；
    //   映射自 work_orders.depreciation_cost / overhead_cost）。缺失按 0 计（不虚增）。
    const depreciationCost = roundAmount(
      Number(order.depreciationCost ?? order.depreciation_cost) || 0
    );
    const overheadCost = roundAmount(
      Number(order.overheadCost ?? order.overhead_cost) || 0
    );
    const cost = roundAmount(materialCost + laborCost + depreciationCost + overheadCost);
    if (cost <= 0) return;
    items.push({ summary: `生产完工入库 ${sourceNo}`, accountCode: '1405', accountName: '库存商品', debit: cost, credit: 0 });
    items.push({
      summary: `结转生产成本（材料${materialCost} + 人工${laborCost} + 折旧${depreciationCost} + 制造费用${overheadCost}）${order.sourceNo || sourceNo}`,
      accountCode: '5001', accountName: '生产成本', debit: 0, credit: cost,
    });
    source = 'production';
  } else if (order.type === 'return') {
    // ★ V3.61.0 S-07：销售退货红冲凭证（此前完全没有账务红冲 —— 库存回增有、账不减）
    //   缺陷：前端 completeReturn 只造一张「红字入库单」（库存回增），
    //   而入库凭证里 return 分支直接 return 不写账 → 1405 库存回增了，
    //   6001 收入 / 2221 销项 / 1122 应收**一也不减**（红冲只写在前端内存模拟分录，
    //   不进权威vouchers）→ 退货越多、虚增的收入与应收越大，账龄与毛利率永久失真。
    //   现在按「红字」口径在服务端补齐权威凭证：
    //     借 6001 主营业务收入（净额，红字冲减）
    //     借 2221 应交税费—应交增值税（销项税额，红字冲减）
    //     贷 1122 应收账款（价税合计，红字冲减）
    //   库存侧由本入库单自身承担（入库即回增库存，与生产领料/销售出库同一条链路）。
    //   税额：优先取单据 taxAmount，退化用 totalCost × 税率（无则按 0，不虚增）。
    const gross = roundAmount(order.totalCost || totalCost || 0);
    if (gross <= 0) return;
    const taxAmt = roundAmount(
      Number(order.taxAmount ?? order.tax_amount) > 0
        ? Number(order.taxAmount ?? order.tax_amount)
        : gross * (Number(order.taxRate ?? order.tax_rate) || 0)
    );
    const net = roundAmount(gross - taxAmt);
    if (taxAmt > 0) {
      items.push({ summary: `销售退货冲减销项税额 ${sourceNo}`, accountCode: '2221', accountName: '应交税费—应交增值税（销项税额）', debit: taxAmt, credit: 0 });
    }
    if (net > 0) {
      items.push({ summary: `销售退货冲减收入 ${sourceNo}`, accountCode: '6001', accountName: '主营业务收入', debit: net, credit: 0 });
    }
    items.push({ summary: `销售退货冲减应收 ${sourceNo}`, accountCode: '1122', accountName: '应收账款', debit: 0, credit: gross });
    source = 'sales_return';
  } else {
    return; // transfer 不挂暂估
  }

  const totalDebit = roundAmount(items.reduce((s: number, it: any) => s + (it.debit || 0), 0));
  const totalCredit = roundAmount(items.reduce((s: number, it: any) => s + (it.credit || 0), 0));
  await writeVoucher(db, orgId, user, {
    voucherNo: `INV-${sourceNo}`,
    voucherType: '转',
    date,
    period,
    description: `入库业务凭证 ${sourceNo}`,
    source,
    sourceNo,
    status: 'posted',
    totalDebit,
    totalCredit,
    items,
  });
}

/**
 * 出库业务凭证（#6 服务端成本结转权威账本）
 * - subcontract 发料：借 1408 委托加工物资 / 贷 1403 原材料
 * - pick 生产领料：借 5001 生产成本 / 贷 1403 原材料
 * - scrap 报废：借 6602 管理费用 / 贷 1403（RAW）或 1405（其他评估类）
 * - sale / other：借 6401 主营业务成本 / 贷 1405 库存商品
 * 金额 = 服务端 unitCost × qty（enrichedItems 已带 unitCost / costAmount / valuationClass）。
 * 幂等：source_no 已存在对应凭证则跳过。
 */
async function generateOutboundVouchers(
  db: any,
  orgId: string,
  user: any,
  order: any,
  enrichedItems: any[]
): Promise<void> {
  const sourceNo = order.outboundNo;
  if (!sourceNo) return;

  const ex = await db
    .prepare(`SELECT id FROM vouchers WHERE org_id = ? AND source_no = ? AND source IN ('inventory', 'scrap') LIMIT 1`)
    .bind(orgId, sourceNo)
    .first();
  if (ex) return; // 已生成过，跳过

  const items: any[] = [];
  for (const it of enrichedItems || []) {
    const qty = Number(it.quantity) || 0;
    if (qty <= 0) continue;
    const cost = roundAmount(it.costAmount || 0);
    if (cost <= 0) continue;
    const name = it.materialName || '';
    if (order.type === 'subcontract') {
      items.push({ summary: `委外发料转出 ${name}`, accountCode: '1408', accountName: '委托加工物资', debit: cost, credit: 0 });
      items.push({ summary: `原材料发出（委外）${name}`, accountCode: '1403', accountName: '原材料', debit: 0, credit: cost });
    } else if (order.type === 'pick') {
      items.push({ summary: `生产领料结转 ${name}`, accountCode: '5001', accountName: '生产成本', debit: cost, credit: 0 });
      items.push({ summary: `原材料出库 ${name}`, accountCode: '1403', accountName: '原材料', debit: 0, credit: cost });
    } else if (order.type === 'scrap') {
      const creditCode = it.valuationClass === 'RAW' ? '1403' : '1405';
      const creditName = it.valuationClass === 'RAW' ? '原材料' : '库存商品';
      items.push({ summary: `不合格品报废损失 ${name}`, accountCode: '6602', accountName: '管理费用', debit: cost, credit: 0 });
      items.push({ summary: `存货报废转出 ${name}`, accountCode: creditCode, accountName: creditName, debit: 0, credit: cost });
    } else if (order.type === 'transfer') {
      // ★ V3.60.0 修复 P1-1：库存调拨是同一公司内存货位置移动，成本不变
      //   （调出仓成本经 postInbound 的 costPriceOverride 结转，见文件头说明），
      //   不产生损益影响，故不生成销售成本凭证。原实现漏掉该分支，调拨被错记
      //   主营业务成本（借6401/贷1405），虚增成本、虚减存货价值。此处直接跳过。
      continue;
    } else {
      items.push({ summary: `销售出库结转成本 ${name}`, accountCode: '6401', accountName: '主营业务成本', debit: cost, credit: 0 });
      items.push({ summary: `库存商品出库 ${name}`, accountCode: '1405', accountName: '库存商品', debit: 0, credit: cost });
    }
  }
  if (items.length === 0) return;

  const totalDebit = roundAmount(items.reduce((s: number, it: any) => s + (it.debit || 0), 0));
  const totalCredit = roundAmount(items.reduce((s: number, it: any) => s + (it.credit || 0), 0));
  const date = order.outboundDate;
  const period = (date || '').slice(0, 7);
  const source = order.type === 'scrap' ? 'scrap' : 'inventory';
  await writeVoucher(db, orgId, user, {
    voucherNo: `OUT-${sourceNo}`,
    voucherType: '转',
    date,
    period,
    description: `出库成本结转 ${sourceNo}`,
    source,
    sourceNo,
    status: 'posted',
    totalDebit,
    totalCredit,
    items,
  });
}

/**
 * ★ V3.61.0 S-08：出库过账后把**服务端算出的真实成本**回写明细行
 *
 * 缺陷背景：postOutbound 返回的 enrichedItems 已带服务端口径的
 *   unitCost（移动均价/标准价）与 costAmount，但出库单端点从未接收该返回值，
 *   outbound_order_items 的 unit_cost / cost_amount 建单时写死 0 且**永不再更新**
 *   → 单据上的成本列恒为 0，只有凭证里有成本。
 *   后果：① 界面出库单看不到成本（用户以为没算成本）；
 *        ② 任何按单据成本做的报表/对账口径全错；
 *        ③ 单据与凭证两套成本口径，审计无法追溯。
 *
 * 口径一致性：写入的值就是生成 COGS 凭证（6401/1405）用的那一组，
 *   因此「单据成本」与「凭证成本」天然相等，不引入第二套算法。
 *
 * @param db     D1 句柄
 * @param orderId 出库单 id（outbound_orders.id）
 * @param enrichedItems postOutbound 返回的 enrichedItems
 * @returns成功回写的行数（失败不抛出，由调用方按「非阻断」处理）
 */
export async function writeBackOutboundItemCost(
  db: any,
  orderId: string,
  enrichedItems: any[]
): Promise<number> {
  if (!Array.isArray(enrichedItems) || enrichedItems.length === 0) return 0;
  let n = 0;
  for (const it of enrichedItems) {
    // 行锚点：明细有 id 用 id；否则按物料编码 + 数量在本单内定位（同一物料可能多行）
    const lineId = it?.id || null;
    const code = it?.materialCode || it?.material_code || null;
    const cost = Number(it?.costAmount || 0);
    const price = Number(it?.unitCost || 0);
    try {
      if (lineId) {
        const r = await db
          .prepare(`UPDATE outbound_order_items SET unit_cost = ?, cost_amount = ? WHERE id = ? AND outbound_order_id = ?`)
          .bind(price, cost, lineId, orderId)
          .run();
        if (((r as any)?.meta?.changes ?? 0) > 0) { n++; continue; }
      }
      if (code) {
        // 无行 id 时按物料编码批量更新本单内该物料的行（数量为 0 的占位行也会被更新，符合预期）
        const r = await db
          .prepare(`UPDATE outbound_order_items SET unit_cost = ?, cost_amount = ? WHERE outbound_order_id = ? AND UPPER(COALESCE(material_code, '')) = UPPER(?)`)
          .bind(price, cost, orderId, code)
          .run();
        n += ((r as any)?.meta?.changes ?? 0);
      }
    } catch (e) {
      // 非阻断：成本回写失败不能推翻已完成的库存过账；但必须留痕（铁律㊴）
      console.error('[outbound-cost-writeback] 回写出库明细成本失败', orderId, (e as any)?.message || e);
    }
  }
  return n;
}
