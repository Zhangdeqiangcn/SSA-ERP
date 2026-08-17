import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, MenuItem, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useFinanceStore } from '@/stores/financeStore';
import { AccountType, ChartAccount } from '@/types/finance';

const TYPE_LABEL: Record<AccountType, { label: string; color: 'info' | 'success' | 'error' | 'default' | 'warning' }> = {
  asset: { label: '资产', color: 'info' },
  liability: { label: '负债', color: 'error' },
  equity: { label: '权益', color: 'success' },
  revenue: { label: '收入', color: 'warning' },
  expense: { label: '费用', color: 'default' },
};

export default function ChartOfAccounts() {
  const { chartOfAccounts, addChartAccount } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', type: 'asset' as AccountType, parentCode: '',
  });
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!form.code || !form.name) {
      setError('科目编码与名称为必填');
      return;
    }
    if (chartOfAccounts.some((a) => a.code === form.code)) {
      setError('科目编码已存在');
      return;
    }
    const acc: ChartAccount = {
      id: `coa-${form.code}-${Date.now()}`,
      code: form.code,
      name: form.name,
      type: form.type,
      parentCode: form.parentCode || undefined,
      isLeaf: true,
      balance: 0,
    };
    addChartAccount(acc);
    setOpen(false);
    setForm({ code: '', name: '', type: 'asset', parentCode: '' });
    setError('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>会计科目表</Typography>
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setOpen(true)}>
          新增科目
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类别</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>上级科目</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>是否末级</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>余额</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chartOfAccounts.map((acc) => {
                const tc = TYPE_LABEL[acc.type];
                const parent = chartOfAccounts.find((a) => a.code === acc.parentCode);
                return (
                  <TableRow key={acc.id} hover data-testid="coa-row">
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{acc.code}</Typography>
                    </TableCell>
                    <TableCell>{acc.name}</TableCell>
                    <TableCell>
                      <Chip label={tc.label} size="small" color={tc.color} variant="outlined" />
                    </TableCell>
                    <TableCell>{parent ? `${parent.code} ${parent.name}` : '—'}</TableCell>
                    <TableCell>
                      <Chip label={acc.isLeaf ? '末级' : '非末级'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>¥{acc.balance.toLocaleString()}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增会计科目</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="科目编码" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="科目名称" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="科目类别"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
              >
                {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
                  <MenuItem key={t} value={t}>{TYPE_LABEL[t].label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="上级科目（可选）"
                value={form.parentCode}
                onChange={(e) => setForm({ ...form, parentCode: e.target.value })}
              >
                <MenuItem value="">无（一级科目）</MenuItem>
                {chartOfAccounts.map((a) => (
                  <MenuItem key={a.id} value={a.code}>{a.code} {a.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
