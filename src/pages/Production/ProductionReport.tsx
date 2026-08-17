import {
  Box, Typography, Paper, Grid, Card, CardContent, Divider, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import { ResponsiveChartContainer, BarPlot, LinePlot, PiePlot } from '@mui/x-charts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const monthlyOutput = [
  { month: '1月', planned: 42, actual: 40 },
  { month: '2月', planned: 38, actual: 35 },
  { month: '3月', planned: 50, actual: 49 },
  { month: '4月', planned: 55, actual: 52 },
  { month: '5月', planned: 60, actual: 38 },
];

const workshopStats = [
  { name: '焊接车间', orders: 12, completed: 10, onTime: 9, efficiency: 92 },
  { name: '钣金车间', orders: 8, completed: 7, onTime: 6, efficiency: 86 },
  { name: '喷涂车间', orders: 5, completed: 5, onTime: 5, efficiency: 100 },
  { name: '激光切割区', orders: 3, completed: 3, onTime: 3, efficiency: 100 },
];

const workOrderStatusDist = [
  { id: 0, value: 5, label: '进行中', color: '#ff9800' },
  { id: 1, value: 12, label: '已完工', color: '#4caf50' },
  { id: 2, value: 3, label: '已下达', color: '#2196f3' },
  { id: 3, value: 2, label: '已关闭', color: '#9e9e9e' },
];

const efficiencyTrend = [35, 38, 40, 42, 44, 46, 45, 48, 50, 52, 49, 38];
const xMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function ProductionReport() {
  const totalOrders = workshopStats.reduce((s, w) => s + w.orders, 0);
  const totalCompleted = workshopStats.reduce((s, w) => s + w.completed, 0);
  const totalOnTime = workshopStats.reduce((s, w) => s + w.onTime, 0);
  const onTimeRate = totalCompleted > 0 ? Math.round((totalOnTime / totalCompleted) * 100) : 0;
  const completionRate = totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>生产报表</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '本月工单总数', value: totalOrders, icon: <BuildIcon />, color: '#1976d2' },
          { label: '完工数', value: totalCompleted, icon: <CheckCircleOutlineIcon />, color: '#388e3c' },
          { label: '完工率', value: `${completionRate}%`, icon: <TrendingUpIcon />, color: '#7b1fa2' },
          { label: '按期交付率', value: `${onTimeRate}%`, icon: <CheckCircleOutlineIcon />, color: '#f57c00' },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>月度产量：计划 vs 实际</Typography>
            <ResponsiveChartContainer
              series={[
                { type: 'bar' as const, data: monthlyOutput.map(d => d.planned), label: '计划产量', color: '#90caf9' },
                { type: 'bar' as const, data: monthlyOutput.map(d => d.actual), label: '实际产量', color: '#1976d2' },
              ]}
              xAxis={[{ scaleType: 'band' as const, data: monthlyOutput.map(d => d.month) }]}
              height={240}
            >
              <BarPlot />
            </ResponsiveChartContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>工单状态分布</Typography>
            <ResponsiveChartContainer
              series={[{
                type: 'pie' as const,
                data: workOrderStatusDist,
                innerRadius: 50,
                outerRadius: 90,
                paddingAngle: 3,
                cornerRadius: 4,
              }]}
              height={240}
            >
              <PiePlot />
            </ResponsiveChartContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>生产效率趋势（件/班次）</Typography>
        <ResponsiveChartContainer
          series={[{ type: 'line' as const, data: efficiencyTrend, label: '产能效率', color: '#388e3c' }]}
          xAxis={[{ scaleType: 'band' as const, data: xMonths }]}
          height={200}
        >
          <LinePlot />
        </ResponsiveChartContainer>
      </Paper>

      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>各车间生产统计</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>车间</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>工单数</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>已完工</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>准时完工</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>准时率</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>综合效率</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>评级</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workshopStats.map(ws => {
                const onTimeRateWs = ws.completed > 0 ? Math.round((ws.onTime / ws.completed) * 100) : 0;
                const grade = ws.efficiency >= 95 ? { label: '优秀', color: 'success' as const }
                  : ws.efficiency >= 85 ? { label: '良好', color: 'info' as const }
                  : { label: '需改进', color: 'warning' as const };
                return (
                  <TableRow key={ws.name} hover>
                    <TableCell><Typography variant="body2" fontWeight={500}>{ws.name}</Typography></TableCell>
                    <TableCell align="right">{ws.orders}</TableCell>
                    <TableCell align="right">{ws.completed}</TableCell>
                    <TableCell align="right">{ws.onTime}</TableCell>
                    <TableCell align="right">{onTimeRateWs}%</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color={ws.efficiency >= 95 ? 'success.main' : ws.efficiency >= 85 ? 'info.main' : 'warning.main'}>
                        {ws.efficiency}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={grade.label} size="small" color={grade.color} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
