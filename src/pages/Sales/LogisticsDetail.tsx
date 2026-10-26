import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Stack, Stepper, Step, StepLabel, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useSalesStore } from '@/stores/salesStore';
import { Shipment, ShipmentStatus, TransportMode } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

// 物流发货状态 → 集中 statusConfig key（delivered/cancelled 复用通用 key）
const shipKeyMap: Record<ShipmentStatus, string> = {
  pending: 'ship_pending', picked: 'ship_picked', packed: 'ship_packed', shipped: 'ship_shipped',
  in_transit: 'ship_in_transit', delivered: 'delivered', cancelled: 'cancelled',
};
const SHIP_STEPS = ['pending', 'picked', 'packed', 'shipped', 'in_transit', 'delivered'];
const getActiveStep = (s: ShipmentStatus) => Math.max(0, SHIP_STEPS.indexOf(s));
const TRANSPORT_LABEL: Record<TransportMode, string> = {
  road: '公路', rail: '铁路', sea: '海运', air: '空运', express: '快递',
};

const LogisticsDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const shipments = useSalesStore((s) => s.shipments);
  const shipment = shipments.find((x) => x.id === id) as Shipment | undefined;

  if (!shipment) {
    return (
      <PageWrapper title="物流发货详情">
        <Alert severity="warning">发货单不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '发货单号', value: <Chip label={shipment.shipmentNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} /> },
    { label: '状态', value: <StatusBadge status={shipKeyMap[shipment.status]} /> },
    { label: '销售订单', value: shipment.salesOrderNo },
    { label: '关联项目', value: shipment.projectName ? `${shipment.projectNo} - ${shipment.projectName}` : (shipment.projectNo || '-') },
    { label: '客户名称', value: shipment.customerName },
    { label: '运输方式', value: TRANSPORT_LABEL[shipment.transportMode] || shipment.transportMode },
    { label: '承运商', value: shipment.carrier || '-' },
    { label: '运单号', value: shipment.trackingNo || '-' },
    { label: '司机', value: shipment.driverName || '-' },
    { label: '车牌', value: shipment.vehicleNo || '-' },
    { label: '件数', value: `${shipment.packageCount} 件` },
    { label: '重量', value: shipment.totalWeight != null ? `${shipment.totalWeight} 吨` : '-' },
    { label: '体积', value: shipment.totalVolume != null ? `${shipment.totalVolume} m³` : '-' },
    { label: '运费', value: shipment.freight != null ? formatCurrency(shipment.freight) : '-' },
    { label: '保险费', value: shipment.insurance != null ? formatCurrency(shipment.insurance) : '-' },
    { label: '备注', value: shipment.notes || '-' },
  ];

  const shipItemsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
        <Typography variant="subtitle2" fontWeight={600}>发货明细</Typography>
      </Box>
      <DataTable
        data={shipment.items}
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
          { id: 'orderQuantity', header: '订单数量', accessorKey: 'orderQuantity', cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.orderQuantity}</Box> },
          { id: 'shipQuantity', header: '发货数量', accessorKey: 'shipQuantity', cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600 }}>{row.original.shipQuantity}</Box> },
          { id: 'unitPrice', header: '单价', accessorKey: 'unitPrice', cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.unitPrice)}</Box> },
          { id: 'amount', header: '金额', accessorKey: 'amount', cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>{formatCurrency(row.original.amount)}</Box> },
        ]}
      />
    </Paper>
  );

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: shipment.createdBy || '系统', time: shipment.createdAt, description: '创建发货单' },
    ...(shipment.updatedAt && shipment.updatedAt !== shipment.createdAt
      ? [{ id: 'op-2', action: 'update' as const, operator: shipment.updatedBy || '系统', time: shipment.updatedAt, description: '更新发货单' }]
      : []),
  ];

  const logisticsProgress = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>物流进度</Typography>
      <Stepper activeStep={getActiveStep(shipment.status)} alternativeLabel>
        {['待发货', '已拣货', '已打包', '已出库', '运输中', '已签收'].map((label, idx) => (
          <Step key={idx}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
    </Paper>
  );

  const addressBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>收发信息</Typography>
      <DetailSection columns={2} fields={[
        { label: '起运地', value: shipment.originAddress },
        { label: '目的地', value: shipment.destinationAddress },
        { label: '预计提货', value: formatDate(shipment.estimatedPickupDate) },
        { label: '预计送达', value: formatDate(shipment.estimatedDeliveryDate) },
        { label: '实际提货', value: shipment.actualPickupDate ? formatDate(shipment.actualPickupDate) : '-' },
        {
          label: '实际签收',
          value: shipment.actualDeliveryDate
            ? (<Box component="span" sx={{ color: '#10B981', fontWeight: 600 }}>{formatDate(shipment.actualDeliveryDate)}</Box>)
            : '-',
        },
      ]} />
    </Paper>
  );

  const logsBlock = (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>操作历史</Typography>
      <OperationTimeline events={operationLogs} />
    </Box>
  );

  const sections = [
    { id: 'progress', title: '物流进度', content: logisticsProgress },
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} columns={2} /> },
    { id: 'address', title: '收发信息', content: addressBlock },
    { id: 'items', title: '发货明细', content: shipItemsBlock },
    { id: 'logs', title: '操作历史', content: logsBlock },
  ];

  return (
    <ObjectPage docType="salesLogistics" entity={shipment}
      title={shipment.shipmentNo}
      subtitle={shipment.customerName}
      breadcrumbs={[{ label: '物流发货列表', path: '/sales/logistics' }]}
      status={<StatusBadge status={shipKeyMap[shipment.status]} />}
      headerFields={[
        { label: '客户', value: shipment.customerName },
        { label: '销售订单', value: shipment.salesOrderNo },
        { label: '运输方式', value: TRANSPORT_LABEL[shipment.transportMode] || shipment.transportMode },
        { label: '运单号', value: shipment.trackingNo || '-' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/logistics')}>返回</Button>
        </Stack>
      }
      sections={sections}
    />
  );
};

export default LogisticsDetail;
