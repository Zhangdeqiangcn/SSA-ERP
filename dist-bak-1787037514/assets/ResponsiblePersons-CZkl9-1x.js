import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useMaterialStore, q as useUserStore, R as ROLE_NAMES } from "./index-hTLNcGoC.js";
import "./customerStore-BnoPAbgi.js";
import "./priceStore-D4MzJqWs.js";
import "./salesPriceStore-BQbM-EvA.js";
import "./bomStore-CeDOOVVk.js";
import "./productionStore-B8YnWPVr.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./financeExtensionStore-mnFIWL7o.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./dataDictStore-RUHQ7-st.js";
import "./numberingStore-BLNwdXfi.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import "./reportPermissionStore-BsrP4O9H.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./purchaseInfoRecordStore-BlIKCtxc.js";
import "./sourceListStore-Z5_JkzNu.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./arapStore-BN8EGkkl.js";
import "./workbenchStore-vCZX2zeS.js";
import "./conditionStore-DfnsSgER.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./fmeaStore-DSfTzw2E.js";
import { CATEGORY_RESPONSIBLE_ROLES } from "./CategoryList-BiXjmJ7_.js";
import { T as Typography, m as Box, bL as Stack, aO as Chip } from "./vendor-mui-UhJuRAfR.js";
function ResponsiblePersons({
  categoryIds,
  roles,
  showEmpty = false,
  title = "物料责任人"
}) {
  const getCategoryById = useMaterialStore((s) => s.getCategoryById);
  const getUserName = useUserStore((s) => s.getUserName);
  const users = useUserStore((s) => s.users);
  const rolePriority = CATEGORY_RESPONSIBLE_ROLES;
  const userById = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);
  const rolesKey = roles ? roles.join(",") : "";
  const grouped = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const cid of categoryIds) {
      if (!cid) continue;
      const cat = getCategoryById(cid);
      if (!(cat == null ? void 0 : cat.responsiblePersons)) continue;
      for (const [role, ids] of Object.entries(cat.responsiblePersons)) {
        const r = role;
        if (roles && !roles.includes(r)) continue;
        if (!map.has(r)) map.set(r, /* @__PURE__ */ new Set());
        ids.forEach((id) => map.get(r).add(id));
      }
    }
    return map;
  }, [categoryIds, getCategoryById, rolesKey]);
  if (grouped.size === 0) {
    if (!showEmpty) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无责任人" });
  }
  const orderedRoles = [...grouped.keys()].sort((a, b) => {
    const ia = rolePriority.indexOf(a);
    const ib = rolePriority.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, children: orderedRoles.map((role) => {
      const ids = [...grouped.get(role)];
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Box,
        {
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Typography,
              {
                variant: "body2",
                sx: { minWidth: 72, color: "text.secondary", flexShrink: 0 },
                children: [
                  ROLE_NAMES[role],
                  "："
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", gap: 0.5, flexWrap: "wrap", children: ids.map((id) => {
              const u = userById.get(id);
              const name = u ? u.name : getUserName(id);
              const inactive = (u == null ? void 0 : u.status) === "inactive";
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: inactive ? `${name}（停用）` : name,
                  size: "small",
                  color: inactive ? "default" : "primary",
                  variant: inactive ? "outlined" : "filled"
                },
                id
              );
            }) })
          ]
        },
        role
      );
    }) })
  ] });
}
export {
  ResponsiblePersons as R
};
