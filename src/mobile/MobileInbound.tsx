import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, Stack, TextField, MenuItem, Alert, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, List, ListItem,
  ListItemText, Divider, InputAdornment, IconButton, FormControl, InputLabel, Select,
} from '@mui/material';
import { QrCodeScanner, Search, CheckCircle, RemoveCircleOutline } from '@mui/icons-material';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useAuthStore } from '@/stores/authStore';
import BarcodeScanner from './components/BarcodeScanner';
import type { InboundOrderItem } from '@/types/warehouse';

/** 编码归一化：条码打印（Code 39）内容为大写物料编码，扫码值一律 trim + 大写后匹配 */
const norm = (s?: string) => String(s || '').trim().toUpperCase();

/** 本地可编辑的行（在单据行上叠加「本次实收」输入态） */
type EditableLine = InboundOrderItem & { _matched?: boolean };

/**
 * 移动端扫码入库（V2.78.0 真功能，非演示）：
 *  选单 → 扫物料/批次标签（原生 BarcodeDetector / ZXing 兜底 / 手动输入·扫码枪）
 *   → 匹配行（与「条码打印」的 Code 39 物料编码对齐）→ 录实收数量
 *   → 提交：updateInboundOrder 走既有真实链路（乐观更新内存 + b2Api.putInbound 写回
 *   云端 D1 + 过账滚库存 + 采购入库自动生成 GR/IR 暂估凭证）。
 * 提交前明示过账后果与未同步风险（未登录时数据仅在本机），不静默丢数据。
 */
const MobileInbound: React.FC = () => {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const inboundOrders = useWarehouseStore((s) => s.inboundOrders);
  const updateInboundOrder = useWarehouseStore((s) => s.updateInboundOrder);
  const materials = useMaterialStore((s) => s.materials);
  const authed = useAuthStore((s) => s.isAuthenticated);

  const openTasks = useMemo(
    () => inboundOrders.filter((o) => o.status === 'pending' || o.status === 'processing'),
    [inboundOrders],
  );

  const orderId = searchParams.get('order') || '';
  const order = useMemo(
    () => openTasks.find((o) => o.id === orderId) || inboundOrders.find((o) => o.id === orderId) || null,
    [openTasks, inboundOrders, orderId],
  );

  const [lines, setLines] = useState<EditableLine[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [qtyTarget, setQtyTarget] = useState<{ index: number; value: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 物料 id → code 兜底映射（条码内容=物料编码）
  const codeOf = useMemo(() => {
    const m = new Map<string, string>();
    materials.forEach((x) => m.set(x.id, norm(x.code)));
    return m;
  }, [materials]);

  // 选中单据变化 → 重置本地行
  useEffect(() => {
    setLines(order ? (order.items || []).map((i) => ({ ...i })) : []);
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const lineCode = (l: EditableLine) => norm(l.materialCode) || codeOf.get(l.materialId) || '';

  /** 扫码/搜索命中：按物料编码 → 批次号 匹配，命中后打开数量录入 */
  const handleCode = (raw: string) => {
    const code = norm(raw);
    if (!code) return;
    const found = lines.findIndex((l) => lineCode(l) === code
      || (l.batchNo && norm(l.batchNo) === code));
    if (found < 0) {
      setFlash({ msg: `未匹配到本单物料/批次：${code}。请确认扫描的是本单标签，或改用行内「录数」。`, ok: false });
      return;
    }
    const l = lines[found];
    const remaining = Math.max(0, (l.expectedQuantity || 0) - (l.actualQuantity || 0));
    setQtyTarget({ index: found, value: String(remaining || 1) });
    setSearch('');
  };

  /** 应用某行实收数量 */
  const applyQty = (index: number, qty: number) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== index) return l;
      const actual = Math.max(0, qty);
      return { ...l, actualQuantity: actual, _matched: true };
    }));
    setQtyTarget(null);
  };

  const dirty = lines.some((l) => (l.actualQuantity || 0) > 0);
  const partialLines = lines.filter((l) => (l.actualQuantity || 0) > 0 && (l.actualQuantity || 0) < (l.expectedQuantity || 0)).length;

  /** 提交：status → completed，走 store 真实过账 + D1 写回链路 */
  const submit = () => {
    if (!order) return;
    setSubmitting(true);
    try {
      const user = useAuthStore.getState().currentUser;
      updateInboundOrder(order.id, {
        items: lines.map(({ _matched, ...rest }) => rest),
        status: 'completed',
        // 与新增路径（addInboundOrder 对已收货单据）语义对齐：显式标记已过账，
        // 防后续状态流转重复过账，并随 b2Api.putInbound 同步到云端 D1。
        inventoryPosted: true,
        operator: user?.name || '移动端收货',
      });
      setConfirmOpen(false);
      setScanOpen(false);
      setFlash({ msg: `已提交 ${order.inboundNo}：库存已过账${authed ? '，数据已同步云端。' : '（当前未登录，数据仅保存在本机，登录后需人工核对同步）'}`, ok: true });
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
          选择要收货的入库单（{openTasks.length}）
        </Typography>
        {openTasks.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">暂无待收货单据。</Typography>
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
                <Typography variant="subtitle2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{o.inboundNo}</Typography>
                <Box sx={{ flex: 1 }} />
                <Chip size="small" label={`${(o.items || []).length} 行`} variant="outlined" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {[o.vendorName, o.warehouseName, o.inboundDate].filter(Boolean).join(' · ')}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  const qt = qtyTarget && lines[qtyTarget.index]
    ? lines[qtyTarget.index]
    : null;
  const qtRemaining = qt ? Math.max(0, (qt.expectedQuantity || 0) - (qt.actualQuantity || 0)) : 0;

  return (
    <Box sx={{ p: 1.5 }}>
      {/* 单据头 */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
            {order.inboundNo}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" color="primary" label={order.status === 'pending' ? '待收货' : '收货中'} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {[order.vendorName, order.warehouseName, order.sourceNo].filter(Boolean).join(' · ')}
        </Typography>
      </Paper>

      {/* 扫码主按钮 + 搜索框（扫码枪键盘输入等效） */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Button
          data-testid="m-scan-btn"
          variant="contained"
          size="large"
          startIcon={<QrCodeScanner />}
          onClick={() => setScanOpen(true)}
          sx={{ flex: 1, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          扫码收货
        </Button>
      </Stack>
      <TextField
        data-testid="m-search-input"
        size="small"
        fullWidth
        placeholder="输入/扫入物料编码或批次号后回车"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCode(search); } }}
        sx={{ mb: 1.5, bgcolor: 'background.paper', borderRadius: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
        }}
      />

      {/* 明细行 */}
      <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {lines.map((l, i) => {
          const over = (l.actualQuantity || 0) > (l.expectedQuantity || 0);
          return (
            <React.Fragment key={l.id || i}>
              {i > 0 && <Divider />}
              <ListItem
                data-testid={`m-line-${i}`}
                secondaryAction={(
                  <IconButton
                    edge="end"
                    data-testid={`m-line-edit-${i}`}
                    onClick={() => setQtyTarget({ index: i, value: String(Math.max(1, (l.expectedQuantity || 0) - (l.actualQuantity || 0) || 1)) })}
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
                      <span data-testid={`m-line-actual-${i}`}>
                        实收 {l.actualQuantity || 0}
                      </span>
                      {` / 应收 ${l.expectedQuantity} ${l.unit || ''}`}
                      {over ? '（超收）' : ''}
                    </>
                  )}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            </React.Fragment>
          );
        })}
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
        提交收货（过账库存）
      </Button>
      {!authed && (
        <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
          未登录模式：提交只写入本机演示数据；登录后提交才会写入云端 D1。
        </Alert>
      )}

      {/* 扫码对话框 */}
      <BarcodeScanner
        open={scanOpen}
        title="扫码收货"
        onClose={() => setScanOpen(false)}
        onDetect={handleCode}
      />

      {/* 数量录入对话框 */}
      <Dialog open={!!qt} onClose={() => setQtyTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>录入实收数量</DialogTitle>
        <DialogContent>
          {qt && (
            <>
              <Typography variant="body2" fontWeight={700}>{qt.materialName || lineCode(qt)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {`${lineCode(qt)}${qt.batchNo ? ` · 批次 ${qt.batchNo}` : ''} · 应收 ${qt.expectedQuantity} ${qt.unit || ''}`}
              </Typography>
              <TextField
                data-testid="m-qty-input"
                autoFocus
                fullWidth
                type="number"
                inputProps={{ min: 0, inputMode: 'decimal' }}
                value={qtyTarget?.value ?? ''}
                onChange={(e) => setQtyTarget((p) => (p ? { ...p, value: e.target.value } : p))}
                sx={{ mt: 2 }}
                InputProps={{ endAdornment: <InputAdornment position="end">{qt.unit || ''}</InputAdornment> }}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} useFlexGap flexWrap="wrap">
                {[1, 5, 10].map((n) => (
                  <Chip key={n} label={`+${n}`} onClick={() => setQtyTarget((p) => (p ? { ...p, value: String((parseFloat(p.value) || 0) + n) } : p))} />
                ))}
                <Chip label={`剩余 ${qtRemaining}`} onClick={() => setQtyTarget((p) => (p ? { ...p, value: String(qtRemaining) } : p))} color="primary" variant="outlined" />
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
            提交后本单将标记完成并按实收数量过账：
          </Typography>
          <Typography variant="body2" component="div" color="text.secondary">
            · 库存与批次立即增加（实时重算）<br />
            · 滚动移动平均成本<br />
            · 采购入库自动生成 GR/IR 暂估凭证<br />
            · {authed ? '单据写入云端 D1（多人/跨端共享）' : '当前未登录：仅写入本机，不会上传云端'}
          </Typography>
          {partialLines > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              有 {partialLines} 行实收少于应收：将按实收数量过账并关闭本单（部分收货）。
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>再检查一下</Button>
          <Button data-testid="m-submit-confirm" variant="contained" color="success" disabled={submitting} onClick={submit}>
            确认入库
          </Button>
        </DialogActions>
      </Dialog>

      {/* 结果提示 */}
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

export default MobileInbound;
