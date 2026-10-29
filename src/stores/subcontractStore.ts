import { create } from 'zustand';
import { SubcontractOrder } from '@/types/production';
import { useWarehouseStore } from './warehouseStore';
import { useProductionStore } from './productionStore';
import { subcontractApi } from '@/services/subcontract';
import { roundAmount, roundPrice } from '@/utils/cost';
import { useGlobalToastStore } from '@/stores/globalToastStore';

// W1-B1：委外订单改为直连真实 D1 subcontract_orders（专用服务 subcontractApi，走 api 客户端），
// 替代原 b2Api 双写桥。orders 不再落 app_state Blob（已移除 persist 包装），D1 为唯一真源，根治双通道。
// 在线时：loadOrders 从 D1 拉取、增删改经 subcontractApi 写回；离线/未登录/异常回退内存 seedOrders。

const SUBCONTRACT_BACKFILL_FLAG = 'ssa-erp-subcontract-backfilled';

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
  loadOrders: () => Promise<void>;
  addOrder: (o: SubcontractOrder) => Promise<void>;
  updateOrder: (id: string, patch: Partial<SubcontractOrder>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  /** B2：委外发料 —— 生成 type='subcontract' 出库单真扣库存（对标 SAP 541） */
  issueMaterials: (id: string, items: SubcontractOrder['issueItems']) => boolean;
  /** B2：委外收货 —— 生成 type='subcontract' 入库单增成品库存 + 计提加工费应付 */
  receiveSubcontract: (id: string, qty?: number) => boolean;
  returnMaterials: (id: string) => void;
  closeOrder: (id: string) => void;
}

/** 把订单变更持久化到 D1（离线容忍，但写失败需告警） */
function persistOrder(id: string) {
  const o = useSubcontractStore.getState().orders.find((x) => x.id === id);
  if (o) subcontractApi.update(id, o).catch(() => { useGlobalToastStore.getState().showError('委外订单变更未保存到云端，刷新后可能丢失'); });
}

export const useSubcontractStore = create<SubcontractState>()(
  (set, get) => ({
    orders: seedOrders.map((o) => ({ ...o })),

    // 启动期从 D1 拉取；空库回填种子一次
    loadOrders: async () => {
      try {
        const res = await subcontractApi.list({ page: 1, pageSize: 200 });
        const list = (res?.data || []) as SubcontractOrder[];
        set({ orders: list });
        if (list.length === 0 && !window.localStorage.getItem(SUBCONTRACT_BACKFILL_FLAG)) {
          window.localStorage.setItem(SUBCONTRACT_BACKFILL_FLAG, '1');
          for (const o of seedOrders) {
            try {
              await subcontractApi.create(o);
            } catch {
              /* 编码冲突等忽略，回填尽力而为 */
            }
          }
          const refreshed = await subcontractApi.list({ page: 1, pageSize: 200 });
          set({ orders: (refreshed?.data || []) as SubcontractOrder[] });
        }
      } catch {
        // 离线/未登录/接口异常：保留内存 seedOrders，不阻断 UI
      }
    },

    // 乐观更新先行；写 D1 后把本地 id 对齐为 D1 id（sco-...），保证后续更新精准。
    addOrder: async (o) => {
      set((s) => ({ orders: [...s.orders, o] }));
      try {
        const created = await subcontractApi.create(o);
        if (created?.id && created.id !== o.id) {
          set((s) => ({ orders: s.orders.map((x) => (x.id === o.id ? { ...x, id: created.id } : x)) }));
        }
      } catch {
        /* 写失败：保留内存态 */
      }
    },
    updateOrder: async (id, patch) => {
      set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
      const merged = useSubcontractStore.getState().orders.find((o) => o.id === id);
      if (merged) {
        try {
          await subcontractApi.update(id, merged);
        } catch {
          /* 写失败：保留内存态 */
        }
      }
    },
    deleteOrder: async (id) => {
      set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
      try {
        await subcontractApi.remove(id);
      } catch {
        /* 写失败：保留内存态 */
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
        persistOrder(id);
        return false;
      }
      const list = (items || []).filter((it) => (it.qty || 0) > 0);
      if (list.length === 0) {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...o, issueItems: items, status: 'issued' } : o,
          ),
        }));
        persistOrder(id);
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
      persistOrder(id);
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
      // ★ #14（V3.17.6）委外成本分摊改为「按累计量差分」，根治多次收货的尾差累积：
      //   原实现每次用 ratio 单独四舍五入 —— 例：发出材料 1000 元、分 3 次等量收货，
      //   每次 1000×(1/3) 四舍五入得 333.33，3 次累计 999.99，与发出材料总额差 0.01，
      //   收货次数越多差越大，月结对账永远差几分钱找不到原因。
      //   新算法：本次分摊 = round(总额 × 本次后累计比例) − round(总额 × 本次前累计比例)，
      //   最后一次（累计比例达 1）必然自动补齐到总额，累计相加精确等于发出材料总额。
      const totalQty = order.qty || 0;
      const cumBefore = totalQty > 0 ? roundAmount(issuedTotalCost * (already / totalQty)) : 0;
      const cumAfter = totalQty > 0 ? roundAmount(issuedTotalCost * ((already + receiveQty) / totalQty)) : issuedTotalCost;
      const materialCost = roundAmount(cumAfter - cumBefore);
      // 加工费同理：按累计数量的累计额差分，避免「单价×数量」逐次四舍五入的尾差
      const feePerUnit = order.processFee || 0;
      const feeBefore = roundAmount(feePerUnit * already);
      const feeAfter = roundAmount(feePerUnit * (already + receiveQty));
      const processFee = roundAmount(feeAfter - feeBefore);
      const totalCost = roundAmount(materialCost + processFee);
      const unitPrice = receiveQty > 0 ? roundPrice(totalCost / receiveQty) : 0;

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
      persistOrder(id);

      // P1-10 委外闭环：回写父工单已委外数量（sourceWorkOrderId 关联的内部工单），补齐单边流转断点
      const srcWoId = order.sourceWorkOrderId;
      if (srcWoId) {
        const prod = useProductionStore.getState();
        const srcWo = prod.workOrders.find((w) => w.id === srcWoId);
        if (srcWo) {
          prod.updateWorkOrder(srcWoId, {
            outsourcedQty: (srcWo.outsourcedQty || 0) + receiveQty,
          });
        }
      }
      return true;
    },

    returnMaterials: (id) => {
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'returned' } : o)),
      }));
      persistOrder(id);
    },
    closeOrder: (id) => {
      set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'closed' } : o)),
      }));
      persistOrder(id);
    },
  }),
);
