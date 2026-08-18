import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage, c as useWarehouseStore } from "./index-CU2cqxc8.js";
const STORE_KEY = "ssa-erp-subcontract";
const SUB_WAREHOUSE_ID = "wh-001";
const SUB_WAREHOUSE_NAME = "主仓库-A区";
const seedOrders = [
  {
    id: "sub-001",
    orderNo: "SUB-2026-001",
    type: "process",
    materialId: "mat-001",
    materialCode: "PRD-FRAME-001",
    materialName: "重型钢结构焊接架 H1200",
    vendorId: "ven-001",
    vendorName: "精工外协加工厂",
    qty: 20,
    sourceWorkOrderId: "wo-001",
    issueItems: [
      { materialId: "mat-002", materialCode: "STEEL-002", materialName: "Q235 钢板", unit: "kg", qty: 400 }
    ],
    status: "issued",
    planDate: "2026-07-20",
    processFee: 150,
    receivedQty: 0,
    createdAt: "2026-07-12T08:00:00.000Z",
    updatedAt: "2026-07-12T08:00:00.000Z",
    createdBy: "admin",
    updatedBy: "admin"
  }
];
const useSubcontractStore = create()(
  persist(
    (set, get) => ({
      orders: seedOrders.map((o) => ({ ...o })),
      addOrder: (o) => set((s) => ({ orders: [...s.orders, o] })),
      updateOrder: (id, patch) => set((s) => ({ orders: s.orders.map((o) => o.id === id ? { ...o, ...patch } : o) })),
      deleteOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      // ── B2-① 委外发料：真扣库存（借 1408 委托加工物资 / 贷 1403 原材料）──
      issueMaterials: (id, items) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return false;
        if (order.issueOutboundNo) {
          set((s) => ({
            orders: s.orders.map((o) => o.id === id ? { ...o, issueItems: items } : o)
          }));
          return false;
        }
        const list = (items || []).filter((it) => (it.qty || 0) > 0);
        if (list.length === 0) {
          set((s) => ({
            orders: s.orders.map(
              (o) => o.id === id ? { ...o, issueItems: items, status: "issued" } : o
            )
          }));
          return false;
        }
        const stamp = Date.now();
        const outboundNo = `OB-SUB-${stamp}`;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-sub-${stamp}`,
          outboundNo,
          type: "subcontract",
          sourceNo: order.orderNo,
          status: "completed",
          warehouseId: SUB_WAREHOUSE_ID,
          warehouseName: SUB_WAREHOUSE_NAME,
          operator: "当前用户",
          outboundDate: now.slice(0, 10),
          items: list.map((it, idx) => ({
            id: `obsi-${stamp}-${idx}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            quantity: it.qty
          })),
          remarks: `委外发料 ${order.orderNo} → ${order.vendorName}`,
          createdAt: now,
          updatedAt: now,
          createdBy: "当前用户",
          updatedBy: "当前用户"
        });
        set((s) => ({
          orders: s.orders.map(
            (o) => o.id === id ? { ...o, issueItems: items, status: "issued", issueOutboundNo: outboundNo, updatedAt: now } : o
          )
        }));
        return true;
      },
      // ── B2-② 委外收货：成品入库 + 加工费应付（借 1405 / 贷 1408 + 贷 2201）──
      receiveSubcontract: (id, qty) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return false;
        const already = order.receivedQty || 0;
        const remain = (order.qty || 0) - already;
        const receiveQty = qty && qty > 0 ? Math.min(qty, remain) : remain;
        if (receiveQty <= 0) return false;
        const wh = useWarehouseStore.getState();
        const issueOb = order.issueOutboundNo ? wh.outboundOrders.find((x) => x.outboundNo === order.issueOutboundNo) : void 0;
        const issuedTotalCost = ((issueOb == null ? void 0 : issueOb.items) || []).reduce(
          (sum, it) => sum + (it.costAmount || 0),
          0
        );
        const ratio = (order.qty || 0) > 0 ? receiveQty / (order.qty || 1) : 1;
        const materialCost = Math.round(issuedTotalCost * ratio * 100) / 100;
        const processFee = Math.round((order.processFee || 0) * receiveQty * 100) / 100;
        const totalCost = Math.round((materialCost + processFee) * 100) / 100;
        const unitPrice = Math.round(totalCost / receiveQty * 1e4) / 1e4;
        const stamp = Date.now();
        const inboundNo = `IB-SUB-${stamp}`;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        wh.addInboundOrder({
          id: `ib-sub-${stamp}`,
          inboundNo,
          type: "subcontract",
          sourceNo: order.orderNo,
          vendorId: order.vendorId,
          vendorName: order.vendorName,
          status: "completed",
          warehouseId: SUB_WAREHOUSE_ID,
          warehouseName: SUB_WAREHOUSE_NAME,
          operator: "当前用户",
          inboundDate: now.slice(0, 10),
          items: [
            {
              id: `ibsi-${stamp}`,
              materialId: order.materialId,
              materialCode: order.materialCode,
              materialName: order.materialName,
              expectedQuantity: receiveQty,
              actualQuantity: receiveQty,
              qualityStatus: "qualified",
              unitPrice,
              amount: totalCost
            }
          ],
          subcontractMaterialCost: materialCost,
          remarks: `委外收货 ${order.orderNo}（${order.vendorName}）`,
          createdAt: now,
          updatedAt: now,
          createdBy: "当前用户",
          updatedBy: "当前用户"
        });
        const nextReceived = already + receiveQty;
        set((s) => ({
          orders: s.orders.map(
            (o) => o.id === id ? {
              ...o,
              receivedQty: nextReceived,
              status: nextReceived >= (o.qty || 0) ? "received" : o.status,
              receiptInboundNos: [...o.receiptInboundNos || [], inboundNo],
              updatedAt: now
            } : o
          )
        }));
        return true;
      },
      returnMaterials: (id) => set((s) => ({
        orders: s.orders.map((o) => o.id === id ? { ...o, status: "returned" } : o)
      })),
      closeOrder: (id) => set((s) => ({
        orders: s.orders.map((o) => o.id === id ? { ...o, status: "closed" } : o)
      }))
    }),
    {
      storage: backendStorage,
      name: STORE_KEY,
      version: 2,
      partialize: (state) => ({ orders: state.orders }),
      migrate: (persisted, version) => {
        const state = persisted;
        if (!state) return state;
        if (version < 2 && Array.isArray(state.orders)) {
          state.orders = state.orders.map((o) => ({
            ...o,
            processFee: o.processFee ?? 0,
            receivedQty: o.receivedQty ?? 0
          }));
        }
        return state;
      }
    }
  )
);
export {
  useSubcontractStore as u
};
