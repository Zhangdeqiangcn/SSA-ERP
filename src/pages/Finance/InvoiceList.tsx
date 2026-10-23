import { useState, useMemo } from 'react';
import {
  Box, Typography, Chip, Grid, Card, CardContent, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { FlowTracker, DataTable, StatusBadge, FilterBar } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { applyColumnFilters } from '@/utils/listSearch';
import { useFinanceStore } from '@/stores/financeStore';
import { useFinanceExtensionStore, convertCurrency, BASE_CURRENCY_CODE } from '@/stores/financeExtensionStore';
import { Invoice, InvoiceItem } from '@/types/finance';
import { todayLocal } from '@/utils/format';

// 发票状态 → 集中 statusConfig key（draft / paid 复用通用 key）
const INV_STATUS_KEY: Record<string, string> = {
  draft: 'draft',
  submitted: 'inv_submitted',
  verified: 'inv_verified',
  paid: 'paid',
  cancelled: 'inv_cancelled',
};

const TYPE_CONFIG: Record<string, string> = {
  vat_special: '增值税专用发票',
  vat_normal: '增值税普通发票',
  receipt: '收据',
};

export default function InvoiceList() {
  const { invoices, financeStats, addInvoice, generateVoucherFromInvoice } = useFinanceStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: '', invoiceType: 'vat_special', vendorName: '', vendorTaxNo: '',
    purchaseOrderNo: '', invoiceDate: todayLocal(),
    amount: 0, taxRate: 13, status: 'submitted',
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // V3.62.0 边界②：发票明细行编辑器
  const blankItem = (): InvoiceItem => ({
    materialName: '', materialCode: '', quantity: 0, unit: '', unitPrice: 0, taxRate: 13,
    amount: 0, taxAmount: 0, totalAmount: 0,
  });
  const recomputeItem = (it: InvoiceItem): InvoiceItem => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const rate = Number(it.taxRate) || 0;
    const amount = Math.round(qty * price * 100) / 100;
    const taxAmount = Math.round(amount * rate / 100 * 100) / 100;
    const totalAmount = Math.round((amount + taxAmount) * 100) / 100;
    return { ...it, amount, taxAmount, totalAmount };
  };
  const updateItem = (idx: number, patch: Partial<InvoiceItem>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? recomputeItem({ ...it, ...patch }) : it)));
  const addItem = () => setItems(prev => [...prev, blankItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const resetItems = () => setItems([]);

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
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2" fontFamily="monospace">{row.original.invoiceNo}</Typography>,
    },
    {
      id: 'invoiceType',
      header: '发票类型',
      accessorFn: (r) => r.invoiceType,
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'vat_special', label: '增值税专用发票' },
          { value: 'vat_normal', label: '增值税普通发票' },
          { value: 'receipt', label: '收据' },
        ],
      },
      cell: ({ row }) => <Typography variant="caption">{TYPE_CONFIG[row.original.invoiceType]}</Typography>,
    },
    {
      id: 'vendorName',
      header: '供应商',
      accessorFn: (r) => r.vendorName,
      meta: { searchable: true },
      cell: ({ row }) => <>{row.original.vendorName}</>,
    },
    {
      id: 'purchaseOrderNo',
      header: '关联采购单',
      accessorFn: (r) => r.purchaseOrderNo,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2" fontFamily="monospace">{row.original.purchaseOrderNo}</Typography>,
    },
    {
      id: 'invoiceDate',
      header: '发票日期',
      accessorFn: (r) => r.invoiceDate,
      meta: { searchable: true },
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
      meta: { searchable: true },
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
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'draft', label: '草稿' },
          { value: 'submitted', label: '待验证' },
          { value: 'verified', label: '已验证' },
          { value: 'paid', label: '已付款' },
          { value: 'cancelled', label: '已作废' },
        ],
      },
      cell: ({ row }) => <StatusBadge status={INV_STATUS_KEY[row.original.status]} />,
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

  const filtered = useMemo(
    () => applyColumnFilters(invoices, columns, filterData, { module: 'finance' }),
    [invoices, columns, filterData]
  );

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

      {/* 检索条（标准化） */}
      <FilterBar columns={columns} module="finance" onSearch={setFilterData} listKey="finance-invoice-list" />

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
            const now = todayLocal();
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
                { label: '状态', value: <StatusBadge status={INV_STATUS_KEY[selectedInv.status]} /> },
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
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
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
                value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} InputProps={{ readOnly: true }} helperText="提交时自动记录当天，无需填写" />
            </Grid>
          </Grid>

          {/* 明细行编辑器（边界②修复：行级三单匹配依赖发票明细） */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>发票明细行</Typography>
              <Box flex={1} />
              <Button size="small" startIcon={<AddIcon />} onClick={addItem}>添加明细行</Button>
            </Box>
            {items.length === 0 ? (
              <Alert severity="info" sx={{ mb: 1 }}>
                未填明细行时将按头表金额创建（纯头发票，行级三单匹配将跳过）。填写明细行后，头表「不含税金额 / 税额 / 含税总额」将自动按明细合计覆盖（服务端同口径复核）。
              </Alert>
            ) : (
              <Typography variant="caption" color="text.secondary">
                填写明细行后，下方头表金额字段将自动被明细合计覆盖，无需手填。
              </Typography>
            )}
            {items.map((it, idx) => (
              <Box key={idx} sx={{ p: 1.5, mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                <Grid container spacing={1.5} alignItems="center">
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="物料名称" value={it.materialName || ''}
                      onChange={(e) => updateItem(idx, { materialName: e.target.value })} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="物料编码" value={it.materialCode || ''}
                      onChange={(e) => updateItem(idx, { materialCode: e.target.value })} />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField fullWidth size="small" label="单位" value={it.unit || ''}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })} />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField fullWidth size="small" label="数量" type="number" value={it.quantity ?? 0}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField fullWidth size="small" label="单价" type="number" value={it.unitPrice ?? 0}
                      onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField fullWidth size="small" label="税率%" type="number" value={it.taxRate ?? 13}
                      onChange={(e) => updateItem(idx, { taxRate: Number(e.target.value) })} />
                  </Grid>
                  <Grid item xs={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" color="error" onClick={() => removeItem(idx)}>删除</Button>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">行不含税：¥{Number(it.amount || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">行税额：¥{Number(it.taxAmount || 0).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">行含税：¥{Number(it.totalAmount || 0).toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>

          {/* 头表金额（有明细行时由明细合计覆盖） */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
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
            const hasItems = items.length > 0;
            // 有明细行：头金额由明细合计覆盖（与服务端 Σ明细 复核口径一致）
            const headerAmount = hasItems ? items.reduce((s, it) => s + (Number(it.amount) || 0), 0) : form.amount;
            const headerTax = hasItems ? items.reduce((s, it) => s + (Number(it.taxAmount) || 0), 0) : +(form.amount * form.taxRate / 100).toFixed(2);
            const headerTotal = hasItems ? items.reduce((s, it) => s + (Number(it.totalAmount) || 0), 0) : +(form.amount + headerTax).toFixed(2);
            addInvoice({
              id: `inv-${Date.now()}`,
              invoiceNo: form.invoiceNo || `INV${Date.now()}`,
              invoiceType: form.invoiceType as Invoice['invoiceType'],
              status: form.status as Invoice['status'],
              vendorName: form.vendorName,
              vendorTaxNo: form.vendorTaxNo,
              purchaseOrderNo: form.purchaseOrderNo,
              invoiceDate: todayLocal(),
              receivedDate: form.invoiceDate,
              amount: Math.round(headerAmount * 100) / 100,
              taxRate: form.taxRate,
              taxAmount: Math.round(headerTax * 100) / 100,
              totalAmount: Math.round(headerTotal * 100) / 100,
              ...(hasItems ? { items: items.map(it => ({
                materialName: it.materialName || undefined,
                materialCode: it.materialCode || undefined,
                quantity: Number(it.quantity) || 0,
                unit: it.unit || undefined,
                unitPrice: Number(it.unitPrice) || 0,
                taxRate: Number(it.taxRate) || 0,
                amount: Math.round((Number(it.amount) || 0) * 100) / 100,
                taxAmount: Math.round((Number(it.taxAmount) || 0) * 100) / 100,
                totalAmount: Math.round((Number(it.totalAmount) || 0) * 100) / 100,
                orderItemId: it.orderItemId || undefined,
              })) } : {}),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: '当前用户',
              updatedBy: '当前用户',
            });
            resetItems();
            setCreateOpen(false);
          }}>创建</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
