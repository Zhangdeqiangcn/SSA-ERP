import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Stack, Typography,
  TextField, Autocomplete, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, IconButton,
} from '@mui/material';
import { Add, FilterList, Edit, Block, Close } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, FlowTracker } from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { PriceListItem } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { ColumnDef } from '@tanstack/react-table';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '有效', color: 'success' },
  expired: { label: '已过期', color: 'default' },
  frozen: { label: '已冻结', color: 'error' },
};

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const PriceList: React.FC = () => {
  const { priceList, addPriceListItem, updatePriceListItem } = usePriceStore();
  const navigate = useNavigate();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [vendorFilter, setVendorFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [materialCode, setMaterialCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [specification, setSpecification] = useState('');
  const [unit, setUnit] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [effectiveDate, setEffectiveDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [status, setStatus] = useState<'active' | 'expired' | 'frozen'>('active');

  const columns: ColumnDef<PriceListItem, unknown>[] = useMemo(() => [
    { accessorKey: 'materialCode', header: '物料编码', size: 150 },
    { accessorKey: 'materialName', header: '物料名称', size: 150 },
    { accessorKey: 'specification', header: '规格', size: 180 },
    { accessorKey: 'unit', header: '单位', size: 60 },
    { accessorKey: 'vendorName', header: '供应商', size: 180 },
    {
      accessorKey: 'unitPrice',
      header: '单价',
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          {formatCurrency(row.original.unitPrice)}
        </Typography>
      ),
    },
    { accessorKey: 'currency', header: '币种', size: 60 },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip label={STATUS_MAP[row.original.status]?.label} size="small"
          color={STATUS_MAP[row.original.status]?.color as any || 'default'} />
      ),
      size: 80,
    },
    {
      accessorKey: 'writtenBack',
      header: '主数据回写',
      cell: ({ row }) => (
        row.original.writtenBack ? (
          <Chip label="已回写主数据" size="small" color="success" variant="outlined" />
        ) : (
          <Chip label="待回写" size="small" color="default" variant="outlined" />
        )
      ),
      size: 110,
    },
    {
      accessorKey: 'effectiveDate',
      header: '生效日期',
      cell: ({ row }) => formatDate(row.original.effectiveDate),
    },
    {
      accessorKey: 'expiryDate',
      header: '失效日期',
      cell: ({ row }) => row.original.expiryDate ? formatDate(row.original.expiryDate) : '长期有效',
    },
    { accessorKey: 'paymentTerms', header: '付款条件', cell: ({ row }) => row.original.paymentTerms || '-' },
    { accessorKey: 'deliveryDays', header: '交期(天)', cell: ({ row }) => `${row.original.deliveryDays}天` },
    { accessorKey: 'sourceApprovalNo', header: '来源审批单', size: 150 },
  ], []);

  const filterFields = [
    { name: 'materialCode', label: '物料编码', type: 'text' as const },
    { name: 'materialName', label: '物料名称', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'active', label: '有效' },
        { value: 'expired', label: '已过期' },
        { value: 'frozen', label: '已冻结' },
      ],
    },
    { name: 'vendorName', label: '供应商', type: 'text' as const },
  ];

  const filteredData = useMemo(() => {
    let data = [...priceList];
    if (filterData.materialCode) data = data.filter(r => r.materialCode.includes(filterData.materialCode as string));
    if (filterData.materialName) data = data.filter(r => r.materialName.includes(filterData.materialName as string));
    if (filterData.status) data = data.filter(r => r.status === filterData.status);
    if (filterData.vendorName) data = data.filter(r => r.vendorName.includes(filterData.vendorName as string));
    return data;
  }, [filterData]);

  const vendorOptions = useMemo(() =>
    [...new Set(priceList.map(p => p.vendorName))].map(name => ({ label: name, value: name })),
  []);

  const openCreate = () => {
    setEditingId(null);
    setMaterialCode(''); setMaterialName(''); setSpecification(''); setUnit('');
    setVendorName(''); setUnitPrice(''); setCurrency('CNY'); setEffectiveDate(todayStr());
    setExpiryDate(''); setPaymentTerms(''); setDeliveryDays(''); setStatus('active');
    setOpen(true);
  };
  const openEdit = (row: PriceListItem) => {
    setEditingId(row.id);
    setMaterialCode(row.materialCode); setMaterialName(row.materialName); setSpecification(row.specification || '');
    setUnit(row.unit || ''); setVendorName(row.vendorName); setUnitPrice(String(row.unitPrice));
    setCurrency(row.currency); setEffectiveDate(row.effectiveDate); setExpiryDate(row.expiryDate || '');
    setPaymentTerms(row.paymentTerms || ''); setDeliveryDays(String(row.deliveryDays || '')); setStatus(row.status);
    setOpen(true);
  };

  const handleSave = () => {
    const ts = nowStr();
    const base = {
      materialCode,
      materialName,
      specification,
      unit,
      vendorId: '',
      vendorName,
      unitPrice: Number(unitPrice) || 0,
      currency,
      effectiveDate,
      expiryDate: expiryDate || undefined,
      sourceApprovalId: '',
      sourceApprovalNo: '手工录入',
      paymentTerms: paymentTerms || undefined,
      deliveryDays: Number(deliveryDays) || 0,
      minOrderQty: undefined,
      status,
      remarks: undefined,
    };
    if (editingId) {
      updatePriceListItem(editingId, base);
    } else {
      addPriceListItem({
        ...base,
        id: `pl-${Date.now()}`,
        materialId: materialCode || `manual-${Date.now()}`,
        createdAt: ts,
        updatedAt: ts,
        createdBy: '系统',
      });
    }
    setOpen(false);
  };

  return (
    <PageWrapper
      title="价目表"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-approval" currentStatus="pa_approved" label="流程追踪" />
          <ActionBar
            primary={{ label: '手工录入', onClick: openCreate, icon: <Add /> }}
          />
        </Box>
      }
    >
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="物料搜索"
          value={materialFilter}
          onChange={e => setMaterialFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <Autocomplete
          size="small"
          options={vendorOptions}
          value={vendorOptions.find(o => o.value === vendorFilter) || null}
          onChange={(_, newVal) => setVendorFilter(newVal?.value || '')}
          renderInput={(params) => <TextField {...params} label="供应商筛选" />}
          sx={{ minWidth: 200 }}
        />
        <Button variant="outlined" size="small" startIcon={<FilterList />}
          onClick={() => {
            setFilterData(prev => ({ ...prev, vendorName: vendorFilter, materialName: materialFilter }));
          }}>
          筛选
        </Button>
      </Box>

      <DataTable
        data={filteredData}
        columns={columns}
        enablePagination
        pageSize={15}
        enableExport
        onView={(row) => openEdit(row as PriceListItem)}
        onEdit={(row) => openEdit(row as PriceListItem)}
      />

      {/* 统计信息 */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" spacing={4}>
          <Box>
            <Typography variant="caption" color="text.secondary">有效价格项</Typography>
            <Typography variant="h6" color="success.main">
              {priceList.filter(p => p.status === 'active').length}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">涉及供应商</Typography>
            <Typography variant="h6">
              {new Set(priceList.map(p => p.vendorName)).size}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">涉及物料</Typography>
            <Typography variant="h6">
              {new Set(priceList.map(p => p.materialCode)).size}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">已回写主数据</Typography>
            <Typography variant="h6" color="success.main">
              {priceList.filter(p => p.writtenBack).length}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* 手工录入 / 编辑弹窗 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {editingId ? '编辑价目表项' : '手工录入价目表项'}
            <IconButton onClick={() => setOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="物料编码" value={materialCode} onChange={e => setMaterialCode(e.target.value)} />
              <TextField fullWidth label="物料名称" value={materialName} onChange={e => setMaterialName(e.target.value)} data-testid="price-material" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="规格" value={specification} onChange={e => setSpecification(e.target.value)} />
              <TextField fullWidth label="单位" value={unit} onChange={e => setUnit(e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="供应商名称" value={vendorName} onChange={e => setVendorName(e.target.value)} data-testid="price-vendor" />
              <TextField fullWidth label="单价" type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} data-testid="price-unitprice" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select fullWidth label="币种" value={currency} onChange={e => setCurrency(e.target.value)}>
                <MenuItem value="CNY">CNY</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </TextField>
              <TextField select fullWidth label="状态" value={status} onChange={e => setStatus(e.target.value as any)}>
                <MenuItem value="active">有效</MenuItem>
                <MenuItem value="expired">已过期</MenuItem>
                <MenuItem value="frozen">已冻结</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="生效日期" type="date" value={effectiveDate}
                onChange={e => setEffectiveDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField fullWidth label="失效日期" type="date" value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="付款条件" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
              <TextField fullWidth label="交期(天)" type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={!materialName.trim() || !vendorName.trim() || !(Number(unitPrice) > 0)}
            data-testid="price-save">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default PriceList;
