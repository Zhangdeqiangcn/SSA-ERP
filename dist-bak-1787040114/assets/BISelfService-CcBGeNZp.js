import { r as reactExports, R as React, j as jsxRuntimeExports, bX as Grid, aP as Paper, h as Typography, eI as LinkIcon, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bk as Button, bK as Stack, aL as Chip, bj as Alert, aj as Insights, bt as TextField, bb as Save, i as Divider, B as Box, cm as BarChart, cn as LineChart, co as PieChart, bq as Card, e2 as PlayArrow, bc as Delete } from "./vendor-DGU5TO-x.js";
import "./index-DeeqqmHA.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import { P as PageWrapper } from "./PageWrapper-CUE4-muk.js";
import { u as useReportDataMap, D as DATASETS, j as joinDatasets } from "./reportData-CKddBPWY.js";
import "./StatusBadge-DeJuhK-R.js";
import "./financeExtensionStore-DC0IEDMi.js";
import "./productionStore-Bdmg7HTu.js";
const STORAGE_KEY = "ssa-erp-bi-defs";
const PRIMARY = "#3B82F6";
const PALETTE = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#EC4899"];
const BISelfService = () => {
  const DATA_MAP = useReportDataMap();
  const [dataset, setDataset] = reactExports.useState("sales");
  const [dimension, setDimension] = reactExports.useState("customerName");
  const [measure, setMeasure] = reactExports.useState("totalAmount");
  const [agg, setAgg] = reactExports.useState("sum");
  const [chartType, setChartType] = reactExports.useState("bar");
  const [analysisName, setAnalysisName] = reactExports.useState("");
  const [saved, setSaved] = reactExports.useState([]);
  const [loaded, setLoaded] = reactExports.useState(null);
  const [joinActive, setJoinActive] = reactExports.useState(false);
  const [joinLeft, setJoinLeft] = reactExports.useState("vendor");
  const [joinLeftKey, setJoinLeftKey] = reactExports.useState("name");
  const [joinRight, setJoinRight] = reactExports.useState("purchase");
  const [joinRightKey, setJoinRightKey] = reactExports.useState("vendorName");
  const [joinType, setJoinType] = reactExports.useState("inner");
  const [joinedRows, setJoinedRows] = reactExports.useState([]);
  const [joinedFields, setJoinedFields] = reactExports.useState([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      setSaved([]);
    }
  }, []);
  const activeFields = joinActive ? joinedFields : DATASETS[dataset].fields;
  const activeRows = joinActive ? joinedRows : DATA_MAP[dataset] || [];
  const dimensionField = activeFields.find((f) => f.key === dimension);
  const measureField = activeFields.find((f) => f.key === measure);
  const aggData = reactExports.useMemo(() => {
    const rows = activeRows;
    const map = /* @__PURE__ */ new Map();
    rows.forEach((r) => {
      const dv = String(r[dimension] ?? "—");
      const mv = Number(r[measure] ?? 0);
      const e = map.get(dv) || { sum: 0, count: 0 };
      e.sum += Number.isNaN(mv) ? 0 : mv;
      e.count += 1;
      map.set(dv, e);
    });
    return Array.from(map.entries()).map(([label, e]) => ({
      label,
      value: agg === "count" ? e.count : agg === "avg" ? e.count ? e.sum / e.count : 0 : e.sum
    }));
  }, [activeRows, dimension, measure, agg]);
  const resultColumns = reactExports.useMemo(
    () => [
      { accessorKey: "label", header: (dimensionField == null ? void 0 : dimensionField.label) ?? "维度" },
      { accessorKey: "value", header: `${(measureField == null ? void 0 : measureField.label) ?? "度量"} (${agg === "count" ? "计数" : agg === "avg" ? "平均" : "合计"})` }
    ],
    [dimensionField, measureField, agg]
  );
  const saveAnalysis = () => {
    if (!analysisName.trim()) return;
    const def = { id: `bi-${Date.now()}`, name: analysisName.trim(), dataset, dimension, measure, agg, chartType };
    const next = [...saved, def];
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAnalysisName("");
    setLoaded(def);
  };
  const loadAnalysis = (def) => {
    setDataset(def.dataset);
    setDimension(def.dimension);
    setMeasure(def.measure);
    setAgg(def.agg);
    setChartType(def.chartType);
    setLoaded(def);
    setJoinActive(false);
  };
  const deleteAnalysis = (id) => {
    const next = saved.filter((d) => d.id !== id);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if ((loaded == null ? void 0 : loaded.id) === id) setLoaded(null);
  };
  const generateJoin = () => {
    if (!joinLeft || !joinLeftKey || !joinRight || !joinRightKey) return;
    const leftRows = DATA_MAP[joinLeft] || [];
    const rightRows = DATA_MAP[joinRight] || [];
    const res = joinDatasets(
      leftRows,
      DATASETS[joinLeft].fields,
      rightRows,
      DATASETS[joinRight].fields,
      joinLeftKey,
      joinRightKey,
      joinType
    );
    setJoinedRows(res.rows);
    setJoinedFields(res.fields);
    setJoinActive(true);
    setDimension(joinLeftKey);
    const firstNum = res.fields.find((f) => f.type === "number" && f.key !== joinLeftKey);
    setMeasure(firstNum ? firstNum.key : "");
  };
  const clearJoin = () => {
    setJoinActive(false);
    setJoinedRows([]);
    setJoinedFields([]);
    setDimension("customerName");
    setMeasure("totalAmount");
    setDataset("sales");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "BI 自助分析", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 4, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2, border: "1px solid", borderColor: "divider" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1, sx: { color: PRIMARY }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LinkIcon, { sx: { fontSize: 18, mr: 0.5, verticalAlign: "middle" } }),
          "跨模块关联分析（Join）"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", mb: 1.5, children: "将左侧与右侧数据集按关联字段合并，右表字段以 R· 前缀标识，可直接用于维度/度量分析。" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "左侧数据集" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "左侧数据集", value: joinLeft, onChange: (e) => {
            setJoinLeft(e.target.value);
            setJoinLeftKey("");
          }, children: Object.entries(DATASETS).map(([key, d]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: key, children: d.label }, key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "左侧关联字段" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "左侧关联字段", value: joinLeftKey, onChange: (e) => setJoinLeftKey(e.target.value), children: DATASETS[joinLeft].fields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: f.key, children: [
            f.label,
            "（",
            f.key,
            "）"
          ] }, f.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "右侧数据集" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "右侧数据集", value: joinRight, onChange: (e) => {
            setJoinRight(e.target.value);
            setJoinRightKey("");
          }, children: Object.entries(DATASETS).map(([key, d]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: key, children: d.label }, key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "右侧关联字段" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "右侧关联字段", value: joinRightKey, onChange: (e) => setJoinRightKey(e.target.value), children: DATASETS[joinRight].fields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: f.key, children: [
            f.label,
            "（",
            f.key,
            "）"
          ] }, f.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "关联方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { label: "关联方式", value: joinType, onChange: (e) => setJoinType(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "inner", children: "内连接（仅匹配行）" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "left", children: "左连接（保留左表）" })
          ] })
        ] }),
        joinActive ? /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { fullWidth: true, variant: "outlined", color: "inherit", onClick: clearJoin, children: "清除关联" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            fullWidth: true,
            variant: "contained",
            disabled: !joinLeftKey || !joinRightKey,
            onClick: generateJoin,
            sx: { bgcolor: PRIMARY },
            children: "生成关联数据集"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: "1. 选择数据集" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "分析数据集" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              label: "分析数据集",
              value: dataset,
              onChange: (e) => {
                setDataset(e.target.value);
                setDimension("");
                setMeasure("");
              },
              children: Object.entries(DATASETS).map(([key, d]) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: key, children: d.label }, key))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: "2. 维度与度量" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "维度（分组字段）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "维度（分组字段）", value: dimension, onChange: (e) => setDimension(e.target.value), children: activeFields.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: f.key, children: f.label }, f.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", sx: { mb: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "度量（数值字段）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Select, { label: "度量（数值字段）", value: measure, onChange: (e) => setMeasure(e.target.value), children: activeFields.filter((f) => f.type === "number").map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: f.key, children: f.label }, f.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "聚合方式" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { label: "聚合方式", value: agg, onChange: (e) => setAgg(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "sum", children: "求和 (sum)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "avg", children: "平均 (avg)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "count", children: "计数 (count)" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: "3. 图表类型" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { direction: "row", spacing: 1, children: [
          { v: "bar", l: "柱状图" },
          { v: "pie", l: "饼图" },
          { v: "line", l: "折线图" }
        ].map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            label: opt.l,
            color: chartType === opt.v ? "primary" : "default",
            variant: chartType === opt.v ? "filled" : "outlined",
            onClick: () => setChartType(opt.v)
          },
          opt.v
        )) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 8, children: [
      joinActive && /* @__PURE__ */ jsxRuntimeExports.jsxs(Alert, { severity: "success", sx: { mb: 2 }, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LinkIcon, {}), children: [
        "已关联 ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: joinedRows.length }),
        " 条（左：",
        DATASETS[joinLeft].label,
        "·",
        joinLeftKey,
        " = 右：",
        DATASETS[joinRight].label,
        "·",
        joinRightKey,
        "，",
        joinType === "inner" ? "内连接" : "左连接",
        "）。右表字段以 R· 前缀呈现，可直接选作维度/度量。"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 1.5, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Insights, { sx: { fontSize: 18, mr: 0.5, verticalAlign: "middle", color: PRIMARY } }),
            "分析结果（",
            aggData.length,
            " 组）"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                size: "small",
                label: "分析名称",
                value: analysisName,
                onChange: (e) => setAnalysisName(e.target.value),
                sx: { width: 180 }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}),
                disabled: !analysisName.trim() || !dimension || !measure,
                onClick: saveAnalysis,
                sx: { bgcolor: PRIMARY },
                children: "保存分析"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1.5 } }),
        !dimension || !measure ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "请选择维度与度量字段。" }) : aggData.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "当前数据集无有效数据，请检查维度与度量设置。" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { height: 340 }, children: [
          chartType === "bar" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            BarChart,
            {
              xAxis: [{ scaleType: "band", data: aggData.map((a) => a.label) }],
              series: [{ data: aggData.map((a) => a.value), color: PRIMARY }],
              height: 320
            }
          ),
          chartType === "line" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            LineChart,
            {
              dataset: aggData.map((a) => ({ dim: a.label, 数值: a.value })),
              xAxis: [{ dataKey: "dim", scaleType: "band", label: dimensionField == null ? void 0 : dimensionField.label }],
              series: [{ dataKey: "数值", color: PRIMARY, label: measureField == null ? void 0 : measureField.label }],
              height: 320
            }
          ),
          chartType === "pie" && /* @__PURE__ */ jsxRuntimeExports.jsx(
            PieChart,
            {
              series: [
                {
                  data: aggData.map((a, i) => ({
                    id: a.label,
                    value: a.value,
                    label: a.label,
                    color: PALETTE[i % PALETTE.length]
                  })),
                  innerRadius: 40,
                  outerRadius: 100
                }
              ],
              height: 320
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: "聚合结果明细" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: aggData,
            columns: resultColumns,
            enablePagination: true,
            pageSize: 6
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, mb: 1.5, children: [
          "已保存分析（",
          saved.length,
          "）"
        ] }),
        saved.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "暂无已保存分析，配置后点击「保存分析」。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1, children: saved.map((d) => {
          var _a;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { p: 1.5 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 600, children: d.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                (_a = DATASETS[d.dataset]) == null ? void 0 : _a.label,
                " · ",
                d.agg,
                " · ",
                d.chartType
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PlayArrow, {}), onClick: () => loadAnalysis(d), children: "载入" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", color: "error", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}), onClick: () => deleteAnalysis(d.id), children: "删除" })
            ] })
          ] }) }, d.id);
        }) })
      ] })
    ] })
  ] }) });
};
export {
  BISelfService as default
};
