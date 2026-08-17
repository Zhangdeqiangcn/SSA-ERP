import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { useMaterialStore } from '@/stores/materialStore';
import { SerialMaster } from '@/types';

const STATUS_LABEL: Record<SerialMaster['status'], string> = {
  in_stock: '在库', shipped: '已发货', scrapped: '已报废', in_transit: '在途',
};

/** B2 序列号轨迹事件中文名 */
const MOVE_LABEL: Record<string, string> = {
  inbound: '入库', issue: '领料', subcontract: '委外发出', delivery: '发货', transfer: '调拨',
};

export default function SerialHUPage() {
  const { serialMasters, addSerialMaster, updateSerialMaster } = useWarehouseAdvancedStore();
  const { materials } = useMaterialStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    serialNo: '', materialId: '', huId: '', status: 'in_stock' as SerialMaster['status'], warehouseId: 'wh-001',
  });

  const selMat = useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);

  const handleAdd = () => {
    if (!selMat || !form.serialNo) return;
    addSerialMaster({
      id: `sm-${Date.now()}`,
      serialNo: form.serialNo,
      materialId: selMat.id,
      materialCode: selMat.code,
      materialName: selMat.name,
      huId: form.huId || undefined,
      warehouseId: form.warehouseId,
      status: form.status,
      inboundDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '当前用户', updatedBy: '当前用户',
    });
    setOpen(false);
    setForm({ serialNo: '', materialId: '', huId: '', status: 'in_stock', warehouseId: 'wh-001' });
  };

  const handleShip = (s: SerialMaster) => updateSerialMaster(s.id, { status: 'shipped', outboundDate: new Date().toISOString().slice(0, 10) });

  return (
    <Box sx={{ p: 2 }} data-testid="serial-hu">
      <Typography variant="h5" gutterBottom>序列号 / 处理单元（HU）主数据</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        对序列号管理物料进行单件追踪（HU 装箱、发货、报废）。
        <strong>凡标记「序列号管理」的物料，入库过账时自动登记序列号为在库、出库过账时按 FIFO 自动核销</strong>
        （销售→已发货、领料→已消耗、委外发料→在途），全流程轨迹见「流转轨迹」列。
      </Alert>
      <Button data-testid="sm-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增序列号
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>序列号</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>HU</TableCell>
              <TableCell>仓库</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>流转轨迹</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serialMasters.map((s) => (
              <TableRow key={s.id} data-testid="sm-row">
                <TableCell>{s.serialNo}</TableCell>
                <TableCell>{s.materialName}</TableCell>
                <TableCell>{s.huId || '—'}</TableCell>
                <TableCell>{s.warehouseId}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[s.status]} color={s.status === 'in_stock' ? 'success' : 'default'} /></TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }} data-testid="sm-movements">
                  {(s.movements || []).length === 0
                    ? '—'
                    : (s.movements || []).map((mv, i) => (
                        <div key={`${mv.docNo}-${i}`}>
                          {MOVE_LABEL[mv.type] || mv.type} · {mv.docNo} · {mv.date}
                        </div>
                      ))}
                </TableCell>
                <TableCell>
                  {s.status === 'in_stock' && (
                    <Button size="small" data-testid="sm-ship" onClick={() => handleShip(s)}>发货</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增序列号 / HU</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="序列号" value={form.serialNo}
            onChange={(e) => setForm({ ...form, serialNo: e.target.value })} />
          <TextField fullWidth margin="dense" select label="物料" value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
            {materials.filter((m) => m.serialized).map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} {m.name}（序列号管理）</MenuItem>
            ))}
            {materials.filter((m) => !m.serialized).map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="HU（处理单元）" value={form.huId}
            onChange={(e) => setForm({ ...form, huId: e.target.value })} />
          <TextField fullWidth margin="dense" select label="状态" value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as SerialMaster['status'] })}>
            <MenuItem value="in_stock">在库</MenuItem>
            <MenuItem value="in_transit">在途</MenuItem>
            <MenuItem value="shipped">已发货</MenuItem>
            <MenuItem value="scrapped">已报废</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="sm-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
