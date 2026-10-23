import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { InspectionNotice } from '@/types';
import { formatDate } from '@/utils/format';

/** 报检来源中文名（简写口径，与 InspectionNotice 列表页筛选选项对应） */
const SOURCE_TYPE_MAP: Record<string, string> = {
  purchase: '采购',
  production: '生产',
  return: '退货',
};

/** 报检状态中文名（与列表页 statusMap 口径一致） */
const NOTICE_STATUS_MAP: Record<string, string> = {
  pending: '待报检',
  inspecting: '检验中',
  passed: '合格',
  failed: '不合格',
  partial: '部分合格',
};

/** 数据状态值 → StatusBadge 统一状态登记表显示键（模块专属前缀 key；passed/failed 复用通用 key） */
const NOTICE_STATUS_KEY: Record<string, string> = {
  pending: 'qn_pending',
  inspecting: 'qn_inspecting',
  passed: 'passed',
  failed: 'failed',
  partial: 'qn_partial',
};

const InspectionNoticeDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notice = useFlowStore(s => s.inspectionNotices.find(n => n.id === id)) as InspectionNotice | undefined;

  // 操作历史：按单据生命周期关键节点合成（报检→检验→结论）
  const operationLogs = useMemo(() => {
    if (!notice) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-report', action: 'info', operator: notice.reportedBy, time: notice.createdAt, description: '提交报检单，等待质量检验' },
    ];
    if (notice.status !== 'pending') {
      logs.push({ id: 'op-inspect', action: 'info', operator: notice.reportedBy, time: notice.updatedAt, description: '检验任务执行' });
    }
    if (notice.status === 'passed' || notice.status === 'failed' || notice.status === 'partial') {
      logs.push({
        id: 'op-result',
        action: notice.status === 'failed' ? 'reject' : 'approve',
        operator: notice.reportedBy,
        time: notice.updatedAt,
        description: `检验完成，结论：${NOTICE_STATUS_MAP[notice.status] || notice.status}`,
      });
    }
    return logs;
  }, [notice]);

  if (!notice) {
    return (
      <PageWrapper title="报检单详情">
        <Alert severity="warning">报检单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/warehouse/inspection-notice')} sx={{ mt: 2 }}>返回报检列表</Button>
      </PageWrapper>
    );
  }

  const sourceLabel = SOURCE_TYPE_MAP[notice.sourceType] || notice.sourceType;

  const basicFields = [
    { label: '报检单号', value: notice.noticeNo },
    { label: '来源类型', value: sourceLabel },
    { label: '来源单号', value: notice.sourceNo || '-' },
    { label: '供应商', value: notice.vendorName || '-' },
    {
      label: '物料编码',
      value: (
        <Chip label={notice.materialCode} size="small"
          sx={{ fontSize: '0.75rem', bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace' }} />
      ),
    },
    { label: '物料名称', value: notice.materialName },
    { label: '规格型号', value: notice.specification || '-' },
    { label: '单位', value: notice.unit },
    { label: '报检数量', value: `${notice.noticeQty.toLocaleString()} ${notice.unit}` },
    { label: '批次号', value: <Box sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{notice.batchNo || '-'}</Box> },
    { label: '报检仓库', value: notice.warehouseName || notice.warehouseId },
    { label: '状态', value: <StatusBadge status={NOTICE_STATUS_KEY[notice.status] || notice.status} /> },
    ...(notice.inspectionTaskId
      ? [{
          label: '关联检验任务',
          value: <Box sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{notice.inspectionTaskId}</Box>,
        }]
      : []),
    { label: '报检人', value: notice.reportedBy },
    { label: '报检时间', value: formatDate(notice.reportedAt) },
    { label: '备注', value: notice.remarks || '-' },
    { label: '创建人', value: notice.createdBy },
    { label: '创建时间', value: formatDate(notice.createdAt) },
    { label: '最后更新', value: formatDate(notice.updatedAt) },
  ];

  return (
    <>
      <ObjectPage
        title={notice.noticeNo}
        subtitle={`${sourceLabel}报检 · ${notice.materialName}`}
        breadcrumbs={[{ label: '报检单', path: '/warehouse/inspection-notice' }]}
        status={<StatusBadge status={NOTICE_STATUS_KEY[notice.status] || notice.status} />}
        headerFields={[
          { label: '报检单号', value: notice.noticeNo },
          { label: '来源', value: `${sourceLabel} · ${notice.sourceNo || '-'}` },
          {
            label: '物料',
            value: notice.specification ? `${notice.materialName}（${notice.specification}）` : notice.materialName,
          },
          { label: '报检数量', value: `${notice.noticeQty.toLocaleString()} ${notice.unit}` },
          { label: '批次号', value: notice.batchNo || '-' },
          { label: '状态', value: <StatusBadge status={NOTICE_STATUS_KEY[notice.status] || notice.status} /> },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/warehouse/inspection-notice')}>返回</Button>
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

export default InspectionNoticeDetail;
