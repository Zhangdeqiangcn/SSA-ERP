import { useState } from 'react';
import {
  Box, Typography, Chip, Grid, Card, CardContent, Button, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { FlowTracker, DataTable } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { useFinanceStore } from '@/stores/financeStore';
import { useFinanceExtensionStore, convertCurrency, BASE_CURRENCY_CODE } from '@/stores/financeExtensionStore';
import { Invoice } from '@/types/finance';

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '待验证', color: 'warning' },
  verified: { label: '已验证', color: 'info' },
  paid: { label: '已付款', color: 'success' },
  cancelled: { label: '已作废', color: 'error' },
};

const TYPE_CONFIG: Record<string, string> = {
  vat_special: '增值税专用发票',
  vat_normal: '增值税普通发票',
  receipt: '收据',
};

export default function InvoiceList() {
  const { invoices, financeStats, addInvoice, generateVoucherFromInvoice } = useFinanceStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: '', invoiceType: 'vat_special', vendorName: '', vendorTaxNo: '',
    purchaseOrderNo: '', invoiceDate: new Date().toISOString().split('T')[0],
    amount: 0, taxRate: 13, status: 'submitted',
  });

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.invoiceNo.includes(search) || inv.vendorName.includes(search);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleViewDetail = (inv: Invoice) => {
    setSelectedInv(inv);
    setVoucherMsg(null);
    setDetailOpen(true);
  };

  const handleGenVoucher = () => {
    if (!selectedInv) return;
    const v = generateVoucherFromInvoice(selectedInv.id);
    setVoucherMsg(v ? `凭证已生成，凭证号：${v}` : '该发票已生成过凭证（无需重复生成）');
  };

  const columns: ColumnDef<Invoice, unknown>[] = [
    {
      id: 'invoiceNo',
      header: '发票号',
      accessorFn: (r) => r.invoiceNo,
      cell: ({ row }) => <Typography variant="body2" fontFamily="monospace">{row.original.invoiceNo}</Typography>,
    },
    {
      id: 'invoiceType',
      header: '发票类型',
      accessorFn: (r) => r.invoiceType,
      cell: ({ row }) => <Typography variant="caption">{TYPE_CONFIG[row.original.invoiceType]}</Typography>,
    },
    {
      id: 'vendorName',
      header: '供应商',
      accessorFn: (r) => r.vendorName,
      cell: ({ row }) => <>{row.original.vendorName}</>,
    },
    {
      id: 'purchaseOrderNo',
      header: '关联采购单',
      accessorFn: (r) => r.purchaseOrderNo,
      cell: ({ row }) => <Typography variant="body2" fontFamily="monospace">{row.original.purchaseOrderNo}</Typography>,
    },
    {
      id: 'invoiceDate',
      header: '发票日期',
      accessorFn: (r) => r.invoiceDate,
      cell: ({ row }) => <>{row.original.invoiceDate}</>,
    },
    {
      id: 'amount',
      header: '不含税金额',
      accessorFn: (r) => Number(r.amount) || 0,
      cell: ({ row }) => <Typography align="right">¥{row.original.amount.toLocaleString()}</Typography>,
    },
    {
      id: 'taxRate',
      header: '税率',
      accessorFn: (r) => Number(r.taxRate) || 0,
      cell: ({ row }) => <Typography align="right">{row.original.taxRate}%</Typography>,
    },
    {
      id: 'totalAmount',
      header: '含税总额',
      accessorFn: (r) => Number(r.totalAmount) || 0,
      cell: ({ row }) => <Typography align="right" fontWeight={600}>¥{row.original.totalAmount.toLocaleString()}</Typography>,
    },
    {
      id: 'currency',
      header: '币种 / 折合' + BASE_CURRENCY_CODE,
      accessorFn: (r) => r.currency || BASE_CURRENCY_CODE,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2">{(row.original.currency || BASE_CURRENCY_CODE)}</Typography>
          {row.original.currency && row.original.currency.toUpperCase() !== BASE_CURRENCY_CODE && (
            <Typography variant="caption" color="text.secondary">
              折合 ¥{convertCurrency(row.original.totalAmount, row.original.currency, exchangeRates).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (r) => r.status,
      cell: ({ row }) => {
        const sc = STATUS_CONFIG[row.original.status];
        return <Chip label={sc.label} color={sc.color} size="small" />;
      },
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); handleViewDetail(row.original); }}>详情</Button>
          {row.original.status === 'submitted' && (
            <Button size="small" startIcon={<CheckIcon />} color="success">验证</Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>发票管理</Typography>
        <FlowTracker module="invoice" currentStatus="iv_received" />
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>新建发票</Button>
      </Box>

      {/* KPI */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '应付账款总额', value: `¥${financeStats.totalPayable.toLocaleString()}`, color: '#1976d2', icon: <ReceiptIcon /> },
          { label: '本月开票金额', value: `¥${financeStats.thisMonthInvoice.toLocaleString()}`, color: '#388e3c', icon: <ReceiptIcon /> },
          { label: '待验证发票', value: `${financeStats.pendingVerify} 张`, color: '#f57c00', icon: <WarningAmberIcon /> },
          { label: '逾期应付款', value: `¥${financeStats.overdueAmount.toLocaleString()}`, color: '#d32f2f', icon: <WarningAmberIcon /> },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 筛选栏 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="搜索发票号/供应商"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 280 }}
        />
        <FormControl size="small" sx={{ width: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select value={statusFilter} label="状态" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="draft">草稿</MenuItem>
            <MenuItem value="submitted">待验证</MenuItem>
            <MenuItem value="verified">已验证</MenuItem>
            <MenuItem value="paid">已付款</MenuItem>
            <MenuItem value="cancelled">已作废</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 发票表格 */}
      <DataTable<Invoice>
        data={filtered}
        columns={columns}
        enableRowSelection={false}
        enablePagination
        enableSorting
        enableColumnFilter
        enableBlockSelect
        enableExport
        exportFormat="xlsx"
        enableImport
        onImport={(rows) => {
          rows.forEach((r) => {
            const amount = Number(r['不含税金额'] || 0);
            const taxRate = Number(r['税率'] || 0);
            const totalAmount = Number(r['含税总额'] || (amount * (1 + taxRate / 100)));
            const now = new Date().toISOString();
            addInvoice({
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              invoiceNo: r['发票号'] || `INV${Date.now()}`,
              invoiceType: (r['发票类型'] as Invoice['invoiceType']) || 'vat_special',
              status: (r['状态'] as Invoice['status']) || 'submitted',
              vendorName: r['供应商'] || '',
              vendorTaxNo: r['税号'] || '',
              purchaseOrderNo: r['关联采购单'] || '',
              invoiceDate: r['发票日期'] || now.slice(0, 10),
              receivedDate: r['收票日期'] || r['发票日期'] || now.slice(0, 10),
              amount,
              taxRate,
              taxAmount: +(amount * taxRate / 100).toFixed(2),
              totalAmount,
              currency: r['币种'] || BASE_CURRENCY_CODE,
              createdAt: now,
              updatedAt: now,
              createdBy: '导入',
              updatedBy: '导入',
            });
          });
        }}
        columnConfigKey="invoice-list"
      />

      {/* 详情弹框 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>发票详情 — {selectedInv?.invoiceNo}</DialogTitle>
        <DialogContent dividers>
          {selectedInv && (
            <Grid container spacing={2}>
              {[
                { label: '供应商', value: selectedInv.vendorName },
                { label: '税号', value: selectedInv.vendorTaxNo },
                { label: '发票类型', value: TYPE_CONFIG[selectedInv.invoiceType] },
                { label: '状态', value: STATUS_CONFIG[selectedInv.status].label },
                { label: '关联采购单', value: selectedInv.purchaseOrderNo },
                { label: '发票日期', value: selectedInv.invoiceDate },
                { label: '收票日期', value: selectedInv.receivedDate },
                { label: '不含税金额', value: `¥${selectedInv.amount.toLocaleString()}` },
                { label: '税率', value: `${selectedInv.taxRate}%` },
                { label: '税额', value: `¥${selectedInv.taxAmount.toLocaleString()}` },
                { label: '含税总额', value: `¥${selectedInv.totalAmount.toLocaleString()}` },
                ...(selectedInv.verifiedBy ? [{ label: '验证人', value: selectedInv.verifiedBy }] : []),
              ].map(row => (
                <Grid item xs={6} key={row.label}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {voucherMsg && (
            <Alert severity="success" sx={{ mr: 'auto' }} data-testid="voucher-msg">{voucherMsg}</Alert>
          )}
          <Button
            variant="contained"
            data-testid="gen-voucher"
            disabled={selectedInv?.voucherGenerated}
            onClick={handleGenVoucher}
          >
            生成凭证
          </Button>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 新建发票 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建发票</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="发票号" value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>发票类型</InputLabel>
                <Select label="发票类型" value={form.invoiceType}
                  onChange={(e) => setForm({ ...form, invoiceType: e.target.value })}>
                  <MenuItem value="vat_special">增值税专用发票</MenuItem>
                  <MenuItem value="vat_normal">增值税普通发票</MenuItem>
                  <MenuItem value="receipt">收据</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="供应商" value={form.vendorName}
                onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="税号" value={form.vendorTaxNo}
                onChange={(e) => setForm({ ...form, vendorTaxNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="关联采购单" value={form.purchaseOrderNo}
                onChange={(e) => setForm({ ...form, purchaseOrderNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="发票日期" type="date" InputLabelProps={{ shrink: true }}
                value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="不含税金额" type="number" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="税率%" type="number" value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => {
            const taxAmount = +(form.amount * form.taxRate / 100).toFixed(2);
            addInvoice({
              id: `inv-${Date.now()}`,
              invoiceNo: form.invoiceNo || `INV${Date.now()}`,
              invoiceType: form.invoiceType as Invoice['invoiceType'],
              status: form.status as Invoice['status'],
              vendorName: form.vendorName,
              vendorTaxNo: form.vendorTaxNo,
              purchaseOrderNo: form.purchaseOrderNo,
              invoiceDate: form.invoiceDate,
              receivedDate: form.invoiceDate,
              amount: form.amount,
              taxRate: form.taxRate,
              taxAmount,
              totalAmount: +(form.amount + taxAmount).toFixed(2),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: '当前用户',
              updatedBy: '当前用户',
            });
            setCreateOpen(false);
          }}>创建</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
