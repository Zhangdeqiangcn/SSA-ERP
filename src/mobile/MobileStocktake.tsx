import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Stack, TextField, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, List, ListItem,
  ListItemText, Divider, InputAdornment, IconButton,
} from '@mui/material';
import { QrCodeScanner, Search, CheckCircle, RemoveCircleOutline } from '@mui/icons-material';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useAuthStore } from '@/stores/authStore';
import BarcodeScanner from './components/BarcodeScanner';
import type { CheckTaskItem } from '@/types/warehouse';

/** 编码归一化：条码内容为大写物料编码，扫码值一律 trim + 大写后匹配 */
const norm = (s?: string) => String(s || '').trim().toUpperCase();

/** 本地可编辑的行（叠加「本次实盘」输入态） */
type EditableLine = CheckTaskItem & { _matched?: boolean };

/**
 * 移动端扫码盘点（V2.79.0 真功能，非演示）：
 *  选盘点任务 → 扫物料标签 → 录实盘数量
 *   → 提交：postCheckAdjustment 按「实盘 − 账面」差异直接调库存（盘盈加、盘亏减），
 *   任务标记完成；已登录态由仓库 store 的 Blob/D1 同步落库。
 * 提交前明示差异与未同步风险（未登录时数据仅在本机）。
 */
const MobileStocktake: React.FC = () => {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const checkTasks = useWarehouseStore((s) => s.checkTasks);
  const postCheckAdjustment = useWarehouseStore((s) => s.postCheckAdjustment);
  const authed = useAuthStore((s) => s.isAuthenticated);

  // V2.81.0：挂载即拉取最新盘点任务（真实 D1，跨端共享）
  useEffect(() => {
    useWarehouseStore.getState().loadCheckTasks();
  }, []);

  const openTasks = useMemo(
    () => checkTasks.filter((t) => t.status !== 'completed'),
    [checkTasks],
  );

  const taskId = searchParams.get('task') || '';
  const task = useMemo(
    () => openTasks.find((t) => t.id === taskId) || checkTasks.find((t) => t.id === taskId) || null,
    [openTasks, checkTasks, taskId],
  );

  const [lines, setLines] = useState<EditableLine[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [qtyTarget, setQtyTarget] = useState<{ index: number; value: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lineCode = (l: EditableLine) => norm(l.materialCode) || norm(l.materialId);

  // 选中任务变化 → 重置本地行（实盘默认等于账面，便于盲盘/明盘）
  useEffect(() => {
    setLines(task ? (task.items || []).map((i) => ({ ...i })) : []);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const diffOf = (l: EditableLine) => (l.countQuantity ?? l.bookQuantity) - l.bookQuantity;

  /** 扫码/搜索命中：按物料编码匹配，命中后打开数量录入 */
  const handleCode = (raw: string) => {
    const code = norm(raw);
    if (!code) return;
    const found = lines.findIndex((l) => lineCode(l) === code);
    if (found < 0) {
      setFlash({ msg: `未匹配到本任务物料：${code}。请确认扫描的是本任务标签，或改用行内「录数」。`, ok: false });
      return;
    }
    const l = lines[found];
    setQtyTarget({ index: found, value: String(l.countQuantity ?? l.bookQuantity) });
    setSearch('');
  };

  const applyQty = (index: number, qty: number) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      const count = Math.max(0, qty);
      return { ...l, countQuantity: count, difference: count - l.bookQuantity, _matched: true };
    }));
    setQtyTarget(null);
  };

  const dirty = lines.some((l) => l._matched);

  const submit = () => {
    if (!task) return;
    setSubmitting(true);
    try {
      const user = useAuthStore.getState().currentUser;
      postCheckAdjustment(task.id, lines.map(({ _matched, ...rest }) => ({ ...rest, difference: diffOf(rest as EditableLine) })));
      setConfirmOpen(false);
      setScanOpen(false);
      setFlash({
        msg: `已提交盘点 ${task.taskNo}：库存已按差异调整${authed ? '，数据已同步云端。' : '（当前未登录，数据仅保存在本机，登录后需人工核对同步）'}`,
        ok: true,
      });
      setSearchParams({}, { replace: true });
      setTimeout(() => nav('/m'), 900);
    } finally {
      setSubmitting(false);
    }
  };

  // ── 未选任务：任务选择列表 ───────────────────────────
  if (!task) {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          选择盘点任务（{openTasks.length}）
        </Typography>
        {openTasks.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">暂无待盘点任务。</Typography>
            <Button sx={{ mt: 1 }} onClick={() => nav('/m')}>返回任务列表</Button>
          </Paper>
        )}
        <Stack spacing={1.5}>
          {openTasks.map((t) => (
            <Paper
              key={t.id}
              onClick={() => setSearchParams({ task: t.id })}
              sx={{ p: 2, borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{t.taskNo}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip size="small" label={t.type === 'full' ? '全盘' : '抽盘'} variant="outlined" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {[t.warehouseName, `${t.items?.length || 0} 项`, t.startDate].filter(Boolean).join(' · ')}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  const qt = qtyTarget && lines[qtyTarget.index] ? lines[qtyTarget.index] : null;

  return (
    <Box sx={{ p: 1.5 }}>
      {/* 任务头 */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
            {task.taskNo}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" color="primary" label="盘点中" />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[task.warehouseName, task.type === 'full' ? '全盘' : '抽盘', task.startDate].filter(Boolean).join(' · ')}
        </Typography>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Button
          data-testid="m-scan-btn"
          variant="contained"
          size="large"
          startIcon={<QrCodeScanner />}
          onClick={() => setScanOpen(true)}
          sx={{ flex: 1, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          扫码盘点
        </Button>
      </Stack>
      <TextField
        inputProps={{ 'data-testid': 'm-search-input' }}
        size="small"
        fullWidth
        placeholder="输入/扫入物料编码后回车"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCode(search); } }}
        sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {lines.map((l, i) => {
          const diff = diffOf(l);
          return (
            <React.Fragment key={l.id || i}>
              {i > 0 && <Divider />}
              <ListItem
                data-testid={`m-line-${i}`}
                secondaryAction={(
                  <IconButton
                    edge="end"
                    data-testid={`m-line-edit-${i}`}
                    onClick={() => setQtyTarget({ index: i, value: String(l.countQuantity ?? l.bookQuantity) })}
                    color="primary"
                    aria-label="录数"
                  >
                    <RemoveCircleOutline />
                  </IconButton>
                )}
              >
                <ListItemText
                  primary={(
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={700}>{l.materialName || lineCode(l)}</Typography>
                      {l._matched && <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />}
                    </Stack>
                  )}
                  secondary={(
                    <>
                      {`${lineCode(l)}`}
                      <br />
                      <span data-testid={`m-line-actual-${i}`}>实盘 {l.countQuantity ?? l.bookQuantity}</span>
                      {` / 账面 ${l.bookQuantity}`}
                      {diff !== 0 ? `（差异 ${diff > 0 ? '+' : ''}${diff}）` : '（账实相符）'}
                    </>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>

      <Button
        data-testid="m-submit-btn"
        variant="contained"
        color="success"
        fullWidth
        size="large"
        disabled={!dirty}
        onClick={() => setConfirmOpen(true)}
        sx={{ mt: 2, py: 1.6, borderRadius: 3, fontWeight: 700 }}
      >
        提交盘点（调整库存）
      </Button>
      {!authed && (
        <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
          未登录模式：提交只写入本机演示数据；登录后提交才会写入云端 D1。
        </Alert>
      )}

      <BarcodeScanner open={scanOpen} title="扫码盘点" onClose={() => setScanOpen(false)} onDetect={handleCode} />

      <Dialog open={!!qt} onClose={() => setQtyTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>录入实盘数量</DialogTitle>
        <DialogContent>
          {qt && (
            <>
              <Typography variant="body2" fontWeight={700}>{qt.materialName || lineCode(qt)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {`${lineCode(qt)} · 账面 ${qt.bookQuantity} ${qt.locationName ? '· ' + qt.locationName : ''}`}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                type="number"
                inputProps={{ 'data-testid': 'm-qty-input', min: 0, inputMode: 'decimal' }}
                value={qtyTarget?.value ?? ''}
                onChange={(e) => setQtyTarget((p) => (p ? { ...p, value: e.target.value } : p))}
                sx={{ mt: 2 }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
                {[1, 5, 10].map((n) => (
                  <Chip key={n} label={`+${n}`} onClick={() => setQtyTarget((p) => (p ? { ...p, value: String((parseFloat(p.value) || 0) + n) } : p))} />
                ))}
                <Chip label={`账面 ${qt.bookQuantity}`} onClick={() => setQtyTarget((p) => (p ? { ...p, value: String(qt.bookQuantity) } : p))} color="primary" variant="outlined" />
                <Chip label="清零" onClick={() => setQtyTarget((p) => (p ? { ...p, value: '0' } : p))} />
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setQtyTarget(null)}>取消</Button>
          <Button
            data-testid="m-qty-confirm"
            variant="contained"
            onClick={() => { if (qtyTarget) applyQty(qtyTarget.index, Math.max(0, parseFloat(qtyTarget.value) || 0)); }}
          >
            确认
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>确认过账？</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            提交后任务标记完成，库存按「实盘 − 账面」差异调整：
          </Typography>
          <Typography variant="body2" component="div" color="text.secondary">
            · 盘盈：库存增加<br />
            · 盘亏：库存扣减<br />
            · {authed ? '任务写入云端 D1（多人/跨端共享）' : '当前未登录：仅写入本机，不会上传云端'}
          </Typography>
          {lines.some((l) => diffOf(l) !== 0) && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              存在账实差异：将按差异过账并关闭本任务。
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>再检查一下</Button>
          <Button data-testid="m-submit-confirm" variant="contained" color="success" disabled={submitting} onClick={submit}>
            确认盘点
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!flash}
        autoHideDuration={flash?.ok ? 2500 : 4000}
        onClose={() => setFlash(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={flash?.ok ? 'success' : 'error'} variant="filled" onClose={() => setFlash(null)}>
          {flash?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileStocktake;
