import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, aP as Paper, bK as Stack, h as Typography, aL as Chip, bX as Grid, b2 as Avatar, b_ as ArrowForward, bM as Handshake, M as LocalShipping, bN as Warning, K as Assignment, Y as AttachMoney, ac as ReceiptIcon, bj as Alert } from "./vendor-46QZWBd3.js";
import { f as formatCurrency } from "./format-Rp8---CI.js";
const VendorWorkbench = () => {
  const navigate = useNavigate();
  const [vendor, setVendor] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const stored = sessionStorage.getItem("vendorPortalUser");
    if (stored) setVendor(JSON.parse(stored));
    else navigate("/vendor-portal/login");
  }, [navigate]);
  if (!vendor) return null;
  const stats = [
    { label: "待确认订单", count: 3, color: "#3B82F6", bg: "#EFF6FF", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Handshake, {}), path: "/vendor-portal/orders/confirm" },
    { label: "在途物流", count: 2, color: "#F59E0B", bg: "#FFFBEB", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}), path: "/vendor-portal/orders/shipment" },
    { label: "质量问题单", count: 2, color: "#EF4444", bg: "#FEF2F2", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), path: "/vendor-portal/quality/issues" },
    { label: "待开票金额", amount: 128500, color: "#10B981", bg: "#ECFDF5", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, {}), path: "/vendor-portal/finance/invoices" }
  ];
  const todoItems = [
    { type: "order", label: "采购订单 PO-2026-0231 待确认", urgency: "high", path: "/vendor-portal/orders/confirm" },
    { type: "order", label: "采购订单 PO-2026-0228 待确认", urgency: "medium", path: "/vendor-portal/orders/confirm" },
    { type: "quality", label: "质量问题单 VQI-2026-003 需响应（严重）", urgency: "high", path: "/vendor-portal/quality/issues" },
    { type: "finance", label: "对账单 VS-2026-001 已发送，请确认", urgency: "medium", path: "/vendor-portal/finance/statements" },
    { type: "finance", label: "开票申请 VIR-2026-002 已审批，请开票", urgency: "low", path: "/vendor-portal/finance/invoices" }
  ];
  const urgencyMap = {
    high: { label: "紧急", color: "error" },
    medium: { label: "重要", color: "warning" },
    low: { label: "一般", color: "info" }
  };
  const typeIconMap = {
    order: /* @__PURE__ */ jsxRuntimeExports.jsx(Handshake, { sx: { color: "#3B82F6", fontSize: 18 } }),
    quality: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { color: "#EF4444", fontSize: 18 } }),
    finance: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, { sx: { color: "#10B981", fontSize: 18 } })
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, mb: 3, borderRadius: 3, background: "linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h5", fontWeight: 800, sx: { color: "#fff", mb: 0.5 }, children: [
          "欢迎回来，",
          vendor.name
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "rgba(255,255,255,0.8)" }, children: [
            "供应商代码：",
            vendor.code
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: vendor.role,
              size: "small",
              sx: { bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontSize: "0.7rem" }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "right" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "rgba(255,255,255,0.6)" }, children: "今日" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#fff" }, children: (/* @__PURE__ */ new Date()).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: stats.map((s, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, sm: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Paper,
      {
        onClick: () => navigate(s.path),
        sx: {
          p: 2.5,
          borderRadius: 3,
          cursor: "pointer",
          bgcolor: s.bg,
          border: `1px solid ${s.color}20`,
          transition: "transform 0.15s, box-shadow 0.15s",
          "&:hover": { transform: "translateY(-2px)", boxShadow: `0 8px 24px ${s.color}20` }
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: s.label }),
            s.amount !== void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, sx: { color: s.color }, children: formatCurrency(s.amount) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", fontWeight: 800, sx: { color: s.color }, children: s.count })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Avatar, { sx: { bgcolor: `${s.color}20`, color: s.color, width: 40, height: 40 }, children: s.icon })
        ] })
      }
    ) }, idx)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
          px: 2.5,
          py: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #E2E8F0"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "待处理事项" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${todoItems.length} 项`, size: "small", color: "error", sx: { fontWeight: 600 } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1.5, children: todoItems.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Box,
          {
            onClick: () => navigate(item.path),
            sx: {
              p: 1.5,
              borderRadius: 2,
              cursor: "pointer",
              border: "1px solid #E2E8F0",
              bgcolor: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              transition: "all 0.15s",
              "&:hover": { borderColor: "#3B82F6", bgcolor: "#EFF6FF" }
            },
            children: [
              typeIconMap[item.type],
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { flex: 1 }, children: item.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: urgencyMap[item.urgency].label,
                  size: "small",
                  color: urgencyMap[item.urgency].color,
                  sx: { fontWeight: 600, fontSize: "0.7rem" }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowForward, { sx: { color: "#94A3B8", fontSize: 16 } })
            ]
          },
          idx
        )) }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2.5, py: 2, borderBottom: "1px solid #E2E8F0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 700, children: "快捷入口" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 1.5, children: [
            { label: "订单确认", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Handshake, {}), path: "/vendor-portal/orders/confirm", color: "#3B82F6" },
            { label: "发货物流", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LocalShipping, {}), path: "/vendor-portal/orders/shipment", color: "#F59E0B" },
            { label: "质量问题", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), path: "/vendor-portal/quality/issues", color: "#EF4444" },
            { label: "8D报告", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Assignment, {}), path: "/vendor-portal/quality/8d", color: "#6366F1" },
            { label: "对账单", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AttachMoney, {}), path: "/vendor-portal/finance/statements", color: "#10B981" },
            { label: "开票申请", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptIcon, {}), path: "/vendor-portal/finance/invoices", color: "#059669" }
          ].map(({ label, icon, path, color }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Paper,
            {
              onClick: () => navigate(path),
              sx: {
                p: 1.5,
                borderRadius: 2,
                cursor: "pointer",
                textAlign: "center",
                border: "1px solid #E2E8F0",
                transition: "all 0.15s",
                "&:hover": { borderColor: color, bgcolor: `${color}08`, transform: "translateY(-1px)" }
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color, mb: 0.5 }, children: icon }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", fontWeight: 600, sx: { color: "#475569" }, children: label })
              ]
            }
          ) }, label)) }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3, mt: 2, overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { px: 2.5, py: 1.5, borderBottom: "1px solid #E2E8F0" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, children: "系统通知" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { py: 0.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "质量问题单 VQI-2026-003 已升级，请尽快响应" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { py: 0.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", children: "2026年6月账期对账单已发送，请于7月10日前确认" }) })
          ] }) })
        ] })
      ] })
    ] })
  ] });
};
export {
  VendorWorkbench as default
};
