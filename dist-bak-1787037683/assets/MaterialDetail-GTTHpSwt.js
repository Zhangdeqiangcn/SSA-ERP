import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, aL as Chip, aP as Paper, bK as Stack, bj as Alert, cl as LinearProgress, c_ as Share } from "./vendor-46QZWBd3.js";
import { u as useMaterialStore, j as useSettingsStore, b as usePurchaseStore, d as useQualityStore } from "./index-CcOZBoQL.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { D as DetailSection, O as OperationTimeline } from "./OperationTimeline-Dp-GS67R.js";
import { F as FileUpload } from "./FileUpload-DOJ2SV8X.js";
import { S as StatusBadge } from "./StatusBadge-Db1uY4YU.js";
import { f as formatCurrency, a as formatDate } from "./format-Rp8---CI.js";
import { D as DetailActions } from "./DetailActions-r0u914Gx.js";
import { P as PageWrapper } from "./PageWrapper-bN37qL_-.js";
import { O as ObjectPage } from "./ObjectPage-D9-04yFh.js";
import { R as ResponsiblePersons } from "./ResponsiblePersons-D9INyHNC.js";
import "./customerStore-IdYDDJRc.js";
import "./priceStore-BUzakAdL.js";
import "./salesPriceStore-BzUxjPzH.js";
import { u as useBOMStore } from "./bomStore-VWzRK_BU.js";
import "./productionStore-D_DSIs05.js";
import "./productionOperationStore-ZzJ7_OWX.js";
import "./financeExtensionStore-DcH2weuS.js";
import "./productionVersionStore-D_-Ec9Z0.js";
import "./subcontractStore-CQ-ex-am.js";
import "./equipmentStore-D-RvzWch.js";
import "./productionSchedulingStore-BVkrPwFf.js";
import "./vendorPerformanceStore-BxbIBs-n.js";
import "./vendorPortalStore-d2uxDrSz.js";
import "./dataDictStore-B1uh9qqV.js";
import "./numberingStore-DnRDBnD9.js";
import "./warehouseMasterStore-Ct1rrWsm.js";
import "./reportPermissionStore-BivOpSPb.js";
import "./salesAdvancedStore-CA71PkD6.js";
import "./purchaseAdvancedStore-DLlH_i-t.js";
import "./warehouseAdvancedStore-BrWnd5bC.js";
import "./qualityAdvancedStore-dxrXzSTj.js";
import "./materialExtensionStore-B0eAxQzZ.js";
import "./purchaseInfoRecordStore-nI3akWE2.js";
import "./sourceListStore-BhAGJqGB.js";
import "./qualityExtensionStore-BtbaFcCN.js";
import "./analyticsStore-SaeDm71F.js";
import "./arapStore-BYvdVu0r.js";
import "./workbenchStore-DCSKoEhL.js";
import "./conditionStore-BSext3Wu.js";
import "./ecnStore-DIX7gpta.js";
import "./rebateStore-C8MR-wRT.js";
import "./fmeaStore--YKtrk44.js";
import "./PrintPreviewButton-BHY-fDRo.js";
import "./PrintPreview-_oqQL6if.js";
import "./CategoryList-DMRXpnYP.js";
import "./ConfirmDialog-BMZp8iYJ.js";
import "./options-BINuI5Gr.js";
import "./vendorRating-DKHWnbxs.js";
const WEIGHT_LABELS = {
  bomUsage: "更多BOM使用",
  purchaseFreq: "采购频次高",
  shortLead: "交货期短",
  lowMoq: "起订量低",
  goodQuality: "质量好"
};
function leadScore(lt) {
  if (lt <= 7) return 100;
  if (lt <= 15) return 85;
  if (lt <= 30) return 65;
  if (lt <= 60) return 40;
  return 20;
}
function moqScore(moq) {
  if (moq <= 10) return 100;
  if (moq <= 50) return 85;
  if (moq <= 200) return 65;
  if (moq <= 1e3) return 40;
  return 20;
}
function computeRating(material, input, config) {
  const shortLeadVal = material.leadTime === void 0 ? null : leadScore(material.leadTime);
  const lowMoqVal = material.moq === void 0 ? null : moqScore(material.moq);
  const indicators = [
    {
      key: "bomUsage",
      label: WEIGHT_LABELS.bomUsage,
      value: input.bomCount > 0 ? Math.min(input.bomCount * 25, 100) : 0,
      available: true
    },
    {
      key: "purchaseFreq",
      label: WEIGHT_LABELS.purchaseFreq,
      value: input.purchaseCount > 0 ? Math.min(input.purchaseCount * 10, 100) : 0,
      available: true
    },
    { key: "shortLead", label: WEIGHT_LABELS.shortLead, value: shortLeadVal, available: shortLeadVal !== null },
    { key: "lowMoq", label: WEIGHT_LABELS.lowMoq, value: lowMoqVal, available: lowMoqVal !== null },
    {
      key: "goodQuality",
      label: WEIGHT_LABELS.goodQuality,
      value: input.qualityPassRate,
      available: input.qualityPassRate !== null
    }
  ];
  const available = indicators.filter((i) => i.available);
  if (available.length === 0) {
    return { score: null, grade: "数据不足", indicators };
  }
  const weightSum = available.reduce((s, i) => s + config.weights[i.key], 0);
  const sum = available.reduce((s, i) => s + (i.value ?? 0) * config.weights[i.key], 0);
  const score = weightSum > 0 ? Math.round(sum / weightSum) : 0;
  let grade;
  if (score >= config.thresholds.A) grade = "A";
  else if (score >= config.thresholds.B) grade = "B";
  else if (score >= config.thresholds.C) grade = "C";
  else grade = "D";
  return { score, grade, indicators };
}
const GRADE_COLOR = {
  A: "success",
  B: "primary",
  C: "warning",
  D: "error",
  数据不足: "default"
};
const MaterialDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const { materials, deleteMaterial, categories } = useMaterialStore();
  const materialRatingConfig = useSettingsStore((s) => s.materialRatingConfig);
  const material = materials.find((m) => m.id === id);
  if (!material) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(PageWrapper, { title: "物料详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { children: "物料不存在" }) });
  }
  const bomState = useBOMStore.getState();
  const purchaseState = usePurchaseStore.getState();
  const qualityState = useQualityStore.getState();
  const bomCount = bomState.bomList.filter(
    (b) => (b.items ?? []).some((it) => it.materialId === material.id)
  ).length;
  const purchaseCount = [...purchaseState.purchaseRequests, ...purchaseState.purchaseOrders].reduce(
    (acc, doc) => acc + (doc.items ?? []).filter((it) => it.materialId === material.id).length,
    0
  );
  const matInspections = qualityState.inspectionTasks.filter((t) => t.materialId === material.id);
  const qualityPassRate = matInspections.length === 0 ? null : Math.round(
    matInspections.filter((t) => t.status === "passed").length / matInspections.length * 100
  );
  const rating = computeRating(
    material,
    { bomCount, purchaseCount, qualityPassRate },
    materialRatingConfig
  );
  const purchasingFields = [
    { label: "采购组", value: material.purchasingGroup ?? "—" },
    { label: "订单单位", value: material.orderUnit ?? "—" },
    { label: "采购值键", value: material.purchasingValueKey ?? "—" },
    { label: "收货处理天数", value: material.grProcessingDays ?? "—" },
    { label: "采购提前期(天)", value: material.leadTime ?? "—" },
    { label: "最小订单量(MOQ)", value: material.moq ?? "—" },
    { label: "最小包装量(MPQ)", value: material.mpq ?? "—" },
    { label: "采购单位", value: material.purchaseUnit ?? "—" },
    { label: "单位换算系数", value: material.unitConversion ?? "—" },
    { label: "默认供应商", value: material.defaultVendorName || material.defaultVendorId || "—" }
  ];
  const mrpFields = [
    { label: "MRP 类型", value: material.mrpType ?? "—" },
    { label: "MRP 控制者", value: material.mrpController ?? "—" },
    { label: "批量大小", value: material.lotSize ?? "—" },
    { label: "再订货点", value: material.reorderPoint ?? "—" },
    { label: "计划交货天数", value: material.plannedDeliveryDays ?? "—" }
  ];
  const salesFields = [
    { label: "税分类", value: material.taxClassification ?? "—" },
    { label: "交货单位", value: material.deliveryUnit ?? "—" },
    { label: "最小订单量", value: material.minOrderQty ?? "—" },
    { label: "最小交货量", value: material.minDeliveryQty ?? "—" },
    { label: "科目分配组", value: material.accountAssignmentGroup ?? "—" }
  ];
  const basicFields = [
    { label: "物料编码", value: material.code },
    { label: "物料名称", value: material.name },
    { label: "物料分类", value: material.categoryName },
    { label: "规格型号", value: material.specification },
    { label: "单位", value: material.unit },
    { label: "状态", value: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: material.status }) },
    { label: "安全库存", value: material.safetyStock },
    { label: "最小库存", value: material.minStock },
    { label: "最大库存", value: material.maxStock },
    { label: "当前库存", value: `${material.currentStock} ${material.unit}` },
    { label: "单价", value: formatCurrency(material.price) },
    { label: "创建时间", value: formatDate(material.createdAt) },
    { label: "创建人", value: material.createdBy }
  ];
  const operationLogs = [
    { id: "1", action: "create", operator: material.createdBy, time: material.createdAt, description: "创建物料" },
    { id: "2", action: "update", operator: "admin", time: material.updatedAt, description: "更新物料信息" }
  ];
  const handleShare = () => {
    const text = `物料 ${material.code} - ${material.name}
规格：${material.specification}
单价：${formatCurrency(material.price)}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  const unitConversionBlock = material.purchaseUnit && material.purchaseUnit !== material.unit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Box,
    {
      "data-testid": "unit-conversion",
      sx: {
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body1", fontWeight: 600, children: [
          "1 ",
          material.purchaseUnit,
          " = ",
          material.unitConversion ?? 1,
          " ",
          material.unit
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { size: "small", color: "info", variant: "outlined", label: "采购单位绑定" })
      ]
    }
  ) : null;
  const parametersBlock = material.parameters && material.parameters.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    DataTable,
    {
      data: material.parameters.map((param, index) => ({ ...param, id: param.key || String(index) })),
      enablePagination: false,
      enableRowSelection: false,
      sapStyle: true,
      columns: [
        { id: "key", header: "参数名称", accessorKey: "key" },
        { id: "value", header: "参数值", accessorKey: "value" },
        { id: "unit", header: "单位", accessorKey: "unit", cell: ({ row }) => row.original.unit || "-" }
      ]
    }
  ) : null;
  const ratingPaper = /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { variant: "outlined", sx: { p: 3 }, "data-testid": "material-rating", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "center", sx: { mb: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { flex: 1 }, children: "物料自动评级" }),
      materialRatingConfig.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: rating.grade,
          color: GRADE_COLOR[rating.grade],
          sx: { fontSize: "1.25rem", height: 40, minWidth: 48, fontWeight: 700 }
        }
      ) : null
    ] }),
    !materialRatingConfig.enabled ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", children: "自动评级已关闭" }) : rating.grade === "数据不足" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "warning", children: "数据不足，无法计算评级（请补充 BOM / 采购 / 质量数据）" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 2, alignItems: "baseline", sx: { mb: 2 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700 }, children: rating.score }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "/ 100 综合得分" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Stack, { spacing: 1.5, children: rating.indicators.map((ind) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", sx: { mb: 0.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: ind.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: ind.available ? `${ind.value}` : "数据不足" })
        ] }),
        ind.available ? /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: ind.value ?? 0, sx: { height: 8, borderRadius: 1 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(LinearProgress, { variant: "determinate", value: 0, sx: { height: 8, borderRadius: 1, opacity: 0.3 } })
      ] }, ind.key)) })
    ] })
  ] });
  const responsibleBlock = /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { variant: "outlined", sx: { p: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiblePersons, { categoryIds: [material.categoryId] }) });
  const sections = [
    { id: "rating", title: "物料评级", content: ratingPaper },
    { id: "basic", title: "基本信息", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: basicFields, columns: 2 }) },
    { id: "responsible", title: "物料责任人", content: responsibleBlock },
    { id: "purchasing", title: "采购视图", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: purchasingFields, columns: 2 }) },
    { id: "mrp", title: "MRP 视图", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: mrpFields, columns: 2 }) },
    { id: "sales", title: "销售视图", content: /* @__PURE__ */ jsxRuntimeExports.jsx(DetailSection, { fields: salesFields, columns: 2 }) },
    ...unitConversionBlock ? [{ id: "unit", title: "单位换算", content: unitConversionBlock }] : [],
    ...parametersBlock ? [{ id: "params", title: "技术参数", content: parametersBlock }] : [],
    { id: "attachments", title: "附件", content: /* @__PURE__ */ jsxRuntimeExports.jsx(FileUpload, { multiple: true }) },
    { id: "logs", title: "操作日志", content: /* @__PURE__ */ jsxRuntimeExports.jsx(OperationTimeline, { title: "操作日志", events: operationLogs }) }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ObjectPage,
    {
      title: material.code,
      subtitle: material.name,
      breadcrumbs: [{ label: "物料列表", path: "/material/list" }],
      status: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBadge, { status: material.status }),
      headerFields: [
        { label: "分类", value: material.categoryName },
        { label: "单位", value: material.unit },
        { label: "当前库存", value: `${material.currentStock} ${material.unit}` },
        { label: "单价", value: formatCurrency(material.price) },
        { label: "安全库存", value: material.safetyStock }
      ],
      actions: /* @__PURE__ */ jsxRuntimeExports.jsx(
        DetailActions,
        {
          entity: "material",
          record: material,
          onBack: () => navigate("/material/list"),
          onEdit: () => navigate(`/material/${id}/edit`),
          onDelete: () => setDeleteDialog(true),
          extra: [
            { key: "share", label: "分享", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {}), onClick: handleShare }
          ]
        }
      ),
      sections
    }
  );
};
export {
  MaterialDetail as default
};
