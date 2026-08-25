import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Chip, Alert, Divider, Snackbar, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useFinanceStore } from '@/stores/financeStore';
import { useFinanceLedgerStore, FISCAL_YEAR } from '@/stores/financeLedgerStore';
import { useFinanceExtensionStore, getExchangeRate } from '@/stores/financeExtensionStore';
import { buildIncomeStatement } from '@/utils/financialStatements';

const STATUS_LABEL: Record<string, { label: string; color: 'default' | 'warning' | 'success' }> = {
  open: { label: '未结账', color: 'default' },
  profit_closed: { label: '已损益结转', color: 'warning' },
  closed: { label: '已结账', color: 'success' },
};

export default function PeriodClosing() {
  const { accountEntries, chartOfAccounts } = useFinanceStore();
  const { closingPeriods, upsertClosing, getClosing, openPeriod, ensureYearPeriods } = useFinanceLedgerStore();
  const [period, setPeriod] = useState(`${FISCAL_YEAR}-01`);
  const [snack, setSnack] = useState('');

  // A6：确保会计日历（整年 12 期）主数据齐备（幂等）
  useEffect(() => {
    ensureYearPeriods(FISCAL_YEAR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periods = useMemo(
    () => [...closingPeriods].sort((a, b) => a.period.localeCompare(b.period)),
    [closingPeriods]
  );

  const closing = getClosing(period);
  const status = closing?.status ?? 'open';
  const isClosed = status === 'closed';
  const closedCount = periods.filter((p) => p.status === 'closed').length;
  const is = useMemo(() => buildIncomeStatement(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);

  const postEntry = (partial: any, stamp: number, idx: number, voucherNo: string) => {
    useFinanceStore.getState().addAccountEntry({
      id: `ae-pc-${stamp}-${idx}`,
      entryNo: `JEP${stamp}${idx}`,
      date: new Date().toISOString().slice(0, 10),
      description: `期末结转 ${voucherNo}`,
      debitAccount: '',
      creditAccount: '',
      amount: 0,
      currency: 'CNY',
      voucherNo,
      createdBy: '当前用户',
      createdAt: new Date().toISOString(),
      ...partial,
    });
  };

  const handleProfitClose = () => {
    if (status !== 'open') {
      setSnack(isClosed ? `期间 ${period} 已结账，请先反结账` : '该期间已完成损益结转');
      return;
    }
    const stamp = Date.now();
    const voucherNo = `V-PL-${period}-${stamp}`;
    let idx = 1;
    // 收入结转：借 各收入 / 贷 本年利润
    for (const r of is.revenue) {
      if (r.amount <= 0) continue;
      postEntry({ debitAccount: r.name, creditAccount: '本年利润', amount: r.amount }, stamp, idx++, voucherNo);
    }
    // 费用结转：借 本年利润 / 贷 各费用
    for (const e of is.expense) {
      if (e.amount <= 0) continue;
      postEntry({ debitAccount: '本年利润', creditAccount: e.name, amount: e.amount }, stamp, idx++, voucherNo);
    }
    upsertClosing(period, { status: 'profit_closed', profitVoucherNo: voucherNo, closedBy: '当前用户', closedAt: new Date().toISOString() });
    setSnack(`损益已结转，凭证 ${voucherNo}（净利润 ${is.netProfit.toFixed(2)}）`);
  };

  const handleFxClose = () => {
    if (isClosed) {
      setSnack(`期间 ${period} 已结账，请先反结账`);
      return;
    }
    const { invoices } = useFinanceStore.getState();
    const { exchangeRates } = useFinanceExtensionStore.getState();
    let total = 0;
    const lines: { name: string; amount: number }[] = [];
    for (const inv of invoices) {
      if (!inv.currency || inv.currency === 'CNY') continue;
      if (inv.status === 'paid' || inv.status === 'cancelled') continue;
      const current = getExchangeRate(inv.currency, exchangeRates);
      const entryRate = inv.exchangeRate || 1;
      const diff = (current - entryRate) * inv.amount; // 正数：本币升值，应付减少（收益）
      if (Math.abs(diff) > 0.001) {
        total += diff;
        lines.push({ name: inv.vendorName, amount: diff });
      }
    }
    if (Math.abs(total) < 0.001) {
      setSnack('当前无外币未结清项目，无需结转汇兑损益');
      return;
    }
    const stamp = Date.now();
    const voucherNo = `V-FX-${period}-${stamp}`;
    // 借/贷 财务费用-汇兑损益；贷/借 应付账款
    postEntry(
      { debitAccount: total >= 0 ? '财务费用' : '', creditAccount: total >= 0 ? '' : '财务费用', amount: Math.abs(total) },
      stamp, 1, voucherNo
    );
    postEntry(
      { debitAccount: total >= 0 ? '' : '应付账款', creditAccount: total >= 0 ? '应付账款' : '', amount: Math.abs(total) },
      stamp, 2, voucherNo
    );
    upsertClosing(period, { fxVoucherNo: voucherNo, closedBy: '当前用户', closedAt: new Date().toISOString() });
    setSnack(`汇兑损益已结转 ${total.toFixed(2)}，凭证 ${voucherNo}`);
  };

  const handleClose = () => {
    if (isClosed) {
      setSnack(`期间 ${period} 已结账，无需重复操作`);
      return;
    }
    if (status === 'open') {
      setSnack('请先完成损益结转');
      return;
    }
    upsertClosing(period, { status: 'closed', closedBy: '当前用户', closedAt: new Date().toISOString() });
    setSnack(`期间 ${period} 已结账，该期间凭证已锁定（禁止新增/修改/删除/过账/冲销）`);
  };

  // A6：反结账，把期间打回未结账，恢复记账能力
  const handleReopen = () => {
    const res = openPeriod(period, '当前用户');
    setSnack(res.message);
  };

  return (
    <Box sx={{ p: 3 }} data-testid="period-closing">
      <Typography variant="h5" fontWeight={700} mb={2}>期末结账</Typography>

      <Grid container spacing={2} alignItems="center" mb={2}>
        <Grid item xs={12} md={3}>
          <TextField select fullWidth size="small" label="会计期间" value={period} onChange={(e) => setPeriod(e.target.value)} data-testid="pc-period">
            {periods.map((p) => (
              <MenuItem key={p.period} value={p.period}>
                {p.period}（{STATUS_LABEL[p.status]?.label ?? p.status}）
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`状态：${STATUS_LABEL[status].label}`} color={STATUS_LABEL[status].color} data-testid="pc-status" />
            <Chip size="small" variant="outlined" label={`会计日历 ${periods.length} 期 / 已结 ${closedCount}`} data-testid="pc-period-count" />
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
            <Button variant="outlined" color="warning" startIcon={<FlagIcon />} size="small" disabled={isClosed} data-testid="pc-profit-close" onClick={handleProfitClose}>损益结转</Button>
            <Button variant="outlined" color="info" startIcon={<SwapHorizIcon />} size="small" disabled={isClosed} data-testid="pc-fx-close" onClick={handleFxClose}>汇兑损益结转</Button>
            <Button variant="contained" color="success" startIcon={<LockIcon />} size="small" disabled={isClosed} data-testid="pc-close" onClick={handleClose}>结账</Button>
            <Tooltip title="把该期间打回「未结账」，解除凭证锁定">
              <span>
                <Button variant="outlined" color="error" startIcon={<LockOpenIcon />} size="small" disabled={status === 'open'} data-testid="pc-reopen" onClick={handleReopen}>反结账</Button>
              </span>
            </Tooltip>
          </Stack>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>本期经营成果</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}><Typography color="text.secondary">营业收入合计</Typography><Typography fontWeight={600}>¥{is.totalRevenue.toFixed(2)}</Typography></Grid>
          <Grid item xs={4}><Typography color="text.secondary">成本费用合计</Typography><Typography fontWeight={600}>¥{is.totalExpense.toFixed(2)}</Typography></Grid>
          <Grid item xs={4}><Typography color="text.secondary">净利润</Typography><Typography fontWeight={700} color={is.netProfit >= 0 ? 'success.main' : 'error.main'} data-testid="pc-net-profit">¥{is.netProfit.toFixed(2)}</Typography></Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Alert severity={isClosed ? 'warning' : 'info'} data-testid="pc-lock-alert">
          {isClosed
            ? `期间 ${period} 已结账，凭证已锁定：该期间禁止新增 / 修改 / 删除 / 过账 / 冲销凭证。如需调整请点击「反结账」。`
            : status === 'profit_closed'
              ? `损益已结转至「本年利润」，可继续汇兑损益结转并结账。结账后该期间凭证将被锁定。`
              : `尚未结转损益。点击「损益结转」将收入/费用结转到「本年利润」并生成凭证。`}
        </Alert>
      </Paper>

      <Paper sx={{ p: 2 }} data-testid="pc-calendar">
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          会计日历 {FISCAL_YEAR}（期间主数据）
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>会计期间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>凭证记账</TableCell>
                <TableCell>损益结转凭证</TableCell>
                <TableCell>汇兑结转凭证</TableCell>
                <TableCell>结账人</TableCell>
                <TableCell>结账时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.period} hover selected={p.period === period} data-testid={`pc-cal-row-${p.period}`}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell>
                    <Chip size="small" label={STATUS_LABEL[p.status]?.label ?? p.status} color={STATUS_LABEL[p.status]?.color ?? 'default'} />
                  </TableCell>
                  <TableCell>
                    {p.status === 'closed'
                      ? <Chip size="small" color="error" variant="outlined" label="已锁定" />
                      : <Chip size="small" color="primary" variant="outlined" label="可记账" />}
                  </TableCell>
                  <TableCell>{p.profitVoucherNo || '-'}</TableCell>
                  <TableCell>{p.fxVoucherNo || '-'}</TableCell>
                  <TableCell>{p.status === 'open' ? '-' : (p.closedBy || '-')}</TableCell>
                  <TableCell>{p.status === 'open' ? '-' : (p.closedAt ? p.closedAt.slice(0, 19).replace('T', ' ') : '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
