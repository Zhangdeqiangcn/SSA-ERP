import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, aP as Paper, h as Typography, bK as Stack, bt as TextField, aO as MenuItem, bk as Button, bf as Add, aL as Chip } from "./vendor-DGU5TO-x.js";
import { u as useSalesContractStore } from "./salesContractStore-BUsOJXem.js";
import "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { f as formatCurrency } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import "./StatusBadge-DeJuhK-R.js";
const STATUS_LABELS = {
  draft: "草稿",
  active: "执行中",
  suspended: "已暂停",
  completed: "已完成",
  terminated: "已终止"
};
const STATUS_COLORS = {
  draft: "#94A3B8",
  active: "#10B981",
  suspended: "#F59E0B",
  completed: "#3B82F6",
  terminated: "#EF4444"
};
const SalesContractList = () => {
  var _a;
  const navigate = useNavigate();
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const contracts = useSalesContractStore((s) => s.contracts);
  const addContract = useSalesContractStore((s) => s.addContract);
  const deleteContract = useSalesContractStore((s) => s.deleteContract);
  const [deleteId, setDeleteId] = reactExports.useState(null);
  const filtered = contracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !c.contractNo.includes(search) && !c.customerName.includes(search) && !c.name.includes(search)) return false;
    return true;
  });
  const columns = [
    {
      id: "contractNo",
      header: "合同编号",
      accessorFn: (c) => c.contractNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", fontWeight: 500, children: row.original.contractNo })
    },
    {
      id: "name",
      header: "合同名称",
      accessorFn: (c) => c.name,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.name })
    },
    {
      id: "customerName",
      header: "客户",
      accessorFn: (c) => c.customerName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.customerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.customerCode || "" })
      ] })
    },
    {
      id: "amount",
      header: "合同金额",
      accessorFn: (c) => c.amount,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: formatCurrency(row.original.amount) }) })
    },
    {
      id: "startDate",
      header: "开始日期",
      accessorFn: (c) => c.startDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.startDate })
    },
    {
      id: "endDate",
      header: "结束日期",
      accessorFn: (c) => c.endDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.endDate })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (c) => STATUS_LABELS[c.status],
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: STATUS_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: STATUS_COLORS[row.original.status] + "15", color: STATUS_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    }
  ];
  const pickField = (r, headers, zh, en) => {
    const key = headers.find((h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase());
    return key ? r[key] ?? "" : "";
  };
  const toNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r, headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const statusVal = pickField(r, headers, "状态", "status") || "draft";
    return {
      id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contractNo: pickField(r, headers, "合同编号", "contractNo") || `CT${now.slice(0, 10).replace(/-/g, "")}${Math.floor(Math.random() * 9e3 + 1e3)}`,
      name: pickField(r, headers, "合同名称", "name"),
      customerId: pickField(r, headers, "客户ID", "customerId") || "",
      customerName: pickField(r, headers, "客户", "customerName"),
      customerCode: pickField(r, headers, "客户编码", "customerCode") || void 0,
      salesPerson: pickField(r, headers, "销售员", "salesPerson") || void 0,
      amount: toNum(pickField(r, headers, "合同金额", "amount")),
      startDate: pickField(r, headers, "开始日期", "startDate") || now.slice(0, 10),
      endDate: pickField(r, headers, "结束日期", "endDate") || now.slice(0, 10),
      status: Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : "draft",
      items: [],
      paymentSchedule: [],
      createdAt: now,
      updatedAt: now
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addContract(mapImportRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "销售合同管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => navigate("/sales/contracts/create"), children: "新建合同" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
          { label: "全部", count: contracts.length, color: "#6366F1" },
          { label: "执行中", count: contracts.filter((c) => c.status === "active").length, color: "#10B981" },
          { label: "草稿", count: contracts.filter((c) => c.status === "draft").length, color: "#94A3B8" },
          { label: "已完成", count: contracts.filter((c) => c.status === "completed").length, color: "#3B82F6" },
          { label: "已暂停", count: contracts.filter((c) => c.status === "suspended").length, color: "#F59E0B" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              placeholder: "搜索合同号/客户/合同名称",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 }, children: "🔍" }) },
              sx: { width: 360 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TextField,
            {
              select: true,
              size: "small",
              label: "状态",
              value: statusFilter,
              onChange: (e) => setStatusFilter(e.target.value),
              sx: { width: 160 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
                Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filtered,
            columns,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "sales-contract-list",
            onView: (c) => navigate(`/sales/contracts/${c.id}`),
            onEdit: (c) => navigate(`/sales/contracts/${c.id}/edit`),
            onDelete: (c) => setDeleteId(c.id),
            onImport: handleImport
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!deleteId,
            title: "确认删除合同",
            content: deleteId ? `确定要删除合同 "${(_a = contracts.find((c) => c.id === deleteId)) == null ? void 0 : _a.contractNo}" 吗？此操作不可逆。` : "",
            onConfirm: () => {
              if (deleteId) {
                deleteContract(deleteId);
                setDeleteId(null);
              }
            },
            onCancel: () => setDeleteId(null),
            confirmText: "确认删除",
            confirmColor: "error"
          }
        )
      ]
    }
  );
};
export {
  SalesContractList as default
};
