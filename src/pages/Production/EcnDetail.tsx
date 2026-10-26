import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useECNStore } from '@/stores/ecnStore';
import { useProductionVersionStore } from '@/stores/productionVersionStore';
import { EngineeringChange, EngineeringChangeType } from '@/types/material';
import { ECN as ProductionECN } from '@/types/production';
import { formatDate, formatDateTime } from '@/utils/format';

/** 变更类型中文名（与 ECNList CHANGE_TYPE_LABELS 保持一致） */
const CHANGE_TYPE_LABELS: Record<EngineeringChangeType, string> = {
  material: '物料',
  bom: 'BOM',
  routing: '工艺路线',
};

const EcnDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const ecn = useECNStore((s) => s.ecns.find((e) => e.id === id)) as EngineeringChange | undefined;
  // 生产域 ECN 全量（用于按 linkedEcnIds 筛选关联记录）
  const prodEcns = useProductionVersionStore((s) => s.ecns);

  // 关联的生产域 ECN（P0-4 双向引用对侧）
  const linkedEcns = useMemo(() => {
    if (!ecn) return [];
    return prodEcns.filter((p) => (ecn.linkedEcnIds || []).includes(p.id));
  }, [ecn, prodEcns]);

  // 操作历史：按工程变更生命周期合成（创建→批准→执行/取消）
  const operationLogs = useMemo(() => {
    if (!ecn) return [];
    const logs: { id: string; action: 'create' | 'update' | 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: '-', time: formatDateTime(ecn.createdAt), description: `创建工程变更单 ${ecn.changeNo}` },
    ];
    if (ecn.status === 'approved') {
      logs.push({ id: 'op-approved', action: 'approve', operator: ecn.approvedBy || '-', time: formatDateTime(ecn.updatedAt), description: '变更批准通过' });
    }
    if (ecn.status === 'implemented') {
      logs.push({ id: 'op-approved', action: 'approve', operator: ecn.approvedBy || '-', time: formatDateTime(ecn.updatedAt), description: '变更批准通过' });
      logs.push({ id: 'op-implemented', action: 'info', operator: '-', time: formatDateTime(ecn.updatedAt), description: '变更执行完成，版本已切换' });
    }
    if (ecn.status === 'cancelled') {
      logs.push({ id: 'op-cancelled', action: 'reject', operator: '-', time: formatDateTime(ecn.updatedAt), description: '变更已取消' });
    }
    return logs;
  }, [ecn]);

  if (!ecn) {
    return (
      <PageWrapper title="工程变更详情">
        <Alert severity="warning">工程变更单不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/ecn')} sx={{ mt: 2 }}>返回工程变更列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '变更编号', value: ecn.changeNo },
    { label: '标题', value: ecn.title },
    { label: '状态', value: <StatusBadge status={ecn.status} /> },
    { label: '变更类型', value: CHANGE_TYPE_LABELS[ecn.changeType] || ecn.changeType },
    { label: '关联物料', value: ecn.materialName || ecn.materialId || '-' },
    { label: '生效日期', value: formatDate(ecn.effectiveDate) },
    { label: '批准人', value: ecn.approvedBy || '-' },
    { label: '创建时间', value: formatDate(ecn.createdAt) },
    { label: '更新时间', value: formatDate(ecn.updatedAt) },
  ];

  const hasChangeContent = Boolean(ecn.oldValue || ecn.newValue);
  const hasVersionChange = Boolean(ecn.fromVersion || ecn.toVersion);

  return (
    <ObjectPage docType="ecn" entity={ecn}
      title={ecn.changeNo}
      subtitle={ecn.title}
      breadcrumbs={[{ label: '工程变更', path: '/production/ecn' }]}
      status={<StatusBadge status={ecn.status} />}
      headerFields={[
        { label: '变更类型', value: CHANGE_TYPE_LABELS[ecn.changeType] || ecn.changeType },
        { label: '关联物料', value: ecn.materialName || ecn.materialId || '-' },
        { label: '生效日期', value: formatDate(ecn.effectiveDate) },
        { label: '批准人', value: ecn.approvedBy || '-' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/ecn')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        ...(hasChangeContent ? [{
          id: 'content',
          title: '变更内容',
          content: (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>变更前</Typography>
                  <Typography variant="body2">{ecn.oldValue || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>变更后</Typography>
                  <Typography variant="body2">{ecn.newValue || '-'}</Typography>
                </Box>
              </Stack>
            </Paper>
          ),
        }] : []),
        ...(hasVersionChange ? [{
          id: 'version',
          title: '版本变更对比',
          content: (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Chip label={ecn.fromVersion || '-'} variant="outlined" />
                <ArrowForward color="action" />
                <Chip label={ecn.toVersion || '-'} color="primary" />
                <Typography variant="caption" color="text.secondary">
                  {`生效日期：${formatDate(ecn.effectiveDate)}`}
                </Typography>
              </Stack>
            </Paper>
          ),
        }] : []),
        ...(linkedEcns.length > 0 ? [{
          id: 'linked',
          title: `关联生产 ECN（${linkedEcns.length}）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <DataTable<ProductionECN>
                data={linkedEcns}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  {
                    id: 'changeNo', header: '变更单号',
                    cell: ({ row }) => (
                      <Chip label={row.original.changeNo} size="small" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }} />
                    ),
                  },
                  { id: 'title', header: '标题', accessorKey: 'title' },
                  {
                    id: 'material', header: '关联物料',
                    cell: ({ row }) => (
                      <Box>
                        <Typography variant="body2">{row.original.materialName || row.original.materialId}</Typography>
                        {row.original.materialCode && (
                          <Typography variant="caption" color="text.secondary">{row.original.materialCode}</Typography>
                        )}
                      </Box>
                    ),
                  },
                  {
                    id: 'version', header: '版本变更',
                    cell: ({ row }) => (
                      <Typography variant="body2">{`${row.original.oldVersion} → ${row.original.newVersion}`}</Typography>
                    ),
                  },
                  {
                    id: 'status', header: '状态',
                    cell: ({ row }) => <StatusBadge status={row.original.status} />,
                  },
                ]}
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

export default EcnDetail;
