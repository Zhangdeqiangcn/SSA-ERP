import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Stack, LinearProgress, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import { Add, Calculate, CheckCircle, Warning } from '@mui/icons-material';
import { useFinanceStore } from '@/stores/financeStore';
import { TaxRecord, TaxCategory } from '@/types';
import { PageWrapper } from '@/components/layout';
import { formatCurrency } from '@/utils/format';

const CATEGORY_LABELS: Record<TaxCategory, string> = {
  vat: '增值税', corporate_income: '企业所得税', personal_income: '个人所得税',
  stamp: '印花税', property: '房产税', other: '其他',
};

const TaxAccounting: React.FC = () => {
  const { taxRecords, addTaxRecord } = useFinanceStore();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'vat' as TaxCategory, period: '2024-07', periodType: 'monthly' as string,
    taxableAmount: 0, taxRate: 13, deductedAmount: 0,
  });

  const totalPayable = taxRecords.reduce((s, r) => s + r.actualPayable, 0);
  const totalPaid = taxRecords.reduce((s, r) => s + r.paidAmount, 0);

  return (
    <PageWrapper
      title="税务核算"
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>新增税单</Button>
      }
    >
      {/* 统计 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '待缴税额', value: formatCurrency(totalPayable - totalPaid), color: '#EF4444' },
          { label: '已缴税额', value: formatCurrency(totalPaid), color: '#10B981' },
          { label: '税单总数', value: taxRecords.length + ' 张', color: '#3B82F6' },
          { label: '待申报', value: taxRecords.filter(r => r.status === 'calculated').length + ' 张', color: '#F59E0B' },
        ].map(s => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 税单列表 */}
      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>税单编号</TableCell>
                <TableCell>期间</TableCell>
                <TableCell>税种</TableCell>
                <TableCell align="right">应税金额</TableCell>
                <TableCell align="right">税率</TableCell>
                <TableCell align="right">税额</TableCell>
                <TableCell align="right">可抵扣</TableCell>
                <TableCell align="right">实缴金额</TableCell>
                <TableCell align="right">已缴金额</TableCell>
                <TableCell>缴款日期</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxRecords.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" color="#3B82F6" fontWeight={500}>{r.recordNo}</Typography>
                  </TableCell>
                  <TableCell>{r.period}</TableCell>
                  <TableCell><Chip label={CATEGORY_LABELS[r.category]} size="small" variant="outlined" /></TableCell>
                  <TableCell align="right">{formatCurrency(r.taxableAmount)}</TableCell>
                  <TableCell align="right">{r.taxRate}%</TableCell>
                  <TableCell align="right">{formatCurrency(r.taxAmount)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="#10B981">-{formatCurrency(r.deductedAmount)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{formatCurrency(r.actualPayable)}</Typography>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(r.paidAmount)}</TableCell>
                  <TableCell>{r.paymentDate || '-'}</TableCell>
                  <TableCell>
                    <Chip label={r.status === 'paid' ? '已缴' : r.status === 'calculated' ? '待缴' : '待申报'} size="small"
                      color={r.status === 'paid' ? 'success' : r.status === 'calculated' ? 'warning' : 'default'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 新增弹窗 */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增税务核算单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select fullWidth label="税种" value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value as TaxCategory }))}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth label="期间类型" value={form.periodType}
              onChange={e => setForm(prev => ({ ...prev, periodType: e.target.value }))}>
              <MenuItem value="monthly">月度</MenuItem>
              <MenuItem value="quarterly">季度</MenuItem>
              <MenuItem value="annual">年度</MenuItem>
            </TextField>
            <TextField fullWidth label="核算期间" value={form.period}
              onChange={e => setForm(prev => ({ ...prev, period: e.target.value }))} />
            <TextField fullWidth label="应税金额" type="number" value={form.taxableAmount}
              onChange={e => setForm(prev => ({ ...prev, taxableAmount: Number(e.target.value) }))} />
            <TextField fullWidth label="税率(%)" type="number" value={form.taxRate}
              onChange={e => setForm(prev => ({ ...prev, taxRate: Number(e.target.value) }))} />
            <TextField fullWidth label="可抵扣金额" type="number" value={form.deductedAmount}
              onChange={e => setForm(prev => ({ ...prev, deductedAmount: Number(e.target.value) }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => {
            const taxAmount = Math.round((form.taxableAmount * form.taxRate) / 100);
            const actualPayable = taxAmount - form.deductedAmount;
            const newRecord: TaxRecord = {
              id: 'tax-' + Date.now(),
              recordNo: 'TAX' + form.period.replace('-', '') + String(taxRecords.length + 1).padStart(3, '0'),
              period: form.period,
              periodType: form.periodType as TaxRecord['periodType'],
              category: form.category,
              taxableAmount: form.taxableAmount,
              taxRate: form.taxRate,
              taxAmount,
              deductedAmount: form.deductedAmount,
              actualPayable,
              paidAmount: 0,
              status: 'calculated',
              createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
              updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
              createdBy: '王会计',
              updatedBy: '王会计',
            };
            addTaxRecord(newRecord);
            setAddOpen(false);
          }}>保存</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default TaxAccounting;
