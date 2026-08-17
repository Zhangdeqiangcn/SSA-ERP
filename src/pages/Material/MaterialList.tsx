import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Box, TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel, Stack, Typography, Chip, Paper, Alert } from '@mui/material';
import { Search, CheckCircle, Block, Edit } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, BatchAction } from '@/components/common';
import { useMaterialStore } from '@/stores';
import { Material, MaterialType, MakeOrBuy, MaterialFilter, MaterialCategory, LifecycleStatus } from '@/types';
import { formatCurrency } from '@/utils/format';

const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  raw: '原材料',
  semi: '半成品',
  finished: '成品',
  purchased: '外购',
  service: '服务',
};

const MAKE_OR_BUY_LABELS: Record<MakeOrBuy, string> = {
  make: '自制',
  buy: '外购',
};

const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  draft: '创建中',
  active: '激活',
  phasing_out: '逐步淘汰',
  obsolete: '已淘汰',
};

const LIFECYCLE_STATUS_COLORS: Record<LifecycleStatus, string> = {
  draft: '#94A3B8',
  active: '#10B981',
  phasing_out: '#F59E0B',
  obsolete: '#EF4444',
};

// 将分类树拍平成 Select 选项
const flattenCategories = (
  nodes: MaterialCategory[],
  acc: { value: string; label: string }[] = []
): { value: string; label: string }[] => {
  nodes.forEach((n) => {
    acc.push({ value: n.id, label: n.name });
    if (n.children && n.children.length) flattenCategories(n.children, acc);
  });
  return acc;
};

const MaterialList: React.FC = () => {
  const navigate = useNavigate();

  const materials = useMaterialStore((s) => s.materials);
  const categories = useMaterialStore((s) => s.categories);
  const filter = useMaterialStore((s) => s.filter);
  const setFilter = useMaterialStore((s) => s.setFilter);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const deleteMaterial = useMaterialStore((s) => s.deleteMaterial);
  const addMaterial = useMaterialStore((s) => s.addMaterial);

  const columns: ColumnDef<Material, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '物料编码' },
    { accessorKey: 'name', header: '物料名称' },
    { accessorKey: 'categoryName', header: '分类' },
    { accessorKey: 'specification', header: '规格型号' },
    { accessorKey: 'unit', header: '单位' },
    {
      accessorKey: 'materialType',
      header: '物料类型',
      cell: ({ row }) =>
        row.original.materialType
          ? (MATERIAL_TYPE_LABELS[row.original.materialType] ?? row.original.materialType)
          : '-',
    },
    {
      accessorKey: 'makeOrBuy',
      header: '自制外购',
      cell: ({ row }) =>
        row.original.makeOrBuy
          ? (MAKE_OR_BUY_LABELS[row.original.makeOrBuy] ?? row.original.makeOrBuy)
          : '-',
    },
    {
      accessorKey: 'currentStock',
      header: '当前库存',
      cell: ({ row }) => `${row.original.currentStock} ${row.original.unit}`,
    },
    {
      accessorKey: 'price',
      header: '单价',
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'lifecycleStatus',
      header: '生命周期',
      cell: ({ row }) => {
        const ls = row.original.lifecycleStatus;
        if (!ls) return <Typography variant="body2" color="text.secondary">-</Typography>;
        return (
          <Chip
            label={LIFECYCLE_STATUS_LABELS[ls] ?? ls}
            size="small"
            sx={{
              bgcolor: (LIFECYCLE_STATUS_COLORS[ls] ?? '#94A3B8') + '15',
              color: LIFECYCLE_STATUS_COLORS[ls] ?? '#94A3B8',
              fontWeight: 500,
              fontSize: '0.75rem',
            }}
          />
        );
      },
    },
  ], []);

  const distinctUnits = useMemo(
    () => [...new Set(materials.map((m) => m.unit).filter(Boolean))] as string[],
    [materials]
  );

  const categoryOptions = useMemo(
    () => [{ value: '', label: '全部' }, ...flattenCategories(categories)],
    [categories]
  );
  const unitOptions = useMemo(
    () => [{ value: '', label: '全部' }, ...distinctUnits.map((u) => ({ value: u, label: u }))],
    [distinctUnits]
  );

  const filterFields = [
    { name: 'code', label: '物料编码', type: 'text' as const },
    { name: 'name', label: '物料名称', type: 'text' as const },
    { name: 'categoryId', label: '分类', type: 'select' as const, options: categoryOptions },
    {
      name: 'materialType',
      label: '物料类型',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'raw', label: '原材料' },
        { value: 'semi', label: '半成品' },
        { value: 'finished', label: '成品' },
        { value: 'purchased', label: '外购' },
        { value: 'service', label: '服务' },
      ],
    },
    {
      name: 'makeOrBuy',
      label: '自制外购',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'make', label: '自制' },
        { value: 'buy', label: '外购' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'active', label: '启用' },
        { value: 'inactive', label: '停用' },
      ],
    },
    { name: 'unit', label: '单位', type: 'select' as const, options: unitOptions },
    { name: 'minPrice', label: '最低单价', type: 'text' as const },
    { name: 'maxPrice', label: '最高单价', type: 'text' as const },
  ];

  // 合并 FilterBar 提交的值到 store 的 filter（空值清除，价格转为 number）
  const applyFilter = (values: Record<string, unknown>) => {
    const next: MaterialFilter = { ...filter };
    (['code', 'name', 'categoryId', 'materialType', 'makeOrBuy', 'status', 'unit'] as const).forEach(
      (k) => {
        const v = values[k];
        if (v === '' || v === undefined || v === null) delete (next as Record<string, unknown>)[k];
        else (next as Record<string, unknown>)[k] = v;
      }
    );
    if (values.minPrice === '' || values.minPrice === undefined || values.minPrice === null) {
      delete next.minPrice;
    } else {
      next.minPrice = Number(values.minPrice);
    }
    if (values.maxPrice === '' || values.maxPrice === undefined || values.maxPrice === null) {
      delete next.maxPrice;
    } else {
      next.maxPrice = Number(values.maxPrice);
    }
    setFilter(next);
  };

  const filteredData = useMemo(() => {
    const kw = (filter.keyword || '').trim().toLowerCase();
    return materials.filter((m) => {
      if (filter.code && !m.code.includes(filter.code)) return false;
      if (filter.name && !m.name.includes(filter.name)) return false;
      if (filter.status && m.status !== filter.status) return false;
      if (filter.categoryId && m.categoryId !== filter.categoryId) return false;
      if (filter.materialType && m.materialType !== filter.materialType) return false;
      if (filter.makeOrBuy && m.makeOrBuy !== filter.makeOrBuy) return false;
      if (filter.unit && m.unit !== filter.unit) return false;
      if (typeof filter.minPrice === 'number' && m.price < filter.minPrice) return false;
      if (typeof filter.maxPrice === 'number' && m.price > filter.maxPrice) return false;
      if (kw) {
        const hit = [m.code, m.name, m.specification, m.model].some(
          (v) => v && v.toLowerCase().includes(kw)
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [materials, filter]);

  // ── 批量操作 ──
  const handleBatchEnable = (rows: Material[]) => {
    rows.forEach((m) => updateMaterial(m.id, { status: 'active' }));
  };

  const handleBatchDisable = (rows: Material[]) => {
    rows.forEach((m) => updateMaterial(m.id, { status: 'inactive' }));
  };

  const handleBatchDelete = (rows: Material[]) => {
    if (window.confirm(`确定删除选中的 ${rows.length} 条物料吗？此操作不可撤销。`)) {
      rows.forEach((m) => deleteMaterial(m.id));
    }
  };

  const batchActions: BatchAction<Material>[] = [
    {
      label: '批量启用',
      testId: 'batch-enable',
      color: 'success',
      icon: <CheckCircle fontSize="small" />,
      onClick: handleBatchEnable,
    },
    {
      label: '批量停用',
      testId: 'batch-disable',
      color: 'warning',
      icon: <Block fontSize="small" />,
      onClick: handleBatchDisable,
    },
    {
      label: '批量修改',
      testId: 'batch-edit',
      color: 'primary',
      icon: <Edit fontSize="small" />,
      onClick: (rows) => {
        selectedRowsRef.current = rows;
        handleBatchEditOpen(rows);
      },
    },
  ];

  // ── P1-05 物料模板 ──
  const [templateOpen, setTemplateOpen] = useState(false);
  const MATERIAL_TEMPLATES = [
    {
      id: 'template-steel-plate',
      name: '钢板',
      description: '钢板 Q235B',
      defaults: {
        categoryId: 'cat-001-1-1',
        categoryName: '钢板',
        materialType: 'raw' as MaterialType,
        makeOrBuy: 'buy' as MakeOrBuy,
        unit: '吨',
        specification: '10mm*1500mm*6000mm',
      },
    },
    {
      id: 'template-steel-pipe',
      name: '不锈钢管',
      description: '不锈钢管 304',
      defaults: {
        categoryId: 'cat-001-2-1',
        categoryName: '钢管',
        materialType: 'raw' as MaterialType,
        makeOrBuy: 'buy' as MakeOrBuy,
        unit: '根',
        specification: 'DN50*3.5mm*6m',
      },
    },
    {
      id: 'template-angle-steel',
      name: '角钢',
      description: '角钢 Q235',
      defaults: {
        categoryId: 'cat-001-3-2',
        categoryName: '角钢',
        materialType: 'raw' as MaterialType,
        makeOrBuy: 'buy' as MakeOrBuy,
        unit: '米',
        specification: '∠50*5',
      },
    },
  ];

  const handleCreateFromTemplate = (template: typeof MATERIAL_TEMPLATES[0]) => {
    const params = new URLSearchParams();
    params.set('template', template.name);
    if (template.defaults.categoryId) params.set('categoryId', template.defaults.categoryId);
    if (template.defaults.categoryName) params.set('categoryName', template.defaults.categoryName);
    if (template.defaults.materialType) params.set('materialType', template.defaults.materialType);
    if (template.defaults.makeOrBuy) params.set('makeOrBuy', template.defaults.makeOrBuy);
    if (template.defaults.unit) params.set('unit', template.defaults.unit);
    if (template.defaults.specification) params.set('specification', template.defaults.specification);
    navigate(`/material/create?${params.toString()}`);
    setTemplateOpen(false);
  };

  // ── P1-05 批量修改 ──
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [batchEditField, setBatchEditField] = useState<string>('status');
  const [batchEditValue, setBatchEditValue] = useState<string>('');
  const [batchEditSelected, setBatchEditSelected] = useState<Material[]>([]);

  const batchEditFieldOptions = [
    { value: 'categoryId', label: '分类', type: 'select' },
    { value: 'status', label: '状态', type: 'select' },
    { value: 'materialType', label: '物料类型', type: 'select' },
    { value: 'makeOrBuy', label: '自制外购', type: 'select' },
    { value: 'defaultVendorId', label: '默认供应商', type: 'text' },
  ];

  const getBatchEditValueOptions = () => {
    switch (batchEditField) {
      case 'status':
        return [{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }];
      case 'materialType':
        return [
          { value: 'raw', label: '原材料' },
          { value: 'semi', label: '半成品' },
          { value: 'finished', label: '成品' },
          { value: 'purchased', label: '外购' },
          { value: 'service', label: '服务' },
        ];
      case 'makeOrBuy':
        return [{ value: 'make', label: '自制' }, { value: 'buy', label: '外购' }];
      case 'categoryId':
        return flattenCategories(categories).map(c => ({ value: c.value, label: c.label }));
      default:
        return [];
    }
  };

  const handleBatchEditOpen = (rows: Material[]) => {
    if (rows.length === 0) return;
    setBatchEditSelected(rows);
    setBatchEditField('status');
    setBatchEditValue('');
    setBatchEditOpen(true);
  };

  const handleBatchEditConfirm = () => {
    if (!batchEditValue) return;
    const selectedField = batchEditFieldOptions.find(f => f.value === batchEditField);
    const isSelectField = selectedField?.type === 'select';
    const finalValue = isSelectField ? batchEditValue : batchEditValue;
    if (batchEditField === 'categoryId') {
      const catName = flattenCategories(categories).find(c => c.value === batchEditValue)?.label;
      batchEditSelected.forEach(m => updateMaterial(m.id, { categoryId: batchEditValue, categoryName: catName }));
    } else {
      batchEditSelected.forEach(m => updateMaterial(m.id, { [batchEditField]: finalValue } as Partial<Material>));
    }
    setBatchEditOpen(false);
  };

  // ── 数据表格行选取态（用于批量修改） ──
  const selectedRowsRef = React.useRef<Material[]>([]);

  // ── 列表内批量导入（替代原独立「导入导出」页）──
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let success = 0;
    let failed = 0;
    const now = new Date().toISOString();
    rows.forEach((row, i) => {
      const name = (row['物料名称'] ?? '').trim();
      const unit = (row['单位'] ?? '').trim();
      if (!name || !unit) {
        failed += 1;
        return;
      }
      const catName = (row['分类'] ?? '').trim();
      const cat = catName ? categories.find((c) => c.name === catName) : undefined;
      const code = (row['物料编码'] ?? '').trim() || `M${Date.now()}${i}`;
      try {
        addMaterial({
          id: `mat-${Date.now()}-${i}`,
          code,
          name,
          categoryId: cat?.id ?? '',
          categoryName: cat?.name,
          specification: (row['规格型号'] ?? '').trim() || undefined,
          unit,
          materialType: (row['物料类型'] as Material['materialType']) || undefined,
          makeOrBuy: (row['自制外购'] as Material['makeOrBuy']) || undefined,
          safetyStock: 0,
          minStock: 0,
          maxStock: 0,
          currentStock: Number(row['当前库存']) || 0,
          price: Number(row['单价']) || 0,
          currency: 'CNY',
          status: ((row['状态'] || 'active') as Material['status']),
          createdAt: now,
          updatedAt: now,
          createdBy: '',
          updatedBy: '',
        });
        success += 1;
      } catch {
        failed += 1;
      }
    });
    setImportResult({ success, failed });
  };

  return (
    <PageWrapper
      title="物料列表"
      actions={
        <ActionBar
          primary={{ label: '新增物料', onClick: () => navigate('/material/create') }}
        />
      }
    >
      {/* 模糊搜索 */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="模糊搜索：物料编码 / 名称 / 规格型号 / 型号"
          value={filter.keyword ?? ''}
          onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          inputProps={{ 'data-testid': 'material-keyword' }}
        />
      </Box>

      <FilterBar fields={filterFields} onSearch={applyFilter} listKey="material-list" columnConfigKey="material-list" />

      {/* P1-05 批量修改 & 从模板创建按钮 */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          data-testid="mat-batch-edit"
          onClick={() => handleBatchEditOpen(selectedRowsRef.current)}
          disabled={selectedRowsRef.current.length === 0}
        >
          批量修改 ({selectedRowsRef.current.length})
        </Button>
        <Button
          variant="outlined"
          data-testid="mat-create-from-template"
          onClick={() => setTemplateOpen(true)}
        >
          从模板创建
        </Button>
      </Stack>

      {importResult && (
        <Alert
          severity={importResult.failed > 0 ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setImportResult(null)}
        >
          导入完成：成功 {importResult.success} 条，失败 {importResult.failed} 条
        </Alert>
      )}
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        onImport={handleImport}
        columnConfigKey="material-list"
        batchActions={batchActions}
        onBatchDelete={handleBatchDelete}
        onRowClick={(row) => navigate(`/material/${row.id}`)}
        onView={(row) => navigate(`/material/${row.id}`)}
        onEdit={(row) => navigate(`/material/${row.id}/edit`)}
      />

      {/* P1-05 从模板创建对话框 */}
      <Dialog open={templateOpen} onClose={() => setTemplateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>从模板创建物料</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择一个预设模板，系统将预填物料表单中的关键字段。
          </Typography>
          <Stack spacing={1.5}>
            {MATERIAL_TEMPLATES.map(tpl => (
              <Paper
                key={tpl.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
                onClick={() => handleCreateFromTemplate(tpl)}
              >
                <Typography variant="subtitle2" fontWeight={600}>{tpl.name}</Typography>
                <Typography variant="caption" color="text.secondary">{tpl.description}</Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={`分类: ${tpl.defaults.categoryName}`} size="small" variant="outlined" />
                  <Chip label={`单位: ${tpl.defaults.unit}`} size="small" variant="outlined" />
                </Box>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>

      {/* P1-05 批量修改对话框 */}
      <Dialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>批量修改物料</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            已选择 {batchEditSelected.length} 条物料，选择要批量修改的字段并输入新值。
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>选择字段</InputLabel>
              <Select
                value={batchEditField}
                label="选择字段"
                onChange={(e) => { setBatchEditField(e.target.value); setBatchEditValue(''); }}
              >
                {batchEditFieldOptions.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {batchEditFieldOptions.find(f => f.value === batchEditField)?.type === 'select' ? (
              <FormControl fullWidth size="small">
                <InputLabel>新值</InputLabel>
                <Select
                  value={batchEditValue}
                  label="新值"
                  onChange={(e) => setBatchEditValue(e.target.value)}
                >
                  {getBatchEditValueOptions().map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                size="small"
                label="新值"
                value={batchEditValue}
                onChange={(e) => setBatchEditValue(e.target.value)}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleBatchEditConfirm} disabled={!batchEditValue}>
            确认修改
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default MaterialList;
