import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Chip, Select, MenuItem, TextField, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, Stack,
  Alert, Snackbar, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, ArrowUpward, ArrowDownward, RestartAlt, Tune,
} from '@mui/icons-material';
import {
  useCustomFieldStore,
  CUSTOM_FIELD_ENTITY_LABELS,
  CUSTOM_FIELD_TYPE_LABELS,
  CustomFieldEntity,
  CustomFieldType,
  CustomFieldDef,
  makeFieldKey,
} from '@/stores/customFieldStore';
import { ConfirmDialog } from '@/components/common';

const ENTITIES = Object.keys(CUSTOM_FIELD_ENTITY_LABELS) as CustomFieldEntity[];

const CustomFieldTab: React.FC = () => {
  const [entity, setEntity] = useState<CustomFieldEntity>('material');
  const { fields, addField, updateField, removeField, moveField, resetEntity } = useCustomFieldStore();
  const list = fields[entity] || [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const openAdd = () => {
    setEditing(null);
    setLabel('');
    setType('text');
    setRequired(false);
    setPlaceholder('');
    setOptionsText('');
    setDialogOpen(true);
  };

  const openEdit = (def: CustomFieldDef) => {
    setEditing(def);
    setLabel(def.label);
    setType(def.type);
    setRequired(!!def.required);
    setPlaceholder(def.placeholder || '');
    setOptionsText((def.options || []).join('\n'));
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setSnackbar('请输入字段名称');
      return;
    }
    const options = type === 'select'
      ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const def: CustomFieldDef = {
      key: editing?.key || makeFieldKey(trimmed),
      label: trimmed,
      type,
      required,
      placeholder: placeholder.trim() || undefined,
      options,
    };
    if (editing) {
      updateField(entity, editing.key, def);
      setSnackbar('已更新字段');
    } else {
      addField(entity, def);
      setSnackbar('已新增字段');
    }
    setDialogOpen(false);
  };

  // V3.92.0：删除/清空为不可逆操作，改走统一确认弹窗（替代浏览器原生 confirm）
  const [confirmState, setConfirmState] = useState<{ kind: 'field' | 'reset'; key?: string } | null>(null);

  const handleDelete = (key: string) => setConfirmState({ kind: 'field', key });

  const handleReset = () => setConfirmState({ kind: 'reset' });

  const runConfirmed = () => {
    if (!confirmState) return;
    if (confirmState.kind === 'field' && confirmState.key) {
      removeField(entity, confirmState.key);
      setSnackbar('已删除字段');
    } else {
      resetEntity(entity);
      setSnackbar('已重置');
    }
    setConfirmState(null);
  };

  return (
    <>
    <ConfirmDialog
      open={confirmState !== null}
      title={confirmState?.kind === 'reset' ? '确认清空' : '确认删除'}
      content={confirmState?.kind === 'reset'
        ? `确定清空「${CUSTOM_FIELD_ENTITY_LABELS[entity]}」的全部自定义字段？`
        : '确定删除该自定义字段？已录入的数据不会自动清除。'}
      onConfirm={runConfirmed}
      onCancel={() => setConfirmState(null)}
      confirmText="确认"
      confirmColor="error"
    />
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>自定义字段</Typography>
          <Typography variant="caption" color="text.secondary">
            为业务实体配置扩展字段，保存后在对应表单自动出现，随主数据一起存储。
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openAdd}>新增字段</Button>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>业务实体</InputLabel>
          <Select
            value={entity}
            label="业务实体"
            onChange={(e) => setEntity(e.target.value as CustomFieldEntity)}
          >
            {ENTITIES.map((en) => (
              <MenuItem key={en} value={en}>{CUSTOM_FIELD_ENTITY_LABELS[en]}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" startIcon={<RestartAlt />} color="warning" onClick={handleReset}>
          重置该实体
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>字段名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>必填</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>可选项</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((def, idx) => (
              <TableRow key={def.key} hover>
                <TableCell>{def.label}</TableCell>
                <TableCell><Chip size="small" label={CUSTOM_FIELD_TYPE_LABELS[def.type]} /></TableCell>
                <TableCell>{def.required ? '是' : '否'}</TableCell>
                <TableCell>
                  {def.type === 'select'
                    ? (def.options || []).join('、') || '—'
                    : '—'}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="上移"><span><IconButton size="small" disabled={idx === 0} onClick={() => moveField(entity, def.key, -1)}><ArrowUpward fontSize="small" /></IconButton></span></Tooltip>
                  <Tooltip title="下移"><span><IconButton size="small" disabled={idx === list.length - 1} onClick={() => moveField(entity, def.key, 1)}><ArrowDownward fontSize="small" /></IconButton></span></Tooltip>
                  <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(def)}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => handleDelete(def.key)}><Delete fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  <Tune sx={{ fontSize: 32, opacity: 0.3, display: 'block', mx: 'auto', mb: 1 }} />
                  暂无自定义字段，点击「新增字段」开始配置
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? '编辑字段' : '新增自定义字段'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              fullWidth label="字段名称" value={label}
              onChange={(e) => setLabel(e.target.value)} placeholder="如：环保等级"
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>字段类型</InputLabel>
              <Select value={type} label="字段类型" onChange={(e) => setType(e.target.value as CustomFieldType)}>
                {(Object.keys(CUSTOM_FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => (
                  <MenuItem key={t} value={t}>{CUSTOM_FIELD_TYPE_LABELS[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {type === 'select' && (
              <TextField
                fullWidth multiline rows={3} label="可选项（每行一个）"
                value={optionsText} onChange={(e) => setOptionsText(e.target.value)}
                placeholder={'选项A\n选项B'}
                helperText="仅「下拉选择」类型生效"
              />
            )}
            <TextField
              fullWidth label="占位提示" value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)} placeholder="如：请输入…"
            />
            <FormControlLabel
              control={<Switch checked={required} onChange={(e) => setRequired(e.target.checked)} />}
              label="必填"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar} autoHideDuration={2000}
        onClose={() => setSnackbar('')} message={snackbar}
      />
    </Box>
    </>
  );
};

export default CustomFieldTab;
