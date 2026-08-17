import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, IconButton, Button, Typography, Stack, Popover, FormControlLabel, Switch,
  Autocomplete, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  FilterList as FilterListIcon, Search as SearchIcon,
  ArrowUpward as ArrowUpIcon, ArrowDownward as ArrowDownIcon,
  ContentCopy as CopyIcon, ViewColumn as ViewColumnIcon,
} from '@mui/icons-material';

// ------------------------------------------------------------
// 类型定义
// ------------------------------------------------------------
export type GridCellType = 'text' | 'number' | 'date' | 'select' | 'readonly';

export interface GridColumn {
  key: string;
  label: string;
  type?: GridCellType;
  width?: number;
  align?: 'left' | 'right' | 'center';
  options?: { value: string; label: string }[];
  /** 是否可编辑（readonly 列强制 false） */
  editable?: boolean;
  /** 是否可被隐藏（默认 true，fixed 列不可隐藏） */
  hideable?: boolean;
  /** 固定列：不参与列显隐配置，始终显示 */
  fixed?: boolean;
  /** 物料查找列：code=按编码查找，name=按名称查找 */
  materialRole?: 'code' | 'name';
  /** 物料选中后，用物料对象的该字段填充本列（如 'code'|'name'|'specification'|'unit'|'price'） */
  fillFromMaterial?: string;
  /** 自定义单元格渲染（用于网格无法覆盖的特殊列，如逐行供应商、价格来源徽标等）。
   *  签名：(row, col, rowId, colIndex) => ReactNode。优先级高于内置编辑器。 */
  renderCell?: (row: Record<string, any>, col: GridColumn, rowId: string, colIndex: number) => React.ReactNode;
  numeric?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
}

export interface MaterialLite {
  id: string;
  code: string;
  name: string;
  specification?: string;
  unit?: string;
  price?: number;
}

export interface MaterialLineItemsGridProps {
  columns: GridColumn[];
  value: Record<string, any>[];
  onChange: (rows: Record<string, any>[]) => void;
  rowIdKey?: string;
  materials?: MaterialLite[];
  /** 选中物料后由调用方返回补丁（如按价目表取价），可选 */
  onMaterialChange?: (rowId: string, materialId: string) => Partial<Record<string, any>> | void;
  /** 每次单元格/物料变更后重算派生字段（如金额 = 数量 × 单价） */
  computeRow?: (row: Record<string, any>) => Record<string, any>;
  newRow?: () => Record<string, any>;
  /** 列可见性持久化 key（localStorage）；不传则不持久化 */
  storageKey?: string;
  addLabel?: string;
  showRowNumber?: boolean;
  removable?: boolean;
  /** 底部汇总区（如金额合计） */
  footer?: React.ReactNode;
  emptyHint?: string;
  testIdPrefix?: string;
}

// ------------------------------------------------------------
// 工具函数
// ------------------------------------------------------------
const genId = () => `line-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const resolveMaterial = (
  materials: MaterialLite[] | undefined,
  text: string,
  role: 'code' | 'name',
): MaterialLite | undefined => {
  if (!materials || !text) return undefined;
  const t = text.trim();
  if (role === 'code') return materials.find((m) => m.code.toLowerCase() === t.toLowerCase())
    || materials.find((m) => m.code.toLowerCase().includes(t.toLowerCase()));
  return materials.find((m) => m.name === t)
    || materials.find((m) => m.name.toLowerCase().includes(t.toLowerCase()));
};

const buildMaterialPatch = (
  cols: GridColumn[],
  material: MaterialLite,
): Record<string, any> => {
  const patch: Record<string, any> = { materialId: material.id };
  cols.forEach((c) => {
    if (c.fillFromMaterial) {
      const v = (material as any)[c.fillFromMaterial];
      if (v !== undefined) patch[c.key] = v;
    }
  });
  return patch;
};

// ------------------------------------------------------------
// 组件
// ------------------------------------------------------------
const MaterialLineItemsGrid: React.FC<MaterialLineItemsGridProps> = ({
  columns,
  value,
  onChange,
  rowIdKey = 'id',
  materials,
  onMaterialChange,
  computeRow,
  newRow,
  storageKey,
  addLabel = '添加行',
  showRowNumber = true,
  removable = true,
  footer,
  emptyHint = '请从下方「添加行」录入，或直接从 Excel 复制多行后粘贴到任意单元格。',
  testIdPrefix = 'grid',
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Record<string, boolean>>(() => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols[c.key]),
    [columns, hiddenCols],
  );
  const editableCols = useMemo(
    () => visibleColumns.filter((c) => c.type !== 'readonly' && c.editable !== false),
    [visibleColumns],
  );
  const hideableColumns = useMemo(
    () => columns.filter((c) => c.hideable !== false && !c.fixed),
    [columns],
  );

  const persistHidden = useCallback((next: Record<string, boolean>) => {
    setHiddenCols(next);
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    }
  }, [storageKey]);

  // ────────────────────────────────────────────────────────────
  // SAP 风格：排序 / 列检索 / Ctrl+Y 块选复制
  // ────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'asc' });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterAnchor, setFilterAnchor] = useState<{ el: HTMLElement; key: string } | null>(null);
  const [blockMode, setBlockMode] = useState(false);
  const [selection, setSelection] = useState<{ r0: number; c0: number; r1: number; c1: number } | null>(null);
  const mouseDownRef = useRef(false);

  /** 只读数字的展示格式化：避免 3.6159999999999995 这类浮点尾数；保留原始 raw 给编辑控件和后端 */
  const fmtNum = useCallback((v: any): string => {
    if (typeof v !== 'number' || !isFinite(v)) return String(v ?? '');
    const r = Math.round(v * 100) / 100;
    return String(r);
  }, []);

  /** 单元格的“显示文本”（select 列取 label，便于检索/复制） */
  const cellDisplay = useCallback((row: Record<string, any>, col: GridColumn): string => {
    const raw = row[col.key];
    if (col.type === 'select' && col.options) {
      const opt = col.options.find((o) => o.value === raw);
      return opt ? opt.label : String(raw ?? '');
    }
    if ((col.type === 'readonly' || col.editable === false) && typeof raw === 'number') {
      return fmtNum(raw);
    }
    return String(raw ?? '');
  }, [fmtNum]);

  /** 经「列检索」+「排序」变换后的展示行（纯视图变换，不改底层 value 顺序） */
  const displayRows = useMemo(() => {
    let rows = [...value];
    const active = Object.entries(filters).filter(([, v]) => v && v.trim());
    if (active.length) {
      rows = rows.filter((row) =>
        active.every(([key, fv]) => {
          const col = columns.find((c) => c.key === key);
          return cellDisplay(row, col || { key } as GridColumn).toLowerCase().includes(fv.trim().toLowerCase());
        }),
      );
    }
    if (sort.key) {
      const col = columns.find((c) => c.key === sort.key);
      const numeric = col?.type === 'number' || col?.numeric;
      rows = [...rows].sort((a, b) => {
        let av: any = a[sort.key as string];
        let bv: any = b[sort.key as string];
        if (numeric) {
          av = Number(av) || 0; bv = Number(bv) || 0;
          return sort.dir === 'asc' ? av - bv : bv - av;
        }
        av = String(av ?? '').toLowerCase();
        bv = String(bv ?? '').toLowerCase();
        return sort.dir === 'asc' ? av.localeCompare(bv, 'zh') : bv.localeCompare(av, 'zh');
      });
    }
    return rows;
  }, [value, filters, sort, columns, cellDisplay]);

  const cycleSort = (key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' };
    });
  };

  const copySelection = useCallback((sel: { r0: number; c0: number; r1: number; c1: number }) => {
    const rMin = Math.min(sel.r0, sel.r1);
    const rMax = Math.max(sel.r0, sel.r1);
    const cMin = Math.min(sel.c0, sel.c1);
    const cMax = Math.max(sel.c0, sel.c1);
    const lines: string[] = [];
    for (let r = rMin; r <= rMax; r++) {
      const row = displayRows[r];
      if (!row) continue;
      const cells: string[] = [];
      for (let c = cMin; c <= cMax; c++) {
        const col = visibleColumns[c];
        if (!col) { cells.push(''); continue; }
        cells.push(cellDisplay(row, col));
      }
      lines.push(cells.join('\t'));
    }
    const tsv = lines.join('\n');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {});
    }
  }, [displayRows, visibleColumns, cellDisplay]);

  // 全局快捷键：Ctrl+Y 切换块选模式；块选模式下 Ctrl+C 复制选区；Esc 退出
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        setBlockMode((v) => !v);
        setSelection(null);
        return;
      }
      if (e.key === 'Escape') {
        if (blockMode || selection) {
          setBlockMode(false);
          setSelection(null);
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && blockMode) {
        if (selection) {
          e.preventDefault();
          copySelection(selection);
        }
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blockMode, selection, copySelection]);

  // 鼠标在表格外释放时也要结束块选拖拽
  useEffect(() => {
    const up = () => { mouseDownRef.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // 确保行有 id
  const withId = (row: Record<string, any>): Record<string, any> =>
    row[rowIdKey] ? row : { ...row, [rowIdKey]: genId() };

  const updateRow = useCallback((rowId: string, patch: Record<string, any>) => {
    const next = value.map((r) => {
      if (r[rowIdKey] !== rowId) return r;
      let merged = { ...r, ...patch };
      if (computeRow) merged = computeRow(merged);
      return merged;
    });
    onChange(next);
  }, [value, onChange, rowIdKey, computeRow]);

  const handleCellChange = (rowId: string, col: GridColumn, rawValue: any) => {
    let v = rawValue;
    if (col.type === 'number') v = rawValue === '' || rawValue == null ? '' : Number(rawValue);
    updateRow(rowId, { [col.key]: v });
  };

  const handleMaterialSelect = (rowId: string, role: 'code' | 'name', material: MaterialLite | null) => {
    if (!material) {
      updateRow(rowId, { materialId: '' });
      return;
    }
    const patch = buildMaterialPatch(columns, material);
    // 调用方补丁（如取价）
    const extra = onMaterialChange?.(rowId, material.id);
    const merged = { ...patch, ...(extra || {}) };
    updateRow(rowId, merged);
  };

  const handleAddRow = () => {
    const base = withId(newRow ? newRow() : {});
    let row = base;
    if (computeRow) row = computeRow(row);
    onChange([...value, row]);
  };

  const handleDeleteRow = (rowId: string) => {
    onChange(value.filter((r) => r[rowIdKey] !== rowId));
  };

  const handleDuplicateRow = (rowId: string) => {
    const src = value.find((r) => r[rowIdKey] === rowId);
    if (!src) return;
    const copy = withId({ ...src });
    const idx = value.findIndex((r) => r[rowIdKey] === rowId);
    const next = [...value];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  // ── Excel 多行粘贴（按行 id 定位，排序/筛选后依然正确）──
  const handlePaste = (e: React.ClipboardEvent, targetRow: Record<string, any>, colIndex: number) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    const matrix = text.replace(/\r/g, '').split('\n')
      .filter((r) => r.length > 0)
      .map((r) => r.split('\t'));
    if (matrix.length === 0) return;
    e.preventDefault();

    const startIdx = value.findIndex((r) => r[rowIdKey] === targetRow[rowIdKey]);
    if (startIdx < 0) return;
    const next = [...value];
    matrix.forEach((cells, i) => {
      const targetIndex = startIdx + i;
      if (targetIndex >= next.length) {
        // 超出末尾：补齐新行
        while (next.length <= targetIndex) next.push(withId(newRow ? newRow() : {}));
      }
      let base: Record<string, any> = { ...next[targetIndex] };
      let resolvedMaterial: MaterialLite | undefined;

      cells.forEach((cell, j) => {
        const c = editableCols[colIndex + j];
        if (!c) return;
        let v: any = cell;
        if (c.type === 'number') v = cell === '' ? '' : Number(cell);
        base[c.key] = v;
        if (c.materialRole) {
          const m = resolveMaterial(materials, cell, c.materialRole);
          if (m) resolvedMaterial = m;
        }
      });

      // 粘贴后按物料主数据同步：编码/名称/规格/单位/价格等自动对齐，保持与物料属性一致
      if (resolvedMaterial) {
        base = { ...base, ...buildMaterialPatch(columns, resolvedMaterial) };
        const extra = onMaterialChange?.(base[rowIdKey], resolvedMaterial.id);
        base = { ...base, ...(extra || {}) };
      }
      if (computeRow) base = computeRow(base);
      next[targetIndex] = base;
    });
    onChange(next);
  };

  const renderCellEditor = (row: Record<string, any>, col: GridColumn, rowIndex: number, colIndex: number) => {
    const rowId = row[rowIdKey];
    const val = row[col.key];

    // 自定义单元格渲染（特殊列）
    if (col.renderCell) {
      return <>{col.renderCell(row, col, rowId, colIndex)}</>;
    }

    // 物料查找列
    if (col.materialRole && materials) {
      const opts = materials.map((m) => ({ ...m }));
      const getLabel = (m: MaterialLite) => (col.materialRole === 'code' ? m.code : m.name);
      const current = materials.find((m) => m.id === row.materialId) || null;
      return (
        <Autocomplete
          size="small"
          fullWidth
          options={opts}
          getOptionLabel={(m) => getLabel(m)}
          value={current}
          onChange={(_, v) => handleMaterialSelect(rowId, col.materialRole!, v)}
          filterOptions={(optsList, state) => {
            const q = state.inputValue.trim().toLowerCase();
            if (!q) return optsList;
            return optsList.filter((m) => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
          }}
          renderOption={(props, m) => (
            <li {...props} key={m.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">{m.code} · {m.name}</Typography>
                {m.specification && <Typography variant="caption" color="text.secondary">{m.specification}</Typography>}
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={col.placeholder || (col.materialRole === 'code' ? '输入物料编码' : '输入物料名称')}
              onPaste={(e) => handlePaste(e, row, colIndex)}
              inputProps={{ ...params.inputProps, 'data-testid': `${testIdPrefix}-cell-${col.key}-${rowId}` }}
            />
          )}
        />
      );
    }

    if (col.type === 'select') {
      return (
        <TextField
          select
          size="small"
          fullWidth
          value={val ?? ''}
          onChange={(e) => handleCellChange(rowId, col, e.target.value)}
          onPaste={(e) => handlePaste(e, row, colIndex)}
          inputProps={{ 'data-testid': `${testIdPrefix}-cell-${col.key}-${rowId}` }}
        >
          {(col.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </TextField>
      );
    }

    if (col.type === 'date') {
      return (
        <TextField
          type="date"
          size="small"
          fullWidth
          value={val ?? ''}
          onChange={(e) => handleCellChange(rowId, col, e.target.value)}
          onPaste={(e) => handlePaste(e, row, colIndex)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 'data-testid': `${testIdPrefix}-cell-${col.key}-${rowId}` }}
        />
      );
    }

    if (col.type === 'number' || col.numeric) {
      return (
        <TextField
          type="number"
          size="small"
          fullWidth
          value={val ?? ''}
          onChange={(e) => handleCellChange(rowId, col, e.target.value)}
          onPaste={(e) => handlePaste(e, row, colIndex)}
          inputProps={{ min: col.min, step: col.step, style: { textAlign: col.align || 'right' }, 'data-testid': `${testIdPrefix}-cell-${col.key}-${rowId}` }}
        />
      );
    }

    if (col.type === 'readonly' || col.editable === false) {
      const display = typeof val === 'number' ? fmtNum(val) : (val ?? '');
      return (
        <Typography
          variant="body2"
          component="span"
          className="grid-readonly"
          sx={{ fontSize: 13, color: 'text.primary' }}
        >
          {display}
        </Typography>
      );
    }

    // 默认文本
    return (
      <TextField
        size="small"
        fullWidth
        value={val ?? ''}
        onChange={(e) => handleCellChange(rowId, col, e.target.value)}
        onPaste={(e) => handlePaste(e, row, colIndex)}
        placeholder={col.placeholder}
        inputProps={{ 'data-testid': `${testIdPrefix}-cell-${col.key}-${rowId}` }}
      />
    );
  };

  const alignStyle = (col: GridColumn): React.CSSProperties =>
    ({ textAlign: col.align || 'left', width: col.width, minWidth: col.width });

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.5,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ pl: 0.5 }}>
          物料明细
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="配置显示列">
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0.5, p: 0.5 }}
            >
              <ViewColumnIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={handleAddRow}
            data-testid={`${testIdPrefix}-add`}
            sx={{ fontSize: 12, py: 0.5 }}
          >
            {addLabel}
          </Button>
        </Stack>
      </Stack>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, maxWidth: 260 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>显示列设置</Typography>
          {hideableColumns.length === 0 && <Typography variant="caption" color="text.secondary">无可配置列</Typography>}
          {hideableColumns.map((c) => (
            <FormControlLabel
              key={c.key}
              control={
                <Switch
                  size="small"
                  checked={!hiddenCols[c.key]}
                  onChange={(e) => persistHidden({ ...hiddenCols, [c.key]: !e.target.checked })}
                />
              }
              label={c.label}
            />
          ))}
        </Box>
      </Popover>

      {blockMode && (
        <Box
          sx={{
            mb: 0.75, px: 1, py: 0.5, fontSize: 12,
            bgcolor: '#e3f2fd', color: '#0d47a1', borderRadius: 0.5,
            border: '1px solid', borderColor: '#90caf9',
            display: 'flex', alignItems: 'center', gap: 1,
          }}
        >
          <SearchIcon sx={{ fontSize: 14 }} />
          块选择模式：按住鼠标拖拽选取单元格区域 → Ctrl+C 复制为 TSV；Ctrl+Y 或 Esc 退出
        </Box>
      )}

      {value.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>{emptyHint}</Typography>
      ) : (
        <TableContainer
          onMouseUp={() => { mouseDownRef.current = false; }}
          onSelectStart={blockMode ? (e) => { e.preventDefault(); } : undefined}
          sx={{
            maxHeight: 460,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.5,
            // 块选模式下彻底禁止浏览器文本选中，避免误选
            ...(blockMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              borderCollapse: 'collapse',
              // ── 单元格通用样式：可见网格线 + 紧凑内边距 + 较小字号 ──
              '& .MuiTableCell-root': {
                borderRight: '1px solid #d6dbe1',
                borderBottom: '1px solid #d6dbe1',
                padding: '3px 6px',
                fontSize: 13,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
              },
              // ── 表头：蓝灰底 + 深蓝粗体 + 下分隔线 ──
              '& .MuiTableHead-root .MuiTableCell-root': {
                backgroundColor: '#e8eef5',
                color: '#1a3a5c',
                fontWeight: 700,
                fontSize: 12,
                padding: '6px 6px',
                borderBottom: '2px solid #1a3a5c',
                whiteSpace: 'nowrap',
                letterSpacing: 0.2,
              },
              // ── 数据行：斑马纹 + 悬停高亮 ──
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': {
                backgroundColor: '#f9fafb',
              },
              '& .MuiTableBody-root .MuiTableRow-root:hover': {
                backgroundColor: '#fff8e1 !important',
              },
              // ── 只读单元格：超出省略 ──
              '& .MuiTableBody-root .MuiTableCell-root .grid-readonly': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block',
              },
            }}
          >
            <TableHead>
              <TableRow>
                {showRowNumber && (
                  <TableCell sx={{ width: 48, textAlign: 'center !important' }}>#</TableCell>
                )}
                {visibleColumns.map((col) => {
                  const sorted = sort.key === col.key;
                  return (
                    <TableCell key={col.key} sx={{ ...alignStyle(col), p: 0, position: 'relative' }}>
                      <Box
                        onClick={() => cycleSort(col.key)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.25,
                          px: 0.75, py: 0.75, cursor: 'pointer', userSelect: 'none',
                          justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <span>{col.label}</span>
                        {sorted && (sort.dir === 'asc'
                          ? <ArrowUpIcon sx={{ fontSize: 14 }} />
                          : <ArrowDownIcon sx={{ fontSize: 14 }} />)}
                        <IconButton
                          size="small"
                          onClick={(e) => { e.stopPropagation(); setFilterAnchor({ el: e.currentTarget as HTMLElement, key: col.key }); }}
                          sx={{ p: 0.25, ml: 0.25, color: filters[col.key] ? 'primary.main' : 'text.disabled' }}
                          title="按本列检索"
                        >
                          <FilterListIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  );
                })}
                {removable && (
                  <TableCell sx={{ width: 64, textAlign: 'center !important' }}>操作</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((row, rowIndex) => (
                <TableRow key={row[rowIdKey] ?? rowIndex}>
                  {showRowNumber && (
                    <TableCell sx={{ textAlign: 'center', color: 'text.secondary', fontFamily: 'monospace', fontSize: 12 }}>
                      {String(rowIndex + 1).padStart(4, '0')}
                    </TableCell>
                  )}
                  {visibleColumns.map((col, colIndex) => {
                    const isEditable = col.type !== 'readonly' && col.editable !== false;
                    const selected = !!selection
                      && rowIndex >= Math.min(selection.r0, selection.r1)
                      && rowIndex <= Math.max(selection.r0, selection.r1)
                      && colIndex >= Math.min(selection.c0, selection.c1)
                      && colIndex <= Math.max(selection.c0, selection.c1);
                    return (
                      <TableCell
                        key={col.key}
                        sx={{
                          ...alignStyle(col),
                          p: isEditable ? '2px' : '4px 6px',
                          verticalAlign: 'middle',
                          position: 'relative',
                          ...(selected ? { backgroundColor: 'rgba(25,118,210,0.18)' } : {}),
                          // 块选模式下禁止本单元格文本被原生选中
                          ...(blockMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
                        }}
                        onMouseDown={(e) => {
                          if (blockMode) {
                            e.preventDefault(); // 阻止浏览器开始文本选择
                            e.stopPropagation();
                            mouseDownRef.current = true;
                            setSelection({ r0: rowIndex, c0: colIndex, r1: rowIndex, c1: colIndex });
                          }
                        }}
                        onMouseEnter={() => {
                          if (blockMode && mouseDownRef.current) {
                            setSelection((s) => (s ? { ...s, r1: rowIndex, c1: colIndex } : s));
                          }
                        }}
                      >
                        {renderCellEditor(row, col, rowIndex, editableCols.indexOf(col))}
                        {blockMode && (
                          <Box
                            sx={{
                              position: 'absolute', inset: 0, cursor: 'cell',
                              userSelect: 'none', WebkitUserSelect: 'none',
                              backgroundColor: selected ? 'rgba(25,118,210,0.04)' : 'transparent',
                            }}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                  {removable && (
                    <TableCell>
                      <Stack direction="row" spacing={0.25} justifyContent="center">
                        <Tooltip title="复制此行">
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicateRow(row[rowIdKey])}
                            sx={{ p: 0.25 }}
                            data-testid={`${testIdPrefix}-dup-${row[rowIdKey]}`}
                          >
                            <CopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除此行">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRow(row[rowIdKey])}
                            sx={{ p: 0.25 }}
                            data-testid={`${testIdPrefix}-del-${row[rowIdKey]}`}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Popover
        open={!!filterAnchor}
        anchorEl={filterAnchor?.el || null}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {filterAnchor && (
          <Box sx={{ p: 2, width: 240 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              检索「{columns.find((c) => c.key === filterAnchor.key)?.label}」列
            </Typography>
            <TextField
              autoFocus
              size="small"
              fullWidth
              placeholder="输入关键字（模糊匹配）"
              value={filters[filterAnchor.key] || ''}
              onChange={(e) => setFilters((f) => ({ ...f, [filterAnchor.key]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') setFilterAnchor(null); }}
              onBlur={() => setFilterAnchor(null)}
              InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.disabled' }} /> }}
            />
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => {
                setFilters((f) => { const n = { ...f }; delete n[filterAnchor.key]; return n; });
                setFilterAnchor(null);
              }}
            >
              清除该列筛选
            </Button>
          </Box>
        )}
      </Popover>

      {footer && <Box sx={{ mt: 1 }}>{footer}</Box>}
    </Paper>
  );
};

export default MaterialLineItemsGrid;
