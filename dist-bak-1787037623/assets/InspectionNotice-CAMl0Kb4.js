import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as useFlowStore, g as useOrgStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { F as FilterBar } from "./FilterBar-BdGe90kr.js";
import { A as ActionBar } from "./ActionBar-AjDxCZvD.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg } from "./warehouseMasterStore-BjZtdDuE.js";
import { T as Typography, aO as Chip, bL as Stack, bm as Button, bW as CheckCircle, a7 as Inventory, cT as Cancel, aS as Paper, bh as Add, V as Assignment, cJ as Snackbar, bl as Alert, d1 as Info, a2 as VerifiedUser, b$ as ArrowForward, bO as Warning, m as Box, b9 as Dialog, ba as DialogTitle, n as Divider, bc as DialogContent, bY as Grid, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bv as TextField, bE as DialogActions, dD as RadioGroup, cM as FormControlLabel, dE as Radio } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
import "./vendor-forms-B1OIhDzB.js";
const statusMap = {
  pending: { label: "待报检", color: "default" },
  inspecting: { label: "检验中", color: "info" },
  passed: { label: "检验合格", color: "success" },
  failed: { label: "检验不合格", color: "error" },
  partial: { label: "部分合格", color: "warning" }
};
const sourceTypeMap = {
  purchase: "采购入库",
  production: "生产成品",
  return: "客户退货"
};
const FlowGuide = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { mb: 3, p: 2.5, borderRadius: 3, border: "1px solid #EFF6FF", bgcolor: "#F8FBFF" }, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", sx: { fontWeight: 700, color: "#1D4ED8", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { fontSize: "small" }),
    " 仓储报检流程说明"
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, alignItems: "center", flexWrap: "wrap", sx: { gap: 1 }, children: [
    { step: "1", label: "仓库新建报检单", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, { sx: { fontSize: 16 } }), color: "#6366F1" },
    { step: "→", label: "", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForward, { sx: { fontSize: 14, color: "#94A3B8" } }), color: "transparent" },
    { step: "2", label: "质量创建检验任务", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { sx: { fontSize: 16 } }), color: "#F59E0B" },
    { step: "→", label: "", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForward, { sx: { fontSize: 14, color: "#94A3B8" } }), color: "transparent" },
    { step: "3a", label: "合格 → 仓库确认入库", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 16 } }), color: "#10B981" },
    { step: "/", label: "", icon: null, color: "transparent" },
    { step: "3b", label: "不合格 → 质量处理（退货/让步/折价/隔离）", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { fontSize: 16 } }), color: "#EF4444" }
  ].map(
    (item, idx) => item.label ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      Chip,
      {
        icon: item.icon || void 0,
        label: `${item.step}. ${item.label}`,
        size: "small",
        sx: {
          bgcolor: `${item.color}18`,
          color: item.color,
          border: `1px solid ${item.color}30`,
          fontWeight: 600,
          "& .MuiChip-icon": { color: item.color }
        }
      },
      idx
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "center" }, children: item.icon }, idx)
  ) })
] });
const NewNoticeDialog = ({ open, onClose, onSubmit }) => {
  var _a;
  const [form, setForm] = reactExports.useState({
    sourceType: "purchase",
    sourceNo: "",
    materialCode: "",
    materialName: "",
    specification: "",
    unit: "件",
    noticeQty: "",
    batchNo: "",
    warehouseName: "",
    warehouseId: "",
    reportedBy: "",
    remarks: ""
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const warehouses = useWarehouseMasterStore((s) => s.warehouses);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, { color: "primary" }),
      " 新建报检单"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "仓库报检后，将自动通知质量部门创建检验任务。检验结果将决定后续流转方向。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "来源类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: form.sourceType,
              label: "来源类型",
              onChange: (e) => setForm((f) => ({ ...f, sourceType: e.target.value })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "purchase", children: "采购入库" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "production", children: "生产成品" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "return", children: "客户退货" })
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "来源单号（采购订单/工单号）",
            value: form.sourceNo,
            onChange: set("sourceNo")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "物料编码 *",
            value: form.materialCode,
            onChange: set("materialCode"),
            helperText: "统一物料编码，用于关联采购/生产/质量"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "物料名称 *",
            value: form.materialName,
            onChange: set("materialName")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "规格型号",
            value: form.specification,
            onChange: set("specification")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "报检数量 *",
            type: "number",
            value: form.noticeQty,
            onChange: set("noticeQty")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "单位" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: form.unit,
              label: "单位",
              onChange: (e) => setForm((f) => ({ ...f, unit: e.target.value })),
              children: ["件", "kg", "吨", "米", "卷", "批", "箱"].map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: u, children: u }, u))
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "批次号",
            value: form.batchNo,
            onChange: set("batchNo")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "存放仓库" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "存放仓库",
              value: form.warehouseId || ((_a = visibleWarehouses[0]) == null ? void 0 : _a.id) || "",
              onChange: (e) => {
                const w = visibleWarehouses.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, warehouseId: e.target.value, warehouseName: (w == null ? void 0 : w.name) || "" }));
              },
              children: visibleWarehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "报检人",
            value: form.reportedBy,
            onChange: set("reportedBy")
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "备注",
            multiline: true,
            rows: 2,
            value: form.remarks,
            onChange: set("remarks")
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
        onClose();
        alert("报检单已暂存！（演示模式）");
      }, children: "暂存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, {}), onClick: onSubmit, children: "提交报检" })
    ] })
  ] });
};
const InspectionResultDialog = ({ open, notice, onClose, onConfirmInbound, onDispose }) => {
  const [result, setResult] = reactExports.useState("passed");
  const [disposal, setDisposal] = reactExports.useState("return");
  const [remark, setRemark] = reactExports.useState("");
  if (!notice) return null;
  const isPassed = result === "passed";
  const isFailed = result === "failed";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "sm", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "处理报检结果" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, bgcolor: "#F8FAFC", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", sx: { gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "报检单号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, fontFamily: "monospace", children: notice.noticeNo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: notice.materialCode,
                size: "small",
                sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: notice.materialName })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "数量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
            notice.noticeQty,
            " ",
            notice.unit
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mb: 1 }, children: "质检结论" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(RadioGroup, { row: true, value: result, onChange: (e) => setResult(e.target.value), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "passed", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { color: "success" }), label: "合格" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "partial", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { color: "warning" }), label: "部分合格" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { value: "failed", control: /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { color: "error" }), label: "不合格" })
      ] }),
      isPassed && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mt: 2 }, children: '检验合格，点击"确认入库"将生成入库单，由仓库完成收货上架。' }),
      (isFailed || result === "partial") && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mb: 1 }, children: [
          "处置方式 ",
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "span", variant: "caption", color: "error", children: "（不合格处理）" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择处置方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: disposal,
              label: "选择处置方式",
              onChange: (e) => setDisposal(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "return", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "退货", size: "small", sx: { bgcolor: "#FEE2E2", color: "#DC2626" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "退还给供应商，发起退货流程" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "concession", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "让步接收", size: "small", sx: { bgcolor: "#FEF3C7", color: "#D97706" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "质量认可后仍按原价入库使用" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "discount", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "折价入库", size: "small", sx: { bgcolor: "#F3E8FF", color: "#7C3AED" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "协商降价后入库，保留索赔权" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "isolate", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "隔离", size: "small", sx: { bgcolor: "#E0F2FE", color: "#0369A1" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "放入隔离区，等待进一步处理决策" })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "other", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "其他", size: "small", sx: { bgcolor: "#F1F5F9", color: "#475569" } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "其他处理方式，备注说明" })
                ] }) })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", children: [
          disposal === "return" && "将向供应商发起退货申请，并关联到对应采购订单。",
          disposal === "concession" && "需质量负责人签字确认后，生成让步接收入库单。",
          disposal === "discount" && "需采购与财务协同，确认折价金额后入库并自动生成差价通知单。",
          disposal === "isolate" && "物料将移入隔离仓位，等待质量委员会决议，期间不可使用。",
          disposal === "other" && "请在备注中详细说明处理方式，质量主管审核后执行。"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          fullWidth: true,
          size: "small",
          label: "备注说明",
          multiline: true,
          rows: 2,
          value: remark,
          onChange: (e) => setRemark(e.target.value),
          sx: { mt: 2 }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
        onClose();
        alert("处置结果已暂存！（演示模式）");
      }, children: "暂存" }),
      isPassed ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          color: "success",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory, {}),
          onClick: onConfirmInbound,
          children: "确认入库（生成入库单）"
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          color: "warning",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}),
          onClick: () => onDispose(disposal),
          children: "提交处置方案"
        }
      )
    ] })
  ] });
};
const InspectionNoticeWarehouse = () => {
  const { inspectionNotices } = useFlowStore();
  const navigate = useNavigate();
  const [filterData, setFilterData] = reactExports.useState({});
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const [resultDialog, setResultDialog] = reactExports.useState(null);
  const [snackbar, setSnackbar] = reactExports.useState({
    open: false,
    msg: "",
    severity: "success"
  });
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "noticeNo",
      header: "报检单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Typography,
        {
          variant: "body2",
          sx: { color: "#6366F1", fontWeight: 600, fontFamily: "monospace", cursor: "pointer" },
          onClick: () => navigate(`/warehouse/inspection-notice/${row.original.id}`),
          children: row.original.noticeNo
        }
      )
    },
    {
      accessorKey: "sourceType",
      header: "来源",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: sourceTypeMap[row.original.sourceType],
          size: "small",
          sx: { bgcolor: "#F1F5F9", color: "#475569", fontSize: "0.75rem" }
        }
      )
    },
    { accessorKey: "sourceNo", header: "来源单号" },
    {
      accessorKey: "materialCode",
      header: "物料",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: row.original.materialCode,
            size: "small",
            sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.materialName })
      ] })
    },
    {
      accessorKey: "noticeQty",
      header: "报检数量",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
        row.original.noticeQty,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "span", variant: "caption", color: "text.secondary", children: row.original.unit })
      ] })
    },
    { accessorKey: "batchNo", header: "批次号" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: s == null ? void 0 : s.color, sx: { fontWeight: 600, fontSize: "0.75rem" } });
      }
    },
    {
      accessorKey: "warehouseName",
      header: "仓库",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: row.original.warehouseName })
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === "inspecting") {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "outlined",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
              onClick: () => setResultDialog(row.original),
              children: "处理结果"
            }
          );
        }
        if (status === "passed") {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "contained",
              color: "success",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory, {}),
              onClick: () => navigate("/warehouse/inbound"),
              children: "查看入库单"
            }
          );
        }
        if (status === "failed") {
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "outlined",
              color: "error",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}),
              onClick: () => navigate("/quality/unqualified"),
              children: "查看不合格品"
            }
          );
        }
        return null;
      }
    }
  ], [navigate]);
  const filterFields = [
    { name: "noticeNo", label: "报检单号", type: "text" },
    {
      name: "sourceType",
      label: "来源类型",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "purchase", label: "采购入库" },
        { value: "production", label: "生产成品" },
        { value: "return", label: "客户退货" }
      ]
    },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        ...Object.entries(statusMap).map(([v, { label }]) => ({ value: v, label }))
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...inspectionNotices];
    if (filterData.noticeNo) data = data.filter((d) => d.noticeNo.includes(filterData.noticeNo));
    if (filterData.sourceType) data = data.filter((d) => d.sourceType === filterData.sourceType);
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData]);
  const stats = reactExports.useMemo(() => ({
    pending: inspectionNotices.filter((n) => n.status === "pending").length,
    inspecting: inspectionNotices.filter((n) => n.status === "inspecting").length,
    passed: inspectionNotices.filter((n) => n.status === "passed").length,
    failed: inspectionNotices.filter((n) => n.status === "failed").length
  }), []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "报检单管理", actions: /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "inspection-notice", currentStatus: "in_accepted" }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(FlowGuide, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 2, sx: { mb: 3 }, children: [
      { label: "待报检", count: stats.pending, color: "#94A3B8", bg: "#F8FAFC" },
      { label: "检验中", count: stats.inspecting, color: "#3B82F6", bg: "#EFF6FF" },
      { label: "已合格", count: stats.passed, color: "#10B981", bg: "#ECFDF5" },
      { label: "不合格", count: stats.failed, color: "#EF4444", bg: "#FEF2F2" }
    ].map(({ label, count, color, bg }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: bg, border: `1px solid ${color}25` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color }, children: count }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: label })
    ] }, label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(ActionBar, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setNewOpen(true), children: "新建报检单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, {}),
          onClick: () => navigate("/quality/inspection"),
          children: "查看质量检验任务"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onFilter: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filteredData,
        columns,
        onView: (row) => navigate(`/warehouse/inspection-notice/${row.id}`)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NewNoticeDialog,
      {
        open: newOpen,
        onClose: () => setNewOpen(false),
        onSubmit: () => {
          setNewOpen(false);
          setSnackbar({ open: true, msg: "报检单已提交，已通知质量部门创建检验任务", severity: "success" });
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      InspectionResultDialog,
      {
        open: !!resultDialog,
        notice: resultDialog,
        onClose: () => setResultDialog(null),
        onConfirmInbound: () => {
          setResultDialog(null);
          setSnackbar({ open: true, msg: '检验合格！入库单已生成，请前往"采购入库"确认收货', severity: "success" });
        },
        onDispose: (method) => {
          setResultDialog(null);
          const msgs = {
            return: "已发起退货申请，供应商将收到退货通知",
            concession: "让步接收申请已提交，等待质量负责人审批",
            discount: "折价入库申请已提交，采购与财务将跟进差价协商",
            isolate: "物料已移入隔离仓位，等待质量委员会决议",
            other: "处置方案已提交，等待质量主管审核"
          };
          setSnackbar({ open: true, msg: msgs[method] || "处置方案已提交", severity: "warning" });
          if (method === "return" || method === "isolate") {
            setTimeout(() => navigate("/quality/unqualified"), 1500);
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 4e3,
        onClose: () => setSnackbar((s) => ({ ...s, open: false })),
        anchorOrigin: { vertical: "top", horizontal: "center" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: snackbar.severity, onClose: () => setSnackbar((s) => ({ ...s, open: false })), children: snackbar.msg })
      }
    )
  ] });
};
export {
  InspectionNoticeWarehouse as default
};
