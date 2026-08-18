import { r as reactExports, j as jsxRuntimeExports, h as Typography, bK as Stack, B as Box, aL as Chip, bV as CheckCircle, a4 as Schedule, b7 as Dialog, b8 as DialogTitle, i as Divider, ba as DialogContent, bX as Grid, bz as Stepper, bA as Step, bB as StepLabel, bj as Alert, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, da as LocationOn, bC as DialogActions, bk as Button, bt as TextField, aJ as IconButton, bc as Delete, bf as Add, M as LocalShipping } from "./vendor-46QZWBd3.js";
import { m as useFlowStore, c as useWarehouseStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { F as FilterBar } from "./FilterBar-Dnzbdei4.js";
import { A as ActionBar } from "./ActionBar-CfsPxjQd.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { a as formatDate } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { g as getVendorPortalIdentity } from "./vendorPortalIdentity-TflReCDn.js";
import "./StatusBadge-Db1uY4YU.js";
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const dateCode = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};
const rand3 = () => String(Math.floor(Math.random() * 900) + 100);
const identity = getVendorPortalIdentity();
const DEFAULT_VENDOR_ID = (identity == null ? void 0 : identity.vendorId) || "ven-001";
const DEFAULT_VENDOR_NAME = (identity == null ? void 0 : identity.vendorName) || "上海宝钢钢铁贸易有限公司";
const statusMap = {
  preparing: { label: "备货中", color: "warning", step: 0 },
  shipped: { label: "已发货", color: "info", step: 1 },
  in_transit: { label: "运输中", color: "info", step: 2 },
  arrived: { label: "已到达", color: "success", step: 3 },
  signed: { label: "已签收", color: "success", step: 4 }
};
const trackSteps = ["备货", "发货", "运输中", "到达目的地", "签收完成"];
const ShipmentDetailDialog = ({ open, shipment, onClose }) => {
  var _a;
  const { updateDeliveryShipment } = useFlowStore();
  const { inboundOrders, addInboundOrder } = useWarehouseStore();
  if (!shipment) return null;
  const currentStep = ((_a = statusMap[shipment.status]) == null ? void 0 : _a.step) ?? 0;
  const inbound = inboundOrders.find(
    (o) => o.id === shipment.inboundOrderId || o.sourceNo && o.sourceNo === shipment.purchaseOrderNo
  );
  const events = [
    { label: "已发货揽收", time: shipment.shipDate, done: true, color: "#3B82F6" },
    {
      label: "运输途中",
      time: shipment.status === "in_transit" ? "运输中" : shipment.estimatedArrival || "",
      done: ["in_transit", "arrived", "signed"].includes(shipment.status),
      color: "#6366F1"
    },
    {
      label: "到达目的地",
      time: shipment.actualArrival || shipment.estimatedArrival,
      done: ["arrived", "signed"].includes(shipment.status),
      color: "#F59E0B"
    },
    {
      label: "客户签收",
      time: shipment.actualArrival || "",
      done: shipment.status === "signed",
      color: "#10B981"
    }
  ];
  if (inbound) {
    events.push({
      label: `仓库已收货（${inbound.inboundNo}）`,
      time: inbound.inboundDate,
      done: inbound.status === "completed" || inbound.status === "processing",
      color: "#10B981"
    });
  }
  const handleSign = () => {
    updateDeliveryShipment(shipment.id, { status: "signed", actualArrival: todayStr() });
  };
  const handleWarehouseReceive = () => {
    const inboundId = `in-${Date.now()}`;
    const inboundNo = `IN${dateCode()}${rand3()}`;
    addInboundOrder({
      id: inboundId,
      inboundNo,
      type: "purchase",
      sourceNo: shipment.purchaseOrderNo,
      vendorId: shipment.vendorId,
      vendorName: shipment.vendorName,
      status: "completed",
      warehouseId: "wh-001",
      warehouseName: shipment.receivingWarehouse,
      orgId: "org-001",
      operator: "仓储管理员",
      inboundDate: todayStr(),
      items: shipment.items.map((it) => ({
        id: `ibi-${it.id}`,
        materialId: "",
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        expectedQuantity: it.shippedQty,
        actualQuantity: it.shippedQty,
        qualityStatus: "qualified"
      })),
      remarks: "供应商门户发货自动入库",
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: shipment.vendorId,
      updatedBy: shipment.vendorId
    });
    updateDeliveryShipment(shipment.id, { inboundOrderId: inboundId, status: "signed", actualArrival: todayStr() });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600 }, children: [
      "物流跟踪 — ",
      shipment.shipmentNo
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "采购订单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, sx: { fontFamily: "monospace" }, children: shipment.purchaseOrderNo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "供应商" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: shipment.vendorName })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "物流公司" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: shipment.logisticsCompany })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "快递/运单号" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, sx: { fontFamily: "monospace", color: "#3B82F6" }, children: shipment.trackingNo })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "发货日期" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: formatDate(shipment.shipDate) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "预计到达" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: formatDate(shipment.estimatedArrival) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 2 }, children: "物流进度" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep: currentStep, alternativeLabel: true, sx: { mb: 3 }, children: trackSteps.map((label, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Step, { completed: i <= currentStep, children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabel, { children: label }) }, label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1 }, children: "物流轨迹" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { pl: 0.5 }, children: events.map((ev, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, sx: { position: "relative", pb: idx < events.length - 1 ? 2 : 0 }, children: [
        idx < events.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { position: "absolute", left: 7, top: 16, bottom: 0, width: 2, bgcolor: "#E2E8F0" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Box,
          {
            sx: {
              width: 16,
              height: 16,
              borderRadius: "50%",
              mt: 0.5,
              flexShrink: 0,
              bgcolor: ev.done ? ev.color || "#3B82F6" : "#CBD5E1",
              boxShadow: ev.done ? `0 0 0 3px ${ev.color || "#3B82F6"}22` : "none"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, sx: { color: ev.done ? "#1E293B" : "#94A3B8" }, children: ev.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: ev.time ? formatDate(ev.time) : ev.done ? "待更新" : "未开始" })
        ] })
      ] }, idx)) }),
      inbound ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "success", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { fontSize: "inherit" }), sx: { mt: 1, mb: 2 }, children: [
        "仓库已收货：入库单 ",
        inbound.inboundNo,
        "（",
        inbound.warehouseName,
        "），入库日期 ",
        formatDate(inbound.inboundDate),
        "，状态 ",
        inbound.status === "completed" ? "已完成" : "处理中",
        "。"
      ] }) : shipment.status === "signed" && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 1, mb: 2 }, children: "尚未收到仓库入库回执，可点击下方「模拟仓库入库」以演示仓储备货过账。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1 }, children: "货物明细" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, elevation: 0, sx: { border: "1px solid rgba(226,232,240,.8)", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料编码" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "规格" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "发货数量" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "right", children: "包装数量" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: shipment.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: item.materialCode,
              size: "small",
              sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.75rem" }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 500 }, children: item.materialName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontSize: "0.8rem", color: "#64748B" }, children: item.specification }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            item.shippedQty,
            " ",
            item.unit
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { align: "right", children: [
            item.packagingQty,
            " 包"
          ] })
        ] }, item.id)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 2, p: 2, bgcolor: "#F8FAFC", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LocationOn, { sx: { fontSize: 16, color: "#3B82F6" } }),
        "收货地址：",
        shipment.receivingAddress,
        "（",
        shipment.receivingWarehouse,
        "）"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "关闭" }),
      shipment.status === "arrived" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "success", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}), onClick: handleSign, children: "确认签收" }),
      shipment.status === "signed" && !inbound && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", color: "info", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}), onClick: handleWarehouseReceive, children: "模拟仓库入库" })
    ] })
  ] });
};
const NewShipmentDialog = ({ open, onClose }) => {
  const { addDeliveryShipment } = useFlowStore();
  const [form, setForm] = reactExports.useState({
    purchaseOrderNo: "",
    logisticsCompany: "",
    trackingNo: "",
    shipDate: todayStr(),
    estimatedArrival: "",
    remarks: ""
  });
  const [items, setItems] = reactExports.useState([
    { materialCode: "", materialName: "", specification: "", unit: "", shippedQty: "0", packagingQty: "0" }
  ]);
  const updateItem = (idx, field, value) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const addRow = () => setItems((prev) => [...prev, { materialCode: "", materialName: "", specification: "", unit: "", shippedQty: "0", packagingQty: "0" }]);
  const removeRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const handleSubmit = () => {
    if (!form.purchaseOrderNo || !form.logisticsCompany || !form.trackingNo) {
      alert("请填写关联采购订单号、物流公司与运单号");
      return;
    }
    const validItems = items.filter((it) => it.materialCode);
    if (validItems.length === 0) {
      alert("请至少填写一个物料行");
      return;
    }
    const shipment = {
      id: `shp-${Date.now()}`,
      shipmentNo: `SHP${dateCode()}${rand3()}`,
      purchaseOrderId: "",
      purchaseOrderNo: form.purchaseOrderNo,
      vendorId: DEFAULT_VENDOR_ID,
      vendorName: DEFAULT_VENDOR_NAME,
      logisticsCompany: form.logisticsCompany,
      trackingNo: form.trackingNo,
      shipper: DEFAULT_VENDOR_NAME,
      shipDate: form.shipDate,
      estimatedArrival: form.estimatedArrival,
      status: "shipped",
      items: validItems.map((it, idx) => ({
        id: `shi-${idx}-${Date.now()}`,
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        shippedQty: Number(it.shippedQty) || 0,
        packagingQty: Number(it.packagingQty) || 0
      })),
      receivingWarehouse: "主仓库-A区",
      receivingAddress: "上海市浦东新区工业园区88号",
      remarks: form.remarks,
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: DEFAULT_VENDOR_ID,
      updatedBy: DEFAULT_VENDOR_ID
    };
    const whState = useWarehouseStore.getState();
    const existingAsn = whState.inboundOrders.find(
      (o) => o.type === "asn" && o.asnShipmentNo === shipment.shipmentNo
    );
    if (!existingAsn) {
      whState.addInboundOrder({
        id: `asn-${shipment.shipmentNo}`,
        inboundNo: `ASN${shipment.shipmentNo.replace(/^SHP/, "")}`,
        type: "asn",
        sourceNo: shipment.purchaseOrderNo,
        asnShipmentNo: shipment.shipmentNo,
        vendorId: shipment.vendorId,
        vendorName: shipment.vendorName,
        status: "in_transit",
        warehouseId: "wh-001",
        warehouseName: shipment.receivingWarehouse,
        orgId: "org-001",
        operator: shipment.vendorName,
        inboundDate: shipment.shipDate,
        items: shipment.items.map((it) => ({
          id: `asi-${it.id}`,
          materialId: "",
          materialCode: it.materialCode,
          materialName: it.materialName,
          specification: it.specification,
          unit: it.unit,
          expectedQuantity: it.shippedQty,
          actualQuantity: 0,
          qualityStatus: "qualified"
        })),
        remarks: "供应商门户发货通知自动生成 ASN 在途预告",
        createdAt: nowStr(),
        updatedAt: nowStr(),
        createdBy: shipment.vendorId,
        updatedBy: shipment.vendorId
      });
    }
    addDeliveryShipment(shipment);
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建发货通知" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "关联采购订单号 *", value: form.purchaseOrderNo, onChange: (e) => setForm({ ...form, purchaseOrderNo: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物流公司 *", value: form.logisticsCompany, onChange: (e) => setForm({ ...form, logisticsCompany: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "运单号 *", value: form.trackingNo, onChange: (e) => setForm({ ...form, trackingNo: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "发货日期 *", type: "date", InputLabelProps: { shrink: true }, value: form.shipDate, onChange: (e) => setForm({ ...form, shipDate: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "预计到达日期", type: "date", InputLabelProps: { shrink: true }, value: form.estimatedArrival, onChange: (e) => setForm({ ...form, estimatedArrival: e.target.value }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "备注", multiline: true, rows: 2, value: form.remarks, onChange: (e) => setForm({ ...form, remarks: e.target.value }) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mt: 2, mb: 1 }, children: "发货物料明细" }),
      items.map((it, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 1.5, mb: 1.5, borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 1.5, alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物料编码 *", value: it.materialCode, onChange: (e) => updateItem(idx, "materialCode", e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "物料名称", value: it.materialName, onChange: (e) => updateItem(idx, "materialName", e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 2, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "规格", value: it.specification, onChange: (e) => updateItem(idx, "specification", e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "单位", value: it.unit, onChange: (e) => updateItem(idx, "unit", e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "数量", type: "number", value: it.shippedQty, onChange: (e) => updateItem(idx, "shippedQty", e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 1.5, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "箱数", type: "number", value: it.packagingQty, onChange: (e) => updateItem(idx, "packagingQty", e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => removeRow(idx), disabled: items.length === 1, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
      ] }) }, idx)),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: addRow, children: "添加物料行" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}), onClick: handleSubmit, "data-testid": "submit-shipment-btn", children: "提交发货通知" })
    ] })
  ] });
};
const DeliveryShipmentList = () => {
  const { deliveryShipments } = useFlowStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const selected = deliveryShipments.find((s) => s.id === selectedId) || null;
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "shipmentNo",
      header: "发货单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#3B82F6", fontWeight: 500, fontFamily: "monospace" }, children: row.original.shipmentNo })
    },
    {
      accessorKey: "purchaseOrderNo",
      header: "采购订单",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: "0.8rem", color: "#64748B" }, children: row.original.purchaseOrderNo })
    },
    { accessorKey: "vendorName", header: "供应商" },
    { accessorKey: "logisticsCompany", header: "物流公司" },
    {
      accessorKey: "trackingNo",
      header: "运单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: "0.8rem", color: "#10B981" }, children: row.original.trackingNo })
    },
    {
      accessorKey: "items",
      header: "货物",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 0.3, children: row.original.items.slice(0, 1).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: item.materialCode,
            size: "small",
            sx: { bgcolor: "#EFF6FF", color: "#1D4ED8", fontFamily: "monospace", fontSize: "0.7rem" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", children: [
          item.shippedQty,
          " ",
          item.unit
        ] })
      ] }, item.id)) })
    },
    { accessorKey: "shipDate", header: "发货日期", cell: ({ row }) => formatDate(row.original.shipDate) },
    { accessorKey: "estimatedArrival", header: "预计到达", cell: ({ row }) => formatDate(row.original.estimatedArrival) },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default", icon: (s == null ? void 0 : s.step) >= 4 ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: "14px !important" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Schedule, { sx: { fontSize: "14px !important" } }) });
      }
    }
  ], []);
  const filterFields = [
    { name: "shipmentNo", label: "发货单号", type: "text" },
    { name: "purchaseOrderNo", label: "采购订单号", type: "text" },
    { name: "vendorName", label: "供应商", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "preparing", label: "备货中" },
        { value: "shipped", label: "已发货" },
        { value: "in_transit", label: "运输中" },
        { value: "arrived", label: "已到达" },
        { value: "signed", label: "已签收" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...deliveryShipments];
    if (filterData.shipmentNo) data = data.filter((d) => d.shipmentNo.includes(filterData.shipmentNo));
    if (filterData.purchaseOrderNo) data = data.filter((d) => d.purchaseOrderNo.includes(filterData.purchaseOrderNo));
    if (filterData.vendorName) data = data.filter((d) => d.vendorName.includes(filterData.vendorName));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "发货物流管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "vendor-order", currentStatus: "vo_shipped" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ActionBar, { primary: { label: "新建发货通知", onClick: () => setNewOpen(true) } })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            onView: (row) => setSelectedId(row.id),
            onEdit: (row) => setSelectedId(row.id)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShipmentDetailDialog, { open: Boolean(selected), shipment: selected, onClose: () => setSelectedId(null) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NewShipmentDialog, { open: newOpen, onClose: () => setNewOpen(false) })
      ]
    }
  );
};
export {
  DeliveryShipmentList as default
};
