import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Chip, Alert, Stack } from '@mui/material';
import { ArrowBack, AutoFixHigh, Lock } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, StatusBadge, OperationTimeline, DataTable } from '@/components/common';
import { useQualityStore } from '@/stores/qualityStore';
import { PDCARecord, PDCAStatus, UnqualifiedItem } from '@/types';
import { formatDate } from '@/utils/format';

/** PDCA/CAPA 状态 → StatusBadge key（与 PDCAList 的 PDCA_KEY 保持一致） */
const PDCA_STATUS_KEY: Record<PDCAStatus, string> = {
  plan: 'pdca_plan', do: 'pdca_do', check: 'pdca_check', act: 'pdca_act',
  closed: 'closed', open: 'pdca_open', in_progress: 'in_progress', verified: 'verified',
};

const UnqualifiedDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const item = useQualityStore(s => s.unqualifiedItems.find(u => u.id === id)) as UnqualifiedItem | undefined;
  const pdcaRecords = useQualityStore(s => s.pdcaRecords);
  const updateUnqualifiedItem = useQualityStore(s => s.updateUnqualifiedItem);
  const addPdcaRecord = useQualityStore(s => s.addPdcaRecord);

  const [capaSuccess, setCapaSuccess] = useState('');

  // NCR → CAPA：创建关联 PDCA 并把 NCR 闭环状态推进为「已发起CAPA」
  // （逻辑自 UnqualifiedList 详情弹窗的「生成 CAPA」按钮原样迁移）
  const handleGenerateCapa = (target: UnqualifiedItem) => {
    const newId = `pdca-${Date.now()}`;
    const pdcaNo = `CAPA-${Date.now().toString().slice(-8)}`;
    addPdcaRecord({
      id: newId,
      pdcaNo,
      title: `NCR纠正措施 - ${target.itemNo}`,
      status: 'open',
      source: 'inspection',
      relatedItemId: target.id,
      priority: 'high',
      problemDescription: target.defectDescription || '由不合格品报告(NCR)触发',
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      owner: target.responsiblePerson || '质量工程师',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    });
    updateUnqualifiedItem(target.id, { status: 'capa_raised' });
    setCapaSuccess(`已为 NCR ${target.itemNo} 生成 CAPA ${pdcaNo}，NCR 状态已更新为「已发起CAPA」。`);
  };

  // 关联的 CAPA / PDCA（按 relatedItemId 反查）
  const relatedPdcas = useMemo(
    () => (item ? pdcaRecords.filter(r => r.relatedItemId === item.id) : []),
    [item, pdcaRecords]
  );

  // 操作历史：按 NCR 生命周期合成（创建→处置→关闭）
  const operationLogs = useMemo(() => {
    if (!item) return [];
    const logs: { id: string; action: 'approve' | 'reject' | 'info' | 'update'; operator: string; time: string; description: string }[] = [
      { id: 'op-create', action: 'info', operator: item.createdBy, time: item.createdAt, description: '创建不合格品记录（NCR）' },
    ];
    if (item.dispositionStatus === 'completed' || item.completedDate) {
      logs.push({
        id: 'op-dispose',
        action: 'approve',
        operator: item.responsiblePerson,
        time: item.completedDate || item.updatedAt,
        description: '不合格品处置完成',
      });
    }
    if (item.status === 'closed') {
      logs.push({
        id: 'op-close',
        action: 'approve',
        operator: item.updatedBy || item.responsiblePerson,
        time: item.completedDate || item.updatedAt,
        description: 'NCR 已关闭',
      });
    }
    return logs;
  }, [item]);

  if (!item) {
    return (
      <PageWrapper title="不合格品详情">
        <Alert severity="warning">不合格品记录不存在，请返回列表重新选择。</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/quality/unqualified')} sx={{ mt: 2 }}>返回不合格品列表</Button>
      </PageWrapper>
    );
  }

  const approvalRecords = item.approvalRecords ?? [];

  const basicFields = [
    { label: '记录号', value: <Typography variant="body2" fontWeight={600} fontFamily="monospace">{item.itemNo}</Typography> },
    { label: '物料', value: `${item.materialCode} · ${item.materialName}` },
    { label: '批次号', value: item.batchNo || '-' },
    { label: '不合格数量', value: <Typography variant="body2" fontWeight={600} color="error">{item.defectQuantity} 件</Typography> },
    { label: '来源任务', value: item.inspectionTaskNo || '-' },
    { label: '处置方式', value: <StatusBadge status={item.disposition} /> },
    { label: '处置进度', value: <StatusBadge status={item.dispositionStatus} /> },
    { label: '负责人', value: item.responsiblePerson || '-' },
    { label: '截止日期', value: formatDate(item.dueDate) },
    { label: '闭环状态', value: <StatusBadge status={`unq_${item.status || 'open'}`} /> },
    { label: '缺陷描述', value: item.defectDescription || '-' },
    { label: '创建人', value: item.createdBy },
    { label: '创建时间', value: formatDate(item.createdAt) },
    { label: '最后更新', value: formatDate(item.updatedAt) },
  ];

  const headerFields = [
    { label: '物料', value: `${item.materialCode} · ${item.materialName}` },
    { label: '批次', value: item.batchNo || '-' },
    { label: '不合格数量', value: <Typography variant="body2" fontWeight={700} color="error">{item.defectQuantity} 件</Typography> },
    { label: '闭环状态', value: <StatusBadge status={`unq_${item.status || 'open'}`} /> },
  ];

  return (
    <ObjectPage
      title={item.itemNo}
      subtitle="不合格品报告（NCR）"
      breadcrumbs={[{ label: '不合格品管理', path: '/quality/unqualified' }]}
      status={<StatusBadge status={`unq_${item.status || 'open'}`} />}
      headerFields={headerFields}
      actions={
        <Stack direction="row" spacing={1}>
          {item.status !== 'closed' && (
            <Button variant="contained" color="error" startIcon={<Lock />}
              onClick={() => updateUnqualifiedItem(item.id, { status: 'closed' })}>关闭</Button>
          )}
          <Button variant="contained" startIcon={<AutoFixHigh />}
            onClick={() => handleGenerateCapa(item)}>生成 CAPA</Button>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/quality/unqualified')}>返回</Button>
        </Stack>
      }
      sections={[
        { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} /> },
        ...(approvalRecords.length > 0 ? [{
          id: 'approvals',
          title: `审批记录（${approvalRecords.length} 条）`,
          content: (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <DataTable
                data={approvalRecords}
                columns={[
                  { id: 'nodeName', header: '节点', cell: ({ row }) => row.original.nodeName || '-' },
                  { id: 'approver', header: '审批人', accessorKey: 'approver' },
                  {
                    id: 'action', header: '结论',
                    cell: ({ row }) => (
                      row.original.action === 'approve'
                        ? <Chip label="通过" size="small" color="success" variant="outlined" />
                        : <Chip label="驳回" size="small" color="error" variant="outlined" />
                    ),
                  },
                  { id: 'comments', header: '意见', cell: ({ row }) => row.original.comments || '-' },
                  { id: 'operatedAt', header: '时间', cell: ({ row }) => formatDate(row.original.operatedAt) },
                ]}
                enablePagination={false}
                enableRowSelection={false}
                sapStyle
              />
            </Paper>
          ),
        }] : []),
        {
          id: 'capa',
          title: '关联的 CAPA / PDCA 纠正措施',
          content: (
            <Box>
              {capaSuccess && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCapaSuccess('')}>{capaSuccess}</Alert>
              )}
              {relatedPdcas.length === 0 ? (
                <Alert severity="info">该 NCR 尚未关联 CAPA，可点击右上角「生成 CAPA」创建纠正措施。</Alert>
              ) : (
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <DataTable
                    data={relatedPdcas as PDCARecord[]}
                    columns={[
                      {
                        id: 'pdcaNo', header: 'CAPA 编号',
                        cell: ({ row }) => (
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, color: 'primary.main', fontFamily: 'monospace', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => navigate(`/quality/pdca/${row.original.id}`)}
                          >
                            {row.original.pdcaNo}
                          </Typography>
                        ),
                      },
                      { id: 'title', header: '标题', cell: ({ row }) => row.original.title },
                      { id: 'status', header: '状态', cell: ({ row }) => <StatusBadge status={PDCA_STATUS_KEY[row.original.status]} /> },
                      { id: 'owner', header: '负责人', accessorKey: 'owner' },
                      { id: 'targetDate', header: '目标日期', cell: ({ row }) => formatDate(row.original.targetDate) },
                    ]}
                    enablePagination={false}
                    enableRowSelection={false}
                    sapStyle
                  />
                </Paper>
              )}
            </Box>
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

export default UnqualifiedDetail;
