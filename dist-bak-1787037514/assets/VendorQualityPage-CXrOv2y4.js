import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { F as FilterBar } from "./FilterBar-CgndUKQE.js";
import { m as useFlowStore, d as useQualityStore } from "./index-hTLNcGoC.js";
import { a as formatDate } from "./format-BXPn3erM.js";
import { g as getVendorPortalIdentity } from "./vendorPortalIdentity-CZOZ1DxO.js";
import { m as Box, T as Typography, aO as Chip, aS as Paper, c2 as Tabs, c3 as Tab, bO as Warning, V as Assignment, bL as Stack, ch as LinearProgress, bm as Button, bh as Add, b9 as Dialog, ba as DialogTitle, n as Divider, bc as DialogContent, bY as Grid, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bE as DialogActions, bw as Send, cJ as Snackbar, bl as Alert, bB as Stepper, bC as Step, bD as StepLabel, cQ as StepContent } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
import "./vendor-forms-CgMxq7_e.js";
import "./vendor-date-DpsB6iVy.js";
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const dateCode = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};
const rand3 = () => String(Math.floor(Math.random() * 900) + 100);
const identity = getVendorPortalIdentity();
const DEFAULT_VENDOR_ID = (identity == null ? void 0 : identity.vendorId) || "ven-001";
const DEFAULT_VENDOR_NAME = (identity == null ? void 0 : identity.vendorName) || "上海宝钢钢铁贸易有限公司";
const issueStatusMap = {
  open: { label: "待处理", color: "error" },
  responded: { label: "已响应", color: "info" },
  improving: { label: "改善中", color: "warning" },
  closed: { label: "已关闭", color: "success" },
  escalated: { label: "已升级", color: "error" }
};
const severityMap = {
  critical: { label: "严重", color: "#EF4444" },
  major: { label: "重要", color: "#F59E0B" },
  minor: { label: "轻微", color: "#6B7280" }
};
const reportStatusMap = {
  draft: { label: "草稿", color: "default" },
  submitted: { label: "已提交", color: "info" },
  reviewing: { label: "审核中", color: "warning" },
  accepted: { label: "已接受", color: "success" },
  rejected: { label: "已退回", color: "error" },
  closed: { label: "已关闭", color: "success" }
};
function QualityIssuePanel() {
  const { vendorQualityIssues, addVendorQualityIssue } = useFlowStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const [snackbarMsg, setSnackbarMsg] = reactExports.useState("");
  const [form, setForm] = reactExports.useState({
    vendorId: DEFAULT_VENDOR_ID,
    vendorName: DEFAULT_VENDOR_NAME,
    materialCode: "",
    materialName: "",
    batchNo: "",
    issueType: "dimension",
    severity: "major",
    description: "",
    defectQty: "",
    totalQty: ""
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const handleIssueSave = (status) => {
    const defectQty = Number(form.defectQty) || 0;
    const totalQty = Number(form.totalQty) || 0;
    const issue = {
      id: `vqi-${Date.now()}`,
      issueNo: `VQI${dateCode()}${rand3()}`,
      vendorId: form.vendorId || DEFAULT_VENDOR_ID,
      vendorName: form.vendorName || DEFAULT_VENDOR_NAME,
      materialCode: form.materialCode,
      materialName: form.materialName,
      batchNo: form.batchNo,
      issueType: form.issueType,
      severity: form.severity,
      description: form.description,
      defectQty,
      totalQty,
      defectRate: totalQty > 0 ? Number((defectQty / totalQty * 100).toFixed(1)) : 0,
      status,
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: form.vendorId || DEFAULT_VENDOR_ID,
      updatedBy: form.vendorId || DEFAULT_VENDOR_ID
    };
    addVendorQualityIssue(issue);
    useQualityStore.getState().addVendorQualityIssue(issue);
  };
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "issueNo",
      header: "问题单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#EF4444", fontWeight: 600, fontFamily: "monospace" }, children: row.original.issueNo })
    },
    { accessorKey: "vendorName", header: "供应商" },
    {
      accessorKey: "materialCode",
      header: "物料",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: row.original.materialCode,
            size: "small",
            sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem", width: "fit-content" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.materialName })
      ] })
    },
    {
      accessorKey: "severity",
      header: "严重程度",
      cell: ({ row }) => {
        const s = severityMap[row.original.severity];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", sx: { bgcolor: `${s == null ? void 0 : s.color}20`, color: s == null ? void 0 : s.color, fontWeight: 600 } });
      }
    },
    {
      accessorKey: "defectRate",
      header: "不良率",
      cell: ({ row }) => {
        const rate = row.original.defectRate;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.5, sx: { minWidth: 80 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, sx: { color: rate > 5 ? "#EF4444" : "#F59E0B" }, children: [
            rate.toFixed(1),
            "%"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: Math.min(rate, 100),
              sx: {
                height: 4,
                borderRadius: 2,
                bgcolor: "#E2E8F0",
                "& .MuiLinearProgress-bar": { bgcolor: rate > 5 ? "#EF4444" : "#F59E0B" }
              }
            }
          )
        ] });
      }
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = issueStatusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default", sx: { fontWeight: 600 } });
      }
    },
    { accessorKey: "createdAt", header: "发现时间", cell: ({ row }) => formatDate(row.original.createdAt) }
  ], []);
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendorQualityIssues];
    if (filterData.issueNo) data = data.filter((d) => d.issueNo.includes(filterData.issueNo));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData]);
  const filterFields = [
    { name: "issueNo", label: "问题单号", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [{ value: "", label: "全部" }, ...Object.entries(issueStatusMap).map(([v, { label }]) => ({ value: v, label }))]
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, children: "供应商质量问题单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "error", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setNewOpen(true), children: "新建问题单" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onFilter: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { data: filteredData, columns, enableRowSelection: true, enablePagination: true, enableExport: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: newOpen, onClose: () => setNewOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建供应商质量问题单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "供应商编码 *", value: form.vendorId, onChange: set("vendorId") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "供应商名称 *", value: form.vendorName, onChange: set("vendorName") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物料编码 *", value: form.materialCode, onChange: set("materialCode") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物料名称 *", value: form.materialName, onChange: set("materialName") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "批次号", value: form.batchNo, onChange: set("batchNo") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "问题类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.issueType, label: "问题类型", onChange: (e) => setForm((f) => ({ ...f, issueType: e.target.value })), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "dimension", children: "尺寸偏差" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "appearance", children: "外观缺陷" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "performance", children: "性能不达标" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "documentation", children: "文件缺失" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "other", children: "其他" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "严重程度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.severity, label: "严重程度", onChange: (e) => setForm((f) => ({ ...f, severity: e.target.value })), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "critical", children: "严重" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "major", children: "重要" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "minor", children: "轻微" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "不合格数量", type: "number", value: form.defectQty, onChange: set("defectQty") }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "问题描述 *", multiline: true, rows: 3, value: form.description, onChange: set("description") }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setNewOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
          handleIssueSave("open");
          setNewOpen(false);
          setSnackbarMsg("质量问题单已暂存");
        }, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            color: "error",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}),
            onClick: () => {
              handleIssueSave("open");
              setNewOpen(false);
              setSnackbarMsg("质量问题单已提交，等待甲方响应");
            },
            "data-testid": "vendor-quality-issue-submit",
            children: "提交问题单"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: Boolean(snackbarMsg),
        autoHideDuration: 3e3,
        onClose: () => setSnackbarMsg(""),
        message: snackbarMsg
      }
    )
  ] });
}
const D_STEPS = [
  { key: "d1_team", label: "D1 成立小组", help: "列出参与解决问题的团队成员及职责" },
  { key: "d2_description", label: "D2 问题描述", help: "用 5W2H 详细描述问题现象、范围、影响" },
  { key: "d3_containment", label: "D3 临时遏制", help: "描述已采取的临时措施，防止问题继续影响客户" },
  { key: "d4_rootcause", label: "D4 根本原因", help: "通过鱼骨图/5Why分析找出真正的根本原因" },
  { key: "d5_solution", label: "D5 纠正措施", help: "针对根本原因制定的永久性纠正措施" },
  { key: "d6_implementation", label: "D6 实施计划", help: "谁来执行、何时完成、如何验证" },
  { key: "d7_verification", label: "D7 效果验证", help: "纠正措施实施后的效果数据对比" },
  { key: "d8_prevention", label: "D8 防止再发", help: "系统性预防措施、经验教训总结" }
];
function Report8DPanel() {
  const { vendorImprovementReports, addVendorImprovementReport, vendorQualityIssues } = useFlowStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const [activeStep, setActiveStep] = reactExports.useState(0);
  const [snackbarMsg, setSnackbarMsg] = reactExports.useState("");
  const [issueId, setIssueId] = reactExports.useState("");
  const myIssues = vendorQualityIssues.filter((i) => i.vendorId === DEFAULT_VENDOR_ID);
  const [form, setForm] = reactExports.useState({
    d1_team: "",
    d2_description: "",
    d3_containment: "",
    d4_rootcause: "",
    d5_solution: "",
    d6_implementation: "",
    d7_verification: "",
    d8_prevention: ""
  });
  const handleSubmitReport = () => {
    const selectedIssue = vendorQualityIssues.find((i) => i.id === issueId);
    const report = {
      id: `vir-${Date.now()}`,
      reportNo: `VIR-8D-${dateCode()}${rand3()}`,
      issueId: issueId || "",
      vendorId: (selectedIssue == null ? void 0 : selectedIssue.vendorId) || DEFAULT_VENDOR_ID,
      vendorName: (selectedIssue == null ? void 0 : selectedIssue.vendorName) || DEFAULT_VENDOR_NAME,
      d1_team: form.d1_team,
      d2_description: form.d2_description,
      d3_containment: form.d3_containment,
      d4_rootcause: form.d4_rootcause,
      d5_solution: form.d5_solution,
      d6_implementation: form.d6_implementation,
      d7_verification: form.d7_verification,
      d8_prevention: form.d8_prevention,
      status: "submitted",
      submittedAt: nowStr(),
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: (selectedIssue == null ? void 0 : selectedIssue.vendorId) || DEFAULT_VENDOR_ID,
      updatedBy: (selectedIssue == null ? void 0 : selectedIssue.vendorId) || DEFAULT_VENDOR_ID
    };
    addVendorImprovementReport(report);
    setNewOpen(false);
    setActiveStep(0);
    setIssueId("");
    setSnackbarMsg("8D改善报告已提交，等待品质部审核");
  };
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "reportNo",
      header: "报告编号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#6366F1", fontWeight: 600, fontFamily: "monospace" }, children: row.original.reportNo })
    },
    { accessorKey: "vendorName", header: "供应商" },
    {
      accessorKey: "d2_description",
      header: "问题描述",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: row.original.d2_description })
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = reportStatusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default", sx: { fontWeight: 600 } });
      }
    },
    {
      accessorKey: "submittedAt",
      header: "提交时间",
      cell: ({ row }) => row.original.submittedAt ? formatDate(row.original.submittedAt) : "-"
    },
    { accessorKey: "createdAt", header: "创建时间", cell: ({ row }) => formatDate(row.original.createdAt) }
  ], []);
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendorImprovementReports];
    if (filterData.reportNo) data = data.filter((d) => d.reportNo.includes(filterData.reportNo));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, children: "8D 改善报告" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "供应商针对质量问题提交的8D改善报告" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "warning", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setNewOpen(true), children: "新建8D报告" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: [
      { name: "reportNo", label: "报告编号", type: "text" },
      {
        name: "status",
        label: "状态",
        type: "select",
        options: [{ value: "", label: "全部" }, ...Object.entries(reportStatusMap).map(([v, { label }]) => ({ value: v, label }))]
      }
    ], onFilter: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DataTable, { data: filteredData, columns, enableRowSelection: true, enablePagination: true, enableExport: true }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: newOpen, onClose: () => setNewOpen(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { color: "warning" }),
        " 新建 8D 改善报告"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "8D 报告（Eight Disciplines）是处理质量问题的标准方法，请按步骤如实填写。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "关联质量问题单 *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: issueId,
              label: "关联质量问题单 *",
              onChange: (e) => setIssueId(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "不关联（独立改善）" }) }),
                myIssues.map((i) => {
                  var _a;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: i.id, children: [
                    i.issueNo,
                    " · ",
                    i.materialName,
                    "（",
                    (_a = issueStatusMap[i.status]) == null ? void 0 : _a.label,
                    "）"
                  ] }, i.id);
                })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep, orientation: "vertical", children: D_STEPS.map((s, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Step, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabel, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: s.label }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(StepContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 1, display: "block" }, children: s.help }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                multiline: true,
                rows: 3,
                size: "small",
                placeholder: `请填写 ${s.label}...`,
                value: form[s.key],
                onChange: (e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, sx: { mt: 1.5 }, children: [
              idx > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => setActiveStep(idx - 1), children: "上一步" }),
              idx < D_STEPS.length - 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", onClick: () => setActiveStep(idx + 1), children: "下一步" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "small",
                  variant: "contained",
                  color: "warning",
                  startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}),
                  onClick: handleSubmitReport,
                  children: "提交报告"
                }
              )
            ] })
          ] })
        ] }, s.key)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => {
        setNewOpen(false);
        setActiveStep(0);
        setIssueId("");
      }, children: "取消" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: Boolean(snackbarMsg),
        autoHideDuration: 3e3,
        onClose: () => setSnackbarMsg(""),
        message: snackbarMsg
      }
    )
  ] });
}
const VendorQualityPage = () => {
  const [tab, setTab] = reactExports.useState(0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1.5, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: "#1E293B" }, children: "质量管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "primary", variant: "outlined", "data-testid": "portal-current-vendor", label: (identity == null ? void 0 : identity.vendorName) || DEFAULT_VENDOR_NAME })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { px: 2, borderBottom: "1px solid #E2E8F0" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "质量问题单", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { fontSize: "small" }), iconPosition: "start" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "8D 改善报告", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }), iconPosition: "start" })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
      tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(QualityIssuePanel, {}),
      tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Report8DPanel, {})
    ] })
  ] });
};
export {
  VendorQualityPage as default
};
