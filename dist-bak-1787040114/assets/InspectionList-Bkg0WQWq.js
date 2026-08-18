import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, bf as Add, bX as Grid, aP as Paper, cl as LinearProgress, bt as TextField, aQ as Search, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, c2 as Tabs, c3 as Tab, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bj as Alert, dh as Info, bC as DialogActions, cU as Snackbar, aL as Chip, k as Tooltip, aJ as IconButton, bR as Visibility, K as Assignment, bN as Warning, d7 as Cancel, bV as CheckCircle, be as Refresh, eF as HourglassEmpty } from "./vendor-DGU5TO-x.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { d as useQualityStore } from "./index-DeeqqmHA.js";
import { c as computeAqlPlan, L as LEVELS, A as AQLS } from "./aql-BdS2-Hg_.js";
import "./StatusBadge-DeJuhK-R.js";
const TYPE_LABELS = {
  incoming: "来料检验",
  process: "过程检验",
  final: "成品检验"
};
const TYPE_COLORS = {
  incoming: "#3B82F6",
  process: "#F59E0B",
  final: "#10B981"
};
const STATUS_LABELS = {
  pending: "待检",
  in_progress: "检验中",
  passed: "合格",
  failed: "不合格",
  conditional_pass: "条件接收"
};
const STATUS_COLORS = {
  pending: "#94A3B8",
  in_progress: "#3B82F6",
  passed: "#10B981",
  failed: "#EF4444",
  conditional_pass: "#F59E0B"
};
const STATUS_ICONS = {
  pending: /* @__PURE__ */ jsxRuntimeExports.jsx(HourglassEmpty, { sx: { fontSize: 14 } }),
  in_progress: /* @__PURE__ */ jsxRuntimeExports.jsx(Refresh, { sx: { fontSize: 14 } }),
  passed: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 14 } }),
  failed: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, { sx: { fontSize: 14 } }),
  conditional_pass: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { fontSize: 14 } })
};
const InspectionList = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = reactExports.useState("all");
  const [statusFilter, setStatusFilter] = reactExports.useState("");
  const [keyword, setKeyword] = reactExports.useState("");
  const { inspectionTasks, addInspectionTask, inspectionStandards } = useQualityStore();
  const [createOpen, setCreateOpen] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({
    type: "incoming",
    materialCode: "",
    materialName: "",
    batchNo: "",
    quantity: 1,
    sampleQuantity: 1,
    aql: 2.5,
    inspectionLevel: "II",
    vendorName: "",
    assignedTo: "",
    plannedDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    standardId: ""
  });
  const aqlPlan = reactExports.useMemo(
    () => computeAqlPlan(Number(form.quantity) || 0, form.inspectionLevel, form.aql),
    [form.quantity, form.inspectionLevel, form.aql]
  );
  reactExports.useEffect(() => {
    if (aqlPlan) {
      setForm((f) => ({ ...f, sampleQuantity: aqlPlan.n }));
    }
  }, [aqlPlan]);
  const filtered = inspectionTasks.filter((t) => {
    if (tabValue !== "all" && t.type !== tabValue) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    if (keyword && !t.taskNo.includes(keyword) && !t.materialName.includes(keyword)) return false;
    return true;
  });
  const stats = {
    total: inspectionTasks.length,
    pending: inspectionTasks.filter((t) => t.status === "pending").length,
    inProgress: inspectionTasks.filter((t) => t.status === "in_progress").length,
    passed: inspectionTasks.filter((t) => t.status === "passed").length,
    failed: inspectionTasks.filter((t) => t.status === "failed").length
  };
  const passRate = stats.total > 0 ? Math.round(stats.passed / (stats.passed + stats.failed) * 100) || 0 : 0;
  const mapImportRow = (r, _headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const typeMap = { 来料检验: "incoming", 过程检验: "process", 成品检验: "final" };
    const statusMap = { 待检: "pending", 检验中: "in_progress", 合格: "passed", 不合格: "failed", 条件接收: "conditional_pass" };
    const qty = Number(r["检验数量"]) || 1;
    return {
      id: `it-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskNo: r["任务编号"] || `INSP-IMP-${Date.now()}`,
      type: typeMap[r["检验类型"]] || "incoming",
      status: statusMap[r["状态"]] || "pending",
      materialId: r["物料编码"] || "",
      materialCode: r["物料编码"] || "",
      materialName: r["物料"] || "",
      batchNo: r["批次号"] || "-",
      quantity: qty,
      sampleQuantity: Number(r["抽样数量"]) || qty,
      inspectionStandardId: "",
      inspectionStandardName: "",
      assignedTo: r["负责人"] || "质检员",
      plannedDate: r["计划日期"] || "",
      createdAt: now,
      updatedAt: now,
      createdBy: "admin",
      updatedBy: "admin"
    };
  };
  const columns = [
    {
      id: "taskNo",
      header: "任务编号",
      accessorFn: (row) => row.taskNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500, color: "#3B82F6", fontFamily: "monospace" }, children: row.original.taskNo })
    },
    {
      id: "type",
      header: "检验类型",
      accessorFn: (row) => row.type,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: TYPE_LABELS[row.original.type],
          size: "small",
          sx: { bgcolor: TYPE_COLORS[row.original.type] + "15", color: TYPE_COLORS[row.original.type], fontWeight: 500 }
        }
      )
    },
    {
      id: "material",
      header: "物料",
      accessorFn: (row) => row.materialName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: row.original.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: row.original.materialCode })
      ] })
    },
    {
      id: "batchNo",
      header: "批次号",
      accessorFn: (row) => row.batchNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace" }, children: row.original.batchNo })
    },
    {
      id: "vendor",
      header: "供应商/工单",
      accessorFn: (row) => row.vendorName || row.workOrderNo || "",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.vendorName || row.original.workOrderNo || "-" })
    },
    {
      id: "quantity",
      header: "检验数量",
      accessorFn: (row) => row.quantity,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
        row.original.quantity,
        " / 抽",
        row.original.sampleQuantity
      ] })
    },
    {
      id: "plannedDate",
      header: "计划日期",
      accessorFn: (row) => row.plannedDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.plannedDate })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (row) => row.status,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          icon: STATUS_ICONS[row.original.status],
          label: STATUS_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: STATUS_COLORS[row.original.status] + "15", color: STATUS_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/quality/inspection/${row.original.id}`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }) }),
        (row.original.status === "pending" || row.original.status === "in_progress") && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "执行检验", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/quality/inspection/${row.original.id}/execute`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }) }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "质量检验" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setCreateOpen(true), children: "新建检验任务" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2.5, sx: { mb: 3 }, children: [
      { label: "本月合格率", value: `${passRate}%`, color: "#10B981", sub: `${stats.passed} 批合格 / ${stats.failed} 批不合格` },
      { label: "待检任务", value: stats.pending, color: "#F59E0B", sub: "需安排检验" },
      { label: "检验中", value: stats.inProgress, color: "#3B82F6", sub: "进行中" },
      { label: "本月总检批", value: stats.total, color: "#6366F1", sub: "包含所有类型" }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, border: `1px solid ${kpi.color}20` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B", mb: 0.5 }, children: kpi.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: kpi.color, fontSize: "1.875rem" }, children: kpi.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: kpi.sub }),
      kpi.label === "本月合格率" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        LinearProgress,
        {
          variant: "determinate",
          value: passRate,
          sx: { mt: 1.5, height: 4, borderRadius: 2, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: "#10B981", borderRadius: 2 } }
        }
      )
    ] }) }, kpi.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          size: "small",
          placeholder: "任务编号/物料名称",
          value: keyword,
          onChange: (e) => setKeyword(e.target.value),
          InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
          sx: { width: 220 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { width: 140 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: statusFilter, label: "状态", onChange: (e) => setStatusFilter(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
          Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", onClick: () => {
        setStatusFilter("");
        setKeyword("");
      }, children: "重置" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Tabs,
        {
          value: tabValue,
          onChange: (_, v) => setTabValue(v),
          sx: { borderBottom: "1px solid rgba(226,232,240,0.8)", px: 2, "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { value: "all", label: `全部 (${inspectionTasks.length})` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { value: "incoming", label: `来料检验 (${inspectionTasks.filter((t) => t.type === "incoming").length})` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { value: "process", label: `过程检验 (${inspectionTasks.filter((t) => t.type === "process").length})` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { value: "final", label: `成品检验 (${inspectionTasks.filter((t) => t.type === "final").length})` })
          ]
        }
      ),
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
          onImport: (rows, headers) => rows.forEach((r) => addInspectionTask(mapImportRow(r))),
          columnConfigKey: "quality-inspection-list"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: createOpen, onClose: () => setCreateOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建检验任务" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2, pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "检验类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: form.type,
              label: "检验类型",
              onChange: (e) => setForm((f) => ({ ...f, type: e.target.value })),
              children: Object.entries(TYPE_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "物料编码",
            fullWidth: true,
            value: form.materialCode,
            inputProps: { "data-testid": "inspection-material-code" },
            onChange: (e) => setForm((f) => ({ ...f, materialCode: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "物料名称",
            fullWidth: true,
            value: form.materialName,
            inputProps: { "data-testid": "inspection-material-name" },
            onChange: (e) => setForm((f) => ({ ...f, materialName: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "批次号",
            fullWidth: true,
            value: form.batchNo,
            onChange: (e) => setForm((f) => ({ ...f, batchNo: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "检验数量",
              type: "number",
              fullWidth: true,
              value: form.quantity,
              inputProps: { "data-testid": "inspection-quantity" },
              onChange: (e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "抽样数量",
              type: "number",
              fullWidth: true,
              value: form.sampleQuantity,
              onChange: (e) => setForm((f) => ({ ...f, sampleQuantity: Number(e.target.value) })),
              inputProps: { "data-testid": "inspection-sample-size" },
              helperText: "由 AQL 抽样方案自动回填，可手动调整"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "检验水平" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Select,
              {
                value: form.inspectionLevel,
                label: "检验水平",
                "data-testid": "inspection-aql-level",
                onChange: (e) => setForm((f) => ({ ...f, inspectionLevel: e.target.value })),
                children: LEVELS.map((lv) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: lv, children: lv }, lv))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "AQL（接收质量限 %）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Select,
              {
                value: form.aql,
                label: "AQL（接收质量限 %）",
                "data-testid": "inspection-aql-value",
                onChange: (e) => setForm((f) => ({ ...f, aql: Number(e.target.value) })),
                children: AQLS.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: a, children: a }, a))
              }
            )
          ] })
        ] }),
        aqlPlan ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Alert,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { fontSize: "inherit" }),
            severity: "info",
            "data-testid": "inspection-aql-plan",
            sx: { alignItems: "center" },
            children: [
              "抽样方案（GB/T 2828.1）：字码 ",
              aqlPlan.code,
              " · 样本量 n=",
              aqlPlan.n,
              " · 接收数 Ac=",
              aqlPlan.ac,
              " · 拒收数 Re=",
              aqlPlan.re
            ]
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "请填写有效的检验数量（≥2）以生成 AQL 抽样方案。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "供应商/工单",
            fullWidth: true,
            value: form.vendorName,
            onChange: (e) => setForm((f) => ({ ...f, vendorName: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "负责人",
            fullWidth: true,
            value: form.assignedTo,
            onChange: (e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "计划日期",
            type: "date",
            fullWidth: true,
            InputLabelProps: { shrink: true },
            value: form.plannedDate,
            onChange: (e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "检验标准" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: form.standardId,
              label: "检验标准",
              onChange: (e) => setForm((f) => ({ ...f, standardId: e.target.value })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "不关联" }),
                inspectionStandards.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: s.id, children: [
                  s.standardNo,
                  " - ",
                  s.name
                ] }, s.id))
              ]
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setCreateOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            disabled: !form.materialName || !form.materialCode,
            onClick: () => {
              const std = inspectionStandards.find((s) => s.id === form.standardId) || inspectionStandards[0];
              addInspectionTask({
                id: `it-${Date.now()}`,
                taskNo: `INSP-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${String(Date.now()).slice(-4)}`,
                type: form.type,
                status: "pending",
                materialId: form.materialCode,
                materialCode: form.materialCode,
                materialName: form.materialName,
                batchNo: form.batchNo || "-",
                quantity: Number(form.quantity) || 1,
                sampleQuantity: Number(form.sampleQuantity) || ((aqlPlan == null ? void 0 : aqlPlan.n) ?? 1),
                aql: form.aql,
                inspectionLevel: form.inspectionLevel,
                aqlCode: aqlPlan == null ? void 0 : aqlPlan.code,
                aqlAc: aqlPlan == null ? void 0 : aqlPlan.ac,
                aqlRe: aqlPlan == null ? void 0 : aqlPlan.re,
                vendorName: form.vendorName || void 0,
                inspectionStandardId: (std == null ? void 0 : std.id) || "",
                inspectionStandardName: (std == null ? void 0 : std.name) || "",
                assignedTo: form.assignedTo || "质检员",
                plannedDate: form.plannedDate,
                createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
                createdBy: "admin",
                updatedBy: "admin"
              });
              setCreateOpen(false);
              setSnackbar(true);
            },
            children: "创建"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: snackbar, autoHideDuration: 2500, onClose: () => setSnackbar(false), message: "检验任务已创建" })
  ] });
};
export {
  InspectionList as default
};
