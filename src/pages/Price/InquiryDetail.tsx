import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Chip, Stack, Button,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemIcon, TextField, Snackbar,
} from '@mui/material';
import { ArrowBack, CompareArrows, Add, PlayArrow, Edit, Delete, Share } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, FlowTracker, ConfirmDialog, PrintPreviewButton, DataTable } from '@/components/common';
import type { TimelineEvent } from '@/components/common/OperationTimeline';
import { usePriceStore } from '@/stores/priceStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/format';
import DemoBanner from '@/components/common/DemoBanner';

// 询价单状态值 → 统一状态登记表显示键（closed 在询价语境为「已截止」，用专用键）
const IQ_STATUS: Record<string, string> = {
  draft: 'draft',
  published: 'published',
  closed: 'inquiry_closed',
  quotation_received: 'quotation_received',
  compared: 'compared',
};

const InquiryDetail: React.FC = () => {
  const { priceInquiries, vendorQuotations } = usePriceStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('分享内容已复制到剪贴板');

  const inquiry = priceInquiries.find(i => i.id === id);
  const purchaseRequests = usePurchaseStore(s => s.purchaseRequests);
  if (!inquiry) {
    return (
      <PageWrapper title="询价单详情">
        <Alert severity="warning">询价单不存在</Alert>
      </PageWrapper>
    );
  }

  // 获取关联的报价单
  const relatedQuotations = vendorQuotations.filter(q => q.inquiryId === inquiry.id);

  const basicFields = [
    { label: '询价单号', value: inquiry.inquiryNo },
    { label: '标题', value: inquiry.title },
    {
      label: '状态',
      value: <StatusBadge status={IQ_STATUS[inquiry.status] || inquiry.status} />,
    },
    { label: '询价人', value: `${inquiry.inquirer}（${inquiry.department}）` },
    { label: '询价日期', value: formatDate(inquiry.inquiryDate) },
    { label: '报价截止日期', value: formatDate(inquiry.deadline) },
    { label: '币种', value: inquiry.currency === 'CNY' ? '人民币 CNY' : inquiry.currency },
    { label: '目标供应商', value: inquiry.targetVendorNames.join('、') },
    { label: '预估总金额', value: formatCurrency(inquiry.totalEstimatedAmount) },
    { label: '备注', value: inquiry.remarks || '-' },
  ];

  const handleGenerateComparison = () => {
    navigate(`/price/comparison/${inquiry.id}`);
  };

  const handleShare = () => {
    const shareText = `询价单 ${inquiry.inquiryNo}\n标题：${inquiry.title}\n目标供应商：${inquiry.targetVendorNames.join('、')}\n预估金额：${formatCurrency(inquiry.totalEstimatedAmount)}`;
    navigator.clipboard.writeText(shareText).then(() => setSnackbar(true));
  };

  /** 发布询价：真实落库，状态草稿→已发布，进入寻源/比价 */
  const handlePublish = async () => {
    const now = new Date().toISOString();
    const by = useAuthStore.getState().currentUser?.name || '当前用户';
    await usePriceStore.getState().updatePriceInquiry(inquiry.id, {
      status: 'published',
      updatedAt: now,
      updatedBy: by,
    });
    setSnackbarMsg('询价单已发布，已进入寻源/比价流程');
    setSnackbar(true);
  };

  // 获取关联来源采购申请
  const sourceRequestNos = [...new Set(inquiry.items.map(i => i.sourceRequestNo).filter(Boolean))];

  const operationLogs: TimelineEvent[] = [
    { id: 'op-create', time: inquiry.createdAt, operator: inquiry.createdBy, action: 'create', description: `标题：${inquiry.title}` },
    ...(inquiry.status !== 'draft' ? [
      { id: 'op-publish', time: inquiry.updatedAt, operator: inquiry.updatedBy, action: 'update' as const, description: `目标供应商：${inquiry.targetVendorNames.join('、')}` },
    ] : []),
    ...(relatedQuotations.length > 0 ? relatedQuotations.map((q, i) => ({
      id: `op-quote-${i}`,
      time: q.submittedAt || q.createdAt,
      operator: q.vendorName,
      action: 'info' as const,
      description: `报价总额：${formatCurrency(q.totalAmount)}，报价单号：${q.quotationNo}`,
    })) : []),
  ];

  return (
    <PageWrapper
      title="询价单详情"
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker module="price-inquiry" currentStatus={inquiry.status} documentNo={inquiry.inquiryNo} />
          {(inquiry.status === 'published' || inquiry.status === 'closed' || inquiry.status === 'quotation_received') && relatedQuotations.length >= 2 && (
            <Button variant="contained" color="primary" startIcon={<CompareArrows />}
              onClick={handleGenerateComparison}>
              生成比价单
            </Button>
          )}
          {inquiry.status === 'draft' && (
            <Button variant="contained" startIcon={<PlayArrow />}
              onClick={() => void handlePublish()}>
              发布询价
            </Button>
          )}
          {inquiry.status === 'draft' && (
            <Button variant="outlined" startIcon={<Edit />}
              onClick={() => navigate(`/price/inquiry/${id}/edit`)}>修改</Button>
          )}
          <Button variant="outlined" color="error" startIcon={<Delete />}
            onClick={() => setDeleteDialog(true)}>删除</Button>
          <Button variant="outlined" startIcon={<Share />}
            onClick={handleShare}>分享</Button>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/price/inquiry')}>返回列表</Button>
          <PrintPreviewButton
            entity="inquiry"
            record={{
              ...inquiry,
              items: inquiry.items.map((i: any) => ({
                materialCode: i.materialCode, materialName: i.materialName, specification: i.specification,
                unit: i.unit, quantity: i.quantity, unitPrice: i.estimatedPrice, amount: i.estimatedAmount,
              })),
            }}
            showBoth
          />
        </Stack>
      }
    >
      <DemoBanner reason="询价单「发布询价」已**真实落库**：点击后单据状态由草稿变为已发布（status=published），进入寻源/比价流程，可据此生成比价单。原仅弹出提示的演示版本已移除。" />
      {/* 基本信息 */}
      <DetailSection title="基本信息" fields={basicFields} />

      {/* 物料明细 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={1}>物料明细</Typography>
        <DataTable
          data={inquiry.items}
          enablePagination={false}
          enableRowSelection={false}
          sapStyle
          columns={[
            { id: 'materialCode', header: '物料编码', accessorKey: 'materialCode' },
            { id: 'materialName', header: '物料名称', accessorKey: 'materialName' },
            { id: 'specification', header: '规格', accessorKey: 'specification',
              cell: ({ row }) => row.original.specification || '-' },
            { id: 'unit', header: '单位', accessorKey: 'unit' },
            { id: 'quantity', header: '数量', accessorKey: 'quantity',
              cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box> },
            {
              id: 'estimatedPrice', header: '预估单价',
              cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.estimatedPrice ? formatCurrency(row.original.estimatedPrice) : '-'}</Box>,
            },
            {
              id: 'estimatedAmount', header: '预估金额',
              cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.estimatedAmount || row.original.quantity * (row.original.estimatedPrice || 0))}</Box>,
            },
            { id: 'requiredDate', header: '需求日期', accessorKey: 'requiredDate',
              cell: ({ row }) => formatDate(row.original.requiredDate) },
            {
              id: 'sourceRequestNo', header: '来源申请',
              cell: ({ row }) => row.original.sourceRequestNo ? (
                <Chip label={row.original.sourceRequestNo} size="small" variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }} />
              ) : '-',
            },
            { id: 'remarks', header: '备注', accessorKey: 'remarks',
              cell: ({ row }) => row.original.remarks || '-' },
          ]}
        />
      </Paper>

      {/* 供应商报价情况 */}
      {relatedQuotations.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            供应商报价情况（{relatedQuotations.length} 家）
          </Typography>
          {relatedQuotations.map(q => (
            <Paper key={q.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle2">{q.vendorName}</Typography>
                  <Chip label={q.quotationNo} size="small" variant="outlined" />
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    报价日期：{formatDate(q.quotationDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    有效期至：{formatDate(q.validUntil)}
                  </Typography>
                </Stack>
              </Stack>
              <DataTable
                data={q.items}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  { id: 'materialName', header: '物料', accessorKey: 'materialName' },
                  { id: 'specification', header: '规格', accessorKey: 'specification',
                    cell: ({ row }) => row.original.specification || '-' },
                  { id: 'quantity', header: '数量', accessorKey: 'quantity',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box> },
                  { id: 'unitPrice', header: '单价', accessorKey: 'unitPrice',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box> },
                  { id: 'amount', header: '金额', accessorKey: 'amount',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.amount)}</Box> },
                  { id: 'deliveryDays', header: '交期(天)', accessorKey: 'deliveryDays',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.deliveryDays}</Box> },
                  { id: 'deliveryDate', header: '预计交期', accessorKey: 'deliveryDate',
                    cell: ({ row }) => row.original.deliveryDate ? formatDate(row.original.deliveryDate) : '-' },
                ]}
              />
              <Stack direction="row" spacing={3} mt={1}>
                <Typography variant="body2" color="text.secondary">
                  报价总额：<strong>{formatCurrency(q.totalAmount)}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  付款条件：{q.paymentTerms || '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  备注：{q.remarks || '-'}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Paper>
      )}

      {/* 操作历史 */}
      <OperationTimeline events={operationLogs} />

      {/* ── 删除确认 ── */}
      <ConfirmDialog
        open={deleteDialog}
        title="确认删除询价单"
        content={`确定要删除询价单 "${inquiry.inquiryNo}" 吗？此操作不可逆。`}
        onConfirm={() => setDeleteDialog(false)}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />

      <Snackbar
        open={snackbar}
        autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        message={snackbarMsg}
      />
    </PageWrapper>
  );
};

export default InquiryDetail;
