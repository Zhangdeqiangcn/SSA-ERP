import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { e as useSalesStore } from "./index-CU2cqxc8.js";
import { m as Box, T as Typography, bv as TextField, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, bL as Stack, aS as Paper, es as Group, a0 as AttachMoney, c9 as TrendingDown, aO as Chip, n as Divider } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const FUNNEL_STAGES = [
  { key: "intent", label: "意向", statusFilter: ["new"], color: "#3B82F6", bg: "#EFF6FF" },
  { key: "quotation", label: "报价", statusFilter: ["quoted"], color: "#F59E0B", bg: "#FFFBEB" },
  { key: "negotiation", label: "谈判", statusFilter: ["contacted", "negotiating"], color: "#6366F1", bg: "#EEF2FF" },
  { key: "contract", label: "签约", statusFilter: ["won"], color: "#10B981", bg: "#ECFDF5" },
  { key: "closed", label: "成交", statusFilter: ["won"], color: "#059669", bg: "#D1FAE5" }
];
const SalesFunnel = () => {
  const { prospects } = useSalesStore();
  const [salesperson, setSalesperson] = reactExports.useState("");
  const [dateFrom, setDateFrom] = reactExports.useState("");
  const [dateTo, setDateTo] = reactExports.useState("");
  const salespersons = reactExports.useMemo(() => {
    const set = new Set(prospects.map((p) => p.assignedTo).filter(Boolean));
    return Array.from(set).sort();
  }, [prospects]);
  const funnelData = reactExports.useMemo(() => {
    let filtered = prospects.filter((p) => p.status !== "lost");
    if (salesperson) filtered = filtered.filter((p) => p.assignedTo === salesperson);
    if (dateFrom) filtered = filtered.filter((p) => p.createdAt >= dateFrom);
    if (dateTo) filtered = filtered.filter((p) => p.createdAt <= `${dateTo}T23:59:59`);
    return FUNNEL_STAGES.map((stage, idx) => {
      const stageProspects = filtered.filter((p) => stage.statusFilter.includes(p.status));
      const count = stageProspects.length;
      const amount = stageProspects.reduce((sum, p) => sum + (p.estimatedValue || 0), 0);
      const prevCount = idx > 0 ? filtered.filter((p) => FUNNEL_STAGES[idx - 1].statusFilter.includes(p.status)).length : count;
      const conversionRate = prevCount > 0 ? (count / prevCount * 100).toFixed(1) : "100.0";
      return { ...stage, count, amount, conversionRate: parseFloat(conversionRate) };
    });
  }, [prospects, salesperson, dateFrom, dateTo]);
  const maxCount = Math.max(...funnelData.map((d) => d.count), 1);
  const formatCurrency = (v) => {
    if (v >= 1e4) return `¥${(v / 1e4).toFixed(1)}万`;
    return `¥${v.toLocaleString()}`;
  };
  const totalAmount = funnelData[funnelData.length - 1].amount;
  const totalCount = prospects.filter((p) => p.status !== "lost").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "sf-funnel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "销售漏斗分析" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 0.5 }, children: "基于商机阶段追踪销售转化情况" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "开始日期",
            type: "date",
            size: "small",
            value: dateFrom,
            onChange: (e) => setDateFrom(e.target.value),
            InputLabelProps: { shrink: true },
            sx: { width: 160 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "结束日期",
            type: "date",
            size: "small",
            value: dateTo,
            onChange: (e) => setDateTo(e.target.value),
            InputLabelProps: { shrink: true },
            sx: { width: 160 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { width: 160 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "销售员" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "销售员",
              value: salesperson,
              onChange: (e) => setSalesperson(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "全部" }),
                salespersons.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: s, children: s }, s))
              ]
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: "#EFF6FF", border: "1px solid #BFDBFE" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Group, { sx: { color: "#3B82F6" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "意向商机总数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: "#3B82F6" }, children: totalCount })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: "#ECFDF5", border: "1px solid #A7F3D0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, { sx: { color: "#10B981" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "预计成交金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: "#10B981" }, children: formatCurrency(totalAmount) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: "#FEF3C7", border: "1px solid #FDE68A" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { sx: { color: "#D97706" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "整体转化率" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { color: "#D97706" }, children: funnelData[0].count > 0 ? `${(funnelData[funnelData.length - 1].count / funnelData[0].count * 100).toFixed(1)}%` : "0%" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, p: 4, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 3, color: "#1E293B" }, children: "商机转化漏斗" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }, children: funnelData.map((stage, idx) => {
        const widthPercent = maxCount > 0 ? Math.max(stage.count / maxCount * 100, 8) : 8;
        const nextStageCount = idx < funnelData.length - 1 ? funnelData[idx + 1].count : 0;
        const dropCount = stage.count - nextStageCount;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": `sf-stage-${stage.key}`, sx: { width: "100%", maxWidth: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
            display: "flex",
            justifyContent: "center",
            mb: 0.5
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: `${stage.label}`,
                size: "small",
                sx: {
                  bgcolor: stage.bg,
                  color: stage.color,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  px: 1
                }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { ml: 1, fontWeight: 600, color: stage.color }, children: [
              stage.count,
              " 个 · ",
              formatCurrency(stage.amount)
            ] }),
            idx > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { ml: 1, color: "#94A3B8" }, children: [
              "转化率 ",
              stage.conversionRate,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
            display: "flex",
            justifyContent: "center"
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
            width: `${widthPercent}%`,
            minWidth: 40,
            height: 48,
            borderRadius: "6px",
            bgcolor: stage.color,
            background: `linear-gradient(135deg, ${stage.color}, ${stage.color}CC)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "width 0.3s ease",
            position: "relative"
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#fff", fontWeight: 700, fontSize: "0.85rem" }, children: [
            stage.count,
            " 个"
          ] }) }) }),
          idx < funnelData.length - 1 && dropCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 0.5,
            mt: 0.5,
            mb: 0.5
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#EF4444", fontWeight: 500 }, children: [
              "流失 ",
              dropCount,
              " 个"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
              width: "40%",
              height: 1,
              borderTop: "1px dashed #FCA5A5"
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { sx: { fontSize: 14, color: "#EF4444" } })
          ] }),
          idx < funnelData.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "center", my: 0.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingDown, { sx: { color: "#CBD5E1", fontSize: 20 } }) })
        ] }, stage.key);
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2, color: "#1E293B" }, children: "阶段明细" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, flexWrap: "wrap" }, children: funnelData.map((stage) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: {
      flex: 1,
      minWidth: 170,
      borderRadius: 3,
      p: 2.5,
      bgcolor: stage.bg,
      border: `1px solid ${stage.color}30`
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: stage.label,
          size: "small",
          sx: { bgcolor: stage.color, color: "#fff", fontWeight: 700, mb: 1.5 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h5", sx: { fontWeight: 700, color: stage.color }, children: [
          stage.count,
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { component: "span", variant: "caption", sx: { color: "#64748B", ml: 0.5 }, children: "个" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#1E293B" }, children: formatCurrency(stage.amount) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 0.5 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "转化率: ",
          stage.conversionRate,
          "%"
        ] })
      ] })
    ] }, stage.key)) })
  ] });
};
export {
  SalesFunnel as default
};
