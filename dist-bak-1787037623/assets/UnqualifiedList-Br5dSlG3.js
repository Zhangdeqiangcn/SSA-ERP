import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { d as useQualityStore } from "./index-CU2cqxc8.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import "./vendor-date-DI3D_gXa.js";
import { m as Box, T as Typography, bL as Stack, bm as Button, bZ as ArrowBack, bh as Add, aS as Paper, aO as Chip, b9 as Dialog, ba as DialogTitle, n as Divider, bc as DialogContent, bY as Grid, bl as Alert, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bE as DialogActions, bO as Warning, co as AutoFixHigh, cJ as Snackbar, ej as MoreHoriz, bi as Edit, a7 as Inventory, ek as MoneyOff, bN as Handshake, X as LocalShipping, p as Tooltip, bW as CheckCircle, aM as IconButton, bS as Visibility } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
const DISPOSAL_CONFIG = {
  return: { label: "退货", color: "#DC2626", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, { fontSize: "small" }), desc: "退还给供应商，发起退货入库/出库流程", nextStep: "→ 供应商退货单" },
  concession: { label: "让步接收", color: "#D97706", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Handshake, { fontSize: "small" }), desc: "质量认可后按原价入库，质量负责人须签字", nextStep: "→ 让步接收入库单" },
  discount: { label: "折价入库", color: "#7C3AED", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MoneyOff, { fontSize: "small" }), desc: "协商降价后入库，自动生成差价通知单", nextStep: "→ 折价入库单 + 差价通知" },
  isolate: { label: "隔离", color: "#0369A1", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory, { fontSize: "small" }), desc: "移入隔离仓位，等待质量委员会决议", nextStep: "→ 隔离库位记录" },
  rework: { label: "返工", color: "#F59E0B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }), desc: "退回供应商或内部返工修复后重新检验", nextStep: "→ 重新报检" },
  scrap: { label: "报废", color: "#EF4444", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { fontSize: "small" }), desc: "无法使用，直接报废处理", nextStep: "→ 报废单" },
  other: { label: "其他", color: "#64748B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MoreHoriz, { fontSize: "small" }), desc: "其他特殊处理方式，需在备注中详细说明", nextStep: "→ 手工跟进" }
};
const OLD_DISPOSITION_LABELS = {
  rework: "返工",
  scrap: "报废",
  conditional_accept: "让步接收",
  return_vendor: "退货供应商"
};
const OLD_DISPOSITION_COLORS = {
  rework: "#F59E0B",
  scrap: "#EF4444",
  conditional_accept: "#6366F1",
  return_vendor: "#64748B"
};
const NCR_STATUS_META = {
  open: { label: "未关闭", color: "#64748B" },
  capa_raised: { label: "已发起CAPA", color: "#3B82F6" },
  closed: { label: "已关闭", color: "#10B981" }
};
const DisposalDialog = ({ open, itemNo, materialName, materialCode, defectQty, onClose, onSubmit }) => {
  const [method, setMethod] = reactExports.useState("return");
  const [approver, setApprover] = reactExports.useState("");
  const [remark, setRemark] = reactExports.useState("");
  const cfg = DISPOSAL_CONFIG[method];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "sm", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { color: "warning" }),
      " 选择处置方案"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, bgcolor: "#FEF2F2", borderRadius: 2, border: "1px solid #FECACA" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "不合格品记录号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, fontFamily: "monospace", children: itemNo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "物料" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: materialCode,
                size: "small",
                sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: materialName })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "不合格数量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, color: "error", children: [
            defectQty,
            " 件"
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mb: 1.5 }, children: "处置方式" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 1, sx: { mb: 2 }, children: Object.entries(DISPOSAL_CONFIG).map(([key, cfg2]) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Paper,
        {
          onClick: () => setMethod(key),
          "data-testid": `disposal-method-${key}`,
          sx: {
            p: 1.5,
            borderRadius: 2,
            cursor: "pointer",
            border: `2px solid ${method === key ? cfg2.color : "transparent"}`,
            bgcolor: method === key ? `${cfg2.color}10` : "#F8FAFC",
            transition: "all 0.15s",
            "&:hover": { bgcolor: `${cfg2.color}08`, borderColor: `${cfg2.color}60` }
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { mb: 0.3 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: cfg2.color }, children: cfg2.icon }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, sx: { color: cfg2.color }, children: cfg2.label })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { lineHeight: 1.3 }, children: cfg2.desc })
          ]
        }
      ) }, key)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
          "后续流转：",
          cfg.nextStep
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: cfg.desc })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "审批人（如需）",
            value: approver,
            onChange: (e) => setApprover(e.target.value)
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "处置说明 / 备注",
            multiline: true,
            rows: 2,
            value: remark,
            onChange: (e) => setRemark(e.target.value)
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
        onClose();
        alert("处置方案已暂存！（演示模式）");
      }, children: "暂存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "contained",
          color: "warning",
          sx: { bgcolor: cfg.color, "&:hover": { bgcolor: cfg.color } },
          "data-testid": "disposal-confirm",
          onClick: () => onSubmit(method, approver),
          children: [
            "确认执行：",
            cfg.label
          ]
        }
      )
    ] })
  ] });
};
const UnqualifiedList = () => {
  const { unqualifiedItems, addUnqualifiedItem, pdcaRecords, addPdcaRecord, updateUnqualifiedItem, disposeUnqualified } = useQualityStore();
  const navigate = useNavigate();
  const [newDialog, setNewDialog] = reactExports.useState(false);
  const [disposalTarget, setDisposalTarget] = reactExports.useState(null);
  const [detailItem, setDetailItem] = reactExports.useState(null);
  const [capaSuccess, setCapaSuccess] = reactExports.useState("");
  const [snackbar, setSnackbar] = reactExports.useState({ open: false, msg: "" });
  const [capaDialogOpen, setCapaDialogOpen] = reactExports.useState(false);
  const [capaTarget, setCapaTarget] = reactExports.useState(null);
  const handleGenerateCapa = (item, templateName) => {
    const newId = `pdca-${Date.now()}`;
    const pdcaNo = `CAPA-${Date.now().toString().slice(-8)}`;
    const title = templateName || `NCR纠正措施 - ${item.itemNo}`;
    addPdcaRecord({
      id: newId,
      pdcaNo,
      title,
      status: "open",
      source: "inspection",
      relatedItemId: item.id,
      priority: "high",
      problemDescription: item.defectDescription || "由不合格品报告(NCR)触发",
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10),
      owner: item.responsiblePerson || "质量工程师",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "admin",
      updatedBy: "admin"
    });
    updateUnqualifiedItem(item.id, { status: "capa_raised" });
    setCapaSuccess(`已为 NCR ${item.itemNo} 生成 CAPA ${pdcaNo}，NCR 状态已更新为「已发起CAPA」。`);
  };
  const [newItem, setNewItem] = reactExports.useState({
    relateNo: "",
    materialCode: "",
    materialName: "",
    batchNo: "",
    defectQty: 0,
    totalQty: 0,
    defectDescription: "",
    disposition: "return_vendor",
    responsible: "",
    dueDate: ""
  });
  const CREATE_DISPOSITIONS = [
    { value: "return_vendor", label: "退货供应商" },
    { value: "conditional_accept", label: "让步接收" },
    { value: "rework", label: "返工" },
    { value: "scrap", label: "报废" }
  ];
  const stats = reactExports.useMemo(() => ({
    pending: unqualifiedItems.filter((i) => i.dispositionStatus === "pending").length,
    in_progress: unqualifiedItems.filter((i) => i.dispositionStatus === "in_progress").length,
    completed: unqualifiedItems.filter((i) => i.dispositionStatus === "completed").length
  }), []);
  const mapImportRow = (r, _headers) => ({
    id: `uq-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemNo: r["记录编号"] || `UQ-IMP-${Date.now()}`,
    inspectionTaskId: "",
    inspectionTaskNo: r["来源报检单"] || `QN-${Date.now()}`,
    materialCode: r["物料编码"] || "",
    materialName: r["物料"] || "",
    batchNo: r["批次"] || "-",
    defectQuantity: Number(r["不合格数量"]) || 0,
    defectDescription: r["缺陷描述"] || "",
    disposition: "return_vendor",
    dispositionStatus: "pending",
    responsiblePerson: r["负责人"] || "",
    dueDate: r["截止日期"] || "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const columns = [
    {
      id: "itemNo",
      header: "记录编号",
      accessorFn: (row) => row.itemNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#EF4444", fontFamily: "monospace" }, children: row.original.itemNo })
    },
    {
      id: "material",
      header: "物料",
      accessorFn: (row) => row.materialName,
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
      id: "batchNo",
      header: "批次",
      accessorFn: (row) => row.batchNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace" }, children: row.original.batchNo })
    },
    {
      id: "defectQuantity",
      header: "不合格数量",
      accessorFn: (row) => row.defectQuantity,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#EF4444", fontWeight: 600 }, children: [
        row.original.defectQuantity,
        " 件"
      ] })
    },
    {
      id: "defectDescription",
      header: "缺陷描述",
      accessorFn: (row) => row.defectDescription,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: row.original.defectDescription, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }, children: row.original.defectDescription }) })
    },
    {
      id: "source",
      header: "来源报检单",
      accessorFn: (row) => row.id,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#6366F1", fontFamily: "monospace" }, children: [
        "QN-",
        row.original.id.padStart(4, "0")
      ] })
    },
    {
      id: "disposition",
      header: "处置方式",
      accessorFn: (row) => row.disposition,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: OLD_DISPOSITION_LABELS[row.original.disposition],
          size: "small",
          sx: {
            bgcolor: `${OLD_DISPOSITION_COLORS[row.original.disposition]}18`,
            color: OLD_DISPOSITION_COLORS[row.original.disposition],
            fontWeight: 600
          }
        }
      )
    },
    {
      id: "dispositionStatus",
      header: "处置状态",
      accessorFn: (row) => row.dispositionStatus,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          icon: row.original.dispositionStatus === "completed" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: "12px !important" } }) : void 0,
          label: row.original.dispositionStatus === "pending" ? "待处理" : row.original.dispositionStatus === "in_progress" ? "处理中" : "已完成",
          size: "small",
          color: row.original.dispositionStatus === "completed" ? "success" : row.original.dispositionStatus === "in_progress" ? "info" : "error",
          sx: { fontWeight: 600 }
        }
      )
    },
    {
      id: "ncrStatus",
      header: "CAPA/闭环状态",
      accessorFn: (row) => row.status || "open",
      cell: ({ row }) => {
        const item = row.original;
        const related = pdcaRecords.filter((r) => r.relatedItemId === item.id);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: NCR_STATUS_META[item.status || "open"].label,
              size: "small",
              sx: {
                bgcolor: NCR_STATUS_META[item.status || "open"].color + "18",
                color: NCR_STATUS_META[item.status || "open"].color,
                fontWeight: 600
              }
            }
          ),
          related.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AutoFixHigh, { sx: { fontSize: 12 } }),
              label: `CAPA: ${related[0].pdcaNo}`,
              size: "small",
              sx: { mt: 0.5, bgcolor: "#EFF6FF", color: "#3B82F6", fontWeight: 500, fontSize: "0.65rem" }
            }
          )
        ] });
      }
    },
    {
      id: "responsiblePerson",
      header: "负责人",
      accessorFn: (row) => row.responsiblePerson,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.responsiblePerson })
    },
    {
      id: "dueDate",
      header: "截止日期",
      accessorFn: (row) => row.dueDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: row.original.dispositionStatus !== "completed" ? "#F59E0B" : "#64748B" }, children: row.original.dueDate })
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, justifyContent: "flex-end", children: [
          item.dispositionStatus === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "outlined",
              color: "warning",
              "data-testid": `ncr-dispose-${item.id}`,
              onClick: () => setDisposalTarget(item),
              children: "处置"
            }
          ),
          item.status !== "capa_raised" && item.status !== "closed" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "outlined",
              color: "primary",
              "data-testid": "ncr-to-capa",
              onClick: () => {
                setCapaTarget(item);
                setCapaDialogOpen(true);
              },
              sx: { borderColor: "#3B82F6", color: "#3B82F6", fontSize: "0.7rem" },
              children: "转为CAPA"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            IconButton,
            {
              size: "small",
              "aria-label": "查看不合格品详情",
              onClick: () => {
                setDetailItem(item);
                setCapaSuccess("");
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" })
            }
          )
        ] });
      }
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "不合格品管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "unqualified", currentStatus: "uq_dispose" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "来源：仓储报检未通过 · 处置方式：退货 / 让步接收 / 折价入库 / 隔离 / 返工 / 报废 / 其他" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
            onClick: () => navigate("/warehouse/inspection-notice"),
            children: "返回报检单"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "error", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setNewDialog(true), children: "新建不合格品记录" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, sx: { mb: 3 }, children: [
      [
        { label: "待处理", count: stats.pending, color: "#EF4444", bg: "#FEF2F2" },
        { label: "处理中", count: stats.in_progress, color: "#F59E0B", bg: "#FFFBEB" },
        { label: "已完成", count: stats.completed, color: "#10B981", bg: "#ECFDF5" }
      ].map(({ label, count, color, bg }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: bg, border: `1px solid ${color}25` }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color }, children: count }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: label })
      ] }, label)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { flex: 2, px: 3, py: 2, borderRadius: 3, bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 1, display: "block" }, children: "处置方式分布" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.8, flexWrap: "wrap", sx: { gap: 0.5 }, children: ["return", "concession", "discount", "isolate", "rework", "scrap"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: DISPOSAL_CONFIG[k].label,
            size: "small",
            sx: { bgcolor: `${DISPOSAL_CONFIG[k].color}15`, color: DISPOSAL_CONFIG[k].color, fontSize: "0.7rem" }
          },
          k
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: unqualifiedItems,
        columns,
        enableRowSelection: false,
        enablePagination: true,
        enableSorting: true,
        enableColumnFilter: true,
        enableBlockSelect: true,
        enableExport: true,
        exportFormat: "xlsx",
        enableImport: true,
        onImport: (rows, headers) => rows.forEach((r) => addUnqualifiedItem(mapImportRow(r))),
        columnConfigKey: "quality-unqualified-list"
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: newDialog, onClose: () => setNewDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建不合格品记录" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 1 }, children: "不合格品通常由报检单流转产生。如需手工录入，请填写以下信息。提交后记录将写入质量台账并持久化。" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "关联报检单号 (QN-)",
            fullWidth: true,
            size: "small",
            value: newItem.relateNo,
            onChange: (e) => setNewItem({ ...newItem, relateNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "物料编码",
            fullWidth: true,
            size: "small",
            value: newItem.materialCode,
            onChange: (e) => setNewItem({ ...newItem, materialCode: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "物料名称",
            fullWidth: true,
            size: "small",
            value: newItem.materialName,
            onChange: (e) => setNewItem({ ...newItem, materialName: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "批次号",
            fullWidth: true,
            size: "small",
            value: newItem.batchNo,
            onChange: (e) => setNewItem({ ...newItem, batchNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "不合格数量",
            type: "number",
            fullWidth: true,
            size: "small",
            value: newItem.defectQty,
            onChange: (e) => setNewItem({ ...newItem, defectQty: Number(e.target.value) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "总数量",
            type: "number",
            fullWidth: true,
            size: "small",
            value: newItem.totalQty,
            onChange: (e) => setNewItem({ ...newItem, totalQty: Number(e.target.value) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "缺陷描述",
            multiline: true,
            rows: 2,
            fullWidth: true,
            size: "small",
            value: newItem.defectDescription,
            onChange: (e) => setNewItem({ ...newItem, defectDescription: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "初步处置方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "初步处置方式",
              value: newItem.disposition,
              onChange: (e) => setNewItem({ ...newItem, disposition: e.target.value }),
              children: CREATE_DISPOSITIONS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: d.value, children: d.label }, d.value))
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "负责人",
            fullWidth: true,
            size: "small",
            value: newItem.responsible,
            onChange: (e) => setNewItem({ ...newItem, responsible: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "截止日期",
            type: "date",
            fullWidth: true,
            size: "small",
            InputLabelProps: { shrink: true },
            value: newItem.dueDate,
            onChange: (e) => setNewItem({ ...newItem, dueDate: e.target.value })
          }
        ) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setNewDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "error", onClick: () => {
          addUnqualifiedItem({
            id: `uq-${Date.now()}`,
            itemNo: `UQ-${Date.now()}`,
            inspectionTaskId: "",
            inspectionTaskNo: newItem.relateNo || `QN-${String(Date.now()).slice(-4)}`,
            materialCode: newItem.materialCode,
            materialName: newItem.materialName,
            batchNo: newItem.batchNo,
            defectQuantity: Number(newItem.defectQty) || 0,
            defectDescription: newItem.defectDescription,
            disposition: newItem.disposition,
            dispositionStatus: "pending",
            responsiblePerson: newItem.responsible,
            dueDate: newItem.dueDate,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          setNewDialog(false);
          setSnackbar({ open: true, msg: "不合格品记录已创建，等待处置" });
        }, children: "提交" })
      ] })
    ] }),
    disposalTarget && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DisposalDialog,
      {
        open: !!disposalTarget,
        itemNo: disposalTarget.itemNo,
        materialName: disposalTarget.materialName,
        materialCode: disposalTarget.materialCode,
        defectQty: disposalTarget.defectQuantity,
        onClose: () => setDisposalTarget(null),
        onSubmit: (method, approver) => {
          var _a;
          if (!disposalTarget) return;
          const ok = disposeUnqualified(disposalTarget.id, {
            disposition: method,
            operator: approver || disposalTarget.responsiblePerson
          });
          setDisposalTarget(null);
          const cfg = DISPOSAL_CONFIG[method];
          if (!ok) {
            setSnackbar({ open: true, msg: `NCR ${disposalTarget.itemNo} 已处置完成，无法重复处置` });
            return;
          }
          if (method === "scrap") {
            setSnackbar({
              open: true,
              msg: `已执行"报废"：${disposalTarget.itemNo} 已联动库存扣减并生成报废凭证（借6602管理费用/贷1403原材料|1405库存商品）`
            });
          } else {
            setSnackbar({ open: true, msg: `已执行"${cfg.label}"处置，NCR ${disposalTarget.itemNo} 状态已闭环（${(_a = cfg.nextStep) == null ? void 0 : _a.replace("→ ", "")}）` });
          }
        }
      }
    ),
    detailItem && (() => {
      const liveItem = unqualifiedItems.find((i) => i.id === detailItem.id) || detailItem;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: !!detailItem, onClose: () => setDetailItem(null), maxWidth: "md", fullWidth: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { color: "error" }),
          " 不合格品详情（NCR）"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, bgcolor: "#FEF2F2", borderRadius: 2, border: "1px solid #FECACA" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, flexWrap: "wrap", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "不合格品记录号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, fontFamily: "monospace", children: liveItem.itemNo })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: liveItem.materialCode,
                      size: "small",
                      sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem" }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: liveItem.materialName })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "不合格数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, color: "error", children: [
                  liveItem.defectQuantity,
                  " 件"
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "闭环状态" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: NCR_STATUS_META[liveItem.status || "open"].label,
                    size: "small",
                    sx: { bgcolor: NCR_STATUS_META[liveItem.status || "open"].color + "18", color: NCR_STATUS_META[liveItem.status || "open"].color, fontWeight: 600 }
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { mt: 1, color: "#92400E" }, children: [
              "缺陷描述：",
              liveItem.defectDescription
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mb: 1.5 }, children: "关联的 CAPA / PDCA 纠正措施" }),
          pdcaRecords.filter((r) => r.relatedItemId === detailItem.id).length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "该 NCR 尚未关联 CAPA，点击下方按钮生成纠正措施。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, sx: { mb: 2 }, children: pdcaRecords.filter((r) => r.relatedItemId === detailItem.id).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 1.5, borderRadius: 2, borderColor: "#93C5FD" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: r.pdcaNo, size: "small", sx: { bgcolor: "#3B82F6", color: "#fff", fontFamily: "monospace" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: r.title })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "状态：",
              r.status.toUpperCase(),
              " · 负责人：",
              r.owner,
              " · 目标：",
              r.targetDate
            ] })
          ] }, r.id)) }),
          capaSuccess && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mb: 2 }, onClose: () => setCapaSuccess(""), children: capaSuccess })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { p: 2, gap: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDetailItem(null), startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), children: "关闭" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "contained",
              color: "primary",
              "data-testid": "ncr-to-capa",
              sx: { bgcolor: "#3B82F6" },
              onClick: () => handleGenerateCapa(detailItem),
              children: "生成 CAPA"
            }
          )
        ] })
      ] });
    })(),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: capaDialogOpen, onClose: () => setCapaDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AutoFixHigh, { color: "primary" }),
        " 转为 CAPA 纠正措施"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
        capaTarget && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2, bgcolor: "#FEF2F2", borderRadius: 2, border: "1px solid #FECACA" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1, color: "#EF4444" }, children: [
            "不合格品: ",
            capaTarget.itemNo
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            capaTarget.materialName,
            " (",
            capaTarget.materialCode,
            ") · 缺陷: ",
            capaTarget.defectDescription
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { mb: 1.5 }, children: "选择 CAPA 模板" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, children: [
          { key: "8d", label: "8D 问题解决法", desc: "完整 8D 流程：D1-D8 各阶段记录" },
          { key: "5why", label: "5 Why 分析", desc: "根本原因五问法" },
          { key: "standard", label: "标准纠正措施", desc: "描述问题 → 纠正 → 预防 → 验证" },
          { key: "quick", label: "快速整改", desc: "直接进入纠正措施并验证" }
        ].map((tmpl) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Paper,
          {
            "data-testid": `capa-template-${tmpl.key}`,
            onClick: () => {
              if (capaTarget) {
                handleGenerateCapa(capaTarget, tmpl.label);
                setCapaDialogOpen(false);
                setSnackbar({ open: true, msg: `已按「${tmpl.label}」模板创建 CAPA` });
              }
            },
            sx: {
              p: 1.5,
              borderRadius: 2,
              cursor: "pointer",
              bgcolor: "#F8FAFC",
              border: "1px solid #E2E8F0",
              "&:hover": { bgcolor: "#EFF6FF", borderColor: "#93C5FD" }
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 700, sx: { color: "#1E293B" }, children: tmpl.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: tmpl.desc })
            ]
          },
          tmpl.key
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { sx: { p: 2, gap: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setCapaDialogOpen(false), children: "取消" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar.open,
        autoHideDuration: 3500,
        onClose: () => setSnackbar((s) => ({ ...s, open: false })),
        anchorOrigin: { vertical: "top", horizontal: "center" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", onClose: () => setSnackbar((s) => ({ ...s, open: false })), children: snackbar.msg })
      }
    )
  ] });
};
export {
  UnqualifiedList as default
};
