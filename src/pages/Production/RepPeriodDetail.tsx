import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Paper, Typography, Chip, LinearProgress, Alert, Stack } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useRepetitiveMfgStore } from '@/stores/repetitiveMfgStore';
import { RepetitiveMfgPeriod, RepPeriodStatus, BackflushItem } from '@/types/repetitiveMfg';
import { formatDate } from '@/utils/format';

/** 周期状态 → StatusBadge key（与 RepetitiveMfgList 的 PERIOD_STATUS_KEY 一致） */
const PERIOD_STATUS_KEY: Record<RepPeriodStatus, string> = {
  active: 'rep_period_active', closed: 'rep_period_closed',
};

const RepPeriodDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const period = useRepetitiveMfgStore(s => s.periods.find(p => p.id === id)) as RepetitiveMfgPeriod | undefined;

  // 进度概览：完成率 = 已产 / 计划；合格率 =（已产 - 报废）/ 已产
  const completionPct = useMemo(() => {
    if (!period || !period.plannedQty) return 0;
    return Math.min(100, Math.round((period.producedQty / period.plannedQty) * 100));
  }, [period]);
  const yieldPct = useMemo(() => {
    if (!period || !period.producedQty) return null;
    return ((period.producedQty - period.scrapQty) / period.producedQty) * 100;
  }, [period]);

  // 操作历史：按周期生命周期合成（周期开始→产出汇报→周期关闭）
  const operationLogs = useMemo(() => {
    if (!period) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-start', action: 'info', operator: period.createdBy || '-', time: formatDate(period.startDate || period.createdAt), description: `周期开始（${formatDate(period.startDate)} ~ ${formatDate(period.endDate)}）` },
    ];
    if (period.producedQty > 0) {
      logs.push({
        id: 'op-report',
        action: 'approve',
        operator: period.updatedBy || '-',
        time: formatDate(period.updatedAt),
        description: `产量汇报：累计已产 ${period.producedQty.toLocaleString()} 件${period.scrapQty > 0 ? `，报废 ${period.scrapQty.toLocaleString()} 件` : ''}`,
      });
    }
    if (period.status === 'closed') {
      logs.push({ id: 'op-close', action: 'approve', operator: period.updatedBy || '-', time: formatDate(period.updatedAt), description: '周期已关闭' });
    }
    return logs;
  }, [period]);

  if (!period) {
    return (
      <PageWrapper title="重复制造周期详情">
        <Alert severity="warning">重复制造周期不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/repetitive')} sx={{ mt: 2 }}>返回重复制造列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '周期编号', value: <Typography variant="body2" fontWeight={600} fontFamily="monospace">{period.periodNo}</Typography> },
    { label: '生产线', value: `${period.lineNo} · ${period.lineName}` },
    { label: '产出物料', value: `${period.materialCode} · ${period.materialName}` },
    { label: '开始日期', value: formatDate(period.startDate) },
    { label: '结束日期', value: formatDate(period.endDate) },
    { label: '计划产量', value: period.plannedQty.toLocaleString() },
    { label: '已产数量', value: period.producedQty.toLocaleString() },
    { label: '报废数量', value: period.scrapQty.toLocaleString() },
    { label: '状态', value: <StatusBadge status={PERIOD_STATUS_KEY[period.status]} /> },
    { label: '创建时间', value: formatDate(period.createdAt) },
    { label: '备注', value: period.note || '-' },
  ];

  return (
    <ObjectPage
      title={period.periodNo}
      subtitle={`${period.lineNo} · ${period.lineName} · ${period.materialName}`}
      breadcrumbs={[{ label: '重复制造', path: '/production/repetitive' }]}
      status={<StatusBadge status={PERIOD_STATUS_KEY[period.status]} />}
      headerFields={[
        { label: '生产线', value: `${period.lineNo} · ${period.lineName}` },
        { label: '产出物料', value: period.materialName },
        { label: '周期区间', value: `${formatDate(period.startDate)} ~ ${formatDate(period.endDate)}` },
        { label: '完成率', value: `${completionPct}%` },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/repetitive')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        {
          id: 'progress',
          title: '进度概览',
          content: (
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
                  <Typography variant="h3" fontWeight={700} color="primary">{completionPct}%</Typography>
                  <Typography variant="body2" color="text.secondary">计划完成率</Typography>
                </Box>
                <LinearProgress variant="determinate" value={completionPct} sx={{ my: 1.5, height: 8, borderRadius: 4 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">已产：{period.producedQty.toLocaleString()} 件</Typography>
                  <Typography variant="caption" color="text.secondary">计划：{period.plannedQty.toLocaleString()} 件</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    合格率：{yieldPct === null ? '-' : `${yieldPct.toFixed(1)}%`}
                  </Typography>
                  {period.scrapQty > 0 && (
                    <Typography variant="caption" color="error">报废：{period.scrapQty.toLocaleString()} 件</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ),
        },
        {
          id: 'backflush',
          title: `倒冲明细（${period.backflushItems.length} 项）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <DataTable
                data={period.backflushItems as BackflushItem[]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
                columns={[
                  { id: 'materialCode', header: '物料编码',
                    cell: ({ row }) => (
                      <Chip label={row.original.materialCode} size="small" sx={{ fontSize: '0.75rem', bgcolor: 'info.light', color: 'info.contrastText', fontFamily: 'monospace' }} />
                    ) },
                  { id: 'materialName', header: '物料名称', accessorKey: 'materialName',
                    cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.materialName}</Box> },
                  { id: 'unit', header: '单位', accessorKey: 'unit',
                    cell: ({ row }) => <Box sx={{ textAlign: 'center' }}>{row.original.unit}</Box> },
                  { id: 'stdQty', header: '标准耗用', accessorKey: 'stdQty',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.stdQty.toLocaleString()}</Box> },
                  { id: 'consumedQty', header: '实际耗用', accessorKey: 'consumedQty',
                    cell: ({ row }) => <Box sx={{ textAlign: 'right', fontWeight: 500 }}>{row.original.consumedQty.toLocaleString()}</Box> },
                  { id: 'diff', header: '差异（实际-标准）',
                    cell: ({ row }) => {
                      const diff = row.original.consumedQty - row.original.stdQty;
                      return (
                        <Box sx={{ textAlign: 'right', fontWeight: 600, color: diff > 0 ? 'error.main' : diff < 0 ? 'success.main' : 'text.secondary' }}>
                          {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                        </Box>
                      );
                    } },
                ]}
              />
              {period.backflushItems.length === 0 && (
                <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">暂无倒冲记录</Typography>
                </Box>
              )}
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

export default RepPeriodDetail;
