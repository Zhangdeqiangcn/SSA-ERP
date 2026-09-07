import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataTable } from '@/components/common/DataTable';
import { useCopaStore } from '@/stores/copaStore';
import { CopaDimension, CopaRecord, COPA_DIMENSION_LABELS } from '@/types/copa';

const DIMS: CopaDimension[] = ['product', 'customer', 'region', 'period'];
const nowStr = () => new Date().toISOString();

interface Row extends CopaRecord { grossProfit: number; margin: number; }

export default function CopaAnalysis() {
  const list = useCopaStore((s) => s.list);
  const addRecord = useCopaStore((s) => s.addRecord);
  const load = useCopaStore((s) => s.load);

  // V2.80.0 W1：挂载即从 D1 拉取 COPA 分析行（离线/Mock 兜底，不阻断 UI）
  useEffect(() => {
    load();
  }, [load]);

  const [dim, setDim] = useState<CopaDimension>('product');

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [period, setPeriod] = useState('2026-08');
  const [revenue, setRevenue] = useState('');
  const [cogs, setCogs] = useState('');

  const rows: Row[] = list
    .filter((r) => r.dimension === dim)
    .map((r) => {
      const grossProfit = Math.round((r.revenue - r.cogs) * 100) / 100;
      const margin = r.revenue ? Math.round((grossProfit / r.revenue) * 10000) / 100 : 0;
      return { ...r, grossProfit, margin };
    });

  const totalRev = rows.reduce((a, r) => a + r.revenue, 0);
  const totalCogs = rows.reduce((a, r) => a + r.cogs, 0);
  const totalGp = Math.round((totalRev - totalCogs) * 100) / 100;
  const totalMargin = totalRev ? Math.round((totalGp / totalRev) * 10000) / 100 : 0;
  const maxGp = Math.max(...rows.map((r) => r.grossProfit), 1);

  const columns = [
    { accessorKey: 'label', header: '维度' },
    { accessorKey: 'revenue', header: '收入', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
    { accessorKey: 'cogs', header: '成本', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
    { accessorKey: 'grossProfit', header: '毛利', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
    { accessorKey: 'margin', header: '毛利率', cell: (c: any) => `${c.getValue()}%` },
  ];

  const openCreate = () => { setKey(''); setLabel(''); setPeriod('2026-08'); setRevenue(''); setCogs(''); setOpen(true); };
  const save = () => {
    const rec: CopaRecord = {
      id: `copa-${dim}-${key}-${Date.now()}`,
      dimension: dim, key, label, period,
      revenue: parseFloat(revenue) || 0, cogs: parseFloat(cogs) || 0,
      createdAt: nowStr(), updatedAt: nowStr(), createdBy: 'admin', updatedBy: 'admin',
    };
    addRecord(rec);
    setOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">获利分析 COPA（P2-13）</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新增分析行</Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">收入合计</Typography><Typography variant="h6">¥{totalRev.toLocaleString()}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">毛利合计</Typography><Typography variant="h6" sx={{ color: '#10b981' }}>¥{totalGp.toLocaleString()}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">综合毛利率</Typography><Typography variant="h6">{totalMargin}%</Typography></Paper>
      </Stack>

      <Tabs value={dim} onChange={(_, v) => setDim(v)} sx={{ mb: 2 }}>
        {DIMS.map((d) => (<Tab key={d} value={d} label={COPA_DIMENSION_LABELS[d]} />))}
      </Tabs>

      <DataTable data={rows} columns={columns} enableExport enableColumnFilter sapStyle columnConfigKey={`copa-${dim}`} />

      <Stack spacing={1} sx={{ mt: 2 }}>
        {rows.map((r) => (
          <Paper key={r.id} sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">{r.label}</Typography>
              <Typography variant="body2" sx={{ color: '#10b981' }}>毛利 ¥{r.grossProfit.toLocaleString()}（{r.margin}%）</Typography>
            </Stack>
            <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5, overflow: 'hidden' }}>
              <Box sx={{ width: `${(r.grossProfit / maxGp) * 100}%`, height: '100%', bgcolor: '#10b981' }} />
            </Box>
          </Paper>
        ))}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新增{COPA_DIMENSION_LABELS[dim]}分析行</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="维度值(key)" value={key} onChange={(e) => setKey(e.target.value)} fullWidth />
            <TextField label="显示名" value={label} onChange={(e) => setLabel(e.target.value)} fullWidth />
            <TextField label="期间" value={period} onChange={(e) => setPeriod(e.target.value)} fullWidth placeholder="2026-08" />
            <TextField label="收入" type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} fullWidth />
            <TextField label="成本" type="number" value={cogs} onChange={(e) => setCogs(e.target.value)} fullWidth />
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
