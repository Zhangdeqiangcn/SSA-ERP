import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Box, TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography, Chip, Paper, Alert, Snackbar } from '@mui/material';
import { Search, CheckCircle, Block, Edit } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, ActionBar, StatusBadge, BatchAction,
  ConfirmDialog, BatchEditDialog, type BatchEditField,
} from '@/components/common';
import { useMaterialStore } from '@/stores';
import { useCloudHydrating } from '@/stores/syncStatusStore';
import { Material, MaterialType, MakeOrBuy, MaterialFilter, MaterialCategory, LifecycleStatus } from '@/types';
import { formatCurrency } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';

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

// 生命周期展示统一走 StatusBadge（审计报告 P0 整改：删本地 hex 副本）
const LIFECYCLE_STATUS_MAP: Record<LifecycleStatus, string> = {
  draft: 'lifecycle_draft',
  active: 'lifecycle_active',
  phasing_out: 'lifecycle_phasing_out',
  obsolete: 'lifecycle_obsolete',
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

// ── 批量导入：表头 → 字段 别名映射（中英文均可） ──
const MATERIAL_IMPORT_ALIASES: Record<string, string> = {
  物料编码: 'code', 编码: 'code', 编号: 'code', code: 'code',
  物料名称: 'name', 名称: 'name', name: 'name',
  分类: 'categoryName',
  规格型号: 'specification', specification: 'specification',
  型号: 'model', model: 'model',
  单位: 'unit', unit: 'unit',
  物料类型: 'materialType', 类型: 'materialType', type: 'materialType',
  自制外购: 'makeOrBuy',
  当前库存: 'currentStock',
  单价: 'price', 价格: 'price', price: 'price',
  状态: 'status', status: 'status',
  备注: 'remarks', remarks: 'remarks',
  默认供应商: 'defaultVendorName',
};
const MATERIAL_TYPE_MAP: Record<string, MaterialType> = {
  原材料: 'raw', 半成品: 'semi', 成品: 'finished', 外购: 'purchased', 服务: 'service',
  raw: 'raw', semi: 'semi', finished: 'finished', purchased: 'purchased', service: 'service',
};
const MAKE_OR_BUY_MAP: Record<string, MakeOrBuy> = {
  自制: 'make', 外购: 'buy', make: 'make', buy: 'buy',
};
const MATERIAL_STATUS_MAP: Record<string, 'active' | 'inactive'> = {
  启用: 'active', 停用: 'inactive', active: 'active', inactive: 'inactive',
};

/** 批量修改可改字段（对应详情页可编辑项，均为 Material 真实字段） */
const MATERIAL_BATCH_FIELDS: BatchEditField[] = [
  {
    key: 'status', label: '状态', type: 'select',
    options: [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '停用' },
    ],
  },
  { key: 'name', label: '名称', type: 'text' },
  { key: 'specification', label: '规格型号', type: 'text' },
  { key: 'defaultVendorName', label: '默认供应商', type: 'text' },
  { key: 'remarks', label: '备注', type: 'text' },
];

const MaterialList: React.FC = () => {
  const hydrating = useCloudHydrating();
  const navigate = useNavigate();

  const materials = useMaterialStore((s) => s.materials);
  const categories = useMaterialStore((s) => s.categories);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const deleteMaterial = useMaterialStore((s) => s.deleteMaterial);
  const addMaterial = useMaterialStore((s) => s.addMaterial);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  const columns: ColumnDef<Material, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '物料编码', meta: { searchable: true } },
    { accessorKey: 'name', header: '物料名称', meta: { searchable: true } },
    { accessorKey: 'categoryName', header: '分类', meta: { searchable: true } },
    { accessorKey: 'specification', header: '规格型号', meta: { searchable: true } },
    { accessorKey: 'unit', header: '单位', meta: { searchable: true } },
    {
      accessorKey: 'materialType',
      header: '物料类型',
      meta: { searchable: true },
      cell: ({ row }) =>
        row.original.materialType
          ? (MATERIAL_TYPE_LABELS[row.original.materialType] ?? row.original.materialType)
          : '-',
    },
    {
      accessorKey: 'makeOrBuy',
      header: '自制外购',
      meta: { searchable: true },
      cell: ({ row }) =>
        row.original.makeOrBuy
          ? (MAKE_OR_BUY_LABELS[row.original.makeOrBuy] ?? row.original.makeOrBuy)
          : '-',
    },
    {
      accessorKey: 'currentStock',
      header: '当前库存',
      meta: { searchable: true },
      cell: ({ row }) => `${row.original.currentStock} ${row.original.unit}`,
    },
    {
      accessorKey: 'price',
      header: '单价',
      meta: { searchable: true },
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'lifecycleStatus',
      header: '生命周期',
      meta: { searchable: true },
      cell: ({ row }) => {
        const ls = row.original.lifecycleStatus;
        if (!ls) return <Typography variant="body2" color="text.secondary">-</Typography>;
        return <StatusBadge status={LIFECYCLE_STATUS_MAP[ls] || ls} />;
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
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列（物料编码/名称/分类/规格/单位/类型/自制外购/库存/单价/状态/生命周期），
  // 并按字段权限门控。默认显 5 项、其余『更多筛选』可展开。
  const filteredData = useMemo(
    () => applyColumnFilters(materials, columns, filterData, { module: 'material' }),
    [materials, filterData, columns]
  );

  // ── 批量操作 ──
  const handleBatchEnable = (rows: Material[]) => {
    rows.forEach((m) => updateMaterial(m.id, { status: 'active' }));
  };

  const handleBatchDisable = (rows: Material[]) => {
    rows.forEach((m) => updateMaterial(m.id, { status: 'inactive' }));
  };

  // ── 删除（单行 / 批量共用同一确认框）──
  const [deleteTargets, setDeleteTargets] = useState<Material[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // ── 批量修改 ──
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<Material[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const confirmDelete = async () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const m of targets) {
      await deleteMaterial(m.id);
    }
    setSnackbar({ open: true, message: `已删除 ${targets.length} 条物料`, severity: 'success' });
  };

  const confirmBatchEdit = async (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const m of targets) {
      await updateMaterial(m.id, updates as Partial<Material>);
    }
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 条物料`, severity: 'success' });
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
      onClick: (rows) => { selectedRowsRef.current = rows; setPendingBatchEdit(rows); setBatchEditOpen(true); },
    },
    {
      label: '批量删除',
      testId: 'batch-delete',
      color: 'error',
      icon: <Block fontSize="small" />,
      onClick: (rows) => { setDeleteTargets(rows); setDeleteOpen(true); },
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

  // ── 数据表格行选取态（用于「批量修改」独立按钮） ──
  const selectedRowsRef = React.useRef<Material[]>([]);

  // ── 列表内批量导入（按表头映射字段，有编码则更新、无编码则新建）──
  const handleImport = async (rows: Record<string, string>[], _headers: string[]) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let created = 0;
    let updated = 0;
    let seq = materials.length;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = MATERIAL_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      if (!mapped.name && !mapped.code) continue;

      const materialType = MATERIAL_TYPE_MAP[mapped.materialType] || undefined;
      const makeOrBuy = MAKE_OR_BUY_MAP[mapped.makeOrBuy] || undefined;
      const status = MATERIAL_STATUS_MAP[mapped.status] || 'active';
      const existing = mapped.code ? materials.find((m) => m.code === mapped.code) : undefined;

      if (existing) {
        await updateMaterial(existing.id, {
          ...(mapped.name ? { name: mapped.name } : {}),
          ...(mapped.categoryName ? { categoryName: mapped.categoryName } : {}),
          ...(mapped.specification ? { specification: mapped.specification } : {}),
          ...(mapped.model ? { model: mapped.model } : {}),
          ...(mapped.unit ? { unit: mapped.unit } : {}),
          ...(materialType ? { materialType } : {}),
          ...(makeOrBuy ? { makeOrBuy } : {}),
          ...(mapped.currentStock ? { currentStock: Number(mapped.currentStock) } : {}),
          ...(mapped.price ? { price: Number(mapped.price) } : {}),
          ...(mapped.status ? { status } : {}),
          ...(mapped.remarks ? { remarks: mapped.remarks } : {}),
          ...(mapped.defaultVendorName ? { defaultVendorName: mapped.defaultVendorName } : {}),
        });
        updated += 1;
      } else {
        seq += 1;
        const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const code = mapped.code || `MAT${ymd}${String(seq).padStart(4, '0')}`;
        // 依分类名称解析分类（无则留空，避免构造不完整对象）
        const cat = mapped.categoryName ? categories.find((c) => c.name === mapped.categoryName) : undefined;
        await addMaterial({
          id: `mat-${Date.now()}-${seq}`,
          code,
          name: mapped.name || code,
          categoryId: cat?.id ?? '',
          categoryName: cat?.name,
          specification: mapped.specification,
          model: mapped.model,
          unit: mapped.unit || '',
          materialType,
          makeOrBuy,
          safetyStock: 0,
          minStock: 0,
          maxStock: 0,
          currentStock: Number(mapped.currentStock) || 0,
          price: Number(mapped.price) || 0,
          currency: 'CNY',
          status,
          remarks: mapped.remarks,
          createdAt: now,
          updatedAt: now,
          createdBy: '批量导入',
          updatedBy: '批量导入',
        });
        created += 1;
      }
    }
    setSnackbar({
      open: true,
      message: `导入完成：新增 ${created} 条，更新 ${updated} 条`,
      severity: created + updated > 0 ? 'success' : 'info',
    });
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
      <FilterBar fields={filterFields} columns={columns} module="material" onSearch={setFilterData} listKey="material-list" columnConfigKey="material-list" />

      {/* P1-05 批量修改 & 从模板创建按钮 */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          data-testid="mat-batch-edit"
          onClick={() => { setPendingBatchEdit(selectedRowsRef.current); setBatchEditOpen(true); }}
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

      <DataTable
        data={filteredData}
        columns={columns}
        loading={hydrating && filteredData.length === 0}
        emptyText="暂无物料，可点击「新增」或「从模板创建」开始"
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="物料"
        onImport={handleImport}
        columnConfigKey="material-list"
        codeColumnId="code"
        batchActions={batchActions}
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

      {/* 批量删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除物料「${deleteTargets[0]?.name}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 条物料吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改物料"
        count={pendingBatchEdit.length}
        fields={MATERIAL_BATCH_FIELDS}
        onConfirm={confirmBatchEdit}
        onCancel={() => { setBatchEditOpen(false); setPendingBatchEdit([]); }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default MaterialList;
