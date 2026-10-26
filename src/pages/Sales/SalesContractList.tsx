import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, Tooltip,
} from '@mui/material';
import { Add, Visibility, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { SalesContract, ContractStatus } from '@/types';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ConfirmDialog, StatusBadge } from '@/components/common';
import { applyColumnFilters } from '@/utils/listSearch';
import { withRelatedDocNos } from '@/utils/relations/documentRelations';
import { buildRelatedColumns } from '@/components/common/relatedColumns';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';
import { formatCurrency } from '@/utils/format';

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: '草稿', active: '执行中', suspended: '已暂停',
  completed: '已完成', terminated: '已终止',
};
// 销售合同状态 → 集中 statusConfig key（均为通用 key，contract_active 已登记「执行中」）
const SC_STATUS_KEY: Record<ContractStatus, string> = {
  draft: 'draft',
  active: 'contract_active',
  suspended: 'suspended',
  completed: 'completed',
  terminated: 'terminated',
};

const SalesContractList: React.FC = () => {
  const navigate = useNavigate();
  useEnsureRelatedStores('salesContract');
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const contracts = useSalesContractStore((s) => s.contracts);
  const addContract = useSalesContractStore((s) => s.addContract);
  const deleteContract = useSalesContractStore((s) => s.deleteContract);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── 列定义（驱动 DataTable）──
  const columns: ColumnDef<SalesContract, unknown>[] = [
    {
      id: 'contractNo',
      header: '合同编号',
      meta: { searchable: true },
      accessorFn: (c) => c.contractNo,
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" color="#3B82F6" fontWeight={500}>
          {row.original.contractNo}
        </Typography>
      ),
    },
    {
      id: 'name',
      header: '合同名称',
      meta: { searchable: true },
      accessorFn: (c) => c.name,
      cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.name}</Typography>,
    },
    {
      id: 'customerName',
      header: '客户',
      meta: { searchable: true },
      accessorFn: (c) => c.customerName,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>{row.original.customerName}</Typography>
          <Typography variant="caption" color="text.secondary">{row.original.customerCode || ''}</Typography>
        </Box>
      ),
    },
    {
      id: 'amount',
      header: '合同金额',
      meta: { searchable: true },
      accessorFn: (c) => c.amount,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight={500}>{formatCurrency(row.original.amount)}</Typography>
        </Box>
      ),
    },
    {
      id: 'startDate',
      header: '开始日期',
      meta: { searchable: true },
      accessorFn: (c) => c.startDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.startDate}</Typography>,
    },
    {
      id: 'endDate',
      header: '结束日期',
      meta: { searchable: true },
      accessorFn: (c) => c.endDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.endDate}</Typography>,
    },
    {
      id: 'status',
      header: '状态',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      },
      accessorFn: (c) => STATUS_LABELS[c.status],
      cell: ({ row }) => <StatusBadge status={SC_STATUS_KEY[row.original.status]} />,
    },
    ...(buildRelatedColumns() as ColumnDef<SalesContract, unknown>[]),
  ];

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filtered = useMemo(
    () => applyColumnFilters(withRelatedDocNos('salesContract', contracts), columns, filterData, { module: 'sales' }),
    [contracts, columns, filterData]
  );

  // ── 导入：把表头行映射回 store 字段 ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const toNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r: Record<string, string>, headers: string[]): SalesContract => {
    const now = new Date().toISOString();
    const statusVal = pickField(r, headers, '状态', 'status') || 'draft';
    return {
      id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      contractNo: pickField(r, headers, '合同编号', 'contractNo') || `CT${now.slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`,
      name: pickField(r, headers, '合同名称', 'name'),
      customerId: pickField(r, headers, '客户ID', 'customerId') || '',
      customerName: pickField(r, headers, '客户', 'customerName'),
      customerCode: pickField(r, headers, '客户编码', 'customerCode') || undefined,
      salesPerson: pickField(r, headers, '销售员', 'salesPerson') || undefined,
      amount: toNum(pickField(r, headers, '合同金额', 'amount')),
      startDate: pickField(r, headers, '开始日期', 'startDate') || now.slice(0, 10),
      endDate: pickField(r, headers, '结束日期', 'endDate') || now.slice(0, 10),
      status: (Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : 'draft') as ContractStatus,
      items: [],
      paymentSchedule: [],
      createdAt: now,
      updatedAt: now,
    } as unknown as SalesContract;
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addContract(mapImportRow(r, headers)));
  };

  return (
    <PageWrapper
      title="销售合同管理"
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/sales/contracts/create')}>
          新建合同
        </Button>
      }
    >
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '全部', count: contracts.length, color: '#6366F1' },
          { label: '执行中', count: contracts.filter((c) => c.status === 'active').length, color: '#10B981' },
          { label: '草稿', count: contracts.filter((c) => c.status === 'draft').length, color: '#94A3B8' },
          { label: '已完成', count: contracts.filter((c) => c.status === 'completed').length, color: '#3B82F6' },
          { label: '已暂停', count: contracts.filter((c) => c.status === 'suspended').length, color: '#F59E0B' },
        ].map((s) => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.count}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 列驱动统一检索条（默认显前 5 项检索框，其余「更多筛选」展开） */}
      <FilterBar columns={columns} module="sales" onSearch={setFilterData} listKey="sales-contract-list" />

      {/* 合同列表 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable<SalesContract>
          data={filtered}
          columns={columns}
          hiddenColumns={['upstreamNo', 'downstreamNo']}
          enableExport
          enableImport
          columnConfigKey="sales-contract-list"
          codeColumnId="contractNo"
          onRowClick={(c) => navigate(`/sales/contracts/${c.id}`)}
          onView={(c) => navigate(`/sales/contracts/${c.id}`)}
          onEdit={(c) => navigate(`/sales/contracts/${c.id}/edit`)}
          onDelete={(c) => setDeleteId(c.id)}
          onImport={handleImport}
        />
      </Paper>

      <ConfirmDialog
        open={!!deleteId}
        title="确认删除合同"
        content={
          deleteId
            ? `确定要删除合同 "${contracts.find((c) => c.id === deleteId)?.contractNo}" 吗？此操作不可逆。`
            : ''
        }
        onConfirm={() => {
          if (deleteId) {
            deleteContract(deleteId);
            setDeleteId(null);
          }
        }}
        onCancel={() => setDeleteId(null)}
        confirmText="确认删除"
        confirmColor="error"
      />
    </PageWrapper>
  );
};

export default SalesContractList;
