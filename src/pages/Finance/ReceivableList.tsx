import { useMemo, useState, useEffect } from 'react';
import {
  Box, Typography, Chip, Grid, Card, CardContent,
} from '@mui/material';
import { DataTable, FilterBar } from '@/components/common';
import { PageWrapper } from '@/components/layout';
import type { ColumnDef } from '@tanstack/react-table';
import { useArapStore } from '@/stores/arapStore';
import { applyColumnFilters } from '@/utils/listSearch';
import type { Receivable, AgingBucket } from '@/types';

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
  '', 'current', '1-30', '31-60', '61-90', '90+',
].map((v) => ({ value: v, label: v ? AGING_LABELS[v as AgingBucket]?.label ?? v : '全部账龄' }));

const STATUS_LABEL: Record<string, string> = {
  open: '未付', partial: '部分已付', overdue: '已逾期', closed: '已结清',
};
const STATUS_COLOR: Record<string, 'error' | 'success' | 'default'> = {
  overdue: 'error', closed: 'success', open: 'default', partial: 'default',
};

export default function ReceivableList() {
  const { receivables, addReceivable, hydrateArap } = useArapStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // V3.76.0：应收台账迁 D1（fin_receivables）——页面挂载从权威源水合（未登录自动跳过）
  useEffect(() => { void hydrateArap(); }, [hydrateArap]);

  // 催款建议
  const dunningAdvice = (r: Receivable): string => {
    if (r.status === 'closed') return '—';
    if (r.agingBucket === '90+') return '强烈催收 / 考虑律师函';
    if (r.agingBucket === '61-90') return '电话催收 + 正式催款函';
    if (r.agingBucket === '31-60') return '电话提醒';
    if (r.agingBucket === '1-30') return '邮件提醒';
    return '正常跟进';
  };

  const columns: ColumnDef<Receivable, unknown>[] = [
    {
      id: 'customerName',
      header: '客户',
      meta: { searchable: true },
      accessorFn: (r) => r.customerName,
      cell: ({ row }) => <>{row.original.customerName}</>,
    },
    {
      id: 'invoiceNo',
      header: '发票号',
      meta: { searchable: true },
      accessorFn: (r) => r.invoiceNo,
      cell: ({ row }) => <>{row.original.invoiceNo}</>,
    },
    {
      id: 'amount',
      header: '金额',
      meta: { searchable: true },
      accessorFn: (r) => Number(r.amount) || 0,
      cell: ({ row }) => <Typography align="right">{row.original.amount.toLocaleString()}</Typography>,
    },
    {
      id: 'paidAmount',
      header: '已付',
      meta: { searchable: true },
      accessorFn: (r) => Number(r.paidAmount) || 0,
      cell: ({ row }) => <Typography align="right">{row.original.paidAmount.toLocaleString()}</Typography>,
    },
    {
      id: 'balance',
      header: '余额',
      meta: { searchable: true },
      accessorFn: (r) => Number(r.balance) || 0,
      cell: ({ row }) => (
        <Typography align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>{row.original.balance.toLocaleString()}</Typography>
      ),
    },
    {
      id: 'dueDate',
      header: '到期日',
      meta: { searchable: true },
      accessorFn: (r) => r.dueDate,
      cell: ({ row }) => <>{row.original.dueDate}</>,
    },
    {
      id: 'agingBucket',
      header: '账龄',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: AGING_OPTIONS.filter((o) => o.value !== ''),
      },
      accessorFn: (r) => r.agingBucket,
      cell: ({ row }) => (
        <Chip size="small" label={AGING_LABELS[row.original.agingBucket].label} color={AGING_LABELS[row.original.agingBucket].color} />
      ),
    },
    {
      id: 'status',
      header: '状态',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: STATUS_OPTIONS.filter((o) => o.value !== ''),
      },
      accessorFn: (r) => r.status,
      cell: ({ row }) => (
        <Chip size="small" label={STATUS_LABEL[row.original.status]} color={STATUS_COLOR[row.original.status]} />
      ),
    },
    {
      id: 'dunning',
      header: '催款建议',
      enableSorting: false,
      enableColumnFilter: false,
      accessorFn: () => '',
      cell: ({ row }) => <Typography variant="body2">{row.original.remarks || dunningAdvice(row.original)}</Typography>,
    },
  ];

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filtered = useMemo(
    () => applyColumnFilters(receivables, columns, filterData, { module: 'finance' }),
    [receivables, columns, filterData]
  );

  // 账龄汇总（依赖过滤后的数据）
  const agingSummary = useMemo(() => {
    const map: Record<AgingBucket, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    filtered.forEach((r) => { map[r.agingBucket] += r.balance; });
    return map;
  }, [filtered]);

  return (
    <PageWrapper title="应收管理">
      {/* 账龄汇总卡 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {(['current', '1-30', '31-60', '61-90', '90+'] as AgingBucket[]).map((b) => (
          <Grid item xs={6} sm={4} md={2.4} key={b}>
            <Card data-testid={`ar-card-${b}`} sx={{ bgcolor: b === '90+' ? 'error.light' : 'background.paper' }}>
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

      {/* 列驱动统一检索条（默认显前 5 项检索框，其余「更多筛选」展开） */}
      <FilterBar columns={columns} module="finance" onSearch={setFilterData} listKey="receivable-list" />

      {/* 应收表格 */}
      <DataTable<Receivable>
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
            addReceivable({
              id: `ar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              customerId: r['客户ID'] || `cust-${Date.now()}`,
              customerName: r['客户'] || '',
              invoiceNo: r['发票号'] || '',
              amount: Number(r['金额'] || 0),
              paidAmount: Number(r['已付'] || 0),
              balance: Number(r['余额'] || Number(r['金额'] || 0)),
              dueDate: r['到期日'] || now.slice(0, 10),
              status: (r['状态'] as Receivable['status']) || 'open',
              agingBucket: 'current',
              remarks: r['备注'],
            });
          });
        }}
        columnConfigKey="receivable-list"
      />
    </PageWrapper>
  );
}
