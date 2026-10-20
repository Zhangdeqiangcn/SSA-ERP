import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, LinearProgress, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, MenuItem, Alert,
  Grid,
} from '@mui/material';
import { Add, Visibility, PlayArrow, Close, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge, FilterBar } from '@/components/common';
import { useProductionStore } from '@/stores/productionStore';
import { notifyError } from '@/utils/notify';
import { useNumberingStore } from '@/stores/numberingStore';
import { useOrgStore, useCurrentOrg } from '@/stores/orgStore';
import { useDataPermissionStore, passDataPermission } from '@/stores/dataPermissionStore';
import { WorkOrder, WorkOrderStatus } from '@/types/production';
import { applyColumnFilters } from '@/utils/listSearch';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: '草稿',
  released: '已下达',
  in_progress: '生产中',
  completed: '已完成',
  closed: '已关闭',
};

// 状态 → 中央 StatusBadge key（draft/released/completed/closed 复用通用 key，仅 in_progress 用专属 key）
const WO_STATUS_KEY: Record<WorkOrderStatus, string> = {
  draft: 'draft', released: 'released', in_progress: 'wo_in_progress', completed: 'completed', closed: 'closed',
};
// 状态 → 主题令牌（供进度条/统计卡等非 Chip 场景使用，杜绝 '#hex'）
const WO_STATUS_TOKEN: Record<WorkOrderStatus, string> = {
  draft: 'grey.400', released: 'primary.main', in_progress: 'warning.main', completed: 'success.main', closed: 'secondary.main',
};

const PRIORITY_LABELS: Record<string, string> = { urgent: '紧急', high: '高', normal: '普通', low: '低' };

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
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

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
  // ★ V3.62.0 边界①：折旧与制造费用（工单 manual 录入，完工结转含入 5001）
  const [depreciationCost, setDepreciationCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');

  const openCreate = () => {
    setOrderNo(nextNo('WO'));
    setProductCode(''); setProductName(''); setPlannedQuantity('1');
    setPriority('normal'); setWorkshop(''); setSupervisor('');
    setPlannedStartDate(todayStr()); setPlannedEndDate(todayStr());
    setStatus('released');
    setDepreciationCost(''); setOverheadCost('');
    setOpen(true);
  };

  const handleSave = () => {
    // 与后端 REQUIRED_CORE_FIELDS（work_orders: productCode + plannedQuantity）对齐：提交前拦截空值
    if (!productCode.trim()) {
      notifyError('请填写「生产物料（产品编码）」后再提交');
      return;
    }
    if (!plannedQuantity || Number(plannedQuantity) <= 0) {
      notifyError('请填写「计划数量」后再提交');
      return;
    }
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
      // ★ V3.62.0 边界①：折旧与制造费用录入
      depreciationCost: Number(depreciationCost) || 0,
      overheadCost: Number(overheadCost) || 0,
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
      accessorKey: 'orderNo',
      header: '工单编号',
      accessorFn: (row) => row.orderNo,
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace', color: '#3B82F6' }}>
          {row.original.orderNo}
        </Typography>
      ),
    },
    {
      id: 'product',
      accessorKey: 'productName',
      header: '产品',
      accessorFn: (row) => row.productName,
      meta: { searchable: true },
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.original.productName}</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>{row.original.productCode}</Typography>
        </Box>
      ),
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: '优先级',
      accessorFn: (row) => row.priority,
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: (Object.keys(PRIORITY_LABELS) as WorkOrder['priority'][]).map((k) => ({ value: k, label: PRIORITY_LABELS[k] })),
      },
      cell: ({ row }) => <StatusBadge status={row.original.priority} />,
    },
    {
      id: 'plannedQuantity',
      accessorKey: 'plannedQuantity',
      header: '计划数量',
      accessorFn: (row) => row.plannedQuantity,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.plannedQuantity}</Typography>,
    },
    {
      id: 'completedQuantity',
      accessorKey: 'completedQuantity',
      header: '完成数量',
      accessorFn: (row) => row.completedQuantity,
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: row.original.completedQuantity > 0 ? '#10B981' : '#64748B' }}>
          {row.original.completedQuantity}
        </Typography>
      ),
    },
    {
      id: 'planDate',
      accessorKey: 'plannedStartDate',
      header: '计划日期',
      accessorFn: (row) => row.plannedStartDate,
      meta: { searchable: true },
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2">{row.original.plannedStartDate}</Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>~ {row.original.plannedEndDate}</Typography>
        </Box>
      ),
    },
    {
      id: 'workshop',
      accessorKey: 'workshop',
      header: '车间',
      accessorFn: (row) => row.workshop,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.workshop}</Typography>,
    },
    {
      id: 'progress',
      header: '进度',
      accessorFn: (row) => getProgress(row),
      cell: ({ row }) => {
        const progress = getProgress(row.original);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: WO_STATUS_TOKEN[row.original.status], borderRadius: 3 } }}
            />
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, minWidth: 30 }}>{progress}%</Typography>
          </Box>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: '状态',
      accessorFn: (row) => row.status,
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: (Object.keys(STATUS_LABELS) as WorkOrderStatus[]).map((k) => ({ value: k, label: STATUS_LABELS[k] })),
      },
      cell: ({ row }) => <StatusBadge status={WO_STATUS_KEY[row.original.status]} />,
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

  // 列表检索：在「状态 Tab + 字段权限」已过滤后的数据上，再用通用列检索覆盖全部声明了 meta.searchable 的列（工单编号/产品/优先级/数量/计划日期/车间/状态），并按字段权限门控
  const filteredData = useMemo(
    () => applyColumnFilters(filtered, columns, filterData, { module: 'production' }),
    [filterData, filtered, columns]
  );

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
                      bgcolor: WO_STATUS_TOKEN[s as WorkOrderStatus],
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
            <Paper key={s} sx={{ px: 2.5, py: 2, borderRadius: 3, flex: 1, minWidth: 80, border: '1px solid', borderColor: WO_STATUS_TOKEN[s as WorkOrderStatus] }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: WO_STATUS_TOKEN[s as WorkOrderStatus] }}>{count}</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>{label}</Typography>
            </Paper>
          );
        })}
      </Box>

      <Paper sx={{ borderRadius: 3 }}>
        <FilterBar columns={columns} module="production" onSearch={setFilterData} listKey="workorder-list" />
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
          data={filteredData}
          columns={columns}
          enableRowSelection={false}
          enablePagination={true}
          enableSorting={true}
          enableColumnFilter={true}
          enableBlockSelect={true}
          enableExport={true}
          exportFormat="xlsx"
          codeColumnId="orderNo"
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
              {/* 与后端 REQUIRED_CORE_FIELDS（work_orders: productCode + plannedQuantity）对齐：两项均必填 */}
              <TextField fullWidth required label="产品编码" value={productCode} onChange={e => setProductCode(e.target.value)} />
              <TextField fullWidth required label="计划数量" type="number" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} />
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
              <TextField fullWidth label="折旧成本" type="number" value={depreciationCost} onChange={e => setDepreciationCost(e.target.value)} />
              <TextField fullWidth label="制造费用" type="number" value={overheadCost} onChange={e => setOverheadCost(e.target.value)} />
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
          {/* 禁用条件同步对齐后端必填：产品编码 / 产品名称 / 计划数量>0 */}
          <Button variant="contained" onClick={handleSave} disabled={!productCode.trim() || !productName.trim() || Number(plannedQuantity) <= 0}
            data-testid="wo-save">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkOrderList;
