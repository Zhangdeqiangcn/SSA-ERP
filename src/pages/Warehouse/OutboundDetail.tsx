import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Divider,
  LinearProgress, Stepper, Step, StepLabel, TextField,
} from '@mui/material';
import {
  PlayArrow, CheckCircle, LocalShipping, Inventory2,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, DetailActions } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { OutboundOrder } from '@/types';
import { formatDate } from '@/utils/format';

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
const STATUS_COLORS: Record<string, string> = {
  pending: '#94A3B8',
  processing: '#F59E0B',
  picking: '#3B82F6',
  picked: '#8B5CF6',
  packed: '#F59E0B',
  shipped: '#10B981',
  completed: '#10B981',
  cancelled: '#EF4444',
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

  if (!order) {
    return (
      <PageWrapper title="出库详情">
        <Typography color="text.secondary">未找到出库单</Typography>
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

  return (
    <PageWrapper
      title={`出库单 ${order.outboundNo}`}
      actions={
        <DetailActions
          entity="warehouseOutbound"
          record={order}
          onBack={() => navigate(-1)}
          onEdit={() => navigate(`/warehouse/outbound/create`)}
        />
      }
    >
      {/* ── 基本信息 ── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>基本信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">出库类型</Typography>
            <Typography variant="body2">{typeMap[order.type] || order.type}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">仓库</Typography>
            <Typography variant="body2">{order.warehouseName || '-'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">操作员</Typography>
            <Typography variant="body2">{order.operator}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">出库日期</Typography>
            <Typography variant="body2">{formatDate(order.outboundDate)}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">客户</Typography>
            <Typography variant="body2">{order.customerName || '-'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">拣配人</Typography>
            <Typography variant="body2">{order.picker || '-'}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">包装方式</Typography>
            <Typography variant="body2">
              {order.packagingMethod ? PACKAGING_LABELS[order.packagingMethod] : '-'}
            </Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="caption" color="text.secondary">状态</Typography>
            <Chip
              label={STATUS_LABELS[order.status] || order.status}
              size="small"
              sx={{ bgcolor: STATUS_COLORS[order.status] + '15', color: STATUS_COLORS[order.status], fontWeight: 500 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ── 拣配进度条 ── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>拣配进度</Typography>
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

      {/* ── 包装清单与快递信息 ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>包装清单</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">包装方式</Typography>
                <Typography variant="body2">
                  {order.packagingMethod ? PACKAGING_LABELS[order.packagingMethod] : '未指定'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">件数</Typography>
                <Typography variant="body2">{order.packageCount ?? '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">重量(kg)</Typography>
                <Typography variant="body2">{order.weight ?? '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">体积(m³)</Typography>
                <Typography variant="body2">{order.volume ?? '-'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>快递信息</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">快递公司</Typography>
                <Typography variant="body2">{order.expressCompany || '未指定'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">快递单号</Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {order.expressNo || '未指定'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">拣配开始</Typography>
                <Typography variant="body2">{order.pickingStartedAt ? formatDate(order.pickingStartedAt) : '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">拣配完成</Typography>
                <Typography variant="body2">{order.pickingFinishedAt ? formatDate(order.pickingFinishedAt) : '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">包装完成</Typography>
                <Typography variant="body2">{order.packedAt ? formatDate(order.packedAt) : '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">发货时间</Typography>
                <Typography variant="body2">{order.shippedAt ? formatDate(order.shippedAt) : '-'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* ── 出库物料明细 ── */}
      <Paper sx={{ borderRadius: 3 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ p: 3, pb: 0 }}>
          出库物料明细 ({order.items?.length || 0} 项)
        </Typography>
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
    </PageWrapper>
  );
};

export default OutboundDetail;
