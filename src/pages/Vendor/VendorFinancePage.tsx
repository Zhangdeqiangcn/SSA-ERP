/**
 * 供应商门户 —— 财务管理模块（对账单 + 开票申请 + 开票）
 * 路由：/vendor-portal/finance/statements  /vendor-portal/finance/invoices
 *
 * F5 对账单→开票全流程：
 *  1. 供应商勾选「已发货/已签收」订单（或空白新建）发起对账单，行项可改金额/数量/税率；
 *  2. 提交后自动流转至采购/财务审批（演示用「模拟审批通过」按钮落地状态机）；
 *  3. 审批通过对账单 → 列入「开票申请」待发起列表；
 *  4. 供应商勾选后「发起」或「定时发起」开票申请；
 *  5. 客户同意（演示用「模拟客户同意」）→ 触发开票，按发票版面排版预览；
 *  6. 供应商确认 → 开电子票/打印纸质发票，并登记至财务发票台账、回写对账单行已开票。
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Chip, Typography, Stack, Button, Paper, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, Alert, FormControl, InputLabel,
  Select, MenuItem, Tabs, Tab, Snackbar, InputAdornment,
  Checkbox, FormControlLabel, List, ListItem, ListItemText, IconButton, Tooltip,
} from '@mui/material';
import {
  Add, AccountBalance, Receipt, CheckCircle, Send, Schedule, Print,
  VerifiedUser, PictureAsPdf, Visibility, Delete, FactCheck,
} from '@mui/icons-material';
import DemoBanner from '@/components/common/DemoBanner';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, FilterBar } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { useFinanceStore } from '@/stores/financeStore';
import type { VendorStatement, VendorInvoiceRequest, DeliveryShipment, Invoice } from '@/types';
import { formatDate, formatCurrency } from '@/utils/format';
import { getVendorPortalIdentity } from '@/utils/vendorPortalIdentity';

// ── 常量与工具 ─────────────────────────────────────────────
// B5-T5 统一身份源：门户登录会话 → 主数据供应商，消除硬编码 ven-001
const identity = getVendorPortalIdentity();
const DEFAULT_VENDOR_ID = identity?.vendorId || 'ven-001';
const DEFAULT_VENDOR_NAME = identity?.vendorName || '上海宝钢钢铁贸易有限公司';
const VENDOR_TAX_NO = '91310115SHBAOGANG88';
const BUYER_NAME = 'SSA制造有限公司';
const BUYER_TAX_ID = '91310115XXXXXXXXXX';
const BUYER_ADDRESS = '上海市浦东新区工业园区88号';
const BUYER_BANK = '中国工商银行浦东新区支行';
const BUYER_BANK_ACCOUNT = '6222031234567890001';

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const genId = (prefix: string) => `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── 状态映射 ──────────────────────────────────────────────
const statementStatusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  draft:      { label: '草稿', color: 'default' },
  submitted:  { label: '待审批', color: 'warning' },
  reviewing:  { label: '审批中', color: 'info' },
  sent:       { label: '已发送', color: 'info' },
  confirmed:  { label: '已确认/已审批', color: 'success' },
  disputed:   { label: '有争议', color: 'error' },
  closed:     { label: '已结清', color: 'success' },
};

const invoiceStatusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  draft:     { label: '草稿', color: 'default' },
  pending:   { label: '待发起', color: 'warning' },
  submitted: { label: '待客户同意', color: 'info' },
  approved:  { label: '客户已同意', color: 'success' },
  issued:    { label: '已开票', color: 'success' },
  received:  { label: '已收票', color: 'success' },
  verified:  { label: '已认证', color: 'success' },
  rejected:  { label: '已退回', color: 'error' },
};

const invoiceTypeLabel: Record<string, string> = {
  vat_special: '增值税专用发票', vat_normal: '增值税普通发票', electronic: '电子发票', receipt: '收据',
};

// ── 可编辑行（发起对账单时）──────────────────────────────
interface EditRow {
  id: string;
  _shipId?: string;
  purchaseOrderNo: string;
  inboundNo: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
}
const lineAmount = (r: EditRow) => r.qty * r.unitPrice;
const lineTax = (r: EditRow) => lineAmount(r) * r.taxRate / 100;
const lineTotal = (r: EditRow) => lineAmount(r) + lineTax(r);

// ── 对账单面板 ─────────────────────────────────────────────
function StatementPanel() {
  const {
    vendorStatements, deliveryShipments, addVendorStatement, updateVendorStatement,
  } = useFlowStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [detailOpen, setDetailOpen] = useState<VendorStatement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [invoiceFrom, setInvoiceFrom] = useState<VendorStatement | null>(null);

  // 候选「已发货/已签收」订单
  const candidateShips = useMemo(
    () => deliveryShipments.filter((s) => s.status === 'signed' || s.status === 'arrived'),
    [deliveryShipments],
  );

  const columns: ColumnDef<VendorStatement, unknown>[] = useMemo(() => [
    { accessorKey: 'statementNo', header: '对账单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer' }}
          onClick={() => setDetailOpen(row.original)}>
          {row.original.statementNo}
        </Typography>
      ) },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'statementPeriod', header: '对账周期', cell: ({ row }) => <Typography variant="body2">{row.original.statementPeriod}</Typography> },
    { accessorKey: 'subtotal', header: '金额合计',
      cell: ({ row }) => <Typography variant="body2" fontWeight={700} sx={{ color: '#1E293B' }}>{formatCurrency(row.original.subtotal)}</Typography> },
    { accessorKey: 'taxTotal', header: '税额',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#10B981' }}>{formatCurrency(row.original.taxTotal)}</Typography> },
    { accessorKey: 'grandTotal', header: '价税合计',
      cell: ({ row }) => <Typography variant="body2" fontWeight={600} sx={{ color: '#F59E0B' }}>{formatCurrency(row.original.grandTotal)}</Typography> },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = statementStatusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} sx={{ fontWeight: 600 }} />;
      } },
    { id: 'actions', header: '操作',
      cell: ({ row }) => <StatementActions row={row.original} onMsg={setSnackbarMsg} onInvoice={(st) => setInvoiceFrom(st)} /> },
  ], []);

  const filteredData = useMemo(() => {
    let data = [...vendorStatements];
    if (filterData.statementNo) data = data.filter((d) => d.statementNo.includes(filterData.statementNo as string));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, vendorStatements]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>对账单管理</Typography>
          <Typography variant="caption" color="text.secondary">
            勾选已发货订单或空白新建发起对账单；审批通过后即可发起开票申请
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>发起对账单</Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '金额合计', amount: vendorStatements.reduce((s, d) => s + d.subtotal, 0), color: '#1E293B' },
          { label: '税额', amount: vendorStatements.reduce((s, d) => s + d.taxTotal, 0), color: '#10B981' },
          { label: '价税合计', amount: vendorStatements.reduce((s, d) => s + d.grandTotal, 0), color: '#F59E0B' },
        ].map(({ label, amount, color }) => (
          <Paper key={label} sx={{ flex: 1, p: 2, borderRadius: 3, bgcolor: '#F8FAFC' }}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color }}>{formatCurrency(amount)}</Typography>
          </Paper>
        ))}
      </Stack>

      <FilterBar fields={[
        { name: 'statementNo', label: '对账单号', type: 'text' as const },
        { name: 'status', label: '状态', type: 'select' as const,
          options: [{ value: '', label: '全部' }, ...Object.entries(statementStatusMap).map(([v, { label }]) => ({ value: v, label }))] },
      ]} onFilter={setFilterData} />
      <DataTable data={filteredData} columns={columns} enableRowSelection enablePagination enableExport />

      {detailOpen && (
        <StatementDetailDialog statement={detailOpen} onClose={() => setDetailOpen(null)} />
      )}

      {createOpen && (
        <StatementCreateDialog
          candidateShips={candidateShips}
          onClose={() => setCreateOpen(false)}
          onSubmit={(st) => { addVendorStatement(st); setCreateOpen(false); setSnackbarMsg('对账单已提交，自动流转至采购/财务审批'); }}
          onDraft={(st) => { addVendorStatement(st); setCreateOpen(false); setSnackbarMsg('对账单已存为草稿'); }}
        />
      )}

      {invoiceFrom && (
        <InvoiceRequestCreateDialog initialStatement={invoiceFrom} open onClose={() => setInvoiceFrom(null)} />
      )}

      <Snackbar open={Boolean(snackbarMsg)} autoHideDuration={3000} onClose={() => setSnackbarMsg('')} message={snackbarMsg} />
    </Box>
  );
}

// 对账单行操作按钮
function StatementActions({ row, onMsg, onInvoice }: {
  row: VendorStatement; onMsg: (m: string) => void; onInvoice: (st: VendorStatement) => void;
}) {
  const { updateVendorStatement } = useFlowStore();
  if (row.status === 'draft')
    return <Button size="small" variant="contained" onClick={() => { updateVendorStatement(row.id, { status: 'submitted', updatedAt: nowStr() }); onMsg('对账单已提交，待采购/财务审批'); }}>提交审批</Button>;
  if (row.status === 'submitted' || row.status === 'reviewing')
    return <Button size="small" variant="contained" color="warning" onClick={() => { updateVendorStatement(row.id, { status: 'confirmed', updatedAt: nowStr() }); onMsg('已模拟采购/财务审批通过'); }}>模拟审批通过</Button>;
  if (row.status === 'sent') {
    const confirmAmount = (row.items || []).reduce((s: number, it: { amount?: number }) => s + (it.amount || 0), 0);
    return <Button size="small" variant="contained" color="success" data-testid="vendor-statement-confirm" onClick={() => {
      updateVendorStatement(row.id, { status: 'confirmed', vendorConfirmedAt: nowStr(), updatedAt: nowStr() });
      // B7-T3：同步回写主 ERP 往来对账（幂等守卫在 store 内）
      useFinanceStore.getState().confirmReconciliation({
        statementNo: row.statementNo,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        period: row.statementPeriod,
        amount: confirmAmount,
      });
      onMsg('已确认对账无误');
    }}>确认对账</Button>;
  }
  if (row.status === 'confirmed')
    return <Button size="small" variant="contained" color="primary" startIcon={<Receipt />} onClick={() => onInvoice(row)}>发起开票</Button>;
  if (row.status === 'closed')
    return <Chip label="已结清" size="small" color="success" />;
  return null;
}

// 对账单详情
function StatementDetailDialog({ statement, onClose }: { statement: VendorStatement; onClose: () => void }) {
  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose}>
      <DialogTitle sx={{ fontWeight: 600 }}>对账单详情 · {statement.statementNo}</DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={4}><Typography variant="caption" color="text.secondary">供应商</Typography><Typography>{statement.vendorName}</Typography></Grid>
          <Grid item xs={4}><Typography variant="caption" color="text.secondary">对账周期</Typography><Typography>{statement.statementPeriod}</Typography></Grid>
          <Grid item xs={4}><Typography variant="caption" color="text.secondary">状态</Typography><Chip label={statementStatusMap[statement.status]?.label} size="small" color={statementStatusMap[statement.status]?.color || 'default'} /></Grid>
        </Grid>
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell>采购订单号</TableCell><TableCell>物料</TableCell>
                <TableCell align="right">数量</TableCell><TableCell align="right">单价</TableCell>
                <TableCell align="right">金额</TableCell><TableCell align="right">税率</TableCell>
                <TableCell align="right">价税合计</TableCell><TableCell>入库日期</TableCell><TableCell>开票</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statement.items?.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" fontFamily="monospace">{item.purchaseOrderNo}</Typography></TableCell>
                  <TableCell>
                    <Stack spacing={0.3}>
                      <Chip label={item.materialCode} size="small" sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem', width: 'fit-content' }} />
                      <Typography variant="caption">{item.materialName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{item.qty} {item.unit}</TableCell>
                  <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</TableCell>
                  <TableCell align="right">{item.taxRate}%</TableCell>
                  <TableCell align="right">{formatCurrency(item.totalAmount)}</TableCell>
                  <TableCell>{formatDate(item.inboundDate)}</TableCell>
                  <TableCell>{item.invoiced ? <Chip size="small" color="success" label={item.invoiceNo || '已开'} /> : <Chip size="small" color="default" label="未开" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2, textAlign: 'right' }}>
          <Typography variant="body2">金额合计：{formatCurrency(statement.subtotal)}　税额：{formatCurrency(statement.taxTotal)}</Typography>
          <Typography variant="h6" fontWeight={700}>价税合计：{formatCurrency(statement.grandTotal)}</Typography>
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

// 发起对账单（勾选已发货订单 / 空白新建）
function StatementCreateDialog({ candidateShips, onClose, onSubmit, onDraft }: {
  candidateShips: DeliveryShipment[];
  onClose: () => void;
  onSubmit: (st: VendorStatement) => void;
  onDraft: (st: VendorStatement) => void;
}) {
  const [selectedShips, setSelectedShips] = useState<string[]>([]);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [period, setPeriod] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  const toggleShip = (ship: DeliveryShipment) => {
    if (selectedShips.includes(ship.id)) {
      setSelectedShips(selectedShips.filter((id) => id !== ship.id));
      setRows(rows.filter((r) => r._shipId !== ship.id));
    } else {
      setSelectedShips([...selectedShips, ship.id]);
      const newRows: EditRow[] = ship.items.map((it) => ({
        id: genId('vsi'), _shipId: ship.id,
        purchaseOrderNo: ship.purchaseOrderNo, inboundNo: ship.inboundOrderId || '',
        materialCode: it.materialCode, materialName: it.materialName, specification: it.specification, unit: it.unit,
        qty: it.shippedQty, unitPrice: 0, taxRate: 13,
      }));
      setRows([...rows, ...newRows]);
    }
  };

  const updateRow = (id: string, patch: Partial<EditRow>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addBlank = () => setRows([...rows, { id: genId('vsi'), purchaseOrderNo: '', inboundNo: '', materialCode: '', materialName: '', specification: '', unit: '', qty: 1, unitPrice: 0, taxRate: 13 }]);
  const removeRow = (id: string) => setRows(rows.filter((r) => r.id !== id));

  const build = (status: 'draft' | 'submitted'): VendorStatement => {
    const items = rows.map((r) => ({
      id: r.id, purchaseOrderNo: r.purchaseOrderNo, inboundNo: r.inboundNo,
      materialCode: r.materialCode, materialName: r.materialName, specification: r.specification, unit: r.unit,
      qty: r.qty, unitPrice: r.unitPrice,
      amount: round2(lineAmount(r)),
      inboundDate: todayStr(),
      taxRate: r.taxRate,
      taxAmount: round2(lineTax(r)),
      totalAmount: round2(lineTotal(r)),
      invoiced: false,
    }));
    return {
      id: genId('vs'), statementNo: genId('VS'),
      vendorId: DEFAULT_VENDOR_ID, vendorName: DEFAULT_VENDOR_NAME,
      statementPeriod: period,
      items,
      subtotal: round2(items.reduce((s, i) => s + i.amount, 0)),
      taxTotal: round2(items.reduce((s, i) => s + i.taxAmount, 0)),
      grandTotal: round2(items.reduce((s, i) => s + i.totalAmount, 0)),
      status,
      createdAt: nowStr(), updatedAt: nowStr(), createdBy: DEFAULT_VENDOR_ID, updatedBy: DEFAULT_VENDOR_ID,
    };
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountBalance color="primary" /> 发起对账单
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>勾选「已发货/已签收」订单自动带入物料行，也可手工新增空白行。提交后金额、数量、税率均可修改。</Alert>
        <Grid container spacing={3}>
          <Grid item xs={4}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>① 选择已发货订单</Typography>
            {candidateShips.length === 0 && <Typography variant="caption" color="text.secondary">暂无已发货/已签收订单</Typography>}
            <List dense sx={{ maxHeight: 360, overflow: 'auto', bgcolor: '#F8FAFC', borderRadius: 2 }}>
              {candidateShips.map((ship) => (
                <ListItem key={ship.id} secondaryAction={
                  <Checkbox edge="end" checked={selectedShips.includes(ship.id)} onChange={() => toggleShip(ship)} />
                }>
                  <ListItemText
                    primary={<Typography variant="body2" fontFamily="monospace">{ship.shipmentNo} · {ship.purchaseOrderNo}</Typography>}
                    secondary={`${ship.vendorName} · ${ship.items.length} 项物料`}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
          <Grid item xs={8}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>② 对账单明细（可编辑）</Typography>
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="对账周期" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ width: 130 }} />
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={addBlank}>空白行</Button>
              </Stack>
            </Stack>
            <TableContainer component={Paper} sx={{ borderRadius: 2, maxHeight: 340, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell>物料</TableCell>
                    <TableCell align="right" sx={{ width: 70 }}>数量</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>单价</TableCell>
                    <TableCell align="right" sx={{ width: 60 }}>税率%</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>价税合计</TableCell>
                    <TableCell sx={{ width: 36 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={6}><Typography variant="caption" color="text.secondary">请选择左侧订单或新增空白行</Typography></TableCell></TableRow>
                  )}
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <TextField size="small" value={r.materialName} placeholder="物料名称" onChange={(e) => updateRow(r.id, { materialName: e.target.value })} sx={{ width: 140, mb: 0.5 }} />
                        <TextField size="small" value={r.materialCode} placeholder="物料编码" onChange={(e) => updateRow(r.id, { materialCode: e.target.value })} sx={{ width: 140 }} />
                      </TableCell>
                      <TableCell align="right"><TextField size="small" type="number" value={r.qty} onChange={(e) => updateRow(r.id, { qty: Number(e.target.value) })} sx={{ width: 64 }} /></TableCell>
                      <TableCell align="right"><TextField size="small" type="number" value={r.unitPrice} onChange={(e) => updateRow(r.id, { unitPrice: Number(e.target.value) })} sx={{ width: 80 }} /></TableCell>
                      <TableCell align="right"><TextField size="small" type="number" value={r.taxRate} onChange={(e) => updateRow(r.id, { taxRate: Number(e.target.value) })} sx={{ width: 52 }} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(lineTotal(r))}</TableCell>
                      <TableCell><IconButton size="small" onClick={() => removeRow(r.id)}><Delete fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 1, textAlign: 'right' }}>
              <Typography variant="body2">金额合计：{formatCurrency(round2(rows.reduce((s, r) => s + lineAmount(r), 0)))}　价税合计：{formatCurrency(round2(rows.reduce((s, r) => s + lineTotal(r), 0)))}</Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" disabled={rows.length === 0} onClick={() => onDraft(build('draft'))}>存为草稿</Button>
        <Button variant="contained" startIcon={<Send />} disabled={rows.length === 0} onClick={() => onSubmit(build('submitted'))}>提交审批</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── 开票申请 → 开票 ─────────────────────────────────────────
function InvoiceRequestPanel() {
  const {
    vendorInvoiceRequests, vendorStatements, addVendorInvoiceRequest, updateVendorInvoiceRequest,
  } = useFlowStore();
  const { invoices } = useFinanceStore();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState<VendorInvoiceRequest | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const myInvoices = useMemo(
    () => invoices.filter((i) => i.vendorName === DEFAULT_VENDOR_NAME),
    [invoices],
  );

  const columns: ColumnDef<VendorInvoiceRequest, unknown>[] = useMemo(() => [
    { accessorKey: 'requestNo', header: '申请单号',
      cell: ({ row }) => <Typography variant="body2" sx={{ color: '#3B82F6', fontWeight: 600, fontFamily: 'monospace' }}>{row.original.requestNo}</Typography> },
    { accessorKey: 'vendorName', header: '供应商' },
    { accessorKey: 'statementNo', header: '对账单号',
      cell: ({ row }) => <Typography variant="body2" fontFamily="monospace" color="text.secondary">{row.original.statementNo}</Typography> },
    { accessorKey: 'invoiceType', header: '发票类型',
      cell: ({ row }) => <Chip label={invoiceTypeLabel[row.original.invoiceType] || row.original.invoiceType} size="small" /> },
    { accessorKey: 'invoiceAmount', header: '开票金额',
      cell: ({ row }) => <Typography variant="body2" fontWeight={700}>{formatCurrency(row.original.invoiceAmount)}</Typography> },
    { accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = invoiceStatusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color || 'default'} sx={{ fontWeight: 600 }} />;
      } },
    { accessorKey: 'submittedAt', header: '申请时间',
      cell: ({ row }) => (row.original.submittedAt ? formatDate(row.original.submittedAt) : (row.original.createdAt ? formatDate(row.original.createdAt) : '-')) },
    { id: 'actions', header: '操作',
      cell: ({ row }) => <InvoiceRequestActions row={row.original} onMsg={setSnackbarMsg} onIssue={(r) => setIssueOpen(r)} /> },
  ], []);

  const filteredData = useMemo(() => {
    let data = [...vendorInvoiceRequests];
    if (filterData.requestNo) data = data.filter((d) => d.requestNo.includes(filterData.requestNo as string));
    if (filterData.status) data = data.filter((d) => d.status === filterData.status);
    return data;
  }, [filterData, vendorInvoiceRequests]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>开票申请</Typography>
          <Typography variant="caption" color="text.secondary">对账审批通过后在此发起开票申请，客户同意后即可开具发票并登记台账。</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>发起开票申请</Button>
      </Box>

      <FilterBar fields={[
        { name: 'requestNo', label: '申请单号', type: 'text' as const },
        { name: 'status', label: '状态', type: 'select' as const,
          options: [{ value: '', label: '全部' }, ...Object.entries(invoiceStatusMap).map(([v, { label }]) => ({ value: v, label }))] },
      ]} onFilter={setFilterData} />
      <DataTable data={filteredData} columns={columns} enableRowSelection enablePagination enableExport />

      {/* 已登记发票台账 */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 4, mb: 1 }}>已开具发票（财务台账）</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell>发票号码</TableCell><TableCell>类型</TableCell>
              <TableCell align="right">不含税金额</TableCell><TableCell align="right">税额</TableCell>
              <TableCell align="right">价税合计</TableCell><TableCell>开票日期</TableCell><TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {myInvoices.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography variant="caption" color="text.secondary">暂无已开具发票</Typography></TableCell></TableRow>
            )}
            {myInvoices.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell><Typography variant="body2" fontFamily="monospace">{inv.invoiceNo}</Typography></TableCell>
                <TableCell>{invoiceTypeLabel[inv.invoiceType] || inv.invoiceType}</TableCell>
                <TableCell align="right">{formatCurrency(inv.amount)}</TableCell>
                <TableCell align="right">{formatCurrency(inv.taxAmount)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(inv.totalAmount)}</TableCell>
                <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                <TableCell><Chip size="small" color="success" label="已登记" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {createOpen && (
        <InvoiceRequestCreateDialog open onClose={() => setCreateOpen(false)} />
      )}
      {issueOpen && (
        <InvoiceIssueDialog request={issueOpen} open onClose={() => setIssueOpen(null)} />
      )}

      <Snackbar open={Boolean(snackbarMsg)} autoHideDuration={3000} onClose={() => setSnackbarMsg('')} message={snackbarMsg} />
    </Box>
  );
}

function InvoiceRequestActions({ row, onMsg, onIssue }: {
  row: VendorInvoiceRequest; onMsg: (m: string) => void; onIssue: (r: VendorInvoiceRequest) => void;
}) {
  const { updateVendorInvoiceRequest } = useFlowStore();
  if (row.status === 'draft')
    return <Button size="small" variant="contained" onClick={() => { updateVendorInvoiceRequest(row.id, { status: 'submitted', submittedAt: nowStr(), updatedAt: nowStr() }); onMsg('开票申请已提交，待客户同意'); }}>提交</Button>;
  if (row.status === 'pending')
    return <Button size="small" variant="contained" color="warning" onClick={() => { updateVendorInvoiceRequest(row.id, { status: 'submitted', submittedAt: nowStr(), updatedAt: nowStr() }); onMsg('已立即发起开票申请'); }}>立即发起</Button>;
  if (row.status === 'submitted')
    return <Button size="small" variant="contained" color="success" onClick={() => { updateVendorInvoiceRequest(row.id, { status: 'approved', updatedAt: nowStr() } as any); onMsg('已模拟客户同意，可开具发票'); }}>模拟客户同意</Button>;
  if (row.status === 'approved')
    return <Button size="small" variant="contained" color="primary" startIcon={<PictureAsPdf />} onClick={() => onIssue(row)}>开票</Button>;
  if (row.status === 'issued')
    return <Chip size="small" color="success" icon={<CheckCircle />} label={row.invoiceNo || '已开票'} />;
  return <Chip size="small" label={invoiceStatusMap[row.status]?.label || row.status} color={invoiceStatusMap[row.status]?.color || 'default'} />;
}

// 新建开票申请（选择已审批通过对账单）
function InvoiceRequestCreateDialog({ initialStatement, open, onClose }: {
  initialStatement?: VendorStatement | null; open: boolean; onClose: () => void;
}) {
  const { vendorStatements, addVendorInvoiceRequest } = useFlowStore();
  const [statementId, setStatementId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'vat_special' | 'vat_normal' | 'electronic'>('vat_special');
  const [scheduleAt, setScheduleAt] = useState('');

  const confirmedStatements = useMemo(
    () => vendorStatements.filter((s) => s.status === 'confirmed' || s.status === 'sent'),
    [vendorStatements],
  );
  const target = initialStatement || confirmedStatements.find((s) => s.id === statementId) || null;

  useEffect(() => {
    if (initialStatement) { setStatementId(initialStatement.id); }
    else { setStatementId(''); }
    setScheduleAt('');
    setInvoiceType('vat_special');
  }, [open, initialStatement]);

  const handleSubmit = (asSchedule: boolean) => {
    if (!target) return;
    const req: VendorInvoiceRequest = {
      id: genId('vir'), requestNo: genId('VIR'),
      vendorId: DEFAULT_VENDOR_ID, vendorName: DEFAULT_VENDOR_NAME,
      statementId: target.id, statementNo: target.statementNo,
      invoiceType,
      taxRate: target.items[0]?.taxRate ?? 13,
      invoiceAmount: target.subtotal,
      taxAmount: target.taxTotal,
      totalAmount: target.grandTotal,
      buyerName: BUYER_NAME, buyerTaxId: BUYER_TAX_ID, buyerAddress: BUYER_ADDRESS,
      buyerBank: BUYER_BANK, buyerBankAccount: BUYER_BANK_ACCOUNT,
      items: target.items.map((i) => ({ description: `${i.materialName} ${i.specification}`, unit: i.unit, qty: i.qty, unitPrice: i.unitPrice, amount: i.amount })),
      status: asSchedule ? 'pending' : 'submitted',
      scheduledAt: asSchedule ? scheduleAt : undefined,
      createdAt: nowStr(), updatedAt: nowStr(), createdBy: DEFAULT_VENDOR_ID, updatedBy: DEFAULT_VENDOR_ID,
    };
    addVendorInvoiceRequest(req);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt color="primary" /> 发起开票申请
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {!initialStatement && confirmedStatements.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>暂无已审批通过的对账单，请先在「对账单管理」发起并审批通过。</Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small" disabled={Boolean(initialStatement)}>
              <InputLabel>关联对账单 *</InputLabel>
              <Select value={statementId} label="关联对账单 *" onChange={(e) => setStatementId(e.target.value)}>
                {confirmedStatements.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.statementNo}（{formatCurrency(s.grandTotal)}）</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {target && (
            <Grid item xs={12}>
              <Alert severity="info">
                对账单 {target.statementNo}　价税合计 <b>{formatCurrency(target.grandTotal)}</b>　税额 {formatCurrency(target.taxTotal)}
              </Alert>
            </Grid>
          )}
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>发票类型 *</InputLabel>
              <Select value={invoiceType} label="发票类型 *" onChange={(e) => setInvoiceType(e.target.value as any)}>
                <MenuItem value="vat_special">增值税专用发票</MenuItem>
                <MenuItem value="vat_normal">增值税普通发票</MenuItem>
                <MenuItem value="electronic">电子发票</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="datetime-local" label="定时发起（可选）" value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}><Typography variant="caption" color="text.secondary">不填定时时间则立即发起；填后状态为「待发起」，可在列表中「立即发起」。</Typography></Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" disabled={!target} onClick={() => handleSubmit(true)}>定时发起</Button>
        <Button variant="contained" startIcon={<Send />} disabled={!target} onClick={() => handleSubmit(false)}>立即发起</Button>
      </DialogActions>
    </Dialog>
  );
}

// 发票版面预览 + 确认开票
function InvoiceIssueDialog({ request, open, onClose }: {
  request: VendorInvoiceRequest; open: boolean; onClose: () => void;
}) {
  const { addInvoice } = useFinanceStore();
  const { vendorStatements, updateVendorInvoiceRequest, updateVendorStatement } = useFlowStore();
  const [snack, setSnack] = useState('');
  const [done, setDone] = useState(false);

  const handleIssue = (isPrint: boolean) => {
    if (done) return;
    const invoiceNo = 'FP' + Date.now().toString().slice(-10);
    const invoiceCode = String(Date.now()).slice(-12);
    const inv: Invoice = {
      id: genId('inv'), invoiceNo,
      invoiceType: request.invoiceType === 'electronic' ? 'vat_normal' : (request.invoiceType as Invoice['invoiceType']),
      status: 'submitted',
      vendorName: request.vendorName, vendorTaxNo: VENDOR_TAX_NO,
      purchaseOrderNo: request.statementNo,
      invoiceDate: nowStr(), receivedDate: '',
      amount: request.invoiceAmount, taxRate: request.taxRate, taxAmount: request.taxAmount, totalAmount: request.totalAmount,
      createdAt: nowStr(), updatedAt: nowStr(), createdBy: DEFAULT_VENDOR_ID, updatedBy: DEFAULT_VENDOR_ID,
      note: `对账单 ${request.statementNo}`,
    };
    addInvoice(inv);
    updateVendorInvoiceRequest(request.id, { status: 'issued', invoiceNo, invoiceCode, issuedAt: nowStr(), updatedAt: nowStr() });
    const st = vendorStatements.find((s) => s.id === request.statementId);
    if (st) {
      const newItems = st.items.map((i) => ({ ...i, invoiced: true, invoiceNo }));
      const allInvoiced = newItems.length > 0 && newItems.every((i) => i.invoiced);
      updateVendorStatement(st.id, { items: newItems, status: allInvoiced ? 'closed' : st.status, updatedAt: nowStr() });
    }
    setDone(true);
    setSnack(`发票已开具并登记：${invoiceNo}`);
    if (isPrint) { setTimeout(() => window.print(), 300); }
    setTimeout(() => onClose(), 1500);
  };

  return (
    <Dialog open onClose={done ? onClose : () => {}} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <PictureAsPdf color="primary" /> 发票开具预览
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {/* 发票版面 */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#FFFDF7', borderColor: '#E2C044' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '2px dashed #E2C044', pb: 1, mb: 2 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#B45309' }}>增值税{request.invoiceType === 'vat_special' ? '专用' : '普通'}发票</Typography>
            <Chip size="small" icon={<VerifiedUser />} color="primary" label="发票预览" />
          </Stack>
          <Grid container spacing={1}>
            <Grid item xs={6}><Typography variant="caption" color="text.secondary">发票代码</Typography><Typography variant="body2" fontFamily="monospace">{String(Date.now()).slice(-12)}</Typography></Grid>
            <Grid item xs={6}><Typography variant="caption" color="text.secondary">开票日期</Typography><Typography variant="body2">{formatDate(nowStr())}</Typography></Grid>
            <Grid item xs={6}><Typography variant="caption" color="text.secondary">购买方（客户）</Typography><Typography variant="body2" fontWeight={600}>{BUYER_NAME}</Typography><Typography variant="caption" fontFamily="monospace">{BUYER_TAX_ID}</Typography></Grid>
            <Grid item xs={6}><Typography variant="caption" color="text.secondary">销售方（供应商）</Typography><Typography variant="body2" fontWeight={600}>{request.vendorName}</Typography><Typography variant="caption" fontFamily="monospace">{VENDOR_TAX_NO}</Typography></Grid>
          </Grid>
          <TableContainer sx={{ mt: 2, border: '1px solid #E2C044', borderRadius: 1 }}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: '#FDF6E3' }}>
                <TableCell>货物或应税劳务名称</TableCell><TableCell align="right">数量</TableCell>
                <TableCell align="right">单价</TableCell><TableCell align="right">金额</TableCell><TableCell align="right">税率</TableCell><TableCell align="right">税额</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {request.items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell align="right">{it.qty} {it.unit}</TableCell>
                    <TableCell align="right">{formatCurrency(it.unitPrice)}</TableCell>
                    <TableCell align="right">{formatCurrency(it.amount)}</TableCell>
                    <TableCell align="right">{request.taxRate}%</TableCell>
                    <TableCell align="right">{formatCurrency(it.amount * request.taxRate / 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" justifyContent="flex-end" spacing={3} sx={{ mt: 2 }}>
            <Typography variant="body2">价税合计：<b>{formatCurrency(request.totalAmount)}</b></Typography>
          </Stack>
        </Paper>
        {snack && <Alert severity="success" sx={{ mt: 2 }}>{snack}</Alert>}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        {!done && (
          <>
            <Button variant="outlined" startIcon={<Print />} onClick={() => handleIssue(true)}>打印纸质发票</Button>
            <Button variant="contained" startIcon={<PictureAsPdf />} onClick={() => handleIssue(false)}>开电子票</Button>
          </>
        )}
        {done && <Button variant="contained" onClick={onClose}>完成</Button>}
      </DialogActions>
    </Dialog>
  );
}

// ── 主页（Tabs：对账单 + 开票申请）─────────────────────────
const VendorFinancePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: 3 }}>
      {!identity && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="portal-demo-identity-banner">
          未识别到供应商门户登录身份，当前展示的是演示供应商（{DEFAULT_VENDOR_NAME}）的数据。请从供应商门户登录后再操作。
        </Alert>
      )}
      <DemoBanner reason="对账单、开票申请与发票均**已真实写入财务台账**（addVendorStatement / confirmReconciliation / addInvoice）；当前「审批通过 / 客户同意」为**模拟按钮**，未对接外部真实采购-财务审批系统与税务开票平台。" />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#1E293B' }}>财务管理</Typography>
        <Chip size="small" color="primary" variant="outlined" data-testid="portal-current-vendor" label={identity?.vendorName || DEFAULT_VENDOR_NAME} />
      </Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E2E8F0' }}>
          <Tab label="对账单管理" icon={<AccountBalance fontSize="small" />} iconPosition="start" />
          <Tab label="开票申请" icon={<Receipt fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Paper>
      <Box sx={{ mt: 2 }}>
        {tab === 0 && <StatementPanel />}
        {tab === 1 && <InvoiceRequestPanel />}
      </Box>
    </Box>
  );
};

export default VendorFinancePage;
