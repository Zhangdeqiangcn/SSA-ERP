import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip, Button, Stack, Box, Snackbar, Alert } from '@mui/material';
import { Add, EditNote, DeleteOutline } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, ActionBar, FlowTracker,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { PriceApproval } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { notify } from '@/utils/notify';
import { approvalStatusColor, approvalStatusLabel, approvalStatusOptions } from '@/constants/approvalEnums';
import { useTypedRelated } from '@/utils/relations/useTypedRelated';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';

const ApprovalList: React.FC = () => {
  const { priceApprovals, updatePriceApproval, deletePriceApproval } = usePriceStore();
  const navigate = useNavigate();
  useEnsureRelatedStores('priceApproval');
  // ── 删除 / 批量修改 / 提示 ──
  const [deleteTargets, setDeleteTargets] = useState<PriceApproval[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<PriceApproval[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const columns: ColumnDef<PriceApproval, unknown>[] = useMemo(() => [
    { accessorKey: 'approvalNo', header: '审批单号', size: 160 },
    { accessorKey: 'comparisonNo', header: '比价单号', size: 160 },
    { accessorKey: 'inquiryNo', header: '询价单号', size: 160 },
    { accessorKey: 'title', header: '标题', size: 200 },
    { accessorKey: 'applicant', header: '申请人', size: 80 },
    {
      accessorKey: 'totalAmount',
      header: '审批金额',
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    { accessorKey: 'applicationDate', header: '申请日期', cell: ({ row }) => formatDate(row.original.applicationDate) },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip label={approvalStatusLabel('price_approval', row.original.status)} size="small"
          color={approvalStatusColor('price_approval', row.original.status)} />
      ),
    },
    // V3.113.0 上下游关联单号：默认隐藏（hiddenColumns），但 meta.searchable 进检索、列设置可释放；
    // 单元格渲染为可点击链接（RelatedDocLinks），详情页同源可点跳转。
  ], []);

  // ── 批量修改可改字段（对应详情页可编辑项）──
  const APPROVAL_BATCH_FIELDS: BatchEditField[] = [
    {
      key: 'status', label: '状态', type: 'select',
      options: approvalStatusOptions('price_approval'),
    },
    { key: 'title', label: '标题', type: 'text' },
    { key: 'applicant', label: '申请人', type: 'text' },
    { key: 'applicationDate', label: '申请日期', type: 'text' },
    { key: 'remarks', label: '备注', type: 'text' },
  ];

  // V3.119.0：关联单据改用 useTypedRelated，按真实单据类型分列、单号+状态、点单号直达。
  // 原 buildRelatedColumns() 只产出「来源单据/后续单据」两列且被 hiddenColumns 默认隐藏。
  const rel = useTypedRelated('priceApproval', priceApprovals);
  const allColumns = useMemo(
    () => [...columns, ...(rel.columns as ColumnDef<PriceApproval, unknown>[])],
    [columns, rel.columns]
  );

  // ── 批量导入：表头 → 字段 别名映射（中英文均可），按单号匹配，命中则更新、未命中跳过 ──
  const APPROVAL_IMPORT_ALIASES: Record<string, string> = {
    审批单号: 'approvalNo', approvalNo: 'approvalNo',
    比价单号: 'comparisonNo', comparisonNo: 'comparisonNo',
    询价单号: 'inquiryNo', inquiryNo: 'inquiryNo',
    标题: 'title', title: 'title',
    申请人: 'applicant', applicant: 'applicant',
    申请日期: 'applicationDate', applicationDate: 'applicationDate',
    状态: 'status', status: 'status',
    币种: 'currency', currency: 'currency',
    备注: 'remarks', remarks: 'remarks',
  };
  // 由统一登记表派生「中文/英文 → 状态值」反查（标签改词只动登记表一处）
  const APPROVAL_STATUS_MAP: Record<string, PriceApproval['status']> = Object.fromEntries(
    approvalStatusOptions('price_approval').flatMap(o => [[o.label, o.value], [o.value, o.value]]),
  ) as Record<string, PriceApproval['status']>;
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = APPROVAL_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const no = mapped.approvalNo;
      if (!no) { skipped += 1; continue; }
      const existing = priceApprovals.find((r) => r.approvalNo === no);
      if (!existing) { skipped += 1; continue; }
      const updates: Partial<PriceApproval> = {};
      if (mapped.title) updates.title = mapped.title;
      if (mapped.comparisonNo) updates.comparisonNo = mapped.comparisonNo;
      if (mapped.inquiryNo) updates.inquiryNo = mapped.inquiryNo;
      if (mapped.applicant) updates.applicant = mapped.applicant;
      if (mapped.applicationDate) updates.applicationDate = mapped.applicationDate;
      if (mapped.currency) updates.currency = mapped.currency;
      if (mapped.remarks) updates.remarks = mapped.remarks;
      if (mapped.status) {
        const s = APPROVAL_STATUS_MAP[mapped.status];
        if (s) updates.status = s;
      }
      // 单据类安全策略：仅按单号匹配更新，未匹配到的跳过不新建
      updatePriceApproval(existing.id, updates);
      updated += 1;
    }
    setSnackbar({
      open: true,
      message: `更新 ${updated} 条，跳过 ${skipped} 条（未匹配到现有单号）`,
      severity: updated + skipped > 0 ? 'success' : 'info',
    });
  };

  const confirmDelete = () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const v of targets) deletePriceApproval(v.id);
    setSnackbar({ open: true, message: `已删除 ${targets.length} 张审批单`, severity: 'success' });
  };

  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const v of targets) updatePriceApproval(v.id, updates as Partial<PriceApproval>);
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 张审批单`, severity: 'success' });
  };

  const batchActions: BatchAction<PriceApproval>[] = [
    {
      label: '批量修改',
      icon: <EditNote sx={{ fontSize: 14 }} />,
      testId: 'batch-edit',
      onClick: (rows) => { setPendingBatchEdit(rows); setBatchEditOpen(true); },
    },
    {
      label: '批量删除',
      icon: <DeleteOutline sx={{ fontSize: 14 }} />,
      color: 'error',
      testId: 'batch-delete',
      onClick: (rows) => { setDeleteTargets(rows); setDeleteOpen(true); },
    },
  ];

  return (
    <PageWrapper
      title="价格审批单"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-approval" currentStatus="pa_submitted" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建审批单', onClick: () => notify('请从比价单中选择供应商后提交审批', 'info'), icon: <Add /> }}
          />
        </Box>
      }
    >
      <DataTable<PriceApproval>
        data={rel.data}
        columns={allColumns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="审批单"
        hiddenColumns={rel.hiddenColumns}
        columnConfigKey="price-approval-list"
        codeColumnId="approvalNo"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/price/approval/${row.id}`)}
        onView={(row) => navigate(`/price/approval/${row.id}`)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
      />

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除审批单「${deleteTargets[0]?.approvalNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 张审批单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改审批单"
        count={pendingBatchEdit.length}
        fields={APPROVAL_BATCH_FIELDS}
        onConfirm={confirmBatchEdit}
        onCancel={() => { setBatchEditOpen(false); setPendingBatchEdit([]); }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default ApprovalList;
