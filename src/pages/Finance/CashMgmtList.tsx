import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Paper, Chip,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { DataTable } from '@/components/common/DataTable';
import { useCashMgmtStore } from '@/stores/cashMgmtStore';
import { useNumberingStore } from '@/stores/numberingStore';
import { CashFlowDirection, CASH_FLOW_LABELS } from '@/types/cashMgmt';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();

export default function CashMgmtList() {
  const accounts = useCashMgmtStore((s) => s.accounts);
  const flows = useCashMgmtStore((s) => s.flows);
  const addAccount = useCashMgmtStore((s) => s.addAccount);
  const updateAccount = useCashMgmtStore((s) => s.updateAccount);
  const deleteAccount = useCashMgmtStore((s) => s.deleteAccount);
  const addFlow = useCashMgmtStore((s) => s.addFlow);
  const updateFlow = useCashMgmtStore((s) => s.updateFlow);
  const deleteFlow = useCashMgmtStore((s) => s.deleteFlow);
  const nextNo = useNumberingStore((s) => s.nextNo);

  const [tab, setTab] = useState<'acc' | 'flow'>('acc');
  const [accOpen, setAccOpen] = useState(false);
  const [accEditId, setAccEditId] = useState<string | null>(null);
  const [accNo, setAccNo] = useState('');
  const [accName, setAccName] = useState('');
  const [bank, setBank] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [opening, setOpening] = useState('');
  const [accRemark, setAccRemark] = useState('');

  const [flowOpen, setFlowOpen] = useState(false);
  const [flowEditId, setFlowEditId] = useState<string | null>(null);
  const [flowAccountId, setFlowAccountId] = useState('');
  const [flowDirection, setFlowDirection] = useState<CashFlowDirection>('in');
  const [flowCategory, setFlowCategory] = useState('');
  const [flowCounterparty, setFlowCounterparty] = useState('');
  const [flowAmount, setFlowAmount] = useState('');
  const [flowDate, setFlowDate] = useState(todayStr());
  const [flowDoc, setFlowDoc] = useState('');
  const [flowRemark, setFlowRemark] = useState('');

  const resetAcc = () => { setAccEditId(null); setAccNo(''); setAccName(''); setBank(''); setCurrency('CNY'); setOpening(''); setAccRemark(''); };
  const openAccCreate = () => { resetAcc(); setAccNo(nextNo('ACC')); setAccOpen(true); };
  const openAccEdit = (a: any) => {
    setAccEditId(a.id); setAccNo(a.accountNo); setAccName(a.accountName); setBank(a.bank);
    setCurrency(a.currency); setOpening(String(a.openingBalance)); setAccRemark(a.remark || ''); setAccOpen(true);
  };
  const saveAcc = () => {
    const op = parseFloat(opening) || 0;
    const base = {
      accountNo: accNo, accountName: accName, bank, currency, openingBalance: op,
      currentBalance: op, remark: accRemark || undefined, updatedAt: nowStr(), updatedBy: 'admin',
    };
    if (accEditId) updateAccount(accEditId, base);
    else addAccount({ ...base, id: `acc-${Date.now()}`, createdAt: nowStr(), createdBy: 'admin' });
    setAccOpen(false);
  };

  const resetFlow = () => { setFlowEditId(null); setFlowAccountId(''); setFlowDirection('in'); setFlowCategory(''); setFlowCounterparty(''); setFlowAmount(''); setFlowDate(todayStr()); setFlowDoc(''); setFlowRemark(''); };
  const openFlowCreate = () => { resetFlow(); setFlowAccountId(accounts[0]?.id || ''); setFlowOpen(true); };
  const openFlowEdit = (f: any) => {
    setFlowEditId(f.id); setFlowAccountId(f.accountId); setFlowDirection(f.direction); setFlowCategory(f.category);
    setFlowCounterparty(f.counterparty); setFlowAmount(String(f.amount)); setFlowDate(f.flowDate);
    setFlowDoc(f.relatedDoc || ''); setFlowRemark(f.remark || ''); setFlowOpen(true);
  };
  const saveFlow = () => {
    const base = {
      accountId: flowAccountId, direction: flowDirection, category: flowCategory,
      counterparty: flowCounterparty, amount: parseFloat(flowAmount) || 0, flowDate,
      relatedDoc: flowDoc || undefined, remark: flowRemark || undefined, updatedAt: nowStr(), updatedBy: 'admin',
    };
    if (flowEditId) updateFlow(flowEditId, base);
    else addFlow({ ...base, id: `cf-${Date.now()}`, createdAt: nowStr(), createdBy: 'admin' });
    setFlowOpen(false);
  };

  const totalBalance = accounts.reduce((a, x) => a + x.currentBalance, 0);

  const accColumns = [
    { accessorKey: 'accountNo', header: '账号' },
    { accessorKey: 'accountName', header: '账户名' },
    { accessorKey: 'bank', header: '开户行' },
    { accessorKey: 'currency', header: '币种' },
    { accessorKey: 'openingBalance', header: '期初', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
    { accessorKey: 'currentBalance', header: '当前余额', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
  ];
  const flowColumns = [
    {
      accessorKey: 'direction', header: '方向',
      cell: (c: any) => { const v = c.getValue() as CashFlowDirection; return <Chip label={CASH_FLOW_LABELS[v]} size="small" sx={{ bgcolor: v === 'in' ? '#10b981' : '#ef4444', color: '#fff' }} />; },
    },
    {
      accessorKey: 'category', header: '类别',
      cell: (c: any) => {
        const f = flows.find((x) => x.id === c.row?.id) || (c.row as any);
        const acc = accounts.find((a) => a.id === (f as any).accountId);
        return `${c.getValue()} · ${acc?.accountName || ''}`;
      },
    },
    { accessorKey: 'counterparty', header: '往来方' },
    { accessorKey: 'amount', header: '金额', cell: (c: any) => `¥${c.getValue().toLocaleString()}` },
    { accessorKey: 'flowDate', header: '日期' },
    { accessorKey: 'relatedDoc', header: '关联单号' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">资金管理（P2-14）</Typography>
        <Typography variant="subtitle1">账户总余额：¥{totalBalance.toLocaleString()}</Typography>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`资金账户（${accounts.length}）`} value="acc" />
        <Tab label={`资金流水（${flows.length}）`} value="flow" />
      </Tabs>

      {tab === 'acc' && (
        <>
          <Stack direction="row" sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={openAccCreate}>新建账户</Button>
          </Stack>
          <DataTable
            data={accounts} columns={accColumns}
            onView={(r) => openAccEdit(r)} onEdit={(r) => openAccEdit(r)} onDelete={(r) => deleteAccount(r.id)}
            enableExport enableColumnFilter sapStyle columnConfigKey="cash-accounts"
          />
        </>
      )}

      {tab === 'flow' && (
        <>
          <Stack direction="row" sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={openFlowCreate}>新增流水</Button>
          </Stack>
          <DataTable
            data={flows} columns={flowColumns}
            onView={(r) => openFlowEdit(r)} onEdit={(r) => openFlowEdit(r)} onDelete={(r) => deleteFlow(r.id)}
            enableExport enableColumnFilter sapStyle columnConfigKey="cash-flows"
          />
        </>
      )}

      <Dialog open={accOpen} onClose={() => setAccOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{accEditId ? '编辑账户' : '新建账户'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="账号" value={accNo} onChange={(e) => setAccNo(e.target.value)} fullWidth disabled />
            <TextField label="账户名" value={accName} onChange={(e) => setAccName(e.target.value)} fullWidth />
            <TextField label="开户行" value={bank} onChange={(e) => setBank(e.target.value)} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField select label="币种" value={currency} onChange={(e) => setCurrency(e.target.value)} fullWidth>
                {['CNY', 'USD', 'EUR'].map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
              </TextField>
              <TextField label="期初余额" type="number" value={opening} onChange={(e) => setOpening(e.target.value)} fullWidth />
            </Stack>
            <TextField label="备注" value={accRemark} onChange={(e) => setAccRemark(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveAcc}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={flowOpen} onClose={() => setFlowOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{flowEditId ? '编辑流水' : '新增流水'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="资金账户" value={flowAccountId} onChange={(e) => setFlowAccountId(e.target.value)} fullWidth>
              {accounts.map((a) => (<MenuItem key={a.id} value={a.id}>{a.accountName}</MenuItem>))}
            </TextField>
            <TextField select label="方向" value={flowDirection} onChange={(e) => setFlowDirection(e.target.value as CashFlowDirection)} fullWidth>
              {(['in', 'out'] as CashFlowDirection[]).map((d) => (<MenuItem key={d} value={d}>{CASH_FLOW_LABELS[d]}</MenuItem>))}
            </TextField>
            <TextField label="类别" value={flowCategory} onChange={(e) => setFlowCategory(e.target.value)} fullWidth placeholder="销售回款/原料采购/运费" />
            <TextField label="往来方" value={flowCounterparty} onChange={(e) => setFlowCounterparty(e.target.value)} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="金额" type="number" value={flowAmount} onChange={(e) => setFlowAmount(e.target.value)} fullWidth />
              <TextField label="日期" type="date" value={flowDate} onChange={(e) => setFlowDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <TextField label="关联单号" value={flowDoc} onChange={(e) => setFlowDoc(e.target.value)} fullWidth />
            <TextField label="备注" value={flowRemark} onChange={(e) => setFlowRemark(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlowOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveFlow}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
