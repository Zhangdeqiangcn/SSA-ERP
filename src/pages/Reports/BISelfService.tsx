import React, { useMemo, useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Alert, Divider, Card,
} from '@mui/material';
import { Save, Delete, PlayArrow, Insights, Link as LinkIcon } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PageWrapper } from '@/components/layout';
import { DataTable } from '@/components/common';
import {
  DATASETS,
  useReportDataMap,
  joinDatasets,
  type JoinType,
  type FieldDef,
  type ReportRow,
} from '@/utils/reportData';

type AggType = 'sum' | 'avg' | 'count';
type ChartType = 'bar' | 'pie' | 'line';

interface BiDef {
  id: string;
  name: string;
  dataset: string;
  dimension: string;
  measure: string;
  agg: AggType;
  chartType: ChartType;
}

const STORAGE_KEY = 'ssa-erp-bi-defs';
const PRIMARY = '#3B82F6';
const PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];

const BISelfService: React.FC = () => {
  const DATA_MAP = useReportDataMap();

  const [dataset, setDataset] = useState<string>('sales');
  const [dimension, setDimension] = useState<string>('customerName');
  const [measure, setMeasure] = useState<string>('totalAmount');
  const [agg, setAgg] = useState<AggType>('sum');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [analysisName, setAnalysisName] = useState<string>('');
  const [saved, setSaved] = useState<BiDef[]>([]);
  const [loaded, setLoaded] = useState<BiDef | null>(null);

  // 跨模块关联（join）状态
  const [joinActive, setJoinActive] = useState<boolean>(false);
  const [joinLeft, setJoinLeft] = useState<string>('vendor');
  const [joinLeftKey, setJoinLeftKey] = useState<string>('name');
  const [joinRight, setJoinRight] = useState<string>('purchase');
  const [joinRightKey, setJoinRightKey] = useState<string>('vendorName');
  const [joinType, setJoinType] = useState<JoinType>('inner');
  const [joinedRows, setJoinedRows] = useState<ReportRow[]>([]);
  const [joinedFields, setJoinedFields] = useState<FieldDef[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw) as BiDef[]);
    } catch {
      setSaved([]);
    }
  }, []);

  // 当前生效的字段集与数据行：关联激活时使用关联结果
  const activeFields: FieldDef[] = joinActive ? joinedFields : DATASETS[dataset].fields;
  const activeRows: ReportRow[] = joinActive ? joinedRows : DATA_MAP[dataset] || [];

  const dimensionField = activeFields.find((f) => f.key === dimension);
  const measureField = activeFields.find((f) => f.key === measure);

  const aggData = useMemo(() => {
    const rows = activeRows;
    const map = new Map<string, { sum: number; count: number }>();
    rows.forEach((r) => {
      const dv = String(r[dimension] ?? '—');
      const mv = Number(r[measure] ?? 0);
      const e = map.get(dv) || { sum: 0, count: 0 };
      e.sum += Number.isNaN(mv) ? 0 : mv;
      e.count += 1;
      map.set(dv, e);
    });
    return Array.from(map.entries()).map(([label, e]) => ({
      label,
      value:
        agg === 'count'
          ? e.count
          : agg === 'avg'
          ? e.count
            ? e.sum / e.count
            : 0
          : e.sum,
    }));
  }, [activeRows, dimension, measure, agg]);

  const resultColumns: ColumnDef<{ label: string; value: number }, unknown>[] = useMemo(
    () => [
      { accessorKey: 'label', header: dimensionField?.label ?? '维度' },
      { accessorKey: 'value', header: `${measureField?.label ?? '度量'} (${agg === 'count' ? '计数' : agg === 'avg' ? '平均' : '合计'})` },
    ],
    [dimensionField, measureField, agg]
  );

  const saveAnalysis = () => {
    if (!analysisName.trim()) return;
    const def: BiDef = { id: `bi-${Date.now()}`, name: analysisName.trim(), dataset, dimension, measure, agg, chartType };
    const next = [...saved, def];
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAnalysisName('');
    setLoaded(def);
  };

  const loadAnalysis = (def: BiDef) => {
    setDataset(def.dataset);
    setDimension(def.dimension);
    setMeasure(def.measure);
    setAgg(def.agg);
    setChartType(def.chartType);
    setLoaded(def);
    setJoinActive(false);
  };

  const deleteAnalysis = (id: string) => {
    const next = saved.filter((d) => d.id !== id);
    setSaved(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (loaded?.id === id) setLoaded(null);
  };

  // 生成跨模块关联数据集
  const generateJoin = () => {
    if (!joinLeft || !joinLeftKey || !joinRight || !joinRightKey) return;
    const leftRows = DATA_MAP[joinLeft] || [];
    const rightRows = DATA_MAP[joinRight] || [];
    const res = joinDatasets(
      leftRows,
      DATASETS[joinLeft].fields,
      rightRows,
      DATASETS[joinRight].fields,
      joinLeftKey,
      joinRightKey,
      joinType
    );
    setJoinedRows(res.rows);
    setJoinedFields(res.fields);
    setJoinActive(true);
    // 默认选左表关联字段为维度，便于直接出图
    setDimension(joinLeftKey);
    const firstNum = res.fields.find((f) => f.type === 'number' && f.key !== joinLeftKey);
    setMeasure(firstNum ? firstNum.key : '');
  };

  const clearJoin = () => {
    setJoinActive(false);
    setJoinedRows([]);
    setJoinedFields([]);
    setDimension('customerName');
    setMeasure('totalAmount');
    setDataset('sales');
  };

  return (
    <PageWrapper title="BI 自助分析">
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* 跨模块关联分析（Join） */}
          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1} sx={{ color: PRIMARY }}>
              <LinkIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              跨模块关联分析（Join）
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              将左侧与右侧数据集按关联字段合并，右表字段以 R· 前缀标识，可直接用于维度/度量分析。
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1.2 }}>
              <InputLabel>左侧数据集</InputLabel>
              <Select label="左侧数据集" value={joinLeft} onChange={(e) => { setJoinLeft(e.target.value); setJoinLeftKey(''); }}>
                {Object.entries(DATASETS).map(([key, d]) => (
                  <MenuItem key={key} value={key}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 1.2 }}>
              <InputLabel>左侧关联字段</InputLabel>
              <Select label="左侧关联字段" value={joinLeftKey} onChange={(e) => setJoinLeftKey(e.target.value)}>
                {DATASETS[joinLeft].fields.map((f) => (
                  <MenuItem key={f.key} value={f.key}>{f.label}（{f.key}）</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 1.2 }}>
              <InputLabel>右侧数据集</InputLabel>
              <Select label="右侧数据集" value={joinRight} onChange={(e) => { setJoinRight(e.target.value); setJoinRightKey(''); }}>
                {Object.entries(DATASETS).map(([key, d]) => (
                  <MenuItem key={key} value={key}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 1.2 }}>
              <InputLabel>右侧关联字段</InputLabel>
              <Select label="右侧关联字段" value={joinRightKey} onChange={(e) => setJoinRightKey(e.target.value)}>
                {DATASETS[joinRight].fields.map((f) => (
                  <MenuItem key={f.key} value={f.key}>{f.label}（{f.key}）</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel>关联方式</InputLabel>
              <Select label="关联方式" value={joinType} onChange={(e) => setJoinType(e.target.value as JoinType)}>
                <MenuItem value="inner">内连接（仅匹配行）</MenuItem>
                <MenuItem value="left">左连接（保留左表）</MenuItem>
              </Select>
            </FormControl>
            {joinActive ? (
              <Button fullWidth variant="outlined" color="inherit" onClick={clearJoin}>
                清除关联
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                disabled={!joinLeftKey || !joinRightKey}
                onClick={generateJoin}
                sx={{ bgcolor: PRIMARY }}
              >
                生成关联数据集
              </Button>
            )}
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>1. 选择数据集</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>分析数据集</InputLabel>
              <Select
                label="分析数据集"
                value={dataset}
                onChange={(e) => {
                  setDataset(e.target.value);
                  setDimension('');
                  setMeasure('');
                }}
              >
                {Object.entries(DATASETS).map(([key, d]) => (
                  <MenuItem key={key} value={key}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>2. 维度与度量</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel>维度（分组字段）</InputLabel>
              <Select label="维度（分组字段）" value={dimension} onChange={(e) => setDimension(e.target.value)}>
                {activeFields.map((f) => (
                  <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel>度量（数值字段）</InputLabel>
              <Select label="度量（数值字段）" value={measure} onChange={(e) => setMeasure(e.target.value)}>
                {activeFields
                  .filter((f) => f.type === 'number')
                  .map((f) => (
                    <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>聚合方式</InputLabel>
              <Select label="聚合方式" value={agg} onChange={(e) => setAgg(e.target.value as AggType)}>
                <MenuItem value="sum">求和 (sum)</MenuItem>
                <MenuItem value="avg">平均 (avg)</MenuItem>
                <MenuItem value="count">计数 (count)</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>3. 图表类型</Typography>
            <Stack direction="row" spacing={1}>
              {([
                { v: 'bar', l: '柱状图' },
                { v: 'pie', l: '饼图' },
                { v: 'line', l: '折线图' },
              ] as { v: ChartType; l: string }[]).map((opt) => (
                <Chip
                  key={opt.v}
                  label={opt.l}
                  color={chartType === opt.v ? 'primary' : 'default'}
                  variant={chartType === opt.v ? 'filled' : 'outlined'}
                  onClick={() => setChartType(opt.v)}
                />
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {joinActive && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<LinkIcon />}>
              已关联 <b>{joinedRows.length}</b> 条（左：{DATASETS[joinLeft].label}·{joinLeftKey} = 右：{DATASETS[joinRight].label}·{joinRightKey}，{joinType === 'inner' ? '内连接' : '左连接'}）。右表字段以 R· 前缀呈现，可直接选作维度/度量。
            </Alert>
          )}

          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={600}>
                <Insights sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: PRIMARY }} />
                分析结果（{aggData.length} 组）
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="分析名称"
                  value={analysisName}
                  onChange={(e) => setAnalysisName(e.target.value)}
                  sx={{ width: 180 }}
                />
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  disabled={!analysisName.trim() || !dimension || !measure}
                  onClick={saveAnalysis}
                  sx={{ bgcolor: PRIMARY }}
                >
                  保存分析
                </Button>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {!dimension || !measure ? (
              <Alert severity="info">请选择维度与度量字段。</Alert>
            ) : aggData.length === 0 ? (
              <Alert severity="info">当前数据集无有效数据，请检查维度与度量设置。</Alert>
            ) : (
              <Box sx={{ height: 340 }}>
                {chartType === 'bar' && (
                  <BarChart
                    xAxis={[{ scaleType: 'band', data: aggData.map((a) => a.label) }]}
                    series={[{ data: aggData.map((a) => a.value), color: PRIMARY }]}
                    height={320}
                  />
                )}
                {chartType === 'line' && (
                  <LineChart
                    dataset={aggData.map((a) => ({ dim: a.label, 数值: a.value }))}
                    xAxis={[{ dataKey: 'dim', scaleType: 'band', label: dimensionField?.label }]}
                    series={[{ dataKey: '数值', color: PRIMARY, label: measureField?.label }]}
                    height={320}
                  />
                )}
                {chartType === 'pie' && (
                  <PieChart
                    series={[
                      {
                        data: aggData.map((a, i) => ({
                          id: a.label,
                          value: a.value,
                          label: a.label,
                          color: PALETTE[i % PALETTE.length],
                        })),
                        innerRadius: 40,
                        outerRadius: 100,
                      },
                    ]}
                    height={320}
                  />
                )}
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>聚合结果明细</Typography>
            <DataTable<{ label: string; value: number }>
              data={aggData}
              columns={resultColumns}
              enablePagination
              pageSize={6}
            />
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>已保存分析（{saved.length}）</Typography>
            {saved.length === 0 ? (
              <Alert severity="info">暂无已保存分析，配置后点击「保存分析」。</Alert>
            ) : (
              <Stack spacing={1}>
                {saved.map((d) => (
                  <Card key={d.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {DATASETS[d.dataset]?.label} · {d.agg} · {d.chartType}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" startIcon={<PlayArrow />} onClick={() => loadAnalysis(d)}>
                          载入
                        </Button>
                        <Button size="small" color="error" startIcon={<Delete />} onClick={() => deleteAnalysis(d.id)}>
                          删除
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageWrapper>
  );
};

export default BISelfService;
