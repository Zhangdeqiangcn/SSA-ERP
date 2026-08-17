import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportPermission, ReportSubscription, ReportRole } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const now = () => new Date().toISOString();

interface ReportPermissionState {
  reportPermissions: ReportPermission[];
  subscriptions: ReportSubscription[];
  setReportRoles: (reportId: string, reportName: string, roles: ReportRole[]) => void;
  addSubscription: (sub: Omit<ReportSubscription, 'id' | 'createdAt'>) => void;
  updateSubscription: (id: string, patch: Partial<Omit<ReportSubscription, 'id' | 'createdAt'>>) => void;
  deleteSubscription: (id: string) => void;
}

export const useReportPermissionStore = create<ReportPermissionState>()(
  persist(
    (set) => ({
      reportPermissions: [
        { reportId: 'rp-1', reportName: '销售汇总报表', allowedRoles: ['admin', 'manager', 'finance'] },
        { reportId: 'rp-2', reportName: '库存周转报表', allowedRoles: ['admin', 'warehouse'] },
        { reportId: 'rp-3', reportName: '财务报表数据集', allowedRoles: ['admin', 'finance'] },
      ],
      subscriptions: [
        {
          id: 'sub-seed-1',
          reportId: 'rp-1',
          reportName: '销售汇总报表',
          frequency: 'weekly',
          recipients: 'manager@ssa.com',
          channel: 'email',
          enabled: true,
          createdAt: now(),
        },
      ],
      setReportRoles: (reportId, reportName, roles) =>
        set((s) => {
          const exists = s.reportPermissions.find((r) => r.reportId === reportId);
          const next = exists
            ? s.reportPermissions.map((r) => (r.reportId === reportId ? { ...r, allowedRoles: roles } : r))
            : [...s.reportPermissions, { reportId, reportName, allowedRoles: roles }];
          return { reportPermissions: next };
        }),
      addSubscription: (sub) =>
        set((s) => ({
          subscriptions: [...s.subscriptions, { ...sub, id: uid('sub'), createdAt: now() }],
        })),
      updateSubscription: (id, patch) =>
        set((s) => ({ subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteSubscription: (id) =>
        set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) })),
    }),
    { name: 'ssa-erp-report-perm' },
  ),
);
