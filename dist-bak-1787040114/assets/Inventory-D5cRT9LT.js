import { r as reactExports, j as jsxRuntimeExports, h as Typography, B as Box, aL as Chip, bX as Grid, aP as Paper, bN as Warning, bk as Button, e5 as SortByAlpha } from "./vendor-DGU5TO-x.js";
import { c as useWarehouseStore, g as useOrgStore, u as useMaterialStore, q as useUserStore } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FilterBar } from "./FilterBar-s9qV5iff.js";
import { a as formatDate } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
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
import { m as matchOrg } from "./org-sXHLpR-x.js";
import "./StatusBadge-DeJuhK-R.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const Inventory = () => {
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const inventoryAlerts = useWarehouseStore((s) => s.inventoryAlerts);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const materials = useMaterialStore((s) => s.materials);
  const getCategoryById = useMaterialStore((s) => s.getCategoryById);
  const getUserName = useUserStore((s) => s.getUserName);
  const [filterData, setFilterData] = reactExports.useState({});
  const [fefoSorted, setFefoSorted] = reactExports.useState(false);
  const getShelfLifeStatus = (record) => {
    if (record.shelfLifeStatus) {
      switch (record.shelfLifeStatus) {
        case "expiring":
          return { status: "expiring", label: "临期", color: "warning" };
        case "expired":
          return { status: "expired", label: "已过期", color: "error" };
        default:
          return { status: "normal", label: "正常", color: "success" };
      }
    }
    const material = materials.find((m) => m.id === record.materialId);
    if (!(material == null ? void 0 : material.shelfLifeDays) || material.shelfLifeDays <= 0) return { status: "normal", label: "无保质期", color: "success" };
    const lastInbound = record.lastInboundDate;
    if (!lastInbound) return { status: "normal", label: "正常", color: "success" };
    const expiryDate = new Date(lastInbound);
    expiryDate.setDate(expiryDate.getDate() + material.shelfLifeDays);
    const today = /* @__PURE__ */ new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
    if (daysLeft <= 0) return { status: "expired", label: "已过期", color: "error" };
    const warningDays = material.shelfLifeWarningDays || 30;
    if (daysLeft <= warningDays) return { status: "expiring", label: "临期", color: "warning" };
    return { status: "normal", label: "正常", color: "success" };
  };
  const getKeeperNames = (materialId) => {
    var _a;
    const m = materials.find((mm) => mm.id === materialId);
    if (!(m == null ? void 0 : m.categoryId)) return "—";
    const cat = getCategoryById(m.categoryId);
    const ids = ((_a = cat == null ? void 0 : cat.responsiblePersons) == null ? void 0 : _a["warehouse_keeper"]) ?? [];
    if (ids.length === 0) return "—";
    return ids.map((id) => getUserName(id)).join("、");
  };
  const columns = reactExports.useMemo(() => [
    { accessorKey: "materialCode", header: "物料编码" },
    { accessorKey: "materialName", header: "物料名称" },
    {
      id: "keeper",
      header: "库管责任人",
      cell: ({ row }) => {
        const names = getKeeperNames(row.original.materialId);
        if (names === "—") return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "—" });
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { display: "flex", gap: 0.5, flexWrap: "wrap", children: names.split("、").map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: n, size: "small", color: "primary" }, n)) });
      }
    },
    { accessorKey: "specification", header: "规格型号" },
    { accessorKey: "warehouseName", header: "仓库" },
    { accessorKey: "locationName", header: "库位" },
    { accessorKey: "unit", header: "单位" },
    { accessorKey: "quantity", header: "库存数量" },
    { accessorKey: "availableQuantity", header: "可用数量" },
    { accessorKey: "frozenQuantity", header: "冻结数量" },
    { accessorKey: "lastInboundDate", header: "最后入库", cell: ({ row }) => formatDate(row.original.lastInboundDate) },
    { accessorKey: "lastOutboundDate", header: "最后出库", cell: ({ row }) => formatDate(row.original.lastOutboundDate) },
    {
      id: "shelfLifeStatus",
      header: "保质期状态",
      cell: ({ row }) => {
        const sl = getShelfLifeStatus(row.original);
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: sl.label,
            size: "small",
            color: sl.color,
            "data-testid": "inv-shelf-life-status",
            sx: { fontSize: "0.75rem" }
          }
        );
      }
    }
  ], [materials, getCategoryById, getUserName]);
  const filterFields = [
    { name: "materialCode", label: "物料编码", type: "text" },
    { name: "materialName", label: "物料名称", type: "text" },
    { name: "warehouseName", label: "仓库", type: "text" }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...inventoryRecords];
    data = data.filter((r) => matchOrg(r, currentOrgId));
    if (filterData.materialCode) {
      data = data.filter((r) => r.materialCode.includes(filterData.materialCode));
    }
    if (filterData.materialName) {
      data = data.filter((r) => r.materialName.includes(filterData.materialName));
    }
    if (filterData.warehouseName) {
      data = data.filter((r) => {
        var _a;
        return (_a = r.warehouseName) == null ? void 0 : _a.includes(filterData.warehouseName);
      });
    }
    if (fefoSorted) {
      data.sort((a, b) => {
        const getExpiry = (r) => {
          const mat = materials.find((m) => m.id === r.materialId);
          if (!(mat == null ? void 0 : mat.shelfLifeDays) || mat.shelfLifeDays <= 0 || !r.lastInboundDate) return Infinity;
          const d = new Date(r.lastInboundDate);
          d.setDate(d.getDate() + mat.shelfLifeDays);
          return d.getTime();
        };
        return getExpiry(a) - getExpiry(b);
      });
    }
    return data;
  }, [filterData, fefoSorted]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "库存查询", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 3, sx: { mb: 3 }, children: inventoryAlerts.map((alert) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, display: "flex", alignItems: "center", gap: 2, borderLeft: "4px solid", borderColor: alert.severity === "critical" ? "error.main" : "warning.main" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { color: alert.severity === "critical" ? "error" : "warning" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", children: alert.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "当前库存：",
          alert.currentQuantity,
          " | 阈值：",
          alert.threshold
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: alert.type === "low_stock" ? "库存不足" : alert.type,
            size: "small",
            color: alert.severity === "critical" ? "error" : "warning",
            sx: { mt: 0.5 }
          }
        )
      ] })
    ] }) }, alert.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "inventory-list" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Button,
      {
        variant: fefoSorted ? "contained" : "outlined",
        color: fefoSorted ? "primary" : "inherit",
        startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(SortByAlpha, {}),
        "data-testid": "inv-fefo-sort",
        onClick: () => setFefoSorted(!fefoSorted),
        size: "small",
        children: [
          "FEFO 排序",
          fefoSorted ? "（已启用）" : ""
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filteredData,
        columns,
        enableRowSelection: true,
        enablePagination: true,
        enableExport: true
      }
    )
  ] });
};
export {
  Inventory as default
};
