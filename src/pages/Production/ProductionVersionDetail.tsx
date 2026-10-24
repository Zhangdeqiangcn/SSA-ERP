import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useProductionVersionStore } from '@/stores/productionVersionStore';
import { ProductionVersion } from '@/types/production';
import { formatDate } from '@/utils/format';

/**
 * 生产版本详情（V3.110.0 三域改造·生产域）
 * 与 ProcessRouteDetail 同构：ObjectPage 外壳 + DetailSection + OperationTimeline。
 * 状态一律走通用键 StatusBadge（draft/active/obsolete 均已登记）。
 * 注：ECN（productionVersionStore.ecns）无指向 ProductionVersion 的直接关联字段
 * （无 versionId/linkedVersion，仅 materialId/bomId/oldVersion/newVersion），
 * 按改造规范不硬造关联，故本页不展示「关联 ECN 列表」区。
 */

/** 可点击编号链接（只读跳转，样式与 ProcessRouteDetail 工单号链接一致） */
const NoLink: React.FC<{ text: string; onClick: () => void; title?: string }> = ({ text, onClick, title }) => (
  <Typography
    variant="body2"
    title={title}
    sx={{ fontFamily: 'monospace', color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
    onClick={onClick}
  >{text}</Typography>
);

const ProductionVersionDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const version = useProductionVersionStore((s) => s.versions.find((v) => v.id === id)) as ProductionVersion | undefined;

  // 操作历史：按版本生命周期合成（创建→发布生效→停用）
  const operationLogs = useMemo(() => {
    if (!version) return [];
    const logs: { id: string; action: 'create' | 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: version.createdBy || '-', time: version.createdAt, description: `创建生产版本 ${version.version}` },
    ];
    if (version.status === 'active') {
      logs.push({ id: 'op-active', action: 'approve', operator: version.updatedBy || '-', time: version.effectiveDate || version.updatedAt, description: '版本发布生效' });
    }
    if (version.status === 'obsolete') {
      logs.push({ id: 'op-obsolete', action: 'reject', operator: version.updatedBy || '-', time: version.updatedAt, description: '版本停用作废' });
    }
    return logs;
  }, [version]);

  if (!version) {
    return (
      <PageWrapper title="生产版本详情">
        <Alert severity="warning">生产版本不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/versions')} sx={{ mt: 2 }}>返回生产版本列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '版本号', value: <Chip label={version.version} size="small" variant="outlined" /> },
    { label: '物料编码', value: version.materialCode },
    { label: '物料名称', value: version.materialName },
    { label: 'BOM 编号', value: version.bomNo || '-' },
    { label: '工艺路线编号', value: version.routeNo || '-' },
    { label: '生效日期', value: formatDate(version.effectiveDate) },
    { label: '状态', value: <StatusBadge status={version.status} /> },
    { label: '备注', value: version.note || '-' },
    { label: '创建人', value: version.createdBy || '-' },
    { label: '创建时间', value: formatDate(version.createdAt) },
    { label: '更新人', value: version.updatedBy || '-' },
    { label: '更新时间', value: formatDate(version.updatedAt) },
  ];

  const relationFields = [
    {
      label: '关联 BOM',
      value: version.bomNo
        ? <NoLink text={version.bomNo} title={`BOM ID：${version.bomId}`} onClick={() => navigate(`/bom/${version.bomId}`)} />
        : '-',
    },
    {
      label: '关联工艺路线',
      value: version.routeNo
        ? <NoLink text={version.routeNo} title={`工艺路线 ID：${version.routeId}`} onClick={() => navigate(`/production/routes/${version.routeId}`)} />
        : '-',
    },
  ];

  return (
    <ObjectPage
      title={version.version}
      subtitle={`${version.materialCode} · ${version.materialName}`}
      breadcrumbs={[{ label: '生产版本', path: '/production/versions' }]}
      status={<StatusBadge status={version.status} />}
      headerFields={[
        { label: '物料名称', value: version.materialName },
        { label: 'BOM', value: version.bomNo || '-' },
        { label: '工艺路线', value: version.routeNo || '-' },
        { label: '生效日期', value: formatDate(version.effectiveDate) },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/versions')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        {
          id: 'relations',
          title: '关联 BOM 与工艺路线',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <DetailSection fields={relationFields} columns={2} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                生产版本 = 物料 + BOM + 工艺路线 的组合；点击编号可跳转对应详情页（只读）。
              </Typography>
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

export default ProductionVersionDetail;
