import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataTable } from '@/components/common/DataTable';
import { useEsgStore } from '@/stores/esgStore';
import { useNumberingStore } from '@/stores/numberingStore';
import type { EsgReport } from '@/types/esg';
import { EsgCategory, EsgStatus, ESG_CATEGORY_LABELS, ESG_STATUS_LABELS } from '@/types/esg';

const CATS: EsgCategory[] = ['E', 'S', 'G'];
const nowStr = () => new Date().toISOString();

export default function EsgReport() {
  const list = useEsgStore((s) => s.list);
  const addReport = useEsgStore((s) => s.addReport);
  const [cat, setCat] = useState<EsgCategory>('E');

  const [open, setOpen] = useState(false);
  const [reportNo, setReportNo] = useState('');
  const [period, setPeriod] = useState('2026-H1');
  const [indicator, setIndicator] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');
  const [status, setStatus] = useState<EsgStatus>('draft');

  const rows = list.filter((r) => r.category === cat);

  const totalCount = list.length;
  const publishedCount = list.filter((r) => r.status === 'published').length;
  const metTarget = rows.filter((r) => r.target != null && r.value <= r.target).length;

  const openCreate = () => {
    setReportNo(''); setPeriod('2026-H1'); setIndicator(''); setValue(''); setUnit('');
    setTarget(''); setStatus('draft'); setOpen(true);
  };
  const save = () => {
    const rec: EsgReport = {
      id: `esg-${cat}-${Date.now()}`,
      reportNo: reportNo || `ESG-2026-${cat}${String(list.length + 1).padStart(3, '0')}`,
      period, category: cat, indicator,
      value: parseFloat(value) || 0, unit,
      target: target ? parseFloat(target) : undefined,
      status,
      createdAt: nowStr(), updatedAt: nowStr(), createdBy: 'admin', updatedBy: 'admin',
    };
    addReport(rec);
    setOpen(false);
  };

  const columns = [
    { accessorKey: 'reportNo', header: '报告号' },
    { accessorKey: 'period', header: '报告期' },
    { accessorKey: 'indicator', header: '指标' },
    { accessorKey: 'value', header: '实际值' },
    { accessorKey: 'unit', header: '单位' },
    { accessorKey: 'target', header: '目标值', cell: (c: any) => (c.getValue() != null ? c.getValue() : '—') },
    {
      accessorKey: 'status', header: '状态',
      cell: (c: any) => {
        const v = c.getValue() as EsgStatus;
        return <span style={{ color: v === 'published' ? '#10b981' : '#94a3b8' }}>{ESG_STATUS_LABELS[v]}</span>;
      },
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">ESG 报告（P2-30）</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新增 ESG 指标</Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">指标总数</Typography><Typography variant="h6">{totalCount}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">已发布</Typography><Typography variant="h6" sx={{ color: '#10b981' }}>{publishedCount}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">当前分类达标</Typography><Typography variant="h6">{metTarget} / {rows.length}</Typography></Paper>
      </Stack>

      <Tabs value={cat} onChange={(_, v) => setCat(v)} sx={{ mb: 2 }}>
        {CATS.map((c) => (<Tab key={c} value={c} label={ESG_CATEGORY_LABELS[c]} />))}
      </Tabs>

      <DataTable data={rows} columns={columns} enableExport enableColumnFilter sapStyle columnConfigKey={`esg-${cat}`} />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新增{ESG_CATEGORY_LABELS[cat]}指标</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="报告号" value={reportNo} onChange={(e) => setReportNo(e.target.value)} fullWidth placeholder="留空自动生成" />
              <TextField label="报告期" value={period} onChange={(e) => setPeriod(e.target.value)} fullWidth placeholder="2026-H1" />
            </Stack>
            <TextField label="指标名称" value={indicator} onChange={(e) => setIndicator(e.target.value)} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="实际值" type="number" value={value} onChange={(e) => setValue(e.target.value)} fullWidth />
              <TextField label="单位" value={unit} onChange={(e) => setUnit(e.target.value)} fullWidth placeholder="tCO2/吨钢" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="目标值" type="number" value={target} onChange={(e) => setTarget(e.target.value)} fullWidth />
              <TextField select label="状态" value={status} onChange={(e) => setStatus(e.target.value as EsgStatus)} fullWidth>
                {(Object.keys(ESG_STATUS_LABELS) as EsgStatus[]).map((s) => (<MenuItem key={s} value={s}>{ESG_STATUS_LABELS[s]}</MenuItem>))}
              </TextField>
            </Stack>
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
