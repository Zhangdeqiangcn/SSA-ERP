import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
  Switch, FormControlLabel, Typography, Chip, Divider,
} from '@mui/material';
import { PageWrapper } from '@/components/layout';
import { DataTable, FilterBar, ActionBar, StatusBadge } from '@/components/common';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { CheckTask, CheckTaskItem, CyclePlanItem, AbcClass, CycleFrequency } from '@/types';
import { formatDate } from '@/utils/format';

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
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
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
    { accessorKey: 'taskNo', header: '盘点单号' },
    { accessorKey: 'warehouseName', header: '仓库' },
    {
      accessorKey: 'type',
      header: '盘点类型',
      cell: ({ row }) => row.original.type === 'full' ? '全盘' : '抽盘',
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'blindMode',
      header: '盲盘',
      cell: ({ row }) => row.original.blindMode ? (
        <Chip size="small" label="盲盘" color="secondary" />
      ) : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    { accessorKey: 'operator', header: '操作员' },
    { accessorKey: 'startDate', header: '开始日期', cell: ({ row }) => formatDate(row.original.startDate) },
    { accessorKey: 'endDate', header: '结束日期', cell: ({ row }) => formatDate(row.original.endDate) },
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
    let data = [...checkTasks];
    if (filterData.taskNo) {
      data = data.filter(t => t.taskNo.includes(filterData.taskNo as string));
    }
    if (filterData.status) {
      data = data.filter(t => t.status === filterData.status);
    }
    return data;
  }, [filterData]);

  // ── 导入：表头 → store 字段映射，调用 addCheckTask ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h =>
      h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const STATUS_ZH: Record<string, CheckTask['status']> = {
    待盘点: 'pending', 盘点中: 'processing', 已完成: 'completed', 已取消: 'cancelled',
  };
  const mapCheckRow = (r: Record<string, string>, headers: string[]): CheckTask => {
    const now = nowStr();
    const typeRaw = pickField(r, headers, '盘点类型', 'type');
    const whName = pickField(r, headers, '仓库', 'warehouse');
    const wh = warehouses.find(w => w.name === whName);
    const blindRaw = pickField(r, headers, '盲盘', 'blindMode');
    const blindMode = blindRaw === '是' || blindRaw.toLowerCase() === 'y' || blindRaw.toLowerCase() === 'true';
    const statusRaw = pickField(r, headers, '状态', 'status');
    return {
      id: `ck-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskNo: pickField(r, headers, '盘点单号', 'taskNo') || genCheckNo(),
      warehouseId: wh?.id || whName || `wh-${Date.now()}`,
      warehouseName: whName,
      type: typeRaw === '抽盘' ? 'partial' : 'full',
      status: STATUS_ZH[statusRaw] || 'pending',
      startDate: pickField(r, headers, '开始日期', 'startDate') || now.slice(0, 10),
      endDate: pickField(r, headers, '结束日期', 'endDate') || undefined,
      operator: pickField(r, headers, '操作员', 'operator') || '系统管理员',
      items: [],
      blindMode,
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    };
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addCheckTask(mapCheckRow(r, headers)));
  };

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
      <FilterBar fields={filterFields} onSearch={setFilterData} />
      <DataTable<CheckTask>
        data={filteredData}
        columns={columns}
        enableRowSelection
        enablePagination
        enableExport
        enableImport
        columnConfigKey="warehouse-check-list"
        onImport={handleImport}
        onRowClick={(row) => navigate(`/warehouse/check/${row.id}`)}
        onView={(row) => navigate(`/warehouse/check/${row.id}`)}
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
    </PageWrapper>
  );
};

export default CheckList;
