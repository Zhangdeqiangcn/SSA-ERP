import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, aL as Chip, h as Typography, bj as Alert, bK as Stack, bk as Button, B as Box, cl as LinearProgress } from "./vendor-46QZWBd3.js";
import { a as useVendorStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { F as FilterBar } from "./FilterBar-Dnzbdei4.js";
import { A as ActionBar } from "./ActionBar-CfsPxjQd.js";
import { S as StatusBadge } from "./StatusBadge-Db1uY4YU.js";
import { b as formatPhone, f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
const renderVendorCredit = (v) => {
  const limit = v.creditLimit;
  const used = v.usedCredit || 0;
  if (limit == null || limit <= 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": "credit-status", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "未授信", variant: "outlined", color: "default" }) });
  }
  const ratio = used / limit;
  const over = used > limit || ratio >= 0.9;
  const pct = Math.min(100, Math.round(ratio * 100));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "credit-status", sx: { minWidth: 140 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LinearProgress,
        {
          variant: "determinate",
          value: pct,
          sx: {
            width: 70,
            height: 6,
            borderRadius: 3,
            "& .MuiLinearProgress-bar": { bgcolor: over ? "#EF4444" : "#10B981" }
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: over ? "error" : "text.secondary", children: [
        pct,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
      formatCurrency(used),
      " / ",
      formatCurrency(limit)
    ] }),
    over && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "信用超额", color: "error", sx: { mt: 0.5 } })
  ] });
};
const VendorList = () => {
  const navigate = useNavigate();
  const vendors = useVendorStore((s) => s.vendors);
  const reviewVendorProfilePending = useVendorStore((s) => s.reviewVendorProfilePending);
  const [filterData, setFilterData] = reactExports.useState({});
  const pendingProfileVendors = reactExports.useMemo(
    () => vendors.filter((v) => v.profilePendingAt),
    [vendors]
  );
  const columns = reactExports.useMemo(() => [
    { accessorKey: "code", header: "供应商编码" },
    { accessorKey: "name", header: "供应商名称" },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const typeMap = {
          manufacturer: "生产商",
          trader: "贸易商",
          agent: "代理商"
        };
        return typeMap[row.original.type] || row.original.type;
      }
    },
    { accessorKey: "contact", header: "联系人" },
    { accessorKey: "phone", header: "电话", cell: ({ row }) => formatPhone(row.original.phone) },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    {
      accessorKey: "rating",
      header: "评级",
      cell: ({ row }) => row.original.rating ? `${row.original.rating}星` : "-"
    },
    {
      id: "credit",
      header: "信用状态",
      cell: ({ row }) => renderVendorCredit(row.original)
    },
    {
      id: "profilePending",
      header: "门户资料",
      cell: ({ row }) => row.original.profilePendingAt ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "warning", label: "待审", "data-testid": "profile-pending-chip" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "-" })
    }
  ], []);
  const filterFields = [
    { name: "name", label: "供应商名称", type: "text" },
    {
      name: "type",
      label: "类型",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "manufacturer", label: "生产商" },
        { value: "trader", label: "贸易商" },
        { value: "agent", label: "代理商" }
      ]
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "approved", label: "已批准" },
        { value: "pending", label: "待审核" },
        { value: "rejected", label: "已拒绝" },
        { value: "blacklisted", label: "黑名单" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendors];
    if (filterData.name) {
      data = data.filter((v) => v.name.includes(filterData.name));
    }
    if (filterData.type) {
      data = data.filter((v) => v.type === filterData.type);
    }
    if (filterData.status) {
      data = data.filter((v) => v.status === filterData.status);
    }
    return data;
  }, [filterData, vendors]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "供应商列表",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "注册供应商", onClick: () => navigate("/vendor/register") }
        }
      ),
      children: [
        pendingProfileVendors.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { mb: 2 }, "data-testid": "vendor-profile-pending-alert", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
            "有 ",
            pendingProfileVendors.length,
            " 家供应商在门户提交了资料变更，待审核并入主数据"
          ] }),
          pendingProfileVendors.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
              v.name,
              "（提交人 ",
              v.profilePendingBy || "-",
              " · ",
              v.profilePendingAt,
              "）"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                variant: "contained",
                "data-testid": `approve-profile-${v.id}`,
                onClick: () => reviewVendorProfilePending(v.id, true, "采购部主管"),
                children: "审核通过并并入"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "small",
                variant: "outlined",
                color: "inherit",
                "data-testid": `reject-profile-${v.id}`,
                onClick: () => reviewVendorProfilePending(v.id, false, "采购部主管"),
                children: "驳回"
              }
            )
          ] }, v.id))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "vendor-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            onRowClick: (row) => navigate(`/vendor/${row.id}`),
            onView: (row) => navigate(`/vendor/${row.id}`),
            onEdit: (row) => navigate(`/vendor/${row.id}`)
          }
        )
      ]
    }
  );
};
export {
  VendorList as default
};
