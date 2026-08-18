import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, bX as Grid, aP as Paper, h as Typography, B as Box, cc as TrendingUp, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bK as Stack, bk as Button, bd as Print, bf as Add } from "./vendor-DGU5TO-x.js";
import { b as usePurchaseStore, x as usePrintTemplateStore, z as calcTaxTotals, t as round2 } from "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { F as FilterBar } from "./FilterBar-s9qV5iff.js";
import { S as StatusBadge } from "./StatusBadge-DeJuhK-R.js";
import { F as FlowTracker } from "./FlowTracker-CCA6kX6w.js";
import { P as PrintPreview } from "./PrintPreview-cCBr3GzP.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { f as formatCurrency, a as formatDate } from "./format-DnEevvSX.js";
const OrderList = () => {
  const navigate = useNavigate();
  const purchaseOrders = usePurchaseStore((s) => s.purchaseOrders);
  const printTemplate = usePrintTemplateStore((s) => s.getTemplateByEntity("purchaseOrder"));
  const [filterData, setFilterData] = reactExports.useState({});
  const [printOpen, setPrintOpen] = reactExports.useState(false);
  const [printOrderId, setPrintOrderId] = reactExports.useState("");
  const columns = reactExports.useMemo(() => [
    { accessorKey: "orderNo", header: "订单号" },
    { accessorKey: "vendorName", header: "供应商" },
    {
      accessorKey: "currency",
      header: "币种",
      cell: ({ row }) => row.original.currency || "CNY"
    },
    {
      accessorKey: "totalAmount",
      header: "未税金额",
      cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency || "CNY")
    },
    {
      accessorKey: "totalTaxAmount",
      header: "税额",
      cell: ({ row }) => {
        const o = row.original;
        const tax = o.totalTaxAmount ?? calcTaxTotals(o.items || []).totalTaxAmount;
        return formatCurrency(tax, o.currency || "CNY");
      }
    },
    {
      accessorKey: "grandTotal",
      header: "价税合计",
      cell: ({ row }) => {
        const o = row.original;
        const totals = calcTaxTotals(o.items || []);
        const grand = o.grandTotal ?? round2((o.totalAmount ?? totals.totalAmount) + (o.totalTaxAmount ?? totals.totalTaxAmount));
        return /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#1D4ED8" }, children: formatCurrency(grand, o.currency || "CNY") });
      }
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: row.original.status })
    },
    { accessorKey: "orderDate", header: "下单日期", cell: ({ row }) => formatDate(row.original.orderDate) },
    { accessorKey: "expectedDeliveryDate", header: "预计交货", cell: ({ row }) => formatDate(row.original.expectedDeliveryDate) },
    { accessorKey: "actualDeliveryDate", header: "实际交货", cell: ({ row }) => formatDate(row.original.actualDeliveryDate) }
  ], []);
  const filterFields = [
    { name: "orderNo", label: "订单号", type: "text" },
    {
      name: "status",
      label: "状态",
      type: "select",
      options: [
        { value: "", label: "全部" },
        { value: "created", label: "已创建" },
        { value: "sent", label: "已发送" },
        { value: "vendorConfirmed", label: "供应商已确认" },
        { value: "confirmed", label: "已确认" },
        { value: "partial", label: "部分收货" },
        { value: "received", label: "已收货" },
        { value: "closed", label: "已关闭" },
        { value: "cancelled", label: "已取消" }
      ]
    }
  ];
  const filteredData = reactExports.useMemo(() => {
    let data = [...purchaseOrders];
    if (filterData.orderNo) {
      data = data.filter((o) => o.orderNo.includes(filterData.orderNo));
    }
    if (filterData.status) {
      data = data.filter((o) => o.status === filterData.status);
    }
    return data;
  }, [filterData, purchaseOrders]);
  const analytics = reactExports.useMemo(() => {
    const thisMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const monthOrders = purchaseOrders.filter((o) => {
      var _a;
      return (_a = o.orderDate) == null ? void 0 : _a.startsWith(thisMonth);
    });
    const monthAmount = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const last6Months = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amount = purchaseOrders.filter((o) => {
        var _a;
        return (_a = o.orderDate) == null ? void 0 : _a.startsWith(key);
      }).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      last6Months.push({ month: `${d.getMonth() + 1}月`, amount });
    }
    const maxAmt = Math.max(...last6Months.map((m) => m.amount), 1);
    const vendorMap = /* @__PURE__ */ new Map();
    purchaseOrders.forEach((o) => {
      const prev = vendorMap.get(o.vendorName || "") || 0;
      vendorMap.set(o.vendorName || "", prev + (o.totalAmount || 0));
    });
    const top5Vendors = Array.from(vendorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const top5Total = top5Vendors.reduce((sum, [, v]) => sum + v, 0) || 1;
    const vendorColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
    return { monthAmount, last6Months, maxAmt, top5Vendors, top5Total, vendorColors };
  }, [purchaseOrders]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "采购订单",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "purchase-order", currentStatus: "po_draft", label: "流程追踪" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Print, {}), onClick: () => {
          var _a;
          setPrintOrderId(((_a = purchaseOrders[0]) == null ? void 0 : _a.id) || "");
          setPrintOpen(true);
        }, children: "打印" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => navigate("/purchase/orders/create"), children: "新建订单" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, bgcolor: "#EFF6FF" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "本月采购金额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: "#1D4ED8", children: new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(analytics.monthAmount) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { flex: 1 }, children: "近6月采购趋势" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 14, color: "#10B981" } })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "flex-end", gap: "8%", height: 70, px: 1 }, children: analytics.last6Months.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
                width: "100%",
                maxWidth: 32,
                height: `${Math.max(4, m.amount / analytics.maxAmt * 56)}px`,
                bgcolor: "#3B82F6",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.3s"
              } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 0.5, fontSize: "0.6rem" }, children: m.month })
            ] }, m.month)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 1, display: "block" }, children: "Top5供应商" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { position: "relative", width: 70, height: 70, flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 36 36", width: "70", height: "70", children: analytics.top5Vendors.map(([, val], i) => {
                const ratio = val / analytics.top5Total;
                const startAngle = analytics.top5Vendors.slice(0, i).reduce((s, [, v]) => s + v / analytics.top5Total * 360, 0);
                const endAngle = startAngle + ratio * 360;
                const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                const r = 15.9;
                const cx = 18, cy = 18;
                const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
                const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
                const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
                const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "path",
                  {
                    d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
                    fill: analytics.vendorColors[i]
                  },
                  i
                );
              }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1 }, children: analytics.top5Vendors.map(([name, val], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: analytics.vendorColors[i], flexShrink: 0 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.65rem" }, children: name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { fontSize: "0.65rem" }, children: [
                  Math.round(val / analytics.top5Total * 100),
                  "%"
                ] })
              ] }, name)) })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FilterBar, { fields: filterFields, onSearch: setFilterData, listKey: "purchase-order-list", columnConfigKey: "purchase-order-list" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filteredData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            columnConfigKey: "purchase-order-list",
            onRowClick: (row) => navigate(`/purchase/orders/${row.id}`),
            onView: (row) => navigate(`/purchase/orders/${row.id}`)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: printOpen, onClose: () => setPrintOpen(false), maxWidth: "md", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { sx: { fontWeight: 600 }, children: "打印采购订单" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { sx: { pt: 2 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择订单" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Select,
                {
                  value: printOrderId,
                  label: "选择订单",
                  onChange: (e) => setPrintOrderId(e.target.value),
                  children: purchaseOrders.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: o.id, children: [
                    o.orderNo,
                    " - ",
                    o.vendorName
                  ] }, o.id))
                }
              )
            ] }),
            printTemplate && printOrderId && /* @__PURE__ */ jsxRuntimeExports.jsx(
              PrintPreview,
              {
                template: printTemplate,
                record: purchaseOrders.find((o) => o.id === printOrderId),
                onClose: () => setPrintOpen(false)
              }
            ),
            !printTemplate && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: "text.secondary" }, children: "未找到采购订单打印模板，请到「设置 → 打印模板」创建。" })
          ] })
        ] })
      ]
    }
  );
};
export {
  OrderList as default
};
