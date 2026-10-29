import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { ProductionVersion, ECN } from '@/types/production';
import { useBOMStore } from './bomStore';

/**
 * 生产版本 + 生产域 ECN store（V3.77.0 P0-1：Blob → D1 关系表）
 *
 * 整改前：persist(backendStorage, 'ssa-erp-prod-versions') 纯本地。
 * 整改后：versions → production_versions（资源 productionVersion）；
 *   ecns（生产域 ECN）→ production_ecns（资源 productionEcn）；
 *   均迁移 0101、rls 'all'。登录态 D1 权威源 + 水合；未登录种子兜底。
 *   releaseECN 切换关联 BOM 版本并生效（沿用既有联动）。
 *   linkChange/unlinkChange 镜像写物料域 EngineeringChange.linkedEcnIds（落 D1）。
 */

const VER_RES = 'productionVersion';
const ECN_RES = 'productionEcn';

const seedVersions: ProductionVersion[] = [
  {
    id: 'pv-001',
    version: 'V1.0',
    materialId: 'mat-001',
    materialCode: 'PRD-FRAME-001',
    materialName: '重型钢结构焊接架 H1200',
    bomId: 'bom-001',
    bomNo: 'BOM-2024-001',
    routeId: 'route-001',
    routeNo: 'R-2024-001',
    status: 'active',
    effectiveDate: '2026-01-01',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
];

const seedECNs: ECN[] = [
  {
    id: 'ecn-001',
    changeNo: 'ECN-2026-001',
    title: '焊接架结构加强',
    reason: '客户反馈承重不足，增加加强筋工序',
    materialId: 'mat-001',
    materialCode: 'PRD-FRAME-001',
    materialName: '重型钢结构焊接架 H1200',
    bomId: 'bom-001',
    bomNo: 'BOM-2024-001',
    oldVersion: 'V2.0',
    newVersion: 'V2.1',
    effectiveDate: '2026-08-01',
    status: 'draft',
    createdAt: '2026-07-10T08:00:00.000Z',
    updatedAt: '2026-07-10T08:00:00.000Z',
    createdBy: 'system',
    updatedBy: 'system',
  },
];

interface ProductionVersionState {
  versions: ProductionVersion[];
  ecns: ECN[];
  addVersion: (v: ProductionVersion) => void;
  updateVersion: (id: string, patch: Partial<ProductionVersion>) => void;
  deleteVersion: (id: string) => void;
  addECN: (e: ECN) => void;
  updateECN: (id: string, patch: Partial<ECN>) => void;
  deleteECN: (id: string) => void;
  /** 发布 ECN：切换关联 BOM 至新版本并生效 */
  releaseECN: (id: string) => void;
  /**
   * P0-4（V3.74.0）：把生产域 ECN 挂到物料域工程变更上，双向落库。
   * 与 ecnStore.linkEcn 等价（对侧镜像写 EngineeringChange.linkedEcnIds），任选其一调用即可。
   */
  linkChange: (ecnId: string, changeId: string) => Promise<void>;
  /** P0-4（V3.74.0）：解除上述关联，同样双向生效 */
  unlinkChange: (ecnId: string, changeId: string) => Promise<void>;
  /** V3.77.0：从 D1 水合 */
  hydrateProductionVersion: () => Promise<void>;
}

function parsePayload<T>(rows: any[]): T[] {
  return (rows || []).map((r: any) => (typeof r?.payload === 'string' ? JSON.parse(r.payload) : r?.payload)) as T[];
}

export const useProductionVersionStore = create<ProductionVersionState>()((set, get) => ({
  versions: seedVersions.map((v) => ({ ...v })),
  ecns: seedECNs.map((e) => ({ ...e })),

  addVersion: (v) => {
    set((s) => ({ versions: [...s.versions, v] }));
    if (isAuthed()) void entityRepo.create(VER_RES, { payload: v } as any).catch(() => {});
  },
  updateVersion: (id, patch) => {
    let updated: ProductionVersion | undefined;
    set((s) => ({
      versions: s.versions.map((v) => {
        if (v.id !== id) return v;
        updated = { ...v, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update(VER_RES, id, { payload: updated } as any).catch(() => {});
  },
  deleteVersion: (id) => {
    set((s) => ({ versions: s.versions.filter((v) => v.id !== id) }));
    if (isAuthed()) void entityRepo.remove(VER_RES, id).catch(() => {});
  },

  addECN: (e) => {
    set((s) => ({ ecns: [...s.ecns, e] }));
    if (isAuthed()) void entityRepo.create(ECN_RES, { payload: e } as any).catch(() => {});
  },
  updateECN: (id, patch) => {
    let updated: ECN | undefined;
    set((s) => ({
      ecns: s.ecns.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
    }));
    if (updated && isAuthed()) void entityRepo.update(ECN_RES, id, { payload: updated } as any).catch(() => {});
  },
  deleteECN: (id) => {
    set((s) => ({ ecns: s.ecns.filter((e) => e.id !== id) }));
    if (isAuthed()) void entityRepo.remove(ECN_RES, id).catch(() => {});
  },

  releaseECN: (id) => {
    const ecn = get().ecns.find((e) => e.id === id);
    if (!ecn) return;
    // 联动 BOM 版本切换
    useBOMStore.getState().updateBOM(ecn.bomId, {
      version: ecn.newVersion,
      status: 'released',
      effectiveDate: ecn.effectiveDate,
    });
    get().updateECN(id, { status: 'released', releasedAt: new Date().toISOString() } as Partial<ECN>);
  },

  linkChange: async (ecnId, changeId) => {
    const peer = get().ecns.find((e) => e.id === ecnId);
    if (!peer) return;
    get().updateECN(ecnId, {
      linkedChangeIds: [...new Set([...(peer.linkedChangeIds || []), changeId])],
    } as Partial<ECN>);
    // 镜像对侧（动态 import 打破静态循环；对侧落 D1）
    const { useECNStore } = await import('./ecnStore');
    const target = useECNStore.getState().ecns.find((e) => e.id === changeId);
    if (target && !(target.linkedEcnIds || []).includes(ecnId)) {
      useECNStore.getState().updateECN(changeId, {
        linkedEcnIds: [...(target.linkedEcnIds || []), ecnId],
      });
    }
  },

  unlinkChange: async (ecnId, changeId) => {
    const peer = get().ecns.find((e) => e.id === ecnId);
    if (peer) {
      get().updateECN(ecnId, {
        linkedChangeIds: (peer.linkedChangeIds || []).filter((x) => x !== changeId),
      } as Partial<ECN>);
    }
    const { useECNStore } = await import('./ecnStore');
    const target = useECNStore.getState().ecns.find((e) => e.id === changeId);
    if (target) {
      useECNStore.getState().updateECN(changeId, {
        linkedEcnIds: (target.linkedEcnIds || []).filter((x) => x !== ecnId),
      });
    }
  },

  hydrateProductionVersion: async () => {
    if (!isAuthed()) return;
    try {
      const vRes = await entityRepo.list<ProductionVersion>(VER_RES, { page: 1, pageSize: 500 });
      const vRows = parsePayload<ProductionVersion>(vRes?.data || []);
      const eRes = await entityRepo.list<ECN>(ECN_RES, { page: 1, pageSize: 500 });
      const eRows = parsePayload<ECN>(eRes?.data || []);
      // 版本回填
      if (vRows.length === 0) {
        for (const v of seedVersions) { try { await entityRepo.create(VER_RES, { payload: v } as any); } catch {} }
        const rf = await entityRepo.list<ProductionVersion>(VER_RES, { page: 1, pageSize: 500 });
        const v2 = parsePayload<ProductionVersion>(rf?.data || []);
        if (v2.length) { /* below set */ } else { /* keep seed */ }
        if (v2.length) set({ versions: v2 });
      } else {
        set({ versions: vRows });
      }
      // ECN 回填
      if (eRows.length === 0) {
        for (const e of seedECNs) { try { await entityRepo.create(ECN_RES, { payload: e } as any); } catch {} }
        const rf = await entityRepo.list<ECN>(ECN_RES, { page: 1, pageSize: 500 });
        const e2 = parsePayload<ECN>(rf?.data || []);
        if (e2.length) set({ ecns: e2 });
      } else {
        set({ ecns: eRows });
      }
    } catch {
      // 离线/异常：保留种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底，登录态从 D1 拉取）
void useProductionVersionStore.getState().hydrateProductionVersion();
