import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkOrder, MRPRecommendation, ProcessRoute } from '@/types/production';
import { FinishedGoodsInbound } from '@/types';
import {
  workOrders as mockWorkOrders,
  mrpRecommendations as mockMrpRecommendations,
  processRoutes as mockProcessRoutes,
} from '@/mocks/data/production';
// 跨模块回写：通过 getState() 读取，避免顶层循环依赖（与 subcontractStore 同范式）
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { roundAmount, roundPrice } from '@/utils/cost';

interface ProductionState {
  workOrders: WorkOrder[];
  mrpRecommendations: MRPRecommendation[];
  processRoutes: ProcessRoute[];

  // WorkOrder CRUD
  addWorkOrder: (wo: WorkOrder) => void;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
  deleteWorkOrder: (id: string) => void;

  // B3 完工回写：工单完工 → 回写状态/数量/成本 + 自动生成成品入库单（事件驱动过账库存与生产成本凭证）
  completeWorkOrder: (
    id: string,
    payload: {
      completedQuantity?: number;
      scrapQuantity?: number;
      actualEndDate?: string;
      actualTotalCost?: number;
      operator?: string;
    }
  ) => boolean;

  // MRP
  addMrpRecommendation: (rec: MRPRecommendation) => void;
  updateMrpRecommendation: (id: string, updates: Partial<MRPRecommendation>) => void;
  deleteMrpRecommendation: (id: string) => void;
  setMrpRecommendations: (recs: MRPRecommendation[]) => void;

  // ProcessRoute CRUD
  addProcessRoute: (route: ProcessRoute) => void;
  updateProcessRoute: (id: string, updates: Partial<ProcessRoute>) => void;
  deleteProcessRoute: (id: string) => void;
}

const addArr = <T,>(setter: (v: T[]) => void, list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(setter: (v: T[]) => void, list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(setter: (v: T[]) => void, list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useProductionStore = create<ProductionState>()(
  persist(
    (set, get) => ({
      workOrders: [...mockWorkOrders],
      mrpRecommendations: [...mockMrpRecommendations],
      processRoutes: [...mockProcessRoutes],

      // WorkOrder
      addWorkOrder: (wo) => set((s) => ({ workOrders: addArr(set, s.workOrders, wo) })),
      updateWorkOrder: (id, u) => set((s) => ({ workOrders: updateArr(set, s.workOrders, id, u) })),
      deleteWorkOrder: (id) => set((s) => ({ workOrders: deleteArr(set, s.workOrders, id) })),

      // ── B3 完工回写：工单完工 → 自动生成成品入库单（type='production'）+ 回写工单 ──
      // 对标 SAP 生产收货 101：借 1405 库存商品 / 贷 5001 生产成本 = 工单 actualTotalCost
      completeWorkOrder: (id, payload) => {
        const wo = get().workOrders.find((o) => o.id === id);
        if (!wo) return false;
        // 幂等：已完工/已关闭不再重复回写（避免重复入库与重复凭证）
        if (wo.status === 'completed' || wo.status === 'closed') return false;

        const completedQty = payload.completedQuantity ?? wo.plannedQuantity;
        const scrapQty = payload.scrapQuantity ?? 0;
        const qualifiedQty = Math.max(0, completedQty - scrapQty);
        const actualEndDate = payload.actualEndDate || new Date().toISOString().slice(0, 10);
        const actualTotalCost = payload.actualTotalCost ?? wo.actualTotalCost ?? 0;

        // 反查成品物料主数据（按 productCode 命中 B3 新增 mat-fg-xxx，落正确的 materialId）
        const mat = useMaterialStore.getState().materials.find((m) => m.code === wo.productCode);
        if (!mat) return false;

        // ① 回写工单状态/数量/成本（completed + 合格数量 + 实际完工日期 + 实际生产成本）
        set((s) => ({
          workOrders: s.workOrders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: 'completed',
                  completedQuantity: completedQty,
                  scrapQuantity: scrapQty,
                  qualifiedQuantity: qualifiedQty,
                  actualEndDate,
                  actualTotalCost,
                  updatedAt: new Date().toISOString(),
                }
              : o,
          ),
        }));

        const stamp = Date.now();
        // 完工单位成本（4 位精度），用于滚动成品移动平均价
        const unitPrice = qualifiedQty > 0 ? roundPrice(actualTotalCost / qualifiedQty) : 0;
        const wh = useWarehouseStore.getState();

        // ② 生成成品入库单（事件驱动：completed → 自动过账库存 + 滚动移动均价 + 生成生产成本凭证）
        wh.addInboundOrder({
          id: `ib-prod-${stamp}`,
          inboundNo: `IB-PROD-${stamp}`,
          type: 'production',
          sourceNo: wo.orderNo,
          status: 'completed',
          warehouseId: 'wh-002',
          warehouseName: '成品仓',
          operator: payload.operator || '当前用户',
          inboundDate: actualEndDate,
          items: [
            {
              id: `ibpi-${stamp}`,
              materialId: mat.id,
              materialCode: mat.code,
              materialName: mat.name,
              specification: mat.specification,
              unit: mat.unit,
              expectedQuantity: qualifiedQty,
              actualQuantity: qualifiedQty,
              qualityStatus: 'qualified' as const,
              unitPrice,
              amount: roundAmount(actualTotalCost),
            },
          ],
          totalCost: roundAmount(actualTotalCost),
          remarks: `工单 ${wo.orderNo} 完工入库（合格 ${qualifiedQty} / 报废 ${scrapQty}）`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: payload.operator || '当前用户',
          updatedBy: payload.operator || '当前用户',
        });

        // ③ 同步生成成品入库台账（FinishedGoodsInbound），保持生产 → 仓储交接单据完整可追溯
        const fgi: FinishedGoodsInbound = {
          id: `fgi-${stamp}`,
          inboundNo: `FIN-PROD-${stamp}`,
          workOrderId: wo.id,
          workOrderNo: wo.orderNo,
          productId: mat.id,
          productCode: mat.code,
          productName: mat.name,
          specification: mat.specification || '',
          unit: mat.unit,
          plannedQty: wo.plannedQuantity,
          actualQty: completedQty,
          qualifiedQty,
          rejectedQty: scrapQty,
          batchNo: `B${actualEndDate.replace(/-/g, '')}`,
          warehouseId: 'wh-002',
          warehouseName: '成品仓',
          status: 'completed',
          operator: payload.operator || '当前用户',
          inboundDate: actualEndDate,
          remarks: `工单 ${wo.orderNo} 完工入库`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: payload.operator || '当前用户',
          updatedBy: payload.operator || '当前用户',
        };
        wh.addFinishedGoodsInbound(fgi);

        return true;
      },

      // MRP
      addMrpRecommendation: (rec) => set((s) => ({ mrpRecommendations: addArr(set, s.mrpRecommendations, rec) })),
      updateMrpRecommendation: (id, u) => set((s) => ({ mrpRecommendations: updateArr(set, s.mrpRecommendations, id, u) })),
      deleteMrpRecommendation: (id) => set((s) => ({ mrpRecommendations: deleteArr(set, s.mrpRecommendations, id) })),
      setMrpRecommendations: (recs) => set({ mrpRecommendations: recs }),

      // ProcessRoute
      addProcessRoute: (route) => set((s) => ({ processRoutes: addArr(set, s.processRoutes, route) })),
      updateProcessRoute: (id, u) => set((s) => ({ processRoutes: updateArr(set, s.processRoutes, id, u) })),
      deleteProcessRoute: (id) => set((s) => ({ processRoutes: deleteArr(set, s.processRoutes, id) })),
    }),
    {
      name: 'ssa-erp-production',
      version: 1,
      partialize: (state) => ({
        workOrders: state.workOrders,
        mrpRecommendations: state.mrpRecommendations,
        processRoutes: state.processRoutes,
      }),
    }
  )
);
