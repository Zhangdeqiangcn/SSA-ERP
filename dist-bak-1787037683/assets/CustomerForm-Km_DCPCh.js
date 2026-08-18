import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bj as Alert, aP as Paper, h as Typography, bX as Grid, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, i as Divider, bK as Stack, bk as Button, d7 as Cancel, bb as Save } from "./vendor-46QZWBd3.js";
import "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { u as useCustomerStore } from "./customerStore-IdYDDJRc.js";
import { d as CUSTOMER_TYPE_OPTIONS, e as CUSTOMER_STATUS_OPTIONS, f as CREDIT_LEVEL_OPTIONS, S as SETTLEMENT_TERM_OPTIONS, C as CURRENCY_OPTIONS, c as TAX_RATE_OPTIONS } from "./options-BINuI5Gr.js";
import { c as getNextSequence } from "./codeGenerator-DzlFgjvf.js";
const stamp = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
const genId = (prefix) => `${prefix}-${Date.now()}`;
const emptyForm = (code) => ({
  code,
  name: "",
  shortName: "",
  type: "direct",
  status: "active",
  creditLevel: "",
  creditLimit: "",
  usedCredit: 0,
  settlementTermDays: 0,
  taxId: "",
  invoiceTitle: "",
  invoiceAddress: "",
  invoicePhone: "",
  bankName: "",
  bankAccount: "",
  bankAccountName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  address: "",
  defaultCurrency: "CNY",
  defaultTaxRate: 13,
  remarks: "",
  salesOrg: "",
  reconciliationAccount: "",
  taxCode: ""
});
const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const customers = useCustomerStore((s) => s.customers);
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const existing = useCustomerStore((s) => id ? s.customers.find((c) => c.id === id) : void 0);
  const nextCode = reactExports.useMemo(
    () => `C${getNextSequence(customers.map((c) => c.code), "C{seq}", "C")}`,
    [customers]
  );
  const [form, setForm] = reactExports.useState(() => {
    if (existing) {
      return {
        code: existing.code,
        name: existing.name,
        shortName: existing.shortName || "",
        type: existing.type,
        status: existing.status,
        creditLevel: existing.creditLevel || "",
        creditLimit: existing.creditLimit != null ? String(existing.creditLimit) : "",
        usedCredit: existing.usedCredit || 0,
        settlementTermDays: existing.settlementTermDays ?? 0,
        taxId: existing.taxId || "",
        invoiceTitle: existing.invoiceTitle || "",
        invoiceAddress: existing.invoiceAddress || "",
        invoicePhone: existing.invoicePhone || "",
        bankName: existing.bankName || "",
        bankAccount: existing.bankAccount || "",
        bankAccountName: existing.bankAccountName || "",
        contactName: existing.contactName || "",
        contactPhone: existing.contactPhone || "",
        contactEmail: existing.contactEmail || "",
        address: existing.address || "",
        defaultCurrency: existing.defaultCurrency || "CNY",
        defaultTaxRate: existing.defaultTaxRate ?? 13,
        remarks: existing.remarks || "",
        salesOrg: existing.salesOrg || "",
        reconciliationAccount: existing.reconciliationAccount || "",
        taxCode: existing.taxCode || ""
      };
    }
    return emptyForm(nextCode);
  });
  const [error, setError] = reactExports.useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("客户名称（企业全称）为必填项");
      return;
    }
    const creditLimitNum = form.creditLimit === "" ? void 0 : Number(form.creditLimit);
    if (form.creditLimit !== "" && (Number.isNaN(creditLimitNum) || creditLimitNum < 0)) {
      setError("授信额度必须为非负数字");
      return;
    }
    const base = {
      code: form.code,
      name: form.name.trim(),
      shortName: form.shortName.trim() || void 0,
      type: form.type,
      status: form.status,
      creditLevel: form.creditLevel || void 0,
      creditLimit: creditLimitNum,
      usedCredit: isEdit ? form.usedCredit : 0,
      settlementTermDays: form.settlementTermDays,
      taxId: form.taxId.trim() || void 0,
      invoiceTitle: form.invoiceTitle.trim() || void 0,
      invoiceAddress: form.invoiceAddress.trim() || void 0,
      invoicePhone: form.invoicePhone.trim() || void 0,
      bankName: form.bankName.trim() || void 0,
      bankAccount: form.bankAccount.trim() || void 0,
      bankAccountName: form.bankAccountName.trim() || void 0,
      contactName: form.contactName.trim() || void 0,
      contactPhone: form.contactPhone.trim() || void 0,
      contactEmail: form.contactEmail.trim() || void 0,
      address: form.address.trim() || void 0,
      defaultCurrency: form.defaultCurrency,
      defaultTaxRate: form.defaultTaxRate === "" ? void 0 : form.defaultTaxRate,
      remarks: form.remarks.trim() || void 0,
      salesOrg: form.salesOrg.trim() || void 0,
      reconciliationAccount: form.reconciliationAccount.trim() || void 0,
      taxCode: form.taxCode.trim() || void 0
    };
    if (isEdit && existing) {
      updateCustomer(existing.id, { ...base, updatedAt: stamp() });
      navigate(`/sales/customers/${existing.id}`);
    } else {
      const newCustomer = {
        ...base,
        id: genId("cus"),
        createdAt: stamp(),
        updatedAt: stamp(),
        createdBy: "当前用户",
        updatedBy: "当前用户"
      };
      addCustomer(newCustomer);
      navigate(`/sales/customers/${newCustomer.id}`);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: isEdit ? `编辑客户 - ${form.code}` : "新建客户",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}), onClick: () => navigate("/sales/customers"), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSubmit, children: "保存" })
      ] }),
      children: [
        error && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(""), children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "基础信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "客户编码",
                value: form.code,
                disabled: true,
                helperText: isEdit ? "编码不可修改" : "自动生成"
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 8, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                required: true,
                size: "small",
                label: "客户名称（企业全称）",
                value: form.name,
                onChange: (e) => set("name", e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "简称", value: form.shortName, onChange: (e) => set("shortName", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "客户类型" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.type, label: "客户类型", onChange: (e) => set("type", e.target.value), children: CUSTOMER_TYPE_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.status, label: "状态", onChange: (e) => set("status", e.target.value), children: CUSTOMER_STATUS_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "信用等级" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.creditLevel, label: "信用等级", onChange: (e) => set("creditLevel", e.target.value), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "未评定" }) }),
                CREDIT_LEVEL_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "授信额度",
                type: "number",
                value: form.creditLimit,
                onChange: (e) => set("creditLimit", e.target.value),
                InputProps: { inputProps: { min: 0 } }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "账期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.settlementTermDays, label: "账期", onChange: (e) => set("settlementTermDays", e.target.value), children: SETTLEMENT_TERM_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value)) })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "联系人 / 地址" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "联系人", value: form.contactName, onChange: (e) => set("contactName", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "联系电话", value: form.contactPhone, onChange: (e) => set("contactPhone", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "邮箱", value: form.contactEmail, onChange: (e) => set("contactEmail", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "地址", value: form.address, onChange: (e) => set("address", e.target.value) }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "开票信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "纳税人识别号", value: form.taxId, onChange: (e) => set("taxId", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "发票抬头", value: form.invoiceTitle, onChange: (e) => set("invoiceTitle", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "开票电话", value: form.invoicePhone, onChange: (e) => set("invoicePhone", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "开票地址", value: form.invoiceAddress, onChange: (e) => set("invoiceAddress", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "开户银行", value: form.bankName, onChange: (e) => set("bankName", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "开户名称", value: form.bankAccountName, onChange: (e) => set("bankAccountName", e.target.value) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "银行账号", value: form.bankAccount, onChange: (e) => set("bankAccount", e.target.value) }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "组织与会计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "销售组织",
                value: form.salesOrg,
                onChange: (e) => set("salesOrg", e.target.value),
                inputProps: { "data-testid": "cf-sales-org" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "统驭科目",
                value: form.reconciliationAccount,
                onChange: (e) => set("reconciliationAccount", e.target.value),
                inputProps: { "data-testid": "cf-recon-account" }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "税码",
                value: form.taxCode,
                onChange: (e) => set("taxCode", e.target.value),
                inputProps: { "data-testid": "cf-tax-code" }
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 1.5 }, children: "默认交易选项" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "结算币种" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.defaultCurrency, label: "结算币种", onChange: (e) => set("defaultCurrency", e.target.value), children: CURRENCY_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value)) })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "默认税率" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: form.defaultTaxRate, label: "默认税率", onChange: (e) => set("defaultTaxRate", e.target.value), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "不预设" }) }),
                TAX_RATE_OPTIONS.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o.value, children: o.label }, o.value))
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", multiline: true, minRows: 2, label: "备注", value: form.remarks, onChange: (e) => set("remarks", e.target.value) }) })
          ] })
        ] })
      ]
    }
  );
};
export {
  CustomerForm as default
};
