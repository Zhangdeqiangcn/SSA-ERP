import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, Paper, Stepper, Step, StepLabel, Alert, Stack,
} from '@mui/material';
import {
  PlayArrow, CheckCircle, LocalShipping, Inventory2, ArrowBack, Edit,
} from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { formatDate, formatCurrency } from '@/utils/format';

const STATUS_STEPS = ['pending', 'picking', 'picked', 'packed', 'shipped'];
const STATUS_LABELS: Record<string, string> = {
  pending: '待出库',
  processing: '出库中',
  picking: '拣配中',
  picked: '已拣配',
  packed: '已包装',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};
// 数据状态值 → 统一状态登记表显示键（保留出库单专属中文标签，颜色由 StatusBadge 集中管理）
const OB_STATUS: Record<string, string> = {
  pending: 'ob_pending',
  processing: 'ob_processing',
  picking: 'ob_picking',
  picked: 'ob_picked',
  packed: 'ob_packed',
  shipped: 'ob_shipped',
  completed: 'ob_completed',
  cancelled: 'ob_cancelled',
};

const PACKAGING_LABELS: Record<string, string> = {
  carton: '纸箱',
  wooden: '木箱',
  pallet: '托盘',
  bare: '裸装',
};

const OutboundDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const outboundOrders = useWarehouseStore(s => s.outboundOrders);
  const updateOutboundOrder = useWarehouseStore(s => s.updateOutboundOrder);

  const order = useMemo(() => outboundOrders.find(o => o.id === id), [id, outboundOrders]);

  // 操作历史：按拣配状态机关键节点合成（创建→开始拣配→拣配完成→包装完成→已发货→完成）
  const operationLogs = useMemo(() => {
    if (!order) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'update' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: order.operator, time: order.createdAt, description: '创建出库单' },
    ];
    if (order.pickingStartedAt) {
      logs.push({ id: 'op-pick-start', action: 'update', operator: order.picker || order.operator, time: order.pickingStartedAt, description: '开始拣配' });
    }
    if (order.pickingFinishedAt) {
      logs.push({ id: 'op-pick-finish', action: 'update', operator: order.picker || order.operator, time: order.pickingFinishedAt, description: '拣配完成' });
    }
    if (order.packedAt) {
      logs.push({ id: 'op-pack', action: 'update', operator: order.picker || order.operator, time: order.packedAt, description: '包装完成' });
    }
    if (order.shippedAt) {
      logs.push({ id: 'op-ship', action: 'approve', operator: order.operator, time: order.shippedAt, description: '确认发货' });
    }
    if (order.status === 'completed') {
      logs.push({ id: 'op-complete', action: 'approve', operator: order.operator, time: order.updatedAt, description: '出库完成' });
    }
    if (order.status === 'cancelled') {
      logs.push({ id: 'op-cancel', action: 'reject', operator: order.updatedBy || order.operator, time: order.updatedAt, description: '出库单已取消' });
    }
    return logs;
  }, [order]);

  if (!order) {
    return (
      <PageWrapper title="出库单详情">
        <Alert severity="warning">出库单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/outbound')} sx={{ mt: 2 }}>返回出库列表</Button>
      </PageWrapper>
    );
  }

  const currentStepIndex = order.status === 'completed' || order.status === 'shipped'
    ? STATUS_STEPS.length
    : STATUS_STEPS.indexOf(order.status) >= 0
      ? STATUS_STEPS.indexOf(order.status)
      : 0;

  const handleStartPicking = () => {
    updateOutboundOrder(order.id, {
      status: 'picking',
      pickingStartedAt: new Date().toISOString(),
    });
  };

  const handleFinishPicking = () => {
    updateOutboundOrder(order.id, {
      status: 'picked',
      pickingFinishedAt: new Date().toISOString(),
    });
  };

  const handleFinishPack = () => {
    updateOutboundOrder(order.id, {
      status: 'packed',
      packedAt: new Date().toISOString(),
    });
  };

  const handleShip = () => {
    updateOutboundOrder(order.id, {
      status: 'shipped',
      shippedAt: new Date().toISOString(),
    });
  };

  const canStartPick = order.status === 'pending' || order.status === 'processing';
  const canFinishPick = order.status === 'picking';
  const canFinishPack = order.status === 'picked';
  const canShip = order.status === 'packed';

  const typeMap: Record<string, string> = {
    sale: '销售出库',
    pick: '领料出库',
    transfer: '调拨出库',
    return: '退货出库',
    subcontract: '委外发料',
    scrap: '报废出库',
  };

  const totalCost = (order.items || []).reduce((s, i) => s + (i.costAmount ?? (i.unitCost ?? 0) * i.quantity), 0);

  const basicFields = [
    { label: '出库单号', value: order.outboundNo },
    { label: '出库类型', value: typeMap[order.type] || order.type },
    { label: '来源单号', value: order.sourceNo || '-' },
    { label: '客户', value: order.customerName || '-' },
    { label: '供应商', value: order.vendorName || '-' },
    { label: '出库仓库', value: order.warehouseName || order.warehouseId },
    { label: '操作员', value: order.operator },
    { label: '拣配人', value: order.picker || '-' },
    { label: '出库日期', value: formatDate(order.outboundDate) },
    { label: '状态', value: <StatusBadge status={OB_STATUS[order.status] || order.status} /> },
    { label: '拣配开始时间', value: formatDate(order.pickingStartedAt) },
    { label: '拣配完成时间', value: formatDate(order.pickingFinishedAt) },
    { label: '包装完成时间', value: formatDate(order.packedAt) },
    { label: '发货时间', value: formatDate(order.shippedAt) },
    { label: '包装方式', value: order.packagingMethod ? PACKAGING_LABELS[order.packagingMethod] : '-' },
    { label: '包装件数', value: order.packageCount ?? '-' },
    { label: '包装重量(kg)', value: order.weight ?? '-' },
    { label: '包装体积(m³)', value: order.volume ?? '-' },
    { label: '快递公司', value: order.expressCompany || '-' },
    { label: '快递单号', value: <Box sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{order.expressNo || '-'}</Box> },
    { label: '库存记账', value: order.inventoryPosted ? '已过账' : '未过账' },
    { label: '成本记账', value: order.cogsPosted ? '已结转' : '未结转' },
    { label: '出库成本合计', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(totalCost)}</strong> },
    { label: '备注', value: order.remarks || '-' },
    { label: '创建人', value: order.createdBy },
    { label: '创建时间', value: formatDate(order.createdAt) },
    { label: '最后更新人', value: order.updatedBy },
    { label: '最后更新时间', value: formatDate(order.updatedAt) },
  ];

  return (
    <>
      <ObjectPage
        title={order.outboundNo}
        subtitle={order.customerName || order.vendorName || '出库单'}
        breadcrumbs={[{ label: '出库管理', path: '/warehouse/outbound' }]}
        status={<StatusBadge status={OB_STATUS[order.status] || order.status} />}
        headerFields={[
          { label: '出库类型', value: typeMap[order.type] || order.type },
          { label: '客户/供应商', value: order.customerName || order.vendorName || '-' },
          { label: '出库日期', value: formatDate(order.outboundDate) },
          { label: '出库仓库', value: order.warehouseName || order.warehouseId },
          { label: '状态', value: <StatusBadge status={OB_STATUS[order.status] || order.status} /> },
          { label: '出库成本合计', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(totalCost)}</strong> },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/outbound')}>返回</Button>
            <Button variant="outlined" startIcon={<Edit />}
              onClick={() => navigate('/warehouse/outbound/create')}>编辑</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'picking',
            title: '拣配进度',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
                <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ mb: 2 }}>
                  {STATUS_STEPS.map((step) => (
                    <Step key={step}>
                      <StepLabel>{STATUS_LABELS[step]}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
                  {canStartPick && (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={handleStartPicking}
                      data-testid="ob-start-pick"
                      color="primary"
                    >
                      开始拣配
                    </Button>
                  )}
                  {canFinishPick && (
                    <Button
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={handleFinishPicking}
                      data-testid="ob-finish-pick"
                      color="success"
                    >
                      完成拣配
                    </Button>
                  )}
                  {canFinishPack && (
                    <Button
                      variant="contained"
                      startIcon={<Inventory2 />}
                      onClick={handleFinishPack}
                      data-testid="ob-finish-pack"
                      color="warning"
                    >
                      包装完成
                    </Button>
                  )}
                  {canShip && (
                    <Button
                      variant="contained"
                      startIcon={<LocalShipping />}
                      onClick={handleShip}
                      color="success"
                    >
                      确认发货
                    </Button>
                  )}
                </Box>
              </Paper>
            ),
          },
          {
            id: 'items',
            title: '出库物料明细',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>出库物料明细（{order.items?.length || 0} 项）</Typography>
                  <Typography variant="caption" color="text.secondary">出库成本合计：<strong>{formatCurrency(totalCost)}</strong></Typography>
                </Box>
                <DataTable
                  data={order.items || []}
                  enablePagination={false}
                  enableRowSelection={false}
                  sapStyle
                  columns={[
                    {
                      id: 'materialCode', header: '物料编码',
                      cell: ({ row }) => <Typography variant="body2" fontFamily="monospace">{row.original.materialCode || '-'}</Typography>,
                    },
                    {
                      id: 'materialName', header: '物料名称',
                      cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.materialName || '-'}</Typography>,
                    },
                    { id: 'specification', header: '规格型号', accessorKey: 'specification',
                      cell: ({ row }) => row.original.specification || '-' },
                    { id: 'unit', header: '单位', accessorKey: 'unit' },
                    { id: 'quantity', header: '数量', accessorKey: 'quantity',
                      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box> },
                    { id: 'batchNo', header: '批次号', accessorKey: 'batchNo',
                      cell: ({ row }) => row.original.batchNo || '-' },
                    { id: 'locationName', header: '库位', accessorKey: 'locationName',
                      cell: ({ row }) => row.original.locationName || '-' },
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

export default OutboundDetail;
