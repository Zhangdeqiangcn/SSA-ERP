import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Grid, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Alert, Autocomplete, MenuItem, Tooltip, Paper,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BalanceIcon from '@mui/icons-material/Balance';
import { useFinanceStore } from '@/stores/financeStore';
import type { Voucher, VoucherItem } from '@/types/finance';
import { calcVoucherTotals, emptyVoucherItem, nextVoucherNo, round2, validateVoucher } from '@/utils/voucher';

interface Props {
  open: boolean;
  onClose: () => void;
  voucher?: Voucher | null;      // 传入则为编辑模式
  onSaved?: (msg: string, ok: boolean) => void;
}

const VOUCHER_TYPES = ['记', '收', '付', '转'];

export default function VoucherForm({ open, onClose, voucher, onSaved }: Props) {
  const { chartOfAccounts, createVoucher, updateVoucher, vouchers } = useFinanceStore();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherType, setVoucherType] = useState('记');
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<VoucherItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (voucher) {
      setDate(voucher.date);
      setVoucherType(voucher.voucherType || '记');
      setAttachmentCount(voucher.attachmentCount || 0);
      setRemark(voucher.remark || '');
      setItems(voucher.items.map((it) => ({ ...it })));
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setVoucherType('记');
      setAttachmentCount(0);
      setRemark('');
      setItems([emptyVoucherItem(1), emptyVoucherItem(2)]);
    }
  }, [open, voucher]);

  const totals = useMemo(() => calcVoucherTotals(items), [items]);
  const validation = useMemo(() => validateVoucher({ date, items }), [date, items]);
  const balanced = Math.abs(totals.difference) < 0.005 && totals.totalDebit > 0;

  const patchItem = (idx: number, patch: Partial<VoucherItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addLine = () => setItems((prev) => [...prev, emptyVoucherItem(prev.length + 1)]);
  const removeLine = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, lineNo: i + 1 })));

  /** 一键补平：把差额补到最后一行的相反方向 */
  const autoBalance = () => {
    const diff = round2(totals.difference);
    if (Math.abs(diff) < 0.005) return;
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const last = prev.length - 1;
      const target = prev[last];
      const hasAmount = (Number(target.debit) || 0) > 0 || (Number(target.credit) || 0) > 0;
      if (hasAmount) {
        // 最后一行已有金额，追加一行承接差额
        const extra = emptyVoucherItem(prev.length + 1);
        return [
          ...prev,
          diff > 0
            ? { ...extra, summary: '自动补平', credit: Math.abs(diff) }
            : { ...extra, summary: '自动补平', debit: Math.abs(diff) },
        ];
      }
      const patched = diff > 0
        ? { ...target, credit: Math.abs(diff), debit: 0 }
        : { ...target, debit: Math.abs(diff), credit: 0 };
      return prev.map((it, i) => (i === last ? patched : it));
    });
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!validation.valid) {
      onSaved?.(validation.errors[0], false);
      return;
    }
    // 新增时校验：同会计年度+同凭证类型下凭证号不重复
    if (!voucher) {
      const predictedNo = nextVoucherNo(vouchers, date, voucherType);
      const duplicate = vouchers.some((v) => v.voucherNo === predictedNo);
      if (duplicate) {
        setSnackbar({ open: true, message: `凭证号 ${predictedNo} 已存在，请修改` });
        return;
      }
    }
    const res = voucher
      ? updateVoucher(voucher.id, { date, voucherType, attachmentCount, remark, items })
      : createVoucher({ date, voucherType, attachmentCount, remark, items, createdBy: '当前用户' });
    onSaved?.(res.message, res.ok);
    if (res.ok) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{voucher ? `编辑凭证 ${voucher.voucherNo}` : '新增记账凭证'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={2}>
            <TextField select fullWidth size="small" label="凭证字" value={voucherType}
              data-testid="voucher-form-type"
              onChange={(e) => setVoucherType(e.target.value)}>
              {VOUCHER_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="记账日期" type="date" InputLabelProps={{ shrink: true }}
              data-testid="voucher-form-date"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField fullWidth size="small" label="附单据数" type="number"
              data-testid="voucher-form-attach"
              value={attachmentCount} onChange={(e) => setAttachmentCount(Number(e.target.value) || 0)} />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField fullWidth size="small" label="凭证备注" value={remark}
              data-testid="voucher-form-remark"
              onChange={(e) => setRemark(e.target.value)} />
          </Grid>
        </Grid>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 600, whiteSpace: 'nowrap' } }}>
                <TableCell width={48}>行号</TableCell>
                <TableCell width={220}>摘要</TableCell>
                <TableCell width={260}>会计科目</TableCell>
                <TableCell width={140} align="right">借方金额</TableCell>
                <TableCell width={140} align="right">贷方金额</TableCell>
                <TableCell width={160}>成本中心/项目</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={it.id} data-testid="voucher-item-row">
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <TextField fullWidth size="small" variant="standard" placeholder="摘要"
                      data-testid={`vi-summary-${idx}`}
                      value={it.summary}
                      onChange={(e) => patchItem(idx, { summary: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      size="small"
                      options={chartOfAccounts}
                      getOptionLabel={(o) => `${o.code} ${o.name}`}
                      value={chartOfAccounts.find((c) => c.name === it.accountName) || null}
                      onChange={(_, v) =>
                        patchItem(idx, { accountCode: v?.code || '', accountName: v?.name || '' })
                      }
                      renderInput={(params) => (
                        <TextField {...params} variant="standard" placeholder="选择科目"
                          data-testid={`vi-account-${idx}`}
                          error={submitted && !it.accountName} />
                      )}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField fullWidth size="small" variant="standard" type="number"
                      data-testid={`vi-debit-${idx}`}
                      inputProps={{ style: { textAlign: 'right' } }}
                      value={it.debit || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        patchItem(idx, { debit: v, credit: v > 0 ? 0 : it.credit });
                      }} />
                  </TableCell>
                  <TableCell align="right">
                    <TextField fullWidth size="small" variant="standard" type="number"
                      data-testid={`vi-credit-${idx}`}
                      inputProps={{ style: { textAlign: 'right' } }}
                      value={it.credit || ''}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        patchItem(idx, { credit: v, debit: v > 0 ? 0 : it.debit });
                      }} />
                  </TableCell>
                  <TableCell>
                    <TextField fullWidth size="small" variant="standard" placeholder="辅助核算"
                      data-testid={`vi-aux-${idx}`}
                      value={it.costCenterName || ''}
                      onChange={(e) => patchItem(idx, { costCenterName: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => removeLine(idx)} disabled={items.length <= 2}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell colSpan={3} sx={{ fontWeight: 700 }}>合计</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }} data-testid="voucher-total-debit">
                  ¥{totals.totalDebit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }} data-testid="voucher-total-credit">
                  ¥{totals.totalCredit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Button size="small" startIcon={<AddIcon />} onClick={addLine} data-testid="voucher-add-line">
            添加分录行
          </Button>
          <Tooltip title="把借贷差额自动补到最后一行">
            <span>
              <Button size="small" startIcon={<BalanceIcon />} onClick={autoBalance}
                disabled={balanced} data-testid="voucher-autofill">
                一键补平
              </Button>
            </span>
          </Tooltip>
          <Box flex={1} />
          <Typography variant="body2" data-testid="voucher-diff"
            color={balanced ? 'success.main' : 'error.main'} fontWeight={700}>
            {balanced ? '借贷平衡 ✓' : `差额 ¥${totals.difference.toFixed(2)}`}
          </Typography>
        </Box>

        {!balanced && (
          <Alert severity="warning" sx={{ mt: 1.5 }} data-testid="voucher-balance-tip">
            借贷不平衡，无法保存：借方合计 ¥{totals.totalDebit.toFixed(2)}，贷方合计 ¥{totals.totalCredit.toFixed(2)}，
            差额 ¥{totals.difference.toFixed(2)}
          </Alert>
        )}
        {submitted && !validation.valid && (
          <Alert severity="error" sx={{ mt: 1.5 }} data-testid="voucher-form-errors">
            {validation.errors.slice(0, 3).map((e) => <div key={e}>{e}</div>)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={!validation.valid} data-testid="voucher-save">
          保存凭证
        </Button>
      </DialogActions>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Dialog>
  );
}
