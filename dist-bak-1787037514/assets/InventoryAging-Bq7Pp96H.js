import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { c as useWarehouseStore, u as useMaterialStore } from "./index-hTLNcGoC.js";
import "./vendor-date-DpsB6iVy.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { c2 as Tabs, c3 as Tab, bl as Alert, aS as Paper, T as Typography, m as Box, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, bO as Warning, a8 as Schedule, bY as Grid } from "./vendor-mui-UhJuRAfR.js";
import { B as BarChart } from "./vendor-charts-CTjfnoPO.js";
import "./vendor-C0Ken1ns.js";
const BUCKETS = [
  { key: "b0", label: "0-30天", min: 0, max: 30, color: "#10B981" },
  { key: "b1", label: "31-90天", min: 31, max: 90, color: "#3B82F6" },
  { key: "b2", label: "91-180天", min: 91, max: 180, color: "#F59E0B" },
  { key: "b3", label: "180天以上", min: 181, max: Infinity, color: "#EF4444" }
];
const dayDiff = (a, b) => {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.max(0, Math.round((db - da) / 864e5));
};
const ABC_LABEL = {
  A: { label: "A类(核心)", color: "#EF4444" },
  B: { label: "B类(重要)", color: "#F59E0B" },
  C: { label: "C类(一般)", color: "#10B981" }
};
const InventoryAging = () => {
  const { batchRecords, inventoryRecords } = useWarehouseStore();
  const { materials } = useMaterialStore();
  const [tabValue, setTabValue] = reactExports.useState(0);
  const refDate = reactExports.useMemo(() => {
    const dates = [
      ...batchRecords.map((b) => b.inboundDate),
      ...inventoryRecords.map((r) => r.lastInboundDate).filter(Boolean)
    ].filter(Boolean);
    return dates.length ? dates.sort().slice(-1)[0] : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }, [batchRecords, inventoryRecords]);
  const bucketAgg = reactExports.useMemo(() => {
    const agg = { b0: 0, b1: 0, b2: 0, b3: 0 };
    batchRecords.forEach((b) => {
      const age = dayDiff(b.inboundDate, refDate);
      const bucket = BUCKETS.find((x) => age >= x.min && age <= x.max);
      if (bucket) agg[bucket.key] += b.quantity;
    });
    return agg;
  }, [batchRecords, refDate]);
  const batchDetail = reactExports.useMemo(
    () => batchRecords.map((b) => ({ ...b, age: dayDiff(b.inboundDate, refDate) })).sort((a, b) => b.age - a.age),
    [batchRecords, refDate]
  );
  const expiringBatches = batchRecords.filter((b) => b.status === "expiring" || b.status === "expired");
  const invDetail = reactExports.useMemo(
    () => inventoryRecords.map((r) => ({ ...r, age: dayDiff(r.lastInboundDate || refDate, refDate) })).sort((a, b) => b.age - a.age),
    [inventoryRecords, refDate]
  );
  const chartData = BUCKETS.map((b) => bucketAgg[b.key]);
  const abcData = reactExports.useMemo(() => {
    const stockItems = inventoryRecords.map((r) => {
      const material = materials.find((m) => m.code === r.materialCode || m.id === r.materialId);
      const price = (material == null ? void 0 : material.price) || 0;
      const value = r.quantity * price;
      return { ...r, value, materialName: (material == null ? void 0 : material.name) || r.materialName, price };
    }).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const totalValue = stockItems.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;
    const classified = stockItems.map((item) => {
      cumulative += item.value;
      const pct = cumulative / totalValue;
      let cls = "C";
      if (pct <= 0.7) cls = "A";
      else if (pct <= 0.9) cls = "B";
      return { ...item, cumulativePct: pct, cls };
    });
    const classCount = { A: 0, B: 0, C: 0 };
    const classValue = { A: 0, B: 0, C: 0 };
    classified.forEach((item) => {
      classCount[item.cls]++;
      classValue[item.cls] += item.value;
    });
    return { items: classified, totalValue, classCount, classValue };
  }, [inventoryRecords, materials]);
  const slowMoving = reactExports.useMemo(() => {
    return invDetail.filter((r) => r.age > 90).map((r) => {
      const material = materials.find((m) => m.code === r.materialCode || m.id === r.materialId);
      const value = r.quantity * ((material == null ? void 0 : material.price) || 0);
      return { ...r, value };
    }).sort((a, b) => b.value - a.value);
  }, [invDetail, materials]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "库龄分析",
      subtitle: "库存库龄分层、ABC分析与呆滞料预警",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tabValue, onChange: (_, v) => setTabValue(v), sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "库龄分布" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "ABC分析" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "呆滞料预警" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [
          "数据基准日：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: refDate }),
          "（取批次与库存最新入库日期）。库龄按批次入库日期计算。"
        ] }),
        tabValue === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 3, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "批次库龄分布（按数量）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { height: 320 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              BarChart,
              {
                xAxis: [{ scaleType: "band", data: BUCKETS.map((b) => b.label) }],
                series: [{ data: chartData, color: "#3B82F6", valueFormatter: (v) => `${v} 单位` }],
                height: 300
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, mb: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "批次库龄明细" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "批次号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库龄(天)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "库龄区间" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "入库日期" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: batchDetail.map((b) => {
                const bucket = BUCKETS.find((x) => b.age >= x.min && b.age <= x.max);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: b.batchNo }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.materialName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: b.quantity }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 500, children: b.age }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: bucket == null ? void 0 : bucket.label,
                      size: "small",
                      sx: { bgcolor: ((bucket == null ? void 0 : bucket.color) || "#94A3B8") + "15", color: (bucket == null ? void 0 : bucket.color) || "#94A3B8", fontWeight: 500 }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.inboundDate })
                ] }, b.id);
              }) })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, mb: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)", display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { color: "#F59E0B", fontSize: 20 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "效期预警（临期 / 已过期批次）" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "批次号" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "效期" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "建议" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                expiringBatches.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", children: b.batchNo }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.materialName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.expiryDate }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: b.status === "expired" ? "已过期" : "临期",
                      size: "small",
                      sx: { bgcolor: (b.status === "expired" ? "#EF4444" : "#F59E0B") + "15", color: b.status === "expired" ? "#EF4444" : "#F59E0B", fontWeight: 500 }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: b.status === "expired" ? "立即冻结并做报废/退货处理" : "优先出库，避免过期损失" }) })
                ] }, b.id)),
                expiringBatches.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, align: "center", sx: { py: 3, color: "#94A3B8" }, children: "暂无临期/过期批次" }) })
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)", display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Schedule, { sx: { color: "#3B82F6", fontSize: 20 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "库存物料库龄（按最新入库日期）" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库存数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "单位" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库龄(天)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "库龄区间" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "最新入库" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: invDetail.map((r) => {
                const bucket = BUCKETS.find((x) => r.age >= x.min && r.age <= x.max);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: r.materialName }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: r.materialCode })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.quantity }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.unit }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 500, children: r.age }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: bucket == null ? void 0 : bucket.label,
                      size: "small",
                      sx: { bgcolor: ((bucket == null ? void 0 : bucket.color) || "#94A3B8") + "15", color: (bucket == null ? void 0 : bucket.color) || "#94A3B8", fontWeight: 500 }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.lastInboundDate || "-" })
                ] }, r.id);
              }) })
            ] }) })
          ] })
        ] }),
        tabValue === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "aging-abc", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: ["A", "B", "C"].map((cls) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: ABC_LABEL[cls].color + "15" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: ABC_LABEL[cls].color }, children: abcData.classCount[cls] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: ABC_LABEL[cls].label }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", display: "block", color: "text.secondary", children: [
              "金额：",
              abcData.classValue[cls].toLocaleString(),
              " 元"
            ] })
          ] }) }, cls)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, mb: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: "ABC 分类明细（按库存金额：A类前70% / B类70-90% / C类90-100%）" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库存数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "单价" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库存金额" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "累计占比" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "分类" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                abcData.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: item.materialName }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: item.materialCode })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: item.quantity }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: item.price.toLocaleString() }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { fontWeight: 500, color: ABC_LABEL[item.cls].color, children: item.value.toLocaleString() }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
                    (item.cumulativePct * 100).toFixed(1),
                    "%"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      size: "small",
                      label: ABC_LABEL[item.cls].label,
                      sx: {
                        bgcolor: ABC_LABEL[item.cls].color + "15",
                        color: ABC_LABEL[item.cls].color,
                        fontWeight: 600
                      }
                    }
                  ) })
                ] }, item.id)),
                abcData.items.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, align: "center", sx: { py: 3, color: "#94A3B8" }, children: "暂无库存数据" }) })
              ] })
            ] }) })
          ] })
        ] }),
        tabValue === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "aging-slow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mb: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
              "呆滞料预警：库龄超过90天未动物料共 ",
              slowMoving.length,
              " 项"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "以下物料超过90天无出库记录，建议优先消耗或处置。" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { px: 2, py: 1.5, borderBottom: "1px solid rgba(226,232,240,.6)", display: "flex", alignItems: "center", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { color: "#EF4444", fontSize: 20 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
                "呆滞料列表（",
                ">",
                "90天未动）"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库存数量" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "单位" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库龄(天)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "库存金额" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "最新入库" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
                slowMoving.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: { bgcolor: "#FFF5F5" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: r.materialName }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: r.materialCode })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: r.quantity }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.unit }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      size: "small",
                      label: `${r.age}天`,
                      sx: {
                        bgcolor: r.age > 180 ? "#EF4444" : "#F59E0B",
                        color: "#fff",
                        fontWeight: 600
                      }
                    }
                  ) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { fontWeight: 600, color: "#EF4444", children: [
                    r.value.toLocaleString(),
                    " 元"
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.lastInboundDate || "-" })
                ] }, r.id)),
                slowMoving.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, align: "center", sx: { py: 3, color: "#94A3B8" }, children: "暂无呆滞物料，库存周转良好" }) })
              ] })
            ] }) })
          ] })
        ] })
      ]
    }
  );
};
export {
  InventoryAging as default
};
