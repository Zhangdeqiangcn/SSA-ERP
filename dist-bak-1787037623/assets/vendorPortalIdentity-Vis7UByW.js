import { a as useVendorStore } from "./index-CU2cqxc8.js";
const PORTAL_VENDOR_BINDING = {
  V001: { vendorId: "ven-001" },
  V002: { vendorId: "ven-002" },
  "V-NEW": { vendorId: "ven-001" },
  // 申请中账号暂挂主供应商，便于演示回写
  // B6 演示绑定：登录 code V-BLACK 对应种子黑名单供应商 ven-011，
  // 用于演示「黑名单供应商门户报价被拦截」的端到端体验。
  "V-BLACK": { vendorId: "ven-011" }
};
function getVendorPortalIdentity() {
  const raw = sessionStorage.getItem("vendorPortalUser");
  if (!raw) return null;
  let u;
  try {
    u = JSON.parse(raw);
  } catch {
    return null;
  }
  const bind = PORTAL_VENDOR_BINDING[u.code] || PORTAL_VENDOR_BINDING.V001;
  const vendor = useVendorStore.getState().vendors.find((v) => v.id === bind.vendorId);
  return {
    code: u.code,
    name: u.name,
    role: u.role,
    vendorId: bind.vendorId,
    vendorName: (vendor == null ? void 0 : vendor.name) || u.name
  };
}
export {
  getVendorPortalIdentity as g
};
