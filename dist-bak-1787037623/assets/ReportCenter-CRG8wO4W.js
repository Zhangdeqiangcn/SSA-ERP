import { h as useNavigate, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, cs as default_1, T as Typography, aO as Chip, n as Divider, bY as Grid, bs as Card, f9 as CardActionArea, bt as CardContent, eM as default_1$1, cy as default_1$2, ez as default_1$3, cu as default_1$4, cv as default_1$5, ct as default_1$6 } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const reportGroups = [
  {
    group: "采购与供应链",
    color: "#1976d2",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}),
    reports: [
      { name: "采购汇总报表", desc: "采购金额、订单数量、供应商分布", path: "/purchase/orders", tag: "采购" },
      { name: "供应商评级报表", desc: "供应商绩效评分、交货准时率", path: "/vendor/rating", tag: "供应商" },
      { name: "交期跟踪报表", desc: "在途订单状态、预计到货日期", path: "/purchase/track", tag: "物流" }
    ]
  },
  {
    group: "仓储库存",
    color: "#388e3c",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, {}),
    reports: [
      { name: "库存现状报表", desc: "各物料当前库存量、库位分布", path: "/warehouse/inventory", tag: "仓储" },
      { name: "出入库明细报表", desc: "历史出入库记录统计分析", path: "/warehouse/inbound", tag: "仓储" },
      { name: "库存盘点报告", desc: "盘点差异分析、调整记录", path: "/warehouse/check", tag: "盘点" }
    ]
  },
  {
    group: "质量管理",
    color: "#f57c00",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$4, {}),
    reports: [
      { name: "质量综合报表", desc: "合格率趋势、缺陷分析、供应商质量", path: "/quality/report", tag: "质量" },
      { name: "不合格品统计", desc: "不合格品类型、处置情况", path: "/quality/unqualified", tag: "质量" },
      { name: "PDCA改进追踪", desc: "改进项目进度、效果验证", path: "/quality/pdca", tag: "改进" }
    ]
  },
  {
    group: "生产制造",
    color: "#7b1fa2",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$5, {}),
    reports: [
      { name: "生产综合报表", desc: "产量统计、效率分析、车间对比", path: "/production/report", tag: "生产" },
      { name: "MRP需求计划", desc: "物料需求预测、采购/生产建议", path: "/production/mrp", tag: "MRP" },
      { name: "工单完成情况", desc: "工单进度、完工率、延期分析", path: "/production/orders", tag: "工单" }
    ]
  },
  {
    group: "财务管理",
    color: "#c62828",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$6, {}),
    reports: [
      { name: "财务综合报表", desc: "应付账款、现金流、成本结构", path: "/finance/report", tag: "财务" },
      { name: "科目余额表", desc: "资产负债、收入费用科目汇总", path: "/finance/trial-balance", tag: "会计" },
      { name: "付款计划报表", desc: "应付款项、逾期风险分析", path: "/finance/payments", tag: "付款" },
      { name: "财务报表数据集(BI)", desc: "发票折算本位币 + 跨模块关联分析", path: "/reports/bi", tag: "财务数据集" }
    ]
  }
];
function ReportCenter() {
  const navigate = useNavigate();
  const totalReports = reportGroups.reduce((s, g) => s + g.reports.length, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, { sx: { mr: 1.5, color: "primary.main", fontSize: 28 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "报表中心" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `共 ${totalReports} 个报表`, size: "small", sx: { ml: 2 } })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "集中访问系统各模块的统计分析报表，快速获取业务洞察" }),
    reportGroups.map((group) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: group.color }, children: group.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 600, sx: { color: group.color }, children: group.group }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { flex: 1 } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: group.reports.map((report) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { "&:hover": { boxShadow: 2, borderColor: group.color } }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardActionArea, { onClick: () => navigate(report.path), sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, children: report.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: report.tag, size: "small", sx: { bgcolor: `${group.color}15`, color: group.color, fontSize: "0.65rem" } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: report.desc }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 1.5, display: "flex", alignItems: "center", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { sx: { fontSize: 14, color: group.color } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: group.color }, children: "查看报表" })
        ] })
      ] }) }) }) }, report.name)) })
    ] }, group.group))
  ] });
}
export {
  ReportCenter as default
};
