import { r as reactExports, j as jsxRuntimeExports, R as React } from "./vendor-react-CdHjdSaV.js";
import { m as useFlowStore, n as getApprovalSteps, h as useAuthStore, a as useVendorStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { F as FilterBar } from "./FilterBar-BdGe90kr.js";
import { F as FlowTracker } from "./FlowTracker-B5McqHb_.js";
import { a as formatDate } from "./format-DXPckS9-.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { T as Typography, bL as Stack, b4 as Avatar, m as Box, aO as Chip, aS as Paper, aH as AccountBalance, bY as Grid, b9 as Dialog, ba as DialogTitle, bK as Business, n as Divider, bc as DialogContent, c2 as Tabs, c3 as Tab, c0 as ContactPage, b_ as AttachFile, cS as CalendarToday, bm as Button, bv as TextField, bE as DialogActions, bl as Alert, bW as CheckCircle, cT as Cancel } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
import "./vendor-forms-B1OIhDzB.js";
const statusMap = {
  submitted: { label: "已提交", color: "info" },
  reviewing: { label: "审核中", color: "warning" },
  approved: { label: "已批准", color: "success" },
  rejected: { label: "已拒绝", color: "error" },
  supplement: { label: "需补充", color: "warning" }
};
const VENDOR_MODULE = "vendor_register";
const VENDOR_ROLE_FIELDS = {
  buyer: ["contact", "contactPhone", "contactEmail", "address", "mainProducts"],
  qa_engineer: ["certifications", "supplyCategories", "annualRevenue"],
  admin: []
};
const VENDOR_ARRAY_FIELDS = /* @__PURE__ */ new Set(["certifications", "supplyCategories"]);
const VENDOR_FIELD_LABELS = {
  contact: "联系人",
  contactPhone: "联系电话",
  contactEmail: "联系邮箱",
  address: "地址",
  mainProducts: "主营产品",
  certifications: "认证资质",
  supplyCategories: "供货类目",
  annualRevenue: "年营收"
};
const ApprovalDialog = ({ open, app, steps, canAct, onClose, onDecision, onAdvance }) => {
  var _a, _b, _c, _d, _e, _f;
  const [comment, setComment] = reactExports.useState("");
  const [tab, setTab] = reactExports.useState(0);
  const [editValues, setEditValues] = reactExports.useState({});
  const currentStep = (app == null ? void 0 : app.currentStep) ?? 0;
  const step = steps[currentStep];
  const isLastStep = currentStep >= steps.length - 1;
  const inProgress = app ? ["submitted", "reviewing", "supplement"].includes(app.status) : false;
  const stepFields = step ? VENDOR_ROLE_FIELDS[step.role] || [] : [];
  const initEditValues = (a) => {
    const init = {};
    (VENDOR_ROLE_FIELDS[(step == null ? void 0 : step.role) || ""] || []).forEach((f) => {
      const raw = a[f];
      init[f] = Array.isArray(raw) ? raw.join("、") : raw ?? "";
    });
    setEditValues(init);
  };
  React.useEffect(() => {
    if (app) initEditValues(app);
    setComment("");
    setTab(0);
  }, [app == null ? void 0 : app.id]);
  if (!app) return null;
  const setField = (field, value) => setEditValues((prev) => ({ ...prev, [field]: value }));
  const handleAdvance = () => {
    const edited = {};
    stepFields.forEach((f) => {
      const v = editValues[f];
      edited[f] = VENDOR_ARRAY_FIELDS.has(f) && typeof v === "string" ? v.split("、").map((s) => s.trim()).filter(Boolean) : v;
    });
    onAdvance(comment, edited);
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "lg", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Business, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        app.companyName,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { ml: 1 }, children: app.applicationNo })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: (_a = statusMap[app.status]) == null ? void 0 : _a.label, size: "small", color: (_b = statusMap[app.status]) == null ? void 0 : _b.color })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { p: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 3, pt: 2, pb: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        FlowTracker,
        {
          module: "vendor-register",
          currentStatus: (step == null ? void 0 : step.id) || ((_c = steps[0]) == null ? void 0 : _c.id) || "vr-1",
          documentNo: app.applicationNo
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Tabs,
        {
          value: tab,
          onChange: (_, v) => setTab(v),
          sx: {
            borderBottom: "1px solid rgba(226,232,240,.8)",
            px: 3,
            "& .MuiTab-root": { fontSize: "0.875rem", textTransform: "none", minHeight: 44 }
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Business, { sx: { fontSize: 16 } }), iconPosition: "start", label: "企业信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ContactPage, { sx: { fontSize: 16 } }), iconPosition: "start", label: "联系人" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachFile, { sx: { fontSize: 16 } }), iconPosition: "start", label: "附件" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarToday, { sx: { fontSize: 16 } }), iconPosition: "start", label: "审批记录" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
        tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
          ["企业全称", app.companyName],
          ["统一社会信用代码", app.unifiedCode],
          ["法定代表人", app.legalRepresentative],
          ["注册资本", app.registeredCapital],
          ["联系人", app.contact],
          ["电话", app.contactPhone],
          ["邮箱", app.contactEmail],
          ["地址", app.address],
          ["主要产品", app.mainProducts],
          ["供货类目", app.supplyCategories.join("、")],
          ["年营收", app.annualRevenue || "-"],
          ["认证资质", ((_d = app.certifications) == null ? void 0 : _d.join("、")) || "无"],
          ["开户银行", app.bankName],
          ["银行账号", app.bankAccount],
          ["账户名称", app.bankAccountName]
        ].map(([label, value]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, sx: { fontFamily: label === "统一社会信用代码" || label === "银行账号" ? "monospace" : "inherit" }, children: value })
        ] }, String(label))) }),
        tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { elevation: 0, sx: { p: 2, border: "1px solid rgba(226,232,240,.8)", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: "#3B82F6", width: 48, height: 48 }, children: app.contact[0] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: app.contact }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "📞 ",
              app.contactPhone
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "✉️ ",
              app.contactEmail
            ] })
          ] })
        ] }) }),
        tab === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, children: app.attachments.map((att) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.5,
          border: "1px solid rgba(226,232,240,.8)",
          borderRadius: 2
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(AttachFile, { sx: { color: "#3B82F6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", flex: 1, children: att.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: att.type, size: "small", sx: { fontSize: "0.75rem" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", children: "查看" })
        ] }, att.name)) }),
        tab === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          ((_e = app.approvalRecords) == null ? void 0 : _e.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, mb: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { width: 32, height: 32, bgcolor: "#10B981", fontSize: "0.8rem" }, children: r.approver[0] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: r.approver }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: formatDate(r.at) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { mt: 0.5 }, children: r.comment })
            ] })
          ] }, i))) || /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", variant: "body2", children: "暂无审批记录" }),
          inProgress && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2, p: 2, bgcolor: "#F8FAFC", borderRadius: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1 }, children: "填写审批意见" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                multiline: true,
                rows: 3,
                size: "small",
                placeholder: "请输入审批意见...",
                value: comment,
                onChange: (e) => setComment(e.target.value)
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { sx: { px: 3, pb: 2, flexDirection: "column", alignItems: "stretch", gap: 1 }, children: !inProgress ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
      "该申请已",
      (_f = statusMap[app.status]) == null ? void 0 : _f.label,
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
      stepFields.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { my: 0.5 }, children: stepFields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          fullWidth: true,
          size: "small",
          label: VENDOR_FIELD_LABELS[f] || f,
          value: editValues[f] ?? "",
          onChange: (e) => setField(f, e.target.value)
        }
      ) }, f)) }),
      stepFields.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1 }, children: [
        "本步骤（",
        step == null ? void 0 : step.name,
        "）无可编辑字段，仅作审批判定。"
      ] }),
      !isLastStep ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
          "data-testid": "vendor-approve-btn",
          onClick: handleAdvance,
          children: "提交下一步"
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          color: "success",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
          "data-testid": "vendor-approve-btn",
          onClick: handleAdvance,
          children: "批准注册"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "outlined",
          color: "error",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}),
          "data-testid": "vendor-reject-btn",
          onClick: () => {
            onDecision("reject", comment);
            onClose();
          },
          children: "拒绝"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
        onDecision("supplement", comment);
        onClose();
      }, children: "要求补充资料" })
    ] }) })
  ] });
};
const ApprovalQueue = () => {
  const { vendorApplications, updateVendorApplication } = useFlowStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [selected, setSelected] = reactExports.useState(null);
  const steps = reactExports.useMemo(() => {
    const cfg = getApprovalSteps(VENDOR_MODULE);
    return cfg.length ? cfg : [{ id: "default", name: "审批", role: "admin", roleName: "系统管理员", order: 1 }];
  }, []);
  const currentUser = useAuthStore((s) => s.currentUser);
  const canAct = reactExports.useMemo(() => {
    if (!selected || !currentUser) return false;
    const step = steps[selected.currentStep ?? 0];
    return !!step && (currentUser.role === step.role || currentUser.role === "admin" || useAuthStore.getState().hasPermission("vendor.approve"));
  }, [selected, steps, currentUser]);
  const buildVendorFromApp = (app) => {
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
    return {
      id: `ven-${app.id}`,
      code: `V${dateStr}${Math.floor(Math.random() * 900 + 100)}`,
      name: app.companyName,
      shortName: app.companyName,
      type: "trader",
      contact: app.contact,
      phone: app.contactPhone,
      email: app.contactEmail,
      address: app.address,
      status: "active",
      taxId: "",
      bankAccount: app.bankAccount,
      createdAt: now,
      updatedAt: now,
      createdBy: "approval",
      updatedBy: "approval"
    };
  };
  const applyEditedFields = (app, edited) => {
    if (!edited || Object.keys(edited).length === 0) return;
    updateVendorApplication(app.id, { ...edited });
  };
  const handleAdvance = (_comment, edited) => {
    if (!selected) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const currentStep = selected.currentStep ?? 0;
    const isLast = currentStep >= steps.length - 1;
    const step = steps[currentStep];
    const record = { approver: (currentUser == null ? void 0 : currentUser.name) || "admin", action: "submit", comment: "", at: now };
    const historyEntry = {
      step: currentStep,
      role: (step == null ? void 0 : step.role) || "admin",
      label: (step == null ? void 0 : step.name) || "审批",
      action: "submit",
      at: now
    };
    applyEditedFields(selected, edited);
    if (!isLast) {
      updateVendorApplication(selected.id, {
        status: "reviewing",
        currentStep: currentStep + 1,
        reviewedAt: now,
        approvalRecords: [...selected.approvalRecords || [], { ...record, action: "submit", comment: record.comment }],
        stepHistory: [...selected.stepHistory || [], historyEntry]
      });
    } else {
      updateVendorApplication(selected.id, {
        status: "approved",
        reviewedAt: now,
        approvalRecords: [...selected.approvalRecords || [], { ...record, action: "approve" }],
        stepHistory: [...selected.stepHistory || [], { ...historyEntry, action: "approve" }]
      });
      const vendors = useVendorStore.getState().vendors;
      if (!vendors.some((v) => v.id === `ven-${selected.id}`)) {
        useVendorStore.getState().addVendor(buildVendorFromApp(selected));
      }
    }
  };
  const handleDecision = (action, comment) => {
    if (!selected) return;
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    const currentStep = selected.currentStep ?? 0;
    const step = steps[currentStep];
    const record = { approver: (currentUser == null ? void 0 : currentUser.name) || "admin", action, comment, at: now };
    const historyEntry = {
      step: currentStep,
      role: (step == null ? void 0 : step.role) || "admin",
      label: (step == null ? void 0 : step.name) || "审批",
      action: action === "approve" ? "approve" : action === "reject" ? "reject" : "supplement",
      comment: comment || void 0,
      at: now
    };
    if (action === "approve") {
      updateVendorApplication(selected.id, {
        status: "approved",
        reviewedAt: now,
        reviewComment: comment,
        approvalRecords: [...selected.approvalRecords || [], record],
        stepHistory: [...selected.stepHistory || [], historyEntry]
      });
      const vendors = useVendorStore.getState().vendors;
      if (!vendors.some((v) => v.id === `ven-${selected.id}`)) {
        useVendorStore.getState().addVendor(buildVendorFromApp(selected));
      }
    } else if (action === "reject") {
      updateVendorApplication(selected.id, {
        status: "rejected",
        reviewedAt: now,
        reviewComment: comment,
        approvalRecords: [...selected.approvalRecords || [], record],
        stepHistory: [...selected.stepHistory || [], historyEntry]
      });
    } else {
      updateVendorApplication(selected.id, {
        status: "supplement",
        reviewedAt: now,
        reviewComment: comment,
        approvalRecords: [...selected.approvalRecords || [], record],
        stepHistory: [...selected.stepHistory || [], historyEntry]
      });
    }
  };
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "applicationNo",
      header: "申请编号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#3B82F6", fontWeight: 500, fontFamily: "monospace" }, children: row.original.applicationNo })
    },
    {
      accessorKey: "companyName",
      header: "企业名称",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { width: 28, height: 28, bgcolor: "#3B82F6", fontSize: "0.75rem" }, children: row.original.companyName[0] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.companyName })
      ] })
    },
    {
      accessorKey: "contact",
      header: "联系人",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.contact }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.contactPhone })
      ] })
    },
    {
      accessorKey: "supplyCategories",
      header: "供货类目",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.3 }, children: [
        row.original.supplyCategories.slice(0, 2).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: c, size: "small", sx: { fontSize: "0.7rem" } }, c)),
        row.original.supplyCategories.length > 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `+${row.original.supplyCategories.length - 2}`, size: "small", sx: { fontSize: "0.7rem" } })
      ] })
    },
    {
      accessorKey: "certifications",
      header: "认证",
      cell: ({ row }) => {
        var _a;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.3 }, children: (_a = row.original.certifications) == null ? void 0 : _a.slice(0, 2).map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: c, size: "small", color: "success", sx: { fontSize: "0.7rem" } }, c)) });
      }
    },
    {
      accessorKey: "currentStep",
      header: "当前步骤",
      cell: ({ row }) => {
        const step = steps[row.original.currentStep ?? 0];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: (step == null ? void 0 : step.name) || "审批", size: "small", color: "info", variant: "outlined", sx: { fontSize: "0.7rem" } }),
          (step == null ? void 0 : step.roleName) && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: step.roleName })
        ] });
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
    { accessorKey: "submittedAt", header: "提交时间", cell: ({ row }) => formatDate(row.original.submittedAt) }
  ], [steps]);
  const filterFields = [
    { name: "companyName", label: "企业名称", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "submitted", label: "已提交" },
        { value: "reviewing", label: "审核中" },
        { value: "approved", label: "已批准" },
        { value: "rejected", label: "已拒绝" },
        { value: "supplement", label: "需补充" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...vendorApplications];
    if (filterData.companyName) data = data.filter((d) => d.companyName.includes(filterData.companyName));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, vendorApplications]);
  const stats = reactExports.useMemo(() => ({
    reviewing: vendorApplications.filter((a) => a.status === "reviewing").length,
    submitted: vendorApplications.filter((a) => a.status === "submitted").length,
    approved: vendorApplications.filter((a) => a.status === "approved").length,
    rejected: vendorApplications.filter((a) => a.status === "rejected").length
  }), [vendorApplications]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商注册审批", children: [
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
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 2 }, children: [
      { label: "待审核", value: stats.submitted + stats.reviewing, color: "#F59E0B", bg: "#FFFBEB" },
      { label: "审核中", value: stats.reviewing, color: "#6366F1", bg: "#EEF2FF" },
      { label: "已批准", value: stats.approved, color: "#10B981", bg: "#ECFDF5" },
      { label: "已拒绝", value: stats.rejected, color: "#EF4444", bg: "#FEF2F2" }
    ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 1.5, border: "1px solid rgba(226,232,240,.8)", borderRadius: 2, textAlign: "center", bgcolor: s.bg }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: s.color }, children: s.value }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
    ] }) }, s.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: filteredData,
        columns,
        enableRowSelection: true,
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
        app: selected,
        steps,
        canAct,
        onClose: () => setSelected(null),
        onDecision: handleDecision,
        onAdvance: handleAdvance
      }
    )
  ] });
};
export {
  ApprovalQueue as default
};
