import { h as useNavigate, n as useParams, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { u as useMaterialStore } from "./index-hTLNcGoC.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { M as MaterialLineItemsGrid } from "./MaterialLineItemsGrid-ClgE8gpx.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-DI-UifA3.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as useCustomerStore } from "./customerStore-BnoPAbgi.js";
import { u as useSalesContractStore } from "./salesContractStore-Cx1nh7u6.js";
import { d as dayjs } from "./vendor-date-DpsB6iVy.js";
import { aS as Paper, T as Typography, bY as Grid, bv as TextField, cC as Autocomplete, aR as MenuItem, bL as Stack, bm as Button, bh as Add, bl as Alert, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aM as IconButton, be as Delete, bZ as ArrowBack, bd as Save, bw as Send } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./PrintPreview-Dx9G1wxr.js";
const STATUS_LABELS = {
  draft: "草稿",
  active: "执行中",
  suspended: "已暂停",
  completed: "已完成",
  terminated: "已终止"
};
const SalesContractForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const materials = useMaterialStore((s) => s.materials);
  const customers = useCustomerStore((s) => s.customers);
  const { contracts, addContract, updateContract } = useSalesContractStore();
  const existing = reactExports.useMemo(
    () => id ? contracts.find((c) => c.id === id) : null,
    [id, contracts]
  );
  const [name, setName] = reactExports.useState((existing == null ? void 0 : existing.name) || "");
  const [selectedCustomer, setSelectedCustomer] = reactExports.useState(() => {
    if (!existing) return null;
    return customers.find((c) => c.id === existing.customerId) || null;
  });
  const [startDate, setStartDate] = reactExports.useState((existing == null ? void 0 : existing.startDate) || "");
  const [endDate, setEndDate] = reactExports.useState((existing == null ? void 0 : existing.endDate) || "");
  const [salesPerson, setSalesPerson] = reactExports.useState((existing == null ? void 0 : existing.salesPerson) || "陈伟");
  const [status, setStatus] = reactExports.useState((existing == null ? void 0 : existing.status) || "draft");
  const [terms, setTerms] = reactExports.useState((existing == null ? void 0 : existing.terms) || "");
  const [remarks, setRemarks] = reactExports.useState((existing == null ? void 0 : existing.remarks) || "");
  const [items, setItems] = reactExports.useState(() => {
    if (!(existing == null ? void 0 : existing.items)) return [];
    return existing.items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode || "",
      materialName: item.materialName || "",
      specification: item.specification || "",
      unit: item.unit || "吨",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      deliveryDate: item.deliveryDate || ""
    }));
  });
  const [payments, setPayments] = reactExports.useState(() => {
    if (!(existing == null ? void 0 : existing.paymentSchedule)) return [];
    return existing.paymentSchedule.map((p) => ({ ...p }));
  });
  const materialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: m.specification || "",
    unit: m.unit,
    price: m.price
  }));
  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
  const computeContractRow = (row) => ({
    ...row,
    amount: (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)
  });
  const handleContractMaterialPricing = (_rowId, materialId) => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    return { unitPrice: mat.price };
  };
  const contractColumns = [
    { key: "materialCode", label: "物料编码", materialRole: "code", fillFromMaterial: "code", width: 140, fixed: true },
    { key: "materialName", label: "物料名称", materialRole: "name", fillFromMaterial: "name", width: 200, fixed: true },
    { key: "specification", label: "规格", fillFromMaterial: "specification", width: 140, hideable: true },
    { key: "unit", label: "单位", fillFromMaterial: "unit", width: 70, hideable: true },
    { key: "quantity", label: "数量", type: "number", align: "right", width: 90, min: 1, step: 1 },
    { key: "unitPrice", label: "单价", type: "number", align: "right", width: 110, min: 0, step: 0.01 },
    { key: "amount", label: "金额", type: "readonly", align: "right", width: 110 },
    { key: "deliveryDate", label: "交货日期", type: "date", width: 150, hideable: true }
  ];
  const makeContractRow = () => ({
    id: "",
    materialId: "",
    materialCode: "",
    materialName: "",
    specification: "",
    unit: "吨",
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    deliveryDate: ""
  });
  const handleAddPayment = () => {
    setPayments((prev) => [...prev, {
      id: `pay-${Date.now()}`,
      stage: "",
      percentage: 0,
      amount: 0,
      dueDate: "",
      receivedDate: "",
      received: false
    }]);
  };
  const handleDeletePayment = (payId) => setPayments((prev) => prev.filter((p) => p.id !== payId));
  const handlePaymentChange = (payId, field, value) => {
    setPayments((prev) => prev.map((p) => {
      if (p.id !== payId) return p;
      const updated = { ...p, [field]: value };
      if (field === "percentage") {
        updated.amount = totalAmount * updated.percentage / 100;
      }
      return updated;
    }));
  };
  const handleSave = () => {
    if (!name.trim()) {
      alert("请输入合同名称");
      return;
    }
    if (!selectedCustomer) {
      alert("请选择客户");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一项物料明细");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const formData = {
      name,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code,
      salesPerson,
      amount: totalAmount,
      startDate,
      endDate,
      status,
      items,
      paymentSchedule: payments,
      terms,
      remarks,
      createdAt: (existing == null ? void 0 : existing.createdAt) || now,
      updatedAt: now
    };
    if (isEditMode && existing) {
      updateContract(existing.id, formData);
    } else {
      const contractNo = `SC-${dayjs().format("YYYY")}-${String(contracts.length + 1).padStart(3, "0")}`;
      addContract({ id: `sc-${Date.now()}`, contractNo, ...formData });
    }
    navigate("/sales/contracts");
  };
  const handleSubmit = () => {
    if (!name.trim()) {
      alert("请输入合同名称");
      return;
    }
    if (!selectedCustomer) {
      alert("请选择客户");
      return;
    }
    if (items.length === 0) {
      alert("请添加至少一项物料明细");
      return;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const formData = {
      name,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.code,
      salesPerson,
      amount: totalAmount,
      startDate,
      endDate,
      status: status === "draft" ? "active" : status,
      items,
      paymentSchedule: payments,
      terms,
      remarks,
      createdAt: (existing == null ? void 0 : existing.createdAt) || now,
      updatedAt: now
    };
    if (isEditMode && existing) {
      updateContract(existing.id, formData);
    } else {
      const contractNo = `SC-${dayjs().format("YYYY")}-${String(contracts.length + 1).padStart(3, "0")}`;
      addContract({ id: `sc-${Date.now()}`, contractNo, ...formData });
    }
    navigate("/sales/contracts");
  };
  const buildPrintRecord = () => ({
    contractNo: (existing == null ? void 0 : existing.contractNo) || "(尚未保存)",
    name,
    customerName: (selectedCustomer == null ? void 0 : selectedCustomer.customerName) || "",
    customerCode: (selectedCustomer == null ? void 0 : selectedCustomer.customerCode) || "",
    startDate,
    endDate,
    salesPerson,
    status,
    terms,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      deliveryDate: it.deliveryDate
    })),
    payments: payments.map((p) => ({
      stage: p.stage,
      percentage: p.percentage,
      amount: p.amount,
      dueDate: p.dueDate
    }))
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: isEditMode ? `编辑合同${existing ? " - " + existing.contractNo : ""}` : "新建销售合同",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/sales/contracts"), children: "返回" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PrintPreviewButton, { entity: "salesContract", record: buildPrintRecord(), showBoth: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), onClick: handleSubmit, "data-testid": "sc-submit", children: isEditMode ? "保存修改" : "提交合同" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "合同基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "合同名称",
                value: name,
                onChange: (e) => setName(e.target.value),
                required: true,
                inputProps: { "data-testid": "sc-name" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Autocomplete,
              {
                options: customers,
                getOptionLabel: (c) => `${c.name} (${c.code})`,
                value: selectedCustomer,
                onChange: (_, v) => {
                  setSelectedCustomer(v);
                },
                renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    ...params,
                    label: "客户",
                    placeholder: "选择或搜索客户",
                    required: true,
                    inputProps: { ...params.inputProps, "data-testid": "sc-customer" }
                  }
                ),
                isOptionEqualToValue: (o, v) => o.id === v.id,
                noOptionsText: "未找到匹配客户"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "合同金额",
                value: formatCurrency(totalAmount),
                disabled: true,
                InputProps: { inputProps: { "data-testid": "sc-amount" } }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "销售员",
                value: salesPerson,
                onChange: (e) => setSalesPerson(e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "开始日期",
                type: "date",
                value: startDate,
                onChange: (e) => setStartDate(e.target.value),
                InputLabelProps: { shrink: true },
                inputProps: { "data-testid": "sc-start" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "结束日期",
                type: "date",
                value: endDate,
                onChange: (e) => setEndDate(e.target.value),
                InputLabelProps: { shrink: true },
                inputProps: { "data-testid": "sc-end" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "合同状态",
                value: status,
                onChange: (e) => setStatus(e.target.value),
                children: Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: v }, k))
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          MaterialLineItemsGrid,
          {
            columns: contractColumns,
            value: items,
            onChange: (rows) => setItems(rows),
            materials: materialOptions,
            onMaterialChange: handleContractMaterialPricing,
            computeRow: computeContractRow,
            newRow: makeContractRow,
            storageKey: "ssa-contract-material-columns",
            addLabel: "添加物料",
            testIdPrefix: "sc",
            footer: /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 0.5, alignItems: "flex-end", px: 1, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 700, color: "primary", children: [
              "合同总金额：",
              formatCurrency(totalAmount)
            ] }) })
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "收款计划" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: handleAddPayment, "data-testid": "sc-add-payment", children: "添加节点" })
          ] }),
          payments.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "请添加收款计划节点" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "里程碑" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "比例(%)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "金额" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "计划收款日" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { width: 60 })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: payments.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  placeholder: "如：合同签订",
                  value: p.stage,
                  onChange: (e) => handlePaymentChange(p.id, "stage", e.target.value),
                  sx: { width: 160 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  type: "number",
                  value: p.percentage,
                  onChange: (e) => handlePaymentChange(p.id, "percentage", Number(e.target.value)),
                  sx: { width: 80 },
                  inputProps: { min: 0, max: 100 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: formatCurrency(p.amount) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  type: "date",
                  value: p.dueDate,
                  onChange: (e) => handlePaymentChange(p.id, "dueDate", e.target.value),
                  InputLabelProps: { shrink: true },
                  sx: { width: 140 }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDeletePayment(p.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) }) })
            ] }, p.id)) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "其他信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "主要条款",
                value: terms,
                onChange: (e) => setTerms(e.target.value),
                multiline: true,
                rows: 4
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "备注",
                value: remarks,
                onChange: (e) => setRemarks(e.target.value),
                multiline: true,
                rows: 2
              }
            ) })
          ] })
        ] })
      ]
    }
  );
};
export {
  SalesContractForm as default
};
