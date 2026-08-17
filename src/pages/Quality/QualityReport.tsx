import React from 'react';
import {
  Box, Typography, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, LinearProgress,
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';
import { ResponsiveChartContainer, BarPlot, LinePlot, PiePlot } from '@mui/x-charts';
import { useQualityStore } from '@/stores/qualityStore';

const QualityReport: React.FC = () => {
  const { inspectionTasks, unqualifiedItems, pdcaRecords } = useQualityStore();
  const passed = inspectionTasks.filter(t => t.status === 'passed').length;
  const failed = inspectionTasks.filter(t => t.status === 'failed').length;
  const total = inspectionTasks.length;
  const passRate = total > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

  const monthlyData = [
    { month: '1月', total: 18, passed: 17, rate: 94.4 },
    { month: '2月', total: 22, passed: 21, rate: 95.5 },
    { month: '3月', total: 25, passed: 23, rate: 92.0 },
    { month: '4月', total: 20, passed: 19, rate: 95.0 },
    { month: '5月', total: total, passed, rate: passRate },
  ];

  const defectTypes = [
    { type: '尺寸超差', count: 5, color: '#3B82F6' },
    { type: '螺纹不合格', count: 3, color: '#EF4444' },
    { type: '外观缺陷', count: 4, color: '#F59E0B' },
    { type: '强度不足', count: 2, color: '#8B5CF6' },
    { type: '化学成分偏差', count: 1, color: '#10B981' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>质量报表</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} size="small">刷新</Button>
          <Button variant="contained" startIcon={<Download />} size="small">导出报表</Button>
        </Box>
      </Box>

      {/* 汇总指标 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: '综合合格率', value: `${passRate}%`, target: '≥95%', color: passRate >= 95 ? '#10B981' : '#F59E0B', progress: passRate },
          { label: '待处理不合格品', value: unqualifiedItems.filter(i => i.dispositionStatus !== 'completed').length, target: '目标: 0', color: '#EF4444', progress: null },
          { label: '进行中PDCA', value: pdcaRecords.filter(r => r.status !== 'closed').length, target: '持续改进中', color: '#6366F1', progress: null },
          { label: '本月检验总批次', value: total, target: '已完成/进行中', color: '#3B82F6', progress: null },
        ].map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${kpi.color}20` }}>
              <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>{kpi.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color, fontSize: '1.875rem' }}>{kpi.value}</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>{kpi.target}</Typography>
              {kpi.progress !== null && (
                <LinearProgress
                  variant="determinate"
                  value={kpi.progress}
                  sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: kpi.color, borderRadius: 2 } }}
                />
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* 月度合格率趋势 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>月度合格率趋势</Typography>
            <ResponsiveChartContainer
              series={[
                { type: 'bar', data: monthlyData.map(d => d.total), color: '#E2E8F0', label: '总检批次' },
                { type: 'bar', data: monthlyData.map(d => d.passed), color: '#3B82F6', label: '合格批次' },
                { type: 'line', data: monthlyData.map(d => d.rate), color: '#10B981', label: '合格率(%)' },
              ]}
              xAxis={[{ scaleType: 'band', data: monthlyData.map(d => d.month) }]}
              height={280}
            >
              <BarPlot />
              <LinePlot />
            </ResponsiveChartContainer>
          </Paper>
        </Grid>

        {/* 缺陷分布 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>缺陷类型分布</Typography>
            <ResponsiveChartContainer
              series={[{
                type: 'pie',
                data: defectTypes.map((d, i) => ({ id: i, value: d.count, label: d.type, color: d.color })),
                innerRadius: 40,
              }]}
              height={200}
            >
              <PiePlot />
            </ResponsiveChartContainer>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {defectTypes.map((d) => (
                <Box key={d.type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                    <Typography variant="caption" sx={{ color: '#475569' }}>{d.type}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#1E293B' }}>{d.count} 次</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* 供应商质量排名 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>供应商质量排名（近3个月）</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>排名</TableCell>
                    <TableCell>供应商</TableCell>
                    <TableCell>检验批次</TableCell>
                    <TableCell>合格批次</TableCell>
                    <TableCell>合格率</TableCell>
                    <TableCell>不合格品数量</TableCell>
                    <TableCell>评级</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { rank: 1, name: '上海宝钢贸易有限公司', total: 12, passed: 12, rate: 100, defects: 0, grade: 'A' },
                    { rank: 2, name: '上海施耐德电气有限公司', total: 8, passed: 8, rate: 100, defects: 0, grade: 'A' },
                    { rank: 3, name: '苏州金属材料有限公司', total: 10, passed: 9, rate: 90, defects: 50, grade: 'B' },
                    { rank: 4, name: '宁波紧固件制造有限公司', total: 8, passed: 6, rate: 75, defects: 300, grade: 'C' },
                  ].map((row) => (
                    <TableRow key={row.rank} hover>
                      <TableCell>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: row.rank <= 2 ? '#FEF3C7' : '#F8FAFC',
                          color: row.rank <= 2 ? '#D97706' : '#64748B',
                          fontWeight: 700, fontSize: '0.8125rem'
                        }}>{row.rank}</Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{row.name}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.total}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.passed}</Typography></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={row.rate}
                            sx={{ width: 60, height: 4, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: row.rate >= 95 ? '#10B981' : row.rate >= 80 ? '#F59E0B' : '#EF4444', borderRadius: 2 } }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500, color: row.rate >= 95 ? '#10B981' : row.rate >= 80 ? '#F59E0B' : '#EF4444' }}>
                            {row.rate}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" sx={{ color: row.defects > 0 ? '#EF4444' : '#10B981' }}>{row.defects}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          label={row.grade}
                          size="small"
                          sx={{
                            bgcolor: row.grade === 'A' ? '#ECFDF5' : row.grade === 'B' ? '#FFF7ED' : '#FEF2F2',
                            color: row.grade === 'A' ? '#10B981' : row.grade === 'B' ? '#F59E0B' : '#EF4444',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QualityReport;
