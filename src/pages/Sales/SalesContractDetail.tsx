import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Divider, Alert, Stack, Tooltip, Snackbar,
  LinearProgress,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Share, Add } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, ConfirmDialog, PrintPreviewButton, DataTable } from '@/components/common';
import RelatedDocLinks from '@/components/common/RelatedDocLinks';
import { useRelatedDocs } from '@/utils/relations/useRelatedDocs';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { useSalesStore } from '@/stores/salesStore';
import { ContractStatus } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { notify, notifyError } from '@/utils/notify';
import { statusConfig } from '@/components/common/StatusBadge';

// 合同状态值 → 统一状态登记表显示键（active 在合同语境为「执行中」，故用专用键 contract_active）
const SC_STATUS: Record<ContractStatus, string> = {
  draft: 'draft',
  active: 'contract_active',
  suspended: 'suspended',
  completed: 'completed',
  terminated: 'terminated',
};
const scLabel = (s: ContractStatus) => statusConfig[SC_STATUS[s]]?.label ?? s;

const SalesContractDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const contracts = useSalesContractStore((s) => s.contracts);
  const deleteContract = useSalesContractStore((s) => s.deleteContract);
  const salesOrders = useSalesStore((s) => s.salesOrders);
  const addSalesOrder = useSalesStore((s) => s.addSalesOrder);
  const contract = contracts.find((c) => c.id === id);
  const rel = useRelatedDocs('salesContract', contract);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  if (!contract) {
    return (
      <PageWrapper title="销售合同详情">
        <Alert severity="warning">合同不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const handleShare = () => {
    const text = `销售合同 ${contract.contractNo}\n名称：${contract.name}\n客户：${contract.customerName}\n金额：${formatCurrency(contract.amount)}\n状态：${scLabel(contract.status)}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  // 由合同下推生成销售订单：将合同物料清单带入新订单，并回填合同关联字段
  const handleGenerateOrder = () => {
    const existing = salesOrders.find((o) => o.contractId === contract.id);
    if (existing) {
      notify(`已存在该合同生成的销售订单（${existing.orderNo}），将跳转到该订单。`, 'info');
      navigate(`/sales/orders/${existing.id}`);
      return;
    }
    if (!contract.items || contract.items.length === 0) {
      notifyError('该合同没有物料明细，无法生成销售订单。');
      return;
    }
    const now = new Date().toISOString();
    const orderDate = now.slice(0, 10);
    const subtotal = contract.items.reduce((sum, i) => sum + (i.amount || 0), 0);
    const taxRate = 13;
    const taxAmount = subtotal * taxRate / 100;
    const grandTotal = subtotal + taxAmount;
    const orderId = `so-${Date.now()}`;
    const orderNo = `SO-${Date.now()}`;
    const items = contract.items.map((it, idx) => ({
      id: `soi-gen-${idx}`,
      materialId: it.materialId || '',
      materialCode: it.materialCode || '',
      materialName: it.materialName || '',
      specification: it.specification || '',
      unit: it.unit || '件',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
      deliveryDate: it.deliveryDate || '',
    }));
    addSalesOrder({
      id: orderId,
      orderNo,
      type: 'standard',
      status: 'draft',
      customerId: contract.customerId,
      customerName: contract.customerName,
      customerCode: contract.customerCode,
      salesPerson: contract.salesPerson || '陈伟',
      items,
      totalAmount: subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      orderDate,
      expectedDeliveryDate: contract.endDate || '',
      paymentTerms: '',
      deliveryAddress: '',
      linkedWorkOrders: [],
      contractId: contract.id,
      contractNo: contract.contractNo,
      createdAt: now,
      updatedAt: now,
      createdBy: '合同下推',
      updatedBy: '合同下推',
      creditOccupied: false,
      creditAmount: 0,
    } as any);
    navigate(`/sales/orders/${orderId}`);
  };

  // 收款进度统计
  const totalReceived = contract.paymentSchedule.reduce((sum, p) => sum + (p.received ? p.amount : 0), 0);
  const totalPayments = contract.paymentSchedule.reduce((sum, p) => sum + p.amount, 0);
  const receivedRatio = totalPayments > 0 ? (totalReceived / totalPayments) * 100 : 0;

  const basicFields = [
    { label: '合同编号', value: <Chip label={contract.contractNo} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} /> },
    { label: '合同名称', value: contract.name },
    { label: '客户', value: contract.customerName },
    { label: '客户编码', value: contract.customerCode || '-' },
    { label: '销售员', value: contract.salesPerson || '-' },
    { label: '合同状态', value: <StatusBadge status={SC_STATUS[contract.status]} /> },
    { label: '合同金额', value: formatCurrency(contract.amount) },
    { label: '开始日期', value: formatDate(contract.startDate) },
    { label: '结束日期', value: formatDate(contract.endDate) },
    { label: '主要条款', value: contract.terms || '-' },
    { label: '备注', value: contract.remarks || '-' },
    { label: '创建时间', value: formatDate(contract.createdAt) },
    { label: '更新时间', value: formatDate(contract.updatedAt) },
    { label: '来源单据', value: <RelatedDocLinks docs={rel?.upstreamDocs} showType /> },
    { label: '后续单据', value: <RelatedDocLinks docs={rel?.downstreamDocs} showType /> },
  ];

  // 状态流转时间线
  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: '系统', time: contract.createdAt, description: `创建合同（状态：${scLabel(contract.status)}）` },
    ...(contract.status !== 'draft' ? [{ id: 'op-2', action: 'approve' as const, operator: contract.salesPerson || '销售员', time: contract.updatedAt, description: `合同${contract.status === 'active' ? '生效' : contract.status === 'suspended' ? '暂停' : contract.status === 'completed' ? '完成' : '终止'}` }] : []),
  ];

  return (
    <PageWrapper
      title={`合同详情 - ${contract.contractNo}`}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Edit />}
            onClick={() => navigate(`/sales/contracts/${id}/edit`)}>编辑</Button>
          <Button variant="contained" color="primary" startIcon={<Add />}
            onClick={handleGenerateOrder}>生成销售订单</Button>
          <Button variant="outlined" color="error" startIcon={<Delete />}
            onClick={() => setDeleteDialog(true)}>删除</Button>
          <Button variant="outlined" startIcon={<Share />}
            onClick={handleShare}>分享</Button>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/sales/contracts')}>返回</Button>
          <PrintPreviewButton
            entity="salesContract"
            record={{
              ...contract,
              items: contract.items.map((i: any) => ({
                materialCode: i.materialCode, materialName: i.materialName, specification: i.specification,
                unit: i.unit, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount, deliveryDate: i.deliveryDate,
              })),
            }}
            showBoth
          />
        </Stack>
      }
    >
      {/* 基本信息 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>合同基本信息</Typography>
        <DetailSection fields={basicFields} />
      </Paper>

      {/* 物料明细 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>合同物料明细</Typography>
          <Typography variant="caption" color="text.secondary">共 {contract.items.length} 项</Typography>
        </Box>
        <DataTable
          data={contract.items}
          enablePagination={false}
          enableRowSelection={false}
          sapStyle
          columns={[
            {
              id: 'materialCode', header: '物料编码',
              cell: ({ row }) => (
                <Chip label={row.original.materialCode || '-'} size="small"
                  variant="outlined" color="success" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }} />
              ),
            },
            {
              id: 'materialName', header: '物料名称', accessorKey: 'materialName',
              cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName || '-'}</Box>,
            },
            {
              id: 'specification', header: '规格型号', accessorKey: 'specification',
              cell: ({ row }) => <Box sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{row.original.specification || '-'}</Box>,
            },
            {
              id: 'unit', header: '单位', accessorKey: 'unit',
              cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.unit || '-'}</Box>,
            },
            {
              id: 'quantity', header: '数量', accessorKey: 'quantity',
              cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.quantity.toLocaleString()}</Box>,
            },
            {
              id: 'unitPrice', header: '单价', accessorKey: 'unitPrice',
              cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box>,
            },
            {
              id: 'amount', header: '金额', accessorKey: 'amount',
              cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: 'success.main' }}>{formatCurrency(row.original.amount)}</Box>,
            },
            {
              id: 'deliveryDate', header: '交货日期', accessorKey: 'deliveryDate',
              cell: ({ row }) => row.original.deliveryDate ? formatDate(row.original.deliveryDate) : '-',
            },
          ]}
        />
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="body2" fontWeight={700}>
            合同总金额：<Box component="span" sx={{ color: 'success.main', fontSize: '1.05rem' }}>{formatCurrency(contract.amount)}</Box>
          </Typography>
        </Box>
      </Paper>

      {/* 收款进度 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>收款进度</Typography>

        {/* 进度条 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              已收：{formatCurrency(totalReceived)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              未收：{formatCurrency(totalPayments - totalReceived)}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={receivedRatio} sx={{ height: 8, borderRadius: 4 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
            {receivedRatio.toFixed(1)}% 已收款
          </Typography>
        </Box>

        <DataTable
          data={contract.paymentSchedule}
          enablePagination={false}
          enableRowSelection={false}
          sapStyle
          columns={[
            {
              id: 'stage', header: '里程碑', accessorKey: 'stage',
              cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.stage}</Box>,
            },
            {
              id: 'percentage', header: '比例(%)', accessorKey: 'percentage',
              cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.percentage}%</Box>,
            },
            {
              id: 'amount', header: '金额', accessorKey: 'amount',
              cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.amount)}</Box>,
            },
            {
              id: 'dueDate', header: '计划收款日', accessorKey: 'dueDate',
              cell: ({ row }) => row.original.dueDate ? formatDate(row.original.dueDate) : '-',
            },
            {
              id: 'receivedDate', header: '实际收款日', accessorKey: 'receivedDate',
              cell: ({ row }) => row.original.receivedDate ? formatDate(row.original.receivedDate) : '-',
            },
            {
              id: 'received', header: '收款状态', accessorKey: 'received',
              cell: ({ row }) => (
                <Chip
                  label={row.original.received ? '已收款' : '未收款'}
                  size="small"
                  color={row.original.received ? 'success' : 'warning'}
                />
              ),
            },
          ]}
        />
      </Paper>

      {/* 操作历史时间线 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>操作历史</Typography>
        <OperationTimeline events={operationLogs} />
      </Paper>

      <ConfirmDialog
        open={deleteDialog}
        title="确认删除合同"
        content={`确定要删除合同 "${contract.contractNo} - ${contract.name}" 吗？此操作不可逆。`}
        onConfirm={() => {
          deleteContract(contract.id);
          navigate('/sales/contracts');
          setDeleteDialog(false);
        }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />

      <Snackbar
        open={snackbar}
        autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        message="合同信息已复制到剪贴板"
      />
    </PageWrapper>
  );
};

export default SalesContractDetail;
