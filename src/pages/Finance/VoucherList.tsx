import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Grid, TextField, MenuItem,
  Alert, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DataTable } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { useFinanceStore } from '@/stores/financeStore';
import type { Voucher, VoucherStatus, VoucherItem } from '@/types/finance';
import { VOUCHER_STATUS_COLOR, VOUCHER_STATUS_LABEL } from '@/utils/voucher';
import VoucherForm from './VoucherForm';

const STATUS_OPTIONS: { value: VoucherStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'draft', label: '制单' },
  { value: 'reviewed', label: '已审核' },
  { value: 'posted', label: '已过账' },
  { value: 'reversed', label: '已冲销' },
];

export default function VoucherList() {
  const {
    vouchers, createVoucher, reviewVoucher, unreviewVoucher, postVoucher, reverseVoucher, deleteVoucher,
  } = useFinanceStore();

  const [status, setStatus] = useState<VoucherStatus | 'all'>('all');
  const [period, setPeriod] = useState('');
  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [reverseTarget, setReverseTarget] = useState<Voucher | null>(null);

  const periods = useMemo(
    () => Array.from(new Set(vouchers.map((v) => v.period).filter(Boolean))).sort().reverse(),
    [vouchers]
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (status !== 'all' && v.status !== status) return false;
      if (period && v.period !== period) return false;
      if (kw) {
        const hay = `${v.voucherNo} ${v.remark || ''} ${v.items.map((i) => `${i.summary}${i.accountName}`).join(' ')}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [vouchers, status, period, keyword]);

  const totalLines = vouchers.reduce((s, v) => s + v.items.length, 0);
  const stat = (s: VoucherStatus) => vouchers.filter((v) => v.status === s).length;
  const unbalanced = vouchers.filter((v) => Math.abs(v.totalDebit - v.totalCredit) >= 0.005).length;

  const run = (fn: () => { ok: boolean; message: string }) => {
    const r = fn();
    setMsg({ text: r.message, ok: r.ok });
  };

  // 凭证导入：每行是一笔分录，按「凭证号」分组，同号多行聚合成一张凭证的分录
  const handleImportVouchers = (rows: Record<string, string>[], headers: string[]) => {
    const pick = (r: Record<string, string>, zh: string, en: string): string => {
      const key = headers.find(
        (h) => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase(),
      );
      return key ? (r[key] ?? '').trim() : '';
    };
    const num = (v: string): number => {
      const n = Number(String(v).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };
    const groups = new Map<string, Record<string, string>[]>();
    rows.forEach((r) => {
      const no = pick(r, '凭证号', 'voucherNo');
      const key = no || `single-${Math.random().toString(36).slice(2, 8)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    let okCount = 0;
    let failCount = 0;
    groups.forEach((lines) => {
      const first = lines[0];
      const date = pick(first, '日期', 'date') || new Date().toISOString().slice(0, 10);
      const voucherType = pick(first, '凭证字', 'voucherType') || '记';
      const remark = pick(first, '备注', 'remark');
      const attachmentCount = Math.round(num(pick(first, '附单据', 'attachmentCount')));
      const items: VoucherItem[] = lines.map((r, idx) => ({
        id: `vi-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        lineNo: idx + 1,
        summary: pick(r, '摘要', 'summary'),
        accountCode: pick(r, '科目编码', 'accountCode'),
        accountName: pick(r, '科目名称', 'accountName'),
        debit: num(pick(r, '借方', 'debit')),
        credit: num(pick(r, '贷方', 'credit')),
      }));
      const res = createVoucher({ date, voucherType, items, attachmentCount, remark, createdBy: '导入' });
      if (res.ok) okCount += 1;
      else failCount += 1;
    });
    setMsg({
      text: `凭证导入完成：成功 ${okCount} 张，失败 ${failCount} 张${failCount > 0 ? '（失败多为借贷不平或已结账期间）' : ''}`,
      ok: failCount === 0,
    });
  };

  const cards = [
    { label: '凭证总数', value: vouchers.length, color: 'text.primary' },
    { label: '制单', value: stat('draft'), color: 'text.secondary' },
    { label: '已审核', value: stat('reviewed'), color: 'info.main' },
    { label: '已过账', value: stat('posted'), color: 'success.main' },
    { label: '已冲销', value: stat('reversed'), color: 'error.main' },
    { label: '借贷不平', value: unbalanced, color: unbalanced ? 'error.main' : 'success.main' },
  ];

  const columns: ColumnDef<Voucher, unknown>[] = [
    {
      id: 'voucherNo',
      header: '凭证号',
      accessorFn: (r) => r.voucherNo,
      cell: ({ row }) => (
        <Typography variant="subtitle2" fontWeight={700} fontFamily="monospace">{row.original.voucherNo}</Typography>
      ),
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (r) => r.status,
      cell: ({ row }) => (
        <Chip size="small" label={VOUCHER_STATUS_LABEL[row.original.status]} color={VOUCHER_STATUS_COLOR[row.original.status]} />
      ),
    },
    {
      id: 'date',
      header: '日期',
      accessorFn: (r) => r.date,
      cell: ({ row }) => <Typography variant="body2" color="text.secondary">{row.original.date}</Typography>,
    },
    {
      id: 'lines',
      header: '分录',
      accessorFn: (r) => r.items.length,
      cell: ({ row }) => <Chip size="small" variant="outlined" label={`${row.original.items.length} 行`} />,
    },
    {
      id: 'attachment',
      header: '附单据',
      accessorFn: (r) => r.attachmentCount,
      cell: ({ row }) => row.original.attachmentCount > 0
        ? <Chip size="small" variant="outlined" label={`附单据 ${row.original.attachmentCount}`} />
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      id: 'amount',
      header: '借 / 贷',
      accessorFn: (r) => r.totalDebit,
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={700}>
          借 ¥{row.original.totalDebit.toLocaleString()} / 贷 ¥{row.original.totalCredit.toLocaleString()}
        </Typography>
      ),
    },
    {
      id: 'balanced',
      header: '平衡',
      accessorFn: (r) => Math.abs(r.totalDebit - r.totalCredit),
      cell: ({ row }) => {
        const diff = Math.round((row.original.totalDebit - row.original.totalCredit) * 100) / 100;
        return Math.abs(diff) >= 0.005
          ? <Chip size="small" color="error" label={`不平 ${diff.toFixed(2)}`} />
          : <Chip size="small" color="success" variant="outlined" label="平衡" />;
      },
    },
    {
      id: 'reversal',
      header: '冲销关系',
      accessorFn: (r) => r.originalVoucherNo || r.reversalVoucherNo || '',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {row.original.originalVoucherNo && (
            <Chip size="small" color="error" variant="outlined" label={`红冲 ${row.original.originalVoucherNo}`} />
          )}
          {row.original.reversalVoucherNo && (
            <Chip size="small" color="warning" variant="outlined" label={`已由 ${row.original.reversalVoucherNo} 冲销`} />
          )}
        </Box>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => {
        const v = row.original;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {v.status === 'draft' && (
              <>
                <Button size="small" onClick={(e) => { e.stopPropagation(); setEditing(v); setFormOpen(true); }}>修改</Button>
                <Button size="small" variant="outlined"
                  onClick={(e) => { e.stopPropagation(); run(() => reviewVoucher(v.id, '当前用户')); }}>审核</Button>
                <Button size="small" color="error"
                  onClick={(e) => { e.stopPropagation(); run(() => deleteVoucher(v.id)); }}>删除</Button>
              </>
            )}
            {v.status === 'reviewed' && (
              <>
                <Button size="small"
                  onClick={(e) => { e.stopPropagation(); run(() => unreviewVoucher(v.id)); }}>反审核</Button>
                <Button size="small" variant="contained"
                  onClick={(e) => { e.stopPropagation(); run(() => postVoucher(v.id, '当前用户')); }}>过账</Button>
              </>
            )}
            {v.status === 'posted' && (
              <Button size="small" color="error" variant="outlined"
                onClick={(e) => { e.stopPropagation(); setReverseTarget(v); }}>冲销</Button>
            )}
            {v.status === 'reversed' && <Typography variant="caption" color="error.main">已冲销，不可再操作</Typography>}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>记账凭证</Typography>
        <Box flex={1} />
        <Typography variant="caption" color="text.secondary" data-testid="voucher-count">
          共 {vouchers.length} 张凭证 / {totalLines} 条分录
        </Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          data-testid="voucher-new-btn"
          onClick={() => { setEditing(null); setFormOpen(true); }}>
          新增凭证
        </Button>
      </Box>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {cards.map((c) => (
          <Grid item xs={6} sm={4} md={2} key={c.label}>
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                <Typography variant="h6" fontWeight={700} color={c.color}>{c.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }}
          data-testid="voucher-op-msg" onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="状态" value={status}
              data-testid="voucher-filter-status"
              onChange={(e) => setStatus(e.target.value as VoucherStatus | 'all')}>
              {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField select fullWidth size="small" label="会计期间" value={period}
              data-testid="voucher-filter-period"
              onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value="">全部期间</MenuItem>
              {periods.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="搜索凭证号 / 摘要 / 科目" value={keyword}
              data-testid="voucher-filter-kw"
              onChange={(e) => setKeyword(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <DataTable<Voucher>
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
        onImport={handleImportVouchers}
        columnConfigKey="voucher-list"
      />

      <Typography variant="caption" color="text.secondary">
        凭证状态流转：制单 → 审核 → 过账 → 冲销。仅「已过账」凭证进入总账明细并被三大报表取数；保存前强制校验 Σ借 = Σ贷。
      </Typography>

      {/* 冲销确认对话框 */}
      <Dialog open={!!reverseTarget} onClose={() => setReverseTarget(null)}
        data-testid="voucher-reverse-dialog">
        <DialogTitle>确认冲销凭证</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确认冲销凭证 {reverseTarget?.voucherNo}？将生成红字冲销凭证。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReverseTarget(null)}>取消</Button>
          <Button data-testid="voucher-reverse-confirm" color="error" variant="contained"
            onClick={() => {
              if (!reverseTarget) return;
              run(() => reverseVoucher(reverseTarget.id, '当前用户'));
              setReverseTarget(null);
            }}>
            确认冲销
          </Button>
        </DialogActions>
      </Dialog>

      <VoucherForm
        open={formOpen}
        voucher={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(text, ok) => setMsg({ text, ok })}
      />
    </Box>
  );
}
