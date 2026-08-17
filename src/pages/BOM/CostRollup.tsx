import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, LinearProgress, Chip, Divider,
} from '@mui/material';
import { Calculate, Refresh, FileDownload } from '@mui/icons-material';
import { ResponsiveChartContainer, PiePlot } from '@mui/x-charts';
import { useBOMStore } from '@/stores/bomStore';

const COST_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

const CostRollup: React.FC = () => {
  const { bomList, bomTreeData } = useBOMStore();
  const [selectedBOM, setSelectedBOM] = useState(bomList[0]);
  const [calculated, setCalculated] = useState(true);

  const materialCost = bomTreeData.reduce((sum, i) => sum + i.totalCost, 0);
  const laborCost = materialCost * 0.15;
  const overheadCost = materialCost * 0.12;
  const totalCost = materialCost + laborCost + overheadCost;

  const breakdown = [
    { label: '原材料成本', value: materialCost, percentage: (materialCost / totalCost) * 100, color: '#3B82F6' },
    { label: '人工成本 (15%)', value: laborCost, percentage: (laborCost / totalCost) * 100, color: '#10B981' },
    { label: '制造费用 (12%)', value: overheadCost, percentage: (overheadCost / totalCost) * 100, color: '#F59E0B' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>成本卷积计算</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} size="small" onClick={() => setCalculated(false)}>重新计算</Button>
          <Button variant="contained" startIcon={<Calculate />} size="small" onClick={() => setCalculated(true)}>执行卷积</Button>
          <Button variant="outlined" startIcon={<FileDownload />} size="small">导出</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 选择BOM */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>选择 BOM</Typography>
            {bomList.filter(b => b.status !== 'obsolete').map((bom) => (
              <Box
                key={bom.id}
                onClick={() => setSelectedBOM(bom)}
                sx={{
                  p: 1.5, borderRadius: 2, cursor: 'pointer', mb: 1,
                  border: `1px solid ${selectedBOM.id === bom.id ? '#3B82F6' : 'rgba(226,232,240,0.8)'}`,
                  bgcolor: selectedBOM.id === bom.id ? '#EFF6FF' : '#FAFAFA',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{bom.productName}</Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>{bom.bomNo} · {bom.type} · {bom.version}</Typography>
                  </Box>
                  <Chip
                    label={bom.status === 'released' ? '已发布' : '草稿'}
                    size="small"
                    sx={{ bgcolor: bom.status === 'released' ? '#ECFDF5' : '#FFF7ED', color: bom.status === 'released' ? '#10B981' : '#F59E0B' }}
                  />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* 成本汇总 */}
        <Grid item xs={12} md={8}>
          {calculated ? (
            <>
              {/* 成本饼图 */}
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>成本构成</Typography>
                <Grid container>
                  <Grid item xs={12} md={5}>
                    <ResponsiveChartContainer
                      series={[{
                        type: 'pie',
                        data: breakdown.map((b, i) => ({ id: i, value: b.value, label: b.label, color: b.color })),
                        innerRadius: 50,
                      }]}
                      height={200}
                    >
                      <PiePlot />
                    </ResponsiveChartContainer>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Box sx={{ pt: 2 }}>
                      {breakdown.map((item) => (
                        <Box key={item.label} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                              <Typography variant="body2">{item.label}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              ¥{item.value.toFixed(2)} ({item.percentage.toFixed(1)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.percentage}
                            sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 3 } }}
                          />
                        </Box>
                      ))}
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>产品总成本</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3B82F6' }}>
                          ¥{totalCost.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* 物料明细 */}
              <Paper sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>物料成本明细</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>物料编码</TableCell>
                        <TableCell>物料名称</TableCell>
                        <TableCell>数量</TableCell>
                        <TableCell>单位</TableCell>
                        <TableCell>单价 (¥)</TableCell>
                        <TableCell>小计 (¥)</TableCell>
                        <TableCell>占比</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bomTreeData.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#3B82F6' }}>{item.materialCode}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{item.materialName}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{item.quantity}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{item.unit}</Typography></TableCell>
                          <TableCell><Typography variant="body2">¥{item.unitCost.toFixed(2)}</Typography></TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>¥{item.totalCost.toFixed(2)}</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={(item.totalCost / materialCost) * 100}
                                sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: '#F1F5F9' }}
                              />
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
                                {((item.totalCost / materialCost) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          ) : (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Calculate sx={{ fontSize: 56, color: '#CBD5E1', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#64748B', mb: 1 }}>点击「执行卷积」开始计算</Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>将基于当前BOM和物料成本数据进行卷积计算</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default CostRollup;
