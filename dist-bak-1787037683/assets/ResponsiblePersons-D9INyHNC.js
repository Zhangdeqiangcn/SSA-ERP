import { r as reactExports, j as jsxRuntimeExports, h as Typography, B as Box, bK as Stack, aL as Chip } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore, q as useUserStore, R as ROLE_NAMES } from "./index-CcOZBoQL.js";
import "./customerStore-IdYDDJRc.js";
import "./priceStore-BUzakAdL.js";
import "./salesPriceStore-BzUxjPzH.js";
import "./bomStore-VWzRK_BU.js";
import "./productionStore-D_DSIs05.js";
import "./productionOperationStore-ZzJ7_OWX.js";
import "./financeExtensionStore-DcH2weuS.js";
import "./productionVersionStore-D_-Ec9Z0.js";
import "./subcontractStore-CQ-ex-am.js";
import "./equipmentStore-D-RvzWch.js";
import "./productionSchedulingStore-BVkrPwFf.js";
import "./vendorPerformanceStore-BxbIBs-n.js";
import "./vendorPortalStore-d2uxDrSz.js";
import "./dataDictStore-B1uh9qqV.js";
import "./numberingStore-DnRDBnD9.js";
import "./warehouseMasterStore-Ct1rrWsm.js";
import "./reportPermissionStore-BivOpSPb.js";
import "./salesAdvancedStore-CA71PkD6.js";
import "./purchaseAdvancedStore-DLlH_i-t.js";
import "./warehouseAdvancedStore-BrWnd5bC.js";
import "./qualityAdvancedStore-dxrXzSTj.js";
import "./materialExtensionStore-B0eAxQzZ.js";
import "./purchaseInfoRecordStore-nI3akWE2.js";
import "./sourceListStore-BhAGJqGB.js";
import "./qualityExtensionStore-BtbaFcCN.js";
import "./analyticsStore-SaeDm71F.js";
import "./arapStore-BYvdVu0r.js";
import "./workbenchStore-DCSKoEhL.js";
import "./conditionStore-BSext3Wu.js";
import "./ecnStore-DIX7gpta.js";
import "./rebateStore-C8MR-wRT.js";
import "./fmeaStore--YKtrk44.js";
import { CATEGORY_RESPONSIBLE_ROLES } from "./CategoryList-DMRXpnYP.js";
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
