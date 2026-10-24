import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSalesAdvancedStore } from '@/stores/salesAdvancedStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useSalesStore } from '@/stores/salesStore';
import { Quotation } from '@/types';

const STATUS_LABEL: Record<Quotation['status'], string> = {
  draft: '草稿', submitted: '已提交', approved: '已批准', lost: '已丢失', converted: '已转订单',
};

export default function QuotationPage() {
  const navigate = useNavigate();
  const { quotations, addQuotation, convertQuotationToSO, hydrateQuotations } = useSalesAdvancedStore();
  const { materials } = useMaterialStore();
  const { salesOrders } = useSalesStore();
  const [open, setOpen] = useState(false);

  // V3.76.0：报价单迁 D1（sales_quotations）——页面挂载从权威源水合（未登录自动跳过）
  useEffect(() => { void hydrateQuotations(); }, [hydrateQuotations]);
  const [form, setForm] = useState({
    customerName: '东风汽车零部件', validUntil: '2026-08-31', currency: 'CNY',
    salesPerson: '王伟', materialId: '', quantity: 1000, unitPrice: 42,
  });

  const selectedMaterial = useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);
  const rows = quotations;

  const genNo = () => `Q-2026-${Date.now()}`;

  const handleAdd = () => {
    if (!selectedMaterial) return;
    const qty = Number(form.quantity);
    const price = Number(form.unitPrice);
    const amount = qty * price;
    const taxRate = 13;
    const taxAmount = Math.round(amount * taxRate) / 100;
    const q: Quotation = {
      id: `q-${Date.now()}`,
      quotationNo: genNo(),
      customerName: form.customerName,
      status: 'draft',
      validUntil: form.validUntil,
      currency: form.currency,
      items: [{
        id: `qi-${Date.now()}`, materialId: selectedMaterial.id, materialCode: selectedMaterial.code,
        materialName: selectedMaterial.name, specification: selectedMaterial.specification,
        unit: selectedMaterial.unit, quantity: qty, unitPrice: price, amount,
      }],
      totalAmount: amount, taxRate, taxAmount, grandTotal: amount + taxAmount,
      salesPerson: form.salesPerson,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addQuotation(q);
    setOpen(false);
    setForm({ ...form, materialId: '', quantity: 1000, unitPrice: 42 });
  };

  const handleConvert = (q: Quotation) => {
    const soId = convertQuotationToSO(q.id);
    if (soId) {
      const so = salesOrders.find((x) => x.id === soId);
      // 仅提示，不阻断
      void so;
    }
  };

  return (
    <Box sx={{ p: 2 }} data-testid="quotation">
      <Typography variant="h5" gutterBottom>销售报价单</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>报价单可一键转为销售订单（SO），形成报价→订单→工单→发货的完整链路。</Alert>
      <Button data-testid="quotation-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增报价单
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>报价单号</TableCell>
              <TableCell>客户</TableCell>
              <TableCell>金额(含税)</TableCell>
              <TableCell>有效期</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((q) => (
              <TableRow key={q.id} data-testid="quotation-row">
                <TableCell>{q.quotationNo}</TableCell>
                <TableCell>{q.customerName}</TableCell>
                <TableCell>{q.grandTotal.toLocaleString()}</TableCell>
                <TableCell>{q.validUntil}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[q.status]} color={q.status === 'converted' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  <Button size="small" onClick={() => navigate(`/sales/quotation/${q.id}`)}>查看</Button>
                  {q.status !== 'converted' && (
                    <Button size="small" data-testid="quotation-convert" onClick={() => handleConvert(q)}>转销售订单</Button>
                  )}
                  {q.status === 'converted' && <Chip size="small" color="success" label={`SO ${q.convertedOrderNo}`} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增报价单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="客户名称" value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <TextField fullWidth margin="dense" select label="物料" value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}
            SelectProps={{ native: false }}>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="数量" type="number" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="单价" type="number" value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="有效期至" type="date" value={form.validUntil}
            onChange={(e) => setForm({ ...form, validUntil: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="业务员" value={form.salesPerson}
            onChange={(e) => setForm({ ...form, salesPerson: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="quotation-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
