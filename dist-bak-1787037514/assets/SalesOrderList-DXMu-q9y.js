import { h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { e as useSalesStore } from "./index-hTLNcGoC.js";
import "./customerStore-BnoPAbgi.js";
import "./priceStore-D4MzJqWs.js";
import "./salesPriceStore-BQbM-EvA.js";
import "./bomStore-CeDOOVVk.js";
import "./productionStore-B8YnWPVr.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./financeExtensionStore-mnFIWL7o.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./dataDictStore-RUHQ7-st.js";
import "./numberingStore-BLNwdXfi.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import { f as useFieldPermissionStore, m as maskValue } from "./reportPermissionStore-BsrP4O9H.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./purchaseInfoRecordStore-BlIKCtxc.js";
import "./sourceListStore-Z5_JkzNu.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./arapStore-BN8EGkkl.js";
import "./workbenchStore-vCZX2zeS.js";
import "./conditionStore-DfnsSgER.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./fmeaStore-DSfTzw2E.js";
import { D as DataTable } from "./DataTable-BBJNxQ8l.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { bY as Grid, aS as Paper, T as Typography, m as Box, c8 as TrendingUp, bv as TextField, aT as Search, bL as Stack, bm as Button, bh as Add, aO as Chip, p as Tooltip, aM as IconButton, bS as Visibility, X as LocalShipping } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
const STATUS_LABELS = {
  draft: "草稿",
  confirmed: "已确认",
  in_production: "生产中",
  partial_shipped: "部分发货",
  fully_shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消"
};
const STATUS_COLORS = {
  draft: "#94A3B8",
  confirmed: "#3B82F6",
  in_production: "#8B5CF6",
  partial_shipped: "#F59E0B",
  fully_shipped: "#10B981",
  completed: "#10B981",
  cancelled: "#EF4444"
};
const SalesOrderList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = reactExports.useState("");
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const addSalesOrder = useSalesStore((s) => s.addSalesOrder);
  const salesFields = useFieldPermissionStore((s) => s.moduleFields.sales ?? []);
  const modeOf = (field) => {
    var _a;
    return ((_a = salesFields.find((f) => f.field === field)) == null ? void 0 : _a.mode) ?? "visible";
  };
  const customerNameMode = modeOf("customerName");
  const amountMode = modeOf("amount");
  const filtered = salesOrders.filter((o) => {
    if (search && !o.orderNo.includes(search) && !o.customerName.includes(search) && !o.salesPerson.includes(search) && !(o.contractNo || "").includes(search)) return false;
    return true;
  });
  const analytics = reactExports.useMemo(() => {
    const thisMonth = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const monthOrders = salesOrders.filter((o) => {
      var _a;
      return (_a = o.orderDate) == null ? void 0 : _a.startsWith(thisMonth);
    });
    const monthAmount = monthOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);
    const last6Months = [];
    const now = /* @__PURE__ */ new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amount = salesOrders.filter((o) => {
        var _a;
        return (_a = o.orderDate) == null ? void 0 : _a.startsWith(key);
      }).reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);
      last6Months.push({ month: `${d.getMonth() + 1}月`, amount });
    }
    const maxAmt = Math.max(...last6Months.map((m) => m.amount), 1);
    const custMap = /* @__PURE__ */ new Map();
    salesOrders.forEach((o) => {
      const prev = custMap.get(o.customerName) || 0;
      custMap.set(o.customerName, prev + (o.grandTotal || o.totalAmount || 0));
    });
    const top5Customers = Array.from(custMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const top5Total = top5Customers.reduce((sum, [, v]) => sum + v, 0) || 1;
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
    return { monthAmount, last6Months, maxAmt, top5Customers, top5Total, colors };
  }, [salesOrders]);
  const typeLabel = (t) => t === "standard" ? "标准" : t === "sample" ? "样品" : "维修";
  const columns = [
    {
      id: "orderNo",
      header: "订单编号",
      accessorFn: (o) => o.orderNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", color: "#3B82F6", fontWeight: 500, children: row.original.orderNo })
    },
    {
      id: "type",
      header: "类型",
      accessorFn: (o) => typeLabel(o.type),
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: typeLabel(row.original.type), size: "small", variant: "outlined" })
    },
    {
      id: "customerName",
      header: "客户",
      accessorFn: (o) => o.customerName,
      cell: ({ row }) => {
        const o = row.original;
        return o.customerId ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          customerNameMode === "mask" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, "data-testid": `so-cust-${o.id}`, children: maskValue(o.customerName) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              component: "button",
              variant: "body2",
              fontWeight: 500,
              onClick: () => navigate(`/sales/customers/${o.customerId}`),
              sx: { background: "none", border: "none", color: "#3B82F6", cursor: "pointer", p: 0, textAlign: "left" },
              "data-testid": `so-cust-${o.id}`,
              children: o.customerName
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: o.contactName || o.customerCode || "" })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, "data-testid": `so-cust-${o.id}`, children: customerNameMode === "mask" ? maskValue(o.customerName) : o.customerName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: o.contactName })
        ] });
      }
    },
    {
      id: "projectName",
      header: "项目",
      accessorFn: (o) => o.projectName,
      cell: ({ row }) => {
        const o = row.original;
        return o.projectName ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: o.projectName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", fontFamily: "monospace", children: o.projectNo })
        ] }) : "-";
      }
    },
    {
      id: "contractNo",
      header: "关联合同",
      accessorFn: (o) => o.contractNo || "",
      cell: ({ row }) => {
        const o = row.original;
        return o.contractId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Typography,
          {
            component: "button",
            variant: "body2",
            onClick: () => navigate(`/sales/contracts/${o.contractId}`),
            sx: { background: "none", border: "none", color: "#3B82F6", cursor: "pointer", p: 0, textAlign: "left", fontFamily: "monospace" },
            children: o.contractNo
          }
        ) : "-";
      }
    },
    {
      id: "salesPerson",
      header: "销售员",
      accessorFn: (o) => o.salesPerson,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.salesPerson })
    },
    {
      id: "totalAmount",
      header: "不含税金额",
      accessorFn: (o) => o.totalAmount,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, "data-testid": `so-amount-${row.original.id}`, children: amountMode === "mask" ? maskValue(formatCurrency(row.original.totalAmount)) : formatCurrency(row.original.totalAmount) }) })
    },
    {
      id: "grandTotal",
      header: "含税总额",
      accessorFn: (o) => o.grandTotal,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { textAlign: "right" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", "data-testid": `so-grand-${row.original.id}`, children: amountMode === "mask" ? maskValue(formatCurrency(row.original.grandTotal)) : formatCurrency(row.original.grandTotal) }) })
    },
    {
      id: "orderDate",
      header: "订单日期",
      accessorFn: (o) => o.orderDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.orderDate })
    },
    {
      id: "expectedDeliveryDate",
      header: "预计交期",
      accessorFn: (o) => o.expectedDeliveryDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.expectedDeliveryDate })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (o) => STATUS_LABELS[o.status],
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: STATUS_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: STATUS_COLORS[row.original.status] + "15", color: STATUS_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const o = row.original;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "flex-end", gap: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/sales/orders/${o.id}`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }) }),
          o.status !== "fully_shipped" && o.status !== "completed" && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "发货管理", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate("/sales/logistics"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, { fontSize: "small" }) }) })
        ] });
      }
    }
  ];
  const pickField = (r, headers, zh, en) => {
    const key = headers.find((h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, "") === en.toLowerCase());
    return key ? r[key] ?? "" : "";
  };
  const toNum = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r, headers) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const statusVal = pickField(r, headers, "状态", "status") || "draft";
    const typeValRaw = pickField(r, headers, "类型", "type");
    const typeVal = typeValRaw === "样品" ? "sample" : typeValRaw === "维修" ? "maintenance" : "standard";
    return {
      id: `so-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderNo: pickField(r, headers, "订单编号", "orderNo") || `SO${now.slice(0, 10).replace(/-/g, "")}${Math.floor(Math.random() * 9e3 + 1e3)}`,
      type: typeVal,
      status: Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : "draft",
      customerName: pickField(r, headers, "客户", "customerName"),
      customerId: pickField(r, headers, "客户ID", "customerId") || void 0,
      customerCode: pickField(r, headers, "客户编码", "customerCode") || void 0,
      contactName: pickField(r, headers, "联系人", "contactName") || void 0,
      projectNo: pickField(r, headers, "项目编号", "projectNo") || void 0,
      projectName: pickField(r, headers, "项目", "projectName") || void 0,
      items: [],
      totalAmount: toNum(pickField(r, headers, "不含税金额", "totalAmount")),
      taxRate: 0,
      taxAmount: 0,
      grandTotal: toNum(pickField(r, headers, "含税总额", "grandTotal")),
      orderDate: pickField(r, headers, "订单日期", "orderDate") || now.slice(0, 10),
      expectedDeliveryDate: pickField(r, headers, "预计交期", "expectedDeliveryDate") || "",
      salesPerson: pickField(r, headers, "销售员", "salesPerson"),
      linkedWorkOrders: [],
      createdAt: now,
      updatedAt: now,
      createdBy: "导入",
      updatedBy: "导入"
    };
  };
  const handleImport = (rows, headers) => {
    rows.forEach((r) => addSalesOrder(mapImportRow(r, headers)));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "销售订单管理",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "sales-order", currentStatus: "sso_confirmed" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => navigate("/sales/orders/create"), children: "新建销售订单" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { mb: 2.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, bgcolor: "#F0FDF4" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "本月销售额" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: "#15803D", children: new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0 }).format(analytics.monthAmount) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", mb: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { flex: 1 }, children: "近6月销售趋势" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, { sx: { fontSize: 14, color: "#10B981" } })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", alignItems: "flex-end", gap: "8%", height: 70, px: 1 }, children: analytics.last6Months.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
                width: "100%",
                maxWidth: 32,
                height: `${Math.max(4, m.amount / analytics.maxAmt * 56)}px`,
                bgcolor: "#10B981",
                borderRadius: "4px 4px 0 0"
              } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 0.5, fontSize: "0.6rem" }, children: m.month })
            ] }, m.month)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mb: 1, display: "block" }, children: "Top5客户" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { position: "relative", width: 70, height: 70, flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { viewBox: "0 0 36 36", width: "70", height: "70", children: analytics.top5Customers.map(([, val], i) => {
                const ratio = val / analytics.top5Total;
                const startAngle = analytics.top5Customers.slice(0, i).reduce((s, [, v]) => s + v / analytics.top5Total * 360, 0);
                const endAngle = startAngle + ratio * 360;
                const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                const r = 15.9;
                const cx = 18;
                const cy = 18;
                const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
                const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
                const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
                const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "path",
                  {
                    d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
                    fill: analytics.colors[i]
                  },
                  i
                );
              }) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1 }, children: analytics.top5Customers.map(([name, val], i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, mb: 0.3 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 8, height: 8, borderRadius: "50%", bgcolor: analytics.colors[i], flexShrink: 0 } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.65rem" }, children: name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { fontSize: "0.65rem" }, children: [
                  Math.round(val / analytics.top5Total * 100),
                  "%"
                ] })
              ] }, name)) })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
          { label: "全部", count: salesOrders.length, color: "#6366F1" },
          { label: "确认中", count: salesOrders.filter((o) => o.status === "confirmed").length, color: "#3B82F6" },
          { label: "生产中", count: salesOrders.filter((o) => o.status === "in_production").length, color: "#8B5CF6" },
          { label: "已完成", count: salesOrders.filter((o) => o.status === "completed").length, color: "#10B981" },
          { label: "草稿", count: salesOrders.filter((o) => o.status === "draft").length, color: "#94A3B8" }
        ].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: s.color, children: s.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label })
        ] }, s.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2, mb: 2, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            size: "small",
            placeholder: "搜索订单号/客户/销售员",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
            sx: { width: 300 }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: filtered,
            columns,
            enableExport: true,
            enableImport: true,
            columnConfigKey: "sales-order-list",
            onImport: handleImport
          }
        ) })
      ]
    }
  );
};
export {
  SalesOrderList as default
};
