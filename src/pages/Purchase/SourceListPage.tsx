import React, { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Snackbar, Alert, Autocomplete, Switch, FormControlLabel, Chip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, ConfirmDialog } from '@/components/common';
import { useSourceListStore } from '@/stores/sourceListStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import { SourceListItem } from '@/types';

const STATUS_LABEL: Record<SourceListItem['status'], string> = {
  active: '生效中',
  inactive: '已失效',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'active', label: '生效中' },
  { value: 'inactive', label: '已失效' },
];

const SourceListPage: React.FC = () => {
  const { items, addItem, updateItem, deleteItem } = useSourceListStore();
  const { vendors } = useVendorStore();
  const { materials } = useMaterialStore();

  // 筛选
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<SourceListItem | null>(null);

  // 对话框
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 表单
  const emptyForm = {
    vendorId: '',
    vendorName: '',
    vendorCode: '',
    materialId: '',
    materialCode: '',
    materialName: '',
    priority: 1,
    validFrom: '',
    validTo: '',
    fixedVendor: false,
    quotaPercentage: 0,
    status: 'active' as SourceListItem['status'],
    remarks: '',
  };
  const [form, setForm] = useState(emptyForm);

  // 提示
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  // 列定义
  const columns: ColumnDef<SourceListItem, unknown>[] = useMemo(() => [
    { accessorKey: 'materialName', header: '物料名称' },
    {
      accessorKey: 'materialCode',
      header: '物料编码',
      size: 130,
      cell: ({ row }) => (
        <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          {row.original.materialCode || '-'}
        </Box>
      ),
    },
    { accessorKey: 'vendorName', header: '供应商名称' },
    { accessorKey: 'priority', header: '优先级' },
    { accessorKey: 'validFrom', header: '有效起', size: 110 },
    { accessorKey: 'validTo', header: '有效止', size: 110 },
    {
      accessorKey: 'fixedVendor',
      header: '固定货源',
      cell: ({ row }) => (
        <Chip
          label={row.original.fixedVendor ? '是' : '否'}
          size="small"
          color={row.original.fixedVendor ? 'primary' : 'default'}
          variant={row.original.fixedVendor ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      accessorKey: 'quotaPercentage',
      header: '配额%',
      cell: ({ row }) => (row.original.quotaPercentage != null ? `${row.original.quotaPercentage}%` : '-'),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ], []);

  // 筛选字段
  const filterFields = [
    { name: 'keyword', label: '关键词（物料名称/物料编码/供应商）', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: STATUS_OPTIONS,
    },
  ];

  // 数据筛选
  const filteredData = useMemo(() => {
    let data = [...items];
    if (filterData.keyword) {
      const kw = (filterData.keyword as string).toLowerCase();
      data = data.filter(
        (r) =>
          r.vendorName?.toLowerCase().includes(kw) ||
          r.materialName?.toLowerCase().includes(kw) ||
          r.vendorCode?.toLowerCase().includes(kw) ||
          r.materialCode?.toLowerCase().includes(kw)
      );
    }
    if (filterData.status) {
      data = data.filter((r) => r.status === filterData.status);
    }
    return data;
  }, [items, filterData]);

  // 打开新增
  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  // 打开编辑
  const handleEdit = (row: SourceListItem) => {
    setEditingId(row.id);
    setForm({
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      vendorCode: row.vendorCode || '',
      materialId: row.materialId,
      materialCode: row.materialCode || '',
      materialName: row.materialName || '',
      priority: row.priority,
      validFrom: row.validFrom || '',
      validTo: row.validTo || '',
      fixedVendor: row.fixedVendor,
      quotaPercentage: row.quotaPercentage ?? 0,
      status: row.status,
      remarks: row.remarks || '',
    });
    setOpen(true);
  };

  // 删除
  const handleDelete = (row: SourceListItem) => {
    setDeleteTarget(row);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteItem(deleteTarget.id);
      setSnackbar({ open: true, message: `已删除货源清单`, severity: 'success' });
      setDeleteTarget(null);
    }
  };

  // 提交
  const handleSubmit = () => {
    if (!form.vendorId || !form.materialId) {
      setSnackbar({ open: true, message: '请选择供应商和物料', severity: 'error' });
      return;
    }
    if (form.quotaPercentage < 0 || form.quotaPercentage > 100) {
      setSnackbar({ open: true, message: '配额百分比应在 0-100 之间', severity: 'error' });
      return;
    }
    if (editingId) {
      updateItem(editingId, form);
      setSnackbar({ open: true, message: '已更新货源清单', severity: 'success' });
    } else {
      const newItem: SourceListItem = {
        id: `sl-${Date.now()}`,
        ...form,
      };
      addItem(newItem);
      setSnackbar({ open: true, message: '已新增货源清单', severity: 'success' });
    }
    setOpen(false);
  };

  // 供应商选择时自动填充
  const handleVendorChange = (_: unknown, value: { id: string; name: string; code?: string } | null) => {
    if (value) {
      setForm((f) => ({
        ...f,
        vendorId: value.id,
        vendorName: value.name,
        vendorCode: value.code || '',
      }));
    } else {
      setForm((f) => ({ ...f, vendorId: '', vendorName: '', vendorCode: '' }));
    }
  };

  // 物料选择时自动填充
  const handleMaterialChange = (_: unknown, value: { id: string; code?: string; name: string } | null) => {
    if (value) {
      setForm((f) => ({
        ...f,
        materialId: value.id,
        materialCode: value.code || '',
        materialName: value.name,
      }));
    } else {
      setForm((f) => ({ ...f, materialId: '', materialCode: '', materialName: '' }));
    }
  };

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name, code: (v as any).code }));
  const materialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
  }));

  const selectedVendor = vendorOptions.find((v) => v.id === form.vendorId) || null;
  const selectedMaterial = materialOptions.find((m) => m.id === form.materialId) || null;

  return (
    <PageWrapper
      title="货源清单"
      actions={
        <ActionBar
          primary={{ label: '新建货源', onClick: handleAdd }}
        />
      }
      data-testid="source-list"
    >
      <FilterBar fields={filterFields} onSearch={setFilterData} listKey="source-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enablePagination
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增/编辑对话框 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? '编辑货源清单' : '新建货源清单'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              data-testid="sl-material"
              options={materialOptions}
              getOptionLabel={(o) => `${o.code || ''} ${o.name}`}
              value={selectedMaterial}
              onChange={handleMaterialChange}
              renderInput={(params) => <TextField {...params} label="物料" fullWidth />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <Autocomplete
              data-testid="sl-vendor"
              options={vendorOptions}
              getOptionLabel={(o) => `${o.name}${o.code ? ` (${o.code})` : ''}`}
              value={selectedVendor}
              onChange={handleVendorChange}
              renderInput={(params) => <TextField {...params} label="供应商" fullWidth />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <TextField
              data-testid="sl-priority"
              label="优先级"
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 1, max: 99 }}
              helperText="1-99，越小越优先"
            />
            <TextField
              label="有效起"
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="有效止"
              type="date"
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.fixedVendor}
                  onChange={(e) => setForm({ ...form, fixedVendor: e.target.checked })}
                />
              }
              label="固定货源"
            />
            <TextField
              label="配额百分比"
              type="number"
              value={form.quotaPercentage ?? ''}
              onChange={(e) => setForm({ ...form, quotaPercentage: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
              helperText="0-100"
            />
            <TextField
              select
              label="状态"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as SourceListItem['status'] })}
              fullWidth
            >
              <MenuItem value="active">生效中</MenuItem>
              <MenuItem value="inactive">已失效</MenuItem>
            </TextField>
            <TextField
              label="备注"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            data-testid="sl-submit"
            variant="contained"
            onClick={handleSubmit}
          >
            {editingId ? '保存' : '新建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        type="danger"
        title="确认删除"
        content={`确定删除供应商"${deleteTarget?.vendorName}"对物料"${deleteTarget?.materialName}"的货源清单吗？此操作不可撤销。`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="确认删除"
      />

      {/* 提示 */}
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

export default SourceListPage;
