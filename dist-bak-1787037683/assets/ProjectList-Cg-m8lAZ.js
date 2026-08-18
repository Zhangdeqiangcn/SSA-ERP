import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, aP as Paper, h as Typography, bt as TextField, aQ as Search, bk as Button, bf as Add, cl as LinearProgress, aL as Chip, bN as Warning } from "./vendor-46QZWBd3.js";
import { e as useSalesStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import "./StatusBadge-Db1uY4YU.js";
const STATUS_LABELS = {
  planning: "规划中",
  in_progress: "执行中",
  pending: "暂停",
  at_risk: "风险",
  completed: "已完成",
  closed: "已关闭"
};
const STATUS_COLORS = {
  planning: "#6366F1",
  in_progress: "#3B82F6",
  pending: "#F59E0B",
  at_risk: "#EF4444",
  completed: "#10B981",
  closed: "#94A3B8"
};
const ProjectList = () => {
  const { projects, addProject } = useSalesStore();
  const navigate = useNavigate();
  const [search, setSearch] = reactExports.useState("");
  const filtered = projects.filter((p) => {
    if (search && !p.projectName.includes(search) && !p.projectNo.includes(search) && !p.customerName.includes(search)) return false;
    return true;
  });
  const columns = [
    {
      id: "projectNo",
      header: "项目编号",
      accessorFn: (p) => p.projectNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", fontWeight: 500, children: row.original.projectNo })
    },
    {
      id: "projectName",
      header: "项目名称",
      accessorFn: (p) => p.projectName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.projectName })
    },
    {
      id: "customerName",
      header: "客户",
      accessorFn: (p) => p.customerName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.customerName })
    },
    {
      id: "manager",
      header: "项目经理",
      accessorFn: (p) => p.manager,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.manager })
    },
    {
      id: "dateRange",
      header: "起止日期",
      accessorFn: (p) => `${p.startDate} ~ ${p.endDate}`,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
        row.original.startDate,
        " ~ ",
        row.original.endDate
      ] })
    },
    {
      id: "contractAmount",
      header: "合同金额",
      accessorFn: (p) => p.contractAmount,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: formatCurrency(row.original.contractAmount) }) })
    },
    {
      id: "receivedAmount",
      header: "回款金额",
      accessorFn: (p) => p.receivedAmount,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "#10B981", children: formatCurrency(row.original.receivedAmount) }) })
    },
    {
      id: "actualCost",
      header: "实际成本",
      accessorFn: (p) => p.actualCost,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: formatCurrency(row.original.actualCost) }) })
    },
    {
      id: "progress",
      header: "进度",
      accessorFn: (p) => p.progress,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          LinearProgress,
          {
            variant: "determinate",
            value: row.original.progress,
            sx: {
              width: 80,
              height: 6,
              borderRadius: 3,
              bgcolor: "#E2E8F0",
              "& .MuiLinearProgress-bar": { bgcolor: row.original.progress >= 80 ? "#10B981" : row.original.progress >= 40 ? "#3B82F6" : "#F59E0B" }
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
          row.original.progress,
          "%"
        ] })
      ] })
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
      id: "exceptions",
      header: "异常",
      accessorFn: (p) => p.exceptions.filter((e) => e.status === "open" || e.status === "investigating").length,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const hasOpenExceptions = p.exceptions.filter((e) => e.status === "open" || e.status === "investigating").length;
        return hasOpenExceptions > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), label: `${hasOpenExceptions}个`, size: "small", color: "error", variant: "outlined" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "无" });
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
    const statusVal = pickField(r, headers, "状态", "status") || "planning";
    return {
      id: `prj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectNo: pickField(r, headers, "项目编号", "projectNo") || `PRJ${now.slice(0, 10).replace(/-/g, "")}${Math.floor(Math.random() * 9e3 + 1e3)}`,
      projectName: pickField(r, headers, "项目名称", "projectName"),
      customerName: pickField(r, headers, "客户", "customerName"),
      customerCode: pickField(r, headers, "客户编码", "customerCode") || void 0,
      status: Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : "planning",
      startDate: pickField(r, headers, "开始日期", "startDate") || now.slice(0, 10),
      endDate: pickField(r, headers, "结束日期", "endDate") || now.slice(0, 10),
      contractAmount: toNum(pickField(r, headers, "合同金额", "contractAmount")),
      receivedAmount: toNum(pickField(r, headers, "回款金额", "receivedAmount")),
      budget: toNum(pickField(r, headers, "预算", "budget")),
      actualCost: toNum(pickField(r, headers, "实际成本", "actualCost")),
      progress: Number(pickField(r, headers, "进度", "progress").replace(/[^0-9.]/g, "")) || 0,
      manager: pickField(r, headers, "项目经理", "manager"),
      team: [],
      milestones: [],
      exceptions: [],
      linkedOrders: [],
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addProject(mapImportRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "项目管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), children: "新建项目" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
          { label: "全部项目", count: projects.length, color: "#6366F1" },
          { label: "执行中", count: projects.filter((p) => p.status === "in_progress").length, color: "#3B82F6" },
          { label: "风险项目", count: projects.filter((p) => p.status === "at_risk" || p.exceptions.some((e) => e.status === "open")).length, color: "#EF4444" },
          { label: "已完成", count: projects.filter((p) => p.status === "completed").length, color: "#10B981" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            size: "small",
            placeholder: "搜索项目名称/编号/客户",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
            sx: { width: 300 }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filtered,
            columns,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "sales-project-list",
            onView: (p) => navigate(`/sales/projects/${p.id}`),
            onImport: handleImport
          }
        ) })
      ]
    }
  );
};
export {
  ProjectList as default
};
