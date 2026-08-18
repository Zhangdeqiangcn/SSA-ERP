import { r as reactExports, j as jsxRuntimeExports, h as Typography, aL as Chip, aP as Paper, B as Box, R as React, aD as AccountBalance, b7 as Dialog, b8 as DialogTitle, bK as Stack, Q as Description, i as Divider, ba as DialogContent, c1 as Tabs, c2 as Tab, aa as Person, bX as Grid, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, bC as DialogActions, bj as Alert, bt as TextField, bk as Button, bV as CheckCircle, d7 as Cancel } from "./vendor-46QZWBd3.js";
import { b as usePurchaseStore, n as getApprovalSteps, h as useAuthStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { F as FilterBar } from "./FilterBar-Dnzbdei4.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { a as formatDate } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import "./StatusBadge-Db1uY4YU.js";
const statusMap = {
  draft: { label: "草稿", color: "default" },
  pending: { label: "待审批", color: "info" },
  reviewing: { label: "审核中", color: "warning" },
  approved: { label: "已批准", color: "success" },
  rejected: { label: "已拒绝", color: "error" },
  ordered: { label: "已下单", color: "success" }
};
const PURCHASE_MODULE = "purchase_request";
const ApprovalDialog = ({ open, req, steps, canAct, onClose, onAdvance, onReject }) => {
  var _a, _b, _c, _d;
  const [comment, setComment] = reactExports.useState("");
  const [tab, setTab] = reactExports.useState(0);
  if (!req) return null;
  const currentStep = req.currentStep ?? 0;
  const step = steps[currentStep];
  const isLastStep = currentStep >= steps.length - 1;
  const inProgress = ["pending", "reviewing"].includes(req.status);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Description, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        req.title,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { ml: 1 }, children: req.requestNo })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: (_a = statusMap[req.status]) == null ? void 0 : _a.label, size: "small", color: (_b = statusMap[req.status]) == null ? void 0 : _b.color })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { p: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 3, pt: 2, pb: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-request", currentStatus: (step == null ? void 0 : step.id) || ((_c = steps[0]) == null ? void 0 : _c.id) || "pr-1", documentNo: req.requestNo }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Tabs,
        {
          value: tab,
          onChange: (_, v) => setTab(v),
          sx: { borderBottom: "1px solid rgba(226,232,240,.8)", px: 3 },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { sx: { fontSize: 16 } }), iconPosition: "start", label: "申请信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Person, { sx: { fontSize: 16 } }), iconPosition: "start", label: "物料清单" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
        tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
          ["申请人", req.applicant],
          ["部门", req.department],
          ["类型", req.type === "material" ? "物料" : "服务"],
          ["优先级", req.priority],
          ["需求日期", req.expectedDate],
          ["预算金额", req.totalAmount != null ? `¥${req.totalAmount}` : "-"],
          ["项目", req.projectName || "-"],
          ["事由", req.reason]
        ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: value })
        ] }, String(label))) }),
        tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "预估单价" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "预估金额" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: req.items.map((it) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: it.materialName || it.materialCode }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: it.quantity }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: it.estimatedPrice != null ? `¥${it.estimatedPrice}` : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: it.estimatedAmount != null ? `¥${it.estimatedAmount}` : "-" })
          ] }, it.id)) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { sx: { px: 3, pb: 2, flexDirection: "column", alignItems: "stretch", gap: 1 }, children: !inProgress ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
      "该申请已",
      (_d = statusMap[req.status]) == null ? void 0 : _d.label,
      "，审批流程结束。"
    ] }) : !canAct ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
      "当前角色无「",
      step == null ? void 0 : step.name,
      "」步骤的审批权限，仅可查看。"
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
        "当前步骤：",
        step == null ? void 0 : step.name,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { sx: { ml: 1 }, size: "small", label: step == null ? void 0 : step.roleName, color: "primary", variant: "outlined" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          size: "small",
          label: "审批意见",
          multiline: true,
          rows: 2,
          value: comment,
          onChange: (e) => setComment(e.target.value)
        }
      ),
      !isLastStep ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
          "data-testid": "purchase-approve-btn",
          onClick: () => {
            onAdvance(comment);
            onClose();
          },
          children: "提交下一步"
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          color: "success",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
          "data-testid": "purchase-approve-btn",
          onClick: () => {
            onAdvance(comment);
            onClose();
          },
          children: "批准"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          color: "error",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}),
          "data-testid": "purchase-reject-btn",
          onClick: () => {
            onReject(comment);
            onClose();
          },
          children: "拒绝"
        }
      )
    ] }) })
  ] });
};
const PurchaseApproval = () => {
  const { purchaseRequests, updatePurchaseRequest } = usePurchaseStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [selected, setSelected] = reactExports.useState(null);
  const steps = reactExports.useMemo(() => {
    const cfg = getApprovalSteps(PURCHASE_MODULE);
    return cfg.length ? cfg : [{ id: "default", name: "审批", role: "admin", roleName: "系统管理员", order: 1 }];
  }, []);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canAct = reactExports.useMemo(() => {
    if (!selected || !currentUser) return false;
    const step = steps[selected.currentStep ?? 0];
    return !!step && (currentUser.role === step.role || currentUser.role === "admin" || useAuthStore.getState().hasPermission("purchase.approve"));
  }, [selected, steps, currentUser]);
  const handleAdvance = (comment) => {
    if (!selected) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const currentStep = selected.currentStep ?? 0;
    const isLast = currentStep >= steps.length - 1;
    steps[currentStep];
    const records = [...selected.approvalRecords || [], { approver: (currentUser == null ? void 0 : currentUser.name) || "admin", action: "approve", comment, at: now }];
    if (!isLast) {
      updatePurchaseRequest(selected.id, {
        status: "reviewing",
        currentStep: currentStep + 1,
        approvalRecords: records
      });
    } else {
      updatePurchaseRequest(selected.id, { status: "approved", approvalRecords: records });
    }
  };
  const handleReject = (comment) => {
    if (!selected) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    steps[selected.currentStep ?? 0];
    const records = [...selected.approvalRecords || [], { approver: (currentUser == null ? void 0 : currentUser.name) || "admin", action: "reject", comment, at: now }];
    updatePurchaseRequest(selected.id, { status: "rejected", approvalRecords: records });
  };
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "requestNo",
      header: "申请单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#3B82F6", fontWeight: 500, fontFamily: "monospace" }, children: row.original.requestNo })
    },
    { accessorKey: "title", header: "标题", cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.title }) },
    { accessorKey: "applicant", header: "申请人", cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.applicant }) },
    { accessorKey: "department", header: "部门", cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.department }) },
    {
      accessorKey: "currentStep",
      header: "当前步骤",
      cell: ({ row }) => {
        const step = steps[row.original.currentStep ?? 0];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: (step == null ? void 0 : step.name) || "审批", size: "small", color: "info", variant: "outlined", sx: { fontSize: "0.7rem" } });
      }
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default" });
      }
    },
    { accessorKey: "expectedDate", header: "需求日期", cell: ({ row }) => formatDate(row.original.expectedDate) }
  ], [steps]);
  const filterFields = [
    { name: "title", label: "标题", type: "text" },
    { name: "status", label: "状态", type: "select", options: [
      { value: "", label: "全部" },
      { value: "pending", label: "待审批" },
      { value: "reviewing", label: "审核中" },
      { value: "approved", label: "已批准" },
      { value: "rejected", label: "已拒绝" }
    ] }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = purchaseRequests.filter((r) => ["pending", "reviewing"].includes(r.status));
    if (filterData.title) data = data.filter((d) => d.title.includes(filterData.title));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, purchaseRequests]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "采购申请审批", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 2, mb: 2, border: "1px solid rgba(226,232,240,.8)", borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1.5 }, children: [
        "审批流程（",
        steps.length,
        " 步，按设置中心配置驱动）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5 }, children: steps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
        i > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8", mx: 0.5 }, children: "→" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { sx: { fontSize: 14 } }),
            label: `${s.name}（${s.roleName}）`,
            size: "small",
            color: i === 0 ? "primary" : "default",
            variant: "outlined",
            sx: { fontSize: "0.72rem", height: 24 }
          }
        )
      ] }, s.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filteredData,
        columns,
        enablePagination: true,
        enableExport: true,
        onView: (row) => setSelected(row),
        onEdit: (row) => setSelected(row)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ApprovalDialog,
      {
        open: Boolean(selected),
        req: selected,
        steps,
        canAct,
        onClose: () => setSelected(null),
        onAdvance: handleAdvance,
        onReject: handleReject
      }
    )
  ] });
};
export {
  PurchaseApproval as default
};
