import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage, c as useWarehouseStore, t as round2, f as useFinanceStore, b as usePurchaseStore, D as DEFAULT_TAX_RATE } from "./index-hTLNcGoC.js";
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const seedFrameworks = [
  {
    id: "fa-seed-1",
    agreementNo: "FA-2026-0001",
    vendorId: "ven-001",
    vendorName: "宝钢股份",
    status: "active",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    currency: "CNY",
    totalCeiling: 5e6,
    releasedAmount: 0,
    items: [
      { id: "fai-1", materialId: "mat-001", materialCode: "STEEL-001", materialName: "Q345 钢板", unit: "kg", ceilingPrice: 42, committedQty: 0 }
    ],
    releases: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    createdBy: "采购员",
    updatedBy: "采购员"
  }
];
const usePurchaseAdvancedStore = create()(
  persist(
    (set, get) => ({
      frameworkAgreements: [...seedFrameworks],
      purchaseReturns: [],
      // ── 框架协议 ──
      addFramework: (a) => set((s) => ({ frameworkAgreements: [...s.frameworkAgreements, a] })),
      updateFramework: (id, u) => set((s) => ({ frameworkAgreements: s.frameworkAgreements.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteFramework: (id) => set((s) => ({ frameworkAgreements: s.frameworkAgreements.filter((x) => x.id !== id) })),
      // 框架释放 → 采购订单
      releaseFramework: (agreementId, release) => {
        const fa = get().frameworkAgreements.find((x) => x.id === agreementId);
        if (!fa || fa.status !== "active") return null;
        const stamp = Date.now();
        const orderNo = `PO-2026-${stamp}`;
        const poId = `po-${stamp}`;
        const po = {
          id: poId,
          orderNo,
          vendorId: fa.vendorId,
          vendorName: fa.vendorName,
          status: "confirmed",
          orderDate: release.date,
          expectedDeliveryDate: release.date,
          items: fa.items.map((it) => ({
            id: `poi-${it.id}-${stamp}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            specification: "",
            unit: it.unit,
            orderedQuantity: it.committedQty,
            deliveredQuantity: 0,
            unitPrice: it.ceilingPrice,
            amount: it.ceilingPrice * it.committedQty
          })),
          totalAmount: fa.items.reduce((s, it) => s + it.ceilingPrice * it.committedQty, 0),
          remarks: `框架协议释放 ${fa.agreementNo}`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "采购员",
          updatedBy: "采购员"
        };
        usePurchaseStore.getState().addPurchaseOrder(po);
        const rel = { ...release, poNo: orderNo };
        set((s) => ({
          frameworkAgreements: s.frameworkAgreements.map(
            (x) => x.id === agreementId ? {
              ...x,
              releasedAmount: x.releasedAmount + release.amount,
              releases: [...x.releases, rel],
              updatedAt: today()
            } : x
          )
        }));
        return poId;
      },
      // ── 采购退货 ──
      addReturn: (r) => set((s) => ({ purchaseReturns: [...s.purchaseReturns, r] })),
      updateReturn: (id, u) => set((s) => ({ purchaseReturns: s.purchaseReturns.map((x) => x.id === id ? { ...x, ...u, updatedAt: today() } : x) })),
      deleteReturn: (id) => set((s) => ({ purchaseReturns: s.purchaseReturns.filter((x) => x.id !== id) })),
      // 退货完成 → 红字出库(退供应商) + 应付冲销(AP)
      completeReturn: (returnId) => {
        const r = get().purchaseReturns.find((x) => x.id === returnId);
        if (!r || r.status === "completed") return;
        const stamp = Date.now();
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-ret-${stamp}`,
          outboundNo: `OB-RET-${stamp}`,
          type: "return",
          sourceNo: r.returnNo,
          vendorId: r.vendorId,
          vendorName: r.vendorName,
          status: "completed",
          warehouseId: "wh-001",
          operator: "当前用户",
          outboundDate: r.returnDate,
          items: r.items.map((it) => ({
            id: `obi-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            quantity: it.quantity
          })),
          remarks: `采购退货 ${r.returnNo}`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "当前用户",
          updatedBy: "当前用户"
        });
        const rateOf = (materialId) => {
          const po = usePurchaseStore.getState().purchaseOrders.find((o) => o.orderNo === r.purchaseOrderNo);
          const it = po == null ? void 0 : po.items.find((i) => i.materialId === materialId);
          return typeof (it == null ? void 0 : it.taxRate) === "number" ? it.taxRate : DEFAULT_TAX_RATE;
        };
        const apTax = round2(r.items.reduce((s, it) => s + it.amount * rateOf(it.materialId) / 100, 0));
        const apGross = round2(r.totalAmount + apTax);
        const voucherNo = `V-APCN-${r.returnNo}-${stamp}`;
        const entries = [
          {
            id: `aep-${stamp}-1`,
            entryNo: `JEAPCN${stamp}1`,
            date: r.returnDate,
            description: `采购退货冲应付 ${r.returnNo}`,
            debitAccount: "应付账款",
            creditAccount: "",
            amount: apGross,
            currency: "CNY",
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          },
          {
            id: `aep-${stamp}-2`,
            entryNo: `JEAPCN${stamp}2`,
            date: r.returnDate,
            description: `红冲原材料 ${r.returnNo}`,
            debitAccount: "",
            creditAccount: "原材料",
            amount: r.totalAmount,
            currency: "CNY",
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          },
          {
            id: `aep-${stamp}-3`,
            entryNo: `JEAPCN${stamp}3`,
            date: r.returnDate,
            description: `红冲进项税额 ${r.returnNo}`,
            debitAccount: "",
            creditAccount: "应交税费-应交增值税",
            amount: apTax,
            currency: "CNY",
            voucherNo,
            createdBy: "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedBy: "当前用户"
          }
        ];
        entries.forEach((e) => useFinanceStore.getState().addAccountEntry(e));
        set((s) => ({
          purchaseReturns: s.purchaseReturns.map((x) => x.id === returnId ? { ...x, status: "completed", voucherNo } : x)
        }));
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-purchase-adv",
      version: 1,
      partialize: (state) => ({
        frameworkAgreements: state.frameworkAgreements,
        purchaseReturns: state.purchaseReturns
      })
    }
  )
);
export {
  usePurchaseAdvancedStore as u
};
