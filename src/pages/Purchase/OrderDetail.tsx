import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Divider, Alert,
  Grid, Stack, LinearProgress, Tooltip, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  ArrowBack, Edit, Delete, Share, LinkOutlined, OpenInNew, ContentCopy, History, EditNote,
} from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, ConfirmDialog, FlowTracker, PrintPreviewButton, DataTable, SecureField } from '@/components/common';
import ApprovalFlow, { ApprovalNode } from '@/components/common/ApprovalFlow';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useVendorStore } from '@/stores/vendorStore';
import { formatDate, formatCurrency } from '@/utils/format';
import { calcTaxTotals, round2 } from '@/utils/tax';

const buildApprovalNodes = (status: string): ApprovalNode[] => [
  { id: 'n1', role: '创建订单', approver: 'admin', status: 'approved', time: '2024-05-06 10:00' },
  { id: 'n2', role: '发送供应商', approver: '采购员', status: ['sent', 'confirmed', 'partial', 'received', 'closed'].includes(status) ? 'approved' : 'pending', time: ['sent', 'confirmed', 'partial', 'received', 'closed'].includes(status) ? '2024-05-06 14:00' : undefined },
  { id: 'n3', role: '供应商确认', approver: '供应商', status: ['confirmed', 'partial', 'received', 'closed'].includes(status) ? 'approved' : 'waiting', time: ['confirmed', 'partial', 'received', 'closed'].includes(status) ? '2024-05-07 09:00' : undefined },
  { id: 'n4', role: '收货入库', approver: '仓库主管', status: ['received', 'closed'].includes(status) ? 'approved' : status === 'partial' ? 'pending' : 'waiting', time: ['received', 'closed'].includes(status) ? '2024-05-14 15:00' : undefined },
  { id: 'n5', role: '完成关闭', approver: undefined, status: status === 'closed' ? 'approved' : 'waiting' },
];

const statusToFlowNode: Record<string, string> = {
  created: 'po_draft',
  sent: 'po_sent',
  confirmed: 'po_confirmed',
  partial: 'po_receiving',
  received: 'po_received',
  closed: 'po_closed',
  cancelled: 'po_closed',
};

const OrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices } = useFinanceStore();
  const { purchaseOrders, purchaseRequests, deletePurchaseOrder, changePurchaseOrder } = usePurchaseStore();
  const applyVendorCreditDelta = useVendorStore(s => s.applyVendorCreditDelta);
  const order = purchaseOrders.find(o => o.id === id);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [snackMsg, setSnackMsg] = useState('订单信息已复制到剪贴板');
  // B10 订单变更单：变更对话框 / 版本历史对话框
  const [changeDialog, setChangeDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [changeDelivery, setChangeDelivery] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [itemEdits, setItemEdits] = useState<Record<string, { quantity: number; unitPrice: number }>>({});

  if (!order) {
    return (
      <PageWrapper title="采购订单详情">
        <Alert severity="warning">采购订单不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  // 关联的采购申请
  const relatedRequest = order.requestId ? purchaseRequests.find(r => r.id === order.requestId) : null;

  // A2 税价拆分：币种与含税汇总（兼容未迁移的存量单据）
  const currency = order.currency || 'CNY';
  const taxTotals = calcTaxTotals(order.items);
  const orderNetTotal = order.totalAmount ?? taxTotals.totalAmount;
  const orderTaxTotal = order.totalTaxAmount ?? taxTotals.totalTaxAmount;
  const orderGrandTotal = order.grandTotal ?? round2(orderNetTotal + orderTaxTotal);

  // B1 信用卡点：本单尚未释放的信用占用金额（删除/取消时需回退给供应商）
  const creditTotal = order.creditOccupied ? (order.creditAmount ?? orderGrandTotal) : 0;
  const creditOutstanding = order.creditOccupied
    ? Math.max(0, round2(creditTotal - (order.creditReleasedAmount ?? 0)))
    : 0;

  // B10 订单变更单：锁定规则（已收货或终态禁止变更）
  const orderLocked = (order.deliveredQuantity || 0) > 0 || ['received', 'closed', 'cancelled'].includes(order.status);

  // B10 提交变更：重算行金额 → 调用 changePurchaseOrder 生成新版本（非原地修改）
  const handleChangeSubmit = () => {
    const newItems = order.items.map((item) => {
      const edit = itemEdits[item.id] || { quantity: item.orderedQuantity, unitPrice: item.unitPrice };
      const orderedQuantity = Math.max(0, Number(edit.quantity) || 0);
      const unitPrice = Math.max(0, Number(edit.unitPrice) || 0);
      const amount = round2(orderedQuantity * unitPrice);
      const taxRate = item.taxRate ?? 0;
      const taxAmount = round2((amount * taxRate) / 100);
      return {
        ...item,
        orderedQuantity,
        unitPrice,
        amount,
        taxAmount,
        priceWithTax: round2(unitPrice * (1 + taxRate / 100)),
        amountWithTax: round2(amount + taxAmount),
      };
    });
    const totalAmount = round2(newItems.reduce((s, i) => s + i.amount, 0));
    const res = changePurchaseOrder(
      order.id,
      { expectedDeliveryDate: changeDelivery, items: newItems, totalAmount },
      changeReason.trim() || '订单变更'
    );
    setChangeDialog(false);
    setSnackMsg(res.ok ? `变更成功，已生成新版本 V${res.version}` : (res.error || '变更失败'));
    setSnackbar(true);
  };

  // B10 版本差异对比：before(快照) → after(下一版本或当前)
  const describeDiff = (before: { expectedDeliveryDate?: string; items?: typeof order.items; totalAmount?: number }, after: { expectedDeliveryDate: string; items: typeof order.items; totalAmount: number }) => {
    const lines: string[] = [];
    if ((before.expectedDeliveryDate || '') !== (after.expectedDeliveryDate || '')) {
      lines.push(`交期：${formatDate(before.expectedDeliveryDate || '')} → ${formatDate(after.expectedDeliveryDate)}`);
    }
    const bItems = before.items || [];
    const afterMap = new Map(after.items.map(i => [i.id, i]));
    bItems.forEach((bi) => {
      const ai = afterMap.get(bi.id);
      const qtyChanged = ai && ai.orderedQuantity !== bi.orderedQuantity;
      const priceChanged = ai && ai.unitPrice !== bi.unitPrice;
      if (qtyChanged || priceChanged) {
        const parts: string[] = [];
        if (qtyChanged) parts.push(`数量 ${bi.orderedQuantity} → ${ai!.orderedQuantity}`);
        if (priceChanged) parts.push(`单价 ${bi.unitPrice} → ${ai!.unitPrice}`);
        lines.push(`「${bi.materialName || bi.materialCode}」${parts.join('；')}`);
      }
    });
    if (Math.abs((before.totalAmount || 0) - after.totalAmount) >= 0.01) {
      lines.push(`未税总额：${formatCurrency(before.totalAmount || 0, currency)} → ${formatCurrency(after.totalAmount, currency)}`);
    }
    return lines;
  };

  // 三单匹配（采购订单 / 收货入库 / 发票）— 对标 SAP MM 三单匹配
  const { inboundOrders } = useWarehouseStore();
  const relatedInbounds = inboundOrders.filter(o => o.sourceNo === order.orderNo);
  const receivedQty = relatedInbounds.reduce((s, o) => s + o.items.reduce((a, it) => a + (it.actualQuantity || 0), 0), 0);
  const relatedInvoices = invoices.filter(inv => inv.purchaseOrderNo === order.orderNo);
  // 发票 totalAmount 为价税合计口径，故与订单「价税合计」比对（A2 修正原「含税 vs 未税」错配）
  const invoiceTotal = relatedInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
  const invoiceTaxTotal = relatedInvoices.reduce((s, inv) => s + (inv.taxAmount || 0), 0);
  const orderedQty = order.items.reduce((s, i) => s + i.orderedQuantity, 0);
  const qtyMatch = orderedQty > 0 && receivedQty === orderedQty;
  const amountMatch = Math.abs(invoiceTotal - orderGrandTotal) < 0.01;
  // 进项税对账：订单预估税额 vs 发票实际税额
  const taxMatch = relatedInvoices.length > 0 && Math.abs(invoiceTaxTotal - orderTaxTotal) < 0.01;
  const hasMatchData = relatedInbounds.length > 0 || relatedInvoices.length > 0;
  const matchStatus: 'pending' | 'matched' | 'diff' = !hasMatchData ? 'pending' : (qtyMatch && amountMatch ? 'matched' : 'diff');
  const MATCH_CONFIG = {
    pending: { label: '待处理', color: '#94A3B8' },
    matched: { label: '匹配一致', color: '#10B981' },
    diff: { label: '存在差异', color: '#F59E0B' },
  }[matchStatus];

  const canEdit = ['created'].includes(order.status);

  const handleShare = () => {
    const shareText = `采购订单 ${order.orderNo}\n供应商：${order.vendorName}\n价税合计：${formatCurrency(orderGrandTotal, currency)}\n状态：${order.status}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setSnackbar(true);
    });
  };

  const basicFields = [
    { label: '订单号', value: <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Chip label={order.orderNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#EFF6FF', color: '#1D4ED8' }} />
        <Tooltip title="复制"><ContentCopy sx={{ fontSize: 14, color: '#94A3B8', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(order.orderNo)} /></Tooltip>
      </Box>
    },
    { label: '供应商', value: order.vendorName },
    { label: '联系人', value: order.contact || '-' },
    { label: '联系电话', value: order.phone || '-' },
    { label: '订单状态', value: <StatusBadge status={order.status} /> },
    { label: '下单日期', value: formatDate(order.orderDate) },
    { label: '预计交货', value: formatDate(order.expectedDeliveryDate) },
    { label: '实际交货', value: order.actualDeliveryDate ? formatDate(order.actualDeliveryDate) : '-' },
    { label: '付款条款', value: order.paymentTerms || '-' },
    { label: '贸易条件', value: order.tradeTerms || '-' },
    { label: '币种', value: <Chip label={currency} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F1F5F9', color: '#334155' }} /> },
    { label: '价格类型', value: order.taxIncluded ? '含税价' : '未税价' },
    { label: '未税总额', value: formatCurrency(orderNetTotal, currency) },
    { label: '税额合计', value: formatCurrency(orderTaxTotal, currency) },
    { label: '价税合计', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(orderGrandTotal, currency)}</strong> },
    {
      label: '信用占用',
      value: (
        <span data-testid="po-credit-status">
          {order.creditOccupied ? (
            <>
              <Chip label="已占用" size="small" color="warning" sx={{ mr: 1 }} />
              {formatCurrency(creditOutstanding, currency)}
              {(order.creditReleasedAmount ?? 0) > 0 && (
                <span style={{ color: '#64748B', marginLeft: 6 }}>
                  （已释放 {formatCurrency(order.creditReleasedAmount ?? 0, currency)}）
                </span>
              )}
            </>
          ) : (
            <Chip label="未占用 / 已释放" size="small" sx={{ bgcolor: '#F1F5F9', color: '#334155' }} />
          )}
        </span>
      ),
    },
    { label: '收货地址', value: order.deliveryAddress || '-' },
    { label: '关联项目', value: order.projectName ? `${order.projectNo} - ${order.projectName}` : '-' },
    { label: '备注', value: order.remarks || '-' },
    { label: '创建人', value: order.createdBy },
    { label: '创建时间', value: formatDate(order.createdAt) },
  ];

  // 整体收货进度
  const totalOrdered = order.items.reduce((s, i) => s + i.orderedQuantity, 0);
  const totalDelivered = order.items.reduce((s, i) => s + i.deliveredQuantity, 0);
  const deliveryProgress = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

  const approvalNodes = buildApprovalNodes(order.status);

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: order.createdBy, time: order.createdAt, description: '创建采购订单' },
    ...(order.status !== 'created' ? [{ id: 'op-2', action: 'approve' as const, operator: '采购员', time: order.updatedAt, description: `订单已发送至供应商 ${order.vendorName}` }] : []),
    ...((['confirmed', 'partial', 'received', 'closed'].includes(order.status)) ? [{ id: 'op-3', action: 'approve' as const, operator: order.vendorName || '供应商', time: order.updatedAt, description: '供应商已确认订单' }] : []),
    ...((['partial', 'received', 'closed'].includes(order.status)) ? [{ id: 'op-4', action: 'approve' as const, operator: '仓库主管', time: order.actualDeliveryDate || order.updatedAt, description: `收货入库，进度：${deliveryProgress}%` }] : []),
  ];

  return (
    <>
      <ObjectPage
        title={order.orderNo}
        subtitle={order.vendorName}
        breadcrumbs={[{ label: '采购订单', path: '/purchase/orders' }]}
        status={<StatusBadge status={order.status} />}
        headerFields={[
          { label: '供应商', value: order.vendorName },
          { label: '订单状态', value: <StatusBadge status={order.status} /> },
          { label: '下单日期', value: formatDate(order.orderDate) },
          { label: '预计交货', value: formatDate(order.expectedDeliveryDate) },
          { label: '未税总额', value: formatCurrency(orderNetTotal, currency) },
          { label: '价税合计', value: formatCurrency(orderGrandTotal, currency) },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <FlowTracker module="purchase-order" currentStatus={statusToFlowNode[order.status] || 'po_draft'} documentNo={order.orderNo} />
            {canEdit && (
              <Button variant="outlined" startIcon={<Edit />}
                onClick={() => navigate(`/purchase/orders/${id}/edit`)}>修改</Button>
            )}
            {/* B10 订单变更单：未收货/未结束可变更，已收货锁定 */}
            <Tooltip title={orderLocked ? '订单已收货或已结束，禁止变更' : '变更生成新版本（历史留痕可追溯）'}>
              <span>
                <Button variant="outlined" startIcon={<EditNote />} disabled={orderLocked}
                  onClick={() => {
                    setChangeDelivery(order.expectedDeliveryDate);
                    setChangeReason('');
                    setItemEdits(Object.fromEntries(order.items.map(i => [i.id, { quantity: i.orderedQuantity, unitPrice: i.unitPrice }])));
                    setChangeDialog(true);
                  }}>变更订单</Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<History />}
              onClick={() => setHistoryDialog(true)}>版本历史{order.version && order.version > 1 ? `（V${order.version}）` : ''}</Button>
            <Button variant="outlined" color="error" startIcon={<Delete />}
              onClick={() => setDeleteDialog(true)}>删除</Button>
            <Button variant="outlined" startIcon={<Share />}
              onClick={handleShare}>分享</Button>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/purchase/orders')}>返回</Button>
            <PrintPreviewButton
              entity="purchaseOrder"
              record={{
                ...order,
                items: order.items.map((i: any) => ({
                  materialCode: i.materialCode, materialName: i.materialName, specification: i.specification,
                  unit: i.unit, quantity: i.orderedQuantity, unitPrice: i.unitPrice, amount: i.amount,
                })),
              }}
              showBoth
            />
          </Stack>
        }
        sections={[
          {
            id: 'links',
            title: '单据流转关联',
            content: (
              <Box sx={{ p: 2, bgcolor: '#F0F9FF', borderRadius: 2, border: '1px solid #BAE6FD' }}>
                <Typography variant="caption" sx={{ color: '#0369A1', fontWeight: 600, display: 'block', mb: 1 }}>
                  <LinkOutlined sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />单据流转关联
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {relatedRequest && (
                    <Chip
                      label={`📋 采购申请 (${relatedRequest.requestNo})`}
                      size="small" variant="filled" color="primary"
                      onClick={() => navigate(`/purchase/${relatedRequest.id}`)}
                      icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
                      sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
                    />
                  )}
                  <Chip
                    label={`🏭 入库单`}
                    size="small" variant="outlined"
                    onClick={() => navigate('/warehouse/inbound')}
                    icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
                    sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
                  />
                  <Chip
                    label={`💰 付款计划`}
                    size="small" variant="outlined"
                    onClick={() => navigate('/finance/payments')}
                    icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
                    sx={{ cursor: 'pointer', fontSize: '0.8rem' }}
                  />
                </Box>
              </Box>
            ),
          },
          {
            id: 'approval',
            title: '审批流程',
            content: <ApprovalFlow nodes={approvalNodes} />,
          },
          {
            id: 'basic',
            title: '基本信息',
            content: <DetailSection fields={basicFields} />,
          },
          {
            id: 'delivery',
            title: '收货进度',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>收货进度</Typography>
                  <Typography variant="body2" color="text.secondary">
                    已收 <strong>{totalDelivered}</strong> / 订购 <strong>{totalOrdered}</strong> ({deliveryProgress}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={deliveryProgress}
                  color={deliveryProgress === 100 ? 'success' : 'primary'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Paper>
            ),
          },
          {
            id: 'match',
            title: '三单匹配',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={600}>三单匹配（采购订单 / 收货 / 发票）</Typography>
                  <Chip label={MATCH_CONFIG.label} size="small" sx={{ bgcolor: MATCH_CONFIG.color + '15', color: MATCH_CONFIG.color, fontWeight: 600 }} />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">采购订单（价税合计）</Typography>
                    <Typography variant="body2" fontWeight={600} data-testid="twm-po-grand">{formatCurrency(orderGrandTotal, currency)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      未税 {formatCurrency(orderNetTotal, currency)} · 税额 {formatCurrency(orderTaxTotal, currency)} · 订购 {orderedQty} 件
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">收货入库</Typography>
                    <Typography variant="body2" fontWeight={600}>{receivedQty} 件</Typography>
                    <Typography variant="caption" color={qtyMatch ? 'success.main' : 'text.secondary'}>
                      数量{qtyMatch ? '一致 ✓' : '差异 ✗'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">发票（价税合计）</Typography>
                    <Typography variant="body2" fontWeight={600} data-testid="twm-invoice-total">{formatCurrency(invoiceTotal, currency)}</Typography>
                    <Typography variant="caption" color={amountMatch ? 'success.main' : 'text.secondary'} display="block">
                      金额{amountMatch ? '一致 ✓' : '差异 ✗'}
                    </Typography>
                    <Typography variant="caption" color={taxMatch ? 'success.main' : 'text.secondary'}>
                      进项税 {formatCurrency(invoiceTaxTotal, currency)}{relatedInvoices.length > 0 ? (taxMatch ? ' 一致 ✓' : ' 差异 ✗') : ''}
                    </Typography>
                  </Grid>
                </Grid>
                {relatedInvoices.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      关联发票：{relatedInvoices.map((i) => i.invoiceNo).join('、')}
                      {!taxMatch && `（订单预估进项税 ${formatCurrency(orderTaxTotal, currency)}，发票实际 ${formatCurrency(invoiceTaxTotal, currency)}，差额 ${formatCurrency(round2(invoiceTaxTotal - orderTaxTotal), currency)}）`}
                    </Typography>
                  </Box>
                )}
                <Alert severity={matchStatus === 'matched' ? 'success' : matchStatus === 'diff' ? 'warning' : 'info'} sx={{ mt: 1.5, py: 0 }}>
                  {matchStatus === 'matched'
                    ? '采购订单、收货数量与发票金额一致，可进入付款流程。'
                    : matchStatus === 'diff'
                      ? '存在数量或金额差异，请核对收货单与发票后再付款。'
                      : '尚未关联收货单或发票，三单匹配待处理。'}
                </Alert>
              </Paper>
            ),
          },
          {
            id: 'items',
            title: '物料明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>订单物料明细</Typography>
                  <Typography variant="caption" color="text.secondary">
                    价税合计：<strong style={{ color: '#1D4ED8' }}>{formatCurrency(orderGrandTotal, currency)}</strong>
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
                      id: 'amount', header: '未税金额', accessorKey: 'amount',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row.original.amount, currency)}</Box>,
                    },
                    {
                      id: 'taxRate', header: '税率',
                      cell: ({ row }) => {
                        const lineRate = row.original.taxRate ?? 13;
                        return <Box sx={{ textAlign: 'right', color: '#64748B' }}>{lineRate}%</Box>;
                      },
                    },
                    {
                      id: 'taxAmount', header: '税额',
                      cell: ({ row }) => {
                        const lineRate = row.original.taxRate ?? 13;
                        const lineTax = row.original.taxAmount ?? round2((row.original.amount * lineRate) / 100);
                        return <Box sx={{ textAlign: 'right', color: '#64748B' }}>{formatCurrency(lineTax, currency)}</Box>;
                      },
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
                    {
                      id: 'deliveryProgress', header: '收货进度', enableSorting: false,
                      cell: ({ row }) => {
                        const progress = row.original.orderedQuantity > 0 ? Math.round((row.original.deliveredQuantity / row.original.orderedQuantity) * 100) : 0;
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LinearProgress variant="determinate" value={progress}
                              color={progress === 100 ? 'success' : 'primary'}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                            <Typography variant="caption" sx={{ minWidth: 32, textAlign: 'right' }}>{progress}%</Typography>
                          </Box>
                        );
                      },
                    },
                  ]}
                />
                <Divider />
                <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <Stack spacing={0.25} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">
                      未税总额：{formatCurrency(orderNetTotal, currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      税额合计：{formatCurrency(orderTaxTotal, currency)}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} data-testid="po-detail-grand-total">
                      价税合计：<span style={{ color: '#1D4ED8', fontSize: '1.05rem' }}>{formatCurrency(orderGrandTotal, currency)}</span>
                    </Typography>
                  </Stack>
                </Box>
              </Paper>
            ),
          },
          {
            id: 'logs',
            title: '操作历史',
            content: <OperationTimeline events={operationLogs} />,
          },
        ]}
      />

      {/* ── B10 变更订单对话框（未收货/未结束可变更，生成新版本） ── */}
      <Dialog open={changeDialog} onClose={() => setChangeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>变更采购订单 {order.orderNo}（V{order.version || 1} → V{(order.version || 1) + 1}）</DialogTitle>
        <DialogContent>
          <TextField
            label="预计交货日期"
            type="date"
            value={changeDelivery}
            onChange={(e) => setChangeDelivery(e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 1, mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>物料明细（数量 / 未税单价）</Typography>
          {order.items.map((item) => {
            const edit = itemEdits[item.id] || { quantity: item.orderedQuantity, unitPrice: item.unitPrice };
            return (
              <Stack key={item.id} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.materialName || item.materialCode}
                </Typography>
                <TextField size="small" type="number" label="数量" value={edit.quantity}
                  onChange={(e) => setItemEdits({ ...itemEdits, [item.id]: { ...edit, quantity: Number(e.target.value) } })}
                  sx={{ width: 110 }} />
                <TextField size="small" type="number" label="未税单价" value={edit.unitPrice}
                  onChange={(e) => setItemEdits({ ...itemEdits, [item.id]: { ...edit, unitPrice: Number(e.target.value) } })}
                  sx={{ width: 130 }} />
              </Stack>
            );
          })}
          <TextField
            label="变更原因（必填，将写入版本历史）"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeDialog(false)}>取消</Button>
          <Button variant="contained" disabled={!changeReason.trim()} onClick={handleChangeSubmit}>确认变更</Button>
        </DialogActions>
      </Dialog>

      {/* ── B10 版本历史对话框（差异对比视图） ── */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>版本历史 — {order.orderNo}（当前 V{order.version || 1}）</DialogTitle>
        <DialogContent>
          {(order.history || []).length === 0 ? (
            <Alert severity="info">暂无变更记录，当前为初始版本 V1。</Alert>
          ) : (
            (order.history || []).map((h, idx) => {
              const after = idx === 0
                ? { expectedDeliveryDate: order.expectedDeliveryDate, items: order.items, totalAmount: orderGrandTotal }
                : ((order.history || [])[idx - 1].snapshot as unknown as { expectedDeliveryDate: string; items: typeof order.items; totalAmount: number });
              const diffLines = describeDiff(h.snapshot as unknown as Parameters<typeof describeDiff>[0], after);
              return (
                <Paper key={`${h.version}-${h.changedAt}`} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">V{h.version} → V{h.version + 1}</Typography>
                    <Typography variant="caption" color="text.secondary">{h.changedAt} · {h.changedBy}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>原因：{h.changeReason}</Typography>
                  {diffLines.length === 0 ? (
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#94A3B8' }}>（无差异）</Typography>
                  ) : (
                    diffLines.map((l, i) => <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>· {l}</Typography>)
                  )}
                </Paper>
              );
            })
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* ── 删除确认对话框 ── */}
      <ConfirmDialog
        open={deleteDialog}
        title="确认删除订单"
        content={
          creditOutstanding > 0
            ? `确定要删除采购订单 "${order.orderNo}" 吗？删除后将释放供应商已占用的信用额度 ${formatCurrency(creditOutstanding, currency)}。此操作不可逆。`
            : `确定要删除采购订单 "${order.orderNo}" 吗？此操作不可逆。`
        }
        onConfirm={() => {
          // B1 信用卡点：删除订单前释放尚未释放的信用占用，避免额度被永久吃掉
          if (creditOutstanding > 0) {
            applyVendorCreditDelta(order.vendorId, -creditOutstanding);
          }
          deletePurchaseOrder(order.id);
          setDeleteDialog(false);
          navigate('/purchase/orders');
        }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />

      {/* ── 分享提示 ── */}
      <Snackbar
        open={snackbar}
        autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        message={snackMsg}
      />
    </>
  );
};

export default OrderDetail;
