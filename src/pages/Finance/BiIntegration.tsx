import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Paper, Chip,
} from '@mui/material';
import { Add, Sync } from '@mui/icons-material';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common';
import { useBiStore } from '@/stores/biStore';
import { useNumberingStore } from '@/stores/numberingStore';
import { BiConnection, BiPlatform, BiStatus, BI_PLATFORM_LABELS, BI_STATUS_LABELS } from '@/types/bi';

const nowStr = () => new Date().toISOString();

export default function BiIntegration() {
  const list = useBiStore((s) => s.list);
  const load = useBiStore((s) => s.load);
  const addConn = useBiStore((s) => s.addConn);
  const updateConn = useBiStore((s) => s.updateConn);
  const deleteConn = useBiStore((s) => s.deleteConn);
  const syncConnection = useBiStore((s) => s.syncConnection);
  const nextNo = useNumberingStore((s) => s.nextNo);

  // V2.80.0 W1：挂载即从 D1 拉取 BI 连接（离线/Mock 兜底，不阻断 UI）
  useEffect(() => {
    load();
  }, [load]);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [connNo, setConnNo] = useState('');
  const [connName, setConnName] = useState('');
  const [platform, setPlatform] = useState<BiPlatform>('powerbi');
  const [endpoint, setEndpoint] = useState('');
  const [dataset, setDataset] = useState('');
  const [status, setStatus] = useState<BiStatus>('disconnected');
  const [remark, setRemark] = useState('');

  const reset = () => {
    setEditId(null); setConnName(''); setPlatform('powerbi'); setEndpoint('');
    setDataset(''); setStatus('disconnected'); setRemark('');
  };
  const openCreate = () => { reset(); setConnNo(nextNo('BI')); setOpen(true); };
  const openEdit = (r: BiConnection) => {
    setEditId(r.id); setConnNo(r.connNo); setConnName(r.connName); setPlatform(r.platform);
    setEndpoint(r.endpoint); setDataset(r.dataset); setStatus(r.status); setRemark(r.remark || '');
    setOpen(true);
  };

  const save = () => {
    const base = {
      connNo, connName, platform, endpoint, dataset, status,
      remark: remark || undefined, updatedAt: nowStr(), updatedBy: 'admin',
    };
    if (editId) updateConn(editId, base);
    else addConn({ ...base, id: `bi-${Date.now()}`, createdAt: nowStr(), createdBy: 'admin' } as BiConnection);
    setOpen(false);
  };

  const syncAll = () => {
    list.filter((c) => c.status !== 'connected').forEach((c) => syncConnection(c.id));
  };

  const connectedCount = list.filter((c) => c.status === 'connected').length;
  const errorCount = list.filter((c) => c.status === 'error').length;

  const columns = [
    { accessorKey: 'connNo', header: '连接号' },
    { accessorKey: 'connName', header: '连接名称' },
    { accessorKey: 'platform', header: '平台', cell: (c: any) => BI_PLATFORM_LABELS[c.getValue() as BiPlatform] },
    { accessorKey: 'endpoint', header: '服务地址' },
    { accessorKey: 'dataset', header: '数据集/看板' },
    {
      accessorKey: 'status', header: '状态',
      cell: (c: any) => <StatusBadge status={`bi_${c.getValue() as BiStatus}`} />,
    },
    { accessorKey: 'lastSyncAt', header: '最近同步', cell: (c: any) => (c.getValue() ? new Date(c.getValue()).toLocaleString('zh-CN') : '—') },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">BI 集成（P2-19）</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Sync />} onClick={syncAll} data-testid="bi-conn-sync">同步全部</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新建连接</Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">连接总数</Typography><Typography variant="h6">{list.length}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">已连接</Typography><Typography variant="h6" sx={{ color: '#10b981' }}>{connectedCount}</Typography></Paper>
        <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption" color="text.secondary">异常</Typography><Typography variant="h6" sx={{ color: '#ef4444' }}>{errorCount}</Typography></Paper>
      </Stack>

      <DataTable
        data={list} columns={columns}
        onView={(r) => openEdit(r)} onEdit={(r) => openEdit(r)} onDelete={(r) => deleteConn(r.id)}
        enableExport enableColumnFilter sapStyle columnConfigKey="bi-connections"
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑 BI 连接' : '新建 BI 连接'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="连接号" value={connNo} onChange={(e) => setConnNo(e.target.value)} fullWidth disabled />
              <TextField label="连接名称" value={connName} onChange={(e) => setConnName(e.target.value)} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select label="平台" value={platform} onChange={(e) => setPlatform(e.target.value as BiPlatform)} fullWidth>
                {(Object.keys(BI_PLATFORM_LABELS) as BiPlatform[]).map((p) => (<MenuItem key={p} value={p}>{BI_PLATFORM_LABELS[p]}</MenuItem>))}
              </TextField>
              <TextField select label="状态" value={status} onChange={(e) => setStatus(e.target.value as BiStatus)} fullWidth>
                {(Object.keys(BI_STATUS_LABELS) as BiStatus[]).map((s) => (<MenuItem key={s} value={s}>{BI_STATUS_LABELS[s]}</MenuItem>))}
              </TextField>
            </Stack>
            <TextField label="服务地址 / Endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} fullWidth placeholder="https://..." />
            <TextField label="数据集 / 看板" value={dataset} onChange={(e) => setDataset(e.target.value)} fullWidth />
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
