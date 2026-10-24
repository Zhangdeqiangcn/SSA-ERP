import React, { useMemo } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, Alert, Stack, Link } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useQualityAdvancedStore } from '@/stores/qualityAdvancedStore';
import { useQualityStore } from '@/stores/qualityStore';
import { InspectionLot, InspectionTask } from '@/types';
import { formatDate } from '@/utils/format';

/** 检验批来源类型中文名（与 InspectionLot 列表来源口径一致） */
const SOURCE_TYPE_LABEL: Record<InspectionLot['sourceType'], string> = {
  inbound: '采购入库',
  production: '生产',
  manual: '手工',
};

/** 判定结论中文名（仅用于操作历史描述文案，状态展示一律走 StatusBadge） */
const LOT_RESULT_LABEL: Record<InspectionLot['status'], string> = {
  pending: '待检',
  in_inspection: '检验中',
  passed: '合格',
  failed: '不合格',
};

const LotDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const lot = useQualityAdvancedStore((s) => s.inspectionLots.find((l) => l.id === id)) as InspectionLot | undefined;
  const task = useQualityStore(
    (s) => (lot?.inspectionTaskId ? s.inspectionTasks.find((t) => t.id === lot.inspectionTaskId) : undefined),
  ) as InspectionTask | undefined;

  // 操作历史：按检验批生命周期合成（创建→关联检验→判定）
  const operationLogs = useMemo(() => {
    if (!lot) return [];
    const logs: { id: string; action: 'create' | 'info' | 'approve' | 'reject'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: lot.createdBy, time: lot.createdAt, description: '创建检验批' },
    ];
    if (lot.inspectionTaskId) {
      logs.push({
        id: 'op-link',
        action: 'info',
        operator: lot.updatedBy,
        time: lot.updatedAt,
        description: `关联检验任务${task ? ` ${task.taskNo}` : ''}`,
      });
    }
    if (lot.status !== 'pending') {
      const action = lot.status === 'failed' ? 'reject' : lot.status === 'passed' ? 'approve' : 'info';
      logs.push({
        id: 'op-judge',
        action,
        operator: lot.updatedBy,
        time: lot.updatedAt,
        description: lot.status === 'in_inspection' ? '检验批开始检验' : `检验批判定完成：${LOT_RESULT_LABEL[lot.status]}`,
      });
    }
    return logs;
  }, [lot, task]);

  if (!lot) {
    return (
      <PageWrapper title="检验批详情">
        <Alert severity="warning">检验批不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/inspection-lot')} sx={{ mt: 2 }}>返回检验批列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '批号', value: lot.lotNo },
    { label: '来源类型', value: SOURCE_TYPE_LABEL[lot.sourceType] || lot.sourceType },
    { label: '来源单号', value: lot.sourceNo || '-' },
    { label: '物料', value: `${lot.materialCode} · ${lot.materialName}` },
    { label: '批次', value: lot.batchNo || '-' },
    { label: '数量', value: lot.quantity.toLocaleString() },
    { label: '供应商', value: lot.vendorName || '-' },
    {
      label: '关联检验任务',
      value: lot.inspectionTaskId ? (
        <Link component={RouterLink} to={`/quality/inspection/${lot.inspectionTaskId}`} underline="hover">
          {task?.taskNo || lot.inspectionTaskNo || lot.inspectionTaskId}
        </Link>
      ) : (lot.inspectionTaskNo || '-'),
    },
    { label: '状态', value: <StatusBadge status={lot.status} /> },
    { label: '创建来源', value: lot.createdFrom },
    { label: '创建人', value: lot.createdBy },
    { label: '创建时间', value: formatDate(lot.createdAt) },
    { label: '最后更新', value: formatDate(lot.updatedAt) },
  ];

  const judgeFields = [
    { label: '判定结论', value: <StatusBadge status={lot.status} /> },
    ...(task
      ? [
          { label: '检验任务', value: task.taskNo },
          { label: '任务负责人', value: task.assignedTo || '-' },
          { label: '完成日期', value: task.completedDate ? formatDate(task.completedDate) : '-' },
          { label: '检验结论', value: task.conclusion || '-' },
        ]
      : []),
  ];

  const headerFields = [
    { label: '来源类型', value: SOURCE_TYPE_LABEL[lot.sourceType] || lot.sourceType },
    { label: '物料', value: `${lot.materialCode} · ${lot.materialName}` },
    { label: '数量', value: lot.quantity.toLocaleString() },
    { label: '判定结论', value: <StatusBadge status={lot.status} /> },
  ];

  return (
    <ObjectPage
      title={lot.lotNo}
      subtitle={`${lot.materialCode} · ${lot.materialName}`}
      breadcrumbs={[{ label: '检验批', path: '/quality/inspection-lot' }, { label: lot.lotNo, path: '' }]}
      status={<StatusBadge status={lot.status} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/inspection-lot')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        { id: 'judge', title: '判定信息', content: <DetailSection fields={judgeFields} /> },
        ...(operationLogs.length > 0 ? [{
          id: 'logs',
          title: '操作历史',
          content: <OperationTimeline events={operationLogs} />,
        }] : []),
      ]}
    />
  );
};

export default LotDetail;
