import { n as useParams, h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { d as useQualityStore, u as useMaterialStore } from "./index-hTLNcGoC.js";
import { F as FlowTracker } from "./FlowTracker-BvV1jEfP.js";
import "./vendor-date-DpsB6iVy.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-CZkl9-1x.js";
import "./customerStore-BnoPAbgi.js";
import "./priceStore-D4MzJqWs.js";
import "./salesPriceStore-BQbM-EvA.js";
import "./bomStore-CeDOOVVk.js";
import "./productionStore-B8YnWPVr.js";
import "./productionOperationStore-CgIZnQhb.js";
import "./financeExtensionStore-mnFIWL7o.js";
import "./productionVersionStore-DVtUQpzp.js";
import "./subcontractStore-1iUXGTXR.js";
import "./equipmentStore-CosVhg2a.js";
import "./productionSchedulingStore-Bp1AedW2.js";
import "./vendorPerformanceStore-C5Wb2oBo.js";
import "./vendorPortalStore-9Kht_MGK.js";
import "./dataDictStore-RUHQ7-st.js";
import "./numberingStore-BLNwdXfi.js";
import "./warehouseMasterStore-Lmmy-9XL.js";
import "./reportPermissionStore-BsrP4O9H.js";
import "./salesAdvancedStore-I173FqHq.js";
import "./purchaseAdvancedStore-j0gpV4PI.js";
import "./warehouseAdvancedStore-DGJOwep4.js";
import "./qualityAdvancedStore-DzVT3ddD.js";
import "./materialExtensionStore-L3lHbzSm.js";
import "./purchaseInfoRecordStore-BlIKCtxc.js";
import "./sourceListStore-Z5_JkzNu.js";
import "./qualityExtensionStore-CpmmvoMW.js";
import "./analyticsStore-Ci4UuBPH.js";
import "./arapStore-BN8EGkkl.js";
import "./workbenchStore-vCZX2zeS.js";
import "./conditionStore-DfnsSgER.js";
import "./ecnStore-JtBcJJ-e.js";
import "./rebateStore-CMmNfEnQ.js";
import "./fmeaStore-DSfTzw2E.js";
import { m as Box, bm as Button, bZ as ArrowBack, T as Typography, aS as Paper, bB as Stepper, bC as Step, bD as StepLabel, bY as Grid, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, cI as TableBody, aO as Chip, bv as TextField, bW as CheckCircle, cT as Cancel, bO as Warning, bd as Save, cJ as Snackbar } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./CategoryList-BiXjmJ7_.js";
import "./DataTable-BBJNxQ8l.js";
import "./StatusBadge-D9w6gqgZ.js";
import "./vendor-table-l-0Px9iQ.js";
import "./ConfirmDialog-BAhqBvAF.js";
import "./PageWrapper-B4V2YTKA.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const InspectionTask = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { inspectionTasks, updateInspectionTask, inspectionStandards, addUnqualifiedItem } = useQualityStore();
  const task = inspectionTasks.find((t) => t.id === id) || inspectionTasks[2];
  const standard = inspectionStandards.find((s) => s.id === task.inspectionStandardId);
  const materials = useMaterialStore((s) => s.materials);
  const taskCategoryId = reactExports.useMemo(() => {
    if (!task.materialId) return "";
    const m = materials.find((mm) => mm.id === task.materialId);
    return (m == null ? void 0 : m.categoryId) ?? "";
  }, [task.materialId, materials]);
  const [results, setResults] = reactExports.useState(
    Object.fromEntries((standard == null ? void 0 : standard.inspectionItems.map((i) => [i.id, ""])) || [])
  );
  const [conclusion, setConclusion] = reactExports.useState("");
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [snackbarMsg, setSnackbarMsg] = reactExports.useState("");
  const steps = ["接收任务", "准备样品", "执行检验", "填写结论", "提交审批"];
  const activeStep = task.status === "pending" ? 0 : task.status === "in_progress" ? 2 : 4;
  const statusToFlowMap = {
    pending: "it_received",
    in_progress: "it_testing",
    passed: "it_completed",
    failed: "it_result",
    conditional_pass: "it_approved"
  };
  const flowStatus = statusToFlowMap[task.status] || task.status;
  const handleDraft = () => {
    if (!id) return;
    updateInspectionTask(id, { status: "in_progress", conclusion });
    setSnackbarMsg("检验结果已暂存");
    setSnackbar(true);
  };
  const handleSubmit = () => {
    if (!conclusion || !id) return;
    const formResults = { conclusion };
    updateInspectionTask(id, {
      status: conclusion,
      completedDate: (/* @__PURE__ */ new Date()).toISOString(),
      ...formResults
    });
    if (conclusion === "failed") {
      addUnqualifiedItem({
        id: `uq-${Date.now()}`,
        itemNo: `UQ-${Date.now()}`,
        inspectionTaskId: task.id,
        inspectionTaskNo: task.taskNo,
        materialCode: task.materialCode,
        materialName: task.materialName,
        batchNo: task.batchNo,
        defectQuantity: task.sampleQuantity || 1,
        defectDescription: `检验任务 ${task.taskNo} 判定不合格`,
        disposition: "return_vendor",
        dispositionStatus: "pending",
        responsiblePerson: task.assignedTo || "质量工程师",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10),
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: "admin",
        updatedBy: "admin"
      });
      setSnackbarMsg("检验不合格，已自动生成不合格品记录(NCR)");
      setSnackbar(true);
    }
    navigate("/quality/inspection");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), onClick: () => navigate(-1), sx: { color: "#64748B" }, children: "返回" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "inspection-task", currentStatus: flowStatus, documentNo: task.taskNo }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: [
        "检验执行 — ",
        task.taskNo
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, borderRadius: 3, mb: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Stepper, { activeStep, alternativeLabel: true, children: steps.map((label) => /* @__PURE__ */ jsxRuntimeExports.jsx(Step, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(StepLabel, { children: label }) }, label)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 4, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: "任务基本信息" }),
          [
            { label: "任务编号", value: task.taskNo },
            { label: "检验类型", value: task.type === "incoming" ? "来料检验" : task.type === "process" ? "过程检验" : "成品检验" },
            { label: "物料编码", value: task.materialCode },
            { label: "物料名称", value: task.materialName },
            { label: "批次号", value: task.batchNo },
            { label: "来料数量", value: `${task.quantity} 件` },
            { label: "抽样数量", value: `${task.sampleQuantity} 件` },
            { label: "检验标准", value: task.inspectionStandardName },
            ...task.projectNo ? [{ label: "项目编号", value: task.projectNo }, { label: "项目名称", value: task.projectName || "-" }] : [],
            { label: "负责人", value: task.assignedTo },
            { label: "计划日期", value: task.plannedDate }
          ].map(({ label, value }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid #F1F5F9" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B" }, children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: value })
          ] }, label)),
          task.aqlCode && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Box,
            {
              "data-testid": "aql-plan-detail",
              sx: { mt: 1.5, p: 2, borderRadius: 2, bgcolor: "#EFF6FF", border: "1px solid #BFDBFE" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#1E40AF", mb: 0.5 }, children: "AQL 抽样方案（GB/T 2828.1）" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#1E3A8A" }, children: [
                  "检验水平 ",
                  task.inspectionLevel,
                  " · AQL ",
                  task.aql,
                  "% · 字码 ",
                  task.aqlCode,
                  " · 样本量 n=",
                  task.sampleQuantity,
                  " · 接收数 Ac=",
                  task.aqlAc,
                  " · 拒收数 Re=",
                  task.aqlRe
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, borderRadius: 3, mt: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ResponsiblePersons,
          {
            categoryIds: taskCategoryId ? [taskCategoryId] : [],
            roles: ["qa_engineer", "process_engineer"],
            title: "物料责任人（质量）"
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 8, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3, mb: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: "检验项目记录" }),
          standard ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { size: "small", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验项目" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "检验方法" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "规格要求" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "是否关键" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "实测值/结果" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: "判定" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: standard.inspectionItems.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: item.name }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { color: "#64748B" }, children: item.method }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: item.spec }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: item.isCritical ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "关键", size: "small", sx: { bgcolor: "#FEF2F2", color: "#EF4444", fontSize: "0.6875rem" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "一般", size: "small", sx: { bgcolor: "#F8FAFC", color: "#94A3B8", fontSize: "0.6875rem" } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 140 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  size: "small",
                  placeholder: "填入实测值",
                  value: results[item.id] || "",
                  onChange: (e) => setResults((prev) => ({ ...prev, [item.id]: e.target.value })),
                  sx: { width: "100%" }
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 80 }, children: results[item.id] ? /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "填写", size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6", fontSize: "0.6875rem" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#CBD5E1" }, children: "待填" }) })
            ] }, item.id)) })
          ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无检验标准" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600, mb: 2 }, children: "检验结论" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2 }, children: [
              { value: "passed", label: "合格", color: "#10B981", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}) },
              { value: "failed", label: "不合格", color: "#EF4444", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Cancel, {}) },
              { value: "conditional_pass", label: "条件接收", color: "#F59E0B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}) }
            ].map(({ value, label, color, icon }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: conclusion === value ? "contained" : "outlined",
                startIcon: icon,
                onClick: () => setConclusion(value),
                sx: {
                  borderColor: color,
                  color: conclusion === value ? "#fff" : color,
                  bgcolor: conclusion === value ? color : "transparent",
                  "&:hover": { bgcolor: color + "15", borderColor: color }
                },
                children: label
              },
              value
            )) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                label: "检验备注",
                multiline: true,
                rows: 3,
                fullWidth: true,
                placeholder: "填写检验说明、异常描述等..."
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "flex-end", gap: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: () => navigate(-1), children: "取消" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", onClick: handleDraft, children: "暂存" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  variant: "contained",
                  startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Save, {}),
                  disabled: !conclusion,
                  onClick: handleSubmit,
                  children: "提交检验结果"
                }
              )
            ] }) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Snackbar,
      {
        open: snackbar,
        autoHideDuration: 2500,
        onClose: () => setSnackbar(false),
        message: snackbarMsg
      }
    )
  ] });
};
export {
  InspectionTask as default
};
