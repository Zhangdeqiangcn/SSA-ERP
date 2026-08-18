import { j as jsxRuntimeExports, B as Box, aP as Paper, h as Typography, i as Divider, R as React, aL as Chip } from "./vendor-46QZWBd3.js";
import { b as usePurchaseStore } from "./index-CcOZBoQL.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { f as formatCurrency, a as formatDate } from "./format-Rp8---CI.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
const OrderTrack = () => {
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const orders = purchaseOrders.filter((o) => ["created", "sent", "vendorConfirmed", "confirmed", "partial"].includes(o.status));
  const statusFlow = ["created", "sent", "vendorConfirmed", "confirmed", "partial", "received", "closed"];
  const statusLabels = {
    created: "已创建",
    sent: "已发送",
    vendorConfirmed: "供应商已确认",
    confirmed: "已确认",
    partial: "部分收货",
    received: "已收货",
    closed: "已关闭"
  };
  const getStatusIndex = (status) => statusFlow.indexOf(status);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    PageWrapper,
    {
      title: "交期跟踪",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-order", currentStatus: "po_shipped", label: "流程追踪" }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: orders.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: "暂无在途订单" }) }) : orders.map((order) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { mb: 3, p: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", children: order.orderNo }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "供应商：",
              order.vendorName,
              " | 联系人：",
              order.contact
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", color: "primary", children: formatCurrency(order.totalAmount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              "预计交货：",
              formatDate(order.expectedDeliveryDate)
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }, children: statusFlow.map((status, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs(React.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: statusLabels[status],
              color: status === order.status ? "primary" : index <= getStatusIndex(order.status) ? "success" : "default",
              variant: status === order.status ? "filled" : "outlined",
              size: "small"
            }
          ),
          index < statusFlow.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 20, borderTop: "2px dashed", borderColor: "divider" } })
        ] }, status)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "订单明细" }),
          order.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", py: 0.5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              item.materialName,
              " × ",
              item.orderedQuantity,
              " ",
              item.unit
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "已发货：",
              item.deliveredQuantity,
              " / ",
              item.orderedQuantity
            ] })
          ] }, item.id))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 1 }, children: new Date(order.expectedDeliveryDate) < /* @__PURE__ */ new Date() && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "延期预警", color: "error", size: "small" }) })
      ] }, order.id)) })
    }
  );
};
export {
  OrderTrack as default
};
