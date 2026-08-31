import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Grid, IconButton, Alert, FormControl, InputLabel, Select,
} from '@mui/material';
import { Add, Edit, Delete, Link } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useFMEAStore, FMEA, FMEAStatus } from '@/stores/fmeaStore';
import { useMaterialStore } from '@/stores/materialStore';

const STATUS_LABEL: Record<FMEAStatus, { label: string; color: 'default' | 'warning' | 'success' }> = {
  draft: { label: '草稿', color: 'default' },
  reviewed: { label: '已评审', color: 'warning' },
  approved: { label: '已批准', color: 'success' },
};

const RPN_COLOR = (rpn: number) => {
  if (rpn >= 200) return '#EF4444';
  if (rpn >= 100) return '#F59E0B';
  return '#10B981';
};

const uid = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const emptyForm: Partial<FMEA> = {
  item: '',
  function: '',
  failureMode: '',
  effect: '',
  severity: 5,
  cause: '',
  occurrence: 5,
  currentControl: '',
  detection: 5,
};

const FMEAPage: React.FC = () => {
  const { items, addItem, updateItem, deleteItem } = useFMEAStore();
  const { materials } = useMaterialStore();
  const [materialFilter, setMaterialFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<FMEA>>({ ...emptyForm });
  const [feedback, setFeedback] = useState('');

  const rpn = useMemo(() => {
    const s = form.severity ?? 5;
    const o = form.occurrence ?? 5;
    const d = form.detection ?? 5;
    return s * o * d;
  }, [form.severity, form.occurrence, form.detection]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
    setFeedback('');
  };

  const openEdit = (fmea: FMEA) => {
    setEditingId(fmea.id);
    setForm({
      item: fmea.item,
      function: fmea.function,
      failureMode: fmea.failureMode,
      effect: fmea.effect,
      severity: fmea.severity,
      cause: fmea.cause,
      occurrence: fmea.occurrence,
      currentControl: fmea.currentControl,
      detection: fmea.detection,
      recommendedAction: fmea.recommendedAction,
      materialId: fmea.materialId,
      materialName: fmea.materialName,
    });
    setDialogOpen(true);
    setFeedback('');
  };

  const handleSubmit = () => {
    if (!form.item || !form.failureMode) {
      setFeedback('请填写项目和失效模式。');
      return;
    }
    if (editingId) {
      const existing = items.find((x) => x.id === editingId);
      if (existing) {
        updateItem(editingId, {
          ...form,
          severity: form.severity ?? 5,
          occurrence: form.occurrence ?? 5,
          detection: form.detection ?? 5,
          rpn,
        });
      }
    } else {
      const newItem: FMEA = {
        id: uid('fmea'),
        number: `FMEA-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, '0')}`,
        item: form.item ?? '',
        function: form.function ?? '',
        failureMode: form.failureMode ?? '',
        effect: form.effect ?? '',
        severity: form.severity ?? 5,
        cause: form.cause ?? '',
        occurrence: form.occurrence ?? 5,
        currentControl: form.currentControl ?? '',
        detection: form.detection ?? 5,
        rpn,
        recommendedAction: form.recommendedAction,
        materialId: form.materialId,
        materialName: form.materialName,
        status: 'draft',
        createdAt: now(),
        updatedAt: now(),
        createdBy: '当前用户',
        updatedBy: '当前用户',
      };
      addItem(newItem);
    }
    setDialogOpen(false);
    setFeedback('');
  };

  const handleStatusChange = (id: string, status: FMEAStatus) => {
    updateItem(id, { status });
  };

  const sortedItems = useMemo(
    () => [...items]
      .filter((x) => !materialFilter || x.materialId === materialFilter)
      .sort((a, b) => b.rpn - a.rpn),
    [items, materialFilter]
  );

  return (
    <PageWrapper title="FMEA 失效模式与影响分析" subtitle="潜在失效模式分析：严重度(S) × 频度(O) × 探测度(D) = RPN">
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate} data-testid="fmea-add">
          新增FMEA
        </Button>
        <Chip label={`共 ${items.length} 条`} variant="outlined" />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>按关联物料筛选</InputLabel>
          <Select
            value={materialFilter}
            label="按关联物料筛选"
            onChange={(e) => setMaterialFilter(e.target.value)}
            data-testid="fmea-material-filter"
          >
            <MenuItem value="">全部</MenuItem>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.name}（{m.code}）</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>编号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>项目</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>关联物料</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>功能</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>失效模式</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>影响(S)</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>原因(O)</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>现行控制(D)</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>RPN</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedItems.map((fmea) => (
              <TableRow key={fmea.id} hover>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace" color="#3B82F6">
                    {fmea.number}
                  </Typography>
                </TableCell>
                <TableCell>{fmea.item}</TableCell>
                <TableCell>
                  {fmea.materialName ? (
                    <Chip size="small" icon={<Link />} variant="outlined" color="primary"
                      label={fmea.materialName} title={fmea.materialId} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 150 }} noWrap>
                    {fmea.function}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500} color="error.main">
                    {fmea.failureMode}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    size="small"
                    label={`${fmea.severity}`}
                    data-testid={`fmea-severity`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: fmea.severity >= 8 ? '#EF4444' : fmea.severity >= 5 ? '#F59E0B' : '#10B981',
                      color: '#fff',
                      minWidth: 36,
                    }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography fontWeight={500}>{fmea.occurrence}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Typography fontWeight={500}>{fmea.detection}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip
                    size="small"
                    label={fmea.rpn}
                    data-testid="fmea-rpn"
                    sx={{
                      fontWeight: 700,
                      bgcolor: RPN_COLOR(fmea.rpn),
                      color: '#fff',
                      minWidth: 50,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={STATUS_LABEL[fmea.status].label}
                    color={STATUS_LABEL[fmea.status].color}
                    onClick={() => {
                      const next: FMEAStatus =
                        fmea.status === 'draft' ? 'reviewed' : fmea.status === 'reviewed' ? 'approved' : 'draft';
                      handleStatusChange(fmea.id, next);
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(fmea)} data-testid="fmea-edit">
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteItem(fmea.id)} data-testid="fmea-delete">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4, color: '#94A3B8' }}>
                  暂无FMEA记录，点击"新增FMEA"创建
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? '编辑 FMEA' : '新增 FMEA'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="项目"
                value={form.item ?? ''}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
                data-testid="fmea-item"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>关联物料（可选）</InputLabel>
                <Select
                  value={form.materialId ?? ''}
                  label="关联物料（可选）"
                  onChange={(e) => {
                    const m = materials.find((x) => x.id === e.target.value);
                    setForm({ ...form, materialId: e.target.value || undefined, materialName: m?.name });
                  }}
                  data-testid="fmea-material"
                >
                  <MenuItem value="">不关联</MenuItem>
                  {materials.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name}（{m.code}）</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="功能"
                value={form.function ?? ''}
                onChange={(e) => setForm({ ...form, function: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="失效模式"
                value={form.failureMode ?? ''}
                onChange={(e) => setForm({ ...form, failureMode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="失效影响"
                value={form.effect ?? ''}
                onChange={(e) => setForm({ ...form, effect: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                select
                label="严重度 S (1-10)"
                value={form.severity ?? 5}
                onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })}
                data-testid="fmea-severity-input"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="失效原因"
                value={form.cause ?? ''}
                onChange={(e) => setForm({ ...form, cause: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                select
                label="频度 O (1-10)"
                value={form.occurrence ?? 5}
                onChange={(e) => setForm({ ...form, occurrence: Number(e.target.value) })}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="现行控制措施"
                value={form.currentControl ?? ''}
                onChange={(e) => setForm({ ...form, currentControl: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                select
                label="探测度 D (1-10)"
                value={form.detection ?? 5}
                onChange={(e) => setForm({ ...form, detection: Number(e.target.value) })}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  S({form.severity}) × O({form.occurrence}) × D({form.detection})
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: RPN_COLOR(rpn) }}
                  data-testid="fmea-rpn-calc"
                >
                  RPN = {rpn}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="建议措施（可选）"
                value={form.recommendedAction ?? ''}
                onChange={(e) => setForm({ ...form, recommendedAction: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
          {feedback && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFeedback('')}>
              {feedback}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSubmit} data-testid="fmea-submit">
            {editingId ? '保存修改' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default FMEAPage;
