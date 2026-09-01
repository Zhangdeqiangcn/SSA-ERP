import React, { useState } from 'react';
import {
  Box, TextField, IconButton, Typography, Paper, Card, CardContent,
  Chip, Grid, Divider, CircularProgress, Alert,
} from '@mui/material';
import { Send, TrendingUp, BarChart, PieChart, Assessment, History } from '@mui/icons-material';
import { ExportMenu } from '@/components/common';

// ── 纯 SVG 柱状图 ──
const BarChartSVG: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
  const w = 500, h = 220, pad = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const barW = chartW / data.length * 0.6;
  const gap = chartW / data.length;
  const colors = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 500, height: 'auto' }}>
      <text x={pad.left} y={pad.top} fontSize={13} fontWeight={600} fill="#333">{title}</text>
      {/* Y轴 */}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={h - pad.bottom} stroke="#ccc" strokeWidth={1} />
      {/* X轴 */}
      <line x1={pad.left} y1={h - pad.bottom} x2={w - pad.right} y2={h - pad.bottom} stroke="#ccc" strokeWidth={1} />
      {/* Y轴刻度 */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = h - pad.bottom - pct * chartH;
        const val = Math.round(maxV * pct);
        return (
          <g key={pct}>
            <text x={pad.left - 5} y={y + 4} fontSize={9} fill="#999" textAnchor="end">{val}</text>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#eee" strokeWidth={0.5} strokeDasharray="4 4" />
          </g>
        );
      })}
      {/* 柱 */}
      {data.map((d, i) => {
        const barH = (d.value / maxV) * chartH;
        const x = pad.left + gap * i + (gap - barW) / 2;
        const y = h - pad.bottom - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} ry={3} fill={colors[i % colors.length]} opacity={0.85} />
            <text x={x + barW / 2} y={h - pad.bottom + 14} fontSize={9} fill="#666" textAnchor="middle">{d.label}</text>
            <text x={x + barW / 2} y={y - 4} fontSize={9} fill="#333" textAnchor="middle" fontWeight={500}>{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── 纯 SVG 环形图 ──
const DonutChartSVG: React.FC<{ data: { label: string; value: number; color: string }[]; title: string }> = ({ data, title }) => {
  const size = 220, cx = size / 2, cy = size / 2, r = 80, strokeW = 30;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;

  return (
    <svg viewBox={`0 0 ${size} ${size + 120}`} style={{ width: '100%', maxWidth: 300, height: 'auto' }}>
      <text x={cx} y={18} fontSize={12} fontWeight={600} fill="#333" textAnchor="middle">{title}</text>
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * 2 * Math.PI * r;
        const circumference = 2 * Math.PI * r;
        const gap = circumference - dash;
        const o = offset;
        offset += pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-o * circumference + circumference / 4}
            opacity={0.85}
            style={{ transition: 'all 0.5s ease' }}
          />
        );
      })}
      <text x={cx} y={cy - 5} fontSize={20} fontWeight={700} fill="#333" textAnchor="middle">{total.toFixed(1)}</text>
      <text x={cx} y={cy + 15} fontSize={10} fill="#999" textAnchor="middle">总计</text>
      {/* 图例 */}
      {data.map((d, i) => (
        <g key={i}>
          <rect x={25} y={size + 15 + i * 18} width={10} height={10} rx={2} fill={d.color} />
          <text x={40} y={size + 24 + i * 18} fontSize={10} fill="#666">{d.label} ({d.value})</text>
        </g>
      ))}
    </svg>
  );
};

// ── 纯 SVG 横向条形图 ──
const HorizontalBarSVG: React.FC<{ data: { label: string; value: number; secondary: number }[]; title: string }> = ({ data, title }) => {
  const w = 480, itemH = 40, pad = { left: 100, right: 80 };
  const maxV = Math.max(...data.map((d) => Math.max(d.value, d.secondary)), 1);
  const colors = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7'];
  const h = 40 + data.length * itemH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 480, height: 'auto' }}>
      <text x={pad.left} y={20} fontSize={13} fontWeight={600} fill="#333">{title}</text>
      {data.map((d, i) => {
        const bw = (d.value / maxV) * (w - pad.left - pad.right);
        const sw = (d.secondary / maxV) * (w - pad.left - pad.right);
        const y = 38 + i * itemH;
        return (
          <g key={i}>
            <text x={pad.left - 5} y={y + itemH / 2 + 4} fontSize={10} fill="#666" textAnchor="end">{d.label}</text>
            <rect x={pad.left} y={y} width={bw} height={16} rx={3} fill={colors[i % colors.length]} opacity={0.8} />
            <text x={pad.left + bw + 4} y={y + 12} fontSize={9} fill="#333">{d.value}</text>
            {d.secondary > 0 && (
              <>
                <rect x={pad.left} y={y + 18} width={sw} height={16} rx={3} fill={colors[i % colors.length]} opacity={0.35} />
                <text x={pad.left + sw + 4} y={y + 30} fontSize={9} fill="#999">{d.secondary}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ── 响应类型 ──
type ChartData = { label: string; value: number; color?: string; secondary?: number }[];
interface BIResult {
  title: string;
  description: string;
  chartType: 'bar' | 'donut' | 'horizontalBar';
  data: ChartData;
  summary?: string;
  suggestions?: string[];
}

// ── 建议查询列表 ──
const SUGGEST_QUERIES = [
  '本月销售趋势',
  '库存物料分类',
  '供应商质量排名',
  '采购订单状态',
  '财务凭证摘要',
  '生产工单状态',
  '客户信用使用',
];

const ChatBI: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<BIResult | null>(null);
  const [history, setHistory] = useState<{ query: string; result: BIResult }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeQuery = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/chatbi/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || '请求失败');
      }
      const data: BIResult = await resp.json();
      return data;
    } catch (e: any) {
      setError(e.message || '分析失败，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const r = await analyzeQuery(q);
    if (r) {
      setHistory((prev) => [...prev, { query: q, result: r }]);
      setResult(r);
    }
    setInput('');
  };

  const handleSuggest = async (q: string) => {
    setLoading(true);
    const r = await analyzeQuery(q);
    if (r) {
      setHistory((prev) => [...prev, { query: q, result: r }]);
      setResult(r);
    }
    setLoading(false);
  };

  const renderChart = () => {
    if (!result) return null;
    switch (result.chartType) {
      case 'bar':
        return <BarChartSVG data={result.data as any} title={result.title} />;
      case 'donut':
        return <DonutChartSVG data={result.data as any} title={result.title} />;
      case 'horizontalBar':
        return <HorizontalBarSVG data={result.data as any} title={result.title} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        ChatBI 对话式分析
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        输入自然语言问句，从数据库获取实时数据并可视化展示
      </Typography>

      {/* 输入区域 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 2 }}>
        <TrendingUp color="primary" />
        <TextField
          fullWidth
          size="small"
          variant="standard"
          placeholder={'输入分析问句，如"本月销售趋势"...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
          inputProps={{ 'data-testid': 'chatbi-input' }}
          disabled={loading}
        />
        <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading} data-testid="chatbi-send">
          {loading ? <CircularProgress size={20} /> : <Send />}
        </IconButton>
      </Paper>

      {/* 建议问法 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {SUGGEST_QUERIES.map((k) => (
          <Chip
            key={k}
            label={k}
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => handleSuggest(k)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* 对话历史 */}
      {history.length > 1 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.disabled" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <History fontSize="small" /> 历史记录 ({history.length - 1} 条)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {history.slice(0, -1).map((h, i) => (
              <Chip
                key={i}
                label={h.query}
                size="small"
                onClick={() => { setResult(h.result); }}
                sx={{ mr: 0.5, mb: 0.5, cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* 分析结果 */}
      {result ? (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BarChart color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>{result.title}</Typography>
              {/* 分析结果导出（CSV / Excel） */}
              <ExportMenu
                testid="chatbi-export"
                filename={`ChatBI_${result.title}`}
                sheets={() => [
                  {
                    name: '分析数据',
                    rows: result.data,
                    columns: [
                      { key: 'label', label: '分组' },
                      { key: 'value', label: '数值' },
                      ...(result.data.some((d) => d.secondary !== undefined)
                        ? [{ key: 'secondary' as const, label: '对比值' }]
                        : []),
                    ],
                  },
                  {
                    name: '问句说明',
                    rows: [
                      { item: '问句', value: history[history.length - 1]?.query || '' },
                      { item: '标题', value: result.title },
                      { item: '说明', value: result.description },
                      { item: '结论', value: result.summary || '' },
                      { item: '图表类型', value: result.chartType },
                      { item: '导出时间', value: new Date().toLocaleString() },
                    ],
                    columns: [
                      { key: 'item', label: '项目' },
                      { key: 'value', label: '内容' },
                    ],
                  },
                ]}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {result.description}
            </Typography>
            {result.summary && (
              <Typography variant="body2" color="primary" sx={{ mb: 2, fontWeight: 500 }}>
                💡 {result.summary}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              {renderChart()}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 2, textAlign: 'center', py: 6 }}>
          <CardContent>
            <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              输入问句开始分析，例如「本月销售趋势」
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ChatBI;
