import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Chip, LinearProgress, Alert, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
} from '@mui/material';
import { ArrowBack, Edit } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useQualityStore } from '@/stores/qualityStore';
import { PDCAStatus, PDCARecord } from '@/types';
import { formatDate } from '@/utils/format';

const PDCA_STEPS: PDCAStatus[] = ['plan', 'do', 'check', 'act', 'closed'];
const CAPA_STEPS: PDCAStatus[] = ['open', 'in_progress', 'verified', 'closed'];
const PDCA_STEP_LABELS: Record<PDCAStatus, string> = {
  plan: 'P - 计划',
  do: 'D - 执行',
  check: 'C - 检查',
  act: 'A - 改进',
  closed: '已关闭',
  open: '待处理',
  in_progress: '进行中',
  verified: '已验证',
};
// 状态 → 中央 StatusBadge key（与 PDCAList 的 PDCA_KEY 保持一致）
const PDCA_KEY: Record<PDCAStatus, string> = {
  plan: 'pdca_plan', do: 'pdca_do', check: 'pdca_check', act: 'pdca_act',
  closed: 'closed', open: 'pdca_open', in_progress: 'in_progress', verified: 'verified',
};
// 状态 → 主题令牌（供进度条填充等非 Chip 场景使用，杜绝 '#hex'）
const PDCA_TOKEN: Record<PDCAStatus, string> = {
  plan: 'primary.main', do: 'warning.main', check: 'secondary.main', act: 'success.main',
  closed: 'grey.400', open: 'error.main', in_progress: 'primary.main', verified: 'success.main',
};
const SOURCE_LABELS: Record<string, string> = {
  inspection: '检验发现',
  customer_complaint: '客户投诉',
  internal_audit: '内部审核',
  other: '其他',
};

const PDCADetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useQualityStore(s => s.pdcaRecords.find(r => r.id === id)) as PDCARecord | undefined;
  const unqualifiedItems = useQualityStore(s => s.unqualifiedItems);
  const updatePdcaRecord = useQualityStore(s => s.updatePdcaRecord);
  const updateUnqualifiedItem = useQualityStore(s => s.updateUnqualifiedItem);

  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    correctiveAction: '', preventiveAction: '', verificationResult: '',
  });
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  // 判断是否为 CAPA 模式
  const isCapaRecord = (r: PDCARecord) =>
    r.status === 'open' || r.status === 'in_progress' || r.status === 'verified';

  // 计算进度
  const getProgress = (r: PDCARecord): number => {
    const steps = isCapaRecord(r) ? CAPA_STEPS : PDCA_STEPS;
    const idx = steps.indexOf(r.status);
    return r.status === 'closed' ? 100 : Math.round((idx / (steps.length - 1)) * 100);
  };

  // 获取状态流转的可选值
  const getAvailableStatuses = (r: PDCARecord): { value: PDCAStatus; label: string }[] => {
    if (isCapaRecord(r)) {
      const flow: PDCAStatus[] = ['open', 'in_progress', 'verified', 'closed'];
      const idx = flow.indexOf(r.status);
      return flow.slice(idx + 1).map(s => ({ value: s, label: PDCA_STEP_LABELS[s] }));
    }
    const idx = PDCA_STEPS.indexOf(r.status);
    return PDCA_STEPS.slice(idx + 1).map(s => ({ value: s, label: PDCA_STEP_LABELS[s] }));
  };

  // 打开编辑（预填当前值）
  const handleOpenEdit = (r: PDCARecord) => {
    setEditForm({
      correctiveAction: r.correctiveAction || '',
      preventiveAction: r.preventiveAction || '',
      verificationResult: r.verificationResult || '',
    });
    setEditDialog(true);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!record) return;
    updatePdcaRecord(record.id, {
      ...editForm,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    });
    setSnackbarMsg('已保存');
    setSnackbar(true);
    setEditDialog(false);
  };

  // CAPA 状态流转（验证通过后自动关闭关联不合格品）
  const handleStatusChange = (r: PDCARecord, newStatus: PDCAStatus) => {
    updatePdcaRecord(r.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    });

    if (newStatus === 'verified' && r.relatedItemId) {
      updateUnqualifiedItem(r.relatedItemId, { status: 'closed' });
      setSnackbarMsg(`CAPA ${r.pdcaNo} 已验证通过，关联 NCR 已自动关闭`);
    } else if (newStatus === 'closed') {
      setSnackbarMsg(`CAPA ${r.pdcaNo} 已关闭`);
    }
    setSnackbar(true);
  };

  // 操作历史：按改进项生命周期合成（创建→阶段推进→验证→关闭）
  const operationLogs = useMemo(() => {
    if (!record) return [];
    const capa = isCapaRecord(record);
    const initial: PDCAStatus = capa ? 'open' : 'plan';
    const logs: { id: string; action: 'approve' | 'reject' | 'info' | 'update'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: record.createdBy, time: record.createdAt, description: capa ? '创建 CAPA 纠正措施' : '创建 PDCA 改进项' },
    ];
    if (record.status !== initial && record.status !== 'closed') {
      logs.push({
        id: 'op-progress',
        action: 'update',
        operator: record.updatedBy,
        time: record.updatedAt,
        description: `状态推进至「${PDCA_STEP_LABELS[record.status]}」`,
      });
    }
    if (record.status === 'verified') {
      logs.push({ id: 'op-verified', action: 'approve', operator: record.updatedBy, time: record.updatedAt, description: '措施验证通过' });
    }
    if (record.status === 'closed') {
      logs.push({
        id: 'op-closed',
        action: 'approve',
        operator: record.updatedBy,
        time: record.closedDate || record.updatedAt,
        description: '改进项已关闭',
      });
    }
    return logs;
  }, [record]);

  if (!record) {
    return (
      <PageWrapper title="PDCA / CAPA 详情">
        <Alert severity="warning">改进项不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/pdca')} sx={{ mt: 2 }}>返回改进列表</Button>
      </PageWrapper>
    );
  }

  const linkedNcr = record.relatedItemId
    ? unqualifiedItems.find(u => u.id === record.relatedItemId)
    : undefined;
  const actionItems = record.actionItems ?? [];
  const progress = getProgress(record);
  const availableStatuses = getAvailableStatuses(record);

  const basicFields = [
    {
      label: '编号',
      value: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.disabled' }}>{record.pdcaNo}</Typography>
          <StatusBadge status={PDCA_KEY[record.status]} />
          {isCapaRecord(record) && (
            <Chip label="CAPA" size="small" sx={{ bgcolor: 'info.light', color: 'info.contrastText', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.65rem' }} />
          )}
        </Box>
      ),
    },
    { label: '优先级', value: <StatusBadge status={record.priority} /> },
    { label: '来源', value: SOURCE_LABELS[record.source] || record.source },
    {
      label: '关联NCR',
      value: linkedNcr ? (
        <Typography
          variant="body2"
          sx={{ color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={() => navigate(`/quality/unqualified/${linkedNcr.id}`)}
        >
          {linkedNcr.itemNo}
        </Typography>
      ) : '-',
    },
    { label: '负责人', value: record.owner || '-' },
    { label: '目标日期', value: formatDate(record.targetDate) },
    { label: '创建人', value: record.createdBy },
    { label: '创建时间', value: formatDate(record.createdAt) },
    { label: '最后更新', value: formatDate(record.updatedAt) },
  ];

  const headerFields = [
    { label: '标题', value: record.title },
    { label: '优先级', value: <StatusBadge status={record.priority} /> },
    { label: '来源', value: SOURCE_LABELS[record.source] || record.source },
    { label: '负责人', value: record.owner || '-' },
    { label: '目标日期', value: formatDate(record.targetDate) },
    { label: '进度', value: `${progress}%` },
  ];

  return (
    <>
      <ObjectPage docType="pdca" entity={record}
        title={record.pdcaNo}
        subtitle={record.title}
        breadcrumbs={[{ label: 'PDCA 质量改进 / CAPA', path: '/quality/pdca' }]}
        status={<StatusBadge status={PDCA_KEY[record.status]} />}
        headerFields={headerFields}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<Edit />} onClick={() => handleOpenEdit(record)}>编辑</Button>
            {availableStatuses.map((s) => (
              <Button key={s.value} size="small" variant="outlined"
                sx={{
                  borderColor: PDCA_TOKEN[s.value], color: PDCA_TOKEN[s.value],
                  fontSize: '0.7rem', py: 0.3, px: 1, minWidth: 'auto',
                  '&:hover': { bgcolor: PDCA_TOKEN[s.value], borderColor: PDCA_TOKEN[s.value] },
                }}
                onClick={() => handleStatusChange(record, s.value)}>
                {s.label}
              </Button>
            ))}
            <Button variant="outlined" startIcon={<ArrowBack />}
              onClick={() => navigate('/quality/pdca')}>返回</Button>
          </Stack>
        }
        sections={[
          { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
          {
            id: 'problem',
            title: '问题描述',
            content: (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>{record.title}</Typography>
                <Typography variant="body2" sx={{ color: '#64748B' }}>{record.problemDescription || '-'}</Typography>
              </Box>
            ),
          },
          {
            id: 'progress',
            title: '改进进度',
            content: (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>进度</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>{progress}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: PDCA_TOKEN[record.status], borderRadius: 3 } }}
                  />
                </Box>
              </Box>
            ),
          },
          ...(record.correctiveAction || record.preventiveAction || record.verificationResult ? [{
            id: 'measures',
            title: '纠正与预防措施',
            content: (
              <Box>
                {record.correctiveAction && (
                  <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 600 }}>纠正措施：</Typography>
                    <Typography variant="body2" sx={{ color: '#1E40AF', mt: 0.5 }}>{record.correctiveAction}</Typography>
                  </Box>
                )}
                {record.preventiveAction && (
                  <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600 }}>预防措施：</Typography>
                    <Typography variant="body2" sx={{ color: '#166534', mt: 0.5 }}>{record.preventiveAction}</Typography>
                  </Box>
                )}
                {record.verificationResult && (
                  <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#FFF7ED', border: '1px solid #FDE68A' }}>
                    <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>验证结果：</Typography>
                    <Typography variant="body2" sx={{ color: '#92400E', mt: 0.5 }}>{record.verificationResult}</Typography>
                  </Box>
                )}
              </Box>
            ),
          }] : []),
          ...(actionItems.length > 0 ? [{
            id: 'action-items',
            title: `行动计划（${actionItems.length} 项）`,
            content: (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <DataTable
                  data={actionItems}
                  columns={[
                    { id: 'description', header: '行动计划', cell: ({ row }) => <Box sx={{ fontWeight: 500 }}>{row.original.description}</Box> },
                    { id: 'owner', header: '负责人', accessorKey: 'owner' },
                    { id: 'dueDate', header: '完成日期', cell: ({ row }) => formatDate(row.original.dueDate) },
                    { id: 'status', header: '状态', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
                  ]}
                  enablePagination={false}
                  enableRowSelection={false}
                  sapStyle
                />
              </Paper>
            ),
          }] : []),
          ...(record.rootCause ? [{
            id: 'root-cause',
            title: '根本原因分析',
            content: (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#FFF7ED', border: '1px solid #FDE68A' }}>
                <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>根本原因分析：</Typography>
                <Typography variant="body2" sx={{ color: '#92400E', mt: 0.5 }}>{record.rootCause}</Typography>
              </Box>
            ),
          }] : []),
          ...(operationLogs.length > 0 ? [{
            id: 'logs',
            title: '操作历史',
            content: <OperationTimeline events={operationLogs} />,
          }] : []),
        ]}
      />

      {/* 编辑对话框（自 PDCAList 行内编辑迁移） */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          编辑 {record.pdcaNo} - {record.title}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="纠正措施" multiline rows={3} fullWidth value={editForm.correctiveAction}
              placeholder="描述为消除已发现的不合格所采取的措施..."
              onChange={(e) => setEditForm({ ...editForm, correctiveAction: e.target.value })} />
            <TextField label="预防措施" multiline rows={3} fullWidth value={editForm.preventiveAction}
              placeholder="描述为消除潜在不合格原因所采取的措施..."
              onChange={(e) => setEditForm({ ...editForm, preventiveAction: e.target.value })} />
            <TextField label="验证结果" multiline rows={3} fullWidth value={editForm.verificationResult}
              placeholder="描述措施有效性的验证结果..."
              onChange={(e) => setEditForm({ ...editForm, verificationResult: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar} autoHideDuration={3000} onClose={() => setSnackbar(false)} message={snackbarMsg} />
    </>
  );
};

export default PDCADetail;
