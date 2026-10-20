import React, { useMemo, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Stack, Chip, useTheme,
} from '@mui/material';
import { Close as CloseIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { BarChart, LineChart } from '@mui/x-charts';
import { useSalesStore } from '@/stores/salesStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useProductionStore } from '@/stores/productionStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { computeGrossMargin, formatGrossMargin } from '@/utils/grossProfit'; // S-10 毛利口径统一

interface KpiDef {
  key: string;
  label: string;
  value: string;
  sub?: string;
  color: string;
  drillTitle: string;
  columns: { label: string; render: (row: any) => React.ReactNode }[];
  rows: any[];
}

const fmtMoney = (n: number) =>
  '¥' + n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });

const fmtNum = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });

export default function Cockpit() {
  const theme = useTheme();
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const materials = useMaterialStore((s) => s.materials);
  const inventory = useWarehouseStore((s) => s.inventoryRecords);
  const workOrders = useProductionStore((s) => s.workOrders);
  const purchaseRequests = usePurchaseStore((s) => s.purchaseRequests);

  const [openKpi, setOpenKpi] = useState<string | null>(null);

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    materials.forEach((mat) => (m[mat.id] = mat.price || 0));
    return m;
  }, [materials]);

  const kpis = useMemo<KpiDef[]>(() => {
    const activeSales = salesOrders.filter((s) => s.status !== 'cancelled');
    const revenue = activeSales.reduce((a, s) => a + (s.grandTotal || 0), 0);
    const estCOGS = activeSales.reduce(
      (a, s) => a + (s.items || []).reduce((b, it) => b + (it.quantity || 0) * (priceMap[it.materialId] || 0), 0),
      0
    );
    // S-10 毛利口径统一：成本口径 = 标准价估算（驾驶舱为实时预估，非实际成本）
    const grossMargin = computeGrossMargin(revenue, estCOGS);

    const wip = workOrders.filter((w) => w.status === 'released' || w.status === 'in_progress');
    const inventoryRows = inventory.map((r) => ({
      ...r,
      amount: (r.quantity || 0) * (priceMap[r.materialId] || 0),
    }));
    const inventoryAmount = inventoryRows.reduce((a, r) => a + (r.amount || 0), 0);
    const inventorySku = new Set(inventoryRows.map((r) => r.materialId)).size;

    const arRows = activeSales.map((s) => ({
      ...s,
      received: (s as any).receivedAmount || 0,
      ar: (s.grandTotal || 0) - ((s as any).receivedAmount || 0),
    }));
    const ar = arRows.reduce((a, r) => a + r.ar, 0);

    const pendingPurchase = purchaseRequests.filter(
      (p) => p.status === 'draft' || p.status === 'pending'
    );

    const salesRows = activeSales
      .map((s) => ({ ...s }))
      .sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0))
      .slice(0, 20);

    return [
      {
        key: 'revenue',
        label: '营业收入',
        value: fmtMoney(revenue),
        sub: `销售订单 ${activeSales.length} 笔`,
        color: theme.palette.primary.main,
        drillTitle: '营业收入 · 销售订单明细（Top 20）',
        columns: [
          { label: '订单号', render: (r) => r.orderNo },
          { label: '客户', render: (r) => r.customerName },
          { label: '价税合计', render: (r) => fmtMoney(r.grandTotal || 0) },
          { label: '状态', render: (r) => r.status },
        ],
        rows: salesRows,
      },
      {
        key: 'margin',
        label: '预估毛利率',
        value: formatGrossMargin(grossMargin),
        sub: `预估成本 ${fmtMoney(estCOGS)}`,
        color: theme.palette.success.main,
        drillTitle: '预估毛利率 · 基于物料标准价估算（非实际成本）',
        columns: [
          { label: '指标', render: () => '营业收入 / 预估成本' },
          { label: '数值', render: () => `${fmtMoney(revenue)} / ${fmtMoney(estCOGS)}（毛利率 ${formatGrossMargin(grossMargin)}）` },
        ],
        rows: [{ _: 1 }],
      },
      {
        key: 'wip',
        label: '在产工单',
        value: fmtNum(wip.length),
        sub: `工单总数 ${workOrders.length}`,
        color: theme.palette.warning.main,
        drillTitle: '在产工单 · 已下达/进行中',
        columns: [
          { label: '工单号', render: (r) => r.orderNo },
          { label: '产品', render: (r) => r.productName || r.productCode },
          { label: '计划数', render: (r) => fmtNum(r.plannedQuantity || 0) },
          { label: '状态', render: (r) => r.status },
        ],
        rows: wip,
      },
      {
        key: 'inventory',
        label: '库存金额',
        value: fmtMoney(inventoryAmount),
        sub: `SKU ${inventorySku} 种`,
        color: theme.palette.info.main,
        drillTitle: '库存金额 · 按库存记录（金额=数量×物料标准价）',
        columns: [
          { label: '物料', render: (r) => r.materialName },
          { label: '仓库', render: (r) => r.warehouseName || r.warehouseId },
          { label: '数量', render: (r) => fmtNum(r.quantity || 0) },
          { label: '金额', render: (r) => fmtMoney(r.amount || 0) },
        ],
        rows: inventoryRows.sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 20),
      },
      {
        key: 'ar',
        label: '应收账款',
        value: fmtMoney(ar),
        sub: `未收 ${activeSales.length} 笔`,
        color: theme.palette.error.main,
        drillTitle: '应收账款 · 价税合计−已收',
        columns: [
          { label: '订单号', render: (r) => r.orderNo },
          { label: '客户', render: (r) => r.customerName },
          { label: '价税合计', render: (r) => fmtMoney(r.grandTotal || 0) },
          { label: '未收', render: (r) => fmtMoney(r.ar) },
        ],
        rows: arRows.filter((r) => r.ar > 0).sort((a, b) => b.ar - a.ar).slice(0, 20),
      },
      {
        key: 'purchase',
        label: '待批采购申请',
        value: fmtNum(pendingPurchase.length),
        sub: `申请总数 ${purchaseRequests.length}`,
        color: theme.palette.secondary.main,
        drillTitle: '待批采购申请 · 草稿/待审',
        columns: [
          { label: '申请号', render: (r) => r.requestNo },
          { label: '标题', render: (r) => r.title },
          { label: '状态', render: (r) => r.status },
        ],
        rows: pendingPurchase,
      },
    ];
  }, [salesOrders, materials, inventory, workOrders, purchaseRequests, priceMap, theme]);

  // 月度营收趋势
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const points: { month: string; qty: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({ month: `${d.getMonth() + 1}月`, qty: 0 });
    }
    const base = 11;
    activeSalesForTrend(salesOrders).forEach((s) => {
      const d = new Date(s.orderDate);
      if (isNaN(d.getTime())) return;
      const idx = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
      if (idx >= 0 && idx < 12) points[base - idx].qty += s.grandTotal || 0;
    });
    return points;
  }, [salesOrders]);

  const activeKpi = kpis.find((k) => k.key === openKpi) || null;

  return (
    <Box sx={{ p: 3 }} data-testid="cockpit">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <TrendingUpIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          经营驾驶舱
        </Typography>
        <Chip size="small" label="实时聚合各模块数据" color="primary" variant="outlined" />
      </Stack>

      <Grid container spacing={2}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={4} key={k.key}>
            <Card
              sx={{
                cursor: 'pointer',
                borderLeft: `4px solid ${k.color}`,
                '&:hover': { boxShadow: 6 },
              }}
              onClick={() => setOpenKpi(k.key)}
              data-testid={`kpi-${k.key}`}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {k.label}
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: k.color, my: 0.5 }}>
                  {k.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {k.sub}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); setOpenKpi(k.key); }}>
                    钻取明细
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            月度营收趋势（近 12 个月）
          </Typography>
          <Box sx={{ width: '100%', height: 320 }}>
            <BarChart
              xAxis={[{ scaleType: 'band', data: monthlyRevenue.map((p) => p.month) }]}
              series={[{ data: monthlyRevenue.map((p) => Math.round(p.qty)), label: '营收(元)', color: theme.palette.primary.main }]}
              height={300}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={!!activeKpi} onClose={() => setOpenKpi(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {activeKpi?.drillTitle}
          <IconButton onClick={() => setOpenKpi(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {activeKpi && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {activeKpi.columns.map((c) => (
                    <TableCell key={c.label}>{c.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeKpi.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeKpi.columns.length} align="center">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  activeKpi.rows.map((row, i) => (
                    <TableRow key={i} data-testid="kpi-drill-row">
                      {activeKpi.columns.map((c) => (
                        <TableCell key={c.label}>{c.render(row)}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function activeSalesForTrend(salesOrders: { status: string; orderDate: string; grandTotal?: number }[]) {
  return salesOrders.filter((s) => s.status !== 'cancelled');
}
