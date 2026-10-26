import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, Paper, Checkbox, Alert, Stack, Divider,
  FormControlLabel, Snackbar,
} from '@mui/material';
import { Add, ContentCopy, EditNote, DeleteOutline } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, ActionBar, StatusBadge, FlowTracker,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { withRelatedDocNos } from '@/utils/relations/documentRelations';
import { buildRelatedColumns } from '@/components/common/relatedColumns';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';
import { usePriceStore } from '@/stores/priceStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PriceInquiry, PriceInquiryItem } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

// 询价单状态 → 集中 statusConfig key（draft/published/quotation_received/compared 复用通用 key）
const PR_STATUS_KEY: Record<string, string> = {
  draft: 'draft',
  published: 'published',
  closed: 'pr_closed',
  quotation_received: 'quotation_received',
  compared: 'compared',
};

const InquiryList: React.FC = () => {
  const navigate = useNavigate();
  useEnsureRelatedStores('priceInquiry');
  const priceInquiries = usePriceStore(s => s.priceInquiries);
  const updatePriceInquiry = usePriceStore(s => s.updatePriceInquiry);
  const deletePriceInquiry = usePriceStore(s => s.deletePriceInquiry);
  const purchaseRequests = usePurchaseStore(s => s.purchaseRequests);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, string[]>>({});
  // ── 删除 / 批量修改 / 提示 ──
  const [deleteTargets, setDeleteTargets] = useState<PriceInquiry[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<PriceInquiry[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const columns: ColumnDef<PriceInquiry, unknown>[] = useMemo(() => [
    { accessorKey: 'inquiryNo', header: '询价单号', size: 160, meta: { searchable: true } },
    { accessorKey: 'title', header: '标题', size: 220, meta: { searchable: true } },
    { accessorKey: 'inquirer', header: '询价人', meta: { searchable: true } },
    { accessorKey: 'department', header: '部门', meta: { searchable: true } },
    {
      accessorKey: 'targetVendorNames',
      header: '目标供应商',
      size: 250,
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {row.original.targetVendorNames.map((name, idx) => (
            <Chip key={idx} label={name} size="small" variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }} />
          ))}
        </Stack>
      ),
    },
    {
      accessorKey: 'deadline',
      header: '截止日期',
      meta: { searchable: true },
      cell: ({ row }) => formatDate(row.original.deadline),
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={PR_STATUS_KEY[row.original.status]} />,
    },
    {
      accessorKey: 'totalEstimatedAmount',
      header: '预估总金额',
      accessorFn: (r) => Number(r.totalEstimatedAmount || 0),
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.totalEstimatedAmount)}</Box>
      ),
    },
    // V3.113.0 上下游关联单号：默认隐藏（hiddenColumns），但 meta.searchable 进检索、列设置可释放；
    // 单元格渲染为可点击链接（RelatedDocLinks），详情页同源可点跳转。
    ...(buildRelatedColumns() as ColumnDef<PriceInquiry, unknown>[]),
  ], []);

  // ── 弹窗内「采购申请物料明细」列（带勾选）──
  const buildMaterialColumns = (requestId: string): ColumnDef<PriceInquiryItem, unknown>[] => [
    {
      id: 'select',
      header: '',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Checkbox
          size="small"
          checked={(selectedItemsMap[requestId] || []).includes(row.original.id)}
          onChange={() => handleItemToggle(requestId, row.original.id)}
        />
      ),
    },
    { accessorKey: 'materialCode', header: '物料编码' },
    { accessorKey: 'materialName', header: '物料名称' },
    { accessorKey: 'specification', header: '规格' },
    { accessorKey: 'unit', header: '单位' },
    {
      accessorKey: 'quantity',
      header: '数量',
      cell: ({ row }) => <Box sx={{ textAlign: 'right' }}>{row.original.quantity}</Box>,
    },
    {
      accessorKey: 'estimatedPrice',
      header: '预估单价',
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.estimatedPrice || 0)}</Box>
      ),
    },
    {
      accessorKey: 'estimatedAmount',
      header: '预估金额',
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>{formatCurrency(row.original.estimatedAmount || 0)}</Box>
      ),
    },
  ];

  const filterFields = [
    { name: 'inquiryNo', label: '询价单号', type: 'text' as const },
    { name: 'title', label: '标题', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'draft', label: '草稿' },
        { value: 'published', label: '已发布' },
        { value: 'closed', label: '已截止' },
        { value: 'quotation_received', label: '已收到报价' },
        { value: 'compared', label: '已比价' },
      ],
    },
    { name: 'inquirer', label: '询价人', type: 'text' as const },
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列，并按字段权限门控
  const filteredData = useMemo(
    () => applyColumnFilters(withRelatedDocNos('priceInquiry', priceInquiries), columns, filterData, { module: 'price' }),
    [filterData, priceInquiries, columns]
  );

  // 获取可勾选的已批准采购申请
  const approvedRequests = useMemo(() =>
    purchaseRequests.filter(r => r.status === 'approved' || r.status === 'pending'),
  []);

  const handleRequestToggle = (requestId: string) => {
    setSelectedRequestIds(prev =>
      prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]
    );
  };

  const handleItemToggle = (requestId: string, itemId: string) => {
    setSelectedItemsMap(prev => {
      const current = prev[requestId] || [];
      const newItems = current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : [...current, itemId];
      return { ...prev, [requestId]: newItems };
    });
  };

  const handleSelectAllItems = (requestId: string, itemIds: string[]) => {
    setSelectedItemsMap(prev => ({
      ...prev,
      [requestId]: itemIds,
    }));
  };

  const selectedItemsCount = Object.values(selectedItemsMap).reduce((sum, items) => sum + items.length, 0);

  const handleGenerateFromRequest = () => {
    // 收集选中的采购申请项
    const selectedItems: any[] = [];
    approvedRequests
      .filter(r => selectedRequestIds.includes(r.id))
      .forEach(request => {
        const selectedItemIds = selectedItemsMap[request.id] || [];
        request.items
          .filter(item => selectedItemIds.includes(item.id))
          .forEach(item => {
            selectedItems.push({
              ...item,
              sourceRequestId: request.id,
              sourceRequestNo: request.requestNo,
              // V3.102.0：需求日期优先取明细行期望交货时间（新申请单表头不再填期望日期），历史单兜底表头 expectedDate
              requiredDate: item.deliveryDate || request.expectedDate || '',
              id: '',
            });
          });
      });

    if (selectedItems.length === 0) {
      return;
    }

    // 导航到新建页面并传递选中数据
    navigate('/price/inquiry/create', { state: { fromRequests: selectedItems } });
  };

  // ── 批量修改可改字段（对应详情页可编辑项）──
  const INQUIRY_BATCH_FIELDS: BatchEditField[] = [
    {
      key: 'status', label: '状态', type: 'select',
      options: [
        { value: 'draft', label: '草稿' },
        { value: 'published', label: '已发布' },
        { value: 'closed', label: '已截止' },
        { value: 'quotation_received', label: '已收到报价' },
        { value: 'compared', label: '已比价' },
      ],
    },
    { key: 'title', label: '标题', type: 'text' },
    { key: 'inquirer', label: '询价人', type: 'text' },
    { key: 'department', label: '部门', type: 'text' },
    { key: 'currency', label: '币种', type: 'text' },
  ];

  // ── 批量导入：表头 → 字段 别名映射（中英文均可），按单号匹配，命中则更新、未命中跳过 ──
  const INQUIRY_IMPORT_ALIASES: Record<string, string> = {
    询价单号: 'inquiryNo', inquiryNo: 'inquiryNo',
    标题: 'title', title: 'title',
    询价人: 'inquirer', inquirer: 'inquirer',
    部门: 'department', department: 'department',
    截止日期: 'deadline', deadline: 'deadline',
    币种: 'currency', currency: 'currency',
    预估总金额: 'totalEstimatedAmount', totalEstimatedAmount: 'totalEstimatedAmount',
    状态: 'status', status: 'status',
  };
  const INQUIRY_STATUS_MAP: Record<string, PriceInquiry['status']> = {
    草稿: 'draft', 已发布: 'published', 已截止: 'closed', 已收到报价: 'quotation_received', 已比价: 'compared',
    draft: 'draft', published: 'published', closed: 'closed', quotation_received: 'quotation_received', compared: 'compared',
  };
  const toImportNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = INQUIRY_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const no = mapped.inquiryNo;
      if (!no) { skipped += 1; continue; }
      const existing = priceInquiries.find((r) => r.inquiryNo === no);
      if (!existing) { skipped += 1; continue; }
      const updates: Partial<PriceInquiry> = {};
      if (mapped.title) updates.title = mapped.title;
      if (mapped.inquirer) updates.inquirer = mapped.inquirer;
      if (mapped.department) updates.department = mapped.department;
      if (mapped.deadline) updates.deadline = mapped.deadline;
      if (mapped.currency) updates.currency = mapped.currency;
      if (mapped.totalEstimatedAmount) updates.totalEstimatedAmount = toImportNum(mapped.totalEstimatedAmount);
      if (mapped.status) {
        const s = INQUIRY_STATUS_MAP[mapped.status];
        if (s) updates.status = s;
      }
      // 单据类安全策略：仅按单号匹配更新，未匹配到的跳过不新建（避免构造不完整单据）
      updatePriceInquiry(existing.id, updates);
      updated += 1;
    }
    setSnackbar({
      open: true,
      message: `更新 ${updated} 条，跳过 ${skipped} 条（未匹配到现有单号）`,
      severity: updated + skipped > 0 ? 'success' : 'info',
    });
  };

  // ── 删除（单行 / 批量共用同一确认框）──
  const confirmDelete = () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const v of targets) deletePriceInquiry(v.id);
    setSnackbar({ open: true, message: `已删除 ${targets.length} 张询价单`, severity: 'success' });
  };

  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const v of targets) updatePriceInquiry(v.id, updates as Partial<PriceInquiry>);
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 张询价单`, severity: 'success' });
  };

  const batchActions: BatchAction<PriceInquiry>[] = [
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
      title="询价单管理"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="price-inquiry" currentStatus="pi_draft" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建询价单', onClick: () => navigate('/price/inquiry/create'), icon: <Add /> }}
            secondaries={[{ label: '从采购申请生成', onClick: () => setSelectDialogOpen(true) }]}
          />
        </Box>
      }
    >
      <FilterBar fields={filterFields} columns={columns} module="price" onSearch={setFilterData} />
      <DataTable<PriceInquiry>
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="询价单"
        hiddenColumns={['upstreamNo', 'downstreamNo']}
        columnConfigKey="price-inquiry-list"
        codeColumnId="inquiryNo"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/price/inquiry/${row.id}`)}
        onView={(row) => navigate(`/price/inquiry/${row.id}`)}
        onEdit={(row) => navigate(`/price/inquiry/${row.id}`)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
      />

      {/* 从采购申请生成询价单对话框 */}
      <Dialog open={selectDialogOpen} onClose={() => setSelectDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          从采购申请生成询价单
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            （勾选采购申请中的物料，将自动带入询价单）
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {approvedRequests.length === 0 ? (
            <Alert severity="info">暂无已批准的采购申请可供选择</Alert>
          ) : (
            approvedRequests.map(request => (
              <Box key={request.id} sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedRequestIds.includes(request.id)}
                      onChange={() => handleRequestToggle(request.id)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2">{request.requestNo}</Typography>
                      <Typography variant="body2" color="text.secondary">{request.title}</Typography>
                      <StatusBadge status={request.status} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(request.expectedDate)} 预计
                      </Typography>
                    </Stack>
                  }
                />
                {selectedRequestIds.includes(request.id) && (
                  <Paper variant="outlined" sx={{ ml: 4, mt: 1, mb: 1 }}>
                    <Box sx={{ px: 2, py: 0.5, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center' }}>
                      <Typography variant="caption" fontWeight={600}>物料明细</Typography>
                      <Button size="small" sx={{ ml: 'auto', fontSize: '0.7rem' }}
                        onClick={() => handleSelectAllItems(request.id, request.items.map(i => i.id))}>
                        全选
                      </Button>
                    </Box>
                    <DataTable<PriceInquiryItem>
                      data={request.items as unknown as PriceInquiryItem[]}
                      columns={buildMaterialColumns(request.id)}
                      enablePagination={false}
                    />
                  </Paper>
                )}
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', ml: 2 }}>
            已选择 {selectedItemsCount} 项物料
          </Typography>
          <Button onClick={() => setSelectDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleGenerateFromRequest}
            disabled={selectedItemsCount === 0}>
            生成询价单
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除询价单「${deleteTargets[0]?.inquiryNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 张询价单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改询价单"
        count={pendingBatchEdit.length}
        fields={INQUIRY_BATCH_FIELDS}
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

export default InquiryList;
