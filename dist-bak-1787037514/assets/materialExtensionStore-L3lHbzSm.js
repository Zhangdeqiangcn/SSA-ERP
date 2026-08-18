import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage } from "./index-hTLNcGoC.js";
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const useMaterialExtensionStore = create()(
  persist(
    (set) => ({
      changeDocs: [],
      addChangeDoc: (doc) => set((s) => ({ changeDocs: [...s.changeDocs, doc] })),
      updateChangeDoc: (id, u) => set((s) => ({ changeDocs: s.changeDocs.map((x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "当前用户" } : x) })),
      deleteChangeDoc: (id) => set((s) => ({ changeDocs: s.changeDocs.filter((x) => x.id !== id) })),
      logMaterialChange: (params) => set((s) => ({
        changeDocs: [
          ...s.changeDocs,
          {
            id: uid("mcd"),
            changeNo: `MCD-${today().replace(/-/g, "")}-${s.changeDocs.length + 1}`,
            materialId: params.materialId,
            materialCode: params.materialCode,
            materialName: params.materialName,
            changeType: params.changeType,
            fields: params.fields,
            reason: params.reason,
            operator: params.operator || "当前用户",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            createdBy: params.operator || "当前用户",
            updatedBy: params.operator || "当前用户"
          }
        ]
      }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-material-ext",
      version: 1,
      partialize: (state) => ({ changeDocs: state.changeDocs })
    }
  )
);
export {
  useMaterialExtensionStore as u
};
