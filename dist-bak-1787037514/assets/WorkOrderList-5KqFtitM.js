import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { g as useOrgStore, U as useCurrentOrg, T as useDataPermissionStore, W as passDataPermission } from "./index-hTLNcGoC.js";
import "./vendor-date-DpsB6iVy.js";
import { u as useProductionStore } from "./productionStore-B8YnWPVr.js";
import { u as useNumberingStore } from "./numberingStore-BLNwdXfi.js";
import { m as Box, T as Typography, bm as Button, bh as Add, aO as Chip, bl as Alert, bY as Grid, aS as Paper, c8 as TrendingUp, c2 as Tabs, c3 as Tab, b9 as Dialog, ba as DialogTitle, bL as Stack, aM as IconButton, aV as CloseIcon, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions, ch as LinearProgress, bS as Visibility, dH as PlayArrow } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const STATUS_LABELS = {
  draft: "草稿",
  released: "已下达",
  in_progress: "生产中",
  completed: "已完成",
  closed: "已关闭"
};
const STATUS_COLORS = {
  draft: "#94A3B8",
  released: "#3B82F6",
  in_progress: "#F59E0B",
  completed: "#10B981",
  closed: "#6366F1"
};
const PRIORITY_LABELS = { urgent: "紧急", high: "高", normal: "普通", low: "低" };
const PRIORITY_COLORS = { urgent: "#EF4444", high: "#F59E0B", normal: "#10B981", low: "#94A3B8" };
const todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const WorkOrderList = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = reactExports.useState("all");
  const { workOrders, addWorkOrder } = useProductionStore();
  const nextNo = useNumberingStore((s) => s.nextNo);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const currentOrg = useCurrentOrg();
  const { enabled, mode, modules } = useDataPermissionStore();
  const [open, setOpen] = reactExports.useState(false);
  const [orderNo, setOrderNo] = reactExports.useState("");
  const [productCode, setProductCode] = reactExports.useState("");
  const [productName, setProductName] = reactExports.useState("");
  const [plannedQuantity, setPlannedQuantity] = reactExports.useState("1");
  const [priority, setPriority] = reactExports.useState("normal");
  const [workshop, setWorkshop] = reactExports.useState("");
  const [supervisor, setSupervisor] = reactExports.useState("");
  const [plannedStartDate, setPlannedStartDate] = reactExports.useState(todayStr());
  const [plannedEndDate, setPlannedEndDate] = reactExports.useState(todayStr());
  const [status, setStatus] = reactExports.useState("released");
  const openCreate = () => {
    setOrderNo(nextNo("WO"));
    setProductCode("");
    setProductName("");
    setPlannedQuantity("1");
    setPriority("normal");
    setWorkshop("");
    setSupervisor("");
    setPlannedStartDate(todayStr());
    setPlannedEndDate(todayStr());
    setStatus("released");
    setOpen(true);
  };
  const handleSave = () => {
    const ts = nowStr();
    const wo = {
      id: `wo-${Date.now()}`,
      orderNo,
      status,
      orgId: currentOrgId,
      productCode,
      productName,
      bomId: "",
      bomNo: "",
      routeId: "",
      routeNo: "",
      plannedQuantity: Number(plannedQuantity) || 0,
      completedQuantity: 0,
      scrapQuantity: 0,
      plannedStartDate,
      plannedEndDate,
      priority,
      workshop,
      supervisor,
      createdAt: ts,
      updatedAt: ts,
      createdBy: "系统",
      updatedBy: "系统"
    };
    addWorkOrder(wo);
    setOpen(false);
  };
  const statusFiltered = tabValue === "all" ? workOrders : workOrders.filter((w) => w.status === tabValue);
  const filtered = statusFiltered.filter(
    (w) => passDataPermission(w.orgId, currentOrgId, enabled, mode, "production", modules)
  );
  const getProgress = (wo) => {
    if (!wo.progress || wo.progress.length === 0) return 0;
    const completed = wo.progress.filter((p) => p.status === "completed").length;
    return Math.round(completed / wo.progress.length * 100);
  };
  const mapImportRow = (r, _headers) => {
    const now = nowStr();
    const prioMap = { 紧急: "urgent", 高: "high", 普通: "normal", 低: "low" };
    const statusMap = {
      草稿: "draft",
      已下达: "released",
      生产中: "in_progress",
      已完成: "completed",
      已关闭: "closed"
    };
    const planDate = (r["计划日期"] || "").split("~")[0].trim() || todayStr();
    return {
      id: `wo-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNo: r["工单编号"] || `WO-IMP-${Date.now()}`,
      status: statusMap[r["状态"]] || "released",
      orgId: currentOrgId,
      productCode: r["产品编码"] || "",
      productName: r["产品"] || r["产品名称"] || "",
      bomId: "",
      bomNo: "",
      routeId: "",
      routeNo: "",
      plannedQuantity: Number(r["计划数量"]) || 0,
      completedQuantity: Number(r["完成数量"]) || 0,
      scrapQuantity: 0,
      plannedStartDate: planDate,
      plannedEndDate: r["计划结束日期"] || planDate,
      priority: prioMap[r["优先级"]] || "normal",
      workshop: r["车间"] || "",
      supervisor: "",
      createdAt: now,
      updatedAt: now,
      createdBy: "系统",
      updatedBy: "系统"
    };
  };
  const columns = [
    {
      id: "orderNo",
      header: "工单编号",
      accessorFn: (row) => row.orderNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500, fontFamily: "monospace", color: "#3B82F6" }, children: row.original.orderNo })
    },
    {
      id: "product",
      header: "产品",
      accessorFn: (row) => row.productName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: row.original.productName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: row.original.productCode })
      ] })
    },
    {
      id: "priority",
      header: "优先级",
      accessorFn: (row) => row.priority,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: PRIORITY_LABELS[row.original.priority],
          size: "small",
          sx: { bgcolor: PRIORITY_COLORS[row.original.priority] + "15", color: PRIORITY_COLORS[row.original.priority], fontWeight: 500 }
        }
      )
    },
    {
      id: "plannedQuantity",
      header: "计划数量",
      accessorFn: (row) => row.plannedQuantity,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.plannedQuantity })
    },
    {
      id: "completedQuantity",
      header: "完成数量",
      accessorFn: (row) => row.completedQuantity,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500, color: row.original.completedQuantity > 0 ? "#10B981" : "#64748B" }, children: row.original.completedQuantity })
    },
    {
      id: "planDate",
      header: "计划日期",
      accessorFn: (row) => row.plannedStartDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.plannedStartDate }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: [
          "~ ",
          row.original.plannedEndDate
        ] })
      ] })
    },
    {
      id: "workshop",
      header: "车间",
      accessorFn: (row) => row.workshop,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.workshop })
    },
    {
      id: "progress",
      header: "进度",
      accessorFn: (row) => getProgress(row.original),
      cell: ({ row }) => {
        const progress = getProgress(row.original);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 120 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: progress,
              sx: { flex: 1, height: 6, borderRadius: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: STATUS_COLORS[row.original.status], borderRadius: 3 } }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B", fontWeight: 500, minWidth: 30 }, children: [
            progress,
            "%"
          ] })
        ] });
      }
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (row) => row.status,
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
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/production/orders/${row.original.id}`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }),
        row.original.status === "released" && /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/production/orders/${row.original.id}`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, { fontSize: "small" }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "生产工单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: openCreate, children: "新建工单" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          "data-testid": "wo-visible-count",
          label: `可见工单：${filtered.length}`,
          size: "small",
          sx: { bgcolor: "#EFF6FF", color: "#2563EB", fontWeight: 600 }
        }
      ),
      enabled && mode === "current-org" && modules.production && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Alert,
        {
          "data-testid": "wo-org-banner",
          severity: "info",
          sx: { py: 0, flex: 1, minWidth: 240 },
          children: [
            "数据权限（仅当前组织）：仅显示归属「",
            (currentOrg == null ? void 0 : currentOrg.name) ?? currentOrgId,
            "」的工单，遗留数据仍可见"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, bgcolor: "#FFF7ED" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "本月工单数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: "#EA580C", children: filtered.filter((w) => {
          var _a, _b;
          const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
          return ((_a = w.createdAt) == null ? void 0 : _a.startsWith(now)) || ((_b = w.plannedStartDate) == null ? void 0 : _b.startsWith(now));
        }).length })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { flex: 1 }, children: "完工率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 14, color: "#10B981" } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 36 36", width: "60", height: "60", children: (() => {
            const completed = workOrders.filter((w) => w.status === "completed").length;
            const total = workOrders.length || 1;
            const rate = completed / total;
            const dasharray = 2 * Math.PI * 15.9;
            const dashoffset = dasharray * (1 - rate);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: "18", cy: "18", r: "15.9", fill: "none", stroke: "#E2E8F0", strokeWidth: "3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  cx: "18",
                  cy: "18",
                  r: "15.9",
                  fill: "none",
                  stroke: "#10B981",
                  strokeWidth: "3",
                  strokeDasharray: dasharray,
                  strokeDashoffset: dashoffset,
                  strokeLinecap: "round",
                  transform: "rotate(-90 18 18)"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("text", { x: "18", y: "19", textAnchor: "middle", fontSize: "7", fontWeight: "bold", fill: "#1E293B", children: [
                Math.round(rate * 100),
                "%"
              ] })
            ] });
          })() }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
              workOrders.filter((w) => w.status === "completed").length,
              " / ",
              workOrders.length
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "已完成 / 总计" })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 1, display: "block" }, children: "状态分布" }),
        Object.entries(STATUS_LABELS).map(([s, label]) => {
          const count = workOrders.filter((w) => w.status === s).length;
          const maxCount = Math.max(...Object.keys(STATUS_LABELS).map((k) => workOrders.filter((w) => w.status === k).length), 1);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 0.6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { minWidth: 40, fontSize: "0.65rem" }, children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1, height: 10, bgcolor: "#F1F5F9", borderRadius: 5, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
              height: "100%",
              borderRadius: 5,
              width: `${count / maxCount * 100}%`,
              bgcolor: STATUS_COLORS[s],
              transition: "width 0.5s",
              minWidth: count > 0 ? 8 : 0
            } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { minWidth: 16, textAlign: "right", fontSize: "0.65rem", fontWeight: 600 }, children: count })
          ] }, s);
        })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }, children: Object.entries(STATUS_LABELS).map(([s, label]) => {
      const count = workOrders.filter((w) => w.status === s).length;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, minWidth: 80, border: `1px solid ${STATUS_COLORS[s]}20` }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: STATUS_COLORS[s] }, children: count }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: label })
      ] }, s);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Tabs,
        {
          value: tabValue,
          onChange: (_, v) => setTabValue(v),
          sx: { borderBottom: "1px solid rgba(226,232,240,0.8)", px: 2, "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { value: "all", label: "全部" }),
            Object.keys(STATUS_LABELS).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { value: s, label: STATUS_LABELS[s] }, s))
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
          onImport: (rows, headers) => rows.forEach((r) => addWorkOrder(mapImportRow(r))),
          columnConfigKey: "production-workorder-list"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
        "新建生产工单",
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "工单编号", value: orderNo, onChange: (e) => setOrderNo(e.target.value), "data-testid": "wo-no" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "产品名称", value: productName, onChange: (e) => setProductName(e.target.value), "data-testid": "wo-product" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "产品编码", value: productCode, onChange: (e) => setProductCode(e.target.value) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "计划数量", type: "number", value: plannedQuantity, onChange: (e) => setPlannedQuantity(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, label: "优先级", value: priority, onChange: (e) => setPriority(e.target.value), children: Object.entries(PRIORITY_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { select: true, fullWidth: true, label: "状态", value: status, onChange: (e) => setStatus(e.target.value), children: Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "车间", value: workshop, onChange: (e) => setWorkshop(e.target.value) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "主管", value: supervisor, onChange: (e) => setSupervisor(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "计划开始",
              type: "date",
              value: plannedStartDate,
              onChange: (e) => setPlannedStartDate(e.target.value),
              InputLabelProps: { shrink: true }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              fullWidth: true,
              label: "计划结束",
              type: "date",
              value: plannedEndDate,
              onChange: (e) => setPlannedEndDate(e.target.value),
              InputLabelProps: { shrink: true }
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            onClick: handleSave,
            disabled: !productName.trim() || Number(plannedQuantity) <= 0,
            "data-testid": "wo-save",
            children: "保存"
          }
        )
      ] })
    ] })
  ] });
};
export {
  WorkOrderList as default
};
