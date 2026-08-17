import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Stack, Switch, FormControlLabel, Alert,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useConditionStore } from '@/stores/conditionStore';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import type { ConditionRecord, ConditionType, CalculationRule } from '@/types';

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  price: '价格',
  discount: '折扣',
  freight: '运费',
  tax: '税费',
  surcharge: '附加费',
};

const CALC_RULE_LABELS: Record<CalculationRule, string> = {
  fixed: '固定金额',
  percentage: '百分比',
  quantity_based: '按数量',
  tiered: '阶梯',
};

const emptyCondition: Omit<ConditionRecord, 'id'> = {
  conditionType: 'price',
  rate: 0,
  calcRule: 'fixed',
  priority: 1,
  active: true,
};

const ConditionTab: React.FC = () => {
  const { conditions, addCondition, updateCondition, deleteCondition } = useConditionStore();
  const vendors = useVendorStore((s) => s.vendors);
  const materials = useMaterialStore((s) => s.materials);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<ConditionRecord, 'id'>>(emptyCondition);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(emptyCondition);
    setOpen(true);
  };

  const handleEdit = (cond: ConditionRecord) => {
    setEditingId(cond.id);
    const { id, ...rest } = cond;
    void id;
    setForm(rest);
    setOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateCondition(editingId, form);
    } else {
      addCondition(form);
    }
    setOpen(false);
    setForm(emptyCondition);
    setEditingId(null);
  };

  const typeColors: Record<ConditionType, 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
    price: 'primary',
    discount: 'success',
    freight: 'warning',
    tax: 'error',
    surcharge: 'info',
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        P1-04 条件技术引擎：管理采购/销售定价条件记录，支持固定金额、百分比、按数量、阶梯等多种计算规则。
        条件按优先级生效，用于采购订单和销售订单的自动取价叠加。
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>
          新增条件记录
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>条件类型</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>供应商</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>费率</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>计算规则</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>有效期</TableCell>
              <TableCell sx={{ fontWeight: 600, align: 'center' }}>优先级</TableCell>
              <TableCell sx={{ fontWeight: 600, align: 'center' }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 600, align: 'center' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conditions.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Chip
                    label={CONDITION_TYPE_LABELS[c.conditionType]}
                    size="small"
                    color={typeColors[c.conditionType]}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{c.vendorName || '通用'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{c.materialName || '通用'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {c.calcRule === 'percentage' ? `${c.rate}%` : c.rate.toLocaleString()}
                    {c.unit ? ` /${c.unit}` : ''}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={CALC_RULE_LABELS[c.calcRule]} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {c.fromDate || '不限'} ~ {c.toDate || '不限'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={c.priority}
                    size="small"
                    color={c.priority >= 5 ? 'error' : c.priority >= 3 ? 'warning' : 'default'}
                    sx={{ minWidth: 32 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    size="small"
                    checked={c.active}
                    onChange={() => updateCondition(c.id, { active: !c.active })}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleEdit(c)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteCondition(c.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {conditions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  暂无条件记录，点击「新增条件记录」添加
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增/编辑对话框 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingId ? '编辑条件记录' : '新增条件记录'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              select
              label="条件类型"
              value={form.conditionType}
              onChange={(e) => setForm({ ...form, conditionType: e.target.value as ConditionType })}
              fullWidth
              inputProps={{ 'data-testid': 'cond-type' } as React.InputHTMLAttributes<HTMLInputElement>}
            >
              {Object.entries(CONDITION_TYPE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>

            <Autocomplete
              options={vendors}
              getOptionLabel={(v) => v.name}
              value={vendors.find((v) => v.id === form.vendorId) || null}
              onChange={(_, val) => setForm({ ...form, vendorId: val?.id, vendorName: val?.name })}
              renderInput={(params) => <TextField {...params} label="供应商（可选）" />}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
            />

            <Autocomplete
              options={materials}
              getOptionLabel={(m) => `${m.name} (${m.code})`}
              value={materials.find((m) => m.id === form.materialId) || null}
              onChange={(_, val) => setForm({ ...form, materialId: val?.id, materialName: val?.name })}
              renderInput={(params) => <TextField {...params} label="物料（可选）" />}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
            />

            <TextField
              label="费率"
              type="number"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
              fullWidth
              inputProps={{ 'data-testid': 'cond-rate' } as React.InputHTMLAttributes<HTMLInputElement>}
            />

            <TextField
              select
              label="计算规则"
              value={form.calcRule}
              onChange={(e) => setForm({ ...form, calcRule: e.target.value as CalculationRule })}
              fullWidth
            >
              {Object.entries(CALC_RULE_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                label="生效日期（起）"
                type="date"
                value={form.fromDate || ''}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value || undefined })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="生效日期（止）"
                type="date"
                value={form.toDate || ''}
                onChange={(e) => setForm({ ...form, toDate: e.target.value || undefined })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="优先级"
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                sx={{ width: 120 }}
              />
              <TextField
                label="计费基础"
                value={form.scaleBasis || ''}
                onChange={(e) => setForm({ ...form, scaleBasis: e.target.value || undefined })}
                sx={{ flex: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="币种"
                value={form.currency || ''}
                onChange={(e) => setForm({ ...form, currency: e.target.value || undefined })}
                sx={{ width: 120 }}
              />
              <TextField
                label="单位"
                value={form.unit || ''}
                onChange={(e) => setForm({ ...form, unit: e.target.value || undefined })}
                sx={{ flex: 1 }}
              />
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
              }
              label="启用"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} data-testid="cond-submit">
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConditionTab;
