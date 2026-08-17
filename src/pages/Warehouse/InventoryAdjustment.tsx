import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseMasterStore } from '@/stores/warehouseMasterStore';
import { InventoryAdjustment } from '@/types';

const STATUS_LABEL: Record<InventoryAdjustment['status'], string> = {
  draft: '草稿', posted: '已过账', cancelled: '已取消',
};

export default function InventoryAdjustmentPage() {
  const { inventoryAdjustments, addInventoryAdjustment, postAdjustment } = useWarehouseAdvancedStore();
  const { inventoryRecords } = useWarehouseStore();
  const { materials } = useMaterialStore();
  const { warehouses } = useWarehouseMasterStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ warehouseId: 'wh-001', materialId: '', actualQty: 0, reason: '盘点差异调整' });

  const bookQty = useMemo(() => {
    if (!form.materialId) return 0;
    return inventoryRecords
      .filter((r) => r.materialId === form.materialId && r.warehouseId === form.warehouseId)
      .reduce((s, r) => s + r.quantity, 0);
  }, [inventoryRecords, form.materialId, form.warehouseId]);

  const handleAdd = () => {
    if (!form.materialId) return;
    const actual = Number(form.actualQty);
    const delta = actual - bookQty;
    const mat = materials.find((m) => m.id === form.materialId);
    const wh = warehouses.find((w) => w.id === form.warehouseId);
    const adj: InventoryAdjustment = {
      id: `ia-${Date.now()}`,
      adjustmentNo: `ADJ-2026-${Date.now()}`,
      warehouseId: form.warehouseId,
      warehouseName: wh?.name,
      status: 'draft',
      reason: form.reason,
      date: new Date().toISOString().slice(0, 10),
      items: [{
        id: `iai-${Date.now()}`, materialId: form.materialId, materialCode: mat?.code, materialName: mat?.name,
        unit: mat?.unit, bookQty, actualQty: actual, deltaQty: delta, reason: form.reason,
      }],
      totalDeltaQty: delta,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    };
    addInventoryAdjustment(adj);
    setOpen(false);
    setForm({ warehouseId: 'wh-001', materialId: '', actualQty: 0, reason: '盘点差异调整' });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="inv-adjustment">
      <Typography variant="h5" gutterBottom>库存调整单</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>调整过账自动修正库存数量并生成存货凭证（借/贷 库存商品）。</Alert>
      <Button data-testid="ia-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增调整单
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>调整单号</TableCell>
              <TableCell>仓库</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>差异量</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>凭证</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryAdjustments.map((adj) => (
              <TableRow key={adj.id} data-testid="ia-row">
                <TableCell>{adj.adjustmentNo}</TableCell>
                <TableCell>{adj.warehouseName}</TableCell>
                <TableCell>{adj.items.map((i) => i.materialName).join('、')}</TableCell>
                <TableCell>{adj.totalDeltaQty}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[adj.status]} color={adj.status === 'posted' ? 'success' : 'default'} /></TableCell>
                <TableCell>{adj.voucherNo || '—'}</TableCell>
                <TableCell>
                  {adj.status === 'draft' && (
                    <Button size="small" data-testid="ia-post" onClick={() => postAdjustment(adj.id)}>过账</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增库存调整单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="仓库" value={form.warehouseId}
            onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" select label="物料" value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} {m.name}</MenuItem>
            ))}
          </TextField>
          <Alert severity="info" sx={{ my: 1 }}>当前账面库存：{bookQty}</Alert>
          <TextField fullWidth margin="dense" label="实际数量" type="number" value={form.actualQty}
            onChange={(e) => setForm({ ...form, actualQty: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="调整原因" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="ia-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
