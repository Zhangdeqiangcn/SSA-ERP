import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { SubcontractOrder } from '@/types/production';
import { useWarehouseStore } from './warehouseStore';
import { b2Api, isAuthed } from '@/services/b2Api';

// B2 双写桥：本地 orders 的 id（'sub-...'）与 D1 后端 id 不同，用模块级映射表桥接。
// 仅存活于当前会话；刷新前已存在的委外单无法回写 D1（见报告未覆盖点）。
const subBackendId = new Map<string, string>();

/** 把 SubcontractOrder 映射为 POST/PUT /api/subcontracts 允许的字段 */
const toSubcontractPayload = (o: SubcontractOrder): Record<string, unknown> => ({
  orderNo: o.orderNo,
  type: o.type,
  materialId: o.materialId,
  materialCode: o.materialCode,
  materialName: o.materialName,
  vendorId: o.vendorId,
  vendorName: o.vendorName,
  qty: o.qty,
  bomId: o.bomId,
  sourceWorkOrderId: o.sourceWorkOrderId,
  status: o.status,
  planDate: o.planDate,
  processFee: o.processFee,
  issueItems: (o.issueItems || []).map((it) => ({
    materialId: it.materialId,
    materialCode: it.materialCode,
    materialName: it.materialName,
    unit: it.unit,
    qty: it.qty,
  })),
});

const STORE_KEY = 'ssa-erp-subcontract';

/** B2 委外默认仓库（发料从原料仓出、成品回原料仓，保持与既有种子仓一致） */
const SUB_WAREHOUSE_ID = 'wh-001';
const SUB_WAREHOUSE_NAME = '主仓库-A区';

const seedOrders: SubcontractOrder[] = [
  {
    id: 'sub-001',
    orderNo: 'SUB-2026-001',
    type: 'process',
    materialId: 'mat-001',
    materialCode: 'PRD-FRAME-001',
    materialName: '重型钢结构焊接架 H1200',
    vendorId: 'ven-001',
    vendorName: '精工外协加工厂',
    qty: 20,
    sourceWorkOrderId: 'wo-001',
    issueItems: [
      { materialId: 'mat-002', materialCode: 'STEEL-002', materialName: 'Q235 钢板', unit: 'kg', qty: 400 },
    ],
    status: 'issued',
    planDate: '2026-07-20',
    processFee: 150,
    receivedQty: 0,
    createdAt: '2026-07-12T08:00:00.000Z',
    updatedAt: '2026-07-12T08:00:00.000Z',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
];

interface SubcontractState {
  orders: SubcontractOrder[];
  addOrder: (o: SubcontractOrder) => void;
  updateOrder: (id: string, patch: Partial<SubcontractOrder>) => void;
  deleteOrder: (id: string) => void;
  /** B2：委外发料 —— 生成 type='subcontract' 出库单真扣库存（对标 SAP 541） */
  issueMaterials: (id: string, items: SubcontractOrder['issueItems']) => boolean;
  /** B2：委外收货 —— 生成 type='subcontract' 入库单增成品库存 + 计提加工费应付 */
  receiveSubcontract: (id: string, qty?: number) => boolean;
  returnMaterials: (id: string) => void;
  closeOrder: (id: string) => void;
}

export const useSubcontractStore = create<SubcontractState>()(
  persist(
    (set, get) => ({
      orders: seedOrders.map((o) => ({ ...o })),
      // 双写：本地更新先行；登录态下再 fire-and-forget 落 D1
      addOrder: (o) => {
        set((s) => ({ orders: [...s.orders, o] }));
        if (isAuthed()) {
          b2Api
            .postSubcontract(toSubcontractPayload(o))
            .then((data) => {
              if (data && data.id) subBackendId.set(o.id, data.id);
            })
            .catch(() => {});
        }
      },
      updateOrder: (id, patch) => {
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
        const backendId = subBackendId.get(id);
        if (isAuthed() && backendId) {
          const merged = useSubcontractStore.getState().orders.find((o) => o.id === id);
          if (merged) b2Api.putSubcontract(backendId, toSubcontractPayload(merged)).catch(() => {});
        }
      },
      deleteOrder: (id) => {
        set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
        const backendId = subBackendId.get(id);
        if (isAuthed() && backendId) {
          b2Api.deleteSubcontract(backendId).catch(() => {});
          subBackendId.delete(id);
        }
      },

      // ── B2-① 委外发料：真扣库存（借 1408 委托加工物资 / 贷 1403 原材料）──
      issueMaterials: (id, items) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return false;
        // 幂等：已生成过发料出库单则不重复扣库存，仅更新明细
        if (order.issueOutboundNo) {
          set((s) => ({
            orders: s.orders.map((o) => (o.id === id ? { ...o, issueItems: items } : o)),
          }));
          return false;
        }
        const list = (items || []).filter((it) => (it.qty || 0) > 0);
        if (list.length === 0) {
          set((s) => ({
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, issueItems: items, status: 'issued' } : o,
            ),
          }));
          return false;
        }

        const stamp = Date.now();
        const outboundNo = `OB-SUB-${stamp}`;
        const now = new Date().toISOString();
        useWarehouseStore.getState().addOutboundOrder({
          id: `ob-sub-${stamp}`,
          outboundNo,
          type: 'subcontract',
          sourceNo: order.orderNo,
          status: 'completed',
          warehouseId: SUB_WAREHOUSE_ID,
          warehouseName: SUB_WAREHOUSE_NAME,
          operator: '当前用户',
          outboundDate: now.slice(0, 10),
          items: list.map((it, idx) => ({
            id: `obsi-${stamp}-${idx}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            unit: it.unit,
            quantity: it.qty,
          })),
          remarks: `委外发料 ${order.orderNo} → ${order.vendorName}`,
          createdAt: now,
          updatedAt: now,
          createdBy: '当前用户',
          updatedBy: '当前用户',
        });

        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? { ...o, issueItems: items, status: 'issued', issueOutboundNo: outboundNo, updatedAt: now }
              : o,
          ),
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
        // 发出材料成本：取本委外单发料出库单的结转成本合计，按本次收货比例分摊
        const issueOb = order.issueOutboundNo
          ? wh.outboundOrders.find((x) => x.outboundNo === order.issueOutboundNo)
          : undefined;
        const issuedTotalCost = (issueOb?.items || []).reduce(
          (sum, it) => sum + (it.costAmount || 0),
          0,
        );
        const ratio = (order.qty || 0) > 0 ? receiveQty / (order.qty || 1) : 1;
        const materialCost = Math.round(issuedTotalCost * ratio * 100) / 100;
        const processFee = Math.round((order.processFee || 0) * receiveQty * 100) / 100;
        const totalCost = Math.round((materialCost + processFee) * 100) / 100;
        const unitPrice = Math.round((totalCost / receiveQty) * 10000) / 10000;

        const stamp = Date.now();
        const inboundNo = `IB-SUB-${stamp}`;
        const now = new Date().toISOString();
        wh.addInboundOrder({
          id: `ib-sub-${stamp}`,
          inboundNo,
          type: 'subcontract',
          sourceNo: order.orderNo,
          vendorId: order.vendorId,
          vendorName: order.vendorName,
          status: 'completed',
          warehouseId: SUB_WAREHOUSE_ID,
          warehouseName: SUB_WAREHOUSE_NAME,
          operator: '当前用户',
          inboundDate: now.slice(0, 10),
          items: [
            {
              id: `ibsi-${stamp}`,
              materialId: order.materialId,
              materialCode: order.materialCode,
              materialName: order.materialName,
              expectedQuantity: receiveQty,
              actualQuantity: receiveQty,
              qualityStatus: 'qualified' as const,
              unitPrice,
              amount: totalCost,
            },
          ],
          subcontractMaterialCost: materialCost,
          remarks: `委外收货 ${order.orderNo}（${order.vendorName}）`,
          createdAt: now,
          updatedAt: now,
          createdBy: '当前用户',
          updatedBy: '当前用户',
        });

        const nextReceived = already + receiveQty;
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  receivedQty: nextReceived,
                  status: nextReceived >= (o.qty || 0) ? 'received' : o.status,
                  receiptInboundNos: [...(o.receiptInboundNos || []), inboundNo],
                  updatedAt: now,
                }
              : o,
          ),
        }));
        return true;
      },

      returnMaterials: (id) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'returned' } : o)),
        })),
      closeOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'closed' } : o)),
        })),
    }),
    { storage: backendStorage,
    
      name: STORE_KEY,
      version: 2,
      partialize: (state) => ({ orders: state.orders }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { orders?: SubcontractOrder[] } | undefined;
        if (!state) return state as never;
        // v1 → v2：补齐 B2 新增字段，避免旧持久化数据缺字段导致联动判空异常
        if (version < 2 && Array.isArray(state.orders)) {
          state.orders = state.orders.map((o) => ({
            ...o,
            processFee: o.processFee ?? 0,
            receivedQty: o.receivedQty ?? 0,
          }));
        }
        return state as never;
      },
    },
  ),
);
