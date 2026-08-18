import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, h as Typography, bK as Stack, aL as Chip, cl as LinearProgress, B as Box, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bj as Alert, bX as Grid, bt as TextField, bk as Button, cv as AutoFixHigh, aO as MenuItem, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { c as useWarehouseStore, g as useOrgStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { F as FilterBar } from "./FilterBar-Dnzbdei4.js";
import { A as ActionBar } from "./ActionBar-CfsPxjQd.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { a as formatDate } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import { u as useWarehouseMasterStore, s as selectWarehousesByOrg } from "./warehouseMasterStore-Ct1rrWsm.js";
import "./StatusBadge-Db1uY4YU.js";
const statusMap = {
  pending: { label: "待入库", color: "warning" },
  inspecting: { label: "质检中", color: "info" },
  completed: { label: "已完成", color: "success" },
  partial: { label: "部分入库", color: "warning" }
};
const NewFGInboundDialog = ({ open, onClose }) => {
  const { addFinishedGoodsInbound } = useWarehouseStore();
  const { workOrders } = useProductionStore();
  const [form, setForm] = reactExports.useState({
    workOrderNo: "",
    productCode: "",
    productName: "",
    specification: "",
    unit: "件",
    plannedQty: "",
    actualQty: "",
    batchNo: "",
    warehouseName: "成品仓库",
    operator: "",
    remarks: ""
  });
  const [woMsg, setWoMsg] = reactExports.useState("");
  const warehouses = useWarehouseMasterStore((s) => s.warehouses);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const defaultWh = visibleWarehouses.find((w) => w.type === "finished") || visibleWarehouses[0];
  const [warehouseId, setWarehouseId] = reactExports.useState((defaultWh == null ? void 0 : defaultWh.id) || "wh-003");
  const handleLoadWO = () => {
    const wo = workOrders.find((w) => w.orderNo === form.workOrderNo || w.id === form.workOrderNo);
    if (!wo) {
      setWoMsg("未找到该工单，请检查工单号");
      return;
    }
    setWoMsg(`已带出工单 ${wo.orderNo}：${wo.productName} × ${wo.plannedQuantity}`);
    setForm((f) => ({
      ...f,
      workOrderNo: wo.orderNo,
      productCode: wo.productCode,
      productName: wo.productName,
      plannedQty: String(wo.plannedQuantity),
      actualQty: String(wo.plannedQuantity),
      operator: wo.supervisor || f.operator
    }));
  };
  const handleSave = (status) => {
    var _a;
    if (!form.productCode || !form.productName) {
      setWoMsg("请填写成品编码与名称，或先用工单号带出");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const today = now.split("T")[0];
    const seq = String(Date.now()).slice(-6);
    addFinishedGoodsInbound({
      id: `fin-${Date.now()}`,
      inboundNo: `FIN${today.replace(/-/g, "")}${seq}`,
      workOrderId: form.workOrderNo,
      workOrderNo: form.workOrderNo,
      productId: "",
      productCode: form.productCode,
      productName: form.productName,
      specification: form.specification,
      unit: form.unit,
      plannedQty: Number(form.plannedQty) || 0,
      actualQty: Number(form.actualQty) || 0,
      qualifiedQty: Number(form.actualQty) || 0,
      rejectedQty: 0,
      batchNo: form.batchNo || `B${seq}`,
      warehouseId,
      warehouseName: ((_a = visibleWarehouses.find((w) => w.id === warehouseId)) == null ? void 0 : _a.name) || "成品仓库",
      status,
      operator: form.operator || "系统用户",
      inboundDate: today,
      remarks: form.remarks,
      createdAt: now,
      updatedAt: now,
      createdBy: "系统用户",
      updatedBy: "系统用户"
    });
    onClose();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "新建成品入库单" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "输入工单号可自动带出产品名称、编码与计划数量，减少手工录入。" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "生产工单号（可带出产品）",
            placeholder: "如 WO-MRP-xxxx 或 WO20240515001",
            value: form.workOrderNo,
            onChange: (e) => setForm({ ...form, workOrderNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, sx: { display: "flex", alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(AutoFixHigh, {}), onClick: handleLoadWO, children: "带出产品" }) }),
        woMsg && /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: woMsg.includes("未") ? "error" : "success.main", children: woMsg }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            required: true,
            size: "small",
            label: "成品编码 *",
            value: form.productCode,
            onChange: (e) => setForm({ ...form, productCode: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            required: true,
            size: "small",
            label: "成品名称 *",
            value: form.productName,
            onChange: (e) => setForm({ ...form, productName: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "规格型号",
            value: form.specification,
            onChange: (e) => setForm({ ...form, specification: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "计划数量",
            type: "number",
            value: form.plannedQty,
            onChange: (e) => setForm({ ...form, plannedQty: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            required: true,
            size: "small",
            label: "实际数量 *",
            type: "number",
            value: form.actualQty,
            onChange: (e) => setForm({ ...form, actualQty: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "单位",
            value: form.unit,
            onChange: (e) => setForm({ ...form, unit: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "批次号",
            value: form.batchNo,
            onChange: (e) => setForm({ ...form, batchNo: e.target.value })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            select: true,
            fullWidth: true,
            size: "small",
            label: "入库仓库",
            value: warehouseId,
            onChange: (e) => setWarehouseId(e.target.value),
            children: visibleWarehouses.map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: w.id, children: w.name }, w.id))
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "操作员",
            value: form.operator,
            onChange: (e) => setForm({ ...form, operator: e.target.value })
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
            value: form.remarks,
            onChange: (e) => setForm({ ...form, remarks: e.target.value })
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { sx: { px: 3, pb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "取消" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => handleSave("pending"), children: "暂存" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => handleSave("completed"), children: "保存" })
    ] })
  ] });
};
const FinishedGoodsInboundList = () => {
  useNavigate();
  const { finishedGoodsInbounds } = useWarehouseStore();
  const [filterData, setFilterData] = reactExports.useState({});
  const [newOpen, setNewOpen] = reactExports.useState(false);
  const columns = reactExports.useMemo(() => [
    {
      accessorKey: "inboundNo",
      header: "入库单号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#3B82F6", fontWeight: 500, fontFamily: "monospace" }, children: row.original.inboundNo })
    },
    {
      accessorKey: "workOrderNo",
      header: "生产工单",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: "0.8rem", color: "#64748B" }, children: row.original.workOrderNo })
    },
    {
      accessorKey: "productCode",
      header: "成品编码",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: row.original.productCode,
            size: "small",
            sx: { bgcolor: "#ECFDF5", color: "#065F46", fontFamily: "monospace", fontSize: "0.75rem", mb: 0.3 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: row.original.productName })
      ] })
    },
    {
      accessorKey: "specification",
      header: "规格",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontSize: "0.8rem", color: "#64748B", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: row.original.specification })
    },
    {
      accessorKey: "actualQty",
      header: "入库数量",
      cell: ({ row }) => {
        const r = row.original;
        const pct = r.plannedQty > 0 ? Math.round(r.actualQty / r.plannedQty * 100) : 0;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 0.3, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 500, children: [
            r.actualQty,
            " / ",
            r.plannedQty,
            " ",
            r.unit
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            LinearProgress,
            {
              variant: "determinate",
              value: pct,
              sx: {
                height: 4,
                borderRadius: 2,
                bgcolor: "#E2E8F0",
                "& .MuiLinearProgress-bar": { bgcolor: pct >= 100 ? "#10B981" : "#3B82F6" }
              }
            }
          )
        ] });
      }
    },
    {
      accessorKey: "qualifiedQty",
      header: "合格/不合格",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `合格 ${row.original.qualifiedQty}`, size: "small", sx: { bgcolor: "#ECFDF5", color: "#065F46", fontSize: "0.75rem" } }),
        row.original.rejectedQty > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `不合格 ${row.original.rejectedQty}`, size: "small", sx: { bgcolor: "#FEF2F2", color: "#991B1B", fontSize: "0.75rem" } })
      ] })
    },
    {
      accessorKey: "batchNo",
      header: "批次号",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: "0.8rem" }, children: row.original.batchNo })
    },
    { accessorKey: "warehouseName", header: "仓库" },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: s == null ? void 0 : s.label, size: "small", color: (s == null ? void 0 : s.color) || "default" });
      }
    },
    { accessorKey: "inboundDate", header: "入库日期", cell: ({ row }) => formatDate(row.original.inboundDate) }
  ], []);
  const filterFields = [
    { name: "inboundNo", label: "入库单号", type: "text" },
    { name: "productCode", label: "成品编码", type: "text" },
    { name: "workOrderNo", label: "工单号", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "pending", label: "待入库" },
        { value: "inspecting", label: "质检中" },
        { value: "completed", label: "已完成" },
        { value: "partial", label: "部分入库" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...finishedGoodsInbounds];
    if (filterData.inboundNo) data = data.filter((d) => d.inboundNo.includes(filterData.inboundNo));
    if (filterData.productCode) data = data.filter((d) => d.productCode.includes(filterData.productCode));
    if (filterData.workOrderNo) data = data.filter((d) => d.workOrderNo.includes(filterData.workOrderNo));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, finishedGoodsInbounds]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "成品入库单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "inbound", currentStatus: "ib_completed" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ActionBar, { primary: { label: "新建入库单", onClick: () => setNewOpen(true) } })
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
            enableExport: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NewFGInboundDialog, { open: newOpen, onClose: () => setNewOpen(false) })
      ]
    }
  );
};
export {
  FinishedGoodsInboundList as default
};
