import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { InboundOrder } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

/** 入库类型中文名（与 InboundList 列筛选选项保持一致） */
const INBOUND_TYPE_MAP: Record<string, string> = {
  purchase: '采购入库',
  return: '退货入库',
  transfer: '调拨入库',
  subcontract: '委外收货',
  production: '生产完工入库',
  asn: '在途预告(ASN)',
  rework: '返修入库',
};

/** 质检状态中文名 */
const QUALITY_STATUS_MAP: Record<string, string> = {
  qualified: '合格',
  unqualified: '不合格',
};

const InboundDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = useWarehouseStore(s => s.inboundOrders.find(o => o.id === id)) as InboundOrder | undefined;

  // 操作历史：按单据生命周期关键节点合成（创建→入库完成→库存过账→成本过账）
  const operationLogs = useMemo(() => {
    if (!order) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: order.createdBy, time: order.createdAt, description: '创建入库单' },
    ];
    if (order.status === 'completed') {
      logs.push({ id: 'op-complete', action: 'approve', operator: order.operator, time: order.updatedAt, description: '入库完成，物料已收入仓库' });
    }
    if (order.inventoryPosted) {
      logs.push({ id: 'op-post', action: 'approve', operator: order.operator, time: order.updatedAt, description: '库存记账已执行（库存数量已更新）' });
    }
    if (order.costPosted) {
      logs.push({ id: 'op-cost', action: 'approve', operator: order.operator, time: order.updatedAt, description: '移动平均价滚动已执行（成本已更新）' });
    }
    if (order.status === 'cancelled') {
      logs.push({ id: 'op-cancel', action: 'reject', operator: order.updatedBy || order.createdBy, time: order.updatedAt, description: '入库单已取消' });
    }
    return logs;
  }, [order]);

  if (!order) {
    return (
      <PageWrapper title="入库单详情">
        <Alert severity="warning">入库单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/inbound')} sx={{ mt: 2 }}>返回入库列表</Button>
      </PageWrapper>
    );
  }

  const totalActualQty = order.items.reduce((s, i) => s + (i.actualQuantity || 0), 0);
  const totalCost = order.totalCost ?? order.items.reduce((s, i) => s + (i.amount || 0), 0);

  const basicFields = [
    { label: '入库单号', value: order.inboundNo },
    { label: '入库类型', value: INBOUND_TYPE_MAP[order.type] || order.type },
    { label: '来源单号', value: order.sourceNo || '-' },
    { label: '供应商', value: order.vendorName || '-' },
    { label: '收货仓库', value: order.warehouseName || order.warehouseId },
    { label: '操作人', value: order.operator },
    { label: '入库日期', value: formatDate(order.inboundDate) },
    { label: '状态', value: <StatusBadge status={order.status} /> },
    { label: '库存记账', value: order.inventoryPosted ? '已过账' : '未过账' },
    { label: '成本记账', value: order.costPosted ? '已滚价' : '未滚价' },
    { label: '入库总数量', value: totalActualQty.toLocaleString() },
    { label: '入库总成本', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(totalCost)}</strong> },
    { label: '备注', value: order.remarks || '-' },
    { label: '创建人', value: order.createdBy },
    { label: '创建时间', value: formatDate(order.createdAt) },
    { label: '最后更新', value: formatDate(order.updatedAt) },
  ];

  return (
    <>
      <ObjectPage
        title={order.inboundNo}
        subtitle={INBOUND_TYPE_MAP[order.type] || order.type}
        breadcrumbs={[{ label: '采购入库', path: '/warehouse/inbound' }]}
        status={<StatusBadge status={order.status} />}
        headerFields={[
          { label: '入库类型', value: INBOUND_TYPE_MAP[order.type] || order.type },
          { label: '来源单号', value: order.sourceNo || '-' },
          { label: '供应商', value: order.vendorName || '-' },
          { label: '收货仓库', value: order.warehouseName || order.warehouseId },
          { label: '入库日期', value: formatDate(order.inboundDate) },
          { label: '入库总成本', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(totalCost)}</strong> },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/inbound')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'items',
            title: '入库物料明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>入库物料明细（{order.items.length} 项）</Typography>
                  <Typography variant="caption" color="text.secondary">入库总成本：<strong>{formatCurrency(totalCost)}</strong></Typography>
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
                      id: 'expectedQuantity', header: '应收数量', accessorKey: 'expectedQuantity',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.expectedQuantity.toLocaleString()}</Box>,
                    },
                    {
                      id: 'actualQuantity', header: '实收数量', accessorKey: 'actualQuantity',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.actualQuantity.toLocaleString()}</Box>,
                    },
                    {
                      id: 'batchNo', header: '批次号',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.original.batchNo || '-'}</Box>,
                    },
                    {
                      id: 'locationName', header: '库位',
                      cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.locationName || '-'}</Box>,
                    },
                    {
                      id: 'qualityStatus', header: '质检状态',
                      cell: ({ row }) => (
                        <Box sx={{ textAlign: 'center' }}>
                          <Chip
                            label={QUALITY_STATUS_MAP[row.original.qualityStatus] || row.original.qualityStatus}
                            size="small"
                            color={row.original.qualityStatus === 'qualified' ? 'success' : 'error'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Box>
                      ),
                    },
                    {
                      id: 'unitPrice', header: '未税单价',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box>,
                    },
                    {
                      id: 'amount', header: '未税金额',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(row.original.amount)}</Box>,
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

export default InboundDetail;
