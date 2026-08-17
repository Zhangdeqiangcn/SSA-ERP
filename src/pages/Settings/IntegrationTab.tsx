import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Table, TableContainer, TableHead,
  TableBody, TableRow, TableCell, Chip, Stack, Snackbar, Alert, MenuItem,
  Select, InputLabel, FormControl, Switch, Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, Save, Hub, CloudQueue, LinkOff, CheckCircle,
  Sync, Warehouse, LocalShipping, PrecisionManufacturing, AccountBalance,
} from '@mui/icons-material';
import {
  useSettingsStore,
  type Integration,
  type IntType,
  type IntStatus,
} from '@/stores/settingsStore';

const TYPE_META: Record<IntType, { label: string; icon: React.ReactNode; color: string }> = {
  WMS: { label: '仓储管理系统', icon: <Warehouse />, color: '#10B981' },
  TMS: { label: '运输管理系统', icon: <LocalShipping />, color: '#3B82F6' },
  MES: { label: '制造执行系统', icon: <PrecisionManufacturing />, color: '#8B5CF6' },
  PLM: { label: '产品生命周期', icon: <Hub />, color: '#F97316' },
  SRM: { label: '供应商关系', icon: <CloudQueue />, color: '#F59E0B' },
  FINANCE: { label: '财务系统', icon: <AccountBalance />, color: '#6366F1' },
};

const STATUS_LABEL: Record<IntStatus, { label: string; color: 'success' | 'default' | 'warning' }> = {
  connected: { label: '已连接', color: 'success' },
  disconnected: { label: '未连接', color: 'default' },
  testing: { label: '连接测试中', color: 'warning' },
};

const IntegrationTab: React.FC = () => {
  const items = useSettingsStore((s) => s.integrations);
  const setIntegrations = useSettingsStore((s) => s.setIntegrations);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [form, setForm] = useState<{ name: string; type: IntType; url: string; enabled: boolean; frequency: string }>(
    { name: '', type: 'WMS', url: '', enabled: true, frequency: '实时' }
  );
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', type: 'WMS', url: '', enabled: true, frequency: '实时' });
    setDialogOpen(true);
  };
  const openEdit = (it: Integration) => {
    setEditing(it);
    setForm({ name: it.name, type: it.type, url: it.url, enabled: it.enabled, frequency: it.frequency });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.url) {
      setSnackbar({ open: true, msg: '请填写系统名称与接口地址' });
      return;
    }
    if (editing) {
      setIntegrations(items.map(i => i.id === editing.id ? { ...i, ...form } : i));
    } else {
      setIntegrations([...items, { id: `i-${Date.now()}`, status: 'disconnected', ...form }]);
    }
    setDialogOpen(false);
    setSnackbar({ open: true, msg: '对接配置已保存' });
  };

  const handleDelete = (id: string) => setIntegrations(items.filter(i => i.id !== id));

  const testConnection = (id: string) => {
    setIntegrations(items.map(i => i.id === id ? { ...i, status: 'testing' } : i));
    setSnackbar({ open: true, msg: '正在测试连接…' });
    setTimeout(() => {
      setIntegrations(items.map(i => i.id === id ? { ...i, status: 'connected', enabled: true } : i));
    }, 1200);
  };

  const connectedCount = items.filter(i => i.status === 'connected').length;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8125rem' }}>
        配置与外部系统的对接通道（WMS / TMS / MES / PLM / SRM / 财务）。支持启停、同步频率与「测试连接」。对应 Phase 3「WMS/TMS 对接」能力（演示环境为模拟接口）。
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Sync sx={{ color: '#10B981' }} />
            <Typography variant="h5" fontWeight={700}>{connectedCount}</Typography>
            <Typography variant="caption" color="text.secondary">已连接通道</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <LinkOff sx={{ color: '#94A3B8' }} />
            <Typography variant="h5" fontWeight={700}>{items.length - connectedCount}</Typography>
            <Typography variant="caption" color="text.secondary">未连接通道</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <Warehouse sx={{ color: '#10B981' }} />
            <Typography variant="h5" fontWeight={700}>{items.filter(i => i.type === 'WMS').length}</Typography>
            <Typography variant="caption" color="text.secondary">WMS 通道</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
            <LocalShipping sx={{ color: '#3B82F6' }} />
            <Typography variant="h5" fontWeight={700}>{items.filter(i => i.type === 'TMS').length}</Typography>
            <Typography variant="caption" color="text.secondary">TMS 通道</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EEF2F7' }}>
          <Typography variant="subtitle1" fontWeight={700}>对接通道列表</Typography>
          <Button size="small" variant="contained" startIcon={<Add />} onClick={openAdd}>新增通道</Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>系统</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>接口地址</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>同步频率</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>启用</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(it => {
                const meta = TYPE_META[it.type];
                return (
                  <TableRow key={it.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ color: meta.color, display: 'flex' }}>{meta.icon}</Box>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{it.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{meta.label}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip label={it.type} size="small" variant="outlined" /></TableCell>
                    <TableCell><Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.75rem' }}>{it.url}</Typography></TableCell>
                    <TableCell>{it.frequency}</TableCell>
                    <TableCell>
                      <Chip label={STATUS_LABEL[it.status].label} size="small"
                        color={STATUS_LABEL[it.status].color}
                        icon={it.status === 'connected' ? <CheckCircle /> : undefined} />
                    </TableCell>
                    <TableCell>
                      <Switch size="small" checked={it.enabled}
                        onChange={e => setIntegrations(items.map(i => i.id === it.id ? { ...i, enabled: e.target.checked } : i))} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => testConnection(it.id)} disabled={it.status === 'testing'}>测试</Button>
                      <IconButton size="small" onClick={() => openEdit(it)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(it.id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? '编辑对接通道' : '新增对接通道'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="系统名称" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>系统类型</InputLabel>
              <Select value={form.type} label="系统类型" onChange={e => setForm(f => ({ ...f, type: e.target.value as IntType }))}>
                {(Object.keys(TYPE_META) as IntType[]).map(t => (
                  <MenuItem key={t} value={t}>{t} · {TYPE_META[t].label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="接口地址 (URL)" value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))} fullWidth
              placeholder="https://..." />
            <FormControl fullWidth>
              <InputLabel>同步频率</InputLabel>
              <Select value={form.frequency} label="同步频率" onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {['实时', '每 5 分钟', '每 15 分钟', '每小时', '每日'].map(fr => (
                  <MenuItem key={fr} value={fr}>{fr}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
              <Typography variant="body2">启用该通道</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={2500}
        onClose={() => setSnackbar({ open: false, msg: '' })} message={snackbar.msg} />
    </Box>
  );
};

export default IntegrationTab;
