import { r as reactExports, j as jsxRuntimeExports } from "./vendor-react-CdHjdSaV.js";
import { aS as Paper, bL as Stack, T as Typography, p as Tooltip, aM as IconButton, de as ViewColumn, bm as Button, bh as Add, a_ as Popover, m as Box, cM as FormControlLabel, cN as Switch, aT as Search, cD as TableContainer, cE as Table, cF as TableHead, cG as TableRow, cH as TableCell, dz as ArrowUpward, dA as ArrowDownward, c_ as FilterList, cI as TableBody, df as ContentCopy, be as Delete, bv as TextField, cC as Autocomplete } from "./vendor-mui-DsZGB15g.js";
const genId = () => `line-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const resolveMaterial = (materials, text, role) => {
  if (!materials || !text) return void 0;
  const t = text.trim();
  if (role === "code") return materials.find((m) => m.code.toLowerCase() === t.toLowerCase()) || materials.find((m) => m.code.toLowerCase().includes(t.toLowerCase()));
  return materials.find((m) => m.name === t) || materials.find((m) => m.name.toLowerCase().includes(t.toLowerCase()));
};
const buildMaterialPatch = (cols, material) => {
  const patch = { materialId: material.id };
  cols.forEach((c) => {
    if (c.fillFromMaterial) {
      const v = material[c.fillFromMaterial];
      if (v !== void 0) patch[c.key] = v;
    }
  });
  return patch;
};
const MaterialLineItemsGrid = ({
  columns,
  value,
  onChange,
  rowIdKey = "id",
  materials,
  onMaterialChange,
  computeRow,
  newRow,
  storageKey,
  addLabel = "添加行",
  showRowNumber = true,
  removable = true,
  footer,
  emptyHint = "请从下方「添加行」录入，或直接从 Excel 复制多行后粘贴到任意单元格。",
  testIdPrefix = "grid"
}) => {
  var _a;
  const [anchorEl, setAnchorEl] = reactExports.useState(null);
  const [hiddenCols, setHiddenCols] = reactExports.useState(() => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const visibleColumns = reactExports.useMemo(
    () => columns.filter((c) => !hiddenCols[c.key]),
    [columns, hiddenCols]
  );
  const editableCols = reactExports.useMemo(
    () => visibleColumns.filter((c) => c.type !== "readonly" && c.editable !== false),
    [visibleColumns]
  );
  const hideableColumns = reactExports.useMemo(
    () => columns.filter((c) => c.hideable !== false && !c.fixed),
    [columns]
  );
  const persistHidden = reactExports.useCallback((next) => {
    setHiddenCols(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
      }
    }
  }, [storageKey]);
  const [sort, setSort] = reactExports.useState({ key: null, dir: "asc" });
  const [filters, setFilters] = reactExports.useState({});
  const [filterAnchor, setFilterAnchor] = reactExports.useState(null);
  const [blockMode, setBlockMode] = reactExports.useState(false);
  const [selection, setSelection] = reactExports.useState(null);
  const mouseDownRef = reactExports.useRef(false);
  const fmtNum = reactExports.useCallback((v) => {
    if (typeof v !== "number" || !isFinite(v)) return String(v ?? "");
    const r = Math.round(v * 100) / 100;
    return String(r);
  }, []);
  const cellDisplay = reactExports.useCallback((row, col) => {
    const raw = row[col.key];
    if (col.type === "select" && col.options) {
      const opt = col.options.find((o) => o.value === raw);
      return opt ? opt.label : String(raw ?? "");
    }
    if ((col.type === "readonly" || col.editable === false) && typeof raw === "number") {
      return fmtNum(raw);
    }
    return String(raw ?? "");
  }, [fmtNum]);
  const displayRows = reactExports.useMemo(() => {
    let rows = [...value];
    const active = Object.entries(filters).filter(([, v]) => v && v.trim());
    if (active.length) {
      rows = rows.filter(
        (row) => active.every(([key, fv]) => {
          const col = columns.find((c) => c.key === key);
          return cellDisplay(row, col || { key }).toLowerCase().includes(fv.trim().toLowerCase());
        })
      );
    }
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key);
      const numeric = (col == null ? void 0 : col.type) === "number" || (col == null ? void 0 : col.numeric);
      rows = [...rows].sort((a, b) => {
        let av = a[sort.key];
        let bv = b[sort.key];
        if (numeric) {
          av = Number(av) || 0;
          bv = Number(bv) || 0;
          return sort.dir === "asc" ? av - bv : bv - av;
        }
        av = String(av ?? "").toLowerCase();
        bv = String(bv ?? "").toLowerCase();
        return sort.dir === "asc" ? av.localeCompare(bv, "zh") : bv.localeCompare(av, "zh");
      });
    }
    return rows;
  }, [value, filters, sort, columns, cellDisplay]);
  const cycleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: "asc" };
    });
  };
  const copySelection = reactExports.useCallback((sel) => {
    var _a2;
    const rMin = Math.min(sel.r0, sel.r1);
    const rMax = Math.max(sel.r0, sel.r1);
    const cMin = Math.min(sel.c0, sel.c1);
    const cMax = Math.max(sel.c0, sel.c1);
    const lines = [];
    for (let r = rMin; r <= rMax; r++) {
      const row = displayRows[r];
      if (!row) continue;
      const cells = [];
      for (let c = cMin; c <= cMax; c++) {
        const col = visibleColumns[c];
        if (!col) {
          cells.push("");
          continue;
        }
        cells.push(cellDisplay(row, col));
      }
      lines.push(cells.join("	"));
    }
    const tsv = lines.join("\n");
    if ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {
      });
    }
  }, [displayRows, visibleColumns, cellDisplay]);
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
  }, [blockMode, selection, copySelection]);
  reactExports.useEffect(() => {
    const up = () => {
      mouseDownRef.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);
  const withId = (row) => row[rowIdKey] ? row : { ...row, [rowIdKey]: genId() };
  const updateRow = reactExports.useCallback((rowId, patch) => {
    const next = value.map((r) => {
      if (r[rowIdKey] !== rowId) return r;
      let merged = { ...r, ...patch };
      if (computeRow) merged = computeRow(merged);
      return merged;
    });
    onChange(next);
  }, [value, onChange, rowIdKey, computeRow]);
  const handleCellChange = (rowId, col, rawValue) => {
    let v = rawValue;
    if (col.type === "number") v = rawValue === "" || rawValue == null ? "" : Number(rawValue);
    updateRow(rowId, { [col.key]: v });
  };
  const handleMaterialSelect = (rowId, role, material) => {
    if (!material) {
      updateRow(rowId, { materialId: "" });
      return;
    }
    const patch = buildMaterialPatch(columns, material);
    const extra = onMaterialChange == null ? void 0 : onMaterialChange(rowId, material.id);
    const merged = { ...patch, ...extra || {} };
    updateRow(rowId, merged);
  };
  const handleAddRow = () => {
    const base = withId(newRow ? newRow() : {});
    let row = base;
    if (computeRow) row = computeRow(row);
    onChange([...value, row]);
  };
  const handleDeleteRow = (rowId) => {
    onChange(value.filter((r) => r[rowIdKey] !== rowId));
  };
  const handleDuplicateRow = (rowId) => {
    const src = value.find((r) => r[rowIdKey] === rowId);
    if (!src) return;
    const copy = withId({ ...src });
    const idx = value.findIndex((r) => r[rowIdKey] === rowId);
    const next = [...value];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const handlePaste = (e, targetRow, colIndex) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const matrix = text.replace(/\r/g, "").split("\n").filter((r) => r.length > 0).map((r) => r.split("	"));
    if (matrix.length === 0) return;
    e.preventDefault();
    const startIdx = value.findIndex((r) => r[rowIdKey] === targetRow[rowIdKey]);
    if (startIdx < 0) return;
    const next = [...value];
    matrix.forEach((cells, i) => {
      const targetIndex = startIdx + i;
      if (targetIndex >= next.length) {
        while (next.length <= targetIndex) next.push(withId(newRow ? newRow() : {}));
      }
      let base = { ...next[targetIndex] };
      let resolvedMaterial;
      cells.forEach((cell, j) => {
        const c = editableCols[colIndex + j];
        if (!c) return;
        let v = cell;
        if (c.type === "number") v = cell === "" ? "" : Number(cell);
        base[c.key] = v;
        if (c.materialRole) {
          const m = resolveMaterial(materials, cell, c.materialRole);
          if (m) resolvedMaterial = m;
        }
      });
      if (resolvedMaterial) {
        base = { ...base, ...buildMaterialPatch(columns, resolvedMaterial) };
        const extra = onMaterialChange == null ? void 0 : onMaterialChange(base[rowIdKey], resolvedMaterial.id);
        base = { ...base, ...extra || {} };
      }
      if (computeRow) base = computeRow(base);
      next[targetIndex] = base;
    });
    onChange(next);
  };
  const renderCellEditor = (row, col, rowIndex, colIndex) => {
    const rowId = row[rowIdKey];
    const val = row[col.key];
    if (col.renderCell) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: col.renderCell(row, col, rowId, colIndex) });
    }
    if (col.materialRole && materials) {
      const opts = materials.map((m) => ({ ...m }));
      const getLabel = (m) => col.materialRole === "code" ? m.code : m.name;
      const current = materials.find((m) => m.id === row.materialId) || null;
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        Autocomplete,
        {
          size: "small",
          fullWidth: true,
          options: opts,
          getOptionLabel: (m) => getLabel(m),
          value: current,
          onChange: (_, v) => handleMaterialSelect(rowId, col.materialRole, v),
          filterOptions: (optsList, state) => {
            const q = state.inputValue.trim().toLowerCase();
            if (!q) return optsList;
            return optsList.filter((m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
          },
          renderOption: (props, m) => /* @__PURE__ */ reactExports.createElement("li", { ...props, key: m.id }, /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { display: "flex", flexDirection: "column" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Typography, { variant: "body2", children: [
              m.code,
              " · ",
              m.name
            ] }),
            m.specification && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: m.specification })
          ] })),
          renderInput: (params) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            TextField,
            {
              ...params,
              placeholder: col.placeholder || (col.materialRole === "code" ? "输入物料编码" : "输入物料名称"),
              onPaste: (e) => handlePaste(e, row, colIndex),
              inputProps: { ...params.inputProps, "data-testid": `${testIdPrefix}-cell-${col.key}-${rowId}` }
            }
          )
        }
      );
    }
    if (col.type === "select") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          select: true,
          size: "small",
          fullWidth: true,
          value: val ?? "",
          onChange: (e) => handleCellChange(rowId, col, e.target.value),
          onPaste: (e) => handlePaste(e, row, colIndex),
          inputProps: { "data-testid": `${testIdPrefix}-cell-${col.key}-${rowId}` },
          children: (col.options || []).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.value, children: o.label }, o.value))
        }
      );
    }
    if (col.type === "date") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          type: "date",
          size: "small",
          fullWidth: true,
          value: val ?? "",
          onChange: (e) => handleCellChange(rowId, col, e.target.value),
          onPaste: (e) => handlePaste(e, row, colIndex),
          InputLabelProps: { shrink: true },
          inputProps: { "data-testid": `${testIdPrefix}-cell-${col.key}-${rowId}` }
        }
      );
    }
    if (col.type === "number" || col.numeric) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        TextField,
        {
          type: "number",
          size: "small",
          fullWidth: true,
          value: val ?? "",
          onChange: (e) => handleCellChange(rowId, col, e.target.value),
          onPaste: (e) => handlePaste(e, row, colIndex),
          inputProps: { min: col.min, step: col.step, style: { textAlign: col.align || "right" }, "data-testid": `${testIdPrefix}-cell-${col.key}-${rowId}` }
        }
      );
    }
    if (col.type === "readonly" || col.editable === false) {
      const display = typeof val === "number" ? fmtNum(val) : val ?? "";
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        Typography,
        {
          variant: "body2",
          component: "span",
          className: "grid-readonly",
          sx: { fontSize: 13, color: "text.primary" },
          children: display
        }
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      TextField,
      {
        size: "small",
        fullWidth: true,
        value: val ?? "",
        onChange: (e) => handleCellChange(rowId, col, e.target.value),
        onPaste: (e) => handlePaste(e, row, colIndex),
        placeholder: col.placeholder,
        inputProps: { "data-testid": `${testIdPrefix}-cell-${col.key}-${rowId}` }
      }
    );
  };
  const alignStyle = (col) => ({ textAlign: col.align || "left", width: col.width, minWidth: col.width });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Paper,
    {
      variant: "outlined",
      sx: {
        p: 1.25,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0.5
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", mb: 0.75, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", fontWeight: 700, sx: { pl: 0.5 }, children: "物料明细" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.5, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "配置显示列", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              IconButton,
              {
                size: "small",
                onClick: (e) => setAnchorEl(e.currentTarget),
                sx: { border: "1px solid", borderColor: "divider", borderRadius: 0.5, p: 0.5 },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(ViewColumn, { sx: { fontSize: 16 } })
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                variant: "contained",
                size: "small",
                startIcon: /* @__PURE__ */ jsxRuntimeExports.jsx(Add, { sx: { fontSize: 16 } }),
                onClick: handleAddRow,
                "data-testid": `${testIdPrefix}-add`,
                sx: { fontSize: 12, py: 0.5 },
                children: addLabel
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Popover,
          {
            open: !!anchorEl,
            anchorEl,
            onClose: () => setAnchorEl(null),
            anchorOrigin: { vertical: "bottom", horizontal: "right" },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Box, { sx: { p: 2, maxWidth: 260 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "显示列设置" }),
              hideableColumns.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "caption", color: "text.secondary", children: "无可配置列" }),
              hideableColumns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                FormControlLabel,
                {
                  control: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Switch,
                    {
                      size: "small",
                      checked: !hiddenCols[c.key],
                      onChange: (e) => persistHidden({ ...hiddenCols, [c.key]: !e.target.checked })
                    }
                  ),
                  label: c.label
                },
                c.key
              ))
            ] })
          }
        ),
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
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { fontSize: 14 } }),
              "块选择模式：按住鼠标拖拽选取单元格区域 → Ctrl+C 复制为 TSV；Ctrl+Y 或 Esc 退出"
            ]
          }
        ),
        value.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Typography, { variant: "body2", color: "text.secondary", sx: { py: 2, textAlign: "center" }, children: emptyHint }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          TableContainer,
          {
            onMouseUp: () => {
              mouseDownRef.current = false;
            },
            onSelectStart: blockMode ? (e) => {
              e.preventDefault();
            } : void 0,
            sx: {
              maxHeight: 460,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 0.5,
              // 块选模式下彻底禁止浏览器文本选中，避免误选
              ...blockMode ? { userSelect: "none", WebkitUserSelect: "none" } : {}
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Table,
              {
                size: "small",
                stickyHeader: true,
                sx: {
                  borderCollapse: "collapse",
                  // ── 单元格通用样式：可见网格线 + 紧凑内边距 + 较小字号 ──
                  "& .MuiTableCell-root": {
                    borderRight: "1px solid #d6dbe1",
                    borderBottom: "1px solid #d6dbe1",
                    padding: "3px 6px",
                    fontSize: 13,
                    lineHeight: 1.4,
                    whiteSpace: "nowrap"
                  },
                  // ── 表头：蓝灰底 + 深蓝粗体 + 下分隔线 ──
                  "& .MuiTableHead-root .MuiTableCell-root": {
                    backgroundColor: "#e8eef5",
                    color: "#1a3a5c",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "6px 6px",
                    borderBottom: "2px solid #1a3a5c",
                    whiteSpace: "nowrap",
                    letterSpacing: 0.2
                  },
                  // ── 数据行：斑马纹 + 悬停高亮 ──
                  "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)": {
                    backgroundColor: "#f9fafb"
                  },
                  "& .MuiTableBody-root .MuiTableRow-root:hover": {
                    backgroundColor: "#fff8e1 !important"
                  },
                  // ── 只读单元格：超出省略 ──
                  "& .MuiTableBody-root .MuiTableCell-root .grid-readonly": {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block"
                  }
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                    showRowNumber && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 48, textAlign: "center !important" }, children: "#" }),
                    visibleColumns.map((col) => {
                      const sorted = sort.key === col.key;
                      return /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { ...alignStyle(col), p: 0, position: "relative" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        Box,
                        {
                          onClick: () => cycleSort(col.key),
                          sx: {
                            display: "flex",
                            alignItems: "center",
                            gap: 0.25,
                            px: 0.75,
                            py: 0.75,
                            cursor: "pointer",
                            userSelect: "none",
                            justifyContent: col.align === "right" ? "flex-end" : "flex-start"
                          },
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: col.label }),
                            sorted && (sort.dir === "asc" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpward, { sx: { fontSize: 14 } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownward, { sx: { fontSize: 14 } })),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              IconButton,
                              {
                                size: "small",
                                onClick: (e) => {
                                  e.stopPropagation();
                                  setFilterAnchor({ el: e.currentTarget, key: col.key });
                                },
                                sx: { p: 0.25, ml: 0.25, color: filters[col.key] ? "primary.main" : "text.disabled" },
                                title: "按本列检索",
                                children: /* @__PURE__ */ jsxRuntimeExports.jsx(FilterList, { sx: { fontSize: 14 } })
                              }
                            )
                          ]
                        }
                      ) }, col.key);
                    }),
                    removable && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { width: 64, textAlign: "center !important" }, children: "操作" })
                  ] }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: displayRows.map((row, rowIndex) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
                    showRowNumber && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { sx: { textAlign: "center", color: "text.secondary", fontFamily: "monospace", fontSize: 12 }, children: String(rowIndex + 1).padStart(4, "0") }),
                    visibleColumns.map((col, colIndex) => {
                      const isEditable = col.type !== "readonly" && col.editable !== false;
                      const selected = !!selection && rowIndex >= Math.min(selection.r0, selection.r1) && rowIndex <= Math.max(selection.r0, selection.r1) && colIndex >= Math.min(selection.c0, selection.c1) && colIndex <= Math.max(selection.c0, selection.c1);
                      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        TableCell,
                        {
                          sx: {
                            ...alignStyle(col),
                            p: isEditable ? "2px" : "4px 6px",
                            verticalAlign: "middle",
                            position: "relative",
                            ...selected ? { backgroundColor: "rgba(25,118,210,0.18)" } : {},
                            // 块选模式下禁止本单元格文本被原生选中
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
                          children: [
                            renderCellEditor(row, col, rowIndex, editableCols.indexOf(col)),
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
                          ]
                        },
                        col.key
                      );
                    }),
                    removable && /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Stack, { direction: "row", spacing: 0.25, justifyContent: "center", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "复制此行", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        IconButton,
                        {
                          size: "small",
                          onClick: () => handleDuplicateRow(row[rowIdKey]),
                          sx: { p: 0.25 },
                          "data-testid": `${testIdPrefix}-dup-${row[rowIdKey]}`,
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(ContentCopy, { sx: { fontSize: 16 } })
                        }
                      ) }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { title: "删除此行", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        IconButton,
                        {
                          size: "small",
                          color: "error",
                          onClick: () => handleDeleteRow(row[rowIdKey]),
                          sx: { p: 0.25 },
                          "data-testid": `${testIdPrefix}-del-${row[rowIdKey]}`,
                          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Delete, { sx: { fontSize: 16 } })
                        }
                      ) })
                    ] }) })
                  ] }, row[rowIdKey] ?? rowIndex)) })
                ]
              }
            )
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
                (_a = columns.find((c) => c.key === filterAnchor.key)) == null ? void 0 : _a.label,
                "」列"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                TextField,
                {
                  autoFocus: true,
                  size: "small",
                  fullWidth: true,
                  placeholder: "输入关键字（模糊匹配）",
                  value: filters[filterAnchor.key] || "",
                  onChange: (e) => setFilters((f) => ({ ...f, [filterAnchor.key]: e.target.value })),
                  onKeyDown: (e) => {
                    if (e.key === "Enter") setFilterAnchor(null);
                  },
                  onBlur: () => setFilterAnchor(null),
                  InputProps: { startAdornment: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { sx: { fontSize: 16, mr: 0.5, color: "text.disabled" } }) }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Button,
                {
                  size: "small",
                  sx: { mt: 1 },
                  onClick: () => {
                    setFilters((f) => {
                      const n = { ...f };
                      delete n[filterAnchor.key];
                      return n;
                    });
                    setFilterAnchor(null);
                  },
                  children: "清除该列筛选"
                }
              )
            ] })
          }
        ),
        footer && /* @__PURE__ */ jsxRuntimeExports.jsx(Box, { sx: { mt: 1 }, children: footer })
      ]
    }
  );
};
export {
  MaterialLineItemsGrid as M
};
