const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-xlsx-UZmsHzjH.js","assets/vendor-react-Cc0tBtdY.js","assets/vendor-C0Ken1ns.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from "./index-hTLNcGoC.js";
import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-Cc0tBtdY.js";
import { s as statusConfig } from "./StatusBadge-D9w6gqgZ.js";
import { u as useReactTable, f as flexRender, g as getFilteredRowModel, a as getPaginationRowModel, b as getSortedRowModel, c as getCoreRowModel } from "./vendor-table-l-0Px9iQ.js";
import { u as useTheme, m as Box, p as Tooltip, bm as Button, dd as Upload, aM as IconButton, de as ViewColumn, b5 as Menu, aR as MenuItem, cX as Checkbox, d0 as Download, y as Collapse, aO as Chip, i as alpha, br as DeleteOutline, df as ContentCopy, cD as TableContainer, aS as Paper, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, dg as TableSortLabel, c_ as FilterList, cI as TableBody, T as Typography, dh as TablePagination, a_ as Popover, bv as TextField, b9 as Dialog, ba as DialogTitle, bc as DialogContent, bl as Alert, bE as DialogActions, di as MoreVert, bS as Visibility, bi as Edit, be as Delete } from "./vendor-mui-UhJuRAfR.js";
const fuzzyIncludes = (row, columnId, filterValue) => {
  var _a;
  const v = row.getValue(columnId);
  const fv = String(filterValue ?? "").trim().toLowerCase();
  if (!fv) return true;
  if (String(v ?? "").toLowerCase().includes(fv)) return true;
  const label = (_a = statusConfig[String(v)]) == null ? void 0 : _a.label;
  if (label && label.toLowerCase().includes(fv)) return true;
  return false;
};
function ActionCell({
  row,
  onView,
  onEdit,
  onDelete
}) {
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      IconButton,
      {
        size: "small",
        onClick: handleOpen,
        sx: { color: "#64748B" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(MoreVert, { fontSize: "small" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Menu,
      {
        anchorEl,
        open,
        onClose: handleClose,
        anchorOrigin: { vertical: "bottom", horizontal: "right" },
        transformOrigin: { vertical: "top", horizontal: "right" },
        PaperProps: {
          sx: {
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            borderRadius: 2,
            border: "1px solid rgba(226,232,240,.8)",
            minWidth: 120
          }
        },
        children: [
          onView && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            MenuItem,
            {
              onClick: (e) => {
                e.stopPropagation();
                onView(row);
                handleClose();
              },
              sx: { fontSize: "0.875rem", py: 1 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Visibility, { sx: { mr: 1, fontSize: 16, color: "#64748B" } }),
                "查看"
              ]
            }
          ),
          onEdit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            MenuItem,
            {
              onClick: (e) => {
                e.stopPropagation();
                onEdit(row);
                handleClose();
              },
              sx: { fontSize: "0.875rem", py: 1 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Edit, { sx: { mr: 1, fontSize: 16, color: "#64748B" } }),
                "编辑"
              ]
            }
          ),
          onDelete && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            MenuItem,
            {
              onClick: (e) => {
                e.stopPropagation();
                onDelete(row);
                handleClose();
              },
              sx: { fontSize: "0.875rem", py: 1, color: "#EF4444" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { sx: { mr: 1, fontSize: 16, color: "#EF4444" } }),
                "删除"
              ]
            }
          )
        ]
      }
    )
  ] });
}
function DataTable({
  data,
  columns,
  enableRowSelection = false,
  enablePagination = true,
  enableSorting = true,
  enableColumnFilter = true,
  enableBlockSelect = true,
  enableExport = false,
  exportFormat = "xlsx",
  enableImport = false,
  onImport,
  columnConfigKey,
  hiddenColumns,
  pageSize = 10,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  onBatchDelete,
  onBatchExport,
  batchActions,
  sapStyle = true,
  importLabel = "导入"
}) {
  var _a, _b;
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const [sorting, setSorting] = reactExports.useState([]);
  const [columnFilters, setColumnFilters] = reactExports.useState([]);
  const [rowSelection, setRowSelection] = reactExports.useState({});
  const [colsAnchor, setColsAnchor] = reactExports.useState(null);
  const [columnVisibility, setColumnVisibility] = reactExports.useState(() => {
    const base = {};
    if (columnConfigKey) {
      try {
        const raw = localStorage.getItem(`ssa-dt-colcfg-${columnConfigKey}`);
        if (raw) {
          const hidden = JSON.parse(raw);
          hidden.forEach((id) => {
            base[id] = false;
          });
        }
      } catch {
      }
    }
    (hiddenColumns || []).forEach((id) => {
      if (!(id in base)) base[id] = false;
    });
    return base;
  });
  const persistVisibility = (vis) => {
    if (!columnConfigKey) return;
    const hidden = Object.entries(vis).filter(([, v]) => v === false).map(([k]) => k);
    try {
      localStorage.setItem(`ssa-dt-colcfg-${columnConfigKey}`, JSON.stringify(hidden));
    } catch {
    }
  };
  const handleColumnVisibilityChange = (updater) => {
    const next = typeof updater === "function" ? updater(columnVisibility) : updater;
    setColumnVisibility(next);
    persistVisibility(next);
  };
  reactExports.useEffect(() => {
    if (!columnConfigKey) return;
    const handler = (e) => {
      const detail = e.detail;
      if ((detail == null ? void 0 : detail.key) !== columnConfigKey) return;
      try {
        const raw = localStorage.getItem(`ssa-dt-colcfg-${columnConfigKey}`);
        if (!raw) return;
        const hidden = JSON.parse(raw);
        const vis = {};
        hidden.forEach((id) => {
          vis[id] = false;
        });
        setColumnVisibility(vis);
      } catch {
      }
    };
    window.addEventListener("ssa-dt-colcfg-changed", handler);
    return () => window.removeEventListener("ssa-dt-colcfg-changed", handler);
  }, [columnConfigKey]);
  const actionColumn = {
    id: "actions",
    header: "操作",
    enableSorting: false,
    cell: ({ row }) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      ActionCell,
      {
        row: row.original,
        onView,
        onEdit,
        onDelete
      }
    )
  };
  const normalizedColumns = reactExports.useMemo(
    () => columns.map((col) => {
      if (!col.accessorKey && !col.accessorFn && typeof col.id === "string" && col.id !== "actions" && col.id !== "select") {
        return { ...col, accessorKey: col.id };
      }
      return col;
    }),
    [columns]
  );
  const hasCustomActions = normalizedColumns.some((c) => c.id === "actions");
  const table = useReactTable({
    data,
    columns: hasCustomActions ? normalizedColumns : [...normalizedColumns, actionColumn],
    state: { sorting, columnFilters, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : void 0,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : void 0,
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { filterFn: fuzzyIncludes },
    initialState: { pagination: { pageSize } }
  });
  const [blockMode, setBlockMode] = reactExports.useState(false);
  const [selection, setSelection] = reactExports.useState(null);
  const mouseDownRef = reactExports.useRef(false);
  const copySelection = (sel) => {
    var _a2;
    const rows = table.getRowModel().rows;
    const rMin = Math.min(sel.r0, sel.r1);
    const rMax = Math.max(sel.r0, sel.r1);
    const cMin = Math.min(sel.c0, sel.c1);
    const cMax = Math.max(sel.c0, sel.c1);
    const lines = [];
    for (let r = rMin; r <= rMax; r++) {
      const row = rows[r];
      if (!row) continue;
      const cells = row.getVisibleCells();
      const parts = [];
      for (let c = cMin; c <= cMax; c++) {
        const cell = cells[c];
        if (!cell) {
          parts.push("");
          continue;
        }
        const v = cell.getValue(cell.column.id);
        parts.push(v == null ? "" : String(v));
      }
      lines.push(parts.join("	"));
    }
    const tsv = lines.join("\n");
    if (tsv && ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText)) {
      navigator.clipboard.writeText(tsv).catch(() => {
      });
    }
  };
  reactExports.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        setBlockMode((v) => !v);
        setSelection(null);
        return;
      }
      if (e.key === "Escape") {
        if (blockMode || selection) {
          setBlockMode(false);
          setSelection(null);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C") && blockMode) {
        if (selection) {
          e.preventDefault();
          copySelection(selection);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blockMode, selection, table]);
  reactExports.useEffect(() => {
    const up = () => {
      mouseDownRef.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  const [filterAnchor, setFilterAnchor] = reactExports.useState(null);
  const isColFiltered = (id) => columnFilters.some((f) => f.id === id);
  const getColFilterVal = (id) => {
    const f = columnFilters.find((x) => x.id === id);
    return f ? String(f.value ?? "") : "";
  };
  const setColFilter = (id, value) => {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value && value.trim() ? [...rest, { id, value }] : rest;
    });
  };
  const [importOpen, setImportOpen] = reactExports.useState(false);
  const [importText, setImportText] = reactExports.useState("");
  const [importedRows, setImportedRows] = reactExports.useState(null);
  const [importedFile, setImportedFile] = reactExports.useState("");
  const [importError, setImportError] = reactExports.useState("");
  const parsePastedText = (text) => {
    const normalized = text.replace(/\r/g, "");
    const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length < 1) return { rows: [], headers: [] };
    const delimiter = normalized.includes("	") ? "	" : lines[0].includes(",") ? "," : "	";
    const headers = lines[0].split(delimiter).map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? "";
      });
      rows.push(obj);
    }
    return { rows, headers };
  };
  const closeImport = () => {
    setImportOpen(false);
    setImportText("");
    setImportedRows(null);
    setImportedFile("");
    setImportError("");
  };
  const handleImportConfirm = () => {
    if (!onImport) return;
    let rows = [];
    let headers = [];
    if (importedRows) {
      rows = importedRows;
      headers = Object.keys(importedRows[0] ?? {});
    } else {
      const parsed = parsePastedText(importText);
      rows = parsed.rows;
      headers = parsed.headers;
    }
    if (rows.length === 0) {
      setImportError("未解析到数据行，请确认内容或文件格式");
      return;
    }
    onImport(rows, headers);
    closeImport();
  };
  const handleImportFile = async (file) => {
    const lower = file.name.toLowerCase();
    setImportError("");
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      try {
        const XLSX = await __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.x), true ? __vite__mapDeps([0,1,2]) : void 0);
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const rows = json.map(
          (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? "")]))
        );
        if (rows.length === 0) {
          setImportError("Excel 文件无数据行，请检查工作表内容");
          return;
        }
        setImportedRows(rows);
        setImportedFile(file.name);
        setImportText("");
      } catch {
        setImportError("Excel 解析失败，请确认文件未损坏且为 .xlsx/.xls 格式");
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setImportText(String(reader.result || ""));
        setImportedRows(null);
        setImportedFile("");
      };
      reader.readAsText(file, "utf-8");
    }
  };
  const handleDownloadTemplate = async () => {
    const [XLSX, { saveAs }] = await Promise.all([
      __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.x), true ? __vite__mapDeps([0,1,2]) : void 0),
      __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.F), true ? __vite__mapDeps([0,1,2]) : void 0)
    ]);
    const headers = columns.map((c) => String(c.header ?? c.id));
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "模板");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const stamp = (/* @__PURE__ */ new Date()).toLocaleDateString("zh-CN").replace(/\//g, "-");
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `导入模板_${stamp}.xlsx`);
  };
  const buildExportRows = () => {
    return table.getFilteredRowModel().rows.map((row) => {
      const rowData = {};
      columns.forEach((col) => {
        const key = col.id || String(col.header);
        rowData[String(col.header || key)] = row.getValue(key);
      });
      return rowData;
    });
  };
  const handleExport = async () => {
    const exportData = buildExportRows();
    const stamp = (/* @__PURE__ */ new Date()).toLocaleDateString("zh-CN").replace(/\//g, "-");
    if (exportFormat === "csv") {
      const headers = Object.keys(exportData[0] || {});
      const lines = [headers.join(",")];
      exportData.forEach((r) => {
        lines.push(headers.map((h) => {
          const v = String(r[h] ?? "").replace(/"/g, '""');
          return `"${v}"`;
        }).join(","));
      });
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const [XLSX, { saveAs }] = await Promise.all([
      __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.x), true ? __vite__mapDeps([0,1,2]) : void 0),
      __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.F), true ? __vite__mapDeps([0,1,2]) : void 0)
    ]);
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(file, `export_${stamp}.xlsx`);
  };
  const handleBatchExport = async () => {
    if (onBatchExport) {
      onBatchExport(selectedRows);
      return;
    }
    const exportData = selectedRows.map((row) => {
      const rowData = {};
      columns.forEach((col) => {
        const key = col.id || String(col.header);
        rowData[String(col.header || key)] = row[key];
      });
      return rowData;
    });
    if (exportFormat === "csv") {
      const headers = Object.keys(exportData[0] || {});
      const lines = [headers.join(",")];
      exportData.forEach((r) => {
        lines.push(headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","));
      });
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selected_export.csv";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const [XLSX, { saveAs }] = await Promise.all([
      __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.x), true ? __vite__mapDeps([0,1,2]) : void 0),
      __vitePreload(() => import("./vendor-xlsx-UZmsHzjH.js").then((n) => n.F), true ? __vite__mapDeps([0,1,2]) : void 0)
    ]);
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selected");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(file, "selected_export.xlsx");
  };
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
  const selectedCount = selectedRows.length;
  const headerSx = sapStyle ? {
    fontWeight: 700,
    fontSize: 12,
    color: "#1a3a5c",
    backgroundColor: "#e8eef5",
    borderBottom: "2px solid #1a3a5c",
    borderRight: "1px solid #d6dbe1",
    whiteSpace: "nowrap",
    px: 0.75,
    py: 0.75
  } : {
    fontWeight: 600,
    fontSize: "0.8125rem",
    color: "text.secondary",
    borderBottom: "1px solid",
    borderColor: "divider",
    whiteSpace: "nowrap",
    py: 1.2
  };
  const bodyCellSx = sapStyle ? {
    borderRight: "1px solid #d6dbe1",
    borderBottom: "1px solid #d6dbe1",
    px: 0.75,
    py: 0.5,
    fontSize: "0.8125rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  } : { borderBottom: "1px solid", borderColor: "divider", py: 1, fontSize: "0.875rem" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { children: [
    (enableExport || enableImport || columnConfigKey) && selectedCount === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1.5, display: "flex", justifyContent: "flex-end", gap: 1 }, children: [
      enableImport && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "从 Excel/CSV 粘贴或上传导入", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "small",
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { fontSize: "small" }),
          onClick: () => setImportOpen(true),
          sx: { fontSize: "0.8125rem", color: "text.secondary", borderColor: "divider", "&:hover": { borderColor: "text.secondary" } },
          children: importLabel
        }
      ) }),
      columnConfigKey && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "列设置（显隐可记忆）", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconButton, { size: "small", onClick: (e) => setColsAnchor(e.currentTarget), sx: { color: "text.secondary" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ViewColumn, { fontSize: "small" }) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { anchorEl: colsAnchor, open: !!colsAnchor, onClose: () => setColsAnchor(null), children: table.getAllLeafColumns().filter((c) => c.id !== "actions" && c.id !== "select" && c.getCanHide()).map((col) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          MenuItem,
          {
            onClick: () => col.toggleVisibility(),
            sx: { fontSize: "0.8125rem", minWidth: 160 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Checkbox, { size: "small", checked: col.getIsVisible(), sx: { p: 0.5 } }),
              typeof col.columnDef.header === "string" ? col.columnDef.header : col.id
            ]
          },
          col.id
        )) })
      ] }),
      enableExport && /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: `导出全部数据为 ${exportFormat.toUpperCase()}`, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          size: "small",
          variant: "outlined",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { fontSize: "small" }),
          onClick: handleExport,
          sx: { fontSize: "0.8125rem", color: "text.secondary", borderColor: "divider", "&:hover": { borderColor: "text.secondary" } },
          children: [
            "导出 ",
            exportFormat.toUpperCase()
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Collapse, { in: selectedCount > 0, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: {
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1,
      mb: 1.5,
      bgcolor: alpha(p, 0.12),
      borderRadius: 2,
      border: "1px solid",
      borderColor: alpha(p, 0.3)
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Chip,
        {
          label: `已选 ${selectedCount} 条`,
          size: "small",
          sx: { bgcolor: alpha(p, 0.18), color: p, fontWeight: 600 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "small",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { sx: { fontSize: 14 } }),
          onClick: handleBatchExport,
          sx: { fontSize: "0.8125rem", color: p },
          children: "导出所选"
        }
      ),
      batchActions == null ? void 0 : batchActions.map((action, idx) => {
        var _a2;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            size: "small",
            "data-testid": action.testId,
            startIcon: action.icon,
            onClick: () => action.onClick(selectedRows),
            disabled: (_a2 = action.disabled) == null ? void 0 : _a2.call(action, selectedRows),
            sx: {
              fontSize: "0.8125rem",
              color: action.color === "error" ? "error.main" : action.color === "success" ? "success.main" : action.color === "warning" ? "warning.main" : p
            },
            children: action.label
          },
          `batch-${idx}`
        );
      }),
      onBatchDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "small",
          "data-testid": "batch-delete",
          startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteOutline, { sx: { fontSize: 14 } }),
          onClick: () => onBatchDelete(selectedRows),
          sx: { fontSize: "0.8125rem", color: "error.main" },
          children: "批量删除"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          size: "small",
          onClick: () => table.resetRowSelection(),
          sx: { fontSize: "0.8125rem", color: "text.secondary" },
          children: "取消选择"
        }
      )
    ] }) }),
    blockMode && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      Box,
      {
        sx: {
          mb: 0.75,
          px: 1,
          py: 0.5,
          fontSize: 12,
          bgcolor: "#e3f2fd",
          color: "#0d47a1",
          borderRadius: 0.5,
          border: "1px solid",
          borderColor: "#90caf9",
          display: "flex",
          alignItems: "center",
          gap: 1
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, { sx: { fontSize: 14 } }),
          "块选择模式：按住鼠标拖拽选取单元格区域 → Ctrl+C 复制为 TSV；Ctrl+Y 或 Esc 退出"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      TableContainer,
      {
        component: Paper,
        elevation: 0,
        sx: {
          mb: 0,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: sapStyle ? 0.5 : 2,
          overflow: "hidden",
          // 块选模式下禁止浏览器文本选中，避免误选
          ...blockMode ? { userSelect: "none", WebkitUserSelect: "none" } : {}
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { sx: { minWidth: 650, borderCollapse: "collapse" }, size: "small", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { sx: { bgcolor: sapStyle ? "#e8eef5" : "background.default" }, children: [
            enableRowSelection && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { padding: "checkbox", sx: { ...headerSx, borderBottom: sapStyle ? "2px solid #1a3a5c" : void 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Checkbox,
              {
                size: "small",
                checked: table.getIsAllRowsSelected(),
                indeterminate: table.getIsSomeRowsSelected(),
                onChange: table.getToggleAllRowsSelectedHandler()
              }
            ) }),
            headerGroup.headers.map((header) => {
              var _a2;
              const colId = header.column.id;
              const filterable = enableColumnFilter && colId !== "actions" && colId !== "select" && !((_a2 = header.column.columnDef.meta) == null ? void 0 : _a2.filterable) === false;
              return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: headerSx, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.25, userSelect: "none" }, children: [
                header.column.getCanSort() ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TableSortLabel,
                  {
                    active: !!header.column.getIsSorted(),
                    direction: header.column.getIsSorted() || "asc",
                    onClick: header.column.getToggleSortingHandler(),
                    sx: { "& .MuiTableSortLabel-icon": { fontSize: 14 } },
                    children: flexRender(header.column.columnDef.header, header.getContext())
                  }
                ) : flexRender(header.column.columnDef.header, header.getContext()),
                filterable && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  IconButton,
                  {
                    size: "small",
                    onClick: (e) => {
                      e.stopPropagation();
                      setFilterAnchor({ el: e.currentTarget, id: colId });
                    },
                    sx: { p: 0.25, color: isColFiltered(colId) ? "primary.main" : "text.disabled" },
                    title: "按本列检索",
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(FilterList, { sx: { fontSize: 14 } })
                  }
                )
              ] }) }, header.id);
            })
          ] }, headerGroup.id)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: table.getRowModel().rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { colSpan: columns.length + 2, sx: { textAlign: "center", py: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(FilterList, { sx: { fontSize: 32, color: "text.disabled", display: "block", mx: "auto", mb: 1 } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", children: "暂无符合条件的数据" })
          ] }) }) : table.getRowModel().rows.map((row, rowIndex) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            TableRow,
            {
              hover: true,
              selected: row.getIsSelected(),
              onClick: () => onRowClick == null ? void 0 : onRowClick(row.original),
              sx: {
                cursor: onRowClick ? "pointer" : "default",
                "&.Mui-selected": { bgcolor: alpha(p, 0.06) },
                "&.Mui-selected:hover": { bgcolor: alpha(p, 0.1) },
                // SAP 斑马纹 + 米黄悬停
                ...sapStyle ? {
                  "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" },
                  "&:hover": { backgroundColor: "#fff8e1 !important" }
                } : {}
              },
              children: [
                enableRowSelection && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { padding: "checkbox", sx: bodyCellSx, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    size: "small",
                    checked: row.getIsSelected(),
                    onChange: row.getToggleSelectedHandler(),
                    onClick: (e) => e.stopPropagation()
                  }
                ) }),
                row.getVisibleCells().map((cell, colIndex) => {
                  const selected = !!selection && rowIndex >= Math.min(selection.r0, selection.r1) && rowIndex <= Math.max(selection.r0, selection.r1) && colIndex >= Math.min(selection.c0, selection.c1) && colIndex <= Math.max(selection.c0, selection.c1);
                  return /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TableCell,
                    {
                      sx: {
                        ...bodyCellSx,
                        position: "relative",
                        ...selected ? { backgroundColor: "rgba(25,118,210,0.18)" } : {},
                        ...blockMode ? { userSelect: "none", WebkitUserSelect: "none" } : {}
                      },
                      onMouseDown: (e) => {
                        if (blockMode) {
                          e.preventDefault();
                          e.stopPropagation();
                          mouseDownRef.current = true;
                          setSelection({ r0: rowIndex, c0: colIndex, r1: rowIndex, c1: colIndex });
                        }
                      },
                      onMouseEnter: () => {
                        if (blockMode && mouseDownRef.current) {
                          setSelection((s) => s ? { ...s, r1: rowIndex, c1: colIndex } : s);
                        }
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { position: "relative" }, children: [
                        flexRender(cell.column.columnDef.cell, cell.getContext()),
                        blockMode && /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Box,
                          {
                            sx: {
                              position: "absolute",
                              inset: 0,
                              cursor: "cell",
                              userSelect: "none",
                              WebkitUserSelect: "none",
                              backgroundColor: selected ? "rgba(25,118,210,0.04)" : "transparent"
                            }
                          }
                        )
                      ] })
                    },
                    cell.id
                  );
                })
              ]
            },
            row.id
          )) })
        ] })
      }
    ),
    enablePagination && /* @__PURE__ */ jsxRuntimeExports.jsx(
      TablePagination,
      {
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        component: "div",
        count: table.getFilteredRowModel().rows.length,
        rowsPerPage: table.getState().pagination.pageSize,
        page: table.getState().pagination.pageIndex,
        onPageChange: (_, newPage) => table.setPageIndex(newPage),
        onRowsPerPageChange: (e) => table.setPageSize(Number(e.target.value)),
        labelRowsPerPage: "每页行数",
        labelDisplayedRows: ({ from, to, count }) => `${from}–${to} / 共 ${count} 条`,
        sx: { mt: 0.5, "& .MuiTablePagination-toolbar": { minHeight: 44 } }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Popover,
      {
        open: !!filterAnchor,
        anchorEl: (filterAnchor == null ? void 0 : filterAnchor.el) || null,
        onClose: () => setFilterAnchor(null),
        anchorOrigin: { vertical: "bottom", horizontal: "left" },
        children: filterAnchor && /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, width: 240 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: [
            "检索「",
            typeof ((_a = columns.find((c) => c.id === filterAnchor.id)) == null ? void 0 : _a.header) === "string" ? (_b = columns.find((c) => c.id === filterAnchor.id)) == null ? void 0 : _b.header : filterAnchor.id,
            "」列"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              autoFocus: true,
              size: "small",
              fullWidth: true,
              placeholder: "输入关键字（模糊匹配）",
              value: getColFilterVal(filterAnchor.id),
              onChange: (e) => setColFilter(filterAnchor.id, e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") setFilterAnchor(null);
              },
              onBlur: () => setFilterAnchor(null),
              InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(FilterList, { sx: { fontSize: 16, mr: 0.5, color: "text.disabled" } }) }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              size: "small",
              sx: { mt: 1 },
              onClick: () => {
                setColFilter(filterAnchor.id, "");
                setFilterAnchor(null);
              },
              children: "清除该列筛选"
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(Dialog, { open: importOpen, onClose: closeImport, maxWidth: "sm", fullWidth: true, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { children: [
        "导入数据（",
        importLabel,
        "）"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1 }, children: [
          "支持格式：",
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "xlsx / xls / csv / txt" }),
          "（也可直接从 Excel 复制行粘贴到下方，Tab 分隔）。首行视为表头，确认后由页面把列映射回数据。"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { mb: 1, display: "flex", gap: 1, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outlined",
              component: "label",
              size: "small",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, {}),
              children: [
                "选择文件",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "file",
                    accept: ".xlsx,.xls,.csv,.txt,.tsv",
                    hidden: true,
                    onChange: (e) => {
                      var _a2;
                      const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
                      if (file) handleImportFile(file);
                      e.target.value = "";
                    }
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              variant: "text",
              size: "small",
              startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { fontSize: "small" }),
              onClick: handleDownloadTemplate,
              title: "下载与当前列表列一致的空白导入模板",
              children: "下载导入模板"
            }
          )
        ] }),
        importedFile && /* @__PURE__ */ jsxRuntimeExports.jsx(
          Chip,
          {
            size: "small",
            color: "info",
            label: `已载入文件：${importedFile}（${(importedRows == null ? void 0 : importedRows.length) ?? 0} 行）`,
            sx: { mb: 1 }
          }
        ),
        importError && /* @__PURE__ */ jsxRuntimeExports.jsx(Alert, { severity: "error", sx: { mb: 1 }, children: importError }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          TextField,
          {
            autoFocus: true,
            multiline: true,
            minRows: 8,
            fullWidth: true,
            placeholder: "物料编码	名称	规格\nA001	示例	M12",
            value: importText,
            onChange: (e) => {
              setImportText(e.target.value);
              setImportedRows(null);
              setImportedFile("");
            },
            inputProps: { "data-testid": "dt-import-text" },
            helperText: importedRows ? "已选择 Excel 文件，可直接确认导入；下方文本框内容将被忽略。" : "粘贴 TSV/CSV 文本，或先点「选择文件」上传。"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogActions, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: closeImport, children: "取消" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            variant: "contained",
            onClick: handleImportConfirm,
            "data-testid": "dt-import-confirm",
            disabled: !importText.trim() && !importedRows || !onImport,
            children: "确认导入"
          }
        )
      ] })
    ] })
  ] });
}
export {
  DataTable as D
};
