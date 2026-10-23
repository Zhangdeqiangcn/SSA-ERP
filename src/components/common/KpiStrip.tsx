import React from 'react';
import { Grid, Paper, Typography, Box, Stack } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

/**
 * KpiStrip —— 列表页/驾驶舱顶部「KPI 统计条」（对标 SAP Fiori KPI Tile、金蝶·星空智能工作台、用友 YonSuite 单据磁贴）。
 *
 * 设计目标（一页化、降滚动）：
 *  - 在表格上方用一行 3~5 个磁贴把「总数 / 进行中 / 逾期 / 金额合计」等核心指标顶在一屏，
 *    用户扫一眼即知全貌，不必翻表算数。
 *  - 磁贴可点选（onSelect）：点哪个就按哪个状态过滤下方表格（与 DataTable 的 FilterBar 联动），
 *    把「统计 + 筛选」压在同一屏。
 *  - compact 密度（列表页）：矮磁贴、字号收敛，给下方紧凑表格留足纵向空间。
 *
 * 自包含：不依赖 theme，颜色用与现有列表页 KPI 卡一致的中性/蓝/绿/橙/红 hex，视觉连续。
 */

export interface KpiTrend {
  direction: 'up' | 'down' | 'flat';
  /** 副文字，如「环比 +12%」「较上月」 */
  text?: string;
  /** 该趋势是否「向好」。true=向好(绿)、false=向差(红)、undefined=中性(灰)。
 *   KPI 好坏方向因业务而异（如「逾期数」越多越差），由调用方判定。 */
  good?: boolean;
}

export interface KpiItem {
  /** 唯一键（Grid key 用） */
  key: string;
  /** 磁贴标题（caption，如「本月采购金额」） */
  label: string;
  /** 主数值（建议已格式化好，如 formatCurrency / toLocaleString） */
  value: React.ReactNode;
  /** 数值下方一行小字（副信息，如「较上月 +8%」或自定义说明） */
  hint?: React.ReactNode;
  /** 右上角图标（可选，字号随 density 收敛） */
  icon?: React.ReactNode;
  /** 磁贴主题色（决定左侧色条与激活底色） */
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** 当前是否被选中（点选筛选联动后高亮） */
  active?: boolean;
  /** 点击回调（提供后磁贴可点） */
  onSelect?: () => void;
  /** 趋势（与 hint 二选一；都给时 trend 优先渲染为带箭头样式） */
  trend?: KpiTrend;
}

export interface KpiStripProps {
  items: KpiItem[];
  /** compact=列表页紧凑矮磁贴；standard=驾驶舱稍高磁贴 */
  density?: 'compact' | 'standard';
  /** 显式控制每行几列（默认随屏宽自适应：xs 1 / sm 2 / md 4 / lg 5） */
  columnsPerRow?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  sx?: Record<string, unknown>;
  /** 整条的 data-testid（E2E 锚点） */
  testId?: string;
}

/** 颜色 → 左侧色条 / 激活底色 / 主数值色（与列表页手写 KPI 卡同款 hex，保持全站一致） */
const COLOR_MAP: Record<NonNullable<KpiItem['color']>, { bar: string; bg: string; value: string }> = {
  default: { bar: '#94A3B8', bg: '#F1F5F9', value: '#0F172A' },
  primary: { bar: '#1D4ED8', bg: '#EFF6FF', value: '#1D4ED8' },
  success: { bar: '#10B981', bg: '#ECFDF5', value: '#047857' },
  warning: { bar: '#F59E0B', bg: '#FFFBEB', value: '#B45309' },
  error:   { bar: '#EF4444', bg: '#FEF2F2', value: '#B91C1C' },
  info:    { bar: '#0EA5E9', bg: '#F0F9FF', value: '#0369A1' },
};

const TrendIcon = ({ direction }: { direction: KpiTrend['direction'] }) => {
  if (direction === 'up') return <TrendingUp sx={{ fontSize: 15 }} />;
  if (direction === 'down') return <TrendingDown sx={{ fontSize: 15 }} />;
  return <Remove sx={{ fontSize: 15 }} />;
};

const KpiStrip: React.FC<KpiStripProps> = ({
  items,
  density = 'compact',
  columnsPerRow,
  sx,
  testId,
}) => {
  if (!items || items.length === 0) return null;

  // 每行列数：默认自适应；xs(手机)1 列、sm 2、md 4、lg/xl 5（5 个磁贴一行放下，一页化）
  const per = columnsPerRow ?? { xs: 12, sm: 6, md: 4, lg: 12 / items.length, xl: 12 / items.length };
  const compact = density === 'compact';

  return (
    <Grid container spacing={compact ? 1.5 : 2} sx={sx} data-testid={testId}>
      {items.map((item) => {
        const c = COLOR_MAP[item.color ?? 'default'];
        const clickable = Boolean(item.onSelect);
        // 趋势色：good→绿(向好)、false→红(向差)、undefined→中性灰
        const trendColor = item.trend
          ? item.trend.good === true ? '#047857' : item.trend.good === false ? '#B91C1C' : '#64748B'
          : undefined;

        return (
          <Grid item key={item.key} xs={per.xs ?? 12} sm={per.sm ?? 6} md={per.md ?? 4} lg={per.lg ?? 12 / items.length} xl={per.xl ?? 12 / items.length}>
            <Paper
              variant="outlined"
              onClick={clickable ? item.onSelect : undefined}
              role={clickable ? 'button' : undefined}
              aria-pressed={clickable ? item.active : undefined}
              sx={{
                position: 'relative',
                overflow: 'hidden',
                height: compact ? 72 : 96,
                px: compact ? 2 : 2.5,
                py: compact ? 1 : 1.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: clickable ? 'pointer' : 'default',
                borderLeft: `3px solid ${c.bar}`,
                bgcolor: item.active ? c.bg : 'transparent',
                transition: 'background-color .15s ease, box-shadow .15s ease',
                '&:hover': clickable ? { bgcolor: c.bg, boxShadow: 1 } : {},
                ...(item.active ? { outline: `1px solid ${c.bar}`, outlineOffset: -1 } : {}),
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* 标题行 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: compact ? 11 : 12 }}>
                      {item.label}
                    </Typography>
                    {item.icon && <Box sx={{ opacity: 0.5, display: 'flex' }}>{item.icon}</Box>}
                  </Box>
                  {/* 主数值 */}
                  <Typography
                    sx={{
                      fontSize: compact ? '1.15rem' : '1.5rem',
                      fontWeight: 700,
                      color: c.value,
                      lineHeight: 1.15,
                      mt: compact ? 0.25 : 0.5,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.value}
                  </Typography>
                  {/* 趋势 / 副信息（紧凑密度下若两者都有则只显示一行，控高度） */}
                  {item.trend ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, color: trendColor }}>
                      <TrendIcon direction={item.trend.direction} />
                      {item.trend.text && (
                        <Typography variant="caption" sx={{ fontSize: compact ? 10.5 : 12, color: trendColor }}>
                          {item.trend.text}
                        </Typography>
                      )}
                    </Box>
                  ) : item.hint ? (
                    <Box sx={{ mt: 0.25, fontSize: compact ? 10.5 : 12, color: 'text.secondary' }}>
                      {item.hint}
                    </Box>
                  ) : null}
                </Box>
              </Stack>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default KpiStrip;
