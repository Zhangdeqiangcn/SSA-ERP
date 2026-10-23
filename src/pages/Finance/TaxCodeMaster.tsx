import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, MenuItem, Alert, IconButton, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useFinanceStore } from '@/stores/financeStore';
import { TaxCode } from '@/types';

/**
 * 税码主数据维护页（V3.96.0）
 * 路由：/finance/tax-codes
 *
 * 用途：供应商「组织与会计」整改。采购/财务在审批供应商注册时，从本主数据里
 *   下拉选择「税码」。统驭科目则复用「会计科目表」的应付类科目（如 2202 应付账款）。
 * 数据：D1 表 fin_tax_codes（迁移 0114），经通用实体路由 finTaxCode 读写，
 *   走 useFinanceStore 的 taxCodes 切片（乐观更新 + 异步落库 + 失败回滚）。
 */
export default function TaxCodeMaster() {
  const { taxCodes, addTaxCode, updateTaxCode, deleteTaxCode, syncError } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxCode | null>(null);
  const [form, setForm] = useState({ code: '', name: '', taxRate: 13, deductible: true, remark: '' });
  const [error, setError] = useState('');

  const openAdd = () => {
    setEditing(null);
    setForm({ code: '', name: '', taxRate: 13, deductible: true, remark: '' });
    setError('');
    setOpen(true);
  };
  const openEdit = (c: TaxCode) => {
    setEditing(c);
    setForm({ code: c.code, name: c.name, taxRate: c.taxRate, deductible: c.deductible ?? true, remark: c.remark || '' });
    setError('');
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('税码编码与名称为必填');
      return;
    }
    const rate = Number(form.taxRate) || 0;
    if (editing) {
      const dup = taxCodes.some((c) => c.id !== editing.id && c.code.trim() === form.code.trim());
      if (dup) { setError(`税码编码「${form.code}」已存在`); return; }
      updateTaxCode(editing.id, {
        code: form.code.trim(), name: form.name.trim(), taxRate: rate,
        deductible: form.deductible, remark: form.remark.trim() || undefined,
      });
    } else {
      if (taxCodes.some((c) => c.code === form.code.trim())) { setError(`税码编码「${form.code}」已存在`); return; }
      addTaxCode({
        id: `ftc-${form.code.trim().toLowerCase()}-${Date.now()}`,
        code: form.code.trim(), name: form.name.trim(), taxRate: rate,
        deductible: form.deductible, remark: form.remark.trim() || undefined,
      });
    }
    setOpen(false);
    setForm({ code: '', name: '', taxRate: 13, deductible: true, remark: '' });
    setError('');
  };

  const handleDelete = (c: TaxCode) => {
    if (window.confirm(`确定删除税码「${c.code} ${c.name}」？删除后审批时将无法再选到它。`)) {
      deleteTaxCode(c.id);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>税码主数据</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          供采购/财务在审批供应商时选择「税码」；统驭科目请在「会计科目表」选择应付类科目（如 2202 应付账款）
        </Typography>
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openAdd}>新增税码</Button>
      </Box>

      {syncError && <Alert severity="warning" sx={{ mb: 2 }}>{syncError}</Alert>}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>税码编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>税码名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>税率</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>进项可抵扣</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>说明</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: '#94A3B8', py: 3 }}>
                    暂无税码，点击右上角「新增税码」维护
                  </TableCell>
                </TableRow>
              )}
              {taxCodes.map((c) => (
                <TableRow key={c.id} hover data-testid="tax-code-row">
                  <TableCell><Typography variant="body2" fontFamily="monospace">{c.code}</Typography></TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    <Chip label={`${c.taxRate}%`} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={c.deductible === false ? '不可抵扣' : '可抵扣'} size="small"
                      color={c.deductible === false ? 'default' : 'success'} variant="outlined" sx={{ fontSize: '0.75rem' }} />
                  </TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{c.remark || '—'}</Typography></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" title="编辑" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" title="删除" onClick={() => handleDelete(c)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? `编辑税码（${editing.code}）` : '新增税码'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="税码编码" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="税码名称" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="税率（%）" value={String(form.taxRate)}
                onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}>
                {[13, 9, 6, 3, 1, 0].map((r) => <MenuItem key={r} value={String(r)}>{r}%</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="进项可抵扣" value={form.deductible ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, deductible: e.target.value === 'yes' })}>
                <MenuItem value="yes">可抵扣</MenuItem>
                <MenuItem value="no">不可抵扣</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="说明 / 适用场景" multiline rows={2} value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
