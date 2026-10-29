import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import type {
  SalesPriceListItem,
  SalesPromotion,
  ResolvedSalesPrice,
  SalesPriceTier,
} from '@/types';
import { recordAudit } from './auditStore';
import { useConditionStore } from './conditionStore';
import { parsePayload, splitByKind, withKind, writeRow } from './entityBackedShared';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

// 判断是否在生效期内（effectiveFrom / effectiveTo 缺省视为不限）
const inPeriod = (from?: string, to?: string): boolean => {
  const t = todayStr();
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
};

// ───────── 种子数据（演示用） ─────────
const seedPriceList: SalesPriceListItem[] = [
  {
    id: 'sp-seed-1',
    customerId: 'cus-001',
    customerName: '华润建筑集团有限公司',
    materialId: 'mat-001',
    materialCode: 'MAT202405010001',
    materialName: '钢板 Q235B',
    specification: 'Q235B',
    unit: '吨',
    basePrice: 4200,
    discountRate: 10, // 给华润建筑 9 折
    tiers: [
      { minQty: 50, unitPrice: 4050 },
      { minQty: 100, unitPrice: 3950 },
    ],
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'sp-seed-2',
    materialId: 'mat-002',
    materialCode: 'MAT202405010002',
    materialName: '无缝钢管',
    basePrice: 5200,
    discountRate: 5,
    status: 'active',
  },
];

const seedPromotions: SalesPromotion[] = [
  {
    id: 'promo-seed-1',
    name: '夏季促销-钢板立减200',
    type: 'amount',
    value: 200,
    materialId: 'mat-001',
    start: '2026-06-01',
    end: '2026-12-31',
    enabled: true,
  },
];

const RES = 'salesPrice';

interface SalesPriceState {
  priceList: SalesPriceListItem[];
  promotions: SalesPromotion[];
  addPriceItem: (item: Omit<SalesPriceListItem, 'id'>) => void;
  updatePriceItem: (id: string, patch: Partial<SalesPriceListItem>) => void;
  deletePriceItem: (id: string) => void;
  addPromotion: (p: Omit<SalesPromotion, 'id'>) => void;
  updatePromotion: (id: string, patch: Partial<SalesPromotion>) => void;
  deletePromotion: (id: string) => void;
  // 取价核心：客户 + 物料 + 数量 → 折扣/阶梯/促销后的最终单价
  resolvePrice: (
    customerId: string | undefined,
    materialId: string,
    qty: number,
    basePrice: number,
  ) => ResolvedSalesPrice;
  /** V3.77.0：从 D1 水合 */
  hydrateSalesPrice: () => Promise<void>;
}

export const useSalesPriceStore = create<SalesPriceState>()((set, get) => ({
  priceList: [...seedPriceList],
  promotions: [...seedPromotions],

  addPriceItem: (item) => {
    const id = uid('sp');
    const full = { ...item, id };
    set((s) => ({ priceList: [...s.priceList, full] }));
    recordAudit({
      entity: 'salesPrice',
      entityId: id,
      action: 'create',
      summary: `新增销售价目表项：${item.materialName || item.materialId}${item.customerName ? ` / ${item.customerName}` : ' / 通用'}`,
    });
    if (isAuthed()) writeRow(RES, id, withKind('price', full));
  },
  updatePriceItem: (id, patch) => {
    set((s) => ({ priceList: s.priceList.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    const cur = get().priceList.find((p) => p.id === id);
    if (cur && isAuthed()) writeRow(RES, id, withKind('price', cur));
    recordAudit({ entity: 'salesPrice', entityId: id, action: 'update', summary: `修改销售价目表项 ${id}` });
  },
  deletePriceItem: (id) => {
    set((s) => ({ priceList: s.priceList.filter((p) => p.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
    recordAudit({ entity: 'salesPrice', entityId: id, action: 'delete', summary: `删除销售价目表项 ${id}` });
  },

  addPromotion: (p) => {
    const id = uid('promo');
    const full = { ...p, id };
    set((s) => ({ promotions: [...s.promotions, full] }));
    recordAudit({ entity: 'salesPromotion', entityId: id, action: 'create', summary: `新增促销活动：${p.name}` });
    if (isAuthed()) writeRow(RES, id, withKind('promo', full));
  },
  updatePromotion: (id, patch) => {
    set((s) => ({ promotions: s.promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    const cur = get().promotions.find((p) => p.id === id);
    if (cur && isAuthed()) writeRow(RES, id, withKind('promo', cur));
    recordAudit({ entity: 'salesPromotion', entityId: id, action: 'update', summary: `修改促销活动 ${id}` });
  },
  deletePromotion: (id) => {
    set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
    recordAudit({ entity: 'salesPromotion', entityId: id, action: 'delete', summary: `删除促销活动 ${id}` });
  },

  resolvePrice: (customerId, materialId, qty, basePrice) => {
    const items = get().priceList.filter(
      (p) => p.status !== 'inactive' && p.materialId === materialId && inPeriod(p.effectiveFrom, p.effectiveTo),
    );
    // 优先客户专属价目表，其次通用物料价目表
    const match =
      items.find((p) => p.customerId && p.customerId === customerId) ??
      items.find((p) => !p.customerId) ??
      null;

    let unitPrice = basePrice;
    let discountRate = 0;
    if (match) {
      discountRate = match.discountRate || 0;
      const tiers: SalesPriceTier[] = [...(match.tiers ?? [])].sort((a, b) => a.minQty - b.minQty);
      const hitTier = tiers.filter((t) => qty >= t.minQty).pop();
      unitPrice = hitTier ? hitTier.unitPrice : basePrice * (1 - discountRate / 100);
    }

    // 促销叠加（取使单价更低者）
    let promotionApplied: string | null = null;
    const activePromos = get().promotions.filter(
      (p) =>
        p.enabled &&
        inPeriod(p.start, p.end) &&
        (p.customerId ? p.customerId === customerId : true) &&
        (p.materialId ? p.materialId === materialId : true),
    );
    for (const promo of activePromos) {
      let next = unitPrice;
      if (promo.type === 'percent') next = unitPrice * (1 - promo.value / 100);
      else if (promo.type === 'amount') next = unitPrice - promo.value;
      else if (promo.type === 'fixed') next = promo.value;
      if (next < unitPrice && next >= 0) {
        unitPrice = next;
        promotionApplied = promo.name;
      }
    }

    // P1-04 条件技术引擎叠加：查询匹配的条件记录
    const { finalPrice: condPrice } = useConditionStore.getState().resolvePrice(
      customerId,
      materialId,
      qty,
      unitPrice,
    );
    unitPrice = condPrice;

    return { unitPrice, discountRate, promotionApplied, finalPrice: unitPrice };
  },

  hydrateSalesPrice: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload(res?.data || []);
      if (rows.length === 0) {
        for (const p of seedPriceList) writeRow(RES, p.id, withKind('price', p));
        for (const pr of seedPromotions) writeRow(RES, pr.id, withKind('promo', pr));
        const rf = await entityRepo.list(RES, { page: 1, pageSize: 500 });
        const r2 = parsePayload(rf?.data || []);
        set({
          priceList: splitByKind<SalesPriceListItem>(r2, 'price'),
          promotions: splitByKind<SalesPromotion>(r2, 'promo'),
        });
        return;
      }
      set({
        priceList: splitByKind<SalesPriceListItem>(rows, 'price'),
        promotions: splitByKind<SalesPromotion>(rows, 'promo'),
      });
    } catch {
      // 离线/异常：保留本地种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useSalesPriceStore.getState().hydrateSalesPrice();
