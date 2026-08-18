import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, aL as Chip, B as Box, bK as Stack, cl as LinearProgress, h as Typography } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { F as FilterBar } from "./FilterBar-Dnzbdei4.js";
import { A as ActionBar } from "./ActionBar-CfsPxjQd.js";
import { S as StatusBadge } from "./StatusBadge-Db1uY4YU.js";
import { b as formatPhone, f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useCustomerStore } from "./customerStore-IdYDDJRc.js";
import { d as CUSTOMER_TYPE_OPTIONS, e as CUSTOMER_STATUS_OPTIONS, f as CREDIT_LEVEL_OPTIONS } from "./options-BINuI5Gr.js";
const labelOf = (options, value) => {
  var _a;
  return ((_a = options.find((o) => o.value === value)) == null ? void 0 : _a.label) || value || "-";
};
const renderCustomerCredit = (c) => {
  const limit = c.creditLimit;
  const used = c.usedCredit || 0;
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
const CustomerList = () => {
  const navigate = useNavigate();
  const customers = useCustomerStore((s) => s.customers);
  const [filterData, setFilterData] = reactExports.useState({});
  const columns = reactExports.useMemo(() => [
    { accessorKey: "code", header: "客户编码" },
    { accessorKey: "name", header: "客户名称" },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => labelOf(CUSTOMER_TYPE_OPTIONS, row.original.type)
    },
    { accessorKey: "contactName", header: "联系人", cell: ({ row }) => row.original.contactName || "-" },
    {
      accessorKey: "contactPhone",
      header: "电话",
      cell: ({ row }) => formatPhone(row.original.contactPhone)
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    {
      accessorKey: "creditLevel",
      header: "信用等级",
      cell: ({ row }) => row.original.creditLevel ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: row.original.creditLevel, color: "primary", variant: "outlined" }) : "-"
    },
    {
      id: "credit",
      header: "信用状态",
      cell: ({ row }) => renderCustomerCredit(row.original)
    }
  ], []);
  const filterFields = [
    { name: "name", label: "客户名称", type: "text" },
    {
      name: "type",
      label: "类型",
      type: "select",
      options: [{ value: "", label: "全部" }, ...CUSTOMER_TYPE_OPTIONS]
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [{ value: "", label: "全部" }, ...CUSTOMER_STATUS_OPTIONS]
    },
    {
      name: "creditLevel",
      label: "信用等级",
      type: "select",
      options: [{ value: "", label: "全部" }, ...CREDIT_LEVEL_OPTIONS]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...customers];
    if (filterData.name) {
      data = data.filter((c) => c.name.includes(filterData.name));
    }
    if (filterData.type) {
      data = data.filter((c) => c.type === filterData.type);
    }
    if (filterData.status) {
      data = data.filter((c) => c.status === filterData.status);
    }
    if (filterData.creditLevel) {
      data = data.filter((c) => c.creditLevel === filterData.creditLevel);
    }
    return data;
  }, [filterData, customers]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "客户列表",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新建客户", onClick: () => navigate("/sales/customers/create") }
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "customer-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            onRowClick: (row) => navigate(`/sales/customers/${row.id}`),
            onView: (row) => navigate(`/sales/customers/${row.id}`),
            onEdit: (row) => navigate(`/sales/customers/${row.id}/edit`)
          }
        )
      ]
    }
  );
};
export {
  CustomerList as default
};
