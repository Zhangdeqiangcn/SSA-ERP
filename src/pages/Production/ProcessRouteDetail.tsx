import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack, Route } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useProductionStore } from '@/stores/productionStore';
import { ProcessRoute, ProcessRouteStatus, Operation } from '@/types';
import { formatDate } from '@/utils/format';

/** 状态键：draft/active 复用通用键；obsolete 用工艺路线专属键（与 ProcessRouteList 一致） */
const ROUTE_STATUS_KEY: Record<ProcessRouteStatus, string> = {
  draft: 'draft', active: 'active', obsolete: 'route_obsolete',
};

/** 分钟数格式化：不足 1 小时按分钟显示，否则按小时显示（保留一位小数） */
const fmtMinutes = (min: number): string => {
  if (!min) return '-';
  return min < 60 ? `${min} 分钟` : `${(min / 60).toFixed(1)} 小时`;
};

const ProcessRouteDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const route = useProductionStore(s => s.processRoutes.find(r => r.id === id)) as ProcessRoute | undefined;
  // 引用本工艺路线的工单（用于展示使用方与互跳入口）
  const workOrders = useProductionStore(s => s.workOrders);

  // 引用本路线的工单（未删除/未关闭的在前）
  const relatedWorkOrders = useMemo(() => {
    if (!route) return [];
    return workOrders
      .filter(w => w.routeId === route.id || w.routeNo === route.routeNo)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [route, workOrders]);

  // 操作历史：按工艺路线生命周期合成（创建→版本发布/停用）
  const operationLogs = useMemo(() => {
    if (!route) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: route.createdBy || '-', time: route.createdAt, description: `创建工艺路线 ${route.routeNo}` },
    ];
    if (route.status === 'active') {
      logs.push({ id: 'op-active', action: 'approve', operator: route.updatedBy || '-', time: route.updatedAt, description: '路线发布生效' });
    }
    if (route.status === 'obsolete') {
      logs.push({ id: 'op-obsolete', action: 'reject', operator: route.updatedBy || '-', time: route.updatedAt, description: '路线停用废弃' });
    }
    return logs;
  }, [route]);

  if (!route) {
    return (
      <PageWrapper title="工艺路线详情">
        <Alert severity="warning">工艺路线不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/routes')} sx={{ mt: 2 }}>返回工艺路线列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '路线编号', value: route.routeNo },
    { label: '路线名称', value: route.name },
    { label: '状态', value: <StatusBadge status={ROUTE_STATUS_KEY[route.status]} /> },
    { label: '版本', value: <Chip label={route.version} size="small" variant="outlined" /> },
    { label: '产品编码', value: route.productCode },
    { label: '产品名称', value: route.productName },
    { label: '标准工时', value: `${route.totalLeadTime} 小时` },
    { label: '工序数量', value: `${route.operations.length} 道` },
    { label: '创建时间', value: formatDate(route.createdAt) },
    { label: '更新时间', value: formatDate(route.updatedAt) },
  ];

  return (
    <ObjectPage
      title={route.routeNo}
      subtitle={`${route.name} · ${route.productName}`}
      breadcrumbs={[{ label: '工艺路线', path: '/production/routes' }]}
      status={<StatusBadge status={ROUTE_STATUS_KEY[route.status]} />}
      headerFields={[
        { label: '路线名称', value: route.name },
        { label: '版本', value: route.version },
        { label: '产品', value: route.productName },
        { label: '标准工时', value: `${route.totalLeadTime} 小时` },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/routes')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        {
          id: 'operations',
          title: `工序明细（${route.operations.length} 道）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>工序列表（按 sequence 升序执行）</Typography>
              </Box>
              <DataTable
                data={[...route.operations].sort((a, b) => a.sequence - b.sequence)}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  { id: 'sequence', header: '序号', accessorKey: 'sequence',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center', fontWeight: 600 }}>{(row.original as Operation).sequence / 10}</Box> },
                  { id: 'operationCode', header: '工序编码',
                    cell: ({ row }) => <Chip label={(row.original as Operation).operationCode} size="small" sx={{ fontSize: '0.75rem', bgcolor: 'info.light', color: 'info.contrastText', fontFamily: 'monospace' }} /> },
                  { id: 'operationName', header: '工序名称', accessorKey: 'operationName',
                    cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{(row.original as Operation).operationName}</Box> },
                  { id: 'workCenter', header: '工作中心', accessorKey: 'workCenter' },
                  { id: 'setupTime', header: '准备时间',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{fmtMinutes((row.original as Operation).setupTime)}</Box> },
                  { id: 'runTime', header: '运行时间',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{(row.original as Operation).runTime} 分/件</Box> },
                  { id: 'waitTime', header: '等待时间',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{fmtMinutes((row.original as Operation).waitTime)}</Box> },
                  { id: 'skills', header: '技能要求',
                    cell: ({ row }) => {
                      const skills = (row.original as Operation).skills;
                      return skills && skills.length > 0 ? skills.join('、') : '-';
                    } },
                ]}
              />
            </Paper>
          ),
        },
        ...(relatedWorkOrders.length > 0 ? [{
          id: 'workorders',
          title: `引用本路线的工单（${relatedWorkOrders.length}）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <DataTable
                data={relatedWorkOrders}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  { id: 'orderNo', header: '工单号',
                    cell: ({ row }) => (
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        onClick={() => navigate(`/production/orders/${row.original.id}`)}
                      >{row.original.orderNo}</Typography>
                    ) },
                  { id: 'productName', header: '产品', accessorKey: 'productName' },
                  { id: 'plannedQuantity', header: '计划数量', accessorKey: 'plannedQuantity',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.plannedQuantity.toLocaleString()}</Box> },
                  { id: 'status', header: '状态',
                    cell: ({ row }) => <StatusBadge status={row.original.status === 'in_progress' ? 'wo_in_progress' : row.original.status} /> },
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

export default ProcessRouteDetail;
