import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { Organization, OrgType } from '@/types';

/**
 * 多组织 / 多账套（V3.77.0 P0-2：组织目录 Blob → D1 关系表）
 *
 * 整改前：persist(backendStorage, 'ssa-erp-org') 纯本地——组织目录只在单机生效。
 * 整改后：organizations 落 D1 关系表 system_orgs（迁移 0101，resource systemOrg，rls 'all'）。
 *   与鉴权 orgs 表**解耦**（避免触碰登录/多组织隔离主链路）。
 *   currentOrgId（全局组织上下文）仍本地持久化——它是会话级上下文，必须可靠本地，不参与共享。
 *   数据流：登录态 D1 权威源 + 挂载水合；未登录本地种子兜底；CRUD 本地即时 + 登录态写穿。
 */

const RES = 'systemOrg';

const today = (): string => new Date().toISOString().slice(0, 10);

type OrgInput = Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;

const seedOrgs: Organization[] = [
  {
    id: 'ORG-001', code: 'HQ', name: 'SSA公司', type: 'company', ledgerCode: '1000',
    currency: '人民币 (CNY)', taxNo: '91310000HQ0001', address: '上海市浦东新区世纪大道 100 号',
    contact: '021-88888888', status: 'active', intercompanyEnabled: true,
    createdAt: today(), updatedAt: today(), createdBy: 'system', updatedBy: 'system',
  },
  {
    id: 'ORG-WH-001', code: 'WH-PLANT', name: '武汉工厂', type: 'plant', parentOrgId: 'ORG-001', parentId: 'ORG-001',
    ledgerCode: '1100', currency: '人民币 (CNY)', address: '湖北省武汉市东湖高新区光谷大道 88 号', contact: '027-66666666',
    status: 'active', intercompanyEnabled: false, createdAt: today(), updatedAt: today(), createdBy: 'system', updatedBy: 'system',
  },
  {
    id: 'ORG-WH-DEPT-001', code: 'WH-PROD', name: '生产部', type: 'department', parentOrgId: 'ORG-WH-001', parentId: 'ORG-WH-001',
    ledgerCode: '1101', currency: '人民币 (CNY)', address: '湖北省武汉市东湖高新区光谷大道 88 号', contact: '',
    status: 'active', intercompanyEnabled: false, createdAt: today(), updatedAt: today(), createdBy: 'system', updatedBy: 'system',
  },
  {
    id: 'ORG-WH-DEPT-002', code: 'WH-QC', name: '质检部', type: 'department', parentOrgId: 'ORG-WH-001', parentId: 'ORG-WH-001',
    ledgerCode: '1102', currency: '人民币 (CNY)', address: '湖北省武汉市东湖高新区光谷大道 88 号', contact: '',
    status: 'active', intercompanyEnabled: false, createdAt: today(), updatedAt: today(), createdBy: 'system', updatedBy: 'system',
  },
  {
    id: 'ORG-002', code: 'EAST', name: '华东制造公司', type: 'plant', parentOrgId: 'ORG-001', parentId: 'ORG-001',
    ledgerCode: '2000', currency: '人民币 (CNY)', taxNo: '91320000EAST02', address: '江苏省苏州市工业园区星湖街 88 号', contact: '0512-66666666',
    status: 'active', intercompanyEnabled: true, createdAt: today(), updatedAt: today(), createdBy: 'system', updatedBy: 'system',
  },
  {
    id: 'ORG-003', code: 'TRADE', name: '贸易事业部', type: 'department', parentOrgId: 'ORG-001', parentId: 'ORG-001',
    ledgerCode: '3000', currency: '人民币 (CNY)', address: '上海市黄浦区南京东路 200 号', contact: '',
    status: 'active', intercompanyEnabled: false, createdAt: today(), updatedAt: today(), createdBy: 'system', updatedBy: 'system',
  },
];

function parse(rows: any[]): Organization[] {
  return (rows || []).map((r: any) => (typeof r?.payload === 'string' ? JSON.parse(r.payload) : r?.payload)) as Organization[];
}

interface OrgState {
  organizations: Organization[];
  currentOrgId: string;
  addOrg: (o: OrgInput) => void;
  updateOrg: (id: string, u: Partial<Organization>) => void;
  deleteOrg: (id: string) => void;
  setCurrentOrg: (id: string) => void;
  resetOrgs: () => void;
  /** V3.77.0：从 D1 水合 */
  hydrateOrgs: () => Promise<void>;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      organizations: [...seedOrgs],
      currentOrgId: 'ORG-001',

      addOrg: (o) => {
        const org: Organization = { ...o, id: `ORG-${Date.now()}`, createdAt: today(), updatedAt: today(), createdBy: 'admin', updatedBy: 'admin' };
        set((state) => ({ organizations: [...state.organizations, org] }));
        if (isAuthed()) void entityRepo.create(RES, { payload: org } as any).catch(() => {});
      },

      updateOrg: (id, u) => {
        let updated: Organization | undefined;
        set((state) => ({
          organizations: state.organizations.map((x) => {
            if (x.id !== id) return x;
            updated = { ...x, ...u, updatedAt: today(), updatedBy: 'admin' };
            return updated;
          }),
        }));
        if (updated && isAuthed()) void entityRepo.update(RES, id, { payload: updated } as any).catch(() => {});
      },

      deleteOrg: (id) => {
        if (id === get().currentOrgId) return; // 不允许删除当前组织，避免上下文丢失
        set((state) => ({ organizations: state.organizations.filter((x) => x.id !== id) }));
        if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
      },

      setCurrentOrg: (id) => set({ currentOrgId: id }),

      resetOrgs: () => {
        set({ organizations: [...seedOrgs], currentOrgId: 'ORG-001' });
        if (isAuthed()) {
          for (const o of seedOrgs) void entityRepo.update(RES, o.id, { payload: o } as any).catch(() => {});
        }
      },

      hydrateOrgs: async () => {
        if (!isAuthed()) return;
        try {
          const res = await entityRepo.list<Organization>(RES, { page: 1, pageSize: 500 });
          const rows = parse(res?.data || []);
          if (rows.length === 0) {
            for (const o of seedOrgs) { try { await entityRepo.create(RES, { payload: o } as any); } catch {} }
            const rf = await entityRepo.list<Organization>(RES, { page: 1, pageSize: 500 });
            const r2 = parse(rf?.data || []);
            if (r2.length) set({ organizations: r2 });
            return;
          }
          set({ organizations: rows });
        } catch {
          // 离线/异常：保留种子态
        }
      },
    }),
    {
      name: 'ssa-erp-org',
      version: 2,
      // 仅持久化 currentOrgId（全局组织上下文，必须本地可靠）；organizations 由 D1 水合
      partialize: (state) => ({ currentOrgId: state.currentOrgId }),
    }
  )
);

// 模块加载即自动水合组织目录（未登录/离线静默兜底）
void useOrgStore.getState().hydrateOrgs();

/** 取当前组织对象（供页面展示账套/本位币） */
export const useCurrentOrg = (): Organization | undefined =>
  useOrgStore((s) => s.organizations.find((o) => o.id === s.currentOrgId));
