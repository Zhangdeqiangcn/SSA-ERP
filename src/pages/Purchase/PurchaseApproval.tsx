import React, { useState, useMemo } from 'react';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, Tabs, Tab,
} from '@mui/material';
import {
  CheckCircle, Cancel, Description, Person, AccountBalance,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, FlowTracker } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { applyColumnFilters } from '@/utils/listSearch';
import { withRelatedDocNos } from '@/utils/relations/documentRelations';
import { buildRelatedColumns } from '@/components/common/relatedColumns';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useAuthStore } from '@/stores/authStore';
import { getApprovalSteps, resolveApprovalAdvance, type ApprovalFlowNode } from '@/data/approvalFlowConfig';
import type { PurchaseRequest } from '@/types';
import { formatDate } from '@/utils/format';

const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  draft:    { label: '草稿', color: 'default' },
  pending:  { label: '待审批', color: 'info' },
  reviewing:{ label: '审核中', color: 'warning' },
  approved: { label: '已批准', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  ordered:  { label: '已下单', color: 'success' },
};

const PURCHASE_MODULE = 'purchase_request';

type StepRole = { id: string; name: string; role: string; roleName: string };

const ApprovalDialog: React.FC<{
  open: boolean;
  req: PurchaseRequest | null;
  steps: StepRole[];
  canAct: boolean;
  onClose: () => void;
  onAdvance: (comment: string) => void;
  onReject: (comment: string) => void;
}> = ({ open, req, steps, canAct, onClose, onAdvance, onReject }) => {
  const [comment, setComment] = useState('');
  const [tab, setTab] = useState(0);
  if (!req) return null;

  const currentStep = req.currentStep ?? 0;
  const step = steps[currentStep];
  const isLastStep = currentStep >= steps.length - 1;
  const inProgress = ['pending', 'reviewing'].includes(req.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Description />
          <Box>
            {req.title}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{req.requestNo}</Typography>
          </Box>
          <Chip label={statusMap[req.status]?.label} size="small" color={statusMap[req.status]?.color} />
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <FlowTracker module="purchase-request" currentStatus={step?.id || steps[0]?.id || 'pr-1'} documentNo={req.requestNo} />
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: '1px solid rgba(226,232,240,.8)', px: 3 }}>
          <Tab icon={<Description sx={{ fontSize: 16 }} />} iconPosition="start" label="申请信息" />
          <Tab icon={<Person sx={{ fontSize: 16 }} />} iconPosition="start" label="物料清单" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {tab === 0 && (
            <Grid container spacing={2}>
              {[
                ['申请人', req.applicant], ['部门', req.department],
                ['类型', req.type === 'material' ? '物料' : '服务'], ['优先级', req.priority],
                ['需求日期', req.expectedDate], ['预算金额', req.totalAmount != null ? `¥${req.totalAmount}` : '-'],
                ['项目', req.projectName || '-'], ['事由', req.reason],
              ].map(([label, value]) => (
                <Grid item xs={6} key={String(label)}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{value}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
          {tab === 1 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell>物料</TableCell>
                    <TableCell>数量</TableCell>
                    <TableCell>预估单价</TableCell>
                    <TableCell>预估金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {req.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.materialName || it.materialCode}</TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{it.estimatedPrice != null ? `¥${it.estimatedPrice}` : '-'}</TableCell>
                      <TableCell>{it.estimatedAmount != null ? `¥${it.estimatedAmount}` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        {!inProgress ? (
          <Alert severity="info">该申请已{statusMap[req.status]?.label}，审批流程结束。</Alert>
        ) : !canAct ? (
          <Alert severity="info">当前角色无「{step?.name}」步骤的审批权限，仅可查看。</Alert>
        ) : (
          <>
            <Typography variant="subtitle2" fontWeight={600}>
              当前步骤：{step?.name}
              <Chip sx={{ ml: 1 }} size="small" label={step?.roleName} color="primary" variant="outlined" />
            </Typography>
            <TextField size="small" label="审批意见" multiline rows={2}
              value={comment} onChange={(e) => setComment(e.target.value)} />
            {!isLastStep ? (
              <Button variant="contained" startIcon={<CheckCircle />}
                data-testid="purchase-approve-btn" onClick={() => { onAdvance(comment); onClose(); }}>
                提交下一步
              </Button>
            ) : (
              <Button variant="contained" color="success" startIcon={<CheckCircle />}
                data-testid="purchase-approve-btn" onClick={() => { onAdvance(comment); onClose(); }}>
                批准
              </Button>
            )}
            <Button variant="outlined" color="error" startIcon={<Cancel />}
              data-testid="purchase-reject-btn" onClick={() => { onReject(comment); onClose(); }}>
              拒绝
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

const PurchaseApproval: React.FC = () => {
  const { purchaseRequests, updatePurchaseRequest } = usePurchaseStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<PurchaseRequest | null>(null);
  useEnsureRelatedStores('purchaseRequest');

  const steps = useMemo<ApprovalFlowNode[]>(() => {
    const cfg = getApprovalSteps(PURCHASE_MODULE);
    return cfg.length
      ? cfg
      : [{ id: 'default', name: '审批', role: 'admin', roleName: '系统管理员', order: 1 } as ApprovalFlowNode];
  }, []);

  const currentUser = useAuthStore((s) => s.currentUser);

  const canAct = useMemo(() => {
    if (!selected || !currentUser) return false;
    const step = steps[selected.currentStep ?? 0];
    return !!step && (
      currentUser.role === step.role ||
      currentUser.role === 'admin' ||
      useAuthStore.getState().hasPermission('purchase.approve')
    );
  }, [selected, steps, currentUser]);

  const handleAdvance = (comment: string) => {
    if (!selected) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const currentStep = selected.currentStep ?? 0;
    // B7-3：运行时条件执行——依据金额上下文计算真正的下一步（默认配置无 skipRule，等价于 currentStep + 1）
    const { nextStep, autoApprovedNodes } = resolveApprovalAdvance(
      PURCHASE_MODULE, currentStep, steps, { amount: selected.totalAmount ?? 0 }
    );
    const isLast = nextStep >= steps.length;
    const step = steps[currentStep];
    // 被自动通过的节点：追加系统自动审批记录（默认配置为空，不改变既有行为）
    const autoRecords = autoApprovedNodes.map((n) => ({
      id: `ar-auto-${Date.now()}-${n.id}`, approver: '系统自动', action: 'approve' as const,
      comments: `命中自动通过规则（${n.name}）`, operatedAt: now,
    }));
    const records = [
      ...(selected.approvalRecords || []),
      ...autoRecords,
      { id: `ar-${Date.now()}`, approver: currentUser?.name || 'admin', action: 'approve' as const, comments: comment, operatedAt: now },
    ];
    if (!isLast) {
      updatePurchaseRequest(selected.id, {
        status: 'pending',
        currentStep: nextStep,
        approvalRecords: records,
      });
    } else {
      updatePurchaseRequest(selected.id, { status: 'approved', approvalRecords: records });
    }
  };

  const handleReject = (comment: string) => {
    if (!selected) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const step = steps[selected.currentStep ?? 0];
    const records = [...(selected.approvalRecords || []), { id: `ar-${Date.now()}`, approver: currentUser?.name || 'admin', action: 'reject' as const, comments: comment, operatedAt: now }];
    updatePurchaseRequest(selected.id, { status: 'rejected', approvalRecords: records });
  };

  const columns = useMemo(() => [
    { accessorKey: 'requestNo', header: '申请单号', meta: { searchable: true },
      cell: ({ row }: { row: { original: PurchaseRequest } }) =>
        <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>{row.original.requestNo}</Typography> },
    { accessorKey: 'title', header: '标题', meta: { searchable: true }, cell: ({ row }: { row: { original: PurchaseRequest } }) =>
      <Typography variant="body2" fontWeight={500}>{row.original.title}</Typography> },
    { accessorKey: 'applicant', header: '申请人', meta: { searchable: true }, cell: ({ row }: { row: { original: PurchaseRequest } }) =>
      <Typography variant="body2">{row.original.applicant}</Typography> },
    { accessorKey: 'department', header: '部门', meta: { searchable: true }, cell: ({ row }: { row: { original: PurchaseRequest } }) =>
      <Typography variant="body2">{row.original.department}</Typography> },
    { accessorKey: 'currentStep', header: '当前步骤',
      cell: ({ row }: { row: { original: PurchaseRequest } }) => {
        const step = steps[row.original.currentStep ?? 0];
        return <Chip label={step?.name || '审批'} size="small" color="info" variant="outlined" sx={{ fontSize: '0.7rem' }} />;
      } },
    { accessorKey: 'status', header: '状态', meta: { searchable: true },
      cell: ({ row }: { row: { original: PurchaseRequest } }) => {
        const s = statusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} />;
      } },
    { accessorKey: 'expectedDate', header: '需求日期', meta: { searchable: true }, cell: ({ row }: { row: { original: PurchaseRequest } }) => formatDate(row.original.expectedDate) },
    // V3.113.0 上下游关联单号：默认隐藏（hiddenColumns），但 meta.searchable 进检索、列设置可释放；
    // 单元格渲染为可点击链接（RelatedDocLinks），详情页同源可点跳转。
    ...(buildRelatedColumns() as ColumnDef<PurchaseRequest, unknown>[]),
  ], [steps]);

  const filterFields = [
    { name: 'title', label: '标题', type: 'text' as const },
    { name: 'status', label: '状态', type: 'select' as const, options: [
      { value: '', label: '全部' },
      { value: 'pending', label: '待审批' },
      { value: 'reviewing', label: '审核中' },
      { value: 'approved', label: '已批准' },
      { value: 'rejected', label: '已拒绝' },
    ] },
  ];

  // 业务预过滤（仅待审批/审核中）+ 通用列检索（覆盖全部 meta.searchable 列，按字段权限门控）
  const filteredData = useMemo(() => {
    const base = purchaseRequests.filter((r) => ['pending', 'reviewing'].includes(r.status));
    return applyColumnFilters(withRelatedDocNos('purchaseRequest', base), columns, filterData, { module: 'purchase' });
  }, [filterData, purchaseRequests, columns]);

  return (
    <PageWrapper title="采购申请审批">
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          审批流程（{steps.length} 步，按设置中心配置驱动）
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <Typography variant="caption" sx={{ color: '#94A3B8', mx: 0.5 }}>→</Typography>}
              <Chip icon={<AccountBalance sx={{ fontSize: 14 }} />} label={`${s.name}（${s.roleName}）`} size="small"
                color={i === 0 ? 'primary' : 'default'} variant="outlined" sx={{ fontSize: '0.72rem', height: 24 }} />
            </React.Fragment>
          ))}
        </Box>
      </Paper>

      <FilterBar fields={filterFields} columns={columns} module="purchase" onSearch={setFilterData} />
      <DataTable data={filteredData} columns={columns} enablePagination enableExport
        hiddenColumns={['upstreamNo', 'downstreamNo']}
        columnConfigKey="purchase-approval-list"
        onView={(row: PurchaseRequest) => setSelected(row)} onEdit={(row: PurchaseRequest) => setSelected(row)} />
      <ApprovalDialog open={Boolean(selected)} req={selected} steps={steps} canAct={canAct}
        onClose={() => setSelected(null)} onAdvance={handleAdvance} onReject={handleReject} />
    </PageWrapper>
  );
};

export default PurchaseApproval;
