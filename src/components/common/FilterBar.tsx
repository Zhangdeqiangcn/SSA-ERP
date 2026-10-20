import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Divider,
  Tooltip,
  IconButton,
  Popover,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Search,
  Save,
  DeleteOutline,
  Bookmark,
  ViewColumn,
  Settings,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import type { ColumnDef } from '@tanstack/react-table';
import { useListPrefsStore } from '@/stores/listPrefsStore';
import { deriveFilterFields } from '@/utils/listSearch';

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: { value: string | number; label: string }[];
  placeholder?: string;
}

interface FilterBarProps {
  /** 显式检索字段（可选）。未提供时由 columns 自动派生全部可搜字段（V3.85.0 标准化：理想情况下列表页只需传 columns 即可获得全列检索） */
  fields?: FilterField[];
  /** 检索回调（与 onFilter 二选一；均未提供时不会触发检索） */
  onSearch?: (values: Record<string, unknown>) => void;
  /** 兼容个别列表使用 onFilter 作为检索回调 */
  onFilter?: (values: Record<string, unknown>) => void;
  onReset?: () => void;
  /** 提供后启用「查询方案 / 列方案」用户级记忆（P4-3） */
  listKey?: string;
  /** 对应 DataTable 的 columnConfigKey，用于列方案存取 */
  columnConfigKey?: string;
  /** 默认可见的检索项数（其余折叠/自定义），默认 5（V3.85.0 标准化：默认显 5 项、其余『更多筛选』展开） */
  defaultVisibleCount?: number;
  /** 表格列定义：提供后自动派生全部可搜字段（meta.searchable 标记），与 fields 合并 */
  columns?: ColumnDef<any, any>[];
  /** 业务模块键（如 'vendor'/'purchase'）：用于按字段权限门控派生检索项 */
  module?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  fields = [],
  onSearch,
  onFilter,
  onReset,
  listKey,
  columnConfigKey,
  defaultVisibleCount = 5,
  columns,
  module,
}) => {
  // 从表格列定义派生检索字段（meta.searchable 标记），与显式 fields 合并：
  // 显式 fields 在前（保留页面自定义排序），派生字段补在后面（覆盖全部列）。
  const derivedFields = useMemo(
    () => (columns ? deriveFilterFields(columns, { module }) : []),
    [columns, module]
  );
  const allFields = useMemo(() => {
    if (!fields.length) return derivedFields;
    if (!derivedFields.length) return fields;
    const explicitNames = new Set(fields.map((f) => f.name));
    const appended = derivedFields.filter((f) => !explicitNames.has(f.name));
    return [...fields, ...appended];
  }, [fields, derivedFields]);
  const { control, handleSubmit, reset, getValues } = useForm();
  const [querySel, setQuerySel] = React.useState('');
  const [colSel, setColSel] = React.useState('');
  // 临时展开全部检索项（点击「更多筛选」）
  const [expanded, setExpanded] = useState(false);
  // ⚙ 自定义 Popover 显隐
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  const querySchemes = useListPrefsStore((s) => (listKey ? s.querySchemes[listKey] ?? [] : []));
  const columnSchemes = useListPrefsStore((s) => (listKey ? s.columnSchemes[listKey] ?? [] : []));
  const saveQueryScheme = useListPrefsStore((s) => s.saveQueryScheme);
  const deleteQueryScheme = useListPrefsStore((s) => s.deleteQueryScheme);
  const saveColumnScheme = useListPrefsStore((s) => s.saveColumnScheme);
  const deleteColumnScheme = useListPrefsStore((s) => s.deleteColumnScheme);
  // 检索字段显隐偏好（持久化）
  const filterFieldPrefs = useListPrefsStore((s) => (listKey ? s.filterFieldPrefs[listKey] : undefined));
  const setFilterFieldPrefs = useListPrefsStore((s) => s.setFilterFieldPrefs);
  const resetFilterFieldPrefs = useListPrefsStore((s) => s.resetFilterFieldPrefs);

  // 真正显示的字段：
  // 1) 用户自定义过 → 按偏好顺序显示（偏好中可能少于总字段）
  // 2) 未自定义 → 默认前 N 项
  // 3) 点击「更多筛选」→ 临时显示全部
  const visibleFields = useMemo(() => {
    if (expanded) return allFields;
    if (filterFieldPrefs && Array.isArray(filterFieldPrefs)) {
      const byName = new Map(allFields.map((f) => [f.name, f]));
      const ordered = filterFieldPrefs
        .map((n) => byName.get(n))
        .filter((f): f is FilterField => Boolean(f));
      // 偏好中不包含、但新增的字段，补在末尾，避免漏掉
      const extra = allFields.filter((f) => !filterFieldPrefs.includes(f.name));
      return [...ordered, ...extra];
    }
    return allFields.slice(0, defaultVisibleCount);
  }, [allFields, expanded, filterFieldPrefs, defaultVisibleCount]);

  // ⚙ 自定义：当前勾选集合（基于原始字段顺序）
  const [checked, setChecked] = useState<string[]>([]);
  const openSettings = (e: React.MouseEvent<HTMLElement>) => {
    // 初始化勾选项 = 当前可见字段集合
    setChecked(visibleFields.map((f) => f.name));
    setSettingsAnchor(e.currentTarget);
  };
  const closeSettings = () => setSettingsAnchor(null);
  const settingsOpen = Boolean(settingsAnchor);

  const toggleCheck = (name: string) => {
    setChecked((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };
  const applySettings = () => {
    if (listKey) {
      // 按原始字段顺序保存勾选项（仅传 columns 时 allFields 来自派生，fields 为空，必须用 allFields）
      const ordered = allFields.filter((f) => checked.includes(f.name)).map((f) => f.name);
      setFilterFieldPrefs(listKey, ordered);
    }
    closeSettings();
  };
  const resetSettings = () => {
    if (listKey) resetFilterFieldPrefs(listKey);
    closeSettings();
  };

  // 兼容 onSearch / onFilter 两种检索回调命名
  const doSearch = (values: Record<string, unknown>) => {
    const fn = onSearch ?? onFilter;
    fn?.(values);
  };

  const onSubmit = (values: Record<string, unknown>) => {
    doSearch(values);
  };

  const handleReset = () => {
    reset();
    setQuerySel('');
    setExpanded(false);
    if (onReset) onReset();
    else doSearch({});
  };

  // 查询方案：加载
  const handleLoadQuery = (id: string) => {
    setQuerySel(id);
    const scheme = querySchemes.find((q) => q.id === id);
    if (!scheme) return;
    reset(scheme.filters);
    doSearch(scheme.filters);
  };

  // 查询方案：保存
  const handleSaveQuery = () => {
    if (!listKey) return;
    const name = window.prompt('查询方案名称', '我的查询方案');
    if (!name) return;
    saveQueryScheme(listKey, name.trim(), getValues());
  };

  // 列方案：保存（读取 DataTable 当前列配置）
  const handleSaveColumn = () => {
    if (!listKey || !columnConfigKey) return;
    const name = window.prompt('列方案名称', '我的列方案');
    if (!name) return;
    let hidden: string[] = [];
    try {
      const raw = localStorage.getItem(`ssa-dt-colcfg-${columnConfigKey}`);
      hidden = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      hidden = [];
    }
    saveColumnScheme(listKey, name.trim(), hidden);
  };

  // 列方案：应用
  const handleApplyColumn = (id: string) => {
    setColSel(id);
    const scheme = columnSchemes.find((c) => c.id === id);
    if (!scheme || !columnConfigKey) return;
    try {
      localStorage.setItem(`ssa-dt-colcfg-${columnConfigKey}`, JSON.stringify(scheme.hidden));
      window.dispatchEvent(
        new CustomEvent('ssa-dt-colcfg-changed', { detail: { key: columnConfigKey } })
      );
    } catch {
      /* ignore */
    }
  };

  // 是否还有隐藏项可展开
  const hasHidden = visibleFields.length < allFields.length;

  return (
    <Box sx={{ mb: 2, p: 1.25, bgcolor: 'background.default', borderRadius: 1 }}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack direction="row" spacing={1.25} alignItems="flex-end" flexWrap="wrap">
        {visibleFields.map((field) => (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            defaultValue=""
            render={({ field: formField }) => (
              <FormControl sx={{ minWidth: field.type === 'text' ? 160 : 130 }} size="small">
                <InputLabel>{field.label}</InputLabel>
                {field.type === 'select' ? (
                  <Select {...formField} label={field.label}>
                    {field.options?.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  <TextField
                    {...formField}
                    type={field.type === 'date' ? 'date' : 'text'}
                    label={field.label}
                    placeholder={field.placeholder}
                    size="small"
                    InputLabelProps={{ shrink: field.type === 'date' }}
                  />
                )}
              </FormControl>
            )}
          />
        ))}
        <Button
          type="submit"
          variant="contained"
          startIcon={<Search />}
          size="small"
          sx={{ height: 32 }}
        >
          查询
        </Button>
        <Button variant="outlined" size="small" type="button" onClick={handleReset} sx={{ height: 32 }}>
          重置
        </Button>
        {hasHidden && (
          <Button
            variant="text"
            size="small"
            type="button"
            onClick={() => setExpanded((v) => !v)}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            sx={{ height: 32 }}
          >
            {expanded ? '收起筛选' : '更多筛选'}
          </Button>
        )}
        <Tooltip title="自定义检索项">
          <IconButton type="button" size="small" onClick={openSettings} sx={{ alignSelf: 'center' }}>
            <Settings fontSize="small" />
          </IconButton>
        </Tooltip>
        </Stack>
      </Box>

      {/* ⚙ 自定义：检索项显隐（持久化） */}
      <Popover
        open={settingsOpen}
        anchorEl={settingsAnchor}
        onClose={closeSettings}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, width: 220, maxHeight: 320, overflow: 'auto' }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1, px: 0.5 }}
          >
            <Box sx={{ fontSize: 13, fontWeight: 600 }}>自定义检索项</Box>
            <Button size="small" onClick={resetSettings}>
              恢复默认
            </Button>
          </Stack>
          <Divider />
          <Box sx={{ mt: 1 }}>
            {allFields.map((field) => (
              <FormControlLabel
                key={field.name}
                control={
                  <Checkbox
                    size="small"
                    checked={checked.includes(field.name)}
                    onChange={() => toggleCheck(field.name)}
                  />
                }
                label={field.label}
                sx={{ display: 'block', my: 0 }}
              />
            ))}
          </Box>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" onClick={closeSettings}>
              取消
            </Button>
            <Button size="small" variant="contained" onClick={applySettings}>
              确定
            </Button>
          </Stack>
        </Box>
      </Popover>

      {/* P4-3：查询方案 / 列方案（用户级记忆） */}
      {listKey && (
        <>
          <Divider sx={{ my: 1.25, borderColor: 'divider' }} />
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Bookmark fontSize="small" sx={{ color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>查询方案</InputLabel>
              <Select
                value={querySel}
                label="查询方案"
                onChange={(e) => handleLoadQuery(e.target.value)}
              >
                <MenuItem value="">— 不选用 —</MenuItem>
                {querySchemes.map((q) => (
                  <MenuItem key={q.id} value={q.id}>
                    {q.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" startIcon={<Save />} onClick={handleSaveQuery}>
              保存方案
            </Button>
            {querySel && (
              <Tooltip title="删除当前查询方案">
                <IconButton
                  size="small"
                  onClick={() => {
                    deleteQueryScheme(listKey, querySel);
                    setQuerySel('');
                  }}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {columnConfigKey && (
              <>
                <Divider orientation="vertical" flexItem sx={{ borderColor: 'divider' }} />
                <ViewColumn fontSize="small" sx={{ color: 'text.secondary' }} />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>列方案</InputLabel>
                  <Select
                    value={colSel}
                    label="列方案"
                    onChange={(e) => handleApplyColumn(e.target.value)}
                  >
                    <MenuItem value="">— 默认列 —</MenuItem>
                    {columnSchemes.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button size="small" variant="outlined" startIcon={<Save />} onClick={handleSaveColumn}>
                  保存列
                </Button>
                {colSel && (
                  <Tooltip title="删除当前列方案">
                    <IconButton
                      size="small"
                      onClick={() => {
                        deleteColumnScheme(listKey, colSel);
                        setColSel('');
                      }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        </>
      )}
    </Box>
  );
};

export default FilterBar;
