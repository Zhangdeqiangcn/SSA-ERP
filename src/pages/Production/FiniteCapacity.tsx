import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
  Divider, Card, CardContent, TextField, Button,
} from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditIcon from '@mui/icons-material/Edit';
import { BarChart } from '@mui/x-charts/BarChart';
import { PageWrapper } from '@/components/layout';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore, mapCenter, CENTER_COLORS } from '@/stores/productionOperationStore';

const OPEN_STATUSES = ['draft', 'released', 'in_progress'];
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const DAYS = 14;

export default function FiniteCapacity() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters, updateWorkCenter } = useProductionOperationStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<{ id: string; capacityHours: number }[]>([]);

  const capacityOf = (name: string) => workCenters.find((c) => c.name === name)?.capacityHours ?? 0;

  // ── 有限产能前向排程 ──
  const { schedule, loadByCenter, days, utilizationByCenter, overloadedCenters, openOrders, taskCount } =
    useMemo(() => {
      const load: Record<string, number[]> = {};
      workCenters.forEach((c) => { load[c.name] = Array.from({ length: DAYS }, () => 0); });

      const sched: { woNo: string; opName: string; center: string; hours: number; day: number; overflow: boolean }[] = [];
      const open = workOrders
        .filter((wo) => OPEN_STATUSES.includes(wo.status))
        .slice()
        .sort((a, b) => {
          const pa = PRIORITY_RANK[a.priority] ?? 9;
          const pb = PRIORITY_RANK[b.priority] ?? 9;
          if (pa !== pb) return pa - pb;
          return a.plannedStartDate.localeCompare(b.plannedStartDate);
        });

      const firstAvailable = (center: string, fromDay: number, hours: number): { day: number; overflow: boolean } => {
        const cap = capacityOf(center);
        for (let d = fromDay; d < DAYS; d++) {
          if (cap <= 0 || load[center][d] + hours <= cap) return { day: d, overflow: false };
        }
        return { day: DAYS - 1, overflow: true }; // 超出计划 horizon，强制压到最后一天（过载）
      };

      let placed = 0;
      open.forEach((wo) => {
        const route =
          processRoutes.find((r) => r.id === wo.routeId) ||
          processRoutes.find((r) => r.routeNo === wo.routeNo) ||
          processRoutes.find((r) => r.productCode === wo.productCode);
        if (!route || route.operations.length === 0) {
          const center = '切割中心';
          const hours = Number((wo.plannedQuantity * 0.5).toFixed(2));
          const { day, overflow } = firstAvailable(center, 0, hours);
          load[center][day] += hours;
          sched.push({ woNo: wo.orderNo, opName: '通用工序', center, hours, day, overflow });
          placed += 1;
          return;
        }
        let prevEndDay = 0;
        route.operations
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .forEach((op) => {
            const center = mapCenter(op.workCenter);
            const goodReported = 0; // 排程基于计划量（有限产能约束），报工完成不缩减计划
            const remaining = Math.max(0, wo.plannedQuantity - goodReported);
            const hours = Number(((op.setupTime + op.runTime * remaining) / 60).toFixed(2));
            const { day, overflow } = firstAvailable(center, prevEndDay, hours);
            load[center][day] += hours;
            sched.push({ woNo: wo.orderNo, opName: op.operationName, center, hours, day, overflow });
            prevEndDay = day;
            placed += 1;
          });
      });

      // 负荷汇总 + 利用率
      const loadMap: Record<string, number> = {};
      const utilMap: Record<string, number> = {};
      workCenters.forEach((c) => {
        const total = load[c.name].reduce((s, h) => s + h, 0);
        loadMap[c.name] = Number(total.toFixed(1));
        const cap = c.capacityHours * DAYS;
        utilMap[c.name] = cap > 0 ? Number(((total / cap) * 100).toFixed(0)) : 0;
      });
      const overloaded = workCenters.filter((c) => c.capacityHours > 0 && loadMap[c.name] > c.capacityHours * DAYS);

      const dateList = Array.from({ length: DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
      });

      return {
        schedule: sched,
        loadByCenter: loadMap,
        days: dateList,
        utilizationByCenter: utilMap,
        overloadedCenters: overloaded,
        openOrders: open,
        taskCount: placed,
      };
    }, [workOrders, processRoutes, workCenters]);

  // ── 甘特：按中心 × 天 ──
  const gantt = useMemo(() => {
    const byCenter: Record<string, { woNo: string; opName: string; overflow: boolean }[][]> = {};
    workCenters.forEach((c) => {
      byCenter[c.name] = Array.from({ length: DAYS }, () => [] as { woNo: string; opName: string; overflow: boolean }[]);
    });
    schedule.forEach((t) => {
      byCenter[t.center][t.day]?.push({ woNo: t.woNo, opName: t.opName, overflow: t.overflow });
    });
    return byCenter;
  }, [schedule, workCenters]);

  const openDialog = () => {
    setDraft(workCenters.map((c) => ({ id: c.id, capacityHours: c.capacityHours })));
    setDialogOpen(true);
  };
  const saveDialog = () => {
    draft.forEach((d) => updateWorkCenter(d.id, { capacityHours: d.capacityHours }));
    setDialogOpen(false);
  };

  return (
    <PageWrapper
      title="APS 有限产能排程"
      subtitle="以工作中心日产能为硬约束前向排程，超产能顺延次日，识别瓶颈中心"
      actions={
        <Button variant="outlined" startIcon={<EditIcon />} onClick={openDialog} size="small">
          编辑产能
        </Button>
      }
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        与「产能排产（负荷汇总）」不同，本页采用<strong>有限产能</strong>算法：每道工序必须落入某工作中心
        「当日剩余产能」之内，超出则顺延至次日，最终形成跨日甘特。利用率 = 总负荷 ÷（天数 × 日产能）。
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '未完工工单', value: openOrders.length, color: '#3B82F6' },
          { label: '调度工序', value: taskCount, color: '#8B5CF6' },
          { label: '过载中心', value: overloadedCenters.length, color: overloadedCenters.length > 0 ? '#EF4444' : '#10B981' },
          { label: '工作中心', value: workCenters.length, color: '#F59E0B' },
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

      {/* 负荷 vs 产能 */}
      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>计划期内负荷（小时）</Typography>
        <Box sx={{ height: 300 }}>
          <BarChart
            xAxis={[{ scaleType: 'band', data: workCenters.map((c) => c.name) }]}
            series={[{ data: workCenters.map((c) => loadByCenter[c.name] || 0), label: '负荷(小时)', color: '#F59E0B' }]}
            height={300}
          />
        </Box>
      </Paper>

      {/* 利用率表 */}
      <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <ScheduleIcon sx={{ color: '#3B82F6' }} />
          <Typography variant="subtitle1" fontWeight={600}>工作中心利用率（{DAYS} 天）</Typography>
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>工作中心</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>负荷(小时)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>可用产能(小时)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>利用率</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workCenters.map((c) => {
                const load = loadByCenter[c.name] || 0;
                const cap = c.capacityHours * DAYS;
                const util = utilizationByCenter[c.name] || 0;
                const barColor = util > 100 ? '#EF4444' : util >= 80 ? '#F59E0B' : '#10B981';
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CENTER_COLORS[c.name] || '#64748B' }} />
                        <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{load}</TableCell>
                    <TableCell align="right">{cap}</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(util, 100)}
                        sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { backgroundColor: barColor } }}
                      />
                      <Typography variant="caption" fontWeight={600} color={barColor}>{util}%</Typography>
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

      {/* 跨日甘特 */}
      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <ScheduleIcon sx={{ color: '#3B82F6' }} />
          <Typography variant="subtitle1" fontWeight={600}>有限产能前向排程甘特（未来 {DAYS} 天）</Typography>
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
                        <Box key={bi} sx={{ bgcolor: (CENTER_COLORS[c.name] || '#64748B') + '1A', borderLeft: `3px solid ${b.overflow ? '#EF4444' : CENTER_COLORS[c.name] || '#64748B'}`, borderRadius: 0.5, px: 0.5, py: 0.25 }}>
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
                            const v = Number(e.target.value);
                            setDraft((prev) => prev.map((p, i) => (i === idx ? { ...p, capacityHours: Number.isFinite(v) && v > 0 ? v : 0 } : p)));
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
          <Button variant="contained" onClick={saveDialog}>保存</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
}
