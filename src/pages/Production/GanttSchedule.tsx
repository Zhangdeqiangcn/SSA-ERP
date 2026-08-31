import { useCallback, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Stack, Alert, IconButton, Tooltip,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { PageWrapper } from '@/components/layout';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore, mapCenter, CENTER_COLORS, DEFAULT_WORK_CENTERS } from '@/stores/productionOperationStore';
import { useProductionSchedulingStore } from '@/stores/productionSchedulingStore';
import type { SchedulingMode, ConflictInfo } from '@/stores/productionSchedulingStore';
import type { WorkOrder } from '@/types/production';

/**
 * C2 — 甘特图拖拽排产 + 负荷联动重排（P2 增强第二项）
 * ------------------------------------------------------------
 * 演示级（对标 PPDS 排产体验）：
 *  - 5 大工作中心泳道（DEFAULT_WORK_CENTERS），工单按「工艺路线首工序 → mapCenter」映射到主中心泳道。
 *  - 纯 CSS 甘特 + 原生 pointer 拖拽（不引第三方拖拽/甘特库）。
 *  - 前移 / 后移一天按钮：确定性改期入口（E2E 友好），pointer 拖拽为增强 UX。
 *  - 负荷（利用率）：有限能力模型——工单在某中心占用当日即计满该中心日产能，
 *    利用率(中心,日) = 当日该中心重叠工单数 × 100%；峰值 > 100% 标红「超载」。
 *  - 负荷联动重排：同中心工单按优先级顺序做有限能力前向顺排（不重叠，
 *    时长 = ⌈工单工时 / 日产能⌉），重排后峰值利用率 ≤ 100%。
 */

const OPEN_STATUSES = ['draft', 'released', 'in_progress'];
const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

// ── 日期工具（本地时区，避免 TZ 漂移）──
const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmtDate = (dt: Date): string => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const addDays = (s: string, n: number): string => {
  const dt = parseDate(s);
  dt.setDate(dt.getDate() + n);
  return fmtDate(dt);
};
const dayDiff = (a: string, b: string): number =>
  Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86_400_000);

export default function GanttSchedule() {
  const { workOrders, processRoutes, updateWorkOrder } = useProductionStore();
  const { workCenters } = useProductionOperationStore();
  const {
    schedulingMode, setSchedulingMode,
    setRescheduleResult,
    locks, toggleLock,
  } = useProductionSchedulingStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  const centers = workCenters.length ? workCenters : DEFAULT_WORK_CENTERS;

  // 按首工序映射主工作中心 + 工单标准工时
  const mainCenter = useCallback(
    (wo: WorkOrder): string => {
      const route =
        processRoutes.find((r) => r.id === wo.routeId) ||
        processRoutes.find((r) => r.routeNo === wo.routeNo) ||
        processRoutes.find((r) => r.productCode === wo.productCode);
      const firstOp = route?.operations?.[0];
      return firstOp ? mapCenter(firstOp.workCenter) : centers[0]?.name || '切割中心';
    },
    [processRoutes, centers]
  );

  const woHours = useCallback(
    (wo: WorkOrder): number => {
      const route =
        processRoutes.find((r) => r.id === wo.routeId) ||
        processRoutes.find((r) => r.routeNo === wo.routeNo) ||
        processRoutes.find((r) => r.productCode === wo.productCode);
      if (!route || route.operations.length === 0) return wo.plannedQuantity * 0.5;
      return route.operations.reduce(
        (sum, op) => sum + (op.setupTime + op.runTime * wo.plannedQuantity) / 60,
        0
      );
    },
    [processRoutes]
  );

  const openOrders = useMemo(
    () => workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status)),
    [workOrders]
  );

  // 时间窗：覆盖所有未完工工单
  const { windowStart, windowEnd, days } = useMemo(() => {
    if (openOrders.length === 0) {
      const today = fmtDate(new Date());
      return { windowStart: today, windowEnd: today, days: [today] };
    }
    let min = openOrders[0].plannedStartDate;
    let max = openOrders[0].plannedEndDate;
    openOrders.forEach((wo) => {
      if (parseDate(wo.plannedStartDate) < parseDate(min)) min = wo.plannedStartDate;
      if (parseDate(wo.plannedEndDate) > parseDate(max)) max = wo.plannedEndDate;
    });
    const arr: string[] = [];
    let cur = min;
    while (parseDate(cur) <= parseDate(max)) {
      arr.push(cur);
      cur = addDays(cur, 1);
    }
    return { windowStart: min, windowEnd: max, days: arr };
  }, [openOrders]);

  const N = days.length;

  // 各工作中心的工单映射
  const ordersByCenter = useMemo(() => {
    const map: Record<string, WorkOrder[]> = {};
    centers.forEach((c) => { map[c.name] = []; });
    openOrders.forEach((wo) => {
      const c = mainCenter(wo);
      (map[c] || (map[c] = [])).push(wo);
    });
    return map;
  }, [openOrders, centers, mainCenter]);

  // 逐日重叠工单数（利用率 = 重叠数 × 100%）
  const loadByCenter = useMemo(() => {
    const res: Record<string, { peak: number; daily: number[] }> = {};
    centers.forEach((c) => {
      const daily = days.map((d) => {
        const cnt = (ordersByCenter[c.name] || []).filter(
          (wo) => parseDate(wo.plannedStartDate) <= parseDate(d) && parseDate(d) <= parseDate(wo.plannedEndDate)
        ).length;
        return cnt;
      });
      res[c.name] = { peak: Math.max(0, ...daily), daily };
    });
    return res;
  }, [centers, days, ordersByCenter]);

  // 拖拽：按像素位移换算天数并改期
  const onBarPointerDown = (e: React.PointerEvent, wo: WorkOrder) => {
    if (locks[wo.id]?.locked) return; // 锁定的工单不可拖拽
    e.preventDefault();
    const startX = e.clientX;
    const track = (e.currentTarget as HTMLElement).parentElement;
    const trackWidth = track ? track.getBoundingClientRect().width : 0;
    const dayWidth = trackWidth / Math.max(1, N);
    setDragId(wo.id);
    const move = (ev: PointerEvent) => {
      const deltaDays = Math.round((ev.clientX - startX) / Math.max(1, dayWidth));
      if (deltaDays !== 0 && Math.abs(deltaDays) >= 1) {
        // 拖拽实时预览由 CSS 左移实现，松手时落库
      }
    };
    const up = (ev: PointerEvent) => {
      const deltaDays = Math.round((ev.clientX - startX) / Math.max(1, dayWidth));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragId(null);
      if (deltaDays !== 0) {
        updateWorkOrder(wo.id, {
          plannedStartDate: addDays(wo.plannedStartDate, deltaDays),
          plannedEndDate: addDays(wo.plannedEndDate, deltaDays),
        });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const shift = (wo: WorkOrder, delta: number) => {
    if (locks[wo.id]?.locked) return; // 锁定的工单不可手动改期
    updateWorkOrder(wo.id, {
      plannedStartDate: addDays(wo.plannedStartDate, delta),
      plannedEndDate: addDays(wo.plannedEndDate, delta),
    });
  };

  // 负荷联动重排：同中心有限能力前向顺排（不重叠）
  const handleReschedule = () => {
    const cursorBase = windowStart;
    centers.forEach((c) => {
      const cap = c.capacityHours || 16;
      const wos = (ordersByCenter[c.name] || []).slice().sort(
        (a, b) =>
          (PRIORITY_WEIGHT[b.priority] ?? 2) - (PRIORITY_WEIGHT[a.priority] ?? 2) ||
          dayDiff(a.plannedStartDate, b.plannedStartDate)
      );
      let cursor = cursorBase;
      wos.forEach((wo) => {
        if (locks[wo.id]?.locked) return; // 锁定的工单保持原位，不参与顺排
        const h = woHours(wo);
        const dur = Math.max(1, Math.ceil(h / cap));
        const start = cursor;
        const end = addDays(start, dur - 1);
        updateWorkOrder(wo.id, { plannedStartDate: start, plannedEndDate: end });
        cursor = addDays(end, 1);
      });
    });
  };

  // P1-20 冲突检测：同一工作中心同一天的占用 > 100%
  const detectConflicts = useCallback((): ConflictInfo[] => {
    const result: ConflictInfo[] = [];
    centers.forEach((c) => {
      const dailyMap: Record<string, string[]> = {};
      const wos = ordersByCenter[c.name] || [];
      wos.forEach((wo) => {
        let d = wo.plannedStartDate;
        while (parseDate(d) <= parseDate(wo.plannedEndDate)) {
          (dailyMap[d] || (dailyMap[d] = [])).push(wo.id);
          d = addDays(d, 1);
        }
      });
      Object.entries(dailyMap).forEach(([date, orderIds]) => {
        if (orderIds.length > 1) {
          result.push({
            workCenter: c.name,
            date,
            orderIds,
            loadPercent: orderIds.length * 100,
            suggestionMoveDays: orderIds.length,
          });
        }
      });
    });
    return result;
  }, [centers, ordersByCenter]);

  // P1-20 自动重排：检查产能冲突，按优先级逐个重排
  const handleAutoReschedule = () => {
    const currentConflicts = detectConflicts();
    let resolvedCount = 0;

    centers.forEach((c) => {
      const cap = c.capacityHours || 16;
      const wos = (ordersByCenter[c.name] || []).slice().sort(
        (a, b) =>
          (PRIORITY_WEIGHT[b.priority] ?? 2) - (PRIORITY_WEIGHT[a.priority] ?? 2) ||
          dayDiff(a.plannedStartDate, b.plannedStartDate)
      );

      // 正排：从最早可用日期往后排；倒排：从最后交货日往前排
      if (schedulingMode === 'forward') {
        let cursor = windowStart;
        wos.forEach((wo) => {
          if (locks[wo.id]?.locked) return; // 锁定的工单不参与自动重排
          const h = woHours(wo);
          const dur = Math.max(1, Math.ceil(h / cap));
          updateWorkOrder(wo.id, { plannedStartDate: cursor, plannedEndDate: addDays(cursor, dur - 1) });
          cursor = addDays(cursor, dur);
          resolvedCount++;
        });
      } else {
        // 倒排：从交货日期往前排
        let cursor = windowEnd;
        const reversed = [...wos].reverse();
        reversed.forEach((wo) => {
          if (locks[wo.id]?.locked) return; // 锁定的工单不参与自动重排
          const h = woHours(wo);
          const dur = Math.max(1, Math.ceil(h / cap));
          const endDate = cursor;
          const startDate = addDays(cursor, -(dur - 1));
          updateWorkOrder(wo.id, { plannedStartDate: startDate, plannedEndDate: endDate });
          cursor = addDays(startDate, -1);
          resolvedCount++;
        });
      }
    });

    // 重排后重新检测冲突
    const remainingConflicts = detectConflicts();
    setConflicts(remainingConflicts);
    setConflictDialogOpen(true);

    setRescheduleResult({
      timestamp: new Date().toISOString(),
      mode: schedulingMode,
      resolvedCount,
      remainingConflicts,
    });
  };

  return (
    <PageWrapper
      title="甘特排产（C2 · 拖拽 + 负荷联动重排 + P1-20 自动排程）"
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" startIcon={<RestartAltIcon />} onClick={handleReschedule} data-testid="reschedule-btn" size="small">
            负荷联动重排
          </Button>
          <Button variant="contained" color="warning" startIcon={<AutoFixHighIcon />} onClick={handleAutoReschedule} data-testid="gantt-auto-reschedule" size="small">
            自动重排
          </Button>
        </Stack>
      }
    >
      <Box sx={{ mb: 2 }}>
        <FormControl component="fieldset" data-testid="gantt-mode">
          <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.5 }}>排程模式</FormLabel>
          <RadioGroup
            row
            value={schedulingMode}
            onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
          >
            <FormControlLabel value="forward" control={<Radio size="small" />} label="正排 (Forward)" />
            <FormControlLabel value="backward" control={<Radio size="small" />} label="倒排 (Backward)" />
          </RadioGroup>
        </FormControl>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        工单按工艺路线<strong>首工序</strong>映射到主工作中心泳道；工单在某中心占用当日即计满该中心日产能，
        利用率 = 当日重叠工单数 × 100%，峰值 &gt; 100% 标红「超载」。点击<strong>负荷联动重排</strong>按有限能力前向顺排（同中心不重叠），
        重排后峰值利用率 ≤ 100%。<strong>自动重排</strong>检查所有工单的产能冲突，按优先级逐个重排并展示冲突摘要。
      </Alert>

      <Box data-testid="gantt-root" sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 760 }}>
          {/* 日期表头 */}
          <Box sx={{ display: 'flex', position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 2 }}>
            <Box sx={{ width: 140, flexShrink: 0, py: 1, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">工作中心 / 负荷</Typography>
            </Box>
            {days.map((d, i) => (
              <Box key={i} sx={{ flex: 1, minWidth: 46, py: 1, textAlign: 'center', borderRight: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  {parseDate(d).getMonth() + 1}/{parseDate(d).getDate()}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* 泳道 */}
          {centers.map((c) => {
            const wos = ordersByCenter[c.name] || [];
            const load = loadByCenter[c.name];
            const overload = load.peak > 1;
            const color = CENTER_COLORS[c.name] || '#64748B';
            return (
              <Box
                key={c.id}
                sx={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid', borderColor: 'divider' }}
              >
                {/* 泳道标签 + 负荷 */}
                <Box sx={{ width: 140, flexShrink: 0, py: 1, px: 1, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
                    <Typography variant="caption" fontWeight={600}>{c.name}</Typography>
                  </Stack>
                  <Box data-testid={`load-peak-${c.name}`}>
                    <Typography variant="caption" fontWeight={700} color={overload ? '#EF4444' : load.peak >= 1 ? '#F59E0B' : '#10B981'}>
                      峰值 {load.peak * 100}%
                    </Typography>
                  </Box>
                  <Box
                    data-testid={`load-overload-${c.name}`}
                    sx={{ display: overload ? 'inline-flex' : 'none' }}
                  >
                    <Chip label="超载" size="small" sx={{ bgcolor: '#EF4444', color: '#fff', height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                  </Box>
                </Box>

                {/* 甘特轨道 */}
                <Box sx={{ position: 'relative', flex: 1, minHeight: wos.length ? 52 : 36 }}>
                  {/* 背景日格 */}
                  <Box sx={{ display: 'flex', position: 'absolute', inset: 0 }}>
                    {days.map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          flex: 1,
                          minWidth: 46,
                          borderRight: '1px solid',
                          borderColor: 'divider',
                          bgcolor: i % 2 ? 'action.hover' : 'transparent',
                        }}
                      />
                    ))}
                  </Box>
                  {/* 工单条 */}
                  {wos.map((wo) => {
                    const col = dayDiff(wo.plannedStartDate, windowStart);
                    const span = dayDiff(wo.plannedEndDate, wo.plannedStartDate) + 1;
                    const leftPct = (col / N) * 100;
                    const widthPct = (span / N) * 100;
                    const isDragging = dragId === wo.id;
                    return (
                      <Box
                        key={wo.id}
                        data-testid={`wo-bar-${wo.id}`}
                        data-start={wo.plannedStartDate}
                        data-end={wo.plannedEndDate}
                        onPointerDown={(e) => onBarPointerDown(e, wo)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: color,
                          color: '#fff',
                          boxShadow: isDragging ? 6 : 1,
                          cursor: 'grab',
                          opacity: isDragging ? 0.85 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          px: 0.75,
                          gap: 0.25,
                          userSelect: 'none',
                          touchAction: 'none',
                        }}
                      >
                        <IconButton
                          size="small"
                          data-testid={`wo-shift-left-${wo.id}`}
                          onClick={(e) => { e.stopPropagation(); shift(wo, -1); }}
                          sx={{ color: '#fff', p: 0.25 }}
                        >
                          <ChevronLeftIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.66rem', lineHeight: 1.1, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                              {wo.orderNo}
                            </Typography>
                            <Tooltip title={locks[wo.id]?.locked ? '已锁单（拖拽/改期/自动重排均跳过）' : '点击锁单，防止被排程调整移动'}>
                              <IconButton
                                size="small"
                                data-testid={`wo-lock-${wo.id}`}
                                aria-label={locks[wo.id]?.locked ? '解锁工单' : '锁单'}
                                onClick={(e) => { e.stopPropagation(); toggleLock(wo.id); }}
                                sx={{ color: locks[wo.id]?.locked ? '#FBBF24' : 'rgba(255,255,255,0.75)', p: 0.1, flexShrink: 0 }}
                              >
                                {locks[wo.id]?.locked ? <LockIcon sx={{ fontSize: 14 }} /> : <LockOpenIcon sx={{ fontSize: 14 }} />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          <Typography
                            variant="caption"
                            data-testid={`wo-planned-start-${wo.id}`}
                            sx={{ fontSize: '0.6rem', lineHeight: 1.1, display: 'block', opacity: 0.9 }}
                          >
                            {wo.plannedStartDate}
                          </Typography>
                          <Typography
                            variant="caption"
                            data-testid={`wo-planned-end-${wo.id}`}
                            sx={{ fontSize: '0.6rem', lineHeight: 1.1, display: 'block', opacity: 0.9 }}
                          >
                            {wo.plannedEndDate}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          data-testid={`wo-shift-right-${wo.id}`}
                          onClick={(e) => { e.stopPropagation(); shift(wo, 1); }}
                          sx={{ color: '#fff', p: 0.25 }}
                        >
                          <ChevronRightIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                  {wos.length === 0 && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', pl: 1 }}>
                      <Typography variant="caption" color="text.disabled">无工单</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}

          {openOrders.length === 0 && (
            <Box sx={{ py: 3, textAlign: 'center', color: '#94A3B8' }}>
              <Typography variant="body2">当前没有未完工工单，无需排产。</Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 2, mt: 2, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <ViewTimelineIcon sx={{ color: '#3B82F6' }} />
          <Typography variant="subtitle2" fontWeight={600}>排产说明</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          · 泳道按工单工艺路线<strong>首工序</strong>映射的主工作中心划分（切割 / 焊接 / 喷涂 / 装配 / 质检）。<br />
          · 利用率采用有限能力模型：工单在某中心占用的每一天计满该中心日产能，利用率 = 当日重叠工单数 × 100%。<br />
          · 拖动甘特条或使用前 / 后移按钮改期；点击「负荷联动重排」按优先级做同中心前向顺排（时长 = ⌈工单工时 / 日产能⌉），消除超载。<br />
          · <strong>P1-20 自动排程</strong>：选择正排/倒排模式后点击「自动重排」，系统检查所有产能冲突并按优先级逐个重排；冲突摘要弹窗展示冲突工单及建议移动天数。
        </Typography>
      </Paper>

      {/* P1-20 冲突摘要弹窗 */}
      <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color={conflicts.length > 0 ? 'warning' : 'success'} />
          产能冲突摘要
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {conflicts.length === 0 ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              所有工单排程完成，无产能冲突。各工作中心利用率均在 100% 以下。
            </Alert>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                检测到 {conflicts.length} 处产能冲突（同一工作中心同一天总占用 &gt; 100%）。
              </Alert>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#FEF3C7' }}>
                      <TableCell sx={{ fontWeight: 600 }}>工作中心</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>冲突工单</TableCell>
                      <TableCell sx={{ fontWeight: 600, align: 'center' }}>负载率</TableCell>
                      <TableCell sx={{ fontWeight: 600, align: 'center' }}>建议移动天数</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conflicts.map((cf, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Chip label={cf.workCenter} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{cf.date}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {cf.orderIds.map((oid) => {
                              const wo = workOrders.find((w) => w.id === oid);
                              return (
                                <Chip
                                  key={oid}
                                  label={wo?.orderNo || oid.slice(0, 8)}
                                  size="small"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              );
                            })}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${cf.loadPercent}%`}
                            size="small"
                            color="error"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`+${cf.suggestionMoveDays}天`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConflictDialogOpen(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setConflictDialogOpen(false); handleReschedule(); }}>
            执行负荷联动重排
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
}
