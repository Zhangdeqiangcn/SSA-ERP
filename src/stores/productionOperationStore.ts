import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { OperationReport, WorkCenter } from '@/types/production';
// ★ V3.46.0 第2批③：生产运营域落库。此前本 store 的 8 个写动作全是纯 set（同步），
//   数据只进浏览器 —— 见文件头「为什么必须迁库」的说明。
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { useGlobalToastStore } from '@/stores/globalToastStore';

/**
 * 生产执行 / 工序报工 store（P2-3 核心）
 * ------------------------------------------------------------
 * 承载 V2.14 productionStore 之外的生产执行层数据，避免污染其 partialize：
 *  1. operationReports：车间工序报工（合格/报废/操作工/工时），驱动 WIP 与成本归集。
 *  2. workCenters：工作中心产能主数据（原 CapacityScheduling 的 localStorage 迁入，落实 store 化纪律）。
 *  3. laborRate / machineRate：成本归集费率参数（元/小时），供成本页与报表共享。
 * 独立 persist 键 ssa-erp-production-op。
 */

export const DEFAULT_CENTER_NAMES = ['切割中心', '焊接中心', '喷涂中心', '装配中心', '质检中心'] as const;

export const DEFAULT_WORK_CENTERS: WorkCenter[] = [
  { id: 'wc-cut', name: '切割中心', capacityHours: 16, description: '下料切割类工序' },
  { id: 'wc-weld', name: '焊接中心', capacityHours: 16, description: '组焊点焊类工序' },
  { id: 'wc-paint', name: '喷涂中心', capacityHours: 8, description: '喷涂涂装类工序' },
  { id: 'wc-assem', name: '装配中心', capacityHours: 16, description: '折弯成型/装配类工序' },
  { id: 'wc-qc', name: '质检中心', capacityHours: 8, description: '检验类工序' },
];

/** 将工序中的实际工作中心名称映射到本页统一的产能中心（与 APS / 负荷页共用） */
export const mapCenter = (wc?: string): string => {
  if (!wc) return DEFAULT_CENTER_NAMES[0];
  if (/切割|激光|下料|冲|锯/.test(wc)) return '切割中心';
  if (/焊/.test(wc)) return '焊接中心';
  if (/喷涂|涂|漆/.test(wc)) return '喷涂中心';
  if (/折弯|打磨|组|装配|成型/.test(wc)) return '装配中心';
  if (/检|验|质|量/.test(wc)) return '质检中心';
  return DEFAULT_CENTER_NAMES[0];
};

export const CENTER_COLORS: Record<string, string> = {
  切割中心: '#3B82F6',
  焊接中心: '#F59E0B',
  喷涂中心: '#8B5CF6',
  装配中心: '#10B981',
  质检中心: '#EF4444',
};

/** 默认费率（元/小时） */
export const DEFAULT_LABOR_RATE = 50;
export const DEFAULT_MACHINE_RATE = 120;

export const DEFAULT_OPERATION_REPORTS: OperationReport[] = [
  {
    id: 'or-001',
    workOrderId: 'wo-001',
    workOrderNo: 'WO-2024-0501',
    operationId: 'op-001',
    operationName: '下料切割',
    workCenter: '数控切割区',
    operator: '李操作员',
    startTime: '2024-05-08T08:00:00Z',
    endTime: '2024-05-09T12:00:00Z',
    goodQuantity: 5,
    scrapQuantity: 0,
    laborHours: 4.25,
    note: '首道工序报工（种子数据）',
    reportedAt: '2024-05-09T12:10:00Z',
  },
  {
    id: 'or-002',
    workOrderId: 'wo-001',
    workOrderNo: 'WO-2024-0501',
    operationId: 'op-002',
    operationName: '折弯成型',
    workCenter: '折弯机组',
    operator: '王操作员',
    startTime: '2024-05-09T14:00:00Z',
    endTime: '2024-05-10T10:00:00Z',
    goodQuantity: 5,
    scrapQuantity: 0,
    laborHours: 2.83,
    note: '第二道工序报工（种子数据）',
    reportedAt: '2024-05-10T10:10:00Z',
  },
];

interface ProductionOperationState {
  operationReports: OperationReport[];
  workCenters: WorkCenter[];
  laborRate: number;
  machineRate: number;

  // 报工 CRUD
  addOperationReport: (rep: Omit<OperationReport, 'id' | 'reportedAt'> & { reportedAt?: string }) => void;
  updateOperationReport: (id: string, patch: Partial<Omit<OperationReport, 'id'>>) => void;
  removeOperationReport: (id: string) => void;

  // 工作中心 CRUD
  addWorkCenter: (c: Omit<WorkCenter, 'id'>) => void;
  updateWorkCenter: (id: string, patch: Partial<Omit<WorkCenter, 'id'>>) => void;
  removeWorkCenter: (id: string) => void;

  // 费率
  setLaborRate: (v: number) => void;
  setMachineRate: (v: number) => void;

  /** 从 D1 载入（登鉴权时调用） */
  load: () => Promise<void>;
  /** 载入当前生效费率 */
  loadRates: (asOf?: string) => Promise<void>;

  resetAll: () => void;
}

/** 把后端错误翻译成人能看懂的原因（与 bomStore/financeStore 同款，避免各 store 各写一套） */
function readableError(e: any): string {
  const status = e?.response?.status;
  if (status === 401) return '登录已过期，请重新登录后重试';
  if (status === 403) return '当前账号没有生产运营数据的写入权限';
  const msg = e?.response?.data?.error;
  if (typeof msg === 'string' && msg) return msg;
  if (e?.code === 'ERR_NETWORK') return '网络不可达';
  return '网络或服务器异常';
}

export const useProductionOperationStore = create<ProductionOperationState>()(
  persist(
    (set, get) => ({
      operationReports: DEFAULT_OPERATION_REPORTS.map((r) => ({ ...r })),
      workCenters: DEFAULT_WORK_CENTERS.map((c) => ({ ...c })),
      laborRate: DEFAULT_LABOR_RATE,
      machineRate: DEFAULT_MACHINE_RATE,

      /** 从 D1 载入工序报工 / 工作中心 / 费率（首次拉取为空时回填种子，保证界面不为空） */
      load: async () => {
        if (!isAuthed()) return;
        try {
          const [reps, wcs] = await Promise.all([
            entityRepo.list<OperationReport>('mesOperationReport', { page: 1, pageSize: 200 }),
            entityRepo.list<WorkCenter>('workCenter', { page: 1, pageSize: 200 }),
          ]);
          const repRows = Array.isArray(reps?.data) ? reps.data : [];
          const wcRows = Array.isArray(wcs?.data) ? wcs.data : [];
          set((s) => ({
            // 库里为空才回填本地种子：回填会真写库，重复执行会产生重复数据
            operationReports: repRows.length > 0 ? repRows : s.operationReports,
            workCenters: wcRows.length > 0 ? wcRows : s.workCenters,
          }));
          await get().loadRates();
        } catch (e: any) {
          // 读取失败保留现有内存态（离线容忍），但必须让用户知道「看到的可能不是最新」
          useGlobalToastStore.getState().showError(`工序报工/工作中心从服务器载入失败，界面显示的是本机数据：${readableError(e)}`);
        }
      },

      /** 载入当前生效费率（取 effective_date <= 今天 的最新一条） */
      loadRates: async (asOf?: string) => {
        if (!isAuthed()) return;
        const today = asOf || new Date().toISOString().slice(0, 10);
        try {
          const [l, m] = await Promise.all([
            entityRepo.list<any>('productionRate', { page: 1, pageSize: 200, rateType: 'labor' }),
            entityRepo.list<any>('productionRate', { page: 1, pageSize: 200, rateType: 'machine' }),
          ]);
          // entityRepo.list 返回分页对象 {data,total,...}，不是数组（照抄 Array.isArray 会恒为 false → 费率永远取回 0）
          const pick = (res: any, fallback: number) => {
            const list = (Array.isArray(res?.data) ? res.data : [])
              .filter((r: any) => String(r.effectiveDate || '') <= today)
              .sort((a: any, b: any) => String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || '')));
            const v = Number(list[0]?.rate);
            return Number.isFinite(v) && v >= 0 ? v : fallback;
          };
          set({ laborRate: pick(l, get().laborRate), machineRate: pick(m, get().machineRate) });
        } catch (e: any) {
          useGlobalToastStore.getState().showError(`成本费率载入失败，暂用本机费率（会导致成本不可复算）：${readableError(e)}`);
        }
      },

      // ── 报工 CRUD（乐观更新 + 写失败回滚 + 红条告警）────────────────
      //   写失败**必须回滚**：报工一旦留在本地而没落库，工单进度可能已按它算过，
      //   刷新后数量回退 → 进度倒退、倒冲重复扣料（V3.45.0 已在工单侧修过同类问题）。
      addOperationReport: (rep) => {
        const local: OperationReport = { ...rep, id: `or-${Date.now()}`, reportedAt: rep.reportedAt || new Date().toISOString() };
        set((state) => ({ operationReports: [...state.operationReports, local] }));
        if (!isAuthed()) return; // 未登录：纯本地（演示/离线），不假装已落库
        entityRepo.create('mesOperationReport', local as any)
          .then((created: any) => {
            const serverId = created?.id;
            if (serverId && serverId !== local.id) {
              set((state) => ({ operationReports: state.operationReports.map((r) => (r.id === local.id ? { ...r, id: serverId } : r)) }));
            }
          })
          .catch((e: any) => {
            set((state) => ({ operationReports: state.operationReports.filter((r) => r.id !== local.id) }));
            useGlobalToastStore.getState().showError(`工序报工 ${local.operationName || local.id} 保存失败，已回滚：${readableError(e)}`);
          });
      },
      updateOperationReport: (id, patch) => {
        const before = get().operationReports.find((r) => r.id === id);
        set((state) => ({ operationReports: state.operationReports.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
        if (!isAuthed() || !before) return;
        entityRepo.update('mesOperationReport', id, { ...before, ...patch } as any)
          .catch((e: any) => {
            set((state) => ({ operationReports: state.operationReports.map((r) => (r.id === id ? before : r)) }));
            useGlobalToastStore.getState().showError(`工序报工 ${before.operationName || id} 修改失败，已回滚：${readableError(e)}`);
          });
      },
      removeOperationReport: (id) => {
        const before = get().operationReports.find((r) => r.id === id);
        set((state) => ({ operationReports: state.operationReports.filter((r) => r.id !== id) }));
        if (!isAuthed()) return;
        entityRepo.remove('mesOperationReport', id)
          .catch((e: any) => {
            set((state) => ({ operationReports: [...state.operationReports, before as OperationReport] }));
            useGlobalToastStore.getState().showError(`工序报工 ${before?.operationName || id} 删除失败，已恢复：${readableError(e)}`);
          });
      },

      // ── 工作中心 CRUD（同上纪律）──────────────────────────────────
      addWorkCenter: (c) => {
        const local: WorkCenter = { ...c, id: `wc-${Date.now()}` };
        set((state) => ({ workCenters: [...state.workCenters, local] }));
        if (!isAuthed()) return;
        entityRepo.create('workCenter', local as any)
          .then((created: any) => {
            const serverId = created?.id;
            if (serverId && serverId !== local.id) {
              set((state) => ({ workCenters: state.workCenters.map((x) => (x.id === local.id ? { ...x, id: serverId } : x)) }));
            }
          })
          .catch((e: any) => {
            set((state) => ({ workCenters: state.workCenters.filter((x) => x.id !== local.id) }));
            useGlobalToastStore.getState().showError(`工作中心「${local.name}」新增失败，已回滚：${readableError(e)}`);
          });
      },
      updateWorkCenter: (id, patch) => {
        const before = get().workCenters.find((c) => c.id === id);
        set((state) => ({ workCenters: state.workCenters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        if (!isAuthed() || !before) return;
        entityRepo.update('workCenter', id, { ...before, ...patch } as any)
          .catch((e: any) => {
            set((state) => ({ workCenters: state.workCenters.map((c) => (c.id === id ? before : c)) }));
            useGlobalToastStore.getState().showError(`工作中心「${before.name}」修改失败，已回滚：${readableError(e)}`);
          });
      },
      removeWorkCenter: (id) => {
        const before = get().workCenters.find((c) => c.id === id);
        set((state) => ({ workCenters: state.workCenters.filter((c) => c.id !== id) }));
        if (!isAuthed()) return;
        entityRepo.remove('workCenter', id)
          .catch((e: any) => {
            set((state) => ({ workCenters: [...state.workCenters, before as WorkCenter] }));
            useGlobalToastStore.getState().showError(`工作中心「${before?.name || id}」删除失败，已恢复：${readableError(e)}`);
          });
      },

      // ── 费率：写库（带生效日），本地立即生效 ─────────────────────
      //   改费率必须带生效日并**新增一条**，而不是就地改历史那一条 ——
      //   否则 6 月调价会把 5 月已完工产品的成本一起改掉（历史不可复算）。
      setLaborRate: (v) => {
        const rate = Number.isFinite(v) && v >= 0 ? v : 0;
        set({ laborRate: rate });
        if (!isAuthed()) return;
        const effectiveDate = new Date().toISOString().slice(0, 10);
        entityRepo.create('productionRate', { rateType: 'labor', effectiveDate, rate } as any)
          .catch((e: any) => useGlobalToastStore.getState().showError(`人工费率保存失败（下次载入会取回旧值，成本将不可复算）：${readableError(e)}`));
      },
      setMachineRate: (v) => {
        const rate = Number.isFinite(v) && v >= 0 ? v : 0;
        set({ machineRate: rate });
        if (!isAuthed()) return;
        const effectiveDate = new Date().toISOString().slice(0, 10);
        entityRepo.create('productionRate', { rateType: 'machine', effectiveDate, rate } as any)
          .catch((e: any) => useGlobalToastStore.getState().showError(`机器费率保存失败（下次载入会取回旧值，成本将不可复算）：${readableError(e)}`));
      },

      resetAll: () =>
        set({
          operationReports: DEFAULT_OPERATION_REPORTS.map((r) => ({ ...r })),
          workCenters: DEFAULT_WORK_CENTERS.map((c) => ({ ...c })),
          laborRate: DEFAULT_LABOR_RATE,
          machineRate: DEFAULT_MACHINE_RATE,
        }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-production-op',
      version: 2,
      partialize: (state) => ({
        operationReports: state.operationReports,
        workCenters: state.workCenters,
        laborRate: state.laborRate,
        machineRate: state.machineRate,
      }),
    }
  )
);
