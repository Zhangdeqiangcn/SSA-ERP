import { useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Alert,
  Divider, Card, CardContent, LinearProgress,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import { PageWrapper } from '@/components/layout';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore, mapCenter, CENTER_COLORS } from '@/stores/productionOperationStore';

const WO_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', released: '已下达', in_progress: '生产中', completed: '已完成', closed: '已关闭',
};
const OP_STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'default', in_progress: 'warning', completed: 'success',
};

export default function WipBoard() {
  const { workOrders, processRoutes } = useProductionStore();
  const { operationReports, workCenters } = useProductionOperationStore();

  const activeWos = useMemo(
    () => workOrders.filter((wo) => wo.status !== 'closed'),
    [workOrders]
  );

  // 计算每个工单的工序 WIP
  const wipByWo = useMemo(() => {
    return activeWos.map((wo) => {
      const route =
        processRoutes.find((r) => r.id === wo.routeId) ||
        processRoutes.find((r) => r.routeNo === wo.routeNo) ||
        processRoutes.find((r) => r.productCode === wo.productCode);
      const rows: {
        sequence: number; operationName: string; workCenter: string; status: string;
        upstream: number; good: number; wip: number; stuck: boolean;
      }[] = [];
      if (route) {
        let upstream = wo.plannedQuantity;
        route.operations
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .forEach((op) => {
            const prog = wo.progress?.find((p) => p.operationId === op.id);
            const good = operationReports
              .filter((r) => r.workOrderId === wo.id && r.operationId === op.id)
              .reduce((s, r) => s + r.goodQuantity, 0);
            const status =
              prog?.status ||
              (good > 0 ? (good >= wo.plannedQuantity ? 'completed' : 'in_progress') : 'pending');
            const wip = Math.max(0, upstream - good);
            const stuck = status === 'pending' && wip > 0;
            rows.push({
              sequence: op.sequence,
              operationName: op.operationName,
              workCenter: op.workCenter,
              status,
              upstream,
              good,
              wip,
              stuck,
            });
            upstream = good;
          });
      }
      const totalWip = rows.reduce((s, r) => s + r.wip, 0);
      const stuckCount = rows.filter((r) => r.stuck).length;
      return { wo, rows, totalWip, stuckCount };
    });
  }, [activeWos, processRoutes, operationReports]);

  // 按工作中心汇总 WIP
  const wipByCenter = useMemo(() => {
    const map: Record<string, number> = {};
    wipByWo.forEach(({ rows }) => {
      rows.forEach((r) => {
        if (r.wip <= 0) return;
        const c = mapCenter(r.workCenter);
        map[c] = (map[c] || 0) + r.wip;
      });
    });
    return map;
  }, [wipByWo]);

  const totalWipAll = wipByWo.reduce((s, x) => s + x.totalWip, 0);
  const totalStuck = wipByWo.reduce((s, x) => s + x.stuckCount, 0);
  const maxCenterWip = Math.max(0, ...Object.values(wipByCenter));

  return (
    <PageWrapper title="WIP 在制品看板" subtitle="按工序层级计算在制品（上游合格 − 本序合格），识别滞留瓶颈">
      <Alert severity="info" sx={{ mb: 2 }}>
        在制(WIP) = 上一序合格数 − 本序合格数；正值表示该工序仍有在产/待处理物料。
        <strong>滞留</strong>标记表示工序尚未开始但已有上游物料等待流入，通常意味着排产缺口或资源瓶颈。
      </Alert>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '在制工单', value: activeWos.length, color: '#3B82F6' },
          { label: 'WIP 合计', value: totalWipAll, color: '#8B5CF6' },
          { label: '滞留工序', value: totalStuck, color: totalStuck > 0 ? '#EF4444' : '#10B981' },
          { label: '涉及工作中心', value: Object.keys(wipByCenter).length, color: '#F59E0B' },
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

      <Grid container spacing={2}>
        {/* 各工单 WIP 明细 */}
        <Grid item xs={12} md={8}>
          <Stack spacing={2}>
            {wipByWo.map(({ wo, rows, totalWip, stuckCount }) => (
              <Paper key={wo.id} sx={{ p: 2.5, borderRadius: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{wo.orderNo} · {wo.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      计划 {wo.plannedQuantity} 件 ·
                      <Chip label={WO_STATUS_LABEL[wo.status]} size="small" sx={{ mx: 0.5, verticalAlign: 'middle' }} />
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {stuckCount > 0 && (
                      <Chip label={`滞留 ${stuckCount}`} size="small" color="error" />
                    )}
                    <Chip label={`WIP ${totalWip}`} size="small" color={totalWip > 0 ? 'warning' : 'success'} />
                  </Stack>
                </Stack>
                <Divider sx={{ mb: 1 }} />
                {rows.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">该工单无工艺路线，无法计算工序 WIP。</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 600 }}>序</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>工序</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>工作中心</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>上游到达</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>本序合格</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>在制</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.sequence} hover>
                            <TableCell>{r.sequence}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>{r.operationName}</Typography>
                              {r.stuck && <Chip label="滞留" size="small" color="error" sx={{ mt: 0.25 }} />}
                            </TableCell>
                            <TableCell>{r.workCenter}</TableCell>
                            <TableCell>
                              <Chip label={r.status === 'completed' ? '已完成' : r.status === 'in_progress' ? '进行中' : '未开始'}
                                size="small" color={OP_STATUS_COLOR[r.status] as 'default' | 'warning' | 'success'} />
                            </TableCell>
                            <TableCell align="right">{r.upstream}</TableCell>
                            <TableCell align="right">{r.good}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} color={r.wip > 0 ? '#F59E0B' : 'text.secondary'}>
                                {r.wip}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            ))}
            {wipByWo.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="text.secondary">当前没有进行中的工单。</Typography>
              </Paper>
            )}
          </Stack>
        </Grid>

        {/* 工作中心 WIP 汇总 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <HubIcon sx={{ color: '#3B82F6' }} />
              <Typography variant="subtitle1" fontWeight={600}>工作中心在制汇总</Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {Object.keys(wipByCenter).length === 0 ? (
              <Typography variant="body2" color="text.secondary">各工作中心当前无在制物料。</Typography>
            ) : (
              workCenters.map((c) => {
                const wip = wipByCenter[c.name] || 0;
                const pct = maxCenterWip > 0 ? (wip / maxCenterWip) * 100 : 0;
                return (
                  <Box key={c.id} sx={{ mb: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: CENTER_COLORS[c.name] || '#64748B' }} />
                        <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={600}>{wip}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 8, borderRadius: 4, mt: 0.5, '& .MuiLinearProgress-bar': { backgroundColor: CENTER_COLORS[c.name] || '#64748B' } }}
                    />
                  </Box>
                );
              })
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageWrapper>
  );
}
