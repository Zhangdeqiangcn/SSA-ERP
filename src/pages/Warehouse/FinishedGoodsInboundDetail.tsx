import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { FinishedGoodsInbound } from '@/types';
import { formatDate } from '@/utils/format';

/** 成品入库状态中文名（与 FinishedGoodsInbound 列表列保持一致） */
const FG_INBOUND_STATUS_LABEL: Record<FinishedGoodsInbound['status'], string> = {
  pending: '待入库', inspecting: '检验中', completed: '已完成', partial: '部分入库',
};

const FinishedGoodsInboundDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const inbound = useWarehouseStore(s => s.finishedGoodsInbounds.find(f => f.id === id)) as FinishedGoodsInbound | undefined;

  // 操作历史：按入库单生命周期关键节点合成（创建→入库→完成）
  const operationLogs = useMemo(() => {
    if (!inbound) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: inbound.createdBy, time: inbound.createdAt, description: '创建成品入库单' },
    ];
    if (inbound.status !== 'pending') {
      logs.push({ id: 'op-inbound', action: 'approve', operator: inbound.operator, time: inbound.inboundDate, description: `成品入库 ${inbound.actualQty.toLocaleString()} ${inbound.unit}（合格 ${inbound.qualifiedQty.toLocaleString()}）` });
    }
    if (inbound.status === 'completed') {
      logs.push({ id: 'op-complete', action: 'approve', operator: inbound.operator, time: inbound.updatedAt, description: '入库完成，成品库存已更新' });
    }
    return logs;
  }, [inbound]);

  if (!inbound) {
    return (
      <PageWrapper title="成品入库单详情">
        <Alert severity="warning">成品入库单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/fg-inbound')} sx={{ mt: 2 }}>返回成品入库列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '入库单号', value: inbound.inboundNo },
    { label: '状态', value: <StatusBadge status={`fin_${inbound.status}`} /> },
    { label: '成品编码', value: inbound.productCode },
    { label: '成品名称', value: inbound.productName },
    { label: '规格型号', value: inbound.specification || '-' },
    { label: '单位', value: inbound.unit },
    { label: '生产工单号', value: inbound.workOrderNo || '-' },
    { label: '入库仓库', value: inbound.warehouseName || inbound.warehouseId },
    { label: '库位', value: inbound.locationName || '-' },
    { label: '批次号', value: inbound.batchNo },
    { label: '计划数量', value: inbound.plannedQty.toLocaleString() },
    { label: '入库数量', value: <strong style={{ color: '#1D4ED8' }}>{inbound.actualQty.toLocaleString()}</strong> },
    { label: '合格数量', value: inbound.qualifiedQty.toLocaleString() },
    { label: '不合格数量', value: inbound.rejectedQty.toLocaleString() },
    { label: '操作人', value: inbound.operator },
    { label: '入库日期', value: formatDate(inbound.inboundDate) },
    ...(inbound.inspectionTaskId
      ? [{ label: '关联检验任务', value: <span style={{ fontFamily: 'monospace' }}>{inbound.inspectionTaskId}</span> }]
      : []),
    { label: '备注', value: inbound.remarks || '-' },
    { label: '创建人', value: inbound.createdBy },
    { label: '创建时间', value: formatDate(inbound.createdAt) },
    { label: '最后更新', value: formatDate(inbound.updatedAt) },
  ];

  return (
    <>
      <ObjectPage docType="finishedGoodsInbound" entity={inbound}
        title={inbound.inboundNo}
        subtitle={`${inbound.productName}${inbound.specification ? ` · ${inbound.specification}` : ''}`}
        breadcrumbs={[{ label: '成品入库', path: '/warehouse/fg-inbound' }]}
        status={<StatusBadge status={`fin_${inbound.status}`} />}
        headerFields={[
          { label: '成品编码', value: inbound.productCode },
          { label: '生产工单', value: inbound.workOrderNo || '-' },
          { label: '入库仓库', value: inbound.warehouseName || inbound.warehouseId },
          { label: '入库日期', value: formatDate(inbound.inboundDate) },
          { label: '批次号', value: inbound.batchNo },
          { label: '入库数量', value: <strong style={{ color: '#1D4ED8' }}>{inbound.actualQty.toLocaleString()} {inbound.unit}</strong> },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/fg-inbound')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          ...(operationLogs.length > 0
            ? [{ id: 'logs', title: '操作历史', content: <OperationTimeline events={operationLogs} /> }]
            : []),
        ]}
      />
    </>
  );
};

export default FinishedGoodsInboundDetail;
