import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, aL as Chip, bj as Alert, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, k as Tooltip, bk as Button, bO as Payment, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bX as Grid, bt as TextField, bC as DialogActions, es as Calculate } from "./vendor-46QZWBd3.js";
import { c as useWarehouseStore, a as useVendorStore, b as usePurchaseStore } from "./index-CcOZBoQL.js";
const genId = () => `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ConsignmentStockPage = () => {
  var _a, _b;
  useWarehouseStore((s) => s.inventoryRecords);
  useVendorStore((s) => s.vendors);
  const { addPurchaseOrder } = usePurchaseStore();
  const [consignmentRecords, setConsignmentRecords] = reactExports.useState([
    {
      id: "cs-001",
      vendorId: "V001",
      vendorName: "宝钢股份",
      vendorCode: "BG001",
      materialId: "M001",
      materialCode: "SPCC-1.0",
      materialName: "冷轧板 SPCC 1.0",
      specification: "1.0×1250×C",
      unit: "吨",
      agreedUnitPrice: 5200,
      consignedQty: 500,
      consumedQty: 320,
      balanceQty: 180,
      warehouseId: "WH001",
      warehouseName: "原料仓A"
    },
    {
      id: "cs-002",
      vendorId: "V002",
      vendorName: "鞍钢集团",
      vendorCode: "AG001",
      materialId: "M002",
      materialCode: "Q235B-2.0",
      materialName: "热轧卷 Q235B 2.0",
      specification: "2.0×1500×C",
      unit: "吨",
      agreedUnitPrice: 4800,
      consignedQty: 300,
      consumedQty: 120,
      balanceQty: 180,
      warehouseId: "WH001",
      warehouseName: "原料仓A"
    },
    {
      id: "cs-003",
      vendorId: "V003",
      vendorName: "首钢集团",
      vendorCode: "SG001",
      materialId: "M003",
      materialCode: "DX51D-0.8",
      materialName: "镀锌板 DX51D 0.8",
      specification: "0.8×1250×C",
      unit: "吨",
      agreedUnitPrice: 6200,
      consignedQty: 200,
      consumedQty: 80,
      balanceQty: 120,
      warehouseId: "WH002",
      warehouseName: "原料仓B"
    }
  ]);
  const [settleDialog, setSettleDialog] = reactExports.useState(false);
  const [settleRecord, setSettleRecord] = reactExports.useState(null);
  const [settleQty, setSettleQty] = reactExports.useState(0);
  const openSettle = (record) => {
    setSettleRecord(record);
    setSettleQty(record.balanceQty);
    setSettleDialog(true);
  };
  const handleSettle = () => {
    if (!settleRecord || settleQty <= 0) return;
    const totalAmount = settleQty * (settleRecord.agreedUnitPrice || 0);
    const orderNo = `PO-CS-${Date.now()}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    addPurchaseOrder({
      id: `po-cs-${Date.now()}`,
      orderNo,
      vendorId: settleRecord.vendorId,
      vendorName: settleRecord.vendorName,
      status: "created",
      orderMode: "consignment",
      orderDate: now.slice(0, 10),
      expectedDeliveryDate: now.slice(0, 10),
      items: [{
        id: genId(),
        materialId: settleRecord.materialId,
        materialCode: settleRecord.materialCode || "",
        materialName: settleRecord.materialName || "",
        specification: settleRecord.specification || "",
        unit: settleRecord.unit || "吨",
        orderedQuantity: settleQty,
        deliveredQuantity: 0,
        unitPrice: settleRecord.agreedUnitPrice || 0,
        amount: totalAmount
      }],
      totalAmount,
      paymentTerms: "寄售结算",
      tradeTerms: "",
      deliveryAddress: "",
      remarks: `寄售消耗结算 - ${settleRecord.vendorName} - ${settleRecord.materialName}`,
      createdAt: now,
      updatedAt: now,
      createdBy: "当前用户",
      updatedBy: "当前用户"
    });
    setConsignmentRecords(
      (prev) => prev.map(
        (r) => r.id === settleRecord.id ? { ...r, consumedQty: r.consumedQty + settleQty, balanceQty: r.consignedQty - (r.consumedQty + settleQty) } : r
      )
    );
    setSettleDialog(false);
    alert(`消耗结算采购订单 ${orderNo} 已生成，金额 ¥${totalAmount.toLocaleString()}`);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { maxWidth: 1200, mx: "auto" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", children: "寄售库存管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "P2-06", size: "small", color: "primary", variant: "outlined" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 3 }, children: "寄售库存：供应商将物料寄存于我方仓库，消耗时按约定单价自动生成采购订单结算。 寄存数量 = 已消耗 + 结存。消耗结算后自动回写消耗数量。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "供应商" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "约定单价" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "寄存数量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "已消耗" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "结存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "仓库" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: consignmentRecords.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 10, align: "center", children: "暂无寄售库存记录" }) }) : consignmentRecords.map((record) => {
        var _a2;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: record.vendorName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: record.vendorCode })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: record.materialName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: record.materialCode })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: record.specification || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: record.unit }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            "¥",
            ((_a2 = record.agreedUnitPrice) == null ? void 0 : _a2.toLocaleString()) || "-"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: record.consignedQty.toLocaleString() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: record.consumedQty.toLocaleString(),
              size: "small",
              color: "warning",
              variant: "outlined"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              fontWeight: 600,
              color: record.balanceQty > 0 ? "success.main" : "text.primary",
              children: record.balanceQty.toLocaleString()
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: record.warehouseName || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "消耗结算：消耗数量 × 约定单价 → 生成采购订单", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              variant: "outlined",
              color: "primary",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Payment, {}),
              onClick: () => openSettle(record),
              disabled: record.balanceQty <= 0,
              children: "消耗结算"
            }
          ) }) })
        ] }, record.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: settleDialog, onClose: () => setSettleDialog(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "消耗结算" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: settleRecord && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "供应商", value: settleRecord.vendorName, InputProps: { readOnly: true } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物料", value: `${settleRecord.materialName}`, InputProps: { readOnly: true } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "约定单价", value: `¥${(_a = settleRecord.agreedUnitPrice) == null ? void 0 : _a.toLocaleString()}`, InputProps: { readOnly: true } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "结存数量", value: settleRecord.balanceQty.toLocaleString(), InputProps: { readOnly: true } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "结算数量",
            type: "number",
            value: settleQty,
            onChange: (e) => setSettleQty(Math.min(Number(e.target.value), settleRecord.balanceQty)),
            inputProps: { max: settleRecord.balanceQty, min: 1 }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { bgcolor: "action.hover", p: 1.5, borderRadius: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            "结算金额 = ",
            settleQty.toLocaleString(),
            " × ¥",
            (_b = settleRecord.agreedUnitPrice) == null ? void 0 : _b.toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", color: "primary", children: [
            "¥",
            (settleQty * (settleRecord.agreedUnitPrice || 0)).toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "结算后将自动生成寄售模式的采购订单" })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setSettleDialog(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, {}), onClick: handleSettle, disabled: settleQty <= 0, children: "确认结算" })
      ] })
    ] })
  ] });
};
export {
  ConsignmentStockPage as default
};
