import { useMemo, useState } from 'react';
import {
  Box, Typography, Chip, Grid, Card, CardContent, TextField, MenuItem, Button,
} from '@mui/material';
import { DataTable } from '@/components/common';
import { PageWrapper } from '@/components/layout';
import type { ColumnDef } from '@tanstack/react-table';
import { useArapStore } from '@/stores/arapStore';
import type { Payable, AgingBucket } from '@/types';

const AGING_LABELS: Record<AgingBucket, { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
  current: { label: '未到期', color: 'success' },
  '1-30': { label: '1-30天', color: 'info' },
  '31-60': { label: '31-60天', color: 'warning' },
  '61-90': { label: '61-90天', color: 'warning' },
  '90+': { label: '90天以上', color: 'error' },
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'open', label: '未付' },
  { value: 'partial', label: '部分已付' },
  { value: 'overdue', label: '已逾期' },
  { value: 'closed', label: '已结清' },
];

const AGING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '全部账龄' },
  ...(['current', '1-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((v) => ({
    value: v,
    label: AGING_LABELS[v]?.label ?? v,
  })),
];

const STATUS_LABEL: Record<string, string> = {
  open: '未付', partial: '部分已付', overdue: '已逾期', closed: '已结清',
};
const STATUS_COLOR: Record<string, 'error' | 'success' | 'default'> = {
  overdue: 'error', closed: 'success', open: 'default', partial: 'default',
};

export default function PayableList() {
  const { payables, addPayable } = useArapStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');

  const filtered = useMemo(() => {
    let data = [...payables];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((p) => p.vendorName.toLowerCase().includes(s) || p.invoiceNo.toLowerCase().includes(s));
    }
    if (statusFilter) data = data.filter((p) => p.status === statusFilter);
    if (agingFilter) data = data.filter((p) => p.agingBucket === agingFilter);
    return data;
  }, [payables, search, statusFilter, agingFilter]);

  // 账龄汇总
  const agingSummary = useMemo(() => {
    const map: Record<AgingBucket, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    filtered.forEach((p) => { map[p.agingBucket] += p.balance; });
    return map;
  }, [filtered]);

  // 付款建议
  const payAdvice = (p: Payable): string => {
    if (p.status === 'closed') return '—';
    if (p.agingBucket === '90+') return '紧急安排付款';
    if (p.agingBucket === '61-90') return '尽快安排付款';
    if (p.agingBucket === '31-60') return '本周内安排';
    if (p.agingBucket === '1-30') return '下周安排';
    return '按计划付款';
  };

  const columns: ColumnDef<Payable, unknown>[] = [
    {
      id: 'vendorName',
      header: '供应商',
      accessorFn: (r) => r.vendorName,
      cell: ({ row }) => <>{row.original.vendorName}</>,
    },
    {
      id: 'invoiceNo',
      header: '发票号',
      accessorFn: (r) => r.invoiceNo,
      cell: ({ row }) => <>{row.original.invoiceNo}</>,
    },
    {
      id: 'amount',
      header: '金额',
      accessorFn: (r) => Number(r.amount) || 0,
      cell: ({ row }) => <Typography align="right">{row.original.amount.toLocaleString()}</Typography>,
    },
    {
      id: 'paidAmount',
      header: '已付',
      accessorFn: (r) => Number(r.paidAmount) || 0,
      cell: ({ row }) => <Typography align="right">{row.original.paidAmount.toLocaleString()}</Typography>,
    },
    {
      id: 'balance',
      header: '余额',
      accessorFn: (r) => Number(r.balance) || 0,
      cell: ({ row }) => (
        <Typography align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>{row.original.balance.toLocaleString()}</Typography>
      ),
    },
    {
      id: 'dueDate',
      header: '到期日',
      accessorFn: (r) => r.dueDate,
      cell: ({ row }) => <>{row.original.dueDate}</>,
    },
    {
      id: 'agingBucket',
      header: '账龄',
      accessorFn: (r) => r.agingBucket,
      cell: ({ row }) => (
        <Chip size="small" label={AGING_LABELS[row.original.agingBucket].label} color={AGING_LABELS[row.original.agingBucket].color} />
      ),
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (r) => r.status,
      cell: ({ row }) => (
        <Chip size="small" label={STATUS_LABEL[row.original.status]} color={STATUS_COLOR[row.original.status]} />
      ),
    },
    {
      id: 'advice',
      header: '付款建议',
      enableSorting: false,
      enableColumnFilter: false,
      accessorFn: () => '',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Button size="small" variant="outlined" color={
            p.agingBucket === '90+' ? 'error' : p.agingBucket === '61-90' ? 'warning' : 'primary'
          } data-testid={`ap-pay-suggest-${p.agingBucket}`}>
            {payAdvice(p)}
          </Button>
        );
      },
    },
  ];

  return (
    <PageWrapper title="应付管理">
      {/* 账龄汇总卡 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {(['current', '1-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((b) => (
          <Grid item xs={6} sm={4} md={2.4} key={b}>
            <Card data-testid={`ap-card-${b}`} sx={{ bgcolor: b === '90+' ? 'error.light' : 'background.paper' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{AGING_LABELS[b].label}</Typography>
                <Typography variant="h6" fontWeight={600} color={b === '90+' ? 'error.dark' : 'text.primary'}>
                  {agingSummary[b].toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 搜索与筛选 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small" label="搜索供应商/发票号" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }}
          data-testid="ap-search"
        />
        <TextField select size="small" label="状态" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 120 }}>
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="账龄" value={agingFilter}
          onChange={(e) => setAgingFilter(e.target.value)} sx={{ minWidth: 120 }}>
          {AGING_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Box>

      {/* 应付表格 */}
      <DataTable<Payable>
        data={filtered}
        columns={columns}
        enableRowSelection={false}
        enablePagination
        enableSorting
        enableColumnFilter
        enableBlockSelect
        enableExport
        exportFormat="xlsx"
        enableImport
        onImport={(rows) => {
          rows.forEach((r) => {
            const now = new Date().toISOString();
            addPayable({
              id: `ap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              vendorId: r['供应商ID'] || `vend-${Date.now()}`,
              vendorName: r['供应商'] || '',
              invoiceNo: r['发票号'] || '',
              amount: Number(r['金额'] || 0),
              paidAmount: Number(r['已付'] || 0),
              balance: Number(r['余额'] || Number(r['金额'] || 0)),
              dueDate: r['到期日'] || now.slice(0, 10),
              status: (r['状态'] as Payable['status']) || 'open',
              agingBucket: 'current',
              remarks: r['备注'],
            });
          });
        }}
        columnConfigKey="payable-list"
      />
    </PageWrapper>
  );
}
