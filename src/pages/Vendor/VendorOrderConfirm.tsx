import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, Tooltip, IconButton,
  InputAdornment, MenuItem, Collapse, Snackbar,
} from '@mui/material';
import {
  CheckCircle, Edit, Warning, Search, FilterList,
  Clear, ExpandMore, ExpandLess, DateRange, QrCode, AttachMoney,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, FlowTracker } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getVendorPortalIdentity } from '@/utils/vendorPortalIdentity';
import type { VendorOrderConfirm } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'success' },
  modified: { label: '部分确认', color: 'info' },
  rejected: { label: '已拒绝', color: 'error' },
};

// ── 增强的筛选参数 ───────────────────────────────────────
interface SearchParams {
  purchaseOrderNo: string;
  confirmNo: string;
  materialCode: string;
  materialName: string;
  vendorName: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

/** 订单确认弹窗 */
const ConfirmOrderDialog: React.FC<{
  open: boolean;
  order: VendorOrderConfirm | null;
  autoHours: number;
  onClose: () => void;
}> = ({ open, order, autoHours, onClose }) => {
  const { updateVendorOrderConfirm } = useFlowStore();
  // Hook 必须在任何提前 return 之前无条件调用，避免违反 Hooks 规则导致整页崩溃
  const [items, setItems] = useState(order ? order.confirmedItems.map(i => ({ ...i })) : []);
  const [remark, setRemark] = useState(order?.vendorRemark || '');
  if (!order) return null;

  // 系统默认自动确认时间
  const autoConfirmAt = (() => {
    const base = new Date(String(order.createdAt).replace(/-/g, '/'));
    if (isNaN(base.getTime())) return '';
    base.setHours(base.getHours() + autoHours);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())} ${p(base.getHours())}:${p(base.getMinutes())}`;
  })();

  const updateItem = (idx: number, field: string, value: unknown) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.confirmedQty * i.unitPrice, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
        订单确认 — {order.purchaseOrderNo}
        <Chip label={statusMap[order.status]?.label} size="small"
          color={statusMap[order.status]?.color} />
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8125rem' }}>
          请核对订单明细并填写确认交期。如有部分品项无法按量交货，请在备注中说明。
          {order.status === 'pending' && autoConfirmAt && (
            <Box component="span" sx={{ display: 'block', mt: 0.5, color: '#B45309' }}>
              系统默认确认时限为 {autoHours} 小时，若未处理将于 {autoConfirmAt} 自动确认。
            </Box>
          )}
        </Alert>

        {/* 订单概要 */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">确认单号</Typography>
              <Typography variant="body2" fontFamily="monospace">{order.confirmNo}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">供应商</Typography>
              <Typography variant="body2">{order.vendorName}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">确认状态</Typography>
              <Chip label={statusMap[order.status]?.label} size="small" color={statusMap[order.status]?.color} />
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="text.secondary">合计金额</Typography>
              <Typography variant="body2" fontWeight={700} color="#3B82F6">{formatCurrency(totalAmount)}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2, mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">采购数量</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">确认数量</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">单价</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">小计</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>可交付日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>备注</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={item.itemId} hover>
                  <TableCell><Chip label={item.materialCode} size="small"
                    sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.75rem' }} /></TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.materialName}</TableCell>
                  <TableCell align="right">{item.orderedQty}</TableCell>
                  <TableCell align="right">
                    <TextField size="small" type="number" value={item.confirmedQty}
                      onChange={(e) => updateItem(idx, 'confirmedQty', Number(e.target.value))}
                      sx={{ width: 90 }} inputProps={{ min: 0 }} />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: '#3B82F6' }}>
                    {formatCurrency(item.confirmedQty * item.unitPrice)}
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="date" value={item.canDeliverDate}
                      onChange={(e) => updateItem(idx, 'canDeliverDate', e.target.value)}
                      sx={{ width: 140 }} InputLabelProps={{ shrink: true }} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={item.remark || ''}
                      onChange={(e) => updateItem(idx, 'remark', e.target.value)}
                      sx={{ width: 140 }} placeholder="可选" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TextField fullWidth size="small" label="整体说明" multiline rows={2}
          value={remark} onChange={(e) => setRemark(e.target.value)}
          placeholder="如有分批交货、价格异议等，请在此说明" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" onClick={() => { updateVendorOrderConfirm(order!.id, { vendorRemark: remark, confirmedItems: items }); onClose(); }}>暂存</Button>
        <Button variant="outlined" color="error" onClick={() => { updateVendorOrderConfirm(order!.id, { status: 'rejected', vendorRemark: remark }); onClose(); }}>拒绝订单</Button>
        <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => {
          updateVendorOrderConfirm(order!.id, { status: 'confirmed', vendorRemark: remark, confirmedItems: items, confirmedAt: nowStr(), confirmedBy: order!.vendorName });
          // B5-T2 回写主系统采购订单：供应商门户确认 → PO 状态推进为 vendorConfirmed
          usePurchaseStore.getState().confirmOrderByVendor(order!.purchaseOrderId, { vendorId: order!.vendorId, operator: order!.vendorName, note: remark });
          onClose();
        }}>确认订单</Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 主页面 ─────────────────────────────────────────────
const VendorOrderConfirmList: React.FC = () => {
  const { vendorOrderConfirms, updateVendorOrderConfirm } = useFlowStore();
  const { vendorPortalConfig } = useSettingsStore();
  const identity = getVendorPortalIdentity();
  const autoHours = vendorPortalConfig.vendorOrderAutoConfirmHours || 24;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState<SearchParams>({
    purchaseOrderNo: '', confirmNo: '', materialCode: '', materialName: '',
    vendorName: '', status: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<VendorOrderConfirm | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  // 超时自动确认：pending 订单超过默认确认时限后系统自动确认
  useEffect(() => {
      const tick = () => {
        const now = Date.now();
        vendorOrderConfirms
          .filter(o => !identity || o.vendorId === identity.vendorId)
          .forEach(o => {
            if (o.status !== 'pending' || !o.createdAt) return;
            const created = new Date(String(o.createdAt).replace(/-/g, '/')).getTime();
            if (isNaN(created)) return;
            if (now - created > autoHours * 3600 * 1000) {
              updateVendorOrderConfirm(o.id, { status: 'confirmed', confirmedAt: nowStr(), confirmedBy: o.vendorName || '系统自动' });
              usePurchaseStore.getState().confirmOrderByVendor(o.purchaseOrderId, { vendorId: o.vendorId, operator: o.vendorName || '系统自动' });
              setSnackbar({ open: true, msg: `订单 ${o.purchaseOrderNo} 已超过 ${autoHours}h 确认时限，系统已自动确认` });
            }
          });
      };
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [autoHours, vendorOrderConfirms, updateVendorOrderConfirm]);

  const updateParam = (key: keyof SearchParams, value: string) => {
    setSearchParams(prev => ({ ...prev, [key]: value }));
  };

  const clearAll = () => {
    setSearchParams({
      purchaseOrderNo: '', confirmNo: '', materialCode: '', materialName: '',
      vendorName: '', status: '', dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
    });
    setShowAdvanced(false);
  };

  const hasActiveFilter = Object.values(searchParams).some(v => v !== '');

  const columns: ColumnDef<VendorOrderConfirm, unknown>[] = useMemo(() => [
    { accessorKey: 'confirmNo', header: '确认单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>
          {row.original.confirmNo}
        </Typography>
      ),
    },
    { accessorKey: 'purchaseOrderNo', header: '采购订单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
          {row.original.purchaseOrderNo}
        </Typography>
      ),
    },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'confirmedItems', header: '物料明细',
      cell: ({ row }) => (
        <Stack spacing={0.3}>
          {row.original.confirmedItems.slice(0, 2).map(item => (
            <Box key={item.itemId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label={item.materialCode} size="small"
                sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem' }} />
              <Typography variant="caption">{item.materialName}</Typography>
            </Box>
          ))}
          {row.original.confirmedItems.length > 2 && (
            <Typography variant="caption" color="text.secondary">+{row.original.confirmedItems.length - 2} 更多</Typography>
          )}
        </Stack>
      ),
    },
    { accessorKey: 'confirmedDeliveryDate', header: '确认交期',
      cell: ({ row }) => row.original.confirmedDeliveryDate ? formatDate(row.original.confirmedDeliveryDate) : (
        <Chip label="待确认" size="small" color="warning" />
      ),
    },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} />;
      },
    },
    { accessorKey: 'confirmedAt', header: '确认时间',
      cell: ({ row }) => row.original.confirmedAt ? formatDate(row.original.confirmedAt) : '-',
    },
  ], []);

  // ── 多维度筛选 ────────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = [...vendorOrderConfirms].filter(d => !identity || d.vendorId === identity.vendorId);

    if (searchParams.purchaseOrderNo) {
      data = data.filter(d => d.purchaseOrderNo.toLowerCase().includes(searchParams.purchaseOrderNo.toLowerCase()));
    }
    if (searchParams.confirmNo) {
      data = data.filter(d => d.confirmNo.toLowerCase().includes(searchParams.confirmNo.toLowerCase()));
    }
    if (searchParams.materialCode) {
      data = data.filter(d =>
        d.confirmedItems.some(item =>
          item.materialCode.toLowerCase().includes(searchParams.materialCode.toLowerCase())
        )
      );
    }
    if (searchParams.materialName) {
      data = data.filter(d =>
        d.confirmedItems.some(item =>
          item.materialName.toLowerCase().includes(searchParams.materialName.toLowerCase())
        )
      );
    }
    if (searchParams.vendorName) {
      data = data.filter(d => d.vendorName.toLowerCase().includes(searchParams.vendorName.toLowerCase()));
    }
    if (searchParams.status) {
      data = data.filter(d => d.status === searchParams.status);
    }
    if (searchParams.dateFrom) {
      data = data.filter(d => d.confirmedAt && d.confirmedAt >= searchParams.dateFrom);
    }
    if (searchParams.dateTo) {
      data = data.filter(d => d.confirmedAt && d.confirmedAt <= searchParams.dateTo + ' 23:59:59');
    }
    // 金额区间（按合同金额计算）
    if (searchParams.amountMin) {
      const min = Number(searchParams.amountMin);
      if (!isNaN(min)) {
        data = data.filter(d => {
          const total = d.confirmedItems.reduce((s, i) => s + i.confirmedQty * i.unitPrice, 0);
          return total >= min;
        });
      }
    }
    if (searchParams.amountMax) {
      const max = Number(searchParams.amountMax);
      if (!isNaN(max)) {
        data = data.filter(d => {
          const total = d.confirmedItems.reduce((s, i) => s + i.confirmedQty * i.unitPrice, 0);
          return total <= max;
        });
      }
    }
    return data;
  }, [searchParams]);

  // 统计
  const stats = useMemo(() => {
    const pending = vendorOrderConfirms.filter(d => d.status === 'pending').length;
    const total = vendorOrderConfirms.length;
    const confirmedTotal = vendorOrderConfirms.filter(d => d.status === 'confirmed' || d.status === 'modified').length;
    return { pending, total, confirmedTotal, result: filteredData.length };
  }, [filteredData]);

  return (
    <PageWrapper title="供应商订单确认" actions={<FlowTracker module="vendor-order" currentStatus="vo_confirmed" />}>
      {/* ── 快速统计卡 ────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: '全部订单', count: stats.total, color: '#64748B' },
          { label: '待确认', count: stats.pending, color: '#F59E0B' },
          { label: '已确认', count: stats.confirmedTotal, color: '#10B981' },
          { label: '当前筛选结果', count: stats.result, color: '#3B82F6' },
        ].map(({ label, count, color }) => (
          <Grid item xs={6} md={3} key={label}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderColor: `${color}30` }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color }}>{count}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── 查询面板 ──────────────────────────────────── */}
      <Paper sx={{ p: 2.5, mb: 2, borderRadius: 2, border: '1px solid #E2E8F0' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Search fontSize="small" /> 查询条件
          </Typography>
          <Stack direction="row" spacing={1}>
            {hasActiveFilter && (
              <Button size="small" startIcon={<Clear />} onClick={clearAll} sx={{ fontSize: '0.75rem' }}>
                清除条件
              </Button>
            )}
            <Chip
              icon={showAdvanced ? <ExpandLess /> : <ExpandMore />}
              label={showAdvanced ? '收起高级筛选' : '展开高级筛选'}
              size="small"
              variant="outlined"
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Stack>

        {/* 基础筛选行 */}
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" label="采购订单号" value={searchParams.purchaseOrderNo}
              onChange={e => updateParam('purchaseOrderNo', e.target.value)}
              placeholder="如 PO20240506001"
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" label="确认单号" value={searchParams.confirmNo}
              onChange={e => updateParam('confirmNo', e.target.value)}
              placeholder="如 VOC20240507001"
              InputProps={{ startAdornment: <InputAdornment position="start"><QrCode sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" label="物料编码" value={searchParams.materialCode}
              onChange={e => updateParam('materialCode', e.target.value)}
              placeholder="如 MAT202405010001"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" label="状态" select value={searchParams.status}
              onChange={e => updateParam('status', e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="pending">待确认</MenuItem>
              <MenuItem value="confirmed">已确认</MenuItem>
              <MenuItem value="modified">部分确认</MenuItem>
              <MenuItem value="rejected">已拒绝</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {/* 高级筛选 */}
        <Collapse in={showAdvanced}>
          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" label="物料名称" value={searchParams.materialName}
                onChange={e => updateParam('materialName', e.target.value)}
                placeholder="如 钢板"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth size="small" label="供应商" value={searchParams.vendorName}
                onChange={e => updateParam('vendorName', e.target.value)}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth size="small" label="确认日期从" type="date" value={searchParams.dateFrom}
                onChange={e => updateParam('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth size="small" label="至" type="date" value={searchParams.dateTo}
                onChange={e => updateParam('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth size="small" label="金额≥" type="number" value={searchParams.amountMin}
                onChange={e => updateParam('amountMin', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth size="small" label="金额≤" type="number" value={searchParams.amountMax}
                onChange={e => updateParam('amountMax', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
              />
            </Grid>
          </Grid>
        </Collapse>

        {/* 筛选结果提示 */}
        {hasActiveFilter && (
          <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
            <Typography variant="caption">
              找到 <b>{filteredData.length}</b> 条匹配记录（共 {vendorOrderConfirms.length} 条）
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* ── 数据表格 ──────────────────────────────────── */}
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onView={(row) => setSelectedOrder(row)}
        onEdit={(row) => setSelectedOrder(row)}
      />

      <ConfirmOrderDialog
        open={Boolean(selectedOrder)}
        order={selectedOrder}
        autoHours={autoHours}
        onClose={() => setSelectedOrder(null)}
      />
      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, msg: '' })} message={snackbar.msg} />
    </PageWrapper>
  );
};

export default VendorOrderConfirmList;
