import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Table, TableContainer, TableHead,
  TableBody, TableRow, TableCell, Chip, Stack, Snackbar, Alert, MenuItem,
  Select, InputLabel, FormControl, Divider,
} from '@mui/material';
import {
  Add, Edit, Delete, SwapHoriz, Save, RestartAlt,
} from '@mui/icons-material';
import { useWarehouseStore } from '@/stores/warehouseStore';
import {
  useUnitConversionStore,
  convertUnit,
  type UnitRule,
} from '@/stores/unitConversionStore';

const UnitConversionTab: React.FC = () => {
  const rules = useUnitConversionStore((s) => s.rules);
  const loadRules = useUnitConversionStore((s) => s.loadRules);
  const addRule = useUnitConversionStore((s) => s.addRule);
  const updateRule = useUnitConversionStore((s) => s.updateRule);
  const removeRule = useUnitConversionStore((s) => s.removeRule);

  // V3.17.9 差距15 收口：规则主源在 D1，进入页面时拉一次
  useEffect(() => { void loadRules(); }, [loadRules]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UnitRule | null>(null);
  const [form, setForm] = useState<{ fromUnit: string; toUnit: string; factor: string }>({ fromUnit: '', toUnit: '', factor: '1' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  // 换算计算器
  const [convValue, setConvValue] = useState('1');
  const [convFrom, setConvFrom] = useState('箱');
  const [convTo, setConvTo] = useState('个');

  // 库存换算预览
  const inventoryRecords = useWarehouseStore((s) => s.inventoryRecords);
  const [previewRuleId, setPreviewRuleId] = useState('u1');

  const allUnits = useMemo(() => {
    const set = new Set<string>();
    rules.forEach(r => { set.add(r.fromUnit); set.add(r.toUnit); });
    return Array.from(set);
  }, [rules]);

  const openAdd = () => {
    setEditing(null);
    setForm({ fromUnit: '', toUnit: '', factor: '1' });
    setDialogOpen(true);
  };

  const openEdit = (rule: UnitRule) => {
    setEditing(rule);
    setForm({ fromUnit: rule.fromUnit, toUnit: rule.toUnit, factor: String(rule.factor) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const f = Number(form.factor);
    if (!form.fromUnit || !form.toUnit || !(f > 0)) {
      setSnackbar({ open: true, msg: '请填写完整且因子大于 0' });
      return;
    }
    if (form.fromUnit === form.toUnit) {
      setSnackbar({ open: true, msg: '源单位与目标单位不能相同' });
      return;
    }
    // V3.17.9：规则现在写服务端（D1 unit_conversions），必须等结果再提示 ——
    // 否则「保存成功」会在服务端拒绝（例如单位组合重复）时变成假消息。
    const ok = editing
      ? await updateRule(editing.id, { fromUnit: form.fromUnit, toUnit: form.toUnit, factor: f })
      : await addRule({ fromUnit: form.fromUnit, toUnit: form.toUnit, factor: f });
    if (!ok) {
      setSnackbar({ open: true, msg: useUnitConversionStore.getState().lastError || '保存失败' });
      return;
    }
    setDialogOpen(false);
    setSnackbar({ open: true, msg: '换算规则已保存' });
  };

  const handleDelete = async (id: string) => {
    const ok = await removeRule(id);
    setSnackbar({
      open: true,
      msg: ok ? '已删除换算规则' : (useUnitConversionStore.getState().lastError || '删除失败'),
    });
  };

  const handleReload = async () => {
    await loadRules();
    const err = useUnitConversionStore.getState().lastError;
    setSnackbar({ open: true, msg: err ? `加载失败：${err}` : '已从服务端重新加载' });
  };

  const convResult = convertUnit(Number(convValue) || 0, convFrom, convTo, rules);
  const previewRule = rules.find(r => r.id === previewRuleId);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8125rem' }}>
        定义物料多单位换算规则（如 1 箱 = 12 个）。可在下方计算器中即时换算，并批量预览库存按换算单位后的数量。对应 Phase 2「多单位换算」能力。
      </Alert>

      <Grid container spacing={3}>
        {/* 规则列表 */}
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EEF2F7' }}>
              <Typography variant="subtitle1" fontWeight={700}>换算规则</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<RestartAlt />} onClick={handleReload}>重新加载</Button>
                <Button size="small" variant="contained" startIcon={<Add />} onClick={openAdd}>新增规则</Button>
              </Stack>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 600 }}>源单位</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>目标单位</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>换算因子</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94A3B8' }}>暂无换算规则</TableCell></TableRow>
                  )}
                  {rules.map(rule => (
                    <TableRow key={rule.id} hover>
                      <TableCell><Chip label={rule.fromUnit} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={rule.toUnit} size="small" color="primary" variant="outlined" /></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontFamily="monospace">1 {rule.fromUnit} = {rule.factor} {rule.toUnit}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(rule)}><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* 换算计算器 */}
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SwapHoriz fontSize="small" /> 单位换算计算器
            </Typography>
            <Stack spacing={2}>
              <TextField label="数值" type="number" value={convValue}
                onChange={e => setConvValue(e.target.value)} fullWidth />
              <FormControl fullWidth>
                <InputLabel>源单位</InputLabel>
                <Select value={convFrom} label="源单位" onChange={e => setConvFrom(e.target.value)}>
                  {allUnits.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>目标单位</InputLabel>
                <Select value={convTo} label="目标单位" onChange={e => setConvTo(e.target.value)}>
                  {allUnits.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
              <Paper elevation={0} sx={{ bgcolor: '#EFF6FF', p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">换算结果</Typography>
                <Typography variant="h5" fontWeight={700} color="#3B82F6" sx={{ fontFamily: 'monospace' }}>
                  {convResult === null ? '不支持' : `${Number(convValue) || 0} ${convFrom} = ${convResult} ${convTo}`}
                </Typography>
                {convResult === null && (
                  <Typography variant="caption" color="error">未找到 {convFrom} → {convTo} 的换算路径</Typography>
                )}
              </Paper>
            </Stack>
          </Paper>
        </Grid>

        {/* 库存换算预览 */}
        <Grid item xs={12}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>库存多单位预览</Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>选择换算规则</InputLabel>
              <Select value={previewRuleId} label="选择换算规则" onChange={e => setPreviewRuleId(e.target.value)}>
                {rules.map(r => <MenuItem key={r.id} value={r.id}>{r.fromUnit} → {r.toUnit}（×{r.factor}）</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>仓库</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>原数量</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>换算后数量</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventoryRecords.slice(0, 12).map(rec => {
                  const converted = previewRule && rec.unit === previewRule.fromUnit
                    ? rec.quantity * previewRule.factor : null;
                  return (
                    <TableRow key={rec.id} hover>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{rec.materialCode}</Typography></TableCell>
                      <TableCell>{rec.materialName}</TableCell>
                      <TableCell>{rec.warehouseName}</TableCell>
                      <TableCell>{rec.quantity} {rec.unit}</TableCell>
                      <TableCell>
                        {converted !== null
                          ? <Chip label={`${converted} ${previewRule!.toUnit}`} size="small" color="success" />
                          : <Typography variant="caption" color="text.secondary">单位不匹配</Typography>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* 新增/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? '编辑换算规则' : '新增换算规则'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {/* 与后端 REQUIRED_CORE_FIELDS（unit_conversions: fromUnit + toUnit + factor）对齐：三项均必填 */}
            <TextField required label="源单位（如 箱）" value={form.fromUnit}
              onChange={e => setForm(f => ({ ...f, fromUnit: e.target.value }))} fullWidth />
            <TextField required label="目标单位（如 个）" value={form.toUnit}
              onChange={e => setForm(f => ({ ...f, toUnit: e.target.value }))} fullWidth />
            <TextField required label="换算因子（1 源单位 = ? 目标单位）" type="number" value={form.factor}
              onChange={e => setForm(f => ({ ...f, factor: e.target.value }))} fullWidth
              helperText="例如 1 箱 = 12 个，则填写 12" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={2500}
        onClose={() => setSnackbar({ open: false, msg: '' })} message={snackbar.msg} />
    </Box>
  );
};

export default UnitConversionTab;
