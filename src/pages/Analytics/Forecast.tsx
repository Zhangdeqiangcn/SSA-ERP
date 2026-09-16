import React, { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, FormControl, InputLabel,
  Select, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Snackbar, Alert, Chip, useTheme,
} from '@mui/material';
import { Autorenew as AutorenewIcon, ShoppingCart as CartIcon, PriorityHigh, Warning, Build } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts';
import { useMaterialStore } from '@/stores/materialStore';
import { useSalesStore } from '@/stores/salesStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useFMEAStore } from '@/stores/fmeaStore';
import { buildMonthlySales, computeDemandForecast } from '@/utils/forecast';
import type { PurchaseRequest } from '@/types/purchase';

const fmt = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });

export default function Forecast() {
  const theme = useTheme();
  const materials = useMaterialStore((s) => s.materials);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const addPurchaseRequest = usePurchaseStore((s) => s.addPurchaseRequest);
  const addForecastSuggestion = useAnalyticsStore((s) => s.addForecastSuggestion);
  const suggestions = useAnalyticsStore((s) => s.forecastSuggestions);
  const { batchRecords } = useWarehouseStore();
  const { items: fmeas } = useFMEAStore();

  // ── P2-03 智能推荐汇总：聚合跨模块信号为优先级行动清单 ──
  const digest = useMemo(() => {
    type Rec = { level: 'high' | 'mid'; kind: string; title: string; detail: string };
    const recs: Rec[] = [];
    materials.forEach((m) => {
      const rop = m.reorderPoint || 0;
      const stock = m.currentStock || 0;
      if (rop > 0 && stock <= rop) {
        recs.push({ level: 'high', kind: 'reorder', title: `补货建议：${m.name}`, detail: `当前库存 ${fmt(stock)} ≤ 再订货点 ${fmt(rop)}` });
      }
    });
    batchRecords
      .filter((b) => b.status === 'expiring' || b.status === 'expired')
      .forEach((b) => recs.push({
        level: 'high', kind: 'expire',
        title: `优先出库：${b.materialName}`,
        detail: `${b.status === 'expired' ? '已过期' : '临期'} 批次 ${b.batchNo}`,
      }));
    fmeas
      .filter((f) => f.rpn >= 100 && f.status !== 'approved')
      .forEach((f) => recs.push({
        level: 'mid', kind: 'fmea',
        title: `优先改进：${f.item} / ${f.failureMode}`,
        detail: `RPN=${f.rpn} 状态=${f.status === 'draft' ? '草稿' : '已评审'}`,
      }));
    return recs.sort((a, b) => (a.level === 'high' ? 0 : 1) - (b.level === 'high' ? 0 : 1));
  }, [materials, batchRecords, fmeas]);

  const [selectedId, setSelectedId] = useState<string>(materials[0]?.id || '');
  const [snack, setSnack] = useState<string>('');

  // ── B4：平滑系数与预测期数（可调，因为「这个物料该跟得多快」是业务判断）──
  // 默认 α=0.3 是工业常用值：既不是「只看最近一期」（α=1，噪声全收），
  // 也不是「几乎不动」（α=0.05，等于移动平均）。
  const [alpha, setAlpha] = useState(0.3);
  const [horizon, setHorizon] = useState(6);

  const activeMat = materials.find((m) => m.id === selectedId) || materials[0];

  const result = useMemo(() => {
    if (!activeMat) return null;
    // B4：把月份标签一并传下去 —— 季节因子要对到「几月」才有意义，
    // 只传数字序列的话 1~12 月的季节规律无从对位。
    const points = buildMonthlySales(salesOrders, activeMat.id, 36);
    return computeDemandForecast({
      monthlySales: points.map((p) => p.qty),
      monthLabels: points.map((p) => p.month),
      currentStock: activeMat.currentStock || 0,
      leadTimeDays: activeMat.leadTime || 7,
      safetyStockBase: activeMat.safetyStock || 0,
      moq: activeMat.moq || 0,
      mpq: activeMat.mpq || 0,
      alpha,
      horizon,
    });
  }, [materials, salesOrders, activeMat, alpha, horizon]);


  const chartData = useMemo(() => {
    if (!result) return { labels: [], values: [] };
    const hist = result.monthlyHistory.map((p) => p.qty);
    return {
      labels: [...result.monthlyHistory.map((p) => p.month), '预测'],
      values: [...hist, Math.round(result.forecastQty)],
    };
  }, [result]);

  const handleGenerate = () => {
    const mat = activeMat;
    if (!mat || !result) return;
    const reqNo = `PR-AI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
    const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const req: PurchaseRequest = {
      id: `PR-AI-${Date.now()}`,
      requestNo: reqNo,
      title: `智能补货-${mat.name}`,
      applicant: '智能分析',
      department: '采购部',
      type: 'material',
      priority: result.suggestedOrderQty > 0 ? 'high' : 'normal',
      reason: '基于需求预测与库存再订货点(ROP)自动生成',
      expectedDate: future,
      status: 'pending',
      items: [
        {
          id: `PRI-AI-${Date.now()}`,
          materialId: mat.id,
          materialCode: mat.code,
          materialName: mat.name,
          quantity: result.suggestedOrderQty,
          estimatedPrice: mat.price,
          estimatedAmount: Math.round(result.suggestedOrderQty * (mat.price || 0)),
        },
      ],
      totalAmount: Math.round(result.suggestedOrderQty * (mat.price || 0)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '智能分析',
      updatedBy: '智能分析',
    };
    addPurchaseRequest(req);
    addForecastSuggestion({
      id: `FS-${Date.now()}`,
      materialId: mat.id,
      materialCode: mat.code,
      materialName: mat.name,
      avgMonthlyDemand: result.avgMonthlyDemand,
      safetyStock: result.safetyStock,
      reorderPoint: result.reorderPoint,
      currentStock: result.currentStock,
      suggestedOrderQty: result.suggestedOrderQty,
      generatedRequestNo: reqNo,
      createdAt: new Date().toISOString(),
    });
    setSnack(`已生成采购申请 ${reqNo}`);
  };

  return (
    <Box sx={{ p: 3 }} data-testid="forecast">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <AutorenewIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          需求预测与智能补货
        </Typography>
        <Chip size="small" label="移动平均+安全库存(95%)+ROP" color="primary" variant="outlined" />
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <FormControl fullWidth data-testid="fc-material">
                <InputLabel>选择物料</InputLabel>
                <Select
                  label="选择物料"
                  value={activeMat?.id || ''}
                  onChange={(e) => setSelectedId(e.target.value as string)}
                >
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}（{m.code}）
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {result && (
                <Stack spacing={1.5} sx={{ mt: 3 }}>
                  <Metric label="月均需求" value={fmt(result.avgMonthlyDemand)} testid="fc-avg" />
                  <Metric label="需求标准差" value={fmt(result.stdDev)} />
                  <Metric label="采购提前期" value={`${result.leadTimeDays} 天`} />
                  <Metric label="安全库存" value={fmt(result.safetyStock)} testid="fc-safety" />
                  <Metric label="再订货点(ROP)" value={fmt(result.reorderPoint)} testid="fc-reorder" />
                  <Metric label="当前库存" value={fmt(result.currentStock)} />
                  <Metric
                    label="建议补货量"
                    value={fmt(result.suggestedOrderQty)}
                    testid="fc-suggest"
                    emphasize
                  />
                  {!result.hasHistory && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      该物料近 12 个月无销售历史，建议补货量按安全库存下限估算。
                    </Alert>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<CartIcon />}
                    onClick={handleGenerate}
                    data-testid="fc-generate"
                    disabled={result.suggestedOrderQty <= 0}
                  >
                    生成补货建议 / 采购申请
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                近 12 月销量与下一周期预测
              </Typography>
              <Box sx={{ width: '100%', height: 340 }}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: chartData.labels }]}
                  series={[
                    {
                      data: chartData.values,
                      label: '销量(件)',
                      color: theme.palette.primary.main,
                    },
                  ]}
                  height={320}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            已生成补货建议
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>物料</TableCell>
                <TableCell>月均需求</TableCell>
                <TableCell>安全库存</TableCell>
                <TableCell>再订货点</TableCell>
                <TableCell>建议补货量</TableCell>
                <TableCell>关联采购申请</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    暂无建议，请在左侧选择物料并点击「生成补货建议」
                  </TableCell>
                </TableRow>
              ) : (
                suggestions.map((s) => (
                  <TableRow key={s.id} data-testid="fc-suggestion-row">
                    <TableCell>{s.materialName}（{s.materialCode}）</TableCell>
                    <TableCell>{fmt(s.avgMonthlyDemand)}</TableCell>
                    <TableCell>{fmt(s.safetyStock)}</TableCell>
                    <TableCell>{fmt(s.reorderPoint)}</TableCell>
                    <TableCell>{fmt(s.suggestedOrderQty)}</TableCell>
                    <TableCell>{s.generatedRequestNo || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* P2-03 智能推荐汇总：跨模块信号聚合 */}
      <Card sx={{ mt: 3 }} data-testid="fc-digest">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <PriorityHigh color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              智能推荐汇总（跨模块信号）
            </Typography>
            <Chip size="small" label={`${digest.length} 条`} color={digest.length ? 'warning' : 'default'} variant="outlined" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            自动聚合：低于再订货点的物料、临期/过期批次、RPN≥100 且未批准的 FMEA，按优先级排序。
          </Typography>
          {digest.length === 0 ? (
            <Alert severity="success" sx={{ mt: 2 }}>暂无高优先推荐项，供应链状态良好。</Alert>
          ) : (
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>优先级</TableCell>
                  <TableCell>类别</TableCell>
                  <TableCell>推荐事项</TableCell>
                  <TableCell>依据</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {digest.map((d, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={d.level === 'high' ? <Warning /> : <Build />}
                        label={d.level === 'high' ? '高' : '中'}
                        color={d.level === 'high' ? 'error' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      {d.kind === 'reorder' ? '补货' : d.kind === 'expire' ? '出库' : '质量改进'}
                    </TableCell>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{d.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack('')}>
        <Alert severity="success" onClose={() => setSnack('')}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function Metric({
  label,
  value,
  testid,
  emphasize,
}: {
  label: string;
  value: string;
  testid?: string;
  emphasize?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        borderRadius: 1,
        bgcolor: emphasize ? 'primary.50' : 'grey.50',
        border: emphasize ? '1px solid' : 'none',
        borderColor: 'primary.main',
      }}
      data-testid={testid}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={emphasize ? 700 : 500} color={emphasize ? 'primary.main' : 'text.primary'}>
        {value}
      </Typography>
    </Box>
  );
}
