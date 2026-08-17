import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, TextField, Stack,
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Stepper, Step, StepLabel, Alert, MenuItem,
} from '@mui/material';
import {
  Add, Visibility, Search, LocalShipping, Close, FlightTakeoff,
  DirectionsBoat, DirectionsRailway, DirectionsCar,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { useSalesStore } from '@/stores/salesStore';
import { Shipment, ShipmentStatus, TransportMode, ShipmentItem } from '@/types';
import { PageWrapper } from '@/components/layout';
import { DataTable } from '@/components/common';
import { formatCurrency } from '@/utils/format';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: '待发货', picked: '已拣货', packed: '已打包', shipped: '已出库',
  in_transit: '运输中', delivered: '已签收', cancelled: '已取消',
};
const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: '#94A3B8', picked: '#6366F1', packed: '#8B5CF6', shipped: '#3B82F6',
  in_transit: '#F59E0B', delivered: '#10B981', cancelled: '#EF4444',
};
const TRANSPORT_ICONS: Record<TransportMode, React.ReactNode> = {
  road: <DirectionsCar fontSize="small" />, rail: <DirectionsRailway fontSize="small" />,
  sea: <DirectionsBoat fontSize="small" />, air: <FlightTakeoff fontSize="small" />,
  express: <LocalShipping fontSize="small" />,
};

const SHIPMENT_STEPS = ['pending', 'picked', 'packed', 'shipped', 'in_transit', 'delivered'];
const getActiveStep = (status: ShipmentStatus) => Math.max(0, SHIPMENT_STEPS.indexOf(status));

const NewShipmentDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { salesOrders, addShipment } = useSalesStore();
  const [orderId, setOrderId] = useState('');
  const [form, setForm] = useState({
    transportMode: 'road' as TransportMode,
    carrier: '', trackingNo: '', originAddress: '', destinationAddress: '',
    estimatedPickupDate: '', estimatedDeliveryDate: '', driverName: '', vehicleNo: '', packageCount: '1', freight: '',
    notes: '',
  });
  const [msg, setMsg] = useState('');

  const selectedOrder = salesOrders.find(o => o.id === orderId);

  const handleOrderChange = (id: string) => {
    setOrderId(id);
    const o = salesOrders.find(x => x.id === id);
    if (o) {
      setForm(f => ({
        ...f,
        customerName: o.customerName,
        destinationAddress: o.deliveryAddress || f.destinationAddress,
        projectNo: o.projectNo || '',
        projectName: o.projectName || '',
      }));
    }
  };

  const handleSave = () => {
    if (!selectedOrder) { setMsg('请先选择销售订单'); return; }
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const seq = String(Date.now()).slice(-6);
    const items: ShipmentItem[] = selectedOrder.items.map((it, i) => ({
      id: `shi-${Date.now()}-${i}`,
      materialId: it.materialId,
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      orderQuantity: it.quantity,
      shipQuantity: it.quantity,
      unitPrice: it.unitPrice,
      amount: it.amount,
    }));
    const shipment: Shipment = {
      id: `ship-${Date.now()}`,
      shipmentNo: `SH${today.replace(/-/g, '')}${seq}`,
      salesOrderNo: selectedOrder.orderNo,
      projectNo: selectedOrder.projectNo,
      projectName: selectedOrder.projectName,
      customerName: selectedOrder.customerName,
      status: 'pending',
      items,
      transportMode: form.transportMode,
      carrier: form.carrier || '待定',
      trackingNo: form.trackingNo || undefined,
      estimatedPickupDate: form.estimatedPickupDate || today,
      estimatedDeliveryDate: form.estimatedDeliveryDate || today,
      originAddress: form.originAddress || '工厂仓库',
      destinationAddress: form.destinationAddress || selectedOrder.deliveryAddress || '客户地址',
      driverName: form.driverName || undefined,
      driverPhone: undefined,
      vehicleNo: form.vehicleNo || undefined,
      packageCount: Number(form.packageCount) || 1,
      freight: form.freight ? Number(form.freight) : undefined,
      notes: form.notes || undefined,
    };
    addShipment(shipment);
    onClose();
    setOrderId('');
    setMsg('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>新增发货单</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>选择销售订单可自动带出客户、项目与发货明细。</Alert>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField select fullWidth required size="small" label="关联销售订单"
              value={orderId} onChange={(e) => handleOrderChange(e.target.value)}>
              {salesOrders.map(o => (
                <MenuItem key={o.id} value={o.id}>{o.orderNo} - {o.customerName}（{formatCurrency(o.grandTotal)}）</MenuItem>
              ))}
            </TextField>
          </Grid>
          {selectedOrder && (
            <Grid item xs={12}>
              <Typography variant="caption" color="success.main">
                已带出：客户 {selectedOrder.customerName} ｜ 项目 {selectedOrder.projectName || '-'} ｜ {selectedOrder.items.length} 项物料
              </Typography>
            </Grid>
          )}
          <Grid item xs={6}>
            <TextField select fullWidth size="small" label="运输方式"
              value={form.transportMode} onChange={(e) => setForm({ ...form, transportMode: e.target.value as TransportMode })}>
              <MenuItem value="road">公路</MenuItem>
              <MenuItem value="rail">铁路</MenuItem>
              <MenuItem value="sea">海运</MenuItem>
              <MenuItem value="air">空运</MenuItem>
              <MenuItem value="express">快递</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="承运商"
              value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="预计提货" InputLabelProps={{ shrink: true }}
              value={form.estimatedPickupDate} onChange={(e) => setForm({ ...form, estimatedPickupDate: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="预计到货" InputLabelProps={{ shrink: true }}
              value={form.estimatedDeliveryDate} onChange={(e) => setForm({ ...form, estimatedDeliveryDate: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="目的地"
              value={form.destinationAddress} onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="件数" type="number"
              value={form.packageCount} onChange={(e) => setForm({ ...form, packageCount: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="运费" type="number"
              value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="车牌/运单"
              value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="备注" multiline rows={2}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Grid>
          {msg && <Grid item xs={12}><Typography variant="caption" color="error">{msg}</Typography></Grid>}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>生成发货单</Button>
      </DialogActions>
    </Dialog>
  );
};

const LogisticsList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const shipments = useSalesStore(s => s.shipments);
  const addShipment = useSalesStore(s => s.addShipment);

  const filtered = shipments.filter(s => {
    if (search && !s.shipmentNo.includes(search) && !s.salesOrderNo.includes(search) && !s.customerName.includes(search)) return false;
    return true;
  });

  // ── 列定义（驱动 DataTable）──
  const transportLabel = (m: TransportMode) =>
    (m === 'road' ? '公路' : m === 'rail' ? '铁路' : m === 'sea' ? '海运' : m === 'air' ? '空运' : '快递');
  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      id: 'shipmentNo',
      header: '发货单号',
      accessorFn: (s) => s.shipmentNo,
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" color="#3B82F6" fontWeight={500}>{row.original.shipmentNo}</Typography>
      ),
    },
    {
      id: 'salesOrderNo',
      header: '销售订单',
      accessorFn: (s) => s.salesOrderNo,
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace">{row.original.salesOrderNo}</Typography>
      ),
    },
    {
      id: 'customerName',
      header: '客户',
      accessorFn: (s) => s.customerName,
      cell: ({ row }) => <Typography variant="body2">{row.original.customerName}</Typography>,
    },
    {
      id: 'project',
      header: '项目',
      accessorFn: (s) => s.projectName,
      cell: ({ row }) => {
        const s = row.original;
        return s.projectName ? (
          <Box>
            <Typography variant="body2">{s.projectName}</Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">{s.projectNo}</Typography>
          </Box>
        ) : '-';
      },
    },
    {
      id: 'transportMode',
      header: '运输方式',
      accessorFn: (s) => transportLabel(s.transportMode),
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {TRANSPORT_ICONS[s.transportMode]}
            <Typography variant="body2">{transportLabel(s.transportMode)}</Typography>
          </Stack>
        );
      },
    },
    {
      id: 'carrier',
      header: '承运商',
      accessorFn: (s) => s.carrier,
      cell: ({ row }) => <Typography variant="body2">{row.original.carrier}</Typography>,
    },
    {
      id: 'trackingNo',
      header: '运单号',
      accessorFn: (s) => s.trackingNo,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Typography variant="body2" color={s.trackingNo ? '#3B82F6' : 'text.secondary'}>{s.trackingNo || '-'}</Typography>
        );
      },
    },
    {
      id: 'packageCount',
      header: '件数',
      accessorFn: (s) => s.packageCount,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}><Typography variant="body2">{row.original.packageCount}</Typography></Box>
      ),
    },
    {
      id: 'freight',
      header: '运费',
      accessorFn: (s) => s.freight,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2">{row.original.freight ? formatCurrency(row.original.freight) : '-'}</Typography>
        </Box>
      ),
    },
    {
      id: 'estimatedDeliveryDate',
      header: '预计到货',
      accessorFn: (s) => s.estimatedDeliveryDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.estimatedDeliveryDate}</Typography>,
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (s) => STATUS_LABELS[s.status],
      cell: ({ row }) => (
        <Chip label={STATUS_LABELS[row.original.status]} size="small"
          sx={{ bgcolor: STATUS_COLORS[row.original.status] + '15', color: STATUS_COLORS[row.original.status], fontWeight: 500 }} />
      ),
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="查看详情">
            <IconButton size="small" onClick={() => { setSelectedShipment(row.original); setDetailOpen(true); }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // ── 导入：把表头行映射回 store 字段 ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const toNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r: Record<string, string>, headers: string[]): Shipment => {
    const now = new Date().toISOString();
    const statusVal = pickField(r, headers, '状态', 'status') || 'pending';
    const modeVal = pickField(r, headers, '运输方式', 'transportMode');
    const modeMap: Record<string, TransportMode> = { 公路: 'road', 铁路: 'rail', 海运: 'sea', 空运: 'air', 快递: 'express' };
    const transportMode: TransportMode = (modeMap[modeVal] || 'road') as TransportMode;
    return {
      id: `ship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      shipmentNo: pickField(r, headers, '发货单号', 'shipmentNo') || `SH${now.slice(0, 10).replace(/-/g, '')}${String(Date.now()).slice(-6)}`,
      salesOrderNo: pickField(r, headers, '销售订单', 'salesOrderNo'),
      projectNo: pickField(r, headers, '项目编号', 'projectNo') || undefined,
      projectName: pickField(r, headers, '项目', 'projectName') || undefined,
      customerName: pickField(r, headers, '客户', 'customerName'),
      status: (Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : 'pending') as ShipmentStatus,
      items: [],
      transportMode,
      carrier: pickField(r, headers, '承运商', 'carrier') || '待定',
      trackingNo: pickField(r, headers, '运单号', 'trackingNo') || undefined,
      estimatedPickupDate: pickField(r, headers, '预计提货', 'estimatedPickupDate') || now.slice(0, 10),
      estimatedDeliveryDate: pickField(r, headers, '预计到货', 'estimatedDeliveryDate') || now.slice(0, 10),
      originAddress: pickField(r, headers, '起运地', 'originAddress') || '工厂仓库',
      destinationAddress: pickField(r, headers, '目的地', 'destinationAddress') || '客户地址',
      packageCount: toNum(pickField(r, headers, '件数', 'packageCount')) || 1,
      freight: toNum(pickField(r, headers, '运费', 'freight')) || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    } as unknown as Shipment;
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addShipment(mapImportRow(r, headers)));
  };

  return (
    <PageWrapper
      title="物流发货管理"
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={() => setNewOpen(true)}>新增发货单</Button>
      }
    >
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {[
          { label: '全部', count: shipments.length, color: '#6366F1' },
          { label: '运输中', count: shipments.filter(s => s.status === 'in_transit' || s.status === 'shipped').length, color: '#3B82F6' },
          { label: '已签收', count: shipments.filter(s => s.status === 'delivered').length, color: '#10B981' },
          { label: '待发货', count: shipments.filter(s => s.status === 'pending').length, color: '#F59E0B' },
        ].map(s => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, border: `1px solid ${s.color}20` }}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.count}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 搜索 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <TextField size="small" placeholder="搜索发货单号/销售订单号/客户" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <Search sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }} /> }}
          sx={{ width: 300 }} />
      </Paper>

      {/* 发货列表 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable<Shipment>
          data={filtered}
          columns={columns}
          enableExport
          enableImport
          columnConfigKey="sales-logistics-list"
          onImport={handleImport}
        />
      </Paper>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            发货详情 — {selectedShipment?.shipmentNo}
            <IconButton onClick={() => setDetailOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <Stack spacing={2}>
              <Box sx={{ mb: 2, mt: 1 }}>
                <Stepper activeStep={getActiveStep(selectedShipment.status)} alternativeLabel>
                  {['待发货', '已拣货', '已打包', '已出库', '运输中', '已签收'].map((label, idx) => (
                    <Step key={idx}><StepLabel>{label}</StepLabel></Step>
                  ))}
                </Stepper>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="subtitle2" gutterBottom>物流信息</Typography>
                    <Typography variant="body2">承运商：{selectedShipment.carrier}</Typography>
                    <Typography variant="body2">运单号：{selectedShipment.trackingNo || '-'}</Typography>
                    <Typography variant="body2">司机：{selectedShipment.driverName || '-'}</Typography>
                    <Typography variant="body2">车牌：{selectedShipment.vehicleNo || '-'}</Typography>
                    <Typography variant="body2">件数：{selectedShipment.packageCount} 件</Typography>
                    {selectedShipment.totalWeight && <Typography variant="body2">重量：{selectedShipment.totalWeight} 吨</Typography>}
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                    <Typography variant="subtitle2" gutterBottom>收发信息</Typography>
                    <Typography variant="body2">起运地：{selectedShipment.originAddress}</Typography>
                    <Typography variant="body2">目的地：{selectedShipment.destinationAddress}</Typography>
                    <Typography variant="body2">预计提货：{selectedShipment.estimatedPickupDate}</Typography>
                    {selectedShipment.actualPickupDate && <Typography variant="body2">实际提货：{selectedShipment.actualPickupDate}</Typography>}
                    {selectedShipment.actualDeliveryDate && <Typography variant="body2" color="#10B981">实际签收：{selectedShipment.actualDeliveryDate}</Typography>}
                  </Paper>
                </Grid>
              </Grid>
              {selectedShipment.freight && (
                <Alert severity="info">
                  运费：{formatCurrency(selectedShipment.freight)}
                  {selectedShipment.insurance && ` | 保险费：${formatCurrency(selectedShipment.insurance)}`}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <NewShipmentDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </PageWrapper>
  );
};

export default LogisticsList;
