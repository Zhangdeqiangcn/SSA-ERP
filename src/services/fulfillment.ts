import type { NormalizedOrderLine } from './channels/types';

// 仓储执行领域纯函数（与网络/前端框架解耦，便于单测与复用）
// 对标聚水潭 WMS：波次 → 拣货 → 配货 → 打包 → 发货校验

export type PickTaskStatus = 'pending' | 'picking' | 'done' | 'skipped';
export type ShipMismatchType = 'missing' | 'qty' | 'extra' | 'barcode';

export interface PickTask {
  id: string;
  waveId?: string;
  orderHubId?: string;
  materialCode: string;
  materialName?: string;
  locationId?: string;
  locationName?: string;
  barcode?: string;
  requiredQty: number;
  pickedQty: number;
  status: PickTaskStatus;
}

export interface ShipScanItem {
  materialCode: string;
  quantity: number;
  barcode?: string;
}

export interface ShipMismatch {
  materialCode: string;
  expected: number;
  actual: number;
  type: ShipMismatchType;
}

export interface ShipCheckResult {
  pass: boolean;
  mismatches: ShipMismatch[];
}

/**
 * 从待发货订单集合聚合生成拣货任务：相同物料编码合并应拣数量。
 * 库位/条码运行时由库存与物料主数据反查填充（此处只做 SKU 级聚合）。
 */
export function buildPickTasks(
  orders: { id: string; lines: NormalizedOrderLine[] }[]
): Omit<PickTask, 'id' | 'status'>[] {
  const map = new Map<string, Omit<PickTask, 'id' | 'status'>>();
  for (const o of orders) {
    for (const l of o.lines) {
      const existing = map.get(l.sku);
      if (existing) existing.requiredQty += l.quantity;
      else
        map.set(l.sku, {
          orderHubId: o.id,
          waveId: '',
          materialCode: l.sku,
          materialName: l.name,
          requiredQty: l.quantity,
          pickedQty: 0,
        });
    }
  }
  return [...map.values()];
}

/**
 * 拣货确认：校验条码与数量，返回更新后的任务或明确错误。
 * 关键纪律：校验失败必须显式返回错误，绝不静默吞掉（防止错拣漏拣流入下一环节）。
 */
export function applyPick(
  task: PickTask,
  scannedQty: number,
  scannedBarcode?: string
): { ok: true; task: PickTask } | { ok: false; error: string } {
  if (scannedBarcode && task.barcode && scannedBarcode !== task.barcode) {
    return { ok: false, error: `条码不符：扫到 ${scannedBarcode}，应为 ${task.barcode}` };
  }
  if (!Number.isFinite(scannedQty) || scannedQty <= 0) {
    return { ok: false, error: '拣货数量必须为正数' };
  }
  const remain = task.requiredQty - task.pickedQty;
  if (scannedQty > remain) {
    return { ok: false, error: `超出应拣数量：应拣剩余 ${remain}，实拣 ${scannedQty}` };
  }
  const pickedQty = task.pickedQty + scannedQty;
  const status: PickTaskStatus = pickedQty >= task.requiredQty ? 'done' : 'picking';
  return { ok: true, task: { ...task, pickedQty, status } };
}

/**
 * 发货校验：订单行 vs 实扫清单逐项比对（数量 / 条码）。
 * 不通过时返回完整不符明细（missing=漏扫 / qty=数量错 / extra=多扫 / barcode=条码错），
 * 绝不静默放行（聚水潭发货前强校验的立身之本）。
 */
export function checkShipment(
  orderLines: NormalizedOrderLine[],
  scanList: ShipScanItem[]
): ShipCheckResult {
  const expected = new Map<string, number>();
  for (const l of orderLines) expected.set(l.sku, (expected.get(l.sku) || 0) + l.quantity);
  const actual = new Map<string, number>();
  for (const s of scanList) actual.set(s.materialCode, (actual.get(s.materialCode) || 0) + s.quantity);

  const mismatches: ShipMismatch[] = [];
  for (const [code, qty] of expected) {
    const got = actual.get(code) || 0;
    if (got !== qty) {
      mismatches.push({ materialCode: code, expected: qty, actual: got, type: got === 0 ? 'missing' : 'qty' });
    }
  }
  for (const [code, qty] of actual) {
    if (!expected.has(code)) mismatches.push({ materialCode: code, expected: 0, actual: qty, type: 'extra' });
  }
  for (const s of scanList) {
    const line = orderLines.find((l) => l.sku === s.materialCode) as any;
    if (line && line.barcode && s.barcode && line.barcode !== s.barcode) {
      mismatches.push({ materialCode: s.materialCode, expected: -1, actual: -1, type: 'barcode' });
    }
  }
  return { pass: mismatches.length === 0, mismatches };
}

export default { buildPickTasks, applyPick, checkShipment };
