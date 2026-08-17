import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Button, Stack, Dialog, DialogTitle, DialogContent, MenuItem, FormControl, InputLabel, Select,
  Typography, Paper, Grid,
} from '@mui/material';
import { Add, Print as PrintIcon, TrendingUp } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, StatusBadge, FlowTracker, PrintPreview } from '@/components/common';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePrintTemplateStore } from '@/stores/printTemplateStore';
import { PurchaseOrder } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { calcTaxTotals, round2 } from '@/utils/tax';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const purchaseOrders = usePurchaseStore(s => s.purchaseOrders);
  const printTemplate = usePrintTemplateStore(s => s.getTemplateByEntity('purchaseOrder'));
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [printOpen, setPrintOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState('');

  const columns: ColumnDef<PurchaseOrder, unknown>[] = useMemo(() => [
    { accessorKey: 'orderNo', header: '订单号' },
    { accessorKey: 'vendorName', header: '供应商' },
    {
      accessorKey: 'currency',
      header: '币种',
      cell: ({ row }) => row.original.currency || 'CNY',
    },
    {
      accessorKey: 'totalAmount',
      header: '未税金额',
      cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency || 'CNY'),
    },
    {
      accessorKey: 'totalTaxAmount',
      header: '税额',
      cell: ({ row }) => {
        const o = row.original;
        const tax = o.totalTaxAmount ?? calcTaxTotals(o.items || []).totalTaxAmount;
        return formatCurrency(tax, o.currency || 'CNY');
      },
    },
    {
      accessorKey: 'grandTotal',
      header: '价税合计',
      cell: ({ row }) => {
        const o = row.original;
        const totals = calcTaxTotals(o.items || []);
        const grand = o.grandTotal ?? round2((o.totalAmount ?? totals.totalAmount) + (o.totalTaxAmount ?? totals.totalTaxAmount));
        return <strong style={{ color: '#1D4ED8' }}>{formatCurrency(grand, o.currency || 'CNY')}</strong>;
      },
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'orderDate', header: '下单日期', cell: ({ row }) => formatDate(row.original.orderDate) },
    { accessorKey: 'expectedDeliveryDate', header: '预计交货', cell: ({ row }) => formatDate(row.original.expectedDeliveryDate) },
    { accessorKey: 'actualDeliveryDate', header: '实际交货', cell: ({ row }) => formatDate(row.original.actualDeliveryDate) },
  ], []);

  const filterFields = [
    { name: 'orderNo', label: '订单号', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'created', label: '已创建' },
        { value: 'sent', label: '已发送' },
        { value: 'vendorConfirmed', label: '供应商已确认' },
        { value: 'confirmed', label: '已确认' },
        { value: 'partial', label: '部分收货' },
        { value: 'received', label: '已收货' },
        { value: 'closed', label: '已关闭' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...purchaseOrders];
    if (filterData.orderNo) {
      data = data.filter(o => o.orderNo.includes(filterData.orderNo as string));
    }
    if (filterData.status) {
      data = data.filter(o => o.status === filterData.status);
    }
    return data;
  }, [filterData, purchaseOrders]);

  // ── 嵌入式分析 ──
  const analytics = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthOrders = purchaseOrders.filter(o => o.orderDate?.startsWith(thisMonth));
    const monthAmount = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 近6月趋势
    const last6Months: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const amount = purchaseOrders
        .filter(o => o.orderDate?.startsWith(key))
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      last6Months.push({ month: `${d.getMonth() + 1}月`, amount });
    }
    const maxAmt = Math.max(...last6Months.map(m => m.amount), 1);

    // Top5 供应商
    const vendorMap = new Map<string, number>();
    purchaseOrders.forEach(o => {
      const prev = vendorMap.get(o.vendorName || '') || 0;
      vendorMap.set(o.vendorName || '', prev + (o.totalAmount || 0));
    });
    const top5Vendors = Array.from(vendorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const top5Total = top5Vendors.reduce((sum, [, v]) => sum + v, 0) || 1;
    const vendorColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

    return { monthAmount, last6Months, maxAmt, top5Vendors, top5Total, vendorColors };
  }, [purchaseOrders]);

  return (
    <PageWrapper
      title="采购订单"
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="purchase-order" currentStatus="po_draft" label="流程追踪" />
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => { setPrintOrderId(purchaseOrders[0]?.id || ''); setPrintOpen(true); }}>
            打印
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/purchase/orders/create')}>
            新建订单
          </Button>
        </Stack>
      }
    >
      {/* ── 嵌入式分析卡片 ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* 本月采购金额 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#EFF6FF' }}>
            <Typography variant="caption" color="text.secondary">本月采购金额</Typography>
            <Typography variant="h5" fontWeight={700} color="#1D4ED8">
              {new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(analytics.monthAmount)}
            </Typography>
          </Paper>
        </Grid>

        {/* 趋势迷你图 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>近6月采购趋势</Typography>
              <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '8%', height: 70, px: 1 }}>
              {analytics.last6Months.map((m, i) => (
                <Box key={m.month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{
                    width: '100%', maxWidth: 32,
                    height: `${Math.max(4, (m.amount / analytics.maxAmt) * 56)}px`,
                    bgcolor: '#3B82F6', borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s',
                  }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.6rem' }}>
                    {m.month}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Top5 供应商饼图 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Top5供应商</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 简化饼图 */}
              <Box sx={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" width="70" height="70">
                  {analytics.top5Vendors.map(([, val], i) => {
                    const ratio = val / analytics.top5Total;
                    const startAngle = analytics.top5Vendors.slice(0, i).reduce((s, [, v]) => s + (v / analytics.top5Total) * 360, 0);
                    const endAngle = startAngle + ratio * 360;
                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                    const r = 15.9;
                    const cx = 18, cy = 18;
                    const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
                    const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
                    const x2 = cx + r * Math.cos((endAngle - 90) * Math.PI / 180);
                    const y2 = cy + r * Math.sin((endAngle - 90) * Math.PI / 180);
                    return (
                      <path
                        key={i}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={analytics.vendorColors[i]}
                      />
                    );
                  })}
                </svg>
              </Box>
              <Box sx={{ flex: 1 }}>
                {analytics.top5Vendors.map(([name, val], i) => (
                  <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: analytics.vendorColors[i], flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.65rem' }}>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                      {Math.round((val / analytics.top5Total) * 100)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <FilterBar fields={filterFields} onSearch={setFilterData} listKey="purchase-order-list" columnConfigKey="purchase-order-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        columnConfigKey="purchase-order-list"
        onRowClick={(row) => navigate(`/purchase/orders/${row.id}`)}
        onView={(row) => navigate(`/purchase/orders/${row.id}`)}
      />

      <Dialog open={printOpen} onClose={() => setPrintOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>打印采购订单</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>选择订单</InputLabel>
            <Select
              value={printOrderId}
              label="选择订单"
              onChange={(e) => setPrintOrderId(e.target.value)}
            >
              {purchaseOrders.map((o) => (
                <MenuItem key={o.id} value={o.id}>{o.orderNo} - {o.vendorName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {printTemplate && printOrderId && (
            <PrintPreview
              template={printTemplate}
              record={purchaseOrders.find((o) => o.id === printOrderId) as unknown as Record<string, any>}
              onClose={() => setPrintOpen(false)}
            />
          )}
          {!printTemplate && (
            <Box sx={{ color: 'text.secondary' }}>未找到采购订单打印模板，请到「设置 → 打印模板」创建。</Box>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
};

export default OrderList;
