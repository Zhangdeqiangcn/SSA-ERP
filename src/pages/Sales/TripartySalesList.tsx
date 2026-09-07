import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Paper, Chip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataTable } from '@/components/common/DataTable';
import { useTripartySalesStore } from '@/stores/tripartySalesStore';
import { useNumberingStore } from '@/stores/numberingStore';
import { TripartySale, TripartySettleStatus, TRIPARTY_SETTLE_LABELS } from '@/types/tripartySales';

const SETTLE_COLORS: Record<TripartySettleStatus, string> = { pending: '#f59e0b', partial: '#3b82f6', settled: '#10b981' };
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();

export default function TripartySalesList() {
  const list = useTripartySalesStore((s) => s.list);
  const addSale = useTripartySalesStore((s) => s.addSale);
  const updateSale = useTripartySalesStore((s) => s.updateSale);
  const deleteSale = useTripartySalesStore((s) => s.deleteSale);
  const nextNo = useNumberingStore((s) => s.nextNo);
  const load = useTripartySalesStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [docNo, setDocNo] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [partyName, setPartyName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [materialCode, setMaterialCode] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [spec, setSpec] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('吨');
  const [settlePrice, setSettlePrice] = useState('');
  const [settleStatus, setSettleStatus] = useState<TripartySettleStatus>('pending');
  const [orderDate, setOrderDate] = useState(todayStr());
  const [settleDate, setSettleDate] = useState('');
  const [remark, setRemark] = useState('');

  const reset = () => {
    setEditId(null); setDocNo(''); setPartyCode(''); setPartyName(''); setCustomerName('');
    setWarehouse(''); setMaterialCode(''); setMaterialName(''); setSpec('');
    setQuantity(''); setUnit('吨'); setSettlePrice(''); setSettleStatus('pending');
    setOrderDate(todayStr()); setSettleDate(''); setRemark('');
  };

  const openCreate = () => { reset(); setDocNo(nextNo('TPS')); setOpen(true); };
  const openEdit = (r: TripartySale) => {
    setEditId(r.id); setDocNo(r.docNo); setPartyCode(r.partyCode); setPartyName(r.partyName);
    setCustomerName(r.customerName); setWarehouse(r.warehouse); setMaterialCode(r.materialCode);
    setMaterialName(r.materialName); setSpec(r.spec); setQuantity(String(r.quantity)); setUnit(r.unit);
    setSettlePrice(String(r.settlePrice)); setSettleStatus(r.settleStatus); setOrderDate(r.orderDate);
    setSettleDate(r.settleDate || ''); setRemark(r.remark || ''); setOpen(true);
  };

  const save = () => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(settlePrice) || 0;
    const amount = Math.round(q * p * 100) / 100;
    const base = {
      docNo, partyCode, partyName, customerName, warehouse, materialCode, materialName, spec,
      quantity: q, unit, settlePrice: p, amount, settleStatus, orderDate,
      settleDate: settleDate || undefined, remark: remark || undefined, updatedAt: nowStr(), updatedBy: 'admin',
    };
    if (editId) updateSale(editId, base);
    else addSale({ ...base, id: `tps-${Date.now()}`, createdAt: nowStr(), createdBy: 'admin' } as TripartySale);
    setOpen(false);
  };

  const total = list.reduce((a, r) => a + r.amount, 0);
  const pendingAmt = list.filter((r) => r.settleStatus === 'pending').reduce((a, r) => a + r.amount, 0);
  const settledAmt = list.filter((r) => r.settleStatus === 'settled').reduce((a, r) => a + r.amount, 0);

  const columns = [
    { accessorKey: 'docNo', header: '单据号' },
    { accessorKey: 'partyName', header: '三方/经销商' },
    { accessorKey: 'customerName', header: '终端客户' },
    { accessorKey: 'materialName', header: '物料' },
    { accessorKey: 'quantity', header: '数量' },
    { accessorKey: 'settlePrice', header: '结算单价' },
    { accessorKey: 'amount', header: '金额', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
    {
      accessorKey: 'settleStatus', header: '结算状态',
      cell: (c: any) => { const v = c.getValue() as TripartySettleStatus; return <Chip label={TRIPARTY_SETTLE_LABELS[v]} size="small" sx={{ bgcolor: SETTLE_COLORS[v], color: '#fff' }} />; },
    },
    { accessorKey: 'orderDate', header: '业务日期' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">三方销售（P2-12）</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新建代销结算单</Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">代销总额</Typography><Typography variant="h6">¥{total.toLocaleString()}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">待结算</Typography><Typography variant="h6" sx={{ color: '#f59e0b' }}>¥{pendingAmt.toLocaleString()}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">已结算</Typography><Typography variant="h6" sx={{ color: '#10b981' }}>¥{settledAmt.toLocaleString()}</Typography></Paper>
      </Stack>

      <DataTable
        data={list} columns={columns}
        onView={(r) => openEdit(r)} onEdit={(r) => openEdit(r)} onDelete={(r) => deleteSale(r.id)}
        enableExport enableColumnFilter sapStyle columnConfigKey="triparty-sales"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑代销结算单' : '新建代销结算单'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="单据号" value={docNo} onChange={(e) => setDocNo(e.target.value)} fullWidth disabled />
              <TextField label="业务日期" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="三方/经销商编码" value={partyCode} onChange={(e) => setPartyCode(e.target.value)} fullWidth />
              <TextField label="三方/经销商名称" value={partyName} onChange={(e) => setPartyName(e.target.value)} fullWidth />
            </Stack>
            <TextField label="终端客户" value={customerName} onChange={(e) => setCustomerName(e.target.value)} fullWidth />
            <TextField label="寄售仓" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="物料编码" value={materialCode} onChange={(e) => setMaterialCode(e.target.value)} fullWidth />
              <TextField label="物料名称" value={materialName} onChange={(e) => setMaterialName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="规格" value={spec} onChange={(e) => setSpec(e.target.value)} fullWidth />
              <TextField label="数量" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} fullWidth />
              <TextField label="单位" value={unit} onChange={(e) => setUnit(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="结算单价" type="number" value={settlePrice} onChange={(e) => setSettlePrice(e.target.value)} fullWidth />
              <TextField select label="结算状态" value={settleStatus} onChange={(e) => setSettleStatus(e.target.value as TripartySettleStatus)} fullWidth>
                {(['pending', 'partial', 'settled'] as TripartySettleStatus[]).map((s) => (<MenuItem key={s} value={s}>{TRIPARTY_SETTLE_LABELS[s]}</MenuItem>))}
              </TextField>
              <TextField label="结算日期" type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <TextField label="备注" value={remark} onChange={(e) => setRemark(e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={save}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
