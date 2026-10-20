import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Slider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Autocomplete, Stack, IconButton, Tooltip,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar } from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { useVendorPerformanceStore } from '@/stores/vendorPerformanceStore';
import { useVendorStore } from '@/stores/vendorStore';
import { VendorPerformance } from '@/types';

const rankingColor: Record<string, 'success' | 'primary' | 'warning' | 'error'> = {
  A: 'success',
  B: 'primary',
  C: 'warning',
  D: 'error',
};

const rankingLabel: Record<string, string> = {
  A: '优秀',
  B: '良好',
  C: '合格',
  D: '待改进',
};

const VendorPerformancePage: React.FC = () => {
  const records = useVendorPerformanceStore((s) => s.records);
  const addRecord = useVendorPerformanceStore((s) => s.addRecord);
  const updateRecord = useVendorPerformanceStore((s) => s.updateRecord);
  const deleteRecord = useVendorPerformanceStore((s) => s.deleteRecord);
  const calculateScore = useVendorPerformanceStore((s) => s.calculateScore);
  const vendors = useVendorStore((s) => s.vendors);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 权重状态
  const [weights, setWeights] = useState({ quality: 30, delivery: 30, price: 25, service: 15 });

  // 对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VendorPerformance | null>(null);
  const [form, setForm] = useState({
    vendorId: '',
    vendorName: '',
    vendorCode: '',
    period: '2026-Q3',
    qualityScore: 80,
    deliveryScore: 80,
    priceScore: 80,
    serviceScore: 80,
    remarks: '',
  });

  // 平均分
  const avgScores = useMemo(() => {
    const n = records.length;
    if (!n) return { quality: 0, delivery: 0, price: 0, service: 0, total: 0 };
    const sum = records.reduce(
      (acc, r) => ({
        quality: acc.quality + r.qualityScore,
        delivery: acc.delivery + r.deliveryScore,
        price: acc.price + r.priceScore,
        service: acc.service + r.serviceScore,
        total: acc.total + r.totalScore,
      }),
      { quality: 0, delivery: 0, price: 0, service: 0, total: 0 }
    );
    return {
      quality: Math.round((sum.quality / n) * 10) / 10,
      delivery: Math.round((sum.delivery / n) * 10) / 10,
      price: Math.round((sum.price / n) * 10) / 10,
      service: Math.round((sum.service / n) * 10) / 10,
      total: Math.round((sum.total / n) * 10) / 10,
    };
  }, [records]);

  // 计算加权总分
  const currentTotal = (
    form.qualityScore * (weights.quality / 100) +
    form.deliveryScore * (weights.delivery / 100) +
    form.priceScore * (weights.price / 100) +
    form.serviceScore * (weights.service / 100)
  ).toFixed(1);

  const columns: ColumnDef<VendorPerformance, unknown>[] = useMemo(
    () => [
      { accessorKey: 'vendorName', header: '供应商名称', meta: { searchable: true } },
      { accessorKey: 'period', header: '评估周期', meta: { searchable: true } },
      { accessorKey: 'qualityScore', header: '质量分', meta: { searchable: true } },
      { accessorKey: 'deliveryScore', header: '交期分', meta: { searchable: true } },
      { accessorKey: 'priceScore', header: '价格分', meta: { searchable: true } },
      { accessorKey: 'serviceScore', header: '服务分', meta: { searchable: true } },
      {
        accessorKey: 'totalScore',
        header: '总分(加权)',
        meta: { searchable: true },
        cell: ({ row }) => row.original.totalScore.toFixed(1),
      },
      {
        accessorKey: 'ranking',
        header: '排名',
        meta: {
          searchable: true,
          filterType: 'select',
          filterOptions: Object.entries(rankingLabel).map(([value, label]) => ({ value, label })),
        },
        cell: ({ row }) => (
          <Chip
            size="small"
            label={`${row.original.ranking}级 - ${rankingLabel[row.original.ranking ?? 'D']}`}
            color={rankingColor[row.original.ranking ?? 'D'] ?? 'default'}
          />
        ),
      },
    ],
    []
  );

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filtered = useMemo(
    () => applyColumnFilters(records, columns, filterData, { module: 'vendor' }),
    [records, columns, filterData]
  );

  const handleOpenDialog = (record?: VendorPerformance) => {
    if (record) {
      setEditingRecord(record);
      setForm({
        vendorId: record.vendorId,
        vendorName: record.vendorName,
        vendorCode: record.vendorCode ?? '',
        period: record.period,
        qualityScore: record.qualityScore,
        deliveryScore: record.deliveryScore,
        priceScore: record.priceScore,
        serviceScore: record.serviceScore,
        remarks: record.remarks ?? '',
      });
    } else {
      setEditingRecord(null);
      setForm({
        vendorId: '',
        vendorName: '',
        vendorCode: '',
        period: '2026-Q3',
        qualityScore: 80,
        deliveryScore: 80,
        priceScore: 80,
        serviceScore: 80,
        remarks: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    const qw = weights.quality / 100;
    const dw = weights.delivery / 100;
    const pw = weights.price / 100;
    const sw = weights.service / 100;
    const totalScore = Math.round(
      (form.qualityScore * qw + form.deliveryScore * dw + form.priceScore * pw + form.serviceScore * sw) * 100
    ) / 100;

    const computeRanking = (s: number) => {
      if (s >= 90) return 'A';
      if (s >= 75) return 'B';
      if (s >= 60) return 'C';
      return 'D';
    };

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (editingRecord) {
      updateRecord(editingRecord.id, {
        vendorId: form.vendorId,
        vendorName: form.vendorName,
        vendorCode: form.vendorCode || undefined,
        period: form.period,
        qualityScore: form.qualityScore,
        deliveryScore: form.deliveryScore,
        priceScore: form.priceScore,
        serviceScore: form.serviceScore,
        totalScore,
        ranking: computeRanking(totalScore),
        remarks: form.remarks,
        evaluatedBy: '采购部主管',
        evaluatedAt: now,
      });
    } else {
      addRecord({
        id: `perf-${Date.now()}`,
        vendorId: form.vendorId,
        vendorName: form.vendorName,
        vendorCode: form.vendorCode || undefined,
        period: form.period,
        qualityScore: form.qualityScore,
        deliveryScore: form.deliveryScore,
        priceScore: form.priceScore,
        serviceScore: form.serviceScore,
        totalScore,
        ranking: computeRanking(totalScore),
        remarks: form.remarks,
        evaluatedBy: '采购部主管',
        evaluatedAt: now,
        createdAt: now,
      });
    }
    setDialogOpen(false);
  };

  const handleWeightChange = (key: string, value: number) => {
    const newWeights = { ...weights, [key]: value };
    setWeights(newWeights);
    calculateScore(newWeights.quality, newWeights.delivery, newWeights.price, newWeights.service);
  };

  return (
    <PageWrapper
      title="供应商绩效考核"
      actions={
        <ActionBar
          primary={{ label: '新建评估', onClick: () => handleOpenDialog() }}
        />
      }
    >
      {/* 评分卡 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '平均质量分', value: avgScores.quality, color: '#10B981' },
          { label: '平均交期分', value: avgScores.delivery, color: '#3B82F6' },
          { label: '平均价格分', value: avgScores.price, color: '#F59E0B' },
          { label: '平均服务分', value: avgScores.service, color: '#8B5CF6' },
          { label: '平均总分', value: avgScores.total, color: '#EF4444' },
        ].map((item) => (
          <Grid item xs={6} sm={4} md={2.4} key={item.label}>
            <Card variant="outlined" sx={{ textAlign: 'center', height: '100%' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={600} sx={{ color: item.color }}>
                  {item.value.toFixed(1)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 权重配置 */}
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>权重配置（调整后自动重算总分和排名）</Typography>
        <Grid container spacing={3}>
          {[
            { key: 'quality', label: '质量权重 %', testid: 'vp-weight-quality' },
            { key: 'delivery', label: '交期权重 %' },
            { key: 'price', label: '价格权重 %' },
            { key: 'service', label: '服务权重 %' },
          ].map((item) => (
            <Grid item xs={6} sm={3} key={item.key}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="caption" sx={{ minWidth: 72 }}>
                  {item.label}
                </Typography>
                <Slider
                  size="small"
                  value={weights[item.key as keyof typeof weights]}
                  min={0}
                  max={60}
                  step={5}
                  onChange={(_, v) => handleWeightChange(item.key, v as number)}
                  valueLabelDisplay="auto"
                  data-testid={item.testid}
                />
                <Typography variant="caption" sx={{ minWidth: 28 }}>
                  {weights[item.key as keyof typeof weights]}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Card>

      {/* 数据表格 */}
      <FilterBar columns={columns} module="vendor" onSearch={setFilterData} listKey="vendor-performance" />
      <DataTable
        data={filtered}
        columns={columns}
        enablePagination
        enableSorting
        onEdit={(row) => handleOpenDialog(row)}
        onDelete={(row) => deleteRecord(row.id)}
      />

      {/* 新建/编辑对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingRecord ? '编辑评估' : '新建评估'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={vendors}
                getOptionLabel={(v) => `${v.name} (${v.code})`}
                value={vendors.find((v) => v.id === form.vendorId) ?? null}
                onChange={(_, v) =>
                  setForm({
                    ...form,
                    vendorId: v?.id ?? '',
                    vendorName: v?.name ?? '',
                    vendorCode: v?.code ?? '',
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="供应商"
                    inputProps={{ ...params.inputProps, 'data-testid': 'vp-vendor' }}
                  />
                )}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="评估周期"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                fullWidth
                inputProps={{ 'data-testid': 'vp-period' }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="质量分"
                type="number"
                value={form.qualityScore}
                onChange={(e) => setForm({ ...form, qualityScore: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0, max: 100, 'data-testid': 'vp-quality' }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="交期分"
                type="number"
                value={form.deliveryScore}
                onChange={(e) => setForm({ ...form, deliveryScore: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="价格分"
                type="number"
                value={form.priceScore}
                onChange={(e) => setForm({ ...form, priceScore: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                label="服务分"
                type="number"
                value={form.serviceScore}
                onChange={(e) => setForm({ ...form, serviceScore: Number(e.target.value) })}
                fullWidth
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                加权总分：{currentTotal}（{weights.quality}% + {weights.delivery}% + {weights.price}% + {weights.service}%）
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="备注"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!form.vendorId}
            data-testid="vp-submit"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default VendorPerformancePage;
