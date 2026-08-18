import { r as reactExports, j as jsxRuntimeExports, c1 as Tabs, c2 as Tab, bX as Grid, bK as Stack, bt as TextField, aM as FormControl, c0 as InputLabel, aN as Select, aO as MenuItem, bk as Button, bb as Save, bj as Alert, aP as Paper, h as Typography, i as Divider, B as Box, dh as Info, aL as Chip, aJ as IconButton, bc as Delete, bN as Warning, bV as CheckCircle, cO as TableContainer, cP as Table, cQ as TableHead, cR as TableRow, cS as TableCell, cT as TableBody } from "./vendor-46QZWBd3.js";
import { d as useQualityStore } from "./index-CcOZBoQL.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { L as LEVELS, A as AQLS, g as getCodeLetter, r as resolvePlan } from "./aql-BdS2-Hg_.js";
const STORAGE_KEY = "ssa-erp-aql-plans";
const RULE_LABELS = {
  normal: "正常检验",
  tightened: "加严检验",
  reduced: "放宽检验",
  skip: "跳批检验"
};
const RULE_DESCRIPTIONS = {
  normal: "默认检验方案，按 GB/T 2828.1 正常检验一次抽样执行。",
  tightened: "连续5批中有2批不合格时切换至加严检验，使用更严格的 AQL 或提升检验水平。",
  reduced: "连续10批正常检验合格时切换至放宽检验，可降低样本量。需连续5批放宽检验合格方可维持。",
  skip: "连续10批放宽检验合格时可切换至跳批检验，每N批抽检1批。一旦1批不合格立即返回正常检验。"
};
const AqlSampling = () => {
  const [lotSize, setLotSize] = reactExports.useState("500");
  const [inspectionLevel, setInspectionLevel] = reactExports.useState("II");
  const [aql, setAql] = reactExports.useState(2.5);
  const [savedPlans, setSavedPlans] = reactExports.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [feedback, setFeedback] = reactExports.useState("");
  const [sampleSize, setSampleSize] = reactExports.useState("");
  const [tabValue, setTabValue] = reactExports.useState(0);
  const { inspectionTasks } = useQualityStore();
  const batchStats = reactExports.useMemo(() => {
    const sorted = [...inspectionTasks].filter((t) => t.status === "passed" || t.status === "failed").sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    const last10 = sorted.slice(0, 10);
    const consecutivePassed = (() => {
      let count = 0;
      for (const t of sorted) {
        if (t.status === "passed") count++;
        else break;
      }
      return count;
    })();
    const consecutiveFailed = (() => {
      let count = 0;
      for (const t of sorted) {
        if (t.status === "failed") count++;
        else break;
      }
      return count;
    })();
    const recentFailCount = last10.filter((t) => t.status === "failed").length;
    const recentPassCount = last10.filter((t) => t.status === "passed").length;
    return {
      total: sorted.length,
      last10,
      consecutivePassed,
      consecutiveFailed,
      recentFailCount,
      recentPassCount
    };
  }, [inspectionTasks]);
  const dynamicMode = reactExports.useMemo(() => {
    const { consecutivePassed, consecutiveFailed, recentFailCount } = batchStats;
    if (recentFailCount >= 2 && batchStats.last10.length >= 5) return "tightened";
    if (consecutivePassed >= 20) return "skip";
    if (consecutivePassed >= 10 && consecutiveFailed === 0) return "reduced";
    return "normal";
  }, [batchStats]);
  const effectiveLevel = reactExports.useMemo(() => {
    switch (dynamicMode) {
      case "tightened":
        const levelIdx = LEVELS.indexOf(inspectionLevel);
        return levelIdx < LEVELS.length - 1 ? LEVELS[levelIdx + 1] : inspectionLevel;
      case "reduced":
        const ri = LEVELS.indexOf(inspectionLevel);
        return ri > 0 ? LEVELS[ri - 1] : inspectionLevel;
      default:
        return inspectionLevel;
    }
  }, [dynamicMode, inspectionLevel]);
  const effectiveAql = reactExports.useMemo(() => {
    switch (dynamicMode) {
      case "tightened": {
        const idx = AQLS.indexOf(aql);
        return idx > 0 ? AQLS[idx - 1] : aql;
      }
      case "reduced": {
        const idx = AQLS.indexOf(aql);
        return idx < AQLS.length - 1 ? AQLS[idx + 1] : aql;
      }
      default:
        return aql;
    }
  }, [dynamicMode, aql]);
  const lotNum = Number(lotSize);
  const result = reactExports.useMemo(() => {
    if (!lotSize || isNaN(lotNum) || lotNum < 2) return null;
    const code = getCodeLetter(lotNum, effectiveLevel);
    if (!code) return null;
    const plan = resolvePlan(code, effectiveAql);
    return { code, ...plan };
  }, [lotSize, lotNum, effectiveLevel, effectiveAql]);
  reactExports.useEffect(() => {
    if (result) setSampleSize(String(result.n));
  }, [result]);
  const handleSave = () => {
    if (!result) {
      setFeedback("请先输入有效的批量大小（≥2）。");
      return;
    }
    const plan = {
      lotSize: lotNum,
      inspectionLevel,
      aql,
      code: result.code,
      n: result.n,
      ac: result.ac,
      re: result.re,
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const next = [plan, ...savedPlans].slice(0, 50);
    setSavedPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setFeedback("方案已保存。");
  };
  const handleDelete = (idx) => {
    const next = savedPlans.filter((_, i) => i !== idx);
    setSavedPlans(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(PageWrapper, { title: "AQL 抽样检验方案", subtitle: "GB/T 2828.1 动态检验规则引擎", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tabValue, onChange: (_, v) => setTabValue(v), sx: { mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "抽样方案" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Tab, { label: "动态检验规则" })
    ] }),
    tabValue === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2.5, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "批量大小",
            type: "number",
            value: lotSize,
            onChange: (e) => setLotSize(e.target.value),
            InputProps: { inputProps: { min: 2 } },
            fullWidth: true
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "检验水平" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: inspectionLevel,
              label: "检验水平",
              onChange: (e) => setInspectionLevel(e.target.value),
              children: LEVELS.map((lv) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: lv, children: lv }, lv))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "AQL（接收质量限 %）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Select,
            {
              value: aql,
              label: "AQL（接收质量限 %）",
              onChange: (e) => setAql(Number(e.target.value)),
              children: AQLS.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: a, children: a }, a))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}), onClick: handleSave, sx: { bgcolor: "#3B82F6" }, children: "保存方案" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            label: "样本量 n（从抽样方案自动回填）",
            type: "number",
            value: sampleSize,
            onChange: (e) => setSampleSize(e.target.value),
            inputProps: { "data-testid": "aql-sample-size" },
            fullWidth: true
          }
        ),
        feedback && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", onClose: () => setFeedback(""), children: feedback })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 3, borderRadius: 3, bgcolor: "#F8FAFC" }, children: !result ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "请输入 ≥2 的批量大小以计算结果。" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { mb: 2, color: "#1E293B" }, children: "抽样方案结果" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, children: [
          { label: "样本量代码", value: result.code },
          { label: "样本量 n", value: result.n },
          { label: "接收数 Ac", value: result.ac },
          { label: "拒收数 Re", value: result.re }
        ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: item.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: "#3B82F6" }, children: item.value })
        ] }) }, item.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, alignItems: "flex-start" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { color: "primary", fontSize: "small" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
            "从批量中抽取 ",
            result.n,
            " 件进行检验，若不合格品数 ≤ ",
            result.ac,
            " 则接收该批，若 ≥ ",
            result.re,
            " 则拒收。 （本方案依据 GB/T 2828.1 正常检验一次抽样，AQL=",
            effectiveAql,
            "%，水平 ",
            effectiveLevel,
            "）"
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", sx: { mb: 1.5, fontWeight: 600 }, children: "已保存方案" }),
        savedPlans.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无保存的方案。" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", flexWrap: "wrap", gap: 1.5 }, children: savedPlans.map((p, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 1.5, borderRadius: 2, minWidth: 220 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${p.code} · n=${p.n}`, size: "small", sx: { bgcolor: "#3B82F6", color: "#fff", mb: 0.5 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", display: "block", color: "text.secondary", children: [
              "批量 ",
              p.lotSize,
              " / ",
              p.inspectionLevel,
              " / AQL ",
              p.aql,
              "% / Ac ",
              p.ac,
              " Re ",
              p.re
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", color: "error", onClick: () => handleDelete(idx), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { fontSize: "small" }) })
        ] }) }, idx)) })
      ] })
    ] }),
    tabValue === 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { "data-testid": "aql-dynamic-rules", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Alert,
        {
          severity: dynamicMode === "normal" ? "info" : dynamicMode === "tightened" ? "error" : dynamicMode === "reduced" ? "success" : "warning",
          sx: { mb: 3 },
          icon: dynamicMode === "normal" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Info, {}) : dynamicMode === "tightened" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", fontWeight: 600, children: [
              "当前检验模式：",
              RULE_LABELS[dynamicMode]
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              RULE_DESCRIPTIONS[dynamicMode],
              dynamicMode !== "normal" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                " 当前应用 AQL=",
                effectiveAql,
                "%，检验水平=",
                effectiveLevel,
                "。"
              ] })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
        { label: "检验批总数", value: batchStats.total, color: "#3B82F6" },
        { label: "连续合格批", value: batchStats.consecutivePassed, color: "#10B981" },
        { label: "连续不合格批", value: batchStats.consecutiveFailed, color: "#EF4444" },
        { label: "近10批不合格数", value: batchStats.recentFailCount, color: batchStats.recentFailCount >= 2 ? "#EF4444" : "#F59E0B" }
      ].map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, md: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, textAlign: "center", borderRadius: 2, bgcolor: "#F8FAFC" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: stat.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: stat.color }, children: stat.value })
      ] }) }, stat.label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 2, mb: 3 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "动态检验规则（GB/T 2828.1 转移规则）" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "规则" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "触发条件" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "转移方向" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "状态" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "正常 → 加严" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "连续5批中有2批不合格" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "提升检验水平 / 降低AQL" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: batchStats.recentFailCount >= 2 ? "已触发" : "未触发",
                  color: batchStats.recentFailCount >= 2 ? "error" : "default"
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "正常 → 放宽" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "连续10批正常检验合格" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "降低检验水平 / 提高AQL" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: batchStats.consecutivePassed >= 10 ? "已触发" : "未触发",
                  color: batchStats.consecutivePassed >= 10 ? "success" : "default"
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "放宽 → 正常" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "1批不合格即返回正常" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "恢复正常检验方案" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", label: "自动", color: "info" }) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "跳批检验" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "连续10批放宽检验合格" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "每N批抽检1批" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: batchStats.consecutivePassed >= 20 ? "已触发" : "未触发",
                  color: batchStats.consecutivePassed >= 20 ? "warning" : "default"
                }
              ) })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "近10批检验记录" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "编号" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "物料" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "批次" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "结果" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "日期" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(TableBody, { children: [
            batchStats.last10.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { hover: true, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontFamily: "monospace", children: t.taskNo }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: t.materialName }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: t.batchNo }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: t.status === "passed" ? "合格" : "不合格",
                  color: t.status === "passed" ? "success" : "error"
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: t.updatedAt || t.createdAt })
            ] }, t.id)),
            batchStats.last10.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, align: "center", sx: { py: 3, color: "#94A3B8" }, children: "暂无检验记录" }) })
          ] })
        ] }) })
      ] })
    ] })
  ] });
};
export {
  AqlSampling as default
};
