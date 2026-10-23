import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ColumnDef } from '@tanstack/react-table';
import { useSubcontractStore } from '@/stores/subcontractStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import { SubcontractOrder, SubcontractType, SubcontractStatus } from '@/types/production';
import { applyColumnFilters } from '@/utils/listSearch';
import { notifyError } from '@/utils/notify';
import { FilterBar, DetailSection } from '@/components/common';

const STATUS_LABEL: Record<SubcontractStatus, string> = {
  draft: '草稿', issued: '已发料', received: '已收货', returned: '已回收', closed: '已关闭',
};

export default function Subcontract() {
  const { orders, addOrder, issueMaterials, receiveSubcontract, returnMaterials, closeOrder } = useSubcontractStore();
  const { vendors } = useVendorStore();
  const { materials } = useMaterialStore();
  const [open, setOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<SubcontractOrder | null>(null);
  const [form, setForm] = useState({
    type: 'process' as SubcontractType,
    materialId: 'mat-001',
    vendorId: 'ven-001', qty: 10, planDate: '2026-07-20', processFee: 100,
    issueMaterialId: 'mat-002', issueQtyPerUnit: 20,
  });

  const rows = useMemo(() => orders, [orders]);
  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.name ?? id;
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 列表检索派生用列定义（仅驱动 FilterBar 检索项；表格本身为既有裸 Table，保持原样）
  const columns: ColumnDef<SubcontractOrder, unknown>[] = [
    { accessorKey: 'orderNo', header: '委外单号', meta: { searchable: true } },
    {
      accessorKey: 'type', header: '类型',
      meta: {
        searchable: true, filterType: 'select',
        filterOptions: (['process', 'whole'] as SubcontractType[]).map((k) => ({ value: k, label: k === 'process' ? '工序委外' : '整体委外' })),
      },
    },
    { accessorKey: 'materialCode', header: '物料编码', meta: { searchable: true } },
    { accessorKey: 'materialName', header: '物料名称', meta: { searchable: true } },
    { accessorKey: 'vendorName', header: '供应商', meta: { searchable: true } },
    {
      accessorKey: 'status', header: '状态',
      meta: {
        searchable: true, filterType: 'select',
        filterOptions: (Object.keys(STATUS_LABEL) as SubcontractStatus[]).map((k) => ({ value: k, label: STATUS_LABEL[k] })),
      },
    },
  ];
  const filteredRows = useMemo(
    () => applyColumnFilters(rows, columns, filterData, { module: 'production' }),
    [rows, columns, filterData]
  );

  const handleAdd = () => {
    // 与后端 REQUIRED_CORE_FIELDS（subcontracts: vendorId + orderDate）对齐：vendorId（委外方）必填
    // （orderDate 该表单未收集，由后端/模板默认提供，按规则不拦截）
    if (!form.vendorId) {
      notifyError('请填写「委外方」后再提交');
      return;
    }
    const m = materials.find((x) => x.id === form.materialId);
    const o: SubcontractOrder = {
      id: `sub-${Date.now()}`,
      orderNo: `SUB-2026-${Date.now()}`,
      type: form.type,
      materialId: form.materialId,
      materialCode: m?.code || form.materialId,
      materialName: m?.name || form.materialId,
      vendorId: form.vendorId,
      vendorName: vendorName(form.vendorId),
      qty: form.qty,
      issueItems: [],
      status: 'draft',
      planDate: form.planDate,
      processFee: form.processFee,
      receivedQty: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    };
    addOrder(o);
    setOpen(false);
  };

  const handleIssue = (o: SubcontractOrder) => {
    const im = materials.find((x) => x.id === form.issueMaterialId) || materials.find((x) => x.id === 'mat-002');
    issueMaterials(o.id, [
      {
        materialId: im?.id || 'mat-002',
        materialCode: im?.code || 'STEEL-002',
        materialName: im?.name || 'Q235 钢板',
        unit: im?.unit || 'kg',
        qty: o.qty * (form.issueQtyPerUnit || 20),
      },
    ]);
  };

  return (
    <Box sx={{ p: 2 }} data-testid="subcontract">
      <Typography variant="h5" gutterBottom>委外加工</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        支持工序委外 / 整体委外。<strong>发料</strong>自动生成委外出库单并真实扣减原材料库存（借 1408 委托加工物资 / 贷 1403 原材料）；
        <strong>收货</strong>自动生成委外入库单增加成品库存，并按「发出材料成本 + 加工费」计价、计提加工费应付暂估。
      </Alert>
      <Button data-testid="sub-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增委外单
      </Button>
      <FilterBar columns={columns} module="production" onSearch={setFilterData} listKey="subcontract-list" />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>委外单号</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>物料</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>数量</TableCell>
              <TableCell>已收 / 应收</TableCell>
              <TableCell>加工费单价</TableCell>
              <TableCell>发料明细</TableCell>
              <TableCell>关联单据</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((o) => (
              <TableRow key={o.id} data-testid="sub-row">
                <TableCell>{o.orderNo}</TableCell>
                <TableCell>{o.type === 'process' ? '工序委外' : '整体委外'}</TableCell>
                <TableCell>{o.materialName}</TableCell>
                <TableCell>{o.vendorName}</TableCell>
                <TableCell>{o.qty}</TableCell>
                <TableCell data-testid="sub-received">{o.receivedQty || 0} / {o.qty}</TableCell>
                <TableCell>{o.processFee ? `¥${o.processFee}` : '—'}</TableCell>
                <TableCell>{o.issueItems.map((i) => `${i.materialName}×${i.qty}${i.unit}`).join('；') || '—'}</TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {o.issueOutboundNo ? <div data-testid="sub-ob-no">出：{o.issueOutboundNo}</div> : null}
                  {(o.receiptInboundNos || []).map((n) => <div key={n} data-testid="sub-ib-no">入：{n}</div>)}
                  {!o.issueOutboundNo && !(o.receiptInboundNos || []).length ? '—' : null}
                </TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[o.status]} color={o.status === 'closed' ? 'default' : o.status === 'received' ? 'success' : 'primary'} variant={o.status === 'draft' ? 'outlined' : 'filled'} /></TableCell>
                <TableCell>
                  <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setViewOrder(o)} data-testid="sub-view">查看</Button>
                  {o.status === 'draft' && (
                    <Button size="small" data-testid="sub-issue" onClick={() => handleIssue(o)}>发料</Button>
                  )}
                  {o.status === 'issued' && (
                    <Button size="small" color="success" data-testid="sub-receive" onClick={() => receiveSubcontract(o.id)}>收货</Button>
                  )}
                  {o.status === 'issued' && (
                    <Button size="small" data-testid="sub-return" onClick={() => returnMaterials(o.id)}>回收</Button>
                  )}
                  {(o.status === 'returned' || o.status === 'issued' || o.status === 'received') && (
                    <Button size="small" color="secondary" data-testid="sub-close" onClick={() => closeOrder(o.id)}>关闭</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增委外单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="委外类型" value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as SubcontractType })}>
            <MenuItem value="process">工序委外</MenuItem>
            <MenuItem value="whole">整体委外</MenuItem>
          </TextField>
          <TextField fullWidth margin="dense" select label="委外成品物料" value={form.materialId}
            data-testid="sub-material"
            helperText="须选择物料主数据中的真实物料，收货入库才能正确滚动成本"
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} · {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" select label="发料物料（组件）" value={form.issueMaterialId}
            data-testid="sub-issue-material"
            onChange={(e) => setForm({ ...form, issueMaterialId: e.target.value })}>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} · {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="单件耗用组件数量" type="number" value={form.issueQtyPerUnit}
            data-testid="sub-issue-qty"
            onChange={(e) => setForm({ ...form, issueQtyPerUnit: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" select label="供应商" required value={form.vendorId}
            onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
            {vendors.map((v) => (
              <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="委外数量" type="number" value={form.qty}
            data-testid="sub-qty"
            onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="单件加工费（未税）" type="number" value={form.processFee}
            data-testid="sub-fee"
            helperText="收货时按「发出材料成本 + 加工费」计入成品成本，并计提加工费应付暂估"
            onChange={(e) => setForm({ ...form, processFee: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="计划日期" type="date" value={form.planDate}
            onChange={(e) => setForm({ ...form, planDate: e.target.value })} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="sub-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 委外单详情：表头信息区 + 发料明细表 + 收货单号（对齐采购订单详情风格） */}
      <Dialog open={!!viewOrder} onClose={() => setViewOrder(null)} maxWidth="md" fullWidth>
        <DialogTitle>委外单详情 · {viewOrder?.orderNo}</DialogTitle>
        <DialogContent>
          {viewOrder && (
            <>
              <DetailSection
                title="基本信息"
                fields={[
                  { label: '委外单号', value: viewOrder.orderNo },
                  { label: '委外类型', value: viewOrder.type === 'process' ? '工序委外' : '整体委外' },
                  { label: '委外物料', value: `${viewOrder.materialCode} · ${viewOrder.materialName}` },
                  { label: '委外方', value: viewOrder.vendorName },
                  { label: '委外数量', value: viewOrder.qty },
                  { label: '已收 / 应收', value: `${viewOrder.receivedQty || 0} / ${viewOrder.qty}` },
                  { label: '加工费单价', value: viewOrder.processFee ? `¥${viewOrder.processFee}` : '—' },
                  { label: '计划日期', value: viewOrder.planDate },
                  { label: '状态', value: STATUS_LABEL[viewOrder.status] },
                  { label: '创建时间', value: viewOrder.createdAt?.slice(0, 10) },
                ]}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>发料明细</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>物料编码</TableCell>
                      <TableCell>物料名称</TableCell>
                      <TableCell>单位</TableCell>
                      <TableCell align="right">发料数量</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewOrder.issueItems || []).map((it, i) => (
                      <TableRow key={it.materialId || i}>
                        <TableCell>{it.materialCode}</TableCell>
                        <TableCell>{it.materialName}</TableCell>
                        <TableCell>{it.unit}</TableCell>
                        <TableCell align="right">{it.qty}</TableCell>
                      </TableRow>
                    ))}
                    {(!viewOrder.issueItems || viewOrder.issueItems.length === 0) && (
                      <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">尚未发料</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>关联单据</Typography>
              <Stack spacing={0.5}>
                {viewOrder.issueOutboundNo ? <Typography variant="body2">委外出库单：{viewOrder.issueOutboundNo}</Typography> : null}
                {(viewOrder.receiptInboundNos || []).map((n) => (
                  <Typography key={n} variant="body2">委外入库单：{n}</Typography>
                ))}
                {!viewOrder.issueOutboundNo && !(viewOrder.receiptInboundNos || []).length ? (
                  <Typography variant="body2" color="text.secondary">暂无关联出入库单</Typography>
                ) : null}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOrder(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
