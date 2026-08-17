import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  InspectionLot, COQRecord, QmVendorFeedback, InspectionTask,
} from '@/types';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { useQualityStore } from '@/stores/qualityStore';
import { buildVendorRatingInput, computeVendorRating } from '@/utils/vendorRating';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePriceStore } from '@/stores/priceStore';
import { useSettingsStore } from '@/stores/settingsStore';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const today = () => new Date().toISOString().slice(0, 10);

interface QualityAdvancedState {
  inspectionLots: InspectionLot[];
  coqRecords: COQRecord[];
  qmVendorFeedback: QmVendorFeedback[];

  // 检验批
  addInspectionLot: (lot: InspectionLot) => void;
  updateInspectionLot: (id: string, u: Partial<InspectionLot>) => void;
  deleteInspectionLot: (id: string) => void;
  // 采购入库自动生成检验批（事件驱动）
  autoCreateLotsFromInbound: (inbound: { id: string; inboundNo: string; vendorId?: string; vendorName?: string; status: string; items: { materialId: string; materialCode?: string; materialName?: string; quantity: number; batchNo?: string }[] }) => void;
  // 判定检验批结果（含 QM → 供应商评级回流）
  judgeLot: (lotId: string, status: 'in_inspection' | 'passed' | 'failed', inspector?: string) => void;

  // COQ
  addCOQ: (r: COQRecord) => void;
  updateCOQ: (id: string, u: Partial<COQRecord>) => void;
  deleteCOQ: (id: string) => void;

  // QM → 供应商评级回流
  recordQmFeedback: (vendorId: string, vendorName: string, lotNo: string, result: 'pass' | 'fail') => void;
  // 计算某供应商在纳入 QM 反馈后的重算评级影响
  recalcVendorQm: (vendorId: string) => { qualityPassRate: number | null; gradeAfter: string; scoreAfter: number | null };
}

const seedCOQ: COQRecord[] = [
  { id: 'coq-seed-1', period: '2026-07', category: 'prevention', costCenter: '质量部', amount: 12000, note: '质量培训', createdAt: today(), updatedAt: today(), createdBy: '质量部', updatedBy: '质量部' },
  { id: 'coq-seed-2', period: '2026-07', category: 'appraisal', costCenter: '质检中心', amount: 18000, note: '来料检验', createdAt: today(), updatedAt: today(), createdBy: '质量部', updatedBy: '质量部' },
];

export const useQualityAdvancedStore = create<QualityAdvancedState>()(
  persist(
    (set, get) => ({
      inspectionLots: [],
      coqRecords: [...seedCOQ],
      qmVendorFeedback: [],

      // ── 检验批 ──
      addInspectionLot: (lot) => set((s) => ({ inspectionLots: [...s.inspectionLots, lot] })),
      updateInspectionLot: (id, u) =>
        set((s) => ({ inspectionLots: s.inspectionLots.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteInspectionLot: (id) => set((s) => ({ inspectionLots: s.inspectionLots.filter((x) => x.id !== id) })),

      // 采购入库完成 → 自动生成检验批 + 质检扣留
      autoCreateLotsFromInbound: (inbound) => {
        if (inbound.type !== 'purchase' || inbound.status !== 'completed') return;
        const stamp = Date.now();
        const lots: InspectionLot[] = inbound.items.map((it, i) => ({
          id: `lot-${stamp}-${i}`,
          lotNo: `LOT-${inbound.inboundNo}-${i + 1}`,
          sourceType: 'inbound',
          sourceNo: inbound.inboundNo,
          materialId: it.materialId,
          materialCode: it.materialCode || '',
          materialName: it.materialName || '',
          batchNo: it.batchNo,
          quantity: it.quantity,
          vendorId: inbound.vendorId,
          vendorName: inbound.vendorName,
          status: 'pending',
          createdFrom: '采购入库自动生成',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: '系统',
          updatedBy: '系统',
        }));
        const holds = lots.map((lot) => ({
          id: `qh-${lot.id}`,
          materialId: lot.materialId,
          materialCode: lot.materialCode,
          materialName: lot.materialName,
          warehouseId: 'wh-001',
          batchNo: lot.batchNo,
          quantity: lot.quantity,
          status: 'pending' as const,
          sourceInboundNo: inbound.inboundNo,
          holdDate: today(),
          reason: '采购入库待检',
        }));
        set((s) => ({ inspectionLots: [...s.inspectionLots, ...lots] }));
        holds.forEach((h) => useWarehouseAdvancedStore.getState().addQualityHold(h));
      },

      // 判定检验批结果
      judgeLot: (lotId, status, inspector) => {
        const lot = get().inspectionLots.find((x) => x.id === lotId);
        if (!lot) return;
        set((s) => ({ inspectionLots: s.inspectionLots.map((x) => (x.id === lotId ? { ...x, status, updatedAt: today(), updatedBy: inspector || '当前用户' } : x)) }));
        // 同步释放对应质检扣留
        const holds = useWarehouseAdvancedStore.getState().qualityHolds.filter((h) => h.sourceInboundNo === lot.sourceNo && h.materialId === lot.materialId && h.status === 'pending');
        holds.forEach((h) => useWarehouseAdvancedStore.getState().releaseQualityHold(h.id, status === 'failed' ? 'rejected' : 'passed', inspector));
        // QM → 供应商评级回流：失败则记录反馈并写入一条失败的来料检验任务
        if (lot.vendorId) {
          get().recordQmFeedback(lot.vendorId, lot.vendorName || '', lot.lotNo, status === 'failed' ? 'fail' : 'pass');
        }
      },

      // ── COQ ──
      addCOQ: (r) => set((s) => ({ coqRecords: [...s.coqRecords, r] })),
      updateCOQ: (id, u) => set((s) => ({ coqRecords: s.coqRecords.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today() } : x)) })),
      deleteCOQ: (id) => set((s) => ({ coqRecords: s.coqRecords.filter((x) => x.id !== id) })),

      // ── QM → 供应商评级回流 ──
      recordQmFeedback: (vendorId, vendorName, lotNo, result) => {
        const existing = get().qmVendorFeedback.find((f) => f.lotNo === lotNo);
        if (existing) return;
        const fb: QmVendorFeedback = { id: uid('qmf'), vendorId, vendorName, lotNo, result, date: today() };
        set((s) => ({ qmVendorFeedback: [...s.qmVendorFeedback, fb] }));
        // 失败 → 写入一条「失败」的来料检验任务，使既有供应商评级引擎自动纳入
        if (result === 'fail') {
          const task: InspectionTask = {
            id: uid('it'),
            taskNo: `IT-QM-${lotNo}`,
            type: 'incoming',
            status: 'failed',
            materialId: '',
            materialCode: '',
            materialName: lotNo,
            batchNo: '',
            quantity: 0,
            sampleQuantity: 0,
            vendorId,
            vendorName,
            inspectionStandardId: 'N/A',
            inspectionStandardName: 'QM回流自动生成',
            assignedTo: '系统',
            plannedDate: today(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: '系统',
            updatedBy: '系统',
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
          vendorId,
        });
        const res = computeVendorRating(input, cfg);
        return {
          qualityPassRate: input.qualityPassRate,
          gradeAfter: res.grade,
          scoreAfter: res.score,
        };
      },
    }),
    {
      name: 'ssa-erp-quality-adv',
      version: 1,
      partialize: (state) => ({
        inspectionLots: state.inspectionLots,
        coqRecords: state.coqRecords,
        qmVendorFeedback: state.qmVendorFeedback,
      }),
    }
  )
);

// ── 事件驱动：采购入库完成自动生成检验批 ──
// 持久化种子入库单（rehydration 前/后）一律标记为已见，避免重复建批；
// 订阅回调只处理「本次状态变更真正新增」的采购入库单。
const __qaSeen = new Set<string>();
const __qaMarkSeen = () => {
  useWarehouseStore.getState().inboundOrders.forEach((o) => __qaSeen.add(o.id));
};
__qaMarkSeen(); // 同步 rehydration 已完成时直接登记
if (useWarehouseStore.persist?.onFinishHydration) {
  useWarehouseStore.persist.onFinishHydration(__qaMarkSeen); // 异步 rehydration 完成后再登记
}
useWarehouseStore.subscribe((state, prev) => {
  const prevIds = new Set((prev?.inboundOrders || []).map((o) => o.id));
  for (const o of state.inboundOrders) {
    if (prevIds.has(o.id) || __qaSeen.has(o.id)) continue; // 仅处理新增且未处理的
    __qaSeen.add(o.id);
    if (o.type === 'purchase' && o.status === 'completed') {
      useQualityAdvancedStore.getState().autoCreateLotsFromInbound(o);
    }
  }
});
