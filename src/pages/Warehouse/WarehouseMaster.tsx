import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Alert, Tooltip, Stack,
  MenuItem, Select, FormControl, InputLabel, Collapse,
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore, ExpandLess, LocationOn, Warehouse as WarehouseIcon, RestartAlt } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { ConfirmDialog } from '@/components/common';
import {
  useWarehouseMasterStore,
  selectWarehousesByOrg,
  WAREHOUSE_TYPE_LABELS,
} from '@/stores/warehouseMasterStore';
import { useOrgStore } from '@/stores/orgStore';
import { Warehouse, WarehouseLocation, WarehouseType } from '@/types';

const WarehouseMaster: React.FC = () => {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, addLocation, updateLocation, deleteLocation, resetWarehouses, loadWarehouses } =
    useWarehouseMasterStore();
  const { organizations, currentOrgId } = useOrgStore();

  // W4：在线时从后端 D1 拉取仓库权威源并按 id 合并（离线/异常保留本地种子）
  useEffect(() => {
    void loadWarehouses?.();
    // 仅挂载时拉一次，避免每次渲染触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [whDialog, setWhDialog] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [whForm, setWhForm] = useState<Partial<Warehouse>>({});
  const [delWh, setDelWh] = useState<Warehouse | null>(null);

  const [locDialog, setLocDialog] = useState(false);
  const [locWhId, setLocWhId] = useState<string>('');
  const [editingLoc, setEditingLoc] = useState<WarehouseLocation | null>(null);
  const [locForm, setLocForm] = useState<Partial<WarehouseLocation>>({});
  const [delLoc, setDelLoc] = useState<{ whId: string; loc: WarehouseLocation } | null>(null);

  const visible = warehouses.filter(selectWarehousesByOrg(currentOrgId));

  const openWhCreate = () => {
    setEditingWh(null);
    setWhForm({ orgId: currentOrgId, type: 'raw', status: 'active' });
    setWhDialog(true);
  };
  const openWhEdit = (w: Warehouse) => {
    setEditingWh(w);
    setWhForm({ ...w });
    setWhDialog(true);
  };
  const saveWh = () => {
    if (!whForm.name || !whForm.code) return;
    const payload = {
      code: whForm.code!,
      name: whForm.name!,
      orgId: whForm.orgId || currentOrgId,
      type: (whForm.type || 'raw') as WarehouseType,
      address: whForm.address,
      manager: whForm.manager,
      status: (whForm.status || 'active') as 'active' | 'disabled',
      locations: whForm.locations || [],
    };
    if (editingWh) updateWarehouse(editingWh.id, payload);
    else addWarehouse(payload);
    setWhDialog(false);
  };

  const openLocCreate = (whId: string) => {
    setLocWhId(whId);
    setEditingLoc(null);
    setLocForm({});
    setLocDialog(true);
  };
  const openLocEdit = (whId: string, l: WarehouseLocation) => {
    setLocWhId(whId);
    setEditingLoc(l);
    setLocForm({ ...l });
    setLocDialog(true);
  };
  const saveLoc = () => {
    if (!locForm.name || !locForm.code) return;
    const payload = { code: locForm.code!, name: locForm.name!, zone: locForm.zone, remark: locForm.remark };
    if (editingLoc) updateLocation(locWhId, editingLoc.id, payload);
    else addLocation(locWhId, payload);
    setLocDialog(false);
  };

  const orgName = (id?: string) => organizations.find((o) => o.id === id)?.name || id || '-';

  return (
    <PageWrapper
      title="仓库主数据"
      subtitle="统一管理仓库与库位（P2-2 多仓多库位，替代各表单硬编码仓库）"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={resetWarehouses}>重置</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openWhCreate}>新增仓库</Button>
        </Stack>
      }
    >
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        当前组织：<strong>{orgName(currentOrgId)}</strong>。仓库按所属组织隔离；切换顶栏组织可查看对应仓库与库位。
      </Alert>

      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }} />
                <TableCell sx={{ fontWeight: 600 }}>仓库编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>所属组织</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>负责人</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">库位数</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((w) => (
                <React.Fragment key={w.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
                        {expanded === w.id ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell><Typography variant="body2" fontFamily="monospace" color="#3B82F6">{w.code}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarehouseIcon fontSize="small" sx={{ color: '#64748B' }} />
                        <Typography variant="body2" fontWeight={500}>{w.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={WAREHOUSE_TYPE_LABELS[w.type]} size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6' }} /></TableCell>
                    <TableCell>{orgName(w.orgId)}</TableCell>
                    <TableCell>{w.manager || '-'}</TableCell>
                    <TableCell align="right">{w.locations.length}</TableCell>
                    <TableCell>
                      <Chip label={w.status === 'active' ? '启用' : '停用'} size="small"
                        sx={{ bgcolor: w.status === 'active' ? '#10B98115' : '#64748B15', color: w.status === 'active' ? '#10B981' : '#64748B' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="新增库位"><IconButton size="small" onClick={() => openLocCreate(w.id)}><LocationOn fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => openWhEdit(w)}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setDelWh(w)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={9} sx={{ p: 0, border: 'none' }}>
                      <Collapse in={expanded === w.id} timeout="auto" unmountOnExit>
                        <Box sx={{ bgcolor: '#F8FAFC', p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>库位列表（{w.name}）</Typography>
                            <Button size="small" startIcon={<Add />} onClick={() => openLocCreate(w.id)}>新增库位</Button>
                          </Stack>
                          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 600 }}>库位编码</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>库区</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }} align="right">操作</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {w.locations.map((l) => (
                                  <TableRow key={l.id} hover>
                                    <TableCell><Typography variant="body2" fontFamily="monospace">{l.code}</Typography></TableCell>
                                    <TableCell>{l.name}</TableCell>
                                    <TableCell>{l.zone || '-'}</TableCell>
                                    <TableCell align="right">
                                      <IconButton size="small" onClick={() => openLocEdit(w.id, l)}><Edit fontSize="small" /></IconButton>
                                      <IconButton size="small" color="error" onClick={() => setDelLoc({ whId: w.id, loc: l })}><Delete fontSize="small" /></IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {w.locations.length === 0 && (
                                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 2, color: '#94A3B8' }}>暂无库位</TableCell></TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94A3B8' }}>当前组织下暂无仓库</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 仓库新增/编辑 */}
      <Dialog open={whDialog} onClose={() => setWhDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingWh ? '编辑仓库' : '新增仓库'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="仓库编码" value={whForm.code || ''}
                onChange={(e) => setWhForm((f) => ({ ...f, code: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="名称" value={whForm.name || ''}
                onChange={(e) => setWhForm((f) => ({ ...f, name: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>所属组织</InputLabel>
                <Select label="所属组织" value={whForm.orgId || currentOrgId}
                  onChange={(e) => setWhForm((f) => ({ ...f, orgId: e.target.value }))}>
                  {organizations.map((o) => (<MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>类型</InputLabel>
                <Select label="类型" value={whForm.type || 'raw'}
                  onChange={(e) => setWhForm((f) => ({ ...f, type: e.target.value as WarehouseType }))}>
                  {Object.entries(WAREHOUSE_TYPE_LABELS).map(([k, v]) => (<MenuItem key={k} value={k}>{v}</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="负责人" value={whForm.manager || ''}
                onChange={(e) => setWhForm((f) => ({ ...f, manager: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select label="状态" value={whForm.status || 'active'}
                  onChange={(e) => setWhForm((f) => ({ ...f, status: e.target.value as 'active' | 'disabled' }))}>
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="disabled">停用</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="地址" value={whForm.address || ''}
                onChange={(e) => setWhForm((f) => ({ ...f, address: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWhDialog(false)}>取消</Button>
          <Button variant="contained" onClick={saveWh}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 库位新增/编辑 */}
      <Dialog open={locDialog} onClose={() => setLocDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editingLoc ? '编辑库位' : '新增库位'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="库位编码" value={locForm.code || ''}
                onChange={(e) => setLocForm((f) => ({ ...f, code: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="名称" value={locForm.name || ''}
                onChange={(e) => setLocForm((f) => ({ ...f, name: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="库区" value={locForm.zone || ''}
                onChange={(e) => setLocForm((f) => ({ ...f, zone: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="备注" value={locForm.remark || ''}
                onChange={(e) => setLocForm((f) => ({ ...f, remark: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocDialog(false)}>取消</Button>
          <Button variant="contained" onClick={saveLoc}>保存</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!delWh}
        title="确认删除仓库"
        content={`确定删除仓库 "${delWh?.name}" 吗？其下库位将一并删除。`}
        confirmText="确认删除"
        confirmColor="error"
        onConfirm={() => { if (delWh) deleteWarehouse(delWh.id); setDelWh(null); }}
        onCancel={() => setDelWh(null)}
      />
      <ConfirmDialog
        open={!!delLoc}
        title="确认删除库位"
        content={`确定删除库位 "${delLoc?.loc.name}" 吗？`}
        confirmText="确认删除"
        confirmColor="error"
        onConfirm={() => { if (delLoc) deleteLocation(delLoc.whId, delLoc.loc.id); setDelLoc(null); }}
        onCancel={() => setDelLoc(null)}
      />
    </PageWrapper>
  );
};

export default WarehouseMaster;
