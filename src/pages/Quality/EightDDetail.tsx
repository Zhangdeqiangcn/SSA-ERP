import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useQualityExtensionStore } from '@/stores/qualityExtensionStore';
import { EightDRecord } from '@/types';
import { formatDate } from '@/utils/format';

/** 8D 来源类型中文名（与 EightD 列表来源口径一致） */
const SOURCE_TYPE_LABEL: Record<EightDRecord['sourceType'], string> = {
  unqualified: '不合格品',
  inspection: '检验发现',
  customer_complaint: '客户投诉',
  internal_audit: '内部审核',
  other: '其他',
};

/** 8D 八步法标准步骤命名（按字段名 d0~d8 对应） */
const EIGHT_D_STEPS: { key: 'd0' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'; label: string }[] = [
  { key: 'd0', label: 'D0 准备与紧急响应' },
  { key: 'd1', label: 'D1 成立小组' },
  { key: 'd2', label: 'D2 问题描述' },
  { key: 'd3', label: 'D3 临时遏制措施' },
  { key: 'd4', label: 'D4 根因分析' },
  { key: 'd5', label: 'D5 永久纠正措施' },
  { key: 'd6', label: 'D6 实施与验证' },
  { key: 'd7', label: 'D7 预防再发生' },
  { key: 'd8', label: 'D8 表彰与关闭' },
];

const EightDDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useQualityExtensionStore((s) => s.eightDRecords.find((r) => r.id === id)) as EightDRecord | undefined;

  // 操作历史：按 8D 生命周期合成（创建→处理中→关闭）
  const operationLogs = useMemo(() => {
    if (!record) return [];
    const logs: { id: string; action: 'create' | 'info' | 'approve'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: record.createdBy, time: record.createdAt, description: '创建 8D 报告' },
    ];
    if (record.status !== 'open') {
      logs.push({ id: 'op-progress', action: 'info', operator: record.updatedBy, time: record.updatedAt, description: '8D 问题分析与纠正进行中' });
    }
    if (record.status === 'closed') {
      logs.push({
        id: 'op-close',
        action: 'approve',
        operator: record.updatedBy,
        time: record.closedDate || record.updatedAt,
        description: '8D 报告关闭，问题闭环',
      });
    }
    return logs;
  }, [record]);

  if (!record) {
    return (
      <PageWrapper title="8D 报告详情">
        <Alert severity="warning">8D 报告不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/8d')} sx={{ mt: 2 }}>返回 8D 列表</Button>
      </PageWrapper>
    );
  }

  const filledSteps = EIGHT_D_STEPS.filter((step) => record[step.key]);

  const basicFields = [
    { label: '编号', value: record.code },
    { label: '标题', value: record.title },
    { label: '来源类型', value: SOURCE_TYPE_LABEL[record.sourceType] || record.sourceType },
    { label: '来源单号', value: record.sourceNo || '-' },
    { label: '优先级', value: <StatusBadge status={record.priority} /> },
    { label: '负责人', value: record.owner },
    { label: '团队成员', value: record.team.length > 0 ? record.team.join('、') : '-' },
    { label: '状态', value: <StatusBadge status={record.status} /> },
    { label: '截止日期', value: record.dueDate ? formatDate(record.dueDate) : '-' },
    { label: '关闭日期', value: record.closedDate ? formatDate(record.closedDate) : '-' },
    { label: '创建人', value: record.createdBy },
    { label: '创建时间', value: formatDate(record.createdAt) },
  ];

  const headerFields = [
    { label: '来源类型', value: SOURCE_TYPE_LABEL[record.sourceType] || record.sourceType },
    { label: '优先级', value: <StatusBadge status={record.priority} /> },
    { label: '负责人', value: record.owner },
    { label: '状态', value: <StatusBadge status={record.status} /> },
  ];

  return (
    <ObjectPage docType="eightD" entity={record}
      title={record.code}
      subtitle={record.title}
      breadcrumbs={[{ label: '8D 问题求解', path: '/quality/8d' }, { label: record.code, path: '' }]}
      status={<StatusBadge status={record.status} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/8d')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        {
          id: 'eight-d-steps',
          title: `8D 八步法（${filledSteps.length}/${EIGHT_D_STEPS.length} 步）`,
          content: filledSteps.length > 0 ? (
            <Box>
              {filledSteps.map((step) => (
                <DetailSection
                  key={step.key}
                  title={step.label}
                  columns={1}
                  fields={[{ label: '内容', value: record[step.key] as string }]}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="info">暂无 8D 步骤内容，请在列表页关闭时补充 D8 内容。</Alert>
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

export default EightDDetail;
