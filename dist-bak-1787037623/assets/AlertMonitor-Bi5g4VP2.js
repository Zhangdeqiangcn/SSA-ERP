import { r as reactExports, j as jsxRuntimeExports, h as useNavigate } from "./vendor-react-CdHjdSaV.js";
import { c as useWarehouseStore, e as useSalesStore, b as usePurchaseStore } from "./index-CU2cqxc8.js";
import { m as Box, O as WarningAmber, T as Typography, bl as Alert, bY as Grid, J as Inventory2, fb as EventBusy, cm as ReceiptLong, fc as CreditCardOff, bs as Card, bt as CardContent, aO as Chip, bu as CardActions, bm as Button, E as ExpandLess, x as ExpandMore, y as Collapse, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bO as Warning, dl as Error } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const severityColors = {
  high: { bg: "#ffebee", icon: "#d32f2f" },
  medium: { bg: "#fff3e0", icon: "#f57c00" },
  low: { bg: "#e8f5e9", icon: "#388e3c" }
};
const severityIcons = {
  high: /* @__PURE__ */ jsxRuntimeExports.jsx(Error, { fontSize: "small", sx: { color: "#d32f2f" } }),
  medium: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { fontSize: "small", sx: { color: "#f57c00" } }),
  low: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { fontSize: "small", sx: { color: "#388e3c" } })
};
const AlertCard = ({
  icon,
  title,
  count,
  severity,
  description,
  details,
  actionLabel,
  actionPath,
  testid
}) => {
  const [expanded, setExpanded] = reactExports.useState(false);
  const navigate = useNavigate();
  const sc = severityColors[severity];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Card,
    {
      variant: "outlined",
      "data-testid": testid,
      sx: { borderRadius: 2, borderLeft: `4px solid ${sc.icon}`, height: "100%" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { pb: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
              icon,
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: title })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: `${count} 项异常`,
                size: "small",
                color: severity === "high" ? "error" : severity === "medium" ? "warning" : "success",
                variant: "outlined"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 1 }, children: [
            severityIcons[severity],
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: description })
          ] })
        ] }),
        details && details.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardActions, { sx: { pt: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              size: "small",
              endIcon: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}),
              onClick: () => setExpanded(!expanded),
              children: [
                "展开明细 (",
                details.length,
                ")"
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: expanded, timeout: "auto", unmountOnExit: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { sx: { pt: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { maxHeight: 240 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", stickyHeader: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem" }, children: "物料/单据" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem" }, children: "异常详情" }),
              details[0].extra !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600, fontSize: "0.75rem" }, children: "备注" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: details.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem" }, children: d.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem", color: "error.main" }, children: d.value }),
              d.extra !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.75rem" }, children: d.extra })
            ] }, i)) })
          ] }) }) }) })
        ] }),
        actionPath && /* @__PURE__ */ jsxRuntimeExports.jsx(CardActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "text", onClick: () => navigate(actionPath), children: actionLabel || "查看详情" }) })
      ]
    }
  );
};
const AlertMonitor = () => {
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const prospects = useSalesStore((s) => s.prospects);
  const batchRecords = useWarehouseStore((s) => s.batchRecords);
  const lowStockAlerts = reactExports.useMemo(() => {
    const safeStockThreshold = 100;
    return inventoryRecords.filter((r) => r.availableQuantity < safeStockThreshold).slice(0, 10).map((r) => ({
      label: `${r.materialName} (${r.materialCode})`,
      value: `可用 ${r.availableQuantity} / 总 ${r.quantity}，阈值 ${safeStockThreshold}`,
      extra: r.warehouseName || "-"
    }));
  }, [inventoryRecords]);
  const overdueOrders = reactExports.useMemo(() => {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    for (const order of salesOrders) {
      if (order.status !== "completed" && order.status !== "cancelled") {
        const ed = order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null;
        if (ed && ed < today) {
          const days = Math.floor((today.getTime() - ed.getTime()) / (1e3 * 60 * 60 * 24));
          result.push({
            label: `${order.orderNo} - ${order.customerName}`,
            value: `期望交货 ${order.expectedDeliveryDate}，逾期 ${days} 天`,
            extra: order.status
          });
        }
      }
    }
    for (const po of purchaseOrders) {
      if (po.status !== "received" && po.status !== "closed" && po.status !== "cancelled") {
        const ed = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null;
        if (ed && ed < today) {
          const days = Math.floor((today.getTime() - ed.getTime()) / (1e3 * 60 * 60 * 24));
          result.push({
            label: `${po.orderNo} - ${po.vendorName}`,
            value: `期望交货 ${po.expectedDeliveryDate}，逾期 ${days} 天`,
            extra: po.status
          });
        }
      }
    }
    return result.slice(0, 10);
  }, [salesOrders, purchaseOrders]);
  const expiringBatches = reactExports.useMemo(() => {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1e3);
    return batchRecords.filter((b) => {
      if (!b.expiryDate) return false;
      const exp = new Date(b.expiryDate);
      return exp <= threshold && exp >= today && b.quantity > 0;
    }).slice(0, 10).map((b) => {
      const exp = new Date(b.expiryDate);
      const days = Math.floor((exp.getTime() - today.getTime()) / (1e3 * 60 * 60 * 24));
      return {
        label: `${b.materialName} (${b.materialCode}) 批次 ${b.batchNo}`,
        value: `到期日 ${b.expiryDate}，剩余 ${days} 天`,
        extra: `数量 ${b.quantity}`
      };
    });
  }, [batchRecords]);
  const creditOverdue = reactExports.useMemo(() => {
    return prospects.filter((p) => {
      const limit = p.creditLimit || 0;
      const used = p.usedCredit || 0;
      return limit > 0 && used > limit;
    }).slice(0, 10).map((p) => ({
      label: `${p.companyName}`,
      value: `已用 ¥${(p.usedCredit || 0).toLocaleString()} / 授信 ¥${(p.creditLimit || 0).toLocaleString()}`,
      extra: `超出 ${((p.usedCredit || 0) - (p.creditLimit || 0)).toLocaleString()}`
    }));
  }, [prospects]);
  const totalAlerts = lowStockAlerts.length + overdueOrders.length + expiringBatches.length + creditOverdue.length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { maxWidth: 1200, mx: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(WarningAmber, { color: "warning", fontSize: "large" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", children: "异常检测与预警" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "实时监控业务异常，共检测到 ",
          totalAlerts,
          " 项预警"
        ] })
      ] })
    ] }),
    totalAlerts > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mb: 3 }, children: [
      "系统检测到 ",
      totalAlerts,
      " 项异常，请及时处理以保障业务正常运行。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        AlertCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Inventory2, { color: "warning" }),
          title: "库存低于安全库存",
          count: lowStockAlerts.length,
          severity: lowStockAlerts.length > 5 ? "high" : lowStockAlerts.length > 2 ? "medium" : "low",
          description: "物料可用量低于安全库存阈值（100），需及时补货",
          details: lowStockAlerts,
          actionLabel: "跳转到库存页",
          actionPath: "/warehouse/inventory",
          testid: "alert-stock"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        AlertCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(EventBusy, { color: "error" }),
          title: "逾期订单",
          count: overdueOrders.length,
          severity: overdueOrders.length > 5 ? "high" : overdueOrders.length > 2 ? "medium" : "low",
          description: "已超过期望交货日期但未完成的订单",
          details: overdueOrders,
          actionLabel: "跳转到销售订单",
          actionPath: "/sales/orders",
          testid: "alert-overdue"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        AlertCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptLong, { color: "warning" }),
          title: "临期物料",
          count: expiringBatches.length,
          severity: expiringBatches.length > 3 ? "high" : expiringBatches.length > 0 ? "medium" : "low",
          description: "批次物料到期日 < 30 天，需关注处理",
          details: expiringBatches,
          actionLabel: "跳转到批次管理",
          actionPath: "/warehouse/batch",
          testid: "alert-expiry"
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        AlertCard,
        {
          icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CreditCardOff, { color: "error" }),
          title: "信用超额",
          count: creditOverdue.length,
          severity: creditOverdue.length > 2 ? "high" : creditOverdue.length > 0 ? "medium" : "low",
          description: "客户已使用信用额度超过授信额度",
          details: creditOverdue,
          actionLabel: "跳转到意向客户",
          actionPath: "/sales/prospects",
          testid: "alert-credit"
        }
      ) })
    ] })
  ] });
};
export {
  AlertMonitor as default
};
