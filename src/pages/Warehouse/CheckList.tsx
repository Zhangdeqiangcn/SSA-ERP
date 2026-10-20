import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
  Switch, FormControlLabel, Typography, Chip, Divider, Snackbar, Alert,
} from '@mui/material';
import { EditNote, DeleteOutline } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import {
  DataTable, FilterBar, ActionBar, StatusBadge,
  ConfirmDialog, BatchEditDialog, type BatchAction, type BatchEditField,
} from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { CheckTask, CheckTaskItem, CyclePlanItem, AbcClass, CycleFrequency } from '@/types';
import { formatDate } from '@/utils/format';
import { applyColumnFilters } from '@/utils/listSearch';

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const genCheckNo = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `CK${ymd}${rand}`;
};

// P1-21 循环盘点种子计划
const ABC_FREQ: Record<AbcClass, CycleFrequency> = { A: 'weekly', B: 'monthly', C: 'quarterly' };
const FREQ_LABELS: Record<CycleFrequency, string> = { weekly: '每周', monthly: '每月', quarterly: '每季度' };
const ABC_COLORS: Record<AbcClass, 'error' | 'warning' | 'success'> = { A: 'error', B: 'warning', C: 'success' };
const ABC_LABELS: Record<AbcClass, string> = { A: 'A类（每周）', B: 'B类（每月）', C: 'C类（每季度）' };

function generateCyclePlan(): CyclePlanItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const addDays = (d: string, days: number) => {
    const dt = new Date(d); dt.setDate(dt.getDate() + days); return dt.toISOString().slice(0, 10);
  };
  return [
    { id: 'cp-A-01', materialCategory: '冷轧板', abcClass: 'A', frequency: 'weekly',
      lastCheckDate: addDays(today, -5), nextCheckDate: addDays(today, 2), warehouseKeeper: '王仓管', responsibleWarehouse: '原料仓A' },
    { id: 'cp-A-02', materialCategory: '热轧卷', abcClass: 'A', frequency: 'weekly',
      lastCheckDate: addDays(today, -3), nextCheckDate: addDays(today, 4), warehouseKeeper: '王仓管', responsibleWarehouse: '原料仓A' },
    { id: 'cp-B-01', materialCategory: '不锈钢板', abcClass: 'B', frequency: 'monthly',
      lastCheckDate: addDays(today, -28), nextCheckDate: addDays(today, 2), warehouseKeeper: '李仓管', responsibleWarehouse: '原料仓B' },
    { id: 'cp-B-02', materialCategory: '镀锌板', abcClass: 'B', frequency: 'monthly',
      lastCheckDate: addDays(today, -14), nextCheckDate: addDays(today, 16), warehouseKeeper: '李仓管', responsibleWarehouse: '原料仓B' },
    { id: 'cp-C-01', materialCategory: '辅料五金', abcClass: 'C', frequency: 'quarterly',
      lastCheckDate: addDays(today, -80), nextCheckDate: addDays(today, 10), warehouseKeeper: '赵仓管', responsibleWarehouse: '辅料仓' },
    { id: 'cp-C-02', materialCategory: '包装材料', abcClass: 'C', frequency: 'quarterly',
      lastCheckDate: addDays(today, -60), nextCheckDate: addDays(today, 30), warehouseKeeper: '赵仓管', responsibleWarehouse: '辅料仓' },
  ];
}

const CheckList: React.FC = () => {
  const navigate = useNavigate();
  const checkTasks = useWarehouseStore(s => s.checkTasks);
  const inventoryRecords = useWarehouseStore(s => s.inventoryRecords);
  const addCheckTask = useWarehouseStore(s => s.addCheckTask);
  const updateCheckTask = useWarehouseStore(s => s.updateCheckTask);
  const deleteCheckTask = useWarehouseStore(s => s.deleteCheckTask);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
  // ── 删除 / 批量修改 / 提示 ──
  const [deleteTargets, setDeleteTargets] = useState<CheckTask[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const [pendingBatchEdit, setPendingBatchEdit] = useState<CheckTask[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const [open, setOpen] = useState(false);
  const [whId, setWhId] = useState('');
  const [type, setType] = useState<'full' | 'partial'>('full');
  const [operator, setOperator] = useState('系统管理员');
  const [blindMode, setBlindMode] = useState(false);

  // P1-21 循环盘点计划（本地状态，非持久化）
  const [cyclePlans] = useState<CyclePlanItem[]>(generateCyclePlan);

  // 从库存记录推导仓库清单（id→name）
  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    inventoryRecords.forEach(r => {
      if (r.warehouseId) map.set(r.warehouseId, r.warehouseName || r.warehouseId);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [inventoryRecords]);

  const handleCreate = () => {
    const wh = warehouses.find(w => w.id === whId);
    if (!wh) return;
    const ts = nowStr();
    const items: CheckTaskItem[] = inventoryRecords
      .filter(r => r.warehouseId === whId)
      .map((r, i) => ({
        id: `cki-${Date.now()}-${i}`,
        materialId: r.materialId,
        materialCode: r.materialCode,
        materialName: r.materialName,
        locationId: r.locationId,
        locationName: r.locationName,
        bookQuantity: r.quantity,
      }));
    const task: CheckTask = {
      id: `ck-${Date.now()}`,
      taskNo: genCheckNo(),
      warehouseId: wh.id,
      warehouseName: wh.name,
      type,
      status: 'pending',
      startDate: ts.slice(0, 10),
      operator: operator || '系统管理员',
      items,
      blindMode,
      createdAt: ts,
      updatedAt: ts,
      createdBy: '系统管理员',
      updatedBy: '系统管理员',
    };
    addCheckTask(task);
    setOpen(false);
    setWhId('');
    setBlindMode(false);
    navigate(`/warehouse/check/${task.id}`);
  };

  const columns: ColumnDef<CheckTask, unknown>[] = useMemo(() => [
    { accessorKey: 'taskNo', header: '盘点单号', meta: { searchable: true } },
    { accessorKey: 'warehouseName', header: '仓库', meta: { searchable: true } },
    {
      accessorKey: 'type',
      header: '盘点类型',
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'full', label: '全盘' },
          { value: 'partial', label: '抽盘' },
        ],
      },
      cell: ({ row }) => row.original.type === 'full' ? '全盘' : '抽盘',
    },
    {
      accessorKey: 'status',
      header: '状态',
      meta: { searchable: true },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'blindMode',
      header: '盲盘',
      meta: { searchable: true, filterType: 'select', filterOptions: [{ value: 'true', label: '盲盘' }, { value: 'false', label: '非盲盘' }] },
      cell: ({ row }) => row.original.blindMode ? (
        <Chip size="small" label="盲盘" color="secondary" />
      ) : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    { accessorKey: 'operator', header: '操作员', meta: { searchable: true } },
    { accessorKey: 'startDate', header: '开始日期', cell: ({ row }) => formatDate(row.original.startDate), meta: { searchable: true } },
    { accessorKey: 'endDate', header: '结束日期', cell: ({ row }) => formatDate(row.original.endDate), meta: { searchable: true } },
  ], []);

  // 循环盘点计划列（只读）
  const cyclePlanColumns: ColumnDef<CyclePlanItem, unknown>[] = [
    { accessorKey: 'materialCategory', header: '物料分类' },
    {
      accessorKey: 'abcClass',
      header: 'ABC 分类',
      cell: ({ row }) => (
        <Chip size="small" label={row.original.abcClass} color={ABC_COLORS[row.original.abcClass]} variant="outlined" />
      ),
    },
    { accessorKey: 'frequency', header: '盘点频率', cell: ({ row }) => FREQ_LABELS[row.original.frequency] },
    { accessorKey: 'lastCheckDate', header: '上次盘点日' },
    {
      accessorKey: 'nextCheckDate',
      header: '下次计划日',
      cell: ({ row }) => <Typography fontWeight={600} color="primary.main">{row.original.nextCheckDate}</Typography>,
    },
    { accessorKey: 'warehouseKeeper', header: '负责仓管' },
    { accessorKey: 'responsibleWarehouse', header: '所属仓库' },
  ];

  const filterFields = [
    { name: 'taskNo', label: '盘点单号', type: 'text' as const },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '', label: '全部' },
        { value: 'pending', label: '待盘点' },
        { value: 'processing', label: '盘点中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
  ];

  const filteredData = useMemo(() => {
    // 通用列检索：覆盖全部声明了 meta.searchable 的列（盘点单号/仓库/类型/状态/盲盘/操作员/日期），并按字段权限门控
    return applyColumnFilters(checkTasks, columns, filterData, { module: 'warehouse' });
  }, [filterData, checkTasks, columns]);

  // ── 批量修改可改字段（对应详情页可编辑项）──
  const CHECK_BATCH_FIELDS: BatchEditField[] = [
    {
      key: 'status', label: '状态', type: 'select',
      options: [
        { value: 'pending', label: '待盘点' },
        { value: 'processing', label: '盘点中' },
        { value: 'completed', label: '已完成' },
        { value: 'cancelled', label: '已取消' },
      ],
    },
    { key: 'warehouseName', label: '仓库', type: 'text' },
    { key: 'operator', label: '操作员', type: 'text' },
    { key: 'startDate', label: '开始日期', type: 'text' },
    { key: 'remarks', label: '备注', type: 'text' },
  ];

  // ── 批量导入：表头 → 字段 别名映射（中英文均可），按单号匹配，命中则更新、未命中跳过 ──
  const CHECK_IMPORT_ALIASES: Record<string, string> = {
    盘点单号: 'taskNo', taskNo: 'taskNo',
    仓库: 'warehouseName', warehouseName: 'warehouseName', warehouse: 'warehouseName',
    盘点类型: 'type', type: 'type',
    状态: 'status', status: 'status',
    盲盘: 'blindMode', blindMode: 'blindMode',
    操作员: 'operator', operator: 'operator',
    开始日期: 'startDate', startDate: 'startDate',
    结束日期: 'endDate', endDate: 'endDate',
    备注: 'remarks', remarks: 'remarks',
  };
  const CHECK_STATUS_MAP: Record<string, CheckTask['status']> = {
    待盘点: 'pending', 盘点中: 'processing', 已完成: 'completed', 已取消: 'cancelled',
    pending: 'pending', processing: 'processing', completed: 'completed', cancelled: 'cancelled',
  };
  const CHECK_TYPE_MAP: Record<string, CheckTask['type']> = {
    全盘: 'full', 抽盘: 'partial', full: 'full', partial: 'partial',
  };
  const handleImport = (rows: Record<string, string>[], _headers: string[]) => {
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped: Record<string, string> = {};
      Object.entries(raw).forEach(([h, v]) => {
        const key = CHECK_IMPORT_ALIASES[String(h).trim()];
        if (key && v != null && String(v).trim() !== '') mapped[key] = String(v).trim();
      });
      const no = mapped.taskNo;
      if (!no) { skipped += 1; continue; }
      const existing = checkTasks.find((t) => t.taskNo === no);
      if (!existing) { skipped += 1; continue; }
      const updates: Partial<CheckTask> = {};
      if (mapped.warehouseName) updates.warehouseName = mapped.warehouseName;
      if (mapped.operator) updates.operator = mapped.operator;
      if (mapped.startDate) updates.startDate = mapped.startDate;
      if (mapped.endDate) updates.endDate = mapped.endDate;
      if (mapped.remarks) updates.remarks = mapped.remarks;
      if (mapped.type) {
        const t = CHECK_TYPE_MAP[mapped.type];
        if (t) updates.type = t;
      }
      if (mapped.blindMode) {
        updates.blindMode = mapped.blindMode === '是' || mapped.blindMode.toLowerCase() === 'y' || mapped.blindMode.toLowerCase() === 'true';
      }
      if (mapped.status) {
        const s = CHECK_STATUS_MAP[mapped.status];
        if (s) updates.status = s;
      }
      // 单据类安全策略：仅按单号匹配更新，未匹配到的跳过不新建
      updateCheckTask(existing.id, updates);
      updated += 1;
    }
    setSnackbar({
      open: true,
      message: `更新 ${updated} 条，跳过 ${skipped} 条（未匹配到现有单号）`,
      severity: updated + skipped > 0 ? 'success' : 'info',
    });
  };

  const confirmDelete = () => {
    const targets = [...deleteTargets];
    setDeleteOpen(false);
    setDeleteTargets([]);
    for (const t of targets) deleteCheckTask(t.id);
    setSnackbar({ open: true, message: `已删除 ${targets.length} 个盘点单`, severity: 'success' });
  };

  const confirmBatchEdit = (updates: Record<string, unknown>) => {
    const targets = [...pendingBatchEdit];
    setBatchEditOpen(false);
    setPendingBatchEdit([]);
    for (const t of targets) updateCheckTask(t.id, updates as Partial<CheckTask>);
    setSnackbar({ open: true, message: `已批量修改 ${targets.length} 个盘点单`, severity: 'success' });
  };

  const batchActions: BatchAction<CheckTask>[] = [
    {
      label: '批量修改',
      icon: <EditNote sx={{ fontSize: 14 }} />,
      testId: 'batch-edit',
      onClick: (rows) => { setPendingBatchEdit(rows); setBatchEditOpen(true); },
    },
    {
      label: '批量删除',
      icon: <DeleteOutline sx={{ fontSize: 14 }} />,
      color: 'error',
      testId: 'batch-delete',
      onClick: (rows) => { setDeleteTargets(rows); setDeleteOpen(true); },
    },
  ];

  return (
    <PageWrapper
      title="库存盘点"
      actions={
        <ActionBar
          primary={{ label: '新建盘点', onClick: () => setOpen(true) }}
        />
      }
    >
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>新建盘点单</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="仓库"
            value={whId}
            onChange={(e) => setWhId(e.target.value)}
            margin="normal"
            data-testid="check-wh-select"
          >
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="盘点类型"
            value={type}
            onChange={(e) => setType(e.target.value as 'full' | 'partial')}
            margin="normal"
          >
            <MenuItem value="full">全盘</MenuItem>
            <MenuItem value="partial">抽盘</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="操作员"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            margin="normal"
          />
          {/* P1-21 盲盘模式开关 */}
          <FormControlLabel
            control={
              <Switch
                checked={blindMode}
                onChange={(e) => setBlindMode(e.target.checked)}
                data-testid="check-blind-mode"
                color="secondary"
              />
            }
            label="盲盘模式（盘点时不显示账面数量）"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={whId === ''}
            data-testid="check-create-confirm"
          >
            创建盘点
          </Button>
        </DialogActions>
      </Dialog>
      <FilterBar fields={filterFields} columns={columns} module="warehouse" onSearch={setFilterData} listKey="check-list" />
      <DataTable<CheckTask>
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        importLabel="盘点单"
        columnConfigKey="warehouse-check-list"
        codeColumnId="taskNo"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/warehouse/check/${row.id}`)}
        onView={(row) => navigate(`/warehouse/check/${row.id}`)}
        onDelete={(row) => { setDeleteTargets([row]); setDeleteOpen(true); }}
        batchActions={batchActions}
      />

      {/* P1-21 循环盘点计划 */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="h6" gutterBottom>循环盘点计划（ABC 分类周期）</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A 类物料每周盘点、B 类每月盘点、C 类每季度盘点，按分类自动生成周期计划。
      </Typography>
      <Box data-testid="check-cycle-plan">
        <DataTable<CyclePlanItem>
          data={cyclePlans}
          columns={cyclePlanColumns}
          enablePagination={false}
        />
      </Box>

      {/* 删除确认（单行 / 批量） */}
      <ConfirmDialog
        open={deleteOpen}
        type="danger"
        title="确认删除"
        content={
          deleteTargets.length === 1
            ? `确定删除盘点单「${deleteTargets[0]?.taskNo}」吗？此操作不可撤销。`
            : `确定要删除选中的 ${deleteTargets.length} 个盘点单吗？此操作不可撤销。`
        }
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteTargets([]); }}
        confirmText="确认删除"
      />

      {/* 批量修改 */}
      <BatchEditDialog
        open={batchEditOpen}
        title="批量修改盘点单"
        count={pendingBatchEdit.length}
        fields={CHECK_BATCH_FIELDS}
        onConfirm={confirmBatchEdit}
        onCancel={() => { setBatchEditOpen(false); setPendingBatchEdit([]); }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default CheckList;
