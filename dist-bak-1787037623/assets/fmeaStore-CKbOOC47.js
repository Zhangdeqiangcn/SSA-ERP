import { a2 as create, a3 as persist } from "./vendor-t9csHBDX.js";
import { l as backendStorage } from "./index-CU2cqxc8.js";
const now = () => (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
const seedFMEA = [
  {
    id: uid("fmea"),
    number: "FMEA-2026-001",
    item: "缸体铸造",
    function: "提供发动机缸体毛坯",
    failureMode: "气孔缺陷",
    effect: "缸体强度不足，可能导致发动机漏油",
    severity: 9,
    cause: "浇注温度偏低，排气不畅",
    occurrence: 5,
    currentControl: "X光探伤抽检",
    detection: 6,
    rpn: 270,
    recommendedAction: "优化浇注系统排气设计，提高浇注温度监控",
    status: "reviewed",
    createdAt: now(),
    updatedAt: now(),
    createdBy: "质量部",
    updatedBy: "质量部"
  },
  {
    id: uid("fmea"),
    number: "FMEA-2026-002",
    item: "钢板剪裁",
    function: "按规格尺寸剪裁钢板",
    failureMode: "尺寸超差",
    effect: "后续焊接装配困难，影响产品合格率",
    severity: 7,
    cause: "剪板机刀具磨损",
    occurrence: 4,
    currentControl: "首件检验+巡检",
    detection: 3,
    rpn: 84,
    status: "draft",
    createdAt: now(),
    updatedAt: now(),
    createdBy: "质量部",
    updatedBy: "质量部"
  }
];
const useFMEAStore = create()(
  persist(
    (set) => ({
      items: [...seedFMEA],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      updateItem: (id, updates) => set((s) => ({
        items: s.items.map(
          (x) => x.id === id ? { ...x, ...updates, updatedAt: now(), updatedBy: "当前用户" } : x
        )
      })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-fmea",
      version: 1,
      partialize: (state) => ({ items: state.items })
    }
  )
);
export {
  useFMEAStore as u
};
