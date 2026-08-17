import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Organization, OrgType } from '@/types';

/**
 * 多组织 / 多账套（P2-2 核心）
 * ------------------------------------------------------------
 * 维护组织树（公司/子公司/部门）与账套信息，并提供 currentOrgId 作为全局
 * 组织上下文。顶栏切换器修改 currentOrgId；各业务模块按 orgId 过滤数据，
 * 新建单据自动打上 currentOrgId。遗留数据（无 orgId）在任一组织下可见，
 * 以兼容升级前的持久化数据。
 */

const today = (): string => new Date().toISOString().slice(0, 10);

type OrgInput = Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>;

const seedOrgs: Organization[] = [
  {
    id: 'ORG-001',
    code: 'HQ',
    name: 'SSA公司',
    type: 'company',
    ledgerCode: '1000',
    currency: '人民币 (CNY)',
    taxNo: '91310000HQ0001',
    address: '上海市浦东新区世纪大道 100 号',
    contact: '021-88888888',
    status: 'active',
    intercompanyEnabled: true,
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'ORG-WH-001',
    code: 'WH-PLANT',
    name: '武汉工厂',
    type: 'plant',
    parentOrgId: 'ORG-001',
    parentId: 'ORG-001',
    ledgerCode: '1100',
    currency: '人民币 (CNY)',
    address: '湖北省武汉市东湖高新区光谷大道 88 号',
    contact: '027-66666666',
    status: 'active',
    intercompanyEnabled: false,
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'ORG-WH-DEPT-001',
    code: 'WH-PROD',
    name: '生产部',
    type: 'department',
    parentOrgId: 'ORG-WH-001',
    parentId: 'ORG-WH-001',
    ledgerCode: '1101',
    currency: '人民币 (CNY)',
    address: '湖北省武汉市东湖高新区光谷大道 88 号',
    contact: '',
    status: 'active',
    intercompanyEnabled: false,
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'ORG-WH-DEPT-002',
    code: 'WH-QC',
    name: '质检部',
    type: 'department',
    parentOrgId: 'ORG-WH-001',
    parentId: 'ORG-WH-001',
    ledgerCode: '1102',
    currency: '人民币 (CNY)',
    address: '湖北省武汉市东湖高新区光谷大道 88 号',
    contact: '',
    status: 'active',
    intercompanyEnabled: false,
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'ORG-002',
    code: 'EAST',
    name: '华东制造公司',
    type: 'plant',
    parentOrgId: 'ORG-001',
    parentId: 'ORG-001',
    ledgerCode: '2000',
    currency: '人民币 (CNY)',
    taxNo: '91320000EAST02',
    address: '江苏省苏州市工业园区星湖街 88 号',
    contact: '0512-66666666',
    status: 'active',
    intercompanyEnabled: true,
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'ORG-003',
    code: 'TRADE',
    name: '贸易事业部',
    type: 'department',
    parentOrgId: 'ORG-001',
    parentId: 'ORG-001',
    ledgerCode: '3000',
    currency: '人民币 (CNY)',
    address: '上海市黄浦区南京东路 200 号',
    contact: '',
    status: 'active',
    intercompanyEnabled: false,
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
];

interface OrgState {
  organizations: Organization[];
  currentOrgId: string;
  addOrg: (o: OrgInput) => void;
  updateOrg: (id: string, u: Partial<Organization>) => void;
  deleteOrg: (id: string) => void;
  setCurrentOrg: (id: string) => void;
  resetOrgs: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      organizations: [...seedOrgs],
      currentOrgId: 'ORG-001',

      addOrg: (o) =>
        set((state) => ({
          organizations: [
            ...state.organizations,
            {
              ...o,
              id: `ORG-${Date.now()}`,
              createdAt: today(),
              updatedAt: today(),
              createdBy: 'admin',
              updatedBy: 'admin',
            },
          ],
        })),

      updateOrg: (id, u) =>
        set((state) => ({
          organizations: state.organizations.map((x) =>
            x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: 'admin' } : x
          ),
        })),

      // 不允许删除当前组织，避免上下文丢失
      deleteOrg: (id) =>
        set((state) => {
          if (id === state.currentOrgId) return state;
          return { organizations: state.organizations.filter((x) => x.id !== id) };
        }),

      setCurrentOrg: (id) => set({ currentOrgId: id }),

      resetOrgs: () => set({ organizations: [...seedOrgs], currentOrgId: 'ORG-001' }),
    }),
    {
      name: 'ssa-erp-org',
      version: 2,
      partialize: (state) => ({
        organizations: state.organizations,
        currentOrgId: state.currentOrgId,
      }),
    }
  )
);

/** 取当前组织对象（供页面展示账套/本位币） */
export const useCurrentOrg = (): Organization | undefined =>
  useOrgStore((s) => s.organizations.find((o) => o.id === s.currentOrgId));
