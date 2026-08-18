import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { a as useVendorStore, d as useQualityStore, b as usePurchaseStore } from "./index-CU2cqxc8.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as usePriceStore } from "./priceStore-DijJfeBL.js";
import { bY as Grid, aS as Paper, T as Typography, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, m as Box, ch as LinearProgress, aO as Chip } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
const RISK_CONFIG = {
  low: { label: "低风险", color: "success", bg: "#ECFDF5", max: 30 },
  medium: { label: "中风险", color: "warning", bg: "#FFFBEB", max: 60 },
  high: { label: "高风险", color: "error", bg: "#FEF2F2", max: 80 },
  critical: { label: "严重风险", color: "error", bg: "#FEE2E2", max: 100 }
};
const VendorRisk = () => {
  const { vendors } = useVendorStore();
  const { inspectionTasks } = useQualityStore();
  const { purchaseOrders } = usePurchaseStore();
  const { priceList: priceRecords } = usePriceStore();
  const riskScores = reactExports.useMemo(() => {
    const today = /* @__PURE__ */ new Date();
    return vendors.map((vendor) => {
      let certExpired = false;
      let certScore = 100;
      if (vendor.certExpiryDate) {
        const certDate = new Date(vendor.certExpiryDate);
        certExpired = certDate < today;
        const daysToExpiry = Math.round((certDate.getTime() - today.getTime()) / 864e5);
        if (daysToExpiry < 0) certScore = 10;
        else if (daysToExpiry < 30) certScore = 30;
        else if (daysToExpiry < 90) certScore = 50;
        else certScore = 80;
      }
      const vendorInspections = inspectionTasks.filter(
        (t) => t.vendorId === vendor.id || t.vendorName === vendor.name
      );
      const totalInspections = vendorInspections.length;
      const failedInspections = vendorInspections.filter((t) => t.status === "failed").length;
      const defectRate = totalInspections > 0 ? failedInspections / totalInspections : 0;
      const qualityScore = Math.max(0, 100 - defectRate * 100);
      const vendorOrders = purchaseOrders.filter(
        (o) => o.vendorId === vendor.id || o.vendorName === vendor.name
      );
      const completedOrders = vendorOrders.filter(
        (o) => o.status === "completed" || o.status === "delivered"
      );
      const delayedOrders = completedOrders.filter((o) => {
        if (!o.deliveryDate) return false;
        const planned = o.plannedDeliveryDate || o.deliveryDate;
        return new Date(o.deliveryDate) > new Date(planned);
      });
      const delayRate = completedOrders.length > 0 ? delayedOrders.length / completedOrders.length : 0;
      const deliveryScore = Math.max(0, 100 - delayRate * 100);
      const vendorPrices = priceRecords.filter(
        (p) => p.vendorId === vendor.id || p.vendorName === vendor.name
      );
      let priceVolatility = 0;
      let priceScore = 80;
      if (vendorPrices.length >= 2) {
        const sorted = [...vendorPrices].sort(
          (a, b) => new Date(a.recordDate || a.createdAt).getTime() - new Date(b.recordDate || b.createdAt).getTime()
        );
        const prices = sorted.map((p) => p.price || p.unitPrice || 0).filter((p) => p > 0);
        if (prices.length >= 2) {
          const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
          const variance = prices.reduce((s, v) => s + (v - avg) ** 2, 0) / prices.length;
          priceVolatility = avg > 0 ? Math.sqrt(variance) / avg : 0;
          priceScore = Math.max(0, 100 - priceVolatility * 200);
        }
      }
      const totalScore = Math.round(
        (100 - certScore) * 0.25 + (100 - qualityScore) * 0.35 + (100 - deliveryScore) * 0.25 + (100 - priceScore) * 0.15
      );
      let riskLevel = "low";
      if (totalScore > RISK_CONFIG.high.max) riskLevel = "critical";
      else if (totalScore > RISK_CONFIG.medium.max) riskLevel = "high";
      else if (totalScore > RISK_CONFIG.low.max) riskLevel = "medium";
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorCode: vendor.code || "-",
        certExpired,
        certScore,
        defectRate,
        qualityScore,
        delayRate,
        deliveryScore,
        priceVolatility,
        priceScore,
        totalScore,
        riskLevel
      };
    });
  }, [vendors, inspectionTasks, purchaseOrders, priceRecords]);
  const sortedScores = reactExports.useMemo(
    () => [...riskScores].sort((a, b) => b.totalScore - a.totalScore),
    [riskScores]
  );
  const criticalCount = sortedScores.filter((s) => s.riskLevel === "critical").length;
  const highCount = sortedScores.filter((s) => s.riskLevel === "high").length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商风险评分卡", subtitle: "供应商多维度风险评估：资质/质量/交期/价格", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: "#FEE2E2" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#DC2626" }, children: criticalCount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "严重风险" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: "#FEF2F2" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#EF4444" }, children: highCount }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "高风险" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: "#FFFBEB" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#F59E0B" }, children: sortedScores.filter((s) => s.riskLevel === "medium").length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "中风险" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: "#ECFDF5" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#10B981" }, children: sortedScores.filter((s) => s.riskLevel === "low").length }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "低风险" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "资质分数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "质量分数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "交期分数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "价格分数" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "综合风险" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "风险等级" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
        sortedScores.map((score) => {
          const cfg = RISK_CONFIG[score.riskLevel];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: score.vendorName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: score.vendorCode })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "center", "data-testid": "vr-risk-score", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LinearProgress,
                  {
                    variant: "determinate",
                    value: score.certScore,
                    sx: {
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "#E5E7EB",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: score.certScore >= 70 ? "#10B981" : score.certScore >= 40 ? "#F59E0B" : "#EF4444"
                      }
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: score.certScore })
              ] }),
              score.certExpired && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "资质过期", color: "error", sx: { mt: 0.5 } })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LinearProgress,
                  {
                    variant: "determinate",
                    value: score.qualityScore,
                    sx: {
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "#E5E7EB",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: score.qualityScore >= 70 ? "#10B981" : score.qualityScore >= 40 ? "#F59E0B" : "#EF4444"
                      }
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: score.qualityScore })
              ] }),
              score.defectRate > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "error", children: [
                "不良率 ",
                (score.defectRate * 100).toFixed(1),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  LinearProgress,
                  {
                    variant: "determinate",
                    value: score.deliveryScore,
                    sx: {
                      width: 60,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "#E5E7EB",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: score.deliveryScore >= 70 ? "#10B981" : score.deliveryScore >= 40 ? "#F59E0B" : "#EF4444"
                      }
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: score.deliveryScore })
              ] }),
              score.delayRate > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "warning.main", children: [
                "延迟率 ",
                (score.delayRate * 100).toFixed(1),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LinearProgress,
                {
                  variant: "determinate",
                  value: score.priceScore,
                  sx: {
                    width: 60,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: "#E5E7EB",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: score.priceScore >= 70 ? "#10B981" : score.priceScore >= 40 ? "#F59E0B" : "#EF4444"
                    }
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: score.priceScore })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Typography,
              {
                variant: "h6",
                sx: { fontWeight: 700, color: score.totalScore >= 60 ? "#EF4444" : score.totalScore >= 30 ? "#F59E0B" : "#10B981" },
                children: score.totalScore
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                size: "small",
                label: cfg.label,
                sx: {
                  bgcolor: cfg.bg,
                  color: score.riskLevel === "critical" ? "#DC2626" : score.riskLevel === "high" ? "#EF4444" : score.riskLevel === "medium" ? "#F59E0B" : "#10B981",
                  fontWeight: 600
                }
              }
            ) })
          ] }, score.vendorId);
        }),
        sortedScores.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 7, align: "center", sx: { py: 4, color: "#94A3B8" }, children: "暂无供应商数据" }) })
      ] })
    ] }) })
  ] });
};
export {
  VendorRisk as default
};
