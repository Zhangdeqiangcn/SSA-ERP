import { r as reactExports, j as jsxRuntimeExports, bX as Grid, aP as Paper, h as Typography, bj as Alert, bN as Warning, B as Box, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, S as Star, cl as LinearProgress, aL as Chip } from "./vendor-DGU5TO-x.js";
import { e as useSalesStore } from "./index-DeeqqmHA.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useCustomerStore } from "./customerStore-D75PJy1n.js";
const CLASS_CONFIG = {
  A: { label: "A类(核心客户)", color: "#EF4444", bg: "#FEE2E2" },
  B: { label: "B类(重要客户)", color: "#F59E0B", bg: "#FFFBEB" },
  C: { label: "C类(一般客户)", color: "#10B981", bg: "#ECFDF5" }
};
const dayDiff = (d) => {
  const now = /* @__PURE__ */ new Date();
  return Math.round((now.getTime() - new Date(d).getTime()) / 864e5);
};
const CustomerABC = () => {
  const { salesOrders } = useSalesStore();
  const { customers } = useCustomerStore();
  const analysis = reactExports.useMemo(() => {
    const customerSales = {};
    salesOrders.forEach((order) => {
      const key = order.customerName || order.customerId || "unknown";
      if (!customerSales[key]) {
        customerSales[key] = {
          customerId: order.customerId || "",
          customerName: order.customerName || "未知",
          customerCode: order.customerCode || "",
          totalAmount: 0,
          orderCount: 0,
          lastOrderDate: order.orderDate || order.createdAt || ""
        };
      }
      const entry = customerSales[key];
      entry.totalAmount += order.totalAmount || 0;
      entry.orderCount++;
      const orderDate = order.orderDate || order.createdAt || "";
      if (orderDate > entry.lastOrderDate) {
        entry.lastOrderDate = orderDate;
      }
    });
    customers.forEach((c) => {
      if (!customerSales[c.name] && !customerSales[c.id]) {
        customerSales[c.name] = {
          customerId: c.id,
          customerName: c.name,
          customerCode: c.code || "",
          totalAmount: 0,
          orderCount: 0,
          lastOrderDate: ""
        };
      }
    });
    let sorted = Object.values(customerSales).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalSales = sorted.reduce((sum, c) => sum + c.totalAmount, 0);
    let cumulative = 0;
    const classified = sorted.map((item) => {
      cumulative += item.totalAmount;
      const pct = totalSales > 0 ? cumulative / totalSales : 0;
      let cls = "C";
      if (pct <= 0.7) cls = "A";
      else if (pct <= 0.9) cls = "B";
      return { ...item, cumulativePct: pct, cls };
    });
    (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const churnCustomers = classified.filter((c) => {
      if (!c.lastOrderDate || c.totalAmount === 0) return false;
      return dayDiff(c.lastOrderDate) > 90;
    });
    const classCount = { A: 0, B: 0, C: 0 };
    const classValue = { A: 0, B: 0, C: 0 };
    classified.forEach((c) => {
      classCount[c.cls]++;
      classValue[c.cls] += c.totalAmount;
    });
    return { items: classified, totalSales, classCount, classValue, churnCustomers };
  }, [salesOrders, customers]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "客户 ABC 分析", subtitle: "按销售额分类客户，识别核心客户与流失风险", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: ["A", "B", "C"].map((cls) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: CLASS_CONFIG[cls].bg }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: CLASS_CONFIG[cls].color }, children: analysis.classCount[cls] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: CLASS_CONFIG[cls].label }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", display: "block", color: "text.secondary", children: [
        "销售额：",
        analysis.classValue[cls].toLocaleString(),
        " 元"
      ] })
    ] }) }, cls)) }),
    analysis.churnCustomers.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", sx: { mb: 3 }, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
        "客户流失预警：",
        analysis.churnCustomers.length,
        " 个客户超过90天未下单！"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: analysis.churnCustomers.map((c) => c.customerName).join("、") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 2 }, "data-testid": "cabc-table", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid #E5E7EB" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "客户 ABC 分类明细（按销售额排名：A类前70% / B类70-90% / C类90-100%）" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "排名" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "客户名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "订单数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "销售额(元)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "销售额占比" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "累计占比" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "分类" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "最近下单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "流失预警" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
          analysis.items.map((item, idx) => {
            const salesPct = analysis.totalSales > 0 ? item.totalAmount / analysis.totalSales * 100 : 0;
            const churnDays = item.lastOrderDate ? dayDiff(item.lastOrderDate) : 0;
            const isChurn = churnDays > 90 && item.totalAmount > 0;
            const cfg = CLASS_CONFIG[item.cls];
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: { bgcolor: isChurn ? "#FFF5F5" : void 0 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: idx + 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
                item.cls === "A" && /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { sx: { fontSize: 16, color: cfg.color } }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: item.customerName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: item.customerCode })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: item.orderCount }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 600, color: cfg.color, children: item.totalAmount.toLocaleString() }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LinearProgress,
                  {
                    variant: "determinate",
                    value: Math.min(salesPct, 100),
                    sx: {
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "#E5E7EB",
                      "& .MuiLinearProgress-bar": { bgcolor: cfg.color }
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
                  salesPct.toFixed(1),
                  "%"
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
                (item.cumulativePct * 100).toFixed(1),
                "%"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: cfg.label,
                  sx: { bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.lastOrderDate ? item.lastOrderDate.slice(0, 10) : "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { "data-testid": "cabc-churn", children: isChurn ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: `${churnDays}天未下单`,
                  sx: { bgcolor: "#FEE2E2", color: "#DC2626", fontWeight: 600 }
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "正常", sx: { bgcolor: "#ECFDF5", color: "#10B981" } }) })
            ] }, idx);
          }),
          analysis.items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 9, align: "center", sx: { py: 4, color: "#94A3B8" }, children: "暂无客户销售数据" }) })
        ] })
      ] }) })
    ] })
  ] });
};
export {
  CustomerABC as default
};
