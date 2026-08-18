import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
const seedUsers = [
  { id: "vu-001", name: "张建国", email: "zhangjg@shbaosteel.com", phone: "13800138001", roleId: "vr-admin", roleName: "管理员", status: "active", lastLogin: "2024-06-20 09:15:00" },
  { id: "vu-002", name: "李明辉", email: "limh@shbaosteel.com", phone: "13800138002", roleId: "vr-business", roleName: "业务员", status: "active", lastLogin: "2024-06-20 14:30:00" },
  { id: "vu-003", name: "王会计", email: "wangac@shbaosteel.com", phone: "13800138003", roleId: "vr-finance", roleName: "财务", status: "active", lastLogin: "2024-06-19 16:00:00" },
  { id: "vu-004", name: "赵质检", email: "zhaozj@shbaosteel.com", phone: "13800138004", roleId: "vr-quality", roleName: "质量员", status: "inactive", lastLogin: "2024-06-15 10:00:00" }
];
const seedRoles = [
  {
    id: "vr-admin",
    name: "管理员",
    code: "admin",
    description: "供应商门户全部功能管理权限",
    color: "#6366F1",
    permissions: {
      orders: ["view", "edit", "confirm", "reject"],
      shipments: ["view", "create", "edit"],
      quality: ["view", "respond", "submit_report", "close"],
      finance: ["view", "confirm", "submit_invoice", "dispute"],
      profile: ["view", "edit", "manage_certs"],
      permissions: ["view", "edit", "create_user", "delete_user"]
    }
  },
  {
    id: "vr-business",
    name: "业务员",
    code: "business",
    description: "负责订单确认、发货、质量响应等业务操作",
    color: "#3B82F6",
    permissions: {
      orders: ["view", "edit", "confirm"],
      shipments: ["view", "create", "edit"],
      quality: ["view", "respond"],
      finance: ["view"],
      profile: ["view"],
      permissions: ["view"]
    }
  },
  {
    id: "vr-finance",
    name: "财务",
    code: "finance",
    description: "负责对账、开票、付款计划查询等财务操作",
    color: "#10B981",
    permissions: {
      orders: ["view"],
      shipments: ["view"],
      quality: ["view"],
      finance: ["view", "confirm", "submit_invoice", "dispute"],
      profile: ["view", "edit"],
      permissions: ["view"]
    }
  },
  {
    id: "vr-quality",
    name: "质量员",
    code: "quality",
    description: "负责质量问题响应、8D报告提交等质量管理",
    color: "#F59E0B",
    permissions: {
      orders: ["view"],
      shipments: ["view"],
      quality: ["view", "respond", "submit_report"],
      finance: ["view"],
      profile: ["view"],
      permissions: ["view"]
    }
  }
];
const useVendorPortalStore = create()(
  persist(
    (set) => ({
      portalUsers: [...seedUsers],
      roles: [...seedRoles],
      addPortalUser: (u) => set((s) => ({ portalUsers: [...s.portalUsers, u] })),
      updatePortalUser: (id, updates) => set((s) => ({ portalUsers: s.portalUsers.map((x) => x.id === id ? { ...x, ...updates } : x) })),
      deletePortalUser: (id) => set((s) => ({ portalUsers: s.portalUsers.filter((x) => x.id !== id) })),
      updateRolePermissions: (id, permissions) => set((s) => ({ roles: s.roles.map((r) => r.id === id ? { ...r, permissions } : r) }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-vendor-portal",
      version: 1,
      partialize: (state) => ({ portalUsers: state.portalUsers, roles: state.roles })
    }
  )
);
export {
  useVendorPortalStore as u
};
