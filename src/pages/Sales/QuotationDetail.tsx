import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Stack, Divider, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useSalesAdvancedStore } from '@/stores/salesAdvancedStore';
import { Quotation } from '@/types';
import { formatCurrency } from '@/utils/format';

const QuotationDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const quotations = useSalesAdvancedStore((s) => s.quotations);
  const quotation = quotations.find((x) => x.id === id) as Quotation | undefined;

  if (!quotation) {
    return (
      <PageWrapper title="报价单详情">
        <Alert severity="warning">报价单不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '报价单号', value: <Chip label={quotation.quotationNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} /> },
    { label: '状态', value: <StatusBadge status={quotation.status} /> },
    { label: '客户名称', value: quotation.customerName },
    { label: '有效期至', value: quotation.validUntil },
    { label: '币种', value: quotation.currency || 'CNY' },
    { label: '销售员', value: quotation.salesPerson || '-' },
    { label: '税率', value: `${quotation.taxRate}%` },
    { label: '关联订单', value: quotation.convertedOrderNo || '-' },
  ];

  const amountBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>金额汇总</Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">货款合计</Typography>
          <Typography variant="h6" fontWeight={700} color="primary">{formatCurrency(quotation.totalAmount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">税额 ({quotation.taxRate}%)</Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">{formatCurrency(quotation.taxAmount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">价税合计</Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(quotation.grandTotal)}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  const itemsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
        <Typography variant="subtitle2" fontWeight={600}>报价明细</Typography>
      </Box>
      <DataTable
        data={quotation.items}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        columns={[
          {
            id: 'materialCode', header: '物料编码',
            cell: ({ row }) => <Chip label={row.original.materialCode} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} />,
          },
          { id: 'materialName', header: '物料名称', accessorKey: 'materialName', cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box> },
          { id: 'specification', header: '规格型号', accessorKey: 'specification', cell: ({ row }) => <Box sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{row.original.specification || '-'}</Box> },
          { id: 'unit', header: '单位', accessorKey: 'unit' },
          { id: 'quantity', header: '数量', accessorKey: 'quantity', cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box> },
          { id: 'unitPrice', header: '单价', accessorKey: 'unitPrice', cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box> },
          { id: 'amount', header: '金额', accessorKey: 'amount', cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>{formatCurrency(row.original.amount)}</Box> },
        ]}
      />
      <Divider />
      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
        <Typography variant="body2" color="text.secondary">货款：{formatCurrency(quotation.totalAmount)}</Typography>
        <Typography variant="body2" color="text.secondary">税额：{formatCurrency(quotation.taxAmount)}</Typography>
        <Typography variant="body2" fontWeight={700}>价税合计：<span style={{ color: '#16A34A' }}>{formatCurrency(quotation.grandTotal)}</span></Typography>
      </Box>
    </Paper>
  );

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: quotation.createdBy || '系统', time: quotation.createdAt, description: '创建报价单' },
    ...(quotation.updatedAt && quotation.updatedAt !== quotation.createdAt
      ? [{ id: 'op-2', action: 'update' as const, operator: quotation.updatedBy || '系统', time: quotation.updatedAt, description: '更新报价单' }]
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
    { id: 'items', title: '报价明细', content: itemsBlock },
    { id: 'logs', title: '操作历史', content: logsBlock },
  ];

  return (
    <ObjectPage docType="salesQuotation" entity={quotation}
      title={quotation.quotationNo}
      subtitle={quotation.customerName}
      breadcrumbs={[{ label: '销售报价单', path: '/sales/quotation' }]}
      status={<StatusBadge status={quotation.status} />}
      headerFields={[
        { label: '客户', value: quotation.customerName },
        { label: '金额(含税)', value: formatCurrency(quotation.grandTotal) },
        { label: '有效期至', value: quotation.validUntil },
        { label: '销售员', value: quotation.salesPerson || '-' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/quotation')}>返回</Button>
        </Stack>
      }
      sections={sections}
    />
  );
};

export default QuotationDetail;
