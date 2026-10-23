import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Alert, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useFinanceLedgerStore } from '@/stores/financeLedgerStore';
import { useFinanceStore } from '@/stores/financeStore';
import { FixedAsset, FixedAssetStatus } from '@/types/finance';
import { todayLocal } from '@/utils/format';

const fmt = (n: number) => '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATUS_LABEL: Record<FixedAssetStatus, { label: string; color: 'success' | 'default' | 'error' }> = {
  in_use: { label: '在用', color: 'success' },
  idle: { label: '闲置', color: 'default' },
  scrapped: { label: '已报废', color: 'error' },
};

export default function FixedAssets() {
  const { fixedAssets, addFixedAsset, scrapFixedAsset, deprecateAll } = useFinanceLedgerStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    assetCode: '', assetName: '', category: '生产设备', originalValue: '', residualRate: '0.05',
    usefulLifeMonths: '120', startDate: todayLocal(),
  });
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  const totalMonthly = fixedAssets.filter((a) => a.status === 'in_use').reduce((s, a) => s + a.monthlyDepreciation, 0);

  const handleAdd = async () => {
    const originalValue = Number(form.originalValue);
    const residualRate = Number(form.residualRate);
    const usefulLifeMonths = Number(form.usefulLifeMonths);
    if (!form.assetCode || !form.assetName || !originalValue || !usefulLifeMonths) {
      setError('资产编码/名称/原值/使用年限为必填');
      return;
    }
    const monthlyDepreciation = Number(((originalValue * (1 - residualRate)) / usefulLifeMonths).toFixed(2));
    const asset: FixedAsset = {
      id: `fa-${Date.now()}`,
      assetCode: form.assetCode,
      assetName: form.assetName,
      category: form.category,
      originalValue,
      residualRate,
      usefulLifeMonths,
      startDate: form.startDate,
      monthlyDepreciation,
      accumulatedDepreciation: 0,
      netValue: originalValue,
      status: 'in_use',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    };
    await addFixedAsset(asset);
    setOpen(false);
    setForm({ assetCode: '', assetName: '', category: '生产设备', originalValue: '', residualRate: '0.05', usefulLifeMonths: '120', startDate: todayLocal() });
    setError('');
    setSnack('固定资产已新增');
  };

  const handleDeprecate = async () => {
    // ★ V3.17.1 服务端权威计提：服务端更新累计折旧并生成折旧凭证（借6602/贷1602）
    const r = await deprecateAll();
    const total = r.total;
    if (total <= 0) {
      setSnack('当前无在用资产可计提折旧');
      return;
    }
    setSnack(
      r.duplicated
        ? `本期折旧已计提（凭证 ${r.voucherNo}），合计 ${fmt(total)}`
        : `已计提折旧 ${fmt(total)} 并生成凭证 ${r.voucherNo}`
    );
  };

  const handleScrap = async (id: string) => {
    await scrapFixedAsset(id, todayLocal());
    setSnack('资产已报废');
  };

  return (
    <Box sx={{ p: 3 }} data-testid="fixed-assets">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>固定资产</Typography>
        <Box flex={1} />
        <Chip label={`在用月折旧合计 ${fmt(totalMonthly)}`} color="info" variant="outlined" />
        <Button variant="contained" color="secondary" startIcon={<AccountBalanceWalletIcon />} size="small"
          data-testid="fa-deprecate" onClick={handleDeprecate}>
          计提折旧
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} size="small" data-testid="fa-add" onClick={() => setOpen(true)}>
          新增资产
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>资产编码</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>类别</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>原值</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>累计折旧</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>净值</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>月折旧</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fixedAssets.map((a) => (
              <TableRow key={a.id} hover data-testid="fa-row">
                <TableCell><Typography variant="body2" fontFamily="monospace">{a.assetCode}</Typography></TableCell>
                <TableCell>{a.assetName}</TableCell>
                <TableCell>{a.category}</TableCell>
                <TableCell align="right">{fmt(a.originalValue)}</TableCell>
                <TableCell align="right">{fmt(a.accumulatedDepreciation)}</TableCell>
                <TableCell align="right"><Typography fontWeight={600}>{fmt(a.netValue)}</Typography></TableCell>
                <TableCell align="right">{fmt(a.monthlyDepreciation)}</TableCell>
                <TableCell><Chip label={STATUS_LABEL[a.status].label} size="small" color={STATUS_LABEL[a.status].color} variant="outlined" /></TableCell>
                <TableCell>
                  {a.status === 'in_use' && (
                    <Button size="small" color="warning" onClick={() => handleScrap(a.id)}>报废</Button>
                  )}
                  {a.status !== 'in_use' && <Typography variant="caption" color="text.disabled">{a.scrapDate || '—'}</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增固定资产</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="资产编码" value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="资产名称" value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="类别" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="入账日期" type="date" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="原值" type="number" value={form.originalValue} onChange={(e) => setForm({ ...form, originalValue: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="残值率" type="number" value={form.residualRate} onChange={(e) => setForm({ ...form, residualRate: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth size="small" label="使用年限(月)" type="number" value={form.usefulLifeMonths} onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
