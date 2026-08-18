import { r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, c2 as Tabs, c3 as Tab, bk as Button, bf as Add, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody, aJ as IconButton, bc as Delete, aP as Paper, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, aL as Chip, bt as TextField, b7 as Dialog, b8 as DialogTitle, ba as DialogContent, bC as DialogActions } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import "./customerStore-D75PJy1n.js";
import "./priceStore-CduvTkzQ.js";
import "./salesPriceStore-C1lbTZ_V.js";
import "./bomStore-CxaOFNQN.js";
import "./productionStore-Bdmg7HTu.js";
import "./productionOperationStore-ByOb08ia.js";
import "./financeExtensionStore-DC0IEDMi.js";
import "./productionVersionStore-C21otdJB.js";
import "./subcontractStore-BexFn7Un.js";
import "./equipmentStore-CrhJcIrI.js";
import "./productionSchedulingStore-DTA-q4iJ.js";
import "./vendorPerformanceStore-GquLJMJn.js";
import "./vendorPortalStore-Cnq134KH.js";
import "./dataDictStore-CtoXLbZz.js";
import "./numberingStore-CLVDn2Au.js";
import "./warehouseMasterStore-C3VWShZa.js";
import { b as useLowCodeStore } from "./reportPermissionStore-CXyepbWY.js";
import "./salesAdvancedStore-CXmEdniM.js";
import "./purchaseAdvancedStore-C5npzY_b.js";
import "./warehouseAdvancedStore-DXjc0JQH.js";
import "./qualityAdvancedStore-Btlaa4xT.js";
import "./materialExtensionStore-BHkusB9L.js";
import "./purchaseInfoRecordStore-C2W723zd.js";
import "./sourceListStore-BT5zvRN_.js";
import "./qualityExtensionStore-CoUA1fWj.js";
import "./analyticsStore-DJYS74NQ.js";
import "./arapStore-CxlnIECw.js";
import "./workbenchStore-DcLy2Z4C.js";
import "./conditionStore-D-IHrlNs.js";
import "./ecnStore-CzTUK1H2.js";
import "./rebateStore-DO7GHeV5.js";
import "./fmeaStore-B4RTvukf.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const FIELD_TYPES = ["text", "number", "date", "select", "textarea", "checkbox"];
const LowCodeDesigner = () => {
  var _a;
  const { formDefinitions, formRecords, addFormDefinition, deleteFormDefinition, submitForm, deleteRecord } = useLowCodeStore();
  const [tab, setTab] = reactExports.useState(0);
  const [open, setOpen] = reactExports.useState(false);
  const [name, setName] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [fields, setFields] = reactExports.useState([]);
  const [runtimeFormId, setRuntimeFormId] = reactExports.useState(((_a = formDefinitions[0]) == null ? void 0 : _a.id) ?? "");
  const [runtimeData, setRuntimeData] = reactExports.useState({});
  const addFieldRow = () => setFields((f) => [...f, { key: `f${f.length + 1}`, label: "", type: "text" }]);
  const updateField = (idx, patch) => setFields((f) => f.map((x, i) => i === idx ? { ...x, ...patch } : x));
  const removeField = (idx) => setFields((f) => f.filter((_, i) => i !== idx));
  const handleConfirm = () => {
    if (!name.trim()) return;
    addFormDefinition({ name: name.trim(), description: description.trim(), fields });
    setName("");
    setDescription("");
    setFields([]);
    setOpen(false);
  };
  const handleSubmitRuntime = () => {
    if (!runtimeFormId) return;
    submitForm(runtimeFormId, runtimeData);
    setRuntimeData({});
  };
  const runtimeForm = formDefinitions.find((f) => f.id === runtimeFormId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 3 }, "data-testid": "lowcode", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { mb: 2, fontWeight: 700 }, children: "低代码单据设计器" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "表单定义" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "数据填报" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "提交记录" })
    ] }),
    tab === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "lc-form-add", variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => setOpen(true), sx: { mb: 2 }, children: "新建表单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "表单名称" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "字段数" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "说明" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: formDefinitions.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "lc-form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.fields.length }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: f.description }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { "data-testid": "lc-form-del", onClick: () => deleteFormDefinition(f.id), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}) }) })
        ] }, f.id)) })
      ] })
    ] }),
    tab === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "选择表单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            "data-testid": "lc-runtime-form",
            value: runtimeFormId,
            label: "选择表单",
            onChange: (e) => {
              setRuntimeFormId(e.target.value);
              setRuntimeData({});
            },
            children: formDefinitions.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: f.id, children: f.name }, f.id))
          }
        )
      ] }),
      runtimeForm == null ? void 0 : runtimeForm.fields.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", sx: { color: "#64748B" }, children: [
          field.label,
          field.required ? " *" : ""
        ] }),
        field.type === "select" ? /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { fullWidth: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            "data-testid": `lc-field-${field.key}`,
            value: runtimeData[field.key] ?? "",
            onChange: (e) => setRuntimeData((d) => ({ ...d, [field.key]: e.target.value })),
            children: (field.options ?? []).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: o, children: o }, o))
          }
        ) }) : field.type === "checkbox" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            "data-testid": `lc-field-${field.key}`,
            label: runtimeData[field.key] ? "是" : "否",
            onClick: () => setRuntimeData((d) => ({ ...d, [field.key]: !d[field.key] }))
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": `lc-field-${field.key}`,
            fullWidth: true,
            type: field.type === "number" ? "number" : field.type === "date" ? "date" : "text",
            multiline: field.type === "textarea",
            value: runtimeData[field.key] ?? "",
            onChange: (e) => setRuntimeData((d) => ({ ...d, [field.key]: e.target.value }))
          }
        )
      ] }, field.key)),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "lc-submit", variant: "contained", onClick: handleSubmitRuntime, children: "提交" })
    ] }),
    tab === 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "表单" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "数据摘要" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "提交时间" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "操作" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: formRecords.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { "data-testid": "lc-record-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.formName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: Object.entries(r.data).map(([k, v]) => `${k}:${v}`).join("，") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: r.createdAt }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { "data-testid": "lc-record-del", onClick: () => deleteRecord(r.id), size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}) }) })
      ] }, r.id)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "新建表单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "lc-form-name",
            fullWidth: true,
            label: "表单名称",
            value: name,
            onChange: (e) => setName(e.target.value),
            sx: { mb: 2, mt: 1 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            "data-testid": "lc-form-desc",
            fullWidth: true,
            label: "说明",
            value: description,
            onChange: (e) => setDescription(e.target.value),
            sx: { mb: 2 }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "lc-field-add", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: addFieldRow, sx: { mb: 1 }, children: "添加字段" }),
        fields.map((f, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, mb: 1, alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              "data-testid": `lc-field-label-${idx}`,
              label: "字段名",
              value: f.label,
              onChange: (e) => updateField(idx, { label: e.target.value })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(FormControl, { sx: { minWidth: 120 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              "data-testid": `lc-field-type-${idx}`,
              value: f.type,
              onChange: (e) => updateField(idx, { type: e.target.value }),
              children: FIELD_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: t, children: t }, t))
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { onClick: () => removeField(idx), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}) })
        ] }, idx))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setOpen(false), children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { "data-testid": "lc-form-add-confirm", variant: "contained", onClick: handleConfirm, children: "确定" })
      ] })
    ] })
  ] });
};
export {
  LowCodeDesigner as default
};
