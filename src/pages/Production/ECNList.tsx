import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
  Select, InputLabel, FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common';
import { useECNStore } from '@/stores/ecnStore';
import { useMaterialStore } from '@/stores/materialStore';
import { EngineeringChange, EngineeringChangeType, ECMStatus } from '@/types/material';

const CHANGE_TYPE_LABELS: Record<EngineeringChangeType, string> = {
  material: '物料',
  bom: 'BOM',
  routing: '工艺路线',
};

const STATUS_LABELS: Record<ECMStatus, string> = {
  draft: '草稿',
  approved: '已批准',
  implemented: '已执行',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<ECMStatus, string> = {
  draft: '#F59E0B',
  approved: '#3B82F6',
  implemented: '#10B981',
  cancelled: '#94A3B8',
};

export default function ECNList() {
  const { ecns, addECN, updateECN } = useECNStore();
  const materials = useMaterialStore((s) => s.materials);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    changeNo: '',
    title: '',
    materialId: '',
    changeType: 'material' as EngineeringChangeType,
    oldValue: '',
    newValue: '',
    effectiveDate: '',
    fromVersion: 'V1.0',
    toVersion: 'V2.0',
  });

  const rows = useMemo(() => ecns, [ecns]);

  const handleAdd = () => {
    const selectedMaterial = materials.find(m => m.id === form.materialId);
    const now = new Date().toISOString();
    const changeNo = form.changeNo || `ECN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const e: EngineeringChange = {
      id: `ecn-${Date.now()}`,
      changeNo,
      title: form.title || '工程变更',
      materialId: form.materialId,
      materialName: selectedMaterial?.name,
      fromVersion: form.fromVersion,
      toVersion: form.toVersion,
      changeType: form.changeType,
      oldValue: form.oldValue,
      newValue: form.newValue,
      effectiveDate: form.effectiveDate,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    addECN(e);
    setOpen(false);
    setForm({
      changeNo: '', title: '', materialId: '',
      changeType: 'material', oldValue: '', newValue: '',
      effectiveDate: '', fromVersion: 'V1.0', toVersion: 'V2.0',
    });
  };

  const handleApprove = (id: string) => {
    updateECN(id, { status: 'approved', approvedBy: '当前用户' });
  };

  const handleImplement = (id: string) => {
    updateECN(id, { status: 'implemented' });
  };

  const handleCancel = (id: string) => {
    updateECN(id, { status: 'cancelled' });
  };

  const mapImportRow = (r: Record<string, string>, _headers: string[]): EngineeringChange => {
    const now = new Date().toISOString();
    const typeMap: Record<string, EngineeringChangeType> = { 物料: 'material', BOM: 'bom', 工艺路线: 'routing' };
    const statusMap: Record<string, ECMStatus> = { 草稿: 'draft', 已批准: 'approved', 已执行: 'implemented', 已取消: 'cancelled' };
    return {
      id: `ecn-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      changeNo: r['变更编号'] || `ECN-IMP-${Date.now()}`,
      title: r['标题'] || '工程变更',
      materialId: r['物料ID'] || '',
      materialName: r['物料'] || '',
      fromVersion: r['变更前版本'] || 'V1.0',
      toVersion: r['变更后版本'] || 'V2.0',
      changeType: typeMap[r['变更类型']] || 'material',
      oldValue: r['旧值'],
      newValue: r['新值'],
      effectiveDate: r['生效日期'] || '',
      status: statusMap[r['状态']] || 'draft',
      createdAt: now,
      updatedAt: now,
    };
  };

  const columns: ColumnDef<EngineeringChange, unknown>[] = [
    {
      id: 'changeNo',
      header: '变更编号',
      accessorFn: (row) => row.changeNo,
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#3B82F6' }}>
          {row.original.changeNo}
        </Typography>
      ),
    },
    {
      id: 'title',
      header: '标题',
      accessorFn: (row) => row.title,
      cell: ({ row }) => <Typography variant="body2">{row.original.title}</Typography>,
    },
    {
      id: 'material',
      header: '物料',
      accessorFn: (row) => row.materialName || row.materialId,
      cell: ({ row }) => {
        const mat = materials.find(m => m.id === row.original.materialId);
        return (
          <Box>
            <Typography variant="body2">{row.original.materialName || mat?.name || row.original.materialId}</Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>{mat?.code}</Typography>
          </Box>
        );
      },
    },
    {
      id: 'changeType',
      header: '变更类型',
      accessorFn: (row) => row.changeType,
      cell: ({ row }) => (
        <Chip
          size="small"
          label={CHANGE_TYPE_LABELS[row.original.changeType]}
          sx={{ bgcolor: '#EFF6FF', color: '#3B82F6', fontSize: '0.6875rem' }}
        />
      ),
    },
    {
      id: 'value',
      header: '旧值→新值',
      accessorFn: (row) => `${row.oldValue || row.fromVersion || ''} → ${row.newValue || row.toVersion || ''}`,
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.original.oldValue || row.original.fromVersion || '-'}{' → '}{row.original.newValue || row.original.toVersion || '-'}
        </Typography>
      ),
    },
    {
      id: 'effectiveDate',
      header: '生效日期',
      accessorFn: (row) => row.effectiveDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.effectiveDate}</Typography>,
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Chip
          size="small"
          label={STATUS_LABELS[row.original.status]}
          sx={{
            bgcolor: STATUS_COLORS[row.original.status] + '15',
            color: STATUS_COLORS[row.original.status],
            fontWeight: 500,
            fontSize: '0.6875rem',
          }}
        />
      ),
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => {
        const e = row.original;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {e.status === 'draft' && (
              <>
                <Button size="small" variant="outlined" color="primary" onClick={() => handleApprove(e.id)}>批准</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleCancel(e.id)}>取消</Button>
              </>
            )}
            {e.status === 'approved' && (
              <Button size="small" variant="outlined" color="success" onClick={() => handleImplement(e.id)}>执行</Button>
            )}
            {(e.status === 'implemented' || e.status === 'cancelled') && (
              <Chip size="small" label={e.status === 'implemented' ? '已完成' : '已取消'} color={e.status === 'implemented' ? 'success' : 'default'} />
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 2 }} data-testid="ecn-list">
      <Typography variant="h5" gutterBottom>工程变更单 ECM</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        工程变更单（ECM）用于管理物料/BOM/工艺路线的变更流程，包括版本切换和值变更跟踪。
      </Alert>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        新增 ECM
      </Button>

      <DataTable<EngineeringChange>
        data={rows}
        columns={columns}
        enableRowSelection={false}
        enablePagination={true}
        enableSorting={true}
        enableColumnFilter={true}
        enableBlockSelect={true}
        enableExport={true}
        exportFormat="xlsx"
        enableImport={true}
        onImport={(rs, headers) => rs.forEach(r => addECN(mapImportRow(r, headers)))}
        columnConfigKey="material-ecn-list"
      />

      {/* 新增对话框 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增工程变更单</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="dense"
            label="变更编号"
            value={form.changeNo}
            onChange={(e) => setForm({ ...form, changeNo: e.target.value })}
            helperText="留空自动生成"
            data-testid="ecn-change-no"
          />
          <TextField
            fullWidth
            margin="dense"
            label="标题"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>物料</InputLabel>
            <Select
              value={form.materialId}
              label="物料"
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}
              data-testid="ecn-material"
            >
              {materials.map((m) => (
                <MenuItem key={m.id} value={m.id}>{m.name} ({m.code})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            select
            fullWidth
            margin="dense"
            label="变更类型"
            value={form.changeType}
            onChange={(e) => setForm({ ...form, changeType: e.target.value as EngineeringChangeType })}
          >
            <MenuItem value="material">物料</MenuItem>
            <MenuItem value="bom">BOM</MenuItem>
            <MenuItem value="routing">工艺路线</MenuItem>
          </TextField>
          <TextField
            fullWidth
            margin="dense"
            label="旧值"
            value={form.oldValue}
            onChange={(e) => setForm({ ...form, oldValue: e.target.value })}
            placeholder="变更前的值"
          />
          <TextField
            fullWidth
            margin="dense"
            label="新值"
            value={form.newValue}
            onChange={(e) => setForm({ ...form, newValue: e.target.value })}
            placeholder="变更后的值"
          />
          <TextField
            fullWidth
            margin="dense"
            label="变更前版本"
            value={form.fromVersion}
            onChange={(e) => setForm({ ...form, fromVersion: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="变更后版本"
            value={form.toVersion}
            onChange={(e) => setForm({ ...form, toVersion: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="生效日期"
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="ecn-submit" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
