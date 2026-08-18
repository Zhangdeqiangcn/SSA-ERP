import { n as useParams, h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { c as useWarehouseStore } from "./index-CU2cqxc8.js";
import { a as formatDate } from "./format-DXPckS9-.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { m as Box, T as Typography, aO as Chip, bR as VisibilityOff, bl as Alert, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, bv as TextField, bm as Button, bZ as ArrowBack, bW as CheckCircle } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
const CheckTask = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const checkTasks = useWarehouseStore((s) => s.checkTasks);
  const postCheckAdjustment = useWarehouseStore((s) => s.postCheckAdjustment);
  const task = checkTasks.find((t) => t.id === id);
  const [items, setItems] = reactExports.useState((task == null ? void 0 : task.items) || []);
  if (!task) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "盘点任务", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: "盘点任务不存在" }) });
  }
  const updateCount = (itemId, countQuantity) => {
    setItems(items.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          countQuantity,
          difference: countQuantity - item.bookQuantity
        };
      }
      return item;
    }));
  };
  const completedCount = items.filter((i) => i.countQuantity !== void 0).length;
  const handleComplete = () => {
    postCheckAdjustment(task.id, items);
    navigate("/warehouse/check");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: `盘点任务 - ${task.taskNo}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate("/warehouse/check"), sx: { mr: 1 }, children: "返回" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}), disabled: completedCount < items.length || task.status === "completed", onClick: handleComplete, children: "完成盘点" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2 }, children: "任务信息" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 4, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "仓库" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: task.warehouseName })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "盘点类型" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: task.type === "full" ? "全盘" : "抽盘" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "开始日期" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: formatDate(task.startDate) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "操作员" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { children: task.operator })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "进度" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { children: [
                completedCount,
                " / ",
                items.length
              ] })
            ] }),
            task.blindMode && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(VisibilityOff, {}), label: "盲盘模式", color: "secondary", size: "small", "data-testid": "check-blind-mode-indicator" })
          ] })
        ] }),
        task.blindMode && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "盲盘模式已开启 —— 账面数量对盘点员隐藏，录入实盘数量后系统自动计算差异。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料编码" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料名称" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "库位" }),
            !task.blindMode && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "账面数量" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "盘点数量" }),
            !task.blindMode && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "差异" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialCode }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.materialName }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.locationName }),
            !task.blindMode && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.bookQuantity }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                type: "number",
                size: "small",
                value: item.countQuantity || "",
                onChange: (e) => updateCount(item.id, Number(e.target.value)),
                sx: { width: 100 },
                disabled: task.status === "completed"
              }
            ) }),
            !task.blindMode && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.difference !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { color: item.difference === 0 ? "success.main" : "error.main", children: [
              item.difference > 0 ? "+" : "",
              item.difference
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.countQuantity !== void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "已盘点", color: "success", size: "small" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "待盘点", size: "small" }) })
          ] }, item.id)) })
        ] }) })
      ]
    }
  );
};
export {
  CheckTask as default
};
