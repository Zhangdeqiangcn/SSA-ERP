import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Grid, Paper, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, IconButton, Tooltip, Tab, Tabs,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar,
  Alert, LinearProgress,
} from '@mui/material';
import {
  Add, Visibility, Assignment, Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, FilterBar, StatusBadge } from '@/components/common';
import { useQualityStore } from '@/stores/qualityStore';
import { InspectionStatus, InspectionType, InspectionTask } from '@/types/quality';
import { computeAqlPlan, LEVELS, AQLS } from '@/utils/aql';
import { applyColumnFilters } from '@/utils/listSearch';
import { withRelatedDocNos } from '@/utils/relations/documentRelations';
import { buildRelatedColumns } from '@/components/common/relatedColumns';
import { useEnsureRelatedStores } from '@/utils/relations/useEnsureRelatedStores';

const TYPE_LABELS: Record<InspectionType, string> = {
  incoming: '来料检验',
  process: '过程检验',
  final: '成品检验',
};

// 类型 / 状态展示统一走 StatusBadge（审计报告 P0 整改：删本地 hex 副本）
// 类型：incoming/process/final → insp_ 前缀专属 key
const INSP_TYPE_KEY: Record<InspectionType, string> = {
  incoming: 'insp_incoming', process: 'insp_process', final: 'insp_final',
};
// 状态：pending/in_progress → insp_ 前缀专属 key；passed/failed/conditional_pass 复用通用 key
const INSP_STATUS_KEY: Record<InspectionStatus, string> = {
  pending: 'insp_pending', in_progress: 'insp_in_progress',
  passed: 'passed', failed: 'failed', conditional_pass: 'conditional_pass',
};

const InspectionList: React.FC = () => {
  const navigate = useNavigate();
  useEnsureRelatedStores('inspectionTask');
  const [tabValue, setTabValue] = useState<'all' | InspectionType>('all');
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  const { inspectionTasks, addInspectionTask, inspectionStandards } = useQualityStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [form, setForm] = useState({
    type: 'incoming' as InspectionType,
    materialCode: '',
    materialName: '',
    batchNo: '',
    quantity: 1,
    sampleQuantity: 1,
    aql: 2.5,
    inspectionLevel: 'II',
    vendorName: '',
    assignedTo: '',
    plannedDate: new Date().toISOString().slice(0, 10),
    standardId: '',
  });

  // B9：按批量 + 检验水平 + AQL 自动算抽样方案（GB/T 2828.1）
  const aqlPlan = useMemo(
    () => computeAqlPlan(Number(form.quantity) || 0, form.inspectionLevel, form.aql),
    [form.quantity, form.inspectionLevel, form.aql],
  );

  // 参数变化且方案有效时，自动回填抽样数量
  useEffect(() => {
    if (aqlPlan) {
      setForm((f) => ({ ...f, sampleQuantity: aqlPlan.n }));
    }
  }, [aqlPlan]);

  // 标签页筛选（分类视图）单独保留，检索条件交由 FilterBar + applyColumnFilters 统一处理
  const tabFiltered = useMemo(
    () => inspectionTasks.filter((t) => tabValue === 'all' || t.type === tabValue),
    [inspectionTasks, tabValue]
  );

  const stats = {
    total: inspectionTasks.length,
    pending: inspectionTasks.filter(t => t.status === 'pending').length,
    inProgress: inspectionTasks.filter(t => t.status === 'in_progress').length,
    passed: inspectionTasks.filter(t => t.status === 'passed').length,
    failed: inspectionTasks.filter(t => t.status === 'failed').length,
  };
  const passRate = stats.total > 0
    ? Math.round(((stats.passed) / (stats.passed + stats.failed)) * 100) || 0
    : 0;

  const mapImportRow = (r: Record<string, string>, _headers: string[]): InspectionTask => {
    const now = new Date().toISOString();
    const typeMap: Record<string, InspectionType> = { 来料检验: 'incoming', 过程检验: 'process', 成品检验: 'final' };
    const statusMap: Record<string, InspectionStatus> = { 待检: 'pending', 检验中: 'in_progress', 合格: 'passed', 不合格: 'failed', 条件接收: 'conditional_pass' };
    const qty = Number(r['检验数量']) || 1;
    return {
      id: `it-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskNo: r['任务编号'] || `INSP-IMP-${Date.now()}`,
      type: typeMap[r['检验类型']] || 'incoming',
      status: statusMap[r['状态']] || 'pending',
      materialId: r['物料编码'] || '',
      materialCode: r['物料编码'] || '',
      materialName: r['物料'] || '',
      batchNo: r['批次号'] || '-',
      quantity: qty,
      sampleQuantity: Number(r['抽样数量']) || qty,
      inspectionStandardId: '',
      inspectionStandardName: '',
      assignedTo: r['负责人'] || '质检员',
      plannedDate: r['计划日期'] || '',
      createdAt: now,
      updatedAt: now,
      createdBy: 'admin',
      updatedBy: 'admin',
    };
  };

  const columns: ColumnDef<InspectionTask, unknown>[] = useMemo(() => [
    {
      accessorKey: 'taskNo',
      header: '任务编号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#3B82F6', fontFamily: 'monospace' }}>
          {row.original.taskNo}
        </Typography>
      ),
    },
    {
      accessorKey: 'type',
      header: '检验类型',
      meta: { searchable: true, filterType: 'select', filterOptions: [
        { value: 'incoming', label: '来料检验' },
        { value: 'process', label: '过程检验' },
        { value: 'final', label: '成品检验' },
      ] },
      cell: ({ row }) => <StatusBadge status={INSP_TYPE_KEY[row.original.type]} />,
    },
    {
      accessorKey: 'materialCode',
      header: '物料号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.original.materialCode}</Typography>
      ),
    },
    {
      accessorKey: 'materialName',
      header: '物料名称',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.original.materialName}</Typography>
      ),
    },
    {
      accessorKey: 'batchNo',
      header: '批次号',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.original.batchNo}</Typography>
      ),
    },
    {
      accessorKey: 'vendorName',
      header: '供应商/工单',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2">{row.original.vendorName || row.original.workOrderNo || '-'}</Typography>
      ),
    },
    {
      accessorKey: 'quantity',
      header: '检验数量',
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2">{row.original.quantity} / 抽{row.original.sampleQuantity}</Typography>
      ),
    },
    {
      accessorKey: 'plannedDate',
      header: '计划日期',
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.plannedDate}</Typography>,
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true, filterType: 'select', filterOptions: [
        { value: 'pending', label: '待检' },
        { value: 'in_progress', label: '检验中' },
        { value: 'passed', label: '合格' },
        { value: 'failed', label: '不合格' },
        { value: 'conditional_pass', label: '条件接收' },
      ] },
      cell: ({ row }) => <StatusBadge status={INSP_STATUS_KEY[row.original.status]} />,
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tooltip title="查看详情">
            <IconButton size="small" onClick={() => navigate(`/quality/inspection/${row.original.id}`)}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {(row.original.status === 'pending' || row.original.status === 'in_progress') && (
            <Tooltip title="执行检验">
              <IconButton size="small" onClick={() => navigate(`/quality/inspection/${row.original.id}/execute`)}>
                <Assignment fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    ...(buildRelatedColumns() as ColumnDef<InspectionTask, unknown>[]),
  ], []);

  // 通用列检索：覆盖全部声明了 meta.searchable 的列，并按字段权限门控
  // （置于 columns 声明之后，避免『used before declaration』类型错误）
  const filtered = useMemo(
    () => applyColumnFilters(withRelatedDocNos('inspectionTask', tabFiltered), columns, filterData, { module: 'quality' }),
    [tabFiltered, columns, filterData]
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>质量检验</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          新建检验任务
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: '本月合格率', value: `${passRate}%`, color: '#10B981', sub: `${stats.passed} 批合格 / ${stats.failed} 批不合格` },
          { label: '待检任务', value: stats.pending, color: '#F59E0B', sub: '需安排检验' },
          { label: '检验中', value: stats.inProgress, color: '#3B82F6', sub: '进行中' },
          { label: '本月总检批', value: stats.total, color: '#6366F1', sub: '包含所有类型' },
        ].map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <Paper sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${kpi.color}20` }}>
              <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>{kpi.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: kpi.color, fontSize: '1.875rem' }}>{kpi.value}</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>{kpi.sub}</Typography>
              {kpi.label === '本月合格率' && (
                <LinearProgress
                  variant="determinate"
                  value={passRate}
                  sx={{ mt: 1.5, height: 4, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#10B981', borderRadius: 2 } }}
                />
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 检索条：覆盖全部可搜列，默认显 5 项、其余『更多筛选』展开，按字段权限门控 */}
      <FilterBar columns={columns} module="quality" onSearch={setFilterData} listKey="inspection-list" />

      {/* Tabs */}
      <Paper sx={{ borderRadius: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: '1px solid rgba(226,232,240,0.8)', px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500 } }}
        >
          <Tab value="all" label={`全部 (${inspectionTasks.length})`} />
          <Tab value="incoming" label={`来料检验 (${inspectionTasks.filter(t => t.type === 'incoming').length})`} />
          <Tab value="process" label={`过程检验 (${inspectionTasks.filter(t => t.type === 'process').length})`} />
          <Tab value="final" label={`成品检验 (${inspectionTasks.filter(t => t.type === 'final').length})`} />
        </Tabs>

        <DataTable<InspectionTask>
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
          codeColumnId="taskNo"
          onImport={(rows, headers) => rows.forEach(r => addInspectionTask(mapImportRow(r, headers)))}
          hiddenColumns={['upstreamNo', 'downstreamNo']}
          columnConfigKey="inspection-task-list"
        />
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>新建检验任务</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>检验类型</InputLabel>
              <Select
                value={form.type}
                label="检验类型"
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as InspectionType }))}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="物料编码"
              fullWidth
              value={form.materialCode}
              inputProps={{ 'data-testid': 'inspection-material-code' }}
              onChange={(e) => setForm((f) => ({ ...f, materialCode: e.target.value }))}
            />
            <TextField
              label="物料名称"
              fullWidth
              value={form.materialName}
              inputProps={{ 'data-testid': 'inspection-material-name' }}
              onChange={(e) => setForm((f) => ({ ...f, materialName: e.target.value }))}
            />
            <TextField
              label="批次号"
              fullWidth
              value={form.batchNo}
              onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="检验数量"
                type="number"
                fullWidth
                value={form.quantity}
                inputProps={{ 'data-testid': 'inspection-quantity' }}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
              <TextField
                label="抽样数量"
                type="number"
                fullWidth
                value={form.sampleQuantity}
                onChange={(e) => setForm((f) => ({ ...f, sampleQuantity: Number(e.target.value) }))}
                inputProps={{ 'data-testid': 'inspection-sample-size' }}
                helperText="由 AQL 抽样方案自动回填，可手动调整"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>检验水平</InputLabel>
                <Select
                  value={form.inspectionLevel}
                  label="检验水平"
                  data-testid="inspection-aql-level"
                  onChange={(e) => setForm((f) => ({ ...f, inspectionLevel: e.target.value }))}
                >
                  {LEVELS.map((lv) => (
                    <MenuItem key={lv} value={lv}>{lv}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>AQL（接收质量限 %）</InputLabel>
                <Select
                  value={form.aql}
                  label="AQL（接收质量限 %）"
                  data-testid="inspection-aql-value"
                  onChange={(e) => setForm((f) => ({ ...f, aql: Number(e.target.value) }))}
                >
                  {AQLS.map((a) => (
                    <MenuItem key={a} value={a}>{a}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {aqlPlan ? (
              <Alert
                icon={<Info fontSize="inherit" />}
                severity="info"
                data-testid="inspection-aql-plan"
                sx={{ alignItems: 'center' }}
              >
                抽样方案（GB/T 2828.1）：字码 {aqlPlan.code} · 样本量 n={aqlPlan.n} · 接收数 Ac={aqlPlan.ac} · 拒收数 Re={aqlPlan.re}
              </Alert>
            ) : (
              <Alert severity="warning">请填写有效的检验数量（≥2）以生成 AQL 抽样方案。</Alert>
            )}
            <TextField
              label="供应商/工单"
              fullWidth
              value={form.vendorName}
              onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
            />
            <TextField
              label="负责人"
              fullWidth
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
            />
            <TextField
              label="计划日期"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.plannedDate}
              onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
            />
            <FormControl fullWidth>
              <InputLabel>检验标准</InputLabel>
              <Select
                value={form.standardId}
                label="检验标准"
                onChange={(e) => setForm((f) => ({ ...f, standardId: e.target.value }))}
              >
                <MenuItem value="">不关联</MenuItem>
                {inspectionStandards.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.standardNo} - {s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={!form.materialName || !form.materialCode}
            onClick={() => {
              const std = inspectionStandards.find((s) => s.id === form.standardId) || inspectionStandards[0];
              addInspectionTask({
                id: `it-${Date.now()}`,
                taskNo: `INSP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`,
                type: form.type,
                status: 'pending',
                materialId: form.materialCode,
                materialCode: form.materialCode,
                materialName: form.materialName,
                batchNo: form.batchNo || '-',
                quantity: Number(form.quantity) || 1,
                sampleQuantity: Number(form.sampleQuantity) || (aqlPlan?.n ?? 1),
                aql: form.aql,
                inspectionLevel: form.inspectionLevel,
                aqlCode: aqlPlan?.code,
                aqlAc: aqlPlan?.ac,
                aqlRe: aqlPlan?.re,
                vendorName: form.vendorName || undefined,
                inspectionStandardId: std?.id || '',
                inspectionStandardName: std?.name || '',
                assignedTo: form.assignedTo || '质检员',
                plannedDate: form.plannedDate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'admin',
                updatedBy: 'admin',
              });
              setCreateOpen(false);
              setSnackbar(true);
            }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar} autoHideDuration={2500} onClose={() => setSnackbar(false)} message="检验任务已创建" />
    </Box>
  );
};

export default InspectionList;
