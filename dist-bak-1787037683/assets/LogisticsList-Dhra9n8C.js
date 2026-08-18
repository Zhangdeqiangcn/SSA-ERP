import { r as reactExports, j as jsxRuntimeExports, B as Box, aP as Paper, h as Typography, bt as TextField, aQ as Search, b7 as Dialog, b8 as DialogTitle, bK as Stack, aJ as IconButton, aS as CloseIcon, ba as DialogContent, bz as Stepper, bA as Step, bB as StepLabel, bX as Grid, bj as Alert, bC as DialogActions, bk as Button, bf as Add, aL as Chip, k as Tooltip, bR as Visibility, aO as MenuItem, M as LocalShipping, eU as FlightTakeoff, eV as DirectionsBoat, eW as DirectionsRailway, eX as DirectionsCar } from "./vendor-46QZWBd3.js";
import { e as useSalesStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import "./StatusBadge-Db1uY4YU.js";
const STATUS_LABELS = {
  pending: "待发货",
  picked: "已拣货",
  packed: "已打包",
  shipped: "已出库",
  in_transit: "运输中",
  delivered: "已签收",
  cancelled: "已取消"
};
const STATUS_COLORS = {
  pending: "#94A3B8",
  picked: "#6366F1",
  packed: "#8B5CF6",
  shipped: "#3B82F6",
  in_transit: "#F59E0B",
  delivered: "#10B981",
  cancelled: "#EF4444"
};
const TRANSPORT_ICONS = {
  road: /* @__PURE__ */ jsxRuntimeExports.jsx(DirectionsCar, { fontSize: "small" }),
  rail: /* @__PURE__ */ jsxRuntimeExports.jsx(DirectionsRailway, { fontSize: "small" }),
  sea: /* @__PURE__ */ jsxRuntimeExports.jsx(DirectionsBoat, { fontSize: "small" }),
  air: /* @__PURE__ */ jsxRuntimeExports.jsx(FlightTakeoff, { fontSize: "small" }),
  express: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, { fontSize: "small" })
};
const SHIPMENT_STEPS = ["pending", "picked", "packed", "shipped", "in_transit", "delivered"];
const getActiveStep = (status) => Math.max(0, SHIPMENT_STEPS.indexOf(status));
const NewShipmentDialog = ({ open, onClose }) => {
  const { salesOrders, addShipment } = useSalesStore();
  const [orderId, setOrderId] = reactExports.useState("");
  const [form, setForm] = reactExports.useState({
    transportMode: "road",
    carrier: "",
    trackingNo: "",
    originAddress: "",
    destinationAddress: "",
    estimatedPickupDate: "",
    estimatedDeliveryDate: "",
    driverName: "",
    vehicleNo: "",
    packageCount: "1",
    freight: "",
    notes: ""
  });
  const [msg, setMsg] = reactExports.useState("");
  const selectedOrder = salesOrders.find((o) => o.id === orderId);
  const handleOrderChange = (id) => {
    setOrderId(id);
    const o = salesOrders.find((x) => x.id === id);
    if (o) {
      setForm((f) => ({
        ...f,
        customerName: o.customerName,
        destinationAddress: o.deliveryAddress || f.destinationAddress,
        projectNo: o.projectNo || "",
        projectName: o.projectName || ""
      }));
    }
  };
  const handleSave = () => {
    if (!selectedOrder) {
      setMsg("请先选择销售订单");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const today = now.split("T")[0];
    const seq = String(Date.now()).slice(-6);
    const items = selectedOrder.items.map((it, i) => ({
      id: `shi-${Date.now()}-${i}`,
      materialId: it.materialId,
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      orderQuantity: it.quantity,
      shipQuantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount
    }));
    const shipment = {
      id: `ship-${Date.now()}`,
      shipmentNo: `SH${today.replace(/-/g, "")}${seq}`,
      salesOrderNo: selectedOrder.orderNo,
      projectNo: selectedOrder.projectNo,
      projectName: selectedOrder.projectName,
      customerName: selectedOrder.customerName,
      status: "pending",
      items,
      transportMode: form.transportMode,
      carrier: form.carrier || "待定",
      trackingNo: form.trackingNo || void 0,
      estimatedPickupDate: form.estimatedPickupDate || today,
      estimatedDeliveryDate: form.estimatedDeliveryDate || today,
      originAddress: form.originAddress || "工厂仓库",
      destinationAddress: form.destinationAddress || selectedOrder.deliveryAddress || "客户地址",
      driverName: form.driverName || void 0,
      driverPhone: void 0,
      vehicleNo: form.vehicleNo || void 0,
      packageCount: Number(form.packageCount) || 1,
      freight: form.freight ? Number(form.freight) : void 0,
      notes: form.notes || void 0
    };
    addShipment(shipment);
    onClose();
    setOrderId("");
    setMsg("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新增发货单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "选择销售订单可自动带出客户、项目与发货明细。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            fullWidth: true,
            required: true,
            size: "small",
            label: "关联销售订单",
            value: orderId,
            onChange: (e) => handleOrderChange(e.target.value),
            children: salesOrders.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: o.id, children: [
              o.orderNo,
              " - ",
              o.customerName,
              "（",
              formatCurrency(o.grandTotal),
              "）"
            ] }, o.id))
          }
        ) }),
        selectedOrder && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "success.main", children: [
          "已带出：客户 ",
          selectedOrder.customerName,
          " ｜ 项目 ",
          selectedOrder.projectName || "-",
          " ｜ ",
          selectedOrder.items.length,
          " 项物料"
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            select: true,
            fullWidth: true,
            size: "small",
            label: "运输方式",
            value: form.transportMode,
            onChange: (e) => setForm({ ...form, transportMode: e.target.value }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "road", children: "公路" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "rail", children: "铁路" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "sea", children: "海运" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "air", children: "空运" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "express", children: "快递" })
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "承运商",
            value: form.carrier,
            onChange: (e) => setForm({ ...form, carrier: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            type: "date",
            label: "预计提货",
            InputLabelProps: { shrink: true },
            value: form.estimatedPickupDate,
            onChange: (e) => setForm({ ...form, estimatedPickupDate: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            type: "date",
            label: "预计到货",
            InputLabelProps: { shrink: true },
            value: form.estimatedDeliveryDate,
            onChange: (e) => setForm({ ...form, estimatedDeliveryDate: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "目的地",
            value: form.destinationAddress,
            onChange: (e) => setForm({ ...form, destinationAddress: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "件数",
            type: "number",
            value: form.packageCount,
            onChange: (e) => setForm({ ...form, packageCount: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "运费",
            type: "number",
            value: form.freight,
            onChange: (e) => setForm({ ...form, freight: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "车牌/运单",
            value: form.vehicleNo,
            onChange: (e) => setForm({ ...form, vehicleNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "备注",
            multiline: true,
            rows: 2,
            value: form.notes,
            onChange: (e) => setForm({ ...form, notes: e.target.value })
          }
        ) }),
        msg && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "error", children: msg }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: handleSave, children: "生成发货单" })
    ] })
  ] });
};
const LogisticsList = () => {
  const [search, setSearch] = reactExports.useState("");
  const [detailOpen, setDetailOpen] = reactExports.useState(false);
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const [selectedShipment, setSelectedShipment] = reactExports.useState(null);
  const shipments = useSalesStore((s) => s.shipments);
  const addShipment = useSalesStore((s) => s.addShipment);
  const filtered = shipments.filter((s) => {
    if (search && !s.shipmentNo.includes(search) && !s.salesOrderNo.includes(search) && !s.customerName.includes(search)) return false;
    return true;
  });
  const transportLabel = (m) => m === "road" ? "公路" : m === "rail" ? "铁路" : m === "sea" ? "海运" : m === "air" ? "空运" : "快递";
  const columns = [
    {
      id: "shipmentNo",
      header: "发货单号",
      accessorFn: (s) => s.shipmentNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", fontWeight: 500, children: row.original.shipmentNo })
    },
    {
      id: "salesOrderNo",
      header: "销售订单",
      accessorFn: (s) => s.salesOrderNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: row.original.salesOrderNo })
    },
    {
      id: "customerName",
      header: "客户",
      accessorFn: (s) => s.customerName,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.customerName })
    },
    {
      id: "project",
      header: "项目",
      accessorFn: (s) => s.projectName,
      cell: ({ row }) => {
        const s = row.original;
        return s.projectName ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: s.projectName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", fontFamily: "monospace", children: s.projectNo })
        ] }) : "-";
      }
    },
    {
      id: "transportMode",
      header: "运输方式",
      accessorFn: (s) => transportLabel(s.transportMode),
      cell: ({ row }) => {
        const s = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [
          TRANSPORT_ICONS[s.transportMode],
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: transportLabel(s.transportMode) })
        ] });
      }
    },
    {
      id: "carrier",
      header: "承运商",
      accessorFn: (s) => s.carrier,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.carrier })
    },
    {
      id: "trackingNo",
      header: "运单号",
      accessorFn: (s) => s.trackingNo,
      cell: ({ row }) => {
        const s = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: s.trackingNo ? "#3B82F6" : "text.secondary", children: s.trackingNo || "-" });
      }
    },
    {
      id: "packageCount",
      header: "件数",
      accessorFn: (s) => s.packageCount,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.packageCount }) })
    },
    {
      id: "freight",
      header: "运费",
      accessorFn: (s) => s.freight,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.freight ? formatCurrency(row.original.freight) : "-" }) })
    },
    {
      id: "estimatedDeliveryDate",
      header: "预计到货",
      accessorFn: (s) => s.estimatedDeliveryDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.estimatedDeliveryDate })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (s) => STATUS_LABELS[s.status],
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: STATUS_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: STATUS_COLORS[row.original.status] + "15", color: STATUS_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => {
        setSelectedShipment(row.original);
        setDetailOpen(true);
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }) }) })
    }
  ];
  const pickField = (r, headers, zh, en) => {
    const key = headers.find((h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase());
    return key ? r[key] ?? "" : "";
  };
  const toNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r, headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const statusVal = pickField(r, headers, "状态", "status") || "pending";
    const modeVal = pickField(r, headers, "运输方式", "transportMode");
    const modeMap = { 公路: "road", 铁路: "rail", 海运: "sea", 空运: "air", 快递: "express" };
    const transportMode = modeMap[modeVal] || "road";
    return {
      id: `ship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      shipmentNo: pickField(r, headers, "发货单号", "shipmentNo") || `SH${now.slice(0, 10).replace(/-/g, "")}${String(Date.now()).slice(-6)}`,
      salesOrderNo: pickField(r, headers, "销售订单", "salesOrderNo"),
      projectNo: pickField(r, headers, "项目编号", "projectNo") || void 0,
      projectName: pickField(r, headers, "项目", "projectName") || void 0,
      customerName: pickField(r, headers, "客户", "customerName"),
      status: Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : "pending",
      items: [],
      transportMode,
      carrier: pickField(r, headers, "承运商", "carrier") || "待定",
      trackingNo: pickField(r, headers, "运单号", "trackingNo") || void 0,
      estimatedPickupDate: pickField(r, headers, "预计提货", "estimatedPickupDate") || now.slice(0, 10),
      estimatedDeliveryDate: pickField(r, headers, "预计到货", "estimatedDeliveryDate") || now.slice(0, 10),
      originAddress: pickField(r, headers, "起运地", "originAddress") || "工厂仓库",
      destinationAddress: pickField(r, headers, "目的地", "destinationAddress") || "客户地址",
      packageCount: toNum(pickField(r, headers, "件数", "packageCount")) || 1,
      freight: toNum(pickField(r, headers, "运费", "freight")) || void 0,
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addShipment(mapImportRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "物流发货管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setNewOpen(true), children: "新增发货单" }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
          { label: "全部", count: shipments.length, color: "#6366F1" },
          { label: "运输中", count: shipments.filter((s) => s.status === "in_transit" || s.status === "shipped").length, color: "#3B82F6" },
          { label: "已签收", count: shipments.filter((s) => s.status === "delivered").length, color: "#10B981" },
          { label: "待发货", count: shipments.filter((s) => s.status === "pending").length, color: "#F59E0B" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            size: "small",
            placeholder: "搜索发货单号/销售订单号/客户",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
            sx: { width: 300 }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filtered,
            columns,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "sales-logistics-list",
            onImport: handleImport
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: detailOpen, onClose: () => setDetailOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            "发货详情 — ",
            selectedShipment == null ? void 0 : selectedShipment.shipmentNo,
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setDetailOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: selectedShipment && /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mb: 2, mt: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep: getActiveStep(selectedShipment.status), alternativeLabel: true, children: ["待发货", "已拣货", "已打包", "已出库", "运输中", "已签收"].map((label, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Step, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabel, { children: label }) }, idx)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "物流信息" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "承运商：",
                  selectedShipment.carrier
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "运单号：",
                  selectedShipment.trackingNo || "-"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "司机：",
                  selectedShipment.driverName || "-"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "车牌：",
                  selectedShipment.vehicleNo || "-"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "件数：",
                  selectedShipment.packageCount,
                  " 件"
                ] }),
                selectedShipment.totalWeight && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "重量：",
                  selectedShipment.totalWeight,
                  " 吨"
                ] })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, bgcolor: "#F8FAFC" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", gutterBottom: true, children: "收发信息" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "起运地：",
                  selectedShipment.originAddress
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "目的地：",
                  selectedShipment.destinationAddress
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "预计提货：",
                  selectedShipment.estimatedPickupDate
                ] }),
                selectedShipment.actualPickupDate && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
                  "实际提货：",
                  selectedShipment.actualPickupDate
                ] }),
                selectedShipment.actualDeliveryDate && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "#10B981", children: [
                  "实际签收：",
                  selectedShipment.actualDeliveryDate
                ] })
              ] }) })
            ] }),
            selectedShipment.freight && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", children: [
              "运费：",
              formatCurrency(selectedShipment.freight),
              selectedShipment.insurance && ` | 保险费：${formatCurrency(selectedShipment.insurance)}`
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogActions, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDetailOpen(false), children: "关闭" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NewShipmentDialog, { open: newOpen, onClose: () => setNewOpen(false) })
      ]
    }
  );
};
export {
  LogisticsList as default
};
