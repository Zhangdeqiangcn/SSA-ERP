import { computeSupply } from './supply';
import { InventoryRecord, SalesOrder, InboundOrder, QualityHold, Material, ATPResult } from '@/types';

export interface ATPInput {
  materialId: string;
  warehouseId?: string;
  material?: Material;
  inventoryRecords: InventoryRecord[];
  salesOrders: SalesOrder[];
  inboundOrders: InboundOrder[]; // 计划/在途采购入库（计算 incoming）
  qualityHolds?: QualityHold[];
}

/**
 * 可用量承诺（ATP, Available To Promise）
 * 思路：当前在手 = 库存实物 - 在检扣留；承诺 = 未发运销售订单需求量；
 * 在途 = 未完成的采购入库；按入库日期做时间分层的可用量预测。
 */
export function computeATP(input: ATPInput): ATPResult[] {
  const { materialId, warehouseId, material, inventoryRecords, salesOrders, inboundOrders, qualityHolds = [] } = input;

  const inWh = (r: { warehouseId: string }) => !warehouseId || r.warehouseId === warehouseId;

  // ★ V3.47.0 3-04：当前在手改走统一供应量口径（computeSupply）——
  //   本文件此前自己算了一份「库存 − 在检扣留」，MRP 与缺料预警各算各的，
  //   于是同一物料在不同页面报出不同可用量。现在三者共用 utils/supply.ts。
  //   仓库过滤先做一次，避免把别仓的扣留单算进来。
  const supply = computeSupply({
    material,
    inventoryRecords: inventoryRecords.filter((r) => r.materialId === materialId && inWh(r)),
    qualityHolds: qualityHolds.filter((h) => h.materialId === materialId && inWh(h as unknown as { warehouseId: string })),
  });
  const onHand = supply.availableQty;

  // 承诺：未完工销售订单的未发运量
  const committed = salesOrders
    .filter((o) => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'fully_shipped')
    .flatMap((o) => o.items)
    .filter((it) => it.materialId === materialId)
    .reduce((s, it) => s + Math.max(0, (it.quantity || 0) - (it.deliveredQuantity || 0)), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const base: ATPResult = {
    materialId,
    materialCode: material?.code || '',
    materialName: material?.name || '',
    warehouseId,
    date: todayStr,
    onHand,
    committed,
    incoming: 0,
    availableQty: Math.max(0, onHand - committed),
  };

  // 在途采购入库（未按计划完成）按入库日期分层
  const incomingByDate = new Map<string, number>();
  inboundOrders
    .filter((o) => o.type === 'purchase' && o.status !== 'completed')
    .forEach((o) => {
      o.items
        .filter((it) => it.materialId === materialId)
        .forEach((it) => {
          const d = o.inboundDate || todayStr;
          incomingByDate.set(d, (incomingByDate.get(d) || 0) + (it.expectedQuantity || 0));
        });
    });

  const rows: ATPResult[] = [base];
  let running = base.availableQty;
  Array.from(incomingByDate.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .forEach(([date, qty]) => {
      running += qty;
      rows.push({
        materialId,
        materialCode: material?.code || '',
        materialName: material?.name || '',
        warehouseId,
        date,
        onHand,
        committed,
        incoming: qty,
        availableQty: running,
      });
    });

  return rows;
}
