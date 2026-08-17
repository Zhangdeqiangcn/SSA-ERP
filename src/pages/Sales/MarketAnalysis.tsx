import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { TrendingUp, TrendingDown, People, AttachMoney, ShoppingCart, PieChart } from '@mui/icons-material';
import { BarChart, LineChart } from '@mui/x-charts';
import { useSalesStore } from '@/stores/salesStore';
import { PageWrapper } from '@/components/layout';
import { formatCurrency } from '@/utils/format';

const MarketAnalysis: React.FC = () => {
  const { marketData } = useSalesStore();
  const data = marketData[0]; // 默认取最新数据

  return (
    <PageWrapper title="市场分析">
      {/* KPI 卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '本月营收', value: formatCurrency(data.totalRevenue), icon: <AttachMoney />, color: '#3B82F6' },
          { label: '新增客户', value: data.newCustomers + ' 家', icon: <People />, color: '#10B981' },
          { label: '转化率', value: data.conversionRate + '%', icon: <TrendingUp />, color: '#8B5CF6' },
          { label: '订单数', value: data.salesTrend[data.salesTrend.length - 1]?.orderCount + ' 单', icon: <ShoppingCart />, color: '#F59E0B' },
        ].map((kpi, idx) => (
          <Paper key={idx} sx={{ p: 2.5, borderRadius: 3, flex: 1, border: `1px solid ${kpi.color}20` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              <Box sx={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</Box>
            </Stack>
            <Typography variant="h5" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 销售趋势图 */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>月度销售趋势</Typography>
        <Box sx={{ height: 300 }}>
          <LineChart
            dataset={data.salesTrend.map(t => ({ month: t.month.substring(5), 营收: t.revenue / 10000, 订单数: t.orderCount }))}
            xAxis={[{ dataKey: 'month', label: '月份' }]}
            yAxis={[{ label: '营收(万元)' }, { label: '订单数' }]}
            series={[
              { dataKey: '营收', color: '#3B82F6', area: true },
              { dataKey: '订单数', color: '#10B981' },
            ]}
            height={280}
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* 产品销售排行 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              <PieChart sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              热销产品 Top 3
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>产品</TableCell>
                  <TableCell align="right">销量(吨)</TableCell>
                  <TableCell align="right">销售额</TableCell>
                  <TableCell align="right">市场份额</TableCell>
                  <TableCell align="right">增长率</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.topProducts.map((p, idx) => (
                  <TableRow key={p.productCode}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip label={idx + 1} size="small" color={idx === 0 ? 'primary' : idx === 1 ? 'warning' : 'default'} />
                        <Typography variant="body2" fontWeight={500}>{p.productName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{p.salesVolume}</TableCell>
                    <TableCell align="right">{formatCurrency(p.salesAmount)}</TableCell>
                    <TableCell align="right">
                      <LinearProgress variant="determinate" value={p.marketShare}
                        sx={{ width: 80, height: 6, borderRadius: 3, display: 'inline-block', mr: 1 }} />
                      {p.marketShare}%
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={p.growthRate > 0 ? '#10B981' : '#EF4444'} fontWeight={500}>
                        {p.growthRate > 0 ? '+' : ''}{p.growthRate}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* 区域销售分布 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              <TrendingUp sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              区域销售分布
            </Typography>
            <Stack spacing={2}>
              {data.regionalData.map(r => (
                <Box key={r.region}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="body2" fontWeight={500}>{r.region}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.customerCount}家客户 · {r.orderCount}单</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={500}>{formatCurrency(r.salesAmount)}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate"
                    value={Math.max(r.salesAmount / data.totalRevenue * 100, 2)}
                    sx={{ height: 8, borderRadius: 3, mb: 0.5 }} />
                  <Stack direction="row" justifyContent="flex-end">
                    <Chip label={`同比 ${r.yoyGrowth > 0 ? '+' : ''}${r.yoyGrowth}%`} size="small"
                      color={r.yoyGrowth > 0 ? 'success' : 'error'} variant="outlined"
                      icon={r.yoyGrowth > 0 ? <TrendingUp /> : <TrendingDown />}
                      sx={{ height: 22, fontSize: '0.65rem' }} />
                  </Stack>
                </Box>
              ))}
            </Stack>

            {data.regionalData.length > 0 && (
              <Box sx={{ height: 200, mt: 2 }}>
                <BarChart
                  dataset={data.regionalData.map(r => ({ 区域: r.region, 销售额: r.salesAmount / 10000 }))}
                  xAxis={[{ dataKey: '区域', scaleType: 'band' }]}
                  yAxis={[{ label: '万元' }]}
                  series={[{ dataKey: '销售额', color: '#3B82F6' }]}
                  height={180}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default MarketAnalysis;
