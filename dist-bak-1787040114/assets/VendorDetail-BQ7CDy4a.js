import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, aL as Chip, aP as Paper, bj as Alert, bK as Stack, cl as LinearProgress, c_ as Share, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bX as Grid, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bC as DialogActions, bk as Button, cU as Snackbar } from "./vendor-DGU5TO-x.js";
import { a as useVendorStore, j as useSettingsStore, b as usePurchaseStore, d as useQualityStore } from "./index-DeeqqmHA.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-D4JWfy3I.js";
import { F as FileUpload } from "./FileUpload-CMrbNP90.js";
import { C as ConfirmDialog } from "./ConfirmDialog-DFiLXnKl.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { D as DetailActions } from "./DetailActions-BM4l2p_l.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { O as ObjectPage } from "./ObjectPage-R9WHJvce.js";
import { u as usePriceStore } from "./priceStore-CduvTkzQ.js";
import { b as buildVendorRatingInput, c as computeVendorRating } from "./vendorRating-DKHWnbxs.js";
import "./PrintPreviewButton-DI_LQm8R.js";
import "./PrintPreview-cCBr3GzP.js";
const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = useVendorStore((s) => s.vendors.find((v) => v.id === id));
  const deleteVendor = useVendorStore((s) => s.deleteVendor);
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const [editForm, setEditForm] = reactExports.useState({
    name: "",
    shortName: "",
    contact: "",
    phone: "",
    email: "",
    address: "",
    type: "manufacturer",
    status: "approved",
    salesOrg: "",
    reconciliationAccount: "",
    taxCode: ""
  });
  if (!vendor) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "供应商详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: "供应商不存在" }) });
  }
  const vendorRatingConfig = useSettingsStore((s) => s.vendorRatingConfig);
  const ratingInput = buildVendorRatingInput({
    inspectionTasks: useQualityStore.getState().inspectionTasks,
    purchaseOrders: usePurchaseStore.getState().purchaseOrders,
    priceList: usePriceStore.getState().priceList,
    vendorId: vendor.id
  });
  const vendorRating = computeVendorRating(ratingInput, vendorRatingConfig);
  const RATING_GRADE_COLOR = {
    A: "success",
    B: "primary",
    C: "warning",
    D: "error",
    数据不足: "default"
  };
  const openEdit = () => {
    setEditForm({
      name: vendor.name,
      shortName: vendor.shortName || "",
      contact: vendor.contact,
      phone: vendor.phone,
      email: vendor.email || "",
      address: vendor.address || "",
      type: vendor.type,
      status: vendor.status,
      salesOrg: vendor.salesOrg || "",
      reconciliationAccount: vendor.reconciliationAccount || "",
      taxCode: vendor.taxCode || ""
    });
    setEditOpen(true);
  };
  const handleEditSave = () => {
    updateVendor(vendor.id, { ...editForm });
    setEditOpen(false);
  };
  const typeMap = {
    manufacturer: "生产商",
    trader: "贸易商",
    agent: "代理商"
  };
  const basicFields = [
    { label: "供应商编码", value: vendor.code },
    { label: "供应商名称", value: vendor.name },
    { label: "简称", value: vendor.shortName || "-" },
    { label: "类型", value: typeMap[vendor.type] },
    { label: "联系人", value: vendor.contact },
    { label: "电话", value: vendor.phone },
    { label: "邮箱", value: vendor.email || "-" },
    { label: "地址", value: vendor.address || "-" },
    { label: "状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: vendor.status }) },
    { label: "信用等级", value: vendor.creditLevel || "-" },
    { label: "评级", value: vendor.rating ? `${vendor.rating}星` : "-" },
    { label: "资质到期", value: formatDate(vendor.qualificationExpiry) },
    { label: "税号", value: vendor.taxId || "-" },
    { label: "银行账号", value: vendor.bankAccount || "-" }
  ];
  const operationLogs = [
    { id: "1", action: "create", operator: vendor.createdBy, time: vendor.createdAt, description: "注册供应商" },
    { id: "2", action: "approve", operator: "李明", time: "2024-01-20 10:00:00", description: "审核通过" }
  ];
  const handleShare = () => {
    const text = `供应商 ${vendor.name}
编码：${vendor.code}
联系人：${vendor.contact}
电话：${vendor.phone}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  const handleDelete = () => {
    deleteVendor(vendor.id);
    setDeleteDialog(false);
    navigate("/vendor/list");
  };
  const ratingBlock = vendorRatingConfig.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "vendor-rating", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: [
      "供应商绩效评级",
      vendorRating.score !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          size: "small",
          sx: { ml: 1.5, fontWeight: 700 },
          color: RATING_GRADE_COLOR[vendorRating.grade],
          label: `${vendorRating.grade} 级 · ${vendorRating.score} 分`
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2 }, children: vendorRating.score === null ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无足够的检验/订单/价目表数据，无法评级。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1.5, children: vendorRating.indicators.map((ind) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: ind.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: ind.value !== null ? `${ind.value} 分` : "无数据" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        LinearProgress,
        {
          variant: "determinate",
          value: ind.value ?? 0,
          color: RATING_GRADE_COLOR[vendorRating.grade],
          sx: { height: 6, borderRadius: 3 }
        }
      )
    ] }, ind.key)) }) })
  ] }) : null;
  const creditBlock = /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DetailSection,
      {
        fields: [
          {
            label: "授信额度",
            value: vendor.creditLimit != null ? formatCurrency(vendor.creditLimit) : "未授信"
          },
          {
            label: "已用信用",
            value: vendor.usedCredit != null ? formatCurrency(vendor.usedCredit) : "-"
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { "data-testid": "credit-status", sx: { mt: 2 }, children: (() => {
      const limit = vendor.creditLimit;
      const used = vendor.usedCredit || 0;
      if (limit == null || limit <= 0) {
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "未授信", variant: "outlined", color: "default" });
      }
      const ratio = used / limit;
      const over = used > limit || ratio >= 0.9;
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          LinearProgress,
          {
            variant: "determinate",
            value: Math.min(100, Math.round(ratio * 100)),
            sx: {
              width: 160,
              height: 8,
              borderRadius: 3,
              "& .MuiLinearProgress-bar": { bgcolor: over ? "#EF4444" : "#10B981" }
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            size: "small",
            label: over ? "信用超额" : "信用正常",
            color: over ? "error" : "success"
          }
        )
      ] });
    })() })
  ] });
  const sections = [
    { id: "basic", title: "基本信息", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields, columns: 2 }) },
    ...ratingBlock ? [{ id: "rating", title: "供应商评级", content: ratingBlock }] : [],
    { id: "credit", title: "信用状态", content: creditBlock },
    {
      id: "org",
      title: "组织与会计",
      content: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DetailSection,
        {
          fields: [
            { label: "采购组织", value: vendor.salesOrg || "-" },
            { label: "统驭科目", value: vendor.reconciliationAccount || "-" },
            { label: "税码", value: vendor.taxCode || "-" }
          ],
          columns: 2
        }
      )
    },
    {
      id: "qualification",
      title: "资质文件",
      content: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: [] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FileUpload, { multiple: true })
      ] })
    },
    ...vendor.blacklistReason ? [{
      id: "blacklist",
      title: "黑名单记录",
      content: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DetailSection,
        {
          fields: [
            { label: "加入时间", value: formatDate(vendor.blacklistedAt) },
            { label: "原因", value: vendor.blacklistReason }
          ]
        }
      )
    }] : [],
    { id: "logs", title: "操作日志", content: /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { title: "操作日志", events: operationLogs }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ObjectPage,
      {
        title: vendor.code,
        subtitle: vendor.name,
        breadcrumbs: [{ label: "供应商列表", path: "/vendor/list" }],
        status: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: vendor.status }),
        headerFields: [
          { label: "类型", value: typeMap[vendor.type] },
          { label: "联系人", value: vendor.contact },
          { label: "电话", value: vendor.phone },
          { label: "信用等级", value: vendor.creditLevel || "-" },
          { label: "评级", value: vendor.rating ? `${vendor.rating}星` : "-" }
        ],
        actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DetailActions,
          {
            entity: "vendor",
            record: vendor,
            onBack: () => navigate("/vendor/list"),
            onEdit: openEdit,
            onDelete: () => setDeleteDialog(true),
            extra: [
              { key: "share", label: "分享", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {}), onClick: handleShare }
            ]
          }
        ),
        sections
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除",
        content: `确定删除供应商"${vendor.name}"吗？此操作不可撤销。`,
        onConfirm: handleDelete,
        onCancel: () => setDeleteDialog(false),
        confirmText: "确认删除",
        confirmColor: "error"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: editOpen, onClose: () => setEditOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "编辑供应商 - ",
        vendor.code
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "供应商名称", value: editForm.name, onChange: (e) => setEditForm({ ...editForm, name: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "简称", value: editForm.shortName, onChange: (e) => setEditForm({ ...editForm, shortName: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: editForm.type, label: "类型", onChange: (e) => setEditForm({ ...editForm, type: e.target.value }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "manufacturer", children: "生产商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "trader", children: "贸易商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "agent", children: "代理商" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "联系人", value: editForm.contact, onChange: (e) => setEditForm({ ...editForm, contact: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "电话", value: editForm.phone, onChange: (e) => setEditForm({ ...editForm, phone: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "邮箱", value: editForm.email, onChange: (e) => setEditForm({ ...editForm, email: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "地址", value: editForm.address, onChange: (e) => setEditForm({ ...editForm, address: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: editForm.status, label: "状态", onChange: (e) => setEditForm({ ...editForm, status: e.target.value }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "registered", children: "已注册" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "pending", children: "待审核" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "approved", children: "已批准" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "rejected", children: "已拒绝" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "blacklisted", children: "黑名单" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "采购组织", value: editForm.salesOrg, onChange: (e) => setEditForm({ ...editForm, salesOrg: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "统驭科目", value: editForm.reconciliationAccount, onChange: (e) => setEditForm({ ...editForm, reconciliationAccount: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "税码", value: editForm.taxCode, onChange: (e) => setEditForm({ ...editForm, taxCode: e.target.value }) }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setEditOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleEditSave, children: "保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar,
        autoHideDuration: 3e3,
        onClose: () => setSnackbar(false),
        message: "分享内容已复制到剪贴板"
      }
    )
  ] });
};
export {
  VendorDetail as default
};
