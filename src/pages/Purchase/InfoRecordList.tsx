import React, { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Snackbar, Alert, Autocomplete,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, ConfirmDialog } from '@/components/common';
import { usePurchaseInfoRecordStore } from '@/stores/purchaseInfoRecordStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import { PurchaseInfoRecord } from '@/types';
import { formatCurrency } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';

const STATUS_LABEL: Record<PurchaseInfoRecord['status'], string> = {
  active: '生效中',
  expired: '已过期',
  frozen: '已冻结',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'active', label: '生效中' },
  { value: 'expired', label: '已过期' },
  { value: 'frozen', label: '已冻结' },
];

const InfoRecordList: React.FC = () => {
  const { records, addRecord, updateRecord, deleteRecord, hydrateInfoRecords } = usePurchaseInfoRecordStore();
  const { vendors } = useVendorStore();
  const { materials } = useMaterialStore();

  // V3.76.0：采购信息记录迁 D1（purchase_info_records）——页面挂载从权威源水合（未登录自动跳过）
  useEffect(() => { void hydrateInfoRecords(); }, [hydrateInfoRecords]);

  // 筛选
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 删除
  const [deleteTarget, setDeleteTarget] = useState<PurchaseInfoRecord | null>(null);

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
    specification: '',
    unit: '',
    unitPrice: 0,
    currency: 'CNY',
    validFrom: '',
    validTo: '',
    minQty: 0,
    leadTime: 0,
    purchasingGroup: '',
    status: 'active' as PurchaseInfoRecord['status'],
  };
  const [form, setForm] = useState(emptyForm);

  // 提示
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  // 列定义
  const columns: ColumnDef<PurchaseInfoRecord, unknown>[] = useMemo(() => [
    { accessorKey: 'materialCode', header: '物料编码', meta: { searchable: true } },
    { accessorKey: 'vendorName', header: '供应商名称', meta: { searchable: true } },
    { accessorKey: 'vendorCode', header: '供应商编码', meta: { searchable: true } },
    { accessorKey: 'materialName', header: '物料名称', meta: { searchable: true } },
    { accessorKey: 'specification', header: '规格', meta: { searchable: true } },
    { accessorKey: 'unit', header: '单位', meta: { searchable: true } },
    {
      accessorKey: 'unitPrice',
      header: '单价',
      meta: { searchable: true },
      cell: ({ row }) => formatCurrency(row.original.unitPrice),
    },
    { accessorKey: 'currency', header: '币种', meta: { searchable: true } },
    { accessorKey: 'validFrom', header: '有效起', meta: { searchable: true }, size: 110 },
    { accessorKey: 'validTo', header: '有效止', meta: { searchable: true }, size: 110 },
    { accessorKey: 'minQty', header: '最小起订量', meta: { searchable: true } },
    { accessorKey: 'leadTime', header: '交货天数', meta: { searchable: true } },
    { accessorKey: 'purchasingGroup', header: '采购组', meta: { searchable: true } },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ], []);

  // 筛选字段（状态保留为显式 select；其余列由 FilterBar 依据列 meta.searchable 自动派生）
  const filterFields = [
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: STATUS_OPTIONS,
    },
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列（物料编码/供应商/物料/规格…），并按字段权限门控。
  const filteredData = useMemo(
    () => applyColumnFilters(records, columns, filterData, { module: 'purchase' }),
    [records, filterData, columns]
  );

  // 打开新增
  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  // 打开编辑
  const handleEdit = (row: PurchaseInfoRecord) => {
    setEditingId(row.id);
    setForm({
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      vendorCode: row.vendorCode || '',
      materialId: row.materialId,
      materialCode: row.materialCode || '',
      materialName: row.materialName || '',
      specification: row.specification || '',
      unit: row.unit || '',
      unitPrice: row.unitPrice,
      currency: row.currency || 'CNY',
      validFrom: row.validFrom || '',
      validTo: row.validTo || '',
      minQty: row.minQty || 0,
      leadTime: row.leadTime || 0,
      purchasingGroup: row.purchasingGroup || '',
      status: row.status,
    });
    setOpen(true);
  };

  // 删除
  const handleDelete = (row: PurchaseInfoRecord) => {
    setDeleteTarget(row);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteRecord(deleteTarget.id);
      setSnackbar({ open: true, message: `已删除采购信息记录`, severity: 'success' });
      setDeleteTarget(null);
    }
  };

  // 提交
  const handleSubmit = () => {
    if (!form.vendorId || !form.materialId || form.unitPrice <= 0) {
      setSnackbar({ open: true, message: '请填写供应商、物料和有效单价', severity: 'error' });
      return;
    }
    if (editingId) {
      updateRecord(editingId, form);
      setSnackbar({ open: true, message: '已更新采购信息记录', severity: 'success' });
    } else {
      const newRecord: PurchaseInfoRecord = {
        id: `ir-${Date.now()}`,
        ...form,
      };
      addRecord(newRecord);
      setSnackbar({ open: true, message: '已新增采购信息记录', severity: 'success' });
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
  const handleMaterialChange = (_: unknown, value: { id: string; code?: string; name: string; specification?: string; unit?: string } | null) => {
    if (value) {
      setForm((f) => ({
        ...f,
        materialId: value.id,
        materialCode: value.code || '',
        materialName: value.name,
        specification: value.specification || '',
        unit: value.unit || '',
      }));
    } else {
      setForm((f) => ({
        ...f,
        materialId: '',
        materialCode: '',
        materialName: '',
        specification: '',
        unit: '',
      }));
    }
  };

  const vendorOptions = vendors.map((v) => ({ id: v.id, name: v.name, code: (v as any).code }));
  const materialOptions = materials.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: (m as any).specification,
    unit: m.unit,
  }));

  const selectedVendor = vendorOptions.find((v) => v.id === form.vendorId) || null;
  const selectedMaterial = materialOptions.find((m) => m.id === form.materialId) || null;

  return (
    <PageWrapper
      title="采购信息记录"
      actions={
        <ActionBar
          primary={{ label: '新建记录', onClick: handleAdd }}
        />
      }
      data-testid="info-record-list"
    >
      <FilterBar fields={filterFields} columns={columns} module="purchase" onSearch={setFilterData} listKey="purchase-info-record-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enablePagination
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* 新增/编辑对话框 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? '编辑采购信息记录' : '新建采购信息记录'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              data-testid="ir-vendor"
              options={vendorOptions}
              getOptionLabel={(o) => `${o.name}${o.code ? ` (${o.code})` : ''}`}
              value={selectedVendor}
              onChange={handleVendorChange}
              renderInput={(params) => <TextField {...params} label="供应商" fullWidth />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <Autocomplete
              data-testid="ir-material"
              options={materialOptions}
              getOptionLabel={(o) => `${o.code || ''} ${o.name}${o.specification ? ` ${o.specification}` : ''}`}
              value={selectedMaterial}
              onChange={handleMaterialChange}
              renderInput={(params) => <TextField {...params} label="物料" fullWidth />}
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />
            <TextField
              data-testid="ir-price"
              label="单价"
              type="number"
              value={form.unitPrice || ''}
              onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              select
              label="币种"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              fullWidth
            >
              <MenuItem value="CNY">CNY (人民币)</MenuItem>
              <MenuItem value="USD">USD (美元)</MenuItem>
              <MenuItem value="EUR">EUR (欧元)</MenuItem>
              <MenuItem value="JPY">JPY (日元)</MenuItem>
            </TextField>
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
            <TextField
              label="最小起订量"
              type="number"
              value={form.minQty || ''}
              onChange={(e) => setForm({ ...form, minQty: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="交货天数"
              type="number"
              value={form.leadTime || ''}
              onChange={(e) => setForm({ ...form, leadTime: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="采购组"
              value={form.purchasingGroup}
              onChange={(e) => setForm({ ...form, purchasingGroup: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="状态"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as PurchaseInfoRecord['status'] })}
              fullWidth
            >
              <MenuItem value="active">生效中</MenuItem>
              <MenuItem value="expired">已过期</MenuItem>
              <MenuItem value="frozen">已冻结</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            data-testid="ir-submit"
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
        content={`确定删除供应商"${deleteTarget?.vendorName}"对物料"${deleteTarget?.materialName}"的价格记录吗？此操作不可撤销。`}
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

export default InfoRecordList;
