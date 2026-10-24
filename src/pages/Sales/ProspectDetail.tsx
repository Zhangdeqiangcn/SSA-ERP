import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, Stack, Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useSalesStore } from '@/stores/salesStore';
import { Prospect, ProspectSource } from '@/types';
import { formatCurrency } from '@/utils/format';

const SOURCE_LABEL: Record<ProspectSource, string> = {
  web: '官网', exhibition: '展会', referral: '转介绍', cold_call: '电话拜访', advertise: '广告', other: '其他',
};
const METHOD_LABEL: Record<string, string> = {
  phone: '电话', email: '邮件', visit: '拜访', meeting: '会议', other: '其他',
};

const ProspectDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const prospects = useSalesStore((s) => s.prospects);
  const prospect = prospects.find((x) => x.id === id) as Prospect | undefined;

  if (!prospect) {
    return (
      <PageWrapper title="商机详情">
        <Alert severity="warning">商机不存在，请返回列表重新选择。</Alert>
      </PageWrapper>
    );
  }

  const basicFields = [
    { label: '商机编号', value: <Chip label={prospect.prospectNo} size="small" sx={{ fontFamily: 'monospace', bgcolor: '#F0FDF4', color: '#16A34A' }} /> },
    { label: '状态', value: <StatusBadge status={prospect.status} /> },
    { label: '公司名称', value: prospect.companyName },
    { label: '联系人', value: prospect.contactName },
    { label: '联系电话', value: prospect.contactPhone || '-' },
    { label: '联系邮箱', value: prospect.contactEmail || '-' },
    { label: '行业', value: prospect.industry || '-' },
    { label: '区域', value: prospect.region || '-' },
    { label: '来源', value: SOURCE_LABEL[prospect.source] || prospect.source },
    { label: '预估金额', value: prospect.estimatedValue != null ? formatCurrency(prospect.estimatedValue) : '-' },
    { label: '成交概率', value: prospect.probability != null ? `${prospect.probability}%` : '-' },
    { label: '下次跟进', value: prospect.nextFollowupDate || '-' },
    { label: '负责人', value: prospect.assignedTo || '-' },
    { label: '是否转化客户', value: prospect.convertedToCustomer ? '已转化' : '未转化' },
    { label: '信用额度', value: prospect.creditLimit != null ? formatCurrency(prospect.creditLimit) : '-' },
    { label: '已用信用', value: prospect.usedCredit != null ? formatCurrency(prospect.usedCredit) : '-' },
    { label: '备注', value: prospect.notes || '-' },
  ];

  const productsBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>意向产品</Typography>
      {prospect.interestProducts && prospect.interestProducts.length > 0 ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {prospect.interestProducts.map((p, i) => (
            <Chip key={i} label={p} size="small" variant="outlined" color="primary" />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">暂无意向产品</Typography>
      )}
    </Paper>
  );

  const followupBlock = (
    <Paper elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(226,232,240,.6)' }}>
        <Typography variant="subtitle2" fontWeight={600}>跟进记录</Typography>
      </Box>
      {prospect.followupRecords && prospect.followupRecords.length > 0 ? (
        <DataTable
          data={prospect.followupRecords}
          enablePagination={false}
          enableRowSelection={false}
          sapStyle
          columns={[
            { id: 'date', header: '日期', accessorKey: 'date' },
            { id: 'method', header: '方式', accessorKey: 'method', cell: ({ row }) => <Chip size="small" label={METHOD_LABEL[row.original.method] || row.original.method} /> },
            { id: 'content', header: '内容', accessorKey: 'content' },
            { id: 'result', header: '结果', accessorKey: 'result' },
            { id: 'nextAction', header: '下一步', accessorKey: 'nextAction', cell: ({ row }) => <Box sx={{ color: '#3B82F6' }}>{row.original.nextAction || '-'}</Box> },
            { id: 'followedBy', header: '跟进人', accessorKey: 'followedBy' },
          ]}
        />
      ) : (
        <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">暂无跟进记录</Typography></Box>
      )}
    </Paper>
  );

  const operationLogs = [
    { id: 'op-1', action: 'info' as const, operator: prospect.assignedTo || '系统', time: prospect.createdAt, description: '创建商机' },
    ...(prospect.updatedAt && prospect.updatedAt !== prospect.createdAt
      ? [{ id: 'op-2', action: 'update' as const, operator: prospect.updatedBy || '系统', time: prospect.updatedAt, description: '更新商机' }]
      : []),
  ];

  const logsBlock = (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>操作历史</Typography>
      <OperationTimeline events={operationLogs} />
    </Box>
  );

  const sections = [
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} columns={2} /> },
    { id: 'products', title: '意向产品', content: productsBlock },
    { id: 'followups', title: '跟进记录', content: followupBlock },
    { id: 'logs', title: '操作历史', content: logsBlock },
  ];

  return (
    <ObjectPage
      title={prospect.prospectNo}
      subtitle={prospect.companyName}
      breadcrumbs={[{ label: '商机列表', path: '/sales/prospects' }]}
      status={<StatusBadge status={prospect.status} />}
      headerFields={[
        { label: '公司', value: prospect.companyName },
        { label: '联系人', value: prospect.contactName },
        { label: '预估金额', value: prospect.estimatedValue != null ? formatCurrency(prospect.estimatedValue) : '-' },
        { label: '成交概率', value: prospect.probability != null ? `${prospect.probability}%` : '-' },
      ]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/sales/prospects')}>返回</Button>
        </Stack>
      }
      sections={sections}
    />
  );
};

export default ProspectDetail;
