import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import "./index-CU2cqxc8.js";
import "./customerStore-BZF1KdNo.js";
import "./priceStore-DijJfeBL.js";
import "./salesPriceStore-cjxfIxIT.js";
import "./bomStore-Gzuh4wJM.js";
import "./productionStore-3WoghQIz.js";
import "./productionOperationStore-BOD4obub.js";
import "./financeExtensionStore-DxSjHPMg.js";
import "./productionVersionStore-RUhZ-sHu.js";
import "./subcontractStore-DEU0s8qw.js";
import "./equipmentStore-Be67EIyI.js";
import "./productionSchedulingStore-jeZjQvFy.js";
import "./vendorPerformanceStore-DSqs7hVk.js";
import "./vendorPortalStore-B2sPBeRr.js";
import "./dataDictStore-66NejlLO.js";
import "./numberingStore-BDs7p47y.js";
import "./warehouseMasterStore-BjZtdDuE.js";
import { b as useLowCodeStore } from "./reportPermissionStore-dkLqyfDv.js";
import "./salesAdvancedStore-BUVrzeLF.js";
import "./purchaseAdvancedStore-X5oSWK-7.js";
import "./warehouseAdvancedStore-D-kOSyQs.js";
import "./qualityAdvancedStore-Bdw6LGIv.js";
import "./materialExtensionStore-BnWp3IKN.js";
import "./purchaseInfoRecordStore-DLQisuuK.js";
import "./sourceListStore-DG1dXUIB.js";
import "./qualityExtensionStore-BDssWY5M.js";
import "./analyticsStore-DaEDsYjs.js";
import "./arapStore-Cccu0U7n.js";
import "./workbenchStore-COBsjc3d.js";
import "./conditionStore-DTiljowj.js";
import "./ecnStore-D8unIvA0.js";
import "./rebateStore-89dNxLDm.js";
import "./fmeaStore-CKbOOC47.js";
import { m as Box, T as Typography, c2 as Tabs, c3 as Tab, bm as Button, bh as Add, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aM as IconButton, be as Delete, aS as Paper, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, aO as Chip, bv as TextField, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bE as DialogActions } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./vendor-date-DI3D_gXa.js";
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
