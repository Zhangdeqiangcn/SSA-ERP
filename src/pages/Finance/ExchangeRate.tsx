import { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Grid, Card, CardContent, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { FlowTracker, FilterBar } from '@/components/common';
import {
  useFinanceExtensionStore,
  BASE_CURRENCY_CODE,
} from '@/stores/financeExtensionStore';
import { useDataDictStore } from '@/stores/dataDictStore';
import type { ColumnDef } from '@tanstack/react-table';
import { applyColumnFilters } from '@/utils/listSearch';

/** 从数据字典「货币」(如 "美元 (USD)") 解析出 { code, label } */
function parseCurrencyOptions(raw: string[]): { code: string; label: string }[] {
  return raw.map((s) => {
    const m = s.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (m) return { code: m[2].trim(), label: s };
    return { code: s.trim(), label: s.trim() };
  }).filter((o) => o.code && o.code.toUpperCase() !== BASE_CURRENCY_CODE);
}

export default function ExchangeRate() {
  const { exchangeRates, addExchangeRate, updateExchangeRate, removeExchangeRate } =
    useFinanceExtensionStore();
  const { currencies } = useDataDictStore();
  const currencyOptions = parseCurrencyOptions(currencies);

  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    currency: 'USD', currencyName: '美元', rate: 7.18, effectiveDate: new Date().toISOString().split('T')[0], note: '',
  });
  const [msg, setMsg] = useState<string | null>(null);

  // 列定义（仅驱动检索条派生检索项；表格为内联渲染）
  const columns: ColumnDef<typeof exchangeRates[number], unknown>[] = [
    { id: 'currency', header: '币种代码', accessorFn: (r) => r.currency, meta: { searchable: true } },
    { id: 'currencyName', header: '币种名称', accessorFn: (r) => r.currencyName, meta: { searchable: true } },
    { id: 'effectiveDate', header: '生效日期', accessorFn: (r) => r.effectiveDate, meta: { searchable: true } },
    { id: 'note', header: '备注', accessorFn: (r) => r.note, meta: { searchable: true } },
  ];

  const filtered = useMemo(
    () => applyColumnFilters(exchangeRates, columns, filterData, { module: 'finance' }),
    [exchangeRates, columns, filterData]
  );

  const openCreate = () => {
    setEditId(null);
    setForm({ currency: 'USD', currencyName: '美元', rate: 7.18, effectiveDate: new Date().toISOString().split('T')[0], note: '' });
    setMsg(null);
    setEditOpen(true);
  };

  const openEdit = (id: string) => {
    const r = exchangeRates.find((x) => x.id === id);
    if (!r) return;
    setEditId(id);
    setForm({ currency: r.currency, currencyName: r.currencyName, rate: r.rate, effectiveDate: r.effectiveDate, note: r.note || '' });
    setMsg(null);
    setEditOpen(true);
  };

  const handleSave = () => {
    if (editId) {
      updateExchangeRate(editId, { ...form });
      setMsg('汇率已更新');
    } else {
      addExchangeRate({ ...form });
      setMsg('汇率已新增');
    }
    setEditOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>汇率管理</Typography>
        <FlowTracker module="finance" currentStatus="fin_base" />
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openCreate}>新增汇率</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '本位币', value: BASE_CURRENCY_CODE, color: '#1976d2' },
          { label: '维护币种数', value: `${exchangeRates.length} 种`, color: '#388e3c' },
          { label: '1 USD =', value: `¥${(getRate('USD')).toFixed(4)}`, color: '#f57c00' },
          { label: '1 EUR =', value: `¥${(getRate('EUR')).toFixed(4)}`, color: '#d32f2f' },
        ].map((kpi) => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <FilterBar columns={columns} module="finance" onSearch={setFilterData} listKey="finance-exchange-rate" />

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>币种代码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>币种名称</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>汇率（1 外币 = ? {BASE_CURRENCY_CODE}）</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>生效日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>备注</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell><Typography variant="body2" fontFamily="monospace">{r.currency}</Typography></TableCell>
                  <TableCell>{r.currencyName}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>¥{r.rate.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell>{r.effectiveDate}</TableCell>
                  <TableCell>{r.note || '—'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(r.id)}>编辑</Button>
                    <Button size="small" color="error" onClick={() => removeExchangeRate(r.id)}>删除</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? '编辑汇率' : '新增汇率'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="币种"
                value={form.currency}
                onChange={(e) => {
                  const opt = currencyOptions.find((o) => o.code === e.target.value);
                  setForm({ ...form, currency: e.target.value, currencyName: opt?.label || e.target.value });
                }}>
                {currencyOptions.map((o) => (
                  <MenuItem key={o.code} value={o.code}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="币种名称" value={form.currencyName}
                onChange={(e) => setForm({ ...form, currencyName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label={`汇率（1 ${form.currency} = ? ${BASE_CURRENCY_CODE}）`} type="number"
                value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="生效日期" type="date" InputLabelProps={{ shrink: true }}
                value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="备注" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {msg && <Alert severity="success" sx={{ mr: 'auto' }} data-testid="fx-msg">{msg}</Alert>}
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="fx-save" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  function getRate(code: string): number {
    const r = exchangeRates.find((x) => x.currency === code);
    return r ? r.rate : 1;
  }
}
