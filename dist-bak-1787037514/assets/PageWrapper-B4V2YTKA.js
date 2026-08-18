import { f as useLocation, j as jsxRuntimeExports, L as Link$1 } from "./vendor-react-Cc0tBtdY.js";
import { m as Box, aW as Breadcrumbs, aX as Link, T as Typography, aY as NavigateNext, aS as Paper } from "./vendor-mui-UhJuRAfR.js";
const pathNameMap = {
  "/": "首页",
  "/material/categories": "物料分类",
  "/material/list": "物料列表",
  "/material/create": "新增物料",
  "/material/code-rules": "物料分类",
  "/vendor/list": "供应商列表",
  "/vendor/register": "供应商注册",
  "/vendor/blacklist": "黑名单管理",
  "/vendor/rating": "评级管理",
  "/vendor/approvals": "准入审核",
  "/purchase/requests": "采购申请",
  "/purchase/create": "新建采购申请",
  "/purchase/orders": "采购订单",
  "/purchase/track": "交期跟踪",
  "/warehouse/inbound": "入库管理",
  "/warehouse/inbound/create": "新建入库单",
  "/warehouse/outbound": "出库管理",
  "/warehouse/check": "库存盘点",
  "/warehouse/inventory": "库存查询",
  "/settings": "系统设置"
};
const PageWrapper = ({ title, actions, children }) => {
  const location = useLocation();
  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const breadcrumbs2 = [];
    let currentPath = "";
    paths.forEach((path) => {
      currentPath += `/${path}`;
      const label = pathNameMap[currentPath] || path;
      breadcrumbs2.push({ label, path: currentPath });
    });
    return breadcrumbs2;
  };
  const breadcrumbs = getBreadcrumbs();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Breadcrumbs,
        {
          separator: /* @__PURE__ */ jsxRuntimeExports.jsx(NavigateNext, { fontSize: "small" }),
          sx: { mb: 1 },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Link,
              {
                component: Link$1,
                to: "/",
                underline: "hover",
                color: "inherit",
                children: "首页"
              }
            ),
            breadcrumbs.slice(0, -1).map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Link,
              {
                component: Link$1,
                to: item.path,
                underline: "hover",
                color: "inherit",
                children: item.label
              },
              item.path
            )),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.primary", children: title })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Box,
        {
          sx: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", component: "h1", sx: { fontWeight: 600 }, children: title }),
            actions && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: actions })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3 }, children })
  ] });
};
export {
  PageWrapper as P
};
