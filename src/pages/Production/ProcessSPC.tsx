import { useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert,
} from '@mui/material';
import { useProductionOperationStore } from '@/stores/productionOperationStore';

interface SPCRow {
  operationName: string;
  samples: number;
  mean: number;
  min: number;
  max: number;
  range: number;
  outOfControl: boolean;
}

export default function ProcessSPC() {
  const { operationReports } = useProductionOperationStore();

  const rows = useMemo<SPCRow[]>(() => {
    const groups = new Map<string, number[]>();
    for (const r of operationReports) {
      const arr = groups.get(r.operationName) || [];
      arr.push(r.goodQuantity);
      groups.set(r.operationName, arr);
    }
    return Array.from(groups.entries()).map(([name, vals]) => {
      const n = vals.length;
      const sum = vals.reduce((a, b) => a + b, 0);
      const mean = Math.round((sum / n) * 100) / 100;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min;
      // 简易失控判据：样本极差 > 均值的一半 且 样本数 >= 3
      const outOfControl = n >= 3 && range > mean / 2;
      return { operationName: name, samples: n, mean, min, max, range, outOfControl };
    });
  }, [operationReports]);

  return (
    <Box sx={{ p: 2 }} data-testid="spc">
      <Typography variant="h5" gutterBottom>工序级 SPC（统计过程控制）</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        基于工序报工合格数，按工序聚合计 X-bar（均值）与 R（极差），对离散度大的工序给出失控提示（对标车间质量 SPC）。
      </Alert>
      <Chip data-testid="spc-op-count" label={`受控工序 ${rows.length}`} sx={{ mb: 1 }} />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>工序</TableCell><TableCell>样本数</TableCell><TableCell>均值(X-bar)</TableCell>
              <TableCell>最小</TableCell><TableCell>最大</TableCell><TableCell>极差(R)</TableCell><TableCell>判据</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.operationName} data-testid="spc-row">
                <TableCell>{r.operationName}</TableCell>
                <TableCell>{r.samples}</TableCell>
                <TableCell>{r.mean}</TableCell>
                <TableCell>{r.min}</TableCell>
                <TableCell>{r.max}</TableCell>
                <TableCell>{r.range}</TableCell>
                <TableCell>
                  <Chip size="small" label={r.outOfControl ? '失控' : '受控'} color={r.outOfControl ? 'error' : 'success'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
