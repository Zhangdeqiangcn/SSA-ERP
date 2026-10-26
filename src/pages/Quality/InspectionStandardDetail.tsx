import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useQualityStore } from '@/stores/qualityStore';
import { InspectionStandard, InspectionItem } from '@/types/quality';
import { formatDate } from '@/utils/format';

const InspectionStandardDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const standard = useQualityStore((s) => s.inspectionStandards.find((x) => x.id === id)) as InspectionStandard | undefined;

  const items: InspectionItem[] = standard?.inspectionItems ?? [];
  const criticalCount = useMemo(() => items.filter((i) => i.isCritical).length, [items]);

  // 操作历史：创建 + 更新（更新时间与创建时间不同时追加）
  const operationLogs = useMemo(() => {
    if (!standard) return [];
    const logs: { id: string; action: 'create' | 'update'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: standard.createdBy, time: formatDate(standard.createdAt), description: '创建检验标准' },
    ];
    if (standard.updatedAt && standard.updatedAt !== standard.createdAt) {
      logs.push({ id: 'op-update', action: 'update', operator: standard.updatedBy, time: formatDate(standard.updatedAt), description: '更新检验标准' });
    }
    return logs;
  }, [standard]);

  if (!standard) {
    return (
      <PageWrapper title="检验标准详情">
        <Alert severity="warning">检验标准不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/standards')} sx={{ mt: 2 }}>返回检验标准列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '标准编号', value: standard.standardNo },
    { label: '标准名称', value: standard.name },
    { label: '物料类别', value: standard.materialCategory },
    { label: '版本', value: <Chip size="small" variant="outlined" label={standard.version} /> },
    { label: '状态', value: <StatusBadge status={standard.status} /> },
    { label: '描述', value: standard.description || '-' },
    { label: '创建人', value: standard.createdBy || '-' },
    { label: '创建时间', value: formatDate(standard.createdAt) },
    { label: '更新人', value: standard.updatedBy || '-' },
    { label: '更新时间', value: formatDate(standard.updatedAt) },
  ];

  const headerFields = [
    { label: '物料类别', value: standard.materialCategory },
    { label: '版本', value: standard.version },
    { label: '检验项目数', value: `${items.length} 项` },
    { label: '状态', value: <StatusBadge status={standard.status} /> },
  ];

  return (
    <ObjectPage docType="inspectionStandard" entity={standard}
      title={standard.standardNo}
      subtitle={standard.name}
      breadcrumbs={[{ label: '检验标准', path: '/quality/standards' }, { label: standard.standardNo, path: '' }]}
      status={<StatusBadge status={standard.status} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/standards')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        {
          id: 'items',
          title: '检验项目明细',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box
                sx={{
                  px: 2, py: 1.5,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: '1px solid', borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>检验项目明细</Typography>
                <Typography variant="body2" color="text.secondary">
                  共 {items.length} 项，其中关键 {criticalCount} 项
                </Typography>
              </Box>
              <DataTable
                data={items}
                columns={[
                  {
                    id: 'name', header: '检验项目',
                    cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.name}</Typography>,
                  },
                  { id: 'method', header: '检验方法', cell: ({ row }) => row.original.method || '-' },
                  { id: 'spec', header: '规格要求', cell: ({ row }) => row.original.spec || '-' },
                  { id: 'unit', header: '单位', cell: ({ row }) => row.original.unit || '-' },
                  {
                    id: 'lowerLimit', header: '下限',
                    cell: ({ row }) => (
                      <Box sx={{ textAlign: 'right' }}>
                        {row.original.lowerLimit !== undefined ? row.original.lowerLimit : '-'}
                      </Box>
                    ),
                  },
                  {
                    id: 'upperLimit', header: '上限',
                    cell: ({ row }) => (
                      <Box sx={{ textAlign: 'right' }}>
                        {row.original.upperLimit !== undefined ? row.original.upperLimit : '-'}
                      </Box>
                    ),
                  },
                  {
                    id: 'isCritical', header: '是否关键',
                    cell: ({ row }) => (row.original.isCritical
                      ? <Chip label="关键" size="small" color="error" />
                      : '-'),
                  },
                ]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                emptyText="暂无检验项目"
              />
            </Paper>
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

export default InspectionStandardDetail;
