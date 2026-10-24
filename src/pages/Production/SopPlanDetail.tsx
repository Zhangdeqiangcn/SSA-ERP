import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Alert, Stack, Card, CardContent, LinearProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline } from '@/components/common';
import { useSopStore } from '@/stores/sopStore';
import { SopPlan, SopStatus } from '@/types/sop';
import { formatDate, formatDateTime } from '@/utils/format';

/** 状态键映射（与 SopPlan 列表页 SOP_STATUS_KEY 保持一致：draft/approved 复用通用键，balanced/executing 用 sop_ 前缀专属键） */
const SOP_STATUS_KEY: Record<SopStatus, string> = {
  draft: 'draft', balanced: 'sop_balanced', approved: 'approved', executing: 'sop_executing',
};

const SopPlanDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const plan = useSopStore((s) => s.items.find((p) => p.id === id)) as SopPlan | undefined;
  const load = useSopStore((s) => s.load);

  // D1 权威源：挂载即拉取（离线/Mock 兜底），支持深链直达
  useEffect(() => {
    load();
  }, [load]);

  // 操作历史：按 S&OP 计划生命周期合成（创建→更新→状态流转）
  const operationLogs = useMemo(() => {
    if (!plan) return [];
    const logs: { id: string; action: 'create' | 'update' | 'approve' | 'info'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'create', operator: plan.createdBy || '-', time: formatDateTime(plan.createdAt), description: `创建 S&OP 计划 ${plan.planNo}（计划期 ${plan.period}）` },
    ];
    if (plan.updatedAt && plan.updatedAt !== plan.createdAt) {
      logs.push({ id: 'op-update', action: 'update', operator: plan.updatedBy || '-', time: formatDateTime(plan.updatedAt), description: '计划信息更新' });
    }
    if (plan.status === 'balanced') {
      logs.push({ id: 'op-balanced', action: 'info', operator: plan.updatedBy || '-', time: formatDateTime(plan.updatedAt), description: '需求与供应完成平衡校正' });
    }
    if (plan.status === 'approved') {
      logs.push({ id: 'op-approved', action: 'approve', operator: plan.updatedBy || '-', time: formatDateTime(plan.updatedAt), description: '计划批准通过' });
    }
    if (plan.status === 'executing') {
      logs.push({ id: 'op-executing', action: 'approve', operator: plan.updatedBy || '-', time: formatDateTime(plan.updatedAt), description: '计划进入执行阶段' });
    }
    return logs;
  }, [plan]);

  if (!plan) {
    return (
      <PageWrapper title="S&OP 计划详情">
        <Alert severity="warning">S&OP 计划不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/production/sop')} sx={{ mt: 2 }}>返回 S&OP 计划列表</Button>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '计划号', value: plan.planNo },
    { label: '计划期', value: plan.period },
    { label: '状态', value: <StatusBadge status={SOP_STATUS_KEY[plan.status]} /> },
    { label: '责任人', value: plan.owner },
    { label: '需求预测（吨）', value: plan.demandForecast.toLocaleString() },
    { label: '供应计划（吨）', value: plan.supplyPlan.toLocaleString() },
    { label: '产销平衡差（吨）', value: `${plan.balanceQty >= 0 ? '+' : ''}${plan.balanceQty.toLocaleString()}` },
    { label: '备注', value: plan.remark || '-' },
    { label: '创建人', value: plan.createdBy || '-' },
    { label: '创建时间', value: formatDate(plan.createdAt) },
    { label: '最后更新人', value: plan.updatedBy || '-' },
    { label: '更新时间', value: formatDate(plan.updatedAt) },
  ];

  // 供需平衡概览：供应覆盖率 = 供应计划 / 需求预测（封顶 100% 用于进度条）
  const coveragePct = plan.demandForecast > 0
    ? Math.min(Math.round((plan.supplyPlan / plan.demandForecast) * 100), 100)
    : 0;
  const surplus = plan.balanceQty >= 0;

  return (
    <ObjectPage
      title={plan.planNo}
      subtitle={`计划期 ${plan.period} · 责任人 ${plan.owner}`}
      breadcrumbs={[{ label: 'S&OP 计划', path: '/production/sop' }]}
      status={<StatusBadge status={SOP_STATUS_KEY[plan.status]} />}
      headerFields={[
        { label: '计划期', value: plan.period },
        { label: '责任人', value: plan.owner },
        { label: '需求预测', value: `${plan.demandForecast.toLocaleString()} 吨` },
        { label: '供应计划', value: `${plan.supplyPlan.toLocaleString()} 吨` },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/production/sop')}>返回</Button>
        </Stack>
      }
      sections={[
        {
          id: 'basic',
          title: '基本信息',
          content: <DetailSection fields={basicFields} columns={2} />,
        },
        {
          id: 'balance',
          title: '供需平衡概览',
          content: (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">需求预测</Typography>
                    <Typography variant="body2" fontWeight={600}>{plan.demandForecast.toLocaleString()} 吨</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">供应计划</Typography>
                    <Typography variant="body2" fontWeight={600}>{plan.supplyPlan.toLocaleString()} 吨</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">产销平衡差</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: surplus ? 'success.main' : 'error.main' }}>
                      {surplus ? '+' : ''}{plan.balanceQty.toLocaleString()} 吨
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={coveragePct} sx={{ my: 1, height: 8, borderRadius: 4 }} />
                  <Typography variant="caption" color="text.secondary">供应覆盖率 {coveragePct}%（供应计划 / 需求预测）</Typography>
                  <Typography variant="body2" sx={{ color: surplus ? 'success.main' : 'error.main' }}>
                    {surplus
                      ? '供应充足：产销平衡差为正，供应能力可覆盖需求预测。'
                      : '供应缺口：产销平衡差为负，需调整供应计划或需求预测。'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
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

export default SopPlanDetail;
