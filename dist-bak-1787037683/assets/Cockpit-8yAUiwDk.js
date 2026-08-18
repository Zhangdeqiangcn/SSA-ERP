import { u as useTheme, r as reactExports, j as jsxRuntimeExports, B as Box, bK as Stack, cc as TrendingUp, h as Typography, aL as Chip, bX as Grid, bq as Card, br as CardContent, bk as Button, cm as BarChart, b7 as Dialog, b8 as DialogTitle, aJ as IconButton, aS as CloseIcon, ba as DialogContent, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
import { e as useSalesStore, u as useMaterialStore, c as useWarehouseStore, b as usePurchaseStore } from "./index-CcOZBoQL.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
const fmtMoney = (n) => "¥" + n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
const fmtNum = (n) => n.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
function Cockpit() {
  const theme = useTheme();
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const materials = useMaterialStore((s) => s.materials);
  const inventory = useWarehouseStore((s) => s.inventoryRecords);
  const workOrders = useProductionStore((s) => s.workOrders);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);
  const [openKpi, setOpenKpi] = reactExports.useState(null);
  const priceMap = reactExports.useMemo(() => {
    const m = {};
    materials.forEach((mat) => m[mat.id] = mat.price || 0);
    return m;
  }, [materials]);
  const kpis = reactExports.useMemo(() => {
    const activeSales = salesOrders.filter((s) => s.status !== "cancelled");
    const revenue = activeSales.reduce((a, s) => a + (s.grandTotal || 0), 0);
    const estCOGS = activeSales.reduce(
      (a, s) => a + (s.items || []).reduce((b, it) => b + (it.quantity || 0) * (priceMap[it.materialId] || 0), 0),
      0
    );
    const grossMargin = revenue > 0 ? (revenue - estCOGS) / revenue : 0;
    const wip = workOrders.filter((w) => w.status === "released" || w.status === "in_progress");
    const inventoryRows = inventory.map((r) => ({
      ...r,
      amount: (r.quantity || 0) * (priceMap[r.materialId] || 0)
    }));
    const inventoryAmount = inventoryRows.reduce((a, r) => a + (r.amount || 0), 0);
    const inventorySku = new Set(inventoryRows.map((r) => r.materialId)).size;
    const arRows = activeSales.map((s) => ({
      ...s,
      received: s.receivedAmount || 0,
      ar: (s.grandTotal || 0) - (s.receivedAmount || 0)
    }));
    const ar = arRows.reduce((a, r) => a + r.ar, 0);
    const pendingPurchase = purchaseRequests.filter(
      (p) => p.status === "draft" || p.status === "pending"
    );
    const salesRows = activeSales.map((s) => ({ ...s })).sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0)).slice(0, 20);
    return [
      {
        key: "revenue",
        label: "营业收入",
        value: fmtMoney(revenue),
        sub: `销售订单 ${activeSales.length} 笔`,
        color: theme.palette.primary.main,
        drillTitle: "营业收入 · 销售订单明细（Top 20）",
        columns: [
          { label: "订单号", render: (r) => r.orderNo },
          { label: "客户", render: (r) => r.customerName },
          { label: "价税合计", render: (r) => fmtMoney(r.grandTotal || 0) },
          { label: "状态", render: (r) => r.status }
        ],
        rows: salesRows
      },
      {
        key: "margin",
        label: "预估毛利率",
        value: (grossMargin * 100).toFixed(1) + "%",
        sub: `预估成本 ${fmtMoney(estCOGS)}`,
        color: theme.palette.success.main,
        drillTitle: "预估毛利率 · 基于物料标准价估算",
        columns: [
          { label: "指标", render: () => "营业收入 / 预估成本" },
          { label: "数值", render: () => `${fmtMoney(revenue)} / ${fmtMoney(estCOGS)}` }
        ],
        rows: [{ _: 1 }]
      },
      {
        key: "wip",
        label: "在产工单",
        value: fmtNum(wip.length),
        sub: `工单总数 ${workOrders.length}`,
        color: theme.palette.warning.main,
        drillTitle: "在产工单 · 已下达/进行中",
        columns: [
          { label: "工单号", render: (r) => r.orderNo },
          { label: "产品", render: (r) => r.productName || r.productCode },
          { label: "计划数", render: (r) => fmtNum(r.plannedQuantity || 0) },
          { label: "状态", render: (r) => r.status }
        ],
        rows: wip
      },
      {
        key: "inventory",
        label: "库存金额",
        value: fmtMoney(inventoryAmount),
        sub: `SKU ${inventorySku} 种`,
        color: theme.palette.info.main,
        drillTitle: "库存金额 · 按库存记录（金额=数量×物料标准价）",
        columns: [
          { label: "物料", render: (r) => r.materialName },
          { label: "仓库", render: (r) => r.warehouseName || r.warehouseId },
          { label: "数量", render: (r) => fmtNum(r.quantity || 0) },
          { label: "金额", render: (r) => fmtMoney(r.amount || 0) }
        ],
        rows: inventoryRows.sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 20)
      },
      {
        key: "ar",
        label: "应收账款",
        value: fmtMoney(ar),
        sub: `未收 ${activeSales.length} 笔`,
        color: theme.palette.error.main,
        drillTitle: "应收账款 · 价税合计−已收",
        columns: [
          { label: "订单号", render: (r) => r.orderNo },
          { label: "客户", render: (r) => r.customerName },
          { label: "价税合计", render: (r) => fmtMoney(r.grandTotal || 0) },
          { label: "未收", render: (r) => fmtMoney(r.ar) }
        ],
        rows: arRows.filter((r) => r.ar > 0).sort((a, b) => b.ar - a.ar).slice(0, 20)
      },
      {
        key: "purchase",
        label: "待批采购申请",
        value: fmtNum(pendingPurchase.length),
        sub: `申请总数 ${purchaseRequests.length}`,
        color: theme.palette.secondary.main,
        drillTitle: "待批采购申请 · 草稿/待审",
        columns: [
          { label: "申请号", render: (r) => r.requestNo },
          { label: "标题", render: (r) => r.title },
          { label: "状态", render: (r) => r.status }
        ],
        rows: pendingPurchase
      }
    ];
  }, [salesOrders, materials, inventory, workOrders, purchaseRequests, priceMap, theme]);
  const monthlyRevenue = reactExports.useMemo(() => {
    const now = /* @__PURE__ */ new Date();
    const points = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({ month: `${d.getMonth() + 1}月`, qty: 0 });
    }
    const base = 11;
    activeSalesForTrend(salesOrders).forEach((s) => {
      const d = new Date(s.orderDate);
      if (isNaN(d.getTime())) return;
      const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
      if (idx >= 0 && idx < 12) points[base - idx].qty += s.grandTotal || 0;
    });
    return points;
  }, [salesOrders]);
  const activeKpi = kpis.find((k) => k.key === openKpi) || null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "cockpit", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { color: "primary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "经营驾驶舱" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "实时聚合各模块数据", color: "primary", variant: "outlined" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: kpis.map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Card,
      {
        sx: {
          cursor: "pointer",
          borderLeft: `4px solid ${k.color}`,
          "&:hover": { boxShadow: 6 }
        },
        onClick: () => setOpenKpi(k.key),
        "data-testid": `kpi-${k.key}`,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: k.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { color: k.color, my: 0.5 }, children: k.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: k.sub }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: (e) => {
            e.stopPropagation();
            setOpenKpi(k.key);
          }, children: "钻取明细" }) })
        ] })
      }
    ) }, k.key)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { sx: { mt: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1 }, children: "月度营收趋势（近 12 个月）" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: "100%", height: 320 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        BarChart,
        {
          xAxis: [{ scaleType: "band", data: monthlyRevenue.map((p) => p.month) }],
          series: [{ data: monthlyRevenue.map((p) => Math.round(p.qty)), label: "营收(元)", color: theme.palette.primary.main }],
          height: 300
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: !!activeKpi, onClose: () => setOpenKpi(null), maxWidth: "md", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        activeKpi == null ? void 0 : activeKpi.drillTitle,
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setOpenKpi(null), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: activeKpi && /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: activeKpi.columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.label }, c.label)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: activeKpi.rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: activeKpi.columns.length, align: "center", children: "暂无数据" }) }) : activeKpi.rows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { "data-testid": "kpi-drill-row", children: activeKpi.columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: c.render(row) }, c.label)) }, i)) })
      ] }) })
    ] })
  ] });
}
function activeSalesForTrend(salesOrders) {
  return salesOrders.filter((s) => s.status !== "cancelled");
}
export {
  Cockpit as default
};
