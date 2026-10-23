import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Typography, Snackbar, Alert,
} from '@mui/material';
import {
  FileUploadOutlined, SwapHoriz, EditNote, DeleteOutline,
  FileDownloadOutlined, Add,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, FlowTracker, ConfirmDialog } from '@/components/common';
import type { BatchAction } from '@/components/common/DataTable';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PurchaseRequest, PurchaseRequestStatus, Priority } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { approvalStatusOptions } from '@/constants/approvalEnums';
import { applyColumnFilters } from '@/utils/listSearch';

const PR_STATUS_OPTIONS = approvalStatusOptions('purchase_request');

// ── 批量修改弹窗 ──
interface BatchEditValues {
  status?: string;
  priority?: string;
  department?: string;
}

const PurchaseList: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    purchaseRequests,
    addPurchaseRequest,
    deletePurchaseRequest,
    updatePurchaseRequest,
  } = usePurchaseStore();

  // 筛选
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 单条删除
  const [deleteTarget, setDeleteTarget] = useState<PurchaseRequest | null>(null);

  // 批量删除
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [pendingBatchDelete, setPendingBatchDelete] = useState<PurchaseRequest[]>([]);

  // 批量修改
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<PurchaseRequest[]>([]);
  const [batchEditValues, setBatchEditValues] = useState<BatchEditValues>({});

  // 导入
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<PurchaseRequest[]>([]);
  const [importPreview, setImportPreview] = useState<Record<string, unknown>[]>([]);

  // 提示
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  // ── 列定义 ──
  const columns: ColumnDef<PurchaseRequest, unknown>[] = useMemo(() => [
    { accessorKey: 'requestNo', header: '申请单号', meta: { searchable: true } },
    { accessorKey: 'title', header: '标题', meta: { searchable: true } },
    { accessorKey: 'applicant', header: '申请人', meta: { searchable: true } },
    { accessorKey: 'buyerNames', header: '负责采购员', meta: { searchable: true }, cell: ({ row }) => row.original.buyerNames || '-' },
    { accessorKey: 'department', header: '部门', meta: { searchable: true } },
    {
      accessorKey: 'priority',
      header: '优先级',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    { accessorKey: 'expectedDate', header: '期望日期', meta: { searchable: true }, cell: ({ row }) => formatDate(row.original.expectedDate) },
    {
      accessorKey: 'totalAmount',
      header: '预估金额',
      meta: { searchable: true },
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
  ], []);

  const filterFields = [
    { name: 'requestNo', label: '申请单号', type: 'text' as const },
    { name: 'title', label: '标题', type: 'text' as const },
    { name: 'buyerNames', label: '负责采购员', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        ...PR_STATUS_OPTIONS,
      ],
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'low', label: '低' },
        { value: 'normal', label: '普通' },
        { value: 'high', label: '高' },
        { value: 'urgent', label: '紧急' },
      ],
    },
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列（编号/标题/申请人/部门/优先级/状态/期望日期/预估金额），
  // 并按字段权限门控。默认显 5 项、其余『更多筛选』可展开（由 FilterBar 内置）。
  const filteredData = useMemo(
    () => applyColumnFilters(purchaseRequests, columns, filterData, { module: 'purchase' }),
    [purchaseRequests, filterData, columns]
  );

  // ── 单条删除 ──
  const handleSingleDelete = (row: PurchaseRequest) => {
    setDeleteTarget(row);
  };

  const confirmSingleDelete = () => {
    if (deleteTarget) {
      deletePurchaseRequest(deleteTarget.id);
      setSnackbar({ open: true, message: `已删除：${deleteTarget.requestNo}`, severity: 'success' });
      setDeleteTarget(null);
    }
  };

  // ── 批量删除 ──
  const handleBatchDelete = (rows: PurchaseRequest[]) => {
    setPendingBatchDelete(rows);
    setBatchDeleteOpen(true);
  };

  const confirmBatchDelete = () => {
    pendingBatchDelete.forEach(r => deletePurchaseRequest(r.id));
    setSnackbar({ open: true, message: `已批量删除 ${pendingBatchDelete.length} 条申请`, severity: 'success' });
    setBatchDeleteOpen(false);
    setPendingBatchDelete([]);
  };

  // ── 批量修改 ──
  const handleBatchEdit = (rows: PurchaseRequest[]) => {
    setPendingBatchEdit(rows);
    setBatchEditValues({});
    setBatchEditOpen(true);
  };

  const confirmBatchEdit = () => {
    const updates: Partial<PurchaseRequest> = {};
    if (batchEditValues.status) updates.status = batchEditValues.status as PurchaseRequestStatus;
    if (batchEditValues.priority) updates.priority = batchEditValues.priority as Priority;
    if (batchEditValues.department) updates.department = batchEditValues.department;
    pendingBatchEdit.forEach(r => updatePurchaseRequest(r.id, updates));
    setSnackbar({ open: true, message: `已批量修改 ${pendingBatchEdit.length} 条申请`, severity: 'success' });
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
  };

  // ── 转采购订单 ──
  const handleConvertToOrder = (rows: PurchaseRequest[]) => {
    // 验证：必须有已批准或待审批状态的
    const validRows = rows.filter(r => r.status === 'approved' || r.status === 'pending');
    if (validRows.length === 0) {
      setSnackbar({ open: true, message: '请选择已审批或待审批的采购申请', severity: 'error' });
      return;
    }
    const ids = validRows.map(r => r.id).join(',');
    navigate(`/purchase/orders/create?fromRequests=${ids}`);
  };

  // ── 批量导出 ──
  const handleBatchExport = (rows: PurchaseRequest[]) => {
    const exportData = rows.map(r => ({
      '申请单号': r.requestNo,
      '标题': r.title,
      '申请人': r.applicant,
      '部门': r.department,
      '优先级': r.priority,
      '状态': r.status,
      '期望日期': r.expectedDate,
      '预估金额': r.totalAmount,
      '项目编号': r.projectNo || '',
      '项目名称': r.projectName || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '采购申请');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `采购申请_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `已导出 ${rows.length} 条采购申请`, severity: 'success' });
  };

  // ── 导入 ──
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
        if (jsonData.length === 0) {
          setSnackbar({ open: true, message: '文件中没有数据', severity: 'error' });
          return;
        }
        setImportPreview(jsonData);
        setImportData([]);
        setImportDialogOpen(true);
      } catch {
        setSnackbar({ open: true, message: '文件解析失败，请检查文件格式', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
    // 重置 input 以便重新选同一文件
    e.target.value = '';
  };

  const confirmImport = () => {
    const newRequests: PurchaseRequest[] = importPreview.map((row, idx) => {
      const now = new Date().toISOString();
      const seq = purchaseRequests.length + idx + 1;
      return {
        id: `pr-import-${Date.now()}-${idx}`,
        requestNo: (row['申请单号'] as string) || `PR-IMP-${String(seq).padStart(4, '0')}`,
        title: (row['标题'] as string) || '导入申请',
        applicant: (row['申请人'] as string) || '当前用户',
        department: (row['部门'] as string) || '',
        type: 'material' as const,
        priority: (row['优先级'] as Priority) || 'normal',
        reason: (row['申请原因'] as string) || '',
        expectedDate: (row['期望日期'] as string) || new Date().toISOString().split('T')[0],
        status: 'draft',
        items: [],
        totalAmount: Number(row['预估金额']) || 0,
        projectNo: (row['项目编号'] as string) || undefined,
        projectName: (row['项目名称'] as string) || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: '当前用户',
        updatedBy: '当前用户',
      };
    });
    newRequests.forEach(r => addPurchaseRequest(r));
    setSnackbar({ open: true, message: `成功导入 ${newRequests.length} 条采购申请`, severity: 'success' });
    setImportDialogOpen(false);
    setImportPreview([]);
  };

  // ── 批量操作定义 ──
  const batchActions: BatchAction<PurchaseRequest>[] = [
    {
      label: '转采购订单',
      icon: <SwapHoriz sx={{ fontSize: 14 }} />,
      color: 'success',
      onClick: handleConvertToOrder,
    },
    {
      label: '导出',
      icon: <FileDownloadOutlined sx={{ fontSize: 14 }} />,
      onClick: handleBatchExport,
    },
    {
      label: '修改',
      icon: <EditNote sx={{ fontSize: 14 }} />,
      color: 'warning',
      onClick: handleBatchEdit,
    },
    {
      label: '删除',
      icon: <DeleteOutline sx={{ fontSize: 14 }} />,
      color: 'error',
      onClick: handleBatchDelete,
    },
  ];

  return (
    <PageWrapper
      title="采购申请"
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlowTracker module="purchase-request" currentStatus="pr_submitted" label="流程追踪" />
          <ActionBar
            primary={{ label: '新建申请', onClick: () => navigate('/purchase/create') }}
            secondaries={[
              {
                label: '导入',
                onClick: handleImportClick,
                variant: 'outlined',
              },
            ]}
          />
        </Box>
      }
    >
      {/* 隐藏的文件上传 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <FilterBar fields={filterFields} columns={columns} module="purchase" onSearch={setFilterData} listKey="purchase-request-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport={false}
        onRowClick={(row) => navigate(`/purchase/${row.id}`)}
        onView={(row) => navigate(`/purchase/${row.id}`)}
        onEdit={(row) => navigate(`/purchase/${row.id}`)}
        onDelete={handleSingleDelete}
        batchActions={batchActions}
        codeColumnId="requestNo"
      />

      {/* 单条删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        type="danger"
        title="确认删除"
        content={`确定删除采购申请"${deleteTarget?.title}"吗？此操作不可撤销。`}
        onConfirm={confirmSingleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="确认删除"
      />

      {/* 批量删除确认 */}
      <ConfirmDialog
        open={batchDeleteOpen}
        type="danger"
        title="批量删除确认"
        content={`确定要删除选中的 ${pendingBatchDelete.length} 条采购申请吗？此操作不可撤销。`}
        onConfirm={confirmBatchDelete}
        onCancel={() => { setBatchDeleteOpen(false); setPendingBatchDelete([]); }}
        confirmText="确认批量删除"
      />

      {/* 批量修改弹窗 */}
      <Dialog open={batchEditOpen} onClose={() => setBatchEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          批量修改（已选 {pendingBatchEdit.length} 条）
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              留空的字段将不会修改，仅修改填写了内容的字段。
            </Typography>
            <TextField
              select
              label="状态"
              value={batchEditValues.status || ''}
              onChange={(e) => setBatchEditValues(v => ({ ...v, status: e.target.value }))}
              fullWidth
              size="small"
            >
              <MenuItem value="">不修改</MenuItem>
              {PR_STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="优先级"
              value={batchEditValues.priority || ''}
              onChange={(e) => setBatchEditValues(v => ({ ...v, priority: e.target.value }))}
              fullWidth
              size="small"
            >
              <MenuItem value="">不修改</MenuItem>
              <MenuItem value="low">低</MenuItem>
              <MenuItem value="normal">普通</MenuItem>
              <MenuItem value="high">高</MenuItem>
              <MenuItem value="urgent">紧急</MenuItem>
            </TextField>
            <TextField
              label="部门"
              value={batchEditValues.department || ''}
              onChange={(e) => setBatchEditValues(v => ({ ...v, department: e.target.value }))}
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchEditOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={confirmBatchEdit}
            disabled={!batchEditValues.status && !batchEditValues.priority && !batchEditValues.department}
          >
            确认修改
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导入预览弹窗 */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          导入预览（共 {importPreview.length} 条）
        </DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>申请单号</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>标题</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>申请人</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>部门</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>预估金额</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.slice(0, 20).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px' }}>{String(row['申请单号'] || '自动生成')}</td>
                    <td style={{ padding: '8px 12px' }}>{String(row['标题'] || '—')}</td>
                    <td style={{ padding: '8px 12px' }}>{String(row['申请人'] || '—')}</td>
                    <td style={{ padding: '8px 12px' }}>{String(row['部门'] || '—')}</td>
                    <td style={{ padding: '8px 12px' }}>{String(row['预估金额'] || '—')}</td>
                  </tr>
                ))}
                {importPreview.length > 20 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'center', color: '#94A3B8' }}>
                      ... 还有 {importPreview.length - 20} 条数据未显示
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>取消</Button>
          <Button variant="contained" color="primary" onClick={confirmImport}>
            确认导入
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default PurchaseList;
