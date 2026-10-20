/**
 * 供应商门户 —— 付款计划查询
 * 路由：/vendor-portal/finance/payments
 * 供应商可查询采购方对自己的付款计划，按供应商自动过滤
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Stack, Chip, Button, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, LinearProgress, Alert, Tooltip,
  Collapse, MenuItem,
} from '@mui/material';
import {
  Payment, AccessAlarm, CheckCircle, Schedule,
  AttachMoney, FilterList, Clear, ExpandMore, ExpandLess,
  CalendarToday, Receipt,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { StatusBadge, FilterBar } from '@/components/common';
import { useFinanceStore } from '@/stores/financeStore';
import { formatCurrency } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import { applyColumnFilters } from '@/utils/listSearch';

// 付款计划状态 → 集中 statusConfig key（overdue 复用通用 key）
const PP_STATUS_KEY: Record<string, string> = {
  pending: 'pp_pending',
  partial: 'pp_partial',
  paid: 'pp_paid',
  overdue: 'overdue',
};

const VendorPaymentPlan: React.FC = () => {
  const navigate = useNavigate();
  const paymentPlans = useFinanceStore(s => s.paymentPlans);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vendorCode, setVendorCode] = useState('V001'); // 默认当前登录供应商

  useEffect(() => {
    const stored = sessionStorage.getItem('vendorPortalUser');
    if (!stored) {
      navigate('/vendor-portal/login');
      return;
    }
    const user = JSON.parse(stored);
    setVendorCode(user.code || 'V001');
  }, [navigate]);

  // 按当前供应商过滤
  const vendorFiltered = useMemo(() => {
    return paymentPlans.filter(p => p.vendorName.includes(vendorCode) ||
      // 模拟：按供应商代码关联（实际应根据vendorCode字段过滤）
      ['上海宝钢钢铁贸易有限公司'].some(name => p.vendorName.includes('宝钢') || p.vendorName.includes('钢铁')));
  }, [vendorCode]);

  // 列定义（驱动检索条派生检索项）
  const columns: ColumnDef<typeof vendorFiltered[number], unknown>[] = [
    { id: 'planNo', header: '计划号', accessorFn: (p) => p.planNo, meta: { searchable: true } },
    { id: 'invoiceNo', header: '关联发票', accessorFn: (p) => p.invoiceNo, meta: { searchable: true } },
    { id: 'vendorName', header: '供应商', accessorFn: (p) => p.vendorName, meta: { searchable: true } },
    { id: 'paymentMethod', header: '付款方式', accessorFn: (p) => p.paymentMethod, meta: { searchable: true } },
    { id: 'dueDate', header: '到期日', accessorFn: (p) => p.dueDate, meta: { searchable: true } },
    {
      id: 'status',
      header: '状态',
      accessorFn: (p) => p.status,
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'pending', label: '待支付' },
          { value: 'partial', label: '部分付款' },
          { value: 'paid', label: '已付清' },
          { value: 'overdue', label: '已逾期' },
        ],
      },
    },
  ];

  // 进一步搜索筛选（文本+状态走标准化 FilterBar；日期区间保留自定义）
  const filtered = useMemo(() => {
    let data = applyColumnFilters(vendorFiltered, columns, filterData, { module: 'vendor' });
    if (dateFrom) data = data.filter(p => p.dueDate >= dateFrom);
    if (dateTo) data = data.filter(p => p.dueDate <= dateTo);
    return data;
  }, [vendorFiltered, columns, filterData, dateFrom, dateTo]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setShowAdvanced(false);
  };

  const hasActiveFilter = dateFrom || dateTo;

  // 统计
  const stats = useMemo(() => {
    const total = vendorFiltered.length;
    const overdue = vendorFiltered.filter(p => p.status === 'overdue').length;
    const pending = vendorFiltered.filter(p => p.status === 'pending').length;
    const totalAmount = vendorFiltered.reduce((s, p) => s + p.totalAmount, 0);
    const unpaidAmount = vendorFiltered
      .filter(p => p.status !== 'paid')
      .reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0);
    return { total, overdue, pending, totalAmount, unpaidAmount };
  }, [vendorFiltered]);

  return (
    <PageWrapper title="付款计划查询">
      {/* ── KPI 卡片 ────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: '计划总数', value: `${stats.total} 笔`, color: '#3B82F6', icon: <Payment /> },
          { label: '未付金额', value: formatCurrency(stats.unpaidAmount), color: '#F59E0B', icon: <Schedule /> },
          { label: '应付总额', value: formatCurrency(stats.totalAmount), color: '#6366F1', icon: <AttachMoney /> },
          { label: '待支付', value: `${stats.pending} 笔`, color: '#EF4444', icon: <AccessAlarm /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderColor: `${color}30` }}>
              <Box sx={{ color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{icon}</Box>
              <Typography variant="h5" fontWeight={700} sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── 逾期提醒 ────────────────────────────────── */}
      {stats.overdue > 0 && (
        <Alert severity="error" sx={{ mb: 2, fontSize: '0.8125rem' }}>
          <b>{stats.overdue} 笔</b>付款计划已逾期，未付金额合计{' '}
          <b>{formatCurrency(vendorFiltered.filter(p => p.status === 'overdue').reduce((s, p) => s + (p.totalAmount - p.paidAmount), 0))}</b>，
          请关注并提供支持
        </Alert>
      )}

      {/* ── 查询面板 ────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #E2E8F0' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FilterList fontSize="small" /> 查询条件
          </Typography>
          <Stack direction="row" spacing={1}>
            {hasActiveFilter && (
              <Button size="small" startIcon={<Clear />} onClick={clearFilters} sx={{ fontSize: '0.75rem' }}>
                清除条件
              </Button>
            )}
            <Chip
              icon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
              label={showAdvanced ? '收起' : '更多筛选'}
              size="small" variant="outlined"
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Stack>

        <FilterBar columns={columns} module="vendor" onSearch={setFilterData} listKey="vendor-payment-plan" />

        <Grid container spacing={1.5} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={8}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
              <CalendarToday sx={{ fontSize: 14 }} />
              当前显示 {vendorCode} 的付款计划（共 {vendorFiltered.length} 笔）
            </Typography>
          </Grid>
        </Grid>

        <Collapse in={showAdvanced}>
          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth size="small" label="到期日从" type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth size="small" label="至" type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Collapse>

        {hasActiveFilter && (
          <Alert severity="info" sx={{ mt: 1, py: 0 }}>
            <Typography variant="caption">
              找到 <b>{filtered.length}</b> 条匹配记录
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* ── 付款计划表格 ────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Receipt sx={{ color: '#3B82F6' }} />
            <Typography variant="subtitle1" fontWeight={700}>付款计划列表</Typography>
          </Stack>
          <Chip label={`${filtered.length} / ${vendorFiltered.length} 条`} size="small" color="primary" variant="outlined" />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>计划号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>关联发票</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>付款方式</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>应付金额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>已付金额</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>未付金额</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>付款进度</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>到期日</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => {
                const paidPct = p.totalAmount > 0 ? Math.round((p.paidAmount / p.totalAmount) * 100) : 0;
                const unpaid = p.totalAmount - p.paidAmount;
                const isOverdue = p.status === 'overdue';
                return (
                  <TableRow key={p.id} hover sx={isOverdue ? { bgcolor: '#FFF5F5' } : {}}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" sx={{ color: '#3B82F6', fontWeight: 500 }}>
                        {p.planNo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                        {p.invoiceNo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.paymentMethod || '-'} size="small" variant="outlined"
                        sx={{ fontSize: '0.7rem' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatCurrency(p.totalAmount)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">{formatCurrency(p.paidAmount)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color={unpaid > 0 ? 'error.main' : 'text.primary'}>
                        {formatCurrency(unpaid)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: 130 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={paidPct}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          color={isOverdue ? 'error' : paidPct >= 100 ? 'success' : 'primary'}
                        />
                        <Typography variant="caption" fontWeight={600}>{paidPct}%</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={isOverdue ? '已逾期！' : ''}>
                        <Typography
                          variant="body2"
                          color={isOverdue ? 'error.main' : 'text.primary'}
                          fontWeight={isOverdue ? 600 : 400}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
                        >
                          {isOverdue && <AccessAlarm sx={{ fontSize: 14 }} />}
                          {p.dueDate}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={PP_STATUS_KEY[p.status]} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {filtered.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Schedule sx={{ color: '#CBD5E1', fontSize: 48, mb: 1 }} />
            <Typography color="text.secondary">暂无匹配的付款计划</Typography>
          </Box>
        )}
      </Paper>

      {/* ── 提示信息 ────────────────────────────────── */}
      <Alert severity="info" sx={{ mt: 2, fontSize: '0.8125rem' }}>
        以上付款计划信息由采购方系统自动同步。如有疑问请联系采购方财务部门。
        {stats.overdue > 0 && ' 逾期款项请及时与采购方沟通处理。'}
      </Alert>
    </PageWrapper>
  );
};

export default VendorPaymentPlan;
