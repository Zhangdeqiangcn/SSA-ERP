import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { StockTransfer } from '@/types';
import { formatDate } from '@/utils/format';

/** 转储状态中文名（与 StockTransfer 列表列保持一致） */
const TRANSFER_STATUS_LABEL: Record<StockTransfer['status'], string> = {
  draft: '草稿', shipped: '已发出', received: '已收货', completed: '已完成', cancelled: '已取消',
};

const StockTransferDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const transfer = useWarehouseAdvancedStore(s => s.stockTransfers.find(t => t.id === id)) as StockTransfer | undefined;

  // 操作历史：按转储单据生命周期关键节点合成（创建→已发出→已收货→已完成/已取消）
  const operationLogs = useMemo(() => {
    if (!transfer) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: transfer.createdBy, time: transfer.createdAt, description: '创建转储单' },
    ];
    if (transfer.status === 'shipped') {
      logs.push({ id: 'op-shipped', action: 'approve', operator: transfer.updatedBy, time: transfer.updatedAt, description: '调出方已发出，物料出库' });
    }
    if (transfer.status === 'received' || transfer.status === 'completed') {
      logs.push({ id: 'op-received', action: 'approve', operator: transfer.updatedBy, time: transfer.updatedAt, description: '调入方已收货，物料入库' });
    }
    if (transfer.status === 'completed') {
      logs.push({ id: 'op-complete', action: 'approve', operator: transfer.updatedBy, time: transfer.updatedAt, description: '转储完成，双边过账结束' });
    }
    if (transfer.status === 'cancelled') {
      logs.push({ id: 'op-cancel', action: 'reject', operator: transfer.updatedBy || transfer.createdBy, time: transfer.updatedAt, description: '转储单已取消' });
    }
    return logs;
  }, [transfer]);

  if (!transfer) {
    return (
      <PageWrapper title="转储单详情">
        <Alert severity="warning">转储单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/transfer')} sx={{ mt: 2 }}>返回转储列表</Button>
      </PageWrapper>
    );
  }

  const totalQty = transfer.items.reduce((s, i) => s + (i.quantity || 0), 0);
  const statusLabel = TRANSFER_STATUS_LABEL[transfer.status];

  const basicFields = [
    { label: '转储单号', value: transfer.transferNo },
    { label: '状态', value: <StatusBadge status={`st_${transfer.status}`} /> },
    { label: '调出仓库', value: `${transfer.fromWarehouseName || transfer.fromWarehouseId}${transfer.fromOrgId ? `（${transfer.fromOrgId}）` : ''}` },
    { label: '调入仓库', value: `${transfer.toWarehouseName || transfer.toWarehouseId}${transfer.toOrgId ? `（${transfer.toOrgId}）` : ''}` },
    { label: '调出组织', value: transfer.fromOrgId || '-' },
    { label: '调入组织', value: transfer.toOrgId || '-' },
    { label: '转储日期', value: formatDate(transfer.transferDate) },
    { label: '物料条目数', value: `${transfer.items.length} 项` },
    { label: '转储总数量', value: <strong style={{ color: '#1D4ED8' }}>{totalQty.toLocaleString()}</strong> },
    { label: '备注', value: transfer.remarks || '-' },
    { label: '创建人', value: transfer.createdBy },
    { label: '创建时间', value: formatDate(transfer.createdAt) },
    { label: '最后更新', value: formatDate(transfer.updatedAt) },
  ];

  return (
    <>
      <ObjectPage
        title={transfer.transferNo}
        subtitle={`${transfer.fromWarehouseName || transfer.fromWarehouseId} → ${transfer.toWarehouseName || transfer.toWarehouseId}`}
        breadcrumbs={[{ label: '跨组织转储', path: '/warehouse/transfer' }]}
        status={<StatusBadge status={`st_${transfer.status}`} />}
        headerFields={[
          { label: '调出仓库', value: `${transfer.fromWarehouseName || transfer.fromWarehouseId}${transfer.fromOrgId ? `（${transfer.fromOrgId}）` : ''}` },
          { label: '调入仓库', value: `${transfer.toWarehouseName || transfer.toWarehouseId}${transfer.toOrgId ? `（${transfer.toOrgId}）` : ''}` },
          { label: '转储日期', value: formatDate(transfer.transferDate) },
          { label: '调出组织', value: transfer.fromOrgId || '-' },
          { label: '调入组织', value: transfer.toOrgId || '-' },
          { label: '转储总数量', value: <strong style={{ color: '#1D4ED8' }}>{totalQty.toLocaleString()}</strong> },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/transfer')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'items',
            title: '转储物料明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>转储物料明细（{transfer.items.length} 项）</Typography>
                  <Typography variant="caption" color="text.secondary">转储总数量：<strong>{totalQty.toLocaleString()}</strong>　状态：{statusLabel}</Typography>
                </Box>
                <DataTable
                  data={transfer.items}
                  enablePagination={false}
                  enableRowSelection={false}
                  sapStyle
                  columns={[
                    {
                      id: 'materialCode', header: '物料编码',
                      cell: ({ row }) => (
                        <Chip label={row.original.materialCode || row.original.materialId} size="small"
                          sx={{ fontSize: '0.75rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace' }} />
                      ),
                    },
                    {
                      id: 'materialName', header: '物料名称',
                      cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName || '-'}</Box>,
                    },
                    {
                      id: 'unit', header: '单位',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.unit || '-'}</Box>,
                    },
                    {
                      id: 'quantity', header: '数量',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.quantity.toLocaleString()}</Box>,
                    },
                    {
                      id: 'batchNo', header: '批次号',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.original.batchNo || '-'}</Box>,
                    },
                    {
                      id: 'locationId', header: '库位',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.original.locationId || '-'}</Box>,
                    },
                  ]}
                />
              </Paper>
            ),
          },
          ...(operationLogs.length > 0
            ? [{ id: 'logs', title: '操作历史', content: <OperationTimeline events={operationLogs} /> }]
            : []),
        ]}
      />
    </>
  );
};

export default StockTransferDetail;
