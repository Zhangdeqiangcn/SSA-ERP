import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Divider, TextField, Alert, Snackbar,
  Grid, Stack, IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack, CheckCircle, Cancel, Send, Edit, Add, Delete, Share,
  LinkOutlined, OpenInNew,
} from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, ConfirmDialog, FlowTracker, PrintPreviewButton, DataTable } from '@/components/common';
import ApprovalFlow, { ApprovalNode } from '@/components/common/ApprovalFlow';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { formatDate, formatCurrency } from '@/utils/format';

const buildApprovalNodes = (status: string): ApprovalNode[] => [
  { id: 'n1', role: '申请人提交', approver: '王晓明', status: 'approved', time: '2024-05-10 09:15', comment: '正常采购申请' },
  { id: 'n2', role: '部门主管审核', approver: '李经理', status: 'approved', time: '2024-05-10 11:30', comment: '同意，符合季度采购计划' },
  { id: 'n3', role: '采购部审批', approver: '张采购',
    status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending',
    time: status === 'approved' ? '2024-05-10 14:20' : undefined,
    comment: status === 'approved' ? '已确认供应商，可执行' : undefined,
  },
  { id: 'n4', role: '财务确认', approver: '陈财务',
    status: status === 'approved' ? 'approved' : status === 'rejected' ? 'skipped' : 'waiting',
    time: status === 'approved' ? '2024-05-10 16:00' : undefined,
  },
  { id: 'n5', role: '完成', approver: undefined, status: status === 'approved' ? 'approved' : 'waiting' },
];

/** 相关单据流转链接 */
const FlowLinks: React.FC<{ requestId: string; status: string }> = ({ requestId, status }) => {
  const navigate = useNavigate();
  const links = [
    { label: '采购订单', icon: '📋', path: '/purchase/orders', active: ['approved', 'ordered'].includes(status), count: status === 'ordered' ? 1 : 0 },
    { label: '价格比较', icon: '📊', path: `/purchase/compare/${requestId}`, active: true, count: 2 },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {links.map((l) => (
        <Chip
          key={l.label}
          label={`${l.icon} ${l.label}${l.count ? ` (${l.count})` : ''}`}
          size="small"
          variant={l.active ? 'filled' : 'outlined'}
          color={l.active ? 'primary' : 'default'}
          onClick={() => l.active && navigate(l.path)}
          icon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
          sx={{ cursor: l.active ? 'pointer' : 'default', fontSize: '0.8rem' }}
        />
      ))}
    </Box>
  );
};

const PurchaseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchaseRequests, deletePurchaseRequest } = usePurchaseStore();
  const request = purchaseRequests.find(r => r.id === id);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  // Mock状态 → 流程节点ID 映射
  const statusToFlowNode: Record<string, string> = {
    draft: 'pr_draft',
    pending: 'pr_submitted',
    approved: 'pr_completed',
    rejected: 'pr_completed',
    ordered: 'pr_ordered',
  };

  if (!request) {
    return (
      <PageWrapper title="采购申请详情">
        <Alert severity="warning">采购申请不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const approvalNodes = buildApprovalNodes(request.status);
  const isPending = request.status === 'pending';

  const basicFields = [
    { label: '申请单号', value: request.requestNo },
    { label: '标题', value: request.title },
    { label: '申请人', value: request.applicant },
    { label: '部门', value: request.department },
    { label: '申请类型', value: request.type === 'material' ? '物料采购' : '服务采购' },
    { label: '优先级', value: <StatusBadge status={request.priority} /> },
    { label: '期望日期', value: formatDate(request.expectedDate) },
    { label: '状态', value: <StatusBadge status={request.status} /> },
    { label: '申请原因', value: request.reason },
    { label: '创建时间', value: formatDate(request.createdAt) },
  ];

  const operationLogs = request.approvalRecords?.map((record) => ({
    id: record.id,
    action: record.action as 'approve' | 'reject' | 'info',
    operator: record.approver,
    time: record.operatedAt,
    description: `${record.action === 'approve' ? '审批通过' : '审批拒绝'}：${record.comments || ''}`,
  })) || [];

  const handleShare = () => {
    const text = `采购申请 ${request.requestNo}\n标题：${request.title}\n金额：${formatCurrency(request.totalAmount)}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  return (
    <>
      <ObjectPage
        title={request.requestNo}
        subtitle={request.title}
        breadcrumbs={[{ label: '采购申请', path: '/purchase/requests' }]}
        status={<StatusBadge status={request.status} />}
        headerFields={[
          { label: '申请人', value: request.applicant },
          { label: '部门', value: request.department },
          { label: '优先级', value: <StatusBadge status={request.priority} /> },
          { label: '期望日期', value: formatDate(request.expectedDate) },
          { label: '预估金额', value: formatCurrency(request.totalAmount) },
        ]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FlowTracker module="purchase-request" currentStatus={statusToFlowNode[request.status] || 'pr_draft'} documentNo={request.requestNo} />
            {isPending && (
              <>
                <Button variant="outlined" color="error" startIcon={<Cancel />}
                  onClick={() => setRejectDialog(true)}>拒绝</Button>
                <Button variant="contained" color="success" startIcon={<CheckCircle />}
                  onClick={() => setApproveDialog(true)}>审批通过</Button>
              </>
            )}
            {request.status === 'draft' && (
              <Button variant="contained" color="primary" startIcon={<Send />}>提交审批</Button>
            )}
            <Button variant="outlined" startIcon={<Edit />}
              onClick={() => navigate(`/purchase/${id}/edit`)}>编辑</Button>
            <Button variant="outlined" color="error" startIcon={<Delete />}
              onClick={() => setDeleteDialog(true)}>删除</Button>
            <Button variant="outlined" startIcon={<Share />}
              onClick={() => handleShare}>分享</Button>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/purchase/requests')}>返回</Button>
            <PrintPreviewButton
              entity="purchaseRequest"
              record={{
                ...request,
                items: request.items.map((i: any) => ({
                  materialCode: i.materialCode, materialName: i.materialName, specification: i.specification,
                  unit: i.unit, quantity: i.quantity, unitPrice: i.estimatedPrice, amount: i.estimatedAmount,
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
                <FlowLinks requestId={request.id} status={request.status} />
              </Box>
            ),
          },
          { id: 'approval', title: '审批流程', content: <ApprovalFlow nodes={approvalNodes} /> },
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'items',
            title: '物料明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>申请物料明细</Typography>
                  <Typography variant="caption" color="text.secondary">预估总金额：<strong>{formatCurrency(request.totalAmount)}</strong></Typography>
                </Box>
                <DataTable
                  data={request.items}
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
                      id: 'quantity', header: '申请数量', accessorKey: 'quantity',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.quantity.toLocaleString()}</Box>,
                    },
                    {
                      id: 'estimatedPrice', header: '预估单价', accessorKey: 'estimatedPrice',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.estimatedPrice)}</Box>,
                    },
                    {
                      id: 'estimatedAmount', header: '预估金额', accessorKey: 'estimatedAmount',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#1D4ED8' }}>{formatCurrency(row.original.estimatedAmount)}</Box>,
                    },
                  ]}
                />
              </Paper>
            ),
          },
          ...(isPending
            ? [{
                id: 'approval-form',
                title: '审批意见',
                content: (
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>审批意见</Typography>
                    <TextField
                      fullWidth multiline rows={3}
                      placeholder="请输入审批意见（可选）..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      size="small"
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'flex-end' }}>
                      <Button size="small" variant="outlined" color="error" onClick={() => setRejectDialog(true)} startIcon={<Cancel />}>拒绝</Button>
                      <Button size="small" variant="contained" color="success" onClick={() => setApproveDialog(true)} startIcon={<CheckCircle />}>审批通过</Button>
                    </Stack>
                  </Paper>
                ),
              }]
            : []),
          ...(operationLogs.length > 0
            ? [{
                id: 'logs',
                title: '操作历史',
                content: <OperationTimeline events={operationLogs} />,
              }]
            : []),
        ]}
      />

      <ConfirmDialog
        open={approveDialog}
        title="确认审批通过"
        content={`确定审批通过"${request.title}"吗？${comment ? `\n审批意见：${comment}` : ''}`}
        onConfirm={() => { setApproveDialog(false); }}
        onCancel={() => setApproveDialog(false)}
        confirmText="审批通过"
        confirmColor="success"
      />
      <ConfirmDialog
        open={rejectDialog}
        title="确认拒绝申请"
        content={`确定拒绝"${request.title}"吗？${comment ? `\n拒绝原因：${comment}` : ''}`}
        onConfirm={() => { setRejectDialog(false); }}
        onCancel={() => setRejectDialog(false)}
        confirmText="确认拒绝"
        confirmColor="error"
      />
      <ConfirmDialog
        open={deleteDialog}
        title="确认删除"
        content={`确定删除"${request.title}"吗？此操作不可撤销。`}
        onConfirm={() => { deletePurchaseRequest(request.id); setDeleteDialog(false); navigate('/purchase/requests'); }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />
      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="分享内容已复制到剪贴板"
      />
    </>
  );
};

export default PurchaseDetail;
