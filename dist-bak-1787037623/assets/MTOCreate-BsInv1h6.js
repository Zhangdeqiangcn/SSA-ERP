import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { e as useSalesStore } from "./index-CU2cqxc8.js";
import { u as useProductionStore } from "./productionStore-3WoghQIz.js";
import { u as useBOMStore } from "./bomStore-Gzuh4wJM.js";
import { m as Box, T as Typography, bl as Alert, bm as Button, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const fmt = (n) => "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function MTOCreate() {
  const { salesOrders, updateSalesOrder } = useSalesStore();
  const { workOrders, addWorkOrder } = useProductionStore();
  const { bomList } = useBOMStore();
  const [open, setOpen] = reactExports.useState(false);
  const [selSoId, setSelSoId] = reactExports.useState("");
  const [qty, setQty] = reactExports.useState(10);
  const candidates = reactExports.useMemo(
    () => salesOrders.filter((s) => s.status === "confirmed" || s.status === "in_production"),
    [salesOrders]
  );
  const so = candidates.find((s) => s.id === selSoId);
  const handleGenerate = () => {
    if (!so) return;
    const item = so.items[0];
    const bom = bomList.find((b) => b.productCode === (item == null ? void 0 : item.materialCode)) || bomList[0];
    const woNo = `WO-MTO-${Date.now()}`;
    const wo = {
      id: `wo-${Date.now()}`,
      orderNo: woNo,
      status: "released",
      productCode: (item == null ? void 0 : item.materialCode) ?? "PRD-FRAME-001",
      productName: (item == null ? void 0 : item.materialName) ?? so.customerName,
      bomId: (bom == null ? void 0 : bom.id) ?? "bom-001",
      bomNo: (bom == null ? void 0 : bom.bomNo) ?? "BOM-2024-001",
      routeId: "route-001",
      routeNo: "R-2024-001",
      plannedQuantity: qty,
      completedQuantity: 0,
      scrapQuantity: 0,
      plannedStartDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      plannedEndDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      priority: "normal",
      workshop: "总装车间",
      supervisor: "—",
      sourceSalesOrderId: so.id,
      note: `由销售订单 ${so.orderNo} 一键生成（MTO）`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    addWorkOrder(wo);
    updateSalesOrder(so.id, {
      linkedWorkOrders: [
        ...so.linkedWorkOrders || [],
        { workOrderId: wo.id, workOrderNo: wo.orderNo, status: "released", productName: wo.productName, quantity: qty }
      ],
      status: "in_production"
    });
    setOpen(false);
    setSelSoId("");
    setQty(10);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "mto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "销售订单 → 工单（MTO 一键生成）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "按单生产（MTO）：从已确认的销售订单一键生成生产工单，并回写 sourceSalesOrderId 与销售订单关联工单，实现订单溯源。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "mto-open", variant: "contained", onClick: () => setOpen(true), sx: { mb: 2 }, children: "生成工单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "销售订单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "客户" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "已关联工单" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: candidates.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "mto-so-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.orderNo }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: s.customerName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(s.grandTotal) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: s.status, color: "primary" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          (s.linkedWorkOrders || []).length,
          " 个"
        ] })
      ] }, s.id)) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "从销售订单生成工单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", select: true, label: "选择销售订单", value: selSoId, onChange: (e) => setSelSoId(e.target.value), children: candidates.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: s.id, children: [
          s.orderNo,
          " / ",
          s.customerName
        ] }, s.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, margin: "dense", label: "生产数量", type: "number", value: qty, onChange: (e) => setQty(Number(e.target.value)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "mto-confirm", onClick: handleGenerate, disabled: !so, children: "生成" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mt: 3 }, children: "已生成工单（含 MTO 溯源）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, sx: { mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工单号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "产品" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "来源销售订单" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: workOrders.filter((w) => w.sourceSalesOrderId).map((w) => {
        var _a;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "mto-wo-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.orderNo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.productName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: w.plannedQuantity }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: ((_a = candidates.find((s) => s.id === w.sourceSalesOrderId)) == null ? void 0 : _a.orderNo) ?? w.sourceSalesOrderId })
        ] }, w.id);
      }) })
    ] }) })
  ] });
}
export {
  MTOCreate as default
};
