import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { WorkOrder, MRPRecommendation, ProcessRoute, IssuedMaterial } from '@/types/production';
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
import { b2Api, isAuthed } from '@/services/b2Api';
import { workOrderApi } from '@/services/w1Api';
import { snakeToCamel } from '@/utils/case';

// W1 根治双通道：工单切片直连真实 D1 work_orders（仅 workOrders 迁 D1；
// mrpRecommendations / processRoutes 仍走 Blob，后端无对应写入端点）。
// 在线：loadWorkOrders 从 /api/work-orders 拉取；增改经 workOrderApi 写回。
const BACKFILL_FLAG = 'ssa-erp-production-backfilled';

function readLegacyWorkOrders(): WorkOrder[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-production');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.workOrders && Array.isArray(st.workOrders) && st.workOrders.length) return st.workOrders as WorkOrder[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function rowToWorkOrder(row: any): WorkOrder {
  return snakeToCamel(row) as WorkOrder;
}

interface ProductionState {
  workOrders: WorkOrder[];
  mrpRecommendations: MRPRecommendation[];
  processRoutes: ProcessRoute[];

  // WorkOrder CRUD
  addWorkOrder: (wo: WorkOrder) => void;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
  deleteWorkOrder: (id: string) => void;
  /** W1 根治双通道：从 D1 work_orders 拉取（在线）。空库首次从 legacy Blob / mock 回填一次。 */
  loadWorkOrders: () => Promise<void>;

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

  // B2-② 工单领料：按BOM展开生成生产领料出库单，扣减原料库存，回写工单领料明细
  issueMaterials: (
    id: string,
    items: { materialId: string; materialCode: string; materialName: string; quantity: number; unit: string }[]
  ) => { ok: boolean; outboundNo?: string; reason?: string };

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

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useProductionStore = create<ProductionState>()(
  persist(
    (set, get) => ({
      workOrders: [...mockWorkOrders],
      mrpRecommendations: [...mockMrpRecommendations],
      processRoutes: [...mockProcessRoutes],

      // WorkOrder
      addWorkOrder: async (wo) => {
        set((s) => ({ workOrders: addArr(s.workOrders, wo) }));
        try {
          const created = await workOrderApi.createWorkOrder(wo as any);
          const mapped = rowToWorkOrder(created);
          if (mapped?.id && mapped.id !== wo.id) {
            set((s) => ({ workOrders: s.workOrders.map((o) => (o.id === wo.id ? mapped : o)) }));
          }
        } catch {
          /* 写失败：保留内存态（离线容忍） */
        }
      },
      updateWorkOrder: async (id, u) => {
        set((s) => ({ workOrders: updateArr(s.workOrders, id, u) }));
        try {
          await workOrderApi.updateWorkOrder(id, u as any);
        } catch {
          /* 写失败：保留内存态 */
        }
      },
      deleteWorkOrder: async (id) => {
        set((s) => ({ workOrders: deleteArr(s.workOrders, id) }));
        try {
          await workOrderApi.deleteWorkOrder(id);
        } catch {
          /* 写失败：保留内存态 */
        }
      },
      loadWorkOrders: async () => {
        try {
          const res = await workOrderApi.getWorkOrders({ page: 1, pageSize: 200 });
          const list = (res?.data || []).map(rowToWorkOrder);
          set({ workOrders: list });
          if (list.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
            window.localStorage.setItem(BACKFILL_FLAG, '1');
            const legacy = readLegacyWorkOrders();
            const seed = legacy.length ? legacy : [...mockWorkOrders];
            for (const o of seed) {
              try { await workOrderApi.createWorkOrder(o as any); } catch { /* 单号冲突等忽略 */ }
            }
            const refreshed = await workOrderApi.getWorkOrders({ page: 1, pageSize: 200 });
            set({ workOrders: (refreshed?.data || []).map(rowToWorkOrder) });
          }
        } catch {
          /* 离线/未登录/接口异常：保持内存 mockWorkOrders，不阻断 UI */
        }
      },

      // ── B2-② 工单领料：按BOM展开生成生产领料出库单，扣减原料库存，回写工单领料明细 ──
      // 对标 SAP 生产发料 261：借 5001 生产成本 / 贷 1403 原材料
      issueMaterials: (id, items) => {
        const wo = get().workOrders.find((o) => o.id === id);
        if (!wo) return { ok: false };
        // 幂等守卫：已完工/已关闭不再领料
        if (wo.status === 'completed' || wo.status === 'closed') return { ok: false };
        // 幂等守卫：已领料则不重复生成
        if (wo.issuedMaterials && wo.issuedMaterials.length > 0) return { ok: false };

        const today = new Date().toISOString().slice(0, 10);
        const stamp = Date.now();
        const outboundNo = `OUT-WO-ISSUE-${stamp}`;
        const outboundId = `out-wo-issue-${stamp}`;

        // 1. 检查库存充足
        const wh = useWarehouseStore.getState();
        for (const item of items) {
          const inventory = wh.inventoryRecords.find(
            (r) => r.materialId === item.materialId && r.warehouseId === 'wh-001'
          );
          const availableQty = inventory?.availableQuantity || 0;
          if (availableQty < item.quantity) {
            return {
              ok: false,
              reason: `物料 ${item.materialCode}（${item.materialName}）库存不足：当前可用 ${availableQty}，需领 ${item.quantity}`
            };
          }
        }

        // 2. 生成生产领料出库单（status: completed 触发仓库 store 事件驱动自动扣减库存）
        //    出库单经 warehouseStore.addOutboundOrder 中央双写落 D1（type='pick', sourceNo=工单号）。
        const outboundOrder = {
          id: outboundId,
          outboundNo,
          type: 'pick' as const,
          sourceNo: wo.orderNo,
          status: 'completed' as const,
          warehouseId: 'wh-001',
          warehouseName: '原材料仓',
          operator: wo.supervisor || '生产主管',
          outboundDate: today,
          remarks: `生产领料 - 工单${wo.orderNo} - ${wo.productName}`,
          items: items.map((item, idx) => ({
            id: `ob-wo-item-${idx}`,
            materialId: item.materialId,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: '',
            unit: item.unit,
            quantity: item.quantity,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: wo.supervisor || 'system',
          updatedBy: wo.supervisor || 'system',
        };
        wh.addOutboundOrder(outboundOrder);

        // 双写：工单领料明细逐条落 D1（POST /api/work-orders/picking），与本地领料明细一一对应
        if (isAuthed()) {
          for (const item of items) {
            b2Api
              .postPicking({
                workOrderId: wo.id,
                workOrderNo: wo.orderNo,
                materialId: item.materialId,
                materialCode: item.materialCode,
                materialName: item.materialName,
                unit: item.unit,
                quantity: item.quantity,
                outboundNo,
                issuedAt: today,
              })
              .catch(() => {});
          }
        }

        // 3. 回写工单领料明细（防重复领料）
        const issuedMaterials: IssuedMaterial[] = items.map((item, idx) => ({
          id: `issued-${stamp}-${idx}`,
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          issuedAt: today,
          outboundNo,
        }));

        set((s) => ({
          workOrders: s.workOrders.map((o) =>
            o.id === id ? { ...o, issuedMaterials, updatedAt: new Date().toISOString() } : o
          ),
        }));

        return { ok: true, outboundNo };
      },
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
      addMrpRecommendation: (rec) => set((s) => ({ mrpRecommendations: addArr(s.mrpRecommendations, rec) })),
      updateMrpRecommendation: (id, u) => set((s) => ({ mrpRecommendations: updateArr(s.mrpRecommendations, id, u) })),
      deleteMrpRecommendation: (id) => set((s) => ({ mrpRecommendations: deleteArr(s.mrpRecommendations, id) })),
      setMrpRecommendations: (recs) => set({ mrpRecommendations: recs }),

      // ProcessRoute
      addProcessRoute: (route) => set((s) => ({ processRoutes: addArr(s.processRoutes, route) })),
      updateProcessRoute: (id, u) => set((s) => ({ processRoutes: updateArr(s.processRoutes, id, u) })),
      deleteProcessRoute: (id) => set((s) => ({ processRoutes: deleteArr(s.processRoutes, id) })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-production',
      version: 1,
      partialize: (state) => ({
        // 仅持久化无 D1 后端的切片；workOrders 已迁 D1，不再写 app_state Blob（根治双通道）
        mrpRecommendations: state.mrpRecommendations,
        processRoutes: state.processRoutes,
      }),
    }
  )
);
