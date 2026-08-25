import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { InspectionTask, InspectionStandard, UnqualifiedItem, PDCARecord } from '@/types/quality';
import type { VendorQualityIssue } from '@/mocks/data/flowData';
import {
  inspectionTasks as mockInspectionTasks,
  inspectionStandards as mockInspectionStandards,
  unqualifiedItems as mockUnqualifiedItems,
  pdcaRecords as mockPdcaRecords,
} from '@/mocks/data/quality';
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseStore } from '@/stores/warehouseStore';

interface QualityState {
  inspectionTasks: InspectionTask[];
  inspectionStandards: InspectionStandard[];
  unqualifiedItems: UnqualifiedItem[];
  pdcaRecords: PDCARecord[];

  addInspectionTask: (task: InspectionTask) => void;
  updateInspectionTask: (id: string, updates: Partial<InspectionTask>) => void;
  deleteInspectionTask: (id: string) => void;

  addInspectionStandard: (standard: InspectionStandard) => void;
  updateInspectionStandard: (id: string, updates: Partial<InspectionStandard>) => void;
  deleteInspectionStandard: (id: string) => void;

  addUnqualifiedItem: (item: UnqualifiedItem) => void;
  updateUnqualifiedItem: (id: string, updates: Partial<UnqualifiedItem>) => void;
  deleteUnqualifiedItem: (id: string) => void;

  /** B7-T2：供应商门户质量问题单 → 主 ERP 不合格品(NCR) 回写，幂等守卫 */
  addVendorQualityIssue: (issue: VendorQualityIssue) => void;

  /** B4：NCR 处置联动 —— scrap 报废联动库存扣减+凭证；其余处置方式仅完成状态闭环 */
  disposeUnqualified: (
    id: string,
    payload?: { disposition?: string; operator?: string; actualCost?: number; remark?: string }
  ) => boolean;

  addPdcaRecord: (record: PDCARecord) => void;
  updatePdcaRecord: (id: string, updates: Partial<PDCARecord>) => void;
  deletePdcaRecord: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

// 本地 nowStr（与门户页面一致：YYYY-MM-DD HH:MM:SS），store 内不依赖页面私有函数
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export const useQualityStore = create<QualityState>()(
  persist(
    (set, get) => ({
      inspectionTasks: [...mockInspectionTasks],
      inspectionStandards: [...mockInspectionStandards],
      unqualifiedItems: [...mockUnqualifiedItems],
      pdcaRecords: [...mockPdcaRecords],

      addInspectionTask: (task) => set((s) => ({ inspectionTasks: addArr(s.inspectionTasks, task) })),
      updateInspectionTask: (id, u) => set((s) => ({ inspectionTasks: updateArr(s.inspectionTasks, id, u) })),
      deleteInspectionTask: (id) => set((s) => ({ inspectionTasks: deleteArr(s.inspectionTasks, id) })),

      addInspectionStandard: (standard) => set((s) => ({ inspectionStandards: addArr(s.inspectionStandards, standard) })),
      updateInspectionStandard: (id, u) => set((s) => ({ inspectionStandards: updateArr(s.inspectionStandards, id, u) })),
      deleteInspectionStandard: (id) => set((s) => ({ inspectionStandards: deleteArr(s.inspectionStandards, id) })),

      addUnqualifiedItem: (item) => set((s) => ({ unqualifiedItems: addArr(s.unqualifiedItems, item) })),
      updateUnqualifiedItem: (id, u) => set((s) => ({ unqualifiedItems: updateArr(s.unqualifiedItems, id, u) })),
      deleteUnqualifiedItem: (id) => set((s) => ({ unqualifiedItems: deleteArr(s.unqualifiedItems, id) })),

      // ── B7-T2：门户质量异常单 → 主 ERP 不合格品(NCR) ──────────────
      addVendorQualityIssue: (issue) => {
        // 幂等守卫：同一门户问题单已建 NCR 则不重复创建
        if (get().unqualifiedItems.some((x) => x.portalIssueId === issue.id)) return;
        const item: UnqualifiedItem = {
          id: `uq-vendor-${issue.id}`,
          itemNo: issue.issueNo,
          inspectionTaskId: `portal-${issue.id}`,
          inspectionTaskNo: issue.issueNo,
          materialCode: issue.materialCode,
          materialName: issue.materialName,
          batchNo: issue.batchNo || '-',
          defectQuantity: issue.defectQty,
          defectDescription: issue.description,
          disposition: 'rework',
          dispositionStatus: 'pending',
          status: 'open',
          source: 'vendor',
          portalIssueId: issue.id,
          vendorReported: true,
          responsiblePerson: issue.vendorName,
          dueDate: '',
          createdAt: nowStr(),
          updatedAt: nowStr(),
          createdBy: issue.vendorId,
          updatedBy: issue.vendorId,
        };
        set((s) => ({ unqualifiedItems: addArr(s.unqualifiedItems, item) }));
      },

      // ── B4：NCR 处置联动库存与财务 ──────────────────────────────
      // scrap(报废)：生成 scrap 出库单 → 真实扣减库存 + 自动生成报废凭证（借6602/贷1403|1405）
      // 其余处置方式（rework/concession/return/isolate/other 等）：仅完成状态闭环，不联动库存
      disposeUnqualified: (id, payload = {}) => {
        const item = get().unqualifiedItems.find((x) => x.id === id);
        if (!item) return false;
        // 幂等守卫：已处置完成则不再重复联动，防止重复扣减库存/重复生成凭证
        if (item.dispositionStatus === 'completed') return false;

        const method = payload.disposition || item.disposition || 'other';
        const operator = payload.operator || item.responsiblePerson || '质量员';
        const today = new Date().toISOString().slice(0, 10);

        let linkedOutboundNo: string | undefined;
        let actualDisposition: string | undefined;

        if (method === 'scrap') {
          const material = useMaterialStore.getState().materials.find((m) => m.code === item.materialCode);
          if (material) {
            const ts = Date.now();
            const outboundNo = `OUT-SCRAP-${ts}`;
            useWarehouseStore.getState().addOutboundOrder({
              id: `ob-scrap-${ts}`,
              outboundNo,
              type: 'scrap',
              status: 'completed',
              warehouseId: 'wh-001',
              warehouseName: '主仓库-A区',
              operator,
              outboundDate: today,
              items: [
                {
                  id: `ob-scrap-item-${ts}`,
                  materialId: material.id,
                  materialCode: material.code,
                  materialName: material.name,
                  specification: material.specification,
                  unit: material.unit,
                  quantity: item.defectQuantity,
                },
              ],
              remarks: `NCR 报废处置联动：${item.itemNo}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'system',
              updatedBy: 'system',
            });
            linkedOutboundNo = outboundNo;
          }
          actualDisposition = 'scrap';
        } else {
          // 非报废处置：仅状态闭环，不联动库存/凭证（return_vendor/concession 等更大联动留待后续）
          actualDisposition = method;
        }

        set((s) => ({
          unqualifiedItems: s.unqualifiedItems.map((x) =>
            x.id === id
              ? {
                  ...x,
                  dispositionStatus: 'completed',
                  completedDate: x.completedDate || today,
                  linkedOutboundNo: linkedOutboundNo ?? x.linkedOutboundNo,
                  actualDisposition: actualDisposition ?? x.actualDisposition,
                }
              : x
          ),
        }));
        return true;
      },

      addPdcaRecord: (record) => set((s) => ({ pdcaRecords: addArr(s.pdcaRecords, record) })),
      updatePdcaRecord: (id, u) => set((s) => ({ pdcaRecords: updateArr(s.pdcaRecords, id, u) })),
      deletePdcaRecord: (id) => set((s) => ({ pdcaRecords: deleteArr(s.pdcaRecords, id) })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-quality',
      version: 1,
      partialize: (state) => ({
        inspectionTasks: state.inspectionTasks,
        inspectionStandards: state.inspectionStandards,
        unqualifiedItems: state.unqualifiedItems,
        pdcaRecords: state.pdcaRecords,
      }),
    }
  )
);
