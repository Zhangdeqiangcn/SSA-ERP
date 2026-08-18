import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import "./index-hTLNcGoC.js";
import "./vendor-date-DpsB6iVy.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as useArapStore } from "./arapStore-BN8EGkkl.js";
import { bY as Grid, bs as Card, bt as CardContent, T as Typography, m as Box, bv as TextField, aR as MenuItem, aO as Chip, bm as Button } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const AGING_LABELS = {
  current: { label: "未到期", color: "success" },
  "1-30": { label: "1-30天", color: "info" },
  "31-60": { label: "31-60天", color: "warning" },
  "61-90": { label: "61-90天", color: "warning" },
  "90+": { label: "90天以上", color: "error" }
};
const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "open", label: "未付" },
  { value: "partial", label: "部分已付" },
  { value: "overdue", label: "已逾期" },
  { value: "closed", label: "已结清" }
];
const AGING_OPTIONS = [
  { value: "", label: "全部账龄" },
  "current",
  "1-30",
  "31-60",
  "61-90",
  "90+"
].map((v) => {
  var _a;
  return { value: v, label: v ? ((_a = AGING_LABELS[v]) == null ? void 0 : _a.label) ?? v : "全部账龄" };
});
const STATUS_LABEL = {
  open: "未付",
  partial: "部分已付",
  overdue: "已逾期",
  closed: "已结清"
};
const STATUS_COLOR = {
  overdue: "error",
  closed: "success",
  open: "default",
  partial: "default"
};
function PayableList() {
  const { payables, addPayable } = useArapStore();
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [agingFilter, setAgingFilter] = reactExports.useState("");
  const filtered = reactExports.useMemo(() => {
    let data = [...payables];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((p) => p.vendorName.toLowerCase().includes(s) || p.invoiceNo.toLowerCase().includes(s));
    }
    if (statusFilter) data = data.filter((p) => p.status === statusFilter);
    if (agingFilter) data = data.filter((p) => p.agingBucket === agingFilter);
    return data;
  }, [payables, search, statusFilter, agingFilter]);
  const agingSummary = reactExports.useMemo(() => {
    const map = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    filtered.forEach((p) => {
      map[p.agingBucket] += p.balance;
    });
    return map;
  }, [filtered]);
  const payAdvice = (p) => {
    if (p.status === "closed") return "—";
    if (p.agingBucket === "90+") return "紧急安排付款";
    if (p.agingBucket === "61-90") return "尽快安排付款";
    if (p.agingBucket === "31-60") return "本周内安排";
    if (p.agingBucket === "1-30") return "下周安排";
    return "按计划付款";
  };
  const columns = [
    {
      id: "vendorName",
      header: "供应商",
      accessorFn: (r) => r.vendorName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: row.original.vendorName })
    },
    {
      id: "invoiceNo",
      header: "发票号",
      accessorFn: (r) => r.invoiceNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: row.original.invoiceNo })
    },
    {
      id: "amount",
      header: "金额",
      accessorFn: (r) => Number(r.amount) || 0,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { align: "right", children: row.original.amount.toLocaleString() })
    },
    {
      id: "paidAmount",
      header: "已付",
      accessorFn: (r) => Number(r.paidAmount) || 0,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { align: "right", children: row.original.paidAmount.toLocaleString() })
    },
    {
      id: "balance",
      header: "余额",
      accessorFn: (r) => Number(r.balance) || 0,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { align: "right", sx: { fontWeight: 600, color: "primary.main" }, children: row.original.balance.toLocaleString() })
    },
    {
      id: "dueDate",
      header: "到期日",
      accessorFn: (r) => r.dueDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: row.original.dueDate })
    },
    {
      id: "agingBucket",
      header: "账龄",
      accessorFn: (r) => r.agingBucket,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: AGING_LABELS[row.original.agingBucket].label, color: AGING_LABELS[row.original.agingBucket].color })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (r) => r.status,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[row.original.status], color: STATUS_COLOR[row.original.status] })
    },
    {
      id: "advice",
      header: "付款建议",
      enableSorting: false,
      enableColumnFilter: false,
      accessorFn: () => "",
      cell: ({ row }) => {
        const p = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: p.agingBucket === "90+" ? "error" : p.agingBucket === "61-90" ? "warning" : "primary", "data-testid": `ap-pay-suggest-${p.agingBucket}`, children: payAdvice(p) });
      }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "应付管理", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: ["current", "1-30", "31-60", "61-90", "90+"].map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, md: 2.4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { "data-testid": `ap-card-${b}`, sx: { bgcolor: b === "90+" ? "error.light" : "background.paper" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { py: 1.5, "&:last-child": { pb: 1.5 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: AGING_LABELS[b].label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 600, color: b === "90+" ? "error.dark" : "text.primary", children: agingSummary[b].toLocaleString("zh-CN", { minimumFractionDigits: 2 }) })
    ] }) }) }, b)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          size: "small",
          label: "搜索供应商/发票号",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          sx: { minWidth: 220 },
          "data-testid": "ap-search"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          select: true,
          size: "small",
          label: "状态",
          value: statusFilter,
          onChange: (e) => setStatusFilter(e.target.value),
          sx: { minWidth: 120 },
          children: STATUS_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          select: true,
          size: "small",
          label: "账龄",
          value: agingFilter,
          onChange: (e) => setAgingFilter(e.target.value),
          sx: { minWidth: 120 },
          children: AGING_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filtered,
        columns,
        enableRowSelection: false,
        enablePagination: true,
        enableSorting: true,
        enableColumnFilter: true,
        enableBlockSelect: true,
        enableExport: true,
        exportFormat: "xlsx",
        enableImport: true,
        onImport: (rows) => {
          rows.forEach((r) => {
            const now = (/* @__PURE__ */ new Date()).toISOString();
            addPayable({
              id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              vendorId: r["供应商ID"] || `vend-${Date.now()}`,
              vendorName: r["供应商"] || "",
              invoiceNo: r["发票号"] || "",
              amount: Number(r["金额"] || 0),
              paidAmount: Number(r["已付"] || 0),
              balance: Number(r["余额"] || Number(r["金额"] || 0)),
              dueDate: r["到期日"] || now.slice(0, 10),
              status: r["状态"] || "open",
              remarks: r["备注"],
              createdAt: now,
              updatedAt: now,
              createdBy: "导入",
              updatedBy: "导入"
            });
          });
        },
        columnConfigKey: "payable-list"
      }
    )
  ] });
}
export {
  PayableList as default
};
