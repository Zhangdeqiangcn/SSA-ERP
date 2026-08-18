import { cJ as useParams, aG as useNavigate, j as jsxRuntimeExports, bj as Alert, r as reactExports, aP as Paper, bK as Stack, B as Box, h as Typography, aL as Chip, bV as CheckCircle, d$ as Radio, bk as Button, bu as Send, bY as ArrowBack } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { a as formatDate, f as formatCurrency } from "./format-DnEevvSX.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as usePriceStore } from "./priceStore-CduvTkzQ.js";
import "./StatusBadge-DeJuhK-R.js";
const PriceComparison = () => {
  const { priceComparisons, priceInquiries, vendorQuotations } = usePriceStore();
  const { id, inquiryId } = useParams();
  const navigate = useNavigate();
  let comparison;
  let inquiry;
  if (id && id !== "new") {
    comparison = priceComparisons.find((c) => c.id === id);
  }
  if (inquiryId) {
    inquiry = priceInquiries.find((i) => i.id === inquiryId);
  }
  if (id && id !== "new" && !comparison) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "比价单", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "比价单不存在" }) });
  }
  const [selections, setSelections] = reactExports.useState({});
  const [submitted, setSubmitted] = reactExports.useState(false);
  let displayData;
  if (comparison) {
    displayData = comparison;
  } else if (inquiry) {
    const relatedQuotations = vendorQuotations.filter((q) => q.inquiryId === inquiry.id);
    const items = inquiry.items.map((item) => {
      var _a, _b, _c, _d;
      const quotes = relatedQuotations.map((q) => {
        const quoteItem = q.items.find((qi) => qi.materialId === item.materialId || qi.materialCode === item.materialCode);
        if (!quoteItem) return null;
        return {
          vendorId: q.vendorId,
          vendorName: q.vendorName,
          quotationId: q.id,
          quotationNo: q.quotationNo,
          unitPrice: quoteItem.unitPrice,
          amount: quoteItem.amount,
          deliveryDays: quoteItem.deliveryDays,
          deliveryDate: quoteItem.deliveryDate,
          paymentTerms: q.paymentTerms,
          remarks: q.remarks,
          isLowest: false
        };
      }).filter(Boolean);
      if (quotes.length > 0) {
        const lowest = quotes.reduce((min, q) => q.unitPrice < min.unitPrice ? q : min, quotes[0]);
        quotes.forEach((q) => {
          q.isLowest = q.unitPrice === lowest.unitPrice;
        });
        const lowestVendor = quotes.find((q) => q.isLowest);
        if (lowestVendor && !selections[item.materialId]) {
          selections[item.materialId] = lowestVendor.vendorId;
        }
      }
      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        quotations: quotes,
        lowestVendorId: ((_a = quotes.find((q) => q.isLowest)) == null ? void 0 : _a.vendorId) || "",
        lowestVendorName: ((_b = quotes.find((q) => q.isLowest)) == null ? void 0 : _b.vendorName) || "",
        lowestUnitPrice: ((_c = quotes.find((q) => q.isLowest)) == null ? void 0 : _c.unitPrice) || 0,
        lowestAmount: ((_d = quotes.find((q) => q.isLowest)) == null ? void 0 : _d.amount) || 0
      };
    });
    displayData = {
      inquiryId: inquiry.id,
      inquiryNo: inquiry.inquiryNo,
      title: inquiry.title,
      comparisonDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      items,
      participatingVendors: relatedQuotations.map((q) => q.vendorName),
      status: "pending"
    };
  }
  if (!displayData) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "比价单", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "无法生成比价单" }) });
  }
  const totalLowest = displayData.items.reduce((sum, item) => sum + (item.lowestAmount || 0), 0);
  const handleSelectVendor = (materialId, vendorId) => {
    setSelections((prev) => ({ ...prev, [materialId]: vendorId }));
  };
  const handleSubmitApproval = () => {
    const hasUnselected = displayData.items.some((item) => !selections[item.materialId]);
    if (hasUnselected) {
      alert("请为所有物料选择供应商");
      return;
    }
    setSubmitted(true);
    const selectedItems = displayData.items.map((item) => {
      const selectedQuote = item.quotations.find((q) => q.vendorId === selections[item.materialId]);
      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        selectedVendorId: (selectedQuote == null ? void 0 : selectedQuote.vendorId) || "",
        selectedVendorName: (selectedQuote == null ? void 0 : selectedQuote.vendorName) || "",
        selectedUnitPrice: (selectedQuote == null ? void 0 : selectedQuote.unitPrice) || 0,
        selectedAmount: (selectedQuote == null ? void 0 : selectedQuote.amount) || 0,
        deliveryDays: (selectedQuote == null ? void 0 : selectedQuote.deliveryDays) || 0,
        deliveryDate: (selectedQuote == null ? void 0 : selectedQuote.deliveryDate) || "",
        paymentTerms: (selectedQuote == null ? void 0 : selectedQuote.paymentTerms) || ""
      };
    });
    navigate("/price/approval/new", {
      state: {
        comparisonId: (comparison == null ? void 0 : comparison.id) || "new",
        comparisonNo: (comparison == null ? void 0 : comparison.comparisonNo) || "",
        inquiryId: displayData.inquiryId,
        inquiryNo: displayData.inquiryNo,
        title: displayData.title,
        items: selectedItems,
        totalAmount: selectedItems.reduce((sum, i) => sum + i.selectedAmount, 0)
      }
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: comparison ? `比价单 ${comparison.comparisonNo}` : "新建比价单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FlowTracker,
          {
            module: "price-comparison",
            currentStatus: displayData.status || "pending",
            documentNo: (comparison == null ? void 0 : comparison.comparisonNo) || displayData.inquiryNo
          }
        ),
        !comparison && !submitted && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => alert("比价单已暂存！（演示模式）"), children: "暂存" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "contained",
              color: "primary",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, {}),
              onClick: handleSubmitApproval,
              children: "提交价格审批"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
            onClick: () => navigate(comparison ? "/price/comparisons" : `/price/inquiry/${displayData.inquiryId}`),
            children: "返回"
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 4, flexWrap: "wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "比价单号" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: (comparison == null ? void 0 : comparison.comparisonNo) || "新建" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "关联询价单" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: displayData.inquiryNo })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "标题" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: displayData.title })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "比价日期" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: formatDate(displayData.comparisonDate) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "参与报价供应商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, mt: 0.5, children: displayData.participatingVendors.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: name, size: "small", variant: "outlined", sx: { fontSize: "0.7rem" } }, name)) })
          ] }),
          comparison && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "状态" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: comparison.status === "selected" ? "已选定" : comparison.status === "approved" ? "已审批" : "待选定",
                size: "small",
                color: comparison.status === "approved" ? "success" : "warning"
              }
            )
          ] })
        ] }) }),
        displayData.items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1.5, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
              "物料 ",
              idx + 1,
              "：",
              item.materialName,
              "（",
              item.materialCode,
              "）"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${item.specification} | ${item.quantity}${item.unit}`, size: "small", variant: "outlined" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            DataTable,
            {
              data: item.quotations.map((q) => ({ ...q, id: q.vendorId })),
              enablePagination: false,
              enableRowSelection: false,
              sapStyle: true,
              columns: [
                {
                  id: "select",
                  header: !comparison ? "选择" : "已选",
                  enableSorting: false,
                  cell: ({ row }) => {
                    var _a, _b, _c, _d;
                    const q = row.original;
                    const isSelected = (comparison == null ? void 0 : comparison.status) === "approved" || (comparison == null ? void 0 : comparison.status) === "selected" ? q.vendorId === ((_b = (_a = comparison == null ? void 0 : comparison.items) == null ? void 0 : _a[idx]) == null ? void 0 : _b.selectedVendorId) : selections[item.materialId] === q.vendorId;
                    return (comparison == null ? void 0 : comparison.status) === "approved" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { color: "success", fontSize: "small" }) : (comparison == null ? void 0 : comparison.status) === "selected" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Chip,
                      {
                        label: "已选定",
                        size: "small",
                        color: "primary",
                        sx: q.vendorId === ((_d = (_c = comparison == null ? void 0 : comparison.items) == null ? void 0 : _c[idx]) == null ? void 0 : _d.selectedVendorId) ? {} : { display: "none" }
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Radio, { checked: isSelected, onChange: () => handleSelectVendor(item.materialId, q.vendorId), size: "small" });
                  }
                },
                {
                  id: "vendorName",
                  header: "供应商",
                  cell: ({ row }) => {
                    var _a, _b;
                    const q = row.original;
                    const isSelected = (comparison == null ? void 0 : comparison.status) === "approved" || (comparison == null ? void 0 : comparison.status) === "selected" ? q.vendorId === ((_b = (_a = comparison == null ? void 0 : comparison.items) == null ? void 0 : _a[idx]) == null ? void 0 : _b.selectedVendorId) : selections[item.materialId] === q.vendorId;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: isSelected ? 600 : 400, children: q.vendorName });
                  }
                },
                { id: "quotationNo", header: "报价单号", accessorKey: "quotationNo" },
                {
                  id: "unitPrice",
                  header: "单价",
                  cell: ({ row }) => {
                    const q = row.original;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: q.isLowest ? 700 : 400, color: q.isLowest ? "success.main" : "inherit", children: formatCurrency(q.unitPrice) }) });
                  }
                },
                {
                  id: "amount",
                  header: "金额",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: formatCurrency(row.original.amount) })
                },
                {
                  id: "deliveryDays",
                  header: "交期(天)",
                  cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "center" }, children: row.original.deliveryDays })
                },
                {
                  id: "deliveryDate",
                  header: "预计交期",
                  cell: ({ row }) => {
                    const q = row.original;
                    return q.deliveryDate ? formatDate(q.deliveryDate) : "-";
                  }
                },
                {
                  id: "paymentTerms",
                  header: "付款条件",
                  cell: ({ row }) => row.original.paymentTerms || "-"
                },
                {
                  id: "isLowest",
                  header: "最低价",
                  enableSorting: false,
                  cell: ({ row }) => row.original.isLowest ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "最低价", size: "small", color: "success", sx: { fontSize: "0.7rem", height: 22 } }) : null
                }
              ]
            }
          ),
          !comparison && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "success", sx: { mt: 1, fontSize: "0.85rem" }, children: [
            "最低报价：",
            item.lowestVendorName,
            " - ",
            formatCurrency(item.lowestUnitPrice),
            "/ ",
            item.unit,
            "（共 ",
            formatCurrency(item.lowestAmount),
            "）",
            !selections[item.materialId] && " — 已自动选择最低价供应商"
          ] })
        ] }, item.materialId)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "价格汇总" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 4, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "全线最低总价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", color: "success.main", children: [
                "¥",
                totalLowest.toLocaleString()
              ] })
            ] }),
            (comparison == null ? void 0 : comparison.totalSelectedAmount) && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "选定总价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", color: "primary.main", children: [
                "¥",
                comparison.totalSelectedAmount.toLocaleString()
              ] })
            ] })
          ] })
        ] }) })
      ]
    }
  );
};
export {
  PriceComparison as default
};
