import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { InboundOrder, OutboundOrder, OutboundOrderItem, CheckTask, CheckTaskItem, InventoryRecord, InventoryAlert, BatchRecord, PurchaseOrderStatus, SalesOrderStatus, VoucherItem } from '@/types';
import { snakeToCamel } from '@/utils/case';
import {
  inboundOrders as mockInboundOrders,
  outboundOrders as mockOutboundOrders,
  checkTasks as mockCheckTasks,
  inventoryRecords as mockInventoryRecords,
  inventoryAlerts as mockInventoryAlerts,
  batchRecords as mockBatchRecords,
} from '@/mocks/data/warehouse';
import { FinishedGoodsInbound } from '@/types';
import { finishedGoodsInbounds as mockFinishedGoodsInbounds } from '@/mocks/data/flowData';
// 跨模块回写：通过 getState() 读取，避免顶层循环依赖
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useSalesStore } from '@/stores/salesStore';
import { useOrgStore } from '@/stores/orgStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useVendorStore } from '@/stores/vendorStore';
import { rollInMovingAverage, getUnitCost, getStockValue, roundAmount } from '@/utils/cost';
import { b2Api, isAuthed } from '@/services/b2Api';
import { entityRepo } from '@/services/entityRepo';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// ── B2 双写：出库单 / 入库单 落 D1 的字段映射（严格照后端字段调用）────────
// 用显式映射而非整体展开，避免把本地私有字段（inventoryPosted/cogsPosted 等）误传后端。
const toOutboundPayload = (o: OutboundOrder): Record<string, unknown> => ({
  outboundNo: o.outboundNo,
  type: o.type,
  sourceNo: o.sourceNo,
  customerId: o.customerId,
  customerName: o.customerName,
  vendorId: o.vendorId,
  vendorName: o.vendorName,
  status: o.status,
  warehouseId: o.warehouseId,
  warehouseName: o.warehouseName,
  operator: o.operator,
  outboundDate: o.outboundDate,
  remarks: o.remarks,
  picker: o.picker,
  inventoryPosted: o.inventoryPosted,
  cogsPosted: o.cogsPosted,
  items: (o.items || []).map((it) => ({
    materialId: it.materialId,
    materialCode: it.materialCode,
    materialName: it.materialName,
    specification: it.specification,
    unit: it.unit,
    quantity: it.quantity,
    batchNo: it.batchNo,
    locationId: it.locationId,
    locationName: it.locationName,
    unitCost: it.unitCost,
    costAmount: it.costAmount,
    serialNos: it.serialNos,
    huId: it.huId,
  })),
});

const toInboundPayload = (o: InboundOrder): Record<string, unknown> => ({
  inboundNo: o.inboundNo,
  type: o.type,
  sourceNo: o.sourceNo,
  vendorId: o.vendorId,
  vendorName: o.vendorName,
  status: o.status,
  warehouseId: o.warehouseId,
  warehouseName: o.warehouseName,
  operator: o.operator,
  inboundDate: o.inboundDate,
  remarks: o.remarks,
  asnShipmentNo: o.asnShipmentNo,
  totalCost: o.totalCost,
  subcontractMaterialCost: o.subcontractMaterialCost,
  inventoryPosted: o.inventoryPosted,
  costPosted: o.costPosted,
  items: (o.items || []).map((it) => ({
    materialId: it.materialId,
    materialCode: it.materialCode,
    materialName: it.materialName,
    specification: it.specification,
    unit: it.unit,
    expectedQuantity: it.expectedQuantity,
    actualQuantity: it.actualQuantity,
    batchNo: it.batchNo,
    locationId: it.locationId,
    locationName: it.locationName,
    qualityStatus: it.qualityStatus,
    unitPrice: it.unitPrice,
    amount: it.amount,
    serialNos: it.serialNos,
    huId: it.huId,
    productionDate: it.productionDate,
    expiryDate: it.expiryDate,
    // ★ V3.61.0 P0-3：行锚点必须上送，否则行级三单比对键不相等 → 付款闸门全量拦截
    orderItemId: it.orderItemId,
  })),
});

// ── 事件驱动：入库/出库自动过账库存（纯函数，便于单测与复用）────────
// 入库：按 物料+仓库+库位 聚合库存；带批次号的行同步 upsert 批次记录（P2-2 批次）
const postInboundToInventory = (
  records: InventoryRecord[],
  batches: BatchRecord[],
  order: InboundOrder
): { inventoryRecords: InventoryRecord[]; batchRecords: BatchRecord[] } => {
  let next = [...records];
  let nextBatches = [...batches];
  for (const item of order.items) {
    const qty = item.actualQuantity || item.expectedQuantity || 0;
    if (qty <= 0) continue;
    const idx = next.findIndex(
      (r) =>
        r.materialId === item.materialId &&
        r.warehouseId === order.warehouseId &&
        (item.locationId ? r.locationId === item.locationId : true)
    );
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        quantity: next[idx].quantity + qty,
        availableQuantity: next[idx].availableQuantity + qty,
        lastInboundDate: order.inboundDate,
      };
    } else {
      next.push({
        id: `inv-${item.materialId}-${order.warehouseId}-${item.locationId || 'default'}`,
        materialId: item.materialId,
        materialCode: item.materialCode || '',
        materialName: item.materialName || '',
        specification: item.specification,
        warehouseId: order.warehouseId,
        warehouseName: order.warehouseName,
        locationId: item.locationId,
        locationName: item.locationName,
        orgId: order.orgId,
        quantity: qty,
        availableQuantity: qty,
        frozenQuantity: 0,
        unit: item.unit || '',
        lastInboundDate: order.inboundDate,
      });
    }
    // 批次过账：带批次号的入库行自动维护批次库存
    if (item.batchNo) {
      const bidx = nextBatches.findIndex(
        (b) => b.batchNo === item.batchNo && b.materialCode === (item.materialCode || '') && b.warehouseId === order.warehouseId
      );
      if (bidx >= 0) {
        const merged = Math.max(0, nextBatches[bidx].quantity + qty);
        // V3.66.0 P0-5：批次成本快照（入库单价×本次数量，累加到批次累计成本）
        const lineCost = typeof item.unitPrice === 'number' ? item.unitPrice * qty : 0;
        nextBatches[bidx] = {
          ...nextBatches[bidx],
          quantity: merged,
          materialId: nextBatches[bidx].materialId || item.materialId,
          locationId: nextBatches[bidx].locationId || item.locationId,
          orgId: nextBatches[bidx].orgId || order.orgId,
          inboundDate: order.inboundDate,
          inboundNo: order.inboundNo,
          supplierName: nextBatches[bidx].supplierName || order.vendorName,
          status: nextBatches[bidx].status === 'expired' ? 'expired' : 'normal',
          cost: (nextBatches[bidx].cost || 0) + lineCost,
        };
      } else {
        nextBatches.push({
          id: `bat-${item.batchNo}-${item.materialCode}-${order.warehouseId}`,
          batchNo: item.batchNo,
          materialId: item.materialId,
          materialCode: item.materialCode || '',
          materialName: item.materialName || '',
          warehouseId: order.warehouseId,
          warehouseName: order.warehouseName,
          locationId: item.locationId,
          orgId: order.orgId,
          quantity: qty,
          // V3.66.0 P0-5：批次成本快照（入库单价×数量，财务批次级对账口径）
          cost: typeof item.unitPrice === 'number' ? item.unitPrice * qty : 0,
          productionDate: undefined,
          expiryDate: undefined,
          inboundNo: order.inboundNo,
          inboundDate: order.inboundDate,
          supplierName: order.vendorName,
          status: 'normal',
        });
      }
    }
  }
  return { inventoryRecords: next, batchRecords: nextBatches };
};

// 出库：库存聚合扣减（保持原有逻辑始终扣减，保证非批次库存一致性）
// + 批次 FIFO 消耗（P2-2）：按入库日期升序优先消耗最早批次，指定 batchNo 优先
const postOutboundToInventory = (
  records: InventoryRecord[],
  batches: BatchRecord[],
  order: OutboundOrder
): { inventoryRecords: InventoryRecord[]; batchRecords: BatchRecord[] } => {
  let next = [...records];
  let nextBatches = [...batches];

  for (const item of order.items) {
    const qty = item.quantity || 0;
    if (qty <= 0) continue;
    // 1) 库存聚合扣减
    const idx = next.findIndex(
      (r) =>
        r.materialId === item.materialId &&
        r.warehouseId === order.warehouseId &&
        (item.locationId ? r.locationId === item.locationId : true)
    );
    if (idx >= 0) {
      const dec = Math.min(next[idx].quantity, qty);
      next[idx] = {
        ...next[idx],
        quantity: next[idx].quantity - dec,
        availableQuantity: Math.max(0, next[idx].availableQuantity - dec),
        lastOutboundDate: order.outboundDate,
      };
    }
    // 2) 批次 FIFO 消耗
    let needed = qty;
    const candIdx = nextBatches
      .map((b, i) => ({ b, i }))
      .filter(
        ({ b }) =>
          (b.materialCode === (item.materialCode || '') || b.materialId === item.materialId) &&
          b.warehouseId === order.warehouseId &&
          (item.locationId ? (!b.locationId || b.locationId === item.locationId) : true) &&
          !b.locked &&
          b.quantity > 0
      )
      .sort((x, y) => {
        if (item.batchNo) {
          if (x.b.batchNo === item.batchNo) return -1;
          if (y.b.batchNo === item.batchNo) return 1;
        }
        const da = x.b.inboundDate || '';
        const db = y.b.inboundDate || '';
        if (da !== db) return da < db ? -1 : 1;
        const pa = x.b.productionDate || '';
        const pb = y.b.productionDate || '';
        return pa < pb ? -1 : 1;
      });
    for (const { i } of candIdx) {
      if (needed <= 0) break;
      const take = Math.min(nextBatches[i].quantity, needed);
      // V3.67.0 立项②：批次成本同步结转（批次级移动平均单价 = 累计成本 ÷ 现存量，
      // 与库存侧 COGS 移动平均价口径同源；扣完的批次成本归零，批次级对账不再半通）
      const before = nextBatches[i];
      const unitCost = before.quantity > 0 ? (before.cost || 0) / before.quantity : 0;
      const costOut = before.quantity === take ? (before.cost || 0) : unitCost * take;
      nextBatches[i] = {
        ...before,
        quantity: before.quantity - take,
        cost: Math.max(0, (before.cost || 0) - costOut),
      };
      needed -= take;
    }
  }
  return { inventoryRecords: next, batchRecords: nextBatches };
};

// ── 收货/发货回写：过账库存后联动采购/销售订单 ────────────────
// 采购收货回写：采购入库单(sourceNo=PO单号)完成后，累加 PO 行已交数量并推进状态
const writeBackPurchaseReceipt = (order: InboundOrder): void => {
  if (order.type !== 'purchase' || !order.sourceNo) return;
  const poStore = usePurchaseStore.getState();
  const po = poStore.purchaseOrders.find((o) => o.orderNo === order.sourceNo);
  if (!po) return;

  const receivedByMaterial = new Map<string, number>();
  for (const item of order.items) {
    const qty = item.actualQuantity || item.expectedQuantity || 0;
    if (qty <= 0) continue;
    receivedByMaterial.set(item.materialId, (receivedByMaterial.get(item.materialId) || 0) + qty);
  }
  if (receivedByMaterial.size === 0) return;

  const newLines = po.items.map((line) => {
    const received = receivedByMaterial.get(line.materialId);
    if (!received) return line;
    return { ...line, deliveredQuantity: (line.deliveredQuantity || 0) + received };
  });
  const totalDelivered = newLines.reduce((s, l) => s + (l.deliveredQuantity || 0), 0);
  const allDelivered =
    newLines.length > 0 && newLines.every((l) => (l.deliveredQuantity || 0) >= (l.orderedQuantity || 0));
  const anyDelivered = totalDelivered > 0;
  const nextStatus: PurchaseOrderStatus = allDelivered
    ? 'received'
    : anyDelivered
      ? 'partial'
      : po.status;

  // ── B1 信用卡点：收货按交货进度释放供应商信用额度（幂等：以 creditReleasedAmount 为水位）──
  const creditAmt = po.creditAmount ?? po.grandTotal ?? po.totalAmount ?? 0;
  const alreadyReleased = po.creditReleasedAmount ?? 0;
  let releasedAmount = alreadyReleased;
  let creditOccupied = po.creditOccupied;
  if (po.creditOccupied && creditAmt > 0) {
    const totalLineValue = newLines.reduce((s, l) => s + (l.amountWithTax ?? l.amount ?? 0), 0);
    const deliveredValue = newLines.reduce((s, l) => {
      const oq = l.orderedQuantity || 0;
      if (oq <= 0) return s;
      const ratio = Math.min(1, (l.deliveredQuantity || 0) / oq);
      return s + ratio * (l.amountWithTax ?? l.amount ?? 0);
    }, 0);
    const targetReleased = allDelivered
      ? creditAmt
      : totalLineValue > 0
        ? Math.min(creditAmt, roundAmount((deliveredValue / totalLineValue) * creditAmt))
        : alreadyReleased;
    const delta = roundAmount(targetReleased - alreadyReleased);
    if (delta > 0.005) {
      useVendorStore.getState().applyVendorCreditDelta(po.vendorId, -delta);
      releasedAmount = roundAmount(alreadyReleased + delta);
    }
    if (allDelivered) creditOccupied = false;
  }

  poStore.updatePurchaseOrder(po.id, {
    items: newLines,
    deliveredQuantity: totalDelivered,
    status: nextStatus,
    actualDeliveryDate: po.actualDeliveryDate || order.inboundDate,
    creditReleasedAmount: releasedAmount,
    creditOccupied,
  });
};

// 销售发货回写：销售出库单(sourceNo=SO单号)完成后，累加 SO 行已发数量并推进状态
const writeBackSalesShipment = (order: OutboundOrder): void => {
  if (order.type !== 'sale' || !order.sourceNo) return;
  const soStore = useSalesStore.getState();
  const so = soStore.salesOrders.find((o) => o.orderNo === order.sourceNo);
  if (!so) return;

  const shippedByMaterial = new Map<string, number>();
  for (const item of order.items) {
    const qty = item.quantity || 0;
    if (qty <= 0) continue;
    shippedByMaterial.set(item.materialId, (shippedByMaterial.get(item.materialId) || 0) + qty);
  }
  if (shippedByMaterial.size === 0) return;

  const newLines = so.items.map((line) => {
    const shipped = shippedByMaterial.get(line.materialId);
    if (!shipped) return line;
    return { ...line, deliveredQuantity: (line.deliveredQuantity || 0) + shipped };
  });
  const totalDelivered = newLines.reduce((s, l) => s + (l.deliveredQuantity || 0), 0);
  const allDelivered =
    newLines.length > 0 && newLines.every((l) => (l.deliveredQuantity || 0) >= (l.quantity || 0));
  const anyDelivered = totalDelivered > 0;
  const nextStatus: SalesOrderStatus = allDelivered
    ? 'completed'
    : anyDelivered
      ? 'partial_shipped'
      : so.status;

  soStore.updateSalesOrder(so.id, {
    items: newLines,
    deliveredQuantity: totalDelivered,
    status: nextStatus,
    actualDeliveryDate: so.actualDeliveryDate || order.outboundDate,
  });
};


// ── A4-② 出库 COGS 凭证 ───────────────────────────────────────
// 出库过账时，按当前移动平均价结转成本：单价不变，只减库存数量与金额，
// 并自动生成凭证（借 6401 主营业务成本/5001 生产成本，贷 1405 库存商品/1403 原材料）。
// 返回回写后的出库行（带 unitCost / costAmount 快照），供入库单持久化留痕。
// ── A4-② 出库 COGS 凭证（前端去双写）───────────────────────────────
// 出库过账时的成本结转凭证改由服务端 inventoryPosting 在出库过账时权威生成
//   （generateOutboundVouchers：按类型借 1408 委托加工物资 / 5001 生产成本 / 6602 管理费用 / 6401 主营业务成本，
//    贷 1403 原材料 / 1405 库存商品）。此处不再调 createVoucher，避免与后端重复生成同源凭证。
// 仅保留 unitCost / costAmount 快照，供出库单 items 持久化留痕（服务端凭证以 D1 权威移动加权平均成本为准）。
const postOutboundCost = (order: OutboundOrder): OutboundOrderItem[] => {
  if (!order.items || order.items.length === 0) return order.items;
  const materialStore = useMaterialStore.getState();
  const enriched = order.items.map((item) => {
    const qty = item.quantity || 0;
    if (qty <= 0) return item;
    const material = materialStore.materials.find((m) => m.id === item.materialId);
    if (!material) return item;
    // 结转单价 = 当前移动平均价（未税，4 位精度）；兜底物料现行成本
    const unitCost = getUnitCost(material);
    const costAmount = roundAmount(qty * unitCost);
    return { ...item, unitCost, costAmount };
  });
  return enriched;
};

// ── W1 仓库战役：inbound/outbound 直连真实 D1 的工具函数（根治 Blob 双通道）────────
const WAREHOUSE_BACKFILL_FLAG = 'ssa-erp-warehouse-backfilled';
const CHECKTASK_BACKFILL_FLAG = 'ssa-erp-checktasks-backfilled';
// V2.82.0 库存预警/产成品入库迁 D1 回填守卫（防重复回填生产库）
const ALERT_BACKFILL_FLAG = 'ssa-erp-alerts-backfilled';
const FGI_BACKFILL_FLAG = 'ssa-erp-finished-goods-inbounds-backfilled';

/** 把接口异常转成一行用户可读的原因（写失败告警用，不暴露堆栈/状态码术语） */
const shortErr = (e: any): string => {
  const status = e?.response?.status ?? e?.status;
  if (status === 401) return '登录已过期，请重新登录';
  if (status === 403) return '当前账号无修改权限';
  if (status === 409) return '数据冲突（可能编号重复），请刷新后重试';
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '服务器异常，请稍后重试';
};

/** D1 snake_case 行 → 前端 InboundOrder（含 items 明细） */
const rowToInboundOrder = (row: any): InboundOrder => {
  const m = snakeToCamel(row) as any;
  return {
    ...m,
    items: Array.isArray(m.items) ? m.items.map((it: any) => snakeToCamel(it)) : [],
    inventoryPosted: !!m.inventoryPosted,
    costPosted: !!m.costPosted,
    orgId: m.orgId ?? row?.org_id,
  } as InboundOrder;
};

/** D1 snake_case 行 → 前端 OutboundOrder（含 items 明细） */
const rowToOutboundOrder = (row: any): OutboundOrder => {
  const m = snakeToCamel(row) as any;
  return {
    ...m,
    items: Array.isArray(m.items) ? m.items.map((it: any) => snakeToCamel(it)) : [],
    inventoryPosted: !!m.inventoryPosted,
    cogsPosted: !!m.cogsPosted,
    orgId: m.orgId ?? row?.org_id,
  } as OutboundOrder;
};

/** D1 inventory_records 行 → 前端 InventoryRecord（权威库存源，含调拨/调整/生产，根治双轨分叉 W6） */
const rowToInventoryRecord = (r: any): InventoryRecord => ({
  id: r.id,
  orgId: r.org_id,
  materialId: r.material_id,
  materialCode: r.material_code,
  materialName: r.material_name,
  warehouseId: r.warehouse_id,
  warehouseName: r.warehouse_name,
  locationId: r.location_id,
  locationName: r.location_name,
  quantity: Number(r.quantity) || 0,
  availableQuantity: Number(r.available_quantity) || 0,
  frozenQuantity: Number(r.frozen_quantity) || 0,
  unit: r.unit || '',
  specification: '',
  lastInboundDate: r.last_inbound_date,
  lastOutboundDate: r.last_outbound_date,
  shelfLifeStatus: r.shelf_life_status,
});

/** 从 legacy app_state Blob（localStorage）读取真实历史入库/出库单，用于首次空库回填一次 */
const readLegacyWarehouseOrders = (): { inbounds: InboundOrder[]; outbounds: OutboundOrder[] } => {
  try {
    const raw = window.localStorage.getItem('ssa-erp-warehouse');
    if (raw) {
      const st = JSON.parse(raw)?.state;
      return {
        inbounds: Array.isArray(st?.inboundOrders) ? st.inboundOrders : [],
        outbounds: Array.isArray(st?.outboundOrders) ? st.outboundOrders : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { inbounds: [], outbounds: [] };
};

/** 从 D1 入/出库单据派生批次记录（W6 整改：批次无后端权威源，仍从单据派生；
 *  库存余额则改消费后端 inventory_records，见 loadInventoryRecords，根治前端双轨分叉）。 */
const recomputeBatchRecordsFromOrders = (inbounds: InboundOrder[], outbounds: OutboundOrder[]): BatchRecord[] => {
  let batchRecords: BatchRecord[] = [];
  for (const o of inbounds) {
    if (o.inventoryPosted) {
      batchRecords = postInboundToInventory([], batchRecords, o).batchRecords;
    }
  }
  for (const o of outbounds) {
    if (o.inventoryPosted) {
      batchRecords = postOutboundToInventory([], batchRecords, o).batchRecords;
    }
  }
  return batchRecords;
};

interface WarehouseState {
  inboundOrders: InboundOrder[];
  outboundOrders: OutboundOrder[];
  checkTasks: CheckTask[];
  inventoryRecords: InventoryRecord[];
  inventoryAlerts: InventoryAlert[];
  batchRecords: BatchRecord[];
  finishedGoodsInbounds: FinishedGoodsInbound[];
  selectedInbound: InboundOrder | null;
  selectedOutbound: OutboundOrder | null;
  selectedCheckTask: CheckTask | null;

  // Inbound CRUD
  addInboundOrder: (order: InboundOrder) => void;
  updateInboundOrder: (id: string, updates: Partial<InboundOrder>) => void;
  deleteInboundOrder: (id: string) => void;

  // Outbound CRUD
  addOutboundOrder: (order: OutboundOrder) => void;
  updateOutboundOrder: (id: string, updates: Partial<OutboundOrder>) => void;
  deleteOutboundOrder: (id: string) => void;

  // CheckTask CRUD
  addCheckTask: (task: CheckTask) => void;
  updateCheckTask: (id: string, updates: Partial<CheckTask>) => void;
  deleteCheckTask: (id: string) => void;
  // 盘点过账：盘盈盘亏调整库存 + 标记任务完成
  postCheckAdjustment: (taskId: string, items: CheckTaskItem[]) => void;

  // Batch CRUD（V2.7 批次管理）
  addBatchRecord: (batch: BatchRecord) => void;
  updateBatchRecord: (id: string, updates: Partial<BatchRecord>) => void;
  deleteBatchRecord: (id: string) => void;

  // Finished Goods Inbound CRUD
  addFinishedGoodsInbound: (order: FinishedGoodsInbound) => void;
  updateFinishedGoodsInbound: (id: string, updates: Partial<FinishedGoodsInbound>) => void;
  deleteFinishedGoodsInbound: (id: string) => void;

  // Inventory
  setInboundOrders: (orders: InboundOrder[]) => void;
  setOutboundOrders: (orders: OutboundOrder[]) => void;
  setCheckTasks: (tasks: CheckTask[]) => void;
  setInventoryRecords: (records: InventoryRecord[]) => void;
  setInventoryAlerts: (alerts: InventoryAlert[]) => void;
  setBatchRecords: (records: BatchRecord[]) => void;
  setSelectedInbound: (order: InboundOrder | null) => void;
  setSelectedOutbound: (order: OutboundOrder | null) => void;
  setSelectedCheckTask: (task: CheckTask | null) => void;
  /** W1 仓库战役：入库单/出库单从真实 D1 拉取（含 items 明细），并以 D1 单据重算派生库存/批次 */
  loadWarehouseOrders: () => Promise<void>;
  /** W6 整改：库存记录改消费后端权威源 inventory_records（含调拨/调整/生产）；根治前端双轨分叉 */
  loadInventoryRecords: () => Promise<void>;
  /** V2.81.0 盘点任务从真实 D1 拉取（根治 Blob 双通道），首次空库回填 mock */
  loadCheckTasks: () => Promise<void>;
  /** V2.82.0 库存预警从真实 D1 拉取（根治 Blob 双通道），首次空库回填 mock */
  loadInventoryAlerts: () => Promise<void>;
  /** V2.82.0 产成品入库从真实 D1 拉取（根治 Blob 双通道），首次空库回填 mock */
  loadFinishedGoodsInbounds: () => Promise<void>;
  /** V3.66.0 P0-5：批次台账改消费 D1 batch_records（主源 = D1，批次级成本对账口径）；空库回填本地派生结果 */
  loadBatchRecords: () => Promise<void>;
  /** V3.67.0 立项②：批次本地→D1 增量同步（过账后调用：创建缺失批次 + 更新已变更批次的数量/成本/状态，不做全量回取覆盖）。幂等、fire-and-forget 语义由调用方 catch 兜底 */
  syncBatchRecordsToD1: () => Promise<void>;
}

/** 新建/更新单据时自动打上当前组织 id（多组织上下文） */
const withOrg = <T extends { orgId?: string }>(entity: T): T => {
  const orgId = useOrgStore.getState().currentOrgId;
  return entity.orgId ? entity : { ...entity, orgId };
};

// V2.81.0 盘点任务迁 D1（根治 Blob 双通道）：嵌套 items 以 JSON 文本落库，blindMode 布尔→INTEGER；
// 仅当字段存在时才纳入写回（update 部分字段时不误清空 items 等）。
const toCheckTaskPayload = (t: Partial<CheckTask>): Record<string, unknown> => {
  const p: Record<string, unknown> = { ...t };
  if (t.items !== undefined) p.items = JSON.stringify(t.items);
  if (t.blindMode !== undefined) p.blindMode = t.blindMode ? 1 : 0;
  return p;
};
const parseCheckTask = (r: any): CheckTask => {
  let items: CheckTaskItem[] = [];
  try {
    if (typeof r.items === 'string') items = JSON.parse(r.items) || [];
    else if (Array.isArray(r.items)) items = r.items;
  } catch {
    items = [];
  }
  return { ...r, items, blindMode: !!r.blindMode };
};

export const useWarehouseStore = create<WarehouseState>()(
  persist(
    (set, get) => ({
      inboundOrders: [...mockInboundOrders],
      outboundOrders: [...mockOutboundOrders],
      checkTasks: [...mockCheckTasks],
      inventoryRecords: [...mockInventoryRecords],
      inventoryAlerts: [...mockInventoryAlerts],
      batchRecords: [...mockBatchRecords],
      finishedGoodsInbounds: [...mockFinishedGoodsInbounds],
      selectedInbound: null,
      selectedOutbound: null,
      selectedCheckTask: null,

      // Inbound CRUD（确认入库 completed 即自动过账库存 + 回写采购订单 + 维护批次）
      //
      // ★ V3.45.0 第3批：删除前端重复算账（原 rollInboundCost + 4 个前端凭证函数）。
      //   原实现是**双轨**：① 前端 rollInboundCost 滚一次移动均价 + 前端建 GR/IR 等 4 类凭证；
      //   ② 同时把单据发给后端，postInbound 再滚一次均价、再生成一次凭证。
      //   后果（对标报告 S-03）：
      //     · 移动均价取决于两个未必一致的基数（前端内存物料 vs D1 materials）→ 成本不可复算；
      //     · 前端凭证与后端凭证靠 source_no 查重勉强去重，格式不同就会**两张 1403/2201 重复挂账**。
      //   根因：违背"服务端算账是唯一权威源"（inventoryPosting.ts 文件头的设计声明）。
      //   现在：前端**只发单据不算账**，成本与凭证一律由服务端 postInbound 计算，
      //   返回后重载物料与库存以保持界面与库一致（下方 postInbound 成功后 reload）。
      addInboundOrder: (order) => {
        const o = withOrg(order);
        const alreadyPosted = useWarehouseStore
          .getState()
          .inboundOrders.some((x) => x.id === o.id && x.inventoryPosted);
        const shouldPost = o.status === 'completed' && !alreadyPosted;
        // 成本与凭证金额一律以服务端返回为准（此处不再自行计算）
        const finalOrder: InboundOrder = {
          ...o,
          inventoryPosted: shouldPost ? true : o.inventoryPosted,
          costPosted: shouldPost ? true : o.costPosted,
        };
        if (shouldPost) writeBackPurchaseReceipt(o);
        set((state) => ({
          inboundOrders: [...state.inboundOrders, finalOrder],
        }));
        // W1 仓库战役：入库单落真实 D1（直连 /api/inbound-orders，非 Blob）。
        // 中央落库点，覆盖 purchase/subcontract/production/transfer 等全部路径。
        if (isAuthed()) {
          const payload = toInboundPayload(finalOrder);
          b2Api.postInbound(payload).then((created) => {
            const createdId = created?.id;
            // 用 D1 服务端 id 回写本地（保证后续 update/delete 命中同一行）
            if (createdId && createdId !== finalOrder.id) {
              set((state) => ({
                inboundOrders: state.inboundOrders.map((x) => (x.id === finalOrder.id ? { ...x, id: createdId } : x)),
              }));
            }
            // 已收货(completed)单据：POST 后用 PUT 落 inventoryPosted/costPosted/status，保证 D1 与本地一致
            if (shouldPost && createdId) {
              b2Api.putInbound(createdId, { ...payload, status: 'completed', inventoryPosted: true, costPosted: true })
                .then(() => {
                  // ★ V3.45.0：服务端算账完成后重载物料与库存。
                  //   移动均价、库存数量、库存金额都只在服务端被权威更新，
                  //   前端不再自行推算（已删 rollInboundCost）——若不重载，
                  //   界面会一直显示入库前的旧均价/旧库存，用户看到的数字与账不符。
                  //   方法名以各 store 接口为准：materialStore.loadMaterials / warehouseStore.loadWarehouseOrders
                  //   （后者承载 inventoryRecords）。
                  return Promise.all([
                    useMaterialStore.getState().loadMaterials?.(),
                    useWarehouseStore.getState().loadWarehouseOrders?.(),
                  ]).catch(() => { /* 重载失败不阻断业务，下一次 load 会纠正 */ });
                })
                .catch((e: any) => {
                  useGlobalToastStore.getState().showError(`入库单 ${finalOrder.inboundNo || finalOrder.id} 过账状态未同步到服务器：${shortErr(e)}`);
                });
            }
          }).catch((e: any) => {
            useGlobalToastStore.getState().showError(`入库单 ${finalOrder.inboundNo || finalOrder.id} 未保存到服务器：${shortErr(e)}`);
          });
        }
      },
      updateInboundOrder: (id, updates) => {
        // ★ V3.45.0 第3批：此处原先是**第二条前端算账路径**（改状态为 completed 时
        //   又滚一次移动均价 + 又建一次 GR/IR 暂估凭证），与 addInboundOrder 构成双轨。
        //   现在前端只改状态并回写 D1，成本与凭证一律由服务端 postInbound 计算。
        set((state) => {
          const prev = state.inboundOrders.find((o) => o.id === id);
          const next = state.inboundOrders.map((o) => (o.id === id ? { ...o, ...updates } : o));
          if (
            prev &&
            prev.status !== 'completed' &&
            updates.status === 'completed' &&
            !prev.inventoryPosted
          ) {
            const completed = next.find((o) => o.id === id)!;
            writeBackPurchaseReceipt(completed);
            // 标记已过账（真实金额由服务端回写后再重载对齐）
            const idx = next.findIndex((o) => o.id === id);
            if (idx >= 0) next[idx] = { ...next[idx], inventoryPosted: true, costPosted: true };
          }
          return { inboundOrders: next };
        });
        // W1 仓库战役：状态/库存过账变更回写真实 D1（根治 Blob 双通道）
        if (isAuthed()) {
          const cur = get().inboundOrders.find((o) => o.id === id);
          if (cur) {
            b2Api.putInbound(id, toInboundPayload(cur))
              .then((res: any) => {
                // V3.58.0 WH-17：服务端过账失败（状态被回滚）会在响应体回传 postingError，
                // 此处转成全局红条，杜绝「界面显示已完成、库存其实没动」的假成功。
                if (res?.postingError) {
                  useGlobalToastStore.getState().showError(
                    `入库单 ${cur.inboundNo || cur.id} 库存过账未完成，已恢复原状态：${res.postingError}`
                  );
                  return get().loadWarehouseOrders?.() ?? undefined;
                }
                // 服务端算账（含移动均价与凭证）完成后重载，使界面与账一致
                if (cur.status === 'completed') {
                  return Promise.all([
                    useMaterialStore.getState().loadMaterials?.(),
                    useWarehouseStore.getState().loadWarehouseOrders?.(),
                  ]).catch(() => { /* 重载失败不阻断，下次 load 纠正 */ });
                }
                return undefined;
              })
              .catch((e: any) => {
                useGlobalToastStore.getState().showError(`入库单 ${cur.inboundNo || cur.id} 修改未同步到服务器：${shortErr(e)}`);
              });
          }
        }
      },
      deleteInboundOrder: (id) => {
        const prev = get().inboundOrders;
        set((state) => ({ inboundOrders: state.inboundOrders.filter((o) => o.id !== id) }));
        // W1 仓库战役：删除回写真实 D1（根治 Blob 双通道）；失败回滚 + 告警
        if (isAuthed()) b2Api.deleteInbound(id).catch((e: any) => {
          set({ inboundOrders: prev });
          useGlobalToastStore.getState().showError(`入库单删除未同步到服务器：${shortErr(e)}`);
        });
      },

      // Outbound CRUD（已出库 completed 即自动扣减库存 + 批次 FIFO 消耗 + 回写销售订单 + 结转成本）
      addOutboundOrder: (order) => {
        const o = withOrg(order);
        // 归一化：保证 items 存在，避免脏数据导致详情/成本计算访问 undefined 崩溃
        if (!Array.isArray(o.items)) o.items = [];
        const alreadyPosted = useWarehouseStore
          .getState()
          .outboundOrders.some((x) => x.id === o.id && x.inventoryPosted);
        const shouldPost = o.status === 'completed' && !alreadyPosted;
        let costPosted = false;
        const enrichedItems = shouldPost && !o.cogsPosted ? postOutboundCost(o) : o.items;
        if (shouldPost && !o.cogsPosted) costPosted = true;
        if (shouldPost) writeBackSalesShipment(o);
        const finalOrder: OutboundOrder = {
          ...o,
          items: enrichedItems,
          inventoryPosted: shouldPost ? true : o.inventoryPosted,
          cogsPosted: costPosted || o.cogsPosted,
        };
        set((state) => {
          const posted = shouldPost
            ? postOutboundToInventory(state.inventoryRecords, state.batchRecords, o)
            : null;
          return {
            outboundOrders: [...state.outboundOrders, finalOrder],
            inventoryRecords: posted ? posted.inventoryRecords : state.inventoryRecords,
            batchRecords: posted ? posted.batchRecords : state.batchRecords,
          };
        });
        // W1 仓库战役：出库单落真实 D1（直连 /api/outbound-orders，非 Blob）。
        // 中央落库点，覆盖 sale/pick/subcontract/transfer 等全部路径。
        if (isAuthed()) {
          const payload = toOutboundPayload(finalOrder);
          // V3.58.0 修复 WH-18：建单前记录「改前」库存快照，若后端落库失败（created==null 或异常），
          // 回滚本地库存/批次 + 移除该出库单 + 红条告警，杜绝「本地已扣库存、后端没建单」的假成功。
          const invBefore = get().inventoryRecords;
          const batchBefore = get().batchRecords;
          b2Api.postOutbound(payload).then((created) => {
            const createdId = created?.id;
            if (!createdId) {
              // 后端未返回有效单据（静默吞掉）→ 回滚本地
              set({ inventoryRecords: invBefore, batchRecords: batchBefore });
              set((state) => ({ outboundOrders: state.outboundOrders.filter((x) => x.id !== finalOrder.id) }));
              useGlobalToastStore.getState().showError(
                `出库单 ${finalOrder.outboundNo || finalOrder.id} 未同步到服务器，已撤销本地库存扣减，请重试`
              );
              return;
            }
            if (createdId !== finalOrder.id) {
              set((state) => ({
                outboundOrders: state.outboundOrders.map((x) => (x.id === finalOrder.id ? { ...x, id: createdId } : x)),
              }));
            }
            if (shouldPost && createdId) {
              b2Api.putOutbound(createdId, { ...payload, status: 'completed', inventoryPosted: true, cogsPosted: true }).catch((e: any) => {
                useGlobalToastStore.getState().showError(`出库单 ${finalOrder.outboundNo || finalOrder.id} 过账状态未同步到服务器：${shortErr(e)}`);
              });
              // V3.67.0 立项②：出库 FIFO 扣量/扣批次成本后，增量同步批次台账到 D1（批次级成本对账权威源）
              void get().syncBatchRecordsToD1();
            }
          }).catch((e: any) => {
            // 落库异常 → 同样回滚本地库存与单据
            set({ inventoryRecords: invBefore, batchRecords: batchBefore });
            set((state) => ({ outboundOrders: state.outboundOrders.filter((x) => x.id !== finalOrder.id) }));
            useGlobalToastStore.getState().showError(`出库单 ${finalOrder.outboundNo || finalOrder.id} 未保存到服务器：${shortErr(e)}`);
          });
        }
      },
      updateOutboundOrder: (id, updates) => {
        set((state) => {
          const prev = state.outboundOrders.find((o) => o.id === id);
          const next = state.outboundOrders.map((o) => (o.id === id ? { ...o, ...updates } : o));
          let inventoryRecords = state.inventoryRecords;
          let batchRecords = state.batchRecords;
          if (
            prev &&
            prev.status !== 'completed' &&
            updates.status === 'completed' &&
            !prev.inventoryPosted
          ) {
            const updated = next.find((o) => o.id === id)!;
            const posted = postOutboundToInventory(inventoryRecords, batchRecords, updated);
            inventoryRecords = posted.inventoryRecords;
            batchRecords = posted.batchRecords;
            writeBackSalesShipment(updated);
            // 出库过账后结转成本（幂等：!prev.cogsPosted 防止重复结转）
            if (!prev.cogsPosted) {
              const enriched = postOutboundCost(updated);
              const idx = next.findIndex((o) => o.id === id);
              if (idx >= 0) next[idx] = { ...next[idx], items: enriched, cogsPosted: true };
            }
          }
          return { outboundOrders: next, inventoryRecords, batchRecords };
        });
        // W1 仓库战役：状态/库存过账变更回写真实 D1（根治 Blob 双通道）
        if (isAuthed()) {
          const cur = get().outboundOrders.find((o) => o.id === id);
          if (cur) b2Api.putOutbound(id, toOutboundPayload(cur)).then((res: any) => {
            // V3.58.0 WH-17：过账/凭证失败（含库存未扣但状态被回滚）时后端会回传 postingError，
            // 此处红条告警，杜绝「界面显示已完成、库存其实没动」的假成功。
            if (res?.postingError) {
              useGlobalToastStore.getState().showError(
                `出库单 ${cur.outboundNo || cur.id} 库存过账/凭证未完成：${res.postingError}`
              );
              // 过账失败时本地库存/批次也需回滚到改前状态，避免"本地扣了、库账没扣"的分叉
              const before = get().outboundOrders.find((o) => o.id === id);
              if (before && cur) {
                set((state) => ({ outboundOrders: state.outboundOrders.map((o) => (o.id === id ? before : o)) }));
              }
              return;
            }
            if (res?.serialIssues?.length) {
              useGlobalToastStore.getState().showError(
                `出库单 ${cur.outboundNo || cur.id} 部分序列号未更新，请到序列号台账核对：${res.serialIssues.join('、')}`
              );
            }
            // V3.67.0 立项②：状态推进过账（FIFO 扣量/扣批次成本）成功后，增量同步批次台账到 D1
            void get().syncBatchRecordsToD1();
          }).catch((e: any) => {
            useGlobalToastStore.getState().showError(`出库单 ${cur.outboundNo || cur.id} 修改未同步到服务器：${shortErr(e)}`);
          });
        }
      },
      deleteOutboundOrder: (id) => {
        const prev = get().outboundOrders;
        set((state) => ({ outboundOrders: state.outboundOrders.filter((o) => o.id !== id) }));
        // W1 仓库战役：删除回写真实 D1（根治 Blob 双通道）；失败回滚 + 告警
        if (isAuthed()) b2Api.deleteOutbound(id).catch((e: any) => {
          set({ outboundOrders: prev });
          useGlobalToastStore.getState().showError(`出库单删除未同步到服务器：${shortErr(e)}`);
        });
      },

      // CheckTask CRUD（V2.81.0 迁真实 D1：乐观更新 + 写回 /api/entities/checkTask）
      addCheckTask: (task) => {
        const withOrgTask = withOrg(task);
        set((state) => ({ checkTasks: [...state.checkTasks, withOrgTask] }));
        if (isAuthed()) {
          entityRepo.create('checkTask', toCheckTaskPayload(withOrgTask) as Partial<CheckTask>).catch((e: any) => {
            set((state) => ({ checkTasks: state.checkTasks.filter((t) => t.id !== withOrgTask.id) }));
            useGlobalToastStore.getState().showError(`盘点任务创建未保存到服务器：${shortErr(e)}`);
          });
        }
      },
      updateCheckTask: (id, updates) => {
        const prev = get().checkTasks.find((t) => t.id === id);
        set((state) => ({
          checkTasks: state.checkTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        if (isAuthed()) {
          entityRepo.update('checkTask', id, toCheckTaskPayload(updates) as Partial<CheckTask>).catch((e: any) => {
            if (prev) set((state) => ({ checkTasks: state.checkTasks.map((t) => (t.id === id ? prev : t)) }));
            useGlobalToastStore.getState().showError(`盘点任务修改未保存：${shortErr(e)}`);
          });
        }
      },
      deleteCheckTask: (id) => {
        const prev = get().checkTasks;
        set((state) => ({ checkTasks: state.checkTasks.filter((t) => t.id !== id) }));
        if (isAuthed()) entityRepo.remove('checkTask', id).catch((e: any) => {
          set({ checkTasks: prev });
          useGlobalToastStore.getState().showError(`盘点任务删除未同步到服务器：${shortErr(e)}`);
        });
      },

      // W1 整改：盘点过账走真实库存调整单（/api/inventory-adjustments）过账，根治"假过账"。
      // 旧实现只改前端内存数组 + 写 checkTask 状态，从不触碰后端库存，盘点后账面与实物仍不一致。
      // 流程：① 本地乐观更新（即时反馈）→ ② 后端建调整单并 PUT completed 触发盘盈入/盘亏出 + 凭证
      //      → ③ 过账后从权威源重载库存，确保界面与 D1 一致。后端过账失败则回滚本地并告警（绝不假成功）。
      postCheckAdjustment: async (taskId, items) => {
        const state = get();
        const task = state.checkTasks.find((t) => t.id === taskId);
        if (!task) return;
        const whId = task.warehouseId || '';
        const whName = task.warehouseName || '';
        const today = new Date().toISOString().slice(0, 10);
        // ① 本地乐观更新（立即反馈）：仍按差异调整本地 inventoryRecords，保持页面即时一致
        let records = state.inventoryRecords;
        for (const it of items) {
          const diff = (it.countQuantity ?? it.bookQuantity) - it.bookQuantity;
          if (diff === 0) continue;
          const idx = records.findIndex(
            (r) => r.materialId === it.materialId && (it.locationId ? r.locationId === it.locationId : true)
          );
          if (idx >= 0) {
            const nextQty = Math.max(0, records[idx].quantity + diff);
            records = records.map((r, i) =>
              i === idx
                ? {
                    ...r,
                    quantity: nextQty,
                    availableQuantity: Math.max(0, r.availableQuantity + diff),
                    lastInboundDate: diff > 0 ? today : r.lastInboundDate,
                    lastOutboundDate: diff < 0 ? today : r.lastOutboundDate,
                  }
                : r
            );
          } else if (diff > 0) {
            records = [
              ...records,
              {
                id: `inv-${it.materialId}-${it.locationId || 'default'}-${Date.now()}`,
                materialId: it.materialId,
                materialCode: it.materialCode || '',
                materialName: it.materialName || '',
                specification: '',
                warehouseId: whId,
                warehouseName: whName,
                orgId: task?.orgId,
                locationId: it.locationId,
                locationName: it.locationName,
                quantity: diff,
                availableQuantity: diff,
                frozenQuantity: 0,
                unit: '',
                lastInboundDate: today,
              },
            ];
          }
        }
        set({
          inventoryRecords: records,
          checkTasks: state.checkTasks.map((t) =>
            t.id === taskId ? { ...t, status: 'completed', items, endDate: today } : t
          ),
        });
        // ② 后端真实过账：建调整单 → PUT completed 触发盘盈入/盘亏出 + 凭证（调整单端点已含反假成功校验）
        if (task && isAuthed()) {
          const adjItems = items
            .map((it) => {
              const diff = (it.countQuantity ?? it.bookQuantity) - it.bookQuantity;
              return {
                materialId: it.materialId,
                materialCode: it.materialCode || '',
                materialName: it.materialName || '',
                locationId: it.locationId || null,
                bookQty: it.bookQuantity || 0,
                actualQty: (it.countQuantity ?? it.bookQuantity) || 0,
                deltaQty: diff,
              };
            })
            .filter((x) => Math.abs(x.deltaQty) > 1e-9);
          if (adjItems.length > 0) {
            try {
              const created = await b2Api.postAdjustment({
                adjustmentNo: `CHK-${task.id.slice(0, 8)}`,
                warehouseId: whId,
                warehouseName: whName,
                reason: `盘点调整（任务 ${task.id}）`,
                date: today,
                status: 'draft',
                items: adjItems,
              });
              if (created?.id) {
                const res = await b2Api.putAdjustment(created.id, { status: 'completed' });
                if (!res || (res as any).error) {
                  throw new Error((res as any)?.error || '调整单过账失败');
                }
              } else {
                throw new Error('调整单创建失败');
              }
            } catch (e: any) {
              // 后端过账失败：回滚本地乐观更新 + 任务回置进行中，并告警（不把假成功当成成功）
              set({
                inventoryRecords: state.inventoryRecords,
                checkTasks: state.checkTasks.map((t) =>
                  t.id === taskId ? { ...t, status: 'processing' as const } : t
                ),
              });
              useGlobalToastStore.getState().showError(`盘点过账未成功：${shortErr(e)}`);
              return;
            }
          }
          // 任务完成态写回 D1（根治 Blob 双通道）
          entityRepo
            .update('checkTask', taskId, toCheckTaskPayload({ status: 'completed', endDate: today, items }) as Partial<CheckTask>)
            .catch((e: any) => {
              useGlobalToastStore.getState().showError(`盘点任务完成态未同步到服务器：${shortErr(e)}`);
            });
          // ③ 过账后从权威源重载库存（确保界面与 D1 一致）
          get().loadInventoryRecords?.().catch(() => { /* 重载失败不阻断 */ });
        }
      },

      // Batch CRUD
      // V3.66.0 P0-5：批次 CRUD 同步 D1 batch_records（批次级成本/库位对账；失败静默不阻断本地）
      addBatchRecord: (batch) => {
        const b = withOrg(batch);
        set((state) => ({ batchRecords: [...state.batchRecords, b] }));
        if (isAuthed()) entityRepo.create('batchRecord', b).catch(() => {});
      },
      updateBatchRecord: (id, updates) => {
        set((state) => ({
          batchRecords: state.batchRecords.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }));
        if (isAuthed()) entityRepo.update('batchRecord', id, updates as any).catch(() => {});
      },
      deleteBatchRecord: (id) => {
        set((state) => ({ batchRecords: state.batchRecords.filter((b) => b.id !== id) }));
        if (isAuthed()) entityRepo.remove('batchRecord', id).catch(() => {});
      },

      // V3.66.0 P0-5：批次台账水合——D1 batch_records 为主源（含批次成本快照），
      // 空库则把本地派生结果回填 D1；之后过账产生的批次变更经 CRUD 同步回 D1。

      // Finished Goods Inbound CRUD（V2.82.0 迁真实 D1，根治 Blob 双通道）
      addFinishedGoodsInbound: (order) => {
        const o = withOrg(order);
        set((state) => ({ finishedGoodsInbounds: [...state.finishedGoodsInbounds, o] }));
        if (isAuthed()) entityRepo.create('finishedGoodsInbound', o).catch((e: any) => {
          set((state) => ({ finishedGoodsInbounds: state.finishedGoodsInbounds.filter((x) => x.id !== o.id) }));
          useGlobalToastStore.getState().showError(`产成品入库创建未保存到服务器：${shortErr(e)}`);
        });
      },
      updateFinishedGoodsInbound: (id, updates) => {
        const prev = get().finishedGoodsInbounds.find((o) => o.id === id);
        set((state) => ({
          finishedGoodsInbounds: state.finishedGoodsInbounds.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        }));
        if (isAuthed()) entityRepo.update('finishedGoodsInbound', id, updates).catch((e: any) => {
          if (prev) set((state) => ({ finishedGoodsInbounds: state.finishedGoodsInbounds.map((o) => (o.id === id ? prev : o)) }));
          useGlobalToastStore.getState().showError(`产成品入库修改未保存：${shortErr(e)}`);
        });
      },
      deleteFinishedGoodsInbound: (id) => {
        const prev = get().finishedGoodsInbounds;
        set((state) => ({ finishedGoodsInbounds: state.finishedGoodsInbounds.filter((o) => o.id !== id) }));
        if (isAuthed()) entityRepo.remove('finishedGoodsInbound', id).catch((e: any) => {
          set({ finishedGoodsInbounds: prev });
          useGlobalToastStore.getState().showError(`产成品入库删除未同步到服务器：${shortErr(e)}`);
        });
      },

      // Setters
      setInboundOrders: (orders) => set({ inboundOrders: orders }),
      setOutboundOrders: (orders) => set({ outboundOrders: orders }),
      setCheckTasks: (tasks) => set({ checkTasks: tasks }),
      setInventoryRecords: (records) => set({ inventoryRecords: records }),
      setInventoryAlerts: (alerts) => set({ inventoryAlerts: alerts }),
      setBatchRecords: (records) => set({ batchRecords: records }),
      setSelectedInbound: (order) => set({ selectedInbound: order }),
      setSelectedOutbound: (order) => set({ selectedOutbound: order }),
      setSelectedCheckTask: (task) => set({ selectedCheckTask: task }),

      // W1 仓库战役：入库单/出库单直连真实 D1（根治 Blob 双通道）
      // 在线：从 /api/inbound-orders + /api/outbound-orders 拉取（逐单 /:id 取 items 明细），
      // 并以 D1 单据重算派生库存/批次（inventoryRecords/batchRecords 不再落 Blob）。
      // 离线/未登录/异常：保持内存 mock，不阻断 UI。
      loadWarehouseOrders: async () => {
        if (!isAuthed()) return;
        try {
          const inList = (await b2Api.getInbounds()) as any;
          const inRows: any[] = inList?.data || [];
          const inbounds = (
            await Promise.all(
              inRows.map(async (r) => {
                const detail = (await b2Api.getInbound(r.id)) as any;
                return rowToInboundOrder(detail && detail.id ? detail : r);
              })
            )
          ).filter(Boolean) as InboundOrder[];

          const outList = (await b2Api.getOutbounds()) as any;
          const outRows: any[] = outList?.data || [];
          const outbounds = (
            await Promise.all(
              outRows.map(async (r) => {
                const detail = (await b2Api.getOutbound(r.id)) as any;
                return rowToOutboundOrder(detail && detail.id ? detail : r);
              })
            )
          ).filter(Boolean) as OutboundOrder[];

          if (inbounds.length > 0 || outbounds.length > 0) {
            // W6 整改：库存余额改消费后端权威源 inventory_records（含调拨/调整/生产），
            // 根治 recompute 仅算入/出库、漏调拨/调整/生产导致的与真实账分叉；
            // 批次无后端权威源，仍从单据派生（保持 BatchManage 既有行为）。
            const batchRecords = recomputeBatchRecordsFromOrders(inbounds, outbounds);
            set({ inboundOrders: inbounds, outboundOrders: outbounds, batchRecords });
            await get().loadInventoryRecords();
            // V3.66.0 P0-5：批次台账水合（D1 batch_records 主源，空库回填上面的本地派生结果）
            await get().loadBatchRecords();
          } else if (!window.localStorage.getItem(WAREHOUSE_BACKFILL_FLAG)) {
            // D1 空库：仅首次从 legacy Blob（真实历史数据）回填一次；无 legacy 则保留 mock 演示态，避免污染生产库
            window.localStorage.setItem(WAREHOUSE_BACKFILL_FLAG, '1');
            const legacy = readLegacyWarehouseOrders();
            for (const o of legacy.inbounds) get().addInboundOrder(o);
            for (const o of legacy.outbounds) get().addOutboundOrder(o);
            // 回填后从权威源拉库存（异步过账可能在后台继续，下次 load 会补齐）
            await get().loadInventoryRecords();
          }
        } catch {
          /* 离线/未登录/接口异常：保持内存 mock，不阻断 UI */
        }
      },

      // W6 整改：库存记录改消费后端权威源 inventory_records（含调拨/调整/生产），根治前端双轨分叉。
      // 在线：从 /api/inventory-records 拉取（org 隔离、RLS）；权威源为空则保留内存态（mock/既有），不强行清空。
      // 离线/未登录/异常：保持内存态，不阻断 UI。
      loadInventoryRecords: async () => {
        if (!isAuthed()) return;
        try {
          const res = await b2Api.getInventoryRecords<{ data?: any[] }>();
          const list = (res?.data || []) as any[];
          const recs = list.map(rowToInventoryRecord).filter(Boolean) as InventoryRecord[];
          if (recs.length > 0) set({ inventoryRecords: recs });
        } catch {
          /* 离线/未登录/接口异常：保持内存态，不阻断 UI */
        }
      },

      // V3.66.0 P0-5 批次台账 D1 化：D1 batch_records 为主源（含批次成本快照，财务批次级对账口径）；
      // 先补本地新增批次到 D1（确定性自然键，幂等），再从 D1 取权威全量；空库首轮回填本地派生结果。
      loadBatchRecords: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<any>('batchRecord', { page: 1, pageSize: 500 });
          const rows: any[] = res?.data || [];
          const d1Ids = new Set(rows.map((r) => r.id));
          // 本地有而 D1 没有的批次 → 补 D1（过账 recompute 出的新批次；确定性自然键，冲突忽略）
          const missing = get().batchRecords.filter((b) => !d1Ids.has(b.id));
          for (const b of missing) {
            try { await entityRepo.create('batchRecord', b as any); } catch { /* 冲突/离线忽略 */ }
          }
          // 本地有而 D1 有的批次 → 同步数量/成本等变更（upsert，幂等）
          for (const b of get().batchRecords) {
            if (d1Ids.has(b.id) && (b.cost !== undefined || b.quantity !== undefined)) {
              entityRepo.update('batchRecord', b.id, { quantity: b.quantity, cost: b.cost, status: b.status }).catch(() => {});
            }
          }
          if (rows.length === 0) {
            if (missing.length === 0) return; // D1 空且本地也无批次（纯 mock 态）：不回填，避免污染生产库
            // 空库回填：把本地派生结果写 D1 后重取
            const refreshed = await entityRepo.list<any>('batchRecord', { page: 1, pageSize: 500 });
            const r2: any[] = refreshed?.data || [];
            if (r2.length) set({ batchRecords: r2.map((r) => ({ ...r, locked: !!r.locked })) as BatchRecord[] });
            return;
          }
          // D1 非空：取权威全量（含刚补进去的新批次）
          const refreshed = await entityRepo.list<any>('batchRecord', { page: 1, pageSize: 500 });
          const r2: any[] = refreshed?.data || rows;
          if (r2.length) set({ batchRecords: r2.map((r) => ({ ...r, locked: !!r.locked })) as BatchRecord[] });
        } catch {
          /* 离线/未登录/接口异常：保持内存态，不阻断 UI */
        }
      },

      // V3.67.0 立项②：批次本地→D1 增量同步（出库 FIFO 扣量/扣成本后调用）。
      // 与 loadBatchRecords 的区别：不做全量回取覆盖（避免刚改的本地值被 D1 旧值冲掉），
      // 只做 ①本地有而 D1 没有 → create；②两边都有且数量/成本/状态有变 → update。
      // 幂等：D1 已是权威全量时本地与 D1 一致，diff 为空，无写操作。
      syncBatchRecordsToD1: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<any>('batchRecord', { page: 1, pageSize: 500 });
          const d1Rows: any[] = res?.data || [];
          const d1ById = new Map(d1Rows.map((r) => [r.id, r]));
          for (const b of get().batchRecords) {
            const remote = d1ById.get(b.id);
            if (!remote) {
              // 本地新批次（过账 recompute 派生）→ 补 D1（确定性自然键 bat-*，冲突忽略）
              try { await entityRepo.create('batchRecord', b as any); } catch { /* 冲突忽略 */ }
            } else {
              // 已存在批次：仅当本地数量/成本/状态与 D1 不一致才 update（省无效写）
              if (
                remote.quantity !== b.quantity ||
                (Number(remote.cost ?? 0) !== Number(b.cost ?? 0)) ||
                remote.status !== b.status
              ) {
                entityRepo.update('batchRecord', b.id, { quantity: b.quantity, cost: b.cost, status: b.status }).catch(() => {});
              }
            }
          }
        } catch {
          /* 离线/未登录/接口异常：本地内存态保留，loadBatchRecords 水合时再补齐，不阻断 UI */
        }
      },

      // V2.81.0 盘点任务迁真实 D1（根治 Blob 双通道）
      // 在线：从 /api/entities/checkTask 拉取（org 隔离、RLS）；首次空库回填 mock 演示态（flag 防重复）。
      // 离线/未登录/异常：保持内存 mock，不阻断 UI。
      loadCheckTasks: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<CheckTask>('checkTask', { page: 1, pageSize: 200 });
          const list = (res?.data || []) as CheckTask[];
          const parsed = list.map(parseCheckTask);
          if (parsed.length === 0 && !localStorage.getItem(CHECKTASK_BACKFILL_FLAG)) {
            // D1 空库：仅首次把 mock 演示种子回填一次（避免污染/重复），迁移后成为多人共享真源
            localStorage.setItem(CHECKTASK_BACKFILL_FLAG, '1');
            for (const task of mockCheckTasks) {
              try {
                await entityRepo.create('checkTask', toCheckTaskPayload(task) as Partial<CheckTask>);
              } catch {
                /* 编码冲突等忽略，回填尽力而为 */
              }
            }
            const refreshed = await entityRepo.list<CheckTask>('checkTask', { page: 1, pageSize: 200 });
            const r2 = (refreshed?.data || []).map(parseCheckTask);
            set({ checkTasks: r2.length ? r2 : [...mockCheckTasks] });
            return;
          }
          set({ checkTasks: parsed.length ? parsed : [...mockCheckTasks] });
        } catch {
          /* 离线/未登录/接口异常：保持内存 mock，不阻断 UI */
        }
      },

      // V2.82.0 库存预警迁真实 D1（根治 Blob 双通道）
      // 在线：从 /api/entities/inventoryAlert 拉取（org 隔离）；首次空库回填 mock 演示态（flag 防重复）。
      // 离线/未登录/异常：保持内存 mock，不阻断 UI。
      loadInventoryAlerts: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<InventoryAlert>('inventoryAlert', { page: 1, pageSize: 200 });
          const list = (res?.data || []) as InventoryAlert[];
          if (list.length === 0 && !localStorage.getItem(ALERT_BACKFILL_FLAG)) {
            localStorage.setItem(ALERT_BACKFILL_FLAG, '1');
            for (const a of mockInventoryAlerts) {
              try {
                await entityRepo.create('inventoryAlert', a as Partial<InventoryAlert>);
              } catch {
                /* 回填尽力而为 */
              }
            }
            const refreshed = await entityRepo.list<InventoryAlert>('inventoryAlert', { page: 1, pageSize: 200 });
            const r2 = (refreshed?.data || []) as InventoryAlert[];
            set({ inventoryAlerts: r2.length ? r2 : [...mockInventoryAlerts] });
            return;
          }
          set({ inventoryAlerts: list.length ? list : [...mockInventoryAlerts] });
        } catch {
          /* 离线/未登录/接口异常：保持内存 mock，不阻断 UI */
        }
      },

      // V2.82.0 产成品入库迁真实 D1（根治 Blob 双通道）
      // 在线：从 /api/entities/finishedGoodsInbound 拉取（org 隔离）；首次空库回填 mock 演示态（flag 防重复）。
      // 离线/未登录/异常：保持内存 mock，不阻断 UI。
      loadFinishedGoodsInbounds: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<FinishedGoodsInbound>('finishedGoodsInbound', { page: 1, pageSize: 200 });
          const list = (res?.data || []) as FinishedGoodsInbound[];
          if (list.length === 0 && !localStorage.getItem(FGI_BACKFILL_FLAG)) {
            localStorage.setItem(FGI_BACKFILL_FLAG, '1');
            for (const o of mockFinishedGoodsInbounds) {
              try {
                await entityRepo.create('finishedGoodsInbound', withOrg(o) as Partial<FinishedGoodsInbound>);
              } catch {
                /* 回填尽力而为 */
              }
            }
            const refreshed = await entityRepo.list<FinishedGoodsInbound>('finishedGoodsInbound', { page: 1, pageSize: 200 });
            const r2 = (refreshed?.data || []) as FinishedGoodsInbound[];
            set({ finishedGoodsInbounds: r2.length ? r2 : [...mockFinishedGoodsInbounds] });
            return;
          }
          set({ finishedGoodsInbounds: list.length ? list : [...mockFinishedGoodsInbounds] });
        } catch {
          /* 离线/未登录/接口异常：保持内存 mock，不阻断 UI */
        }
      },
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-warehouse',
      version: 1,
      // 只持久化业务数据，UI 选中态不落盘
      // 根治双通道：inboundOrders/outboundOrders 已迁真实 D1（loadWarehouseOrders 拉取 + 各动作写回），
      // inventoryRecords/batchRecords 为 D1 单据派生的库存缓存（load 时重算），三者均不再落 Blob。
      // checkTasks（V2.81.0）亦已迁真实 D1（loadCheckTasks 拉取 + 各动作写回 /api/entities/checkTask）。
      // V2.82.0 双通道已彻底根治：inventoryAlerts/finishedGoodsInbounds 均已迁真实 D1
      // （loadInventoryAlerts/loadFinishedGoodsInbounds 拉取 + 各动作 fire-and-forget 写回 /api/entities）。
      // 仓库域全部业务数组不再落 Blob。
      partialize: (state) => ({}),
    }
  )
);
