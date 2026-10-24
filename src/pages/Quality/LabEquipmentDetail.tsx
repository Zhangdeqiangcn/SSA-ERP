import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Box, Button, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useQualityExtensionStore } from '@/stores/qualityExtensionStore';
import { LabEquipment, LabEquipmentStatus } from '@/types';
import { formatDate } from '@/utils/format';

/** 设备类型中文名（与 LabEquipment 列表口径一致） */
const TYPE_LABEL: Record<LabEquipment['type'], string> = {
  gauge: '量具',
  cmm: '三坐标',
  spectrometer: '光谱仪',
  hardness: '硬度计',
  balance: '天平',
  other: '其他',
};

/** 状态中文名（仅用于操作历史描述文案，状态展示一律走 StatusBadge） */
const STATUS_TEXT: Record<LabEquipmentStatus, string> = {
  in_use: '使用中',
  calibrating: '校准中',
  idle: '闲置',
  scrapped: '已报废',
};

const LabEquipmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const equipment = useQualityExtensionStore((s) => s.labEquipments.find((e) => e.id === id)) as LabEquipment | undefined;

  // 是否已超校准周期（下次校准日期早于今天）
  const isOverdue = useMemo(
    () => (equipment ? dayjs(equipment.nextCalibrationDate).isBefore(dayjs(), 'day') : false),
    [equipment],
  );

  // 操作历史：按设备生命周期合成（创建→校准→信息更新）
  const operationLogs = useMemo(() => {
    if (!equipment) return [];
    const logs: { id: string; action: 'create' | 'update' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: equipment.createdBy, time: equipment.createdAt, description: '创建设备主数据' },
    ];
    if (equipment.lastCalibrationDate) {
      logs.push({
        id: 'op-calibrate',
        action: 'update',
        operator: equipment.updatedBy,
        time: equipment.lastCalibrationDate,
        description: `执行校准，下次校准日期：${formatDate(equipment.nextCalibrationDate)}`,
      });
    }
    if (equipment.updatedAt && equipment.updatedAt !== equipment.createdAt) {
      logs.push({
        id: 'op-update',
        action: 'info',
        operator: equipment.updatedBy,
        time: equipment.updatedAt,
        description: `设备信息更新（当前状态：${STATUS_TEXT[equipment.status]}）`,
      });
    }
    return logs;
  }, [equipment]);

  if (!equipment) {
    return (
      <PageWrapper title="实验室设备详情">
        <Alert severity="warning">设备不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/lab')} sx={{ mt: 2 }}>返回设备列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '设备编号', value: equipment.equipmentNo },
    { label: '设备名称', value: equipment.name },
    { label: '类型', value: TYPE_LABEL[equipment.type] || equipment.type },
    { label: '型号规格', value: equipment.model || '-' },
    { label: '制造商', value: equipment.manufacturer || '-' },
    { label: '存放位置', value: equipment.location || '-' },
    { label: '保管人', value: equipment.custodian || '-' },
    { label: '精度', value: equipment.accuracy || '-' },
    { label: '状态', value: <StatusBadge status={equipment.status} /> },
    { label: '备注', value: equipment.note || '-' },
    { label: '创建人', value: equipment.createdBy },
    { label: '创建时间', value: formatDate(equipment.createdAt) },
  ];

  const calibrationFields = [
    { label: '校准周期', value: `${equipment.calibrationCycleDays} 天` },
    { label: '上次校准日期', value: formatDate(equipment.lastCalibrationDate) },
    { label: '下次校准日期', value: formatDate(equipment.nextCalibrationDate) },
  ];

  const headerFields = [
    { label: '类型', value: TYPE_LABEL[equipment.type] || equipment.type },
    { label: '型号规格', value: equipment.model || '-' },
    { label: '保管人', value: equipment.custodian || '-' },
    { label: '状态', value: <StatusBadge status={equipment.status} /> },
  ];

  return (
    <ObjectPage
      title={equipment.equipmentNo}
      subtitle={equipment.name}
      breadcrumbs={[{ label: '实验室设备', path: '/quality/lab' }, { label: equipment.equipmentNo, path: '' }]}
      status={<StatusBadge status={equipment.status} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/lab')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        {
          id: 'calibration',
          title: '校准信息',
          content: (
            <Box>
              {isOverdue && (
                <Alert severity="warning" sx={{ mb: 2 }}>已超校准周期，请立即安排校准。</Alert>
              )}
              <DetailSection fields={calibrationFields} />
            </Box>
          ),
        },
        ...(operationLogs.length > 0 ? [{
          id: 'logs',
          title: '操作历史',
          content: <OperationTimeline events={operationLogs} />,
        }] : []),
      ]}
    />
  );
};

export default LabEquipmentDetail;
