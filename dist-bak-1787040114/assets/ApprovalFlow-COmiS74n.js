import { j as jsxRuntimeExports, B as Box, k as Tooltip, b2 as Avatar, h as Typography, aa as Person, aL as Chip, cu as RadioButtonUnchecked, dY as AccessTime, d7 as Cancel, bV as CheckCircle } from "./vendor-DGU5TO-x.js";
const statusConfig = {
  approved: { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { sx: { fontSize: 18, color: "#fff" } }), color: "#10B981", bg: "#10B981", label: "已通过" },
  rejected: { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, { sx: { fontSize: 18, color: "#fff" } }), color: "#EF4444", bg: "#EF4444", label: "已拒绝" },
  pending: { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AccessTime, { sx: { fontSize: 18, color: "#fff" } }), color: "#F59E0B", bg: "#F59E0B", label: "审批中" },
  waiting: { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, { sx: { fontSize: 18, color: "#94A3B8" } }), color: "#94A3B8", bg: "#F1F5F9", label: "待审批" },
  skipped: { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(RadioButtonUnchecked, { sx: { fontSize: 18, color: "#CBD5E1" } }), color: "#CBD5E1", bg: "#F8FAFC", label: "已跳过" }
};
const ApprovalFlow = ({ nodes, currentStep, compact = false }) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Box,
    {
      sx: {
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        overflowX: "auto",
        pb: compact ? 0 : 1
      },
      children: nodes.map((node, idx) => {
        const cfg = statusConfig[node.status];
        const isLast = idx === nodes.length - 1;
        const isCurrent = idx === currentStep;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "flex-start", flexShrink: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", width: compact ? 72 : 96 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: cfg.label + (node.comment ? `：${node.comment}` : ""), arrow: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Avatar,
              {
                sx: {
                  width: compact ? 32 : 40,
                  height: compact ? 32 : 40,
                  bgcolor: cfg.bg,
                  border: isCurrent ? `2.5px solid ${cfg.color}` : "2px solid transparent",
                  boxShadow: isCurrent ? `0 0 0 3px ${cfg.color}30` : "none",
                  transition: "all .2s",
                  cursor: "default"
                },
                children: cfg.icon
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Typography,
              {
                variant: "caption",
                sx: {
                  mt: 0.8,
                  textAlign: "center",
                  fontSize: compact ? "0.65rem" : "0.75rem",
                  color: isCurrent ? cfg.color : "#475569",
                  fontWeight: isCurrent ? 600 : 400,
                  lineHeight: 1.3,
                  maxWidth: compact ? 68 : 88,
                  wordBreak: "keep-all"
                },
                children: node.role
              }
            ),
            node.approver && !compact && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.3, mt: 0.3 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Person, { sx: { fontSize: 11, color: "#94A3B8" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8", fontSize: "0.65rem" }, children: node.approver })
            ] }),
            node.time && !compact && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#CBD5E1", fontSize: "0.6rem", mt: 0.2 }, children: node.time }),
            !compact && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Chip,
              {
                label: cfg.label,
                size: "small",
                sx: {
                  mt: 0.5,
                  fontSize: "0.6rem",
                  height: 18,
                  bgcolor: `${cfg.color}15`,
                  color: cfg.color
                }
              }
            )
          ] }),
          !isLast && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
            display: "flex",
            alignItems: "center",
            mt: compact ? 1 : 1.3,
            width: compact ? 24 : 32,
            flexShrink: 0
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
              flex: 1,
              height: "2px",
              bgcolor: node.status === "approved" ? "#10B981" : node.status === "rejected" ? "#EF4444" : "#E2E8F0",
              transition: "background-color .3s"
            } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderLeft: `5px solid ${node.status === "approved" ? "#10B981" : node.status === "rejected" ? "#EF4444" : "#E2E8F0"}`
            } })
          ] })
        ] }, node.id);
      })
    }
  );
};
export {
  ApprovalFlow as A
};
