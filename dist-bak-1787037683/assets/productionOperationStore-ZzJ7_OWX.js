import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
const DEFAULT_CENTER_NAMES = ["切割中心", "焊接中心", "喷涂中心", "装配中心", "质检中心"];
const DEFAULT_WORK_CENTERS = [
  { id: "wc-cut", name: "切割中心", capacityHours: 16, description: "下料切割类工序" },
  { id: "wc-weld", name: "焊接中心", capacityHours: 16, description: "组焊点焊类工序" },
  { id: "wc-paint", name: "喷涂中心", capacityHours: 8, description: "喷涂涂装类工序" },
  { id: "wc-assem", name: "装配中心", capacityHours: 16, description: "折弯成型/装配类工序" },
  { id: "wc-qc", name: "质检中心", capacityHours: 8, description: "检验类工序" }
];
const mapCenter = (wc) => {
  if (!wc) return DEFAULT_CENTER_NAMES[0];
  if (/切割|激光|下料|冲|锯/.test(wc)) return "切割中心";
  if (/焊/.test(wc)) return "焊接中心";
  if (/喷涂|涂|漆/.test(wc)) return "喷涂中心";
  if (/折弯|打磨|组|装配|成型/.test(wc)) return "装配中心";
  if (/检|验|质|量/.test(wc)) return "质检中心";
  return DEFAULT_CENTER_NAMES[0];
};
const CENTER_COLORS = {
  切割中心: "#3B82F6",
  焊接中心: "#F59E0B",
  喷涂中心: "#8B5CF6",
  装配中心: "#10B981",
  质检中心: "#EF4444"
};
const DEFAULT_LABOR_RATE = 50;
const DEFAULT_MACHINE_RATE = 120;
const DEFAULT_OPERATION_REPORTS = [
  {
    id: "or-001",
    workOrderId: "wo-001",
    workOrderNo: "WO-2024-0501",
    operationId: "op-001",
    operationName: "下料切割",
    workCenter: "数控切割区",
    operator: "李操作员",
    startTime: "2024-05-08T08:00:00Z",
    endTime: "2024-05-09T12:00:00Z",
    goodQuantity: 5,
    scrapQuantity: 0,
    laborHours: 4.25,
    note: "首道工序报工（种子数据）",
    reportedAt: "2024-05-09T12:10:00Z"
  },
  {
    id: "or-002",
    workOrderId: "wo-001",
    workOrderNo: "WO-2024-0501",
    operationId: "op-002",
    operationName: "折弯成型",
    workCenter: "折弯机组",
    operator: "王操作员",
    startTime: "2024-05-09T14:00:00Z",
    endTime: "2024-05-10T10:00:00Z",
    goodQuantity: 5,
    scrapQuantity: 0,
    laborHours: 2.83,
    note: "第二道工序报工（种子数据）",
    reportedAt: "2024-05-10T10:10:00Z"
  }
];
const useProductionOperationStore = create()(
  persist(
    (set) => ({
      operationReports: DEFAULT_OPERATION_REPORTS.map((r) => ({ ...r })),
      workCenters: DEFAULT_WORK_CENTERS.map((c) => ({ ...c })),
      laborRate: DEFAULT_LABOR_RATE,
      machineRate: DEFAULT_MACHINE_RATE,
      addOperationReport: (rep) => set((state) => ({
        operationReports: [
          ...state.operationReports,
          { ...rep, id: `or-${Date.now()}`, reportedAt: rep.reportedAt || (/* @__PURE__ */ new Date()).toISOString() }
        ]
      })),
      updateOperationReport: (id, patch) => set((state) => ({
        operationReports: state.operationReports.map((r) => r.id === id ? { ...r, ...patch } : r)
      })),
      removeOperationReport: (id) => set((state) => ({
        operationReports: state.operationReports.filter((r) => r.id !== id)
      })),
      addWorkCenter: (c) => set((state) => ({
        workCenters: [...state.workCenters, { ...c, id: `wc-${Date.now()}` }]
      })),
      updateWorkCenter: (id, patch) => set((state) => ({
        workCenters: state.workCenters.map((c) => c.id === id ? { ...c, ...patch } : c)
      })),
      removeWorkCenter: (id) => set((state) => ({
        workCenters: state.workCenters.filter((c) => c.id !== id)
      })),
      setLaborRate: (v) => set({ laborRate: Number.isFinite(v) && v >= 0 ? v : 0 }),
      setMachineRate: (v) => set({ machineRate: Number.isFinite(v) && v >= 0 ? v : 0 }),
      resetAll: () => set({
        operationReports: DEFAULT_OPERATION_REPORTS.map((r) => ({ ...r })),
        workCenters: DEFAULT_WORK_CENTERS.map((c) => ({ ...c })),
        laborRate: DEFAULT_LABOR_RATE,
        machineRate: DEFAULT_MACHINE_RATE
      })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-production-op",
      version: 1,
      partialize: (state) => ({
        operationReports: state.operationReports,
        workCenters: state.workCenters,
        laborRate: state.laborRate,
        machineRate: state.machineRate
      })
    }
  )
);
export {
  CENTER_COLORS as C,
  DEFAULT_LABOR_RATE as D,
  DEFAULT_MACHINE_RATE as a,
  DEFAULT_WORK_CENTERS as b,
  mapCenter as m,
  useProductionOperationStore as u
};
