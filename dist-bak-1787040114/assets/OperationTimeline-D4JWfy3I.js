import { j as jsxRuntimeExports, B as Box, h as Typography, bX as Grid, dN as Timeline, dO as TimelineItem, dP as TimelineOppositeContent, dQ as TimelineSeparator, dR as TimelineConnector, dS as TimelineDot, dT as TimelineContent, aP as Paper, dh as Info, d7 as Cancel, bV as CheckCircle, bc as Delete, bg as Edit, bf as Add } from "./vendor-DGU5TO-x.js";
const DetailSection = ({
  title,
  fields,
  columns = 2
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
    title && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2, fontWeight: 600 }, children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: fields.map((field, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12 / columns, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Typography,
        {
          variant: "body2",
          sx: {
            color: "text.secondary",
            minWidth: 100,
            flexShrink: 0
          },
          children: [
            field.label,
            "："
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", component: "div", children: field.value || "-" })
    ] }) }, index)) })
  ] });
};
const actionIcons = {
  create: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}),
  update: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}),
  delete: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}),
  approve: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
  reject: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}),
  info: /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {})
};
const actionColors = {
  create: "success",
  update: "primary",
  delete: "error",
  approve: "success",
  reject: "error",
  info: "info"
};
const OperationTimeline = ({
  title,
  events
}) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
    title && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2, fontWeight: 600 }, children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Timeline, { position: "alternate", children: events.map((event) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TimelineItem, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineOppositeContent, { sx: { m: "auto 0" }, children: event.time }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(TimelineSeparator, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineConnector, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineDot, { color: actionColors[event.action], children: actionIcons[event.action] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineConnector, {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TimelineContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", children: event.operator }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: event.description })
      ] }) })
    ] }, event.id)) })
  ] });
};
export {
  DetailSection as D,
  OperationTimeline as O
};
