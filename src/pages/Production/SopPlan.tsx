import React, { useState } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Paper, Chip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataTable } from '@/components/common/DataTable';
import { useSopStore } from '@/stores/sopStore';
import { useNumberingStore } from '@/stores/numberingStore';
import type { SopPlan } from '@/types/sop';
import { SopStatus, SOP_STATUS_LABELS } from '@/types/sop';

const STATUS_COLORS: Record<SopStatus, string> = {
  draft: '#94a3b8', balanced: '#3b82f6', approved: '#10b981', executing: '#8b5cf6',
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();

export default function SopPlan() {
  const list = useSopStore((s) => s.list);
  const addPlan = useSopStore((s) => s.addPlan);
  const updatePlan = useSopStore((s) => s.updatePlan);
  const deletePlan = useSopStore((s) => s.deletePlan);
  const nextNo = useNumberingStore((s) => s.nextNo);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [planNo, setPlanNo] = useState('');
  const [period, setPeriod] = useState('2026-09');
  const [demand, setDemand] = useState('');
  const [supply, setSupply] = useState('');
  const [status, setStatus] = useState<SopStatus>('draft');
  const [owner, setOwner] = useState('生产计划部');
  const [remark, setRemark] = useState('');

  const reset = () => {
    setEditId(null); setPeriod('2026-09'); setDemand(''); setSupply('');
    setStatus('draft'); setOwner('生产计划部'); setRemark('');
  };
  const openCreate = () => { reset(); setPlanNo(nextNo('SOP')); setOpen(true); };
  const openEdit = (r: SopPlan) => {
    setEditId(r.id); setPlanNo(r.planNo); setPeriod(r.period);
    setDemand(String(r.demandForecast)); setSupply(String(r.supplyPlan));
    setStatus(r.status); setOwner(r.owner); setRemark(r.remark || ''); setOpen(true);
  };

  const save = () => {
    const d = parseFloat(demand) || 0;
    const s = parseFloat(supply) || 0;
    const balance = Math.round((s - d) * 100) / 100;
    const base = {
      planNo, period, demandForecast: d, supplyPlan: s, balanceQty: balance,
      status, owner, remark: remark || undefined, updatedAt: nowStr(), updatedBy: 'admin',
    };
    if (editId) updatePlan(editId, base);
    else addPlan({ ...base, id: `sop-${Date.now()}`, createdAt: nowStr(), createdBy: 'admin' } as SopPlan);
    setOpen(false);
  };

  const totalDemand = list.reduce((a, r) => a + r.demandForecast, 0);
  const totalSupply = list.reduce((a, r) => a + r.supplyPlan, 0);
  const totalBalance = Math.round((totalSupply - totalDemand) * 100) / 100;
  const approvedCount = list.filter((r) => r.status === 'approved' || r.status === 'executing').length;

  const columns = [
    { accessorKey: 'planNo', header: '计划号' },
    { accessorKey: 'period', header: '计划期' },
    { accessorKey: 'demandForecast', header: '需求预测(吨)' },
    { accessorKey: 'supplyPlan', header: '供应计划(吨)' },
    {
      accessorKey: 'balanceQty', header: '平衡差(吨)',
      cell: (c: any) => {
        const v = c.getValue() as number;
        return <Chip label={v} size="small" sx={{ bgcolor: v >= 0 ? '#10b981' : '#ef4444', color: '#fff' }} />;
      },
    },
    {
      accessorKey: 'status', header: '状态',
      cell: (c: any) => {
        const v = c.getValue() as SopStatus;
        return <Chip label={SOP_STATUS_LABELS[v]} size="small" sx={{ bgcolor: STATUS_COLORS[v], color: '#fff' }} />;
      },
    },
    { accessorKey: 'owner', header: '责任人' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">S&OP 销售与运营计划（P2-10）</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新建 S&OP 计划</Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">需求预测合计</Typography><Typography variant="h6">{(totalDemand / 10000).toFixed(2)} 万吨</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">供应计划合计</Typography><Typography variant="h6">{(totalSupply / 10000).toFixed(2)} 万吨</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">产销平衡差</Typography><Typography variant="h6" sx={{ color: totalBalance >= 0 ? '#10b981' : '#ef4444' }}>{totalBalance >= 0 ? '+' : ''}{(totalBalance / 10000).toFixed(2)} 万吨</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">已审批/执行</Typography><Typography variant="h6">{approvedCount} / {list.length}</Typography></Paper>
      </Stack>

      <DataTable
        data={list} columns={columns}
        onView={(r) => openEdit(r)} onEdit={(r) => openEdit(r)} onDelete={(r) => deletePlan(r.id)}
        enableExport enableColumnFilter sapStyle columnConfigKey="sop-plans"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑 S&OP 计划' : '新建 S&OP 计划'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="计划号" value={planNo} onChange={(e) => setPlanNo(e.target.value)} fullWidth disabled />
              <TextField label="计划期" value={period} onChange={(e) => setPeriod(e.target.value)} fullWidth placeholder="2026-09" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="需求预测(吨)" type="number" value={demand} onChange={(e) => setDemand(e.target.value)} fullWidth />
              <TextField label="供应计划(吨)" type="number" value={supply} onChange={(e) => setSupply(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="状态" value={status} onChange={(e) => setStatus(e.target.value as SopStatus)} fullWidth>
                {(Object.keys(SOP_STATUS_LABELS) as SopStatus[]).map((s) => (<MenuItem key={s} value={s}>{SOP_STATUS_LABELS[s]}</MenuItem>))}
              </TextField>
              <TextField label="责任人" value={owner} onChange={(e) => setOwner(e.target.value)} fullWidth />
            </Stack>
            <TextField label="备注" value={remark} onChange={(e) => setRemark(e.target.value)} fullWidth multiline minRows={2} />
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
