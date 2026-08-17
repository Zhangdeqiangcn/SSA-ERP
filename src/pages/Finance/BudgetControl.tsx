import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Card, CardContent, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip,
  LinearProgress, Alert, FormControl, InputLabel, Select,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { FlowTracker } from '@/components/common';
import { useFinanceStore } from '@/stores/financeStore';
import { useFinanceExtensionStore, BASE_CURRENCY_CODE, type BudgetDimension } from '@/stores/financeExtensionStore';

const DIM_LABEL: Record<BudgetDimension, string> = {
  costCenter: '成本中心', account: '科目', project: '项目',
};

export default function BudgetControl() {
  const { accountEntries } = useFinanceStore();
  const { budgets, costCenters, addBudget, updateBudget, removeBudget } = useFinanceExtensionStore();

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ period: '2026-07', dimension: 'costCenter' as BudgetDimension, refId: '', refName: '', amount: 0, note: '' });
  const [msg, setMsg] = useState<string | null>(null);

  // 计算各预算的实际发生额
  const rows = useMemo(() => {
    return budgets.map((b) => {
      let actual = 0;
      if (b.dimension === 'costCenter') {
        actual = accountEntries.filter((e) => e.costCenterId === b.refId).reduce((s, e) => s + e.amount, 0);
      } else if (b.dimension === 'account') {
        actual = accountEntries
          .filter((e) => e.debitAccount === b.refName || e.creditAccount === b.refName)
          .reduce((s, e) => s + e.amount, 0);
      } else if (b.dimension === 'project') {
        actual = accountEntries.filter((e) => e.projectId === b.refId).reduce((s, e) => s + e.amount, 0);
      }
      const variance = +(b.amount - actual).toFixed(2);
      const rate = b.amount > 0 ? Math.round((actual / b.amount) * 100) : 0;
      return { ...b, actual, variance, rate };
    });
  }, [budgets, accountEntries]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const overCount = rows.filter((r) => r.rate > 100).length;

  const ccOptions = costCenters.map((c) => ({ id: c.id, name: c.name }));

  const resetForm = () => {
    setForm({ period: '2026-07', dimension: 'costCenter', refId: ccOptions[0]?.id || '', refName: ccOptions[0]?.name || '', amount: 0, note: '' });
  };
  const openCreate = () => { setEditId(null); resetForm(); setMsg(null); setEditOpen(true); };
  const openEdit = (id: string) => {
    const b = budgets.find((x) => x.id === id); if (!b) return;
    setEditId(id); setForm({ period: b.period, dimension: b.dimension, refId: b.refId, refName: b.refName, amount: b.amount, note: b.note || '' });
    setMsg(null); setEditOpen(true);
  };
  const handleSave = () => {
    if (editId) { updateBudget(editId, { ...form }); setMsg('预算已更新'); }
    else { addBudget({ ...form }); setMsg('预算已新增'); }
    setEditOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>预算控制</Typography>
        <FlowTracker module="finance" currentStatus="fin_budget" />
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openCreate}>新增预算</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '预算总额', value: `¥${totalBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#1976d2', icon: <AddIcon /> },
          { label: '实际发生', value: `¥${totalActual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#388e3c', icon: <AddIcon /> },
          { label: '超预算项', value: `${overCount} 项`, color: overCount > 0 ? '#d32f2f' : '#388e3c', icon: <WarningAmberIcon /> },
          { label: '预算项数', value: `${budgets.length} 项`, color: '#7b1fa2', icon: <AddIcon /> },
        ].map((kpi) => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined"><CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {overCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          有 <b>{overCount}</b> 项预算执行率超过 100%，已构成超预算，请关注！
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>期间</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>维度</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>对象</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>预算</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>实际</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>结余</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>执行率</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.period}</TableCell>
                  <TableCell><Chip label={DIM_LABEL[r.dimension]} size="small" variant="outlined" /></TableCell>
                  <TableCell>{r.refName}</TableCell>
                  <TableCell align="right">¥{r.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell align="right">¥{r.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell align="right" sx={{ color: r.variance < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                    ¥{r.variance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell sx={{ width: 160 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={Math.min(r.rate, 100)} color={r.rate > 100 ? 'error' : 'primary'} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                      <Typography variant="caption" color={r.rate > 100 ? 'error.main' : 'text.secondary'}>{r.rate}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {r.rate > 100 ? <Chip label="超预算" color="error" size="small" />
                      : r.rate > 80 ? <Chip label="临界" color="warning" size="small" />
                      : <Chip label="正常" color="success" size="small" />}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(r.id)}>编辑</Button>
                    <Button size="small" color="error" onClick={() => removeBudget(r.id)}>删除</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        实际发生额取自财务凭证（accountEntries）：成本中心预算按 costCenterId 归集，科目预算按科目名称匹配借贷方，项目预算按 projectId 归集。本位币：{BASE_CURRENCY_CODE}。
      </Typography>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑预算' : '新增预算'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="预算期间" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>维度</InputLabel>
                <Select label="维度" value={form.dimension} onChange={(e) => {
                  const dim = e.target.value as BudgetDimension;
                  setForm({ ...form, dimension: dim, refId: '', refName: '' });
                }}>
                  <MenuItem value="costCenter">成本中心</MenuItem>
                  <MenuItem value="account">科目</MenuItem>
                  <MenuItem value="project">项目</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              {form.dimension === 'costCenter' ? (
                <FormControl fullWidth size="small">
                  <InputLabel>成本中心</InputLabel>
                  <Select label="成本中心" value={form.refId} onChange={(e) => {
                    const cc = costCenters.find((c) => c.id === e.target.value);
                    setForm({ ...form, refId: e.target.value, refName: cc?.name || '' });
                  }}>
                    {ccOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : (
                <TextField fullWidth size="small"
                  label={form.dimension === 'account' ? '科目名称（如 管理费用）' : '项目ID'}
                  value={form.refName} onChange={(e) => setForm({ ...form, refName: e.target.value, refId: e.target.value })} />
              )}
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="预算金额" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="备注" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {msg && <Chip label={msg} color="success" sx={{ mr: 'auto' }} data-testid="budget-msg" />}
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="budget-save" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
