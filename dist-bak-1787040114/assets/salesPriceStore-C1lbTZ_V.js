import { a as create, p as persist } from "./vendor-DGU5TO-x.js";
import { l as backendStorage, s as currentUser } from "./index-DeeqqmHA.js";
import { u as useConditionStore } from "./conditionStore-D-IHrlNs.js";
const AUDIT_ACTION_LABELS = {
  create: "新增",
  update: "修改",
  delete: "删除",
  login: "登录",
  export: "导出",
  approve: "审批"
};
const MAX_RECORDS = 500;
const useAuditStore = create()(
  persist(
    (set) => ({
      records: [],
      recordAudit: ({ entity, entityId, action, summary }) => {
        const u = currentUser();
        const rec = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          entity,
          entityId,
          action,
          summary,
          userId: u.userId,
          userName: u.userName,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        set((state) => ({ records: [rec, ...state.records].slice(0, MAX_RECORDS) }));
        return rec;
      },
      clearAudit: () => set({ records: [] })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-audit",
      version: 1
    }
  )
);
const recordAudit = (input) => useAuditStore.getState().recordAudit(input);
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const inPeriod = (from, to) => {
  const t = todayStr();
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
};
const seedPriceList = [
  {
    id: "sp-seed-1",
    customerId: "cus-001",
    customerName: "华润建筑集团有限公司",
    materialId: "mat-001",
    materialCode: "MAT202405010001",
    materialName: "钢板 Q235B",
    specification: "Q235B",
    unit: "吨",
    basePrice: 4200,
    discountRate: 10,
    // 给华润建筑 9 折
    tiers: [
      { minQty: 50, unitPrice: 4050 },
      { minQty: 100, unitPrice: 3950 }
    ],
    currency: "CNY",
    status: "active"
  },
  {
    id: "sp-seed-2",
    materialId: "mat-002",
    materialCode: "MAT202405010002",
    materialName: "无缝钢管",
    basePrice: 5200,
    discountRate: 5,
    status: "active"
  }
];
const seedPromotions = [
  {
    id: "promo-seed-1",
    name: "夏季促销-钢板立减200",
    type: "amount",
    value: 200,
    materialId: "mat-001",
    start: "2026-06-01",
    end: "2026-12-31",
    enabled: true
  }
];
const useSalesPriceStore = create()(
  persist(
    (set, get) => ({
      priceList: [...seedPriceList],
      promotions: [...seedPromotions],
      addPriceItem: (item) => {
        const id = uid("sp");
        set((s) => ({ priceList: [...s.priceList, { ...item, id }] }));
        recordAudit({
          entity: "salesPrice",
          entityId: id,
          action: "create",
          summary: `新增销售价目表项：${item.materialName || item.materialId}${item.customerName ? ` / ${item.customerName}` : " / 通用"}`
        });
      },
      updatePriceItem: (id, patch) => {
        set((s) => ({ priceList: s.priceList.map((p) => p.id === id ? { ...p, ...patch } : p) }));
        recordAudit({ entity: "salesPrice", entityId: id, action: "update", summary: `修改销售价目表项 ${id}` });
      },
      deletePriceItem: (id) => {
        set((s) => ({ priceList: s.priceList.filter((p) => p.id !== id) }));
        recordAudit({ entity: "salesPrice", entityId: id, action: "delete", summary: `删除销售价目表项 ${id}` });
      },
      addPromotion: (p) => {
        const id = uid("promo");
        set((s) => ({ promotions: [...s.promotions, { ...p, id }] }));
        recordAudit({ entity: "salesPromotion", entityId: id, action: "create", summary: `新增促销活动：${p.name}` });
      },
      updatePromotion: (id, patch) => {
        set((s) => ({ promotions: s.promotions.map((p) => p.id === id ? { ...p, ...patch } : p) }));
        recordAudit({ entity: "salesPromotion", entityId: id, action: "update", summary: `修改促销活动 ${id}` });
      },
      deletePromotion: (id) => {
        set((s) => ({ promotions: s.promotions.filter((p) => p.id !== id) }));
        recordAudit({ entity: "salesPromotion", entityId: id, action: "delete", summary: `删除促销活动 ${id}` });
      },
      resolvePrice: (customerId, materialId, qty, basePrice) => {
        const items = get().priceList.filter(
          (p) => p.status !== "inactive" && p.materialId === materialId && inPeriod(p.effectiveFrom, p.effectiveTo)
        );
        const match = items.find((p) => p.customerId && p.customerId === customerId) ?? items.find((p) => !p.customerId) ?? null;
        let unitPrice = basePrice;
        let discountRate = 0;
        if (match) {
          discountRate = match.discountRate || 0;
          const tiers = [...match.tiers ?? []].sort((a, b) => a.minQty - b.minQty);
          const hitTier = tiers.filter((t) => qty >= t.minQty).pop();
          unitPrice = hitTier ? hitTier.unitPrice : basePrice * (1 - discountRate / 100);
        }
        let promotionApplied = null;
        const activePromos = get().promotions.filter(
          (p) => p.enabled && inPeriod(p.start, p.end) && (p.customerId ? p.customerId === customerId : true) && (p.materialId ? p.materialId === materialId : true)
        );
        for (const promo of activePromos) {
          let next = unitPrice;
          if (promo.type === "percent") next = unitPrice * (1 - promo.value / 100);
          else if (promo.type === "amount") next = unitPrice - promo.value;
          else if (promo.type === "fixed") next = promo.value;
          if (next < unitPrice && next >= 0) {
            unitPrice = next;
            promotionApplied = promo.name;
          }
        }
        const { finalPrice: condPrice } = useConditionStore.getState().resolvePrice(
          customerId,
          materialId,
          qty,
          unitPrice
        );
        unitPrice = condPrice;
        return { unitPrice, discountRate, promotionApplied, finalPrice: unitPrice };
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-sales-price",
      version: 1
    }
  )
);
export {
  AUDIT_ACTION_LABELS as A,
  useAuditStore as a,
  useSalesPriceStore as u
};
