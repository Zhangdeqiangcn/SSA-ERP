import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert, FormControlLabel, Switch, Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useMaterialStore } from '@/stores/materialStore';
import { useMaterialExtensionStore } from '@/stores/materialExtensionStore';
import { Material, ValuationClass, PriceControl, PlantParam, MaterialChangeField } from '@/types';

const VC_LABEL: Record<ValuationClass, string> = {
  RAW: '原材料', SEMI: '半成品', FG: '产成品', TRADING: '贸易商品', PACKAGING: '包装物', CONSUMABLE: '消耗品',
};

export default function MaterialValuationPage() {
  const { materials, updateMaterial } = useMaterialStore();
  const { changeDocs, logMaterialChange } = useMaterialExtensionStore();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [form, setForm] = useState<Partial<Material>>({});
  const [plants, setPlants] = useState<PlantParam[]>([]);

  const target = useMemo(() => materials.find((m) => m.id === targetId), [materials, targetId]);

  const openEdit = (m: Material) => {
    setTargetId(m.id);
    setForm({
      valuationClass: m.valuationClass, priceControl: m.priceControl,
      standardPrice: m.standardPrice,
      batchManaged: m.batchManaged, serialized: m.serialized,
    });
    setPlants(m.plantParams ? [...m.plantParams] : []);
    setOpen(true);
  };

  const handleSave = () => {
    if (!target) return;
    const fields: MaterialChangeField[] = [];
    const track: [keyof Material, string][] = [
      ['valuationClass', '评估类'], ['priceControl', '价控程序'], ['standardPrice', '标准价'],
      ['batchManaged', '批次管理'], ['serialized', '序列号管理'],
    ];
    track.forEach(([key, label]) => {
      const oldV = String(target[key] ?? '');
      const newV = String(form[key] ?? '');
      if (oldV !== newV) fields.push({ field: label, oldValue: oldV, newValue: newV });
    });
    if (JSON.stringify(plants) !== JSON.stringify(target.plantParams || [])) {
      fields.push({ field: '工厂维度', oldValue: `${target.plantParams?.length || 0}个`, newValue: `${plants.length}个` });
    }
    updateMaterial(target.id, {
      valuationClass: form.valuationClass,
      priceControl: form.priceControl,
      standardPrice: form.standardPrice,
      batchManaged: form.batchManaged,
      serialized: form.serialized,
      plantParams: plants,
    });
    if (fields.length > 0) {
      logMaterialChange({
        materialId: target.id, materialCode: target.code, materialName: target.name,
        changeType: 'valuation', fields, reason: '评估类/价控/工厂维度维护',
      });
    }
    setOpen(false);
  };

  const docsFor = (id: string) => changeDocs.filter((d) => d.materialId === id);

  return (
    <Box sx={{ p: 2 }} data-testid="material-valuation">
      <Typography variant="h5" gutterBottom>物料评估类 / 价控 / 工厂维度</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>对标 SAP 评估类与价控程序（S标准价/V移动平均价），支持多工厂评估视图，变更留痕。移动平均价与库存金额由入库过账自动滚动（A4 成本核算），不可手改。</Alert>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>物料</TableCell>
              <TableCell>评估类</TableCell>
              <TableCell>价控</TableCell>
              <TableCell>标准价</TableCell>
              <TableCell>移动平均价</TableCell>
              <TableCell>库存金额</TableCell>
              <TableCell>批次/序列号</TableCell>
              <TableCell>工厂维度</TableCell>
              <TableCell>变更</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id} data-testid="mv-row">
                <TableCell>{m.code} {m.name}</TableCell>
                <TableCell>{m.valuationClass ? VC_LABEL[m.valuationClass] : '—'}</TableCell>
                <TableCell>{m.priceControl || '—'}</TableCell>
                <TableCell>{m.standardPrice ?? '—'}</TableCell>
                <TableCell>{m.movingAvgPrice ?? '—'}</TableCell>
                <TableCell>{typeof m.stockValue === 'number' ? m.stockValue.toFixed(2) : '—'}</TableCell>
                <TableCell>{m.batchManaged ? '批次 ' : ''}{m.serialized ? '序列号' : ''}{!m.batchManaged && !m.serialized ? '—' : ''}</TableCell>
                <TableCell>{m.plantParams?.length || 0} 个</TableCell>
                <TableCell>{docsFor(m.id).length}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<EditIcon />} data-testid="mv-edit" onClick={() => openEdit(m)}>维护</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>维护评估类/价控/工厂维度 — {target?.code} {target?.name}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" select label="评估类" value={form.valuationClass || ''}
            onChange={(e) => setForm({ ...form, valuationClass: e.target.value as ValuationClass })}>
            {Object.keys(VC_LABEL).map((k) => (
              <MenuItem key={k} value={k}>{VC_LABEL[k as ValuationClass]}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" select label="价控程序" value={form.priceControl || 'S'}
            onChange={(e) => setForm({ ...form, priceControl: e.target.value as PriceControl })}>
            <MenuItem value="S">S 标准价</MenuItem>
            <MenuItem value="V">V 移动平均价</MenuItem>
          </TextField>
          <TextField fullWidth margin="dense" label="标准价" type="number" value={form.standardPrice ?? 0}
            onChange={(e) => setForm({ ...form, standardPrice: Number(e.target.value) })} />
          <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
            移动平均价与库存金额由出入库过账自动滚动（A4 成本核算），此处只读不可手改。
            当前移动平均价：<b>{target?.movingAvgPrice ?? '—'}</b>；库存金额：<b>{typeof target?.stockValue === 'number' ? target.stockValue.toFixed(2) : '—'}</b>
          </Alert>
          <FormControlLabel control={
            <Switch checked={!!form.batchManaged} onChange={(e) => setForm({ ...form, batchManaged: e.target.checked })} />
          } label="批次管理" />
          <FormControlLabel control={
            <Switch checked={!!form.serialized} onChange={(e) => setForm({ ...form, serialized: e.target.checked })} />
          } label="序列号管理" />
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">工厂维度参数</Typography>
          {plants.map((p, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField size="small" label="工厂" value={p.plantId}
                onChange={(e) => { const n = [...plants]; n[i] = { ...n[i], plantId: e.target.value }; setPlants(n); }} />
              <TextField size="small" label="标准价" type="number" value={p.standardPrice ?? 0}
                onChange={(e) => { const n = [...plants]; n[i] = { ...n[i], standardPrice: Number(e.target.value) }; setPlants(n); }} />
              <Button size="small" color="error" onClick={() => setPlants(plants.filter((_, j) => j !== i))}>删</Button>
            </Box>
          ))}
          <Button size="small" data-testid="mv-add-plant" onClick={() => setPlants([...plants, { plantId: '', plantName: '' }])}>+ 添加工厂</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="mv-save" onClick={handleSave}>保存并留痕</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
