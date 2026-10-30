import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Chip, Typography, Stack, Paper, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, LinearProgress, Alert, MenuItem,
} from '@mui/material';
import { Add, CheckCircle, AutoFixHigh } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, FlowTracker } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useProductionStore } from '@/stores/productionStore';
import { useWarehouseMasterStore, selectWarehousesByOrg } from '@/stores/warehouseMasterStore';
import { useOrgStore } from '@/stores/orgStore';
import type { FinishedGoodsInbound } from '@/types';
import { formatDate } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';
import { useTypedRelated } from '@/utils/relations/useTypedRelated';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';

const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  pending:    { label: '待入库', color: 'warning' },
  inspecting: { label: '检验中', color: 'info' },
  completed:  { label: '已完成', color: 'success' },
  partial:    { label: '部分入库', color: 'warning' },
};

const NewFGInboundDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addFinishedGoodsInbound } = useWarehouseStore();
  const { workOrders } = useProductionStore();
  const [form, setForm] = useState({
    workOrderNo: '', productCode: '', productName: '',
    specification: '', unit: '件', plannedQty: '', actualQty: '',
    batchNo: '', warehouseName: '成品仓库', operator: '', remarks: '',
  });
  const [woMsg, setWoMsg] = useState('');
  const warehouses = useWarehouseMasterStore(s => s.warehouses);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));
  const defaultWh = visibleWarehouses.find(w => w.type === 'finished') || visibleWarehouses[0];
  const [warehouseId, setWarehouseId] = useState(defaultWh?.id || 'wh-003');

  // 从工单号带出产品明细（减少手工录入）
  const handleLoadWO = () => {
    const wo = workOrders.find(w => w.orderNo === form.workOrderNo || w.id === form.workOrderNo);
    if (!wo) { setWoMsg('未找到该工单，请检查工单号'); return; }
    setWoMsg(`已带出工单 ${wo.orderNo}：${wo.productName} × ${wo.plannedQuantity}`);
    setForm(f => ({
      ...f,
      workOrderNo: wo.orderNo,
      productCode: wo.productCode,
      productName: wo.productName,
      plannedQty: String(wo.plannedQuantity),
      actualQty: String(wo.plannedQuantity),
      operator: wo.supervisor || f.operator,
    }));
  };

  const handleSave = (status: 'pending' | 'completed') => {
    if (!form.productCode || !form.productName) {
      setWoMsg('请填写成品编码与名称，或先用工单号带出');
      return;
    }
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const seq = String(Date.now()).slice(-6);
    addFinishedGoodsInbound({
      id: `fin-${Date.now()}`,
      inboundNo: `FIN${today.replace(/-/g, '')}${seq}`,
      workOrderId: form.workOrderNo,
      workOrderNo: form.workOrderNo,
      productId: '',
      productCode: form.productCode,
      productName: form.productName,
      specification: form.specification,
      unit: form.unit,
      plannedQty: Number(form.plannedQty) || 0,
      actualQty: Number(form.actualQty) || 0,
      qualifiedQty: Number(form.actualQty) || 0,
      rejectedQty: 0,
      batchNo: form.batchNo || `B${seq}`,
      warehouseId: warehouseId,
      warehouseName: visibleWarehouses.find(w => w.id === warehouseId)?.name || '成品仓库',
      status,
      operator: form.operator || '系统用户',
      inboundDate: today,
      remarks: form.remarks,
      createdAt: now, updatedAt: now,
      createdBy: '系统用户', updatedBy: '系统用户',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>新建成品入库单</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          输入工单号可自动带出产品名称、编码与计划数量，减少手工录入。
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={8}>
            <TextField fullWidth size="small" label="生产工单号（可带出产品）"
              placeholder="如 WO-MRP-xxxx 或 WO20240515001"
              value={form.workOrderNo} onChange={(e) => setForm({ ...form, workOrderNo: e.target.value })} />
          </Grid>
          <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="outlined" startIcon={<AutoFixHigh />} onClick={handleLoadWO}>带出产品</Button>
          </Grid>
          {woMsg && (
            <Grid item xs={12}>
              <Typography variant="caption" color={woMsg.includes('未') ? 'error' : 'success.main'}>{woMsg}</Typography>
            </Grid>
          )}
          <Grid item xs={6}>
            <TextField fullWidth required size="small" label="成品编码 *"
              value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth required size="small" label="成品名称 *"
              value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="规格型号"
              value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="计划数量" type="number"
              value={form.plannedQty} onChange={(e) => setForm({ ...form, plannedQty: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth required size="small" label="实际数量 *" type="number"
              value={form.actualQty} onChange={(e) => setForm({ ...form, actualQty: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" label="单位"
              value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="批次号"
              value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField select fullWidth size="small" label="入库仓库"
              value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {visibleWarehouses.map(w => (<MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="操作员"
              value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="备注" multiline rows={2}
              value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" onClick={() => handleSave('pending')}>暂存</Button>
        <Button variant="contained" onClick={() => handleSave('completed')}>保存</Button>
      </DialogActions>
    </Dialog>
  );
};

const FinishedGoodsInboundList: React.FC = () => {
  const navigate = useNavigate();
  const { finishedGoodsInbounds } = useWarehouseStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [newOpen, setNewOpen] = useState(false);
  useEnsureRelatedStores('finishedGoodsInbound');

  const columns: ColumnDef<FinishedGoodsInbound, unknown>[] = useMemo(() => [
    { accessorKey: 'inboundNo', header: '入库单号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 500, fontFamily: 'monospace' }}>
          {row.original.inboundNo}
        </Typography>
      ),
    },
    // V3.119.0：关联列已按真实单据类型叫「生产工单」（可点+带状态），
    // 本业务列只显示单号文本，改名「工单号」避免双表头。
    { accessorKey: 'workOrderNo', header: '工单号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
          {row.original.workOrderNo}
        </Typography>
      ),
    },
    { accessorKey: 'productCode', header: '成品编码',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Stack>
          <Chip label={row.original.productCode} size="small"
            sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontFamily: 'monospace', fontSize: '0.75rem', mb: 0.3 }} />
          <Typography variant="caption" color="text.secondary">{row.original.productName}</Typography>
        </Stack>
      ),
    },
    { accessorKey: 'specification', header: '规格',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.original.specification}
        </Typography>
      ),
    },
    { accessorKey: 'actualQty', header: '入库数量',
      meta: { searchable: true },
      cell: ({ row }) => {
        const r = row.original;
        const pct = r.plannedQty > 0 ? Math.round((r.actualQty / r.plannedQty) * 100) : 0;
        return (
          <Stack spacing={0.3}>
            <Typography variant="body2" fontWeight={500}>{r.actualQty} / {r.plannedQty} {r.unit}</Typography>
            <LinearProgress variant="determinate" value={pct}
              sx={{ height: 4, borderRadius: 2, bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': { bgcolor: pct >= 100 ? '#10B981' : '#3B82F6' } }} />
          </Stack>
        );
      },
    },
    { accessorKey: 'qualifiedQty', header: '合格/不合格',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Chip label={`合格 ${row.original.qualifiedQty}`} size="small" sx={{ bgcolor: '#ECFDF5', color: '#065F46', fontSize: '0.75rem' }} />
          {row.original.rejectedQty > 0 && (
            <Chip label={`不合格 ${row.original.rejectedQty}`} size="small" sx={{ bgcolor: '#FEF2F2', color: '#991B1B', fontSize: '0.75rem' }} />
          )}
        </Stack>
      ),
    },
    { accessorKey: 'batchNo', header: '批次号', cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.original.batchNo}</Typography>
      ), meta: { searchable: true } },
    { accessorKey: 'warehouseName', header: '仓库', meta: { searchable: true } },
    { accessorKey: 'status', header: '状态', meta: { searchable: true }, cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} />;
      },
    },
    { accessorKey: 'inboundDate', header: '入库日期', cell: ({ row }) => formatDate(row.original.inboundDate), meta: { searchable: true } },
  ], []);

  const filterFields = [
    { name: 'inboundNo', label: '入库单号', type: 'text' as const },
    { name: 'productCode', label: '成品编码', type: 'text' as const },
    { name: 'workOrderNo', label: '工单号', type: 'text' as const },
    {
      name: 'status', label: '状态', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待入库' },
        { value: 'inspecting', label: '检验中' },
        { value: 'completed', label: '已完成' },
        { value: 'partial', label: '部分入库' },
      ],
    },
  ];

  // V3.119.0：关联单据改用 useTypedRelated，按真实单据类型分列、单号+状态、点单号直达。
  // 原 buildRelatedColumns() 只产出「来源单据/后续单据」两列且被 hiddenColumns 默认隐藏。
  const rel = useTypedRelated('finishedGoodsInbound', finishedGoodsInbounds);
  const allColumns = useMemo(
    () => [...columns, ...(rel.columns as ColumnDef<FinishedGoodsInbound, unknown>[])],
    [columns, rel.columns]
  );

  const filteredData = useMemo(() => {
    // 通用列检索：覆盖全部声明了 meta.searchable 的列（含上游/下游关联单号），并按字段权限门控
    return applyColumnFilters(rel.data, allColumns, filterData, { module: 'warehouse' });
  }, [filterData, finishedGoodsInbounds, columns]);

  return (
    <PageWrapper
      title="成品入库单"
      actions={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FlowTracker module="inbound" currentStatus="ib_completed" /><ActionBar primary={{ label: '新建入库单', onClick: () => setNewOpen(true) }} /></Box>}
    >
      <FilterBar fields={filterFields} columns={allColumns} module="warehouse" onSearch={setFilterData} listKey="finished-goods-inbound-list" />
      <DataTable
        data={filteredData}
        columns={allColumns}
        enableRowSelection
        enablePagination
        enableExport
        hiddenColumns={rel.hiddenColumns}
        columnConfigKey="finished-goods-inbound-list"
        codeColumnId="inboundNo"
        onView={(r) => navigate(`/warehouse/fg-inbound/${r.id}`)}
        onRowClick={(r) => navigate(`/warehouse/fg-inbound/${r.id}`)}
      />
      <NewFGInboundDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </PageWrapper>
  );
};

export default FinishedGoodsInboundList;
