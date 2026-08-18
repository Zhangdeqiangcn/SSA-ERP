import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { A as ActionBar } from "./ActionBar-DYEbGKWc.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { f as formatCurrency, a as formatDate } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import { aO as Chip, m as Box, bh as Add } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const STATUS_MAP = {
  pending: { label: "待审批", color: "warning" },
  approved: { label: "已通过", color: "success" },
  rejected: { label: "已驳回", color: "error" }
};
const ApprovalList = () => {
  const { priceApprovals } = usePriceStore();
  const navigate = useNavigate();
  const columns = reactExports.useMemo(() => [
    { accessorKey: "approvalNo", header: "审批单号", size: 160 },
    { accessorKey: "comparisonNo", header: "比价单号", size: 160 },
    { accessorKey: "inquiryNo", header: "询价单号", size: 160 },
    { accessorKey: "title", header: "标题", size: 200 },
    { accessorKey: "applicant", header: "申请人", size: 80 },
    {
      accessorKey: "totalAmount",
      header: "审批金额",
      cell: ({ row }) => formatCurrency(row.original.totalAmount)
    },
    { accessorKey: "applicationDate", header: "申请日期", cell: ({ row }) => formatDate(row.original.applicationDate) },
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
      title: "价格审批单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "price-approval", currentStatus: "pa_submitted", label: "流程追踪" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ActionBar,
          {
            primary: { label: "新建审批单", onClick: () => alert("请从比价单中选择供应商后提交审批"), icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}) }
          }
        )
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DataTable,
        {
          data: priceApprovals,
          columns,
          enablePagination: true,
          enableExport: true,
          onRowClick: (row) => navigate(`/price/approval/${row.id}`),
          onView: (row) => navigate(`/price/approval/${row.id}`)
        }
      )
    }
  );
};
export {
  ApprovalList as default
};
