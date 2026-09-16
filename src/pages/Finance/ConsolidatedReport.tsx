// 合并报表 / 多账簿（C2 · V3.13.0）
// ─────────────────────────────────────────────────────────────
// 说明（结论先行）：合并报表 = 把若干会计主体（同组织的多套账簿 / 集团内多组织）
// 的凭证按科目汇总，并抵消它们之间的内部往来。本页直接调用后端 /api/consolidation
// 引擎，支持两种范围：
//   · 多账簿合并（books）：同一组织内法定账套 + 管理账套 → 一套合并账（端到端可验证路径）
//   · 集团合并（group）：按合并范围的成员组织聚合（需当前组织在成员列表内）
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, MenuItem, Paper, Select, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useAuthStore } from '@/stores/authStore';

interface TrialRow { code: string; name: string; debit: number; credit: number; ending: number; }
interface Elimination { ruleCode: string; ruleName: string; receivableAccount: string; payableAccount: string; amount: number; }
interface ConsolidationResult {
  runId?: string; scope: string; period: string | null; baseCurrency: string;
  trialBalance: TrialRow[]; eliminations: Elimination[]; totals: { debit: number; credit: number };
}
interface NamedItem { id: string; name: string; [k: string]: any; }

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `请求失败(${res.status})`);
  return data as T;
}

export default function ConsolidatedReport() {
  const token = useAuthStore((s) => s.token) || '';
  const [scope, setScope] = useState<'books' | 'group'>('books');
  const [period, setPeriod] = useState('');
  const [groupId, setGroupId] = useState('');
  const [result, setResult] = useState<ConsolidationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [books, setBooks] = useState<NamedItem[]>([]);
  const [groups, setGroups] = useState<NamedItem[]>([]);
  const [rules, setRules] = useState<NamedItem[]>([]);

  const loadConfig = useCallback(async () => {
    try {
      const [b, g, r] = await Promise.all([
        api<{ data: NamedItem[] }>('/api/entities/ledgerBook', token),
        api<{ data: NamedItem[] }>('/api/entities/consolidationGroup', token),
        api<{ data: NamedItem[] }>('/api/entities/eliminationRule', token),
      ]);
      setBooks(b.data || []);
      setGroups(g.data || []);
      setRules(r.data || []);
    } catch (e: any) {
      setError('加载合并配置失败：' + (e?.message || e));
    }
  }, [token]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const run = useCallback(async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const body: any = { scope, period: period || undefined };
      if (scope === 'group') body.groupId = groupId || undefined;
      const r = await api<ConsolidationResult>('/api/consolidation', token, {
        method: 'POST', body: JSON.stringify(body),
      });
      setResult(r);
    } catch (e: any) {
      setError('合并失败：' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [scope, period, groupId, token]);

  const totalDebit = useMemo(() => result ? result.totals.debit : 0, [result]);
  const totalCredit = useMemo(() => result ? result.totals.credit : 0, [result]);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>合并报表 / 多账簿</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        把多个会计主体（同组织多账簿 / 集团多组织）的凭证按科目汇总，并抵消内部往来。
        V3.13.0 先支持同组织多账簿合并（端到端已验证），集团跨组织合并需先在「合并范围」登记成员组织。
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Select size="small" value={scope} onChange={(e) => setScope(e.target.value as any)} sx={{ minWidth: 180 }}>
          <MenuItem value="books">多账簿合并（同组织）</MenuItem>
          <MenuItem value="group">集团合并（跨组织）</MenuItem>
        </Select>
        {scope === 'group' && (
          <Select size="small" value={groupId} onChange={(e) => setGroupId(e.target.value)} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value="">选择合并范围</MenuItem>
            {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </Select>
        )}
        <TextField size="small" label="会计期间（可空）" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="如 2026-09" sx={{ minWidth: 160 }} />
        <Button variant="contained" onClick={run} disabled={loading || (scope === 'group' && !groupId)}>
          {loading ? <CircularProgress size={18} /> : '执行合并'}
        </Button>
        <Button variant="outlined" onClick={loadConfig} disabled={loading}>刷新配置</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 配置概览 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Paper sx={{ p: 1.5, minWidth: 160 }}><Typography variant="caption" color="text.secondary">账簿数</Typography><Typography fontWeight={700}>{books.length}</Typography></Paper>
        <Paper sx={{ p: 1.5, minWidth: 160 }}><Typography variant="caption" color="text.secondary">合并范围数</Typography><Typography fontWeight={700}>{groups.length}</Typography></Paper>
        <Paper sx={{ p: 1.5, minWidth: 160 }}><Typography variant="caption" color="text.secondary">抵消规则数</Typography><Typography fontWeight={700}>{rules.length}</Typography></Paper>
      </Stack>

      {result && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">合并试算平衡表</Typography>
            <Typography variant="body2" color="text.secondary">
              范围={result.scope} · 本位币={result.baseCurrency} · 期间={result.period || '全部'}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Alert severity={balanced ? 'success' : 'warning'} sx={{ py: 0 }}>
              借 {totalDebit.toFixed(2)} / 贷 {totalCredit.toFixed(2)} {balanced ? '（平衡）' : '（需检查）'}
            </Alert>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>科目编码</TableCell><TableCell>科目名称</TableCell>
                <TableCell align="right">借方</TableCell><TableCell align="right">贷方</TableCell>
                <TableCell align="right">余额</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.trialBalance.map((r) => (
                <TableRow key={r.code}>
                  <TableCell>{r.code}</TableCell><TableCell>{r.name}</TableCell>
                  <TableCell align="right">{r.debit.toFixed(2)}</TableCell>
                  <TableCell align="right">{r.credit.toFixed(2)}</TableCell>
                  <TableCell align="right">{r.ending.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {result.trialBalance.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  暂无凭证数据，请先录入凭证并指定账簿
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>

          {result.eliminations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>内部交易抵消明细</Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>规则</TableCell><TableCell>应收科目</TableCell><TableCell>应付科目</TableCell><TableCell align="right">抵消金额</TableCell></TableRow></TableHead>
                <TableBody>
                  {result.eliminations.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.ruleName}（{e.ruleCode}）</TableCell>
                      <TableCell>{e.receivableAccount}</TableCell>
                      <TableCell>{e.payableAccount}</TableCell>
                      <TableCell align="right">{e.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      )}

      {!result && !loading && (
        <Alert severity="info">点击「执行合并」生成合并试算平衡表。多账簿合并会汇总当前组织全部账簿的凭证；若已配置内部往来抵消规则，将自动抵消母子公司间应收应付。</Alert>
      )}
    </Box>
  );
}
