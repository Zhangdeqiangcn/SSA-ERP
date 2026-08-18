import { n as useParams, h as useNavigate, r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { e as useSalesStore } from "./index-hTLNcGoC.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BAhqBvAF.js";
import { f as formatCurrency } from "./format-BXPn3erM.js";
import { D as DetailActions } from "./DetailActions-D6AfBivn.js";
import { P as PageWrapper } from "./PageWrapper-B4V2YTKA.js";
import { bl as Alert, aS as Paper, bY as Grid, bL as Stack, aO as Chip, bO as Warning, T as Typography, ch as LinearProgress, m as Box, c8 as TrendingUp, bW as CheckCircle, eq as Timer, bh as Add, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bv as TextField, aR as MenuItem, bE as DialogActions, cJ as Snackbar, cK as Share } from "./vendor-mui-UhJuRAfR.js";
import "./vendor-C0Ken1ns.js";
import "./vendor-date-DpsB6iVy.js";
import "./PrintPreviewButton-DI-UifA3.js";
import "./PrintPreview-Dx9G1wxr.js";
const SEVERITY_COLORS = {
  low: "#F59E0B",
  medium: "#F97316",
  high: "#EF4444",
  critical: "#DC2626"
};
const SEVERITY_LABELS = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重"
};
const ProjectDetail = () => {
  const { projects } = useSalesStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const project = projects.find((p) => p.id === id);
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [exceptionOpen, setExceptionOpen] = reactExports.useState(false);
  const [followupOpen, setFollowupOpen] = reactExports.useState(false);
  const [newException, setNewException] = reactExports.useState({
    type: "schedule",
    severity: "medium",
    title: "",
    description: ""
  });
  if (!project) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "项目详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", children: "项目不存在" }) });
  }
  project.milestones.filter((m) => m.status === "completed").length;
  project.milestones.findIndex((m) => m.status === "in_progress");
  const handleShare = () => {
    const text = `项目 ${project.projectNo} - ${project.projectName}
进度：${project.progress}%`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: `项目详情 — ${project.projectNo}`,
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DetailActions,
        {
          entity: "salesProject",
          record: project,
          onBack: () => navigate("/sales/projects"),
          onEdit: () => navigate(`/sales/projects/${id}/edit`),
          onDelete: () => setDeleteDialog(true),
          extra: [
            { key: "share", label: "分享", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {}), onClick: handleShare }
          ]
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 3, mb: 3, borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, alignItems: "center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { item: true, xs: 12, md: 8, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, mb: 1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  label: project.status === "in_progress" ? "执行中" : project.status,
                  size: "small",
                  color: project.status === "in_progress" ? "primary" : project.status === "completed" ? "success" : "default"
                }
              ),
              project.exceptions.filter((e) => e.status !== "closed").length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}), label: "有异常", size: "small", color: "error", variant: "outlined" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 700, color: "#1E293B", mb: 0.5, children: project.projectName }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", children: [
              "客户：",
              project.customerName,
              " | 项目经理：",
              project.manager,
              " | 团队：",
              project.team.join("、")
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 4, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, bgcolor: "#F8FAFC" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", mb: 1, children: "项目进度" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", alignItems: "center", spacing: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                LinearProgress,
                {
                  variant: "determinate",
                  value: project.progress,
                  sx: {
                    flex: 1,
                    height: 10,
                    borderRadius: 5,
                    bgcolor: "#E2E8F0",
                    "& .MuiLinearProgress-bar": { bgcolor: project.progress >= 80 ? "#10B981" : "#3B82F6" }
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "h6", fontWeight: 700, color: project.progress >= 80 ? "#10B981" : "#3B82F6", children: [
                project.progress,
                "%"
              ] })
            ] })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2, mb: 3 }, children: [
          { label: "合同金额", value: formatCurrency(project.contractAmount), color: "#3B82F6", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}) },
          { label: "已回款", value: formatCurrency(project.receivedAmount), color: "#10B981", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, {}) },
          { label: "实际成本", value: formatCurrency(project.actualCost), color: "#F59E0B", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Timer, {}) },
          { label: "项目预算", value: formatCurrency(project.budget), color: "#8B5CF6", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(TrendingUp, {}) }
        ].map((kpi) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2.5, borderRadius: 3, flex: 1, border: `1px solid ${kpi.color}20` }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 0.5, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: kpi.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { color: kpi.color, opacity: 0.6 }, children: kpi.icon })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", fontWeight: 700, color: kpi.color, children: kpi.value })
        ] }, kpi.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 3, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle1", fontWeight: 600, children: "项目里程碑" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}), children: "编辑里程碑" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { ml: 2 }, children: project.milestones.map((m, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", mb: idx < project.milestones.length - 1 ? 0 : 0 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column", alignItems: "center", mr: 2 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: {
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: m.status === "completed" ? "#10B981" : m.status === "in_progress" ? "#3B82F6" : m.status === "delayed" ? "#EF4444" : "#E2E8F0",
                  border: "2px solid white",
                  boxShadow: m.status === "in_progress" ? "0 0 0 2px #3B82F6" : "none"
                } }),
                idx < project.milestones.length - 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { width: 2, flex: 1, bgcolor: m.status === "completed" ? "#10B981" : "#E2E8F0", minHeight: 30 } })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { pb: 2, flex: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: m.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: m.actualDate ? `${m.actualDate}（已完成）` : `计划 ${m.plannedDate}` }),
                m.status === "delayed" && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "延期", size: "small", color: "error", sx: { ml: 1, height: 20, fontSize: "0.6rem" } })
              ] })
            ] }, m.id)) })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, md: 6, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 3, borderRadius: 3 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 2, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle1", fontWeight: 600, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { fontSize: 18, mr: 0.5, verticalAlign: "middle", color: "#EF4444" } }),
                "异常反馈"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "small", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), color: "error", onClick: () => setExceptionOpen(true), children: "反馈异常" })
            ] }),
            project.exceptions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "success", sx: { mt: 1 }, children: "暂无异常，项目运行良好" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 2, children: project.exceptions.map((ex) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { p: 2, bgcolor: "#FFF5F5", borderLeft: `4px solid ${SEVERITY_COLORS[ex.severity]}` }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: SEVERITY_LABELS[ex.severity],
                      size: "small",
                      sx: { bgcolor: SEVERITY_COLORS[ex.severity] + "20", color: SEVERITY_COLORS[ex.severity], fontWeight: 600 }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: ex.type === "schedule" ? "进度" : ex.type === "cost" ? "成本" : ex.type === "quality" ? "质量" : ex.type === "resource" ? "资源" : ex.type === "customer" ? "客户" : "其他", size: "small", variant: "outlined" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Chip,
                    {
                      label: ex.status === "open" ? "待处理" : ex.status === "investigating" ? "调查中" : ex.status === "resolved" ? "已解决" : "关闭",
                      size: "small",
                      color: ex.status === "closed" || ex.status === "resolved" ? "success" : ex.status === "investigating" ? "warning" : "error"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: ex.reportedAt })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: ex.title }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: ex.description }),
              ex.impactDescription && /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "error", display: "block", mt: 0.5, children: [
                "影响：",
                ex.impactDescription
              ] })
            ] }, ex.id)) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: exceptionOpen, onClose: () => setExceptionOpen(false), maxWidth: "sm", fullWidth: true, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Warning, { sx: { mr: 1, verticalAlign: "middle", color: "#EF4444" } }),
            "新增异常反馈"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { spacing: 2, mt: 1, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "异常类型",
                value: newException.type,
                onChange: (e) => setNewException((prev) => ({ ...prev, type: e.target.value })),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "schedule", children: "进度异常" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "cost", children: "成本异常" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "quality", children: "质量异常" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "resource", children: "资源异常" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "customer", children: "客户相关" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "other", children: "其他" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              TextField,
              {
                select: true,
                fullWidth: true,
                label: "严重程度",
                value: newException.severity,
                onChange: (e) => setNewException((prev) => ({ ...prev, severity: e.target.value })),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "low", children: "低" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "medium", children: "中" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "high", children: "高" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(MenuItem, { value: "critical", children: "严重" })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "异常标题",
                value: newException.title,
                onChange: (e) => setNewException((prev) => ({ ...prev, title: e.target.value })),
                required: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TextField,
              {
                fullWidth: true,
                label: "异常描述",
                value: newException.description,
                onChange: (e) => setNewException((prev) => ({ ...prev, description: e.target.value })),
                multiline: true,
                rows: 4,
                required: true
              }
            )
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setExceptionOpen(false), children: "取消" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", color: "error", onClick: () => {
              alert("异常已提交！（演示模式）");
              setExceptionOpen(false);
            }, children: "提交异常" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            open: deleteDialog,
            title: "确认删除",
            content: `确定删除项目"${project.projectNo} - ${project.projectName}"吗？此操作不可撤销。`,
            onConfirm: () => {
              setDeleteDialog(false);
            },
            onCancel: () => setDeleteDialog(false),
            confirmText: "确认删除",
            confirmColor: "error"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Snackbar,
          {
            open: snackbar,
            autoHideDuration: 3e3,
            onClose: () => setSnackbar(false),
            message: "分享内容已复制到剪贴板"
          }
        )
      ]
    }
  );
};
export {
  ProjectDetail as default
};
