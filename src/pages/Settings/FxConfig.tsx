import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert, Stack,
} from '@mui/material';
import { Add, Refresh, Delete, SwapHoriz } from '@mui/icons-material';
import { useFxStore } from '@/stores/fxStore';

const COMMON = ['CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP', 'KRW', 'AUD', 'CAD', 'SGD'];
const DEMO_RATE: Record<string, number> = {
  USD: 7.12, EUR: 7.73, JPY: 0.047, HKD: 0.91, GBP: 8.92, KRW: 0.0053, AUD: 4.71, CAD: 5.24, SGD: 5.32,
};

export default function FxConfig() {
  const { baseCurrency, rates, setBaseCurrency, upsertRate, removeRate, setRates, convert, load } = useFxStore();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ base: 'CNY', quote: 'USD', rate: '' });
  const [conv, setConv] = useState({ amount: '', from: 'USD', to: 'CNY' });
  const [convResult, setConvResult] = useState<number | null>(null);

  useEffect(() => {
    // 登录态经 fxStore.load() 走云端 /api/fx（带 token + org 隔离），替代原裸 fetch（无 token 必然 401 假拉取）
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);

  const handleRefresh = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/fx/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: baseCurrency }),
      });
      if (!r.ok) throw new Error('刷新失败');
      const j = await r.json();
      if (j.data?.length) {
        setRates(j.data.map((x: any) => ({
          id: `${x.base}-${x.quote}`, base: x.base, quote: x.quote,
          rate: x.rate, source: x.source, updatedAt: x.updatedAt,
        })));
      }
    } catch {
      const mock = COMMON.filter((c) => c !== baseCurrency).map((c) => ({
        id: `${baseCurrency}-${c}`, base: baseCurrency, quote: c,
        rate: DEMO_RATE[c] || 1, source: 'demo', updatedAt: new Date().toISOString(),
      }));
      setRates(mock);
      setErr('外部汇率源不可用（DEV），已载入演示汇率，生产态可正常拉取');
    } finally { setLoading(false); }
  };

  const handleAdd = () => {
    const rate = parseFloat(form.rate);
    if (!form.quote || !rate) { setErr('币种与汇率必填'); return; }
    upsertRate({ base: form.base, quote: form.quote, rate, source: 'manual' });
    setDialog(false); setForm({ base: baseCurrency, quote: 'USD', rate: '' });
  };

  const doConvert = () => {
    const amt = parseFloat(conv.amount);
    if (!amt) { setConvResult(null); return; }
    setConvResult(convert(amt, conv.from, conv.to));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <SwapHoriz color="primary" />
        <Typography variant="h5">多币种汇率管理</Typography>
        <Chip label="V2.74" size="small" color="info" />
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <TextField select size="small" label="基准币种" value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)} sx={{ width: 140 }}>
              {COMMON.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Button startIcon={<Refresh />} variant="outlined" onClick={handleRefresh}
              disabled={loading} data-testid="fx-refresh">从外部源刷新</Button>
            <Button startIcon={<Add />} variant="contained" onClick={() => setDialog(true)}
              data-testid="fx-add">新增汇率</Button>
          </Stack>
          {err && <Alert severity="info" sx={{ mb: 1 }} onClose={() => setErr(null)}>{err}</Alert>}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>基准</TableCell><TableCell>币种</TableCell><TableCell>汇率</TableCell>
                <TableCell>来源</TableCell><TableCell>更新时间</TableCell><TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rates.filter((r) => r.base === baseCurrency).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.base}</TableCell>
                  <TableCell>{r.quote}</TableCell>
                  <TableCell>{r.rate}</TableCell>
                  <TableCell><Chip size="small" label={r.source} color={r.source === 'demo' ? 'warning' : 'default'} /></TableCell>
                  <TableCell>{r.updatedAt?.slice(0, 10)}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => removeRate(r.id)} data-testid={`fx-del-${r.quote}`}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rates.filter((r) => r.base === baseCurrency).length === 0 && (
                <TableRow><TableCell colSpan={6} align="center">暂无汇率，点击「从外部源刷新」或「新增汇率」</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>金额换算</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField size="small" label="金额" value={conv.amount} onChange={(e) => setConv({ ...conv, amount: e.target.value })}
              sx={{ width: 120 }} data-testid="fx-amount" />
            <TextField select size="small" label="从" value={conv.from}
              onChange={(e) => setConv({ ...conv, from: e.target.value })} sx={{ width: 100 }}>
              {COMMON.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Typography>→</Typography>
            <TextField select size="small" label="到" value={conv.to}
              onChange={(e) => setConv({ ...conv, to: e.target.value })} sx={{ width: 100 }}>
              {COMMON.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <Button variant="contained" onClick={doConvert} data-testid="fx-convert">换算</Button>
            <Typography fontWeight={700} data-testid="fx-result">
              {convResult != null ? convResult.toFixed(2) : '—'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={dialog} onClose={() => setDialog(false)}>
        <DialogTitle>新增/更新汇率</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 280 }}>
            <TextField select label="基准币种" value={form.base}
              onChange={(e) => setForm({ ...form, base: e.target.value })}>
              {COMMON.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            {/* 与后端 REQUIRED_CORE_FIELDS（fx_rates: quote + rate）对齐：目标币种、汇率均必填 */}
            <TextField select label="目标币种" value={form.quote} required
              onChange={(e) => setForm({ ...form, quote: e.target.value })}>
              {COMMON.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="汇率" type="number" value={form.rate} required
              onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
