import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import { useSalesStore } from '@/stores/salesStore';
import { useProductionStore } from '@/stores/productionStore';
import { useBOMStore } from '@/stores/bomStore';
import { WorkOrder, WorkOrderStatus } from '@/types/production';

const fmt = (n: number) => '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MTOCreate() {
  const { salesOrders, updateSalesOrder } = useSalesStore();
  const { workOrders, addWorkOrder } = useProductionStore();
  const { bomList } = useBOMStore();
  const [open, setOpen] = useState(false);
  const [selSoId, setSelSoId] = useState('');
  const [qty, setQty] = useState(10);

  // MTO 候选：已确认/生产中的销售订单
  const candidates = useMemo(
    () => salesOrders.filter((s) => s.status === 'confirmed' || s.status === 'in_production'),
    [salesOrders],
  );

  const so = candidates.find((s) => s.id === selSoId);

  // 反向索引：工单 id → 来源销售订单号（MTO 溯源，避免额外字段）
  const woToSoNo = useMemo(() => {
    const m = new Map<string, string>();
    salesOrders.forEach((s) =>
      (s.linkedWorkOrders || []).forEach((l) => m.set(l.workOrderId, s.orderNo)),
    );
    return m;
  }, [salesOrders]);

  const handleGenerate = () => {
    if (!so) return;
    const item = so.items[0];
    const bom = bomList.find((b) => b.productCode === item?.materialCode) || bomList[0];
    const woNo = `WO-MTO-${Date.now()}`;
    const wo: WorkOrder = {
      id: `wo-${Date.now()}`,
      orderNo: woNo,
      status: 'released' as WorkOrderStatus,
      productCode: item?.materialCode ?? 'PRD-FRAME-001',
      productName: item?.materialName ?? so.customerName,
      bomId: bom?.id ?? 'bom-001',
      bomNo: bom?.bomNo ?? 'BOM-2024-001',
      routeId: 'route-001',
      routeNo: 'R-2024-001',
      plannedQuantity: qty,
      completedQuantity: 0,
      scrapQuantity: 0,
      plannedStartDate: new Date().toISOString().slice(0, 10),
      plannedEndDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      priority: 'normal',
      workshop: '总装车间',
      supervisor: '—',
      note: `由销售订单 ${so.orderNo} 一键生成（MTO）`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    };
    addWorkOrder(wo);
    // 回写销售订单关联工单
    updateSalesOrder(so.id, {
      linkedWorkOrders: [
        ...(so.linkedWorkOrders || []),
        { workOrderId: wo.id, workOrderNo: wo.orderNo, status: 'released', productName: wo.productName, quantity: qty },
      ],
      status: 'in_production',
    });
    setOpen(false);
    setSelSoId('');
    setQty(10);
  };

  return (
    <Box sx={{ p: 2 }} data-testid="mto">
      <Typography variant="h5" gutterBottom>销售订单 → 工单（MTO 一键生成）</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        按单生产（MTO）：从已确认的销售订单一键生成生产工单，并回写 sourceSalesOrderId 与销售订单关联工单，实现订单溯源。
      </Alert>
      <Button data-testid="mto-open" variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>生成工单</Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>销售订单</TableCell><TableCell>客户</TableCell><TableCell>金额</TableCell>
              <TableCell>状态</TableCell><TableCell>已关联工单</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {candidates.map((s) => (
              <TableRow key={s.id} data-testid="mto-so-row">
                <TableCell>{s.orderNo}</TableCell>
                <TableCell>{s.customerName}</TableCell>
                <TableCell>{fmt(s.grandTotal)}</TableCell>
                <TableCell><Chip size="small" label={s.status} color="primary" /></TableCell>
                <TableCell>{(s.linkedWorkOrders || []).length} 个</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>从销售订单生成工单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="选择销售订单" value={selSoId} onChange={(e) => setSelSoId(e.target.value)}>
            {candidates.map((s) => <MenuItem key={s.id} value={s.id}>{s.orderNo} / {s.customerName}</MenuItem>)}
          </TextField>
          <TextField fullWidth margin="dense" label="生产数量" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="mto-confirm" onClick={handleGenerate} disabled={!so}>生成</Button>
        </DialogActions>
      </Dialog>

      <Typography variant="subtitle2" sx={{ mt: 3 }}>已生成工单（含 MTO 溯源）</Typography>
      <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>工单号</TableCell><TableCell>产品</TableCell><TableCell>数量</TableCell><TableCell>来源销售订单</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {workOrders.filter((w) => woToSoNo.has(w.id)).map((w) => (
              <TableRow key={w.id} data-testid="mto-wo-row">
                <TableCell>{w.orderNo}</TableCell>
                <TableCell>{w.productName}</TableCell>
                <TableCell>{w.plannedQuantity}</TableCell>
                <TableCell>{woToSoNo.get(w.id) ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
