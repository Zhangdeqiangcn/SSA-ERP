import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage } from "./index-CU2cqxc8.js";
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const mkLoc = (id, code, name, warehouseId, zone) => ({
  id,
  code,
  name,
  warehouseId,
  zone,
  createdAt: today(),
  updatedAt: today(),
  createdBy: "system",
  updatedBy: "system"
});
const seedWarehouses = [
  {
    id: "wh-001",
    code: "WH001",
    name: "主仓库",
    orgId: "ORG-001",
    type: "raw",
    address: "上海市浦东新区世纪大道 100 号 厂区A",
    manager: "赵磊",
    status: "active",
    locations: [
      mkLoc("loc-001", "A-01-01", "A区-01排-01架", "wh-001", "A区"),
      mkLoc("loc-002", "A-01-02", "A区-01排-02架", "wh-001", "A区"),
      mkLoc("loc-003", "A-02-01", "A区-02排-01架", "wh-001", "A区"),
      mkLoc("loc-004", "A-01-05", "A区-01排-05架", "wh-001", "A区"),
      mkLoc("loc-005", "A-03-02", "A区-03排-02架", "wh-001", "A区"),
      mkLoc("loc-009", "A-03-01", "A区-03排-01架", "wh-001", "A区"),
      mkLoc("loc-006", "B-01-01", "B区-01排-01架", "wh-001", "B区"),
      mkLoc("loc-007", "B-01-02", "B区-01排-02架", "wh-001", "B区"),
      mkLoc("loc-008", "B-01-03", "B区-01排-03架", "wh-001", "B区"),
      mkLoc("loc-010", "B-02-03", "B区-02排-03架", "wh-001", "B区"),
      mkLoc("loc-011", "B-02-04", "B区-02排-04架", "wh-001", "B区"),
      mkLoc("loc-012", "A-03-01", "A区-03排-01架", "wh-001", "A区")
    ],
    createdAt: today(),
    updatedAt: today(),
    createdBy: "system",
    updatedBy: "system"
  },
  {
    id: "wh-002",
    code: "WH002",
    name: "辅料仓库",
    orgId: "ORG-001",
    type: "aux",
    manager: "孙倩",
    status: "active",
    locations: [mkLoc("loc-020", "C-01-01", "C区-01排-01架", "wh-002", "C区")],
    createdAt: today(),
    updatedAt: today(),
    createdBy: "system",
    updatedBy: "system"
  },
  {
    id: "wh-003",
    code: "WH003",
    name: "成品仓库",
    orgId: "ORG-001",
    type: "finished",
    manager: "周敏",
    status: "active",
    locations: [mkLoc("loc-fg-01", "FG-01-01", "成品区-01排-01架", "wh-003", "成品区")],
    createdAt: today(),
    updatedAt: today(),
    createdBy: "system",
    updatedBy: "system"
  },
  {
    id: "wh-201",
    code: "WH201",
    name: "华东原料库",
    orgId: "ORG-002",
    type: "raw",
    address: "江苏省苏州市工业园区星湖街 88 号",
    manager: "钱伟",
    status: "active",
    locations: [mkLoc("loc-e-01", "E-01-01", "华东-01排-01架", "wh-201", "华东区")],
    createdAt: today(),
    updatedAt: today(),
    createdBy: "system",
    updatedBy: "system"
  }
];
const useWarehouseMasterStore = create()(
  persist(
    (set) => ({
      warehouses: [...seedWarehouses],
      addWarehouse: (w) => set((state) => ({
        warehouses: [
          ...state.warehouses,
          {
            ...w,
            id: `wh-${Date.now()}`,
            createdAt: today(),
            updatedAt: today(),
            createdBy: "admin",
            updatedBy: "admin"
          }
        ]
      })),
      updateWarehouse: (id, u) => set((state) => ({
        warehouses: state.warehouses.map(
          (x) => x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: "admin" } : x
        )
      })),
      deleteWarehouse: (id) => set((state) => ({ warehouses: state.warehouses.filter((x) => x.id !== id) })),
      addLocation: (warehouseId, loc) => set((state) => ({
        warehouses: state.warehouses.map(
          (w) => w.id === warehouseId ? {
            ...w,
            locations: [
              ...w.locations,
              {
                ...loc,
                id: `loc-${Date.now()}`,
                warehouseId,
                createdAt: today(),
                updatedAt: today(),
                createdBy: "admin",
                updatedBy: "admin"
              }
            ],
            updatedAt: today(),
            updatedBy: "admin"
          } : w
        )
      })),
      updateLocation: (warehouseId, locId, u) => set((state) => ({
        warehouses: state.warehouses.map(
          (w) => w.id === warehouseId ? {
            ...w,
            locations: w.locations.map(
              (l) => l.id === locId ? { ...l, ...u, updatedAt: today(), updatedBy: "admin" } : l
            ),
            updatedAt: today(),
            updatedBy: "admin"
          } : w
        )
      })),
      deleteLocation: (warehouseId, locId) => set((state) => ({
        warehouses: state.warehouses.map(
          (w) => w.id === warehouseId ? {
            ...w,
            locations: w.locations.filter((l) => l.id !== locId),
            updatedAt: today(),
            updatedBy: "admin"
          } : w
        )
      })),
      resetWarehouses: () => set({ warehouses: [...seedWarehouses] })
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-warehouse-master",
      version: 1,
      partialize: (state) => ({ warehouses: state.warehouses })
    }
  )
);
const selectWarehousesByOrg = (orgId) => (w) => !w.orgId || !orgId || w.orgId === orgId;
const WAREHOUSE_TYPE_LABELS = {
  raw: "原料仓",
  finished: "成品仓",
  wip: "半成品仓",
  aux: "辅料仓",
  transit: "中转仓"
};
export {
  WAREHOUSE_TYPE_LABELS as W,
  selectWarehousesByOrg as s,
  useWarehouseMasterStore as u
};
