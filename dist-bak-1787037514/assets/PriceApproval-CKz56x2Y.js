import { n as useParams, h as useNavigate, f as useLocation, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { a as formatDate, f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { u as usePriceStore } from "./priceStore-D4MzJqWs.js";
import { aS as Paper, T as Typography, bB as Stepper, bC as Step, bD as StepLabel, bL as Stack, m as Box, aO as Chip, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, n as Divider, bm as Button, aV as CloseIcon, dJ as Check, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, bE as DialogActions, bZ as ArrowBack } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
const PriceApproval = () => {
  const { priceApprovals } = usePriceStore();
  const approvePriceApproval = usePriceStore((s) => s.approvePriceApproval);
  const addPriceApproval = usePriceStore((s) => s.addPriceApproval);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = reactExports.useState([]);
  const [comparisonId, setComparisonId] = reactExports.useState("");
  const [comparisonNo, setComparisonNo] = reactExports.useState("");
  const [inquiryId, setInquiryId] = reactExports.useState("");
  const [inquiryNo, setInquiryNo] = reactExports.useState("");
  const [title, setTitle] = reactExports.useState("");
  const [remarks, setRemarks] = reactExports.useState("");
  const [approvalNo, setApprovalNo] = reactExports.useState("");
  const [approvalStatus, setApprovalStatus] = reactExports.useState("pending");
  const [approvalRecords, setApprovalRecords] = reactExports.useState([]);
  const [showApprovalDialog, setShowApprovalDialog] = reactExports.useState(false);
  const [approvalAction, setApprovalAction] = reactExports.useState("approve");
  const currentApprover = "赵强";
  reactExports.useEffect(() => {
    if (id && id !== "new") {
      const existing = priceApprovals.find((a) => a.id === id);
      if (existing) {
        setItems(existing.items);
        setComparisonId(existing.comparisonId);
        setComparisonNo(existing.comparisonNo);
        setInquiryId(existing.inquiryId);
        setInquiryNo(existing.inquiryNo);
        setTitle(existing.title);
        setRemarks(existing.remarks || "");
        setApprovalNo(existing.approvalNo);
        setApprovalStatus(existing.status);
        setApprovalRecords(existing.approvalRecords || []);
        return;
      }
    }
    const state = location.state;
    if (state == null ? void 0 : state.items) {
      setItems(state.items);
      setComparisonId(state.comparisonId || "");
      setComparisonNo(state.comparisonNo || "");
      setInquiryId(state.inquiryId || "");
      setInquiryNo(state.inquiryNo || "");
      setTitle(state.title || "");
    }
  }, [id, location.state]);
  const totalAmount = items.reduce((sum, item) => sum + item.selectedAmount, 0);
  const handleApprove = () => {
    setApprovalAction("approve");
    setShowApprovalDialog(true);
  };
  const handleReject = () => {
    setApprovalAction("reject");
    setShowApprovalDialog(true);
  };
  const handleConfirmApproval = (comments) => {
    if (approvalAction === "approve") {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const record = {
        id: `ar-${Date.now()}`,
        approver: currentApprover,
        action: "approve",
        comments,
        operatedAt: now,
        nodeName: "采购经理审批"
      };
      const existing = priceApprovals.find((a) => a.id === id);
      if (existing) {
        approvePriceApproval(existing.id, record);
        alert("审批通过！价格已生效，已自动生成价目表记录。");
      } else if (id && id !== "new") {
        approvePriceApproval(id, record);
        alert("审批通过！价格已生效，已自动生成价目表记录。");
      } else {
        const newApproval = {
          id: `pa-${Date.now()}`,
          approvalNo: `PA${now.slice(0, 10).replace(/-/g, "")}${String(Date.now()).slice(-4)}`,
          comparisonId,
          comparisonNo,
          inquiryId,
          inquiryNo,
          title,
          applicant: "当前用户",
          applicationDate: now.slice(0, 10),
          items: items.map(
            (it) => ({
              materialId: it.materialId,
              materialCode: it.materialCode,
              materialName: it.materialName,
              specification: it.specification,
              unit: it.unit,
              quantity: it.quantity,
              selectedVendorId: it.selectedVendorId,
              selectedVendorName: it.selectedVendorName,
              selectedUnitPrice: it.selectedUnitPrice,
              selectedAmount: it.selectedAmount,
              deliveryDays: it.deliveryDays,
              deliveryDate: it.deliveryDate,
              paymentTerms: it.paymentTerms
            })
          ),
          totalAmount,
          approvalRecords: [record],
          status: "approved",
          createdAt: now,
          updatedAt: now,
          createdBy: "当前用户",
          updatedBy: "当前用户",
          currency: "CNY"
        };
        addPriceApproval(newApproval);
        approvePriceApproval(newApproval.id, record);
        alert("审批通过！价格已生效，已自动生成价目表记录。");
      }
      setApprovalStatus("approved");
    } else {
      alert("审批驳回！请重新比价。（演示模式）");
    }
    setShowApprovalDialog(false);
    navigate("/price/approvals");
  };
  const getApprovalSteps = () => {
    const steps = [
      { label: "采购员提交", status: approvalStatus === "pending" || approvalStatus === "approved" ? "completed" : "active" },
      { label: "采购经理审批", status: approvalStatus === "approved" ? "completed" : approvalStatus === "pending" ? "active" : "pending" },
      { label: "财务审批", status: approvalStatus === "approved" ? "completed" : "pending" },
      { label: "审批完成", status: approvalStatus === "approved" ? "completed" : "pending" }
    ];
    return steps;
  };
  const getActiveStep = () => {
    if (approvalStatus === "approved") return 4;
    if (approvalStatus === "rejected") return 1;
    return 1;
  };
  const isReadonly = approvalStatus === "approved" || approvalStatus === "rejected";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: `价格审批单 ${approvalNo ? approvalNo : ""}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          FlowTracker,
          {
            module: "price-approval",
            currentStatus: approvalStatus,
            documentNo: approvalNo || comparisonNo
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "outlined",
            startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}),
            onClick: () => navigate("/price/approvals"),
            children: "返回列表"
          }
        )
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, children: "审批进度" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep: getActiveStep(), alternativeLabel: true, children: getApprovalSteps().map((step, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Step, { completed: step.status === "completed", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabel, { children: step.label }) }, idx)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 2, children: "基本信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 4, flexWrap: "wrap", useFlexGap: true, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "比价单号" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: comparisonNo })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "询价单号" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: inquiryNo })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "标题" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: title })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "申请人" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: "张华（采购部）" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "申请日期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: formatDate((/* @__PURE__ */ new Date()).toISOString().split("T")[0]) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "状态" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: approvalStatus === "approved" ? "已通过" : approvalStatus === "rejected" ? "已驳回" : "待审批",
                  size: "small",
                  color: approvalStatus === "approved" ? "success" : approvalStatus === "rejected" ? "error" : "warning"
                }
              )
            ] })
          ] }),
          remarks && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { mt: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "备注" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: remarks })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 1, children: "选定价格明细" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料编码" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "单位" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "数量" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "选定供应商" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "单价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: "金额" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: "交期(天)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "预计交期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "付款条件" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialCode }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.specification }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.unit }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: item.quantity }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: item.selectedVendorName, size: "small", color: "primary", variant: "outlined" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(item.selectedUnitPrice) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "right", children: formatCurrency(item.selectedAmount) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { align: "center", children: item.deliveryDays }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.deliveryDate ? formatDate(item.deliveryDate) : "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.paymentTerms || "-" })
            ] }, idx)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mt: 2, mb: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "共 ",
              items.length,
              " 项物料"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", color: "primary", children: [
              "总金额：",
              formatCurrency(totalAmount)
            ] })
          ] })
        ] }),
        approvalRecords.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, mb: 1, children: "审批记录" }),
          approvalRecords.map((record, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1, pb: 1, borderBottom: idx < approvalRecords.length - 1 ? 1 : 0, borderColor: "divider" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: record.action === "approve" ? "通过" : "驳回",
                  size: "small",
                  color: record.action === "approve" ? "success" : "error"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: record.approver }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: record.nodeName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: record.operatedAt })
            ] }),
            record.comments && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 0.5, ml: 1 }, children: [
              '"',
              record.comments,
              '"'
            ] })
          ] }, record.id || idx))
        ] }),
        !isReadonly && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, display: "flex", justifyContent: "flex-end", gap: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "outlined",
              color: "error",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CloseIcon, {}),
              onClick: handleReject,
              children: "驳回"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "contained",
              color: "success",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, {}),
              onClick: handleApprove,
              children: "审批通过"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: showApprovalDialog, onClose: () => setShowApprovalDialog(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: approvalAction === "approve" ? "确认审批通过" : "确认驳回" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              autoFocus: true,
              fullWidth: true,
              multiline: true,
              rows: 3,
              label: "审批意见",
              placeholder: approvalAction === "approve" ? "如：价格合理，同意采购" : "如：价格偏高，请重新比价",
              id: "approval-comments"
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setShowApprovalDialog(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                color: approvalAction === "approve" ? "success" : "error",
                onClick: () => {
                  const input = document.getElementById("approval-comments");
                  handleConfirmApproval((input == null ? void 0 : input.value) || "");
                },
                children: "确认"
              }
            )
          ] })
        ] })
      ]
    }
  );
};
export {
  PriceApproval as default
};
