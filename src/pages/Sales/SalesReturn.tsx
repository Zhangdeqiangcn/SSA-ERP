import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSalesReturnStore } from '@/stores/salesReturnStore';
import { useSalesStore } from '@/stores/salesStore';
import { SalesReturn } from '@/types';
import { todayLocal } from '@/utils/format';

const STATUS_LABEL: Record<SalesReturn['status'], string> = {
  draft: '草稿', approved: '已审批', completed: '已完成', cancelled: '已作废',
};

export default function SalesReturnPage() {
  const navigate = useNavigate();
  const { salesReturns, addReturn, completeReturn } = useSalesReturnStore();
  const { salesOrders } = useSalesStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ salesOrderNo: '', returnDate: todayLocal(), reason: '质量异议' });

  const selectedSO = useMemo(
    () => salesOrders.find((o) => o.orderNo === form.salesOrderNo),
    [salesOrders, form.salesOrderNo]
  );

  const handleAdd = () => {
    if (!selectedSO) return;
    const items = selectedSO.items.map((it) => ({
      id: `sri-${it.id}`, materialId: it.materialId, materialCode: it.materialCode, materialName: it.materialName,
      unit: it.unit, quantity: it.quantity - (it.deliveredQuantity || 0), unitPrice: it.unitPrice,
      amount: (it.quantity - (it.deliveredQuantity || 0)) * it.unitPrice, reason: form.reason,
    }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    const r: SalesReturn = {
      id: `sr-${Date.now()}`,
      returnNo: `SR-2026-${Date.now()}`,
      salesOrderNo: selectedSO.orderNo,
      customerName: selectedSO.customerName,
      status: 'draft',
      returnDate: todayLocal(),
      reason: form.reason,
      items,
      totalAmount: total,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addReturn(r);
    setOpen(false);
    setForm({ salesOrderNo: '', returnDate: todayLocal(), reason: '质量异议' });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="sales-return">
      <Typography variant="h5" gutterBottom>销售退货</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>退货完成自动生成红字入库（退回库存）+ 红冲应收(AR)凭证 + 红字发票。</Alert>
      <Button data-testid="return-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增退货单
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>退货单号</TableCell>
              <TableCell>销售订单</TableCell>
              <TableCell>客户</TableCell>
              <TableCell>金额</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>红字发票</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {salesReturns.map((r) => (
              <TableRow key={r.id} data-testid="return-row">
                <TableCell>{r.returnNo}</TableCell>
                <TableCell>{r.salesOrderNo}</TableCell>
                <TableCell>{r.customerName}</TableCell>
                <TableCell>{r.totalAmount.toLocaleString()}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[r.status]} color={r.status === 'completed' ? 'success' : 'default'} /></TableCell>
                <TableCell>{r.creditNoteNo || '—'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => navigate(`/sales/returns/${r.id}`)}>查看</Button>
                  {r.status === 'draft' && (
                    <Button size="small" data-testid="return-complete" onClick={() => completeReturn(r.id)}>完成退货</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增销售退货单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="销售订单" value={form.salesOrderNo}
            onChange={(e) => setForm({ ...form, salesOrderNo: e.target.value })}>
            {salesOrders.map((o) => (
              <MenuItem key={o.id} value={o.orderNo}>{o.orderNo} {o.customerName}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="退货日期" type="date" value={form.returnDate}
            onChange={(e) => setForm({ ...form, returnDate: e.target.value })} InputProps={{ readOnly: true }} helperText="提交时自动记录当天，无需填写" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="退货原因" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="return-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
