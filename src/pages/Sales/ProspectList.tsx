import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Stack, LinearProgress,
  Tooltip, MenuItem, Alert,
} from '@mui/material';
import {
  Add, Visibility, Edit, EventNote, Search, Close, Notes,
} from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { useSalesStore } from '@/stores/salesStore';
import { Prospect, ProspectStatus, ProspectSource, FollowupRecord } from '@/types';
import { PageWrapper } from '@/components/layout';
import { DataTable } from '@/components/common';
import { formatCurrency } from '@/utils/format';

const SOURCE_LABELS: Record<ProspectSource, string> = {
  web: '网络', exhibition: '展会', referral: '介绍', cold_call: '电话', advertise: '广告', other: '其他',
};
const STATUS_LABELS: Record<ProspectStatus, string> = {
  new: '新线索', contacted: '已联系', negotiating: '洽谈中', quoted: '已报价', won: '已成交', lost: '已丢失',
};
const STATUS_COLORS: Record<ProspectStatus, string> = {
  new: '#6366F1', contacted: '#3B82F6', negotiating: '#F59E0B', quoted: '#8B5CF6', won: '#10B981', lost: '#94A3B8',
};

const genProspectNo = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PR${ymd}${rand}`;
};
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

interface FormState {
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  industry: string;
  region: string;
  source: ProspectSource;
  status: ProspectStatus;
  interestProducts: string;
  estimatedValue: string;
  probability: string;
  assignedTo: string;
  creditLimit: string;
  nextFollowupDate: string;
  notes: string;
}

const emptyForm: FormState = {
  companyName: '', contactName: '', contactPhone: '', contactEmail: '',
  industry: '', region: '', source: 'web', status: 'new',
  interestProducts: '', estimatedValue: '', probability: '', assignedTo: '',
  creditLimit: '', nextFollowupDate: '', notes: '',
};

const toForm = (p: Prospect): FormState => ({
  companyName: p.companyName, contactName: p.contactName, contactPhone: p.contactPhone,
  contactEmail: p.contactEmail, industry: p.industry || '', region: p.region || '',
  source: p.source, status: p.status,
  interestProducts: p.interestProducts.join(', '),
  estimatedValue: p.estimatedValue != null ? String(p.estimatedValue) : '',
  probability: p.probability != null ? String(p.probability) : '',
  assignedTo: p.assignedTo,
  creditLimit: p.creditLimit != null ? String(p.creditLimit) : '',
  nextFollowupDate: p.nextFollowupDate || '',
  notes: p.notes || '',
});

const ProspectList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | ''>('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [followupOpen, setFollowupOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { prospects, addProspect, updateProspect } = useSalesStore();

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (p: Prospect) => {
    setEditingId(p.id);
    setForm(toForm(p));
    setDialogOpen(true);
  };
  const setField = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const ts = nowStr();
    const products = form.interestProducts.split(',').map(s => s.trim()).filter(Boolean);
    const existing = editingId ? prospects.find(p => p.id === editingId) : undefined;
    const base = {
      prospectNo: existing?.prospectNo || genProspectNo(),
      companyName: form.companyName,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      industry: form.industry || undefined,
      region: form.region || undefined,
      source: form.source,
      status: form.status,
      interestProducts: products,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      probability: form.probability ? Number(form.probability) : undefined,
      nextFollowupDate: form.nextFollowupDate || undefined,
      followupRecords: existing?.followupRecords || [],
      assignedTo: form.assignedTo,
      creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
      usedCredit: existing?.usedCredit || 0,
      notes: form.notes || undefined,
    };
    if (editingId) {
      updateProspect(editingId, base);
    } else {
      addProspect({
        ...base,
        id: `pr-${Date.now()}`,
        createdAt: ts, updatedAt: ts, createdBy: '系统', updatedBy: '系统',
      });
    }
    setDialogOpen(false);
  };

  const filtered = prospects.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search && !p.companyName.includes(search) && !p.prospectNo.includes(search) && !p.contactName.includes(search)) return false;
    return true;
  });

  const stats = [
    { label: '全部', count: prospects.length, color: '#6366F1', filter: '' },
    { label: '新线索', count: prospects.filter(p => p.status === 'new').length, color: '#6366F1', filter: 'new' },
    { label: '洽谈中', count: prospects.filter(p => p.status === 'negotiating').length, color: '#F59E0B', filter: 'negotiating' },
    { label: '已成交', count: prospects.filter(p => p.status === 'won').length, color: '#10B981', filter: 'won' },
    { label: '已丢失', count: prospects.filter(p => p.status === 'lost').length, color: '#94A3B8', filter: 'lost' },
  ];

  // ── 列定义（驱动 DataTable）──
  const columns: ColumnDef<Prospect, unknown>[] = [
    {
      id: 'prospectNo',
      header: '编号',
      accessorFn: (p) => p.prospectNo,
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" color="#3B82F6">{row.original.prospectNo}</Typography>
      ),
    },
    {
      id: 'companyName',
      header: '公司名称',
      accessorFn: (p) => p.companyName,
      cell: ({ row }) => <Typography variant="body2" fontWeight={500}>{row.original.companyName}</Typography>,
    },
    {
      id: 'contact',
      header: '联系人',
      accessorFn: (p) => p.contactName,
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2">{row.original.contactName}</Typography>
          <Typography variant="caption" color="text.secondary">{row.original.contactPhone}</Typography>
        </Box>
      ),
    },
    {
      id: 'industry',
      header: '行业',
      accessorFn: (p) => p.industry,
      cell: ({ row }) => <Typography variant="body2">{row.original.industry || '-'}</Typography>,
    },
    {
      id: 'region',
      header: '区域',
      accessorFn: (p) => p.region,
      cell: ({ row }) => <Typography variant="body2">{row.original.region || '-'}</Typography>,
    },
    {
      id: 'source',
      header: '来源',
      accessorFn: (p) => SOURCE_LABELS[p.source],
      cell: ({ row }) => <Chip label={SOURCE_LABELS[row.original.source]} size="small" variant="outlined" />,
    },
    {
      id: 'interestProducts',
      header: '意向产品',
      accessorFn: (p) => p.interestProducts.join(','),
      cell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {row.original.interestProducts.slice(0, 2).map(prod => (
            <Chip key={prod} label={prod} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Stack>
      ),
    },
    {
      id: 'estimatedValue',
      header: '预估金额',
      accessorFn: (p) => p.estimatedValue,
      cell: ({ row }) => (
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="body2" fontWeight={500}>
            {row.original.estimatedValue ? formatCurrency(row.original.estimatedValue) : '-'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'credit',
      header: '信用占用',
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        return p.creditLimit ? (
          <Box data-testid="credit-status" sx={{ minWidth: 130 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.round(((p.usedCredit || 0) / p.creditLimit) * 100))}
                sx={{ width: 70, height: 6, borderRadius: 3, bgcolor: '#E2E8F0',
                  '& .MuiLinearProgress-bar': { bgcolor: ((p.usedCredit || 0) > p.creditLimit ? '#EF4444' : '#3B82F6') } }} />
              <Typography variant="caption">{formatCurrency(p.usedCredit || 0)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">额度 {formatCurrency(p.creditLimit)}</Typography>
            {((p.usedCredit || 0) > p.creditLimit || ((p.usedCredit || 0) / p.creditLimit) >= 0.9) && (
              <Chip size="small" label="信用超额" color="error" sx={{ mt: 0.5 }} />
            )}
          </Box>
        ) : (
          <Box data-testid="credit-status">
            <Chip size="small" label="未授信" variant="outlined" color="default" />
          </Box>
        );
      },
    },
    {
      id: 'status',
      header: '状态',
      accessorFn: (p) => STATUS_LABELS[p.status],
      cell: ({ row }) => (
        <Chip label={STATUS_LABELS[row.original.status]} size="small"
          sx={{ bgcolor: STATUS_COLORS[row.original.status] + '15', color: STATUS_COLORS[row.original.status], fontWeight: 500 }} />
      ),
    },
    {
      id: 'probability',
      header: '成交概率',
      accessorFn: (p) => p.probability,
      cell: ({ row }) => {
        const p = row.original;
        return p.probability ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress variant="determinate" value={p.probability}
              sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': { bgcolor: STATUS_COLORS[p.status] } }} />
            <Typography variant="caption">{p.probability}%</Typography>
          </Box>
        ) : '-';
      },
    },
    {
      id: 'nextFollowupDate',
      header: '下次跟进',
      accessorFn: (p) => p.nextFollowupDate,
      cell: ({ row }) => <Typography variant="body2">{row.original.nextFollowupDate || '-'}</Typography>,
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <Tooltip title="查看跟进记录">
              <IconButton size="small" onClick={() => { setSelectedProspect(p); setFollowupOpen(true); }}>
                <Notes fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="编辑">
              <IconButton size="small" onClick={() => openEdit(p)}><Edit fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  // ── 导入：把表头行映射回 store 字段 ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h => h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const toNum = (v: string): number => {
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const mapImportRow = (r: Record<string, string>, headers: string[]): Prospect => {
    const now = new Date().toISOString();
    const statusVal = pickField(r, headers, '状态', 'status') || 'new';
    const sourceVal = pickField(r, headers, '来源', 'source') || 'other';
    const products = pickField(r, headers, '意向产品', 'interestProducts').split(',').map(s => s.trim()).filter(Boolean);
    return {
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prospectNo: pickField(r, headers, '编号', 'prospectNo') || genProspectNo(),
      companyName: pickField(r, headers, '公司名称', 'companyName'),
      contactName: pickField(r, headers, '联系人', 'contactName'),
      contactPhone: pickField(r, headers, '联系电话', 'contactPhone'),
      contactEmail: pickField(r, headers, '联系邮箱', 'contactEmail') || '',
      industry: pickField(r, headers, '行业', 'industry') || undefined,
      region: pickField(r, headers, '区域', 'region') || undefined,
      source: (Object.keys(SOURCE_LABELS).includes(sourceVal) ? sourceVal : 'other') as ProspectSource,
      status: (Object.keys(STATUS_LABELS).includes(statusVal) ? statusVal : 'new') as ProspectStatus,
      interestProducts: products.length ? products : [],
      estimatedValue: toNum(pickField(r, headers, '预估金额', 'estimatedValue')) || undefined,
      probability: Number(pickField(r, headers, '成交概率', 'probability').replace(/[^0-9.]/g, '')) || undefined,
      nextFollowupDate: pickField(r, headers, '下次跟进', 'nextFollowupDate') || undefined,
      followupRecords: [],
      assignedTo: pickField(r, headers, '负责人', 'assignedTo'),
      creditLimit: toNum(pickField(r, headers, '信用额度', 'creditLimit')) || undefined,
      usedCredit: 0,
      notes: pickField(r, headers, '备注', 'notes') || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    } as unknown as Prospect;
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addProspect(mapImportRow(r, headers)));
  };

  return (
    <PageWrapper
      title="意向客户管理"
      actions={
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新增意向客户</Button>
      }
    >
      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {stats.map(s => (
          <Paper key={s.label} sx={{ px: 2.5, py: 2, borderRadius: 3, cursor: 'pointer', flex: 1,
            border: `1px solid ${statusFilter === s.filter ? s.color : s.color + '20'}`,
            bgcolor: statusFilter === s.filter ? s.color + '08' : 'white',
          }} onClick={() => setStatusFilter(s.filter as ProspectStatus | '')}>
            <Typography variant="h5" fontWeight={700} color={s.color}>{s.count}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* 搜索和筛选 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField size="small" placeholder="搜索公司/编号/联系人" value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ color: '#94A3B8', mr: 0.5, fontSize: 18 }} /> }}
            sx={{ width: 260 }} />
          <Box flex={1} />
        </Stack>
      </Paper>

      {/* 客户列表 */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <DataTable<Prospect>
          data={filtered}
          columns={columns}
          enableExport
          enableImport
          columnConfigKey="sales-prospect-list"
          onImport={handleImport}
        />
      </Paper>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {editingId ? '编辑意向客户' : '新增意向客户'}
            <IconButton onClick={() => setDialogOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="公司名称" value={form.companyName}
                onChange={e => setField('companyName', e.target.value)} data-testid="prospect-company" />
              <TextField fullWidth label="联系人" value={form.contactName}
                onChange={e => setField('contactName', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="联系电话" value={form.contactPhone}
                onChange={e => setField('contactPhone', e.target.value)} />
              <TextField fullWidth label="联系邮箱" value={form.contactEmail}
                onChange={e => setField('contactEmail', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="行业" value={form.industry} onChange={e => setField('industry', e.target.value)} />
              <TextField fullWidth label="区域" value={form.region} onChange={e => setField('region', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField select fullWidth label="来源" value={form.source} onChange={e => setField('source', e.target.value)}>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField select fullWidth label="状态" value={form.status} onChange={e => setField('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField fullWidth label="意向产品（逗号分隔）" value={form.interestProducts}
              onChange={e => setField('interestProducts', e.target.value)} placeholder="如：钢板, 接触器" />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="预估金额" type="number" value={form.estimatedValue}
                onChange={e => setField('estimatedValue', e.target.value)} />
              <TextField fullWidth label="成交概率(%)" type="number" value={form.probability}
                onChange={e => setField('probability', e.target.value)} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth label="负责人" value={form.assignedTo} onChange={e => setField('assignedTo', e.target.value)} />
              <TextField fullWidth label="信用额度" type="number" value={form.creditLimit}
                onChange={e => setField('creditLimit', e.target.value)} />
            </Stack>
            <TextField fullWidth label="下次跟进日期" type="date" value={form.nextFollowupDate}
              onChange={e => setField('nextFollowupDate', e.target.value)}
              InputLabelProps={{ shrink: true }} />
            <TextField fullWidth label="备注" multiline minRows={2} value={form.notes}
              onChange={e => setField('notes', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.companyName.trim()}
            data-testid="prospect-save">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 跟进记录弹窗 */}
      <Dialog open={followupOpen} onClose={() => setFollowupOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            跟进记录 — {selectedProspect?.companyName}
            <IconButton onClick={() => setFollowupOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedProspect?.followupRecords.length === 0 ? (
            <Alert severity="info">暂无跟进记录</Alert>
          ) : (
            <Stack spacing={2}>
              {selectedProspect?.followupRecords.map((r: FollowupRecord) => (
                <Paper key={r.id} sx={{ p: 2, bgcolor: '#F8FAFC' }}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="subtitle2">{r.method === 'visit' ? '拜访' : r.method === 'phone' ? '电话' : r.method === 'email' ? '邮件' : r.method}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.date} · {r.followedBy}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{r.content}</Typography>
                  <Box mt={1} p={1} bgcolor="white" borderRadius={1}>
                    <Typography variant="caption" color="#10B981">结果：{r.result}</Typography>
                    {r.nextAction && (
                      <Typography variant="caption" color="#3B82F6" display="block">下一步：{r.nextAction}</Typography>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFollowupOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default ProspectList;
