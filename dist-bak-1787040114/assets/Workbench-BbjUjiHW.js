import { u as useTheme, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, a8 as Storefront, I as Inventory2, aD as AccountBalance, F as FactCheck, K as Assignment, B as Box, aP as Paper, b2 as Avatar, h as Typography, aL as Chip, b as alpha, k as Tooltip, bk as Button, b5 as CheckCircleOutline, v as DashboardIcon, aJ as IconButton, cr as RestartAlt, bf as Add, b3 as Menu, aO as MenuItem, n as ListItemIcon, q as ListItemText, bX as Grid, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, bK as Stack, bC as DialogActions, cs as DragIndicator, aS as CloseIcon, L as List, R as React, l as ListItem, i as Divider, ct as ReceiptLong, G as Assessment, b0 as InfoOutlined, a$ as WarningAmberOutlined, a_ as ErrorOutline } from "./vendor-DGU5TO-x.js";
import { h as useAuthStore, i as useNotificationData, u as useMaterialStore, a as useVendorStore, b as usePurchaseStore, c as useWarehouseStore, d as useQualityStore, f as useFinanceStore } from "./index-DeeqqmHA.js";
import { u as useWorkbenchStore, W as WIDGET_LIBRARY } from "./workbenchStore-DcLy2Z4C.js";
import { u as useProductionStore } from "./productionStore-Bdmg7HTu.js";
const ICON_MAP = {
  inventory: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, { fontSize: "small" }),
  assignment: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }),
  factcheck: /* @__PURE__ */ jsxRuntimeExports.jsx(FactCheck, { fontSize: "small" }),
  account: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { fontSize: "small" }),
  report: /* @__PURE__ */ jsxRuntimeExports.jsx(Assessment, { fontSize: "small" }),
  store: /* @__PURE__ */ jsxRuntimeExports.jsx(Storefront, { fontSize: "small" }),
  receipt: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptLong, { fontSize: "small" })
};
const LINK_CATALOG = [
  { label: "供应商列表", path: "/vendor/list", icon: "store" },
  { label: "采购申请", path: "/purchase/requests", icon: "assignment" },
  { label: "价格比对", path: "/price/comparison/new", icon: "receipt" },
  { label: "库存查询", path: "/warehouse/inventory", icon: "inventory" },
  { label: "BOM列表", path: "/bom/list", icon: "assignment" },
  { label: "销售订单", path: "/sales/orders", icon: "assignment" },
  { label: "MRP计划", path: "/production/mrp", icon: "assignment" },
  { label: "经营驾驶舱", path: "/analytics/cockpit", icon: "report" },
  { label: "系统设置", path: "/settings", icon: "report" }
];
const ROLE_HINTS = {
  admin: "管理员视图：关注全局经营指标与跨模块预警。",
  buyer: "采购员视图：优先处理采购申请、订单与供应商准入。",
  warehouse: "仓储视图：关注库存告急、出入库与盘点任务。",
  quality: "质量视图：优先处理检验任务、不合格品与 8D。",
  finance: "财务视图：关注发票验证、付款计划与账期。",
  production: "生产视图：关注在产工单、产能与工序报工。"
};
const fmtMoney = (n) => "¥" + (n || 0).toLocaleString("zh-CN", { maximumFractionDigits: 0 });
const notifyIcon = {
  error: /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorOutline, { fontSize: "small", sx: { color: "error.main" } }),
  warning: /* @__PURE__ */ jsxRuntimeExports.jsx(WarningAmberOutlined, { fontSize: "small", sx: { color: "warning.main" } }),
  info: /* @__PURE__ */ jsxRuntimeExports.jsx(InfoOutlined, { fontSize: "small", sx: { color: "info.main" } }),
  success: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircleOutline, { fontSize: "small", sx: { color: "success.main" } })
};
const greeting = () => {
  const h = (/* @__PURE__ */ new Date()).getHours();
  if (h < 6) return "凌晨好";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
};
const Workbench = () => {
  var _a;
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const navigate = useNavigate();
  const { currentUser, role } = useAuthStore();
  const { notifications, summary } = useNotificationData();
  const {
    visibleWidgets,
    quickLinks,
    editMode,
    toggleWidget,
    addQuickLink,
    removeQuickLink,
    reorderWidgets,
    setEditMode,
    resetLayout
  } = useWorkbenchStore();
  const materials = useMaterialStore((s) => s.materials);
  const vendors = useVendorStore((s) => s.vendors);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);
  usePurchaseStore((s) => s.purchaseOrders);
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const inspectionTasks = useQualityStore((s) => s.inspectionTasks);
  useFinanceStore((s) => s.invoices);
  const paymentPlans = useFinanceStore((s) => s.paymentPlans);
  const workOrders = useProductionStore((s) => s.workOrders);
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [linkDialog, setLinkDialog] = reactExports.useState(false);
  const [newLabel, setNewLabel] = reactExports.useState("");
  const [newPath, setNewPath] = reactExports.useState("");
  const [dragIndex, setDragIndex] = reactExports.useState(-1);
  const safetyMap = reactExports.useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    (materials ?? []).forEach((mt) => {
      if (mt.code) m.set(mt.code, mt.safetyStock ?? 0);
    });
    return m;
  }, [materials]);
  const lowStockCount = reactExports.useMemo(() => {
    let c = 0;
    (inventoryRecords ?? []).forEach((r) => {
      const ss = safetyMap.get(r.materialCode) ?? 0;
      if (ss > 0 && r.quantity < ss) c += 1;
    });
    return c;
  }, [inventoryRecords, safetyMap]);
  const pendingPayTotal = reactExports.useMemo(() => {
    let t = 0;
    (paymentPlans ?? []).forEach((pl) => {
      if (pl.status === "pending" || pl.status === "overdue") {
        t += (pl.totalAmount || 0) - (pl.paidAmount || 0);
      }
    });
    return t;
  }, [paymentPlans]);
  const metrics = reactExports.useMemo(() => [
    {
      label: "供应商待审",
      value: (vendors ?? []).filter((v) => v.status === "pending").length,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Storefront, { fontSize: "small" }),
      path: "/vendor/approvals",
      tone: "warning"
    },
    {
      label: "库存告急",
      value: lowStockCount,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, { fontSize: "small" }),
      path: "/warehouse/inventory",
      tone: lowStockCount > 0 ? "warning" : "success"
    },
    {
      label: "待付款金额",
      value: fmtMoney(pendingPayTotal),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, { fontSize: "small" }),
      path: "/finance/payments",
      tone: "warning"
    },
    {
      label: "检验任务",
      value: (inspectionTasks ?? []).filter((t) => t.status === "pending" || t.status === "in_progress").length,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FactCheck, { fontSize: "small" }),
      path: "/quality/inspection",
      tone: "info"
    },
    {
      label: "在产工单",
      value: (workOrders ?? []).length,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }),
      path: "/production/orders",
      tone: "info"
    },
    {
      label: "采购申请待审",
      value: (purchaseRequests ?? []).filter((r) => r.status === "pending").length,
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }),
      path: "/purchase/requests",
      tone: "info"
    }
  ], [vendors, lowStockCount, pendingPayTotal, inspectionTasks, workOrders, purchaseRequests]);
  const hiddenWidgets = WIDGET_LIBRARY.filter((w) => !visibleWidgets.includes(w.id));
  const roleHint = ROLE_HINTS[role || "admin"] || ROLE_HINTS.admin;
  const handleAddLink = () => {
    if (!newLabel.trim() || !newPath.trim()) return;
    addQuickLink({
      id: `ql-${Date.now()}`,
      label: newLabel.trim(),
      path: newPath.trim().startsWith("/") ? newPath.trim() : `/${newPath.trim()}`,
      icon: "assignment"
    });
    setNewLabel("");
    setNewPath("");
    setLinkDialog(false);
  };
  const onDrop = (to) => {
    if (dragIndex >= 0 && dragIndex !== to) reorderWidgets(dragIndex, to);
    setDragIndex(-1);
  };
  const renderWidget = (id, index) => {
    const def = WIDGET_LIBRARY.find((w) => w.id === id);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: id === "metrics" ? 12 : 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Paper,
      {
        draggable: editMode,
        onDragStart: () => setDragIndex(index),
        onDragOver: (e) => e.preventDefault(),
        onDrop: () => onDrop(index),
        elevation: 0,
        sx: {
          p: 2,
          height: "100%",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          opacity: dragIndex === index ? 0.6 : 1,
          cursor: editMode ? "grab" : "default"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1.5 }, children: [
            editMode && /* @__PURE__ */ jsxRuntimeExports.jsx(DragIndicator, { sx: { color: "text.disabled", mr: 0.5, cursor: "grab" } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, sx: { flex: 1, color: "text.primary" }, children: def.title }),
            editMode && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "移除卡片", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => toggleWidget(id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { sx: { fontSize: 16, color: "text.secondary" } }) }) })
          ] }),
          id === "todo" && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 1.5, children: summary.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Paper,
            {
              elevation: 0,
              onClick: () => navigate(c.path),
              sx: {
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: c.count > 0 ? alpha(p, 0.06) : "background.default",
                "&:hover": { borderColor: p }
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Typography,
                  {
                    variant: "h6",
                    fontWeight: 700,
                    sx: { color: c.level === "error" ? "error.main" : c.level === "warning" ? "warning.main" : "text.primary" },
                    children: c.count
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary" }, children: c.label })
              ]
            }
          ) }, c.key)) }),
          id === "alert" && /* @__PURE__ */ jsxRuntimeExports.jsxs(List, { dense: true, disablePadding: true, sx: { maxHeight: 320, overflow: "auto" }, children: [
            notifications.slice(0, 10).map((n, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                ListItem,
                {
                  button: true,
                  onClick: () => navigate(n.path),
                  sx: { px: 1, py: 1, borderRadius: 1, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIcon, { sx: { minWidth: 32 }, children: notifyIcon[n.level] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      ListItemText,
                      {
                        primary: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: n.read ? 400 : 600, sx: { color: "text.primary" }, children: n.title }),
                        secondary: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary" }, children: n.desc })
                      }
                    )
                  ]
                }
              ),
              i < notifications.slice(0, 10).length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { component: "li", sx: { borderColor: "divider" } })
            ] }, n.id)),
            notifications.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, textAlign: "center", color: "text.secondary" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircleOutline, { sx: { color: "success.main", fontSize: 28 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { mt: 1 }, children: "暂无预警，一切正常" })
            ] })
          ] }),
          id === "metrics" && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 1.5, children: metrics.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, md: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Paper,
            {
              elevation: 0,
              onClick: () => navigate(m.path),
              sx: {
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { borderColor: p }
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: m.tone === "error" ? "error.main" : m.tone === "warning" ? "warning.main" : "text.secondary", mb: 0.5 }, children: m.icon }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, sx: { color: "text.primary", fontSize: "1.1rem" }, children: m.value }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary" }, children: m.label })
              ]
            }
          ) }, m.label)) }),
          id === "quicklinks" && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", flexWrap: "wrap", useFlexGap: true, spacing: 1, children: [
            quickLinks.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                icon: ICON_MAP[l.icon] || /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }),
                label: l.label,
                onClick: () => navigate(l.path),
                onDelete: editMode ? () => removeQuickLink(l.id) : void 0,
                deleteIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}),
                sx: {
                  py: 0.8,
                  pl: 0.5,
                  pr: editMode ? 0.5 : 1.2,
                  cursor: "pointer",
                  bgcolor: alpha(p, 0.08),
                  color: "text.primary",
                  "&:hover": { bgcolor: alpha(p, 0.16) },
                  "& .MuiChip-deleteIcon": { color: "text.secondary" }
                }
              },
              l.id
            )),
            editMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
                label: "添加",
                onClick: () => setLinkDialog(true),
                variant: "outlined",
                sx: { py: 0.8, cursor: "pointer", borderStyle: "dashed" }
              }
            )
          ] }) })
        ]
      }
    ) }, id);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: { xs: 2, md: 3 } }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Paper,
      {
        elevation: 0,
        sx: {
          p: 3,
          mb: 2,
          borderRadius: 3,
          background: `linear-gradient(120deg, ${alpha(p, 0.12)}, ${alpha(p, 0.02)})`,
          border: "1px solid",
          borderColor: "divider"
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { width: 52, height: 52, bgcolor: p, color: "#fff", fontWeight: 700, fontSize: "1.25rem" }, children: ((_a = currentUser == null ? void 0 : currentUser.name) == null ? void 0 : _a.charAt(0)) || "U" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1, minWidth: 200 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h5", fontWeight: 700, sx: { color: "text.primary" }, children: [
              greeting(),
              "，",
              (currentUser == null ? void 0 : currentUser.name) || "用户"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 0.5, display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: role || "操作员", size: "small", sx: { bgcolor: alpha(p, 0.16), color: p, fontWeight: 600 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "text.secondary" }, children: roleHint })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "自定义布局", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: editMode ? "contained" : "outlined",
                startIcon: editMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircleOutline, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardIcon, {}),
                onClick: () => setEditMode(!editMode),
                sx: { mr: 1 },
                children: editMode ? "完成" : "编辑布局"
              }
            ) }),
            editMode && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "恢复默认布局", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: resetLayout, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RestartAlt, {}) }) })
          ] })
        ] })
      }
    ),
    editMode && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
          onClick: (e) => setAnchorEl(e.currentTarget),
          disabled: hiddenWidgets.length === 0,
          sx: { borderStyle: "dashed" },
          children: [
            "添加卡片",
            hiddenWidgets.length > 0 ? `（${hiddenWidgets.length}）` : ""
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { anchorEl, open: Boolean(anchorEl), onClose: () => setAnchorEl(null), children: hiddenWidgets.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { onClick: () => {
        toggleWidget(w.id);
        setAnchorEl(null);
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIcon, { sx: { minWidth: 32 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardIcon, { fontSize: "small" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemText, { primary: w.title, secondary: w.desc })
      ] }, w.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: visibleWidgets.map((id, index) => renderWidget(id, index)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: linkDialog, onClose: () => setLinkDialog(false), maxWidth: "xs", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "添加常用功能" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            label: "显示名称",
            value: newLabel,
            onChange: (e) => setNewLabel(e.target.value),
            margin: "normal",
            placeholder: "如：生产报表"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            label: "路由路径",
            value: newPath,
            onChange: (e) => setNewPath(e.target.value),
            margin: "normal",
            placeholder: "如：/production/report"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "text.secondary" }, children: "或从候选目录快速添加：" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", flexWrap: "wrap", useFlexGap: true, spacing: 1, sx: { mt: 1 }, children: LINK_CATALOG.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            icon: ICON_MAP[c.icon] || /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { fontSize: "small" }),
            label: c.label,
            size: "small",
            onClick: () => {
              addQuickLink({ ...c, id: `ql-${Date.now()}` });
            },
            sx: { cursor: "pointer", bgcolor: alpha(p, 0.08) }
          },
          c.path
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setLinkDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleAddLink, children: "添加" })
      ] })
    ] })
  ] });
};
export {
  Workbench as default
};
