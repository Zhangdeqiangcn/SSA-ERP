import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { a as useVendorStore } from "./index-CU2cqxc8.js";
import { D as DataTable } from "./DataTable-uFcG_dYG.js";
import { A as ActionBar } from "./ActionBar-AjDxCZvD.js";
import "./vendor-date-DI3D_gXa.js";
import { P as PageWrapper } from "./PageWrapper-CjuAUfYF.js";
import { u as useVendorPerformanceStore } from "./vendorPerformanceStore-DSqs7hVk.js";
import { aO as Chip, bY as Grid, bs as Card, bt as CardContent, T as Typography, bL as Stack, cU as Slider, b9 as Dialog, ba as DialogTitle, bc as DialogContent, cC as Autocomplete, bv as TextField, bE as DialogActions, bm as Button } from "./vendor-mui-DsZGB15g.js";
import "./vendor-t9csHBDX.js";
import "./StatusBadge-D4Muac94.js";
import "./vendor-table-ClDZT4tF.js";
const rankingColor = {
  A: "success",
  B: "primary",
  C: "warning",
  D: "error"
};
const rankingLabel = {
  A: "优秀",
  B: "良好",
  C: "合格",
  D: "待改进"
};
const VendorPerformancePage = () => {
  const records = useVendorPerformanceStore((s) => s.records);
  const addRecord = useVendorPerformanceStore((s) => s.addRecord);
  const updateRecord = useVendorPerformanceStore((s) => s.updateRecord);
  const deleteRecord = useVendorPerformanceStore((s) => s.deleteRecord);
  const calculateScore = useVendorPerformanceStore((s) => s.calculateScore);
  const vendors = useVendorStore((s) => s.vendors);
  const [weights, setWeights] = reactExports.useState({ quality: 30, delivery: 30, price: 25, service: 15 });
  const [dialogOpen, setDialogOpen] = reactExports.useState(false);
  const [editingRecord, setEditingRecord] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({
    vendorId: "",
    vendorName: "",
    vendorCode: "",
    period: "2026-Q3",
    qualityScore: 80,
    deliveryScore: 80,
    priceScore: 80,
    serviceScore: 80,
    remarks: ""
  });
  const avgScores = reactExports.useMemo(() => {
    const n = records.length;
    if (!n) return { quality: 0, delivery: 0, price: 0, service: 0, total: 0 };
    const sum = records.reduce(
      (acc, r) => ({
        quality: acc.quality + r.qualityScore,
        delivery: acc.delivery + r.deliveryScore,
        price: acc.price + r.priceScore,
        service: acc.service + r.serviceScore,
        total: acc.total + r.totalScore
      }),
      { quality: 0, delivery: 0, price: 0, service: 0, total: 0 }
    );
    return {
      quality: Math.round(sum.quality / n * 10) / 10,
      delivery: Math.round(sum.delivery / n * 10) / 10,
      price: Math.round(sum.price / n * 10) / 10,
      service: Math.round(sum.service / n * 10) / 10,
      total: Math.round(sum.total / n * 10) / 10
    };
  }, [records]);
  const currentTotal = (form.qualityScore * (weights.quality / 100) + form.deliveryScore * (weights.delivery / 100) + form.priceScore * (weights.price / 100) + form.serviceScore * (weights.service / 100)).toFixed(1);
  const columns = reactExports.useMemo(
    () => [
      { accessorKey: "vendorName", header: "供应商名称" },
      { accessorKey: "period", header: "评估周期" },
      { accessorKey: "qualityScore", header: "质量分" },
      { accessorKey: "deliveryScore", header: "交期分" },
      { accessorKey: "priceScore", header: "价格分" },
      { accessorKey: "serviceScore", header: "服务分" },
      {
        accessorKey: "totalScore",
        header: "总分(加权)",
        cell: ({ row }) => row.original.totalScore.toFixed(1)
      },
      {
        accessorKey: "ranking",
        header: "排名",
        cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            size: "small",
            label: `${row.original.ranking}级 - ${rankingLabel[row.original.ranking ?? "D"]}`,
            color: rankingColor[row.original.ranking ?? "D"] ?? "default"
          }
        )
      }
    ],
    []
  );
  const handleOpenDialog = (record) => {
    if (record) {
      setEditingRecord(record);
      setForm({
        vendorId: record.vendorId,
        vendorName: record.vendorName,
        vendorCode: record.vendorCode ?? "",
        period: record.period,
        qualityScore: record.qualityScore,
        deliveryScore: record.deliveryScore,
        priceScore: record.priceScore,
        serviceScore: record.serviceScore,
        remarks: record.remarks ?? ""
      });
    } else {
      setEditingRecord(null);
      setForm({
        vendorId: "",
        vendorName: "",
        vendorCode: "",
        period: "2026-Q3",
        qualityScore: 80,
        deliveryScore: 80,
        priceScore: 80,
        serviceScore: 80,
        remarks: ""
      });
    }
    setDialogOpen(true);
  };
  const handleSave = () => {
    const qw = weights.quality / 100;
    const dw = weights.delivery / 100;
    const pw = weights.price / 100;
    const sw = weights.service / 100;
    const totalScore = Math.round(
      (form.qualityScore * qw + form.deliveryScore * dw + form.priceScore * pw + form.serviceScore * sw) * 100
    ) / 100;
    const computeRanking = (s) => {
      if (s >= 90) return "A";
      if (s >= 75) return "B";
      if (s >= 60) return "C";
      return "D";
    };
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
    if (editingRecord) {
      updateRecord(editingRecord.id, {
        vendorId: form.vendorId,
        vendorName: form.vendorName,
        vendorCode: form.vendorCode || void 0,
        period: form.period,
        qualityScore: form.qualityScore,
        deliveryScore: form.deliveryScore,
        priceScore: form.priceScore,
        serviceScore: form.serviceScore,
        totalScore,
        ranking: computeRanking(totalScore),
        remarks: form.remarks,
        evaluatedBy: "采购部主管",
        evaluatedAt: now
      });
    } else {
      addRecord({
        id: `perf-${Date.now()}`,
        vendorId: form.vendorId,
        vendorName: form.vendorName,
        vendorCode: form.vendorCode || void 0,
        period: form.period,
        qualityScore: form.qualityScore,
        deliveryScore: form.deliveryScore,
        priceScore: form.priceScore,
        serviceScore: form.serviceScore,
        totalScore,
        ranking: computeRanking(totalScore),
        remarks: form.remarks,
        evaluatedBy: "采购部主管",
        evaluatedAt: now,
        createdAt: now
      });
    }
    setDialogOpen(false);
  };
  const handleWeightChange = (key, value) => {
    const newWeights = { ...weights, [key]: value };
    setWeights(newWeights);
    calculateScore(newWeights.quality, newWeights.delivery, newWeights.price, newWeights.service);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    PageWrapper,
    {
      title: "供应商绩效考核",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ActionBar,
        {
          primary: { label: "新建评估", onClick: () => handleOpenDialog() }
        }
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [
          { label: "平均质量分", value: avgScores.quality, color: "#10B981" },
          { label: "平均交期分", value: avgScores.delivery, color: "#3B82F6" },
          { label: "平均价格分", value: avgScores.price, color: "#F59E0B" },
          { label: "平均服务分", value: avgScores.service, color: "#8B5CF6" },
          { label: "平均总分", value: avgScores.total, color: "#EF4444" }
        ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 4, md: 2.4, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { variant: "outlined", sx: { textAlign: "center", height: "100%" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { sx: { py: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: item.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", fontWeight: 600, sx: { color: item.color }, children: item.value.toFixed(1) })
        ] }) }) }, item.label)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { variant: "outlined", sx: { mb: 3, p: 2 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 2 }, children: "权重配置（调整后自动重算总分和排名）" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { container: true, spacing: 3, children: [
            { key: "quality", label: "质量权重 %", testid: "vp-weight-quality" },
            { key: "delivery", label: "交期权重 %" },
            { key: "price", label: "价格权重 %" },
            { key: "service", label: "服务权重 %" }
          ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { minWidth: 72 }, children: item.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Slider,
              {
                size: "small",
                value: weights[item.key],
                min: 0,
                max: 60,
                step: 5,
                onChange: (_, v) => handleWeightChange(item.key, v),
                valueLabelDisplay: "auto",
                "data-testid": item.testid
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { minWidth: 28 }, children: weights[item.key] })
          ] }) }, item.key)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          DataTable,
          {
            data: records,
            columns,
            enablePagination: true,
            enableSorting: true,
            onEdit: (row) => handleOpenDialog(row),
            onDelete: (row) => deleteRecord(row.id)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Dialog,
          {
            open: dialogOpen,
            onClose: () => setDialogOpen(false),
            maxWidth: "sm",
            fullWidth: true,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: editingRecord ? "编辑评估" : "新建评估" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Grid, { container: true, spacing: 2, sx: { pt: 1 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Autocomplete,
                  {
                    options: vendors,
                    getOptionLabel: (v) => `${v.name} (${v.code})`,
                    value: vendors.find((v) => v.id === form.vendorId) ?? null,
                    onChange: (_, v) => setForm({
                      ...form,
                      vendorId: (v == null ? void 0 : v.id) ?? "",
                      vendorName: (v == null ? void 0 : v.name) ?? "",
                      vendorCode: (v == null ? void 0 : v.code) ?? ""
                    }),
                    renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      TextField,
                      {
                        ...params,
                        label: "供应商",
                        inputProps: { ...params.inputProps, "data-testid": "vp-vendor" }
                      }
                    ),
                    isOptionEqualToValue: (o, v) => o.id === v.id
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    label: "评估周期",
                    value: form.period,
                    onChange: (e) => setForm({ ...form, period: e.target.value }),
                    fullWidth: true,
                    inputProps: { "data-testid": "vp-period" }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    label: "质量分",
                    type: "number",
                    value: form.qualityScore,
                    onChange: (e) => setForm({ ...form, qualityScore: Number(e.target.value) }),
                    fullWidth: true,
                    inputProps: { min: 0, max: 100, "data-testid": "vp-quality" }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    label: "交期分",
                    type: "number",
                    value: form.deliveryScore,
                    onChange: (e) => setForm({ ...form, deliveryScore: Number(e.target.value) }),
                    fullWidth: true,
                    inputProps: { min: 0, max: 100 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    label: "价格分",
                    type: "number",
                    value: form.priceScore,
                    onChange: (e) => setForm({ ...form, priceScore: Number(e.target.value) }),
                    fullWidth: true,
                    inputProps: { min: 0, max: 100 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 6, sm: 3, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    label: "服务分",
                    type: "number",
                    value: form.serviceScore,
                    onChange: (e) => setForm({ ...form, serviceScore: Number(e.target.value) }),
                    fullWidth: true,
                    inputProps: { min: 0, max: 100 }
                  }
                ) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "caption", color: "text.secondary", children: [
                  "加权总分：",
                  currentTotal,
                  "（",
                  weights.quality,
                  "% + ",
                  weights.delivery,
                  "% + ",
                  weights.price,
                  "% + ",
                  weights.service,
                  "%）"
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { item: true, xs: 12, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TextField,
                  {
                    label: "备注",
                    value: form.remarks,
                    onChange: (e) => setForm({ ...form, remarks: e.target.value }),
                    fullWidth: true,
                    multiline: true,
                    rows: 3
                  }
                ) })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: () => setDialogOpen(false), children: "取消" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Button,
                  {
                    onClick: handleSave,
                    variant: "contained",
                    disabled: !form.vendorId,
                    "data-testid": "vp-submit",
                    children: "保存"
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
};
export {
  VendorPerformancePage as default
};
