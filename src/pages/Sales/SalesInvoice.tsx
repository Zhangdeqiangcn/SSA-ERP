import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSalesAdvancedStore } from '@/stores/salesAdvancedStore';
import { useSalesStore } from '@/stores/salesStore';
import { SalesInvoice } from '@/types';
import { todayLocal } from '@/utils/format';

const STATUS_LABEL: Record<SalesInvoice['status'], string> = {
  draft: '草稿', issued: '已开票', cancelled: '已作废',
};

export default function SalesInvoicePage() {
  const { salesInvoices, addInvoice, issueInvoice } = useSalesAdvancedStore();
  const { salesOrders } = useSalesStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ salesOrderNo: '', invoiceDate: todayLocal() });

  const selectedSO = useMemo(
    () => salesOrders.find((o) => o.orderNo === form.salesOrderNo),
    [salesOrders, form.salesOrderNo]
  );

  const handleAdd = () => {
    if (!selectedSO) return;
    const taxRate = selectedSO.taxRate || 13;
    const items = selectedSO.items.map((it) => {
      const amount = (it.quantity - (it.deliveredQuantity || 0)) * it.unitPrice;
      return {
        id: `ivi-${it.id}`, materialId: it.materialId, materialCode: it.materialCode, materialName: it.materialName,
        quantity: it.quantity - (it.deliveredQuantity || 0), unitPrice: it.unitPrice, amount,
        taxRate, taxAmount: Math.round(amount * taxRate) / 100,
      };
    });
    const amount = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
    const inv: SalesInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: `INV-2026-${Date.now()}`,
      invoiceType: 'sales',
      salesOrderNo: selectedSO.orderNo,
      customerName: selectedSO.customerName,
      status: 'draft',
      invoiceDate: todayLocal(),
      currency: 'CNY',
      items,
      amount, taxAmount, totalAmount: amount + taxAmount,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addInvoice(inv);
    setOpen(false);
    setForm({ salesOrderNo: '', invoiceDate: todayLocal() });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="sales-invoice">
      <Typography variant="h5" gutterBottom>销售开票（应收）</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>基于销售订单开票，开票后自动生成应收(AR)凭证（借应收账款 / 贷主营业务收入 / 贷销项税）。</Alert>
      <Button data-testid="invoice-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增开票
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>发票号</TableCell>
              <TableCell>销售订单</TableCell>
              <TableCell>客户</TableCell>
              <TableCell>含税金额</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>凭证</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {salesInvoices.map((inv) => (
              <TableRow key={inv.id} data-testid="invoice-row">
                <TableCell>{inv.invoiceNo}</TableCell>
                <TableCell>{inv.salesOrderNo}</TableCell>
                <TableCell>{inv.customerName}</TableCell>
                <TableCell>{inv.totalAmount.toLocaleString()}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[inv.status]} color={inv.status === 'issued' ? 'success' : 'default'} /></TableCell>
                <TableCell>{inv.voucherNo || '—'}</TableCell>
                <TableCell>
                  {inv.status === 'draft' && (
                    <Button size="small" data-testid="invoice-issue" onClick={() => issueInvoice(inv.id)}>开票</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增销售开票</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="销售订单" value={form.salesOrderNo}
            onChange={(e) => setForm({ ...form, salesOrderNo: e.target.value })}>
            {salesOrders.map((o) => (
              <MenuItem key={o.id} value={o.orderNo}>{o.orderNo} {o.customerName}</MenuItem>
            ))}
          </TextField>
          {selectedSO && (
            <Alert severity="info" sx={{ mt: 1 }}>
              客户：{selectedSO.customerName}；行项目 {selectedSO.items.length} 项
            </Alert>
          )}
          <TextField fullWidth margin="dense" label="开票日期" type="date" value={form.invoiceDate}
            onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} InputProps={{ readOnly: true }} helperText="提交时自动记录当天，无需填写" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="invoice-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
