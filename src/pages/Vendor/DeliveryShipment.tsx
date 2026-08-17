import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, LinearProgress, Tooltip,
  Stepper, Step, StepLabel,
  FormControl, InputLabel, Select, MenuItem, IconButton,
} from '@mui/material';
import { LocalShipping, LocationOn, CheckCircle, Schedule, Add, Delete } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, FlowTracker } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import type { DeliveryShipment } from '@/types';
import { formatDate } from '@/utils/format';
import { getVendorPortalIdentity } from '@/utils/vendorPortalIdentity';

// ── 通用工具 ─────────────────────────────────────────────
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const dateCode = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};
const rand3 = () => String(Math.floor(Math.random() * 900) + 100);
const identity = getVendorPortalIdentity();
const DEFAULT_VENDOR_ID = identity?.vendorId || 'ven-001';
const DEFAULT_VENDOR_NAME = identity?.vendorName || '上海宝钢钢铁贸易有限公司';

const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info'; step: number }> = {
  preparing:  { label: '备货中', color: 'warning', step: 0 },
  shipped:    { label: '已发货', color: 'info', step: 1 },
  in_transit: { label: '运输中', color: 'info', step: 2 },
  arrived:    { label: '已到达', color: 'success', step: 3 },
  signed:     { label: '已签收', color: 'success', step: 4 },
};

const trackSteps = ['备货', '发货', '运输中', '到达目的地', '签收完成'];

/** 物流详情弹窗 */
const ShipmentDetailDialog: React.FC<{
  open: boolean;
  shipment: DeliveryShipment | null;
  onClose: () => void;
}> = ({ open, shipment, onClose }) => {
  const { updateDeliveryShipment } = useFlowStore();
  const { inboundOrders, addInboundOrder } = useWarehouseStore();
  if (!shipment) return null;
  const currentStep = statusMap[shipment.status]?.step ?? 0;

  // 仓库入库联动：按入库单 id 或 采购订单号匹配
  const inbound = inboundOrders.find(
    o => o.id === shipment.inboundOrderId || (o.sourceNo && o.sourceNo === shipment.purchaseOrderNo)
  );

  // 构建物流轨迹事件
  const events: { label: string; time: string; done: boolean; color: string }[] = [
    { label: '已发货揽收', time: shipment.shipDate, done: true, color: '#3B82F6' },
    {
      label: '运输途中',
      time: shipment.status === 'in_transit' ? '运输中' : (shipment.estimatedArrival || ''),
      done: ['in_transit', 'arrived', 'signed'].includes(shipment.status),
      color: '#6366F1',
    },
    {
      label: '到达目的地',
      time: shipment.actualArrival || shipment.estimatedArrival,
      done: ['arrived', 'signed'].includes(shipment.status),
      color: '#F59E0B',
    },
    {
      label: '客户签收',
      time: shipment.actualArrival || '',
      done: shipment.status === 'signed',
      color: '#10B981',
    },
  ];
  if (inbound) {
    events.push({
      label: `仓库已收货（${inbound.inboundNo}）`,
      time: inbound.inboundDate,
      done: inbound.status === 'completed' || inbound.status === 'processing',
      color: '#10B981',
    });
  }

  const handleSign = () => {
    updateDeliveryShipment(shipment!.id, { status: 'signed', actualArrival: todayStr() });
  };

  const handleWarehouseReceive = () => {
    const inboundId = `in-${Date.now()}`;
    const inboundNo = `IN${dateCode()}${rand3()}`;
    addInboundOrder({
      id: inboundId,
      inboundNo,
      type: 'purchase',
      sourceNo: shipment!.purchaseOrderNo,
      vendorId: shipment!.vendorId,
      vendorName: shipment!.vendorName,
      status: 'completed',
      warehouseId: 'wh-001',
      warehouseName: shipment!.receivingWarehouse,
      orgId: 'org-001',
      operator: '仓储管理员',
      inboundDate: todayStr(),
      items: shipment!.items.map(it => ({
        id: `ibi-${it.id}`,
        materialId: '',
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        expectedQuantity: it.shippedQty,
        actualQuantity: it.shippedQty,
        qualityStatus: 'qualified',
      })),
      remarks: '供应商门户发货自动入库',
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: shipment!.vendorId,
      updatedBy: shipment!.vendorId,
    } as any);
    updateDeliveryShipment(shipment!.id, { inboundOrderId: inboundId, status: 'signed', actualArrival: todayStr() });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        物流跟踪 — {shipment.shipmentNo}
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">采购订单</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>{shipment.purchaseOrderNo}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">供应商</Typography>
            <Typography variant="body2" fontWeight={500}>{shipment.vendorName}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">物流公司</Typography>
            <Typography variant="body2" fontWeight={500}>{shipment.logisticsCompany}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">快递/运单号</Typography>
            <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', color: '#3B82F6' }}>{shipment.trackingNo}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">发货日期</Typography>
            <Typography variant="body2" fontWeight={500}>{formatDate(shipment.shipDate)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">预计到达</Typography>
            <Typography variant="body2" fontWeight={500}>{formatDate(shipment.estimatedArrival)}</Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* 物流进度 */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>物流进度</Typography>
        <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 3 }}>
          {trackSteps.map((label, i) => (
            <Step key={label} completed={i <= currentStep}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* 物流轨迹（实时事件） */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>物流轨迹</Typography>
        <Box sx={{ pl: 0.5 }}>
          {events.map((ev, idx) => (
            <Stack key={idx} direction="row" spacing={1.5} sx={{ position: 'relative', pb: idx < events.length - 1 ? 2 : 0 }}>
              {idx < events.length - 1 && (
                <Box sx={{ position: 'absolute', left: 7, top: 16, bottom: 0, width: 2, bgcolor: '#E2E8F0' }} />
              )}
              <Box
                sx={{
                  width: 16, height: 16, borderRadius: '50%', mt: 0.5, flexShrink: 0,
                  bgcolor: ev.done ? (ev.color || '#3B82F6') : '#CBD5E1',
                  boxShadow: ev.done ? `0 0 0 3px ${ev.color || '#3B82F6'}22` : 'none',
                }}
              />
              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ color: ev.done ? '#1E293B' : '#94A3B8' }}>
                  {ev.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ev.time ? formatDate(ev.time) : (ev.done ? '待更新' : '未开始')}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>

        {/* 仓库入库信息 */}
        {inbound ? (
          <Alert severity="success" icon={<CheckCircle fontSize="inherit" />} sx={{ mt: 1, mb: 2 }}>
            仓库已收货：入库单 {inbound.inboundNo}（{inbound.warehouseName}），入库日期 {formatDate(inbound.inboundDate)}，状态 {inbound.status === 'completed' ? '已完成' : '处理中'}。
          </Alert>
        ) : (
          shipment.status === 'signed' && (
            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
              尚未收到仓库入库回执，可点击下方「模拟仓库入库」以演示仓储备货过账。
            </Alert>
          )
        )}

        <Divider sx={{ my: 2 }} />

        {/* 货物明细 */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>货物明细</Typography>
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(226,232,240,.8)', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>规格</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">发货数量</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">包装数量</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shipment.items.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell><Chip label={item.materialCode} size="small"
                    sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.75rem' }} /></TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{item.materialName}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>{item.specification}</TableCell>
                  <TableCell align="right">{item.shippedQty} {item.unit}</TableCell>
                  <TableCell align="right">{item.packagingQty} 包</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn sx={{ fontSize: 16, color: '#3B82F6' }} />
            收货地址：{shipment.receivingAddress}（{shipment.receivingWarehouse}）
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>关闭</Button>
        {shipment.status === 'arrived' && (
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleSign}>确认签收</Button>
        )}
        {shipment.status === 'signed' && !inbound && (
          <Button variant="outlined" color="info" startIcon={<CheckCircle />} onClick={handleWarehouseReceive}>模拟仓库入库</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/** 新建发货单弹窗 */
const NewShipmentDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addDeliveryShipment } = useFlowStore();
  const [form, setForm] = useState({
    purchaseOrderNo: '', logisticsCompany: '', trackingNo: '',
    shipDate: todayStr(), estimatedArrival: '', remarks: '',
  });
  const [items, setItems] = useState<{ materialCode: string; materialName: string; specification: string; unit: string; shippedQty: string; packagingQty: string }[]>([
    { materialCode: '', materialName: '', specification: '', unit: '', shippedQty: '0', packagingQty: '0' },
  ]);

  const updateItem = (idx: number, field: string, value: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const addRow = () => setItems(prev => [...prev, { materialCode: '', materialName: '', specification: '', unit: '', shippedQty: '0', packagingQty: '0' }]);
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!form.purchaseOrderNo || !form.logisticsCompany || !form.trackingNo) {
      alert('请填写关联采购订单号、物流公司与运单号');
      return;
    }
    const validItems = items.filter(it => it.materialCode);
    if (validItems.length === 0) { alert('请至少填写一个物料行'); return; }
    const shipment: DeliveryShipment = {
      id: `shp-${Date.now()}`,
      shipmentNo: `SHP${dateCode()}${rand3()}`,
      purchaseOrderId: '',
      purchaseOrderNo: form.purchaseOrderNo,
      vendorId: DEFAULT_VENDOR_ID,
      vendorName: DEFAULT_VENDOR_NAME,
      logisticsCompany: form.logisticsCompany,
      trackingNo: form.trackingNo,
      shipper: DEFAULT_VENDOR_NAME,
      shipDate: form.shipDate,
      estimatedArrival: form.estimatedArrival,
      status: 'shipped',
      items: validItems.map((it, idx) => ({
        id: `shi-${idx}-${Date.now()}`,
        materialCode: it.materialCode,
        materialName: it.materialName,
        specification: it.specification,
        unit: it.unit,
        shippedQty: Number(it.shippedQty) || 0,
        packagingQty: Number(it.packagingQty) || 0,
      })),
      receivingWarehouse: '主仓库-A区',
      receivingAddress: '上海市浦东新区工业园区88号',
      remarks: form.remarks,
      createdAt: nowStr(),
      updatedAt: nowStr(),
      createdBy: DEFAULT_VENDOR_ID,
      updatedBy: DEFAULT_VENDOR_ID,
    };
    // B7-T1：发货通知单回写主 ERP —— 生成 ASN 在途预告单（type='asn', status='in_transit'）
    // 幂等守卫：同一发货单号已建预告单则不重复创建（防止 E2E / 重复点击重复建单）
    const whState = useWarehouseStore.getState();
    const existingAsn = whState.inboundOrders.find(
      (o) => o.type === 'asn' && o.asnShipmentNo === shipment.shipmentNo
    );
    if (!existingAsn) {
      whState.addInboundOrder({
        id: `asn-${shipment.shipmentNo}`,
        inboundNo: `ASN${shipment.shipmentNo.replace(/^SHP/, '')}`,
        type: 'asn',
        sourceNo: shipment.purchaseOrderNo,
        asnShipmentNo: shipment.shipmentNo,
        vendorId: shipment.vendorId,
        vendorName: shipment.vendorName,
        status: 'in_transit',
        warehouseId: 'wh-001',
        warehouseName: shipment.receivingWarehouse,
        orgId: 'org-001',
        operator: shipment.vendorName,
        inboundDate: shipment.shipDate,
        items: shipment.items.map((it) => ({
          id: `asi-${it.id}`,
          materialId: '',
          materialCode: it.materialCode,
          materialName: it.materialName,
          specification: it.specification,
          unit: it.unit,
          expectedQuantity: it.shippedQty,
          actualQuantity: 0,
          qualityStatus: 'qualified',
        })),
        remarks: '供应商门户发货通知自动生成 ASN 在途预告',
        createdAt: nowStr(),
        updatedAt: nowStr(),
        createdBy: shipment.vendorId,
        updatedBy: shipment.vendorId,
      } as any);
    }
    addDeliveryShipment(shipment);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>新建发货通知</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}><TextField fullWidth size="small" label="关联采购订单号 *" value={form.purchaseOrderNo} onChange={(e) => setForm({ ...form, purchaseOrderNo: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="物流公司 *" value={form.logisticsCompany} onChange={(e) => setForm({ ...form, logisticsCompany: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="运单号 *" value={form.trackingNo} onChange={(e) => setForm({ ...form, trackingNo: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="发货日期 *" type="date" InputLabelProps={{ shrink: true }} value={form.shipDate} onChange={(e) => setForm({ ...form, shipDate: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="预计到达日期" type="date" InputLabelProps={{ shrink: true }} value={form.estimatedArrival} onChange={(e) => setForm({ ...form, estimatedArrival: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="备注" multiline rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Grid>
        </Grid>

        <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2, mb: 1 }}>发货物料明细</Typography>
        {items.map((it, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 2 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={3}><TextField fullWidth size="small" label="物料编码 *" value={it.materialCode} onChange={(e) => updateItem(idx, 'materialCode', e.target.value)} /></Grid>
              <Grid item xs={3}><TextField fullWidth size="small" label="物料名称" value={it.materialName} onChange={(e) => updateItem(idx, 'materialName', e.target.value)} /></Grid>
              <Grid item xs={2}><TextField fullWidth size="small" label="规格" value={it.specification} onChange={(e) => updateItem(idx, 'specification', e.target.value)} /></Grid>
              <Grid item xs={1.5}><TextField fullWidth size="small" label="单位" value={it.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} /></Grid>
              <Grid item xs={1.5}><TextField fullWidth size="small" label="数量" type="number" value={it.shippedQty} onChange={(e) => updateItem(idx, 'shippedQty', e.target.value)} /></Grid>
              <Grid item xs={1.5}><TextField fullWidth size="small" label="箱数" type="number" value={it.packagingQty} onChange={(e) => updateItem(idx, 'packagingQty', e.target.value)} /></Grid>
              <Grid item xs={1}>
                <IconButton size="small" color="error" onClick={() => removeRow(idx)} disabled={items.length === 1}>
                  <Delete fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          </Paper>
        ))}
        <Button size="small" startIcon={<Add />} onClick={addRow}>添加物料行</Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" startIcon={<LocalShipping />} onClick={handleSubmit} data-testid="submit-shipment-btn">提交发货通知</Button>
      </DialogActions>
    </Dialog>
  );
};

const DeliveryShipmentList: React.FC = () => {
  const { deliveryShipments } = useFlowStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = deliveryShipments.find(s => s.id === selectedId) || null;
  const [newOpen, setNewOpen] = useState(false);

  const columns: ColumnDef<DeliveryShipment, unknown>[] = useMemo(() => [
    { accessorKey: 'shipmentNo', header: '发货单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>
          {row.original.shipmentNo}
        </Typography>
      ),
    },
    { accessorKey: 'purchaseOrderNo', header: '采购订单',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
          {row.original.purchaseOrderNo}
        </Typography>
      ),
    },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'logisticsCompany', header: '物流公司' },
    { accessorKey: 'trackingNo', header: '运单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#10B981' }}>
          {row.original.trackingNo}
        </Typography>
      ),
    },
    { accessorKey: 'items', header: '货物',
      cell: ({ row }) => (
        <Stack spacing={0.3}>
          {row.original.items.slice(0, 1).map(item => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip label={item.materialCode} size="small"
                sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem' }} />
              <Typography variant="caption">{item.shippedQty} {item.unit}</Typography>
            </Box>
          ))}
        </Stack>
      ),
    },
    { accessorKey: 'shipDate', header: '发货日期', cell: ({ row }) => formatDate(row.original.shipDate) },
    { accessorKey: 'estimatedArrival', header: '预计到达', cell: ({ row }) => formatDate(row.original.estimatedArrival) },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} icon={s?.step >= 4 ? <CheckCircle sx={{ fontSize: '14px !important' }} /> : <Schedule sx={{ fontSize: '14px !important' }} />} />;
      },
    },
  ], []);

  const filterFields = [
    { name: 'shipmentNo', label: '发货单号', type: 'text' as const },
    { name: 'purchaseOrderNo', label: '采购订单号', type: 'text' as const },
    { name: 'vendorName', label: '供应商', type: 'text' as const },
    {
      name: 'status', label: '状态', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'preparing', label: '备货中' },
        { value: 'shipped', label: '已发货' },
        { value: 'in_transit', label: '运输中' },
        { value: 'arrived', label: '已到达' },
        { value: 'signed', label: '已签收' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...deliveryShipments];
    if (filterData.shipmentNo) data = data.filter(d => d.shipmentNo.includes(filterData.shipmentNo as string));
    if (filterData.purchaseOrderNo) data = data.filter(d => d.purchaseOrderNo.includes(filterData.purchaseOrderNo as string));
    if (filterData.vendorName) data = data.filter(d => d.vendorName.includes(filterData.vendorName as string));
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    return data;
  }, [filterData]);

  return (
    <PageWrapper
      title="发货物流管理"
      actions={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FlowTracker module="vendor-order" currentStatus="vo_shipped" /><ActionBar primary={{ label: '新建发货通知', onClick: () => setNewOpen(true) }} /></Box>}
    >
      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        onView={(row) => setSelectedId(row.id)}
        onEdit={(row) => setSelectedId(row.id)}
      />
      <ShipmentDetailDialog open={Boolean(selected)} shipment={selected} onClose={() => setSelectedId(null)} />
      <NewShipmentDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </PageWrapper>
  );
};

export default DeliveryShipmentList;
