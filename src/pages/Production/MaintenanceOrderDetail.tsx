import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { MaintenanceOrder, EquipmentCategory } from '@/types/production';
import { formatCurrency, formatDate } from '@/utils/format';

/** 设备类别中文名（与 Equipment 页 CAT_LABEL 一致） */
const CAT_LABEL: Record<EquipmentCategory, string> = { machine: '设备', tool: '工装', mold: '模具' };

/** 可点击编号链接（只读跳转，样式与 ProcessRouteDetail 工单号链接一致） */
const NoLink: React.FC<{ text: string; onClick: () => void; title?: string }> = ({ text, onClick, title }) => (
  <Typography
    variant="body2"
    title={title}
    sx={{ fontFamily: 'monospace', color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
    onClick={onClick}
  >{text}</Typography>
);

const MaintenanceOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = useEquipmentStore((s) => s.maintenanceOrders.find((m) => m.id === id)) as MaintenanceOrder | undefined;
  // 关联设备主数据（按 equipmentId 关联；设备无独立详情页，链接跳设备列表）
  const equipment = useEquipmentStore((s) => (order?.equipmentId ? s.equipments.find((e) => e.id === order.equipmentId) : undefined));

  // 操作历史：按工单生命周期合成（创建→执行保养→完成）
  const operationLogs = useMemo(() => {
    if (!order) return [];
    const logs: { id: string; action: 'create' | 'update' | 'approve' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: order.createdBy || '-', time: order.createdAt, description: '创建保养工单' },
    ];
    if (order.status === 'planned') {
      logs.push({ id: 'op-plan', action: 'info', operator: order.createdBy || '-', time: order.date, description: `计划执行${order.type}` });
    }
    if (order.status === 'done') {
      logs.push({ id: 'op-execute', action: 'update', operator: order.updatedBy || order.createdBy || '-', time: order.date, description: `执行${order.type}` });
      logs.push({ id: 'op-done', action: 'approve', operator: order.updatedBy || order.createdBy || '-', time: order.updatedAt, description: '保养完成' });
    }
    return logs;
  }, [order]);

  if (!order) {
    return (
      <PageWrapper title="保养工单详情">
        <Alert severity="warning">保养工单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/equipment')} sx={{ mt: 2 }}>返回设备保养列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '设备名称', value: equipment?.name ?? order.equipmentName ?? '-' },
    { label: '设备编码', value: equipment?.code ?? order.equipmentCode ?? '-' },
    { label: '保养类型', value: order.type },
    { label: '保养日期', value: formatDate(order.date) },
    { label: '保养费用', value: <strong>{formatCurrency(order.cost)}</strong> },
    { label: '状态', value: <StatusBadge status={order.status} /> },
    { label: '创建人', value: order.createdBy || '-' },
    { label: '创建时间', value: formatDate(order.createdAt) },
    { label: '更新人', value: order.updatedBy || '-' },
    { label: '更新时间', value: formatDate(order.updatedAt) },
  ];

  // 关联设备信息（equipmentId 为空则不展示该区）
  const equipmentFields = [
    {
      label: '设备编码',
      value: (equipment?.code ?? order.equipmentCode)
        ? <NoLink text={equipment?.code ?? order.equipmentCode} title="设备暂无独立详情页，点击跳转设备列表" onClick={() => navigate('/production/equipment')} />
        : '-',
    },
    { label: '设备名称', value: equipment?.name ?? order.equipmentName ?? '-' },
    { label: '设备类别', value: equipment ? CAT_LABEL[equipment.category] : '-' },
    { label: '设备状态', value: equipment ? <StatusBadge status={equipment.status} /> : '-' },
    { label: '所属工作中心', value: equipment?.workCenterName ?? '-' },
    { label: '下次保养日期', value: equipment?.nextMaintenanceDate ? formatDate(equipment.nextMaintenanceDate) : '-' },
  ];

  return (
    <ObjectPage
      title={`保养工单 · ${order.type}`}
      subtitle={`${order.equipmentName}（${order.equipmentCode}）`}
      breadcrumbs={[{ label: '设备保养', path: '/production/equipment' }]}
      status={<StatusBadge status={order.status} />}
      headerFields={[
        { label: '保养类型', value: order.type },
        { label: '保养日期', value: formatDate(order.date) },
        { label: '保养费用', value: formatCurrency(order.cost) },
        { label: '状态', value: <StatusBadge status={order.status} /> },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/equipment')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        // 保养明细/说明：MaintenanceOrder 无 items 明细数组，仅有 note 说明字段，有值时展示
        ...(order.note ? [{
          id: 'note',
          title: '保养说明',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{order.note}</Typography>
            </Paper>
          ),
        }] : []),
        // 关联设备信息：equipmentId 为空不展示
        ...(order.equipmentId ? [{
          id: 'equipment',
          title: '关联设备信息',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <DetailSection fields={equipmentFields} columns={2} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                设备暂无独立详情页，点击设备编码跳转设备列表查看。
              </Typography>
            </Paper>
          ),
        }] : []),
        ...(operationLogs.length > 0 ? [{
          id: 'logs',
          title: '操作历史',
          content: <OperationTimeline events={operationLogs} />,
        }] : []),
      ]}
    />
  );
};

export default MaintenanceOrderDetail;
