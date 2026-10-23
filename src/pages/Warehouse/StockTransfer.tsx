import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { useWarehouseMasterStore } from '@/stores/warehouseMasterStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useOrgStore } from '@/stores/orgStore';
import { StockTransfer } from '@/types';
import { todayLocal } from '@/utils/format';

const STATUS_LABEL: Record<StockTransfer['status'], string> = {
  draft: '草稿', shipped: '已发出', received: '已收货', completed: '已完成', cancelled: '已取消',
};

export default function StockTransferPage() {
  const { stockTransfers, addStockTransfer, confirmTransfer } = useWarehouseAdvancedStore();
  const { warehouses } = useWarehouseMasterStore();
  const { materials } = useMaterialStore();
  const { organizations } = useOrgStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fromWarehouseId: 'wh-001', toWarehouseId: 'wh-002', transferDate: todayLocal(), materialId: '', quantity: 500,
  });

  const fromWh = warehouses.find((w) => w.id === form.fromWarehouseId);
  const toWh = warehouses.find((w) => w.id === form.toWarehouseId);
  const selMat = useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);

  const whName = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id;
  const orgIdOf = (whId: string) => warehouses.find((w) => w.id === whId)?.orgId;

  const handleAdd = () => {
    if (!selMat) return;
    const t: StockTransfer = {
      id: `st-${Date.now()}`,
      transferNo: `ST-2026-${Date.now()}`,
      fromWarehouseId: form.fromWarehouseId,
      fromWarehouseName: whName(form.fromWarehouseId),
      toWarehouseId: form.toWarehouseId,
      toWarehouseName: whName(form.toWarehouseId),
      fromOrgId: orgIdOf(form.fromWarehouseId),
      toOrgId: orgIdOf(form.toWarehouseId),
      status: 'draft',
      transferDate: todayLocal(),
      items: [{
        id: `sti-${Date.now()}`, materialId: selMat.id, materialCode: selMat.code, materialName: selMat.name,
        unit: selMat.unit, quantity: Number(form.quantity),
      }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addStockTransfer(t);
    setOpen(false);
    setForm({ ...form, materialId: '', quantity: 500 });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="stock-transfer">
      <Typography variant="h5" gutterBottom>跨组织转储</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>转储确认后自动在调出方出库、调入方入库（双边过账），并携带组织维度。</Alert>
      <Button data-testid="st-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增转储单
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>转储单号</TableCell>
              <TableCell>调出仓库</TableCell>
              <TableCell>调入仓库</TableCell>
              <TableCell>数量</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockTransfers.map((t) => (
              <TableRow key={t.id} data-testid="st-row">
                <TableCell>{t.transferNo}</TableCell>
                <TableCell>{t.fromWarehouseName}（{t.fromOrgId}）</TableCell>
                <TableCell>{t.toWarehouseName}（{t.toOrgId}）</TableCell>
                <TableCell>{t.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[t.status]} color={t.status === 'completed' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  {t.status === 'draft' && (
                    <Button size="small" data-testid="st-confirm" onClick={() => confirmTransfer(t.id)}>确认转储</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增跨组织转储</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="调出仓库" value={form.fromWarehouseId}
            onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}（{w.orgId}）</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" select label="调入仓库" value={form.toWarehouseId}
            onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}（{w.orgId}）</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" select label="物料" value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="数量" type="number" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="转储日期" type="date" value={form.transferDate}
            onChange={(e) => setForm({ ...form, transferDate: e.target.value })} InputProps={{ readOnly: true }} helperText="提交时自动记录当天，无需填写" InputLabelProps={{ shrink: true }} />
          {fromWh && toWh && fromWh.orgId !== toWh.orgId && (
            <Alert severity="warning" sx={{ mt: 1 }}>跨组织转储：{fromWh.orgId} → {toWh.orgId}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="st-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
