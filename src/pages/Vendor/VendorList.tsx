import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Chip, LinearProgress, Typography, Stack, Alert, Button, Snackbar,
} from '@mui/material';
import { EditNote, DeleteOutline } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, ActionBar, StatusBadge, SecureField,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { useVendorStore } from '@/stores/vendorStore';
import { Vendor, VendorType, VendorStatus } from '@/types';
import { formatPhone, formatCurrency } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';

/** 批量导入：表头 → 字段 别名映射（中英文均可） */
const VENDOR_IMPORT_ALIASES: Record<string, string> = {
  供应商编码: 'code', 编码: 'code', 编号: 'code', code: 'code',
  供应商名称: 'name', 名称: 'name', name: 'name',
  类型: 'type', type: 'type',
  联系人: 'contact', contact: 'contact',
  电话: 'phone', phone: 'phone',
  状态: 'status', status: 'status',
  邮箱: 'email', email: 'email',
  地址: 'address', address: 'address',
};
const VENDOR_TYPE_MAP: Record<string, VendorType> = {
  生产商: 'manufacturer', 制造商: 'manufacturer', manufacturer: 'manufacturer',
  贸易商: 'trader', trader: 'trader',
  代理商: 'agent', 经销商: 'agent', agent: 'agent',
};
const VENDOR_STATUS_MAP: Record<string, VendorStatus> = {
  待注册: 'registered', registered: 'registered',
  待审核: 'pending', 待审批: 'pending', pending: 'pending',
  已批准: 'approved', 已审核: 'approved', approved: 'approved',
  已拒绝: 'rejected', rejected: 'rejected',
  黑名单: 'blacklisted', blacklisted: 'blacklisted',
};

/** 批量修改可改字段（对应详情页可编辑项） */
const VENDOR_BATCH_FIELDS: BatchEditField[] = [
  {
    key: 'status', label: '状态', type: 'select',
    options: [
      { value: 'registered', label: '待注册' },
      { value: 'pending', label: '待审核' },
      { value: 'approved', label: '已批准' },
      { value: 'rejected', label: '已拒绝' },
      { value: 'blacklisted', label: '黑名单' },
    ],
  },
  {
    key: 'type', label: '类型', type: 'select',
    options: [
      { value: 'manufacturer', label: '生产商' },
      { value: 'trader', label: '贸易商' },
      { value: 'agent', label: '代理商' },
    ],
  },
  { key: 'contact', label: '联系人', type: 'text' },
  { key: 'phone', label: '电话', type: 'text' },
  { key: 'email', label: '邮箱', type: 'text' },
  { key: 'address', label: '地址', type: 'text' },
  { key: 'creditLimit', label: '信用额度', type: 'number', placeholder: '留空不修改' },
];

// 供应商信用状态展示（只读，无额度引擎）：已用 / 授信上限，超额或 ≥90% 红色告警
const renderVendorCredit = (v: Vendor) => {
  const limit = v.creditLimit;
  const used = v.usedCredit || 0;
  if (limit == null || limit <= 0) {
    return (
      <Box data-testid="credit-status">
        <Chip size="small" label="未授信" variant="outlined" color="default" />
      </Box>
    );
  }
  const ratio = used / limit;
  const over = used > limit || ratio >= 0.9;
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <Box data-testid="credit-status" sx={{ minWidth: 140 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            width: 70, height: 6, borderRadius: 3,
            '& .MuiLinearProgress-bar': { bgcolor: over ? '#EF4444' : '#10B981' },
          }}
        />
        <Typography variant="caption" color={over ? 'error' : 'text.secondary'}>{pct}%</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {formatCurrency(used)} / {formatCurrency(limit)}
      </Typography>
      {over && (
        <Chip size="small" label="信用超额" color="error" sx={{ mt: 0.5 }} />
      )}
    </Box>
  );
};

const VendorList: React.FC = () => {
  const navigate = useNavigate();
  const vendors = useVendorStore((s) => s.vendors);
  const reviewVendorProfilePending = useVendorStore((s) => s.reviewVendorProfilePending);
  const addVendor = useVendorStore((s) => s.addVendor);
  const updateVendor = useVendorStore((s) => s.updateVendor);
  const deleteVendor = useVendorStore((s) => s.deleteVendor);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // B5 门户回写：供应商在门户提交的待审资料
  const pendingProfileVendors = useMemo(
    () => vendors.filter((v) => v.profilePendingAt),
    [vendors]
  );

  const columns: ColumnDef<Vendor, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '供应商编码', meta: { searchable: true } },
    { accessorKey: 'name', header: '供应商名称', meta: { searchable: true } },
    {
      accessorKey: 'type',
      header: '类型',
      meta: { searchable: true },
      cell: ({ row }) => {
        const typeMap: Record<string, string> = {
          manufacturer: '生产商',
          trader: '贸易商',
          agent: '代理商',
        };
        return typeMap[row.original.type] || row.original.type;
      },
    },
    { accessorKey: 'contact', header: '联系人', meta: { searchable: true } },
    { accessorKey: 'phone', header: '电话', meta: { searchable: true }, cell: ({ row }) => formatPhone(row.original.phone) },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'rating',
      header: '评级',
      meta: { searchable: true },
      cell: ({ row }) => row.original.rating ? `${row.original.rating}星` : '-',
    },
    {
      id: 'credit',
      header: '信用状态',
      cell: ({ row }) => (
        <SecureField module="vendor" fieldName="creditLimit">
          {renderVendorCredit(row.original)}
        </SecureField>
      ),
    },
    {
      id: 'profilePending',
      header: '门户资料',
      cell: ({ row }) => row.original.profilePendingAt
        ? <Chip size="small" color="warning" label="待审" data-testid="profile-pending-chip" />
        : <Typography variant="caption" color="text.secondary">-</Typography>,
    },
  ], []);

  const filterFields = [
    { name: 'code', label: '供应商编码', type: 'text' as const },
    { name: 'name', label: '供应商名称', type: 'text' as const },
    {
      name: 'type',
      label: '类型',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'manufacturer', label: '生产商' },
        { value: 'trader', label: '贸易商' },
        { value: 'agent', label: '代理商' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'approved', label: '已批准' },
        { value: 'pending', label: '待审核' },
        { value: 'rejected', label: '已拒绝' },
        { value: 'blacklisted', label: '黑名单' },
      ],
    },
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列（编号/名称/类型/联系人/电话/状态/评级），
  // 并按字段权限门控（如授信等敏感列未纳入则本就不出现）。默认显 5 项、其余『更多筛选』可展开。
  const filteredData = useMemo(
    () => applyColumnFilters(vendors, columns, filterData, { module: 'vendor' }),
    [filterData, vendors, columns]
  );

  // ── 删除（单行 / 批量共用同一确认框）──
  const [deleteTargets, setDeleteTargets] = useState<Vendor[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // ── 批量修改 ──
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<Vendor[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const confirmDelete = async () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const v of targets) {
      await deleteVendor(v.id);
    }
    setSnackbar({ open: true, message: `已删除 ${targets.length} 家供应商`, severity: 'success' });
  };

  const confirmBatchEdit = async (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const v of targets) {
      await updateVendor(v.id, updates as Partial<Vendor>);
    }
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 家供应商`, severity: 'success' });
  };

  /** 批量导入：按表头映射字段，有编码则更新、无编码则新建 */
  const handleImport = async (rows: Record<string, string>[], _headers: string[]) => {
    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    let seq = vendors.length;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = VENDOR_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      if (!mapped.name && !mapped.code) continue;

      const type = VENDOR_TYPE_MAP[mapped.type] || 'trader';
      const status = VENDOR_STATUS_MAP[mapped.status] || 'registered';
      const existing = mapped.code ? vendors.find((v) => v.code === mapped.code) : undefined;

      if (existing) {
        await updateVendor(existing.id, {
          ...(mapped.name ? { name: mapped.name } : {}),
          ...(mapped.type ? { type } : {}),
          ...(mapped.status ? { status } : {}),
          ...(mapped.contact ? { contact: mapped.contact } : {}),
          ...(mapped.phone ? { phone: mapped.phone } : {}),
          ...(mapped.email ? { email: mapped.email } : {}),
          ...(mapped.address ? { address: mapped.address } : {}),
        });
        updated += 1;
      } else {
        seq += 1;
        const code = mapped.code || `V${new Date().getFullYear()}${String(seq).padStart(5, '0')}`;
        await addVendor({
          id: `vendor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now,
          updatedAt: now,
          createdBy: '批量导入',
          updatedBy: '批量导入',
          code,
          name: mapped.name || code,
          type,
          contact: mapped.contact || '',
          phone: mapped.phone || '',
          status,
          ...(mapped.email ? { email: mapped.email } : {}),
          ...(mapped.address ? { address: mapped.address } : {}),
        });
        created += 1;
      }
    }
    setSnackbar({
      open: true,
      message: `导入完成：新增 ${created} 条，更新 ${updated} 条`,
      severity: created + updated > 0 ? 'success' : 'info',
    });
  };

  const batchActions: BatchAction<Vendor>[] = [
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
      title="供应商列表"
      actions={
        <ActionBar
          primary={{ label: '注册供应商', onClick: () => navigate('/vendor/register') }}
        />
      }
    >
      {pendingProfileVendors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="vendor-profile-pending-alert">
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={600}>
              有 {pendingProfileVendors.length} 家供应商在门户提交了资料变更，待审核并入主数据
            </Typography>
            {pendingProfileVendors.map((v) => (
              <Stack key={v.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption">
                  {v.name}（提交人 {v.profilePendingBy || '-'} · {v.profilePendingAt}）
                </Typography>
                <Button size="small" variant="contained"
                  data-testid={`approve-profile-${v.id}`}
                  onClick={() => reviewVendorProfilePending(v.id, true, '采购部主管')}>
                  审核通过并并入
                </Button>
                <Button size="small" variant="outlined" color="inherit"
                  data-testid={`reject-profile-${v.id}`}
                  onClick={() => reviewVendorProfilePending(v.id, false, '采购部主管')}>
                  驳回
                </Button>
              </Stack>
            ))}
          </Stack>
        </Alert>
      )}
      <FilterBar fields={filterFields} columns={columns} module="vendor" onSearch={setFilterData} listKey="vendor-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        codeColumnId="code"
        onRowClick={(row) => navigate(`/vendor/${row.id}`)}
        onView={(row) => navigate(`/vendor/${row.id}`)}
        onEdit={(row) => navigate(`/vendor/${row.id}`)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
        enableImport
        importLabel="供应商"
        onImport={handleImport}
      />

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除供应商「${deleteTargets[0]?.name}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 家供应商吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改供应商"
        count={pendingBatchEdit.length}
        fields={VENDOR_BATCH_FIELDS}
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

export default VendorList;
