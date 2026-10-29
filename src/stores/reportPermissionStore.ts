import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import type { ReportPermission, ReportSubscription, ReportRole } from '@/types';
import { parsePayload, splitByKind, withKind, writeRow } from './entityBackedShared';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const now = () => new Date().toISOString();

interface ReportPermissionState {
  reportPermissions: ReportPermission[];
  subscriptions: ReportSubscription[];
  setReportRoles: (reportId: string, reportName: string, roles: ReportRole[]) => void;
  addSubscription: (sub: Omit<ReportSubscription, 'id' | 'createdAt'>) => void;
  updateSubscription: (id: string, patch: Partial<Omit<ReportSubscription, 'id' | 'createdAt'>>) => void;
  deleteSubscription: (id: string) => void;
  /** V3.77.0：从 D1 水合 */
  hydrateReportPermission: () => Promise<void>;
}

const RES = 'reportPermission';

export const useReportPermissionStore = create<ReportPermissionState>()((set, get) => ({
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

  setReportRoles: (reportId, reportName, roles) => {
    set((s) => {
      const exists = s.reportPermissions.find((r) => r.reportId === reportId);
      const next = exists
        ? s.reportPermissions.map((r) => (r.reportId === reportId ? { ...r, allowedRoles: roles } : r))
        : [...s.reportPermissions, { reportId, reportName, allowedRoles: roles }];
      return { reportPermissions: next };
    });
    const cur = get().reportPermissions.find((r) => r.reportId === reportId);
    if (cur && isAuthed()) writeRow(RES, cur.reportId, withKind('perm', cur));
  },

  addSubscription: (sub) => {
    const item: ReportSubscription = { ...sub, id: uid('sub'), createdAt: now() };
    set((s) => ({ subscriptions: [...s.subscriptions, item] }));
    if (isAuthed()) writeRow(RES, item.id, withKind('sub', item));
  },
  updateSubscription: (id, patch) => {
    let updated: ReportSubscription | undefined;
    set((s) => ({
      subscriptions: s.subscriptions.map((x) => {
        if (x.id !== id) return x;
        updated = { ...x, ...patch };
        return updated;
      }),
    }));
    if (updated && isAuthed()) writeRow(RES, id, withKind('sub', updated));
  },
  deleteSubscription: (id) => {
    set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
    if (isAuthed()) void entityRepo.remove(RES, id).catch(() => {});
  },

  hydrateReportPermission: async () => {
    if (!isAuthed()) return;
    try {
      const res = await entityRepo.list(RES, { page: 1, pageSize: 500 });
      const rows = parsePayload(res?.data || []);
      const perms = splitByKind<ReportPermission>(rows, 'perm');
      const subs = splitByKind<ReportSubscription>(rows, 'sub');
      if (perms.length || subs.length) {
        set({ reportPermissions: perms.length ? perms : get().reportPermissions, subscriptions: subs.length ? subs : get().subscriptions });
      } else {
        for (const p of get().reportPermissions) writeRow(RES, p.reportId, withKind('perm', p));
        for (const s of get().subscriptions) writeRow(RES, s.id, withKind('sub', s));
        const rf = await entityRepo.list(RES, { page: 1, pageSize: 500 });
        const r2 = parsePayload(rf?.data || []);
        set({
          reportPermissions: splitByKind<ReportPermission>(r2, 'perm'),
          subscriptions: splitByKind<ReportSubscription>(r2, 'sub'),
        });
      }
    } catch {
      // 离线/异常：保留本地种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void useReportPermissionStore.getState().hydrateReportPermission();
