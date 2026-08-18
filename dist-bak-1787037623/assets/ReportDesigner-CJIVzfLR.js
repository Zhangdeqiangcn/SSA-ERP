import { r as reactExports, R as React, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as useReportDataMap, D as DATASETS } from "./reportData-fDBA2GUh.js";
import { bY as Grid, aS as Paper, T as Typography, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, de as ViewColumn, bL as Stack, aO as Chip, bv as TextField, bm as Button, bd as Save, n as Divider, bl as Alert, bs as Card, m as Box, dH as PlayArrow, be as Delete } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
import "./financeExtensionStore-DxSjHPMg.js";
import "./productionStore-3WoghQIz.js";
const STORAGE_KEY = "ssa-erp-report-defs";
const ReportDesigner = () => {
  const DATA_MAP = useReportDataMap();
  const [dataset, setDataset] = reactExports.useState("material");
  const [selectedFields, setSelectedFields] = reactExports.useState(["code", "name", "price"]);
  const [filterField, setFilterField] = reactExports.useState("name");
  const [filterOperator, setFilterOperator] = reactExports.useState("contains");
  const [filterValue, setFilterValue] = reactExports.useState("");
  const [reportName, setReportName] = reactExports.useState("");
  const [saved, setSaved] = reactExports.useState([]);
  const [loaded, setLoaded] = reactExports.useState(null);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      setSaved([]);
    }
  }, []);
  const fields = DATASETS[dataset].fields;
  const toggleField = (key) => {
    setSelectedFields(
      (prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };
  const previewData = reactExports.useMemo(() => {
    let rows = [...DATA_MAP[dataset] || []];
    if (filterField && filterValue.trim()) {
      const v = filterValue.trim().toLowerCase();
      rows = rows.filter((r) => {
        const cell = String(r[filterField] ?? "");
        return filterOperator === "equals" ? cell === v : cell.toLowerCase().includes(v);
      });
    }
    return rows;
  }, [dataset, filterField, filterOperator, filterValue]);
  const columns = reactExports.useMemo(
    () => selectedFields.map((key) => {
      const f = fields.find((x) => x.key === key);
      return {
        accessorKey: key,
        header: f ? f.label : key
      };
    }),
    [selectedFields, fields]
  );
  const saveReport = () => {
    if (!reportName.trim()) return;
    const def = {
      id: `rpt-${Date.now()}`,
      name: reportName.trim(),
      dataset,
      fields: selectedFields,
      filter: { field: filterField, operator: filterOperator, value: filterValue }
    };
    const next = [...saved, def];
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setReportName("");
    setLoaded(def);
  };
  const loadReport = (def) => {
    setDataset(def.dataset);
    setSelectedFields(def.fields);
    setFilterField(def.filter.field);
    setFilterOperator(def.filter.operator);
    setFilterValue(def.filter.value);
    setLoaded(def);
  };
  const deleteReport = (id) => {
    const next = saved.filter((d) => d.id !== id);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if ((loaded == null ? void 0 : loaded.id) === id) setLoaded(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "报表自定义设计器", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 4, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: "1. 选择数据集" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "数据集" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "数据集",
              value: dataset,
              onChange: (e) => {
                setDataset(e.target.value);
                setSelectedFields([]);
              },
              children: Object.entries(DATASETS).map(([key, d]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: key, children: d.label }, key))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ViewColumn, { sx: { fontSize: 18, mr: 0.5, verticalAlign: "middle" } }),
          "2. 选择字段（点击切换）"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", flexWrap: "wrap", useFlexGap: true, spacing: 1, children: fields.map((f) => {
          const active = selectedFields.includes(f.key);
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              label: f.label,
              color: active ? "primary" : "default",
              variant: active ? "filled" : "outlined",
              onClick: () => toggleField(f.key)
            },
            f.key
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: "3. 筛选条件（可选）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "字段" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "字段", value: filterField, onChange: (e) => setFilterField(e.target.value), children: fields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: f.key, children: f.label }, f.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "匹配方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Select,
            {
              label: "匹配方式",
              value: filterOperator,
              onChange: (e) => setFilterOperator(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "contains", children: "包含" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "equals", children: "等于" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            fullWidth: true,
            size: "small",
            label: "筛选值",
            value: filterValue,
            onChange: (e) => setFilterValue(e.target.value)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 8, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1.5, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
            "4. 实时预览（共 ",
            previewData.length,
            " 条）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                label: "报表名称",
                value: reportName,
                onChange: (e) => setReportName(e.target.value),
                sx: { width: 180 }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}),
                disabled: !reportName.trim() || selectedFields.length === 0,
                onClick: saveReport,
                sx: { bgcolor: "#3B82F6" },
                children: "保存报表"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
        selectedFields.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "请先在左侧选择至少一个字段。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: previewData,
            columns,
            enableRowSelection: true,
            enablePagination: true,
            enableExport: true,
            pageSize: 8
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: [
          "已保存报表（",
          saved.length,
          "）"
        ] }),
        saved.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无已保存报表，配置后点击「保存报表」。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, children: saved.map((d) => {
          var _a;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { p: 1.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: d.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                (_a = DATASETS[d.dataset]) == null ? void 0 : _a.label,
                " · ",
                d.fields.length,
                " 个字段",
                d.filter.value ? ` · 筛选: ${d.filter.value}` : ""
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, {}), onClick: () => loadReport(d), children: "载入" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "small",
                  color: "error",
                  startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}),
                  onClick: () => deleteReport(d.id),
                  children: "删除"
                }
              )
            ] })
          ] }) }, d.id);
        }) })
      ] })
    ] })
  ] }) });
};
export {
  ReportDesigner as default
};
