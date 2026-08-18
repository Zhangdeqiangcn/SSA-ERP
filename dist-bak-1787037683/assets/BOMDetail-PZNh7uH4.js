import { cJ as useParams, aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, aL as Chip, aP as Paper, a7 as AccountTree, h as Typography, es as Calculate, bj as Alert, bK as Stack, bk as Button, bY as ArrowBack, bg as Edit, bc as Delete, c_ as Share, cU as Snackbar } from "./vendor-46QZWBd3.js";
import { D as DataTable } from "./DataTable-vc5G5ARo.js";
import { u as useMaterialStore } from "./index-CcOZBoQL.js";
import { C as ConfirmDialog } from "./ConfirmDialog-BMZp8iYJ.js";
import { F as FlowTracker } from "./FlowTracker-C0aNMuXm.js";
import { P as PrintPreviewButton } from "./PrintPreviewButton-BHY-fDRo.js";
import { O as ObjectPage } from "./ObjectPage-D9-04yFh.js";
import { u as useBOMStore } from "./bomStore-VWzRK_BU.js";
import { u as useProductionStore } from "./productionStore-D_DSIs05.js";
import "./StatusBadge-Db1uY4YU.js";
import "./PrintPreview-_oqQL6if.js";
import "./format-Rp8---CI.js";
const MAX_ROLLUP_DEPTH = 10;
const EMPTY_RESULT = {
  bomId: "",
  bomNo: "",
  productName: "",
  lines: [],
  materialCost: 0,
  laborCost: 0,
  totalCost: 0
};
function resolveItems(bom) {
  if (bom.items && bom.items.length) return bom.items;
  return useBOMStore.getState().bomTreeData;
}
function rollupItem(item, depth) {
  const labor = (item.laborCost ?? 0) + (item.processCost ?? 0);
  let materialCost = 0;
  let breakdown;
  if (item.childProductCode) {
    const childBOM = useBOMStore.getState().getBOMByProductCode(item.childProductCode);
    if (childBOM) {
      const child = computeBOMCost(childBOM.id, depth + 1);
      materialCost = child.totalCost * item.quantity;
      breakdown = child.lines;
    }
  } else {
    const materials = useMaterialStore.getState().materials;
    const mat = materials.find((m) => m.id === item.materialId) || materials.find((m) => m.code === item.materialCode);
    const price = mat ? mat.price : item.unitCost ?? 0;
    materialCost = price * item.quantity;
  }
  const extended = materialCost + labor;
  return {
    itemId: item.id,
    code: item.materialCode,
    name: item.materialName,
    qty: item.quantity,
    unit: item.unit,
    unitCost: item.quantity ? materialCost / item.quantity : 0,
    materialCost,
    laborCost: labor,
    extendedCost: extended,
    isChildAssembly: Boolean(item.childProductCode),
    level: item.level ?? depth,
    breakdown
  };
}
function computeBOMCost(bomId, depth = 0) {
  if (depth > MAX_ROLLUP_DEPTH) return EMPTY_RESULT;
  const bom = useBOMStore.getState().getBOMById(bomId);
  if (!bom) return EMPTY_RESULT;
  const items = resolveItems(bom);
  const lines = [];
  let materialCost = 0;
  let laborCost = 0;
  for (const item of items) {
    const line = rollupItem(item, depth);
    lines.push(line);
    materialCost += line.materialCost;
    laborCost += line.laborCost;
  }
  return {
    bomId: bom.id,
    bomNo: bom.bomNo,
    productName: bom.productName,
    lines,
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost
  };
}
const flattenCostLines = (lines, depth = 0) => {
  const result = [];
  for (const l of lines) {
    result.push({ ...l, depth, id: l.itemId });
    if (l.breakdown && l.breakdown.length > 0) {
      result.push(...flattenCostLines(l.breakdown, depth + 1));
    }
  }
  return result;
};
const flattenBOMItems = (items, baseDepth = 0) => {
  const out = [];
  for (const it of items) {
    const lv = typeof it.level === "number" ? it.level : baseDepth;
    out.push({ ...it, depth: lv });
    if (it.children && it.children.length > 0) {
      out.push(...flattenBOMItems(it.children, lv + 1));
    }
  }
  return out;
};
const BOMDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = reactExports.useState(false);
  const [snackbar, setSnackbar] = reactExports.useState(false);
  const [costResult, setCostResult] = reactExports.useState(null);
  const { bomList, deleteBOM, bomTreeData, setSelectedBOM } = useBOMStore();
  const { setMrpRecommendations } = useProductionStore();
  const { materials } = useMaterialStore();
  const bom = bomList.find((b) => b.id === id) || bomList[0];
  const displayItems = flattenBOMItems(
    bom.items && bom.items.length ? bom.items : bomTreeData
  );
  const SOURCE_META = {
    manufacture: { label: "自制件", color: "#10B981", bg: "#ECFDF5" },
    purchase: { label: "外购件", color: "#3B82F6", bg: "#EFF6FF" },
    phantom: { label: "虚项", color: "#94A3B8", bg: "#F8FAFC" }
  };
  const totalMaterialCost = displayItems.reduce((sum, item) => sum + item.totalCost, 0);
  const handleComputeCost = () => {
    setSelectedBOM(bom.id);
    setCostResult(computeBOMCost(bom.id));
  };
  const handleMrpCalculation = () => {
    const recommendations = displayItems.filter((item) => item.source !== "phantom").map((item) => ({
      id: `mrp-${Date.now()}-${item.id}`,
      materialCode: item.materialCode,
      materialName: item.materialName,
      currentStock: 0,
      safetyStock: 0,
      requiredQuantity: item.quantity,
      onOrderQuantity: 0,
      suggestedQuantity: item.quantity,
      unit: item.unit,
      suggestedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      reason: `BOM ${bom.bomNo} MRP运算`,
      type: item.source === "purchase" ? "purchase" : "manufacture",
      priority: item.isCritical ? "urgent" : "normal"
    }));
    setMrpRecommendations(recommendations);
    navigate("/production/mrp");
  };
  const handleShare = () => {
    const text = `BOM ${bom.bomNo}
产品：${bom.productName}
版本：${bom.version}
类型：${bom.type}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };
  const statusChips = /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 1, flexWrap: "wrap" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: bom.type, size: "small", sx: { bgcolor: bom.type === "EBOM" ? "#EFF6FF" : "#ECFDF5", color: bom.type === "EBOM" ? "#3B82F6" : "#10B981", fontWeight: 600 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: bom.status === "released" ? "已发布" : "草稿", size: "small", sx: { bgcolor: bom.status === "released" ? "#ECFDF5" : "#FFF7ED", color: bom.status === "released" ? "#10B981" : "#F59E0B", fontWeight: 500 } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: bom.version, size: "small", sx: { bgcolor: "#F8FAFC", color: "#475569" } })
  ] });
  const itemsBlock = /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2.5, borderBottom: "1px solid rgba(226,232,240,0.8)", display: "flex", alignItems: "center", gap: 1.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { sx: { color: "#3B82F6" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "物料清单" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: `${displayItems.length} 种物料`, size: "small", sx: { bgcolor: "#EFF6FF", color: "#3B82F6" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: `关键件 ${displayItems.filter((i) => i.isCritical).length}`,
          size: "small",
          sx: { bgcolor: "#FEF2F2", color: "#EF4444", fontWeight: 600 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { ml: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#64748B" }, children: [
        "物料总成本：",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { style: { color: "#1E293B" }, children: [
          "¥",
          totalMaterialCost.toFixed(2)
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: displayItems,
        enablePagination: false,
        enableRowSelection: false,
        sapStyle: true,
        onView: (row) => navigate(`/material/${row.materialId || row.id}`),
        onEdit: (row) => navigate(`/material/${row.materialId || row.id}/edit`),
        columns: [
          {
            id: "level",
            header: "层级",
            accessorFn: (row) => row.level ?? row.depth ?? 0,
            cell: ({ row }) => {
              const item = row.original;
              const lv = item.level ?? item.depth ?? 0;
              const hasChildren = item.children && item.children.length > 0 || !!item.childProductCode;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, pl: lv * 1.5 }, children: [
                hasChildren && /* @__PURE__ */ jsxRuntimeExports.jsx(AccountTree, { sx: { fontSize: 15, color: "#8B5CF6" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Chip,
                  {
                    label: lv === 0 ? "顶层" : `第${lv}层`,
                    size: "small",
                    sx: {
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      bgcolor: lv === 0 ? "#EDE9FE" : "#F1F5F9",
                      color: lv === 0 ? "#7C3AED" : "#475569"
                    }
                  }
                )
              ] });
            }
          },
          {
            id: "materialCode",
            header: "物料编码",
            cell: ({ row }) => {
              const isCritical = row.original.isCritical;
              return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [
                isCritical && /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: "关键", size: "small", sx: {
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: "#FEF2F2",
                  color: "#EF4444"
                } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: {
                  fontFamily: "monospace",
                  color: isCritical ? "#EF4444" : "#475569",
                  fontWeight: isCritical ? 700 : 500
                }, children: row.original.materialCode })
              ] });
            }
          },
          {
            id: "materialName",
            header: "物料名称",
            accessorKey: "materialName",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: row.original.isCritical ? 600 : 400 }, children: row.original.materialName })
          },
          {
            id: "materialSpec",
            header: "规格",
            accessorKey: "materialSpec",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: row.original.materialSpec || "-" })
          },
          {
            id: "source",
            header: "来源",
            accessorFn: (row) => row.source,
            cell: ({ row }) => {
              const s = row.original.source;
              const meta = SOURCE_META[s] || SOURCE_META.purchase;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                Chip,
                {
                  size: "small",
                  label: meta.label,
                  sx: { height: 20, fontSize: "0.7rem", fontWeight: 600, bgcolor: meta.bg, color: meta.color }
                }
              );
            }
          },
          {
            id: "quantity",
            header: "用量",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: row.original.quantity })
          },
          {
            id: "unit",
            header: "单位",
            accessorKey: "unit",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.unit })
          },
          {
            id: "scrapRate",
            header: "废品率",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: row.original.scrapRate > 5 ? "#F59E0B" : "#64748B" }, children: [
              row.original.scrapRate,
              "%"
            ] })
          },
          {
            id: "unitCost",
            header: "单价 (¥)",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              "¥",
              row.original.unitCost.toFixed(2)
            ] })
          },
          {
            id: "totalCost",
            header: "小计 (¥)",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#1E293B" }, children: [
              "¥",
              row.original.totalCost.toFixed(2)
            ] })
          },
          {
            id: "stock",
            header: "当前库存",
            cell: ({ row }) => {
              const m = materials.find((x) => x.code === row.original.materialCode || x.id === row.original.materialId);
              return m ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 500, color: (m.currentStock ?? 0) < row.original.quantity ? "#EF4444" : "#10B981" }, children: [
                (m.currentStock ?? 0).toLocaleString(),
                " ",
                m.unit
              ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#94A3B8" }, children: "-" });
            }
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, bgcolor: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#1E293B" }, children: "合计" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 700, color: "#3B82F6" }, children: [
        "¥",
        totalMaterialCost.toFixed(2)
      ] })
    ] })
  ] });
  const costBlock = costResult ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Paper, { sx: { borderRadius: 3 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2.5, borderBottom: "1px solid rgba(226,232,240,0.8)", display: "flex", alignItems: "center", gap: 1.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, { sx: { color: "#10B981" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h6", sx: { fontWeight: 600 }, children: "成本卷积结果" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: costResult.bomNo,
          size: "small",
          sx: { bgcolor: "#ECFDF5", color: "#10B981" }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { ml: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { color: "#64748B" }, children: [
        "物料成本 ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { style: { color: "#1E293B" }, children: [
          "¥",
          costResult.materialCost.toFixed(2)
        ] }),
        " · ",
        "人工/工序 ",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { style: { color: "#1E293B" }, children: [
          "¥",
          costResult.laborCost.toFixed(2)
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: flattenCostLines(costResult.lines),
        enablePagination: false,
        enableRowSelection: false,
        sapStyle: true,
        columns: [
          {
            id: "code",
            header: "编码",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: {
              pl: 2 + row.original.depth * 3,
              fontFamily: "monospace",
              color: row.original.isChildAssembly ? "#8B5CF6" : row.original.depth === 0 ? "#3B82F6" : "#475569",
              fontWeight: row.original.depth === 0 ? 600 : 400
            }, children: row.original.isChildAssembly ? `⮑ ${row.original.code} (子装配)` : row.original.code })
          },
          {
            id: "name",
            header: "名称",
            accessorKey: "name",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: row.original.depth === 0 ? 500 : 400 }, children: row.original.name })
          },
          {
            id: "qtyUnit",
            header: "用量",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              row.original.qty,
              row.original.unit
            ] })
          },
          {
            id: "unitCost",
            header: "单价 (¥)",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              "¥",
              row.original.unitCost.toFixed(2)
            ] })
          },
          {
            id: "materialCost",
            header: "物料成本 (¥)",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              "¥",
              row.original.materialCost.toFixed(2)
            ] })
          },
          {
            id: "laborCost",
            header: "人工/工序 (¥)",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.laborCost ? `¥${row.original.laborCost.toFixed(2)}` : "-" })
          },
          {
            id: "extendedCost",
            header: "小计 (¥)",
            cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: [
              "¥",
              row.original.extendedCost.toFixed(2)
            ] })
          }
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, bgcolor: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: 2 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 600, color: "#1E293B" }, children: "合计" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 700, color: "#10B981" }, "data-testid": "bom-total-cost", children: [
        "¥",
        costResult.totalCost.toFixed(2)
      ] })
    ] }),
    costResult.totalCost === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "info", sx: { m: 2 }, children: "该 BOM 没有可卷积的物料或子装配项。" })
  ] }) : null;
  const sections = [
    { id: "items", title: "物料清单", content: itemsBlock },
    ...costBlock ? [{ id: "cost", title: "成本卷积结果", content: costBlock }] : []
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ObjectPage,
      {
        title: bom.bomNo,
        subtitle: bom.productName,
        breadcrumbs: [{ label: "BOM 列表", path: "/bom/list" }],
        status: statusChips,
        headerFields: [
          { label: "产品编码", value: bom.productCode },
          { label: "生效日期", value: bom.effectiveDate },
          { label: "物料成本", value: `¥${totalMaterialCost.toFixed(2)}` },
          { label: "发布人", value: bom.approvedBy || "-" }
        ],
        actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(FlowTracker, { module: "bom", currentStatus: bom.status === "released" ? "bom_release" : "bom_design" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowBack, {}), size: "small", onClick: () => navigate(-1), children: "返回" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, {}), size: "small", onClick: () => navigate(`/bom/${id}/edit`), children: "编辑" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", color: "error", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, {}), size: "small", onClick: () => setDeleteDialog(true), children: "删除" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outlined", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share, {}), size: "small", onClick: handleShare, children: "分享" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", size: "small", onClick: handleMrpCalculation, children: "触发MRP运算" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "contained",
              color: "success",
              size: "small",
              "data-testid": "bom-cost",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Calculate, {}),
              onClick: handleComputeCost,
              children: "计算成本"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            PrintPreviewButton,
            {
              entity: "bom",
              record: {
                ...bom,
                items: (bom.items || []).map((i) => ({
                  materialCode: i.materialCode,
                  materialName: i.materialName,
                  specification: i.materialSpec,
                  unit: i.unit,
                  quantity: i.quantity,
                  unitPrice: i.unitCost,
                  amount: i.totalCost
                }))
              },
              showBoth: true
            }
          )
        ] }),
        sections
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        open: deleteDialog,
        title: "确认删除",
        content: `确定删除BOM"${bom.bomNo}"吗？此操作不可撤销。`,
        onConfirm: () => {
          deleteBOM(bom.id);
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
  ] });
};
export {
  BOMDetail as default
};
