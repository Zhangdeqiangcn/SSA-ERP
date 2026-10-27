import type { Material } from '@/types/material';
import type { QualityHold } from '@/types/supplyChain';
import type { InventoryRecord } from '@/types/warehouse';

/**
 * ★ V3.47.0 第3批 3-04：唯一的「可供应量」口径（MRP / ATP / 缺料预警共用）
 *
 * ── 为什么必须统一（这是此前真实存在的数据准确性缺陷）──────────────
 * 同一个物料的「现在有多少能用」，项目里有两个算法：
 *   ATP 页（`utils/atp.ts`）：onHand = 库存数量 − **质量扣留量**（扣了冻结）
 *   MRP 页（`MRPPlan.tsx`）：onHand = `material.currentStock`（**没扣冻结**）
 *   缺料预警（WorkOrderDetail）：又按 BOM 逐层用 `material.currentStock`（也没扣）
 *
 * 于是：同一物料，ATP 说「可用 80」、MRP 说「可用 100」，两边都能显示一个
 * 看似合理的数字，而**质量扣留中的那 20 件在 MRP 与缺料预警里被当成了可用库存**
 * → 计划员看着"够用"，下达工单后领料却领不到（对标 SAP 的 ATP 明确要扣
 * 质量/检验/冻结库存；金蝶/用友亦然）。
 *
 * ── 统一后的口径（唯一真相）────────────────────────────────────
 *   在库量(quantity)      = 各仓库存记录之和（真相来源，与流水可对账）
 *   扣留量(holdQty)       = 该物料在「生效中的质量扣留单」上的数量之和
 *                          ★ 只扣 status ∈ {open, inspecting}；released/closed 已放行
 *   可用量(availableQty)  = max(0, 在库量 − 扣留量)
 *   可承诺量(atp)         = max(0, 可用量 − 未发运销售订单承诺量)   ← ATP 专有，MRP 不扣
 *                            MRP 净需求只用「可用量」，不扣销售承诺 ——
 *                            因为 MRP 算的是"要生产/采购多少"，
 *                            销售承诺由销售订单/MRP 需求侧本身承载（对标 SAP MRP 元素）。
 *
 * 之所以把「可承诺量」与「可用量」分开而不是合成一个：
 * 二者服务不同决策。销售问"还能承诺多少"用 ATP（含扣承诺）；
 * 计划问"要备多少料"用可用量。若把承诺量也扣进 MRP，
 * 同一份库存被扣两次，计划员会虚假地认为缺料更严重而多采购。
 */

export interface SupplyInput {
  /** 物料主数据（取 currentStock 作兜底，仅当没有任何库存记录时用） */
  material?: Pick<Material, 'id' | 'currentStock'> | null;
  /** 库存记录（真相来源：各仓 quantity 之和） */
  inventoryRecords?: InventoryRecord[] | null;
  /** 生效中的质量扣留单 */
  qualityHolds?: QualityHold[] | null;
}

export interface SupplyResult {
  /** 在库量（未扣留） */
  onHand: number;
  /** 质量扣留量（只有 open/inspecting 计入） */
  holdQty: number;
  /** 可用量 = 在库 − 扣留（MRP / 缺料预警用这个） */
  availableQty: number;
  /** 数据来源说明，便于界面诚实展示口径 */
  source: 'inventory_records' | 'material_stock';
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * 占用可用量的扣留状态。
 *
 * ★ V3.113.3 P0-3：统一状态词表。
 *   此前前端用 { pending, passed, rejected }、后端 D1 用 { pending, active, released }，
 *   两套名字导致两处都错：
 *     · 前端 `status !== 'passed'` → 后端写入的 'released'（已放行）被当成「仍在扣留」
 *       → 物料被永久锁死，可用量回不来；
 *     · 后端只认 { pending, active } → 前端的 'passed'（已放行）不触发冻结回冲
 *       → 冻结量只增不减。
 *
 *   语义边界（重要）：**判定不合格 ≠ 已处理**。
 *     · released / passed —— 已放行，可用量释放；
 *     · rejected —— 判定不合格但**尚未处置**（还没报废/返工/退货），实物仍占库、仍不可用
 *       → 继续占用可用量。
 *     · pending / active / open / inspecting —— 扣留生效中，占用。
 */
export const isHoldActive = (h: { status?: string } | null | undefined): boolean => {
  if (!h) return false;
  const s = String(h.status || '').trim().toLowerCase();
  if (!s) return true; // 状态缺失 → 保守按占用处理（宁可少算可用，不可多算）
  // 已放行 → 释放
  if (s === 'released' || s === 'passed') return false;
  // 其余（pending / active / open / inspecting / rejected / 未知值）→ 占用
  return true;
};

/**
 * 计算物料的供应量（MRP / ATP / 缺料预警的唯一口径）
 *
 * @param input 物料主数据 + 库存记录 + 质量扣留单
 * @returns 在库量 / 扣留量 / 可用量 / 数据来源
 */
export function computeSupply(input: SupplyInput): SupplyResult {
  const recs = Array.isArray(input.inventoryRecords) ? input.inventoryRecords : [];
  const matId = input.material?.id;

  // 优先用库存记录之和（可与流水台账对账）；没有任何记录时才退回物料主数据快照
  const mine = matId ? recs.filter((r) => String((r as any).materialId ?? (r as any).material_id ?? '') === String(matId)) : [];
  const fromRecords = mine.length > 0;
  const onHand = fromRecords
    ? round2(mine.reduce((s, r) => s + num((r as any).quantity), 0))
    : round2(num(input.material?.currentStock));

  // ★ V3.113.3 P0-3：冻结量优先取**库存台账的 frozen_quantity**（与后端同源，权威），
  //   无台账数据时才退回前端扣留单数组重算。
  //   为什么优先台账：后端 P0-3 已把冻结量落到 inventory_records.frozen_quantity，
  //   出库校验也用这一列。若前端仍用「本地扣留数组」另算一套，两边迟早漂移
  //   （实测旧版正是这样：ATP 扣了、库存台账显示 0）。
  const ledgerFrozen = fromRecords
    ? round2(mine.reduce((s, r) => s + num((r as any).frozenQuantity ?? (r as any).frozen_quantity), 0))
    : 0;

  const holds = Array.isArray(input.qualityHolds) ? input.qualityHolds : [];
  const arrFrozen = round2(
    holds
      .filter((h) => isHoldActive(h as any))
      .filter((h) => !matId || String((h as any).materialId ?? (h as any).material_id ?? '') === String(matId))
      .reduce((s, h) => {
        // 质量扣留可能是"按行记录"（含 quantity）或"整单"（无行，取 holdQty）
        const q = num((h as any).quantity);
        return s + (q > 0 ? q : num((h as any).holdQty));
      }, 0)
  );

  // 台账冻结量与扣留单数组取**较大者**：任一来源显示有扣留，都不能当作可用
  // （取小者会让已冻结的料在 ATP 里显示为可用 → 计划员误判 → 领料时才被拒）
  const holdQty = fromRecords ? round2(Math.max(ledgerFrozen, arrFrozen)) : arrFrozen;

  return {
    onHand,
    holdQty,
    availableQty: round2(Math.max(0, onHand - holdQty)),
    source: fromRecords ? 'inventory_records' : 'material_stock',
  };
}

/**
 * 可承诺量（ATP 专有）：可用量 − 未发运销售订单承诺量
 *
 * 单独成函数而不是塞进 computeSupply：MRP 不该扣销售承诺（同一份库存被扣两次
 * 会让计划员虚假地认为缺料更严重），两种决策必须能用不同口径。
 */
export function computeATP(input: SupplyInput & { committedQty?: number }): SupplyResult & { committedQty: number; atpQty: number } {
  const supply = computeSupply(input);
  const committedQty = round2(Math.max(0, num(input.committedQty)));
  return { ...supply, committedQty, atpQty: round2(Math.max(0, supply.availableQty - committedQty)) };
}

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;
