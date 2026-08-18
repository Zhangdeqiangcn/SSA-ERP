import { j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { m as Box, T as Typography, bY as Grid, dq as Timeline, dr as TimelineItem, ds as TimelineOppositeContent, dt as TimelineSeparator, du as TimelineConnector, dv as TimelineDot, dw as TimelineContent, aS as Paper, d1 as Info, cT as Cancel, bW as CheckCircle, be as Delete, bi as Edit, bh as Add } from "./vendor-mui-DsZGB15g.js";
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
