import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Stack, Divider, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useSalesReturnStore } from '@/stores/salesReturnStore';
import { SalesReturn } from '@/types';
import { formatCurrency } from '@/utils/format';

const SalesReturnDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const salesReturns = useSalesReturnStore((s) => s.salesReturns);
  const ret = salesReturns.find((x) => x.id === id) as SalesReturn | undefined;

  if (!ret) {
    return (
      <PageWrapper title="销售退货详情">
        <Alert severity="warning">销售退货单不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '退货单号', value: <Chip label={ret.returnNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} /> },
    { label: '状态', value: <StatusBadge status={ret.status} /> },
    { label: '销售订单', value: ret.salesOrderNo },
    { label: '客户名称', value: ret.customerName },
    { label: '退货日期', value: ret.returnDate },
    { label: '退货原因', value: ret.reason },
    { label: '货款合计', value: formatCurrency(ret.totalAmount) },
    { label: '红字发票', value: ret.creditNoteNo || '未生成' },
    { label: '关联采购退货', value: ret.linkedPurchaseReturnNo || '—' },
  ];

  const amountBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>金额汇总</Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">退货货款合计</Typography>
          <Typography variant="h6" fontWeight={700} color="primary">{formatCurrency(ret.totalAmount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">红字发票</Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">{ret.creditNoteNo || '未生成'}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  const itemsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
        <Typography variant="subtitle2" fontWeight={600}>退货明细</Typography>
      </Box>
      <DataTable
        data={ret.items}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        columns={[
          {
            id: 'materialCode', header: '物料编码',
            cell: ({ row }) => <Chip label={row.original.materialCode} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} />,
          },
          { id: 'materialName', header: '物料名称', accessorKey: 'materialName', cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box> },
          { id: 'unit', header: '单位', accessorKey: 'unit' },
          { id: 'quantity', header: '数量', accessorKey: 'quantity', cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box> },
          { id: 'unitPrice', header: '单价', accessorKey: 'unitPrice', cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box> },
          { id: 'amount', header: '金额', accessorKey: 'amount', cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>{formatCurrency(row.original.amount)}</Box> },
          { id: 'reason', header: '退货原因', accessorKey: 'reason', cell: ({ row }) => <Box sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{row.original.reason || '-'}</Box> },
        ]}
      />
      <Divider />
      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
        <Typography variant="body2" fontWeight={700}>退货货款合计：<span style={{ color: '#16A34A' }}>{formatCurrency(ret.totalAmount)}</span></Typography>
      </Box>
    </Paper>
  );

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: ret.createdBy || '系统', time: ret.createdAt, description: '创建退货单' },
    ...(ret.updatedAt && ret.updatedAt !== ret.createdAt
      ? [{ id: 'op-2', action: 'update' as const, operator: ret.updatedBy || '系统', time: ret.updatedAt, description: '更新退货单' }]
      : []),
    ...(ret.status === 'completed'
      ? [{ id: 'op-3', action: 'approve' as const, operator: ret.updatedBy || '系统', time: ret.updatedAt, description: '完成退货（红字入库 + 红冲应收 + 红字发票）' }]
      : []),
  ];

  const logsBlock = (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>操作历史</Typography>
      <OperationTimeline events={operationLogs} />
    </Box>
  );

  const sections = [
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} columns={2} /> },
    { id: 'amount', title: '金额汇总', content: amountBlock },
    { id: 'items', title: '退货明细', content: itemsBlock },
    { id: 'logs', title: '操作历史', content: logsBlock },
  ];

  return (
    <ObjectPage
      title={ret.returnNo}
      subtitle={ret.customerName}
      breadcrumbs={[{ label: '销售退货', path: '/sales/returns' }]}
      status={<StatusBadge status={ret.status} />}
      headerFields={[
        { label: '客户', value: ret.customerName },
        { label: '销售订单', value: ret.salesOrderNo },
        { label: '退货货款', value: formatCurrency(ret.totalAmount) },
        { label: '退货日期', value: ret.returnDate },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/return')}>返回</Button>
        </Stack>
      }
      sections={sections}
    />
  );
};

export default SalesReturnDetail;
