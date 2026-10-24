import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, TextField, MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Add, Visibility, Edit, PlayArrow, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge, FilterBar } from '@/components/common';
import { PageWrapper } from '@/components/layout';
import { ActionBar } from '@/components/common';
import { useProductionStore } from '@/stores/productionStore';
import { ProcessRoute, ProcessRouteStatus, Operation } from '@/types/production';
import { applyColumnFilters } from '@/utils/listSearch';
import MaterialLineItemsGrid, { GridColumn } from '@/components/common/MaterialLineItemsGrid';

const STATUS_LABELS: Record<ProcessRouteStatus, string> = {
  draft: '草稿',
  active: '启用',
  obsolete: '废弃',
};

// 状态展示统一走 StatusBadge（审计报告 P0 整改：删本地 hex 副本）
// draft / active 复用通用 key，obsolete 用 route_ 前缀专属 key
const ROUTE_STATUS_KEY: Record<ProcessRouteStatus, string> = {
  draft: 'draft', active: 'active', obsolete: 'route_obsolete',
};

interface OpForm {
  id: string;
  operationName: string;
  workCenter: string;
  runTime: string;
}
const genOpId = () => `op-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const emptyOp: OpForm = { id: genOpId(), operationName: '', workCenter: '', runTime: '0' };

const genRouteNo = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `RT${ymd}${rand}`;
};
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

  const ProcessRouteList: React.FC = () => {
  const { processRoutes, addProcessRoute, updateProcessRoute } = useProductionStore();
  const navigate = useNavigate();
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 列表检索派生用列定义（仅驱动 FilterBar 检索项；列表本身为既有卡片流，保持原样）
  const columns: ColumnDef<ProcessRoute, unknown>[] = [
    { accessorKey: 'routeNo', header: '路线编号', meta: { searchable: true } },
    { accessorKey: 'name', header: '路线名称', meta: { searchable: true } },
    { accessorKey: 'productCode', header: '产品编码', meta: { searchable: true } },
    { accessorKey: 'productName', header: '产品名称', meta: { searchable: true } },
    { accessorKey: 'version', header: '版本', meta: { searchable: true } },
    {
      accessorKey: 'status', header: '状态',
      meta: {
        searchable: true, filterType: 'select',
        filterOptions: (Object.keys(STATUS_LABELS) as ProcessRouteStatus[]).map((k) => ({ value: k, label: STATUS_LABELS[k] })),
      },
    },
  ];
  const filteredRoutes = applyColumnFilters(processRoutes, columns, filterData, { module: 'production' });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routeNo, setRouteNo] = useState('');
  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [version, setVersion] = useState('V1.0');
  const [status, setStatus] = useState<ProcessRouteStatus>('draft');
  const [totalLeadTime, setTotalLeadTime] = useState('0');
  const [ops, setOps] = useState<OpForm[]>([{ ...emptyOp }]);

  const openCreate = () => {
    setEditingId(null);
    setRouteNo(genRouteNo());
    setName(''); setProductCode(''); setProductName(''); setVersion('V1.0');
    setStatus('draft'); setTotalLeadTime('0'); setOps([{ ...emptyOp }]);
    setOpen(true);
  };
  const openEdit = (route: ProcessRoute) => {
    setEditingId(route.id);
    setRouteNo(route.routeNo); setName(route.name); setProductCode(route.productCode);
    setProductName(route.productName); setVersion(route.version); setStatus(route.status);
    setTotalLeadTime(String(route.totalLeadTime));
    setOps(route.operations.length
      ? route.operations.map(o => ({ id: genOpId(), operationName: o.operationName, workCenter: o.workCenter, runTime: String(o.runTime) }))
      : [{ ...emptyOp }]);
    setOpen(true);
  };

  // 工序明细列（对齐采购域 MaterialLineItemsGrid 风格：排序/检索/Excel粘贴/列显隐）
  const opColumns: GridColumn[] = [
    { key: 'operationName', label: '工序名称', width: 160, required: true },
    { key: 'workCenter', label: '工作中心', width: 160 },
    { key: 'runTime', label: '工时(分/件)', type: 'number', width: 120, align: 'right' },
  ];

  const handleSave = () => {
    const ts = nowStr();
    const operations: Operation[] = ops
      .filter(o => o.operationName.trim())
      .map((o, i) => ({
        id: `op-${Date.now()}-${i}`,
        sequence: (i + 1) * 10,
        operationCode: `OP${(i + 1) * 10}`,
        operationName: o.operationName,
        workCenter: o.workCenter,
        setupTime: 0,
        runTime: Number(o.runTime) || 0,
        waitTime: 0,
      }));
    if (editingId) {
      updateProcessRoute(editingId, { routeNo, name, productCode, productName, version, status, totalLeadTime: Number(totalLeadTime) || 0, operations });
    } else {
      addProcessRoute({
        id: `rt-${Date.now()}`,
        routeNo, name, productCode, productName, version, status,
        totalLeadTime: Number(totalLeadTime) || 0, operations,
        createdAt: ts, updatedAt: ts, createdBy: '系统', updatedBy: '系统',
      });
    }
    setOpen(false);
  };

  return (
    <PageWrapper
      title="工艺路线"
      actions={<ActionBar primary={{ label: '新建工艺路线', onClick: openCreate, icon: <Add /> }} />}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FilterBar columns={columns} module="production" onSearch={setFilterData} listKey="process-route-list" />
        {filteredRoutes.map((route) => (
          <Paper key={route.id} variant="outlined" sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
              <Box>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 600 }}>{route.routeNo}</Typography>
                  <Chip label={route.version} size="small" variant="outlined" />
                  <StatusBadge status={ROUTE_STATUS_KEY[route.status]} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>{route.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>{route.productName} · 标准工时 {route.totalLeadTime}h</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="查看详情">
                  <IconButton size="small" onClick={() => navigate(`/production/routes/${route.id}`)}><Visibility fontSize="small" /></IconButton>
                </Tooltip>
                <Tooltip title="编辑">
                  <IconButton size="small" onClick={() => openEdit(route)}><Edit fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 0, overflowX: 'auto', pb: 1 }}>
              {route.operations.map((op, idx) => (
                <Box key={op.id} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={(theme) => ({
                      minWidth: 120, p: 1.5, borderRadius: 2, bgcolor: 'grey.50',
                      border: '1px solid', borderColor: 'divider', textAlign: 'center',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: 'primary.main' },
                    })}
                  >
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: 'common.white',
                      fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mx: 'auto', mb: 0.5
                    }}>
                      {op.sequence / 10}
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', display: 'block' }}>{op.operationName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{op.workCenter}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{op.runTime}分/件</Typography>
                  </Box>
                  {idx < route.operations.length - 1 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, color: 'grey.300' }}>
                      <PlayArrow sx={{ fontSize: 18 }} />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {editingId ? '编辑工艺路线' : '新建工艺路线'}
            <IconButton onClick={() => setOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="路线编号" value={routeNo} onChange={e => setRouteNo(e.target.value)} data-testid="route-no" />
              <TextField fullWidth label="路线名称" value={name} onChange={e => setName(e.target.value)} data-testid="route-name" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="产品编码" value={productCode} onChange={e => setProductCode(e.target.value)} />
              <TextField fullWidth label="产品名称" value={productName} onChange={e => setProductName(e.target.value)} data-testid="route-product" />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="版本" value={version} onChange={e => setVersion(e.target.value)} />
              <TextField select fullWidth label="状态" value={status} onChange={e => setStatus(e.target.value as ProcessRouteStatus)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField fullWidth label="标准工时(h)" type="number" value={totalLeadTime} onChange={e => setTotalLeadTime(e.target.value)} />
            </Stack>

            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>工序列表</Typography>
            <MaterialLineItemsGrid
              title="工序列表"
              columns={opColumns}
              value={ops}
              onChange={(rows) => setOps(rows as unknown as OpForm[])}
              rowIdKey="id"
              addLabel="添加工序"
              removable={ops.length > 1}
              testIdPrefix="route-op"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim() || !productName.trim()}
            data-testid="route-save">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default ProcessRouteList;
