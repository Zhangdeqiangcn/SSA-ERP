import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useFMEAStore, FMEA } from '@/stores/fmeaStore';
import { formatDate } from '@/utils/format';

/**
 * RPN 风险分档着色（数值分档，非枚举状态）：与 FMEA 列表页口径统一——
 * ≥200 严重（error）/ ≥100 中（warning）/ 其余 低（success）。
 * 返回 MUI 语义色名（主题令牌），不写 '#hex'。
 */
const RPN_COLOR = (rpn: number): 'error' | 'warning' | 'success' => {
  if (rpn >= 200) return 'error';
  if (rpn >= 100) return 'warning';
  return 'success';
};

const FMEADetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fmea = useFMEAStore((s) => s.items.find((x) => x.id === id)) as FMEA | undefined;

  // 失效模式分析行：当前数据模型为「一条 FMEA 记录 = 一条失效模式分析行」（扁平结构，无子表数组）
  const rows = useMemo(() => (fmea ? [fmea] : []), [fmea]);

  // RPN 汇总：行数 / 平均 RPN / 最高 RPN
  const rpnSummary = useMemo(() => {
    if (rows.length === 0) return { count: 0, avg: 0, max: 0 };
    const max = Math.max(...rows.map((r) => r.rpn));
    const avg = Math.round(rows.reduce((s, r) => s + r.rpn, 0) / rows.length);
    return { count: rows.length, avg, max };
  }, [rows]);

  // 操作历史：创建 + 更新（更新时间与创建时间不同时追加）
  const operationLogs = useMemo(() => {
    if (!fmea) return [];
    const logs: { id: string; action: 'create' | 'update'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: fmea.createdBy, time: formatDate(fmea.createdAt), description: '创建 FMEA 分析记录' },
    ];
    if (fmea.updatedAt && fmea.updatedAt !== fmea.createdAt) {
      logs.push({ id: 'op-update', action: 'update', operator: fmea.updatedBy, time: formatDate(fmea.updatedAt), description: '更新 FMEA 分析记录' });
    }
    return logs;
  }, [fmea]);

  if (!fmea) {
    return (
      <PageWrapper title="FMEA 详情">
        <Alert severity="warning">FMEA 记录不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/fmea')} sx={{ mt: 2 }}>返回 FMEA 列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '编号', value: fmea.number },
    { label: '项目', value: fmea.item },
    { label: '功能', value: fmea.function || '-' },
    { label: '关联物料', value: fmea.materialName || '-' },
    { label: '建议措施', value: fmea.recommendedAction || '-' },
    { label: '状态', value: <StatusBadge status={fmea.status} /> },
    { label: '创建人', value: fmea.createdBy || '-' },
    { label: '创建时间', value: formatDate(fmea.createdAt) },
    { label: '更新人', value: fmea.updatedBy || '-' },
    { label: '更新时间', value: formatDate(fmea.updatedAt) },
  ];

  const headerFields = [
    { label: '项目', value: fmea.item },
    { label: '失效模式', value: fmea.failureMode },
    {
      label: 'RPN',
      value: (
        <Chip
          size="small"
          label={fmea.rpn}
          color={RPN_COLOR(fmea.rpn)}
          sx={{ fontWeight: 700, minWidth: 50 }}
        />
      ),
    },
    { label: '状态', value: <StatusBadge status={fmea.status} /> },
  ];

  const rpnSummaryFields = [
    { label: '失效模式行数', value: rpnSummary.count },
    { label: '平均 RPN', value: rpnSummary.avg },
    {
      label: '最高 RPN',
      value: (
        <Typography component="span" sx={{ fontWeight: 700, color: rpnSummary.max === 0 ? 'text.primary' : `${RPN_COLOR(rpnSummary.max)}.main` }}>
          {rpnSummary.max}
        </Typography>
      ),
    },
  ];

  return (
    <ObjectPage
      title={fmea.number}
      subtitle={fmea.item}
      breadcrumbs={[{ label: 'FMEA 分析', path: '/quality/fmea' }, { label: fmea.number, path: '' }]}
      status={<StatusBadge status={fmea.status} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/fmea')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        {
          id: 'failure-modes',
          title: '失效模式分析',
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>失效模式分析明细</Typography>
              </Box>
              <DataTable
                data={rows}
                columns={[
                  {
                    id: 'failureMode', header: '失效模式',
                    cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.failureMode}</Typography>,
                  },
                  { id: 'effect', header: '失效后果', cell: ({ row }) => row.original.effect || '-' },
                  { id: 'cause', header: '失效原因', cell: ({ row }) => row.original.cause || '-' },
                  { id: 'currentControl', header: '现行控制措施', cell: ({ row }) => row.original.currentControl || '-' },
                  {
                    id: 'severity', header: 'S',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center', fontWeight: 700 }}>{row.original.severity}</Box>,
                  },
                  {
                    id: 'occurrence', header: 'O',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center', fontWeight: 700 }}>{row.original.occurrence}</Box>,
                  },
                  {
                    id: 'detection', header: 'D',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center', fontWeight: 700 }}>{row.original.detection}</Box>,
                  },
                  {
                    id: 'rpn', header: 'RPN',
                    cell: ({ row }) => (
                      <Box sx={{ textAlign: 'center' }}>
                        <Chip
                          size="small"
                          label={row.original.rpn}
                          color={RPN_COLOR(row.original.rpn)}
                          sx={{ fontWeight: 700, minWidth: 50 }}
                        />
                      </Box>
                    ),
                  },
                ]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
              />
            </Paper>
          ),
        },
        { id: 'rpn-summary', title: 'RPN 汇总', content: <DetailSection fields={rpnSummaryFields} /> },
        ...(operationLogs.length > 0 ? [{
          id: 'logs',
          title: '操作历史',
          content: <OperationTimeline events={operationLogs} />,
        }] : []),
      ]}
    />
  );
};

export default FMEADetail;
