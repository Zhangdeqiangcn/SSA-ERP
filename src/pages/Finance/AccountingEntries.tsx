import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useFinanceStore } from '@/stores/financeStore';

export default function AccountingEntries() {
  const { accountEntries, addAccountEntry } = useFinanceStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    entryNo: '', date: new Date().toISOString().split('T')[0], description: '',
    debitAccount: '', creditAccount: '', amount: 0, currency: 'CNY',
    voucherNo: '', createdBy: '当前用户',
  });
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>会计分录</Typography>
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>新建分录</Button>
      </Box>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">共 {accountEntries.length} 条分录</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>分录号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>摘要</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>借方科目</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>贷方科目</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>凭证号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>录入人</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accountEntries.map(entry => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{entry.entryNo}</Typography>
                  </TableCell>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{entry.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.debitAccount} size="small" color="error" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.creditAccount} size="small" color="success" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>¥{entry.amount.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace">{entry.voucherNo}</Typography>
                  </TableCell>
                  <TableCell>{entry.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 新建分录 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建会计分录</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="分录号" value={form.entryNo}
                onChange={(e) => setForm({ ...form, entryNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="日期" type="date" InputLabelProps={{ shrink: true }}
                value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="摘要" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="借方科目" value={form.debitAccount}
                onChange={(e) => setForm({ ...form, debitAccount: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="贷方科目" value={form.creditAccount}
                onChange={(e) => setForm({ ...form, creditAccount: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="金额" type="number" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>币种</InputLabel>
                <Select label="币种" value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {['CNY', 'USD', 'EUR', 'JPY', 'HKD'].map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="凭证号" value={form.voucherNo}
                onChange={(e) => setForm({ ...form, voucherNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="录入人" value={form.createdBy}
                onChange={(e) => setForm({ ...form, createdBy: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => {
            addAccountEntry({
              id: `ae-${Date.now()}`,
              entryNo: form.entryNo || `JE${Date.now()}`,
              date: form.date,
              description: form.description,
              debitAccount: form.debitAccount,
              creditAccount: form.creditAccount,
              amount: form.amount,
              currency: form.currency,
              voucherNo: form.voucherNo || `V${Date.now()}`,
              createdBy: form.createdBy,
              createdAt: new Date().toISOString(),
            });
            setCreateOpen(false);
          }}>创建</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
