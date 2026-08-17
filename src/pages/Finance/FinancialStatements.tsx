import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, TextField, MenuItem, Button, Alert, Chip, Grid
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useFinanceStore } from '@/stores/financeStore';
import { useSalesStore } from '@/stores/salesStore';
import {
  buildBalanceSheet, buildIncomeStatement, buildCashFlowStatement,
  buildAPSubledger, buildARSubledger,
} from '@/utils/financialStatements';

const fmt = (n: number) =>
  (n < 0 ? '-' : '') + '¥' + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PERIODS = [
  { value: 'all', label: '累计（全部期间）' },
  { value: '2026-01', label: '2026年01期' },
];

function SectionTable({ rows, total, totalLabel, testId }: {
  rows: { code: string; name: string; section?: string; amount: number }[];
  total: number;
  totalLabel: string;
  testId: string;
}) {
  return (
    <TableContainer component={Paper} sx={{ mt: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>分组</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.code} hover>
              <TableCell><Typography variant="body2" fontFamily="monospace">{r.code}</Typography></TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.section || '—'}</TableCell>
              <TableCell align="right"><Typography variant="body2" fontWeight={500}>{fmt(r.amount)}</Typography></TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell colSpan={3} sx={{ fontWeight: 700 }}>{totalLabel}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }} data-testid={testId}>{fmt(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function FinancialStatements() {
  const { accountEntries, chartOfAccounts, invoices, paymentPlans } = useFinanceStore();
  const { salesOrders } = useSalesStore();
  const [tab, setTab] = useState(0);
  const [period, setPeriod] = useState('2026-01');

  const bs = useMemo(() => buildBalanceSheet(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const is = useMemo(() => buildIncomeStatement(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const cf = useMemo(() => buildCashFlowStatement(accountEntries, chartOfAccounts, period), [accountEntries, chartOfAccounts, period]);
  const ap = useMemo(() => buildAPSubledger(invoices, paymentPlans), [invoices, paymentPlans]);
  const ar = useMemo(() => buildARSubledger(salesOrders), [salesOrders]);

  return (
    <Box sx={{ p: 3 }} data-testid="financial-statements">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>财务报表</Typography>
        <Box flex={1} />
        <TextField select size="small" label="会计期间" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 180 }}>
          {PERIODS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
        </TextField>
        <Button variant="outlined" startIcon={<PrintIcon />} size="small" onClick={() => window.print()}>打印</Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="资产负债表" />
        <Tab label="利润表" />
        <Tab label="现金流量表" />
        <Tab label="应收明细账" />
        <Tab label="应付明细账" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Alert severity={bs.balanced ? 'success' : 'warning'} sx={{ mb: 2 }} data-testid="bs-balanced">
            {bs.balanced
              ? `资产负债表平衡：资产合计 ${fmt(bs.totalAssets)} = 负债 ${fmt(bs.totalLiabilities)} + 权益 ${fmt(bs.totalEquity)}`
              : `资产负债表不平衡：资产 ${fmt(bs.totalAssets)} / 负债权益 ${fmt(bs.totalLiabilities + bs.totalEquity)}`}
          </Alert>

          <Typography variant="subtitle1" fontWeight={700} mt={1}>资产</Typography>
          <SectionTable rows={bs.assets} total={bs.totalAssets} totalLabel="资产总计" testId="bs-total-assets" />

          <Typography variant="subtitle1" fontWeight={700} mt={3}>负债</Typography>
          <SectionTable rows={bs.liabilities} total={bs.totalLiabilities} totalLabel="负债合计" testId="bs-total-liabilities" />

          <Typography variant="subtitle1" fontWeight={700} mt={3}>所有者权益</Typography>
          <SectionTable rows={bs.equity} total={bs.totalEquity} totalLabel="所有者权益合计" testId="bs-total-equity" />
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <SectionTable rows={is.revenue} total={is.totalRevenue} totalLabel="营业收入合计" testId="is-total-revenue" />
          <Typography variant="subtitle1" fontWeight={700} mt={3}>减：营业成本与费用</Typography>
          <SectionTable rows={is.expense} total={is.totalExpense} totalLabel="成本费用合计" testId="is-total-expense" />
          <Alert severity="info" sx={{ mt: 2 }} data-testid="is-net-profit">
            净利润（收入 - 成本费用）：{fmt(is.netProfit)}
          </Alert>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Paper sx={{ mt: 1 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>项目</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>流入</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>流出</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>净额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow hover>
                    <TableCell>经营活动现金流量</TableCell>
                    <TableCell align="right">{fmt(cf.operating.inflow)}</TableCell>
                    <TableCell align="right">{fmt(cf.operating.outflow)}</TableCell>
                    <TableCell align="right" data-testid="cf-operating-net">{fmt(cf.operating.net)}</TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>投资活动现金流量</TableCell>
                    <TableCell align="right">{fmt(cf.investing.inflow)}</TableCell>
                    <TableCell align="right">{fmt(cf.investing.outflow)}</TableCell>
                    <TableCell align="right">{fmt(cf.investing.net)}</TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>筹资活动现金流量</TableCell>
                    <TableCell align="right">{fmt(cf.financing.inflow)}</TableCell>
                    <TableCell align="right">{fmt(cf.financing.outflow)}</TableCell>
                    <TableCell align="right">{fmt(cf.financing.net)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700 }}>现金及现金等价物净增加额</TableCell>
                    <TableCell align="right" />
                    <TableCell align="right" />
                    <TableCell align="right" sx={{ fontWeight: 700 }} data-testid="cf-total-net">{fmt(cf.totalNet)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      {tab === 3 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>应收账款（取销售订单：应收金额 - 已收金额）</Typography>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>客户</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>应收总额</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>已收金额</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>未收余额</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>到期日</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ar.map((r) => (
                  <TableRow key={r.party} hover>
                    <TableCell>{r.party}</TableCell>
                    <TableCell align="right">{fmt(r.documentAmount)}</TableCell>
                    <TableCell align="right">{fmt(r.settledAmount)}</TableCell>
                    <TableCell align="right"><Typography fontWeight={r.balance > 0 ? 700 : 400} color={r.balance > 0 ? 'error.main' : 'text.primary'}>{fmt(r.balance)}</Typography></TableCell>
                    <TableCell>{r.dueDate || '—'}</TableCell>
                  </TableRow>
                ))}
                {ar.length === 0 && <TableRow><TableCell colSpan={5} align="center" color="text.disabled">无应收账款数据</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 4 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>应付账款（取采购发票与付款计划）</Typography>
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>应付总额</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>已付金额</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>未付余额</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ap.map((r) => (
                  <TableRow key={r.party} hover>
                    <TableCell>{r.party}</TableCell>
                    <TableCell align="right">{fmt(r.documentAmount)}</TableCell>
                    <TableCell align="right">{fmt(r.settledAmount)}</TableCell>
                    <TableCell align="right"><Typography fontWeight={r.balance > 0 ? 700 : 400} color={r.balance > 0 ? 'error.main' : 'text.primary'}>{fmt(r.balance)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
