import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, h as Typography, aL as Chip, B as Box, bt as TextField, cN as Autocomplete, bk as Button, de as FilterList, aP as Paper, bK as Stack, b7 as Dialog, b8 as DialogTitle, aJ as IconButton, aS as CloseIcon, ba as DialogContent, aO as MenuItem, bC as DialogActions, bf as Add } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { A as ActionBar } from "./ActionBar-DmR-0fx0.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { f as formatCurrency, a as formatDate } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as usePriceStore } from "./priceStore-CduvTkzQ.js";
import "./StatusBadge-DeJuhK-R.js";
const STATUS_MAP = {
  active: { label: "有效", color: "success" },
  expired: { label: "已过期", color: "default" },
  frozen: { label: "已冻结", color: "error" }
};
const nowStr = () => {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const todayStr = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const PriceList = () => {
  const { priceList, addPriceListItem, updatePriceListItem } = usePriceStore();
  useNavigate();
  const [filterData, setFilterData] = reactExports.useState({});
  const [vendorFilter, setVendorFilter] = reactExports.useState("");
  const [materialFilter, setMaterialFilter] = reactExports.useState("");
  const [open, setOpen] = reactExports.useState(false);
  const [editingId, setEditingId] = reactExports.useState(null);
  const [materialCode, setMaterialCode] = reactExports.useState("");
  const [materialName, setMaterialName] = reactExports.useState("");
  const [specification, setSpecification] = reactExports.useState("");
  const [unit, setUnit] = reactExports.useState("");
  const [vendorName, setVendorName] = reactExports.useState("");
  const [unitPrice, setUnitPrice] = reactExports.useState("");
  const [currency, setCurrency] = reactExports.useState("CNY");
  const [effectiveDate, setEffectiveDate] = reactExports.useState(todayStr());
  const [expiryDate, setExpiryDate] = reactExports.useState("");
  const [paymentTerms, setPaymentTerms] = reactExports.useState("");
  const [deliveryDays, setDeliveryDays] = reactExports.useState("");
  const [status, setStatus] = reactExports.useState("active");
  const columns = reactExports.useMemo(() => [
    { accessorKey: "materialCode", header: "物料编码", size: 150 },
    { accessorKey: "materialName", header: "物料名称", size: 150 },
    { accessorKey: "specification", header: "规格", size: 180 },
    { accessorKey: "unit", header: "单位", size: 60 },
    { accessorKey: "vendorName", header: "供应商", size: 180 },
    {
      accessorKey: "unitPrice",
      header: "单价",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, color: "primary", children: formatCurrency(row.original.unitPrice) })
    },
    { accessorKey: "currency", header: "币种", size: 60 },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        var _a, _b;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: (_a = STATUS_MAP[row.original.status]) == null ? void 0 : _a.label,
            size: "small",
            color: ((_b = STATUS_MAP[row.original.status]) == null ? void 0 : _b.color) || "default"
          }
        );
      },
      size: 80
    },
    {
      accessorKey: "writtenBack",
      header: "主数据回写",
      cell: ({ row }) => row.original.writtenBack ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "已回写主数据", size: "small", color: "success", variant: "outlined" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "待回写", size: "small", color: "default", variant: "outlined" }),
      size: 110
    },
    {
      accessorKey: "effectiveDate",
      header: "生效日期",
      cell: ({ row }) => formatDate(row.original.effectiveDate)
    },
    {
      accessorKey: "expiryDate",
      header: "失效日期",
      cell: ({ row }) => row.original.expiryDate ? formatDate(row.original.expiryDate) : "长期有效"
    },
    { accessorKey: "paymentTerms", header: "付款条件", cell: ({ row }) => row.original.paymentTerms || "-" },
    { accessorKey: "deliveryDays", header: "交期(天)", cell: ({ row }) => `${row.original.deliveryDays}天` },
    { accessorKey: "sourceApprovalNo", header: "来源审批单", size: 150 }
  ], []);
  const filteredData = reactExports.useMemo(() => {
    let data = [...priceList];
    if (filterData.materialCode) data = data.filter((r) => r.materialCode.includes(filterData.materialCode));
    if (filterData.materialName) data = data.filter((r) => r.materialName.includes(filterData.materialName));
    if (filterData.status) data = data.filter((r) => r.status === filterData.status);
    if (filterData.vendorName) data = data.filter((r) => r.vendorName.includes(filterData.vendorName));
    return data;
  }, [filterData]);
  const vendorOptions = reactExports.useMemo(
    () => [...new Set(priceList.map((p) => p.vendorName))].map((name) => ({ label: name, value: name })),
    []
  );
  const openCreate = () => {
    setEditingId(null);
    setMaterialCode("");
    setMaterialName("");
    setSpecification("");
    setUnit("");
    setVendorName("");
    setUnitPrice("");
    setCurrency("CNY");
    setEffectiveDate(todayStr());
    setExpiryDate("");
    setPaymentTerms("");
    setDeliveryDays("");
    setStatus("active");
    setOpen(true);
  };
  const openEdit = (row) => {
    setEditingId(row.id);
    setMaterialCode(row.materialCode);
    setMaterialName(row.materialName);
    setSpecification(row.specification || "");
    setUnit(row.unit || "");
    setVendorName(row.vendorName);
    setUnitPrice(String(row.unitPrice));
    setCurrency(row.currency);
    setEffectiveDate(row.effectiveDate);
    setExpiryDate(row.expiryDate || "");
    setPaymentTerms(row.paymentTerms || "");
    setDeliveryDays(String(row.deliveryDays || ""));
    setStatus(row.status);
    setOpen(true);
  };
  const handleSave = () => {
    const ts = nowStr();
    const base = {
      materialCode,
      materialName,
      specification,
      unit,
      vendorId: "",
      vendorName,
      unitPrice: Number(unitPrice) || 0,
      currency,
      effectiveDate,
      expiryDate: expiryDate || void 0,
      sourceApprovalId: "",
      sourceApprovalNo: "手工录入",
      paymentTerms: paymentTerms || void 0,
      deliveryDays: Number(deliveryDays) || 0,
      minOrderQty: void 0,
      status,
      remarks: void 0
    };
    if (editingId) {
      updatePriceListItem(editingId, base);
    } else {
      addPriceListItem({
        ...base,
        id: `pl-${Date.now()}`,
        materialId: materialCode || `manual-${Date.now()}`,
        createdAt: ts,
        updatedAt: ts,
        createdBy: "系统"
      });
    }
    setOpen(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "价目表",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "price-approval", currentStatus: "pa_approved", label: "流程追踪" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ActionBar,
          {
            primary: { label: "手工录入", onClick: openCreate, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}) }
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              label: "物料搜索",
              value: materialFilter,
              onChange: (e) => setMaterialFilter(e.target.value),
              sx: { minWidth: 200 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Autocomplete,
            {
              size: "small",
              options: vendorOptions,
              value: vendorOptions.find((o) => o.value === vendorFilter) || null,
              onChange: (_, newVal) => setVendorFilter((newVal == null ? void 0 : newVal.value) || ""),
              renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { ...params, label: "供应商筛选" }),
              sx: { minWidth: 200 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              size: "small",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(FilterList, {}),
              onClick: () => {
                setFilterData((prev) => ({ ...prev, vendorName: vendorFilter, materialName: materialFilter }));
              },
              children: "筛选"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enablePagination: true,
            pageSize: 15,
            enableExport: true,
            onView: (row) => openEdit(row),
            onEdit: (row) => openEdit(row)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mt: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 4, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "有效价格项" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", color: "success.main", children: priceList.filter((p) => p.status === "active").length })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "涉及供应商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", children: new Set(priceList.map((p) => p.vendorName)).size })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "涉及物料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", children: new Set(priceList.map((p) => p.materialCode)).size })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "已回写主数据" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", color: "success.main", children: priceList.filter((p) => p.writtenBack).length })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            editingId ? "编辑价目表项" : "手工录入价目表项",
            /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => setOpen(false), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, sx: { mt: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "物料编码", value: materialCode, onChange: (e) => setMaterialCode(e.target.value) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "物料名称", value: materialName, onChange: (e) => setMaterialName(e.target.value), "data-testid": "price-material" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "规格", value: specification, onChange: (e) => setSpecification(e.target.value) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "单位", value: unit, onChange: (e) => setUnit(e.target.value) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "供应商名称", value: vendorName, onChange: (e) => setVendorName(e.target.value), "data-testid": "price-vendor" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "单价", type: "number", value: unitPrice, onChange: (e) => setUnitPrice(e.target.value), "data-testid": "price-unitprice" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "币种", value: currency, onChange: (e) => setCurrency(e.target.value), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "CNY", children: "CNY" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "USD", children: "USD" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { select: true, fullWidth: true, label: "状态", value: status, onChange: (e) => setStatus(e.target.value), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "active", children: "有效" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "expired", children: "已过期" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "frozen", children: "已冻结" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "生效日期",
                  type: "date",
                  value: effectiveDate,
                  onChange: (e) => setEffectiveDate(e.target.value),
                  InputLabelProps: { shrink: true }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  label: "失效日期",
                  type: "date",
                  value: expiryDate,
                  onChange: (e) => setExpiryDate(e.target.value),
                  InputLabelProps: { shrink: true }
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "付款条件", value: paymentTerms, onChange: (e) => setPaymentTerms(e.target.value) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "交期(天)", type: "number", value: deliveryDays, onChange: (e) => setDeliveryDays(e.target.value) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                onClick: handleSave,
                disabled: !materialName.trim() || !vendorName.trim() || !(Number(unitPrice) > 0),
                "data-testid": "price-save",
                children: "保存"
              }
            )
          ] })
        ] })
      ]
    }
  );
};
export {
  PriceList as default
};
