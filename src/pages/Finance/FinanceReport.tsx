import { useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { ResponsiveChartContainer, BarPlot, LinePlot, PiePlot } from '@mui/x-charts';
import { useFinanceStore } from '@/stores/financeStore';

const STATUS_CHIP: Record<string, { label: string; color: 'default' | 'warning' | 'error' | 'success' | 'info' }> = {
  pending: { label: '待支付', color: 'warning' },
  partial: { label: '部分付款', color: 'info' },
  paid: { label: '已付清', color: 'success' },
  overdue: { label: '已逾期', color: 'error' },
};

const COST_CATEGORY: { key: string; label: string; color: string; match: string[] }[] = [
  { key: 'material', label: '原材料', color: '#1976d2', match: ['原材料', '材料', '采购', '原料'] },
  { key: 'labor', label: '人工成本', color: '#388e3c', match: ['人工', '工资', '薪酬', '社保'] },
  { key: 'mfg', label: '制造费用', color: '#f57c00', match: ['制造', '车间', '折旧', '能源'] },
  { key: 'admin', label: '管理费用', color: '#7b1fa2', match: ['管理', '费用', '办公', '差旅'] },
];

export default function FinanceReport() {
  const invoices = useFinanceStore((s) => s.invoices);
  const accountEntries = useFinanceStore((s) => s.accountEntries);
  const financeStats = useFinanceStore((s) => s.financeStats);

  // ── 月度应付 vs 实付（按发票日期聚合）─────────────────
  const { months, monthlyPayables, monthlyPaid } = useMemo(() => {
    const map = new Map<string, { payable: number; paid: number }>();
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      const key = (inv.invoiceDate || '').slice(0, 7); // YYYY-MM
      if (!key) continue;
      const bucket = map.get(key) ?? { payable: 0, paid: 0 };
      bucket.payable += inv.totalAmount || 0;
      if (inv.status === 'paid') bucket.paid += inv.totalAmount || 0;
      map.set(key, bucket);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      months: sorted.map(([k]) => `${parseInt(k.split('-')[1], 10)}月`),
      monthlyPayables: sorted.map(([, v]) => Math.round(v.payable)),
      monthlyPaid: sorted.map(([, v]) => Math.round(v.paid)),
    };
  }, [invoices]);

  const cashFlowTrend = monthlyPaid;

  // ── 供应商应付款汇总（按供应商聚合未付金额）────────────
  const vendorPayables = useMemo(() => {
    const map = new Map<string, { amount: number; paid: number; total: number }>();
    for (const inv of invoices) {
      if (inv.status === 'cancelled') continue;
      const cur = map.get(inv.vendorName) ?? { amount: 0, paid: 0, total: 0 };
      cur.total += inv.totalAmount || 0;
      if (inv.status === 'paid') cur.paid += inv.totalAmount || 0;
      else cur.amount += inv.totalAmount || 0;
      map.set(inv.vendorName, cur);
    }
    return Array.from(map.entries()).map(([vendor, v]) => {
      let status: 'pending' | 'partial' | 'paid' = 'paid';
      if (v.paid === 0 && v.amount > 0) status = 'pending';
      else if (v.amount > 0) status = 'partial';
      return { vendor, amount: v.amount, status };
    });
  }, [invoices]);

  // ── 成本结构分布（按会计科目归类）────────────────────
  const costDist = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const e of accountEntries) {
      const acc = (e.debitAccount || '') + (e.creditAccount || '');
      const hit = COST_CATEGORY.find((c) => c.match.some((m) => acc.includes(m)));
      const key = hit?.key ?? 'other';
      sums[key] = (sums[key] || 0) + (e.amount || 0);
    }
    const result = COST_CATEGORY.map((c) => ({
      id: c.key,
      value: Math.round(sums[c.key] || 0),
      label: c.label,
      color: c.color,
    }));
    const other = Math.round(sums['other'] || 0);
    if (other > 0) result.push({ id: 'other', value: other, label: '其他', color: '#9e9e9e' });
    return result.filter((r) => r.value > 0);
  }, [accountEntries]);

  // ── KPI ──────────────────────────────────────────────
  const totalPayable = financeStats?.totalPayable || 0;
  const totalPaid = financeStats?.thisMonthPaid || 0;
  const overdueAmount = financeStats?.overdueAmount || 0;
  const paymentRate = totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 0;
  const overdueRate = totalPayable > 0 ? Math.round((overdueAmount / totalPayable) * 100) : 0;

  const kpis = [
    { label: '应付账款总额', value: `¥${totalPayable.toLocaleString()}`, color: '#1976d2' },
    { label: '本月已付', value: `¥${totalPaid.toLocaleString()}`, color: '#388e3c' },
    { label: '付款率', value: `${paymentRate}%`, color: '#f57c00' },
    { label: '逾期比率', value: `${overdueRate}%`, color: '#d32f2f' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>财务报表</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>{kpi.label}</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>月度应付 vs 实付（元）</Typography>
            {months.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无发票数据</Typography>
            ) : (
              <ResponsiveChartContainer
                series={[
                  { type: 'bar' as const, data: monthlyPayables, label: '应付账款', color: '#90caf9' },
                  { type: 'bar' as const, data: monthlyPaid, label: '实付金额', color: '#1976d2' },
                ]}
                xAxis={[{ scaleType: 'band' as const, data: months }]}
                height={240}
              >
                <BarPlot />
              </ResponsiveChartContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>成本结构分布</Typography>
            {costDist.length === 0 ? (
              <Typography variant="body2" color="text.secondary">暂无凭证数据</Typography>
            ) : (
              <ResponsiveChartContainer
                series={[{
                  type: 'pie' as const,
                  data: costDist,
                  innerRadius: 50,
                  outerRadius: 90,
                  paddingAngle: 3,
                  cornerRadius: 4,
                }]}
                height={240}
              >
                <PiePlot />
              </ResponsiveChartContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>月度现金支出趋势（元）</Typography>
        {months.length === 0 ? (
          <Typography variant="body2" color="text.secondary">暂无支出数据</Typography>
        ) : (
          <ResponsiveChartContainer
            series={[{ type: 'line' as const, data: cashFlowTrend, label: '支出金额', color: '#d32f2f' }]}
            xAxis={[{ scaleType: 'band' as const, data: months }]}
            height={200}
          >
            <LinePlot />
          </ResponsiveChartContainer>
        )}
      </Paper>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>供应商应付款汇总</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>应付金额</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendorPayables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ color: '#94A3B8' }}>暂无应付款</TableCell>
                </TableRow>
              ) : (
                vendorPayables.map(vp => {
                  const sc = STATUS_CHIP[vp.status];
                  return (
                    <TableRow key={vp.vendor} hover>
                      <TableCell>{vp.vendor}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>¥{vp.amount.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={sc.label} size="small" color={sc.color} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
