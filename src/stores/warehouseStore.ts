import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { InboundOrder, OutboundOrder, OutboundOrderItem, CheckTask, CheckTaskItem, InventoryRecord, InventoryAlert, BatchRecord, PurchaseOrderStatus, SalesOrderStatus, VoucherItem } from '@/types';
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
      nextBatches[i] = { ...nextBatches[i], quantity: nextBatches[i].quantity - take };
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

// ── A4-① 移动平均价滚动 ───────────────────────────────────────
// 入库过账时，按 (原库存金额 + 本次入库未税金额)/(原库存数量 + 本次入库数量) 重算移动平均价，
// 并回写物料主数据的 movingAvgPrice / stockValue / currentStock（保持 金额≈数量×单价 恒等式）。
const rollInboundCost = (order: InboundOrder): number => {
  if (!order.items || order.items.length === 0) return 0;
  const materialStore = useMaterialStore.getState();
  const purchaseStore = usePurchaseStore.getState();

  // 优先从 sourceNo 回查采购订单，取行未税单价（A2 口径：unitPrice 为不含税）
  let poPriceByMaterial: Map<string, number> | null = null;
  if (order.sourceNo) {
    const po = purchaseStore.purchaseOrders.find((o) => o.orderNo === order.sourceNo);
    if (po) poPriceByMaterial = new Map(po.items.map((l) => [l.materialId, l.unitPrice]));
  }

  let totalCost = 0;
  for (const item of order.items) {
    const qty = item.actualQuantity || item.expectedQuantity || 0;
    if (qty <= 0) continue;
    const material = materialStore.materials.find((m) => m.id === item.materialId);
    if (!material) continue;

    // 未税单价优先级：行上显填 > 采购订单回查 > 物料现行成本兜底（永不为 0）
    let unitPrice = item.unitPrice;
    if (!unitPrice && poPriceByMaterial) unitPrice = poPriceByMaterial.get(item.materialId);
    if (!unitPrice) unitPrice = getUnitCost(material);

    const rolled = rollInMovingAverage(
      material.currentStock || 0,
      getStockValue(material),
      qty,
      unitPrice
    );
    materialStore.updateMaterial(material.id, {
      movingAvgPrice: rolled.movingAvgPrice,
      stockValue: rolled.stockValue,
      currentStock: rolled.quantity,
    });
    totalCost += roundAmount(qty * unitPrice);
  }
  return totalCost;
};

// ── A4-③ GR/IR 暂估 ───────────────────────────────────────
// 采购入库过账时，按 PO 未税价（rollInboundCost 返回的 totalCost）生成暂估凭证：
//   借 存货(1403 原材料) / 贷 GR/IR暂估(2201 物资采购)。
// 待发票校验时由 financeStore.generateVoucherFromInvoice 借 2201 / 借进项税 / 贷应付 冲暂估并确认应付，
// 使存货只在收货时入账一次，避免「收货借存货 + 发票又借存货」的重复入账。
// 仅在 type==='purchase' 且 totalCost>0 时生成；非采购入库（return/transfer）不挂暂估。
const postInboundGRIREstimate = (order: InboundOrder, totalCost: number): void => {
  if (order.type !== 'purchase' || !totalCost || totalCost <= 0) return;
  const financeStore = useFinanceStore.getState();
  const items: VoucherItem[] = [
    {
      id: `grir-${order.id}-d`, lineNo: 0,
      summary: `采购暂估入库 ${order.inboundNo}`,
      accountCode: '1403', accountName: '原材料', debit: totalCost, credit: 0,
    },
    {
      id: `grir-${order.id}-c`, lineNo: 0,
      summary: `GR/IR暂估 ${order.vendorName || order.inboundNo}`,
      accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: 0, credit: totalCost,
    },
  ];
  financeStore.createVoucher({
    date: order.inboundDate,
    items,
    source: 'inventory',
    sourceNo: order.inboundNo,
    remark: `采购收货暂估（GR/IR）${order.inboundNo}`,
    createdBy: order.operator || '系统',
  });
};

// ── B2 委外收货入库凭证 ───────────────────────────────────────
// 对标 SAP 委外收货（101 收成品 + 543 消耗组件）：成品价值 = 发出材料成本 + 加工费。
//   借 1405 库存商品            = totalCost（材料成本 + 加工费）
//   贷 1408 委托加工物资        = subcontractMaterialCost（发料时转出的材料成本）
//   贷 2201 GR/IR暂估（加工费） = totalCost - 材料成本
// 加工费走 GR/IR 暂估口径与采购一致，待供应商加工费发票校验时冲平确认应付。
const postSubcontractReceipt = (order: InboundOrder, totalCost: number): void => {
  if (order.type !== 'subcontract' || !totalCost || totalCost <= 0) return;
  const materialCost = roundAmount(order.subcontractMaterialCost || 0);
  const processFee = roundAmount(totalCost - materialCost);
  const financeStore = useFinanceStore.getState();
  const items: VoucherItem[] = [
    {
      id: `sub-rcv-${order.id}-d`, lineNo: 0,
      summary: `委外成品入库 ${order.inboundNo}`,
      accountCode: '1405', accountName: '库存商品', debit: totalCost, credit: 0,
    },
  ];
  if (materialCost > 0) {
    items.push({
      id: `sub-rcv-${order.id}-c1`, lineNo: 0,
      summary: `结转委外发出材料 ${order.sourceNo || order.inboundNo}`,
      accountCode: '1408', accountName: '委托加工物资', debit: 0, credit: materialCost,
    });
  }
  if (processFee > 0) {
    items.push({
      id: `sub-rcv-${order.id}-c2`, lineNo: 0,
      summary: `委外加工费暂估 ${order.vendorName || order.sourceNo || ''}`,
      accountCode: '2201', accountName: '物资采购（GR/IR暂估）', debit: 0, credit: processFee,
    });
  }
  // 只有一条借方（材料成本与加工费都为 0）时不成立分录，直接跳过
  if (items.length < 2) return;
  financeStore.createVoucher({
    date: order.inboundDate,
    items,
    source: 'inventory',
    sourceNo: order.inboundNo,
    remark: `委外收货入库（材料 ${materialCost} + 加工费 ${processFee}）${order.inboundNo}`,
    createdBy: order.operator || '系统',
  });
};

// ── B3 生产完工入库凭证 ───────────────────────────────────────
// 对标 SAP 生产收货（移动类型 101）：成品按「工单实际生产成本」入账。
//   借 1405 库存商品   = totalCost（工单 actualTotalCost，即完工实际生产成本）
//   贷 5001 生产成本   = totalCost（冲减归集的生产成本）
// 与 B2 委外收货（借1405/贷1408/贷2201）对称：同为「产出入库」，但自制件无委外发料与加工费暂估。
// 仅在 type==='production' 且 totalCost>0 时生成。
const postProductionReceipt = (order: InboundOrder, totalCost: number): void => {
  if (order.type !== 'production') return;
  const cost = roundAmount(order.totalCost || totalCost || 0);
  if (cost <= 0) return;
  const financeStore = useFinanceStore.getState();
  const items: VoucherItem[] = [
    {
      id: `prod-rcv-${order.id}-d`, lineNo: 0,
      summary: `生产完工入库 ${order.inboundNo}`,
      accountCode: '1405', accountName: '库存商品', debit: cost, credit: 0,
    },
    {
      id: `prod-rcv-${order.id}-c`, lineNo: 0,
      summary: `结转生产成本 ${order.sourceNo || order.inboundNo}`,
      accountCode: '5001', accountName: '生产成本', debit: 0, credit: cost,
    },
  ];
  financeStore.createVoucher({
    date: order.inboundDate,
    items,
    source: 'production',
    sourceNo: order.inboundNo,
    remark: `生产完工入库冲减生产成本（${cost}）${order.inboundNo}`,
    createdBy: order.operator || '系统',
  });
};

// ── A4-② 出库 COGS 凭证 ───────────────────────────────────────
// 出库过账时，按当前移动平均价结转成本：单价不变，只减库存数量与金额，
// 并自动生成凭证（借 6401 主营业务成本/5001 生产成本，贷 1405 库存商品/1403 原材料）。
// 返回回写后的出库行（带 unitCost / costAmount 快照），供入库单持久化留痕。
const postOutboundCost = (order: OutboundOrder): OutboundOrderItem[] => {
  if (!order.items || order.items.length === 0) return order.items;
  const materialStore = useMaterialStore.getState();
  const financeStore = useFinanceStore.getState();
  const voucherItems: VoucherItem[] = [];

  const enriched = order.items.map((item) => {
    const qty = item.quantity || 0;
    if (qty <= 0) return item;
    const material = materialStore.materials.find((m) => m.id === item.materialId);
    if (!material) return item;

    // 结转单价 = 当前移动平均价（未税，4 位精度）；兜底物料现行成本
    const unitCost = getUnitCost(material);
    const costAmount = roundAmount(qty * unitCost);

    // 回写物料主数据：数量与金额按移动平均价结转（单价不变），保持 金额≈数量×单价 恒等式
    const newStock = (material.currentStock || 0) - qty;
    const newVal = roundAmount((material.stockValue ?? getStockValue(material)) - costAmount);
    materialStore.updateMaterial(material.id, { currentStock: newStock, stockValue: newVal });

    // 凭证分录：生产领料走生产成本(5001)，委外发料走委托加工物资(1408)，销售/其他出库走主营业务成本(6401)
    if (order.type === 'subcontract') {
      // B2：对标 SAP 541 委外发料 —— 物料所有权仍在本企业，只是形态从「原材料」转为「委托加工物资」
      voucherItems.push({
        id: `cogs-${item.id}-d`, lineNo: 0,
        summary: `委外发料转出 ${material.name}`,
        accountCode: '1408', accountName: '委托加工物资', debit: costAmount, credit: 0,
      });
      voucherItems.push({
        id: `cogs-${item.id}-c`, lineNo: 0,
        summary: `原材料发出（委外）${material.name}`,
        accountCode: '1403', accountName: '原材料', debit: 0, credit: costAmount,
      });
    } else if (order.type === 'pick') {
      voucherItems.push({
        id: `cogs-${item.id}-d`, lineNo: 0,
        summary: `生产领料结转 ${material.name}`,
        accountCode: '5001', accountName: '生产成本', debit: costAmount, credit: 0,
      });
      voucherItems.push({
        id: `cogs-${item.id}-c`, lineNo: 0,
        summary: `原材料出库 ${material.name}`,
        accountCode: '1403', accountName: '原材料', debit: 0, credit: costAmount,
      });
    } else if (order.type === 'scrap') {
      // B4：报废出库 —— 不合格品 NCR 报废处置，直接扣减库存并确认报废损失
      // 借 6602 管理费用（报废损失），贷 1403 原材料（评估类=RAW）或 1405 库存商品（其他评估类）
      const creditCode = material.valuationClass === 'RAW' ? '1403' : '1405';
      const creditName = material.valuationClass === 'RAW' ? '原材料' : '库存商品';
      voucherItems.push({
        id: `cogs-${item.id}-d`, lineNo: 0,
        summary: `不合格品报废损失 ${material.name}`,
        accountCode: '6602', accountName: '管理费用', debit: costAmount, credit: 0,
      });
      voucherItems.push({
        id: `cogs-${item.id}-c`, lineNo: 0,
        summary: `存货报废转出 ${material.name}`,
        accountCode: creditCode, accountName: creditName, debit: 0, credit: costAmount,
      });
    } else {
      voucherItems.push({
        id: `cogs-${item.id}-d`, lineNo: 0,
        summary: `销售出库结转成本 ${material.name}`,
        accountCode: '6401', accountName: '主营业务成本', debit: costAmount, credit: 0,
      });
      voucherItems.push({
        id: `cogs-${item.id}-c`, lineNo: 0,
        summary: `库存商品出库 ${material.name}`,
        accountCode: '1405', accountName: '库存商品', debit: 0, credit: costAmount,
      });
    }
    return { ...item, unitCost, costAmount };
  });

  if (voucherItems.length > 0) {
    financeStore.createVoucher({
      date: order.outboundDate,
      items: voucherItems,
      source: order.type === 'scrap' ? 'scrap' : 'inventory',
      sourceNo: order.outboundNo,
      remark: `出库成本结转（${order.type}）${order.outboundNo}`,
      createdBy: order.operator || '系统',
    });
  }
  return enriched;
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
}

/** 新建/更新单据时自动打上当前组织 id（多组织上下文） */
const withOrg = <T extends { orgId?: string }>(entity: T): T => {
  const orgId = useOrgStore.getState().currentOrgId;
  return entity.orgId ? entity : { ...entity, orgId };
};

export const useWarehouseStore = create<WarehouseState>()(
  persist(
    (set) => ({
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
      addInboundOrder: (order) => {
        const o = withOrg(order);
        const alreadyPosted = useWarehouseStore
          .getState()
          .inboundOrders.some((x) => x.id === o.id && x.inventoryPosted);
        const shouldPost = o.status === 'completed' && !alreadyPosted;
        let costPosted = false;
        let totalCost = 0;
        if (shouldPost) {
          writeBackPurchaseReceipt(o);
          // 入库过账后滚动移动平均价（幂等：alreadyPosted 已过滤重复过账）
          totalCost = rollInboundCost(o);
          // A4-③ 采购收货生成 GR/IR 暂估凭证（借1403/贷2201）
          if (o.type === 'purchase') postInboundGRIREstimate(o, totalCost);
          // B2 委外收货生成成品入库凭证（借1405 / 贷1408 材料 + 贷2201 加工费暂估）
          if (o.type === 'subcontract') postSubcontractReceipt(o, totalCost);
          // B3 生产完工入库生成生产成本凭证（借1405 库存商品 / 贷5001 生产成本）
          if (o.type === 'production') postProductionReceipt(o, totalCost);
          costPosted = true;
        }
        set((state) => {
          const posted = shouldPost
            ? postInboundToInventory(state.inventoryRecords, state.batchRecords, o)
            : null;
          return {
            inboundOrders: [
              ...state.inboundOrders,
              {
                ...o,
                inventoryPosted: shouldPost ? true : o.inventoryPosted,
                costPosted: costPosted || o.costPosted,
                totalCost: totalCost || o.totalCost,
              },
            ],
            inventoryRecords: posted ? posted.inventoryRecords : state.inventoryRecords,
            batchRecords: posted ? posted.batchRecords : state.batchRecords,
          };
        });
      },
      updateInboundOrder: (id, updates) =>
        set((state) => {
          const prev = state.inboundOrders.find((o) => o.id === id);
          const next = state.inboundOrders.map((o) => (o.id === id ? { ...o, ...updates } : o));
          let inventoryRecords = state.inventoryRecords;
          let batchRecords = state.batchRecords;
          if (
            prev &&
            prev.status !== 'completed' &&
            updates.status === 'completed' &&
            !prev.inventoryPosted
          ) {
            const completed = next.find((o) => o.id === id)!;
            const posted = postInboundToInventory(inventoryRecords, batchRecords, completed);
            inventoryRecords = posted.inventoryRecords;
            batchRecords = posted.batchRecords;
            writeBackPurchaseReceipt(completed);
            // 入库过账后滚动移动平均价（幂等：!prev.costPosted 防止重复滚价）
            if (!prev.costPosted) {
              const totalCost = rollInboundCost(completed);
              // A4-③ 采购收货生成 GR/IR 暂估凭证（借1403/贷2201）
              if (completed.type === 'purchase') postInboundGRIREstimate(completed, totalCost);
              const idx = next.findIndex((o) => o.id === id);
              if (idx >= 0) next[idx] = { ...next[idx], costPosted: true, totalCost: totalCost || next[idx].totalCost };
            }
          }
          return { inboundOrders: next, inventoryRecords, batchRecords };
        }),
      deleteInboundOrder: (id) =>
        set((state) => ({ inboundOrders: state.inboundOrders.filter((o) => o.id !== id) })),

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
        set((state) => {
          const posted = shouldPost
            ? postOutboundToInventory(state.inventoryRecords, state.batchRecords, o)
            : null;
          return {
            outboundOrders: [
              ...state.outboundOrders,
              {
                ...o,
                items: enrichedItems,
                inventoryPosted: shouldPost ? true : o.inventoryPosted,
                cogsPosted: costPosted || o.cogsPosted,
              },
            ],
            inventoryRecords: posted ? posted.inventoryRecords : state.inventoryRecords,
            batchRecords: posted ? posted.batchRecords : state.batchRecords,
          };
        });
      },
      updateOutboundOrder: (id, updates) =>
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
        }),
      deleteOutboundOrder: (id) =>
        set((state) => ({ outboundOrders: state.outboundOrders.filter((o) => o.id !== id) })),

      // CheckTask CRUD
      addCheckTask: (task) =>
        set((state) => ({ checkTasks: [...state.checkTasks, withOrg(task)] })),
      updateCheckTask: (id, updates) =>
        set((state) => ({
          checkTasks: state.checkTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteCheckTask: (id) =>
        set((state) => ({ checkTasks: state.checkTasks.filter((t) => t.id !== id) })),

      // 盘点过账：根据盘点差异（countQuantity - bookQuantity）调整库存，并标记任务完成
      postCheckAdjustment: (taskId, items) =>
        set((state) => {
          const task = state.checkTasks.find((t) => t.id === taskId);
          const whId = task?.warehouseId || '';
          const whName = task?.warehouseName || '';
          const today = new Date().toISOString().slice(0, 10);
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
          return {
            inventoryRecords: records,
            checkTasks: state.checkTasks.map((t) =>
              t.id === taskId ? { ...t, status: 'completed', items, endDate: today } : t
            ),
          };
        }),

      // Batch CRUD
      addBatchRecord: (batch) =>
        set((state) => ({ batchRecords: [...state.batchRecords, withOrg(batch)] })),
      updateBatchRecord: (id, updates) =>
        set((state) => ({
          batchRecords: state.batchRecords.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      deleteBatchRecord: (id) =>
        set((state) => ({ batchRecords: state.batchRecords.filter((b) => b.id !== id) })),

      // Finished Goods Inbound CRUD
      addFinishedGoodsInbound: (order) =>
        set((state) => ({ finishedGoodsInbounds: [...state.finishedGoodsInbounds, withOrg(order)] })),
      updateFinishedGoodsInbound: (id, updates) =>
        set((state) => ({
          finishedGoodsInbounds: state.finishedGoodsInbounds.map((o) => (o.id === id ? { ...o, ...updates } : o)),
        })),
      deleteFinishedGoodsInbound: (id) =>
        set((state) => ({ finishedGoodsInbounds: state.finishedGoodsInbounds.filter((o) => o.id !== id) })),

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
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-warehouse',
      version: 1,
      // 只持久化业务数据，UI 选中态不落盘
      partialize: (state) => ({
        inboundOrders: state.inboundOrders,
        outboundOrders: state.outboundOrders,
        checkTasks: state.checkTasks,
        inventoryRecords: state.inventoryRecords,
        inventoryAlerts: state.inventoryAlerts,
        batchRecords: state.batchRecords,
        finishedGoodsInbounds: state.finishedGoodsInbounds,
      }),
    }
  )
);
