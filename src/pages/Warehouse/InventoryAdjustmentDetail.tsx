import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { InventoryAdjustment } from '@/types';
import { formatDate } from '@/utils/format';

/** 调整状态中文名（与 InventoryAdjustment 列表列保持一致；draft/posted/cancelled 与 StatusBadge 通用键一致） */
const ADJUSTMENT_STATUS_LABEL: Record<InventoryAdjustment['status'], string> = {
  draft: '草稿', posted: '已过账', cancelled: '已取消',
};

const InventoryAdjustmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const adjustment = useWarehouseAdvancedStore(s => s.inventoryAdjustments.find(a => a.id === id)) as InventoryAdjustment | undefined;

  // 操作历史：按调整单生命周期关键节点合成（创建→已过账/已取消）
  const operationLogs = useMemo(() => {
    if (!adjustment) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: adjustment.createdBy, time: adjustment.createdAt, description: '创建库存调整单' },
    ];
    if (adjustment.status === 'posted') {
      logs.push({ id: 'op-post', action: 'approve', operator: adjustment.updatedBy, time: adjustment.updatedAt, description: '调整已过账，库存数量已修正' });
    }
    if (adjustment.status === 'cancelled') {
      logs.push({ id: 'op-cancel', action: 'reject', operator: adjustment.updatedBy || adjustment.createdBy, time: adjustment.updatedAt, description: '调整单已取消' });
    }
    return logs;
  }, [adjustment]);

  if (!adjustment) {
    return (
      <PageWrapper title="库存调整单详情">
        <Alert severity="warning">库存调整单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/adjustment')} sx={{ mt: 2 }}>返回调整列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '调整单号', value: adjustment.adjustmentNo },
    { label: '状态', value: <StatusBadge status={adjustment.status} /> },
    { label: '仓库', value: adjustment.warehouseName || adjustment.warehouseId },
    { label: '调整原因', value: adjustment.reason },
    { label: '调整日期', value: formatDate(adjustment.date) },
    { label: '物料条目数', value: `${adjustment.items.length} 项` },
    {
      label: '差异总量',
      value: (
        <strong style={{ color: adjustment.totalDeltaQty > 0 ? '#DC2626' : adjustment.totalDeltaQty < 0 ? '#16A34A' : undefined }}>
          {adjustment.totalDeltaQty > 0 ? `+${adjustment.totalDeltaQty.toLocaleString()}` : adjustment.totalDeltaQty.toLocaleString()}
        </strong>
      ),
    },
    { label: '存货凭证号', value: adjustment.voucherNo || '-' },
    { label: '创建人', value: adjustment.createdBy },
    { label: '创建时间', value: formatDate(adjustment.createdAt) },
    { label: '最后更新', value: formatDate(adjustment.updatedAt) },
  ];

  return (
    <>
      <ObjectPage
        title={adjustment.adjustmentNo}
        subtitle={`${adjustment.warehouseName || adjustment.warehouseId} · ${adjustment.reason}`}
        breadcrumbs={[{ label: '库存调整', path: '/warehouse/adjustment' }]}
        status={<StatusBadge status={adjustment.status} />}
        headerFields={[
          { label: '仓库', value: adjustment.warehouseName || adjustment.warehouseId },
          { label: '调整原因', value: adjustment.reason },
          { label: '调整日期', value: formatDate(adjustment.date) },
          {
            label: '差异总量',
            value: (
              <strong style={{ color: adjustment.totalDeltaQty > 0 ? '#DC2626' : adjustment.totalDeltaQty < 0 ? '#16A34A' : undefined }}>
                {adjustment.totalDeltaQty > 0 ? `+${adjustment.totalDeltaQty.toLocaleString()}` : adjustment.totalDeltaQty.toLocaleString()}
              </strong>
            ),
          },
          { label: '存货凭证号', value: adjustment.voucherNo || '-' },
          { label: '物料条目数', value: `${adjustment.items.length} 项` },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/adjustment')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'items',
            title: '调整物料明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>调整物料明细（{adjustment.items.length} 项）</Typography>
                  <Typography variant="caption" color="text.secondary">差异总量：<strong>{adjustment.totalDeltaQty.toLocaleString()}</strong></Typography>
                </Box>
                <DataTable
                  data={adjustment.items}
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
                      id: 'locationId', header: '库位',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.original.locationId || '-'}</Box>,
                    },
                    {
                      id: 'bookQty', header: '账面数量',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.bookQty.toLocaleString()}</Box>,
                    },
                    {
                      id: 'actualQty', header: '实盘数量',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.actualQty.toLocaleString()}</Box>,
                    },
                    {
                      // 差异数量着色说明：本项目行情惯例为「红涨绿跌」，但库存差异语义相反——
                      // 盘盈（差异>0）意味着账面少记，需红色醒目提示核查；盘亏（差异<0）用绿色表示。
                      id: 'deltaQty', header: '差异数量',
                      cell: ({ row }) => {
                        const d = row.original.deltaQty;
                        const color = d > 0 ? '#DC2626' : d < 0 ? '#16A34A' : undefined;
                        return (
                          <Box sx={{ textAlign: 'right', fontWeight: 600, color }}>
                            {d > 0 ? `+${d.toLocaleString()}` : d.toLocaleString()}
                          </Box>
                        );
                      },
                    },
                    {
                      id: 'reason', header: '原因',
                      cell: ({ row }) => <Box sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{row.original.reason || '-'}</Box>,
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

export default InventoryAdjustmentDetail;
