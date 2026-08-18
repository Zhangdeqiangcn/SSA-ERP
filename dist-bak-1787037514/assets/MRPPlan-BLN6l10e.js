import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, T as Typography, bm as Button, eF as default_1, ch as LinearProgress, bY as Grid, cy as default_1$1, eG as default_1$2, eH as default_1$3, bs as Card, bt as CardContent, bl as Alert, aS as Paper, n as Divider, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, eI as default_1$4, eJ as default_1$5, cX as Checkbox, p as Tooltip, cJ as Snackbar } from "./vendor-mui-UhJuRAfR.js";
import { b as usePurchaseStore, e as useSalesStore, u as useMaterialStore } from "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import "./vendor-date-DpsB6iVy.js";
import { u as useProductionStore } from "./productionStore-B8YnWPVr.js";
import { u as useBOMStore } from "./bomStore-CeDOOVVk.js";
import "./vendor-C0Ken1ns.js";
const PRIORITY_CONFIG = {
  urgent: { label: "紧急", color: "error" },
  high: { label: "高", color: "warning" },
  normal: { label: "正常", color: "default" }
};
const EXCLUDED_SO_STATUS = /* @__PURE__ */ new Set(["completed", "cancelled"]);
const TERMINAL_PO_STATUS = /* @__PURE__ */ new Set(["received", "closed", "cancelled"]);
const MAX_BOM_DEPTH = 10;
function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function computeNetRequirements(salesOrders, materials, bomList, purchaseOrders) {
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const bomByProductId = new Map(bomList.map((b) => [b.productId, b]));
  const grossDemand = /* @__PURE__ */ new Map();
  const demandDateByMaterial = /* @__PURE__ */ new Map();
  const recordDemand = (materialId, soDate) => {
    if (!soDate) return;
    const cur = demandDateByMaterial.get(materialId);
    if (!cur || soDate < cur) demandDateByMaterial.set(materialId, soDate);
  };
  const explode = (materialId, qty, depth, soDate) => {
    if (depth > MAX_BOM_DEPTH) return;
    const bom = bomByProductId.get(materialId);
    if (bom && bom.items && bom.items.length > 0) {
      for (const item of bom.items) {
        const need = qty * item.quantity;
        const childBom = bomByProductId.get(item.materialId);
        if (childBom && item.materialId !== materialId) {
          explode(item.materialId, need, depth + 1, soDate);
        } else {
          grossDemand.set(item.materialId, (grossDemand.get(item.materialId) ?? 0) + need);
          recordDemand(item.materialId, soDate);
        }
      }
    } else {
      grossDemand.set(materialId, (grossDemand.get(materialId) ?? 0) + qty);
      recordDemand(materialId, soDate);
    }
  };
  for (const so of salesOrders) {
    if (EXCLUDED_SO_STATUS.has(so.status)) continue;
    for (const line of so.items) {
      explode(line.materialId, line.quantity, 0, so.expectedDeliveryDate);
    }
  }
  const onOrder = /* @__PURE__ */ new Map();
  for (const po of purchaseOrders) {
    if (TERMINAL_PO_STATUS.has(po.status)) continue;
    for (const li of po.items) {
      const remaining = li.orderedQuantity - li.deliveredQuantity;
      if (remaining > 0) {
        onOrder.set(li.materialId, (onOrder.get(li.materialId) ?? 0) + remaining);
      }
    }
  }
  const fallbackDate = fmtDate(addDays(/* @__PURE__ */ new Date(), 30));
  const rows = [];
  for (const [materialId, gross] of grossDemand) {
    const mat = materialById.get(materialId);
    if (!mat) continue;
    const onHand = mat.currentStock;
    const oo = onOrder.get(materialId) ?? 0;
    const safetyStock = mat.safetyStock ?? 0;
    const net = Math.max(0, gross + safetyStock - onHand - oo);
    const lotSize = mat.lotSize && mat.lotSize > 1 ? mat.lotSize : 0;
    const moq = mat.moq ?? 0;
    let planned = net;
    if (lotSize > 0 && net > 0) {
      planned = Math.ceil(net / lotSize) * lotSize;
    }
    if (moq > 0 && planned < moq) planned = moq;
    if (net === 0) planned = 0;
    const isMake = mat.makeOrBuy === "manufacture";
    const effLead = isMake ? mat.cycleTime ?? mat.leadTime ?? 0 : mat.leadTime ?? 0;
    const demandDate = demandDateByMaterial.get(materialId) ?? fallbackDate;
    const releaseDate = effLead > 0 ? fmtDate(addDays(parseDate(demandDate), -effLead)) : demandDate;
    rows.push({
      materialId,
      materialCode: mat.code,
      materialName: mat.name,
      unit: mat.unit,
      gross,
      onHand,
      onOrder: oo,
      safetyStock,
      net,
      planned,
      lotSize,
      leadTime: effLead,
      demandDate,
      releaseDate
    });
  }
  rows.sort((a, b) => b.net - a.net);
  return rows;
}
function MRPPlan() {
  useNavigate();
  const { mrpRecommendations, addWorkOrder } = useProductionStore();
  const { addPurchaseRequest } = usePurchaseStore();
  const { bomList } = useBOMStore();
  const [lastCalcTime, setLastCalcTime] = reactExports.useState("2024-05-10 14:30");
  const [loading, setLoading] = reactExports.useState(false);
  const [selectedIds, setSelectedIds] = reactExports.useState(/* @__PURE__ */ new Set());
  const [snackbar, setSnackbar] = reactExports.useState("");
  const [mrpResult, setMrpResult] = reactExports.useState([]);
  const [hasComputed, setHasComputed] = reactExports.useState(false);
  const handleCompute = () => {
    setLoading(true);
    setSelectedIds(/* @__PURE__ */ new Set());
    setTimeout(() => {
      const { salesOrders } = useSalesStore.getState();
      const { materials } = useMaterialStore.getState();
      const { bomList: boms } = useBOMStore.getState();
      const { purchaseOrders } = usePurchaseStore.getState();
      const rows = computeNetRequirements(salesOrders, materials, boms, purchaseOrders);
      setMrpResult(rows);
      setHasComputed(true);
      const now = /* @__PURE__ */ new Date();
      setLastCalcTime(now.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
    }, 300);
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === mrpRecommendations.length) {
      setSelectedIds(/* @__PURE__ */ new Set());
    } else {
      setSelectedIds(new Set(mrpRecommendations.map((m) => m.id)));
    }
  };
  const selectedRows = mrpRecommendations.filter((m) => selectedIds.has(m.id));
  const selectedPurchase = selectedRows.filter((m) => m.type === "purchase");
  const selectedManufacture = selectedRows.filter((m) => m.type === "manufacture");
  const handleGenPurchaseRequest = () => {
    var _a;
    if (selectedPurchase.length === 0) {
      setSnackbar('请选择类型为"采购"的MRP建议');
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const nowDate = now.split("T")[0];
    const seq = String(Date.now()).slice(-6);
    const requestId = `pr-mrp-${Date.now()}`;
    const requestNo = `PR-MRP-${seq}`;
    const totalAmount = selectedPurchase.reduce((sum, m) => {
      return sum + m.suggestedQuantity * 100;
    }, 0);
    addPurchaseRequest({
      id: requestId,
      requestNo,
      title: `MRP自动生成采购申请 - ${nowDate}`,
      applicant: "MRP系统",
      department: "生产部",
      type: "material",
      priority: selectedPurchase.some((m) => m.priority === "urgent") ? "urgent" : "normal",
      reason: "根据MRP运算结果自动生成",
      expectedDate: ((_a = selectedPurchase[0]) == null ? void 0 : _a.suggestedDate) || nowDate,
      status: "draft",
      totalAmount,
      projectNo: void 0,
      projectName: void 0,
      createdAt: now,
      updatedAt: now,
      items: selectedPurchase.map((m, i) => ({
        id: `pri-mrp-${i}`,
        materialId: `mat-${m.materialCode}`,
        materialCode: m.materialCode,
        materialName: m.materialName,
        specification: "",
        unit: m.unit,
        quantity: m.suggestedQuantity,
        estimatedPrice: 100,
        estimatedAmount: m.suggestedQuantity * 100,
        deliveryDate: m.suggestedDate,
        remarks: m.reason
      }))
    });
    selectedPurchase.forEach((m) => {
      useProductionStore.getState().deleteMrpRecommendation(m.id);
    });
    setSelectedIds(/* @__PURE__ */ new Set());
    setSnackbar(`已生成采购申请 ${requestNo}，共 ${selectedPurchase.length} 条物料`);
  };
  const handleGenWorkOrder = () => {
    if (selectedManufacture.length === 0) {
      setSnackbar('请选择类型为"生产"的MRP建议');
      return;
    }
    const productGroups = /* @__PURE__ */ new Map();
    selectedManufacture.forEach((m) => {
      const key = m.materialCode;
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key).push(m);
    });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let woCount = 0;
    const findBOM = (materialCode) => bomList.find((b) => b.productCode === materialCode);
    productGroups.forEach((items, materialCode) => {
      const firstItem = items[0];
      const bom = findBOM(materialCode);
      const seq = String(Date.now() + woCount).slice(-8);
      const woId = `wo-mrp-${Date.now()}-${woCount}`;
      const woNo = `WO-MRP-${seq}`;
      const neededQty = items.reduce((sum, m) => sum + m.suggestedQuantity, 0);
      addWorkOrder({
        id: woId,
        orderNo: woNo,
        status: "draft",
        productCode: materialCode,
        productName: firstItem.materialName,
        bomId: (bom == null ? void 0 : bom.id) || "",
        bomNo: (bom == null ? void 0 : bom.bomNo) || "",
        routeId: "",
        routeNo: "",
        plannedQuantity: neededQty,
        completedQuantity: 0,
        scrapQuantity: 0,
        plannedStartDate: now.split("T")[0],
        plannedEndDate: firstItem.suggestedDate,
        priority: items.some((m) => m.priority === "urgent") ? "urgent" : "normal",
        workshop: "生产一车间",
        supervisor: "",
        note: "根据MRP运算结果自动生成",
        createdAt: now,
        updatedAt: now
      });
      woCount++;
    });
    selectedManufacture.forEach((m) => {
      useProductionStore.getState().deleteMrpRecommendation(m.id);
    });
    setSelectedIds(/* @__PURE__ */ new Set());
    setSnackbar(`已生成 ${woCount} 张生产工单`);
  };
  const urgentCount = mrpRecommendations.filter((m) => m.priority === "urgent").length;
  const purchaseCount = mrpRecommendations.filter((m) => m.type === "purchase").length;
  const makeCount = mrpRecommendations.filter((m) => m.type === "manufacture").length;
  const netCount = mrpResult.filter((r) => r.net > 0).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 3, gap: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, children: "MRP 物料需求计划" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "mrp", currentStatus: "mrp_result" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
        "上次运算：",
        lastCalcTime
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          "data-testid": "mrp-compute",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}),
          onClick: handleCompute,
          disabled: loading,
          size: "small",
          children: loading ? "运算中..." : "计算净需求"
        }
      )
    ] }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { sx: { mb: 2 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
      { label: "建议采购", value: purchaseCount, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, {}), color: "#1976d2" },
      { label: "建议生产", value: makeCount, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, {}), color: "#388e3c" },
      { label: "紧急需求", value: urgentCount, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$3, {}), color: "#d32f2f" },
      { label: "建议总数", value: mrpRecommendations.length, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), color: "#7b1fa2" }
    ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { p: 2, "&:last-child": { pb: 2 } }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color }, children: kpi.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: kpi.label })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 700, sx: { color: kpi.color }, children: kpi.value })
    ] }) }) }, kpi.label)) }),
    urgentCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mb: 2 }, children: [
      "发现 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: urgentCount }),
      " 条紧急物料需求，请尽快处理！"
    ] }),
    !hasComputed ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 3 }, children: [
      "点击右上角「计算净需求」，系统将基于",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "活跃销售订单" }),
      "（排除已关闭/取消）经 ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "BOM 多级展开" }),
      "， 结合",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "现有库存" }),
      "与",
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "在途采购" }),
      "，计算各物料的净需求与计划订单量。"
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "净需求计算结果" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Typography,
          {
            variant: "caption",
            color: "text.secondary",
            "data-testid": "mrp-summary",
            children: [
              "共 ",
              netCount,
              " 个物料存在净需求"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料编码" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "毛需求" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "现有库存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "在途" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "净需求" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "计划订单量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "安全库存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "批量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "提前期(天)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "需求日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "建议下单日期" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: mrpResult.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "mrp-result-row", hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.materialCode }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.materialName }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
            row.gross,
            " ",
            row.unit
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
            row.onHand,
            " ",
            row.unit
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
            row.onOrder,
            " ",
            row.unit
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "body2",
              fontWeight: 600,
              color: row.net > 0 ? "error.main" : "text.secondary",
              "data-testid": "mrp-net",
              children: row.net > 0 ? `${row.net} ${row.unit}` : "0"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "body2",
              fontWeight: 600,
              color: row.planned > 0 ? "primary.main" : "text.secondary",
              "data-testid": "mrp-planned",
              children: row.planned > 0 ? `${row.planned} ${row.unit}` : "无需补充"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: row.net > 0 && row.onHand < row.safetyStock ? "error.main" : "text.secondary", children: [
            row.safetyStock,
            " ",
            row.unit
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.lotSize > 0 ? `${row.lotSize} ${row.unit}` : "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.leadTime > 0 ? `${row.leadTime}` : "—" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.demandDate }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", fontWeight: 600, color: "secondary.main", children: row.releaseDate }) })
        ] }, row.materialId)) })
      ] }) })
    ] }),
    selectedIds.size > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1,
      mb: 2,
      bgcolor: "#EFF6FF",
      borderRadius: 2,
      border: "1px solid rgba(59,130,246,.2)"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `已选 ${selectedIds.size} 条`, size: "small", sx: { bgcolor: "#DBEAFE", color: "#3B82F6", fontWeight: 600 } }),
      selectedPurchase.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "small",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$4, { sx: { fontSize: 14 } }),
          onClick: handleGenPurchaseRequest,
          sx: { fontSize: "0.8125rem", color: "#2563EB" },
          children: [
            "生成采购申请 (",
            selectedPurchase.length,
            ")"
          ]
        }
      ),
      selectedManufacture.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "small",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$5, { sx: { fontSize: 14 } }),
          onClick: handleGenWorkOrder,
          sx: { fontSize: "0.8125rem", color: "#16A34A" },
          children: [
            "生成生产工单 (",
            selectedManufacture.length,
            ")"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: () => setSelectedIds(/* @__PURE__ */ new Set()), sx: { fontSize: "0.8125rem", color: "#94A3B8" }, children: "取消选择" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "需求明细" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
          "共 ",
          mrpRecommendations.length,
          " 条建议"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "grey.50" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { padding: "checkbox", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Checkbox,
            {
              size: "small",
              checked: selectedIds.size === mrpRecommendations.length && mrpRecommendations.length > 0,
              indeterminate: selectedIds.size > 0 && selectedIds.size < mrpRecommendations.length,
              onChange: toggleSelectAll
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料编码" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "类型" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "优先级" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "当前库存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "安全库存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "需求量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "在途量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "建议量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "建议日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "原因说明" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: mrpRecommendations.map((row) => {
          const priorConf = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.normal;
          const stockAlert = row.currentStock < row.safetyStock;
          const isSelected = selectedIds.has(row.id);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TableRow,
            {
              hover: true,
              selected: isSelected,
              onClick: () => toggleSelect(row.id),
              sx: {
                bgcolor: row.priority === "urgent" ? "error.50" : "inherit",
                cursor: "pointer"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { padding: "checkbox", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { size: "small", checked: isSelected, onChange: () => toggleSelect(row.id) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.materialCode }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.materialName }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    icon: row.type === "purchase" ? /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$1, { sx: { fontSize: "0.9rem !important" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(default_1$2, { sx: { fontSize: "0.9rem !important" } }),
                    label: row.type === "purchase" ? "采购" : "生产",
                    size: "small",
                    color: row.type === "purchase" ? "info" : "success",
                    variant: "outlined"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: priorConf.label, size: "small", color: priorConf.color }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: stockAlert ? "低于安全库存" : "", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: stockAlert ? "error.main" : "text.primary", fontWeight: stockAlert ? 600 : 400, children: [
                  row.currentStock,
                  " ",
                  row.unit
                ] }) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  row.safetyStock,
                  " ",
                  row.unit
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  row.requiredQuantity,
                  " ",
                  row.unit
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  row.onOrderQuantity,
                  " ",
                  row.unit
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, color: row.suggestedQuantity > 0 ? "primary.main" : "text.secondary", children: row.suggestedQuantity > 0 ? `${row.suggestedQuantity} ${row.unit}` : "无需补充" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.suggestedDate }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { maxWidth: 200 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.reason }) })
              ]
            },
            row.id
          );
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: !!snackbar,
        autoHideDuration: 4e3,
        onClose: () => setSnackbar(""),
        message: snackbar,
        anchorOrigin: { vertical: "bottom", horizontal: "center" }
      }
    )
  ] });
}
export {
  MRPPlan as default
};
