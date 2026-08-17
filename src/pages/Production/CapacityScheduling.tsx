import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
  Divider, Card, CardContent, TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { BarChart } from '@mui/x-charts/BarChart';
import { PageWrapper } from '@/components/layout';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore, mapCenter, CENTER_COLORS } from '@/stores/productionOperationStore';

const OPEN_STATUSES = ['draft', 'released', 'in_progress'];
const DAYS = 14;

interface SchedTask {
  woNo: string;
  opName: string;
  center: string;
  hours: number;
}

export default function CapacityScheduling() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters, updateWorkCenter } = useProductionOperationStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<{ id: string; capacityHours: number }[]>([]);

  // ── 负荷计算：遍历未完工工单，按工艺路线工序汇总各工作中心工时 ──
  const { loadByCenter, openOrders, tasks } = useMemo(() => {
    const loadMap: Record<string, number> = {};
    workCenters.forEach((c) => { loadMap[c.name] = 0; });
    const open = workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status));
    const taskList: SchedTask[] = [];
    let rr = 0;
    open.forEach((wo) => {
      const route =
        processRoutes.find((r) => r.id === wo.routeId) ||
        processRoutes.find((r) => r.routeNo === wo.routeNo) ||
        processRoutes.find((r) => r.productCode === wo.productCode);
      if (route && route.operations.length > 0) {
        route.operations
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .forEach((op) => {
            const hours = (op.setupTime + op.runTime * wo.plannedQuantity) / 60;
            const center = mapCenter(op.workCenter);
            loadMap[center] = (loadMap[center] || 0) + hours;
            taskList.push({ woNo: wo.orderNo, opName: op.operationName, center, hours });
          });
      } else {
        // 兜底模型：无工艺路线时按 0.5h/件 轮流分配到一个中心
        const total = wo.plannedQuantity * 0.5;
        const target = workCenters[rr % workCenters.length];
        rr += 1;
        if (target) {
          loadMap[target.name] = (loadMap[target.name] || 0) + total;
          taskList.push({ woNo: wo.orderNo, opName: '通用工序', center: target.name, hours: total });
        }
      }
    });
    return { loadByCenter: loadMap, openOrders: open, tasks: taskList };
  }, [workOrders, processRoutes, workCenters]);

  // ── 前向排程甘特：各中心工作中心按序每天排一道工序 ──
  const gantt = useMemo(() => {
    const byCenter: Record<string, { woNo: string; opName: string }[][]> = {};
    workCenters.forEach((c) => {
      byCenter[c.name] = Array.from({ length: DAYS }, () => [] as { woNo: string; opName: string }[]);
    });
    const dayPtr: Record<string, number> = {};
    workCenters.forEach((c) => { dayPtr[c.name] = 0; });
    tasks.forEach((t) => {
      const ptr = dayPtr[t.center] ?? 0;
      const day = Math.min(ptr, DAYS - 1);
      byCenter[t.center][day].push({ woNo: t.woNo, opName: t.opName });
      dayPtr[t.center] = ptr + 1;
    });
    return byCenter;
  }, [tasks, workCenters]);

  const days = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      }),
    []
  );

  const chartCenters = useMemo(() => workCenters.map((c) => c.name), [workCenters]);
  const chartLoad = useMemo(
    () => workCenters.map((c) => Number((loadByCenter[c.name] || 0).toFixed(1))),
    [workCenters, loadByCenter]
  );
  const chartCapacity = useMemo(() => workCenters.map((c) => c.capacityHours), [workCenters]);

  const overloaded = workCenters.filter((c) => {
    const util = c.capacityHours > 0 ? ((loadByCenter[c.name] || 0) / c.capacityHours) * 100 : 0;
    return util > 100;
  }).length;

  const handleOpenDialog = () => {
    setDraft(workCenters.map((c) => ({ id: c.id, capacityHours: c.capacityHours })));
    setDialogOpen(true);
  };
  const handleSave = () => {
    draft.forEach((d) => updateWorkCenter(d.id, { capacityHours: d.capacityHours }));
    setDialogOpen(false);
  };

  return (
    <PageWrapper
      title="产能排产（MRP 增强）"
      actions={
        <Button variant="outlined" startIcon={<EditIcon />} onClick={handleOpenDialog} size="small">
          编辑产能
        </Button>
      }
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        本页为 MRP 产能增强模块：基于未完工工单与其工艺路线，按工序标准工时汇总各工作中心负荷，
        并进行<strong>前向排程</strong>与<strong>负荷均衡</strong>，辅助识别产能瓶颈（利用率 &gt; 100% 标红）。
        工作中心产能主数据来自 productionOperationStore。
      </Alert>

      {/* 汇总指标 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '未完工工单', value: openOrders.length, color: '#3B82F6' },
          { label: '参与工序', value: tasks.length, color: '#8B5CF6' },
          { label: '过载中心', value: overloaded, color: overloaded > 0 ? '#EF4444' : '#10B981' },
          { label: '产能中心', value: workCenters.length, color: '#F59E0B' },
        ].map((kpi) => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 负荷汇总表 */}
      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <AssessmentIcon sx={{ color: '#3B82F6' }} />
          <Typography variant="subtitle1" fontWeight={600}>工作中心负荷汇总</Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>工作中心</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>负荷(小时)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>产能(小时)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>利用率</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workCenters.map((c) => {
                const load = loadByCenter[c.name] || 0;
                const util = c.capacityHours > 0 ? (load / c.capacityHours) * 100 : 0;
                const barColor = util > 100 ? '#EF4444' : util >= 80 ? '#F59E0B' : '#10B981';
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CENTER_COLORS[c.name] || '#64748B' }} />
                        <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{load.toFixed(1)}</TableCell>
                    <TableCell align="right">{c.capacityHours}</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(util, 100)}
                          sx={{ flex: 1, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { backgroundColor: barColor } }}
                        />
                        <Typography variant="body2" fontWeight={600} color={barColor} sx={{ width: 48, textAlign: 'right' }}>
                          {util.toFixed(0)}%
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={util > 100 ? '过载' : util >= 80 ? '偏紧' : '正常'}
                        size="small"
                        sx={{
                          bgcolor: (util > 100 ? '#EF4444' : util >= 80 ? '#F59E0B' : '#10B981') + '15',
                          color: util > 100 ? '#EF4444' : util >= 80 ? '#F59E0B' : '#10B981',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 负荷 vs 产能 柱状图 */}
      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>负荷 vs 产能对比（小时）</Typography>
        <Box sx={{ height: 300 }}>
          <BarChart
            xAxis={[{ scaleType: 'band', data: chartCenters }]}
            series={[
              { data: chartLoad, label: '负荷(小时)', color: '#F59E0B' },
              { data: chartCapacity, label: '产能(小时)', color: '#3B82F6' },
            ]}
            height={300}
          />
        </Box>
      </Paper>

      {/* 前向排程甘特 */}
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <ScheduleIcon sx={{ color: '#3B82F6' }} />
          <Typography variant="subtitle1" fontWeight={600}>前向排程甘特（未来 {DAYS} 天）</Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 820 }}>
            <Box sx={{ display: 'flex', position: 'sticky', top: 0, bgcolor: 'background.paper' }}>
              <Box sx={{ width: 96, flexShrink: 0, py: 1, borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">工作中心</Typography>
              </Box>
              {days.map((d, i) => (
                <Box key={i} sx={{ flex: 1, minWidth: 52, py: 1, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">{d.getMonth() + 1}/{d.getDate()}</Typography>
                </Box>
              ))}
            </Box>
            {workCenters.map((c) => (
              <Box key={c.id} sx={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ width: 96, flexShrink: 0, py: 1, px: 1, borderRight: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: CENTER_COLORS[c.name] || '#64748B' }} />
                  <Typography variant="caption" fontWeight={500}>{c.name}</Typography>
                </Box>
                {days.map((_, dayIdx) => {
                  const blocks = gantt[c.name]?.[dayIdx] || [];
                  return (
                    <Box key={dayIdx} sx={{ flex: 1, minWidth: 52, minHeight: 40, p: 0.5, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {blocks.map((b, bi) => (
                        <Box key={bi} sx={{ bgcolor: (CENTER_COLORS[c.name] || '#64748B') + '1A', borderLeft: `3px solid ${CENTER_COLORS[c.name] || '#64748B'}`, borderRadius: 0.5, px: 0.5, py: 0.25 }}>
                          <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.62rem', lineHeight: 1.1, display: 'block' }}>{b.woNo}</Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1.1, display: 'block' }}>{b.opName}</Typography>
                        </Box>
                      ))}
                    </Box>
                  );
                })}
              </Box>
            ))}
            {openOrders.length === 0 && (
              <Box sx={{ py: 3, textAlign: 'center', color: '#94A3B8' }}>
                <Typography variant="body2">当前没有未完工工单，无需排程。</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* 产能编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑工作中心日产能（小时）</DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>工作中心</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>日产能(小时)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {draft.map((d, idx) => {
                  const c = workCenters.find((w) => w.id === d.id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CENTER_COLORS[c?.name || ''] || '#64748B' }} />
                          <Typography variant="body2" fontWeight={500}>{c?.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={d.capacityHours}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, capacityHours: Number.isFinite(val) && val > 0 ? val : 0 } : p)));
                          }}
                          inputProps={{ min: 0, style: { textAlign: 'right' } }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            配置保存到 productionOperationStore（persist 键 ssa-erp-production-op）。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
}
