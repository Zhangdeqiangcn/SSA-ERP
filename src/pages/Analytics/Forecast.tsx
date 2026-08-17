import React, { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Stack, FormControl, InputLabel,
  Select, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Snackbar, Alert, Chip, useTheme,
} from '@mui/material';
import { Autorenew as AutorenewIcon, ShoppingCart as CartIcon } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts';
import { useMaterialStore } from '@/stores/materialStore';
import { useSalesStore } from '@/stores/salesStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
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

  const [selectedId, setSelectedId] = useState<string>(materials[0]?.id || '');
  const [snack, setSnack] = useState<string>('');

  const activeMat = materials.find((m) => m.id === selectedId) || materials[0];

  const result = useMemo(() => {
    if (!activeMat) return null;
    const monthly = buildMonthlySales(salesOrders, activeMat.id, 12).map((p) => p.qty);
    return computeDemandForecast({
      monthlySales: monthly,
      currentStock: activeMat.currentStock || 0,
      leadTimeDays: activeMat.leadTime || 7,
      safetyStockBase: activeMat.safetyStock || 0,
      moq: activeMat.moq || 0,
      mpq: activeMat.mpq || 0,
    });
  }, [materials, salesOrders, activeMat]);

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
