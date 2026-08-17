import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Alert, Grid, CircularProgress, Divider,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useQualityExtensionStore } from '@/stores/qualityExtensionStore';
import { computeSPC } from '@/utils/spc';
import { SpcChart } from '@/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// 确定性示例（含一个失控子组），便于演示与 E2E 验证
const sampleChart = (): SpcChart => ({
  id: uid('spc'),
  name: '轴承外径 SPC（示例）',
  characteristic: '轴承外径',
  unit: 'mm',
  subgroupSize: 5,
  usl: 25.05,
  lsl: 24.95,
  subgroups: [
    { id: 'g1', label: 'G1', values: [25.00, 25.01, 24.99, 25.02, 25.00] },
    { id: 'g2', label: 'G2', values: [24.98, 25.01, 25.00, 24.99, 25.02] },
    { id: 'g3', label: 'G3', values: [25.03, 25.02, 25.01, 25.04, 25.00] },
    { id: 'g4', label: 'G4', values: [25.30, 25.28, 25.31, 25.29, 25.27] }, // 失控
    { id: 'g5', label: 'G5', values: [24.99, 25.00, 25.01, 24.98, 25.00] },
  ],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '质量部', updatedBy: '质量部',
});

export default function SPCChartPage() {
  const { spcCharts, addSpcChart } = useQualityExtensionStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = spcCharts.find((c) => c.id === selectedId) || null;
  const result = useMemo(
    () => (selected ? computeSPC(selected.subgroups, { usl: selected.usl, lsl: selected.lsl }) : null),
    [selected]
  );

  const labels = result ? result.subgroups.map((s) => s.label) : [];
  const means = result ? result.subgroups.map((s) => s.mean) : [];
  const ranges = result ? result.subgroups.map((s) => s.range) : [];

  return (
    <Box sx={{ p: 2 }} data-testid="spc-chart">
      <Typography variant="h5" gutterBottom>质量 SPC 控制图（X-bar & R）</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        基于子组测量值计算均值图与极差图的控制限（CL/UCL/LCL），并判定失控点；给定规格限时估算过程能力 Cp/Cpk。
      </Alert>
      <Button variant="contained" sx={{ mb: 1 }} data-testid="spc-add-sample" onClick={() => {
        const c = sampleChart();
        addSpcChart(c);
        setSelectedId(c.id);
      }}>新增示例控制图</Button>

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>名称</TableCell><TableCell>特性</TableCell><TableCell>子组容量</TableCell>
              <TableCell>子组数</TableCell><TableCell>失控点</TableCell><TableCell>能力</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {spcCharts.map((c) => {
              const r = computeSPC(c.subgroups, { usl: c.usl, lsl: c.lsl });
              return (
                <TableRow key={c.id} data-testid="spc-row" hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedId(c.id)}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.characteristic}</TableCell>
                  <TableCell>{c.subgroupSize}</TableCell>
                  <TableCell>{c.subgroups.length}</TableCell>
                  <TableCell>
                    <Chip size="small" label={`${r.oocCount} 点`} color={r.oocCount > 0 ? 'error' : 'success'} />
                  </TableCell>
                  <TableCell>
                    {r.cpk != null ? <Chip size="small" label={`Cpk ${r.cpk}`} color={r.capable ? 'success' : 'warning'} /> : '—'}
                  </TableCell>
                  <TableCell><Button size="small" data-testid="spc-view" onClick={(e) => { e.stopPropagation(); setSelectedId(c.id); }}>查看</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {selected && result && (
        <Paper sx={{ p: 2 }} data-testid="spc-detail">
          <Typography variant="subtitle1" gutterBottom>{selected.name} · {selected.characteristic}（{selected.unit}）</Typography>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={6} md={2}><Chip data-testid="spc-xbar-ucl" label={`X-bar UCL ${result.xbar.ucl}`} size="small" /></Grid>
            <Grid item xs={6} md={2}><Chip data-testid="spc-xbar-cl" label={`X-bar CL ${result.xbar.cl}`} size="small" /></Grid>
            <Grid item xs={6} md={2}><Chip data-testid="spc-xbar-lcl" label={`X-bar LCL ${result.xbar.lcl}`} size="small" /></Grid>
            <Grid item xs={6} md={2}><Chip data-testid="spc-r-ucl" label={`R UCL ${result.r.ucl}`} size="small" /></Grid>
            <Grid item xs={6} md={2}><Chip data-testid="spc-r-cl" label={`R CL ${result.r.cl}`} size="small" /></Grid>
            <Grid item xs={6} md={2}><Chip data-testid="spc-ooc-count" label={`失控 ${result.oocCount}`} color={result.oocCount > 0 ? 'error' : 'success'} size="small" /></Grid>
          </Grid>
          {result.cpk != null && (
            <Chip data-testid="spc-cpk" label={`Cp ${result.cp} / Cpk ${result.cpk}（${result.capable ? '能力充足' : '能力不足'}）`} color={result.capable ? 'success' : 'warning'} sx={{ mb: 1 }} />
          )}

          <Typography variant="body2" gutterBottom>X-bar 均值控制图</Typography>
          <LineChart
            height={260}
            xAxis={[{ scaleType: 'point', data: labels }]}
            series={[
              { data: means, label: 'X-bar', color: '#2563EB' },
              { data: labels.map(() => result.xbar.ucl), label: 'UCL', color: '#DC2626' },
              { data: labels.map(() => result.xbar.lcl), label: 'LCL', color: '#DC2626' },
            ]}
          />

          <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>R 极差控制图</Typography>
          <LineChart
            height={220}
            xAxis={[{ scaleType: 'point', data: labels }]}
            series={[
              { data: ranges, label: 'R', color: '#16A34A' },
              { data: labels.map(() => result.r.ucl), label: 'UCL', color: '#DC2626' },
              { data: labels.map(() => result.r.lcl), label: 'LCL', color: '#DC2626' },
            ]}
          />

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>子组</TableCell><TableCell>均值</TableCell><TableCell>极差</TableCell><TableCell>判据</TableCell></TableRow></TableHead>
              <TableBody>
                {result.subgroups.map((s) => (
                  <TableRow key={s.label} data-testid="spc-sub-row">
                    <TableCell>{s.label}</TableCell><TableCell>{s.mean}</TableCell><TableCell>{s.range}</TableCell>
                    <TableCell><Chip size="small" label={s.outOfControl ? '失控' : '受控'} color={s.outOfControl ? 'error' : 'success'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 过程能力分析 Section（P1-25） */}
      {selected && result && result.cpk != null && (
        <Paper sx={{ p: 2, mt: 2 }} data-testid="spc-cpk">
          <Typography variant="h6" gutterBottom>过程能力分析</Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={3} alignItems="center">
            {/* Cpk 仪表盘圆环图 */}
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">过程能力指数 Cpk</Typography>
              {(() => {
                const cpkVal = Math.min(result.cpk, 2.0); // cap at 2.0 for display
                const pct = (cpkVal / 2.0) * 100;
                const isGreen = result.cpkGrade === 'green';
                const isYellow = result.cpkGrade === 'yellow';
                const color = isGreen ? '#22c55e' : isYellow ? '#eab308' : '#ef4444';
                const circumference = 2 * Math.PI * 65;
                const dashOffset = circumference - (pct / 100) * circumference;
                return (
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <svg width="180" height="150" data-testid="spc-cpk-value">
                      {/* 背景圆环 */}
                      <circle cx="90" cy="80" r="65" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                      {/* 值圆环 */}
                      <circle cx="90" cy="80" r="65" fill="none" stroke={color} strokeWidth="12"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        strokeLinecap="round" transform="rotate(-90 90 80)"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                      {/* 文字 */}
                      <text x="90" y="72" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">{result.cpk.toFixed(2)}</text>
                      <text x="90" y="95" textAnchor="middle" fill="#6b7280" fontSize="12">
                        {isGreen ? '能力充足 (≥1.33)' : isYellow ? '能力尚可 (≥1.0)' : '能力不足 (<1.0)'}
                      </text>
                    </svg>
                  </Box>
                );
              })()}
            </Grid>

            {/* 能力指标明细 */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <CardBox label="规格上限 USL" value={selected.usl?.toFixed(3)} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="规格下限 LSL" value={selected.lsl?.toFixed(3)} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="过程均值" value={result.grandMean.toFixed(3)} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="CPU（上限能力）" value={result.cpu?.toFixed(3)} color="primary" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="CPL（下限能力）" value={result.cpl?.toFixed(3)} color="primary" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="Cpk" value={result.cpk.toFixed(3)}
                    color={result.cpkGrade === 'green' ? 'success.main' : result.cpkGrade === 'yellow' ? 'warning.main' : 'error.main'} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="Pp（过程性能）" value={result.pp?.toFixed(3)} color="primary" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="Ppk" value={result.ppk?.toFixed(3)} color="primary" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="σ_within" value={result.sigmaWithin?.toFixed(4)} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <CardBox label="σ_overall" value={result.sigmaOverall?.toFixed(4)} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

// P1-25 过程能力分析指标卡片
function CardBox({ label, value, color }: { label: string; value?: string; color?: string }) {
  return (
    <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
      <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
      <Typography variant="body1" fontWeight={600} color={color || 'text.primary'}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}
