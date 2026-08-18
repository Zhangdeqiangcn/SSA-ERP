// P4-1 个人工作台：可个性化布局（卡片显隐 / 顺序 / 常用功能）持久化
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';

export type WidgetId = 'todo' | 'alert' | 'metrics' | 'quicklinks';

export interface QuickLink {
  id: string;
  label: string;
  path: string;
  icon: string; // 图标 key，由页面解析为图标组件
}

export interface WidgetDef {
  id: WidgetId;
  title: string;
  desc: string;
}

// 可选卡片库（用于「添加卡片」）
export const WIDGET_LIBRARY: WidgetDef[] = [
  { id: 'todo', title: '我的待办', desc: '按业务分类聚合的待处理事项' },
  { id: 'alert', title: '预警与通知', desc: '实时业务预警与系统公告' },
  { id: 'metrics', title: '业务监控', desc: '关键经营指标快照' },
  { id: 'quicklinks', title: '常用功能', desc: '一键直达常用页面' },
];

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'ql-material', label: '物料列表', path: '/material/list', icon: 'inventory' },
  { id: 'ql-po', label: '采购订单', path: '/purchase/orders', icon: 'assignment' },
  { id: 'ql-qc', label: '检验任务', path: '/quality/inspection', icon: 'factcheck' },
  { id: 'ql-inv', label: '发票管理', path: '/finance/invoices', icon: 'account' },
  { id: 'ql-wo', label: '工单管理', path: '/production/orders', icon: 'assignment' },
  { id: 'ql-report', label: '报表中心', path: '/reports', icon: 'report' },
];

const DEFAULT_WIDGETS: WidgetId[] = ['todo', 'alert', 'metrics', 'quicklinks'];

interface WorkbenchState {
  visibleWidgets: WidgetId[];
  quickLinks: QuickLink[];
  editMode: boolean;
  toggleWidget: (id: WidgetId) => void;
  addQuickLink: (link: QuickLink) => void;
  removeQuickLink: (id: string) => void;
  reorderWidgets: (from: number, to: number) => void;
  setEditMode: (v: boolean) => void;
  resetLayout: () => void;
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set) => ({
      visibleWidgets: [...DEFAULT_WIDGETS],
      quickLinks: [...DEFAULT_QUICK_LINKS],
      editMode: false,
      toggleWidget: (id) =>
        set((s) =>
          s.visibleWidgets.includes(id)
            ? { visibleWidgets: s.visibleWidgets.filter((w) => w !== id) }
            : { visibleWidgets: [...s.visibleWidgets, id] }
        ),
      addQuickLink: (link) =>
        set((s) =>
          s.quickLinks.some((l) => l.id === link.id) ? s : { quickLinks: [...s.quickLinks, link] }
        ),
      removeQuickLink: (id) =>
        set((s) => ({ quickLinks: s.quickLinks.filter((l) => l.id !== id) })),
      reorderWidgets: (from, to) =>
        set((s) => {
          const arr = [...s.visibleWidgets];
          if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return s;
          const [m] = arr.splice(from, 1);
          arr.splice(to, 0, m);
          return { visibleWidgets: arr };
        }),
      setEditMode: (v) => set({ editMode: v }),
      resetLayout: () =>
        set({
          visibleWidgets: [...DEFAULT_WIDGETS],
          quickLinks: [...DEFAULT_QUICK_LINKS],
          editMode: false,
        }),
    }),
    { storage: backendStorage,
     name: 'ssa-erp-workbench' }
  )
);
