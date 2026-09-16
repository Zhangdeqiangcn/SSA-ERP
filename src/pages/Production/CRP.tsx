import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert,
  Tooltip, FormControl, Select, MenuItem, TextField, InputLabel, Grid,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore } from '@/stores/productionOperationStore';
import { computeCRP, DEFAULT_CALENDAR, ShopCalendar, CRPDayLoad } from '@/utils/crp';

const fmt = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const WEEKDAY_LABEL = ['日', '一', '二', '三', '四', '五', '六'];

/** 日负荷格：颜色即结论，不用读数字也能看出哪天要爆 */
function dayColor(load: CRPDayLoad): { bg: string; fg: string; tip: string } {
  if (!load.isWorking) {
    return load.requiredHours > 0
      ? { bg: '#d32f2f', fg: '#fff', tip: '非开工日却有需求 —— 必须顺延到下一个开工日' }
      : { bg: '#eeeeee', fg: '#9e9e9e', tip: '非开工日（按班次日历扣除）' };
  }
  if (load.loadPct > 120) return { bg: '#b71c1c', fg: '#fff', tip: '严重超载，必须加班或外协' };
  if (load.loadPct > 100) return { bg: '#e53935', fg: '#fff', tip: '超载' };
  if (load.loadPct > 85) return { bg: '#fb8c00', fg: '#fff', tip: '接近满负荷' };
  if (load.loadPct > 50) return { bg: '#43a047', fg: '#fff', tip: '正常' };
  if (load.requiredHours > 0) return { bg: '#a5d6a7', fg: '#1b5e20', tip: '负荷偏轻' };
  return { bg: '#f5f5f5', fg: '#9e9e9e', tip: '无需求' };
}

export default function CRP() {
  const { workOrders, processRoutes } = useProductionStore();
  const { workCenters } = useProductionOperationStore();

  // ── B3：班次日历 ─────────────────────────────────────────────────
  // 「周六算不算半个班」是车间现实，不是代码常量，故做成页面上的可调项。
  // 默认周六半天、周日停工，这是多数制造业车间的常态。
  const [saturdayFactor, setSaturdayFactor] = useState(DEFAULT_CALENDAR.saturdayFactor);
  const [sundayFactor, setSundayFactor] = useState(DEFAULT_CALENDAR.sundayFactor);
  const [holidayText, setHolidayText] = useState('');

  const calendar: ShopCalendar = useMemo(() => ({
    ...DEFAULT_CALENDAR,
    saturdayFactor,
    sundayFactor,
    // 只接受规范的 YYYY-MM-DD，避免用户随手输入被当成日期造成无法复现的曲线
    holidays: holidayText
      .split(/[\s,，;；]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)),
  }), [saturdayFactor, sundayFactor, holidayText]);

  const result = useMemo(
    () => computeCRP(workOrders, processRoutes, workCenters, calendar),
    [workOrders, processRoutes, workCenters, calendar],
  );

  // 日负荷曲线默认聚焦「整体负荷率最高」的工作中心 —— 计划员的时间应该花在最紧的地方
  const [focusCenterId, setFocusCenterId] = useState<string>('');
  const focus = useMemo(() => {
    if (result.daily.length === 0) return null;
    const picked = result.daily.find((d) => d.workCenterId === focusCenterId);
    if (picked) return picked;
    return result.daily.reduce((mx, d) => (d.loadPct > mx.loadPct ? d : mx), result.daily[0]);
  }, [result.daily, focusCenterId]);

  const criticalDays = result.daily.reduce((s, c) => s + c.overloadDays, 0);
  const nonWorkingWithDemand = result.daily.reduce(
    (s, c) => s + c.days.filter((d) => !d.isWorking && d.requiredHours > 0).length, 0,
  );

  return (
    <Box sx={{ p: 2 }} data-testid="crp">
      <Typography variant="h5" gutterBottom>CRP 产能需求计划</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        按所有未完工工单的工艺路线展开，累计各工作中心的需求工时并与日产能比较（负荷率）。负荷率 &gt; 100% 表示资源超载。
        <br />
        <b>日负荷曲线</b>：把需求工时按工单的计划起止日摊到每个<b>开工日</b>上，逐日比对产能。
        周末与节假日已按下方<b>班次日历</b>从可用产能中扣除 —— 否则会出现「周日负荷 60%，看着没问题，实际那天没人」这类误判。
      </Alert>

      {/* ── 班次日历（B3）────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 2 }} data-testid="crp-calendar">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>班次日历（可用产能折算）</Typography>
          <Tooltip title="本系统的产能主数据只有「日产能」一个数；但车间并非每天都开满。这里把周末与节假日如实扣除，日负荷曲线才能反映真实可用产能。">
            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Tooltip>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>周六产能</InputLabel>
              <Select
                label="周六产能"
                value={saturdayFactor}
                onChange={(e) => setSaturdayFactor(Number(e.target.value))}
                data-testid="crp-sat"
              >
                <MenuItem value={0}>停工（0%）</MenuItem>
                <MenuItem value={0.5}>半天（50%）</MenuItem>
                <MenuItem value={1}>满产（100%）</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>周日产能</InputLabel>
              <Select
                label="周日产能"
                value={sundayFactor}
                onChange={(e) => setSundayFactor(Number(e.target.value))}
                data-testid="crp-sun"
              >
                <MenuItem value={0}>停工（0%）</MenuItem>
                <MenuItem value={0.5}>半天（50%）</MenuItem>
                <MenuItem value={1}>满产（100%）</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="节假日（YYYY-MM-DD，多个用空格或逗号分隔）"
              placeholder="例如：2026-10-01 2026-10-02"
              value={holidayText}
              onChange={(e) => setHolidayText(e.target.value)}
              helperText={`已识别 ${calendar.holidays.length} 天节假日`}
              data-testid="crp-holidays"
            />
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip data-testid="crp-total-capacity" label={`总产能 ${fmt(result.totalCapacity)} h`} />
        <Chip data-testid="crp-total-required" label={`总需求 ${fmt(result.totalRequired)} h`} color="primary" />
        <Chip data-testid="crp-overload" label={`超载资源 ${result.overloadCount}`} color={result.overloadCount > 0 ? 'error' : 'success'} />
        <Chip
          data-testid="crp-critical-days"
          label={`超载日 ${criticalDays} 天`}
          color={criticalDays > 0 ? 'warning' : 'success'}
        />
        {nonWorkingWithDemand > 0 && (
          <Chip
            data-testid="crp-nonworking-demand"
            label={`非开工日却有需求 ${nonWorkingWithDemand} 处`}
            color="error"
          />
        )}
        <Chip label={`排产窗口 ${result.windowStart} ~ ${result.windowEnd}`} variant="outlined" />
      </Box>

      {nonWorkingWithDemand > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          有 <b>{nonWorkingWithDemand}</b> 处需求落在非开工日（周末或节假日）。
          这意味着排产时默认了休息日也能干活，实际会顺延到下一个工作日 —— 交期需要相应顺延，
          或调整工单的计划起止日期。
        </Alert>
      )}
      {/* ── 总量负荷（原有视图）───────────────────────────────────── */}
      <TableContainer sx={{ mb: 3 }} component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>工作中心</TableCell>
              <TableCell>日产能(h)</TableCell>
              <TableCell>需求工时(h)</TableCell>
              <TableCell>负荷率</TableCell>
              <TableCell>涉及工单数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.lines.map((l) => (
              <TableRow key={l.workCenterId} data-testid="crp-row">
                <TableCell>{l.name}</TableCell>
                <TableCell>{fmt(l.capacityHours)}</TableCell>
                <TableCell>{fmt(l.requiredHours)}</TableCell>
                <TableCell>
                  <Chip size="small" label={`${l.loadPct}%`} color={l.loadPct > 100 ? 'error' : l.loadPct > 80 ? 'warning' : 'success'} />
                </TableCell>
                <TableCell>{l.orderCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── 日负荷曲线（B3）───────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight={600}>日负荷曲线</Typography>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <Select
            value={focus?.workCenterId ?? ''}
            onChange={(e) => setFocusCenterId(e.target.value)}
            displayEmpty
            data-testid="crp-center-select"
          >
            {result.daily.map((c) => (
              <MenuItem key={c.workCenterId} value={c.workCenterId}>
                {c.name}（整体 {c.loadPct}%）
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box flex={1} />
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {[
            { c: '#f5f5f5', t: '无需求' },
            { c: '#a5d6a7', t: '偏轻' },
            { c: '#43a047', t: '正常' },
            { c: '#fb8c00', t: '接近满负荷' },
            { c: '#e53935', t: '超载' },
            { c: '#b71c1c', t: '严重超载' },
            { c: '#d32f2f', t: '非开工日有需求' },
          ].map((x) => (
            <Tooltip key={x.t} title={x.t}>
              <Box sx={{ width: 16, height: 16, bgcolor: x.c, borderRadius: 0.5, border: '1px solid #e0e0e0' }} />
            </Tooltip>
          ))}
        </Box>
      </Box>

      {focus === null ? (
        <Alert severity="info" data-testid="crp-daily-empty">
          暂无可绘制曲线的工作中心（工作中心的「日产能」为 0 或未维护，无法计算负荷率）。
        </Alert>
      ) : (
        <Paper sx={{ p: 2 }} data-testid="crp-daily">
          <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              <b>{focus.name}</b>：整体负荷 <b>{focus.loadPct}%</b>
              （需求 {fmt(focus.totalRequired)} h / 日历折算后可用 {fmt(focus.totalCapacity)} h）
            </Typography>
            <Typography variant="body2" color={focus.overloadDays > 0 ? 'error.main' : 'success.main'}>
              超载 {focus.overloadDays} 天
            </Typography>
            <Typography variant="body2" color="text.secondary">
              峰值 {focus.peakDate}（{focus.peakLoadPct}%）
            </Typography>
          </Box>

          {/* 逐日格子：一行多格，与日历周对齐，周末一眼可辨 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {focus.days.map((d) => {
              const col = dayColor(d);
              return (
                <Tooltip
                  key={d.date}
                  title={
                    `${d.date}（周${WEEKDAY_LABEL[d.weekday]}）　${col.tip}` +
                    `\n需求 ${fmt(d.requiredHours)} h / 可用 ${fmt(d.capacityHours)} h` +
                    (d.isWorking ? `（负荷 ${d.loadPct}%）` : '（非开工日）') +
                    (d.orderCount > 0 ? `\n涉及工单 ${d.orderCount} 张` : '')
                  }
                >
                  <Box
                    data-testid="crp-day"
                    data-date={d.date}
                    data-load={d.loadPct}
                    sx={{
                      width: 74,
                      height: 46,
                      bgcolor: col.bg,
                      color: col.fg,
                      borderRadius: 0.5,
                      p: 0.5,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      border: '1px solid #e0e0e0',
                      cursor: 'default',
                    }}
                  >
                    <Typography sx={{ fontSize: 10, lineHeight: 1.1 }}>
                      {d.date.slice(5)} 周{WEEKDAY_LABEL[d.weekday]}
                    </Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>
                      {d.isWorking ? `${d.loadPct}%` : (d.requiredHours > 0 ? '冲突' : '停')}
                    </Typography>
                    <Typography sx={{ fontSize: 9, lineHeight: 1.1 }}>
                      {fmt(d.requiredHours)}h
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* 逐日明细表：格子看趋势，表格看数字（两者都要，不能只给一个） */}
          <Box sx={{ mt: 2, maxHeight: 260, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>日期</TableCell>
                  <TableCell>星期</TableCell>
                  <TableCell align="right">可用产能(h)</TableCell>
                  <TableCell align="right">需求工时(h)</TableCell>
                  <TableCell align="right">负荷率</TableCell>
                  <TableCell>状态</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {focus.days.map((d) => (
                  <TableRow key={d.date} data-testid="crp-day-row">
                    <TableCell>{d.date}</TableCell>
                    <TableCell>周{WEEKDAY_LABEL[d.weekday]}</TableCell>
                    <TableCell align="right">{fmt(d.capacityHours)}</TableCell>
                    <TableCell align="right">{fmt(d.requiredHours)}</TableCell>
                    <TableCell align="right">
                      {d.isWorking
                        ? `${d.loadPct}%`
                        : (d.requiredHours > 0 ? '非开工日' : '—')}
                    </TableCell>
                    <TableCell>
                      {!d.isWorking && d.requiredHours > 0 ? (
                        <Chip size="small" color="error" label="需求落在停工日" />
                      ) : d.loadPct > 100 ? (
                        <Chip size="small" color="error" label="超载" />
                      ) : d.loadPct > 85 ? (
                        <Chip size="small" color="warning" label="接近满负荷" />
                      ) : (
                        <Chip size="small" color="success" label="正常" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {result.unplannedOrderCount > 0 && (
        <Alert severity="info" sx={{ mt: 2 }} data-testid="crp-unplanned">
          有 <b>{result.unplannedOrderCount}</b> 张工单缺少计划起止日期，已按「今天起 30 天」摊入曲线。
          补齐计划日期后曲线会更准确。
        </Alert>
      )}
    </Box>
  );
}
