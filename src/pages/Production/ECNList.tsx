import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
  Select, InputLabel, FormControl, Checkbox, List, ListItem, ListItemText, ListItemButton, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable, StatusBadge, FilterBar } from '@/components/common';
import { useECNStore } from '@/stores/ecnStore';
import { applyColumnFilters } from '@/utils/listSearch';
import { useProductionVersionStore } from '@/stores/productionVersionStore';
import { useMaterialStore } from '@/stores/materialStore';
import { EngineeringChange, EngineeringChangeType, ECMStatus } from '@/types/material';

const CHANGE_TYPE_LABELS: Record<EngineeringChangeType, string> = {
  material: '物料',
  bom: 'BOM',
  routing: '工艺路线',
};

export default function ECNList() {
  const { ecns, addECN, updateECN, linkEcn, unlinkEcn } = useECNStore();
  const prodEcns = useProductionVersionStore((s) => s.ecns);
  const materials = useMaterialStore((s) => s.materials);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  // P0-4（V3.74.0）：关联生产域 ECN 的对话框状态（changeId=正在维护关联的物料域变更）
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<string[]>([]);
  const [filterData, setFilterData] = useState<Record<string, unknown>>({});
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

  // P0-4（V3.74.0）：打开关联对话框，预勾选当前已关联的生产域 ECN
  const openLinkDialog = (changeId: string) => {
    const cur = ecns.find((e) => e.id === changeId);
    setLinkDraft([...(cur?.linkedEcnIds || [])]);
    setLinkFor(changeId);
  };

  // 保存关联：与预勾选态做差集，新增的 linkEcn、去掉的 unlinkEcn（store 内双向镜像）
  const saveLinkDialog = () => {
    if (!linkFor) return;
    const cur = ecns.find((e) => e.id === linkFor);
    const before = cur?.linkedEcnIds || [];
    linkDraft.forEach((ecnId) => { if (!before.includes(ecnId)) linkEcn(linkFor, ecnId); });
    before.forEach((ecnId) => { if (!linkDraft.includes(ecnId)) unlinkEcn(linkFor, ecnId); });
    setLinkFor(null);
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
      accessorKey: 'changeNo',
      header: '变更编号',
      accessorFn: (row) => row.changeNo,
      meta: { searchable: true },
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#3B82F6' }}>
          {row.original.changeNo}
        </Typography>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: '标题',
      accessorFn: (row) => row.title,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.title}</Typography>,
    },
    {
      id: 'material',
      accessorKey: 'materialName',
      header: '物料',
      accessorFn: (row) => row.materialName || row.materialId,
      meta: { searchable: true },
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
      accessorKey: 'changeType',
      header: '变更类型',
      accessorFn: (row) => row.changeType,
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: (Object.keys(CHANGE_TYPE_LABELS) as EngineeringChangeType[]).map((k) => ({ value: k, label: CHANGE_TYPE_LABELS[k] })),
      },
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
      accessorKey: 'effectiveDate',
      header: '生效日期',
      accessorFn: (row) => row.effectiveDate,
      meta: { searchable: true },
      cell: ({ row }) => <Typography variant="body2">{row.original.effectiveDate}</Typography>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: '状态',
      accessorFn: (row) => row.status,
      meta: {
        searchable: true,
        filterType: 'select',
        filterOptions: (['draft', 'approved', 'implemented', 'cancelled'] as ECMStatus[]).map((k) => ({ value: k, label: ({ draft: '草稿', approved: '已批准', implemented: '已执行', cancelled: '已取消' } as Record<ECMStatus, string>)[k] })),
      },
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'linkedEcns',
      header: '关联生产ECN',
      enableSorting: false,
      accessorFn: (row) => (row.linkedEcnIds || []).length,
      cell: ({ row }) => {
        const linked = (row.original.linkedEcnIds || [])
          .map((id) => prodEcns.find((p) => p.id === id))
          .filter(Boolean);
        if (linked.length === 0) return <Typography variant="caption" sx={{ color: '#94A3B8' }}>未关联</Typography>;
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {linked.map((p) => (
              <Chip
                key={p!.id}
                size="small"
                label={p!.changeNo}
                title={`${p!.title}（点击跳转生产版本页查看）`}
                component="button"
                onClick={() => navigate('/production/versions')}
                sx={{ bgcolor: '#F0FDF4', color: '#16A34A', fontSize: '0.6875rem', cursor: 'pointer' }}
              />
            ))}
          </Box>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: ({ row }) => {
        const e = row.original;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <IconButton size="small" title="查看详情" aria-label="查看详情" onClick={() => navigate(`/production/ecn/${e.id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => openLinkDialog(e.id)}>关联生产ECN</Button>
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

  // 通用列检索：覆盖全部声明了 meta.searchable 的列，并按字段权限门控（置于 columns 声明之后）
  const rows = useMemo(
    () => applyColumnFilters(ecns, columns, filterData, { module: 'production' }),
    [ecns, columns, filterData]
  );

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

      <FilterBar columns={columns} module="production" onSearch={setFilterData} listKey="ecn-list" />
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
        codeColumnId="changeNo"
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
      {/* P0-4（V3.74.0）：关联生产域 ECN 对话框（勾选式，保存时差集双向落库） */}
      <Dialog open={linkFor !== null} onClose={() => setLinkFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>关联生产域 ECN</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            勾选要关联的生产域工程变更单（生产版本页维护的那一套）。保存后两侧互相挂钩：本页显示对方单号，生产版本页也能跳回本页。旧数据不动，只增不减.
          </Alert>
          {prodEcns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">暂无生产域 ECN 记录。</Typography>
          ) : (
            <List dense>
              {prodEcns.map((p) => {
                const checked = linkDraft.includes(p.id);
                return (
                  <ListItem key={p.id} disablePadding>
                    <ListItemButton onClick={() => setLinkDraft((d) => (checked ? d.filter((x) => x !== p.id) : [...d, p.id]))}>
                      <Checkbox edge="start" checked={checked} tabIndex={-1} disableRipple />
                      <ListItemText
                        primary={`${p.changeNo} · ${p.title}`}
                        secondary={`${p.materialName || p.materialCode || ''} ｜ ${p.oldVersion} → ${p.newVersion} ｜ ${p.status === 'released' ? '已发布' : '草稿'}`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkFor(null)}>取消</Button>
          <Button variant="contained" data-testid="ecn-link-save" onClick={saveLinkDialog}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
