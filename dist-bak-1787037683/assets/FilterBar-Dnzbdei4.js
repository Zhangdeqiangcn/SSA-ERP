import { cL as useForm, R as React, r as reactExports, j as jsxRuntimeExports, B as Box, bK as Stack, cM as Controller, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bt as TextField, bk as Button, aQ as Search, E as ExpandLess, s as ExpandMore, k as Tooltip, aJ as IconButton, aF as Settings, aY as Popover, i as Divider, d0 as FormControlLabel, db as Checkbox, dJ as Bookmark, bb as Save, bp as DeleteOutline, dw as ViewColumn } from "./vendor-46QZWBd3.js";
import { v as useListPrefsStore } from "./index-CcOZBoQL.js";
const FilterBar = ({
  fields,
  onSearch,
  onFilter,
  onReset,
  listKey,
  columnConfigKey,
  defaultVisibleCount = 3
}) => {
  const { control, handleSubmit, reset, getValues } = useForm();
  const [querySel, setQuerySel] = React.useState("");
  const [colSel, setColSel] = React.useState("");
  const [expanded, setExpanded] = reactExports.useState(false);
  const [settingsAnchor, setSettingsAnchor] = reactExports.useState(null);
  const querySchemes = useListPrefsStore((s) => listKey ? s.querySchemes[listKey] ?? [] : []);
  const columnSchemes = useListPrefsStore((s) => listKey ? s.columnSchemes[listKey] ?? [] : []);
  const saveQueryScheme = useListPrefsStore((s) => s.saveQueryScheme);
  const deleteQueryScheme = useListPrefsStore((s) => s.deleteQueryScheme);
  const saveColumnScheme = useListPrefsStore((s) => s.saveColumnScheme);
  const deleteColumnScheme = useListPrefsStore((s) => s.deleteColumnScheme);
  const filterFieldPrefs = useListPrefsStore((s) => listKey ? s.filterFieldPrefs[listKey] : void 0);
  const setFilterFieldPrefs = useListPrefsStore((s) => s.setFilterFieldPrefs);
  const resetFilterFieldPrefs = useListPrefsStore((s) => s.resetFilterFieldPrefs);
  const visibleFields = reactExports.useMemo(() => {
    if (expanded) return fields;
    if (filterFieldPrefs && Array.isArray(filterFieldPrefs)) {
      const byName = new Map(fields.map((f) => [f.name, f]));
      const ordered = filterFieldPrefs.map((n) => byName.get(n)).filter((f) => Boolean(f));
      const extra = fields.filter((f) => !filterFieldPrefs.includes(f.name));
      return [...ordered, ...extra];
    }
    return fields.slice(0, defaultVisibleCount);
  }, [fields, expanded, filterFieldPrefs, defaultVisibleCount]);
  const [checked, setChecked] = reactExports.useState([]);
  const openSettings = (e) => {
    setChecked(visibleFields.map((f) => f.name));
    setSettingsAnchor(e.currentTarget);
  };
  const closeSettings = () => setSettingsAnchor(null);
  const settingsOpen = Boolean(settingsAnchor);
  const toggleCheck = (name) => {
    setChecked(
      (prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const applySettings = () => {
    if (listKey) {
      const ordered = fields.filter((f) => checked.includes(f.name)).map((f) => f.name);
      setFilterFieldPrefs(listKey, ordered);
    }
    closeSettings();
  };
  const resetSettings = () => {
    if (listKey) resetFilterFieldPrefs(listKey);
    closeSettings();
  };
  const doSearch = (values) => {
    const fn = onSearch ?? onFilter;
    fn == null ? void 0 : fn(values);
  };
  const onSubmit = (values) => {
    doSearch(values);
  };
  const handleReset = () => {
    reset();
    setQuerySel("");
    setExpanded(false);
    if (onReset) onReset();
    else doSearch({});
  };
  const handleLoadQuery = (id) => {
    setQuerySel(id);
    const scheme = querySchemes.find((q) => q.id === id);
    if (!scheme) return;
    reset(scheme.filters);
    doSearch(scheme.filters);
  };
  const handleSaveQuery = () => {
    if (!listKey) return;
    const name = window.prompt("查询方案名称", "我的查询方案");
    if (!name) return;
    saveQueryScheme(listKey, name.trim(), getValues());
  };
  const handleSaveColumn = () => {
    if (!listKey || !columnConfigKey) return;
    const name = window.prompt("列方案名称", "我的列方案");
    if (!name) return;
    let hidden = [];
    try {
      const raw = localStorage.getItem(`ssa-dt-colcfg-${columnConfigKey}`);
      hidden = raw ? JSON.parse(raw) : [];
    } catch {
      hidden = [];
    }
    saveColumnScheme(listKey, name.trim(), hidden);
  };
  const handleApplyColumn = (id) => {
    setColSel(id);
    const scheme = columnSchemes.find((c) => c.id === id);
    if (!scheme || !columnConfigKey) return;
    try {
      localStorage.setItem(`ssa-dt-colcfg-${columnConfigKey}`, JSON.stringify(scheme.hidden));
      window.dispatchEvent(
        new CustomEvent("ssa-dt-colcfg-changed", { detail: { key: columnConfigKey } })
      );
    } catch {
    }
  };
  const hasHidden = visibleFields.length < fields.length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2, p: 1.25, bgcolor: "background.default", borderRadius: 1 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { component: "form", onSubmit: handleSubmit(onSubmit), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.25, alignItems: "flex-end", flexWrap: "wrap", children: [
      visibleFields.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Controller,
        {
          name: field.name,
          control,
          defaultValue: "",
          render: ({ field: formField }) => {
            var _a;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { sx: { minWidth: field.type === "text" ? 160 : 130 }, size: "small", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: field.label }),
              field.type === "select" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { ...formField, label: field.label, children: (_a = field.options) == null ? void 0 : _a.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value)) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  ...formField,
                  type: field.type === "date" ? "date" : "text",
                  label: field.label,
                  placeholder: field.placeholder,
                  size: "small",
                  InputLabelProps: { shrink: field.type === "date" }
                }
              )
            ] });
          }
        },
        field.name
      )),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "submit",
          variant: "contained",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, {}),
          size: "small",
          sx: { height: 32 },
          children: "查询"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", size: "small", type: "button", onClick: handleReset, sx: { height: 32 }, children: "重置" }),
      hasHidden && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "text",
          size: "small",
          type: "button",
          onClick: () => setExpanded((v) => !v),
          endIcon: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandLess, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExpandMore, {}),
          sx: { height: 32 },
          children: expanded ? "收起筛选" : "更多筛选"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "自定义检索项", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { type: "button", size: "small", onClick: openSettings, sx: { alignSelf: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { fontSize: "small" }) }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Popover,
      {
        open: settingsOpen,
        anchorEl: settingsAnchor,
        onClose: closeSettings,
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 1.5, width: 220, maxHeight: 320, overflow: "auto" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Stack,
            {
              direction: "row",
              justifyContent: "space-between",
              alignItems: "center",
              sx: { mb: 1, px: 0.5 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { fontSize: 13, fontWeight: 600 }, children: "自定义检索项" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: resetSettings, children: "恢复默认" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1 }, children: fields.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FormControlLabel,
            {
              control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Checkbox,
                {
                  size: "small",
                  checked: checked.includes(field.name),
                  onChange: () => toggleCheck(field.name)
                }
              ),
              label: field.label,
              sx: { display: "block", my: 0 }
            },
            field.name
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "flex-end", spacing: 1, sx: { mt: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", onClick: closeSettings, children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "contained", onClick: applySettings, children: "确定" })
          ] })
        ] })
      }
    ),
    listKey && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 1.25, borderColor: "divider" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", flexWrap: "wrap", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Bookmark, { fontSize: "small", sx: { color: "text.secondary" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 160 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "查询方案" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              value: querySel,
              label: "查询方案",
              onChange: (e) => handleLoadQuery(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "— 不选用 —" }),
                querySchemes.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: q.id, children: q.name }, q.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSaveQuery, children: "保存方案" }),
        querySel && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除当前查询方案", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          IconButton,
          {
            size: "small",
            onClick: () => {
              deleteQueryScheme(listKey, querySel);
              setQuerySel("");
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteOutline, { fontSize: "small" })
          }
        ) }),
        columnConfigKey && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { orientation: "vertical", flexItem: true, sx: { borderColor: "divider" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ViewColumn, { fontSize: "small", sx: { color: "text.secondary" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { size: "small", sx: { minWidth: 160 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "列方案" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: colSel,
                label: "列方案",
                onChange: (e) => handleApplyColumn(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "", children: "— 默认列 —" }),
                  columnSchemes.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: c.id, children: c.name }, c.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSaveColumn, children: "保存列" }),
          colSel && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除当前列方案", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            IconButton,
            {
              size: "small",
              onClick: () => {
                deleteColumnScheme(listKey, colSel);
                setColSel("");
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteOutline, { fontSize: "small" })
            }
          ) })
        ] })
      ] })
    ] })
  ] });
};
export {
  FilterBar as F
};
