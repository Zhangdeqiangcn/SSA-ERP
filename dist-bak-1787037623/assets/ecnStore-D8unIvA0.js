import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage } from "./index-CU2cqxc8.js";
const STORE_KEY = "ssa-erp-ecn";
const seedECNs = [
  {
    id: "ecn-001",
    changeNo: "ECN-2026-001",
    title: "钢板厚度升级",
    materialId: "mat-001",
    materialName: "热轧钢板 Q235B 3mm",
    fromVersion: "V1.0",
    toVersion: "V2.0",
    changeType: "material",
    oldValue: "3mm",
    newValue: "5mm",
    effectiveDate: "2026-09-01",
    status: "draft",
    createdAt: "2026-08-01T08:00:00Z",
    updatedAt: "2026-08-01T08:00:00Z"
  },
  {
    id: "ecn-002",
    changeNo: "ECN-2026-002",
    title: "焊接工艺变更",
    materialId: "mat-002",
    materialName: "H型钢 200×200×8×12",
    fromVersion: "V1.0",
    toVersion: "V2.0",
    changeType: "bom",
    oldValue: "手工焊接",
    newValue: "自动焊接",
    effectiveDate: "2026-10-01",
    status: "approved",
    approvedBy: "工艺主管",
    createdAt: "2026-08-05T08:00:00Z",
    updatedAt: "2026-08-05T08:00:00Z"
  }
];
const useECNStore = create()(
  persist(
    (set, get) => ({
      ecns: seedECNs.map((e) => ({ ...e })),
      addECN: (ecn) => set((state) => ({ ecns: [...state.ecns, ecn] })),
      updateECN: (id, patch) => set((state) => ({
        ecns: state.ecns.map(
          (e) => e.id === id ? { ...e, ...patch, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } : e
        )
      })),
      deleteECN: (id) => set((state) => ({ ecns: state.ecns.filter((e) => e.id !== id) })),
      getECNById: (id) => get().ecns.find((e) => e.id === id)
    }),
    {
      storage: backendStorage,
      name: STORE_KEY,
      version: 1,
      partialize: (state) => ({ ecns: state.ecns })
    }
  )
);
export {
  useECNStore as u
};
