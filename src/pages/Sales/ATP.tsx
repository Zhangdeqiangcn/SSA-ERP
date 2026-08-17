import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Alert,
} from '@mui/material';
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { useSalesStore } from '@/stores/salesStore';
import { computeATP } from '@/utils/atp';

export default function ATPPage() {
  const { materials } = useMaterialStore();
  const { inventoryRecords, inboundOrders } = useWarehouseStore();
  const { qualityHolds } = useWarehouseAdvancedStore();
  const { salesOrders } = useSalesStore();
  const [materialId, setMaterialId] = useState('');

  const selected = useMemo(() => materials.find((m) => m.id === materialId), [materials, materialId]);

  const atp = useMemo(() => {
    if (!materialId) return [];
    return computeATP({
      materialId,
      material: selected,
      inventoryRecords,
      salesOrders,
      inboundOrders,
      qualityHolds,
    });
  }, [materialId, selected, inventoryRecords, salesOrders, inboundOrders, qualityHolds]);

  return (
    <Box sx={{ p: 2 }} data-testid="atp">
      <Typography variant="h5" gutterBottom>可用量承诺（ATP）</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        基于当前库存、未发运销售订单承诺量与在途采购入库，按入库日期分层计算可承诺量。
      </Alert>
      <TextField fullWidth margin="dense" select label="选择物料" value={materialId}
        onChange={(e) => setMaterialId(e.target.value)} data-testid="atp-material" sx={{ maxWidth: 420, mb: 2 }}>
        {materials.map((m) => (
          <MenuItem key={m.id} value={m.id}>{m.code} {m.name}</MenuItem>
        ))}
      </TextField>

      {selected && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>日期</TableCell>
                <TableCell>当前在手</TableCell>
                <TableCell>承诺量</TableCell>
                <TableCell>本期在途</TableCell>
                <TableCell>可用量(ATP)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {atp.map((r, i) => (
                <TableRow key={i} data-testid="atp-row">
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.onHand}</TableCell>
                  <TableCell>{r.committed}</TableCell>
                  <TableCell>{r.incoming}</TableCell>
                  <TableCell><strong>{r.availableQty}</strong></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
