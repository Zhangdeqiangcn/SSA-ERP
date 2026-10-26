import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack, Assignment } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useQualityStore } from '@/stores/qualityStore';
import { useQualityAdvancedStore } from '@/stores/qualityAdvancedStore';
import { InspectionTask, InspectionType, InspectionStatus } from '@/types';
import { formatDate } from '@/utils/format';

/** 检验类型中文名（与 InspectionList Tab 选项保持一致） */
const TYPE_MAP: Record<InspectionType, string> = {
  incoming: '来料检验',
  process: '过程检验',
  final: '成品检验',
};

/** 状态键：pending/in_progress 用 insp_ 专属键；passed/failed/conditional_pass 复用通用键（与 InspectionList 一致） */
const STATUS_KEY: Record<InspectionStatus, string> = {
  pending: 'insp_pending',
  in_progress: 'insp_in_progress',
  passed: 'passed',
  failed: 'failed',
  conditional_pass: 'conditional_pass',
};

/** 结论中文名 */
const CONCLUSION_MAP: Record<string, string> = {
  passed: '合格',
  failed: '不合格',
  conditional_pass: '条件接收',
};

/** 缺陷严重度 */
const SEVERITY_MAP: Record<string, { label: string; color: 'error' | 'warning' | 'info' }> = {
  critical: { label: '严重', color: 'error' },
  major: { label: '主要', color: 'warning' },
  minor: { label: '次要', color: 'info' },
};

const InspectionTaskDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const task = useQualityStore(s => s.inspectionTasks.find(t => t.id === id)) as InspectionTask | undefined;
  const inspectionLots = useQualityAdvancedStore(s => s.inspectionLots);

  // 操作历史：按检验任务生命周期合成（创建→开始检验→完成判定）
  const operationLogs = useMemo(() => {
    if (!task) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: task.createdBy, time: task.createdAt, description: '创建检验任务' },
    ];
    if (task.status !== 'pending') {
      logs.push({ id: 'op-start', action: 'info', operator: task.assignedTo, time: task.updatedAt, description: '开始执行检验' });
    }
    if (task.completedDate) {
      const action = task.status === 'failed' ? 'reject' : 'approve';
      logs.push({
        id: 'op-done',
        action,
        operator: task.assignedTo,
        time: task.completedDate,
        description: `检验完成，判定结论：${CONCLUSION_MAP[task.status] || task.status}`,
      });
    }
    return logs;
  }, [task]);

  if (!task) {
    return (
      <PageWrapper title="检验任务详情">
        <Alert severity="warning">检验任务不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/inspection')} sx={{ mt: 2 }}>返回检验列表</Button>
      </PageWrapper>
    );
  }

  const lot = task.inspectionLotId ? inspectionLots.find(l => l.id === task.inspectionLotId) : undefined;
  const defects = task.defectItems ?? [];
  const totalDefectQty = defects.reduce((s, d) => s + (d.quantity || 0), 0);

  const basicFields = [
    { label: '任务编号', value: task.taskNo },
    { label: '检验类型', value: TYPE_MAP[task.type] || task.type },
    { label: '物料编码', value: task.materialCode },
    { label: '物料名称', value: task.materialName },
    { label: '批次号', value: task.batchNo || '-' },
    { label: '供应商', value: task.vendorName || '-' },
    { label: '检验标准', value: task.inspectionStandardName || '-' },
    { label: '关联检验批', value: lot ? lot.lotNo : '-' },
    { label: '采购订单', value: task.purchaseOrderNo || '-' },
    { label: '工单号', value: task.workOrderNo || '-' },
    { label: '项目', value: task.projectName ? `${task.projectNo} · ${task.projectName}` : (task.projectNo || '-') },
    { label: '负责人', value: task.assignedTo || '-' },
    { label: '计划检验日期', value: formatDate(task.plannedDate) },
    { label: '完成日期', value: task.completedDate ? formatDate(task.completedDate) : '-' },
    { label: '状态', value: <StatusBadge status={STATUS_KEY[task.status]} /> },
    { label: '结论', value: task.conclusion || (task.completedDate ? CONCLUSION_MAP[task.status] || '-' : '-') },
  ];

  const aqlFields = [
    { label: '检验数量', value: task.quantity.toLocaleString() },
    { label: '样本数量', value: task.sampleQuantity.toLocaleString() },
    { label: 'AQL（接收质量限）', value: task.aql !== undefined ? `${task.aql}%` : '-' },
    { label: '检验水平', value: task.inspectionLevel || '-' },
    { label: '样本量字码', value: task.aqlCode || '-' },
    { label: '接收数 Ac', value: task.aqlAc !== undefined ? task.aqlAc : '-' },
    { label: '拒收数 Re', value: task.aqlRe !== undefined ? task.aqlRe : '-' },
    { label: '合格数量', value: task.passedQuantity !== undefined ? task.passedQuantity.toLocaleString() : '-' },
    { label: '不合格数量', value: task.failedQuantity !== undefined ? task.failedQuantity.toLocaleString() : '-' },
    { label: '缺陷总数', value: defects.length > 0 ? totalDefectQty.toLocaleString() : '-' },
  ];

  const headerFields = [
    { label: '检验类型', value: TYPE_MAP[task.type] || task.type },
    { label: '物料', value: `${task.materialCode} · ${task.materialName}` },
    { label: '批次', value: task.batchNo || '-' },
    { label: '结论', value: <StatusBadge status={STATUS_KEY[task.status]} /> },
  ];

  return (
    <ObjectPage docType="inspectionTask" entity={task}
      title={task.taskNo}
      subtitle={TYPE_MAP[task.type] || task.type}
      breadcrumbs={[{ label: '质量检验', path: '/quality/inspection' }, { label: task.taskNo, path: '' }]}
      status={<StatusBadge status={STATUS_KEY[task.status]} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          {(task.status === 'pending' || task.status === 'in_progress') && (
            <Button variant="contained" startIcon={<Assignment />}
              onClick={() => navigate(`/quality/inspection/${task.id}/execute`)}>执行检验</Button>
          )}
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/inspection')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        { id: 'aql', title: '抽样方案与结果', content: <DetailSection fields={aqlFields} /> },
        ...(defects.length > 0 ? [{
          id: 'defects',
          title: `缺陷明细（${defects.length} 项）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>缺陷明细</Typography>
              </Box>
              <DataTable
                data={defects}
                columns={[
                  { id: 'defectCode', header: '缺陷编码',
                    cell: ({ row }) => <Chip label={row.original.defectCode} size="small" variant="outlined" /> },
                  { id: 'defectName', header: '缺陷名称', accessorKey: 'defectName' },
                  { id: 'severity', header: '严重度',
                    cell: ({ row }) => {
                      const sev = SEVERITY_MAP[row.original.severity];
                      return sev ? <Chip label={sev.label} size="small" color={sev.color} variant="outlined" /> : '-';
                    } },
                  { id: 'quantity', header: '数量',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity.toLocaleString()}</Box> },
                  { id: 'description', header: '描述',
                    cell: ({ row }) => row.original.description || '-' },
                ]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
              />
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

export default InspectionTaskDetail;
