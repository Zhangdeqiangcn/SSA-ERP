import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Button, Stack, Dialog, DialogTitle, DialogContent, MenuItem, FormControl, InputLabel, Select,
  Typography, Snackbar, Alert, LinearProgress, Collapse, Grid, Paper, Chip,
} from '@mui/material';
import {
  Add, Print as PrintIcon, EditNote, DeleteOutline,
  Layers, Assignment, Alarm, Payments, TrendingUp, ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, StatusBadge, FlowTracker, PrintPreview,
  ConfirmDialog, BatchEditDialog, KpiStrip, DetailDrawer, DetailSection, SecureField,
  type BatchAction, type BatchEditField, type KpiItem,
} from '@/components/common';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePrintTemplateStore } from '@/stores/printTemplateStore';
import { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { calcTaxTotals, round2 } from '@/utils/tax';
import { useCloudHydrating } from '@/stores/syncStatusStore';
import { applyColumnFilters } from '@/utils/listSearch';

/** 批量导入：表头 → 字段 别名映射（中英文均可） */
const ORDER_IMPORT_ALIASES: Record<string, string> = {
  订单号: 'orderNo', 单号: 'orderNo', 采购订单号: 'orderNo', orderNo: 'orderNo',
  供应商: 'vendorName', vendorName: 'vendorName',
  状态: 'status', status: 'status',
  币种: 'currency', currency: 'currency',
  未税金额: 'totalAmount', 金额: 'totalAmount', totalAmount: 'totalAmount',
  预计交货: 'expectedDeliveryDate', expectedDeliveryDate: 'expectedDeliveryDate',
  实际交货: 'actualDeliveryDate', actualDeliveryDate: 'actualDeliveryDate',
  交货地址: 'deliveryAddress', deliveryAddress: 'deliveryAddress',
  付款条件: 'paymentTerms', paymentTerms: 'paymentTerms',
  贸易条件: 'tradeTerms', tradeTerms: 'tradeTerms',
  备注: 'remarks', remarks: 'remarks',
};
const ORDER_STATUS_MAP: Record<string, PurchaseOrderStatus> = {
  已创建: 'created', created: 'created',
  已发送: 'sent', sent: 'sent',
  供应商已确认: 'vendorConfirmed', vendorConfirmed: 'vendorConfirmed',
  已确认: 'confirmed', confirmed: 'confirmed',
  部分收货: 'partial', partial: 'partial',
  已收货: 'received', received: 'received',
  已关闭: 'closed', closed: 'closed',
  已取消: 'cancelled', cancelled: 'cancelled',
};

/** 批量修改可改字段（对应详情页可编辑项，均为 PurchaseOrder 真实字段） */
const ORDER_BATCH_FIELDS: BatchEditField[] = [
  {
    key: 'status', label: '状态', type: 'select',
    options: [
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
  { key: 'vendorName', label: '供应商', type: 'text' },
  { key: 'deliveryAddress', label: '交货地址', type: 'text' },
  { key: 'paymentTerms', label: '付款条件', type: 'text' },
  { key: 'remarks', label: '备注', type: 'text' },
];

/**
 * PoQuickView —— 采购订单「抽屉速览」内容（放进 DetailDrawer，就地看核心信息不跳页）。
 * 结构与采购申请详情页保持一致：两列 label/value 表头信息区（DetailSection）+ 物料明细表（DataTable），
 * 外加收货进度条；深层操作（变更/版本/删除/审批）走抽屉右上角「打开完整详情」逃生舱。
 */
const PoQuickView: React.FC<{ order: PurchaseOrder }> = ({ order }) => {
  const currency = order.currency || 'CNY';
  const totals = calcTaxTotals(order.items || []);
  const netTotal = order.totalAmount ?? totals.totalAmount;
  const taxTotal = order.totalTaxAmount ?? totals.totalTaxAmount;
  const grandTotal = order.grandTotal ?? round2(netTotal + taxTotal);
  const totalOrdered = order.items.reduce((s, i) => s + (i.orderedQuantity || 0), 0);
  const totalDelivered = order.items.reduce((s, i) => s + (i.deliveredQuantity || 0), 0);
  const progress = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

  const quickFields = [
    { label: '供应商', value: order.vendorName || '-' },
    { label: '订单状态', value: <StatusBadge status={order.status} /> },
    { label: '联系人', value: order.contact || '-' },
    { label: '联系电话', value: order.phone || '-' },
    { label: '下单日期', value: formatDate(order.orderDate) },
    { label: '预计交货', value: formatDate(order.expectedDeliveryDate) },
    { label: '实际交货', value: order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : '-' },
    { label: '付款条款', value: order.paymentTerms || '-' },
    { label: '贸易条件', value: order.tradeTerms || '-' },
    { label: '币种', value: <Chip label={currency} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F1F5F9', color: '#334155' }} /> },
    { label: '价格类型', value: order.taxIncluded ? '含税价' : '未税价' },
    { label: '收货地址', value: order.deliveryAddress || '-' },
    { label: '关联项目', value: order.projectName ? `${order.projectNo} - ${order.projectName}` : '-' },
    { label: '未税总额', value: formatCurrency(netTotal, currency) },
    { label: '税额', value: formatCurrency(taxTotal, currency) },
    { label: '价税合计', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(grandTotal, currency)}</strong> },
    { label: '备注', value: order.remarks || '-' },
  ];

  return (
    <Stack spacing={2}>
      {/* 表头信息区：两列 label/value（与采购申请详情 DetailSection 同结构） */}
      <DetailSection columns={2} fields={quickFields} />

      {/* 收货进度 */}
      <Box>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>收货进度</Typography>
          <Typography variant="caption" color="text.secondary">
            已收 {totalDelivered} / 订购 {totalOrdered}（{progress}%）
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate" value={progress}
          color={progress === 100 ? 'success' : 'primary'}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {/* 物料明细表：与采购申请详情同款 DataTable（sapStyle） */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={600}>订单物料明细（{order.items?.length ?? 0} 项）</Typography>
          <Typography variant="caption" color="text.secondary">
            价税合计：<strong style={{ color: '#1D4ED8' }}>{formatCurrency(grandTotal, currency)}</strong>
          </Typography>
        </Box>
        <DataTable
          data={order.items}
          enablePagination={false}
          enableRowSelection={false}
          sapStyle
          columns={[
            {
              id: 'materialCode', header: '物料编码',
              cell: ({ row }) => (
                <Chip label={row.original.materialCode} size="small"
                  sx={{ fontSize: '0.75rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace' }} />
              ),
            },
            {
              id: 'materialName', header: '物料名称', accessorKey: 'materialName',
              cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box>,
            },
            {
              id: 'specification', header: '规格型号', accessorKey: 'specification',
              cell: ({ row }) => <Box sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{row.original.specification}</Box>,
            },
            {
              id: 'unit', header: '单位', accessorKey: 'unit',
              cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.unit}</Box>,
            },
            {
              id: 'orderedQuantity', header: '订购数量', accessorKey: 'orderedQuantity',
              cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.orderedQuantity.toLocaleString()}</Box>,
            },
            {
              id: 'deliveredQuantity', header: '已收数量', accessorKey: 'deliveredQuantity',
              cell: ({ row }) => (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color={row.original.deliveredQuantity === row.original.orderedQuantity ? 'success.main' : 'text.primary'}>
                    {row.original.deliveredQuantity.toLocaleString()}
                  </Typography>
                </Box>
              ),
            },
            {
              id: 'unitPrice', header: '未税单价', accessorKey: 'unitPrice',
              cell: ({ row }) => (
                <SecureField module="purchase" fieldName="unitPrice">
                  <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice, currency)}</Box>
                </SecureField>
              ),
            },
            {
              id: 'amountWithTax', header: '价税合计',
              cell: ({ row }) => {
                const lineRate = row.original.taxRate ?? 13;
                const lineTax = row.original.taxAmount ?? round2((row.original.amount * lineRate) / 100);
                const lineGrand = row.original.amountWithTax ?? round2(row.original.amount + lineTax);
                return <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#1D4ED8' }}>{formatCurrency(lineGrand, currency)}</Box>;
              },
            },
          ]}
        />
      </Paper>
    </Stack>
  );
};

const OrderList: React.FC = () => {
  const hydrating = useCloudHydrating();
  const navigate = useNavigate();
  const purchaseOrders = usePurchaseStore(s => s.purchaseOrders);
  const updatePurchaseOrder = usePurchaseStore(s => s.updatePurchaseOrder);
  const deletePurchaseOrder = usePurchaseStore(s => s.deletePurchaseOrder);
  const printTemplate = usePrintTemplateStore(s => s.getTemplateByEntity('purchaseOrder'));
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [printOpen, setPrintOpen] = useState(false);
  const [printOrderId, setPrintOrderId] = useState('');

  // ── 删除（单行 / 批量共用同一确认框）──
  const [deleteTargets, setDeleteTargets] = useState<PurchaseOrder[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // ── 批量修改 ──
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<PurchaseOrder[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  // ── 一页化：行内右侧抽屉速览（就地看详情不跳页）＋扩展分析折叠 ──
  const [drawerOrder, setDrawerOrder] = useState<PurchaseOrder | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const columns: ColumnDef<PurchaseOrder, unknown>[] = useMemo(() => [
    { accessorKey: 'orderNo', header: '订单号', meta: { searchable: true } },
    { accessorKey: 'vendorName', header: '供应商', meta: { searchable: true } },
    {
      accessorKey: 'currency',
      header: '币种',
      meta: { searchable: true },
      cell: ({ row }) => row.original.currency || 'CNY',
    },
    {
      accessorKey: 'totalAmount',
      header: '未税金额',
      meta: { searchable: true },
      cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency || 'CNY'),
    },
    {
      accessorKey: 'totalTaxAmount',
      header: '税额',
      meta: { searchable: true },
      cell: ({ row }) => {
        const o = row.original;
        const tax = o.totalTaxAmount ?? calcTaxTotals(o.items || []).totalTaxAmount;
        return formatCurrency(tax, o.currency || 'CNY');
      },
    },
    {
      accessorKey: 'grandTotal',
      header: '价税合计',
      meta: { searchable: true },
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
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'orderDate', header: '下单日期', meta: { searchable: true }, cell: ({ row }) => formatDate(row.original.orderDate) },
    { accessorKey: 'expectedDeliveryDate', header: '预计交货', meta: { searchable: true }, cell: ({ row }) => formatDate(row.original.expectedDeliveryDate) },
    { accessorKey: 'actualDeliveryDate', header: '实际交货', meta: { searchable: true }, cell: ({ row }) => formatDate(row.original.actualDeliveryDate) },
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

  // 通用列检索：覆盖全部声明了 meta.searchable 的列，并按字段权限门控。
  const filteredData = useMemo(
    () => applyColumnFilters(purchaseOrders, columns, filterData, { module: 'purchase' }),
    [filterData, purchaseOrders, columns]
  );

  // ── 删除确认 ──
  const confirmDelete = () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    targets.forEach(o => deletePurchaseOrder(o.id));
    setSnackbar({ open: true, message: `已删除 ${targets.length} 条采购订单`, severity: 'success' });
  };

  // ── 批量修改确认 ──
  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    targets.forEach(o => updatePurchaseOrder(o.id, updates as Partial<PurchaseOrder>));
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 条采购订单`, severity: 'success' });
  };

  // ── 批量导入（按表头映射字段，仅更新匹配到的现有订单，未匹配则跳过）──
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = ORDER_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const orderNo = mapped.orderNo;
      if (!orderNo) { skipped += 1; continue; }
      const existing = purchaseOrders.find(o => o.orderNo === orderNo);
      if (!existing) { skipped += 1; continue; }
      const status = ORDER_STATUS_MAP[mapped.status] || undefined;
      updatePurchaseOrder(existing.id, {
        ...(mapped.vendorName ? { vendorName: mapped.vendorName } : {}),
        ...(status ? { status } : {}),
        ...(mapped.currency ? { currency: mapped.currency } : {}),
        ...(mapped.totalAmount ? { totalAmount: Number(mapped.totalAmount) } : {}),
        ...(mapped.expectedDeliveryDate ? { expectedDeliveryDate: mapped.expectedDeliveryDate } : {}),
        ...(mapped.actualDeliveryDate ? { actualDeliveryDate: mapped.actualDeliveryDate } : {}),
        ...(mapped.deliveryAddress ? { deliveryAddress: mapped.deliveryAddress } : {}),
        ...(mapped.paymentTerms ? { paymentTerms: mapped.paymentTerms } : {}),
        ...(mapped.tradeTerms ? { tradeTerms: mapped.tradeTerms } : {}),
        ...(mapped.remarks ? { remarks: mapped.remarks } : {}),
      });
      updated += 1;
    }
    setSnackbar({
      open: true,
      message: `更新 ${updated} 条，跳过 ${skipped} 条（未匹配到现有单号）`,
      severity: updated > 0 ? 'success' : 'info',
    });
  };

  const batchActions: BatchAction<PurchaseOrder>[] = [
    {
      label: '批量修改',
      icon: <EditNote sx={{ fontSize: 14 }} />,
      testId: 'batch-edit',
      onClick: (rows) => { setPendingBatchEdit(rows); setBatchEditOpen(true); },
    },
    {
      label: '批量删除',
      icon: <DeleteOutline sx={{ fontSize: 14 }} />,
      color: 'error',
      testId: 'batch-delete',
      onClick: (rows) => { setDeleteTargets(rows); setDeleteOpen(true); },
    },
  ];

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

  // ── 一页化：KPI 统计条数值（扫一眼看全貌，减少翻表算数） ──
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const total = purchaseOrders.length;
    const inProgress = purchaseOrders.filter(o => ['created', 'sent', 'confirmed', 'partial'].includes(o.status)).length;
    // 逾期未交：预计交货日已过、且尚未完成收货（已收货/已关闭/已取消 不算逾期）
    const overdue = purchaseOrders.filter(o => !['received', 'closed', 'cancelled'].includes(o.status)
      && o.expectedDeliveryDate && o.expectedDeliveryDate < today).length;
    return { total, inProgress, overdue };
  }, [purchaseOrders]);

  const kpis: KpiItem[] = [
    { key: 'total', label: '订单总数', value: stats.total.toLocaleString(), color: 'primary', icon: <Layers sx={{ fontSize: 16 }} /> },
    { key: 'inprog', label: '进行中', value: stats.inProgress.toLocaleString(), color: 'warning', icon: <Assignment sx={{ fontSize: 16 }} /> },
    { key: 'overdue', label: '逾期未交', value: stats.overdue.toLocaleString(), color: stats.overdue > 0 ? 'error' : 'success', icon: <Alarm sx={{ fontSize: 16 }} />, hint: '预计交货已过' },
    { key: 'month', label: '本月采购金额', value: formatCurrency(analytics.monthAmount), color: 'success', icon: <Payments sx={{ fontSize: 16 }} /> },
  ];

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
      {/* ── 一页化：KPI 统计条（常驻一屏）＋ 扩展分析折叠（默认收起，给紧凑表格留纵向空间） ── */}
      <Box sx={{ mb: 1.5 }}>
        <KpiStrip items={kpis} density="compact" testId="po-kpi-strip" />
        {/* 扩展分析折叠：趋势 + Top5 供应商（点击展开，不占常驻纵向空间） */}
        <Button
          size="small"
          startIcon={analyticsOpen ? <ExpandLess sx={{ fontSize: 15 }} /> : <ExpandMore sx={{ fontSize: 15 }} />}
          onClick={() => setAnalyticsOpen((v) => !v)}
          sx={{ mt: 0.5 }}
        >
          {analyticsOpen ? '收起扩展分析' : '展开扩展分析（近6月趋势 / Top5 供应商）'}
        </Button>
        <Collapse in={analyticsOpen}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* 趋势迷你图 */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>近6月采购趋势</Typography>
                  <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '8%', height: 70, px: 1 }}>
                  {analytics.last6Months.map((m) => (
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
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Top5供应商</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        </Collapse>
      </Box>
      <FilterBar fields={filterFields} columns={columns} module="purchase" onSearch={setFilterData} listKey="purchase-order-list" columnConfigKey="purchase-order-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        loading={hydrating && filteredData.length === 0}
        emptyText="暂无采购订单，可点击「新增」创建第一张订单"
        enableRowSelection
        enablePagination
        enableExport
        columnConfigKey="purchase-order-list"
        codeColumnId="orderNo"
        onRowClick={(row) => setDrawerOrder(row)}
        onView={(row) => setDrawerOrder(row)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
        enableImport
        importLabel="采购订单"
        onImport={handleImport}
      />

      {/* ── 一页化：右侧抽屉就地速览（不跳页）＋ 完整详情逃生舱 ── */}
      <DetailDrawer
        open={!!drawerOrder}
        onClose={() => setDrawerOrder(null)}
        title={drawerOrder?.orderNo}
        subtitle={drawerOrder?.vendorName}
        status={drawerOrder ? <StatusBadge status={drawerOrder.status} /> : undefined}
        onOpenFull={() => {
          const id = drawerOrder?.id;
          setDrawerOrder(null);
          if (id) navigate(`/purchase/orders/${id}`);
        }}
      >
        {drawerOrder && <PoQuickView order={drawerOrder} />}
      </DetailDrawer>

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

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除采购订单「${deleteTargets[0]?.orderNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 条采购订单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改采购订单"
        count={pendingBatchEdit.length}
        fields={ORDER_BATCH_FIELDS}
        onConfirm={confirmBatchEdit}
        onCancel={() => { setBatchEditOpen(false); setPendingBatchEdit([]); }}
      />

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default OrderList;
