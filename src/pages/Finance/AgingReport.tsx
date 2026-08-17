import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, Card, CardContent, Tabs, Tab, Chip,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import { FlowTracker } from '@/components/common';
import { useFinanceStore } from '@/stores/financeStore';
import { useSalesStore } from '@/stores/salesStore';
import { useFinanceExtensionStore, convertCurrency, BASE_CURRENCY_CODE } from '@/stores/financeExtensionStore';

const BUCKETS = [
  { key: 'current', label: '未到期', color: '#388e3c' },
  { key: 'd0_30', label: '逾期 1-30 天', color: '#f57c00' },
  { key: 'd31_60', label: '逾期 31-60 天', color: '#ef6c00' },
  { key: 'd61_90', label: '逾期 61-90 天', color: '#e64a19' },
  { key: 'd90', label: '逾期 90 天以上', color: '#d32f2f' },
] as const;

type BucketKey = (typeof BUCKETS)[number]['key'];

function daysBetween(dueDate: string): number {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  return Math.round((now - due) / (24 * 3600 * 1000));
}

function bucketOf(days: number): BucketKey {
  if (days < 0) return 'current';
  if (days <= 30) return 'd0_30';
  if (days <= 60) return 'd31_60';
  if (days <= 90) return 'd61_90';
  return 'd90';
}

export default function AgingReport() {
  const { paymentPlans } = useFinanceStore();
  const { salesOrders } = useSalesStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [tab, setTab] = useState(0);

  const apRows = useMemo(() => {
    return paymentPlans
      .filter((p) => p.status !== 'paid')
      .map((p) => {
        const unpaid = +(p.totalAmount - p.paidAmount).toFixed(2);
        const days = daysBetween(p.dueDate);
        const base = convertCurrency(unpaid, p.currency, exchangeRates);
        return {
          id: p.id, ref: p.planNo, name: p.vendorName, unpaid, currency: p.currency || BASE_CURRENCY_CODE,
          base, days, bucket: days < 0 ? 'current' : bucketOf(days), dueDate: p.dueDate,
        };
      });
  }, [paymentPlans, exchangeRates]);

  const arRows = useMemo(() => {
    const openStatus = ['confirmed', 'in_production', 'partial_shipped', 'fully_shipped'];
    return salesOrders
      .filter((o) => openStatus.includes(o.status))
      .map((o) => {
        const received = o.receivedAmount ?? 0;
        const unpaid = +(o.grandTotal - received).toFixed(2);
        if (unpaid <= 0) return null;
        const dueDate = o.arDueDate || o.expectedDeliveryDate;
        const days = daysBetween(dueDate);
        const base = convertCurrency(unpaid, o.currency as string | undefined, exchangeRates);
        return {
          id: o.id, ref: o.orderNo, name: o.customerName, unpaid, currency: (o.currency as string) || BASE_CURRENCY_CODE,
          base, days, bucket: days < 0 ? 'current' : bucketOf(days), dueDate,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [salesOrders, exchangeRates]);

  const summarize = (rows: typeof apRows) => {
    const result: Record<BucketKey, number> = { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
    rows.forEach((r) => { result[r.bucket] += r.base; });
    return result;
  };

  const apSummary = summarize(apRows);
  const arSummary = summarize(arRows);
  const rows = tab === 0 ? apRows : arRows;
  const summary = tab === 0 ? apSummary : arSummary;
  const totalBase = rows.reduce((s, r) => s + r.base, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>账龄分析（AR / AP）</Typography>
        <FlowTracker module="finance" currentStatus="fin_aging" />
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {BUCKETS.map((b) => (
          <Grid item xs={6} md={2.4} key={b.key}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{b.label}</Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: b.color }}>
                  ¥{(summary[b.key] || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={6} md={2.4}>
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">合计({BASE_CURRENCY_CODE})</Typography>
              <Typography variant="subtitle1" fontWeight={700}>¥{totalBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`应付账龄 (AP) · ${apRows.length} 笔`} />
          <Tab label={`应收账龄 (AR) · ${arRows.length} 笔`} />
        </Tabs>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>单据号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>往来单位</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>到期日</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>原币未结</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>原币</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>折合{BASE_CURRENCY_CODE}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>账龄</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>区间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>无未结单据</TableCell></TableRow>
              )}
              {rows.map((r) => {
                const b = BUCKETS.find((x) => x.key === r.bucket)!;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{r.ref}</Typography></TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.dueDate}</TableCell>
                    <TableCell align="right">{(r.unpaid).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{r.currency}</TableCell>
                    <TableCell align="right"><Typography fontWeight={600}>¥{r.base.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Typography></TableCell>
                    <TableCell>{r.days < 0 ? `剩 ${Math.abs(r.days)} 天` : `${r.days} 天`}</TableCell>
                    <TableCell><Chip label={b.label} size="small" sx={{ bgcolor: b.color, color: '#fff' }} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'text.secondary' }}>
        <TimelineIcon fontSize="small" />
        <Typography variant="caption">
          账龄按到期日与当前日期差值分桶；外币单据按汇率管理维护的折算率折合为{BASE_CURRENCY_CODE}。AP 来自未付清的付款计划，AR 来自未结清销售订单（应收=含税总额−已收）。
        </Typography>
      </Box>
    </Box>
  );
}
