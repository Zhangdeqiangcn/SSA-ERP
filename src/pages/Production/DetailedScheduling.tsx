import { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, TextField, Chip, Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionSchedulingStore } from '@/stores/productionSchedulingStore';

interface SchedOp {
  key: string;
  woNo: string;
  opName: string;
  workCenter: string;
  baseStart: string;
}

export default function DetailedScheduling() {
  const { workOrders, processRoutes } = useProductionStore();
  const { locks, toggleLock, setAnchor } = useProductionSchedulingStore();

  const ops = useMemo<SchedOp[]>(() => {
    const active = workOrders.filter((w) => w.status !== 'completed' && w.status !== 'closed');
    const list: SchedOp[] = [];
    for (const wo of active) {
      const route =
        processRoutes.find((r) => r.id === wo.routeId) ||
        processRoutes.find((r) => r.routeNo === wo.routeNo) ||
        processRoutes.find((r) => r.productCode === wo.productCode);
      if (!route) continue;
      for (const op of route.operations) {
        list.push({
          key: `${wo.id}:${op.id}`,
          woNo: wo.orderNo,
          opName: op.operationName,
          workCenter: op.workCenter,
          baseStart: wo.plannedStartDate,
        });
      }
    }
    return list;
  }, [workOrders, processRoutes]);

  return (
    <Box sx={{ p: 2 }} data-testid="scheduling">
      <Typography variant="h5" gutterBottom>详细工序排程</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        工序级排程：可对关键工序「锁单」防止 APS 自动重排覆盖，或手工指定计划开始日（锚定）。锁定的工序在有限产能排程中保持不动。
      </Alert>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>工单</TableCell><TableCell>工序</TableCell><TableCell>工作中心</TableCell>
              <TableCell>基准开始日</TableCell><TableCell>锚定开始日</TableCell><TableCell>锁单</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ops.map((op) => {
              const lock = locks[op.key];
              return (
                <TableRow key={op.key} data-testid="sched-row">
                  <TableCell>{op.woNo}</TableCell>
                  <TableCell>{op.opName}</TableCell>
                  <TableCell>{op.workCenter}</TableCell>
                  <TableCell>{op.baseStart}</TableCell>
                  <TableCell>
                    <TextField
                      type="date" size="small" value={lock?.anchorDate ?? ''}
                      onChange={(e) => setAnchor(op.key, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      data-testid="sched-anchor"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small" data-testid="sched-lock"
                      variant={lock?.locked ? 'contained' : 'outlined'}
                      color={lock?.locked ? 'warning' : 'inherit'}
                      startIcon={lock?.locked ? <LockIcon /> : <LockOpenIcon />}
                      onClick={() => toggleLock(op.key)}
                    >
                      {lock?.locked ? '已锁' : '锁单'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ mt: 1 }}>
        <Chip data-testid="sched-locked-count" label={`已锁工序 ${Object.values(locks).filter((l) => l.locked).length}`} color="warning" />
      </Box>
    </Box>
  );
}
