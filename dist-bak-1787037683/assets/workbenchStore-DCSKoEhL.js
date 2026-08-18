import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
const WIDGET_LIBRARY = [
  { id: "todo", title: "我的待办", desc: "按业务分类聚合的待处理事项" },
  { id: "alert", title: "预警与通知", desc: "实时业务预警与系统公告" },
  { id: "metrics", title: "业务监控", desc: "关键经营指标快照" },
  { id: "quicklinks", title: "常用功能", desc: "一键直达常用页面" }
];
const DEFAULT_QUICK_LINKS = [
  { id: "ql-material", label: "物料列表", path: "/material/list", icon: "inventory" },
  { id: "ql-po", label: "采购订单", path: "/purchase/orders", icon: "assignment" },
  { id: "ql-qc", label: "检验任务", path: "/quality/inspection", icon: "factcheck" },
  { id: "ql-inv", label: "发票管理", path: "/finance/invoices", icon: "account" },
  { id: "ql-wo", label: "工单管理", path: "/production/orders", icon: "assignment" },
  { id: "ql-report", label: "报表中心", path: "/reports", icon: "report" }
];
const DEFAULT_WIDGETS = ["todo", "alert", "metrics", "quicklinks"];
const useWorkbenchStore = create()(
  persist(
    (set) => ({
      visibleWidgets: [...DEFAULT_WIDGETS],
      quickLinks: [...DEFAULT_QUICK_LINKS],
      editMode: false,
      toggleWidget: (id) => set(
        (s) => s.visibleWidgets.includes(id) ? { visibleWidgets: s.visibleWidgets.filter((w) => w !== id) } : { visibleWidgets: [...s.visibleWidgets, id] }
      ),
      addQuickLink: (link) => set(
        (s) => s.quickLinks.some((l) => l.id === link.id) ? s : { quickLinks: [...s.quickLinks, link] }
      ),
      removeQuickLink: (id) => set((s) => ({ quickLinks: s.quickLinks.filter((l) => l.id !== id) })),
      reorderWidgets: (from, to) => set((s) => {
        const arr = [...s.visibleWidgets];
        if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return s;
        const [m] = arr.splice(from, 1);
        arr.splice(to, 0, m);
        return { visibleWidgets: arr };
      }),
      setEditMode: (v) => set({ editMode: v }),
      resetLayout: () => set({
        visibleWidgets: [...DEFAULT_WIDGETS],
        quickLinks: [...DEFAULT_QUICK_LINKS],
        editMode: false
      })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-workbench"
    }
  )
);
export {
  WIDGET_LIBRARY as W,
  useWorkbenchStore as u
};
