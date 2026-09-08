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
import SubstituteAdvisor from '@/components/material/SubstituteAdvisor';
import type { OutboundOrderItem } from '@/types/warehouse';

/** 编码归一化：条码打印（Code 39）内容为大写物料编码，扫码值一律 trim + 大写后匹配 */
const norm = (s?: string) => String(s || '').trim().toUpperCase();

/** 本地可编辑的行（在单据行上叠加「本次实发」输入态） */
type EditableLine = OutboundOrderItem & { _matched?: boolean };

/**
 * 移动端扫码出库（V2.79.0 真功能，非演示）：
 *  选出库单 → 扫物料/批次标签 → 匹配行 → 录实发数量
 *   → 提交：updateOutboundOrder 走既有真实链路（status→completed 触发 扣减库存 + 批次先进先出核销
 *   + 回写销售订单发货 + 结转销售成本 COGS 凭证 + 已登录态 b2Api.putOutbound 写回云端 D1）。
 * 与入库页同构：提交前明示过账后果与未同步风险（未登录时数据仅在本机）。
 */
const MobileOutbound: React.FC = () => {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const outboundOrders = useWarehouseStore((s) => s.outboundOrders);
  const updateOutboundOrder = useWarehouseStore((s) => s.updateOutboundOrder);
  const authed = useAuthStore((s) => s.isAuthenticated);

  // 待出库单据：未完成（completed）的全部视为可作业（sale/pick/subcontract/transfer 等）
  const openTasks = useMemo(
    () => outboundOrders.filter((o) => o.status !== 'completed'),
    [outboundOrders],
  );

  const orderId = searchParams.get('order') || '';
  const order = useMemo(
    () => openTasks.find((o) => o.id === orderId) || outboundOrders.find((o) => o.id === orderId) || null,
    [openTasks, outboundOrders, orderId],
  );

  const [lines, setLines] = useState<EditableLine[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [qtyTarget, setQtyTarget] = useState<{ index: number; value: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lineCode = (l: EditableLine) => norm(l.materialCode) || norm(l.materialId);

  // 选中单据变化 → 重置本地行（实发默认等于应发）
  useEffect(() => {
    setLines(order ? (order.items || []).map((i) => ({ ...i })) : []);
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** 扫码/搜索命中：按物料编码 → 批次号 匹配，命中后打开数量录入 */
  const handleCode = (raw: string) => {
    const code = norm(raw);
    if (!code) return;
    const found = lines.findIndex((l) => lineCode(l) === code || (l.batchNo && norm(l.batchNo) === code));
    if (found < 0) {
      setFlash({ msg: `未匹配到本单物料/批次：${code}。请确认扫描的是本单标签，或改用行内「录数」。`, ok: false });
      return;
    }
    const l = lines[found];
    setQtyTarget({ index: found, value: String(l.quantity || 1) });
    setSearch('');
  };

  /** 应用某行实发数量（实发直接改写 quantity，覆盖应发） */
  const applyQty = (index: number, qty: number) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      return { ...l, quantity: Math.max(0, qty), _matched: true };
    }));
    setQtyTarget(null);
  };

  const dirty = lines.some((l) => l._matched);

  /** 提交：status → completed，走 store 真实过账（扣库存 + COGS + SO 回写 + D1 写回） */
  const submit = () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const user = useAuthStore.getState().currentUser;
      updateOutboundOrder(order.id, {
        items: lines.map(({ _matched, ...rest }) => rest),
        status: 'completed',
        inventoryPosted: true,
        shippedAt: new Date().toISOString(),
        operator: user?.name || '移动端发货',
      });
      setConfirmOpen(false);
      setScanOpen(false);
      setFlash({
        msg: `已提交 ${order.outboundNo}：库存已扣减、成本已结转${authed ? '，数据已同步云端。' : '（当前未登录，数据仅保存在本机，登录后需人工核对同步）'}`,
        ok: true,
      });
      setSearchParams({}, { replace: true });
      setTimeout(() => nav('/m'), 900);
    } finally {
      setSubmitting(false);
    }
  };

  // ── 未选单：任务选择列表 ───────────────────────────
  if (!order) {
    return (
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          选择要发货的出库单（{openTasks.length}）
        </Typography>
        {openTasks.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">暂无待出库单据。</Typography>
            <Button sx={{ mt: 1 }} onClick={() => nav('/m')}>返回任务列表</Button>
          </Paper>
        )}
        <Stack spacing={1.5}>
          {openTasks.map((o) => (
            <Paper
              key={o.id}
              onClick={() => setSearchParams({ order: o.id })}
              sx={{ p: 2, borderRadius: 3, cursor: 'pointer', '&:active': { bgcolor: 'action.hover' } }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{o.outboundNo}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip size="small" label={`${(o.items || []).length} 行`} variant="outlined" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {[o.customerName || o.vendorName, o.warehouseName, o.outboundDate].filter(Boolean).join(' · ')}
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
      {/* 单据头 */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
            {order.outboundNo}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" color="primary" label="待出库" />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[order.customerName || order.vendorName, order.warehouseName, order.sourceNo].filter(Boolean).join(' · ')}
        </Typography>
      </Paper>

      {/* 扫码主按钮 + 搜索框 */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Button
          data-testid="m-scan-btn"
          variant="contained"
          size="large"
          startIcon={<QrCodeScanner />}
          onClick={() => setScanOpen(true)}
          sx={{ flex: 1, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          扫码发货
        </Button>
      </Stack>
      <TextField
        inputProps={{ 'data-testid': 'm-search-input' }}
        size="small"
        fullWidth
        placeholder="输入/扫入物料编码或批次号后回车"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCode(search); } }}
        sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      {/* 明细行 */}
      <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {lines.map((l, i) => (
          <React.Fragment key={l.id || i}>
            {i > 0 && <Divider />}
            <ListItem
              data-testid={`m-line-${i}`}
              secondaryAction={(
                <IconButton
                  edge="end"
                  data-testid={`m-line-edit-${i}`}
                  onClick={() => setQtyTarget({ index: i, value: String(l.quantity || 1) })}
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
                    {`${lineCode(l)}${l.batchNo ? ` · 批次 ${l.batchNo}` : ''} · ${l.specification || ''}`}
                    <br />
                    <span data-testid={`m-line-actual-${i}`}>实发 {l.quantity || 0}</span>
                    {` ${l.unit || ''}`}
                    <br />
                    <SubstituteAdvisor materialCode={lineCode(l)} neededQty={l.quantity} dense />
                  </>
                )}
                secondaryTypographyProps={{ component: 'div' }}
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>

      {/* 提交 */}
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
        提交发货（过账库存）
      </Button>
      {!authed && (
        <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
          未登录模式：提交只写入本机演示数据；登录后提交才会写入云端 D1。
        </Alert>
      )}

      <BarcodeScanner open={scanOpen} title="扫码发货" onClose={() => setScanOpen(false)} onDetect={handleCode} />

      {/* 数量录入对话框 */}
      <Dialog open={!!qt} onClose={() => setQtyTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>录入实发数量</DialogTitle>
        <DialogContent>
          {qt && (
            <>
              <Typography variant="body2" fontWeight={700}>{qt.materialName || lineCode(qt)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {`${lineCode(qt)}${qt.batchNo ? ` · 批次 ${qt.batchNo}` : ''} · 应发 ${qt.quantity} ${qt.unit || ''}`}
              </Typography>
              <TextField
                autoFocus
                fullWidth
                type="number"
                inputProps={{ 'data-testid': 'm-qty-input', min: 0, inputMode: 'decimal' }}
                value={qtyTarget?.value ?? ''}
                onChange={(e) => setQtyTarget((p) => (p ? { ...p, value: e.target.value } : p))}
                sx={{ mt: 2 }}
                InputProps={{ endAdornment: <InputAdornment position="end">{qt.unit || ''}</InputAdornment> }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
                {[1, 5, 10].map((n) => (
                  <Chip key={n} label={`+${n}`} onClick={() => setQtyTarget((p) => (p ? { ...p, value: String((parseFloat(p.value) || 0) + n) } : p))} />
                ))}
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

      {/* 提交确认对话框：明示过账后果 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>确认过账？</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            提交后本单将标记完成并按实发数量过账：
          </Typography>
          <Typography variant="body2" component="div" color="text.secondary">
            · 库存与批次立即扣减（先进先出核销）<br />
            · 回写销售订单发货状态<br />
            · 自动结转销售成本（COGS 凭证）<br />
            · {authed ? '单据写入云端 D1（多人/跨端共享）' : '当前未登录：仅写入本机，不会上传云端'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>再检查一下</Button>
          <Button data-testid="m-submit-confirm" variant="contained" color="success" disabled={submitting} onClick={submit}>
            确认出库
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

export default MobileOutbound;
