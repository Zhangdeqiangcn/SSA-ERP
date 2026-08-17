import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, LinearProgress, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, MenuItem, Alert,
  Grid,
} from '@mui/material';
import { Add, Visibility, PlayArrow, Close, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common';
import { useProductionStore } from '@/stores/productionStore';
import { useNumberingStore } from '@/stores/numberingStore';
import { useOrgStore, useCurrentOrg } from '@/stores/orgStore';
import { useDataPermissionStore, passDataPermission } from '@/stores/dataPermissionStore';
import { WorkOrder, WorkOrderStatus } from '@/types/production';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: '草稿',
  released: '已下达',
  in_progress: '生产中',
  completed: '已完成',
  closed: '已关闭',
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  draft: '#94A3B8',
  released: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  closed: '#6366F1',
};

const PRIORITY_LABELS: Record<string, string> = { urgent: '紧急', high: '高', normal: '普通', low: '低' };
const PRIORITY_COLORS: Record<string, string> = { urgent: '#EF4444', high: '#F59E0B', normal: '#10B981', low: '#94A3B8' };

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const WorkOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState<'all' | WorkOrderStatus>('all');
  const { workOrders, addWorkOrder } = useProductionStore();
  const nextNo = useNumberingStore((s) => s.nextNo);
  const currentOrgId = useOrgStore((s) => s.currentOrgId);
  const currentOrg = useCurrentOrg();
  const { enabled, mode, modules } = useDataPermissionStore();

  const [open, setOpen] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState('1');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [workshop, setWorkshop] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState(todayStr());
  const [plannedEndDate, setPlannedEndDate] = useState(todayStr());
  const [status, setStatus] = useState<WorkOrderStatus>('released');

  const openCreate = () => {
    setOrderNo(nextNo('WO'));
    setProductCode(''); setProductName(''); setPlannedQuantity('1');
    setPriority('normal'); setWorkshop(''); setSupervisor('');
    setPlannedStartDate(todayStr()); setPlannedEndDate(todayStr());
    setStatus('released');
    setOpen(true);
  };

  const handleSave = () => {
    const ts = nowStr();
    const wo: WorkOrder = {
      id: `wo-${Date.now()}`,
      orderNo,
      status,
      orgId: currentOrgId,
      productCode,
      productName,
      bomId: '',
      bomNo: '',
      routeId: '',
      routeNo: '',
      plannedQuantity: Number(plannedQuantity) || 0,
      completedQuantity: 0,
      scrapQuantity: 0,
      plannedStartDate,
      plannedEndDate,
      priority,
      workshop,
      supervisor,
      createdAt: ts,
      updatedAt: ts,
      createdBy: '系统',
      updatedBy: '系统',
    };
    addWorkOrder(wo);
    setOpen(false);
  };

  const statusFiltered = tabValue === 'all' ? workOrders : workOrders.filter(w => w.status === tabValue);
  const filtered = statusFiltered.filter(w =>
    passDataPermission(w.orgId, currentOrgId, enabled, mode, 'production', modules)
  );

  const getProgress = (wo: WorkOrder) => {
    if (!wo.progress || wo.progress.length === 0) return 0;
    const completed = wo.progress.filter(p => p.status === 'completed').length;
    return Math.round((completed / wo.progress.length) * 100);
  };

  // 导入映射：把表头→值映射为 WorkOrder 字段（表头即各列 header 文本）
  const mapImportRow = (r: Record<string, string>, _headers: string[]): WorkOrder => {
    const now = nowStr();
    const prioMap: Record<string, WorkOrder['priority']> = { 紧急: 'urgent', 高: 'high', 普通: 'normal', 低: 'low' };
    const statusMap: Record<string, WorkOrderStatus> = {
      草稿: 'draft', 已下达: 'released', 生产中: 'in_progress', 已完成: 'completed', 已关闭: 'closed',
    };
    const planDate = (r['计划日期'] || '').split('~')[0].trim() || todayStr();
    return {
      id: `wo-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNo: r['工单编号'] || `WO-IMP-${Date.now()}`,
      status: statusMap[r['状态']] || 'released',
      orgId: currentOrgId,
      productCode: r['产品编码'] || '',
      productName: r['产品'] || r['产品名称'] || '',
      bomId: '', bomNo: '', routeId: '', routeNo: '',
      plannedQuantity: Number(r['计划数量']) || 0,
      completedQuantity: Number(r['完成数量']) || 0,
      scrapQuantity: 0,
      plannedStartDate: planDate,
      plannedEndDate: r['计划结束日期'] || planDate,
      priority: prioMap[r['优先级']] || 'normal',
      workshop: r['车间'] || '',
      supervisor: '',
      createdAt: now, updatedAt: now, createdBy: '系统', updatedBy: '系统',
    };
  };

  const columns: ColumnDef<WorkOrder, unknown>[] = [
    {
      id: 'orderNo',
      header: '工单编号',
      accessorFn: (row) => row.orderNo,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace', color: '#3B82F6' }}>
          {row.original.orderNo}
        </Typography>
      ),
    },
    {
      id: 'product',
      header: '产品',
      accessorFn: (row) => row.productName,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.original.productName}</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>{row.original.productCode}</Typography>
        </Box>
      ),
    },
    {
      id: 'priority',
      header: '优先级',
      accessorFn: (row) => row.priority,
      cell: ({ row }) => (
        <Chip
          label={PRIORITY_LABELS[row.original.priority]}
          size="small"
          sx={{ bgcolor: PRIORITY_COLORS[row.original.priority] + '15', color: PRIORITY_COLORS[row.original.priority], fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'plannedQuantity',
      header: '计划数量',
      accessorFn: (row) => row.plannedQuantity,
      cell: ({ row }) => <Typography variant="body2">{row.original.plannedQuantity}</Typography>,
    },
    {
      id: 'completedQuantity',
      header: '完成数量',
      accessorFn: (row) => row.completedQuantity,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: row.original.completedQuantity > 0 ? '#10B981' : '#64748B' }}>
          {row.original.completedQuantity}
        </Typography>
      ),
    },
    {
      id: 'planDate',
      header: '计划日期',
      accessorFn: (row) => row.plannedStartDate,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2">{row.original.plannedStartDate}</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>~ {row.original.plannedEndDate}</Typography>
        </Box>
      ),
    },
    {
      id: 'workshop',
      header: '车间',
      accessorFn: (row) => row.workshop,
      cell: ({ row }) => <Typography variant="body2">{row.original.workshop}</Typography>,
    },
    {
      id: 'progress',
      header: '进度',
      accessorFn: (row) => getProgress(row.original),
      cell: ({ row }) => {
        const progress = getProgress(row.original);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS[row.original.status], borderRadius: 3 } }}
            />
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, minWidth: 30 }}>{progress}%</Typography>
          </Box>
        );
      },
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Chip
          label={STATUS_LABELS[row.original.status]}
          size="small"
          sx={{ bgcolor: STATUS_COLORS[row.original.status] + '15', color: STATUS_COLORS[row.original.status], fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => navigate(`/production/orders/${row.original.id}`)}>
            <Visibility fontSize="small" />
          </IconButton>
          {row.original.status === 'released' && (
            <IconButton size="small" onClick={() => navigate(`/production/orders/${row.original.id}`)}>
              <PlayArrow fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>生产工单</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新建工单</Button>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          data-testid="wo-visible-count"
          label={`可见工单：${filtered.length}`}
          size="small"
          sx={{ bgcolor: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}
        />
        {enabled && mode === 'current-org' && modules.production && (
          <Alert
            data-testid="wo-org-banner"
            severity="info"
            sx={{ py: 0, flex: 1, minWidth: 240 }}
          >
            数据权限（仅当前组织）：仅显示归属「{currentOrg?.name ?? currentOrgId}」的工单，遗留数据仍可见
          </Alert>
        )}
      </Box>

      {/* ── 嵌入式分析卡片 ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {/* 本月工单数 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#FFF7ED' }}>
            <Typography variant="caption" color="text.secondary">本月工单数</Typography>
            <Typography variant="h5" fontWeight={700} color="#EA580C">
              {filtered.filter(w => {
                const now = new Date().toISOString().slice(0, 7);
                return w.createdAt?.startsWith(now) || w.plannedStartDate?.startsWith(now);
              }).length}
            </Typography>
          </Paper>
        </Grid>

        {/* 完工率环形图 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>完工率</Typography>
              <TrendingUp sx={{ fontSize: 14, color: '#10B981' }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <svg viewBox="0 0 36 36" width="60" height="60">
                {(() => {
                  const completed = workOrders.filter(w => w.status === 'completed').length;
                  const total = workOrders.length || 1;
                  const rate = completed / total;
                  const dasharray = 2 * Math.PI * 15.9;
                  const dashoffset = dasharray * (1 - rate);
                  return (
                    <>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10B981" strokeWidth="3"
                        strokeDasharray={dasharray} strokeDashoffset={dashoffset}
                        strokeLinecap="round" transform="rotate(-90 18 18)" />
                      <text x="18" y="19" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1E293B">
                        {Math.round(rate * 100)}%
                      </text>
                    </>
                  );
                })()}
              </svg>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {workOrders.filter(w => w.status === 'completed').length} / {workOrders.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">已完成 / 总计</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 状态分布 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>状态分布</Typography>
            {Object.entries(STATUS_LABELS).map(([s, label]) => {
              const count = workOrders.filter(w => w.status === s).length;
              const maxCount = Math.max(...Object.keys(STATUS_LABELS).map(k => workOrders.filter(w => w.status === k).length), 1);
              return (
                <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                  <Typography variant="caption" sx={{ minWidth: 40, fontSize: '0.65rem' }}>{label}</Typography>
                  <Box sx={{ flex: 1, height: 10, bgcolor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%', borderRadius: 5,
                      width: `${(count / maxCount) * 100}%`,
                      bgcolor: STATUS_COLORS[s as WorkOrderStatus],
                      transition: 'width 0.5s',
                      minWidth: count > 0 ? 8 : 0,
                    }} />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 16, textAlign: 'right', fontSize: '0.65rem', fontWeight: 600 }}>
                    {count}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>

      {/* 统计 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_LABELS).map(([s, label]) => {
          const count = workOrders.filter(w => w.status === s).length;
          return (
            <Paper key={s} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, minWidth: 80, border: `1px solid ${STATUS_COLORS[s as WorkOrderStatus]}20` }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: STATUS_COLORS[s as WorkOrderStatus] }}>{count}</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>{label}</Typography>
            </Paper>
          );
        })}
      </Box>

      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: '1px solid rgba(226,232,240,0.8)', px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 } }}
        >
          <Tab value="all" label="全部" />
          {(Object.keys(STATUS_LABELS) as WorkOrderStatus[]).map(s => (
            <Tab key={s} value={s} label={STATUS_LABELS[s]} />
          ))}
        </Tabs>

        <DataTable<WorkOrder>
          data={filtered}
          columns={columns}
          enableRowSelection={false}
          enablePagination={true}
          enableSorting={true}
          enableColumnFilter={true}
          enableBlockSelect={true}
          enableExport={true}
          exportFormat="xlsx"
          enableImport={true}
          onImport={(rows, headers) => rows.forEach(r => addWorkOrder(mapImportRow(r, headers)))}
          columnConfigKey="production-workorder-list"
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            新建生产工单
            <IconButton onClick={() => setOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="工单编号" value={orderNo} onChange={e => setOrderNo(e.target.value)} data-testid="wo-no" />
              <TextField fullWidth label="产品名称" value={productName} onChange={e => setProductName(e.target.value)} data-testid="wo-product" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="产品编码" value={productCode} onChange={e => setProductCode(e.target.value)} />
              <TextField fullWidth label="计划数量" type="number" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select fullWidth label="优先级" value={priority} onChange={e => setPriority(e.target.value as any)}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField select fullWidth label="状态" value={status} onChange={e => setStatus(e.target.value as WorkOrderStatus)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="车间" value={workshop} onChange={e => setWorkshop(e.target.value)} />
              <TextField fullWidth label="主管" value={supervisor} onChange={e => setSupervisor(e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="计划开始" type="date" value={plannedStartDate}
                onChange={e => setPlannedStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField fullWidth label="计划结束" type="date" value={plannedEndDate}
                onChange={e => setPlannedEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={!productName.trim() || Number(plannedQuantity) <= 0}
            data-testid="wo-save">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrderList;
