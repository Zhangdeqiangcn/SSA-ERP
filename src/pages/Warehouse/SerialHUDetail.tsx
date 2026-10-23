import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useWarehouseAdvancedStore } from '@/stores/warehouseAdvancedStore';
import { SerialMaster, SerialMovement } from '@/types';
import { formatDate } from '@/utils/format';

/** 序列号状态中文名（与 SerialHU 列表 STATUS_LABEL 保持一致） */
const SERIAL_STATUS_LABEL: Record<SerialMaster['status'], string> = {
  in_stock: '在库',
  shipped: '已发货',
  scrapped: '已报废',
  in_transit: '在途',
};

/** B2 序列号流转类型中文名（与任务规范一致） */
const MOVE_TYPE_LABEL: Record<SerialMovement['type'], string> = {
  inbound: '收货入库',
  issue: '领料出库',
  subcontract: '委外发料',
  delivery: '销售发货',
  transfer: '调拨',
};

const SerialHUDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const serial = useWarehouseAdvancedStore((s) => s.serialMasters.find((m) => m.id === id)) as SerialMaster | undefined;

  const movements = serial?.movements ?? [];

  // 操作历史：按序列号主数据生命周期合成（创建→最近更新）
  const operationLogs = useMemo(() => {
    if (!serial) return [];
    const logs: { id: string; action: 'create' | 'update' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: serial.createdBy, time: serial.createdAt, description: '创建序列号 / HU 主数据' },
    ];
    if (serial.updatedAt && serial.updatedAt !== serial.createdAt) {
      logs.push({ id: 'op-update', action: 'update', operator: serial.updatedBy, time: serial.updatedAt, description: `序列号信息更新（当前状态：${SERIAL_STATUS_LABEL[serial.status]}）` });
    }
    return logs;
  }, [serial]);

  if (!serial) {
    return (
      <PageWrapper title="序列号详情">
        <Alert severity="warning">序列号不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/serial')} sx={{ mt: 2 }}>返回序列号列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '序列号', value: serial.serialNo },
    { label: '物料编码', value: serial.materialCode || '-' },
    { label: '物料名称', value: serial.materialName || '-' },
    { label: '批次号', value: serial.batchNo || '-' },
    { label: '仓库', value: serial.warehouseId || '-' },
    { label: 'HU 编号', value: serial.huId || '-' },
    { label: '状态', value: <StatusBadge status={serial.status} /> },
    { label: '入库日期', value: formatDate(serial.inboundDate) },
    { label: '出库日期', value: formatDate(serial.outboundDate) },
    { label: '客户名称', value: serial.customerName || '-' },
    { label: '备注', value: serial.remarks || '-' },
    { label: '创建人', value: serial.createdBy },
    { label: '创建时间', value: serial.createdAt },
    { label: '最后更新人', value: serial.updatedBy },
    { label: '最后更新时间', value: serial.updatedAt },
  ];

  return (
    <>
      <ObjectPage
        title={serial.serialNo}
        subtitle={serial.materialName || serial.materialCode || '-'}
        breadcrumbs={[{ label: '序列号/HU', path: '/warehouse/serial' }]}
        status={<StatusBadge status={serial.status} />}
        headerFields={[
          { label: '物料编码', value: serial.materialCode || '-' },
          { label: '批次号', value: serial.batchNo || '-' },
          { label: '仓库', value: serial.warehouseId || '-' },
          { label: 'HU 编号', value: serial.huId || '-' },
          { label: '入库日期', value: formatDate(serial.inboundDate) },
          { label: '出库日期', value: formatDate(serial.outboundDate) },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/serial')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'movements',
            title: '流转轨迹',
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" fontWeight={600}>流转轨迹（{movements.length} 条）</Typography>
                  <Typography variant="caption" color="text.secondary">一物一码全生命周期：收货→领料→委外→发货</Typography>
                </Box>
                {movements.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">暂无流转记录</Typography>
                  </Box>
                ) : (
                  <DataTable
                    data={movements}
                    enablePagination={false}
                    enableRowSelection={false}
                    sapStyle
                    columns={[
                      {
                        id: 'type', header: '流转类型',
                        cell: ({ row }) => (
                          <Box sx={{ fontWeight: 500 }}>{MOVE_TYPE_LABEL[row.original.type] || row.original.type}</Box>
                        ),
                      },
                      {
                        id: 'docNo', header: '单据号',
                        cell: ({ row }) => (
                          <Chip label={row.original.docNo} size="small"
                            sx={{ fontSize: '0.75rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace' }} />
                        ),
                      },
                      {
                        id: 'date', header: '日期',
                        cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{formatDate(row.original.date)}</Box>,
                      },
                      {
                        id: 'status', header: '流转后状态',
                        cell: ({ row }) => (
                          <Box sx={{ textAlign: 'center' }}>{SERIAL_STATUS_LABEL[row.original.status] || row.original.status}</Box>
                        ),
                      },
                      {
                        id: 'note', header: '备注',
                        cell: ({ row }) => <Box sx={{ color: '#64748B', fontSize: '0.8125rem' }}>{row.original.note || '-'}</Box>,
                      },
                    ]}
                  />
                )}
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

export default SerialHUDetail;
