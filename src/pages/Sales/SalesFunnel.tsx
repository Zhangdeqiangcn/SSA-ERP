import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, FormControl, InputLabel, Select, MenuItem,
  TextField, Stack, Divider,
} from '@mui/material';
import { TrendingDown, Person, AttachMoney, Group } from '@mui/icons-material';
import { useSalesStore } from '@/stores/salesStore';
import { ProspectStatus } from '@/types/sales';

type FunnelKey = 'intent' | 'quotation' | 'negotiation' | 'contract' | 'closed';

interface FunnelStage {
  key: FunnelKey;
  label: string;
  statusFilter: ProspectStatus[];
  color: string;
  bg: string;
}

const FUNNEL_STAGES: FunnelStage[] = [
  { key: 'intent', label: '意向', statusFilter: ['new'], color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'quotation', label: '报价', statusFilter: ['quoted'], color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'negotiation', label: '谈判', statusFilter: ['contacted', 'negotiating'], color: '#6366F1', bg: '#EEF2FF' },
  { key: 'contract', label: '签约', statusFilter: ['won'], color: '#10B981', bg: '#ECFDF5' },
  { key: 'closed', label: '成交', statusFilter: ['won'], color: '#059669', bg: '#D1FAE5' },
];

const SalesFunnel: React.FC = () => {
  const { prospects } = useSalesStore();
  const [salesperson, setSalesperson] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // 获取所有销售员
  const salespersons = useMemo(() => {
    const set = new Set(prospects.map(p => p.assignedTo).filter(Boolean));
    return Array.from(set).sort();
  }, [prospects]);

  // 漏斗数据
  const funnelData = useMemo(() => {
    // 筛选
    let filtered = prospects.filter(p => p.status !== 'lost');
    if (salesperson) filtered = filtered.filter(p => p.assignedTo === salesperson);
    if (dateFrom) filtered = filtered.filter(p => p.createdAt >= dateFrom);
    if (dateTo) filtered = filtered.filter(p => p.createdAt <= `${dateTo}T23:59:59`);

    return FUNNEL_STAGES.map((stage, idx) => {
      const stageProspects = filtered.filter(p => stage.statusFilter.includes(p.status));
      const count = stageProspects.length;
      const amount = stageProspects.reduce((sum, p) => sum + (p.estimatedValue || 0), 0);
      const prevCount = idx > 0
        ? filtered.filter(p => FUNNEL_STAGES[idx - 1].statusFilter.includes(p.status)).length
        : count;
      const conversionRate = prevCount > 0 ? ((count / prevCount) * 100).toFixed(1) : '100.0';
      return { ...stage, count, amount, conversionRate: parseFloat(conversionRate) };
    });
  }, [prospects, salesperson, dateFrom, dateTo]);

  // 计算最大宽度基准
  const maxCount = Math.max(...funnelData.map(d => d.count), 1);

  // 格式化金额
  const formatCurrency = (v: number) => {
    if (v >= 10000) return `¥${(v / 10000).toFixed(1)}万`;
    return `¥${v.toLocaleString()}`;
  };

  // 总计
  const totalAmount = funnelData[funnelData.length - 1].amount;
  const totalCount = prospects.filter(p => p.status !== 'lost').length;

  return (
    <Box data-testid="sf-funnel">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>销售漏斗分析</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            基于商机阶段追踪销售转化情况
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="开始日期" type="date" size="small" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }} />
          <TextField label="结束日期" type="date" size="small" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ width: 160 }} />
          <FormControl size="small" sx={{ width: 160 }}>
            <InputLabel>销售员</InputLabel>
            <Select label="销售员" value={salesperson}
              onChange={(e) => setSalesperson(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {salespersons.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* 统计摘要 */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Group sx={{ color: '#3B82F6' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">意向商机总数</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#3B82F6' }}>{totalCount}</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AttachMoney sx={{ color: '#10B981' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">预计成交金额</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#10B981' }}>{formatCurrency(totalAmount)}</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TrendingDown sx={{ color: '#D97706' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">整体转化率</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: '#D97706' }}>
                {funnelData[0].count > 0 ? `${((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100).toFixed(1)}%` : '0%'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      {/* 漏斗图 */}
      <Paper sx={{ borderRadius: 3, p: 4, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 3, color: '#1E293B' }}>商机转化漏斗</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {funnelData.map((stage, idx) => {
            const widthPercent = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 8) : 8;
            const nextStageCount = idx < funnelData.length - 1 ? funnelData[idx + 1].count : 0;
            const dropCount = stage.count - nextStageCount;

            return (
              <Box key={stage.key} data-testid={`sf-stage-${stage.key}`} sx={{ width: '100%', maxWidth: 700 }}>
                {/* 阶段标签 + 数量 */}
                <Box sx={{
                  display: 'flex', justifyContent: 'center', mb: 0.5,
                }}>
                  <Chip
                    label={`${stage.label}`}
                    size="small"
                    sx={{
                      bgcolor: stage.bg, color: stage.color, fontWeight: 700,
                      fontSize: '0.8rem', px: 1,
                    }}
                  />
                  <Typography variant="body2" sx={{ ml: 1, fontWeight: 600, color: stage.color }}>
                    {stage.count} 个 · {formatCurrency(stage.amount)}
                  </Typography>
                  {idx > 0 && (
                    <Typography variant="caption" sx={{ ml: 1, color: '#94A3B8' }}>
                      转化率 {stage.conversionRate}%
                    </Typography>
                  )}
                </Box>

                {/* 漏斗条 */}
                <Box sx={{
                  display: 'flex', justifyContent: 'center',
                }}>
                  <Box sx={{
                    width: `${widthPercent}%`,
                    minWidth: 40,
                    height: 48,
                    borderRadius: '6px',
                    bgcolor: stage.color,
                    background: `linear-gradient(135deg, ${stage.color}, ${stage.color}CC)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'width 0.3s ease',
                    position: 'relative',
                  }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                      {stage.count} 个
                    </Typography>
                  </Box>
                </Box>

                {/* 流失提示 */}
                {idx < funnelData.length - 1 && dropCount > 0 && (
                  <Box sx={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5,
                    mt: 0.5, mb: 0.5,
                  }}>
                    <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 500 }}>
                      流失 {dropCount} 个
                    </Typography>
                    <Box sx={{
                      width: '40%', height: 1, borderTop: '1px dashed #FCA5A5',
                    }} />
                    <TrendingDown sx={{ fontSize: 14, color: '#EF4444' }} />
                  </Box>
                )}
                {idx < funnelData.length - 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                    <TrendingDown sx={{ color: '#CBD5E1', fontSize: 20 }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* 阶段明细卡 */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2, color: '#1E293B' }}>阶段明细</Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {funnelData.map((stage) => (
          <Paper key={stage.key} sx={{
            flex: 1, minWidth: 170, borderRadius: 3, p: 2.5,
            bgcolor: stage.bg, border: `1px solid ${stage.color}30`,
          }}>
            <Chip label={stage.label} size="small"
              sx={{ bgcolor: stage.color, color: '#fff', fontWeight: 700, mb: 1.5 }} />
            <Stack spacing={0.5}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stage.color }}>
                {stage.count}
                <Typography component="span" variant="caption" sx={{ color: '#64748B', ml: 0.5 }}>个</Typography>
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                {formatCurrency(stage.amount)}
              </Typography>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                转化率: {stage.conversionRate}%
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default SalesFunnel;
