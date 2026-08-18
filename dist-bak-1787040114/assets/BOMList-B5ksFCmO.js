import { aG as useNavigate, r as reactExports, j as jsxRuntimeExports, B as Box, h as Typography, bk as Button, bf as Add, aP as Paper, bt as TextField, aQ as Search, aL as Chip, k as Tooltip, aJ as IconButton, bR as Visibility, bg as Edit, dx as ContentCopy } from "./vendor-DGU5TO-x.js";
import { D as DataTable } from "./DataTable-ct0NJFvm.js";
import "./index-DeeqqmHA.js";
import { u as useBOMStore } from "./bomStore-CxaOFNQN.js";
import "./StatusBadge-DeJuhK-R.js";
const TYPE_COLORS = {
  EBOM: "#3B82F6",
  MBOM: "#10B981"
};
const STATUS_LABELS = {
  draft: "草稿",
  released: "已发布",
  obsolete: "已废弃"
};
const STATUS_COLORS = {
  draft: "#F59E0B",
  released: "#10B981",
  obsolete: "#94A3B8"
};
const groupBOMsByProduct = (bomList) => {
  const map = /* @__PURE__ */ new Map();
  for (const bom of bomList) {
    const key = bom.productId;
    const existing = map.get(key);
    if (!existing) {
      const sorted = bomList.filter((b) => b.productId === key).sort((a, b) => {
        if (a.isAlternate && !b.isAlternate) return 1;
        if (!a.isAlternate && b.isAlternate) return -1;
        return (a.priority ?? 0) - (b.priority ?? 0);
      });
      map.set(key, { main: sorted[0], alternates: sorted.slice(1) });
    }
  }
  return map;
};
const BOMList = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = reactExports.useState("");
  const [typeFilter, setTypeFilter] = reactExports.useState("");
  const bomList = useBOMStore((s) => s.bomList);
  const addBOM = useBOMStore((s) => s.addBOM);
  const grouped = reactExports.useMemo(() => groupBOMsByProduct(bomList), [bomList]);
  const filteredGroups = reactExports.useMemo(() => {
    const entries = Array.from(grouped.entries());
    if (!typeFilter && !keyword) return entries;
    return entries.filter(([, group]) => {
      const all = [group.main, ...group.alternates];
      return all.some((b) => {
        if (typeFilter && b.type !== typeFilter) return false;
        if (keyword && !b.productName.includes(keyword) && !b.bomNo.includes(keyword)) return false;
        return true;
      });
    });
  }, [grouped, typeFilter, keyword]);
  const flatRows = reactExports.useMemo(() => {
    const rows = [];
    filteredGroups.forEach(([, group]) => {
      rows.push(group.main, ...group.alternates);
    });
    return rows;
  }, [filteredGroups]);
  const mapImportRow = (r, _headers) => {
    const typeMap = { EBOM: "EBOM", MBOM: "MBOM" };
    const statusMap = { 草稿: "draft", 已发布: "released", 已废弃: "obsolete" };
    return {
      id: `bom-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bomNo: r["BOM编号"] || `BOM-IMP-${Date.now()}`,
      name: r["名称"] || r["BOM编号"] || "",
      type: typeMap[r["类型"]] || "EBOM",
      status: statusMap[r["状态"]] || "draft",
      productId: r["成品ID"] || "",
      productCode: r["成品编码"] || "",
      productName: r["成品名称"] || "",
      version: r["版本"] || "V1.0",
      effectiveDate: r["生效日期"] || "",
      currency: "CNY"
    };
  };
  const columns = [
    {
      id: "product",
      header: "产品",
      accessorFn: (row) => `${row.productName} ${row.productCode}`,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", fontWeight: 500, children: row.original.productName }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", sx: { fontFamily: "monospace" }, children: row.original.productCode })
      ] })
    },
    {
      id: "isAlternate",
      header: "替代",
      accessorFn: (row) => row.isAlternate ? "替代" : "",
      cell: ({ row }) => row.original.isAlternate ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: "替代",
          size: "small",
          "data-testid": "bom-alt-chip",
          sx: { bgcolor: "#FFF7ED", color: "#F59E0B", fontWeight: 600, fontSize: "0.6875rem" }
        }
      ) : null
    },
    {
      id: "bomNo",
      header: "BOM 编号",
      accessorFn: (row) => row.bomNo,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Box,
        {
          sx: {
            pl: row.original.isAlternate ? 3 : 0,
            borderLeft: row.original.isAlternate ? "3px solid #F59E0B" : "none"
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", sx: { fontWeight: 500, fontFamily: "monospace", color: "#3B82F6" }, children: row.original.bomNo })
        }
      )
    },
    {
      id: "type",
      header: "类型",
      accessorFn: (row) => row.type,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: row.original.type,
          size: "small",
          sx: { bgcolor: TYPE_COLORS[row.original.type] + "15", color: TYPE_COLORS[row.original.type], fontWeight: 600, fontSize: "0.75rem" }
        }
      )
    },
    {
      id: "version",
      header: "版本",
      accessorFn: (row) => row.version,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: row.original.version, size: "small", sx: { bgcolor: "#F8FAFC", color: "#475569" } })
    },
    {
      id: "status",
      header: "状态",
      accessorFn: (row) => row.status,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: STATUS_LABELS[row.original.status],
          size: "small",
          sx: { bgcolor: STATUS_COLORS[row.original.status] + "15", color: STATUS_COLORS[row.original.status], fontWeight: 500 }
        }
      )
    },
    {
      id: "effectiveDate",
      header: "生效日期",
      accessorFn: (row) => row.effectiveDate,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.effectiveDate })
    },
    {
      id: "totalCost",
      header: "总成本",
      accessorFn: (row) => row.totalCost ?? 0,
      cell: ({ row }) => {
        var _a;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: [
          "¥",
          ((_a = row.original.totalCost) == null ? void 0 : _a.toLocaleString("zh-CN", { minimumFractionDigits: 2 })) ?? "0.00"
        ] });
      }
    },
    {
      id: "approvedBy",
      header: "发布人",
      accessorFn: (row) => row.approvedBy || "-",
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", children: row.original.approvedBy || "-" })
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "flex-end", gap: 0.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "查看详情", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/bom/${row.original.id}`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { fontSize: "small" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "编辑", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: () => navigate(`/bom/${row.original.id}/edit`), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { fontSize: "small" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "复制BOM", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, { fontSize: "small" }) }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h4", sx: { fontWeight: 700, color: "#1E293B" }, children: "BOM 管理" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "contained", startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, {}), onClick: () => navigate("/bom/create"), children: "新建 BOM" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { display: "flex", gap: 2.5, mb: 3 }, children: [
      { label: "全部", count: bomList.length, color: "#6366F1", filter: "" },
      { label: "EBOM", count: bomList.filter((b) => b.type === "EBOM").length, color: "#3B82F6", filter: "EBOM" },
      { label: "MBOM", count: bomList.filter((b) => b.type === "MBOM").length, color: "#10B981", filter: "MBOM" },
      { label: "已发布", count: bomList.filter((b) => b.status === "released").length, color: "#10B981", filter: "" },
      { label: "草稿", count: bomList.filter((b) => b.status === "draft").length, color: "#F59E0B", filter: "" }
    ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Paper,
      {
        sx: { px: 2.5, py: 2, borderRadius: 3, cursor: "pointer", border: `1px solid ${item.color}20`, flex: 1 },
        onClick: () => item.filter && setTypeFilter(item.filter),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "h5", sx: { fontWeight: 700, color: item.color }, children: item.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", sx: { color: "#64748B" }, children: item.label })
        ]
      },
      item.label
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 2.5, borderRadius: 3, mb: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", gap: 2, alignItems: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          size: "small",
          placeholder: "产品名称/BOM编号",
          value: keyword,
          onChange: (e) => setKeyword(e.target.value),
          InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { color: "#94A3B8", mr: 0.5, fontSize: 18 } }) },
          sx: { width: 220 }
        }
      ),
      ["", "EBOM", "MBOM"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          variant: typeFilter === t ? "contained" : "outlined",
          size: "small",
          onClick: () => setTypeFilter(t),
          children: t || "全部"
        },
        t
      ))
    ] }) }),
    flatRows.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      DataTable,
      {
        data: flatRows,
        columns,
        enableRowSelection: false,
        enablePagination: true,
        enableSorting: true,
        enableColumnFilter: true,
        enableBlockSelect: true,
        enableExport: true,
        exportFormat: "xlsx",
        enableImport: true,
        onImport: (rows, headers) => rows.forEach((r) => addBOM(mapImportRow(r))),
        columnConfigKey: "bom-bom-list"
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(Paper, { sx: { p: 4, borderRadius: 3, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body1", sx: { color: "#94A3B8" }, children: "暂无匹配的 BOM 记录" }) })
  ] });
};
export {
  BOMList as default
};
