import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { A as ActionBar } from "./ActionBar-DYEbGKWc.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { f as formatCurrency, a as formatDate } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import { bL as Stack, aO as Chip, m as Box, $ as CompareArrows } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const STATUS_MAP = {
  pending: { label: "待选定", color: "warning" },
  selected: { label: "已选定", color: "info" },
  approved: { label: "已审批", color: "success" },
  rejected: { label: "已驳回", color: "error" }
};
const ComparisonsList = () => {
  const { priceComparisons } = usePriceStore();
  const navigate = useNavigate();
  const columns = reactExports.useMemo(() => [
    { accessorKey: "comparisonNo", header: "比价单号", size: 160 },
    { accessorKey: "inquiryNo", header: "关联询价单", size: 160 },
    { accessorKey: "title", header: "标题", size: 200 },
    {
      accessorKey: "participatingVendors",
      header: "参与供应商",
      size: 250,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", children: row.original.participatingVendors.map((name, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: name,
          size: "small",
          variant: "outlined",
          sx: { fontSize: "0.65rem", height: 20 }
        },
        idx
      )) })
    },
    {
      accessorKey: "totalLowestAmount",
      header: "全线最低总价",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#10B981", fontWeight: 600 }, children: formatCurrency(row.original.totalLowestAmount) })
    },
    {
      accessorKey: "totalSelectedAmount",
      header: "选定总价",
      cell: ({ row }) => row.original.totalSelectedAmount ? formatCurrency(row.original.totalSelectedAmount) : "-"
    },
    { accessorKey: "comparisonDate", header: "比价日期", cell: ({ row }) => formatDate(row.original.comparisonDate) },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        var _a, _b;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: (_a = STATUS_MAP[row.original.status]) == null ? void 0 : _a.label,
            size: "small",
            color: ((_b = STATUS_MAP[row.original.status]) == null ? void 0 : _b.color) || "default"
          }
        );
      }
    }
  ], []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageWrapper,
    {
      title: "比价单管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "price-comparison", currentStatus: "pc_generated", label: "流程追踪" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ActionBar,
          {
            primary: { label: "新建比价单", onClick: () => navigate("/price/inquiry"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CompareArrows, {}) }
          }
        )
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DataTable,
        {
          data: priceComparisons,
          columns,
          enablePagination: true,
          enableExport: true,
          onRowClick: (row) => navigate(`/price/comparison/${row.id}`),
          onView: (row) => navigate(`/price/comparison/${row.id}`)
        }
      )
    }
  );
};
export {
  ComparisonsList as default
};
