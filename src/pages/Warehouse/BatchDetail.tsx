import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { BatchRecord, BatchStatus } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

/** 批次状态中文名（与 BatchManage 列筛选选项保持一致） */
const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  normal: '正常',
  expiring: '临期',
  expired: '已过期',
  locked: '已锁定',
};

/** 批次状态 → 集中 statusConfig key（与 BatchManage 保持一致） */
const BATCH_STATUS_KEY: Record<BatchStatus, string> = {
  normal: 'batch_normal',
  expiring: 'expiring',
  expired: 'batch_expired',
  locked: 'locked',
};

const BatchDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const batch = useWarehouseStore((s) => s.batchRecords.find((b) => b.id === id)) as BatchRecord | undefined;

  // 操作历史：按批次真实可用日期合成（入库登记创建；已过期批次追加效期到期节点）
  const operationLogs = useMemo(() => {
    if (!batch) return [];
    const logs: { id: string; action: 'create' | 'update' | 'info'; operator: string; time: string; description: string }[] = [
      {
        id: 'op-create',
        action: 'create',
        operator: '系统',
        time: batch.inboundDate,
        description: batch.inboundNo ? `创建批次（随入库单 ${batch.inboundNo} 过账登记）` : '创建批次（入库登记）',
      },
    ];
    if (batch.status === 'expired' && batch.expiryDate) {
      logs.push({ id: 'op-expired', action: 'info', operator: '系统', time: batch.expiryDate, description: `效期到期，批次状态变更为「${BATCH_STATUS_LABEL[batch.status]}」` });
    }
    return logs;
  }, [batch]);

  if (!batch) {
    return (
      <PageWrapper title="批次详情">
        <Alert severity="warning">批次不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/batch')} sx={{ mt: 2 }}>返回批次列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '批次号', value: batch.batchNo },
    { label: '物料编码', value: batch.materialCode },
    { label: '物料名称', value: batch.materialName },
    { label: '仓库', value: batch.warehouseName || batch.warehouseId },
    { label: '库位', value: batch.locationId || '-' },
    { label: '批次数量', value: batch.quantity.toLocaleString() },
    { label: '批次成本', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(batch.cost)}</strong> },
    { label: '生产日期', value: formatDate(batch.productionDate) },
    { label: '效期', value: formatDate(batch.expiryDate) },
    { label: '入库单号', value: batch.inboundNo || '-' },
    { label: '入库日期', value: formatDate(batch.inboundDate) },
    { label: '供应商', value: batch.supplierName || '-' },
    { label: '状态', value: <StatusBadge status={BATCH_STATUS_KEY[batch.status]} /> },
    { label: '是否锁定', value: batch.locked ? '是（禁止出入库）' : '否' },
    { label: '组织', value: batch.orgId || '-' },
    { label: '物料 ID', value: batch.materialId || '-' },
  ];

  return (
    <>
      <ObjectPage docType="batch" entity={batch}
        title={batch.batchNo}
        subtitle={batch.materialName}
        breadcrumbs={[{ label: '批次管理', path: '/warehouse/batch' }]}
        status={<StatusBadge status={BATCH_STATUS_KEY[batch.status]} />}
        headerFields={[
          { label: '物料编码', value: batch.materialCode },
          { label: '仓库', value: batch.warehouseName || batch.warehouseId },
          { label: '批次数量', value: batch.quantity.toLocaleString() },
          { label: '批次成本', value: <strong style={{ color: '#1D4ED8' }}>{formatCurrency(batch.cost)}</strong> },
          { label: '生产日期', value: formatDate(batch.productionDate) },
          { label: '效期', value: formatDate(batch.expiryDate) },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/batch')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          ...(operationLogs.length > 0
            ? [{ id: 'logs', title: '批次操作记录', content: <OperationTimeline events={operationLogs} /> }]
            : []),
        ]}
      />
    </>
  );
};

export default BatchDetail;
