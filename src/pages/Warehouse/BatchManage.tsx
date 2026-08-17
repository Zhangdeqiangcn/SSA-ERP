import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Stack, MenuItem, Grid, Alert, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, Search, Close, Visibility } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { ConfirmDialog } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseMasterStore, selectWarehousesByOrg } from '@/stores/warehouseMasterStore';
import { useOrgStore } from '@/stores/orgStore';
import { BatchRecord, BatchStatus, matchOrg } from '@/types';

const STATUS_CONFIG: Record<BatchStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: '#10B981' },
  expiring: { label: '临期', color: '#F59E0B' },
  expired: { label: '已过期', color: '#EF4444' },
  locked: { label: '锁定', color: '#64748B' },
};

const EXPIRING_WINDOW_DAYS = 60;

const computeStatus = (b: Partial<BatchRecord>, refDate: string): BatchStatus => {
  if (b.locked) return 'locked';
  if (b.expiryDate) {
    const exp = new Date(b.expiryDate).getTime();
    const ref = new Date(refDate).getTime();
    if (isNaN(exp)) return 'normal';
    if (exp < ref) return 'expired';
    if (exp - ref <= EXPIRING_WINDOW_DAYS * 86400000) return 'expiring';
  }
  return 'normal';
};

const BatchManage: React.FC = () => {
  const { batchRecords, addBatchRecord, updateBatchRecord, deleteBatchRecord } = useWarehouseStore();
  const materials = useMaterialStore((s) => s.materials);
  const warehouses = useWarehouseMasterStore((s) => s.warehouses);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const orgBatches = batchRecords.filter((b) => matchOrg(b, currentOrgId));

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BatchRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BatchRecord | null>(null);

  const [form, setForm] = useState<Partial<BatchRecord>>({
    batchNo: '', materialCode: '', materialName: '', warehouseId: visibleWarehouses[0]?.id || 'wh-001', warehouseName: visibleWarehouses[0]?.name || '主仓库',
    quantity: 0, productionDate: '', expiryDate: '', inboundNo: '', inboundDate: new Date().toISOString().slice(0, 10),
    supplierName: '', status: 'normal',
  });

  const refDate = useMemo(() => {
    const dates = batchRecords.map((b) => b.inboundDate).filter(Boolean) as string[];
    return dates.length ? dates.sort().slice(-1)[0] : new Date().toISOString().slice(0, 10);
  }, [batchRecords]);

  const filtered = orgBatches.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (search && !`${b.batchNo}${b.materialName}${b.supplierName}`.includes(search)) return false;
    return true;
  });

  const stats = [
    { label: '批次总数', count: orgBatches.length, color: '#3B82F6' },
    { label: '正常', count: orgBatches.filter((b) => b.status === 'normal').length, color: '#10B981' },
    { label: '临期', count: orgBatches.filter((b) => b.status === 'expiring').length, color: '#F59E0B' },
    { label: '已过期', count: orgBatches.filter((b) => b.status === 'expired').length, color: '#EF4444' },
    { label: '锁定', count: orgBatches.filter((b) => b.status === 'locked').length, color: '#64748B' },
  ];

  const openCreate = () => {
    setEditing(null);
    setForm({
      batchNo: '', materialCode: '', materialName: '', warehouseId: visibleWarehouses[0]?.id || 'wh-001', warehouseName: visibleWarehouses[0]?.name || '主仓库',
      quantity: 0, productionDate: '', expiryDate: '', inboundNo: '', inboundDate: new Date().toISOString().slice(0, 10),
      supplierName: '', status: 'normal',
    });
    setDialogOpen(true);
  };

  const openEdit = (b: BatchRecord) => {
    setEditing(b);
    setForm({ ...b });
    setDialogOpen(true);
  };

  const handleMaterialPick = (code: string) => {
    const m = materials.find((x) => x.code === code);
    if (m) setForm((f) => ({ ...f, materialCode: m.code, materialName: m.name }));
  };

  const handleSave = () => {
    if (!form.batchNo || !form.materialName) return;
    const status = computeStatus(form, refDate);
    if (editing) {
      updateBatchRecord(editing.id, { ...form, status } as BatchRecord);
    } else {
      addBatchRecord({ ...form, id: `bat-${Date.now()}`, status } as BatchRecord);
    }
    setDialogOpen(false);
  };

  const materialOptions = materials.map((m) => ({ code: m.code, name: m.name }));

  return (
    <PageWrapper
      title="批次管理"
      subtitle="批次/序列号追踪与效期预警（对标 SAP / 用友 / 金蝶）"
      actions={<Button variant="contained" startIcon={<Add />} onClick={openCreate}>新增批次</Button>}
    >
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {stats.map((s) => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, minWidth: 120,
            border: `1px solid ${s.color}20`, bgcolor: s.color + '08' }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.count}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 搜索/筛选 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField size="small" placeholder="搜索批次号/物料/供应商" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }} /> }}
            sx={{ width: 280 }} />
          <TextField select size="small" label="状态" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BatchStatus | '')} sx={{ width: 140 }}>
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="normal">正常</MenuItem>
            <MenuItem value="expiring">临期</MenuItem>
            <MenuItem value="expired">已过期</MenuItem>
            <MenuItem value="locked">锁定</MenuItem>
          </TextField>
          <Box flex={1} />
          <Alert severity="info" sx={{ py: 0 }}><Typography variant="caption">数据基准日：{refDate}（用于效期计算）</Typography></Alert>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>批次号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>仓库</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">数量</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>生产日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>效期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>入库日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell><Typography variant="body2" fontFamily="monospace" color="#3B82F6">{b.batchNo}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{b.materialName}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.materialCode}</Typography>
                  </TableCell>
                  <TableCell>{b.warehouseName || b.warehouseId}</TableCell>
                  <TableCell align="right">{b.quantity}</TableCell>
                  <TableCell>{b.productionDate || '-'}</TableCell>
                  <TableCell>{b.expiryDate || '—'}</TableCell>
                  <TableCell>{b.inboundDate}</TableCell>
                  <TableCell>{b.supplierName || '-'}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_CONFIG[b.status].label} size="small"
                      sx={{ bgcolor: STATUS_CONFIG[b.status].color + '15', color: STATUS_CONFIG[b.status].color, fontWeight: 500 }} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(b)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setDeleteTarget(b)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: '#94A3B8' }}>暂无批次数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {editing ? '编辑批次' : '新增批次'}
            <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="批次号" value={form.batchNo || ''}
                onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="仓库" value={form.warehouseId || visibleWarehouses[0]?.id || 'wh-001'}
                onChange={(e) => {
                  const w = visibleWarehouses.find((x) => x.id === e.target.value);
                  setForm((f) => ({ ...f, warehouseId: e.target.value, warehouseName: w?.name }));
                }}>
                {visibleWarehouses.map((w) => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" select label="物料" value={form.materialCode || ''}
                onChange={(e) => handleMaterialPick(e.target.value)}
                SelectProps={{ native: false }}
                InputLabelProps={{ shrink: true }}>
                {materialOptions.map((m) => (
                  <MenuItem key={m.code} value={m.code}>{m.name}（{m.code}）</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="数量" value={form.quantity ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="供应商" value={form.supplierName || ''}
                onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="生产日期" type="date" value={form.productionDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, productionDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="效期" type="date" value={form.expiryDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="入库单号" value={form.inboundNo || ''}
                onChange={(e) => setForm((f) => ({ ...f, inboundNo: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="入库日期" type="date" value={form.inboundDate || ''}
                onChange={(e) => setForm((f) => ({ ...f, inboundDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除批次"
        content={`确定删除批次 "${deleteTarget?.batchNo}" 吗？此操作不可逆。`}
        confirmText="确认删除"
        confirmColor="error"
        onConfirm={() => { if (deleteTarget) deleteBatchRecord(deleteTarget.id); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  );
};

export default BatchManage;
