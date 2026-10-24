/**
 * 不合格品管理 —— 质量管理模块
 * 来源：报检不合格 → 本页面处置（退货/让步接收/折价入库/隔离/其他）
 */
import React, { useState, useMemo, useEffect } from 'react';
import { FlowTracker } from '@/components/common';
import { resolveToken } from '@/components/common';
import {
  Box, Typography, Paper, Chip, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Snackbar, Alert, Divider, Grid, Stack, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add, Edit, CheckCircle, Visibility, Warning, ArrowBack,
  LocalShipping, Handshake, MoneyOff, Inventory, MoreHoriz,
  AutoFixHigh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge } from '@/components/common';
import { ColumnDef } from '@tanstack/react-table';
import { useQualityStore } from '@/stores/qualityStore';
import { UnqualifiedDisposition, UnqualifiedStatus } from '@/types/quality';
import { applyColumnFilters } from '@/utils/listSearch';

// 扩展处置方式（兼容旧4种 + 新5种枚举）
type DisposalMethod = 'return' | 'concession' | 'discount' | 'isolate' | 'rework' | 'scrap' | 'other';

interface DisposalConfig {
  label: string;
  /** MUI 主题色路径（如 'error.main'），替代原 hex 硬编码，支持换肤 */
  color: string;
  icon: React.ReactNode;
  desc: string;
  nextStep?: string;
}

const DISPOSAL_CONFIG: Record<DisposalMethod, DisposalConfig> = {
  return:      { label: '退货', color: 'error.main', icon: <LocalShipping fontSize="small" />, desc: '退还给供应商，发起退货入库/出库流程', nextStep: '→ 供应商退货单' },
  concession:  { label: '让步接收', color: 'warning.main', icon: <Handshake fontSize="small" />, desc: '质量认可后按原价入库，质量负责人须签字', nextStep: '→ 让步接收入库单' },
  discount:    { label: '折价入库', color: 'secondary.main', icon: <MoneyOff fontSize="small" />, desc: '协商降价后入库，自动生成差价通知单', nextStep: '→ 折价入库单 + 差价通知' },
  isolate:     { label: '隔离', color: 'info.main', icon: <Inventory fontSize="small" />, desc: '移入隔离仓位，等待质量委员会决议', nextStep: '→ 隔离库位记录' },
  rework:      { label: '返工', color: 'warning.main', icon: <Edit fontSize="small" />, desc: '退回供应商或内部返工修复后重新检验', nextStep: '→ 重新报检' },
  scrap:       { label: '报废', color: 'error.main', icon: <Warning fontSize="small" />, desc: '无法使用，直接报废处理', nextStep: '→ 报废单' },
  other:       { label: '其他', color: 'grey.500', icon: <MoreHoriz fontSize="small" />, desc: '其他特殊处理方式，需在备注中详细说明', nextStep: '→ 手工跟进' },
};

// ── 处置方案对话框 ────────────────────────────────────────────
const DisposalDialog: React.FC<{
  open: boolean;
  itemNo: string;
  materialName: string;
  materialCode: string;
  defectQty: number;
  onClose: () => void;
  onSubmit: (method: DisposalMethod, approver?: string) => void;
}> = ({ open, itemNo, materialName, materialCode, defectQty, onClose, onSubmit }) => {
  const [method, setMethod] = useState<DisposalMethod>('return');
  const [approver, setApprover] = useState('');
  const [remark, setRemark] = useState('');

  const cfg = DISPOSAL_CONFIG[method];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Warning color="warning" /> 选择处置方案
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {/* 不合格品信息 */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#FEF2F2', borderRadius: 2, border: '1px solid #FECACA' }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">不合格品记录号</Typography>
              <Typography variant="body2" fontWeight={600} fontFamily="monospace">{itemNo}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">物料</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Chip label={materialCode} size="small"
                  sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem' }} />
                <Typography variant="caption">{materialName}</Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">不合格数量</Typography>
              <Typography variant="body2" fontWeight={600} color="error">{defectQty} 件</Typography>
            </Box>
          </Stack>
        </Paper>

        {/* 处置方式选择 */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>处置方式</Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {(Object.entries(DISPOSAL_CONFIG) as [DisposalMethod, DisposalConfig][]).map(([key, cfg]) => (
            <Grid item xs={6} key={key}>
              <Paper
                onClick={() => setMethod(key)}
                data-testid={`disposal-method-${key}`}
                sx={(theme) => ({
                  p: 1.5, borderRadius: 2, cursor: 'pointer',
                  border: `2px solid ${method === key ? resolveToken(theme, cfg.color) : 'transparent'}`,
                  bgcolor: method === key ? alpha(resolveToken(theme, cfg.color), 0.06) : '#F8FAFC',
                  transition: 'all 0.15s',
                  '&:hover': {
                    bgcolor: alpha(resolveToken(theme, cfg.color), 0.05),
                    borderColor: alpha(resolveToken(theme, cfg.color), 0.4),
                  },
                })}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
                  <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                  <Typography variant="body2" fontWeight={700} sx={{ color: cfg.color }}>{cfg.label}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>{cfg.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* 后续流转提示 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>后续流转：{cfg.nextStep}</Typography>
          <Typography variant="caption">{cfg.desc}</Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="审批人（如需）"
              value={approver} onChange={(e) => setApprover(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="处置说明 / 备注" multiline rows={2}
              value={remark} onChange={(e) => setRemark(e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} startIcon={<ArrowBack />}>取消</Button>
        <Button variant="contained" color="warning"
          sx={{ bgcolor: cfg.color, '&:hover': { bgcolor: cfg.color } }}
          data-testid="disposal-confirm"
          onClick={() => onSubmit(method, approver)}>
          确认执行：{cfg.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 主页面 ────────────────────────────────────────────────────
const UnqualifiedList: React.FC = () => {
  const { unqualifiedItems, addUnqualifiedItem, pdcaRecords, addPdcaRecord, updateUnqualifiedItem, disposeUnqualified } = useQualityStore();
  const navigate = useNavigate();
  const [newDialog, setNewDialog] = useState(false);
  const [disposalTarget, setDisposalTarget] = useState<typeof unqualifiedItems[0] | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const [capaDialogOpen, setCapaDialogOpen] = useState(false);
  const [capaTarget, setCapaTarget] = useState<typeof unqualifiedItems[0] | null>(null);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // NCR → CAPA：创建关联 PDCA 并关闭 NCR
  const handleGenerateCapa = (item: typeof unqualifiedItems[0], templateName?: string) => {
    const newId = `pdca-${Date.now()}`;
    const pdcaNo = `CAPA-${Date.now().toString().slice(-8)}`;
    const title = templateName || `NCR纠正措施 - ${item.itemNo}`;
    addPdcaRecord({
      id: newId,
      pdcaNo,
      title,
      status: 'open',
      source: 'inspection',
      relatedItemId: item.id,
      priority: 'high',
      problemDescription: item.defectDescription || '由不合格品报告(NCR)触发',
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      owner: item.responsiblePerson || '质量工程师',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    });
    updateUnqualifiedItem(item.id, { status: 'capa_raised' as UnqualifiedStatus });
  };
  const [newItem, setNewItem] = useState({
    relateNo: '', materialCode: '', materialName: '', batchNo: '',
    defectQty: 0, totalQty: 0, defectDescription: '',
    disposition: 'return_vendor' as UnqualifiedDisposition, responsible: '', dueDate: '',
  });

  const CREATE_DISPOSITIONS: { value: UnqualifiedDisposition; label: string }[] = [
    { value: 'return_vendor', label: '退货供应商' },
    { value: 'conditional_accept', label: '让步接收' },
    { value: 'rework', label: '返工' },
    { value: 'scrap', label: '报废' },
  ];

  const stats = useMemo(() => ({
    pending:    unqualifiedItems.filter(i => i.dispositionStatus === 'pending').length,
    in_progress:unqualifiedItems.filter(i => i.dispositionStatus === 'in_progress').length,
    completed:  unqualifiedItems.filter(i => i.dispositionStatus === 'completed').length,
  }), []);

  const mapImportRow = (r: Record<string, string>, _headers: string[]): typeof unqualifiedItems[0] => ({
    id: `uq-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemNo: r['记录编号'] || `UQ-IMP-${Date.now()}`,
    inspectionTaskId: '',
    inspectionTaskNo: r['来源报检单'] || `QN-${Date.now()}`,
    materialCode: r['物料编码'] || '',
    materialName: r['物料'] || '',
    batchNo: r['批次'] || '-',
    defectQuantity: Number(r['不合格数量']) || 0,
    defectDescription: r['缺陷描述'] || '',
    disposition: 'return_vendor',
    dispositionStatus: 'pending',
    responsiblePerson: r['负责人'] || '',
    dueDate: r['截止日期'] || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin',
  });

  const columns: ColumnDef<typeof unqualifiedItems[0], unknown>[] = [
    {
      accessorKey: 'itemNo',
      header: '记录编号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#EF4444', fontFamily: 'monospace' }}>
          {row.original.itemNo}
        </Typography>
      ),
    },
    {
      accessorKey: 'materialCode',
      header: '物料号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Chip label={row.original.materialCode} size="small"
          sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem', width: 'fit-content' }} />
      ),
    },
    {
      accessorKey: 'materialName',
      header: '物料名称',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="caption" color="text.secondary">{row.original.materialName}</Typography>
      ),
    },
    {
      accessorKey: 'batchNo',
      header: '批次',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.original.batchNo}</Typography>
      ),
    },
    {
      accessorKey: 'defectQuantity',
      header: '不合格数量',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 600 }}>{row.original.defectQuantity} 件</Typography>
      ),
    },
    {
      accessorKey: 'defectDescription',
      header: '缺陷描述',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Tooltip title={row.original.defectDescription}>
          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {row.original.defectDescription}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'source',
      header: '来源报检单',
      accessorFn: (row) => row.id,
      cell: ({ row }) => (
        <Typography variant="caption" sx={{ color: '#6366F1', fontFamily: 'monospace' }}>
          QN-{row.original.id.padStart(4, '0')}
        </Typography>
      ),
    },
    {
      accessorKey: 'disposition',
      header: '处置方式',
      meta: { searchable: true, filterType: 'select', filterOptions: [
        { value: 'return_vendor', label: '退货供应商' },
        { value: 'conditional_accept', label: '让步接收' },
        { value: 'rework', label: '返工' },
        { value: 'scrap', label: '报废' },
      ] },
      cell: ({ row }) => <StatusBadge status={row.original.disposition} />,
    },
    {
      accessorKey: 'dispositionStatus',
      header: '处置状态',
      meta: { searchable: true, filterType: 'select', filterOptions: [
        { value: 'pending', label: '待处理' },
        { value: 'in_progress', label: '处理中' },
        { value: 'completed', label: '已完成' },
      ] },
      cell: ({ row }) => (
        <Chip
          icon={row.original.dispositionStatus === 'completed' ? <CheckCircle sx={{ fontSize: '12px !important' }} /> : undefined}
          label={row.original.dispositionStatus === 'pending' ? '待处理' : row.original.dispositionStatus === 'in_progress' ? '处理中' : '已完成'}
          size="small"
          color={row.original.dispositionStatus === 'completed' ? 'success' : row.original.dispositionStatus === 'in_progress' ? 'info' : 'error'}
          sx={{ fontWeight: 600 }}
        />
      ),
    },
    {
      id: 'ncrStatus',
      header: 'CAPA/闭环状态',
      accessorFn: (row) => row.status || 'open',
      cell: ({ row }) => {
        const item = row.original;
        const related = pdcaRecords.filter(r => r.relatedItemId === item.id);
        return (
          <Box>
            <StatusBadge status={`unq_${item.status || 'open'}`} />
            {related.length > 0 && (
              <Chip
                icon={<AutoFixHigh sx={{ fontSize: 12 }} />}
                label={`CAPA: ${related[0].pdcaNo}`}
                size="small"
                sx={{ mt: 0.5, bgcolor: '#EFF6FF', color: '#3B82F6', fontWeight: 500, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        );
      },
    },
    {
      accessorKey: 'responsiblePerson',
      header: '负责人',
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.responsiblePerson}</Typography>,
    },
    {
      accessorKey: 'dueDate',
      header: '截止日期',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: row.original.dispositionStatus !== 'completed' ? '#F59E0B' : '#64748B' }}>
          {row.original.dueDate}
        </Typography>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            {item.dispositionStatus === 'pending' && (
              <Button size="small" variant="outlined" color="warning"
                data-testid={`ncr-dispose-${item.id}`}
                onClick={() => setDisposalTarget(item)}>
                处置
              </Button>
            )}
            {item.status !== 'capa_raised' && item.status !== 'closed' && (
              <Button size="small" variant="outlined" color="primary"
                data-testid="ncr-to-capa"
                onClick={() => { setCapaTarget(item); setCapaDialogOpen(true); }}
                sx={{ borderColor: '#3B82F6', color: '#3B82F6', fontSize: '0.7rem' }}>
                转为CAPA
              </Button>
            )}
            <IconButton size="small" aria-label="查看不合格品详情"
              onClick={() => navigate(`/quality/unqualified/${item.id}`)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Stack>
        );
      },
    },
  ];

  // 通用列检索：覆盖全部声明了 meta.searchable 的列，并按字段权限门控
  const filtered = useMemo(
    () => applyColumnFilters(unqualifiedItems, columns, filterData, { module: 'quality' }),
    [unqualifiedItems, columns, filterData]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>不合格品管理</Typography>
          <FlowTracker module="unqualified" currentStatus="uq_dispose" />
          <Typography variant="caption" color="text.secondary">
            来源：仓储报检未通过 · 处置方式：退货 / 让步接收 / 折价入库 / 隔离 / 返工 / 报废 / 其他
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />}
            onClick={() => navigate('/warehouse/inspection-notice')}>
            返回报检单
          </Button>
          <Button variant="contained" color="error" startIcon={<Add />} onClick={() => setNewDialog(true)}>
            新建不合格品记录
          </Button>
        </Stack>
      </Box>

      {/* 统计卡 */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '待处理', count: stats.pending, color: '#EF4444', bg: '#FEF2F2' },
          { label: '处理中', count: stats.in_progress, color: '#F59E0B', bg: '#FFFBEB' },
          { label: '已完成', count: stats.completed, color: '#10B981', bg: '#ECFDF5' },
        ].map(({ label, count, color, bg }) => (
          <Paper key={label} sx={{ flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: bg, border: `1px solid ${color}25` }}>
            <Typography variant="h5" fontWeight={700} sx={{ color }}>{count}</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{label}</Typography>
          </Paper>
        ))}
        {/* 处置方式分布 */}
        <Paper sx={{ flex: 2, px: 3, py: 2, borderRadius: 3, bgcolor: '#F8FAFC' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>处置方式分布</Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ gap: 0.5 }}>
            {(['return', 'concession', 'discount', 'isolate', 'rework', 'scrap'] as DisposalMethod[]).map(k => (
              <Chip key={k} label={DISPOSAL_CONFIG[k].label} size="small"
                sx={(theme) => ({ bgcolor: alpha(resolveToken(theme, DISPOSAL_CONFIG[k].color), 0.08), color: DISPOSAL_CONFIG[k].color, fontSize: '0.7rem' })} />
            ))}
          </Stack>
        </Paper>
      </Stack>

      <FilterBar columns={columns} module="quality" onSearch={setFilterData} listKey="unqualified-list" />

      <Paper sx={{ borderRadius: 3 }}>
        <DataTable<typeof unqualifiedItems[0]>
          data={filtered}
          columns={columns}
          enableRowSelection={false}
          enablePagination={true}
          enableSorting={true}
          enableColumnFilter={true}
          enableBlockSelect={true}
          enableExport={true}
          exportFormat="xlsx"
          codeColumnId="itemNo"
          enableImport={true}
          onImport={(rows, headers) => rows.forEach(r => addUnqualifiedItem(mapImportRow(r, headers)))}
          columnConfigKey="quality-unqualified-list"
        />
      </Paper>

      {/* 新建对话框 */}
      <Dialog open={newDialog} onClose={() => setNewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>新建不合格品记录</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 1 }}>
                不合格品通常由报检单流转产生。如需手工录入，请填写以下信息。提交后记录将写入质量台账并持久化。
              </Alert>
            </Grid>
            <Grid item xs={6}>
              <TextField label="关联报检单号 (QN-)" fullWidth size="small" value={newItem.relateNo}
                onChange={(e) => setNewItem({ ...newItem, relateNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="物料编码" fullWidth size="small" value={newItem.materialCode}
                onChange={(e) => setNewItem({ ...newItem, materialCode: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="物料名称" fullWidth size="small" value={newItem.materialName}
                onChange={(e) => setNewItem({ ...newItem, materialName: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="批次号" fullWidth size="small" value={newItem.batchNo}
                onChange={(e) => setNewItem({ ...newItem, batchNo: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="不合格数量" type="number" fullWidth size="small" value={newItem.defectQty}
                onChange={(e) => setNewItem({ ...newItem, defectQty: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="总数量" type="number" fullWidth size="small" value={newItem.totalQty}
                onChange={(e) => setNewItem({ ...newItem, totalQty: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="缺陷描述" multiline rows={2} fullWidth size="small" value={newItem.defectDescription}
                onChange={(e) => setNewItem({ ...newItem, defectDescription: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>初步处置方式</InputLabel>
                <Select label="初步处置方式" value={newItem.disposition}
                  onChange={(e) => setNewItem({ ...newItem, disposition: e.target.value as UnqualifiedDisposition })}>
                  {CREATE_DISPOSITIONS.map((d) => (
                    <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField label="负责人" fullWidth size="small" value={newItem.responsible}
                onChange={(e) => setNewItem({ ...newItem, responsible: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="截止日期" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={newItem.dueDate}
                onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setNewDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={() => {
            addUnqualifiedItem({
              id: `uq-${Date.now()}`,
              itemNo: `UQ-${Date.now()}`,
              inspectionTaskId: '',
              inspectionTaskNo: newItem.relateNo || `QN-${String(Date.now()).slice(-4)}`,
              materialCode: newItem.materialCode,
              materialName: newItem.materialName,
              batchNo: newItem.batchNo,
              defectQuantity: Number(newItem.defectQty) || 0,
              defectDescription: newItem.defectDescription,
              disposition: newItem.disposition,
              dispositionStatus: 'pending',
              responsiblePerson: newItem.responsible,
              dueDate: newItem.dueDate,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'admin',
              updatedBy: 'admin',
            });
            setNewDialog(false);
            setSnackbar({ open: true, msg: '不合格品记录已创建，等待处置' });
          }}>提交</Button>
        </DialogActions>
      </Dialog>

      {/* 处置方案对话框 */}
      {disposalTarget && (
        <DisposalDialog
          open={!!disposalTarget}
          itemNo={disposalTarget.itemNo}
          materialName={disposalTarget.materialName}
          materialCode={disposalTarget.materialCode}
          defectQty={disposalTarget.defectQuantity}
          onClose={() => setDisposalTarget(null)}
          onSubmit={(method, approver) => {
            if (!disposalTarget) return;
            const ok = disposeUnqualified(disposalTarget.id, {
              disposition: method,
              operator: approver || disposalTarget.responsiblePerson,
            });
            setDisposalTarget(null);
            const cfg = DISPOSAL_CONFIG[method];
            if (!ok) {
              setSnackbar({ open: true, msg: `NCR ${disposalTarget.itemNo} 已处置完成，无法重复处置` });
              return;
            }
            if (method === 'scrap') {
              setSnackbar({
                open: true,
                msg: `已执行"报废"：${disposalTarget.itemNo} 已联动库存扣减并生成报废凭证（借6602管理费用/贷1403原材料|1405库存商品）`,
              });
            } else {
              setSnackbar({ open: true, msg: `已执行"${cfg.label}"处置，NCR ${disposalTarget.itemNo} 状态已闭环（${cfg.nextStep?.replace('→ ', '')}）` });
            }
          }}
        />
      )}

      {/* CAPA 创建对话框 */}
      <Dialog open={capaDialogOpen} onClose={() => setCapaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoFixHigh color="primary" /> 转为 CAPA 纠正措施
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {capaTarget && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#FEF2F2', borderRadius: 2, border: '1px solid #FECACA' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, color: '#EF4444' }}>
                不合格品: {capaTarget.itemNo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {capaTarget.materialName} ({capaTarget.materialCode}) · 缺陷: {capaTarget.defectDescription}
              </Typography>
            </Paper>
          )}
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>选择 CAPA 模板</Typography>
          <Stack spacing={1}>
            {[
              { key: '8d', label: '8D 问题解决法', desc: '完整 8D 流程：D1-D8 各阶段记录' },
              { key: '5why', label: '5 Why 分析', desc: '根本原因五问法' },
              { key: 'standard', label: '标准纠正措施', desc: '描述问题 → 纠正 → 预防 → 验证' },
              { key: 'quick', label: '快速整改', desc: '直接进入纠正措施并验证' },
            ].map((tmpl) => (
              <Paper
                key={tmpl.key}
                data-testid={`capa-template-${tmpl.key}`}
                onClick={() => {
                  if (capaTarget) {
                    handleGenerateCapa(capaTarget, tmpl.label);
                    setCapaDialogOpen(false);
                    setSnackbar({ open: true, msg: `已按「${tmpl.label}」模板创建 CAPA` });
                  }
                }}
                sx={{
                  p: 1.5, borderRadius: 2, cursor: 'pointer',
                  bgcolor: '#F8FAFC', border: '1px solid #E2E8F0',
                  '&:hover': { bgcolor: '#EFF6FF', borderColor: '#93C5FD' },
                }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1E293B' }}>{tmpl.label}</Typography>
                <Typography variant="caption" color="text.secondary">{tmpl.desc}</Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCapaDialogOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3500}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UnqualifiedList;
