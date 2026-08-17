import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, IconButton, LinearProgress,
  Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Snackbar,
  Tabs, Tab,
} from '@mui/material';
import { Add, Edit, Link as LinkIcon } from '@mui/icons-material';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common';
import { useQualityStore } from '@/stores/qualityStore';
import { PDCARecord, PDCAStatus } from '@/types/quality';

const PDCA_STEPS: PDCAStatus[] = ['plan', 'do', 'check', 'act', 'closed'];
const CAPA_STEPS: PDCAStatus[] = ['open', 'in_progress', 'verified', 'closed'];
const PDCA_STEP_LABELS: Record<PDCAStatus, string> = {
  plan: 'P - 计划',
  do: 'D - 执行',
  check: 'C - 检查',
  act: 'A - 改进',
  closed: '已关闭',
  open: '待处理',
  in_progress: '进行中',
  verified: '已验证',
};
const PDCA_COLORS: Record<PDCAStatus, string> = {
  plan: '#3B82F6',
  do: '#F59E0B',
  check: '#6366F1',
  act: '#10B981',
  closed: '#94A3B8',
  open: '#EF4444',
  in_progress: '#3B82F6',
  verified: '#10B981',
};
const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};
const PRIORITY_LABELS: Record<string, string> = { high: '高', medium: '中', low: '低' };
const SOURCE_LABELS: Record<string, string> = {
  inspection: '检验发现',
  customer_complaint: '客户投诉',
  internal_audit: '内部审核',
  other: '其他',
};

const TAB_VALUE = { all: 'all', open: 'open', in_progress: 'in_progress', completed: 'completed' } as const;

const PDCAList: React.FC = () => {
  const { pdcaRecords, unqualifiedItems, addPdcaRecord, updatePdcaRecord, updateUnqualifiedItem } = useQualityStore();
  const [tab, setTab] = useState<string>(TAB_VALUE.all);
  const [dialog, setDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PDCARecord | null>(null);
  const [snackbar, setSnackbar] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 新建表单
  const [formData, setFormData] = useState({
    title: '', source: 'inspection' as string, priority: 'high' as string,
    problemDescription: '', targetDate: '', owner: '', linkedNcrId: '',
  });

  // 编辑表单
  const [editForm, setEditForm] = useState({
    correctiveAction: '', preventiveAction: '', verificationResult: '',
  });

  // Tab 筛选
  const filteredRecords = useMemo(() => {
    if (tab === TAB_VALUE.all) return pdcaRecords;
    if (tab === TAB_VALUE.open) return pdcaRecords.filter(r => r.status === 'open' || r.status === 'plan');
    if (tab === TAB_VALUE.in_progress) return pdcaRecords.filter(r => r.status === 'in_progress' || r.status === 'do' || r.status === 'check' || r.status === 'act');
    if (tab === TAB_VALUE.completed) return pdcaRecords.filter(r => r.status === 'closed' || r.status === 'verified');
    return pdcaRecords;
  }, [pdcaRecords, tab]);

  // 判断是否为 CAPA 模式
  const isCapaRecord = (r: PDCARecord) =>
    r.status === 'open' || r.status === 'in_progress' || r.status === 'verified';

  // 计算进度
  const getProgress = (record: PDCARecord): number => {
    const steps = isCapaRecord(record) ? CAPA_STEPS : PDCA_STEPS;
    const idx = steps.indexOf(record.status);
    return record.status === 'closed' ? 100 : Math.round((idx / (steps.length - 1)) * 100);
  };

  // 可链接的不合格品（open状态的）
  const linkableNcrs = useMemo(() =>
    unqualifiedItems.filter(u => u.status !== 'closed'),
  [unqualifiedItems]);

  // 新建 PDCA/CAPA
  const handleCreate = () => {
    const now = Date.now();
    const pdcaNo = `PDCA-${now.toString().slice(-8)}`;
    const linkedNcr = linkableNcrs.find(n => n.id === formData.linkedNcrId);
    const newRecord = {
      id: `pdca-${now}`,
      pdcaNo,
      title: formData.title || (linkedNcr ? `CAPA - ${linkedNcr.itemNo}` : ''),
      status: 'open' as PDCAStatus,
      source: formData.source as any,
      relatedItemId: formData.linkedNcrId || undefined,
      priority: formData.priority as 'high' | 'medium' | 'low',
      problemDescription: formData.problemDescription || (linkedNcr ? linkedNcr.defectDescription : ''),
      targetDate: formData.targetDate,
      owner: formData.owner || '质量工程师',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedBy: 'admin',
    };
    addPdcaRecord(newRecord);

    // 更新关联不合格品状态
    if (linkedNcr) {
      updateUnqualifiedItem(linkedNcr.id, { status: 'capa_raised' });
      setSnackbarMsg(`已关联 NCR ${linkedNcr.itemNo} 并创建 CAPA ${pdcaNo}`);
    } else {
      setSnackbarMsg('PDCA 改进项已创建');
    }

    setDialog(false);
    setSnackbar(true);
    setFormData({ title: '', source: 'inspection', priority: 'high', problemDescription: '', targetDate: '', owner: '', linkedNcrId: '' });
  };

  // 打开编辑
  const handleOpenEdit = (record: PDCARecord) => {
    setEditingRecord(record);
    setEditForm({
      correctiveAction: record.correctiveAction || '',
      preventiveAction: record.preventiveAction || '',
      verificationResult: record.verificationResult || '',
    });
    setEditDialog(true);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updatePdcaRecord(editingRecord.id, {
      ...editForm,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    });
    setSnackbarMsg('已保存');
    setSnackbar(true);
    setEditDialog(false);
  };

  // CAPA 状态流转
  const handleStatusChange = (record: PDCARecord, newStatus: PDCAStatus) => {
    updatePdcaRecord(record.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    });

    // 验证通过后自动关闭关联不合格品
    if (newStatus === 'verified' && record.relatedItemId) {
      updateUnqualifiedItem(record.relatedItemId, { status: 'closed' });
      setSnackbarMsg(`CAPA ${record.pdcaNo} 已验证通过，关联 NCR 已自动关闭`);
    } else if (newStatus === 'closed') {
      setSnackbarMsg(`CAPA ${record.pdcaNo} 已关闭`);
    }
    setSnackbar(true);
  };

  // 获取状态流转的可选值
  const getAvailableStatuses = (record: PDCARecord): { value: PDCAStatus; label: string }[] => {
    if (isCapaRecord(record)) {
      const flow: PDCAStatus[] = ['open', 'in_progress', 'verified', 'closed'];
      const idx = flow.indexOf(record.status);
      return flow.slice(idx + 1).map(s => ({ value: s, label: PDCA_STEP_LABELS[s] }));
    }
    const idx = PDCA_STEPS.indexOf(record.status);
    return PDCA_STEPS.slice(idx + 1).map(s => ({ value: s, label: PDCA_STEP_LABELS[s] }));
  };

  // ── 列表列定义（驱动 DataTable）──
  const columns: ColumnDef<PDCARecord, unknown>[] = [
    {
      accessorKey: 'pdcaNo',
      header: '编号',
      cell: ({ row }) => (
        <Typography variant="body2" fontFamily="monospace" color="#94A3B8">{row.original.pdcaNo}</Typography>
      ),
    },
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600}>{row.original.title}</Typography>
          <Typography variant="caption" color="text.secondary">{row.original.problemDescription}</Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip label={PDCA_STEP_LABELS[row.original.status]} size="small"
          sx={{ bgcolor: PDCA_COLORS[row.original.status] + '15', color: PDCA_COLORS[row.original.status], fontWeight: 500 }} />
      ),
    },
    {
      accessorKey: 'priority',
      header: '优先级',
      cell: ({ row }) => (
        <Chip label={PRIORITY_LABELS[row.original.priority]} size="small"
          sx={{ bgcolor: PRIORITY_COLORS[row.original.priority] + '15', color: PRIORITY_COLORS[row.original.priority], fontWeight: 500 }} />
      ),
    },
    { accessorKey: 'owner', header: '负责人' },
    {
      accessorKey: 'targetDate',
      header: '目标日期',
      cell: ({ row }) => <Typography variant="body2" color="#94A3B8">{row.original.targetDate}</Typography>,
    },
    {
      accessorKey: 'source',
      header: '来源',
      cell: ({ row }) => SOURCE_LABELS[row.original.source] || row.original.source,
    },
    {
      id: 'progress',
      header: '进度',
      enableSorting: false,
      cell: ({ row }) => {
        const p = getProgress(row.original);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
            <LinearProgress
              variant="determinate"
              value={p}
              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: PDCA_COLORS[row.original.status], borderRadius: 3 } }}
            />
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>{p}%</Typography>
          </Box>
        );
      },
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(r); }}>
              <Edit fontSize="small" />
            </IconButton>
            {getAvailableStatuses(r).map((s) => (
              <Button key={s.value} size="small" variant="outlined"
                sx={{
                  borderColor: PDCA_COLORS[s.value], color: PDCA_COLORS[s.value],
                  fontSize: '0.7rem', py: 0.3, px: 1, minWidth: 'auto',
                  '&:hover': { bgcolor: PDCA_COLORS[s.value] + '15', borderColor: PDCA_COLORS[s.value] },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange(r, s.value);
                }}>
                {s.label}
              </Button>
            ))}
          </Box>
        );
      },
    },
  ];

  // ── 导入：表头 → store 字段映射，调用 addPdcaRecord ──
  const pickField = (r: Record<string, string>, headers: string[], zh: string, en: string): string => {
    const key = headers.find(h =>
      h === zh || h.toLowerCase() === en.toLowerCase() || h.toLowerCase().replace(/\s/g, '') === en.toLowerCase());
    return key ? (r[key] ?? '') : '';
  };
  const VALID_STATUS: PDCAStatus[] = [...PDCA_STEPS, ...CAPA_STEPS];
  const SOURCE_ZH: Record<string, PDCARecord['source']> = {
    检验发现: 'inspection', 客户投诉: 'customer_complaint', 内部审核: 'internal_audit', 其他: 'other',
  };
  const PRIORITY_ZH: Record<string, 'high' | 'medium' | 'low'> = { 高: 'high', 中: 'medium', 低: 'low' };
  const mapPdcaRow = (r: Record<string, string>, headers: string[]): PDCARecord => {
    const now = new Date().toISOString();
    const statusRaw = pickField(r, headers, '状态', 'status');
    const sourceRaw = pickField(r, headers, '来源', 'source');
    const prioRaw = pickField(r, headers, '优先级', 'priority');
    return {
      id: `pdca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pdcaNo: pickField(r, headers, '编号', 'pdcaNo') || `PDCA-${Date.now().toString().slice(-8)}`,
      title: pickField(r, headers, '标题', 'title'),
      status: (VALID_STATUS.includes(statusRaw as PDCAStatus) ? statusRaw : 'open') as PDCAStatus,
      source: SOURCE_ZH[sourceRaw] || 'inspection',
      relatedItemId: undefined,
      priority: PRIORITY_ZH[prioRaw] || 'high',
      problemDescription: pickField(r, headers, '问题描述', 'problemDescription') || '',
      rootCause: '',
      targetDate: pickField(r, headers, '目标日期', 'targetDate') || '',
      owner: pickField(r, headers, '负责人', 'owner') || '质量工程师',
      createdAt: now,
      updatedAt: now,
      createdBy: '导入',
      updatedBy: '导入',
    };
  };
  const handleImport = (rows: Record<string, string>[], headers: string[]) => {
    rows.forEach(r => addPdcaRecord(mapPdcaRow(r, headers)));
  };

  const expandedRecord = expandedId ? filteredRecords.find(r => r.id === expandedId) || null : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>PDCA 质量改进 / CAPA</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>
          新建改进项 / CAPA
        </Button>
      </Box>

      {/* 标签页 */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} data-testid="pdca-tab-open">
        <Tab label="全部" value={TAB_VALUE.all} />
        <Tab label="待处理" value={TAB_VALUE.open} />
        <Tab label="进行中" value={TAB_VALUE.in_progress} />
        <Tab label="已完成" value={TAB_VALUE.completed} />
      </Tabs>

      {/* 统计 */}
      <Box sx={{ display: 'flex', gap: 2.5, mb: 3, flexWrap: 'wrap' }}>
        {([...PDCA_STEPS, ...CAPA_STEPS] as PDCAStatus[]).filter((v, i, a) => a.indexOf(v) === i).map((status) => {
          const count = pdcaRecords.filter(r => r.status === status).length;
          if (count === 0 && !['plan', 'do', 'check', 'act', 'closed'].includes(status)) return null;
          return (
            <Paper key={status} sx={{ px: 3, py: 2, borderRadius: 3, border: `1px solid ${PDCA_COLORS[status]}20`, flex: 1, minWidth: 100 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: PDCA_COLORS[status] }}>{count}</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>{PDCA_STEP_LABELS[status]}</Typography>
            </Paper>
          );
        })}
      </Box>

      {/* 主列表（DataTable） */}
      <DataTable<PDCARecord>
        data={filteredRecords}
        columns={columns}
        enablePagination
        enableExport
        enableImport
        columnConfigKey="quality-pdca-list"
        onImport={handleImport}
        onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
      />

      {/* 展开详情（点击行展开）*/}
      {expandedRecord && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mt: 2 }}>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', color: '#94A3B8' }}>{expandedRecord.pdcaNo}</Typography>
              <Chip label={PDCA_STEP_LABELS[expandedRecord.status]} size="small"
                sx={{ bgcolor: PDCA_COLORS[expandedRecord.status] + '15', color: PDCA_COLORS[expandedRecord.status], fontWeight: 500 }} />
              <Chip label={PRIORITY_LABELS[expandedRecord.priority]} size="small"
                sx={{ bgcolor: PRIORITY_COLORS[expandedRecord.priority] + '15', color: PRIORITY_COLORS[expandedRecord.priority], fontWeight: 500 }} />
              {expandedRecord.relatedItemId && (() => {
                const linkedNcr = unqualifiedItems.find(u => u.id === expandedRecord.relatedItemId);
                return linkedNcr ? (
                  <Chip label={`关联NCR: ${linkedNcr.itemNo}`} size="small" icon={<LinkIcon sx={{ fontSize: 14 }} />}
                    sx={{ bgcolor: '#ECFDF5', color: '#10B981', fontWeight: 500 }} />
                ) : null;
              })()}
              {isCapaRecord(expandedRecord) && (
                <Chip label="CAPA" size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.65rem' }} />
              )}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>{expandedRecord.title}</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 1.5 }}>{expandedRecord.problemDescription}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>进度</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>{getProgress(expandedRecord)}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getProgress(expandedRecord)}
                  sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: PDCA_COLORS[expandedRecord.status], borderRadius: 3 } }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', whiteSpace: 'nowrap' }}>
                负责人: {expandedRecord.owner}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', whiteSpace: 'nowrap' }}>
                目标: {expandedRecord.targetDate}
              </Typography>
            </Box>

            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #F1F5F9' }}>
              {expandedRecord.correctiveAction && (
                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <Typography variant="caption" sx={{ color: '#1D4ED8', fontWeight: 600 }}>纠正措施：</Typography>
                  <Typography variant="body2" sx={{ color: '#1E40AF', mt: 0.5 }}>{expandedRecord.correctiveAction}</Typography>
                </Box>
              )}
              {expandedRecord.preventiveAction && (
                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600 }}>预防措施：</Typography>
                  <Typography variant="body2" sx={{ color: '#166534', mt: 0.5 }}>{expandedRecord.preventiveAction}</Typography>
                </Box>
              )}
              {expandedRecord.verificationResult && (
                <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#FFF7ED', border: '1px solid #FDE68A' }}>
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>验证结果：</Typography>
                  <Typography variant="body2" sx={{ color: '#92400E', mt: 0.5 }}>{expandedRecord.verificationResult}</Typography>
                </Box>
              )}
              {expandedRecord.actionItems && expandedRecord.actionItems.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#1E293B' }}>行动计划</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {expandedRecord.actionItems.map((action) => (
                      <Box key={action.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2, bgcolor: '#F8FAFC' }}>
                        <Chip
                          label={action.status === 'completed' ? '已完成' : action.status === 'in_progress' ? '进行中' : '待开始'}
                          size="small"
                          sx={{
                            bgcolor: action.status === 'completed' ? '#ECFDF5' : action.status === 'in_progress' ? '#EFF6FF' : '#F8FAFC',
                            color: action.status === 'completed' ? '#10B981' : action.status === 'in_progress' ? '#3B82F6' : '#94A3B8',
                            fontWeight: 500, minWidth: 60,
                          }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>{action.description}</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8', whiteSpace: 'nowrap' }}>{action.owner} / {action.dueDate}</Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              {expandedRecord.rootCause && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#FFF7ED', border: '1px solid #FDE68A' }}>
                  <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>根本原因分析：</Typography>
                  <Typography variant="body2" sx={{ color: '#92400E', mt: 0.5 }}>{expandedRecord.rootCause}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* 新建对话框 */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>新建 PDCA 改进项 / CAPA</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="改进项标题" fullWidth value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>来源</InputLabel>
              <Select label="来源" value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}>
                <MenuItem value="inspection">检验发现</MenuItem>
                <MenuItem value="customer_complaint">客户投诉</MenuItem>
                <MenuItem value="internal_audit">内部审核</MenuItem>
                <MenuItem value="other">其他</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth data-testid="pdca-link-ncr">
              <InputLabel>关联不合格品号（可选）</InputLabel>
              <Select label="关联不合格品号（可选）" value={formData.linkedNcrId}
                onChange={(e) => {
                  const ncrId = e.target.value;
                  const linked = linkableNcrs.find(n => n.id === ncrId);
                  setFormData({
                    ...formData,
                    linkedNcrId: ncrId,
                    problemDescription: linked ? linked.defectDescription : formData.problemDescription,
                    title: linked ? `CAPA - ${linked.itemNo}` : formData.title,
                    priority: 'high',
                  });
                }}>
                <MenuItem value="">不关联</MenuItem>
                {linkableNcrs.map(n => (
                  <MenuItem key={n.id} value={n.id}>{n.itemNo} - {n.materialName} ({n.defectDescription?.slice(0, 30)})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select label="优先级" value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
            <TextField label="问题描述" multiline rows={3} fullWidth value={formData.problemDescription}
              onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })} />
            <TextField label="目标完成日期" type="date" fullWidth InputLabelProps={{ shrink: true }} value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })} />
            <TextField label="负责人" fullWidth value={formData.owner}
              onChange={(e) => setFormData({ ...formData, owner: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          编辑 {editingRecord?.pdcaNo} - {editingRecord?.title}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="纠正措施" multiline rows={3} fullWidth value={editForm.correctiveAction}
              placeholder="描述为消除已发现的不合格所采取的措施..."
              onChange={(e) => setEditForm({ ...editForm, correctiveAction: e.target.value })} />
            <TextField label="预防措施" multiline rows={3} fullWidth value={editForm.preventiveAction}
              placeholder="描述为消除潜在不合格原因所采取的措施..."
              onChange={(e) => setEditForm({ ...editForm, preventiveAction: e.target.value })} />
            <TextField label="验证结果" multiline rows={3} fullWidth value={editForm.verificationResult}
              placeholder="描述措施有效性的验证结果..."
              onChange={(e) => setEditForm({ ...editForm, verificationResult: e.target.value })} />
            {/* 状态流转按钮 */}
            {editingRecord && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 1 }}>
                {getAvailableStatuses(editingRecord).map((s) => (
                  <Button key={s.value} size="small" variant="outlined"
                    sx={{
                      borderColor: PDCA_COLORS[s.value], color: PDCA_COLORS[s.value],
                      '&:hover': { bgcolor: PDCA_COLORS[s.value] + '15', borderColor: PDCA_COLORS[s.value] },
                    }}
                    onClick={() => {
                      handleStatusChange(editingRecord, s.value);
                      setEditDialog(false);
                    }}>
                    流转到: {s.label}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar} autoHideDuration={3000} onClose={() => setSnackbar(false)} message={snackbarMsg} />
    </Box>
  );
};

export default PDCAList;
