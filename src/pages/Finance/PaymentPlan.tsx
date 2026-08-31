import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Grid, Card, CardContent, Button, TextField,
  InputAdornment, LinearProgress, Alert, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Stack, Divider, Switch, FormControlLabel, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PaymentIcon from '@mui/icons-material/Payment';
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { FlowTracker } from '@/components/common';
import { useFinanceStore } from '@/stores/financeStore';
import { useVendorStore } from '@/stores/vendorStore';
import type { PaymentInstallment, PaymentInstallmentType } from '@/types/finance';
import { useFinanceExtensionStore, convertCurrency, BASE_CURRENCY_CODE } from '@/stores/financeExtensionStore';

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'warning' | 'error' | 'success' | 'info' }> = {
  pending: { label: '待支付', color: 'warning' },
  partial: { label: '部分付款', color: 'info' },
  paid: { label: '已付清', color: 'success' },
  overdue: { label: '已逾期', color: 'error' },
};

export default function PaymentPlan() {
  const { paymentPlans, financeStats, addPaymentPlan, generateVoucherFromPayment, payInstallment } = useFinanceStore();
  const { vendors } = useVendorStore();
  const { exchangeRates } = useFinanceExtensionStore();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof paymentPlans[number] | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [form, setForm] = useState({
    vendorId: '', vendorName: '', purchaseOrderNo: '', invoiceNo: '', totalAmount: 0,
    dueDate: new Date().toISOString().split('T')[0], paymentMethod: '电汇(T/T)',
  });

  // 分批模式下：总额=各期之和；最早到期日=计划到期日
  const installmentTotal = installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const advanceTotal = installments.filter((i) => i.type === 'advance').reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const resetCreateForm = () => {
    setForm({ vendorId: '', vendorName: '', purchaseOrderNo: '', invoiceNo: '', totalAmount: 0,
      dueDate: new Date().toISOString().split('T')[0], paymentMethod: '电汇(T/T)' });
    setSplitMode(false);
    setInstallments([]);
  };

  const addInstallmentRow = (type: PaymentInstallmentType = 'progress') => {
    const labels: Record<PaymentInstallmentType, string> = { advance: '预付款', progress: '进度款', final: '尾款', lump: '一次性' };
    setInstallments((prev) => [...prev, {
      id: `inst-${Date.now()}-${prev.length}`,
      type,
      label: labels[type],
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    }]);
  };

  const handleViewDetail = (p: typeof paymentPlans[number]) => {
    setSelectedPlan(p);
    setVoucherMsg(null);
    setDetailOpen(true);
  };

  const handleGenVoucher = () => {
    if (!selectedPlan) return;
    const v = generateVoucherFromPayment(selectedPlan.id);
    setVoucherMsg(v ? `凭证已生成，凭证号：${v}` : '该付款已生成过凭证（无需重复生成）');
  };

  const filtered = paymentPlans.filter(p =>
    !search || p.vendorName.includes(search) || p.planNo.includes(search) || p.invoiceNo.includes(search)
  );

  const overdueCount = paymentPlans.filter(p => p.status === 'overdue').length;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>付款计划</Typography>
        <FlowTracker module="payment-plan" currentStatus="pp_review" />
        <Box flex={1} />
        <Button variant="contained" startIcon={<PaymentIcon />} size="small" onClick={() => setCreateOpen(true)}>申请付款</Button>
      </Box>

      {overdueCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          存在 <b>{overdueCount}</b> 笔逾期未付款，共计 <b>¥{financeStats.overdueAmount.toLocaleString()}</b>，请及时处理！
        </Alert>
      )}

      {/* KPI */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '应付账款总额', value: `¥${financeStats.totalPayable.toLocaleString()}`, color: '#1976d2', icon: <PaymentIcon /> },
          { label: '本月已付', value: `¥${financeStats.thisMonthPaid.toLocaleString()}`, color: '#388e3c', icon: <CheckCircleIcon /> },
          { label: '逾期金额', value: `¥${financeStats.overdueAmount.toLocaleString()}`, color: '#d32f2f', icon: <AccessAlarmIcon /> },
          { label: '计划总数', value: `${paymentPlans.length} 笔`, color: '#7b1fa2', icon: <PaymentIcon /> },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 搜索栏 */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="搜索计划号/供应商/发票号"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 300 }}
        />
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>计划号</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>关联发票</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>付款方式</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>应付总额</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>币种 / 折合{BASE_CURRENCY_CODE}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>已付金额</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>付款进度</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>到期日</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(p => {
                const sc = STATUS_CONFIG[p.status];
                const paidPct = p.totalAmount > 0 ? Math.round((p.paidAmount / p.totalAmount) * 100) : 0;
                const isOverdue = p.status === 'overdue';
                return (
                  <TableRow key={p.id} hover sx={{ bgcolor: isOverdue ? 'error.50' : 'inherit' }}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{p.planNo}</Typography>
                    </TableCell>
                    <TableCell>
                      {p.vendorName}
                      {p.installments && p.installments.length > 0 && (
                        <Chip size="small" label={`${p.installments.length}期`} color="primary" variant="outlined" sx={{ ml: 1 }} data-testid="pp-installment-badge" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{p.invoiceNo}</Typography>
                    </TableCell>
                    <TableCell>{p.paymentMethod || '-'}</TableCell>
                    <TableCell align="right">¥{p.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{(p.currency || BASE_CURRENCY_CODE)}</Typography>
                      {p.currency && p.currency.toUpperCase() !== BASE_CURRENCY_CODE && (
                        <Typography variant="caption" color="text.secondary">
                          折合 ¥{convertCurrency(p.totalAmount, p.currency, exchangeRates).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">¥{p.paidAmount.toLocaleString()}</TableCell>
                    <TableCell sx={{ width: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={paidPct}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          color={isOverdue ? 'error' : 'primary'}
                        />
                        <Typography variant="caption">{paidPct}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={isOverdue ? '已逾期！' : ''}>
                        <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.primary'} fontWeight={isOverdue ? 600 : 400}>
                          {p.dueDate}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip label={sc.label} color={sc.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleViewDetail(p)}>详情</Button>
                      {p.status !== 'paid' && (
                        <Button size="small" startIcon={<PaymentIcon />} color="primary">付款</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 申请付款 */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>申请付款</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" data-testid="pp-vendor-select">
                <InputLabel>供应商</InputLabel>
                <Select label="供应商" value={form.vendorId}
                  onChange={(e) => {
                    const v = vendors.find((x) => x.id === e.target.value);
                    setForm({ ...form, vendorId: e.target.value, vendorName: v ? v.name : '' });
                  }}>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="关联采购单" value={form.purchaseOrderNo}
                onChange={(e) => setForm({ ...form, purchaseOrderNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="关联发票" value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel control={
                <Switch checked={splitMode} onChange={(e) => setSplitMode(e.target.checked)}
                  disabled={installments.length === 0 && false} data-testid="pp-split-switch" />
              } label="分批付款计划（预付款 / 进度款 / 尾款）" />
            </Grid>

            {!splitMode && (
              <>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="付款金额" type="number" value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="到期日" type="date" InputLabelProps={{ shrink: true }}
                    value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </Grid>
              </>
            )}

            {splitMode && (
              <Grid item xs={12}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addInstallmentRow('advance')} data-testid="pp-add-advance">加预付款</Button>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addInstallmentRow('progress')} data-testid="pp-add-progress">加进度款</Button>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => addInstallmentRow('final')} data-testid="pp-add-final">加尾款</Button>
                </Stack>
                {installments.length > 0 && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>类型</TableCell>
                          <TableCell>金额</TableCell>
                          <TableCell>到期日</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {installments.map((inst, idx) => (
                          <TableRow key={inst.id}>
                            <TableCell>
                              <FormControl fullWidth size="small">
                                <Select value={inst.type} onChange={(e) => {
                                  const t = e.target.value as PaymentInstallmentType;
                                  const labels: Record<PaymentInstallmentType, string> = { advance: '预付款', progress: '进度款', final: '尾款', lump: '一次性' };
                                  setInstallments((prev) => prev.map((p, i) => i === idx ? { ...p, type: t, label: labels[t] } : p));
                                }}>
                                  <MenuItem value="advance">预付款</MenuItem>
                                  <MenuItem value="progress">进度款</MenuItem>
                                  <MenuItem value="final">尾款</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <TextField size="small" type="number" value={inst.amount}
                                data-testid={`pp-inst-amount-${idx}`}
                                onChange={(e) => setInstallments((prev) => prev.map((p, i) => i === idx ? { ...p, amount: Number(e.target.value) } : p))} />
                            </TableCell>
                            <TableCell>
                              <TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={inst.dueDate}
                                onChange={(e) => setInstallments((prev) => prev.map((p, i) => i === idx ? { ...p, dueDate: e.target.value } : p))} />
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => setInstallments((prev) => prev.filter((p, i) => i !== idx))}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                <Alert severity="info" sx={{ mt: 1 }}>
                  合计 ¥{installmentTotal.toLocaleString()}，其中预付款 ¥{advanceTotal.toLocaleString()}
                  {advanceTotal > 0 && '（创建时将占用该供应商对应信用额度，全部付清后释放）'}。
                </Alert>
              </Grid>
            )}

            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>付款方式</InputLabel>
                <Select label="付款方式" value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {['电汇(T/T)', '银行承兑汇票', '商业承兑汇票', '信用证(L/C)', '支票', '现金'].map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {splitMode && (
              <Grid item xs={6}>
                <TextField fullWidth size="small" label="计划到期日（首期）" type="date" InputLabelProps={{ shrink: true }}
                  value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateOpen(false); resetCreateForm(); }}>取消</Button>
          <Button variant="contained" data-testid="pp-create" disabled={!form.vendorId || (splitMode ? installments.length === 0 : form.totalAmount <= 0)}
            onClick={() => {
              const isSplit = splitMode && installments.length > 0;
              const total = isSplit ? installmentTotal : form.totalAmount;
              addPaymentPlan({
                id: `pp-${Date.now()}`,
                planNo: `PP${Date.now()}`,
                vendorName: form.vendorName,
                vendorId: form.vendorId || undefined,
                purchaseOrderNo: form.purchaseOrderNo,
                invoiceNo: form.invoiceNo,
                totalAmount: total,
                paidAmount: 0,
                status: 'pending',
                dueDate: form.dueDate,
                paymentMethod: form.paymentMethod,
                ...(isSplit ? { installments: installments.map((i) => ({ ...i })) } : {}),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: '当前用户',
                updatedBy: '当前用户',
              });
              setCreateOpen(false);
              resetCreateForm();
            }}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* 付款详情弹框 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>付款详情 — {selectedPlan?.planNo}</DialogTitle>
        <DialogContent dividers>
          {selectedPlan && (
            <Grid container spacing={2}>
              {[
                { label: '供应商', value: selectedPlan.vendorName },
                { label: '关联采购单', value: selectedPlan.purchaseOrderNo },
                { label: '关联发票', value: selectedPlan.invoiceNo },
                { label: '付款方式', value: selectedPlan.paymentMethod || '-' },
                { label: '应付总额', value: `¥${selectedPlan.totalAmount.toLocaleString()}` },
                { label: '已付金额', value: `¥${selectedPlan.paidAmount.toLocaleString()}` },
                { label: '到期日', value: selectedPlan.dueDate },
                { label: '状态', value: STATUS_CONFIG[selectedPlan.status].label },
              ].map(row => (
                <Grid item xs={6} key={row.label}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                  <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
                </Grid>
              ))}
            </Grid>
          )}
          {selectedPlan && selectedPlan.installments && selectedPlan.installments.length > 0 && (
            <Box sx={{ mt: 2, width: '100%' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>分期付款明细</Typography>
              {selectedPlan.advanceOccupied && selectedPlan.advanceAmount ? (
                <Alert severity="warning" sx={{ mb: 1 }}>预付款 ¥{selectedPlan.advanceAmount.toLocaleString()} 已占用该供应商信用额度，全部付清后自动释放。</Alert>
              ) : null}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>类型</TableCell>
                      <TableCell align="right">金额</TableCell>
                      <TableCell>到期日</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPlan.installments.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell>{inst.label}</TableCell>
                        <TableCell align="right">¥{inst.amount.toLocaleString()}</TableCell>
                        <TableCell>{inst.dueDate}</TableCell>
                        <TableCell><Chip size="small" label={STATUS_CONFIG[inst.status].label} color={STATUS_CONFIG[inst.status].color} /></TableCell>
                        <TableCell>
                          {inst.status !== 'paid' && (
                            <Button size="small" data-testid={`pp-pay-inst-${inst.id}`} onClick={() => {
                              payInstallment(selectedPlan.id, inst.id);
                              setSelectedPlan(useFinanceStore.getState().paymentPlans.find((p) => p.id === selectedPlan.id) || selectedPlan);
                            }}>付款</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {voucherMsg && (
            <Alert severity="success" sx={{ mr: 'auto' }} data-testid="voucher-msg">{voucherMsg}</Alert>
          )}
          <Button
            variant="contained"
            data-testid="gen-voucher"
            disabled={selectedPlan?.voucherGenerated}
            onClick={handleGenVoucher}
          >
            生成凭证
          </Button>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
