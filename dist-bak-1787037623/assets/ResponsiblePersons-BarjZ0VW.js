import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { u as useMaterialStore, q as useUserStore, R as ROLE_NAMES } from "./index-CU2cqxc8.js";
import "./customerStore-BZF1KdNo.js";
import "./priceStore-DijJfeBL.js";
import "./salesPriceStore-cjxfIxIT.js";
import "./bomStore-Gzuh4wJM.js";
import "./productionStore-3WoghQIz.js";
import "./productionOperationStore-BOD4obub.js";
import "./financeExtensionStore-DxSjHPMg.js";
import "./productionVersionStore-RUhZ-sHu.js";
import "./subcontractStore-DEU0s8qw.js";
import "./equipmentStore-Be67EIyI.js";
import "./productionSchedulingStore-jeZjQvFy.js";
import "./vendorPerformanceStore-DSqs7hVk.js";
import "./vendorPortalStore-B2sPBeRr.js";
import "./dataDictStore-66NejlLO.js";
import "./numberingStore-BDs7p47y.js";
import "./warehouseMasterStore-BjZtdDuE.js";
import "./reportPermissionStore-dkLqyfDv.js";
import "./salesAdvancedStore-BUVrzeLF.js";
import "./purchaseAdvancedStore-X5oSWK-7.js";
import "./warehouseAdvancedStore-D-kOSyQs.js";
import "./qualityAdvancedStore-Bdw6LGIv.js";
import "./materialExtensionStore-BnWp3IKN.js";
import "./purchaseInfoRecordStore-DLQisuuK.js";
import "./sourceListStore-DG1dXUIB.js";
import "./qualityExtensionStore-BDssWY5M.js";
import "./analyticsStore-DaEDsYjs.js";
import "./arapStore-Cccu0U7n.js";
import "./workbenchStore-COBsjc3d.js";
import "./conditionStore-DTiljowj.js";
import "./ecnStore-D8unIvA0.js";
import "./rebateStore-89dNxLDm.js";
import "./fmeaStore-CKbOOC47.js";
import { CATEGORY_RESPONSIBLE_ROLES } from "./CategoryList-2VT4U_Gi.js";
import { T as Typography, m as Box, bL as Stack, aO as Chip } from "./vendor-mui-DsZGB15g.js";
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
