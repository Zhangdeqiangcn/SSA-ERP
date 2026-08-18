import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bj as Alert, cO as TableContainer, aP as Paper, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, bk as Button, c$ as default_1, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bt as TextField, aO as MenuItem, d0 as FormControlLabel, d1 as Switch, i as Divider, bC as DialogActions } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore } from "./index-CcOZBoQL.js";
import { u as useMaterialExtensionStore } from "./materialExtensionStore-B0eAxQzZ.js";
const VC_LABEL = {
  RAW: "原材料",
  SEMI: "半成品",
  FG: "产成品",
  TRADING: "贸易商品",
  PACKAGING: "包装物",
  CONSUMABLE: "消耗品"
};
function MaterialValuationPage() {
  const { materials, updateMaterial } = useMaterialStore();
  const { changeDocs, logMaterialChange } = useMaterialExtensionStore();
  const [open, setOpen] = reactExports.useState(false);
  const [targetId, setTargetId] = reactExports.useState("");
  const [form, setForm] = reactExports.useState({});
  const [plants, setPlants] = reactExports.useState([]);
  const target = reactExports.useMemo(() => materials.find((m) => m.id === targetId), [materials, targetId]);
  const openEdit = (m) => {
    setTargetId(m.id);
    setForm({
      valuationClass: m.valuationClass,
      priceControl: m.priceControl,
      standardPrice: m.standardPrice,
      batchManaged: m.batchManaged,
      serialized: m.serialized
    });
    setPlants(m.plantParams ? [...m.plantParams] : []);
    setOpen(true);
  };
  const handleSave = () => {
    var _a;
    if (!target) return;
    const fields = [];
    const track = [
      ["valuationClass", "评估类"],
      ["priceControl", "价控程序"],
      ["standardPrice", "标准价"],
      ["batchManaged", "批次管理"],
      ["serialized", "序列号管理"]
    ];
    track.forEach(([key, label]) => {
      const oldV = String(target[key] ?? "");
      const newV = String(form[key] ?? "");
      if (oldV !== newV) fields.push({ field: label, oldValue: oldV, newValue: newV });
    });
    if (JSON.stringify(plants) !== JSON.stringify(target.plantParams || [])) {
      fields.push({ field: "工厂维度", oldValue: `${((_a = target.plantParams) == null ? void 0 : _a.length) || 0}个`, newValue: `${plants.length}个` });
    }
    updateMaterial(target.id, {
      valuationClass: form.valuationClass,
      priceControl: form.priceControl,
      standardPrice: form.standardPrice,
      batchManaged: form.batchManaged,
      serialized: form.serialized,
      plantParams: plants
    });
    if (fields.length > 0) {
      logMaterialChange({
        materialId: target.id,
        materialCode: target.code,
        materialName: target.name,
        changeType: "valuation",
        fields,
        reason: "评估类/价控/工厂维度维护"
      });
    }
    setOpen(false);
  };
  const docsFor = (id) => changeDocs.filter((d) => d.materialId === id);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2 }, "data-testid": "material-valuation", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", gutterBottom: true, children: "物料评估类 / 价控 / 工厂维度" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { mb: 2 }, children: "对标 SAP 评估类与价控程序（S标准价/V移动平均价），支持多工厂评估视图，变更留痕。移动平均价与库存金额由入库过账自动滚动（A4 成本核算），不可手改。" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { component: Paper, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "物料" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "评估类" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "价控" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "标准价" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "移动平均价" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "库存金额" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "批次/序列号" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "工厂维度" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "变更" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: materials.map((m) => {
        var _a;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "mv-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            m.code,
            " ",
            m.name
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: m.valuationClass ? VC_LABEL[m.valuationClass] : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: m.priceControl || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: m.standardPrice ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: m.movingAvgPrice ?? "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: typeof m.stockValue === "number" ? m.stockValue.toFixed(2) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            m.batchManaged ? "批次 " : "",
            m.serialized ? "序列号" : "",
            !m.batchManaged && !m.serialized ? "—" : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
            ((_a = m.plantParams) == null ? void 0 : _a.length) || 0,
            " 个"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: docsFor(m.id).length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(default_1, {}), "data-testid": "mv-edit", onClick: () => openEdit(m), children: "维护" }) })
        ] }, m.id);
      }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "维护评估类/价控/工厂维度 — ",
        target == null ? void 0 : target.code,
        " ",
        target == null ? void 0 : target.name
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "评估类",
            value: form.valuationClass || "",
            onChange: (e) => setForm({ ...form, valuationClass: e.target.value }),
            children: Object.keys(VC_LABEL).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: k, children: VC_LABEL[k] }, k))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            select: true,
            label: "价控程序",
            value: form.priceControl || "S",
            onChange: (e) => setForm({ ...form, priceControl: e.target.value }),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "S", children: "S 标准价" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "V", children: "V 移动平均价" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            margin: "dense",
            label: "标准价",
            type: "number",
            value: form.standardPrice ?? 0,
            onChange: (e) => setForm({ ...form, standardPrice: Number(e.target.value) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "info", sx: { mt: 1, mb: 1 }, children: [
          "移动平均价与库存金额由出入库过账自动滚动（A4 成本核算），此处只读不可手改。 当前移动平均价：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: (target == null ? void 0 : target.movingAvgPrice) ?? "—" }),
          "；库存金额：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: typeof (target == null ? void 0 : target.stockValue) === "number" ? target.stockValue.toFixed(2) : "—" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { control: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: !!form.batchManaged, onChange: (e) => setForm({ ...form, batchManaged: e.target.checked }) }), label: "批次管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(FormControlLabel, { control: /* @__PURE__ */ jsxRuntimeExports.jsx(Switch, { checked: !!form.serialized, onChange: (e) => setForm({ ...form, serialized: e.target.checked }) }), label: "序列号管理" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", children: "工厂维度参数" }),
        plants.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, mb: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              label: "工厂",
              value: p.plantId,
              onChange: (e) => {
                const n = [...plants];
                n[i] = { ...n[i], plantId: e.target.value };
                setPlants(n);
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              size: "small",
              label: "标准价",
              type: "number",
              value: p.standardPrice ?? 0,
              onChange: (e) => {
                const n = [...plants];
                n[i] = { ...n[i], standardPrice: Number(e.target.value) };
                setPlants(n);
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", onClick: () => setPlants(plants.filter((_, j) => j !== i)), children: "删" })
        ] }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", "data-testid": "mv-add-plant", onClick: () => setPlants([...plants, { plantId: "", plantName: "" }]), children: "+ 添加工厂" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", "data-testid": "mv-save", onClick: handleSave, children: "保存并留痕" })
      ] })
    ] })
  ] });
}
export {
  MaterialValuationPage as default
};
