import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePurchaseReturnStore } from '@/stores/purchaseReturnStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PurchaseReturn } from '@/types';

const STATUS_LABEL: Record<PurchaseReturn['status'], string> = {
  draft: '草稿', approved: '已审批', completed: '已完成', cancelled: '已作废',
};

export default function PurchaseReturnPage() {
  const { purchaseReturns, addReturn, completeReturn } = usePurchaseReturnStore();
  const { purchaseOrders } = usePurchaseStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ purchaseOrderNo: '', returnDate: '2026-07-20', reason: '质量不合格' });

  const selectedPO = useMemo(
    () => purchaseOrders.find((o) => o.orderNo === form.purchaseOrderNo),
    [purchaseOrders, form.purchaseOrderNo]
  );

  const handleAdd = () => {
    if (!selectedPO) return;
    const items = selectedPO.items.map((it) => ({
      id: `pri-${it.id}`, materialId: it.materialId, materialCode: it.materialCode, materialName: it.materialName,
      unit: it.unit, quantity: it.orderedQuantity - (it.deliveredQuantity || 0), unitPrice: it.unitPrice,
      amount: (it.orderedQuantity - (it.deliveredQuantity || 0)) * it.unitPrice, reason: form.reason,
    }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    const r: PurchaseReturn = {
      id: `pr-${Date.now()}`,
      returnNo: `PR-2026-${Date.now()}`,
      purchaseOrderNo: selectedPO.orderNo,
      vendorId: selectedPO.vendorId,
      vendorName: selectedPO.vendorName || '',
      status: 'draft',
      returnDate: form.returnDate,
      reason: form.reason,
      items,
      totalAmount: total,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addReturn(r);
    setOpen(false);
    setForm({ purchaseOrderNo: '', returnDate: '2026-07-20', reason: '质量不合格' });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="purchase-return">
      <Typography variant="h5" gutterBottom>采购退货</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>退货完成自动生成红字出库（退回供应商）+ 应付冲销(AP)凭证。</Alert>
      <Button data-testid="pr-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增退货单
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>退货单号</TableCell>
              <TableCell>采购订单</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>金额</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseReturns.map((r) => (
              <TableRow key={r.id} data-testid="pr-row">
                <TableCell>{r.returnNo}</TableCell>
                <TableCell>{r.purchaseOrderNo}</TableCell>
                <TableCell>{r.vendorName}</TableCell>
                <TableCell>{r.totalAmount.toLocaleString()}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[r.status]} color={r.status === 'completed' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  {r.status === 'draft' && (
                    <Button size="small" data-testid="pr-complete" onClick={() => completeReturn(r.id)}>完成退货</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增采购退货单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="采购订单" value={form.purchaseOrderNo}
            onChange={(e) => setForm({ ...form, purchaseOrderNo: e.target.value })}>
            {purchaseOrders.map((o) => (
              <MenuItem key={o.id} value={o.orderNo}>{o.orderNo} {o.vendorName}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="退货日期" type="date" value={form.returnDate}
            onChange={(e) => setForm({ ...form, returnDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="退货原因" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="pr-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
