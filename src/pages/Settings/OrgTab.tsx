import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, Alert, Tooltip, Stack,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle, RadioButtonUnchecked, RestartAlt, AccountBalance, AccountTree, ViewList, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useOrgStore } from '@/stores/orgStore';
import { Organization, OrgType, OrgStatus } from '@/types';

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  company: '公司',
  plant: '工厂',
  department: '部门',
};

const OrgTab: React.FC = () => {
  const { organizations, currentOrgId, addOrg, updateOrg, deleteOrg, setCurrentOrg, resetOrgs } = useOrgStore();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState<Partial<Organization>>({});
  const [del, setDel] = useState<Organization | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const openCreate = () => {
    setEditing(null);
    setForm({ type: 'department', status: 'active', currency: '人民币 (CNY)', ledgerCode: '' });
    setDialog(true);
  };
  const openEdit = (o: Organization) => {
    setEditing(o);
    setForm({ ...o });
    setDialog(true);
  };
  const save = () => {
    if (!form.name || !form.code) return;
    const payload = {
      code: form.code!,
      name: form.name!,
      type: (form.type || 'department') as OrgType,
      parentOrgId: form.parentOrgId,
      parentId: form.parentOrgId || form.parentId,
      ledgerCode: form.ledgerCode || '',
      currency: form.currency || '人民币 (CNY)',
      taxNo: form.taxNo,
      address: form.address,
      contact: form.contact,
      status: (form.status || 'active') as OrgStatus,
      intercompanyEnabled: form.intercompanyEnabled,
    };
    if (editing) updateOrg(editing.id, payload);
    else addOrg(payload);
    setDialog(false);
  };

  // 构建树形结构：顶层 orgs + children
  const rootOrgs = organizations.filter(o => !o.parentOrgId);
  const getChildren = (parentId: string) => organizations.filter(o => o.parentOrgId === parentId);

  const renderTreeRow = (org: Organization, depth: number = 0) => {
    const children = getChildren(org.id);
    const isExpanded = expanded[org.id] !== false;
    const hasChildren = children.length > 0;
    return (
      <React.Fragment key={org.id}>
        <TableRow hover>
          <TableCell sx={{ pl: 2 + depth * 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {hasChildren ? (
                <IconButton size="small" onClick={() => toggleExpanded(org.id)}>
                  {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              ) : (
                <Box sx={{ width: 28 }} />
              )}
              {currentOrgId === org.id
                ? <CheckCircle sx={{ color: '#10B981', fontSize: 18 }} />
                : <IconButton size="small" onClick={() => setCurrentOrg(org.id)} title="切换为当前组织"><RadioButtonUnchecked fontSize="small" sx={{ color: '#94A3B8' }} /></IconButton>}
              <AccountBalance fontSize="small" sx={{ color: '#64748B', ml: 0.5 }} />
            </Box>
          </TableCell>
          <TableCell><Typography variant="body2" fontFamily="monospace" color="#3B82F6">{org.code}</Typography></TableCell>
          <TableCell>
            <Typography variant="body2" fontWeight={500}>{org.name}</Typography>
          </TableCell>
          <TableCell><Chip label={ORG_TYPE_LABELS[org.type]} size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6' }} /></TableCell>
          <TableCell>{organizations.find((x) => x.id === org.parentOrgId)?.name || '-'}</TableCell>
          <TableCell><Typography variant="body2" fontFamily="monospace">{org.ledgerCode}</Typography></TableCell>
          <TableCell>{org.currency}</TableCell>
          <TableCell>
            <Chip label={org.status === 'active' ? '启用' : '停用'} size="small"
              sx={{ bgcolor: org.status === 'active' ? '#10B98115' : '#64748B15', color: org.status === 'active' ? '#10B981' : '#64748B' }} />
          </TableCell>
          <TableCell align="right">
            <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(org)}><Edit fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="删除"><span><IconButton size="small" color="error" disabled={currentOrgId === org.id} onClick={() => setDel(org)}><Delete fontSize="small" /></IconButton></span></Tooltip>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && children.map(child => renderTreeRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  const renderListRows = () =>
    organizations.map((o) => (
      <TableRow key={o.id} hover>
        <TableCell>
          {currentOrgId === o.id
            ? <CheckCircle sx={{ color: '#10B981', fontSize: 18 }} />
            : <IconButton size="small" onClick={() => setCurrentOrg(o.id)} title="切换为当前组织"><RadioButtonUnchecked fontSize="small" sx={{ color: '#94A3B8' }} /></IconButton>}
        </TableCell>
        <TableCell><Typography variant="body2" fontFamily="monospace" color="#3B82F6">{o.code}</Typography></TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalance fontSize="small" sx={{ color: '#64748B' }} />
            <Typography variant="body2" fontWeight={500}>{o.name}</Typography>
          </Box>
        </TableCell>
        <TableCell><Chip label={ORG_TYPE_LABELS[o.type]} size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6' }} /></TableCell>
        <TableCell>{organizations.find((x) => x.id === o.parentOrgId)?.name || '-'}</TableCell>
        <TableCell><Typography variant="body2" fontFamily="monospace">{o.ledgerCode}</Typography></TableCell>
        <TableCell>{o.currency}</TableCell>
        <TableCell>
          <Chip label={o.status === 'active' ? '启用' : '停用'} size="small"
            sx={{ bgcolor: o.status === 'active' ? '#10B98115' : '#64748B15', color: o.status === 'active' ? '#10B981' : '#64748B' }} />
        </TableCell>
        <TableCell align="right">
          <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(o)}><Edit fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="删除"><span><IconButton size="small" color="error" disabled={currentOrgId === o.id} onClick={() => setDel(o)}><Delete fontSize="small" /></IconButton></span></Tooltip>
        </TableCell>
      </TableRow>
    ));

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        多组织 / 多账套（P2-2）。顶栏可切换当前组织，各业务单据自动归属当前组织；遗留数据（无组织标记）在任一组织下可见。
      </Alert>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>组织与账套</Typography>
          <Button
            size="small"
            variant={viewMode === 'tree' ? 'contained' : 'outlined'}
            startIcon={<AccountTree fontSize="small" />}
            onClick={() => setViewMode('tree')}
            data-testid="org-tree"
          >
            树形
          </Button>
          <Button
            size="small"
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            startIcon={<ViewList fontSize="small" />}
            onClick={() => setViewMode('list')}
          >
            列表
          </Button>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={resetOrgs}>重置</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新增组织</Button>
        </Stack>
      </Stack>

      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>当前</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>上级</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>账套</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>本位币</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {viewMode === 'tree' ? rootOrgs.map(org => renderTreeRow(org)) : renderListRows()}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? '编辑组织' : '新增组织'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="组织编码" value={form.code || ''}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="名称" value={form.name || ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>类型</InputLabel>
                <Select label="类型" value={form.type || 'department'}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OrgType }))}>
                  <MenuItem value="company">公司</MenuItem>
                  <MenuItem value="plant">工厂</MenuItem>
                  <MenuItem value="department">部门</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>上级组织</InputLabel>
                <Select label="上级组织" value={form.parentOrgId || ''}
                  onChange={(e) => setForm((f) => ({ ...f, parentOrgId: e.target.value || undefined, parentId: e.target.value || undefined }))}>
                  <MenuItem value="">无</MenuItem>
                  {organizations.filter((o) => o.id !== editing?.id).map((o) => (<MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="账套编码" value={form.ledgerCode || ''}
                onChange={(e) => setForm((f) => ({ ...f, ledgerCode: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="本位币" value={form.currency || ''}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="税号" value={form.taxNo || ''}
                onChange={(e) => setForm((f) => ({ ...f, taxNo: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="联系人" value={form.contact || ''}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="地址" value={form.address || ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>组织间交易</InputLabel>
                <Select label="组织间交易" value={form.intercompanyEnabled ? 'yes' : 'no'}
                  onChange={(e) => setForm((f) => ({ ...f, intercompanyEnabled: e.target.value === 'yes' }))}
                  defaultValue="no">
                  <MenuItem value="yes">启用</MenuItem>
                  <MenuItem value="no">禁用</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>取消</Button>
          <Button variant="contained" onClick={save}>保存</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDelete
        target={del}
        onCancel={() => setDel(null)}
        onConfirm={() => { if (del) deleteOrg(del.id); setDel(null); }}
      />
    </Box>
  );
};

// 轻量确认删除（避免引入额外依赖）
const ConfirmDelete: React.FC<{ target: Organization | null; onCancel: () => void; onConfirm: () => void }> = ({ target, onCancel, onConfirm }) => {
  const [open, setOpen] = useState(false);
  React.useEffect(() => { setOpen(!!target); }, [target]);
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>确认删除组织</DialogTitle>
      <DialogContent>确定删除组织 "{target?.name}" 吗？当前组织不可删除。</DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>取消</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>删除</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrgTab;
