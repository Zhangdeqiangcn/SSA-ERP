var _a;
import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage, d as useQualityStore, b as usePurchaseStore, j as useSettingsStore, c as useWarehouseStore } from "./index-CU2cqxc8.js";
import { u as useWarehouseAdvancedStore } from "./warehouseAdvancedStore-D-kOSyQs.js";
import { b as buildVendorRatingInput, c as computeVendorRating } from "./vendorRating-DKHWnbxs.js";
import { u as usePriceStore } from "./priceStore-DijJfeBL.js";
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const seedCOQ = [
  { id: "coq-seed-1", period: "2026-07", category: "prevention", costCenter: "质量部", amount: 12e3, note: "质量培训", createdAt: today(), updatedAt: today(), createdBy: "质量部", updatedBy: "质量部" },
  { id: "coq-seed-2", period: "2026-07", category: "appraisal", costCenter: "质检中心", amount: 18e3, note: "来料检验", createdAt: today(), updatedAt: today(), createdBy: "质量部", updatedBy: "质量部" }
];
const useQualityAdvancedStore = create()(
  persist(
    (set, get) => ({
      inspectionLots: [],
      coqRecords: [...seedCOQ],
      qmVendorFeedback: [],
      // ── 检验批 ──
      addInspectionLot: (lot) => set((s) => ({ inspectionLots: [...s.inspectionLots, lot] })),
      updateInspectionLot: (id, u) => set((s) => ({ inspectionLots: s.inspectionLots.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteInspectionLot: (id) => set((s) => ({ inspectionLots: s.inspectionLots.filter((x) => x.id !== id) })),
      // 采购入库完成 → 自动生成检验批 + 质检扣留
      autoCreateLotsFromInbound: (inbound) => {
        if (inbound.type !== "purchase" || inbound.status !== "completed") return;
        const stamp = Date.now();
        const lots = inbound.items.map((it, i) => ({
          id: `lot-${stamp}-${i}`,
          lotNo: `LOT-${inbound.inboundNo}-${i + 1}`,
          sourceType: "inbound",
          sourceNo: inbound.inboundNo,
          materialId: it.materialId,
          materialCode: it.materialCode || "",
          materialName: it.materialName || "",
          batchNo: it.batchNo,
          quantity: it.quantity,
          vendorId: inbound.vendorId,
          vendorName: inbound.vendorName,
          status: "pending",
          createdFrom: "采购入库自动生成",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "系统",
          updatedBy: "系统"
        }));
        const holds = lots.map((lot) => ({
          id: `qh-${lot.id}`,
          materialId: lot.materialId,
          materialCode: lot.materialCode,
          materialName: lot.materialName,
          warehouseId: "wh-001",
          batchNo: lot.batchNo,
          quantity: lot.quantity,
          status: "pending",
          sourceInboundNo: inbound.inboundNo,
          holdDate: today(),
          reason: "采购入库待检"
        }));
        set((s) => ({ inspectionLots: [...s.inspectionLots, ...lots] }));
        holds.forEach((h) => useWarehouseAdvancedStore.getState().addQualityHold(h));
      },
      // 判定检验批结果
      judgeLot: (lotId, status, inspector) => {
        const lot = get().inspectionLots.find((x) => x.id === lotId);
        if (!lot) return;
        set((s) => ({ inspectionLots: s.inspectionLots.map((x) => x.id === lotId ? { ...x, status, updatedAt: today(), updatedBy: inspector || "当前用户" } : x) }));
        const holds = useWarehouseAdvancedStore.getState().qualityHolds.filter((h) => h.sourceInboundNo === lot.sourceNo && h.materialId === lot.materialId && h.status === "pending");
        holds.forEach((h) => useWarehouseAdvancedStore.getState().releaseQualityHold(h.id, status === "failed" ? "rejected" : "passed", inspector));
        if (lot.vendorId) {
          get().recordQmFeedback(lot.vendorId, lot.vendorName || "", lot.lotNo, status === "failed" ? "fail" : "pass");
        }
      },
      // ── COQ ──
      addCOQ: (r) => set((s) => ({ coqRecords: [...s.coqRecords, r] })),
      updateCOQ: (id, u) => set((s) => ({ coqRecords: s.coqRecords.map((x) => x.id === id ? { ...x, ...u, updatedAt: today() } : x) })),
      deleteCOQ: (id) => set((s) => ({ coqRecords: s.coqRecords.filter((x) => x.id !== id) })),
      // ── QM → 供应商评级回流 ──
      recordQmFeedback: (vendorId, vendorName, lotNo, result) => {
        const existing = get().qmVendorFeedback.find((f) => f.lotNo === lotNo);
        if (existing) return;
        const fb = { id: uid("qmf"), vendorId, vendorName, lotNo, result, date: today() };
        set((s) => ({ qmVendorFeedback: [...s.qmVendorFeedback, fb] }));
        if (result === "fail") {
          const task = {
            id: uid("it"),
            taskNo: `IT-QM-${lotNo}`,
            type: "incoming",
            status: "failed",
            materialId: "",
            materialCode: "",
            materialName: lotNo,
            batchNo: "",
            quantity: 0,
            sampleQuantity: 0,
            vendorId,
            vendorName,
            inspectionStandardId: "N/A",
            inspectionStandardName: "QM回流自动生成",
            assignedTo: "系统",
            plannedDate: today(),
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            createdBy: "系统",
            updatedBy: "系统"
          };
          useQualityStore.getState().addInspectionTask(task);
        }
      },
      // 重算某供应商纳入 QM 反馈后的评级影响
      recalcVendorQm: (vendorId) => {
        const qs = useQualityStore.getState();
        const ps = usePurchaseStore.getState();
        const prs = usePriceStore.getState();
        const cfg = useSettingsStore.getState().vendorRatingConfig;
        const input = buildVendorRatingInput({
          inspectionTasks: qs.inspectionTasks,
          purchaseOrders: ps.purchaseOrders,
          priceList: prs.priceList,
          vendorId
        });
        const res = computeVendorRating(input, cfg);
        return {
          qualityPassRate: input.qualityPassRate,
          gradeAfter: res.grade,
          scoreAfter: res.score
        };
      }
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-quality-adv",
      version: 1,
      partialize: (state) => ({
        inspectionLots: state.inspectionLots,
        coqRecords: state.coqRecords,
        qmVendorFeedback: state.qmVendorFeedback
      })
    }
  )
);
const __qaSeen = /* @__PURE__ */ new Set();
const __qaMarkSeen = () => {
  useWarehouseStore.getState().inboundOrders.forEach((o) => __qaSeen.add(o.id));
};
__qaMarkSeen();
if ((_a = useWarehouseStore.persist) == null ? void 0 : _a.onFinishHydration) {
  useWarehouseStore.persist.onFinishHydration(__qaMarkSeen);
}
useWarehouseStore.subscribe((state, prev) => {
  const prevIds = new Set(((prev == null ? void 0 : prev.inboundOrders) || []).map((o) => o.id));
  for (const o of state.inboundOrders) {
    if (prevIds.has(o.id) || __qaSeen.has(o.id)) continue;
    __qaSeen.add(o.id);
    if (o.type === "purchase" && o.status === "completed") {
      useQualityAdvancedStore.getState().autoCreateLotsFromInbound(o);
    }
  }
});
export {
  useQualityAdvancedStore as u
};
