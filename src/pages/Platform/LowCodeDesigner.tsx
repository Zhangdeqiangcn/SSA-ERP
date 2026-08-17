import React, { useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Tabs, Tab, MenuItem, Select, FormControl, InputLabel, Chip, Paper,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useLowCodeStore } from '@/stores';
import type { LowCodeField, LowCodeFieldType } from '@/types';

const FIELD_TYPES: LowCodeFieldType[] = ['text', 'number', 'date', 'select', 'textarea', 'checkbox'];

const LowCodeDesigner: React.FC = () => {
  const { formDefinitions, formRecords, addFormDefinition, deleteFormDefinition, submitForm, deleteRecord } =
    useLowCodeStore();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<LowCodeField[]>([]);
  const [runtimeFormId, setRuntimeFormId] = useState(formDefinitions[0]?.id ?? '');
  const [runtimeData, setRuntimeData] = useState<Record<string, unknown>>({});

  const addFieldRow = () =>
    setFields((f) => [...f, { key: `f${f.length + 1}`, label: '', type: 'text' }]);
  const updateField = (idx: number, patch: Partial<LowCodeField>) =>
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const removeField = (idx: number) => setFields((f) => f.filter((_, i) => i !== idx));

  const handleConfirm = () => {
    if (!name.trim()) return;
    addFormDefinition({ name: name.trim(), description: description.trim(), fields });
    setName(''); setDescription(''); setFields([]); setOpen(false);
  };

  const handleSubmitRuntime = () => {
    if (!runtimeFormId) return;
    submitForm(runtimeFormId, runtimeData);
    setRuntimeData({});
  };

  const runtimeForm = formDefinitions.find((f) => f.id === runtimeFormId);

  return (
    <Box sx={{ p: 3 }} data-testid="lowcode">
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>低代码单据设计器</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="表单定义" />
        <Tab label="数据填报" />
        <Tab label="提交记录" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Button data-testid="lc-form-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
            新建表单
          </Button>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>表单名称</TableCell>
                <TableCell>字段数</TableCell>
                <TableCell>说明</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formDefinitions.map((f) => (
                <TableRow key={f.id} data-testid="lc-form-row">
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.fields.length}</TableCell>
                  <TableCell>{f.description}</TableCell>
                  <TableCell>
                    <IconButton data-testid="lc-form-del" onClick={() => deleteFormDefinition(f.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>选择表单</InputLabel>
            <Select
              data-testid="lc-runtime-form"
              value={runtimeFormId}
              label="选择表单"
              onChange={(e) => { setRuntimeFormId(e.target.value); setRuntimeData({}); }}
            >
              {formDefinitions.map((f) => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {runtimeForm?.fields.map((field) => (
            <Box key={field.key} sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#64748B' }}>{field.label}{field.required ? ' *' : ''}</Typography>
              {field.type === 'select' ? (
                <FormControl fullWidth>
                  <Select
                    data-testid={`lc-field-${field.key}`}
                    value={(runtimeData[field.key] as string) ?? ''}
                    onChange={(e) => setRuntimeData((d) => ({ ...d, [field.key]: e.target.value }))}
                  >
                    {(field.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
              ) : field.type === 'checkbox' ? (
                <Chip data-testid={`lc-field-${field.key}`} label={runtimeData[field.key] ? '是' : '否'}
                  onClick={() => setRuntimeData((d) => ({ ...d, [field.key]: !d[field.key] }))} />
              ) : (
                <TextField
                  data-testid={`lc-field-${field.key}`}
                  fullWidth
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  multiline={field.type === 'textarea'}
                  value={(runtimeData[field.key] as string) ?? ''}
                  onChange={(e) => setRuntimeData((d) => ({ ...d, [field.key]: e.target.value }))}
                />
              )}
            </Box>
          ))}
          <Button data-testid="lc-submit" variant="contained" onClick={handleSubmitRuntime}>提交</Button>
        </Paper>
      )}

      {tab === 2 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>表单</TableCell>
              <TableCell>数据摘要</TableCell>
              <TableCell>提交时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formRecords.map((r) => (
              <TableRow key={r.id} data-testid="lc-record-row">
                <TableCell>{r.formName}</TableCell>
                <TableCell>{Object.entries(r.data).map(([k, v]) => `${k}:${v}`).join('，')}</TableCell>
                <TableCell>{r.createdAt}</TableCell>
                <TableCell>
                  <IconButton data-testid="lc-record-del" onClick={() => deleteRecord(r.id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建表单</DialogTitle>
        <DialogContent>
          <TextField data-testid="lc-form-name" fullWidth label="表单名称" value={name}
            onChange={(e) => setName(e.target.value)} sx={{ mb: 2, mt: 1 }} />
          <TextField data-testid="lc-form-desc" fullWidth label="说明" value={description}
            onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} />
          <Button data-testid="lc-field-add" startIcon={<AddIcon />} onClick={addFieldRow} sx={{ mb: 1 }}>添加字段</Button>
          {fields.map((f, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <TextField data-testid={`lc-field-label-${idx}`} label="字段名" value={f.label}
                onChange={(e) => updateField(idx, { label: e.target.value })} />
              <FormControl sx={{ minWidth: 120 }}>
                <Select data-testid={`lc-field-type-${idx}`} value={f.type}
                  onChange={(e) => updateField(idx, { type: e.target.value as LowCodeFieldType })}>
                  {FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <IconButton onClick={() => removeField(idx)}><DeleteIcon /></IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button data-testid="lc-form-add-confirm" variant="contained" onClick={handleConfirm}>确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LowCodeDesigner;
