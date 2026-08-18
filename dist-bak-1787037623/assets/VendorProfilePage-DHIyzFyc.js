import { h as useNavigate, R as React, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { a as useVendorStore } from "./index-CU2cqxc8.js";
import { a as formatDate } from "./format-DXPckS9-.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { g as getVendorPortalIdentity } from "./vendorPortalIdentity-Vis7UByW.js";
import { bl as Alert, aS as Paper, m as Box, bL as Stack, b4 as Avatar, T as Typography, aO as Chip, bm as Button, cT as Cancel, bd as Save, bi as Edit, bY as Grid, a2 as VerifiedUser, aH as AccountBalance, bW as CheckCircle, c2 as Tabs, c3 as Tab, bK as Business, af as Article, ag as ReceiptIcon, aG as Lock, bh as Add, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, Y as Description, p as Tooltip, aM as IconButton, c$ as Image, d0 as Download, d1 as Info, bs as Card, cJ as Snackbar, bv as TextField } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const DEFAULT_PROFILE = {
  companyName: "钢铁联合集团",
  shortName: "钢铁联合",
  unifiedCode: "91310000MA1FLXXXXX",
  businessLicense: "SH-2015-123456",
  legalRepresentative: "陈志远",
  registeredCapital: "5000万元人民币",
  establishedDate: "2015-03-15",
  companyType: "有限责任公司",
  address: "上海市宝山区宝钢路100号",
  website: "https://www.ironunion.com",
  contact: "张建国",
  contactPhone: "13800138001",
  contactEmail: "zhangjg@ironunion.com",
  emergencyContact: "李明辉",
  emergencyPhone: "13800138002",
  supplyCategories: ["钢材", "板材", "型材", "管材"],
  mainProducts: "热轧钢板 Q235B、H型钢 Q345B、冷轧板 SPCC、镀锌板 DX51D",
  annualRevenue: "12亿元",
  employeeCount: "500-1000人",
  certifications: [
    { id: "cert-1", name: "ISO 9001:2015 质量管理体系", certNo: "ISO9001-2023-001234", issuingAuthority: "SGS通标标准技术服务有限公司", issueDate: "2023-01-15", expiryDate: "2026-01-14", fileUrl: "/uploads/certs/iso9001.pdf" },
    { id: "cert-2", name: "ISO 14001:2015 环境管理体系", certNo: "ISO14001-2023-005678", issuingAuthority: "中国质量认证中心", issueDate: "2023-02-20", expiryDate: "2026-02-19", fileUrl: "/uploads/certs/iso14001.pdf" },
    { id: "cert-3", name: "OHSAS 18001 职业健康安全", certNo: "OHS-2023-009012", issuingAuthority: "德国莱茵TÜV", issueDate: "2022-06-10", expiryDate: "2025-06-09", fileUrl: "/uploads/certs/ohsas.pdf" }
  ],
  bankName: "中国工商银行上海宝山支行",
  bankAccount: "6222031234567890001",
  bankAccountName: "钢铁联合集团",
  bankBranch: "上海市宝山区宝钢路50号",
  swiftCode: "ICBKCNBJBJG",
  invoiceTitle: "钢铁联合集团",
  taxId: "91310000MA1FLXXXXX",
  invoiceAddress: "上海市宝山区宝钢路100号",
  invoicePhone: "021-56667890",
  invoiceBank: "中国工商银行上海宝山支行",
  invoiceBankAccount: "6222031234567890001",
  // 甲方确认的信息 —— 供应商不可编辑
  buyerConfirmed: {
    accountPeriod: "月结60天",
    creditLimit: "¥500万元",
    rating: "A级",
    ratingDate: "2024-01-15",
    approvedStatus: "已准入",
    approvedDate: "2023-05-10",
    contractStart: "2024-01-01",
    contractEnd: "2024-12-31",
    qualityScore: "96.5分",
    deliveryScore: "94.2分",
    assignedCategories: ["钢材", "板材", "型材"],
    remarks: "年度框架协议供应商，享受优先采购权",
    confirmedBy: "采购部主管 — 王采购",
    confirmedAt: "2024-01-15 10:00:00"
  }
};
const buildProfileFromMaster = (vendorId) => {
  const vendor = useVendorStore.getState().vendors.find((v) => v.id === vendorId);
  if (!vendor) return DEFAULT_PROFILE;
  const pending = vendor.profilePending || {};
  const base = {
    ...DEFAULT_PROFILE,
    companyName: vendor.name,
    shortName: vendor.shortName || DEFAULT_PROFILE.shortName,
    unifiedCode: vendor.taxId || DEFAULT_PROFILE.unifiedCode,
    contact: vendor.contact || DEFAULT_PROFILE.contact,
    contactPhone: vendor.phone || DEFAULT_PROFILE.contactPhone,
    contactEmail: vendor.email || DEFAULT_PROFILE.contactEmail,
    address: vendor.address || DEFAULT_PROFILE.address,
    bankAccount: vendor.bankAccount || DEFAULT_PROFILE.bankAccount,
    bankAccountName: vendor.name,
    invoiceTitle: vendor.name,
    taxId: vendor.taxId || DEFAULT_PROFILE.taxId,
    invoiceBankAccount: vendor.bankAccount || DEFAULT_PROFILE.invoiceBankAccount,
    buyerConfirmed: {
      ...DEFAULT_PROFILE.buyerConfirmed,
      creditLimit: vendor.creditLimit != null ? `¥${vendor.creditLimit.toLocaleString("zh-CN")}` : DEFAULT_PROFILE.buyerConfirmed.creditLimit,
      rating: vendor.creditLevel || (vendor.rating != null ? `${vendor.rating} 分` : DEFAULT_PROFILE.buyerConfirmed.rating),
      approvedStatus: vendor.status === "approved" ? "已准入" : vendor.status === "blacklisted" ? "已拉黑" : "审核中"
    }
  };
  const { buyerConfirmed: _ignored, ...editable } = pending;
  return { ...base, ...editable, buyerConfirmed: base.buyerConfirmed };
};
const VendorProfilePage = () => {
  const navigate = useNavigate();
  const identity = getVendorPortalIdentity();
  const vendorId = (identity == null ? void 0 : identity.vendorId) || "ven-001";
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const vendorRecord = useVendorStore((s) => s.vendors.find((v) => v.id === vendorId));
  const initial = React.useMemo(() => buildProfileFromMaster(vendorId), [vendorId]);
  const [profile, setProfile] = reactExports.useState(initial);
  const [editing, setEditing] = reactExports.useState(false);
  const [tabIdx, setTabIdx] = reactExports.useState(0);
  const [snackbar, setSnackbar] = reactExports.useState("");
  const [editCache, setEditCache] = reactExports.useState(initial);
  reactExports.useEffect(() => {
    const stored = sessionStorage.getItem("vendorPortalUser");
    if (!stored) navigate("/vendor-portal/login");
  }, [navigate]);
  const handleEdit = () => {
    setEditCache(JSON.parse(JSON.stringify(profile)));
    setEditing(true);
  };
  const handleSave = () => {
    setProfile(editCache);
    setEditing(false);
    const { buyerConfirmed: _readonly, ...editable } = editCache;
    updateVendor(vendorId, {
      profilePending: editable,
      profilePendingAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " "),
      profilePendingBy: (identity == null ? void 0 : identity.name) || editCache.contact
    });
    setSnackbar("资料已提交甲方审核，审核通过后并入供应商主数据");
  };
  const handleCancel = () => {
    setEditing(false);
    setEditCache(JSON.parse(JSON.stringify(profile)));
  };
  const updateField = (section, field, value) => {
    setEditCache((prev) => {
      if (section === "buyerConfirmed") return prev;
      return { ...prev, [field]: value };
    });
  };
  const current = editing ? editCache : profile;
  const renderField = (label, value, field, section, multiline = false) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: section === "buyerConfirmed" ? 4 : 6, children: editing && section !== "buyerConfirmed" && field ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    TextField,
    {
      fullWidth: true,
      size: "small",
      label,
      value,
      onChange: (e) => updateField(section, field, e.target.value),
      multiline,
      rows: multiline ? 2 : 1
    }
  ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1.5 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mb: 0.2 }, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: value || "-" })
  ] }) }, label);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商资料管理", children: [
    (vendorRecord == null ? void 0 : vendorRecord.profilePendingAt) && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "warning", sx: { mb: 2 }, "data-testid": "profile-pending-banner", children: [
      "资料变更已提交主系统待审（提交人：",
      vendorRecord.profilePendingBy || "-",
      " · ",
      vendorRecord.profilePendingAt,
      "）， 甲方审核通过后并入供应商主数据。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
        p: 2.5,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #E2E8F0",
        background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: "#3B82F6", width: 44, height: 44, fontWeight: 700 }, children: profile.companyName.slice(0, 1) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, children: profile.companyName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: profile.buyerConfirmed.approvedStatus,
                  color: "success",
                  sx: { fontWeight: 600 }
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "统一社会信用代码：",
              profile.unifiedCode,
              " · 供应商代码：",
              (vendorRecord == null ? void 0 : vendorRecord.code) || (identity == null ? void 0 : identity.code) || "-"
            ] })
          ] })
        ] }),
        editing ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}), onClick: handleCancel, children: "取消" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", onClick: () => alert("资料已暂存！（演示模式）"), children: "暂存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, children: "保存" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}), onClick: handleEdit, children: "编辑资料" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 0, children: [
        { label: "综合评级", value: profile.buyerConfirmed.rating, color: "#10B981", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VerifiedUser, {}) },
        { label: "账期", value: profile.buyerConfirmed.accountPeriod, color: "#3B82F6", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, {}) },
        { label: "信用额度", value: profile.buyerConfirmed.creditLimit, color: "#6366F1", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, {}) },
        { label: "质量评分", value: profile.buyerConfirmed.qualityScore, color: "#F59E0B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}) },
        { label: "交付评分", value: profile.buyerConfirmed.deliveryScore, color: "#10B981", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}) }
      ].map(({ label, value, color, icon }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, borderBottom: "1px solid #E2E8F0", borderRight: "1px solid #F1F5F9", textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color, display: "flex", justifyContent: "center", mb: 0.5 }, children: icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, sx: { color }, children: value }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: label })
      ] }) }, label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Tabs,
        {
          value: tabIdx,
          onChange: (_, v) => setTabIdx(v),
          sx: { px: 2, borderBottom: "1px solid #E2E8F0" },
          variant: "scrollable",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Business, {}), iconPosition: "start", label: "基础资料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Article, {}), iconPosition: "start", label: "证书资质" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccountBalance, {}), iconPosition: "start", label: "银行资料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, {}), iconPosition: "start", label: "开票资料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, {}), iconPosition: "start", label: "甲方确认信息" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
        tabIdx === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          renderField("企业全称", current.companyName, "companyName", "basic"),
          renderField("企业简称", current.shortName, "shortName", "basic"),
          renderField("统一社会信用代码", current.unifiedCode, "unifiedCode", "basic"),
          renderField("营业执照号", current.businessLicense, "businessLicense", "basic"),
          renderField("法定代表人", current.legalRepresentative, "legalRepresentative", "basic"),
          renderField("注册资本", current.registeredCapital, "registeredCapital", "basic"),
          renderField("成立日期", current.establishedDate, "establishedDate", "basic"),
          renderField("企业类型", current.companyType, "companyType", "basic"),
          renderField("企业地址", current.address, "address", "basic"),
          renderField("企业网址", current.website, "website", "basic"),
          renderField("联系人", current.contact, "contact", "basic"),
          renderField("联系电话", current.contactPhone, "contactPhone", "basic"),
          renderField("联系邮箱", current.contactEmail, "contactEmail", "basic"),
          renderField("紧急联系人", current.emergencyContact, "emergencyContact", "basic"),
          renderField("紧急电话", current.emergencyPhone, "emergencyPhone", "basic"),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mb: 0.5 }, children: "供货品类" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: current.supplyCategories.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: cat, size: "small", color: "primary", variant: "outlined" }, cat)) })
          ] }) }),
          renderField("主营产品", current.mainProducts, "mainProducts", "basic", true),
          renderField("年营业额", current.annualRevenue, "annualRevenue", "basic"),
          renderField("员工规模", current.employeeCount, "employeeCount", "basic")
        ] }),
        tabIdx === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, sx: { mb: 2 }, children: "证书资质" }),
          editing && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), sx: { mb: 2, borderRadius: 2 }, children: "上传新证书" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "证书名称" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "证书编号" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "颁发机构" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "颁发日期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "到期日期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, align: "center", children: "操作" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: current.certifications.map((cert) => {
              const isExpired = new Date(cert.expiryDate) < /* @__PURE__ */ new Date();
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, sx: isExpired ? { bgcolor: "#FEF2F2" } : {}, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { sx: { color: isExpired ? "#EF4444" : "#3B82F6", fontSize: 18 } }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: cert.name })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace", fontSize: "0.8rem" }, children: cert.certNo }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontSize: "0.8125rem" }, children: cert.issuingAuthority }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: formatDate(cert.issueDate) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: isExpired ? "error.main" : "text.primary", children: formatDate(cert.expiryDate) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    icon: isExpired ? /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
                    label: isExpired ? "已过期" : "有效",
                    size: "small",
                    color: isExpired ? "error" : "success",
                    variant: "outlined"
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, justifyContent: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看文件", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { fontSize: "small" }) }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "下载", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "primary", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { fontSize: "small" }) }) })
                ] }) })
              ] }, cert.id);
            }) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mt: 2, fontSize: "0.8125rem" }, children: "证书过期前请及时更新，避免影响供应商资格审核" })
        ] }),
        tabIdx === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {}), sx: { fontSize: "0.8125rem", mb: 1 }, children: "银行资料用于付款结算，请确保信息准确。修改后将触发甲方财务重新审核。" }) }),
          renderField("银行名称", current.bankName, "bankName", "bank"),
          renderField("银行账号", current.bankAccount, "bankAccount", "bank"),
          renderField("账户名称", current.bankAccountName, "bankAccountName", "bank"),
          renderField("开户支行", current.bankBranch, "bankBranch", "bank"),
          renderField("SWIFT Code", current.swiftCode, "swiftCode", "bank")
        ] }),
        tabIdx === 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, {}), sx: { fontSize: "0.8125rem", mb: 1 }, children: "开票资料用于生成增值税发票，请确保与税务登记信息一致。" }) }),
          renderField("发票抬头", current.invoiceTitle, "invoiceTitle", "invoice"),
          renderField("纳税人识别号", current.taxId, "taxId", "invoice"),
          renderField("开票地址", current.invoiceAddress, "invoiceAddress", "invoice"),
          renderField("开票电话", current.invoicePhone, "invoicePhone", "invoice"),
          renderField("开票银行", current.invoiceBank, "invoiceBank", "invoice"),
          renderField("开票银行账号", current.invoiceBankAccount, "invoiceBankAccount", "invoice")
        ] }),
        tabIdx === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 2.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Lock, { sx: { color: "#64748B", fontSize: 18 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "甲方确认信息" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "只读", size: "small", color: "default", variant: "outlined" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { flex: 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "确认人：",
              profile.buyerConfirmed.confirmedBy,
              " · ",
              profile.buyerConfirmed.confirmedAt
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2, fontSize: "0.8125rem" }, children: "以下信息由甲方（采购方）确认，供应商不可修改。如有异议请联系采购负责人。" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "outlined", sx: { p: 2, borderRadius: 2, bgcolor: "#F8FAFC" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "准入状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: profile.buyerConfirmed.approvedStatus, color: "success", size: "small", sx: { mt: 0.5 } })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "outlined", sx: { p: 2, borderRadius: 2, bgcolor: "#F8FAFC" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "综合评级" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: "#3B82F6", children: profile.buyerConfirmed.rating }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                "评级日期：",
                profile.buyerConfirmed.ratingDate
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "outlined", sx: { p: 2, borderRadius: 2, bgcolor: "#F8FAFC" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "合同有效期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", fontWeight: 600, children: [
                profile.buyerConfirmed.contractStart,
                " ~ ",
                profile.buyerConfirmed.contractEnd
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mt: 1 }, children: [
            renderField("账期", profile.buyerConfirmed.accountPeriod, void 0, "buyerConfirmed"),
            renderField("信用额度", profile.buyerConfirmed.creditLimit, void 0, "buyerConfirmed"),
            renderField("质量评分", profile.buyerConfirmed.qualityScore, void 0, "buyerConfirmed"),
            renderField("交付评分", profile.buyerConfirmed.deliveryScore, void 0, "buyerConfirmed"),
            renderField("准入日期", profile.buyerConfirmed.approvedDate, void 0, "buyerConfirmed"),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1.5 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { display: "block", mb: 0.5 }, children: "分配供货品类" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", useFlexGap: true, children: profile.buyerConfirmed.assignedCategories.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: cat, size: "small", color: "primary", variant: "outlined" }, cat)) })
            ] }) }),
            renderField("备注", profile.buyerConfirmed.remarks, void 0, "buyerConfirmed")
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: Boolean(snackbar),
        autoHideDuration: 3e3,
        onClose: () => setSnackbar(""),
        message: snackbar
      }
    )
  ] });
};
export {
  VendorProfilePage as default
};
