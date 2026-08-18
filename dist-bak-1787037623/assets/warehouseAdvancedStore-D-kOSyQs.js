var _a;
import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage, c as useWarehouseStore, u as useMaterialStore, f as useFinanceStore, g as useOrgStore } from "./index-CU2cqxc8.js";
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const seedSerialMasters = [
  {
    id: "sn-001",
    serialNo: "SN-2024-0001",
    materialId: "mat-009",
    materialCode: "MAT202405010009",
    materialName: "交流接触器 CJX2",
    batchNo: "HQ20240508",
    warehouseId: "wh-001",
    status: "shipped",
    inboundDate: "2024-05-08",
    outboundDate: "2024-06-10",
    customerName: "宁波钢结构有限公司",
    remarks: "C1 序列号追溯种子：交流接触器单件 SN-2024-0001（批次 HQ20240508）",
    movements: [
      { type: "inbound", docNo: "IN20240508001", date: "2024-05-08", status: "in_stock", note: "深圳华强电气有限公司 入库" },
      { type: "delivery", docNo: "OUT20240610001", date: "2024-06-10", status: "shipped", note: "销售发货至 宁波钢结构有限公司" }
    ]
  }
];
const useWarehouseAdvancedStore = create()(
  persist(
    (set, get) => ({
      stockTransfers: [],
      inventoryAdjustments: [],
      serialMasters: seedSerialMasters,
      qualityHolds: [],
      // ── 跨组织转储 ──
      addStockTransfer: (t) => set((s) => ({ stockTransfers: [...s.stockTransfers, t] })),
      updateStockTransfer: (id, u) => set((s) => ({ stockTransfers: s.stockTransfers.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteStockTransfer: (id) => set((s) => ({ stockTransfers: s.stockTransfers.filter((x) => x.id !== id) })),
      // 确认转储：调出方出库 + 调入方入库
      confirmTransfer: (transferId) => {
        const t = get().stockTransfers.find((x) => x.id === transferId);
        if (!t || t.status !== "draft") return;
        const stamp = Date.now();
        const orgState = useOrgStore.getState();
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-trf-${stamp}`,
          outboundNo: `OB-TRF-${stamp}`,
          type: "transfer",
          sourceNo: t.transferNo,
          status: "completed",
          warehouseId: t.fromWarehouseId,
          warehouseName: t.fromWarehouseName,
          orgId: t.fromOrgId,
          operator: "当前用户",
          outboundDate: t.transferDate,
          items: t.items.map((it) => ({
            id: `obti-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            quantity: it.quantity,
            batchNo: it.batchNo,
            locationId: it.locationId
          })),
          remarks: `跨组织转储调出 ${t.transferNo}`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "当前用户",
          updatedBy: "当前用户"
        });
        useWarehouseStore.getState().addInboundOrder({
          id: `ib-trf-${stamp}`,
          inboundNo: `IB-TRF-${stamp}`,
          type: "transfer",
          sourceNo: t.transferNo,
          status: "completed",
          warehouseId: t.toWarehouseId,
          warehouseName: t.toWarehouseName,
          orgId: t.toOrgId,
          operator: "当前用户",
          inboundDate: t.transferDate,
          items: t.items.map((it) => ({
            id: `ibti-${it.id}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            expectedQuantity: it.quantity,
            actualQuantity: it.quantity,
            batchNo: it.batchNo,
            locationId: it.locationId,
            qualityStatus: "qualified"
          })),
          remarks: `跨组织转储调入 ${t.transferNo}`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: "当前用户",
          updatedBy: "当前用户"
        });
        set((s) => ({
          stockTransfers: s.stockTransfers.map(
            (x) => {
              var _a2;
              return x.id === transferId ? { ...x, status: "completed", fromOrgId: x.fromOrgId || ((_a2 = orgState.organizations.find((o) => o.id !== x.toOrgId)) == null ? void 0 : _a2.id) } : x;
            }
          )
        }));
      },
      // ── 库存调整单 ──
      addInventoryAdjustment: (a) => set((s) => ({ inventoryAdjustments: [...s.inventoryAdjustments, a] })),
      updateInventoryAdjustment: (id, u) => set((s) => ({ inventoryAdjustments: s.inventoryAdjustments.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteInventoryAdjustment: (id) => set((s) => ({ inventoryAdjustments: s.inventoryAdjustments.filter((x) => x.id !== id) })),
      // 过账：调整库存 + 存货凭证
      postAdjustment: (adjustmentId) => {
        var _a2, _b;
        const adj = get().inventoryAdjustments.find((x) => x.id === adjustmentId);
        if (!adj || adj.status === "posted") return;
        const wh = useWarehouseStore.getState();
        const materials = useMaterialStore.getState().materials;
        let records = [...wh.inventoryRecords];
        let totalValue = 0;
        for (const it of adj.items) {
          const price = ((_a2 = materials.find((m) => m.id === it.materialId)) == null ? void 0 : _a2.price) || 0;
          totalValue += it.deltaQty * price;
          const idx = records.findIndex(
            (r) => r.materialId === it.materialId && (it.locationId ? r.locationId === it.locationId : r.warehouseId === adj.warehouseId)
          );
          if (idx >= 0) {
            const nextQty = Math.max(0, records[idx].quantity + it.deltaQty);
            records = records.map(
              (r, i) => i === idx ? {
                ...r,
                quantity: nextQty,
                availableQuantity: Math.max(0, r.availableQuantity + it.deltaQty),
                lastInboundDate: it.deltaQty > 0 ? today() : r.lastInboundDate,
                lastOutboundDate: it.deltaQty < 0 ? today() : r.lastOutboundDate
              } : r
            );
          } else if (it.deltaQty > 0) {
            records = [
              ...records,
              {
                id: `inv-${it.materialId}-${adj.warehouseId}-${it.locationId || "default"}-${Date.now()}`,
                materialId: it.materialId,
                materialCode: it.materialCode || "",
                materialName: it.materialName || "",
                specification: "",
                warehouseId: adj.warehouseId,
                warehouseName: adj.warehouseName,
                orgId: (_b = wh.inventoryRecords.find((r) => r.warehouseId === adj.warehouseId)) == null ? void 0 : _b.orgId,
                locationId: it.locationId,
                locationName: "",
                quantity: it.deltaQty,
                availableQuantity: it.deltaQty,
                frozenQuantity: 0,
                unit: it.unit || "",
                lastInboundDate: today()
              }
            ];
          }
        }
        wh.setInventoryRecords(records);
        if (totalValue !== 0) {
          const stamp = Date.now();
          const voucherNo = `V-ADJ-${adj.adjustmentNo}-${stamp}`;
          const entries = [
            {
              id: `aea-${stamp}-1`,
              entryNo: `JEADJ${stamp}1`,
              date: adj.date,
              description: `库存调整 ${adj.adjustmentNo}`,
              debitAccount: totalValue > 0 ? "库存商品" : "待处理财产损溢",
              creditAccount: totalValue > 0 ? "待处理财产损溢" : "库存商品",
              amount: Math.abs(totalValue),
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
            inventoryAdjustments: s.inventoryAdjustments.map((x) => x.id === adjustmentId ? { ...x, status: "posted", voucherNo } : x)
          }));
        } else {
          set((s) => ({
            inventoryAdjustments: s.inventoryAdjustments.map((x) => x.id === adjustmentId ? { ...x, status: "posted" } : x)
          }));
        }
      },
      // ── 序列号 / HU ──
      addSerialMaster: (s) => set((state) => ({ serialMasters: [...state.serialMasters, s] })),
      updateSerialMaster: (id, u) => set((state) => ({ serialMasters: state.serialMasters.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteSerialMaster: (id) => set((state) => ({ serialMasters: state.serialMasters.filter((x) => x.id !== id) })),
      // ── 质检扣留 ──
      addQualityHold: (h) => set((state) => ({ qualityHolds: [...state.qualityHolds, h] })),
      releaseQualityHold: (id, status, inspector) => set((state) => ({
        qualityHolds: state.qualityHolds.map(
          (x) => x.id === id ? { ...x, status, releaseDate: today(), inspector: inspector || x.inspector } : x
        )
      }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-wh-adv",
      version: 1,
      partialize: (state) => ({
        stockTransfers: state.stockTransfers,
        inventoryAdjustments: state.inventoryAdjustments,
        serialMasters: state.serialMasters,
        qualityHolds: state.qualityHolds
      })
    }
  )
);
const OUTBOUND_SN_STATUS = {
  sale: "shipped",
  pick: "scrapped",
  subcontract: "in_transit",
  transfer: "in_transit",
  return: "shipped"
};
const OUTBOUND_SN_MOVE = {
  sale: "delivery",
  pick: "issue",
  subcontract: "subcontract",
  transfer: "transfer",
  return: "delivery"
};
const __snSeenIn = /* @__PURE__ */ new Set();
const __snSeenOut = /* @__PURE__ */ new Set();
const __snMarkSeen = () => {
  const wh = useWarehouseStore.getState();
  wh.inboundOrders.forEach((o) => __snSeenIn.add(o.id));
  wh.outboundOrders.forEach((o) => __snSeenOut.add(o.id));
};
__snMarkSeen();
if ((_a = useWarehouseStore.persist) == null ? void 0 : _a.onFinishHydration) {
  useWarehouseStore.persist.onFinishHydration(__snMarkSeen);
}
const isSerialized = (materialId) => {
  var _a2;
  return !!((_a2 = useMaterialStore.getState().materials.find((m) => m.id === materialId)) == null ? void 0 : _a2.serialized);
};
const registerSerialsOnInbound = (o) => {
  const store = useWarehouseAdvancedStore.getState();
  const existing = new Set(store.serialMasters.map((s) => s.serialNo));
  const created = [];
  for (const item of o.items || []) {
    if (!isSerialized(item.materialId)) continue;
    const qty = Math.floor(item.actualQuantity || item.expectedQuantity || 0);
    if (qty <= 0) continue;
    const nos = item.serialNos && item.serialNos.length > 0 ? item.serialNos : Array.from({ length: qty }, (_, i) => `SN-${o.inboundNo}-${String(i + 1).padStart(3, "0")}`);
    nos.forEach((sn) => {
      if (existing.has(sn)) return;
      existing.add(sn);
      created.push({
        id: uid("sn"),
        serialNo: sn,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        batchNo: item.batchNo,
        warehouseId: o.warehouseId,
        huId: item.huId,
        status: "in_stock",
        inboundDate: o.inboundDate,
        remarks: `${o.type === "subcontract" ? "委外收货" : o.type === "purchase" ? "采购收货" : "入库"}自动登记 ${o.inboundNo}`,
        movements: [
          { type: "inbound", docNo: o.inboundNo, date: o.inboundDate, status: "in_stock", note: o.warehouseName || o.vendorName }
        ],
        createdAt: today(),
        updatedAt: today(),
        createdBy: "系统",
        updatedBy: "系统"
      });
    });
  }
  if (created.length > 0) {
    useWarehouseAdvancedStore.setState((s) => ({ serialMasters: [...s.serialMasters, ...created] }));
  }
};
const consumeSerialsOnOutbound = (o) => {
  const nextStatus = OUTBOUND_SN_STATUS[o.type] || "shipped";
  const moveType = OUTBOUND_SN_MOVE[o.type] || "delivery";
  const store = useWarehouseAdvancedStore.getState();
  const picked = /* @__PURE__ */ new Map();
  for (const item of o.items || []) {
    if (!isSerialized(item.materialId)) continue;
    const qty = Math.floor(item.quantity || 0);
    if (qty <= 0) continue;
    if (item.serialNos && item.serialNos.length > 0) {
      item.serialNos.forEach((sn) => picked.set(sn, nextStatus));
      continue;
    }
    const candidates = store.serialMasters.filter((s) => s.materialId === item.materialId && s.status === "in_stock" && !picked.has(s.serialNo)).sort((a, b) => (a.inboundDate || "").localeCompare(b.inboundDate || "") || a.serialNo.localeCompare(b.serialNo)).slice(0, qty);
    candidates.forEach((s) => picked.set(s.serialNo, nextStatus));
  }
  if (picked.size === 0) return;
  useWarehouseAdvancedStore.setState((s) => ({
    serialMasters: s.serialMasters.map((sm) => {
      const st = picked.get(sm.serialNo);
      if (!st) return sm;
      return {
        ...sm,
        status: st,
        outboundDate: o.outboundDate,
        customerName: o.customerName || sm.customerName,
        movements: [
          ...sm.movements || [],
          { type: moveType, docNo: o.outboundNo, date: o.outboundDate, status: st, note: o.customerName || o.remarks }
        ],
        updatedAt: today(),
        updatedBy: "系统"
      };
    })
  }));
};
useWarehouseStore.subscribe((state, prev) => {
  const prevIn = new Set(((prev == null ? void 0 : prev.inboundOrders) || []).map((o) => o.id));
  for (const o of state.inboundOrders) {
    if (prevIn.has(o.id) || __snSeenIn.has(o.id)) continue;
    __snSeenIn.add(o.id);
    if (o.status === "completed") registerSerialsOnInbound(o);
  }
  const prevOut = new Set(((prev == null ? void 0 : prev.outboundOrders) || []).map((o) => o.id));
  for (const o of state.outboundOrders) {
    if (prevOut.has(o.id) || __snSeenOut.has(o.id)) continue;
    __snSeenOut.add(o.id);
    if (o.status === "completed") consumeSerialsOnOutbound(o);
  }
});
export {
  useWarehouseAdvancedStore as u
};
