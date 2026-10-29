import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Card, CardContent, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import { DataTable, FilterBar } from '@/components/common';
import { PageWrapper } from '@/components/layout';
import type { ColumnDef } from '@tanstack/react-table';
import { useArapStore } from '@/stores/arapStore';
import { applyColumnFilters } from '@/utils/listSearch';
import { useTypedRelated } from '@/utils/relations/useTypedRelated';
import RelatedDocLinks from '@/components/common/RelatedDocLinks';
import type { RelatedDocRef } from '@/utils/relations/documentRelations';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';
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
  const { payables, addPayable, hydrateArap } = useArapStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // V3.76.0：应付台账迁 D1（fin_payables）——页面挂载从权威源水合（未登录自动跳过）
  useEffect(() => { void hydrateArap(); }, [hydrateArap]);
  useEnsureRelatedStores('payable');

  // 付款建议
  const payAdvice = (p: Payable): string => {
    if (p.status === 'closed') return '—';
    if (p.agingBucket === '90+') return '紧急安排付款';
    if (p.agingBucket === '61-90') return '尽快安排付款';
    if (p.agingBucket === '31-60') return '本周内安排';
    if (p.agingBucket === '1-30') return '下周安排';
    return '按计划付款';
  };

  // ── 详情弹窗状态（V3.115.0）：提前声明，供 columns 内的「详情」按钮闭包引用 ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Payable | null>(null);

  const columns: ColumnDef<Payable, unknown>[] = [
    {
      id: 'vendorName',
      header: '供应商',
      meta: { searchable: true },
      accessorFn: (r) => r.vendorName,
      cell: ({ row }) => <>{row.original.vendorName}</>,
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
    // V3.115.0：关联单据按实际类型分列（采购发票 / 付款计划 …），每格「单号 + 状态」，点单号直达单据
  ];

  const rel = useTypedRelated('payable', payables);
  const allColumns = useMemo(
    () => [...columns, ...(rel.columns as ColumnDef<Payable, unknown>[])],
    [columns, rel.columns]
  );

  // ── 列驱动统一检索（meta.searchable 声明的列均可按字段权限查询；默认显前 5 项，其余「更多筛选」展开）──
  const filtered = useMemo(
    () => applyColumnFilters(rel.data, allColumns, filterData, { module: 'finance' }),
    [rel.data, allColumns, filterData]
  );

  // ── 深链（V3.115.0）：应付原本没有详情页，别处点关联单据过来只能看到一张列表。
  //    现补详情弹窗 + 支持 ?focus=<应付id> 自动打开。 ──
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const handledFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || handledFocusRef.current === focusId) return;
    const list = Array.isArray(payables) ? payables : [];
    const hit = list.find((p) => String(p.id) === String(focusId));
    if (!hit) return;
    handledFocusRef.current = focusId;
    setSelected(hit);
    setDetailOpen(true);
  }, [focusId, payables]);

  /** 当前详情行（含关联单据字段） */
  const selectedRow = useMemo(
    () => (selected ? rel.data.find((r) => String(r.id) === String(selected.id)) : undefined),
    [selected, rel.data]
  );

  // 账龄汇总（依赖过滤后的数据）
  const agingSummary = useMemo(() => {
    const map: Record<AgingBucket, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    filtered.forEach((p) => { map[p.agingBucket] += p.balance; });
    return map;
  }, [filtered]);

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

      {/* 列驱动统一检索条（默认显前 5 项检索框，其余「更多筛选」展开） */}
      <FilterBar columns={allColumns} module="finance" onSearch={setFilterData} listKey="payable-list" />

      {/* 应付表格 */}
      <DataTable<Payable>
        data={filtered}
        columns={allColumns}
        enableRowSelection={false}
        enablePagination
        enableSorting
        enableColumnFilter
        enableBlockSelect
        enableExport
        exportFormat="xlsx"
        enableImport
        hiddenColumns={rel.hiddenColumns}
        onRowClick={(row) => { setSelected(row as Payable); setDetailOpen(true); }}
        onView={(row) => { setSelected(row as Payable); setDetailOpen(true); }}
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

      {/* 应付详情（V3.115.0 新增）：支持从其他单据列表点「应付单」深链直达（?focus=<id>） */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>应付详情 — {selected?.invoiceNo}</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <>
              <Grid container spacing={1.5}>
                {[
                  { label: '供应商', value: selected.vendorName || '-' },
                  { label: '发票号', value: selected.invoiceNo || '-' },
                  { label: '金额', value: `¥${Number(selected.amount).toLocaleString()}` },
                  { label: '已付', value: `¥${Number(selected.paidAmount).toLocaleString()}` },
                  { label: '余额', value: `¥${Number(selected.balance).toLocaleString()}` },
                  { label: '到期日', value: selected.dueDate || '-' },
                  { label: '账龄', value: AGING_LABELS[selected.agingBucket]?.label ?? selected.agingBucket },
                  { label: '状态', value: STATUS_LABEL[selected.status] ?? selected.status },
                  ...(selected.remarks ? [{ label: '备注', value: selected.remarks }] : []),
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body2">{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>关联单据</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 64 }}>来源单据</Typography>
                  <RelatedDocLinks docs={(selectedRow?.upstreamDocs ?? []) as RelatedDocRef[]} showType showStatus />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 64 }}>后续单据</Typography>
                  <RelatedDocLinks docs={(selectedRow?.downstreamDocs ?? []) as RelatedDocRef[]} showType showStatus />
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
}
