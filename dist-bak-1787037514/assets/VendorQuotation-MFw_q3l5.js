import { j as jsxRuntimeExports, r as reactExports } from "./vendor-react-Cc0tBtdY.js";
import { j as useSettingsStore, a as useVendorStore } from "./index-hTLNcGoC.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { F as FileUpload } from "./FileUpload-p9NND86i.js";
import { b9 as Dialog, ba as DialogTitle, m as Box, T as Typography, aM as IconButton, aV as CloseIcon, bc as DialogContent, bl as Alert, bR as VisibilityOff, bE as DialogActions, bm as Button, d0 as Download, aO as Chip, c2 as Tabs, c3 as Tab, v as Badge, bL as Stack, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bv as TextField, bY as Grid, bS as Visibility, bw as Send } from "./vendor-mui-UhJuRAfR.js";
import { a as formatDate, f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import { g as getVendorPortalIdentity } from "./vendorPortalIdentity-CZOZ1DxO.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const isImage = (f) => f.type && f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name);
const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const FilePreviewModal = ({ open, file, downloadAllowed, onClose }) => {
  if (!file) return null;
  const previewable = isImage(file) || isPdf(file);
  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose, maxWidth: "md", fullWidth: true, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { sx: { fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "center", gap: 1, minWidth: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { noWrap: true, sx: { overflow: "hidden", textOverflow: "ellipsis" }, children: file.name }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, { fontSize: "small" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { dividers: true, children: previewable ? isPdf(file) ? /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: "100%", height: "60vh", bgcolor: "#525659", borderRadius: 1 }, children: file.url ? /* @__PURE__ */ jsxRuntimeExports.jsx("iframe", { src: file.url, title: file.name, width: "100%", height: "100%", style: { border: 0, borderRadius: 4 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 3, color: "#fff" }, children: "预览地址不可用" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "center" }, children: file.url ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: file.url, alt: file.name, style: { maxWidth: "100%", maxHeight: "60vh", borderRadius: 4 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "预览地址不可用" }) }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VisibilityOff, {}), children: [
      "该文件格式（",
      file.type || "未知",
      "）不支持在线预览，请",
      downloadAllowed ? "点击下方按钮下载后查看" : "联系发件方获取",
      "。"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
      !previewable && downloadAllowed && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, {}), onClick: handleDownload, disabled: !file.url, children: "下载文件" }),
      !downloadAllowed && !previewable && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { disabled: true, startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(VisibilityOff, {}), children: "下载受限" }),
      previewable && downloadAllowed && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, {}), onClick: handleDownload, disabled: !file.url, children: "下载" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: onClose, children: "关闭" })
    ] })
  ] });
};
const STATUS_MAP = {
  draft: { label: "草稿", color: "default" },
  published: { label: "已发布", color: "info" },
  closed: { label: "已截止", color: "warning" },
  compared: { label: "已比价", color: "success" },
  quotation_received: { label: "已收到报价", color: "primary" }
};
const FALLBACK_VENDOR_ID = "ven-001";
const FALLBACK_VENDOR_NAME = "上海宝钢钢铁贸易有限公司";
const VendorQuotation = () => {
  const { priceInquiries, vendorQuotations, updatePriceInquiry, addVendorQuotation, updateVendorQuotation } = usePriceStore();
  const { vendorPortalConfig } = useSettingsStore();
  const checkVendorBlacklist = useVendorStore((s) => s.checkVendorBlacklist);
  const vendors = useVendorStore((s) => s.vendors);
  const identity = getVendorPortalIdentity();
  const CURRENT_VENDOR_ID = (identity == null ? void 0 : identity.vendorId) || FALLBACK_VENDOR_ID;
  const CURRENT_VENDOR_NAME = (identity == null ? void 0 : identity.vendorName) || FALLBACK_VENDOR_NAME;
  const selfBlacklist = reactExports.useMemo(
    () => checkVendorBlacklist(CURRENT_VENDOR_ID),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CURRENT_VENDOR_ID, vendors]
  );
  const [submitResult, setSubmitResult] = reactExports.useState(null);
  const [tabValue, setTabValue] = reactExports.useState(0);
  const [selectedInquiry, setSelectedInquiry] = reactExports.useState(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = reactExports.useState(false);
  const [quoteItems, setQuoteItems] = reactExports.useState([]);
  const [quotationValidUntil, setQuotationValidUntil] = reactExports.useState("");
  const [quotationPaymentTerms, setQuotationPaymentTerms] = reactExports.useState("");
  const [quotationRemarks, setQuotationRemarks] = reactExports.useState("");
  const [quotationDeliveryTerms, setQuotationDeliveryTerms] = reactExports.useState("");
  const [inquiryAttachments, setInquiryAttachments] = reactExports.useState([]);
  const [itemAttachments, setItemAttachments] = reactExports.useState({});
  const [preview, setPreview] = reactExports.useState(null);
  const toAttachment = (f) => ({
    id: f.id,
    name: f.name,
    url: f.url || "",
    size: f.size,
    type: f.type,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
    uploadedBy: CURRENT_VENDOR_ID
  });
  const attToFileItem = (a) => ({ id: a.id, name: a.name, size: a.size, type: a.type, url: a.url });
  const isDownloadAllowed = (att) => {
    const policy = vendorPortalConfig.inquiryAttachmentPolicy;
    if (policy === "always") return true;
    if (policy === "viewOnly") return false;
    if (!(att == null ? void 0 : att.uploadedAt)) return true;
    const uploaded = new Date(att.uploadedAt).getTime();
    const limit = vendorPortalConfig.inquiryAttachmentDownloadHours * 3600 * 1e3;
    return Date.now() - uploaded <= limit;
  };
  const persistInquiryAttachments = (level, items) => {
    if (!selectedInquiry) return;
    const updatedItems = selectedInquiry.items.map((it) => ({ ...it, attachments: items[it.id] || [] }));
    updatePriceInquiry(selectedInquiry.id, { attachments: level, items: updatedItems });
  };
  const policyLabel = vendorPortalConfig.inquiryAttachmentPolicy === "always" ? "一直允许下载" : vendorPortalConfig.inquiryAttachmentPolicy === "timed" ? `限时 ${vendorPortalConfig.inquiryAttachmentDownloadHours} 小时内允许下载` : "仅在线查看（禁止下载）";
  const pendingInquiries = reactExports.useMemo(
    () => priceInquiries.filter(
      (i) => (i.status === "published" || i.status === "closed") && i.targetVendorIds.includes(CURRENT_VENDOR_ID)
    ),
    [priceInquiries, CURRENT_VENDOR_ID]
  );
  const submittedQuotations = reactExports.useMemo(
    () => vendorQuotations.filter((q) => q.vendorId === CURRENT_VENDOR_ID),
    [vendorQuotations, CURRENT_VENDOR_ID]
  );
  const columns = reactExports.useMemo(() => [
    { accessorKey: "inquiryNo", header: "询价单号", size: 160 },
    { accessorKey: "title", header: "标题", size: 200 },
    {
      accessorKey: "deadline",
      header: "截止日期",
      cell: ({ row }) => {
        const isOverdue = new Date(row.original.deadline) < /* @__PURE__ */ new Date();
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: isOverdue ? "error" : "inherit", children: [
          formatDate(row.original.deadline),
          isOverdue && " (已过期)"
        ] });
      }
    },
    {
      accessorKey: "items",
      header: "物料数",
      cell: ({ row }) => `${row.original.items.length} 项`
    },
    {
      accessorKey: "totalEstimatedAmount",
      header: "预估总金额",
      cell: ({ row }) => formatCurrency(row.original.totalEstimatedAmount)
    },
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
      }
    }
  ], []);
  const handleOpenQuote = (inquiry) => {
    setSelectedInquiry(inquiry);
    setQuoteItems(inquiry.items.map((item) => ({
      ...item,
      unitPrice: item.estimatedPrice || 0,
      amount: item.estimatedAmount || 0,
      deliveryDays: 15,
      deliveryDate: "",
      itemRemarks: ""
    })));
    setQuotationValidUntil("");
    setQuotationPaymentTerms("");
    setQuotationRemarks("");
    setQuotationDeliveryTerms("");
    setInquiryAttachments(inquiry.attachments || []);
    setItemAttachments(
      inquiry.items.reduce((acc, it) => {
        if (it.attachments && it.attachments.length) acc[it.id] = it.attachments;
        return acc;
      }, {})
    );
    setQuoteDialogOpen(true);
  };
  const handleQuoteItemChange = (idx, field, value) => {
    setQuoteItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "unitPrice") {
        updated.amount = (updated.quantity || 0) * Number(value);
      }
      return updated;
    }));
  };
  const handleSubmitQuotation = () => {
    if (!selectedInquiry) return;
    const bl = checkVendorBlacklist(CURRENT_VENDOR_ID);
    if (bl.blacklisted) {
      alert(
        `贵司已被列入采购黑名单，暂无法提交报价：
原因：${bl.reason || "未填写"}
时间：${bl.blacklistedAt || "—"}

如有异议请联系采购部对接人处理。`
      );
      return;
    }
    if (!quotationValidUntil) {
      alert("请设置报价有效期");
      return;
    }
    persistInquiryAttachments(inquiryAttachments, itemAttachments);
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const today = nowIso.slice(0, 10);
    const totalAmount = quoteItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const items = quoteItems.map((item, idx) => ({
      id: `vqi-${now.getTime()}-${idx}`,
      inquiryItemId: item.id,
      materialId: item.materialId,
      materialCode: item.materialCode,
      materialName: item.materialName,
      specification: item.specification,
      unit: item.unit,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      amount: Number(item.amount) || 0,
      deliveryDays: Number(item.deliveryDays) || 0,
      deliveryDate: item.deliveryDate || void 0,
      remarks: item.itemRemarks || void 0
    }));
    const existing = vendorQuotations.find(
      (q) => q.inquiryId === selectedInquiry.id && q.vendorId === CURRENT_VENDOR_ID
    );
    let quotationNo;
    let quotationId;
    if (existing) {
      quotationNo = existing.quotationNo;
      quotationId = existing.id;
      updateVendorQuotation(existing.id, {
        items,
        totalAmount,
        validUntil: quotationValidUntil,
        paymentTerms: quotationPaymentTerms || void 0,
        deliveryTerms: quotationDeliveryTerms || void 0,
        remarks: quotationRemarks || void 0,
        quotationDate: today,
        status: "submitted",
        submittedAt: nowIso,
        updatedAt: nowIso
      });
    } else {
      const seq = String(vendorQuotations.length + 1).padStart(3, "0");
      quotationNo = `VQ${today.replace(/-/g, "")}${seq}`;
      quotationId = `vq-${now.getTime()}`;
      const quotation = {
        id: quotationId,
        quotationNo,
        inquiryId: selectedInquiry.id,
        inquiryNo: selectedInquiry.inquiryNo,
        vendorId: CURRENT_VENDOR_ID,
        vendorName: CURRENT_VENDOR_NAME,
        quotationDate: today,
        items,
        totalAmount,
        validUntil: quotationValidUntil,
        paymentTerms: quotationPaymentTerms || void 0,
        deliveryTerms: quotationDeliveryTerms || void 0,
        currency: "CNY",
        status: "submitted",
        remarks: quotationRemarks || void 0,
        submittedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      addVendorQuotation(quotation);
    }
    updatePriceInquiry(selectedInquiry.id, {
      status: "quotation_received",
      vendorQuotationId: quotationId,
      vendorQuotationNo: quotationNo
    });
    setSubmitResult({ quotationNo, totalAmount });
    setQuoteDialogOpen(false);
    setTabValue(1);
  };
  const quotationColumns = reactExports.useMemo(() => [
    { accessorKey: "quotationNo", header: "报价单号", size: 160 },
    { accessorKey: "inquiryNo", header: "关联询价单", size: 160 },
    {
      accessorKey: "quotationDate",
      header: "报价日期",
      cell: ({ row }) => formatDate(row.original.quotationDate)
    },
    {
      accessorKey: "items",
      header: "物料数",
      cell: ({ row }) => `${row.original.items.length} 项`
    },
    {
      accessorKey: "totalAmount",
      header: "报价总额",
      cell: ({ row }) => formatCurrency(row.original.totalAmount)
    },
    {
      accessorKey: "validUntil",
      header: "有效期至",
      cell: ({ row }) => formatDate(row.original.validUntil)
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: row.original.status === "submitted" ? "已提交" : "草稿",
          size: "small",
          color: row.original.status === "submitted" ? "success" : "default"
        }
      )
    }
  ], []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "供应商报价管理", children: [
    selfBlacklist.blacklisted && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "error", sx: { mb: 2 }, "data-testid": "portal-blacklist-banner", children: [
      "贵司已被列入采购黑名单（",
      selfBlacklist.blacklistedAt || "—",
      "）：",
      selfBlacklist.reason || "未填写原因",
      "。 期间无法提交任何报价，如有异议请联系采购部对接人。"
    ] }),
    submitResult && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "success", sx: { mb: 2 }, "data-testid": "quotation-submit-result", onClose: () => setSubmitResult(null), children: [
      "报价已提交并回写主系统：报价单 ",
      submitResult.quotationNo,
      "，总额 ",
      formatCurrency(submitResult.totalAmount),
      "，询价单状态已更新为「已收到报价」。"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tabValue, onChange: (_, v) => setTabValue(v), sx: { mb: 2, borderBottom: 1, borderColor: "divider" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { badgeContent: pendingInquiries.length, color: "error", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { paddingRight: 8 }, children: "待报价" }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: `已报价 (${submittedQuotations.length})` })
    ] }),
    tabValue === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: pendingInquiries.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无需报价的询价单" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: pendingInquiries,
        columns,
        enablePagination: true,
        onView: (row) => handleOpenQuote(row),
        onEdit: (row) => handleOpenQuote(row)
      }
    ) }),
    tabValue === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: submittedQuotations,
        columns: quotationColumns,
        enablePagination: true,
        onView: (row) => {
          alert(`报价详情：${row.quotationNo}
报价总额：${formatCurrency(row.totalAmount)}
有效期至：${formatDate(row.validUntil)}`);
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: quoteDialogOpen, onClose: () => setQuoteDialogOpen(false), maxWidth: "lg", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          "提交报价 - ",
          selectedInquiry == null ? void 0 : selectedInquiry.title,
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: [
            "询价单号：",
            selectedInquiry == null ? void 0 : selectedInquiry.inquiryNo,
            " | 供应商：",
            CURRENT_VENDOR_NAME
          ] })
        ] }),
        (selectedInquiry == null ? void 0 : selectedInquiry.deadline) && new Date(selectedInquiry.deadline) < /* @__PURE__ */ new Date() && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "已过期", color: "error", size: "small" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { dividers: true, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, children: "物料报价明细" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, variant: "outlined", sx: { mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料编码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "报价单价" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "报价金额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: "交货天数" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "预计交期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "备注" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: quoteItems.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialCode }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.specification }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.unit }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: item.quantity }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                type: "number",
                value: item.unitPrice,
                onChange: (e) => handleQuoteItemChange(idx, "unitPrice", Number(e.target.value)),
                sx: { width: 100 },
                inputProps: { min: 0, step: 0.01 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: formatCurrency(item.amount) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                type: "number",
                value: item.deliveryDays,
                onChange: (e) => handleQuoteItemChange(idx, "deliveryDays", Number(e.target.value)),
                sx: { width: 70 },
                inputProps: { min: 1 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                type: "date",
                value: item.deliveryDate,
                onChange: (e) => handleQuoteItemChange(idx, "deliveryDate", e.target.value),
                InputLabelProps: { shrink: true },
                sx: { width: 140 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                value: item.itemRemarks,
                onChange: (e) => handleQuoteItemChange(idx, "itemRemarks", e.target.value),
                sx: { width: 100 },
                placeholder: "备注"
              }
            ) })
          ] }, idx)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 2, mb: 2, bgcolor: "#F8FAFC" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "报价总计" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", color: "primary", children: formatCurrency(quoteItems.reduce((sum, item) => sum + item.amount, 0)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, children: "其他信息" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "报价有效期至",
              type: "date",
              value: quotationValidUntil,
              onChange: (e) => setQuotationValidUntil(e.target.value),
              InputLabelProps: { shrink: true },
              required: true,
              sx: { minWidth: 180 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "付款条件",
              value: quotationPaymentTerms,
              onChange: (e) => setQuotationPaymentTerms(e.target.value),
              placeholder: "如：预付30%，货到60天",
              sx: { minWidth: 250 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              label: "交货条件",
              value: quotationDeliveryTerms,
              onChange: (e) => setQuotationDeliveryTerms(e.target.value),
              placeholder: "如：含运费到厂",
              sx: { minWidth: 200 }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            label: "备注",
            value: quotationRemarks,
            onChange: (e) => setQuotationRemarks(e.target.value),
            multiline: true,
            rows: 2,
            sx: { mt: 2 },
            placeholder: "特殊说明、质保承诺等"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, mt: 2, children: "询价附件" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mb: 1.5, fontSize: "0.78rem" }, children: [
          "可上传 word/excel/pdf/ppt/图片等常见格式；系统按设置策略控制下载（当前：",
          policyLabel,
          "）。支持集中上传或按物料单独上传。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "询价单集中附件" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FileUpload,
              {
                value: inquiryAttachments.map(attToFileItem),
                onChange: (files) => {
                  const next = files.map(toAttachment);
                  setInquiryAttachments(next);
                  persistInquiryAttachments(next, itemAttachments);
                },
                accept: ".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
              }
            )
          ] }),
          quoteItems.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 6, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
              "物料附件：",
              item.materialName || item.materialCode
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              FileUpload,
              {
                value: (itemAttachments[item.id] || []).map(attToFileItem),
                onChange: (files) => {
                  const next = files.map(toAttachment);
                  const nextMap = { ...itemAttachments, [item.id]: next };
                  setItemAttachments(nextMap);
                  persistInquiryAttachments(inquiryAttachments, nextMap);
                },
                accept: ".doc,.docx,.xls,.xlsx,.pdf,.ppt,.pptx,.jpg,.jpeg,.png,.gif",
                maxFiles: 5
              }
            )
          ] }, item.id || idx))
        ] }),
        (() => {
          const all = [
            ...inquiryAttachments.map((a) => ({ ...a, scope: "集中" })),
            ...quoteItems.flatMap((it) => (itemAttachments[it.id] || []).map((a) => ({ ...a, scope: it.materialName || it.materialCode })))
          ];
          if (all.length === 0) return null;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "已上传附件（点击预览 / 下载）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, sx: { flexWrap: "wrap", gap: 1, mt: 0.5 }, children: all.map((a, i) => {
              const allowed = isDownloadAllowed(a);
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: `${a.name}（${a.scope}）`,
                  size: "small",
                  variant: "outlined",
                  onClick: () => setPreview({ file: { name: a.name, url: a.url, type: a.type }, downloadAllowed: allowed }),
                  sx: { cursor: "pointer" }
                },
                a.id || i
              );
            }) })
          ] });
        })()
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setQuoteDialogOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => {
          persistInquiryAttachments(inquiryAttachments, itemAttachments);
          setQuoteDialogOpen(false);
          alert("报价已暂存！可稍后继续编辑。（演示模式）");
        }, children: "暂存" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, {}),
            onClick: () => {
              alert("预览报价单（演示模式）");
            },
            children: "预览"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}),
            onClick: handleSubmitQuotation,
            children: "提交报价"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      FilePreviewModal,
      {
        open: Boolean(preview),
        file: (preview == null ? void 0 : preview.file) || null,
        downloadAllowed: (preview == null ? void 0 : preview.downloadAllowed) ?? false,
        onClose: () => setPreview(null)
      }
    )
  ] });
};
export {
  VendorQuotation as default
};
