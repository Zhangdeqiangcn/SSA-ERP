import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, TextField, Stack,
  Tooltip, MenuItem,
} from '@mui/material';
import { Add, Visibility, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { SalesContract, ContractStatus } from '@/types';
import { PageWrapper } from '@/components/layout';
import { DataTable, ConfirmDialog } from '@/components/common';
import { formatCurrency } from '@/utils/format';

const STATUS_LABELS: Record<ContractStatus, string> = {
  draft: '草稿', active: '执行中', suspended: '已暂停',
  completed: '已完成', terminated: '已终止',
};
const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: '#94A3B8', active: '#10B981', suspended: '#F59E0B',
  completed: '#3B82F6', terminated: '#EF4444',
};

const SalesContractList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
  const contracts = useSalesContractStore((s) => s.contracts);
  const addContract = useSalesContractStore((s) => s.addContract);
  const deleteContract = useSalesContractStore((s) => s.deleteContract);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = contracts.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search && !c.contractNo.includes(search) && !c.customerName.includes(search) && !c.name.includes(search)) return false;
    return true;
  });

  // ── 列定义（驱动 DataTable）──
  const columns: ColumnDef<SalesContract, unknown>[] = [
    {
      id: 'contractNo',
      header: '合同编号',
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
      accessorFn: (c) => c.name,
      cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.name}</Typography>,
    },
    {
      id: 'customerName',
      header: '客户',
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
      accessorFn: (c) => c.startDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.startDate}</Typography>,
    },
    {
      id: 'endDate',
      header: '结束日期',
      accessorFn: (c) => c.endDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.endDate}</Typography>,
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (c) => STATUS_LABELS[c.status],
      cell: ({ row }) => (
        <Chip label={STATUS_LABELS[row.original.status]} size="small"
          sx={{ bgcolor: STATUS_COLORS[row.original.status] + '15', color: STATUS_COLORS[row.original.status], fontWeight: 500 }} />
      ),
    },
  ];

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

      {/* 搜索与筛选 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small" placeholder="搜索合同号/客户/合同名称" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Typography sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }}>🔍</Typography> }}
            sx={{ width: 360 }}
          />
          <TextField
            select size="small" label="状态" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContractStatus | '')}
            sx={{ width: 160 }}
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* 合同列表 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable<SalesContract>
          data={filtered}
          columns={columns}
          enableExport
          enableImport
          columnConfigKey="sales-contract-list"
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
