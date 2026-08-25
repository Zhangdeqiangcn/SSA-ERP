import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, FormControl,
  InputLabel, Select, MenuItem, Alert,
} from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { usePriceStore } from '@/stores/priceStore';
import { useConditionStore } from '@/stores/conditionStore';
import { useMaterialStore } from '@/stores/materialStore';

// 纯CSS/SVG 价格趋势图
const PriceTrendChart: React.FC<{ data: { label: string; price: number }[] }> = ({ data }) => {
  if (data.length === 0) return <Typography color="text.secondary">暂无数据</Typography>;

  const W = 600;
  const H = 300;
  const PAD_LEFT = 60;
  const PAD_RIGHT = 30;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 40;
  const plotW = W - PAD_LEFT - PAD_RIGHT;

  const allPrices = data.map((d) => d.price);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;
  const H_lines = 5;

  const scaleX = (i: number) => PAD_LEFT + (i / Math.max(data.length - 1, 1)) * plotW;
  const scaleY = (price: number) => H - PAD_BOTTOM - ((price - minPrice) / priceRange) * (H - PAD_TOP - PAD_BOTTOM);

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(d.price).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="300">
      {/* 网格线 */}
      {Array.from({ length: H_lines + 1 }).map((_, i) => {
        const y = PAD_TOP + (i / H_lines) * (H - PAD_TOP - PAD_BOTTOM);
        const price = maxPrice - (i / H_lines) * priceRange;
        return (
          <g key={i}>
            <line x1={PAD_LEFT} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="#E5E7EB" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6B7280">
              {price.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* 数据线 */}
      <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth={2.5} />

      {/* 数据点 */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={scaleX(i)} cy={scaleY(d.price)} r={4} fill="#3B82F6" />
          <circle cx={scaleX(i)} cy={scaleY(d.price)} r={7} fill="none" stroke="#3B82F6" strokeWidth={1} opacity={0.3} />
          <text x={scaleX(i)} y={scaleY(d.price) - 12} textAnchor="middle" fontSize="10" fill="#374151" fontWeight={600}>
            {d.price}
          </text>
        </g>
      ))}

      {/* X轴标签 */}
      {data.map((d, i) => (
        <text
          key={i}
          x={scaleX(i)}
          y={H - 10}
          textAnchor={data.length > 12 ? 'end' : 'middle'}
          fontSize="10"
          fill="#6B7280"
          transform={data.length > 12 ? `rotate(-45, ${scaleX(i)}, ${H - 10})` : undefined}
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
};

const PriceAnalysis: React.FC = () => {
  const { priceList } = usePriceStore();
  const { conditions } = useConditionStore() as { conditions: any[] };
  const { materials } = useMaterialStore();
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');

  // 合并所有价格数据源
  const allPriceData = useMemo(() => {
    const data: { materialName: string; materialCode: string; price: number; date: string }[] = [];

    priceList.forEach((p) => {
      data.push({
        materialName: p.materialName || '',
        materialCode: p.materialCode || '',
        price: p.unitPrice || 0,
        date: p.effectiveDate || p.createdAt || '',
      });
    });

    conditions.forEach((c) => {
      if (c.conditionType === 'price') {
        data.push({
          materialName: c.materialName || '',
          materialCode: c.materialCode || c.materialId || '',
          price: c.rate || 0,
          date: c.validFrom || c.createdAt || '',
        });
      }
    });

    return data.filter((d) => d.price > 0 && d.date);
  }, [priceList, conditions]);

  // 按物料筛选
  const filteredData = useMemo(() => {
    if (selectedMaterial === 'all') return allPriceData;
    return allPriceData.filter((d) => d.materialName === selectedMaterial);
  }, [allPriceData, selectedMaterial]);

  // 按月份聚合趋势数据
  const monthlyTrend = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => a.date.localeCompare(b.date));
    const months: Record<string, { total: number; count: number }> = {};
    sorted.forEach((d) => {
      const month = d.date.slice(0, 7); // YYYY-MM
      if (!months[month]) months[month] = { total: 0, count: 0 };
      months[month].total += d.price;
      months[month].count++;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // 最近12个月
      .map(([label, v]) => ({
        label: label.slice(2), // MM 或 YY-MM
        price: Math.round(v.total / v.count * 100) / 100,
      }));
  }, [filteredData]);

  // 同比环比计算
  const trendMetrics = useMemo(() => {
    if (monthlyTrend.length < 2) return null;
    const current = monthlyTrend[monthlyTrend.length - 1];
    const prev = monthlyTrend[monthlyTrend.length - 2];
    const mom = prev.price > 0 ? ((current.price - prev.price) / prev.price * 100) : 0;

    // 同比（如果有去年同期数据）
    const yoyMonth = current.label;
    const yoyData = monthlyTrend.filter((d) => d.label === yoyMonth);
    let yoy = 0;
    if (yoyData.length >= 2) {
      const lastYear = yoyData[yoyData.length - 2];
      yoy = lastYear.price > 0 ? ((current.price - lastYear.price) / lastYear.price * 100) : 0;
    }

    return { mom, yoy, current: current.price, prev: prev.price };
  }, [monthlyTrend]);

  // 价格波动分析（方差/标准差）
  const volatility = useMemo(() => {
    if (monthlyTrend.length < 2) return null;
    const prices = monthlyTrend.map((d) => d.price);
    const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
    const variance = prices.reduce((s, v) => s + (v - avg) ** 2, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
    return { avg, stdDev, cv, min: Math.min(...prices), max: Math.max(...prices) };
  }, [monthlyTrend]);

  // 物料列表
  const materialOptions = useMemo(() => {
    const names = [...new Set(allPriceData.map((d) => d.materialName).filter(Boolean))];
    return names.sort();
  }, [allPriceData]);

  return (
    <PageWrapper title="价格趋势分析" subtitle="采购价格趋势、同环比与价差分析">
      <Grid container spacing={3}>
        {/* 筛选 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>选择物料</InputLabel>
                  <Select value={selectedMaterial} label="选择物料" onChange={(e) => setSelectedMaterial(e.target.value)}>
                    <MenuItem value="all">全部物料</MenuItem>
                    {materialOptions.map((name) => (
                      <MenuItem key={name} value={name}>{name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}>
                <Alert severity="info" sx={{ py: 0 }}>
                  数据来源：价目表 + 条件技术引擎。展示最近12个月价格趋势。
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* 同比环比指标 */}
        {trendMetrics && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                { label: '当前均价', value: `${trendMetrics.current.toLocaleString()} 元`, color: '#3B82F6' },
                {
                  label: '环比变化',
                  value: `${trendMetrics.mom > 0 ? '+' : ''}${trendMetrics.mom.toFixed(1)}%`,
                  color: trendMetrics.mom > 0 ? '#EF4444' : trendMetrics.mom < 0 ? '#10B981' : '#6B7280',
                  icon: trendMetrics.mom > 0 ? <TrendingUp /> : trendMetrics.mom < 0 ? <TrendingDown /> : <Remove />,
                },
                {
                  label: '同比变化',
                  value: `${trendMetrics.yoy > 0 ? '+' : ''}${trendMetrics.yoy.toFixed(1)}%`,
                  color: trendMetrics.yoy > 0 ? '#EF4444' : trendMetrics.yoy < 0 ? '#10B981' : '#6B7280',
                  icon: trendMetrics.yoy > 0 ? <TrendingUp /> : trendMetrics.yoy < 0 ? <TrendingDown /> : <Remove />,
                },
                volatility && {
                  label: '价格变异系数',
                  value: `${volatility.cv.toFixed(1)}%`,
                  color: volatility.cv > 15 ? '#EF4444' : volatility.cv > 5 ? '#F59E0B' : '#10B981',
                  icon: undefined,
                },
              ].filter(Boolean).map((metric, idx) => (
                <Grid item xs={6} md={3} key={idx}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">{metric!.label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 0.5 }}>
                      {metric!.icon && (
                        <Box sx={{ color: metric!.color }}>{metric!.icon}</Box>
                      )}
                      <Typography variant="h6" sx={{ fontWeight: 700, color: metric!.color }}>
                        {metric!.value}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}

        {/* 价格趋势图 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }} data-testid="price-trend">
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              近12月价格趋势（{selectedMaterial === 'all' ? '全部物料均价' : selectedMaterial}）
            </Typography>
            <PriceTrendChart data={monthlyTrend} />
          </Paper>
        </Grid>

        {/* 波动分析 */}
        {volatility && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>价差分析</Typography>
              <Grid container spacing={2}>
                {[
                  { label: '平均价格', value: `${volatility.avg.toLocaleString()} 元` },
                  { label: '最高价格', value: `${volatility.max.toLocaleString()} 元`, color: '#EF4444' },
                  { label: '最低价格', value: `${volatility.min.toLocaleString()} 元`, color: '#10B981' },
                  { label: '标准差', value: `${volatility.stdDev.toFixed(2)}` },
                  { label: '变异系数 CV', value: `${volatility.cv.toFixed(1)}%`, color: volatility.cv > 15 ? '#EF4444' : '#10B981' },
                  { label: '价差幅度', value: `${((volatility.max - volatility.min) / volatility.avg * 100).toFixed(1)}%` },
                ].map((item, idx) => (
                  <Grid item xs={6} md={2} key={idx}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ color: item.color }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* 最近价格记录 */}
        <Grid item xs={12}>
          <Paper sx={{ borderRadius: 2 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB' }}>
              <Typography variant="subtitle2" fontWeight={600}>最近价格记录</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">价格</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.slice(-20).reverse().map((d, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{d.materialName}</Typography>
                        <Typography variant="caption" color="text.secondary">{d.materialCode}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={600}>{d.price.toLocaleString()} 元</Typography>
                      </TableCell>
                      <TableCell>{d.date.slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#94A3B8' }}>
                        暂无价格记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default PriceAnalysis;
