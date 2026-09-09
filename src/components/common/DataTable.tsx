import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Box, Checkbox, IconButton,
  Menu, MenuItem, Tooltip, Paper, Typography, Chip, Button, Collapse, Alert,
  Popover, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import {
  MoreVert, Download, Visibility, Edit, Delete,
  FilterList, DeleteOutline, ViewColumn, Upload as UploadIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { statusConfig } from './StatusBadge';
import { triggerDownload } from '@/utils/exportUtils';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  getFilteredRowModel, flexRender, ColumnDef, SortingState,
  ColumnFiltersState, RowSelectionState, VisibilityState, FilterFn,
} from '@tanstack/react-table';

export interface BatchAction<T> {
  label: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'error' | 'success' | 'warning';
  onClick: (rows: T[]) => void;
  disabled?: (rows: T[]) => boolean;
  /** 用于 E2E 测试的 data-testid */
  testId?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  enableRowSelection?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  /** 每列表头漏斗检索（模糊匹配本列值） */
  enableColumnFilter?: boolean;
  /** Ctrl+Y 进入块选模式，拖拽框选单元格 → Ctrl+C 复制为 TSV */
  enableBlockSelect?: boolean;
  /** 是否启用「导出」按钮（默认导出 Excel；可用 exportFormat 切换为 CSV） */
  enableExport?: boolean;
  exportFormat?: 'xlsx' | 'csv';
  /** 是否启用「导入」按钮（粘贴 / 上传 TSV/CSV），通过 onImport 回调给调用方映射回 store */
  enableImport?: boolean;
  onImport?: (rows: Record<string, string>[], headers: string[]) => void;
  /** 列配置键：提供后显示「列设置」菜单，且显隐状态记忆到 localStorage */
  columnConfigKey?: string;
  /** 默认隐藏的列（可被「列设置」菜单释放显示；若用户已记忆显隐则以记忆为准） */
  hiddenColumns?: string[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onBatchDelete?: (rows: T[]) => void;
  onBatchExport?: (rows: T[]) => void;
  batchActions?: BatchAction<T>[];
  /** SAP/ERP 经典表格视觉（蓝灰表头 + 可见网格线 + 斑马纹 + 米黄悬停），默认开启 */
  sapStyle?: boolean;
  importLabel?: string;
}

// 通用模糊包含过滤器：把任意类型值转字符串后包含匹配；
// 额外：若值为已知状态键（如 released/approved），同时匹配其中文标签，支持中文检索。
const fuzzyIncludes: FilterFn<unknown> = (row, columnId, filterValue) => {
  const v = row.getValue(columnId);
  const fv = String(filterValue ?? '').trim().toLowerCase();
  if (!fv) return true;
  if (String(v ?? '').toLowerCase().includes(fv)) return true;
  // 状态列：同时匹配中文标签（来自 StatusBadge.statusConfig）
  const label = statusConfig[String(v)]?.label;
  if (label && label.toLowerCase().includes(fv)) return true;
  return false;
};

// ── 独立的操作菜单单元格 ──────────────────────────────────────
function ActionCell<T>({
  row,
  onView,
  onEdit,
  onDelete,
}: {
  row: T;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{ color: '#64748B' }}
      >
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            borderRadius: 2,
            border: '1px solid rgba(226,232,240,.8)',
            minWidth: 120,
          },
        }}
      >
        {onView && (
          <MenuItem
            onClick={(e) => { e.stopPropagation(); onView(row); handleClose(); }}
            sx={{ fontSize: '0.875rem', py: 1 }}
          >
            <Visibility sx={{ mr: 1, fontSize: 16, color: '#64748B' }} />查看
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem
            onClick={(e) => { e.stopPropagation(); onEdit(row); handleClose(); }}
            sx={{ fontSize: '0.875rem', py: 1 }}
          >
            <Edit sx={{ mr: 1, fontSize: 16, color: '#64748B' }} />编辑
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(row); handleClose(); }}
            sx={{ fontSize: '0.875rem', py: 1, color: '#EF4444' }}
          >
            <Delete sx={{ mr: 1, fontSize: 16, color: '#EF4444' }} />删除
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export function DataTable<T>({
  data,
  columns,
  enableRowSelection = false,
  enablePagination = true,
  enableSorting = true,
  enableColumnFilter = true,
  enableBlockSelect = true,
  enableExport = false,
  exportFormat = 'xlsx',
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
  importLabel = '导入',
}: DataTableProps<T>) {
  const theme = useTheme();
  const p = theme.palette.primary.main;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [colsAnchor, setColsAnchor] = useState<HTMLElement | null>(null);
  // 列显隐记忆（仅当提供 columnConfigKey 时启用）
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const base: VisibilityState = {};
    if (columnConfigKey) {
      try {
        const raw = localStorage.getItem(`ssa-dt-colcfg-${columnConfigKey}`);
        if (raw) {
          const hidden: string[] = JSON.parse(raw);
          hidden.forEach((id) => { base[id] = false; });
        }
      } catch {
        /* ignore */
      }
    }
    // 默认隐藏列（仅当未被用户显隐记忆覆盖时生效）
    (hiddenColumns || []).forEach((id) => {
      if (!(id in base)) base[id] = false;
    });
    return base;
  });

  const persistVisibility = (vis: VisibilityState) => {
    if (!columnConfigKey) return;
    const hidden = Object.entries(vis).filter(([, v]) => v === false).map(([k]) => k);
    try {
      localStorage.setItem(`ssa-dt-colcfg-${columnConfigKey}`, JSON.stringify(hidden));
    } catch {
      /* ignore */
    }
  };
  const handleColumnVisibilityChange = (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState)
  ) => {
    const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
    setColumnVisibility(next);
    persistVisibility(next);
  };

  // P4-3：列方案应用时，外部写入 localStorage 后广播事件，这里重新读取并应用
  useEffect(() => {
    if (!columnConfigKey) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail?.key !== columnConfigKey) return;
      try {
        const raw = localStorage.getItem(`ssa-dt-colcfg-${columnConfigKey}`);
        if (!raw) return;
        const hidden: string[] = JSON.parse(raw);
        const vis: VisibilityState = {};
        hidden.forEach((id) => { vis[id] = false; });
        setColumnVisibility(vis);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('ssa-dt-colcfg-changed', handler as EventListener);
    return () => window.removeEventListener('ssa-dt-colcfg-changed', handler as EventListener);
  }, [columnConfigKey]);

  // ────────────────────────────────────────────────────────────
  // 注：`table`（useReactTable）必须在所有引用它的函数 / 回调之前声明，
  // 否则闭包内的 `table` 标识符会处于 TDZ（Cannot access 'table' before initialization）。
  // ────────────────────────────────────────────────────────────
  const actionColumn: ColumnDef<T, unknown> = {
    id: 'actions',
    header: '操作',
    enableSorting: false,
    cell: ({ row }) => (
      <ActionCell
        row={row.original}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  };

  // 自动补全 accessor：有 id 但缺 accessorKey/accessorFn 的列，用 id 作为 accessorKey，
  // 使排序/筛选能取到真实字段值。这是“很多字段点了排序/筛选没反应”的根因修复（一键覆盖绝大多数列表）。
  const normalizedColumns = useMemo<ColumnDef<T, unknown>[]>(() =>
    (columns as Array<ColumnDef<T, unknown> & { accessorKey?: string; accessorFn?: unknown }>).map((col) => {
      if (
        !col.accessorKey && !col.accessorFn &&
        typeof col.id === 'string' && col.id !== 'actions' && col.id !== 'select'
      ) {
        return { ...col, accessorKey: col.id } as ColumnDef<T, unknown>;
      }
      return col;
    }),
  [columns]);

  // 若调用方已自定义 id==='actions' 列（如供应商对账单/开票申请、报检单），不再追加默认操作列，避免重复 key 告警
  const hasCustomActions = normalizedColumns.some((c) => (c as ColumnDef<T, unknown>).id === 'actions');
  const table = useReactTable({
    data,
    columns: (hasCustomActions ? normalizedColumns : [...normalizedColumns, actionColumn]) as ColumnDef<unknown, any>[],
    state: { sorting, columnFilters, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { filterFn: fuzzyIncludes },
    initialState: { pagination: { pageSize } },
  });

  // ────────────────────────────────────────────────────────────
  // Ctrl+Y 块选复制
  // ────────────────────────────────────────────────────────────
  const [blockMode, setBlockMode] = useState(false);
  const [selection, setSelection] = useState<{ r0: number; c0: number; r1: number; c1: number } | null>(null);
  const mouseDownRef = useRef(false);

  const copySelection = (sel: { r0: number; c0: number; r1: number; c1: number }) => {
    const rows = table.getRowModel().rows;
    const rMin = Math.min(sel.r0, sel.r1);
    const rMax = Math.max(sel.r0, sel.r1);
    const cMin = Math.min(sel.c0, sel.c1);
    const cMax = Math.max(sel.c0, sel.c1);
    const lines: string[] = [];
    for (let r = rMin; r <= rMax; r++) {
      const row = rows[r];
      if (!row) continue;
      const cells = row.getVisibleCells();
      const parts: string[] = [];
      for (let c = cMin; c <= cMax; c++) {
        const cell = cells[c];
        if (!cell) { parts.push(''); continue; }
        const v = cell.getValue();
        parts.push(v == null ? '' : String(v));
      }
      lines.push(parts.join('\t'));
    }
    const tsv = lines.join('\n');
    if (tsv && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(tsv).catch(() => {});
    }
  };

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
      void inField;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blockMode, selection, table]);

  useEffect(() => {
    const up = () => { mouseDownRef.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // ────────────────────────────────────────────────────────────
  // 每列漏斗检索
  // ────────────────────────────────────────────────────────────
  const [filterAnchor, setFilterAnchor] = useState<{ el: HTMLElement; id: string } | null>(null);
  const isColFiltered = (id: string) => columnFilters.some((f) => f.id === id);
  const getColFilterVal = (id: string) => {
    const f = columnFilters.find((x) => x.id === id);
    return f ? String(f.value ?? '') : '';
  };
  const setColFilter = (id: string, value: string) => {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value && value.trim() ? [...rest, { id, value }] : rest;
    });
  };

  // ────────────────────────────────────────────────────────────
  // 导入（粘贴 / 上传 XLSX·XLS·CSV·TXT）
  // ────────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  // 文件导入（xlsx/xls）解析后的结构化行；优先于粘贴文本使用
  const [importedRows, setImportedRows] = useState<Record<string, string>[] | null>(null);
  const [importedFile, setImportedFile] = useState<string>('');
  const [importError, setImportError] = useState<string>('');

  // 把粘贴文本（TSV/CSV，首行表头）解析为带表头的行数组
  const parsePastedText = (
    text: string
  ): { rows: Record<string, string>[]; headers: string[] } => {
    const normalized = text.replace(/\r/g, '');
    const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 1) return { rows: [], headers: [] };
    const delimiter = normalized.includes('\t') ? '\t' : (lines[0].includes(',') ? ',' : '\t');
    const headers = lines[0].split(delimiter).map((h) => h.trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });
      rows.push(obj);
    }
    return { rows, headers };
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportText('');
    setImportedRows(null);
    setImportedFile('');
    setImportError('');
  };

  const handleImportConfirm = () => {
    if (!onImport) return;
    let rows: Record<string, string>[] = [];
    let headers: string[] = [];
    if (importedRows) {
      rows = importedRows;
      headers = Object.keys(importedRows[0] ?? {});
    } else {
      const parsed = parsePastedText(importText);
      rows = parsed.rows;
      headers = parsed.headers;
    }
    if (rows.length === 0) {
      setImportError('未解析到数据行，请确认内容或文件格式');
      return;
    }
    onImport(rows, headers);
    closeImport();
  };

  // 选择文件：xlsx/xls 用 xlsx 库解析；csv/txt/tsv 按文本读取后由粘贴逻辑解析
  const handleImportFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    setImportError('');
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      try {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        const rows: Record<string, string>[] = json.map((o) =>
          Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? '')]))
        );
        if (rows.length === 0) {
          setImportError('Excel 文件无数据行，请检查工作表内容');
          return;
        }
        setImportedRows(rows);
        setImportedFile(file.name);
        setImportText('');
      } catch {
        setImportError('Excel 解析失败，请确认文件未损坏且为 .xlsx/.xls 格式');
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setImportText(String(reader.result || ''));
        setImportedRows(null);
        setImportedFile('');
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  // 下载导入模板（以当前列表表头为列，仅含表头行，便于用户按格式填写）
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const headers = columns.map((c) => String(c.header ?? c.id));
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const stamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `导入模板_${stamp}.xlsx`);
  };

  // ────────────────────────────────────────────────────────────
  // 导出（Excel / CSV）
  // ────────────────────────────────────────────────────────────
  const buildExportRows = () => {
    return table.getFilteredRowModel().rows.map((row) => {
      const rowData: Record<string, unknown> = {};
      columns.forEach((col) => {
        const key = col.id || String(col.header);
        rowData[String(col.header || key)] = row.getValue(key);
      });
      return rowData;
    });
  };

  const handleExport = async () => {
    const exportData = buildExportRows();
    const stamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    if (exportFormat === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const lines = [headers.join(',')];
      exportData.forEach((r) => {
        lines.push(headers.map((h) => {
          const v = String(r[h] ?? '').replace(/"/g, '""');
          return `"${v}"`;
        }).join(','));
      });
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${stamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(file, `export_${stamp}.xlsx`);
  };

  const handleBatchExport = async () => {
    if (onBatchExport) { onBatchExport(selectedRows); return; }
    const exportData = selectedRows.map((row) => {
      const rowData: Record<string, unknown> = {};
      columns.forEach((col) => {
        const key = col.id || String(col.header);
        rowData[String(col.header || key)] = (row as Record<string, unknown>)[key];
      });
      return rowData;
    });
    if (exportFormat === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const lines = [headers.join(',')];
      exportData.forEach((r) => {
        lines.push(headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
      });
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'selected_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerDownload(file, 'selected_export.xlsx');
  };

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original) as T[];
  const selectedCount = selectedRows.length;

  const headerSx = sapStyle
    ? {
        fontWeight: 700, fontSize: 12, color: '#1a3a5c',
        backgroundColor: '#e8eef5', borderBottom: '2px solid #1a3a5c',
        borderRight: '1px solid #d6dbe1', whiteSpace: 'nowrap', px: 0.75, py: 0.75,
      }
    : {
        fontWeight: 600, fontSize: '0.8125rem', color: 'text.secondary',
        borderBottom: '1px solid', borderColor: 'divider',
        whiteSpace: 'nowrap', py: 1.2,
      };

  const bodyCellSx = sapStyle
    ? {
        borderRight: '1px solid #d6dbe1', borderBottom: '1px solid #d6dbe1',
        px: 0.75, py: 0.5, fontSize: '0.8125rem', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
      }
    : { borderBottom: '1px solid', borderColor: 'divider', py: 1, fontSize: '0.875rem' };

  return (
    <Box>
      {/* ── 顶部工具栏：导入 / 列设置 / 导出 ── */}
      {(enableExport || enableImport || columnConfigKey) && selectedCount === 0 && (
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {enableImport && (
            <Tooltip title="从 Excel/CSV 粘贴或上传导入">
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadIcon fontSize="small" />}
                onClick={() => setImportOpen(true)}
                sx={{ fontSize: '0.8125rem', color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: 'text.secondary' } }}
              >
                {importLabel}
              </Button>
            </Tooltip>
          )}
          {columnConfigKey && (
            <>
              <Tooltip title="列设置（显隐可记忆）">
                <IconButton size="small" onClick={(e) => setColsAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                  <ViewColumn fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={colsAnchor} open={!!colsAnchor} onClose={() => setColsAnchor(null)}>
                {table.getAllLeafColumns()
                  .filter((c) => c.id !== 'actions' && c.id !== 'select' && c.getCanHide())
                  .map((col) => (
                    <MenuItem
                      key={col.id}
                      onClick={() => col.toggleVisibility()}
                      sx={{ fontSize: '0.8125rem', minWidth: 160 }}
                    >
                      <Checkbox size="small" checked={col.getIsVisible()} sx={{ p: 0.5 }} />
                      {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                    </MenuItem>
                  ))}
              </Menu>
            </>
          )}
          {enableExport && (
            <Tooltip title={`导出全部数据为 ${exportFormat.toUpperCase()}`}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Download fontSize="small" />}
                onClick={handleExport}
                sx={{ fontSize: '0.8125rem', color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: 'text.secondary' } }}
              >
                导出 {exportFormat.toUpperCase()}
              </Button>
            </Tooltip>
          )}
        </Box>
      )}

      {/* ── 批量操作悬浮栏 ── */}
      <Collapse in={selectedCount > 0}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1, mb: 1.5,
          bgcolor: alpha(p, 0.12), borderRadius: 2,
          border: '1px solid', borderColor: alpha(p, 0.3),
        }}>
          <Chip
            label={`已选 ${selectedCount} 条`}
            size="small"
            sx={{ bgcolor: alpha(p, 0.18), color: p, fontWeight: 600 }}
          />
          <Button
            size="small"
            startIcon={<Download sx={{ fontSize: 14 }} />}
            onClick={handleBatchExport}
            sx={{ fontSize: '0.8125rem', color: p }}
          >
            导出所选
          </Button>
          {batchActions?.map((action, idx) => (
            <Button
              key={`batch-${idx}`}
              size="small"
              data-testid={action.testId}
              startIcon={action.icon}
              onClick={() => action.onClick(selectedRows)}
              disabled={action.disabled?.(selectedRows)}
              sx={{
                fontSize: '0.8125rem',
                color: action.color === 'error' ? 'error.main'
                  : action.color === 'success' ? 'success.main'
                  : action.color === 'warning' ? 'warning.main'
                  : p,
              }}
            >
              {action.label}
            </Button>
          ))}
          {onBatchDelete && (
            <Button
              size="small"
              data-testid="batch-delete"
              startIcon={<DeleteOutline sx={{ fontSize: 14 }} />}
              onClick={() => onBatchDelete(selectedRows)}
              sx={{ fontSize: '0.8125rem', color: 'error.main' }}
            >
              批量删除
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            onClick={() => table.resetRowSelection()}
            sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}
          >
            取消选择
          </Button>
        </Box>
      </Collapse>

      {blockMode && (
        <Box
          sx={{
            mb: 0.75, px: 1, py: 0.5, fontSize: 12,
            bgcolor: '#e3f2fd', color: '#0d47a1', borderRadius: 0.5,
            border: '1px solid', borderColor: '#90caf9',
            display: 'flex', alignItems: 'center', gap: 1,
          }}
        >
          <CopyIcon sx={{ fontSize: 14 }} />
          块选择模式：按住鼠标拖拽选取单元格区域 → Ctrl+C 复制为 TSV；Ctrl+Y 或 Esc 退出
        </Box>
      )}

      {/* ── 表格 ── */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          mb: 0,
          border: '1px solid', borderColor: 'divider',
          borderRadius: sapStyle ? 0.5 : 2,
          overflow: 'hidden',
          // 块选模式下禁止浏览器文本选中，避免误选
          ...(blockMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
        }}
      >
        <Table sx={{ minWidth: 650, borderCollapse: 'collapse' }} size="small">
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} sx={{ bgcolor: sapStyle ? '#e8eef5' : 'background.default' }}>
                {enableRowSelection && (
                  <TableCell padding="checkbox" sx={{ ...headerSx, borderBottom: sapStyle ? '2px solid #1a3a5c' : undefined }}>
                    <Checkbox
                      size="small"
                      checked={table.getIsAllRowsSelected()}
                      indeterminate={table.getIsSomeRowsSelected()}
                      onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                  </TableCell>
                )}
                {headerGroup.headers.map((header) => {
                  const colId = header.column.id;
                  const filterable = enableColumnFilter && colId !== 'actions' && colId !== 'select'
                    && !(header.column.columnDef.meta as any)?.filterable === false;
                  return (
                    <TableCell key={header.id} sx={headerSx}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, userSelect: 'none' }}>
                        {header.column.getCanSort() ? (
                          <TableSortLabel
                            active={!!header.column.getIsSorted()}
                            direction={header.column.getIsSorted() || 'asc'}
                            onClick={header.column.getToggleSortingHandler()}
                            sx={{ '& .MuiTableSortLabel-icon': { fontSize: 14 } }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </TableSortLabel>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                        {filterable && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterAnchor({ el: e.currentTarget as HTMLElement, id: colId });
                            }}
                            sx={{ p: 0.25, color: isColFiltered(colId) ? 'primary.main' : 'text.disabled' }}
                            title="按本列检索"
                          >
                            <FilterList sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} sx={{ textAlign: 'center', py: 6 }}>
                  <FilterList sx={{ fontSize: 32, color: 'text.disabled', display: 'block', mx: 'auto', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">暂无符合条件的数据</Typography>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={row.getIsSelected()}
                  onClick={() => onRowClick?.(row.original as T)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&.Mui-selected': { bgcolor: alpha(p, 0.06) },
                    '&.Mui-selected:hover': { bgcolor: alpha(p, 0.1) },
                    // SAP 斑马纹 + 米黄悬停
                    ...(sapStyle ? {
                      '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' },
                      '&:hover': { backgroundColor: '#fff8e1 !important' },
                    } : {}),
                  }}
                >
                  {enableRowSelection && (
                    <TableCell padding="checkbox" sx={bodyCellSx}>
                      <Checkbox
                        size="small"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell, colIndex) => {
                    const selected = !!selection
                      && rowIndex >= Math.min(selection.r0, selection.r1)
                      && rowIndex <= Math.max(selection.r0, selection.r1)
                      && colIndex >= Math.min(selection.c0, selection.c1)
                      && colIndex <= Math.max(selection.c0, selection.c1);
                    return (
                      <TableCell
                        key={cell.id}
                        sx={{
                          ...bodyCellSx,
                          position: 'relative',
                          ...(selected ? { backgroundColor: 'rgba(25,118,210,0.18)' } : {}),
                          ...(blockMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
                        }}
                        onMouseDown={(e) => {
                          if (blockMode) {
                            e.preventDefault();
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
                        <Box sx={{ position: 'relative' }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          {blockMode && (
                            <Box
                              sx={{
                                position: 'absolute', inset: 0, cursor: 'cell',
                                userSelect: 'none', WebkitUserSelect: 'none',
                                backgroundColor: selected ? 'rgba(25,118,210,0.04)' : 'transparent',
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── 分页 ── */}
      {enablePagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={table.getFilteredRowModel().rows.length}
          rowsPerPage={table.getState().pagination.pageSize}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, newPage) => table.setPageIndex(newPage)}
          onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
          labelRowsPerPage="每页行数"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 共 ${count} 条`}
          sx={{ mt: 0.5, '& .MuiTablePagination-toolbar': { minHeight: 44 } }}
        />
      )}

      {/* ── 每列检索弹出框 ── */}
      <Popover
        open={!!filterAnchor}
        anchorEl={filterAnchor?.el || null}
        onClose={() => setFilterAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {filterAnchor && (
          <Box sx={{ p: 2, width: 240 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              检索「{String(columns.find((c) => c.id === filterAnchor.id)?.header ?? filterAnchor.id)}」列
            </Typography>
            <TextField
              autoFocus
              size="small"
              fullWidth
              placeholder="输入关键字（模糊匹配）"
              value={getColFilterVal(filterAnchor.id)}
              onChange={(e) => setColFilter(filterAnchor.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setFilterAnchor(null); }}
              onBlur={() => setFilterAnchor(null)}
              InputProps={{ startAdornment: <FilterList sx={{ fontSize: 16, mr: 0.5, color: 'text.disabled' }} /> }}
            />
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => { setColFilter(filterAnchor.id, ''); setFilterAnchor(null); }}
            >
              清除该列筛选
            </Button>
          </Box>
        )}
      </Popover>

      {/* ── 导入对话框 ── */}
      <Dialog open={importOpen} onClose={closeImport} maxWidth="sm" fullWidth>
        <DialogTitle>导入数据（{importLabel}）</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            支持格式：<b>xlsx / xls / csv / txt</b>（也可直接从 Excel 复制行粘贴到下方，Tab 分隔）。首行视为表头，确认后由页面把列映射回数据。
          </Typography>
          <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              component="label"
              size="small"
              startIcon={<UploadIcon />}
            >
              选择文件
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = ''; // 允许重复选择同一文件
                }}
              />
            </Button>
            <Button
              variant="text"
              size="small"
              startIcon={<Download fontSize="small" />}
              onClick={handleDownloadTemplate}
              title="下载与当前列表列一致的空白导入模板"
            >
              下载导入模板
            </Button>
          </Box>
          {importedFile && (
            <Chip
              size="small"
              color="info"
              label={`已载入文件：${importedFile}（${importedRows?.length ?? 0} 行）`}
              sx={{ mb: 1 }}
            />
          )}
          {importError && (
            <Alert severity="error" sx={{ mb: 1 }}>{importError}</Alert>
          )}
          <TextField
            autoFocus
            multiline
            minRows={8}
            fullWidth
            placeholder={'物料编码\t名称\t规格\nA001\t示例\tM12'}
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportedRows(null); setImportedFile(''); }}
            inputProps={{ 'data-testid': 'dt-import-text' }}
            helperText={importedRows ? '已选择 Excel 文件，可直接确认导入；下方文本框内容将被忽略。' : '粘贴 TSV/CSV 文本，或先点「选择文件」上传。'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImport}>取消</Button>
          <Button
            variant="contained"
            onClick={handleImportConfirm}
            data-testid="dt-import-confirm"
            disabled={(!importText.trim() && !importedRows) || !onImport}
          >
            确认导入
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DataTable;
