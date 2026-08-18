import { j as jsxRuntimeExports, R as React, h as useNavigate, r as reactExports } from "./vendor-react-Cc0tBtdY.js";
import { bs as Card, bt as CardContent, m as Box, T as Typography, c8 as TrendingUp, c9 as TrendingDown, b4 as Avatar, J as Inventory2, R as People, X as LocalShipping, bO as Warning, F as FactCheck, az as PrecisionManufacturing, aH as AccountBalance, ca as RateReview, _ as CartIcon, al as ReportProblem, a3 as MoveToInbox, cb as Outbox, cc as PointOfSale, M as Assessment, cd as Engineering, ce as TaskAlt, a2 as VerifiedUser, cf as GroupAdd, aO as Chip, p as Tooltip, aM as IconButton, cg as RefreshOutlined, ch as LinearProgress, bm as Button, bY as Grid, aS as Paper, c2 as Tabs, c3 as Tab, n as Divider, L as List, q as ListItem, t as ListItemIcon, w as ListItemText, ci as ArrowForwardIos, cj as FiberManualRecord, bh as Add, V as Assignment, ag as ReceiptIcon, a7 as Inventory, ah as QueryStats } from "./vendor-mui-UhJuRAfR.js";
import { u as useMaterialStore, a as useVendorStore, b as usePurchaseStore, c as useWarehouseStore, d as useQualityStore, e as useSalesStore, f as useFinanceStore, g as useOrgStore } from "./index-hTLNcGoC.js";
import { u as useProductionStore } from "./productionStore-B8YnWPVr.js";
import { u as useCustomerStore } from "./customerStore-BnoPAbgi.js";
import { B as BarChart, L as LineChart, P as PieChart } from "./vendor-charts-CTjfnoPO.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const KPICard = ({ title, value, icon, trend, color = "#3B82F6", suffix, formatCurrency }) => {
  const displayValue = formatCurrency ? new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) : suffix ? `${value}${suffix}` : value;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Card,
    {
      sx: {
        height: "100%",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)"
        }
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { sx: { p: 3, "&:last-child": { pb: 3 } }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "body2",
              sx: {
                mb: 1,
                color: "#64748B",
                fontSize: "0.8125rem",
                fontWeight: 500
              },
              children: title
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "h4",
              sx: {
                fontWeight: 700,
                color: "#1E293B",
                fontSize: suffix || formatCurrency ? "1.4rem" : "1.875rem",
                letterSpacing: "-0.025em"
              },
              children: displayValue
            }
          ),
          trend && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mt: 1.5 }, children: [
            trend.direction === "up" ? /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 16, color: "#10B981", mr: 0.5 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { sx: { fontSize: 16, color: "#EF4444", mr: 0.5 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Typography,
              {
                variant: "caption",
                sx: {
                  color: trend.direction === "up" ? "#10B981" : "#EF4444",
                  fontWeight: 600,
                  fontSize: "0.75rem"
                },
                children: [
                  trend.direction === "up" ? "+" : "-",
                  trend.value,
                  "%"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { ml: 0.5, color: "#94A3B8", fontSize: "0.75rem" }, children: "较上月" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Avatar,
          {
            sx: {
              bgcolor: `${color}15`,
              color,
              width: 52,
              height: 52,
              borderRadius: 3
            },
            children: React.cloneElement(icon, { sx: { fontSize: 24 } })
          }
        )
      ] }) })
    }
  );
};
const ApprovalCard = ({ item }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
  p: 1.5,
  borderRadius: 2,
  border: `1px solid ${item.urgent ? "rgba(239,68,68,.25)" : "rgba(226,232,240,.8)"}`,
  bgcolor: item.urgent ? "rgba(239,68,68,.03)" : "#fff",
  mb: 1
}, children: [
  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "flex-start", gap: 1 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Chip,
      {
        label: item.type,
        size: "small",
        sx: { fontSize: "0.65rem", bgcolor: item.urgent ? "#FEE2E2" : "#EFF6FF", color: item.urgent ? "#d32f2f" : "#3B82F6" }
      }
    ),
    item.urgent && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "紧急", size: "small", sx: { fontSize: "0.6rem", bgcolor: "#FEE2E2", color: "#d32f2f" } })
  ] }),
  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, sx: { mt: 0.8, mb: 0.4 }, children: item.title }),
  /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: [
      "提交人：",
      item.from,
      " · ",
      item.time
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 0.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: "success", sx: { fontSize: "0.7rem", py: 0.2, px: 1, minWidth: 0 }, children: "通过" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", color: "error", sx: { fontSize: "0.7rem", py: 0.2, px: 1, minWidth: 0 }, children: "拒绝" })
    ] })
  ] })
] });
const Dashboard = () => {
  const navigate = useNavigate();
  const [bottomTab, setBottomTab] = reactExports.useState(0);
  const [refreshing, setRefreshing] = reactExports.useState(false);
  const materials = useMaterialStore((s) => s.materials);
  const vendors = useVendorStore((s) => s.vendors);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const outboundOrders = useWarehouseStore((s) => s.outboundOrders);
  const inventoryAlerts = useWarehouseStore((s) => s.inventoryAlerts);
  const inspectionTasks = useQualityStore((s) => s.inspectionTasks);
  const unqualifiedItems = useQualityStore((s) => s.unqualifiedItems);
  const workOrders = useProductionStore((s) => s.workOrders);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const customers = useCustomerStore((s) => s.customers);
  const vouchers = useFinanceStore((s) => s.vouchers);
  useOrgStore((s) => s.currentOrgId);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
  const kpiData = reactExports.useMemo(() => {
    const monthInbound = inboundOrders.filter((o) => {
      var _a;
      return (_a = o.inboundDate) == null ? void 0 : _a.startsWith(todayStr);
    }).length;
    const monthOutbound = outboundOrders.filter((o) => {
      var _a;
      return (_a = o.outboundDate) == null ? void 0 : _a.startsWith(todayStr);
    }).length;
    const monthSalesOrders = salesOrders.filter((o) => {
      var _a;
      return (_a = o.orderDate) == null ? void 0 : _a.startsWith(todayStr);
    });
    const monthSalesAmount = monthSalesOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);
    const nowDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const overdueOrders = purchaseOrders.filter(
      (o) => o.expectedDeliveryDate < nowDate && !["received", "closed", "cancelled"].includes(o.status)
    ).length;
    const completedWO = workOrders.filter((w) => w.status === "completed").length;
    const totalWO = workOrders.length || 1;
    const completionRate = Math.round(completedWO / totalWO * 100);
    const passedInsp = inspectionTasks.filter((t) => t.status === "passed").length;
    const totalInsp = inspectionTasks.length || 1;
    const inspectionRate = Math.round(passedInsp / totalInsp * 100);
    const pendingInvoices = vouchers.filter((v) => v.source === "invoice" && v.status !== "posted").length;
    return [
      { title: "物料总数", value: materials.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, {}), trend: { value: 12, direction: "up" }, color: "#3B82F6", path: "/material/list" },
      { title: "供应商数", value: vendors.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(People, {}), trend: { value: 5, direction: "up" }, color: "#10B981", path: "/vendor/list" },
      { title: "在途采购", value: purchaseOrders.filter((o) => ["created", "sent", "confirmed", "vendorConfirmed"].includes(o.status)).length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}), trend: { value: 3, direction: "down" }, color: "#F59E0B", path: "/purchase/orders" },
      { title: "库存预警", value: inventoryAlerts.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), trend: { value: 2, direction: "up" }, color: "#EF4444", path: "/warehouse/inventory" },
      { title: "检验任务", value: inspectionTasks.filter((t) => t.status === "pending" || t.status === "in_progress").length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FactCheck, {}), trend: { value: 1, direction: "up" }, color: "#9C27B0", path: "/quality/inspection" },
      { title: "在制工单", value: workOrders.filter((w) => w.status === "in_progress").length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PrecisionManufacturing, {}), trend: { value: 0, direction: "up" }, color: "#FF5722", path: "/production/orders" },
      { title: "待付发票", value: pendingInvoices, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, {}), trend: { value: 1, direction: "up" }, color: "#607D8B", path: "/finance/invoices" },
      { title: "逾期付款", value: vouchers.filter((v) => v.date < nowDate && v.status !== "posted").length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), trend: { value: 1, direction: "up" }, color: "#d32f2f", path: "/finance/payments" },
      { title: "采购申请数", value: purchaseRequests.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RateReview, {}), trend: { value: 8, direction: "up" }, color: "#6366F1", path: "/purchase/list" },
      { title: "采购订单数", value: purchaseOrders.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CartIcon, {}), trend: { value: 5, direction: "up" }, color: "#14B8A6", path: "/purchase/orders" },
      { title: "逾期订单数", value: overdueOrders, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReportProblem, {}), trend: { value: overdueOrders, direction: "down" }, color: "#E11D48", path: "/purchase/orders" },
      { title: "月入库量", value: monthInbound, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MoveToInbox, {}), trend: { value: 15, direction: "up" }, color: "#06B6D4", path: "/warehouse/inbound" },
      { title: "出库量", value: monthOutbound, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Outbox, {}), trend: { value: 10, direction: "up" }, color: "#84CC16", path: "/warehouse/outbound" },
      { title: "销售订单数", value: salesOrders.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(PointOfSale, {}), trend: { value: 6, direction: "up" }, color: "#D946EF", path: "/sales/orders" },
      { title: "月销售额", value: monthSalesAmount, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assessment, {}), trend: { value: 12, direction: "up" }, color: "#0EA5E9", path: "/sales/orders", isCurrency: true },
      { title: "生产工单数", value: totalWO, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Engineering, {}), trend: { value: 3, direction: "up" }, color: "#FB923C", path: "/production/orders" },
      { title: "完工率", value: completionRate, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TaskAlt, {}), trend: { value: completionRate, direction: "up" }, color: "#22C55E", path: "/production/orders", isPercent: true },
      { title: "检验合格率", value: inspectionRate, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, {}), trend: { value: inspectionRate, direction: "up" }, color: "#3B82F6", path: "/quality/inspection", isPercent: true },
      { title: "NCR数量", value: unqualifiedItems.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReportProblem, {}), trend: { value: unqualifiedItems.length, direction: "down" }, color: "#EF4444", path: "/quality/report" },
      { title: "客户数量", value: customers.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GroupAdd, {}), trend: { value: 4, direction: "up" }, color: "#A855F7", path: "/sales/customers" }
    ];
  }, [
    materials,
    vendors,
    purchaseRequests,
    purchaseOrders,
    inboundOrders,
    outboundOrders,
    inventoryAlerts,
    inspectionTasks,
    unqualifiedItems,
    workOrders,
    salesOrders,
    customers,
    vouchers,
    todayStr
  ]);
  const approvalTasks = [
    { id: "APP-001", type: "供应商准入", title: "武汉钢铁贸易有限公司", from: "张三", time: "2小时前", urgent: true },
    { id: "APP-002", type: "采购申请", title: "热轧钢板 Q235B × 50吨", from: "李四", time: "3小时前", urgent: true },
    { id: "APP-003", type: "付款审批", title: "PMT-2024-0440 广东南方钢铁", from: "王五", time: "昨天", urgent: false }
  ];
  const pendingTasks = [
    { type: "质检", title: "IQC-2024-0512：宝钢钢板来料检验", priority: "high", color: "#EF4444", path: "/quality/inspection" },
    { type: "付款", title: "PMT-2024-0440：广东南方钢铁逾期付款", priority: "urgent", color: "#d32f2f", path: "/finance/payments" },
    { type: "采购", title: "MRP建议：热轧钢板Q235B库存告急", priority: "urgent", color: "#FF5722", path: "/production/mrp" },
    { type: "审核", title: "供应商准入审核：武汉钢铁贸易有限公司", priority: "normal", color: "#F59E0B", path: "/vendor/approvals" },
    { type: "盘点", title: "6月月度仓库盘点任务待启动", priority: "normal", color: "#2196F3", path: "/warehouse/check" }
  ];
  const recentActivities = [
    { time: "10分钟前", desc: "工单 WO-2024-0501 组焊工序已开始", module: "生产", color: "#FF5722" },
    { time: "35分钟前", desc: "发票 INV-2024-0501 已完成验证", module: "财务", color: "#4CAF50" },
    { time: "1小时前", desc: "BOM-2024-001 成本卷积已更新", module: "BOM", color: "#9C27B0" },
    { time: "2小时前", desc: "供应商 宝钢股份 评级更新为 A+", module: "供应商", color: "#2196F3" },
    { time: "昨天", desc: "PDCA-2024-003 改进计划已关闭", module: "质量", color: "#FF9800" }
  ];
  const quickEntries = [
    { label: "新建采购申请", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, { sx: { fontSize: 18 } }), color: "#3B82F6", path: "/purchase/create" },
    { label: "创建工单", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, { sx: { fontSize: 18 } }), color: "#FF5722", path: "/production/orders" },
    { label: "发票登记", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { sx: { fontSize: 18 } }), color: "#10B981", path: "/finance/invoices" },
    { label: "库存查询", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory, { sx: { fontSize: 18 } }), color: "#F59E0B", path: "/warehouse/inventory" },
    { label: "质量报表", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(QueryStats, { sx: { fontSize: 18 } }), color: "#9C27B0", path: "/quality/report" },
    { label: "生产报表", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(QueryStats, { sx: { fontSize: 18 } }), color: "#607D8B", path: "/production/report" }
  ];
  const months = ["1月", "2月", "3月", "4月", "5月", "6月"];
  const monthlyPurchase = [28e4, 22e4, 38e4, 42e4, 338156, 41e4];
  const monthlyQualityRate = [95.2, 96.8, 94.5, 97.1, 96.3, 97.8];
  const inventoryDist = [
    { id: 0, value: 45, label: "原材料", color: "#3B82F6" },
    { id: 1, value: 25, label: "半成品", color: "#10B981" },
    { id: 2, value: 20, label: "成品", color: "#F59E0B" },
    { id: 3, value: 10, label: "辅料", color: "#8B5CF6" }
  ];
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1e3);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 2.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B", fontSize: "1.5rem", letterSpacing: "-0.025em" }, children: "工作台" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#94A3B8", mt: 0.2 }, children: "2026年6月23日 星期二 · 数据更新于 17:07" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "SSA ERP v2.0", size: "small", sx: { mr: 1, bgcolor: "#EFF6FF", color: "#3B82F6" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "刷新数据", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: handleRefresh, sx: { color: "#94A3B8" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshOutlined, { fontSize: "small" }) }) })
    ] }),
    refreshing && /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { sx: { mb: 1.5, borderRadius: 1 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontWeight: 600, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase", fontSize: "0.6875rem", mb: 1, display: "block" }, children: "快捷入口" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: quickEntries.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "small",
          startIcon: e.icon,
          onClick: () => navigate(e.path),
          sx: {
            bgcolor: `${e.color}10`,
            color: e.color,
            border: `1px solid ${e.color}30`,
            borderRadius: 2,
            fontSize: "0.75rem",
            px: 1.5,
            "&:hover": { bgcolor: `${e.color}20` }
          },
          children: e.label
        },
        e.label
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 0.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { fontWeight: 600, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase", fontSize: "0.6875rem", mb: 1, display: "block" }, children: "核心指标" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: kpiData.map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Grid,
      {
        item: true,
        xs: 6,
        sm: 4,
        md: 3,
        onClick: () => navigate(kpi.path),
        sx: { cursor: "pointer" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          KPICard,
          {
            title: kpi.title,
            value: kpi.value,
            icon: kpi.icon,
            trend: kpi.trend,
            color: kpi.color,
            suffix: kpi.isPercent ? "%" : void 0,
            formatCurrency: kpi.isCurrency
          }
        )
      },
      kpi.title
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { flex: 1 }, children: "月度采购金额趋势" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, color: "#10B981", fontSize: "0.75rem" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 14 } }),
            "21.4%"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          BarChart,
          {
            series: [{ data: monthlyPurchase, label: "采购金额(元)", color: "#3B82F6" }],
            xAxis: [{ scaleType: "band", data: months }],
            height: 200,
            margin: { top: 10, bottom: 30, left: 75, right: 10 }
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { flex: 1 }, children: "月度质量合格率（%）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, color: "#10B981", fontSize: "0.75rem" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 14 } }),
            "1.5%"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          LineChart,
          {
            series: [{ data: monthlyQualityRate, label: "合格率", color: "#10B981", area: true }],
            xAxis: [{ scaleType: "band", data: months }],
            yAxis: [{ min: 90, max: 100 }],
            height: 200,
            margin: { top: 10, bottom: 30, left: 50, right: 10 }
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1.5 }, children: "库存结构" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          PieChart,
          {
            series: [{ data: inventoryDist, innerRadius: 42, outerRadius: 76, paddingAngle: 3, cornerRadius: 4 }],
            height: 200,
            margin: { top: 10, bottom: 10, left: 10, right: 10 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }, children: inventoryDist.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            size: "small",
            label: `${d.label} ${d.value}%`,
            sx: { fontSize: "0.65rem", bgcolor: `${d.color}15`, color: d.color, height: 20 }
          },
          d.label
        )) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, sx: { flex: 1 }, children: [
            "待我审批",
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: approvalTasks.length, size: "small", color: "error", sx: { ml: 1 } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#3B82F6", cursor: "pointer" }, children: "全部" })
        ] }),
        approvalTasks.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(ApprovalCard, { item: t }, t.id))
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, height: "100%" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Tabs,
          {
            value: bottomTab,
            onChange: (_, v) => setBottomTab(v),
            sx: { mb: 1.5, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0.5 } },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                "待办事项",
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: pendingTasks.length, size: "small", color: "error", sx: { height: 16, fontSize: "0.6rem" } })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "最近动态" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
        bottomTab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(List, { dense: true, disablePadding: true, children: pendingTasks.map((task, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            ListItem,
            {
              disablePadding: true,
              sx: { py: 0.8, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "grey.50" }, px: 1 },
              onClick: () => navigate(task.path),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIcon, { sx: { minWidth: 36 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: {
                  width: 26,
                  height: 26,
                  bgcolor: `${task.color}22`,
                  fontSize: "0.6rem",
                  color: task.color,
                  fontWeight: 700
                }, children: task.type }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ListItemText,
                  {
                    primary: task.title,
                    primaryTypographyProps: { variant: "body2", fontWeight: task.priority === "urgent" ? 600 : 400 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForwardIos, { sx: { fontSize: 12, color: "text.disabled" } })
              ]
            }
          ),
          idx < pendingTasks.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 0.5 } })
        ] }, idx)) }),
        bottomTab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(List, { dense: true, disablePadding: true, children: recentActivities.map((act, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(ListItem, { disablePadding: true, sx: { py: 0.8, px: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(ListItemIcon, { sx: { minWidth: 28 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FiberManualRecord, { sx: { fontSize: 10, color: act.color } }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              ListItemText,
              {
                primary: act.desc,
                secondary: act.time,
                primaryTypographyProps: { variant: "body2" },
                secondaryTypographyProps: { variant: "caption" }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: act.module,
                size: "small",
                sx: { fontSize: "0.6rem", bgcolor: `${act.color}15`, color: act.color }
              }
            )
          ] }),
          idx < recentActivities.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 0.5 } })
        ] }, idx)) })
      ] }) })
    ] })
  ] });
};
export {
  Dashboard as default
};
