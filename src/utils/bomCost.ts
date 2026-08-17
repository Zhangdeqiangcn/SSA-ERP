import { useMaterialStore } from '@/stores/materialStore';
import { useBOMStore } from '@/stores/bomStore';
import { BOMHeader, BOMItem } from '@/types/bom';

// 递归深度上限，避免 BOM 自引用造成的死循环
export const MAX_ROLLUP_DEPTH = 10;

export interface CostLine {
  itemId: string;
  code: string;
  name: string;
  qty: number;
  unit: string;
  unitCost: number;
  materialCost: number;
  laborCost: number;
  extendedCost: number;
  isChildAssembly: boolean;
  level: number;
  breakdown?: CostLine[];
}

export interface RollupResult {
  bomId: string;
  bomNo: string;
  productName: string;
  lines: CostLine[];
  materialCost: number;
  laborCost: number;
  totalCost: number;
}

const EMPTY_RESULT: RollupResult = {
  bomId: '',
  bomNo: '',
  productName: '',
  lines: [],
  materialCost: 0,
  laborCost: 0,
  totalCost: 0,
};

function resolveItems(bom: BOMHeader): BOMItem[] {
  if (bom.items && bom.items.length) return bom.items;
  return useBOMStore.getState().bomTreeData;
}

function rollupItem(
  item: BOMItem,
  depth: number
): CostLine {
  const labor = (item.laborCost ?? 0) + (item.processCost ?? 0);
  let materialCost = 0;
  let breakdown: CostLine[] | undefined;

  if (item.childProductCode) {
    // 子装配：递归卷积其 BOM 的总成本 * 数量
    const childBOM = useBOMStore.getState().getBOMByProductCode(item.childProductCode);
    if (childBOM) {
      const child = computeBOMCost(childBOM.id, depth + 1);
      materialCost = child.totalCost * item.quantity;
      breakdown = child.lines;
    }
  } else {
    // 普通物料：materialStore 中的最新价格 * 用量
    const materials = useMaterialStore.getState().materials;
    const mat =
      materials.find((m) => m.id === item.materialId) ||
      materials.find((m) => m.code === item.materialCode);
    const price = mat ? mat.price : item.unitCost ?? 0;
    materialCost = price * item.quantity;
  }

  const extended = materialCost + labor;
  return {
    itemId: item.id,
    code: item.materialCode,
    name: item.materialName,
    qty: item.quantity,
    unit: item.unit,
    unitCost: item.quantity ? materialCost / item.quantity : 0,
    materialCost,
    laborCost: labor,
    extendedCost: extended,
    isChildAssembly: Boolean(item.childProductCode),
    level: item.level ?? depth,
    breakdown,
  };
}

/**
 * 递归卷积一个 BOM 的成本（按 BOM id）。
 * - 物料项：materialStore 价格 * 用量
 * - 子装配项：递归子 BOM 总成本 * 用量
 * - 含 per-item 人工/工序成本
 * - 递归深度上限 MAX_ROLLUP_DEPTH
 */
export function computeBOMCost(bomId: string, depth = 0): RollupResult {
  if (depth > MAX_ROLLUP_DEPTH) return EMPTY_RESULT;

  const bom = useBOMStore.getState().getBOMById(bomId);
  if (!bom) return EMPTY_RESULT;

  const items = resolveItems(bom);
  const lines: CostLine[] = [];
  let materialCost = 0;
  let laborCost = 0;

  for (const item of items) {
    const line = rollupItem(item, depth);
    lines.push(line);
    materialCost += line.materialCost;
    laborCost += line.laborCost;
  }

  return {
    bomId: bom.id,
    bomNo: bom.bomNo,
    productName: bom.productName,
    lines,
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost,
  };
}
