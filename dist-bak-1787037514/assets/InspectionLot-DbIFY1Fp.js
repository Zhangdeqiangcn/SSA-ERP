import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useQualityAdvancedStore } from "./qualityAdvancedStore-DzVT3ddD.js";
import { c as useWarehouseStore, d as useQualityStore, a as useVendorStore } from "./index-hTLNcGoC.js";
import { m as Box, T as Typography, bl as Alert, c2 as Tabs, c3 as Tab, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, bm as Button, bY as Grid, bv as TextField, aR as MenuItem } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./vendorRating-DKHWnbxs.js";
import "./priceStore-D4MzJqWs.js";
import "./vendor-date-DpsB6iVy.js";
const LOT_STATUS_LABEL = {
  pending: "待检",
  in_inspection: "检验中",
  passed: "合格",
  failed: "不合格"
};
const COQ_LABEL = {
  prevention: "预防成本",
  appraisal: "鉴定成本",
  internal_failure: "内部失败成本",
  external_failure: "外部失败成本"
};
function InspectionLotPage() {
  const {
    inspectionLots,
    coqRecords,
    qmVendorFeedback,
    judgeLot,
    addCOQ,
    recalcVendorQm
  } = useQualityAdvancedStore();
  const { batchRecords } = useWarehouseStore();
  const { inspectionTasks } = useQualityStore();
  const { vendors } = useVendorStore();
  const [tab, setTab] = reactExports.useState(0);
  const [vendorId, setVendorId] = reactExports.useState("");
  const lotResultByBatch = reactExports.useMemo(() => {
    const map = {};
    inspectionLots.forEach((l) => {
      if (l.batchNo) map[l.batchNo] = LOT_STATUS_LABEL[l.status];
    });
    return map;
  }, [inspectionLots]);
  const vendorName = (id) => {
    var _a;
    return ((_a = vendors.find((v) => v.id === id)) == null ? void 0 : _a.name) ?? id ?? "—";
  };
  const qmImpact = reactExports.useMemo(() => {
    if (!vendorId) return null;
    return recalcVendorQm(vendorId);
  }, [vendorId, qmVendorFeedback, inspectionTasks]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "inspection-lot", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "检验批 / COQ / 批次追溯 / QM评级回流" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "采购入库完成自动生成检验批；判定不合格自动回流供应商评级（写入失败来料检验任务）。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "检验批", "data-testid": "tab-lots" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "质量成本COQ", "data-testid": "tab-coq" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "批次追溯", "data-testid": "tab-trace" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "QM评级回流", "data-testid": "tab-qm" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验批号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "批次" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: inspectionLots.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "lot-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.lotNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.batchNo || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.vendorName || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: l.quantity }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: LOT_STATUS_LABEL[l.status], color: l.status === "failed" ? "error" : l.status === "passed" ? "success" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          l.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "lot-start", onClick: () => judgeLot(l.id, "in_inspection"), children: "开始检验" }),
          l.status === "in_inspection" && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { component: "span", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "success", "data-testid": "lot-pass", onClick: () => judgeLot(l.id, "passed"), children: "合格" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", "data-testid": "lot-fail", onClick: () => judgeLot(l.id, "failed"), children: "不合格" })
          ] })
        ] })
      ] }, l.id)) })
    ] }) }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          sx: { mb: 1 },
          "data-testid": "coq-add",
          onClick: () => addCOQ({
            id: `coq-${Date.now()}`,
            period: "2026-07",
            category: "appraisal",
            costCenter: "质检中心",
            amount: 5e3,
            note: "新增鉴定成本",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            createdBy: "质量部",
            updatedBy: "质量部"
          }),
          children: "新增COQ记录"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "期间" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "类别" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "成本中心" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "金额" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "说明" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: coqRecords.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "coq-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.period }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: COQ_LABEL[r.category] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.costCenter }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.amount.toLocaleString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.note })
        ] }, r.id)) })
      ] }) })
    ] }),
    tab === 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "批次" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验批结果" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: batchRecords.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "trace-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.batchNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.materialName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.quantity }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: b.status }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: lotResultByBatch[b.batchNo] || "—" })
      ] }, b.id)) })
    ] }) }),
    tab === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, alignItems: "center", sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            select: true,
            label: "选择供应商",
            value: vendorId,
            onChange: (e) => setVendorId(e.target.value),
            "data-testid": "qm-vendor",
            children: vendors.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: v.id, children: v.name }, v.id))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 4, children: qmImpact && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
          "来料合格率：",
          qmImpact.qualityPassRate ?? "—",
          "%；回流后评级：",
          qmImpact.gradeAfter,
          "（",
          qmImpact.scoreAfter ?? "—",
          "分）"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验批" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "结果" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "日期" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: qmVendorFeedback.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "qm-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: vendorName(f.vendorId) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.lotNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: f.result === "fail" ? "不合格" : "合格", color: f.result === "fail" ? "error" : "success" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.date })
        ] }, f.id)) })
      ] }) })
    ] })
  ] });
}
export {
  InspectionLotPage as default
};
