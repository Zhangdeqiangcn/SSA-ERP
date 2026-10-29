import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { EngineeringChange } from '@/types/material';
import { useProductionVersionStore } from './productionVersionStore';

/**
 * 工程变更 ECN store（V3.77.0 P0-1：Blob 双通道 → D1 关系表）
 *
 * 整改前：persist(backendStorage, 'ssa-erp-ecn') 纯本地——
 *   V3.74 的"ECN 双源双向引用"只在两个前端本地 store 互写，未落 D1，
 *   跨终端/重新部署即丢、后端读不到（审计新发现的修复落地缺陷）。
 * 整改后：落 D1 关系表 ecns（迁移 0101，entities 注册 ecn，rls 'all'）。
 *   数据流：登录态 D1 权威源 + 挂载水合（D1 空一次性回填种子）；
 *   未登录本地种子兜底；CRUD 本地即时 + 登录态写穿。
 *   双向引用 linkEcn/unlinkEcn 仍镜像写对侧 production_ecns（落 D1）。
 */

const RES = 'ecn';

const seedECNs: EngineeringChange[] = [
  {
    id: 'ecn-001',
    changeNo: 'ECN-2026-001',
    title: '钢板厚度升级',
    materialId: 'mat-001',
    materialName: '热轧钢板 Q235B 3mm',
    fromVersion: 'V1.0',
    toVersion: 'V2.0',
    changeType: 'material',
    oldValue: '3mm',
    newValue: '5mm',
    effectiveDate: '2026-09-01',
    status: 'draft',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'ecn-002',
    changeNo: 'ECN-2026-002',
    title: '焊接工艺变更',
    materialId: 'mat-002',
    materialName: 'H型钢 200×200×8×12',
    fromVersion: 'V1.0',
    toVersion: 'V2.0',
    changeType: 'bom',
    oldValue: '手工焊接',
    newValue: '自动焊接',
    effectiveDate: '2026-10-01',
    status: 'approved',
    approvedBy: '工艺主管',
    createdAt: '2026-08-05T08:00:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
  },
];

interface ECNState {
  ecns: EngineeringChange[];
  addECN: (ecn: EngineeringChange) => void;
  updateECN: (id: string, patch: Partial<EngineeringChange>) => void;
  deleteECN: (id: string) => void;
  getECNById: (id: string) => EngineeringChange | undefined;
  /**
   * P0-4（V3.74.0）：把物料域变更挂到生产域 ECN 上，双向落库。
   * 本方法维护本侧 linkedEcnIds，并镜像写对侧 ECN.linkedChangeIds（落 D1）。
   */
  linkEcn: (changeId: string, ecnId: string) => void;
  /** P0-4（V3.74.0）：解除上述关联，同样双向生效 */
  unlinkEcn: (changeId: string, ecnId: string) => void;
  /** V3.77.0：从 D1 水合（页面挂载调用） */
  hydrateECN: () => Promise<void>;
}

function parsePayload<T>(rows: any[]): T[] {
  return (rows || []).map((r: any) => (typeof r?.payload === 'string' ? JSON.parse(r.payload) : r?.payload)) as T[];
}

export const useECNStore = create<ECNState>()((set, get) => ({
  ecns: seedECNs.map((e) => ({ ...e })),

  addECN: (ecn) => {
    set((state) => ({ ecns: [...state.ecns, ecn] }));
    if (isAuthed()) void entityRepo.create(RES, { payload: ecn } as any).catch(() => {});
  },

  updateECN: (id, patch) => {
    let updated: EngineeringChange | undefined;
    set((state) => ({
      ecns: state.ecns.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update(RES, id, { payload: updated } as any).catch(() => {});
  },

  deleteECN: (id) => {
    set((state) => ({ ecns: state.ecns.filter((e) => e.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  getECNById: (id) => get().ecns.find((e) => e.id === id),

  linkEcn: (changeId, ecnId) => {
    const peer = useProductionVersionStore.getState().ecns.find((e) => e.id === ecnId);
    if (!peer) return;
    const cur = get().ecns.find((e) => e.id === changeId);
    if (!cur) return;
    get().updateECN(changeId, {
      linkedEcnIds: [...new Set([...(cur.linkedEcnIds || []), ecnId])],
    });
    // 镜像对侧（其自身落 D1，fire-and-forget）
    void useProductionVersionStore.getState().linkChange(ecnId, changeId);
  },

  unlinkEcn: (changeId, ecnId) => {
    const cur = get().ecns.find((e) => e.id === changeId);
    if (!cur) return;
    get().updateECN(changeId, {
      linkedEcnIds: (cur.linkedEcnIds || []).filter((x) => x !== ecnId),
    });
    void useProductionVersionStore.getState().unlinkChange(ecnId, changeId);
  },

  hydrateECN: async () => {
    if (!isAuthed()) return; // 未登录：本地种子兜底
    try {
      const res = await entityRepo.list<EngineeringChange>(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload<EngineeringChange>(res?.data || []);
      if (rows.length === 0) {
        // 一次性回填种子
        for (const e of seedECNs) {
          try { await entityRepo.create(RES, { payload: e } as any); } catch { /* 冲突忽略 */ }
        }
        const refreshed = await entityRepo.list<EngineeringChange>(RES, { page: 1, pageSize: 500 });
        const rows2 = parsePayload<EngineeringChange>(refreshed?.data || []);
        if (rows2.length) set({ ecns: rows2 });
        return;
      }
      set({ ecns: rows });
    } catch {
      // 离线或后端异常：保留本地种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底，登录态从 D1 拉取）
void useECNStore.getState().hydrateECN();
