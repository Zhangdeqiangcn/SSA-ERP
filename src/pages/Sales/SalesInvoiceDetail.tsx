import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Stack, Divider, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useSalesAdvancedStore } from '@/stores/salesAdvancedStore';
import { SalesInvoice } from '@/types';
import { formatCurrency } from '@/utils/format';

const SalesInvoiceDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const salesInvoices = useSalesAdvancedStore((s) => s.salesInvoices);
  const hydrateInvoices = useSalesAdvancedStore((s) => s.hydrateInvoices);
  useEffect(() => { hydrateInvoices(); }, [hydrateInvoices]);
  const invoice = salesInvoices.find((x) => x.id === id) as SalesInvoice | undefined;

  if (!invoice) {
    return (
      <PageWrapper title="销售发票详情">
        <Alert severity="warning">销售发票不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '发票号', value: <Chip label={invoice.invoiceNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} /> },
    { label: '状态', value: <StatusBadge status={invoice.status} /> },
    { label: '销售订单', value: invoice.salesOrderNo },
    { label: '客户名称', value: invoice.customerName },
    { label: '开票日期', value: invoice.invoiceDate },
    { label: '币种', value: invoice.currency || 'CNY' },
    { label: '凭证号', value: invoice.voucherNo || '未生成' },
  ];

  const amountBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>金额汇总</Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">金额</Typography>
          <Typography variant="h6" fontWeight={700} color="primary">{formatCurrency(invoice.amount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">税额</Typography>
          <Typography variant="h6" fontWeight={700} color="warning.main">{formatCurrency(invoice.taxAmount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">价税合计</Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">{formatCurrency(invoice.totalAmount)}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  const itemsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
        <Typography variant="subtitle2" fontWeight={600}>发票明细</Typography>
      </Box>
      <DataTable
        data={invoice.items}
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
        ]}
      />
      <Divider />
      <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
        <Typography variant="body2" color="text.secondary">金额：{formatCurrency(invoice.amount)}</Typography>
        <Typography variant="body2" color="text.secondary">税额：{formatCurrency(invoice.taxAmount)}</Typography>
        <Typography variant="body2" fontWeight={700}>价税合计：<span style={{ color: '#16A34A' }}>{formatCurrency(invoice.totalAmount)}</span></Typography>
      </Box>
    </Paper>
  );

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: invoice.createdBy || '系统', time: invoice.createdAt, description: '创建发票' },
    ...(invoice.updatedAt && invoice.updatedAt !== invoice.createdAt
      ? [{ id: 'op-2', action: 'update' as const, operator: invoice.updatedBy || '系统', time: invoice.updatedAt, description: '更新发票' }]
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
    { id: 'items', title: '发票明细', content: itemsBlock },
    { id: 'logs', title: '操作历史', content: logsBlock },
  ];

  return (
    <ObjectPage
      title={invoice.invoiceNo}
      subtitle={invoice.customerName}
      breadcrumbs={[{ label: '销售发票', path: '/sales/invoices' }]}
      status={<StatusBadge status={invoice.status} />}
      headerFields={[
        { label: '客户', value: invoice.customerName },
        { label: '销售订单', value: invoice.salesOrderNo },
        { label: '价税合计', value: formatCurrency(invoice.totalAmount) },
        { label: '开票日期', value: invoice.invoiceDate },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/invoices')}>返回</Button>
        </Stack>
      }
      sections={sections}
    />
  );
};

export default SalesInvoiceDetail;
