import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Stack, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useTripartySalesStore } from '@/stores/tripartySalesStore';
import { TripartySale } from '@/types/tripartySales';
import { formatCurrency } from '@/utils/format';

const TripartySalesDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const list = useTripartySalesStore((s) => s.list);
  const sale = list.find((x) => x.id === id) as TripartySale | undefined;

  if (!sale) {
    return (
      <PageWrapper title="代销结算单详情">
        <Alert severity="warning">代销结算单不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '单据号', value: <Chip label={sale.docNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} /> },
    { label: '结算状态', value: <StatusBadge status={`settle_${sale.settleStatus}`} /> },
    { label: '三方/经销商编码', value: sale.partyCode || '-' },
    { label: '三方/经销商名称', value: sale.partyName },
    { label: '终端客户', value: sale.customerName },
    { label: '寄售仓', value: sale.warehouse || '-' },
    { label: '物料编码', value: sale.materialCode },
    { label: '物料名称', value: sale.materialName },
    { label: '规格', value: sale.spec || '-' },
    { label: '数量', value: `${sale.quantity} ${sale.unit}` },
    { label: '结算单价', value: formatCurrency(sale.settlePrice) },
    { label: '金额', value: <Box component="span" sx={{ fontWeight: 700, color: '#16A34A' }}>{formatCurrency(sale.amount)}</Box> },
    { label: '业务日期', value: sale.orderDate },
    { label: '结算日期', value: sale.settleDate || '-' },
    { label: '备注', value: sale.remark || '-' },
  ];

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: sale.createdBy || '系统', time: sale.createdAt, description: '创建代销结算单' },
    ...(sale.updatedAt && sale.updatedAt !== sale.createdAt
      ? [{ id: 'op-2', action: 'update' as const, operator: sale.updatedBy || '系统', time: sale.updatedAt, description: '更新代销结算单' }]
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
    { id: 'logs', title: '操作历史', content: logsBlock },
  ];

  return (
    <ObjectPage
      title={sale.docNo}
      subtitle={sale.partyName}
      breadcrumbs={[{ label: '三方销售', path: '/sales/triparty' }]}
      status={<StatusBadge status={`settle_${sale.settleStatus}`} />}
      headerFields={[
        { label: '三方经销商', value: sale.partyName },
        { label: '终端客户', value: sale.customerName },
        { label: '物料', value: sale.materialName },
        { label: '金额', value: formatCurrency(sale.amount) },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/triparty')}>返回</Button>
        </Stack>
      }
      sections={sections}
    />
  );
};

export default TripartySalesDetail;
