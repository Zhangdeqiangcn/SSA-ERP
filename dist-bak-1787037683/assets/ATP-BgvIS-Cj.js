import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, bt as TextField, aO as MenuItem, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore, c as useWarehouseStore, e as useSalesStore } from "./index-CcOZBoQL.js";
import { u as useWarehouseAdvancedStore } from "./warehouseAdvancedStore-BrWnd5bC.js";
function computeATP(input) {
  const { materialId, warehouseId, material, inventoryRecords, salesOrders, inboundOrders, qualityHolds = [] } = input;
  const inWh = (r) => !warehouseId || r.warehouseId === warehouseId;
  const onHandRaw = inventoryRecords.filter((r) => r.materialId === materialId && inWh(r)).reduce((s, r) => s + r.quantity, 0);
  const holdQty = qualityHolds.filter((h) => h.materialId === materialId && h.status !== "passed" && inWh(h)).reduce((s, h) => s + h.quantity, 0);
  const onHand = Math.max(0, onHandRaw - holdQty);
  const committed = salesOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled" && o.status !== "fully_shipped").flatMap((o) => o.items).filter((it) => it.materialId === materialId).reduce((s, it) => s + Math.max(0, (it.quantity || 0) - (it.deliveredQuantity || 0)), 0);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const base = {
    materialId,
    materialCode: (material == null ? void 0 : material.code) || "",
    materialName: (material == null ? void 0 : material.name) || "",
    warehouseId,
    date: todayStr,
    onHand,
    committed,
    incoming: 0,
    availableQty: Math.max(0, onHand - committed)
  };
  const incomingByDate = /* @__PURE__ */ new Map();
  inboundOrders.filter((o) => o.type === "purchase" && o.status !== "completed").forEach((o) => {
    o.items.filter((it) => it.materialId === materialId).forEach((it) => {
      const d = o.inboundDate || todayStr;
      incomingByDate.set(d, (incomingByDate.get(d) || 0) + (it.expectedQuantity || 0));
    });
  });
  const rows = [base];
  let running = base.availableQty;
  Array.from(incomingByDate.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).forEach(([date, qty]) => {
    running += qty;
    rows.push({
      materialId,
      materialCode: (material == null ? void 0 : material.code) || "",
      materialName: (material == null ? void 0 : material.name) || "",
      warehouseId,
      date,
      onHand,
      committed,
      incoming: qty,
      availableQty: running
    });
  });
  return rows;
}
function ATPPage() {
  const { materials } = useMaterialStore();
  const { inventoryRecords, inboundOrders } = useWarehouseStore();
  const { qualityHolds } = useWarehouseAdvancedStore();
  const { salesOrders } = useSalesStore();
  const [materialId, setMaterialId] = reactExports.useState("");
  const selected = reactExports.useMemo(() => materials.find((m) => m.id === materialId), [materials, materialId]);
  const atp = reactExports.useMemo(() => {
    if (!materialId) return [];
    return computeATP({
      materialId,
      material: selected,
      inventoryRecords,
      salesOrders,
      inboundOrders,
      qualityHolds
    });
  }, [materialId, selected, inventoryRecords, salesOrders, inboundOrders, qualityHolds]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "atp", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "可用量承诺（ATP）" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "基于当前库存、未发运销售订单承诺量与在途采购入库，按入库日期分层计算可承诺量。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TextField,
      {
        fullWidth: true,
        margin: "dense",
        select: true,
        label: "选择物料",
        value: materialId,
        onChange: (e) => setMaterialId(e.target.value),
        "data-testid": "atp-material",
        sx: { maxWidth: 420, mb: 2 },
        children: materials.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: m.id, children: [
          m.code,
          " ",
          m.name
        ] }, m.id))
      }
    ),
    selected && /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "日期" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "当前在手" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "承诺量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "本期在途" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "可用量(ATP)" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: atp.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "atp-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.date }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.onHand }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.committed }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.incoming }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: r.availableQty }) })
      ] }, i)) })
    ] }) })
  ] });
}
export {
  ATPPage as default
};
