import { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert,
} from '@mui/material';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore } from '@/stores/productionOperationStore';
import { computeCRP } from '@/utils/crp';

const fmt = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function CRP() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters } = useProductionOperationStore();

  const result = useMemo(
    () => computeCRP(workOrders, processRoutes, workCenters),
    [workOrders, processRoutes, workCenters],
  );

  return (
    <Box sx={{ p: 2 }} data-testid="crp">
      <Typography variant="h5" gutterBottom>CRP 产能需求计划</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        按所有未完工工单的工艺路线展开，累计各工作中心的需求工时并与日产能比较（负荷率）。负荷率 &gt; 100% 表示资源超载。
      </Alert>
      <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip data-testid="crp-total-capacity" label={`总产能 ${fmt(result.totalCapacity)} h`} />
        <Chip data-testid="crp-total-required" label={`总需求 ${fmt(result.totalRequired)} h`} color="primary" />
        <Chip data-testid="crp-overload" label={`超载资源 ${result.overloadCount}`} color={result.overloadCount > 0 ? 'error' : 'success'} />
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>工作中心</TableCell>
              <TableCell>日产能(h)</TableCell>
              <TableCell>需求工时(h)</TableCell>
              <TableCell>负荷率</TableCell>
              <TableCell>涉及工单数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.lines.map((l) => (
              <TableRow key={l.workCenterId} data-testid="crp-row">
                <TableCell>{l.name}</TableCell>
                <TableCell>{fmt(l.capacityHours)}</TableCell>
                <TableCell>{fmt(l.requiredHours)}</TableCell>
                <TableCell>
                  <Chip size="small" label={`${l.loadPct}%`} color={l.loadPct > 100 ? 'error' : l.loadPct > 80 ? 'warning' : 'success'} />
                </TableCell>
                <TableCell>{l.orderCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
