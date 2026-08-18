import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, aP as Paper, bV as CheckCircle, h as Typography, bK as Stack, bk as Button, bX as Grid, bz as Stepper, bA as Step, bB as StepLabel, d4 as StepContent, bj as Alert, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, B as Box, aL as Chip, i as Divider, bZ as AttachFile, bY as ArrowBack, b_ as ArrowForward, bu as Send, bJ as Business, b$ as ContactPage, aD as AccountBalance } from "./vendor-DGU5TO-x.js";
import { m as useFlowStore } from "./index-DeeqqmHA.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
const steps = [
  { label: "企业基本信息", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Business, {}) },
  { label: "联系人信息", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ContactPage, {}) },
  { label: "供货能力", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Business, {}) },
  { label: "银行与资质", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, {}) },
  { label: "附件上传", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachFile, {}) }
];
const VendorRegister = () => {
  const navigate = useNavigate();
  const addVendorApplication = useFlowStore((s) => s.addVendorApplication);
  const [activeStep, setActiveStep] = reactExports.useState(0);
  const [appNo, setAppNo] = reactExports.useState("");
  const [form, setForm] = reactExports.useState({
    // Step 0 企业基本信息
    companyName: "",
    unifiedCode: "",
    businessLicense: "",
    legalRepresentative: "",
    registeredCapital: "",
    establishedDate: "",
    companyType: "",
    address: "",
    website: "",
    // Step 1 联系人
    contact: "",
    contactPhone: "",
    contactEmail: "",
    contactPosition: "",
    // Step 2 供货能力
    supplyCategories: [],
    mainProducts: "",
    annualRevenue: "",
    employeeCount: "",
    productionArea: "",
    certifications: [],
    // Step 3 银行与资质
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
    taxId: "",
    taxRate: "13",
    qualificationExpiry: "",
    // Step 4 备注
    remarks: "",
    // 组织与会计
    salesOrg: "",
    reconciliationAccount: "",
    taxCode: ""
  });
  const [submitted, setSubmitted] = reactExports.useState(false);
  const categoryOptions = [
    "钢材",
    "有色金属",
    "紧固件",
    "五金工具",
    "电气元件",
    "电子元器件",
    "机械零件",
    "精密加工件",
    "化工材料",
    "包装材料",
    "劳保用品",
    "办公用品",
    "设备配件",
    "服务类"
  ];
  const certOptions = ["ISO9001", "ISO14001", "IATF16949", "CE认证", "CCC认证", "RoHS认证", "SGS认证"];
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleArray = (k, v) => {
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]
    }));
  };
  if (submitted) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "供应商注册", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 6, textAlign: "center", border: "1px solid rgba(226,232,240,.8)", borderRadius: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 64, color: "#10B981", mb: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, sx: { mb: 1 }, children: "注册申请已提交！" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { color: "text.secondary", sx: { mb: 3 }, children: [
        "您的供应商注册申请已成功提交，申请编号：",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          "VA",
          (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, ""),
          "001"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "我们将在 3-5 个工作日内完成审核，审核结果将通过邮件通知您。"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, justifyContent: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => navigate("/vendor/list"), children: "查看供应商列表" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => {
          setSubmitted(false);
          setActiveStep(0);
        }, children: "重新提交" })
      ] })
    ] }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageWrapper,
    {
      title: "供应商注册申请",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "vendor-registration", currentStatus: "vr_submitted" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/vendor/list"), children: "返回列表" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 2, border: "1px solid rgba(226,232,240,.8)", borderRadius: 2, position: "sticky", top: 80 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 2, color: "#475569" }, children: "填写步骤" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep, orientation: "vertical", children: steps.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Step, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              StepLabel,
              {
                StepIconProps: { sx: { fontSize: 22 } },
                sx: { cursor: i <= activeStep ? "pointer" : "default" },
                onClick: () => i <= activeStep && setActiveStep(i),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: activeStep === i ? 600 : 400, children: s.label })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(StepContent, {})
          ] }, s.label)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 9, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { elevation: 0, sx: { p: 3, border: "1px solid rgba(226,232,240,.8)", borderRadius: 2 }, children: [
          activeStep === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2 }, children: "企业基本信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, fontSize: "0.8125rem" }, children: "请如实填写企业信息，与营业执照保持一致，信息将用于资质审核。" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "企业全称 *", value: form.companyName, onChange: (e) => update("companyName", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "统一社会信用代码 *", value: form.unifiedCode, onChange: (e) => update("unifiedCode", e.target.value), inputProps: { style: { fontFamily: "monospace" } } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "营业执照号", value: form.businessLicense, onChange: (e) => update("businessLicense", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "法定代表人 *", value: form.legalRepresentative, onChange: (e) => update("legalRepresentative", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "注册资本（万元）", type: "number", value: form.registeredCapital, onChange: (e) => update("registeredCapital", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "成立日期", type: "date", InputLabelProps: { shrink: true }, value: form.establishedDate, onChange: (e) => update("establishedDate", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "企业类型" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.companyType, label: "企业类型", onChange: (e) => update("companyType", e.target.value), children: ["生产商", "贸易商", "代理商", "服务商", "其他"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t, children: t }, t)) })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "注册地址 *", value: form.address, onChange: (e) => update("address", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "企业官网", value: form.website, onChange: (e) => update("website", e.target.value) }) })
            ] })
          ] }),
          activeStep === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2 }, children: "联系人信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "联系人姓名 *", value: form.contact, onChange: (e) => update("contact", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "职位", value: form.contactPosition, onChange: (e) => update("contactPosition", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "联系电话 *", value: form.contactPhone, onChange: (e) => update("contactPhone", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "联系邮箱 *", type: "email", value: form.contactEmail, onChange: (e) => update("contactEmail", e.target.value) }) })
            ] })
          ] }),
          activeStep === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2 }, children: "供货能力" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1 }, children: "供货类目（可多选）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.8 }, children: categoryOptions.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: c,
                    size: "small",
                    color: form.supplyCategories.includes(c) ? "primary" : "default",
                    onClick: () => toggleArray("supplyCategories", c),
                    sx: { cursor: "pointer" }
                  },
                  c
                )) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "主要产品 *", multiline: true, rows: 2, value: form.mainProducts, onChange: (e) => update("mainProducts", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "年销售额（万元）", value: form.annualRevenue, onChange: (e) => update("annualRevenue", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "员工人数", type: "number", value: form.employeeCount, onChange: (e) => update("employeeCount", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "生产面积（㎡）", type: "number", value: form.productionArea, onChange: (e) => update("productionArea", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1 }, children: "已获得认证" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 0.8 }, children: certOptions.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: c,
                    size: "small",
                    color: form.certifications.includes(c) ? "success" : "default",
                    onClick: () => toggleArray("certifications", c),
                    sx: { cursor: "pointer" }
                  },
                  c
                )) })
              ] })
            ] })
          ] }),
          activeStep === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2 }, children: "银行与财税信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "开户银行 *", value: form.bankName, onChange: (e) => update("bankName", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "银行账号 *", value: form.bankAccount, onChange: (e) => update("bankAccount", e.target.value), inputProps: { style: { fontFamily: "monospace" } } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "账户名称 *", value: form.bankAccountName, onChange: (e) => update("bankAccountName", e.target.value) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "纳税人识别号", value: form.taxId, onChange: (e) => update("taxId", e.target.value), inputProps: { style: { fontFamily: "monospace" } } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "增值税税率" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { value: form.taxRate, label: "增值税税率", onChange: (e) => update("taxRate", e.target.value), children: ["13", "9", "6", "3", "0"].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: r, children: [
                  r,
                  "%"
                ] }, r)) })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, size: "small", label: "资质有效期", type: "date", InputLabelProps: { shrink: true }, value: form.qualificationExpiry, onChange: (e) => update("qualificationExpiry", e.target.value) }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, sx: { mb: 1.5 }, children: "组织与会计" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  size: "small",
                  label: "采购组织",
                  value: form.salesOrg,
                  onChange: (e) => update("salesOrg", e.target.value),
                  inputProps: { "data-testid": "vr-sales-org" }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  size: "small",
                  label: "统驭科目",
                  value: form.reconciliationAccount,
                  onChange: (e) => update("reconciliationAccount", e.target.value),
                  inputProps: { "data-testid": "vr-recon-account" }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  fullWidth: true,
                  size: "small",
                  label: "税码",
                  value: form.taxCode,
                  onChange: (e) => update("taxCode", e.target.value),
                  inputProps: { "data-testid": "vr-tax-code" }
                }
              ) })
            ] })
          ] }),
          activeStep === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2 }, children: "附件上传" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { mb: 2, fontSize: "0.8125rem" }, children: "请上传以下必要文件：营业执照副本（必填）、质量认证证书（如有）、银行开户许可证（如有）" }),
            [
              { label: "营业执照副本 *", key: "license", required: true },
              { label: "质量认证证书", key: "cert", required: false },
              { label: "银行开户许可证", key: "bank", required: false },
              { label: "其他资质文件", key: "other", required: false }
            ].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
              mb: 2,
              p: 2,
              border: "2px dashed rgba(226,232,240,.8)",
              borderRadius: 2,
              textAlign: "center",
              cursor: "pointer",
              "&:hover": { borderColor: "#3B82F6", bgcolor: "#EFF6FF" }
            }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(AttachFile, { sx: { fontSize: 24, color: "#94A3B8", mb: 0.5 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: f.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "点击或拖拽上传 PDF/JPG/PNG，单文件≤10MB" })
            ] }, f.key)),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                size: "small",
                label: "补充说明",
                multiline: true,
                rows: 3,
                value: form.remarks,
                onChange: (e) => update("remarks", e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mt: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", disabled: activeStep === 0, onClick: () => setActiveStep((s) => s - 1), startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), children: "上一步" }),
            activeStep < steps.length - 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", onClick: () => setActiveStep((s) => s + 1), endIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForward, {}), children: "下一步" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => alert("供应商注册申请已暂存！（演示模式）"), children: "暂存" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "success", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}), onClick: () => {
                const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
                const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
                const applicationNo = `VA${dateStr}${Math.floor(Math.random() * 900 + 100)}`;
                const newApp = {
                  id: `app-${Date.now()}`,
                  applicationNo,
                  companyName: form.companyName || "未命名供应商",
                  unifiedCode: form.unifiedCode,
                  businessLicense: form.businessLicense,
                  legalRepresentative: form.legalRepresentative,
                  registeredCapital: form.registeredCapital,
                  contact: form.contact,
                  contactPhone: form.contactPhone,
                  contactEmail: form.contactEmail,
                  address: form.address,
                  supplyCategories: form.supplyCategories,
                  mainProducts: form.mainProducts,
                  annualRevenue: form.annualRevenue,
                  certifications: form.certifications,
                  bankName: form.bankName,
                  bankAccount: form.bankAccount,
                  bankAccountName: form.bankAccountName,
                  attachments: [],
                  status: "submitted",
                  submittedAt: now,
                  createdAt: now,
                  updatedAt: now
                };
                addVendorApplication(newApp);
                setAppNo(applicationNo);
                setSubmitted(true);
              }, children: "提交注册申请" })
            ] })
          ] })
        ] }) })
      ] })
    }
  );
};
export {
  VendorRegister as default
};
