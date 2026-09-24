import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, MenuItem, Paper, Snackbar, Autocomplete, Grid, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { useVoucherTemplateStore } from '@/stores/voucherTemplateStore';
import { useFinanceStore } from '@/stores/financeStore';
import type { VoucherTemplate, VoucherTemplateItem, ChartAccount } from '@/types/finance';

const VOUCHER_TYPES = ['记', '收', '付', '转'];

function emptyLine(lineNo: number): VoucherTemplateItem {
  return { lineNo, summary: '', accountCode: '', accountName: '', direction: 'debit', defaultAmount: 0 };
}

export default function VoucherTemplateList() {
  const { templates, loaded, load, create, update, remove } = useVoucherTemplateStore();
  const { chartOfAccounts } = useFinanceStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VoucherTemplate | null>(null);
  const [name, setName] = useState('');
  const [voucherType, setVoucherType] = useState('记');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<VoucherTemplateItem[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setVoucherType('记');
    setDescription('');
    setItems([emptyLine(1), emptyLine(2)]);
    setOpen(true);
  };

  const openEdit = (t: VoucherTemplate) => {
    setEditing(t);
    setName(t.name);
    setVoucherType(t.voucherType || '记');
    setDescription(t.description || '');
    setItems((t.items || []).map((it, i) => ({ ...it, lineNo: i + 1 })));
    setOpen(true);
  };

  const patchItem = (idx: number, patch: Partial<VoucherTemplateItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addLine = () => setItems((prev) => [...prev, emptyLine(prev.length + 1)]);
  const removeLine = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, lineNo: i + 1 })));

  const save = async () => {
    if (!name.trim()) { setSnackbar({ open: true, message: '模板名称必填' }); return; }
    const cleanItems = items
      .filter((it) => it.accountCode || it.summary)
      .map((it, i) => ({ ...it, lineNo: i + 1 }));
    const payload = { name: name.trim(), voucherType, description, items: cleanItems };
    const res = editing ? await update(editing.id!, payload) : await create(payload);
    setSnackbar({ open: true, message: res.message });
    if (res.ok) setOpen(false);
  };

  const onDelete = async (t: VoucherTemplate) => {
    if (!confirm(`确认删除凭证模板「${t.name}」？此操作不可撤销。`)) return;
    const res = await remove(t.id!);
    setSnackbar({ open: true, message: res.message });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>凭证模板（常用凭证）</Typography>
        <Box flex={1} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          新建模板
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        把高频重复的凭证（如计提工资、摊销房租、结转损益）的分录骨架存成模板，录入凭证时点「套用模板」即可一键带出摘要与科目，金额留空待填。
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600 } }}>
              <TableCell>模板名称</TableCell>
              <TableCell>凭证字</TableCell>
              <TableCell>说明</TableCell>
              <TableCell align="right">分录行</TableCell>
              <TableCell width={120} />
            </TableRow>
          </TableHead>
          <TableBody>
            {!loaded && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>加载中…</TableCell></TableRow>
            )}
            {loaded && templates.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>暂无模板，点右上角「新建模板」创建第一份常用凭证。</TableCell></TableRow>
            )}
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                <TableCell>{t.voucherType || '—'}</TableCell>
                <TableCell>{t.description || '—'}</TableCell>
                <TableCell align="right">{(t.items || []).length}</TableCell>
                <TableCell>
                  <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => onDelete(t)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? `编辑模板 ${editing.name}` : '新建凭证模板'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth required size="small" label="模板名称" value={name}
                onChange={(e) => setName(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField select fullWidth size="small" label="凭证字" value={voucherType}
                onChange={(e) => setVoucherType(e.target.value)}>
                {VOUCHER_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth size="small" label="说明" value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>分录行（方向＝借贷；默认金额填 0 表示套用时留空待填）</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 600, whiteSpace: 'nowrap' } }}>
                  <TableCell width={40}>#</TableCell>
                  <TableCell width={220}>摘要</TableCell>
                  <TableCell width={260}>会计科目</TableCell>
                  <TableCell width={110}>方向</TableCell>
                  <TableCell width={130} align="right">默认金额</TableCell>
                  <TableCell width={40} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <TextField fullWidth size="small" variant="standard" placeholder="摘要"
                        value={it.summary} onChange={(e) => patchItem(idx, { summary: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={chartOfAccounts as ChartAccount[]}
                        getOptionLabel={(o) => `${o.code} ${o.name}`}
                        value={chartOfAccounts.find((c) => c.name === it.accountName) || null}
                        onChange={(_, v) => patchItem(idx, { accountCode: v?.code || '', accountName: v?.name || '' })}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="选择科目" />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField select fullWidth size="small" variant="standard" value={it.direction}
                        onChange={(e) => patchItem(idx, { direction: e.target.value as 'debit' | 'credit' })}>
                        <MenuItem value="debit">借</MenuItem>
                        <MenuItem value="credit">贷</MenuItem>
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      <TextField fullWidth size="small" variant="standard" type="number" value={it.defaultAmount || ''}
                        inputProps={{ style: { textAlign: 'right' } }}
                        onChange={(e) => patchItem(idx, { defaultAmount: Number(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeLine(idx)} disabled={items.length <= 1}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ mt: 1 }}>添加分录行</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={save}>保存模板</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar({ open: false, message: '' })} message={snackbar.message}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
    </Box>
  );
}
