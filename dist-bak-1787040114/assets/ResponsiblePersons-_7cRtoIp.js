import { r as reactExports, j as jsxRuntimeExports, h as Typography, B as Box, bK as Stack, aL as Chip } from "./vendor-DGU5TO-x.js";
import { u as useMaterialStore, q as useUserStore, R as ROLE_NAMES } from "./index-DeeqqmHA.js";
import "./customerStore-D75PJy1n.js";
import "./priceStore-CduvTkzQ.js";
import "./salesPriceStore-C1lbTZ_V.js";
import "./bomStore-CxaOFNQN.js";
import "./productionStore-Bdmg7HTu.js";
import "./productionOperationStore-ByOb08ia.js";
import "./financeExtensionStore-DC0IEDMi.js";
import "./productionVersionStore-C21otdJB.js";
import "./subcontractStore-BexFn7Un.js";
import "./equipmentStore-CrhJcIrI.js";
import "./productionSchedulingStore-DTA-q4iJ.js";
import "./vendorPerformanceStore-GquLJMJn.js";
import "./vendorPortalStore-Cnq134KH.js";
import "./dataDictStore-CtoXLbZz.js";
import "./numberingStore-CLVDn2Au.js";
import "./warehouseMasterStore-C3VWShZa.js";
import "./reportPermissionStore-CXyepbWY.js";
import "./salesAdvancedStore-CXmEdniM.js";
import "./purchaseAdvancedStore-C5npzY_b.js";
import "./warehouseAdvancedStore-DXjc0JQH.js";
import "./qualityAdvancedStore-Btlaa4xT.js";
import "./materialExtensionStore-BHkusB9L.js";
import "./purchaseInfoRecordStore-C2W723zd.js";
import "./sourceListStore-BT5zvRN_.js";
import "./qualityExtensionStore-CoUA1fWj.js";
import "./analyticsStore-DJYS74NQ.js";
import "./arapStore-CxlnIECw.js";
import "./workbenchStore-DcLy2Z4C.js";
import "./conditionStore-D-IHrlNs.js";
import "./ecnStore-CzTUK1H2.js";
import "./rebateStore-DO7GHeV5.js";
import "./fmeaStore-B4RTvukf.js";
import { CATEGORY_RESPONSIBLE_ROLES } from "./CategoryList-Bbby9Cp8.js";
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
