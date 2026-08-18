import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { e as useSalesStore } from "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { m as Box, aS as Paper, T as Typography, bL as Stack, bv as TextField, aT as Search, b9 as Dialog, ba as DialogTitle, aM as IconButton, aV as CloseIcon, bc as DialogContent, aR as MenuItem, bE as DialogActions, bm as Button, bl as Alert, bh as Add, aO as Chip, ch as LinearProgress, p as Tooltip, en as Notes, bi as Edit } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const SOURCE_LABELS = {
  web: "网络",
  exhibition: "展会",
  referral: "介绍",
  cold_call: "电话",
  advertise: "广告",
  other: "其他"
};
const STATUS_LABELS = {
  new: "新线索",
  contacted: "已联系",
  negotiating: "洽谈中",
  quoted: "已报价",
  won: "已成交",
  lost: "已丢失"
};
const STATUS_COLORS = {
  new: "#6366F1",
  contacted: "#3B82F6",
  negotiating: "#F59E0B",
  quoted: "#8B5CF6",
  won: "#10B981",
  lost: "#94A3B8"
};
const genProspectNo = () => {
  const d = /* @__PURE__ */ new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9e3 + 1e3);
  return `PR${ymd}${rand}`;
};
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const emptyForm = {
  companyName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  industry: "",
  region: "",
  source: "web",
  status: "new",
  interestProducts: "",
  estimatedValue: "",
  probability: "",
  assignedTo: "",
  creditLimit: "",
  nextFollowupDate: "",
  notes: ""
};
const toForm = (p) => ({
  companyName: p.companyName,
  contactName: p.contactName,
  contactPhone: p.contactPhone,
  contactEmail: p.contactEmail,
  industry: p.industry || "",
  region: p.region || "",
  source: p.source,
  status: p.status,
  interestProducts: p.interestProducts.join(", "),
  estimatedValue: p.estimatedValue != null ? String(p.estimatedValue) : "",
  probability: p.probability != null ? String(p.probability) : "",
  assignedTo: p.assignedTo,
  creditLimit: p.creditLimit != null ? String(p.creditLimit) : "",
  nextFollowupDate: p.nextFollowupDate || "",
  notes: p.notes || ""
});
const ProspectList = () => {
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [selectedProspect, setSelectedProspect] = reactExports.useState(null);
  const [followupOpen, setFollowupOpen] = reactExports.useState(false);
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editingId, setEditingId] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState(emptyForm);
  const { prospects, addProspect, updateProspect } = useSalesStore();
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (p) => {
    setEditingId(p.id);
    setForm(toForm(p));
    setDialogOpen(true);
  };
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleSave = () => {
    const ts = nowStr();
    const products = form.interestProducts.split(",").map((s) => s.trim()).filter(Boolean);
    const existing = editingId ? prospects.find((p) => p.id === editingId) : void 0;
    const base = {
      prospectNo: (existing == null ? void 0 : existing.prospectNo) || genProspectNo(),
      companyName: form.companyName,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      industry: form.industry || void 0,
      region: form.region || void 0,
      source: form.source,
      status: form.status,
      interestProducts: products,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : void 0,
      probability: form.probability ? Number(form.probability) : void 0,
      nextFollowupDate: form.nextFollowupDate || void 0,
      followupRecords: (existing == null ? void 0 : existing.followupRecords) || [],
      assignedTo: form.assignedTo,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : void 0,
      usedCredit: (existing == null ? void 0 : existing.usedCredit) || 0,
      notes: form.notes || void 0
    };
    if (editingId) {
      updateProspect(editingId, base);
    } else {
      addProspect({
        ...base,
        id: `pr-${Date.now()}`,
        createdAt: ts,
        updatedAt: ts,
        createdBy: "系统",
        updatedBy: "系统"
      });
    }
    setDialogOpen(false);
  };
  const filtered = prospects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search && !p.companyName.includes(search) && !p.prospectNo.includes(search) && !p.contactName.includes(search)) return false;
    return true;
  });
  const stats = [
    { label: "全部", count: prospects.length, color: "#6366F1", filter: "" },
    { label: "新线索", count: prospects.filter((p) => p.status === "new").length, color: "#6366F1", filter: "new" },
    { label: "洽谈中", count: prospects.filter((p) => p.status === "negotiating").length, color: "#F59E0B", filter: "negotiating" },
    { label: "已成交", count: prospects.filter((p) => p.status === "won").length, color: "#10B981", filter: "won" },
    { label: "已丢失", count: prospects.filter((p) => p.status === "lost").length, color: "#94A3B8", filter: "lost" }
  ];
  const columns = [
    {
      id: "prospectNo",
      header: "编号",
      accessorFn: (p) => p.prospectNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: row.original.prospectNo })
    },
    {
      id: "companyName",
      header: "公司名称",
      accessorFn: (p) => p.companyName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.companyName })
    },
    {
      id: "contact",
      header: "联系人",
      accessorFn: (p) => p.contactName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.contactName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.contactPhone })
      ] })
    },
    {
      id: "industry",
      header: "行业",
      accessorFn: (p) => p.industry,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.industry || "-" })
    },
    {
      id: "region",
      header: "区域",
      accessorFn: (p) => p.region,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.region || "-" })
    },
    {
      id: "source",
      header: "来源",
      accessorFn: (p) => SOURCE_LABELS[p.source],
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: SOURCE_LABELS[row.original.source], size: "small", variant: "outlined" })
    },
    {
      id: "interestProducts",
      header: "意向产品",
      accessorFn: (p) => p.interestProducts.join(","),
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", children: row.original.interestProducts.slice(0, 2).map((prod) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: prod, size: "small", sx: { fontSize: "0.65rem", height: 20 } }, prod)) })
    },
    {
      id: "estimatedValue",
      header: "预估金额",
      accessorFn: (p) => p.estimatedValue,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.estimatedValue ? formatCurrency(row.original.estimatedValue) : "-" }) })
    },
    {
      id: "credit",
      header: "信用占用",
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        return p.creditLimit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "credit-status", sx: { minWidth: 130 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              LinearProgress,
              {
                variant: "determinate",
                value: Math.min(100, Math.round((p.usedCredit || 0) / p.creditLimit * 100)),
                sx: {
                  width: 70,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "#E2E8F0",
                  "& .MuiLinearProgress-bar": { bgcolor: (p.usedCredit || 0) > p.creditLimit ? "#EF4444" : "#3B82F6" }
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: formatCurrency(p.usedCredit || 0) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
            "额度 ",
            formatCurrency(p.creditLimit)
          ] }),
          ((p.usedCredit || 0) > p.creditLimit || (p.usedCredit || 0) / p.creditLimit >= 0.9) && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "信用超额", color: "error", sx: { mt: 0.5 } })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": "credit-status", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "未授信", variant: "outlined", color: "default" }) });
      }
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (p) => STATUS_LABELS[p.status],
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: STATUS_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: STATUS_COLORS[row.original.status] + "15", color: STATUS_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    },
    {
      id: "probability",
      header: "成交概率",
      accessorFn: (p) => p.probability,
      cell: ({ row }) => {
        const p = row.original;
        return p.probability ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: p.probability,
              sx: {
                width: 60,
                height: 6,
                borderRadius: 3,
                bgcolor: "#E2E8F0",
                "& .MuiLinearProgress-bar": { bgcolor: STATUS_COLORS[p.status] }
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
            p.probability,
            "%"
          ] })
        ] }) : "-";
      }
    },
    {
      id: "nextFollowupDate",
      header: "下次跟进",
      accessorFn: (p) => p.nextFollowupDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.nextFollowupDate || "-" })
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const p = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "flex-end", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看跟进记录", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => {
            setSelectedProspect(p);
            setFollowupOpen(true);
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Notes, { fontSize: "small" }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => openEdit(p), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) })
        ] });
      }
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
    const statusVal = pickField(r, headers, "状态", "status") || "new";
    const sourceVal = pickField(r, headers, "来源", "source") || "other";
    const products = pickField(r, headers, "意向产品", "interestProducts").split(",").map((s) => s.trim()).filter(Boolean);
    return {
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prospectNo: pickField(r, headers, "编号", "prospectNo") || genProspectNo(),
      companyName: pickField(r, headers, "公司名称", "companyName"),
      contactName: pickField(r, headers, "联系人", "contactName"),
      contactPhone: pickField(r, headers, "联系电话", "contactPhone"),
      contactEmail: pickField(r, headers, "联系邮箱", "contactEmail") || "",
      industry: pickField(r, headers, "行业", "industry") || void 0,
      region: pickField(r, headers, "区域", "region") || void 0,
      source: Object.keys(SOURCE_LABELS).includes(sourceVal) ? sourceVal : "other",
      status: Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : "new",
      interestProducts: products.length ? products : [],
      estimatedValue: toNum(pickField(r, headers, "预估金额", "estimatedValue")) || void 0,
      probability: Number(pickField(r, headers, "成交概率", "probability").replace(/[^0-9.]/g, "")) || void 0,
      nextFollowupDate: pickField(r, headers, "下次跟进", "nextFollowupDate") || void 0,
      followupRecords: [],
      assignedTo: pickField(r, headers, "负责人", "assignedTo"),
      creditLimit: toNum(pickField(r, headers, "信用额度", "creditLimit")) || void 0,
      usedCredit: 0,
      notes: pickField(r, headers, "备注", "notes") || void 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addProspect(mapImportRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "意向客户管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openCreate, children: "新增意向客户" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: stats.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: {
          px: 2.5,
          py: 2,
          borderRadius: 3,
          cursor: "pointer",
          flex: 1,
          border: `1px solid ${statusFilter === s.filter ? s.color : s.color + "20"}`,
          bgcolor: statusFilter === s.filter ? s.color + "08" : "white"
        }, onClick: () => setStatusFilter(s.filter), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              placeholder: "搜索公司/编号/联系人",
              value: search,
              onChange: (e) => setSearch(e.target.value),
              InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
              sx: { width: 260 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filtered,
            columns,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "sales-prospect-list",
            onImport: handleImport
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialogOpen, onClose: () => setDialogOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            editingId ? "编辑意向客户" : "新增意向客户",
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setDialogOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "公司名称",
                  value: form.companyName,
                  onChange: (e) => setField("companyName", e.target.value),
                  "data-testid": "prospect-company"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "联系人",
                  value: form.contactName,
                  onChange: (e) => setField("contactName", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "联系电话",
                  value: form.contactPhone,
                  onChange: (e) => setField("contactPhone", e.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "联系邮箱",
                  value: form.contactEmail,
                  onChange: (e) => setField("contactEmail", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "行业", value: form.industry, onChange: (e) => setField("industry", e.target.value) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "区域", value: form.region, onChange: (e) => setField("region", e.target.value) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, label: "来源", value: form.source, onChange: (e) => setField("source", e.target.value), children: Object.entries(SOURCE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, label: "状态", value: form.status, onChange: (e) => setField("status", e.target.value), children: Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "意向产品（逗号分隔）",
                value: form.interestProducts,
                onChange: (e) => setField("interestProducts", e.target.value),
                placeholder: "如：钢板, 接触器"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "预估金额",
                  type: "number",
                  value: form.estimatedValue,
                  onChange: (e) => setField("estimatedValue", e.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "成交概率(%)",
                  type: "number",
                  value: form.probability,
                  onChange: (e) => setField("probability", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "负责人", value: form.assignedTo, onChange: (e) => setField("assignedTo", e.target.value) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "信用额度",
                  type: "number",
                  value: form.creditLimit,
                  onChange: (e) => setField("creditLimit", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "下次跟进日期",
                type: "date",
                value: form.nextFollowupDate,
                onChange: (e) => setField("nextFollowupDate", e.target.value),
                InputLabelProps: { shrink: true }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "备注",
                multiline: true,
                minRows: 2,
                value: form.notes,
                onChange: (e) => setField("notes", e.target.value)
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                onClick: handleSave,
                disabled: !form.companyName.trim(),
                "data-testid": "prospect-save",
                children: "保存"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: followupOpen, onClose: () => setFollowupOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            "跟进记录 — ",
            selectedProspect == null ? void 0 : selectedProspect.companyName,
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setFollowupOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: (selectedProspect == null ? void 0 : selectedProspect.followupRecords.length) === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无跟进记录" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 2, children: selectedProspect == null ? void 0 : selectedProspect.followupRecords.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", mb: 0.5, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", children: r.method === "visit" ? "拜访" : r.method === "phone" ? "电话" : r.method === "email" ? "邮件" : r.method }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                r.date,
                " · ",
                r.followedBy
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: r.content }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 1, p: 1, bgcolor: "white", borderRadius: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "#10B981", children: [
                "结果：",
                r.result
              ] }),
              r.nextAction && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "#3B82F6", display: "block", children: [
                "下一步：",
                r.nextAction
              ] })
            ] })
          ] }, r.id)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setFollowupOpen(false), children: "关闭" }) })
        ] })
      ]
    }
  );
};
export {
  ProspectList as default
};
