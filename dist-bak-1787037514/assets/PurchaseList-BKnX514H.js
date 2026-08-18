import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { r as readSync, u as utils, w as writeSync } from "./vendor-xlsx-UZmsHzjH.js";
import { b as usePurchaseStore } from "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { F as FilterBar } from "./FilterBar-CgndUKQE.js";
import { A as ActionBar } from "./ActionBar-DYEbGKWc.js";
import { S as StatusBadge } from "./StatusBadge-D9w6gqgZ.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BAhqBvAF.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { a as formatDate, f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { b9 as Dialog, ba as DialogTitle, bc as DialogContent, m as Box, T as Typography, bv as TextField, aR as MenuItem, bE as DialogActions, bm as Button, cJ as Snackbar, bl as Alert, Z as SwapHoriz, d6 as FileDownloadOutlined, d7 as EditNote, br as DeleteOutline } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./vendor-table-l-0Px9iQ.js";
import "./vendor-forms-CgMxq7_e.js";
const PurchaseList = () => {
  const navigate = useNavigate();
  const fileInputRef = reactExports.useRef(null);
  const {
    purchaseRequests,
    addPurchaseRequest,
    deletePurchaseRequest,
    updatePurchaseRequest
  } = usePurchaseStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = reactExports.useState(false);
  const [pendingBatchDelete, setPendingBatchDelete] = reactExports.useState([]);
  const [batchEditOpen, setBatchEditOpen] = reactExports.useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = reactExports.useState([]);
  const [batchEditValues, setBatchEditValues] = reactExports.useState({});
  const [importDialogOpen, setImportDialogOpen] = reactExports.useState(false);
  const [importData, setImportData] = reactExports.useState([]);
  const [importPreview, setImportPreview] = reactExports.useState([]);
  const [snackbar, setSnackbar] = reactExports.useState({
    open: false,
    message: "",
    severity: "info"
  });
  const columns = reactExports.useMemo(() => [
    { accessorKey: "requestNo", header: "申请单号" },
    { accessorKey: "title", header: "标题" },
    { accessorKey: "applicant", header: "申请人" },
    { accessorKey: "department", header: "部门" },
    {
      accessorKey: "priority",
      header: "优先级",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.priority })
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    { accessorKey: "expectedDate", header: "期望日期", cell: ({ row }) => formatDate(row.original.expectedDate) },
    {
      accessorKey: "totalAmount",
      header: "预估金额",
      cell: ({ row }) => formatCurrency(row.original.totalAmount)
    }
  ], []);
  const filterFields = [
    { name: "requestNo", label: "申请单号", type: "text" },
    { name: "title", label: "标题", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "draft", label: "草稿" },
        { value: "pending", label: "待审批" },
        { value: "approved", label: "已批准" },
        { value: "rejected", label: "已拒绝" },
        { value: "ordered", label: "已下单" }
      ]
    },
    {
      name: "priority",
      label: "优先级",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "low", label: "低" },
        { value: "normal", label: "普通" },
        { value: "high", label: "高" },
        { value: "urgent", label: "紧急" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...purchaseRequests];
    if (filterData.requestNo) {
      data = data.filter((r) => r.requestNo.includes(filterData.requestNo));
    }
    if (filterData.title) {
      data = data.filter((r) => r.title.includes(filterData.title));
    }
    if (filterData.status) {
      data = data.filter((r) => r.status === filterData.status);
    }
    if (filterData.priority) {
      data = data.filter((r) => r.priority === filterData.priority);
    }
    return data;
  }, [purchaseRequests, filterData]);
  const handleSingleDelete = (row) => {
    setDeleteTarget(row);
  };
  const confirmSingleDelete = () => {
    if (deleteTarget) {
      deletePurchaseRequest(deleteTarget.id);
      setSnackbar({ open: true, message: `已删除：${deleteTarget.requestNo}`, severity: "success" });
      setDeleteTarget(null);
    }
  };
  const handleBatchDelete = (rows) => {
    setPendingBatchDelete(rows);
    setBatchDeleteOpen(true);
  };
  const confirmBatchDelete = () => {
    pendingBatchDelete.forEach((r) => deletePurchaseRequest(r.id));
    setSnackbar({ open: true, message: `已批量删除 ${pendingBatchDelete.length} 条申请`, severity: "success" });
    setBatchDeleteOpen(false);
    setPendingBatchDelete([]);
  };
  const handleBatchEdit = (rows) => {
    setPendingBatchEdit(rows);
    setBatchEditValues({});
    setBatchEditOpen(true);
  };
  const confirmBatchEdit = () => {
    const updates = {};
    if (batchEditValues.status) updates.status = batchEditValues.status;
    if (batchEditValues.priority) updates.priority = batchEditValues.priority;
    if (batchEditValues.department) updates.department = batchEditValues.department;
    pendingBatchEdit.forEach((r) => updatePurchaseRequest(r.id, updates));
    setSnackbar({ open: true, message: `已批量修改 ${pendingBatchEdit.length} 条申请`, severity: "success" });
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
  };
  const handleConvertToOrder = (rows) => {
    const validRows = rows.filter((r) => r.status === "approved" || r.status === "pending");
    if (validRows.length === 0) {
      setSnackbar({ open: true, message: "请选择已审批或待审批的采购申请", severity: "error" });
      return;
    }
    const ids = validRows.map((r) => r.id).join(",");
    navigate(`/purchase/orders/create?fromRequests=${ids}`);
  };
  const handleBatchExport = (rows) => {
    const exportData = rows.map((r) => ({
      "申请单号": r.requestNo,
      "标题": r.title,
      "申请人": r.applicant,
      "部门": r.department,
      "优先级": r.priority,
      "状态": r.status,
      "期望日期": r.expectedDate,
      "预估金额": r.totalAmount,
      "项目编号": r.projectNo || "",
      "项目名称": r.projectName || ""
    }));
    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "采购申请");
    const excelBuffer = writeSync(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = `采购申请_${(/* @__PURE__ */ new Date()).toLocaleDateString("zh-CN").replace(/\//g, "-")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `已导出 ${rows.length} 条采购申请`, severity: "success" });
  };
  const handleImportClick = () => {
    var _a;
    (_a = fileInputRef.current) == null ? void 0 : _a.click();
  };
  const handleFileChange = (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = readSync(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet);
        if (jsonData.length === 0) {
          setSnackbar({ open: true, message: "文件中没有数据", severity: "error" });
          return;
        }
        setImportPreview(jsonData);
        setImportData([]);
        setImportDialogOpen(true);
      } catch {
        setSnackbar({ open: true, message: "文件解析失败，请检查文件格式", severity: "error" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };
  const confirmImport = () => {
    const newRequests = importPreview.map((row, idx) => {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const seq = purchaseRequests.length + idx + 1;
      return {
        id: `pr-import-${Date.now()}-${idx}`,
        requestNo: row["申请单号"] || `PR-IMP-${String(seq).padStart(4, "0")}`,
        title: row["标题"] || "导入申请",
        applicant: row["申请人"] || "当前用户",
        department: row["部门"] || "",
        type: "material",
        priority: row["优先级"] || "normal",
        reason: row["申请原因"] || "",
        expectedDate: row["期望日期"] || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        status: "draft",
        items: [],
        totalAmount: Number(row["预估金额"]) || 0,
        projectNo: row["项目编号"] || void 0,
        projectName: row["项目名称"] || void 0,
        createdAt: now,
        updatedAt: now
      };
    });
    newRequests.forEach((r) => addPurchaseRequest(r));
    setSnackbar({ open: true, message: `成功导入 ${newRequests.length} 条采购申请`, severity: "success" });
    setImportDialogOpen(false);
    setImportPreview([]);
  };
  const batchActions = [
    {
      label: "转采购订单",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(SwapHoriz, { sx: { fontSize: 14 } }),
      color: "success",
      onClick: handleConvertToOrder
    },
    {
      label: "导出",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileDownloadOutlined, { sx: { fontSize: 14 } }),
      onClick: handleBatchExport
    },
    {
      label: "修改",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(EditNote, { sx: { fontSize: 14 } }),
      color: "warning",
      onClick: handleBatchEdit
    },
    {
      label: "删除",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteOutline, { sx: { fontSize: 14 } }),
      color: "error",
      onClick: handleBatchDelete
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "采购申请",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-request", currentStatus: "pr_submitted", label: "流程追踪" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ActionBar,
          {
            primary: { label: "新建申请", onClick: () => navigate("/purchase/create") },
            secondaries: [
              {
                label: "导入",
                onClick: handleImportClick,
                variant: "outlined"
              }
            ]
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: ".xlsx,.xls,.csv",
            style: { display: "none" },
            onChange: handleFileChange
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "purchase-request-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: false,
            onRowClick: (row) => navigate(`/purchase/${row.id}`),
            onView: (row) => navigate(`/purchase/${row.id}`),
            onEdit: (row) => navigate(`/purchase/${row.id}`),
            onDelete: handleSingleDelete,
            batchActions
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: !!deleteTarget,
            type: "danger",
            title: "确认删除",
            content: `确定删除采购申请"${deleteTarget == null ? void 0 : deleteTarget.title}"吗？此操作不可撤销。`,
            onConfirm: confirmSingleDelete,
            onCancel: () => setDeleteTarget(null),
            confirmText: "确认删除"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: batchDeleteOpen,
            type: "danger",
            title: "批量删除确认",
            content: `确定要删除选中的 ${pendingBatchDelete.length} 条采购申请吗？此操作不可撤销。`,
            onConfirm: confirmBatchDelete,
            onCancel: () => {
              setBatchDeleteOpen(false);
              setPendingBatchDelete([]);
            },
            confirmText: "确认批量删除"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: batchEditOpen, onClose: () => setBatchEditOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
            "批量修改（已选 ",
            pendingBatchEdit.length,
            " 条）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 1, display: "flex", flexDirection: "column", gap: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "留空的字段将不会修改，仅修改填写了内容的字段。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                label: "状态",
                value: batchEditValues.status || "",
                onChange: (e) => setBatchEditValues((v) => ({ ...v, status: e.target.value })),
                fullWidth: true,
                size: "small",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "不修改" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "draft", children: "草稿" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "pending", children: "待审批" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "approved", children: "已批准" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "rejected", children: "已拒绝" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                label: "优先级",
                value: batchEditValues.priority || "",
                onChange: (e) => setBatchEditValues((v) => ({ ...v, priority: e.target.value })),
                fullWidth: true,
                size: "small",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "不修改" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "low", children: "低" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "normal", children: "普通" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "high", children: "高" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "urgent", children: "紧急" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "部门",
                value: batchEditValues.department || "",
                onChange: (e) => setBatchEditValues((v) => ({ ...v, department: e.target.value })),
                fullWidth: true,
                size: "small"
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setBatchEditOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                onClick: confirmBatchEdit,
                disabled: !batchEditValues.status && !batchEditValues.priority && !batchEditValues.department,
                children: "确认修改"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: importDialogOpen, onClose: () => setImportDialogOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
            "导入预览（共 ",
            importPreview.length,
            " 条）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { maxHeight: 400, overflow: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { backgroundColor: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }, children: "申请单号" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }, children: "标题" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }, children: "申请人" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }, children: "部门" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }, children: "预估金额" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              importPreview.slice(0, 20).map((row, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #F1F5F9" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px" }, children: String(row["申请单号"] || "自动生成") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px" }, children: String(row["标题"] || "—") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px" }, children: String(row["申请人"] || "—") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px" }, children: String(row["部门"] || "—") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 12px" }, children: String(row["预估金额"] || "—") })
              ] }, idx)),
              importPreview.length > 20 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 5, style: { padding: "8px 12px", textAlign: "center", color: "#94A3B8" }, children: [
                "... 还有 ",
                importPreview.length - 20,
                " 条数据未显示"
              ] }) })
            ] })
          ] }) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setImportDialogOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "primary", onClick: confirmImport, children: "确认导入" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Snackbar,
          {
            open: snackbar.open,
            autoHideDuration: 3e3,
            onClose: () => setSnackbar((s) => ({ ...s, open: false })),
            anchorOrigin: { vertical: "bottom", horizontal: "center" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Alert,
              {
                onClose: () => setSnackbar((s) => ({ ...s, open: false })),
                severity: snackbar.severity,
                sx: { width: "100%" },
                children: snackbar.message
              }
            )
          }
        )
      ]
    }
  );
};
export {
  PurchaseList as default
};
