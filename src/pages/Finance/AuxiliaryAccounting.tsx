import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Card, CardContent, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { FlowTracker } from '@/components/common';
import { useFinanceStore } from '@/stores/financeStore';
import { useFinanceExtensionStore, BASE_CURRENCY_CODE } from '@/stores/financeExtensionStore';

export default function AuxiliaryAccounting() {
  const { accountEntries } = useFinanceStore();
  const { costCenters, addCostCenter, updateCostCenter, removeCostCenter } = useFinanceExtensionStore();

  const [filterCC, setFilterCC] = useState('all');
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', dept: '', manager: '', note: '' });
  const [msg, setMsg] = useState<string | null>(null);

  // ── 凭证按成本中心/项目 维度归集 ──
  const filteredEntries = useMemo(() => {
    return accountEntries.filter((e) => {
      if (filterCC !== 'all') {
        if (e.costCenterId !== filterCC && e.projectId !== filterCC) return false;
      }
      return true;
    });
  }, [accountEntries, filterCC]);

  // 各成本中心发生额汇总
  const ccSummary = useMemo(() => {
    const map: Record<string, { name: string; amount: number }> = {};
    accountEntries.forEach((e) => {
      if (e.costCenterId) {
        const cc = costCenters.find((c) => c.id === e.costCenterId);
        const key = e.costCenterId;
        if (!map[key]) map[key] = { name: cc?.name || e.costCenterName || key, amount: 0 };
        map[key].amount += e.amount;
      }
    });
    return map;
  }, [accountEntries, costCenters]);

  const openCreate = () => {
    setEditId(null);
    setForm({ code: `CC-${String(costCenters.length + 1).padStart(3, '0')}`, name: '', dept: '', manager: '', note: '' });
    setMsg(null);
    setEditOpen(true);
  };
  const openEdit = (id: string) => {
    const c = costCenters.find((x) => x.id === id);
    if (!c) return;
    setEditId(id);
    setForm({ code: c.code, name: c.name, dept: c.dept, manager: c.manager, note: c.note || '' });
    setMsg(null);
    setEditOpen(true);
  };
  const handleSave = () => {
    if (editId) { updateCostCenter(editId, { ...form }); setMsg('成本中心已更新'); }
    else { addCostCenter({ ...form }); setMsg('成本中心已新增'); }
    setEditOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>辅助核算（成本中心 / 项目）</Typography>
        <FlowTracker module="finance" currentStatus="fin_aux" />
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openCreate}>新增成本中心</Button>
      </Box>

      {/* 成本中心 KPI + 汇总 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined"><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">成本中心数</Typography>
            <Typography variant="h5" fontWeight={700}>{costCenters.length}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined"><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">已挂辅助核算凭证</Typography>
            <Typography variant="h5" fontWeight={700}>{accountEntries.filter((e) => e.costCenterId || e.projectId).length}</Typography>
          </CardContent></Card>
        </Grid>
        {Object.entries(ccSummary).slice(0, 2).map(([id, v]) => (
          <Grid item xs={6} md={3} key={id}>
            <Card variant="outlined"><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="body2" color="text.secondary">{v.name} 发生额</Typography>
              <Typography variant="h5" fontWeight={700}>¥{v.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {/* 成本中心主数据表 */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>成本中心主数据</Typography>
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>所属部门</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>负责人</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>备注</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {costCenters.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell><Typography variant="body2" fontFamily="monospace">{c.code}</Typography></TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.dept}</TableCell>
                  <TableCell>{c.manager}</TableCell>
                  <TableCell>{c.note || '—'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(c.id)}>编辑</Button>
                    <Button size="small" color="error" onClick={() => removeCostCenter(c.id)}>删除</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* 凭证按维度查询 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>凭证辅助核算查询</Typography>
        <AccountTreeIcon fontSize="small" color="action" />
        <Box flex={1} />
        <TextField select size="small" label="维度筛选" value={filterCC} onChange={(e) => setFilterCC(e.target.value)} sx={{ width: 240 }}>
          <MenuItem value="all">全部凭证</MenuItem>
          {costCenters.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}（成本中心）</MenuItem>
          ))}
        </TextField>
      </Box>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>凭证号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>摘要</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>借方科目</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>贷方科目</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>成本中心</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>项目</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无符合条件凭证</TableCell></TableRow>
              )}
              {filteredEntries.map((e) => {
                const cc = costCenters.find((c) => c.id === e.costCenterId);
                return (
                  <TableRow key={e.id} hover>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{e.voucherNo}</Typography></TableCell>
                    <TableCell>{e.date}</TableCell>
                    <TableCell>{e.description}</TableCell>
                    <TableCell>{e.debitAccount || '—'}</TableCell>
                    <TableCell>{e.creditAccount || '—'}</TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>¥{e.amount.toLocaleString()}</Typography></TableCell>
                    <TableCell>{cc ? <Chip label={cc.name} size="small" /> : (e.costCenterName || '—')}</TableCell>
                    <TableCell>{e.projectName || e.projectId || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        提示：自动/手工生成凭证时可填写成本中心或项目维度（AccountEntry.costCenterId / projectId），此处即按维度归集。本位币：{BASE_CURRENCY_CODE}。
      </Typography>

      {/* 成本中心编辑弹框 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑成本中心' : '新增成本中心'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="编码" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="所属部门" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="负责人" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="备注" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {msg && <Chip label={msg} color="success" sx={{ mr: 'auto' }} data-testid="cc-msg" />}
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="cc-save" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
