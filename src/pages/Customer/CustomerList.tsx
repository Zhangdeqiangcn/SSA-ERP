import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Box, Chip, LinearProgress, Typography, Stack, Snackbar, Alert } from '@mui/material';
import { EditNote, DeleteOutline } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, ActionBar, StatusBadge, SecureField,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { useCustomerStore } from '@/stores/customerStore';
import { Customer, CustomerStatus, CustomerType, CreditLevel } from '@/types';
import {
  CUSTOMER_TYPE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  CREDIT_LEVEL_OPTIONS,
} from '@/constants/options';
import { formatPhone, formatCurrency } from '@/utils/format';

const labelOf = (
  options: { value: string; label: string }[],
  value?: string
): string =>
  options.find((o) => o.value === value)?.label || value || '-';

// 客户信用状态展示（只读）：已用 / 授信上限，超额或 ≥90% 红色告警
const renderCustomerCredit = (c: Customer) => {
  const limit = c.creditLimit;
  const used = c.usedCredit || 0;
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

/** 批量导入：表头 → 字段 别名映射（中英文均可） */
const CUSTOMER_IMPORT_ALIASES: Record<string, string> = {
  客户编码: 'code', 编码: 'code', 编号: 'code', code: 'code',
  客户名称: 'name', 名称: 'name', name: 'name',
  简称: 'shortName', shortName: 'shortName',
  类型: 'type', type: 'type',
  联系人: 'contactName', contactName: 'contactName',
  电话: 'contactPhone', contactPhone: 'contactPhone',
  邮箱: 'contactEmail', contactEmail: 'contactEmail',
  状态: 'status', status: 'status',
  信用等级: 'creditLevel', creditLevel: 'creditLevel',
  账期天数: 'settlementTermDays', settlementTermDays: 'settlementTermDays',
  税号: 'taxId', taxId: 'taxId',
  开户银行: 'bankName', bankName: 'bankName',
  银行账号: 'bankAccount', bankAccount: 'bankAccount',
  地址: 'address', address: 'address',
  备注: 'remarks', remarks: 'remarks',
};
const CUSTOMER_TYPE_MAP: Record<string, CustomerType> = {
  直接客户: 'direct', 经销商: 'distributor', 代理商: 'agent', 终端用户: 'end_user',
  direct: 'direct', distributor: 'distributor', agent: 'agent', end_user: 'end_user',
};
const CUSTOMER_STATUS_MAP: Record<string, CustomerStatus> = {
  正常: 'active', 停用: 'inactive', 黑名单: 'blacklisted',
  active: 'active', inactive: 'inactive', blacklisted: 'blacklisted',
};
const CREDIT_LEVEL_MAP: Record<string, CreditLevel> = {
  AAA: 'AAA', AA: 'AA', A: 'A', B: 'B', C: 'C',
};

/** 批量修改可改字段（对应详情页可编辑项，均为 Customer 真实字段） */
const CUSTOMER_BATCH_FIELDS: BatchEditField[] = [
  {
    key: 'status', label: '状态', type: 'select',
    options: [
      { value: 'active', label: '正常' },
      { value: 'inactive', label: '停用' },
      { value: 'blacklisted', label: '黑名单' },
    ],
  },
  { key: 'contactName', label: '联系人', type: 'text' },
  { key: 'contactPhone', label: '电话', type: 'text' },
  { key: 'contactEmail', label: '邮箱', type: 'text' },
  { key: 'remarks', label: '备注', type: 'text' },
];

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const customers = useCustomerStore((s) => s.customers);
  const addCustomer = useCustomerStore((s) => s.addCustomer);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const deleteCustomer = useCustomerStore((s) => s.deleteCustomer);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  const columns: ColumnDef<Customer, unknown>[] = useMemo(() => [
    { accessorKey: 'code', header: '客户编码', meta: { searchable: true } },
    { accessorKey: 'name', header: '客户名称', meta: { searchable: true } },
    {
      accessorKey: 'type',
      header: '类型',
      meta: { searchable: true },
      cell: ({ row }) => labelOf(CUSTOMER_TYPE_OPTIONS, row.original.type),
    },
    { accessorKey: 'contactName', header: '联系人', meta: { searchable: true }, cell: ({ row }) => row.original.contactName || '-' },
    {
      accessorKey: 'contactPhone',
      header: '电话',
      meta: { searchable: true },
      cell: ({ row }) => formatPhone(row.original.contactPhone),
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'creditLevel',
      header: '信用等级',
      meta: { searchable: true },
      cell: ({ row }) => row.original.creditLevel
        ? <Chip size="small" label={row.original.creditLevel} color="primary" variant="outlined" />
        : '-',
    },
    {
      id: 'credit',
      header: '信用状态',
      cell: ({ row }) => (
        <SecureField module="customer" fieldName="creditLimit">
          {renderCustomerCredit(row.original)}
        </SecureField>
      ),
    },
  ], []);

  const filterFields = [
    { name: 'name', label: '客户名称', type: 'text' as const },
    {
      name: 'type',
      label: '类型',
      type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...CUSTOMER_TYPE_OPTIONS],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...CUSTOMER_STATUS_OPTIONS],
    },
    {
      name: 'creditLevel',
      label: '信用等级',
      type: 'select' as const,
      options: [{ value: '', label: '全部' }, ...CREDIT_LEVEL_OPTIONS],
    },
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列，并按字段权限门控
  const filteredData = useMemo(
    () => applyColumnFilters(customers, columns, filterData, { module: 'customer' }),
    [filterData, customers, columns]
  );

  // ── 删除（单行 / 批量共用同一确认框）──
  const [deleteTargets, setDeleteTargets] = useState<Customer[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // ── 批量修改 ──
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<Customer[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  const confirmDelete = async () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const c of targets) {
      await deleteCustomer(c.id);
    }
    setSnackbar({ open: true, message: `已删除 ${targets.length} 家客户`, severity: 'success' });
  };

  const confirmBatchEdit = async (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const c of targets) {
      await updateCustomer(c.id, updates as Partial<Customer>);
    }
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 家客户`, severity: 'success' });
  };

  /** 批量导入：按表头映射字段，有编码则更新、无编码则新建 */
  const handleImport = async (rows: Record<string, string>[], _headers: string[]) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let created = 0;
    let updated = 0;
    let seq = customers.length;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = CUSTOMER_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      if (!mapped.name && !mapped.code) continue;

      const type = CUSTOMER_TYPE_MAP[mapped.type] || 'direct';
      const status = CUSTOMER_STATUS_MAP[mapped.status] || 'active';
      const creditLevel = CREDIT_LEVEL_MAP[mapped.creditLevel];
      const existing = mapped.code ? customers.find((c: any) => c.code === mapped.code) : undefined;

      if (existing) {
        await updateCustomer(existing.id, {
          ...(mapped.name ? { name: mapped.name } : {}),
          ...(mapped.shortName ? { shortName: mapped.shortName } : {}),
          ...(mapped.type ? { type } : {}),
          ...(mapped.status ? { status } : {}),
          ...(creditLevel ? { creditLevel } : {}),
          ...(mapped.contactName ? { contactName: mapped.contactName } : {}),
          ...(mapped.contactPhone ? { contactPhone: mapped.contactPhone } : {}),
          ...(mapped.contactEmail ? { contactEmail: mapped.contactEmail } : {}),
          ...(mapped.settlementTermDays ? { settlementTermDays: Number(mapped.settlementTermDays) } : {}),
          ...(mapped.taxId ? { taxId: mapped.taxId } : {}),
          ...(mapped.bankName ? { bankName: mapped.bankName } : {}),
          ...(mapped.bankAccount ? { bankAccount: mapped.bankAccount } : {}),
          ...(mapped.address ? { address: mapped.address } : {}),
          ...(mapped.remarks ? { remarks: mapped.remarks } : {}),
        });
        updated += 1;
      } else {
        seq += 1;
        const code = mapped.code || `C${String(seq).padStart(3, '0')}`;
        await addCustomer({
          id: `cus-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: now,
          updatedAt: now,
          createdBy: '批量导入',
          updatedBy: '批量导入',
          code,
          name: mapped.name || code,
          shortName: mapped.shortName,
          type,
          status,
          creditLevel,
          contactName: mapped.contactName,
          contactPhone: mapped.contactPhone,
          contactEmail: mapped.contactEmail,
          settlementTermDays: mapped.settlementTermDays ? Number(mapped.settlementTermDays) : undefined,
          taxId: mapped.taxId,
          bankName: mapped.bankName,
          bankAccount: mapped.bankAccount,
          address: mapped.address,
          remarks: mapped.remarks,
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

  const batchActions: BatchAction<Customer>[] = [
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
      title="客户列表"
      actions={
        <ActionBar
          primary={{ label: '新建客户', onClick: () => navigate('/sales/customers/create') }}
        />
      }
    >
      <FilterBar fields={filterFields} columns={columns} module="customer" onSearch={setFilterData} listKey="customer-list" />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        codeColumnId="code"
        onRowClick={(row) => navigate(`/sales/customers/${row.id}`)}
        onView={(row) => navigate(`/sales/customers/${row.id}`)}
        onEdit={(row) => navigate(`/sales/customers/${row.id}/edit`)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
        enableImport
        importLabel="客户"
        onImport={handleImport}
      />

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除客户「${deleteTargets[0]?.name}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 家客户吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改客户"
        count={pendingBatchEdit.length}
        fields={CUSTOMER_BATCH_FIELDS}
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

export default CustomerList;
