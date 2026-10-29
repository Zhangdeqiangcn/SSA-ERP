import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { entityRepo } from '@/services/entityRepo';
import {
  InspectionLot, COQRecord, QmVendorFeedback, InspectionTask, InboundOrder, UnqualifiedItem,
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

// ═════════════════════════════════════════════════════════════════════════
// V3.66.0 P0-1 检验批台账关系化（根治「台账 Blob vs 服务端拦截 D1」不同源错位）：
// 服务端 checkQualityBlocked 读 D1 拦截，而检验批台账此前是 persist(backendStorage)
// 的整块 Blob——「台账显示已闭环、拦截仍拦」（或反之）错位。现把 inspectionLots
// 迁为 D1 关系表 inspection_lots（0095 建表，0090 并无此表——审计报告误标），
// 经通用实体路由读写；COQ/QM 反馈仍走 Blob（展示统计类，非服务端消费）。对外接口不变。
// ═════════════════════════════════════════════════════════════════════════
// ── 嵌套字段无（检验批全为标量列，直接按列映射）────────────────────
// localStorage 安全访问（SSR/测试环境不崩）
const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

interface QualityAdvancedState {
  inspectionLots: InspectionLot[];
  coqRecords: COQRecord[];
  qmVendorFeedback: QmVendorFeedback[];

  // 检验批
  addInspectionLot: (lot: InspectionLot) => void;
  updateInspectionLot: (id: string, u: Partial<InspectionLot>) => void;
  deleteInspectionLot: (id: string) => void;
  /** V3.66.0 P0-1：启动时从 D1 水合检验批台账（主源 = inspection_lots 表） */
  hydrateLots: () => Promise<void>;
  // 采购入库自动生成检验批（事件驱动）
  autoCreateLotsFromInbound: (inbound: InboundOrder) => void;
  // 判定检验批结果（含 QM → 供应商评级回流）
  judgeLot: (lotId: string, status: 'in_inspection' | 'passed' | 'failed', inspector?: string) => void;

  // COQ
  addCOQ: (r: COQRecord) => void;
  updateCOQ: (id: string, u: Partial<COQRecord>) => void;
  deleteCOQ: (id: string) => void;

  // QM → 供应商评级回流（materialCtx 可选：继承检验批物料/批次，使回流任务能被库存质量拦截识别）
  recordQmFeedback: (vendorId: string, vendorName: string, lotNo: string, result: 'pass' | 'fail', materialCtx?: { materialId?: string; materialCode?: string; batchNo?: string }) => void;
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
      // V3.66.0 P0-1：检验批主源 = D1 inspection_lots（启动水合），本地仅作水合前占位/离线副本
      inspectionLots: [],
      coqRecords: [...seedCOQ],
      qmVendorFeedback: [],

      hydrateLots: async () => {
        try {
          const res = await entityRepo.list<any>('inspectionLot', { page: 1, pageSize: 500 });
          const list: InspectionLot[] = (res?.data || []).map((r: any) => {
            const { extraJson, ...rest } = r;
            return { ...(rest as any) };
          });
          // 空库首次：从本地 Blob 副本回填（保护已判定过的检验批，避免 D1 新建后丢失本地历史）
          if (list.length === 0 && !lsGet('ssa-erp-backfilled-inspectionLot')) {
            const local = JSON.parse(lsGet('ssa-erp-quality-adv') || '{}');
            const seed: any[] = Array.isArray(local?.state?.inspectionLots) ? local.state.inspectionLots : [];
            lsSet('ssa-erp-backfilled-inspectionLot', '1');
            for (const lot of seed) { try { await entityRepo.create('inspectionLot', lot); } catch { /* 冲突忽略 */ } }
            const refreshed = await entityRepo.list<any>('inspectionLot', { page: 1, pageSize: 500 });
            set({ inspectionLots: (refreshed?.data || []).map((r: any) => ({ ...r })) as any });
            return;
          }
          set({ inspectionLots: list });
        } catch {
          /* 离线/异常：保留本地副本（persist 水合结果），D1 主源不可达不阻断 */
        }
      },

      // ── 检验批（V3.66.0 P0-1：乐观本地 + entityRepo 同步 D1）──
      addInspectionLot: (lot) => {
        set((s) => ({ inspectionLots: [...s.inspectionLots, lot] }));
        entityRepo.create('inspectionLot', lot).catch(() => {});
      },
      updateInspectionLot: (id, u) =>
        set((s) => ({ inspectionLots: s.inspectionLots.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: '当前用户' } : x)) })),
      deleteInspectionLot: (id) =>
        set((s) => ({ inspectionLots: s.inspectionLots.filter((x) => x.id !== id) })),

      // 采购入库完成 → 自动生成检验批 + 质检扣留
      autoCreateLotsFromInbound: (inbound) => {
        if (inbound.type !== 'purchase' || inbound.status !== 'completed') return;
        // ★ 幂等守卫（V3.113.1）：同一入库单已存在的检验批号不再重复生成。
        //   根因：自动建批由 useWarehouseStore 订阅驱动，而"已处理"标记 __qaSeen 是**内存态**——
        //   页面一刷新订阅重新注册、水合时会把"早就存在的入库单"当成新增再处理一遍；
        //   检验批 id 含时间戳（lot-${Date.now()}-${i}），于是每次刷新都多生成一批**同 lot_no、不同 id**的
        //   重复检验批（实测生产库单租户累积到 100 条），并连带重复挂质检扣留。
        //   此处按 sourceNo + lotNo 判重，保证"刷新页面不重复建批"。
        const existingLotNos = new Set(
          get()
            .inspectionLots.filter((l) => l.sourceNo === inbound.inboundNo)
            .map((l) => l.lotNo)
        );
        const stamp = Date.now();
        const lots: InspectionLot[] = inbound.items
          .map((it, i): InspectionLot => ({
            id: `lot-${stamp}-${i}`,
            lotNo: `LOT-${inbound.inboundNo}-${i + 1}`,
            sourceType: 'inbound' as const,
            sourceNo: inbound.inboundNo,
            materialId: it.materialId,
            materialCode: it.materialCode || '',
            materialName: it.materialName || '',
            batchNo: it.batchNo,
            quantity: it.actualQuantity,
            vendorId: inbound.vendorId,
            vendorName: inbound.vendorName,
            status: 'pending',
            createdFrom: '采购入库自动生成',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: '系统',
            updatedBy: '系统',
          }))
          .filter((lot) => !existingLotNos.has(lot.lotNo));
        // 全部已存在 → 无需再建（避免重复质检扣留）
        if (lots.length === 0) return;
        // P0-3：自动建批时关联已存在（先建）的 incoming 检验任务（按 materialCode+vendorId 匹配最近一条），双向互引。
        //   覆盖「先建任务后建批」路径：建批时回写 批.inspectionTaskId + 任务.inspectionLotId。
        lots.forEach((lot) => {
          const linkedTask = useQualityStore.getState().inspectionTasks
            .filter((t) => t.type === 'incoming' && t.materialCode === lot.materialCode && t.vendorId === lot.vendorId && !t.inspectionLotId)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
          if (linkedTask) {
            lot.inspectionTaskId = linkedTask.id;
            useQualityStore.getState().updateInspectionTask(linkedTask.id, { inspectionLotId: lot.id });
          }
        });
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
        // V3.66.0 P0-1：自动建批同步 D1（采购入库待检批次成为服务端拦截数据源）
        lots.forEach((l) => entityRepo.create('inspectionLot', l).catch(() => {}));
        holds.forEach((h) => useWarehouseAdvancedStore.getState().addQualityHold(h));
      },

      // 判定检验批结果
      judgeLot: (lotId, status, inspector) => {
        const lot = get().inspectionLots.find((x) => x.id === lotId);
        if (!lot) return;
        set((s) => ({ inspectionLots: s.inspectionLots.map((x) => (x.id === lotId ? { ...x, status, updatedAt: today(), updatedBy: inspector || '当前用户' } : x)) }));
        // V3.66.0 P0-1：判定状态同步回 D1 台账（与服务端 checkQualityBlocked 读源一致，根治「台账已闭环、拦截仍拦」错位）
        entityRepo.update('inspectionLot', lotId, { status, updatedBy: inspector || '当前用户' }).catch(() => {});
        // 同步释放对应质检扣留
        const holds = useWarehouseAdvancedStore.getState().qualityHolds.filter((h) => h.sourceInboundNo === lot.sourceNo && h.materialId === lot.materialId && h.status === 'pending');
        holds.forEach((h) => useWarehouseAdvancedStore.getState().releaseQualityHold(h.id, status === 'failed' ? 'rejected' : 'passed', inspector));
        // QM → 供应商评级回流：失败则记录反馈并写入一条失败的来料检验任务
        // ★ V3.64.0 P0-1：把检验批的真实物料/批次继承给回流任务，否则任务 materialId 恒为空，
        //   inventoryPosting.checkQualityBlocked 的 failed 分支按物料匹配不到 → 来料检不合格永不拦截（漏拦）。
        if (lot.vendorId) {
          get().recordQmFeedback(
            lot.vendorId,
            lot.vendorName || '',
            lot.lotNo,
            status === 'failed' ? 'fail' : 'pass',
            { materialId: lot.materialId, materialCode: lot.materialCode, batchNo: lot.batchNo },
          );
        }
      },

      // ── COQ ──
      addCOQ: (r) => set((s) => ({ coqRecords: [...s.coqRecords, r] })),
      updateCOQ: (id, u) => set((s) => ({ coqRecords: s.coqRecords.map((x) => (x.id === id ? { ...x, ...u, updatedAt: today() } : x)) })),
      deleteCOQ: (id) => set((s) => ({ coqRecords: s.coqRecords.filter((x) => x.id !== id) })),

      // ── QM → 供应商评级回流 ──
      recordQmFeedback: (vendorId, vendorName, lotNo, result, materialCtx) => {
        const existing = get().qmVendorFeedback.find((f) => f.lotNo === lotNo);
        if (existing) return;
        const fb: QmVendorFeedback = { id: uid('qmf'), vendorId, vendorName, lotNo, result, date: today() };
        set((s) => ({ qmVendorFeedback: [...s.qmVendorFeedback, fb] }));
        // 失败 → 写入一条「失败」的来料检验任务，使既有供应商评级引擎自动纳入
        if (result === 'fail') {
          const matCode = materialCtx?.materialCode || lotNo;
          const matId = materialCtx?.materialId || '';
          const matBatch = materialCtx?.batchNo || '';
          const task: InspectionTask = {
            id: uid('it'),
            taskNo: `IT-QM-${lotNo}`,
            type: 'incoming',
            status: 'failed',
            materialId: matId,
            materialCode: matCode,
            materialName: matCode,
            batchNo: matBatch,
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
          // ★ V3.64.0 P0-1（防死锁）：同步挂一条可处置闭环的不合格品 NCR。
          //   inventoryPosting.checkQualityBlocked 的来料检 failed 分支判定"存在已闭环
          //   不合格品"才放行——若不建这条 NCR，failed 任务将永久拦截（无处闭环）。
          //   NCR 的 inspectionTaskId 锚定本任务 id，处置（报废/返工/让步/退供应商）后
          //   dispositionStatus='completed'，拦截自动解除。
          const ncr: UnqualifiedItem = {
            id: uid('nrcr'),
            itemNo: `NCR-${lotNo}`,
            inspectionTaskId: task.id,
            inspectionTaskNo: task.taskNo,
            materialCode: matCode,
            materialName: matCode,
            batchNo: matBatch || '-',
            defectQuantity: 0,
            defectDescription: `来料检不合格（QM回流 ${lotNo}，供应商 ${vendorName || '-'}）`,
            disposition: 'rework',
            dispositionStatus: 'pending',
            status: 'open',
            source: 'inspection',
            responsiblePerson: vendorName || '质量员',
            dueDate: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: '系统',
            updatedBy: '系统',
          };
          useQualityStore.getState().addUnqualifiedItem(ncr);
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
    { storage: backendStorage,
      
      name: 'ssa-erp-quality-adv',
      version: 2,
      partialize: (state) => ({
        // V3.66.0 P0-1：检验批不再进 Blob（主源 = D1），仅 COQ/QM 反馈保留本地离线兜底
        coqRecords: state.coqRecords,
        qmVendorFeedback: state.qmVendorFeedback,
      }),
    }
  )
);

// ── V3.66.0 P0-1：启动水合检验批台账（D1 主源，与 qualityStore 同款顶层触发）──
void useQualityAdvancedStore.getState().hydrateLots();

// ── 事件驱动：采购入库完成自动生成检验批 ──
// 持久化种子入库单（rehydration 前/后）一律标记为已见，避免重复建批；
// 订阅回调只处理「本次状态变更真正新增」的采购入库单。
const __qaSeen = new Set<string>();
const __qaMarkSeen = () => {
  useWarehouseStore.getState().inboundOrders.forEach((o) => __qaSeen.add(o.id));
};
// 延迟到模块初始化完成后执行：避免本模块被其他 store（如 warehouseStore 经中间模块）静态 import 时，
// 顶层直接访问 useWarehouseStore 触发循环依赖 TDZ（Cannot access ... before initialization）
setTimeout(() => {
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
}, 0);
