import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { d as useQualityStore } from "./index-hTLNcGoC.js";
import "./vendor-date-DpsB6iVy.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { bY as Grid, aS as Paper, T as Typography, aP as FormControl, c1 as InputLabel, aQ as Select, aR as MenuItem, m as Box, bm as Button, bl as Alert, n as Divider, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, bf as Print, cY as PictureAsPdf } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
const COAGenerator = () => {
  const { inspectionTasks } = useQualityStore();
  const [selectedTaskId, setSelectedTaskId] = reactExports.useState("");
  const [coa, setCoa] = reactExports.useState(null);
  const [feedback, setFeedback] = reactExports.useState("");
  const completedTasks = reactExports.useMemo(
    () => inspectionTasks.filter((t) => t.status === "passed" || t.status === "failed"),
    [inspectionTasks]
  );
  const selectedTask = reactExports.useMemo(
    () => inspectionTasks.find((t) => t.id === selectedTaskId),
    [inspectionTasks, selectedTaskId]
  );
  const handleGenerate = () => {
    if (!selectedTask) {
      setFeedback("请先选择一个已完成的检验任务。");
      return;
    }
    setFeedback("");
    const items = (selectedTask.defectItems || []).length > 0 ? selectedTask.defectItems.map((d) => ({
      inspectionItem: d.defectName,
      standard: d.severity === "critical" ? "零缺陷" : d.severity === "major" ? "≤0" : "≤标准",
      result: `${d.quantity} 件`,
      unit: "件",
      conclusion: d.quantity === 0 ? "pass" : "fail"
    })) : [
      {
        inspectionItem: "外观检查",
        standard: "无划痕/无锈蚀",
        result: "合格",
        unit: "-",
        conclusion: "pass"
      },
      {
        inspectionItem: "尺寸测量",
        standard: `符合 ${selectedTask.inspectionStandardName}`,
        result: "合格",
        unit: "-",
        conclusion: "pass"
      }
    ];
    const newCoa = {
      id: `COA-${Date.now()}`,
      taskId: selectedTask.id,
      taskNo: selectedTask.taskNo,
      productName: selectedTask.materialName,
      batchNo: selectedTask.batchNo,
      standardName: selectedTask.inspectionStandardName || "-",
      items,
      overallConclusion: selectedTask.status === "passed" ? "检验合格，准予放行" : "检验不合格，详见不合格项",
      generatedDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      inspector: selectedTask.assignedTo || "检验员"
    };
    setCoa(newCoa);
  };
  const handlePrint = () => {
    window.print();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "COA 产品合格证生成器", subtitle: "根据检验任务自动生成 Certificate of Analysis", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 5, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, gutterBottom: true, children: "选择检验任务" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(FormControl, { fullWidth: true, sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(InputLabel, { children: "检验任务" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Select,
          {
            value: selectedTaskId,
            label: "检验任务",
            onChange: (e) => setSelectedTaskId(e.target.value),
            "data-testid": "coa-inspection",
            children: completedTasks.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MenuItem, { value: t.id, children: [
              t.taskNo,
              " - ",
              t.materialName,
              " (",
              t.status === "passed" ? "合格" : "不合格",
              ")"
            ] }, t.id))
          }
        )
      ] }),
      selectedTask && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "物料：",
          selectedTask.materialName,
          " (",
          selectedTask.materialCode,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "批次：",
          selectedTask.batchNo,
          " | 检验标准：",
          selectedTask.inspectionStandardName
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
          "合格数：",
          selectedTask.passedQuantity || 0,
          " | 不合格数：",
          selectedTask.failedQuantity || 0
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: "contained",
          onClick: handleGenerate,
          "data-testid": "coa-generate",
          disabled: !selectedTaskId,
          fullWidth: true,
          sx: { bgcolor: "#3B82F6" },
          children: "生成 COA"
        }
      ),
      feedback && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", sx: { mt: 2 }, onClose: () => setFeedback(""), children: feedback })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 7, children: coa ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 4, borderRadius: 2, bgcolor: "#fff" }, id: "coa-preview", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "center", mb: 3, pb: 2, borderBottom: "2px solid #1E293B" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: "#1E293B", letterSpacing: 2 }, children: "CERTIFICATE OF ANALYSIS" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", color: "text.secondary", children: "产品合格证 / 分析证书" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
        { label: "产品名称", value: coa.productName },
        { label: "批号", value: coa.batchNo },
        { label: "检验编号", value: coa.taskNo },
        { label: "检验标准", value: coa.standardName },
        { label: "检验员", value: coa.inspector },
        { label: "签发日期", value: coa.generatedDate }
      ].map((info) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 6, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: info.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: info.value })
      ] }, info.label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 2 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: "#F8FAFC" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "检验项目" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "标准要求" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "检验结果" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { fontWeight: 600 }, children: "判定" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: coa.items.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.inspectionItem }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.standard }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.result }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Chip,
            {
              size: "small",
              label: item.conclusion === "pass" ? "合格" : "不合格",
              color: item.conclusion === "pass" ? "success" : "error"
            }
          ) })
        ] }, idx)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { my: 3 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { p: 2, bgcolor: coa.overallConclusion.includes("合格") ? "#ECFDF5" : "#FEF2F2", borderRadius: 2, mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, sx: { color: coa.overallConclusion.includes("合格") ? "#059669" : "#DC2626" }, children: [
        "检验结论：",
        coa.overallConclusion
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 4, sx: { mt: 4 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "检验员" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "审核人" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Divider, { sx: { mb: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "批准人" })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mt: 3, display: "flex", gap: 1, justifyContent: "center", "@media print": { display: "none" } }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Print, {}), onClick: handlePrint, sx: { bgcolor: "#3B82F6" }, children: "打印 COA" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(PictureAsPdf, {}), onClick: handlePrint, children: "导出 PDF" })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, borderRadius: 2, textAlign: "center", bgcolor: "#F8FAFC", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { color: "text.secondary", children: '请选择检验任务并点击"生成 COA"以预览合格证' }) }) })
  ] }) });
};
export {
  COAGenerator as default
};
