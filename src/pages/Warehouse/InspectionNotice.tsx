/**
 * 报检单管理 —— 仓储物流模块
 * 流转逻辑：仓库报检 → 质量检验 → 合格(生成入库单) / 不合格(进入不合格品处理)
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Chip, Typography, Stack, Button, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  Grid, MenuItem as MuiMenuItem, Select, FormControl, InputLabel,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Alert, Divider, Stepper, Step, StepLabel, StepContent,
  RadioGroup, FormControlLabel, Radio, Tooltip, IconButton,
  Snackbar,
} from '@mui/material';
import {
  Add, OpenInNew, CheckCircle, Cancel, Info, Assignment,
  ArrowForward, VerifiedUser, Warning, Inventory,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge, FlowTracker } from '@/components/common';
import { useFlowStore } from '@/stores/flowStore';
import { useWarehouseMasterStore, selectWarehousesByOrg } from '@/stores/warehouseMasterStore';
import { useOrgStore } from '@/stores/orgStore';
import type { InspectionNotice } from '@/types';
import { formatDate } from '@/utils/format';

// ── 状态映射 ──────────────────────────────────────────────────
const statusMap: Record<string, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  pending:    { label: '待报检', color: 'default' },
  inspecting: { label: '检验中', color: 'info' },
  passed:     { label: '检验合格', color: 'success' },
  failed:     { label: '检验不合格', color: 'error' },
  partial:    { label: '部分合格', color: 'warning' },
};

const sourceTypeMap: Record<string, string> = {
  purchase:   '采购入库',
  production: '生产成品',
  return:     '客户退货',
};

// ── 流程说明卡 ──────────────────────────────────────────────
const FlowGuide: React.FC = () => (
  <Paper sx={{ mb: 3, p: 2.5, borderRadius: 3, border: '1px solid #EFF6FF', bgcolor: '#F8FBFF' }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1D4ED8', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Info fontSize="small" /> 仓储报检流程说明
    </Typography>
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
      {[
        { step: '1', label: '仓库新建报检单', icon: <VerifiedUser sx={{ fontSize: 16 }} />, color: '#6366F1' },
        { step: '→', label: '', icon: <ArrowForward sx={{ fontSize: 14, color: '#94A3B8' }} />, color: 'transparent' },
        { step: '2', label: '质量创建检验任务', icon: <Assignment sx={{ fontSize: 16 }} />, color: '#F59E0B' },
        { step: '→', label: '', icon: <ArrowForward sx={{ fontSize: 14, color: '#94A3B8' }} />, color: 'transparent' },
        { step: '3a', label: '合格 → 仓库确认入库', icon: <CheckCircle sx={{ fontSize: 16 }} />, color: '#10B981' },
        { step: '/', label: '', icon: null, color: 'transparent' },
        { step: '3b', label: '不合格 → 质量处理（退货/让步/折价/隔离）', icon: <Warning sx={{ fontSize: 16 }} />, color: '#EF4444' },
      ].map((item, idx) =>
        item.label ? (
          <Chip
            key={idx}
            icon={item.icon || undefined}
            label={`${item.step}. ${item.label}`}
            size="small"
            sx={{
              bgcolor: `${item.color}18`,
              color: item.color,
              border: `1px solid ${item.color}30`,
              fontWeight: 600,
              '& .MuiChip-icon': { color: item.color },
            }}
          />
        ) : (
          <Box key={idx} sx={{ display: 'flex', alignItems: 'center' }}>
            {item.icon}
          </Box>
        )
      )}
    </Stack>
  </Paper>
);

// ── 新建报检单弹窗 ────────────────────────────────────────────
const NewNoticeDialog: React.FC<{ open: boolean; onClose: () => void; onSubmit: () => void }> = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    sourceType: 'purchase',
    sourceNo: '',
    materialCode: '',
    materialName: '',
    specification: '',
    unit: '件',
    noticeQty: '',
    batchNo: '',
    warehouseName: '',
    warehouseId: '',
    reportedBy: '',
    remarks: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const warehouses = useWarehouseMasterStore(s => s.warehouses);
  const currentOrgId = useOrgStore(s => s.currentOrgId);
  const visibleWarehouses = warehouses.filter(selectWarehousesByOrg(currentOrgId));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VerifiedUser color="primary" /> 新建报检单
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          仓库报检后，将自动通知质量部门创建检验任务。检验结果将决定后续流转方向。
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>来源类型</InputLabel>
              <Select value={form.sourceType} label="来源类型"
                onChange={(e) => setForm(f => ({ ...f, sourceType: e.target.value }))}>
                <MuiMenuItem value="purchase">采购入库</MuiMenuItem>
                <MuiMenuItem value="production">生产成品</MuiMenuItem>
                <MuiMenuItem value="return">客户退货</MuiMenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="来源单号（采购订单/工单号）"
              value={form.sourceNo} onChange={set('sourceNo')} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="物料编码 *"
              value={form.materialCode} onChange={set('materialCode')}
              helperText="统一物料编码，用于关联采购/生产/质量" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="物料名称 *"
              value={form.materialName} onChange={set('materialName')} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="规格型号"
              value={form.specification} onChange={set('specification')} />
          </Grid>
          <Grid item xs={3}>
            <TextField fullWidth size="small" label="报检数量 *" type="number"
              value={form.noticeQty} onChange={set('noticeQty')} />
          </Grid>
          <Grid item xs={3}>
            <FormControl fullWidth size="small">
              <InputLabel>单位</InputLabel>
              <Select value={form.unit} label="单位"
                onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}>
                {['件', 'kg', '吨', '米', '卷', '批', '箱'].map(u => (
                  <MuiMenuItem key={u} value={u}>{u}</MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="批次号"
              value={form.batchNo} onChange={set('batchNo')} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>存放仓库</InputLabel>
              <Select label="存放仓库" value={form.warehouseId || visibleWarehouses[0]?.id || ''}
                onChange={(e) => {
                  const w = visibleWarehouses.find(x => x.id === e.target.value);
                  setForm(f => ({ ...f, warehouseId: e.target.value, warehouseName: w?.name || '' }));
                }}>
                {visibleWarehouses.map(w => (<MuiMenuItem key={w.id} value={w.id}>{w.name}</MuiMenuItem>))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" label="报检人"
              value={form.reportedBy} onChange={set('reportedBy')} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="备注" multiline rows={2}
              value={form.remarks} onChange={set('remarks')} />
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" onClick={() => { onClose(); alert('报检单已暂存！（演示模式）'); }}>暂存</Button>
        <Button variant="contained" startIcon={<VerifiedUser />} onClick={onSubmit}>
          提交报检
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 检验结果处理弹窗 ──────────────────────────────────────────
type DisposalOption = 'return' | 'concession' | 'discount' | 'isolate' | 'other';

const InspectionResultDialog: React.FC<{
  open: boolean;
  notice: InspectionNotice | null;
  onClose: () => void;
  onConfirmInbound: () => void;
  onDispose: (method: DisposalOption) => void;
}> = ({ open, notice, onClose, onConfirmInbound, onDispose }) => {
  const [result, setResult] = useState<'passed' | 'failed' | 'partial'>('passed');
  const [disposal, setDisposal] = useState<DisposalOption>('return');
  const [remark, setRemark] = useState('');

  if (!notice) return null;

  const isPassed = result === 'passed';
  const isFailed = result === 'failed';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>处理报检结果</DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {/* 报检单信息 */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#F8FAFC', borderRadius: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ gap: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">报检单号</Typography>
              <Typography variant="body2" fontWeight={600} fontFamily="monospace">{notice.noticeNo}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">物料</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Chip label={notice.materialCode} size="small"
                  sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem' }} />
                <Typography variant="caption">{notice.materialName}</Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">数量</Typography>
              <Typography variant="body2" fontWeight={600}>{notice.noticeQty} {notice.unit}</Typography>
            </Box>
          </Stack>
        </Paper>

        {/* 质检结论 */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>质检结论</Typography>
        <RadioGroup row value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
          <FormControlLabel value="passed" control={<Radio color="success" />} label="合格" />
          <FormControlLabel value="partial" control={<Radio color="warning" />} label="部分合格" />
          <FormControlLabel value="failed" control={<Radio color="error" />} label="不合格" />
        </RadioGroup>

        {/* 合格：显示入库确认提示 */}
        {isPassed && (
          <Alert severity="success" sx={{ mt: 2 }}>
            检验合格，点击"确认入库"将生成入库单，由仓库完成收货上架。
          </Alert>
        )}

        {/* 不合格：选择处置方式 */}
        {(isFailed || result === 'partial') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              处置方式 <Typography component="span" variant="caption" color="error">（不合格处理）</Typography>
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>选择处置方式</InputLabel>
              <Select value={disposal} label="选择处置方式"
                onChange={(e) => setDisposal(e.target.value as DisposalOption)}>
                <MuiMenuItem value="return">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="退货" size="small" sx={{ bgcolor: '#FEE2E2', color: '#DC2626' }} />
                    <Typography variant="body2">退还给供应商，发起退货流程</Typography>
                  </Stack>
                </MuiMenuItem>
                <MuiMenuItem value="concession">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="让步接收" size="small" sx={{ bgcolor: '#FEF3C7', color: '#D97706' }} />
                    <Typography variant="body2">质量认可后仍按原价入库使用</Typography>
                  </Stack>
                </MuiMenuItem>
                <MuiMenuItem value="discount">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="折价入库" size="small" sx={{ bgcolor: '#F3E8FF', color: '#7C3AED' }} />
                    <Typography variant="body2">协商降价后入库，保留索赔权</Typography>
                  </Stack>
                </MuiMenuItem>
                <MuiMenuItem value="isolate">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="隔离" size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1' }} />
                    <Typography variant="body2">放入隔离区，等待进一步处理决策</Typography>
                  </Stack>
                </MuiMenuItem>
                <MuiMenuItem value="other">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="其他" size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569' }} />
                    <Typography variant="body2">其他处理方式，备注说明</Typography>
                  </Stack>
                </MuiMenuItem>
              </Select>
            </FormControl>
            <Alert severity="warning">
              {disposal === 'return' && '将向供应商发起退货申请，并关联到对应采购订单。'}
              {disposal === 'concession' && '需质量负责人签字确认后，生成让步接收入库单。'}
              {disposal === 'discount' && '需采购与财务协同，确认折价金额后入库并自动生成差价通知单。'}
              {disposal === 'isolate' && '物料将移入隔离仓位，等待质量委员会决议，期间不可使用。'}
              {disposal === 'other' && '请在备注中详细说明处理方式，质量主管审核后执行。'}
            </Alert>
          </Box>
        )}

        <TextField
          fullWidth size="small" label="备注说明" multiline rows={2}
          value={remark} onChange={(e) => setRemark(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="outlined" onClick={() => { onClose(); alert('处置结果已暂存！（演示模式）'); }}>暂存</Button>
        {isPassed ? (
          <Button variant="contained" color="success" startIcon={<Inventory />}
            onClick={onConfirmInbound}>
            确认入库（生成入库单）
          </Button>
        ) : (
          <Button variant="contained" color="warning" startIcon={<Warning />}
            onClick={() => onDispose(disposal)}>
            提交处置方案
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ── 主页面 ────────────────────────────────────────────────────
const InspectionNoticeWarehouse: React.FC = () => {
  const { inspectionNotices } = useFlowStore();
  const navigate = useNavigate();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [resultDialog, setResultDialog] = useState<InspectionNotice | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: 'success' | 'warning' }>({
    open: false, msg: '', severity: 'success',
  });

  const columns: ColumnDef<InspectionNotice, unknown>[] = useMemo(() => [
    {
      accessorKey: 'noticeNo', header: '报检单号',
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ color: '#6366F1', fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer' }}
          onClick={() => navigate(`/warehouse/inspection-notice/${row.original.id}`)}>
          {row.original.noticeNo}
        </Typography>
      ),
    },
    {
      accessorKey: 'sourceType', header: '来源',
      cell: ({ row }) => (
        <Chip label={sourceTypeMap[row.original.sourceType]} size="small"
          sx={{ bgcolor: '#F1F5F9', color: '#475569', fontSize: '0.75rem' }} />
      ),
    },
    { accessorKey: 'sourceNo', header: '来源单号' },
    {
      accessorKey: 'materialCode', header: '物料',
      cell: ({ row }) => (
        <Stack spacing={0.3}>
          <Chip label={row.original.materialCode} size="small"
            sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontFamily: 'monospace', fontSize: '0.7rem' }} />
          <Typography variant="caption" color="text.secondary">{row.original.materialName}</Typography>
        </Stack>
      ),
    },
    {
      accessorKey: 'noticeQty', header: '报检数量',
      cell: ({ row }) => (
        <Typography variant="body2" fontWeight={600}>
          {row.original.noticeQty} <Typography component="span" variant="caption" color="text.secondary">{row.original.unit}</Typography>
        </Typography>
      ),
    },
    { accessorKey: 'batchNo', header: '批次号' },
    {
      accessorKey: 'status', header: '状态',
      cell: ({ row }) => {
        const s = statusMap[row.original.status];
        return <Chip label={s?.label} size="small" color={s?.color} sx={{ fontWeight: 600, fontSize: '0.75rem' }} />;
      },
    },
    {
      accessorKey: 'warehouseName', header: '仓库',
      cell: ({ row }) => <Typography variant="caption">{row.original.warehouseName}</Typography>,
    },
    {
      id: 'actions', header: '操作',
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === 'inspecting') {
          return (
            <Button size="small" variant="outlined" startIcon={<CheckCircle />}
              onClick={() => setResultDialog(row.original)}>
              处理结果
            </Button>
          );
        }
        if (status === 'passed') {
          return (
            <Button size="small" variant="contained" color="success" startIcon={<Inventory />}
              onClick={() => navigate('/warehouse/inbound')}>
              查看入库单
            </Button>
          );
        }
        if (status === 'failed') {
          return (
            <Button size="small" variant="outlined" color="error" startIcon={<Cancel />}
              onClick={() => navigate('/quality/unqualified')}>
              查看不合格品
            </Button>
          );
        }
        return null;
      },
    },
  ], [navigate]);

  const filterFields = [
    { name: 'noticeNo', label: '报检单号', type: 'text' as const },
    {
      name: 'sourceType', label: '来源类型', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'purchase', label: '采购入库' },
        { value: 'production', label: '生产成品' },
        { value: 'return', label: '客户退货' },
      ],
    },
    {
      name: 'status', label: '状态', type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        ...Object.entries(statusMap).map(([v, { label }]) => ({ value: v, label })),
      ],
    },
  ];

  const filteredData = useMemo(() => {
    let data = [...inspectionNotices];
    if (filterData.noticeNo) data = data.filter(d => d.noticeNo.includes(filterData.noticeNo as string));
    if (filterData.sourceType) data = data.filter(d => d.sourceType === filterData.sourceType);
    if (filterData.status) data = data.filter(d => d.status === filterData.status);
    return data;
  }, [filterData]);

  // 统计卡
  const stats = useMemo(() => ({
    pending:    inspectionNotices.filter(n => n.status === 'pending').length,
    inspecting: inspectionNotices.filter(n => n.status === 'inspecting').length,
    passed:     inspectionNotices.filter(n => n.status === 'passed').length,
    failed:     inspectionNotices.filter(n => n.status === 'failed').length,
  }), []);

  return (
    <PageWrapper title="报检单管理" actions={<FlowTracker module="inspection-notice" currentStatus="in_accepted" />}>
      {/* 流程说明 */}
      <FlowGuide />

      {/* 统计卡 */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '待报检', count: stats.pending, color: '#94A3B8', bg: '#F8FAFC' },
          { label: '检验中', count: stats.inspecting, color: '#3B82F6', bg: '#EFF6FF' },
          { label: '已合格', count: stats.passed, color: '#10B981', bg: '#ECFDF5' },
          { label: '不合格', count: stats.failed, color: '#EF4444', bg: '#FEF2F2' },
        ].map(({ label, count, color, bg }) => (
          <Paper key={label} sx={{ flex: 1, px: 3, py: 2, borderRadius: 3, bgcolor: bg, border: `1px solid ${color}25` }}>
            <Typography variant="h5" fontWeight={700} sx={{ color }}>{count}</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>{label}</Typography>
          </Paper>
        ))}
      </Stack>

      {/* 操作栏 */}
      <ActionBar>
        <Button variant="contained" startIcon={<Add />} onClick={() => setNewOpen(true)}>
          新建报检单
        </Button>
        <Button variant="outlined" startIcon={<Assignment />}
          onClick={() => navigate('/quality/inspection')}>
          查看质量检验任务
        </Button>
      </ActionBar>

      <FilterBar fields={filterFields} onFilter={setFilterData} />

      <DataTable
        data={filteredData}
        columns={columns}
        onView={(row) => navigate(`/warehouse/inspection-notice/${row.id}`)}
      />

      {/* 弹窗 */}
      <NewNoticeDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={() => {
          setNewOpen(false);
          setSnackbar({ open: true, msg: '报检单已提交，已通知质量部门创建检验任务', severity: 'success' });
        }}
      />
      <InspectionResultDialog
        open={!!resultDialog}
        notice={resultDialog}
        onClose={() => setResultDialog(null)}
        onConfirmInbound={() => {
          setResultDialog(null);
          setSnackbar({ open: true, msg: '检验合格！入库单已生成，请前往"采购入库"确认收货', severity: 'success' });
        }}
        onDispose={(method) => {
          setResultDialog(null);
          const msgs: Record<string, string> = {
            return: '已发起退货申请，供应商将收到退货通知',
            concession: '让步接收申请已提交，等待质量负责人审批',
            discount: '折价入库申请已提交，采购与财务将跟进差价协商',
            isolate: '物料已移入隔离仓位，等待质量委员会决议',
            other: '处置方案已提交，等待质量主管审核',
          };
          setSnackbar({ open: true, msg: msgs[method] || '处置方案已提交', severity: 'warning' });
          if (method === 'return' || method === 'isolate') {
            setTimeout(() => navigate('/quality/unqualified'), 1500);
          }
        }}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default InspectionNoticeWarehouse;
