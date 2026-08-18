import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, bf as Add, c2 as Tabs, c3 as Tab, aP as Paper, aL as Chip, eI as LinkIcon, cl as LinearProgress, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bC as DialogActions, cU as Snackbar, aJ as IconButton, bg as Edit } from "./vendor-DGU5TO-x.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { d as useQualityStore } from "./index-DeeqqmHA.js";
import "./StatusBadge-DeJuhK-R.js";
const PDCA_STEPS = ["plan", "do", "check", "act", "closed"];
const CAPA_STEPS = ["open", "in_progress", "verified", "closed"];
const PDCA_STEP_LABELS = {
  plan: "P - 计划",
  do: "D - 执行",
  check: "C - 检查",
  act: "A - 改进",
  closed: "已关闭",
  open: "待处理",
  in_progress: "进行中",
  verified: "已验证"
};
const PDCA_COLORS = {
  plan: "#3B82F6",
  do: "#F59E0B",
  check: "#6366F1",
  act: "#10B981",
  closed: "#94A3B8",
  open: "#EF4444",
  in_progress: "#3B82F6",
  verified: "#10B981"
};
const PRIORITY_COLORS = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981"
};
const PRIORITY_LABELS = { high: "高", medium: "中", low: "低" };
const SOURCE_LABELS = {
  inspection: "检验发现",
  customer_complaint: "客户投诉",
  internal_audit: "内部审核",
  other: "其他"
};
const TAB_VALUE = { all: "all", open: "open", in_progress: "in_progress", completed: "completed" };
const PDCAList = () => {
  const { pdcaRecords, unqualifiedItems, addPdcaRecord, updatePdcaRecord, updateUnqualifiedItem } = useQualityStore();
  const [tab, setTab] = reactExports.useState(TAB_VALUE.all);
  const [dialog, setDialog] = reactExports.useState(false);
  const [editDialog, setEditDialog] = reactExports.useState(false);
  const [editingRecord, setEditingRecord] = reactExports.useState(null);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [snackbarMsg, setSnackbarMsg] = reactExports.useState("");
  const [expandedId, setExpandedId] = reactExports.useState(null);
  const [formData, setFormData] = reactExports.useState({
    title: "",
    source: "inspection",
    priority: "high",
    problemDescription: "",
    targetDate: "",
    owner: "",
    linkedNcrId: ""
  });
  const [editForm, setEditForm] = reactExports.useState({
    correctiveAction: "",
    preventiveAction: "",
    verificationResult: ""
  });
  const filteredRecords = reactExports.useMemo(() => {
    if (tab === TAB_VALUE.all) return pdcaRecords;
    if (tab === TAB_VALUE.open) return pdcaRecords.filter((r) => r.status === "open" || r.status === "plan");
    if (tab === TAB_VALUE.in_progress) return pdcaRecords.filter((r) => r.status === "in_progress" || r.status === "do" || r.status === "check" || r.status === "act");
    if (tab === TAB_VALUE.completed) return pdcaRecords.filter((r) => r.status === "closed" || r.status === "verified");
    return pdcaRecords;
  }, [pdcaRecords, tab]);
  const isCapaRecord = (r) => r.status === "open" || r.status === "in_progress" || r.status === "verified";
  const getProgress = (record) => {
    const steps = isCapaRecord(record) ? CAPA_STEPS : PDCA_STEPS;
    const idx = steps.indexOf(record.status);
    return record.status === "closed" ? 100 : Math.round(idx / (steps.length - 1) * 100);
  };
  const linkableNcrs = reactExports.useMemo(
    () => unqualifiedItems.filter((u) => u.status !== "closed"),
    [unqualifiedItems]
  );
  const handleCreate = () => {
    const now = Date.now();
    const pdcaNo = `PDCA-${now.toString().slice(-8)}`;
    const linkedNcr = linkableNcrs.find((n) => n.id === formData.linkedNcrId);
    const newRecord = {
      id: `pdca-${now}`,
      pdcaNo,
      title: formData.title || (linkedNcr ? `CAPA - ${linkedNcr.itemNo}` : ""),
      status: "open",
      source: formData.source,
      relatedItemId: formData.linkedNcrId || void 0,
      priority: formData.priority,
      problemDescription: formData.problemDescription || (linkedNcr ? linkedNcr.defectDescription : ""),
      targetDate: formData.targetDate,
      owner: formData.owner || "质量工程师",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: "admin",
      updatedBy: "admin"
    };
    addPdcaRecord(newRecord);
    if (linkedNcr) {
      updateUnqualifiedItem(linkedNcr.id, { status: "capa_raised" });
      setSnackbarMsg(`已关联 NCR ${linkedNcr.itemNo} 并创建 CAPA ${pdcaNo}`);
    } else {
      setSnackbarMsg("PDCA 改进项已创建");
    }
    setDialog(false);
    setSnackbar(true);
    setFormData({ title: "", source: "inspection", priority: "high", problemDescription: "", targetDate: "", owner: "", linkedNcrId: "" });
  };
  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setEditForm({
      correctiveAction: record.correctiveAction || "",
      preventiveAction: record.preventiveAction || "",
      verificationResult: record.verificationResult || ""
    });
    setEditDialog(true);
  };
  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updatePdcaRecord(editingRecord.id, {
      ...editForm,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: "admin"
    });
    setSnackbarMsg("已保存");
    setSnackbar(true);
    setEditDialog(false);
  };
  const handleStatusChange = (record, newStatus) => {
    updatePdcaRecord(record.id, {
      status: newStatus,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: "admin"
    });
    if (newStatus === "verified" && record.relatedItemId) {
      updateUnqualifiedItem(record.relatedItemId, { status: "closed" });
      setSnackbarMsg(`CAPA ${record.pdcaNo} 已验证通过，关联 NCR 已自动关闭`);
    } else if (newStatus === "closed") {
      setSnackbarMsg(`CAPA ${record.pdcaNo} 已关闭`);
    }
    setSnackbar(true);
  };
  const getAvailableStatuses = (record) => {
    if (isCapaRecord(record)) {
      const flow = ["open", "in_progress", "verified", "closed"];
      const idx2 = flow.indexOf(record.status);
      return flow.slice(idx2 + 1).map((s) => ({ value: s, label: PDCA_STEP_LABELS[s] }));
    }
    const idx = PDCA_STEPS.indexOf(record.status);
    return PDCA_STEPS.slice(idx + 1).map((s) => ({ value: s, label: PDCA_STEP_LABELS[s] }));
  };
  const columns = [
    {
      accessorKey: "pdcaNo",
      header: "编号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#94A3B8", children: row.original.pdcaNo })
    },
    {
      accessorKey: "title",
      header: "标题",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: row.original.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.problemDescription })
      ] })
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: PDCA_STEP_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: PDCA_COLORS[row.original.status] + "15", color: PDCA_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    },
    {
      accessorKey: "priority",
      header: "优先级",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: PRIORITY_LABELS[row.original.priority],
          size: "small",
          sx: { bgcolor: PRIORITY_COLORS[row.original.priority] + "15", color: PRIORITY_COLORS[row.original.priority], fontWeight: 500 }
        }
      )
    },
    { accessorKey: "owner", header: "负责人" },
    {
      accessorKey: "targetDate",
      header: "目标日期",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "#94A3B8", children: row.original.targetDate })
    },
    {
      accessorKey: "source",
      header: "来源",
      cell: ({ row }) => SOURCE_LABELS[row.original.source] || row.original.source
    },
    {
      id: "progress",
      header: "进度",
      enableSorting: false,
      cell: ({ row }) => {
        const p = getProgress(row.original);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 90 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: p,
              sx: { flex: 1, height: 6, borderRadius: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: PDCA_COLORS[row.original.status], borderRadius: 3 } }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B", fontWeight: 500 }, children: [
            p,
            "%"
          ] })
        ] });
      }
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const r = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: (e) => {
            e.stopPropagation();
            handleOpenEdit(r);
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }),
          getAvailableStatuses(r).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "outlined",
              sx: {
                borderColor: PDCA_COLORS[s.value],
                color: PDCA_COLORS[s.value],
                fontSize: "0.7rem",
                py: 0.3,
                px: 1,
                minWidth: "auto",
                "&:hover": { bgcolor: PDCA_COLORS[s.value] + "15", borderColor: PDCA_COLORS[s.value] }
              },
              onClick: (e) => {
                e.stopPropagation();
                handleStatusChange(r, s.value);
              },
              children: s.label
            },
            s.value
          ))
        ] });
      }
    }
  ];
  const pickField = (r, headers, zh, en) => {
    const key = headers.find((h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase());
    return key ? r[key] ?? "" : "";
  };
  const VALID_STATUS = [...PDCA_STEPS, ...CAPA_STEPS];
  const SOURCE_ZH = {
    检验发现: "inspection",
    客户投诉: "customer_complaint",
    内部审核: "internal_audit",
    其他: "other"
  };
  const PRIORITY_ZH = { 高: "high", 中: "medium", 低: "low" };
  const mapPdcaRow = (r, headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const statusRaw = pickField(r, headers, "状态", "status");
    const sourceRaw = pickField(r, headers, "来源", "source");
    const prioRaw = pickField(r, headers, "优先级", "priority");
    return {
      id: `pdca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pdcaNo: pickField(r, headers, "编号", "pdcaNo") || `PDCA-${Date.now().toString().slice(-8)}`,
      title: pickField(r, headers, "标题", "title"),
      status: VALID_STATUS.includes(statusRaw) ? statusRaw : "open",
      source: SOURCE_ZH[sourceRaw] || "inspection",
      relatedItemId: void 0,
      priority: PRIORITY_ZH[prioRaw] || "high",
      problemDescription: pickField(r, headers, "问题描述", "problemDescription") || "",
      rootCause: "",
      targetDate: pickField(r, headers, "目标日期", "targetDate") || "",
      owner: pickField(r, headers, "负责人", "owner") || "质量工程师",
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addPdcaRecord(mapPdcaRow(r, headers)));
  };
  const expandedRecord = expandedId ? filteredRecords.find((r) => r.id === expandedId) || null : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "PDCA 质量改进 / CAPA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setDialog(true), children: "新建改进项 / CAPA" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, "data-testid": "pdca-tab-open", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "全部", value: TAB_VALUE.all }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "待处理", value: TAB_VALUE.open }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "进行中", value: TAB_VALUE.in_progress }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "已完成", value: TAB_VALUE.completed })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2.5, mb: 3, flexWrap: "wrap" }, children: [...PDCA_STEPS, ...CAPA_STEPS].filter((v, i, a) => a.indexOf(v) === i).map((status) => {
      const count = pdcaRecords.filter((r) => r.status === status).length;
      if (count === 0 && !["plan", "do", "check", "act", "closed"].includes(status)) return null;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 3, py: 2, borderRadius: 3, border: `1px solid ${PDCA_COLORS[status]}20`, flex: 1, minWidth: 100 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: PDCA_COLORS[status] }, children: count }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: PDCA_STEP_LABELS[status] })
      ] }, status);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filteredRecords,
        columns,
        enablePagination: true,
        enableExport: true,
        enableImport: true,
        columnConfigKey: "quality-pdca-list",
        onImport: handleImport,
        onRowClick: (row) => setExpandedId(expandedId === row.id ? null : row.id)
      }
    ),
    expandedRecord && /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden", mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, fontFamily: "monospace", color: "#94A3B8" }, children: expandedRecord.pdcaNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: PDCA_STEP_LABELS[expandedRecord.status],
            size: "small",
            sx: { bgcolor: PDCA_COLORS[expandedRecord.status] + "15", color: PDCA_COLORS[expandedRecord.status], fontWeight: 500 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: PRIORITY_LABELS[expandedRecord.priority],
            size: "small",
            sx: { bgcolor: PRIORITY_COLORS[expandedRecord.priority] + "15", color: PRIORITY_COLORS[expandedRecord.priority], fontWeight: 500 }
          }
        ),
        expandedRecord.relatedItemId && (() => {
          const linkedNcr = unqualifiedItems.find((u) => u.id === expandedRecord.relatedItemId);
          return linkedNcr ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: `关联NCR: ${linkedNcr.itemNo}`,
              size: "small",
              icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LinkIcon, { sx: { fontSize: 14 } }),
              sx: { bgcolor: "#ECFDF5", color: "#10B981", fontWeight: 500 }
            }
          ) : null;
        })(),
        isCapaRecord(expandedRecord) && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "CAPA", size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6", fontWeight: 600, fontFamily: "monospace", fontSize: "0.65rem" } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { fontWeight: 600, color: "#1E293B", mb: 0.5 }, children: expandedRecord.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B", mb: 1.5 }, children: expandedRecord.problemDescription }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: "进度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B", fontWeight: 500 }, children: [
              getProgress(expandedRecord),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: getProgress(expandedRecord),
              sx: { height: 6, borderRadius: 3, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: PDCA_COLORS[expandedRecord.status], borderRadius: 3 } }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#64748B", whiteSpace: "nowrap" }, children: [
          "负责人: ",
          expandedRecord.owner
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#94A3B8", whiteSpace: "nowrap" }, children: [
          "目标: ",
          expandedRecord.targetDate
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2, pt: 2, borderTop: "1px solid #F1F5F9" }, children: [
        expandedRecord.correctiveAction && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, p: 2, borderRadius: 2, bgcolor: "#EFF6FF", border: "1px solid #BFDBFE" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#1D4ED8", fontWeight: 600 }, children: "纠正措施：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#1E40AF", mt: 0.5 }, children: expandedRecord.correctiveAction })
        ] }),
        expandedRecord.preventiveAction && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, p: 2, borderRadius: 2, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#15803D", fontWeight: 600 }, children: "预防措施：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#166534", mt: 0.5 }, children: expandedRecord.preventiveAction })
        ] }),
        expandedRecord.verificationResult && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, p: 2, borderRadius: 2, bgcolor: "#FFF7ED", border: "1px solid #FDE68A" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#D97706", fontWeight: 600 }, children: "验证结果：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#92400E", mt: 0.5 }, children: expandedRecord.verificationResult })
        ] }),
        expandedRecord.actionItems && expandedRecord.actionItems.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { fontWeight: 600, mb: 1.5, color: "#1E293B" }, children: "行动计划" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexDirection: "column", gap: 1 }, children: expandedRecord.actionItems.map((action) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2, p: 1.5, borderRadius: 2, bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: action.status === "completed" ? "已完成" : action.status === "in_progress" ? "进行中" : "待开始",
                size: "small",
                sx: {
                  bgcolor: action.status === "completed" ? "#ECFDF5" : action.status === "in_progress" ? "#EFF6FF" : "#F8FAFC",
                  color: action.status === "completed" ? "#10B981" : action.status === "in_progress" ? "#3B82F6" : "#94A3B8",
                  fontWeight: 500,
                  minWidth: 60
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { flex: 1 }, children: action.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#94A3B8", whiteSpace: "nowrap" }, children: [
              action.owner,
              " / ",
              action.dueDate
            ] })
          ] }, action.id)) })
        ] }),
        expandedRecord.rootCause && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2, p: 2, borderRadius: 2, bgcolor: "#FFF7ED", border: "1px solid #FDE68A" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#D97706", fontWeight: 600 }, children: "根本原因分析：" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#92400E", mt: 0.5 }, children: expandedRecord.rootCause })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: dialog, onClose: () => setDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建 PDCA 改进项 / CAPA" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2, pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "改进项标题",
            fullWidth: true,
            value: formData.title,
            onChange: (e) => setFormData({ ...formData, title: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "来源" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "来源",
              value: formData.source,
              onChange: (e) => setFormData({ ...formData, source: e.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "inspection", children: "检验发现" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "customer_complaint", children: "客户投诉" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "internal_audit", children: "内部审核" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "other", children: "其他" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, "data-testid": "pdca-link-ncr", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "关联不合格品号（可选）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "关联不合格品号（可选）",
              value: formData.linkedNcrId,
              onChange: (e) => {
                const ncrId = e.target.value;
                const linked = linkableNcrs.find((n) => n.id === ncrId);
                setFormData({
                  ...formData,
                  linkedNcrId: ncrId,
                  problemDescription: linked ? linked.defectDescription : formData.problemDescription,
                  title: linked ? `CAPA - ${linked.itemNo}` : formData.title,
                  priority: "high"
                });
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "不关联" }),
                linkableNcrs.map((n) => {
                  var _a;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: n.id, children: [
                    n.itemNo,
                    " - ",
                    n.materialName,
                    " (",
                    (_a = n.defectDescription) == null ? void 0 : _a.slice(0, 30),
                    ")"
                  ] }, n.id);
                })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "优先级" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "优先级",
              value: formData.priority,
              onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "high", children: "高" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "medium", children: "中" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "low", children: "低" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "问题描述",
            multiline: true,
            rows: 3,
            fullWidth: true,
            value: formData.problemDescription,
            onChange: (e) => setFormData({ ...formData, problemDescription: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "目标完成日期",
            type: "date",
            fullWidth: true,
            InputLabelProps: { shrink: true },
            value: formData.targetDate,
            onChange: (e) => setFormData({ ...formData, targetDate: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "负责人",
            fullWidth: true,
            value: formData.owner,
            onChange: (e) => setFormData({ ...formData, owner: e.target.value })
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleCreate, children: "创建" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: editDialog, onClose: () => setEditDialog(false), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600 }, children: [
        "编辑 ",
        editingRecord == null ? void 0 : editingRecord.pdcaNo,
        " - ",
        editingRecord == null ? void 0 : editingRecord.title
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { sx: { pt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 2, pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "纠正措施",
            multiline: true,
            rows: 3,
            fullWidth: true,
            value: editForm.correctiveAction,
            placeholder: "描述为消除已发现的不合格所采取的措施...",
            onChange: (e) => setEditForm({ ...editForm, correctiveAction: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "预防措施",
            multiline: true,
            rows: 3,
            fullWidth: true,
            value: editForm.preventiveAction,
            placeholder: "描述为消除潜在不合格原因所采取的措施...",
            onChange: (e) => setEditForm({ ...editForm, preventiveAction: e.target.value })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "验证结果",
            multiline: true,
            rows: 3,
            fullWidth: true,
            value: editForm.verificationResult,
            placeholder: "描述措施有效性的验证结果...",
            onChange: (e) => setEditForm({ ...editForm, verificationResult: e.target.value })
          }
        ),
        editingRecord && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap", pt: 1 }, children: getAvailableStatuses(editingRecord).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            size: "small",
            variant: "outlined",
            sx: {
              borderColor: PDCA_COLORS[s.value],
              color: PDCA_COLORS[s.value],
              "&:hover": { bgcolor: PDCA_COLORS[s.value] + "15", borderColor: PDCA_COLORS[s.value] }
            },
            onClick: () => {
              handleStatusChange(editingRecord, s.value);
              setEditDialog(false);
            },
            children: [
              "流转到: ",
              s.label
            ]
          },
          s.value
        )) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setEditDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSaveEdit, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Snackbar, { open: snackbar, autoHideDuration: 3e3, onClose: () => setSnackbar(false), message: snackbarMsg })
  ] });
};
export {
  PDCAList as default
};
