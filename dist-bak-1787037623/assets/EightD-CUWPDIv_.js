import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { u as useQualityExtensionStore } from "./qualityExtensionStore-BDssWY5M.js";
import { m as Box, T as Typography, bl as Alert, aO as Chip, bm as Button, aS as Paper, bY as Grid, bv as TextField, aR as MenuItem, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./index-CU2cqxc8.js";
import "./vendor-date-DI3D_gXa.js";
const STATUS_LABEL = { open: "未开始", in_progress: "进行中", closed: "已关闭" };
const PRIORITY_LABEL = { high: "高", medium: "中", low: "低" };
const uid = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
function EightDPage() {
  const { eightDRecords, addEightD, closeEightD, deleteEightD } = useQualityExtensionStore();
  const [adding, setAdding] = reactExports.useState(false);
  const [code, setCode] = reactExports.useState("");
  const [title, setTitle] = reactExports.useState("");
  const [sourceNo, setSourceNo] = reactExports.useState("");
  const [priority, setPriority] = reactExports.useState("high");
  const [owner, setOwner] = reactExports.useState("");
  const submit = () => {
    if (!code || !title) return;
    const rec = {
      id: uid("d8"),
      code,
      title,
      sourceType: "unqualified",
      sourceNo: sourceNo || void 0,
      priority,
      status: "open",
      owner: owner || "当前用户",
      team: [],
      createdAt: today(),
      updatedAt: today(),
      createdBy: "当前用户",
      updatedBy: "当前用户"
    };
    addEightD(rec);
    setAdding(false);
    setCode("");
    setTitle("");
    setSourceNo("");
    setOwner("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "eight-d", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "8D 问题求解" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "8D（D0–D8）结构化根本原因分析与纠正预防，可关联不合格品 / 客诉来源，闭环质量问题。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { "data-testid": "d8-count", label: `8D 记录 ${eightDRecords.length}`, sx: { mb: 1 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", sx: { ml: 1, mb: 1 }, "data-testid": "d8-add", onClick: () => setAdding(true), children: "新增 8D" }),
    adding && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, mb: 2 }, "data-testid": "d8-form", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "8D 编号", "data-testid": "d8-code", value: code, onChange: (e) => setCode(e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "问题标题", "data-testid": "d8-title", value: title, onChange: (e) => setTitle(e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "来源单号", "data-testid": "d8-source", value: sourceNo, onChange: (e) => setSourceNo(e.target.value) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TextField, { fullWidth: true, select: true, label: "优先级", "data-testid": "d8-priority", value: priority, onChange: (e) => setPriority(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "high", children: "高" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "medium", children: "中" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "low", children: "低" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(TextField, { fullWidth: true, label: "负责人", "data-testid": "d8-owner", value: owner, onChange: (e) => setOwner(e.target.value) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "d8-add-confirm", onClick: submit, children: "确认新增" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { sx: { ml: 1 }, "data-testid": "d8-cancel", onClick: () => setAdding(false), children: "取消" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "编号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "标题" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "来源" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "优先级" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "负责人" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "状态" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: eightDRecords.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "d8-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.code }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.sourceNo || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: PRIORITY_LABEL[r.priority], color: r.priority === "high" ? "error" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.owner }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: STATUS_LABEL[r.status], color: r.status === "closed" ? "success" : r.status === "in_progress" ? "warning" : "default" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
          r.status !== "closed" && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "success", "data-testid": "d8-close", onClick: () => closeEightD(r.id), children: "关闭" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", "data-testid": "d8-delete", onClick: () => deleteEightD(r.id), children: "删除" })
        ] })
      ] }, r.id)) })
    ] }) })
  ] });
}
export {
  EightDPage as default
};
