// 合并报表 / 多账簿（C2 · V3.13.0+V3.14.0）
// ─────────────────────────────────────────────────────────────
// 合并报表 = 把若干会计主体（同组织多账簿 / 集团多组织）的凭证按科目汇总，
// 再抵消内部往来。核心流程：
//   1. 选择合并范围（多账簿 books / 集团 group）+ 期间 + 抵消规则
//   2. 调用 /api/consolidation 引擎 → 返回试算平衡表 + 抵消明细
//   3. 三种视图：
//      · 试算平衡表：所有科目的借贷汇总（原始数据）
//      · 合并资产负债表：按科目编码分类（1xxx=资产 2xxx=负债 3xxx=权益），
//        含「本年利润（本期净利）」自动追加到权益，保证资产 = 负债 + 权益
//      · 合并利润表：收入科目（4xxx）- 费用科目（5xxx）= 净利润
//   4. 每种视图均支持 CSV / Excel 导出
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Tab, Tabs,
  TextField, Typography,
} from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import ExportMenu from '@/components/common/ExportMenu';
import { type ExportSheet } from '@/utils/exportUtils';

interface TrialRow {
  code: string; name: string; debit: number; credit: number; ending: number;
  ledgerBook?: string; ledgerBookName?: string;
}
interface Elimination {
  ruleCode: string; ruleName: string; receivableAccount: string;
  payableAccount: string; amount: number; ledgerBook?: string; ledgerBookName?: string;
}
interface ConsolidationResult {
  runId?: string; scope: string; period: string | null; baseCurrency: string;
  trialBalance: TrialRow[]; eliminations: Elimination[];
  totals: { debit: number; credit: number }; generatedAt: string;
  /** V3.113.3 P0-2：本次实际纳入合并的账簿清单 */
  ledgerBooks?: { code: string; name: string }[];
}
interface NamedItem { id: string; name: string; [k: string]: any; }

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `请求失败(${res.status})`);
  return data as T;
}

const fmt = (n: number) =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 科目分类：按一级编码前缀判断资产/负债/权益/收入/费用
function classifyAccount(code: string): 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' {
  const p = code.slice(0, 1);
  if (p === '1') return 'asset';
  if (p === '2') return 'liability';
  if (p === '3') return 'equity';
  if (p === '4') return 'revenue';
  if (p === '5') return 'expense';
  return 'expense'; // 未识别默认归入费用（保守）
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  asset: '资产',
  liability: '负债',
  equity: '权益',
  revenue: '收入',
  expense: '费用',
};

export default function ConsolidatedReport() {
  const token = useAuthStore((s) => s.token) || '';
  const [scope, setScope] = useState<'books' | 'group'>('books');
  const [period, setPeriod] = useState('');
  const [groupId, setGroupId] = useState('');
  const [result, setResult] = useState<ConsolidationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  const [books, setBooks] = useState<NamedItem[]>([]);
  const [groups, setGroups] = useState<NamedItem[]>([]);
  const [rules, setRules] = useState<NamedItem[]>([]);
  // ★ V3.113.3 P0-2：参与合并的账簿白名单（空 = 全部账簿）。
  //   此前账簿列表只用于「账簿数」概览，从未参与合并 → 法定账套与管理账套被压进同一张表。
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

  // 加载配置（账簿/合并范围/抵消规则）
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
      // 账簿白名单（空数组 = 全部账簿，后端按全部处理）
      if (selectedBooks.length > 0) body.ledgerBooks = selectedBooks;
      const r = await api<ConsolidationResult>('/api/consolidation', token, {
        method: 'POST', body: JSON.stringify(body),
      });
      setResult(r);
      setTab(0); // 重置到试算平衡
    } catch (e: any) {
      setError('合并失败：' + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [scope, period, groupId, selectedBooks, token]);

  const totalDebit = useMemo(() => result ? result.totals.debit : 0, [result]);
  const totalCredit = useMemo(() => result ? result.totals.credit : 0, [result]);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // 资产负债表结构
  // ★ V3.113.3 P0-2：**按账套分组**，每个账套各出一套平衡表。
  //   旧实现把所有账套的科目汇到一起算「资产 = 负债 + 权益」——
  //   但法定账套与管理账套是两套独立口径，相加后「凑平」是假象（实际是两套各自的差额抵消）。
  //   分账套后，每套账自己平不平，一眼可见。
  const bsGroups = useMemo(() => {
    if (!result) return null;
    const groups = new Map<string, TrialRow[]>();
    for (const r of result.trialBalance) {
      const key = r.ledgerBook || '0000';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const out: {
      ledgerBook: string;
      ledgerBookName: string;
      assets: { code: string; name: string; section: string; amount: number }[];
      totalAssets: number;
      liabilities: { code: string; name: string; section: string; amount: number }[];
      totalLiabilities: number;
      equity: { code: string; name: string; section: string; amount: number }[];
      totalEquity: number;
      netProfit: number;
      balanced: boolean;
    }[] = [];
    for (const [lb, rows] of groups) {
      const byClass: Record<string, TrialRow[]> = {
        asset: [], liability: [], equity: [], revenue: [], expense: [],
      };
      for (const r of rows) byClass[classifyAccount(r.code)].push(r);
      const assets = byClass.asset.map((r) => ({
        code: r.code, name: r.name, section: '资产', amount: r.ending,
      }));
      const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
      const liabilities = byClass.liability.map((r) => ({
        code: r.code, name: r.name, section: '负债', amount: r.ending,
      }));
      const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
      const equityBase = byClass.equity.map((r) => ({
        code: r.code, name: r.name, section: '所有者权益', amount: r.ending,
      }));
      const totalEquityBase = equityBase.reduce((s, r) => s + r.amount, 0);
      const totalRevenue = byClass.revenue.reduce((s, r) => s + r.ending, 0);
      const totalExpense = byClass.expense.reduce((s, r) => s + r.ending, 0);
      const netProfit = totalRevenue - totalExpense;
      const totalEquity = totalEquityBase + netProfit;
      out.push({
        ledgerBook: lb,
        ledgerBookName: rows[0]?.ledgerBookName || lb,
        assets, totalAssets, liabilities, totalLiabilities,
        equity: [...equityBase, { code: '3103', name: '本年利润（本期净利）', section: '所有者权益', amount: netProfit }],
        totalEquity, netProfit,
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      });
    }
    return out;
  }, [result]);

  // 兼容旧引用：取第一个账套组（单账套场景与旧行为一致）
  const bs = bsGroups && bsGroups.length > 0 ? bsGroups[0] : null;

  // 利润表结构（★ P0-2：同样按账套分组）
  const isGroups = useMemo(() => {
    if (!result) return null;
    const groups = new Map<string, TrialRow[]>();
    for (const r of result.trialBalance) {
      const key = r.ledgerBook || '0000';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const out: {
      ledgerBook: string; ledgerBookName: string;
      revenue: { code: string; name: string; section: string; amount: number }[];
      totalRevenue: number;
      expense: { code: string; name: string; section: string; amount: number }[];
      totalExpense: number;
      netProfit: number;
    }[] = [];
    for (const [lb, rows] of groups) {
      const revenueRows = rows
        .filter((r) => classifyAccount(r.code) === 'revenue')
        .map((r) => ({ code: r.code, name: r.name, section: '营业收入', amount: r.ending }));
      const expenseRows = rows
        .filter((r) => classifyAccount(r.code) === 'expense')
        .map((r) => ({ code: r.code, name: r.name, section: '费用', amount: r.ending }));
      const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);
      const totalExpense = expenseRows.reduce((s, r) => s + r.amount, 0);
      out.push({
        ledgerBook: lb,
        ledgerBookName: rows[0]?.ledgerBookName || lb,
        revenue: revenueRows, totalRevenue, expense: expenseRows, totalExpense,
        netProfit: totalRevenue - totalExpense,
      });
    }
    return out;
  }, [result]);

  const is = isGroups && isGroups.length > 0 ? isGroups[0] : null;

  // ★ P0-2：资产负债表/利润表按账套切换查看（多账套时逐套看，各自平不平一目了然）
  const [activeBook, setActiveBook] = useState<string>('');
  useEffect(() => {
    if (!bsGroups || bsGroups.length === 0) { setActiveBook(''); return; }
    if (!bsGroups.some((g) => g.ledgerBook === activeBook)) setActiveBook(bsGroups[0].ledgerBook);
  }, [bsGroups, activeBook]);
  const bsActive = bsGroups && bsGroups.length > 0
    ? (bsGroups.find((g) => g.ledgerBook === activeBook) || bsGroups[0])
    : null;
  const isActive = isGroups && isGroups.length > 0
    ? (isGroups.find((g) => g.ledgerBook === activeBook) || isGroups[0])
    : null;

  // 试算平衡表 → 导出数据（V3.14.4 修正：改为 ExportSheet 标准契约 columns+rows）
  // ★ P0-2：导出必须带「账套」列 —— 否则导出的表又变成两套账混在一起的口径，
  //   用户拿去做审计/汇报时口径已丢失，缺陷在系统外复发。
  const trialExport = useMemo<ExportSheet>(() => {
    const columns = [
      { key: 'ledgerBookName', label: '账套' },
      { key: 'code', label: '科目编码' },
      { key: 'name', label: '科目名称' },
      { key: 'debit', label: '借方', format: (r: TrialRow) => fmt(r.debit) },
      { key: 'credit', label: '贷方', format: (r: TrialRow) => fmt(r.credit) },
      { key: 'ending', label: '余额', format: (r: TrialRow) => fmt(r.ending) },
    ];
    if (!result) return { name: '合并试算平衡表', columns, rows: [] };
    return { name: '合并试算平衡表', columns, rows: result.trialBalance };
  }, [result]);

  // 资产负债表 → 导出数据（三栏结构改用 item/amount 两列对象行）
  const bsExport = useMemo<ExportSheet>(() => {
    const columns = [
      { key: 'item', label: '项目' },
      { key: 'amount', label: '金额' },
    ];
    if (!bs) return { name: '合并资产负债表', columns, rows: [] };
    const rows: { item: string; amount: string }[] = [];
    rows.push({ item: '一、资产', amount: '' });
    for (const a of bs.assets) rows.push({ item: `  ${a.code} ${a.name}`, amount: fmt(a.amount) });
    rows.push({ item: '资产合计', amount: fmt(bs.totalAssets) });
    rows.push({ item: '', amount: '' });
    rows.push({ item: '二、负债', amount: '' });
    for (const l of bs.liabilities) rows.push({ item: `  ${l.code} ${l.name}`, amount: fmt(l.amount) });
    rows.push({ item: '负债合计', amount: fmt(bs.totalLiabilities) });
    rows.push({ item: '', amount: '' });
    rows.push({ item: '三、所有者权益', amount: '' });
    for (const e of bs.equity) rows.push({ item: `  ${e.code} ${e.name}`, amount: fmt(e.amount) });
    rows.push({ item: '所有者权益合计', amount: fmt(bs.totalEquity) });
    return { name: '合并资产负债表', columns, rows };
  }, [bs]);

  // 利润表 → 导出数据
  const isExport = useMemo<ExportSheet>(() => {
    const columns = [
      { key: 'item', label: '项目' },
      { key: 'amount', label: '金额' },
    ];
    if (!is) return { name: '合并利润表', columns, rows: [] };
    const rows: { item: string; amount: string }[] = [];
    rows.push({ item: '一、营业收入', amount: '' });
    for (const r of is.revenue) rows.push({ item: `  ${r.code} ${r.name}`, amount: fmt(r.amount) });
    rows.push({ item: '营业收入合计', amount: fmt(is.totalRevenue) });
    rows.push({ item: '', amount: '' });
    rows.push({ item: '减：营业费用', amount: '' });
    for (const e of is.expense) rows.push({ item: `  ${e.code} ${e.name}`, amount: fmt(e.amount) });
    rows.push({ item: '费用合计', amount: fmt(is.totalExpense) });
    rows.push({ item: '二、净利润', amount: fmt(is.netProfit) });
    return { name: '合并利润表', columns, rows };
  }, [is]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>合并报表</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        将多个会计主体（同组织多账套 / 集团多组织）的凭证按科目汇总，并抵消内部往来。
        V3.13.0 先支持同组织多账套合并（端到端已验证），集团跨组织合并需先在「合并范围」登记成员组织。
      </Typography>

      {/* ── 参数栏 ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Select size="small" value={scope} onChange={(e) => setScope(e.target.value as any)} sx={{ minWidth: 180 }}>
          <MenuItem value="books">多账套合并（同组织）</MenuItem>
          <MenuItem value="group">集团合并（跨组织）</MenuItem>
        </Select>
        {scope === 'group' && (
          <Select size="small" value={groupId} onChange={(e) => setGroupId(e.target.value)} displayEmpty sx={{ minWidth: 220 }}>
            <MenuItem value="">选择合并范围</MenuItem>
            {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </Select>
        )}
        <TextField size="small" label="会计期间（可空）" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="如 2026-09" sx={{ minWidth: 160 }} />
        {/* ★ V3.113.3 P0-2：账簿多选（不选 = 全部账簿）。
            此前账簿维度完全不可选，法定账套与管理账套的凭证被压进同一行 —— 口径混算。 */}
        <Select
          size="small"
          multiple
          value={selectedBooks}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedBooks(typeof v === 'string' ? v.split(',') : v);
          }}
          renderValue={(v) => (v as string[]).length === 0 ? '全部账簿' : (v as string[]).join('、')}
          displayEmpty
          sx={{ minWidth: 220 }}
        >
          {books.map((b) => (
            <MenuItem key={b.id} value={String(b.ledgerCode ?? b.code ?? b.id)}>
              {b.name || b.ledgerCode || b.id}
            </MenuItem>
          ))}
        </Select>
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

      {/* ── 结果区：三种视图 ────────────────────────────────────── */}
      {result && (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="试算平衡表" />
            <Tab label="合并资产负债表" />
            <Tab label="合并利润表" />
          </Tabs>

          {/* ★ P0-2：账套切换（多账套时逐套查看报表，各自平不平一目了然） */}
          {(tab === 1 || tab === 2) && bsGroups && bsGroups.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" gap={1}>
              {bsGroups.map((g) => (
                <Button
                  key={g.ledgerBook}
                  size="small"
                  variant={g.ledgerBook === activeBook ? 'contained' : 'outlined'}
                  onClick={() => setActiveBook(g.ledgerBook)}
                >
                  {g.ledgerBookName}
                  {tab === 1 ? (g.balanced ? '（平衡）' : '（不平衡）') : ''}
                </Button>
              ))}
            </Stack>
          )}

          {/* Tab 0: 试算平衡表 */}
          {tab === 0 && (
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">合并试算平衡表</Typography>
                <Typography variant="body2" color="text.secondary">
                  范围={result.scope} · 本位币={result.baseCurrency} · 期间={result.period || '全部'}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Alert severity={balanced ? 'success' : 'warning'} sx={{ py: 0 }}>
                  借 {fmt(totalDebit)} / 贷 {fmt(totalCredit)} {balanced ? '（平衡）' : '（需检查）'}
                </Alert>
                {trialExport.rows.length > 0 && (
                  <ExportMenu
                    sheets={[trialExport]}
                    filename={`合并试算平衡表_${result.period || '全部期间'}`}
                    label="导出试算平衡表"
                    testid="export-trial-balance"
                  />
                )}
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {/* ★ P0-2：新增「账套」列 —— 法定账套与管理账套的同科目分行展示，口径可见可核对 */}
                    <TableCell>账套</TableCell>
                    <TableCell>科目编码</TableCell><TableCell>科目名称</TableCell>
                    <TableCell align="right">借方</TableCell><TableCell align="right">贷方</TableCell>
                    <TableCell align="right">余额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.trialBalance.map((r, i) => (
                    <TableRow key={`${r.ledgerBook || '0000'}-${r.code}-${i}`}>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {r.ledgerBookName || r.ledgerBook || '0000'}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{r.code}</Typography></TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell align="right">{fmt(r.debit)}</TableCell>
                      <TableCell align="right">{fmt(r.credit)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{fmt(r.ending)}</TableCell>
                    </TableRow>
                  ))}
                  {result.trialBalance.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      暂无凭证数据，请先录入凭证并指定账套
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {result.eliminations.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>内部交易抵消明细</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>规则</TableCell><TableCell>账套</TableCell><TableCell>应收科目</TableCell><TableCell>应付科目</TableCell>
                        <TableCell align="right">抵消金额</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.eliminations.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.ruleName}（{e.ruleCode}）</TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{e.ledgerBookName || e.ledgerBook || '-'}</Typography></TableCell>
                          <TableCell>{e.receivableAccount}</TableCell>
                          <TableCell>{e.payableAccount}</TableCell>
                          <TableCell align="right">{fmt(e.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Paper>
          )}

          {/* Tab 1: 合并资产负债表 */}
          {tab === 1 && bsActive && (
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">合并资产负债表</Typography>
                <Typography variant="body2" color="text.secondary">
                  范围={result.scope} · 期间={result.period || '全部'}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Alert severity={bsActive.balanced ? 'success' : 'warning'} sx={{ py: 0 }}>
                  资产合计 {fmt(bsActive.totalAssets)} = 负债 {fmt(bsActive.totalLiabilities)} + 权益 {fmt(bsActive.totalEquity)}
                  {bsActive.balanced ? '（平衡）' : '（不平衡！）'}
                </Alert>
                {bsExport.rows.length > 0 && (
                  <ExportMenu
                    sheets={[bsExport]}
                    filename={`合并资产负债表_${result.period || '全部期间'}`}
                    label="导出资产负债表"
                    testid="export-balance-sheet"
                  />
                )}
              </Stack>
              {/* 资产 */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>资产</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bsActive.assets.map((a) => (
                    <TableRow key={a.code}>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{a.code}</Typography></TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{fmt(a.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700 }}>资产合计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(bsActive.totalAssets)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {/* 负债 */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 0.5 }}>负债</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bsActive.liabilities.map((l) => (
                    <TableRow key={l.code}>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{l.code}</Typography></TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{fmt(l.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700 }}>负债合计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(bsActive.totalLiabilities)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {/* 所有者权益 */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 0.5 }}>所有者权益</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bsActive.equity.map((e) => (
                    <TableRow key={e.code}>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{e.code}</Typography></TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{fmt(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700 }}>所有者权益合计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(bsActive.totalEquity)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* Tab 2: 合并利润表 */}
          {tab === 2 && isActive && (
            <Paper sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">合并利润表</Typography>
                <Typography variant="body2" color="text.secondary">
                  范围={result.scope} · 期间={result.period || '全部'}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Alert severity="info" sx={{ py: 0 }}>
                  净利润：{isActive.netProfit >= 0 ? '+' : ''}{fmt(isActive.netProfit)}
                </Alert>
                {isExport.rows.length > 0 && (
                  <ExportMenu
                    sheets={[isExport]}
                    filename={`合并利润表_${result.period || '全部期间'}`}
                    label="导出利润表"
                    testid="export-income-statement"
                  />
                )}
              </Stack>
              {/* 营业收入 */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>一、营业收入</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isActive.revenue.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{r.code}</Typography></TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{fmt(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700 }}>营业收入合计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(isActive.totalRevenue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {/* 营业费用 */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 0.5 }}>减：营业费用</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>科目编码</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>科目名称</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>金额</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isActive.expense.map((e) => (
                    <TableRow key={e.code}>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{e.code}</Typography></TableCell>
                      <TableCell>{e.name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>{fmt(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700 }}>费用合计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(isActive.totalExpense)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {/* 净利润汇总 */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={700}>净利润（收入 - 费用）</Typography>
                  <Typography variant="h6" fontWeight={700} color={isActive.netProfit >= 0 ? 'success.main' : 'error.main'}>
                    {isActive.netProfit >= 0 ? '+' : ''}{fmt(isActive.netProfit)}
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          )}
        </>
      )}

      {!result && !loading && (
        <Alert severity="info">
          点击「执行合并」生成合并报表。多账套合并会汇总当前组织全部账套的凭证；若已配置内部往来抵消规则，
          将自动抵消母子公司间应收应付。
        </Alert>
      )}
    </Box>
  );
}
