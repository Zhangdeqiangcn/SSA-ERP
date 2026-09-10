import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Chip, Button, Box, Snackbar, Alert } from '@mui/material';
import { Add, CompareArrows, EditNote, DeleteOutline } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, ActionBar, FlowTracker,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { usePriceStore } from '@/stores/priceStore';
import { PriceComparison } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待选定', color: 'warning' },
  selected: { label: '已选定', color: 'info' },
  approved: { label: '已审批', color: 'success' },
  rejected: { label: '已驳回', color: 'error' },
};

const ComparisonsList: React.FC = () => {
  const { priceComparisons, updatePriceComparison, deletePriceComparison } = usePriceStore();
  const navigate = useNavigate();
  // ── 删除 / 批量修改 / 提示 ──
  const [deleteTargets, setDeleteTargets] = useState<PriceComparison[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<PriceComparison[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const columns: ColumnDef<PriceComparison, unknown>[] = useMemo(() => [
    { accessorKey: 'comparisonNo', header: '比价单号', size: 160 },
    { accessorKey: 'inquiryNo', header: '关联询价单', size: 160 },
    { accessorKey: 'title', header: '标题', size: 200 },
    {
      accessorKey: 'participatingVendors',
      header: '参与供应商',
      size: 250,
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {row.original.participatingVendors.map((name, idx) => (
            <Chip key={idx} label={name} size="small" variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Stack>
      ),
    },
    {
      accessorKey: 'totalLowestAmount',
      header: '全线最低总价',
      cell: ({ row }) => (
        <span style={{ color: '#10B981', fontWeight: 600 }}>
          {formatCurrency(row.original.totalLowestAmount)}
        </span>
      ),
    },
    {
      accessorKey: 'totalSelectedAmount',
      header: '选定总价',
      cell: ({ row }) => row.original.totalSelectedAmount
        ? formatCurrency(row.original.totalSelectedAmount)
        : '-',
    },
    { accessorKey: 'comparisonDate', header: '比价日期', cell: ({ row }) => formatDate(row.original.comparisonDate) },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip label={STATUS_MAP[row.original.status]?.label} size="small"
          color={STATUS_MAP[row.original.status]?.color as any || 'default'} />
      ),
    },
  ], []);

  // ── 批量修改可改字段（对应详情页可编辑项）──
  const COMPARISON_BATCH_FIELDS: BatchEditField[] = [
    {
      key: 'status', label: '状态', type: 'select',
      options: [
        { value: 'pending', label: '待选定' },
        { value: 'selected', label: '已选定' },
        { value: 'approved', label: '已审批' },
        { value: 'rejected', label: '已驳回' },
      ],
    },
    { key: 'title', label: '标题', type: 'text' },
    { key: 'comparisonDate', label: '比价日期', type: 'text' },
    { key: 'selector', label: '选定人', type: 'text' },
    { key: 'remarks', label: '备注', type: 'text' },
  ];

  // ── 批量导入：表头 → 字段 别名映射（中英文均可），按单号匹配，命中则更新、未命中跳过 ──
  const COMPARISON_IMPORT_ALIASES: Record<string, string> = {
    比价单号: 'comparisonNo', comparisonNo: 'comparisonNo',
    关联询价单: 'inquiryNo', inquiryNo: 'inquiryNo',
    标题: 'title', title: 'title',
    比价日期: 'comparisonDate', comparisonDate: 'comparisonDate',
    状态: 'status', status: 'status',
    选定人: 'selector', selector: 'selector',
    备注: 'remarks', remarks: 'remarks',
  };
  const COMPARISON_STATUS_MAP: Record<string, PriceComparison['status']> = {
    待选定: 'pending', 已选定: 'selected', 已审批: 'approved', 已驳回: 'rejected',
    pending: 'pending', selected: 'selected', approved: 'approved', rejected: 'rejected',
  };
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = COMPARISON_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const no = mapped.comparisonNo;
      if (!no) { skipped += 1; continue; }
      const existing = priceComparisons.find((r) => r.comparisonNo === no);
      if (!existing) { skipped += 1; continue; }
      const updates: Partial<PriceComparison> = {};
      if (mapped.title) updates.title = mapped.title;
      if (mapped.inquiryNo) updates.inquiryNo = mapped.inquiryNo;
      if (mapped.comparisonDate) updates.comparisonDate = mapped.comparisonDate;
      if (mapped.selector) updates.selector = mapped.selector;
      if (mapped.remarks) updates.remarks = mapped.remarks;
      if (mapped.status) {
        const s = COMPARISON_STATUS_MAP[mapped.status];
        if (s) updates.status = s;
      }
      // 单据类安全策略：仅按单号匹配更新，未匹配到的跳过不新建
      updatePriceComparison(existing.id, updates);
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
    for (const v of targets) deletePriceComparison(v.id);
    setSnackbar({ open: true, message: `已删除 ${targets.length} 张比价单`, severity: 'success' });
  };

  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const v of targets) updatePriceComparison(v.id, updates as Partial<PriceComparison>);
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 张比价单`, severity: 'success' });
  };

  const batchActions: BatchAction<PriceComparison>[] = [
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
      title="比价单管理"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-comparison" currentStatus="pc_generated" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建比价单', onClick: () => navigate('/price/inquiry'), icon: <CompareArrows /> }}
          />
        </Box>
      }
    >
      <DataTable<PriceComparison>
        data={priceComparisons}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="比价单"
        codeColumnId="comparisonNo"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/price/comparison/${row.id}`)}
        onView={(row) => navigate(`/price/comparison/${row.id}`)}
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
            ? `确定删除比价单「${deleteTargets[0]?.comparisonNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 张比价单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改比价单"
        count={pendingBatchEdit.length}
        fields={COMPARISON_BATCH_FIELDS}
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

export default ComparisonsList;
