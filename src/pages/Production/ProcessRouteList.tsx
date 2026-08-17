import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, MenuItem,
} from '@mui/material';
import { Add, Visibility, Edit, PlayArrow, Close, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useProductionStore } from '@/stores/productionStore';
import { ProcessRoute, ProcessRouteStatus, Operation } from '@/types/production';

const STATUS_LABELS: Record<ProcessRouteStatus, string> = {
  draft: '草稿',
  active: '启用',
  obsolete: '废弃',
};

const STATUS_COLORS: Record<ProcessRouteStatus, string> = {
  draft: '#F59E0B',
  active: '#10B981',
  obsolete: '#94A3B8',
};

interface OpForm {
  operationName: string;
  workCenter: string;
  runTime: string;
}
const emptyOp: OpForm = { operationName: '', workCenter: '', runTime: '0' };

const genRouteNo = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RT${ymd}${rand}`;
};
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const ProcessRouteList: React.FC = () => {
  const { processRoutes, addProcessRoute, updateProcessRoute } = useProductionStore();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routeNo, setRouteNo] = useState('');
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [version, setVersion] = useState('V1.0');
  const [status, setStatus] = useState<ProcessRouteStatus>('draft');
  const [totalLeadTime, setTotalLeadTime] = useState('0');
  const [ops, setOps] = useState<OpForm[]>([{ ...emptyOp }]);

  const openCreate = () => {
    setEditingId(null);
    setRouteNo(genRouteNo());
    setName(''); setProductCode(''); setProductName(''); setVersion('V1.0');
    setStatus('draft'); setTotalLeadTime('0'); setOps([{ ...emptyOp }]);
    setOpen(true);
  };
  const openEdit = (route: ProcessRoute) => {
    setEditingId(route.id);
    setRouteNo(route.routeNo); setName(route.name); setProductCode(route.productCode);
    setProductName(route.productName); setVersion(route.version); setStatus(route.status);
    setTotalLeadTime(String(route.totalLeadTime));
    setOps(route.operations.length
      ? route.operations.map(o => ({ operationName: o.operationName, workCenter: o.workCenter, runTime: String(o.runTime) }))
      : [{ ...emptyOp }]);
    setOpen(true);
  };

  const setOp = (i: number, k: keyof OpForm, v: string) =>
    setOps(prev => prev.map((o, idx) => idx === i ? { ...o, [k]: v } : o));
  const addOp = () => setOps(prev => [...prev, { ...emptyOp }]);
  const removeOp = (i: number) => setOps(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const ts = nowStr();
    const operations: Operation[] = ops
      .filter(o => o.operationName.trim())
      .map((o, i) => ({
        id: `op-${Date.now()}-${i}`,
        sequence: (i + 1) * 10,
        operationCode: `OP${(i + 1) * 10}`,
        operationName: o.operationName,
        workCenter: o.workCenter,
        setupTime: 0,
        runTime: Number(o.runTime) || 0,
        waitTime: 0,
      }));
    if (editingId) {
      updateProcessRoute(editingId, { routeNo, name, productCode, productName, version, status, totalLeadTime: Number(totalLeadTime) || 0, operations });
    } else {
      addProcessRoute({
        id: `rt-${Date.now()}`,
        routeNo, name, productCode, productName, version, status,
        totalLeadTime: Number(totalLeadTime) || 0, operations,
        createdAt: ts, updatedAt: ts, createdBy: '系统', updatedBy: '系统',
      });
    }
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>工艺路线</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新建工艺路线</Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {processRoutes.map((route) => (
          <Paper key={route.id} sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#94A3B8', fontWeight: 600 }}>{route.routeNo}</Typography>
                  <Chip label={route.version} size="small" sx={{ bgcolor: '#F8FAFC', color: '#475569' }} />
                  <Chip
                    label={STATUS_LABELS[route.status]}
                    size="small"
                    sx={{ bgcolor: STATUS_COLORS[route.status] + '15', color: STATUS_COLORS[route.status], fontWeight: 500 }}
                  />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>{route.name}</Typography>
                <Typography variant="body2" sx={{ color: '#64748B' }}>{route.productName} · 标准工时 {route.totalLeadTime}h</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="查看详情">
                  <IconButton size="small" onClick={() => openEdit(route)}><Visibility fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="编辑">
                  <IconButton size="small" onClick={() => openEdit(route)}><Edit fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0, overflowX: 'auto', pb: 1 }}>
              {route.operations.map((op, idx) => (
                <Box key={op.id} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      minWidth: 120, p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC',
                      border: '1px solid rgba(226,232,240,0.8)', textAlign: 'center',
                      '&:hover': { bgcolor: '#EFF6FF', borderColor: '#3B82F6' },
                    }}
                  >
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%', bgcolor: '#3B82F6', color: '#fff',
                      fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mx: 'auto', mb: 0.5
                    }}>
                      {op.sequence / 10}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#1E293B', display: 'block' }}>{op.operationName}</Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>{op.workCenter}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>{op.runTime}分/件</Typography>
                  </Box>
                  {idx < route.operations.length - 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, color: '#CBD5E1' }}>
                      <PlayArrow sx={{ fontSize: 18 }} />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {editingId ? '编辑工艺路线' : '新建工艺路线'}
            <IconButton onClick={() => setOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="路线编号" value={routeNo} onChange={e => setRouteNo(e.target.value)} data-testid="route-no" />
              <TextField fullWidth label="路线名称" value={name} onChange={e => setName(e.target.value)} data-testid="route-name" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="产品编码" value={productCode} onChange={e => setProductCode(e.target.value)} />
              <TextField fullWidth label="产品名称" value={productName} onChange={e => setProductName(e.target.value)} data-testid="route-product" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="版本" value={version} onChange={e => setVersion(e.target.value)} />
              <TextField select fullWidth label="状态" value={status} onChange={e => setStatus(e.target.value as ProcessRouteStatus)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField fullWidth label="标准工时(h)" type="number" value={totalLeadTime} onChange={e => setTotalLeadTime(e.target.value)} />
            </Stack>

            <Typography variant="subtitle2" sx={{ color: '#475569' }}>工序列表</Typography>
            {ops.map((op, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField label="工序名称" value={op.operationName}
                  onChange={e => setOp(i, 'operationName', e.target.value)} sx={{ flex: 2 }} />
                <TextField label="工作中心" value={op.workCenter}
                  onChange={e => setOp(i, 'workCenter', e.target.value)} sx={{ flex: 2 }} />
                <TextField label="工时(分/件)" type="number" value={op.runTime}
                  onChange={e => setOp(i, 'runTime', e.target.value)} sx={{ flex: 1 }} />
                <IconButton onClick={() => removeOp(i)} disabled={ops.length === 1} size="small">
                  <Delete fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Button startIcon={<Add />} onClick={addOp} sx={{ alignSelf: 'flex-start' }}>添加工序</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim() || !productName.trim()}
            data-testid="route-save">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProcessRouteList;
