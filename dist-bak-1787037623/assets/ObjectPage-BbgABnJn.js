import { r as reactExports, j as jsxRuntimeExports, L as Link$1 } from "./vendor-react-CdHjdSaV.js";
import { m as Box, aW as Breadcrumbs, aX as Link, aS as Paper, bL as Stack, T as Typography, n as Divider } from "./vendor-mui-DsZGB15g.js";
const ANCHOR_OFFSET = 88;
const ObjectPage = ({
  title,
  subtitle,
  breadcrumbs,
  headerFields,
  status,
  actions,
  sections,
  headerContent
}) => {
  var _a;
  const [activeId, setActiveId] = reactExports.useState(((_a = sections[0]) == null ? void 0 : _a.id) ?? "");
  const sectionRefs = reactExports.useRef({});
  reactExports.useEffect(() => {
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      // rootMargin 顶部偏移预留吸顶条高度，避免分区标题刚进入就被判定为激活
      { rootMargin: `-${ANCHOR_OFFSET}px 0px -55% 0px`, threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);
  const handleAnchorClick = (id) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    breadcrumbs && breadcrumbs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Breadcrumbs, { separator: "›", sx: { mb: 1.5, fontSize: "0.85rem" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { component: Link$1, to: "/", underline: "hover", color: "inherit", children: "首页" }),
      breadcrumbs.map((b, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          component: Link$1,
          to: b.path,
          underline: "hover",
          color: i === breadcrumbs.length - 1 ? "text.primary" : "inherit",
          children: b.label
        },
        b.path
      ))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Paper,
      {
        variant: "outlined",
        sx: {
          p: { xs: 2, md: 3 },
          mb: 0,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Stack,
            {
              direction: { xs: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "flex-start" },
              spacing: 2,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { minWidth: 0 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", component: "h1", sx: { fontWeight: 700, lineHeight: 1.2 }, children: title }),
                  subtitle && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", color: "text.secondary", sx: { mt: 0.5 }, children: subtitle }),
                  status && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1.5 }, children: status })
                ] }),
                actions && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flexShrink: 0, display: "flex", gap: 1, flexWrap: "wrap" }, children: actions })
              ]
            }
          ),
          headerFields && headerFields.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Stack,
            {
              direction: "row",
              flexWrap: "wrap",
              spacing: 0,
              divider: /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { orientation: "vertical", flexItem: true, sx: { mx: 2, my: 0.5 } }),
              sx: { mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" },
              children: headerFields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { py: 0.25 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: f.label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", component: "div", sx: { fontWeight: 600 }, children: f.value ?? "-" })
              ] }, f.label))
            }
          ),
          headerContent && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 2 }, children: headerContent })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Paper,
      {
        variant: "outlined",
        square: true,
        sx: {
          position: "sticky",
          top: 0,
          zIndex: 5,
          borderTop: "none",
          borderRadius: 0,
          overflowX: "auto",
          whiteSpace: "nowrap"
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 0.5, sx: { px: 2, py: 1 }, children: sections.map((s) => {
          const active = s.id === activeId;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Box,
            {
              component: "button",
              onClick: () => handleAnchorClick(s.id),
              "aria-label": `跳转到${s.title}`,
              "aria-current": active ? "true" : void 0,
              sx: {
                border: "none",
                cursor: "pointer",
                background: "transparent",
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                fontSize: "0.875rem",
                fontWeight: active ? 700 : 500,
                color: active ? "primary.main" : "text.secondary",
                borderBottom: active ? "2px solid" : "2px solid transparent",
                borderBottomColor: active ? "primary.main" : "transparent",
                "&:hover": { bgcolor: "action.hover", color: "text.primary" }
              },
              children: s.title
            },
            s.id
          );
        }) })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { pt: 3 }, children: sections.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Box,
      {
        id: s.id,
        ref: (el) => sectionRefs.current[s.id] = el,
        sx: { scrollMarginTop: `${ANCHOR_OFFSET}px`, mb: 3 },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Typography,
            {
              variant: "h6",
              component: "h2",
              sx: { mb: 2, fontWeight: 600 },
              id: `${s.id}-heading`,
              children: s.title
            }
          ),
          s.content
        ]
      },
      s.id
    )) })
  ] });
};
export {
  ObjectPage as O
};
