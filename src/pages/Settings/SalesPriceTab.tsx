import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Stack, Divider, Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Calculate } from '@mui/icons-material';
import { useSalesPriceStore } from '@/stores/salesPriceStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useMaterialStore } from '@/stores/materialStore';
import { formatCurrency } from '@/utils/format';
import type { SalesPriceListItem, SalesPromotion, SalesPromotionType } from '@/types';

const emptyItem: Omit<SalesPriceListItem, 'id'> = {
  customerId: '', customerName: '', materialId: '', materialCode: '', materialName: '',
  specification: '', unit: '', basePrice: 0, discountRate: 0, tiers: [], currency: 'CNY', status: 'active',
};
const emptyPromo: Omit<SalesPromotion, 'id'> = {
  name: '', type: 'percent', value: 0, enabled: true,
};

const SalesPriceTab: React.FC = () => {
  const { priceList, promotions, addPriceItem, updatePriceItem, deletePriceItem, addPromotion, updatePromotion, deletePromotion, resolvePrice } =
    useSalesPriceStore();
  const customers = useCustomerStore((s) => s.customers);
  const materials = useMaterialStore((s) => s.materials);

  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<Omit<SalesPriceListItem, 'id'>>(emptyItem);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState<Omit<SalesPromotion, 'id'>>(emptyPromo);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);

  // 取价试算
  const [calcCustomer, setCalcCustomer] = useState('');
  const [calcMaterial, setCalcMaterial] = useState('');
  const [calcQty, setCalcQty] = useState(10);
  const [calcResult, setCalcResult] = useState<string>('');

  const onPickMaterial = (mid: string) => {
    const m = materials.find((x) => x.id === mid);
    setItem((prev) => ({
      ...prev, materialId: mid, materialCode: m?.code || '', materialName: m?.name || '',
      specification: m?.specification || '', unit: m?.unit || '', basePrice: m?.price || prev.basePrice,
    }));
  };
  const onPickCalcMaterial = (mid: string) => {
    const m = materials.find((x) => x.id === mid);
    setCalcMaterial(mid);
    setCalcResult('');
  };

  const openEdit = (p: SalesPriceListItem) => {
    // 直接展开行数据预填，不要调用 onPickMaterial，否则 basePrice 会被物料主数据价覆盖
    setItem({ ...p });
    setEditingId(p.id);
    setOpen(true);
  };
  const openEditPromo = (p: SalesPromotion) => {
    setPromo({ ...p });
    setEditingPromoId(p.id);
    setPromoOpen(true);
  };

  const handleSave = () => {
    if (!item.materialId) return;
    const cust = customers.find((c) => c.id === item.customerId);
    const payload: Omit<SalesPriceListItem, 'id'> = { ...item, customerName: cust?.name };
    if (editingId) updatePriceItem(editingId, payload);
    else addPriceItem(payload);
    setEditingId(null); setOpen(false); setItem(emptyItem);
  };
  const handleSavePromo = () => {
    if (!promo.name.trim()) return;
    if (editingPromoId) updatePromotion(editingPromoId, promo);
    else addPromotion(promo);
    setEditingPromoId(null); setPromoOpen(false); setPromo(emptyPromo);
  };
  const doCalc = () => {
    if (!calcMaterial) return;
    const base = materials.find((m) => m.id === calcMaterial)?.price || 0;
    const r = resolvePrice(calcCustomer || undefined, calcMaterial, Number(calcQty) || 0, base);
    setCalcResult(
      `基准价 ${formatCurrency(base)} → 折扣率 ${r.discountRate}%` +
      (r.promotionApplied ? ` + 促销「${r.promotionApplied}」` : '') +
      ` → 最终单价 ${formatCurrency(r.unitPrice)}`
    );
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        C5 销售价目表 / 折扣 / 促销：支持「客户级 / 通用物料级」单价 + 折扣率 + 阶梯量价（tier）+ 限时促销（百分比 / 立减 / 特价）。
        销售订单选择物料时自动调用 <code>resolvePrice</code> 取价。
      </Alert>

      {/* 取价试算 */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>取价试算（resolvePrice）</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-end">
          <TextField select label="客户(可空=通用)" value={calcCustomer} onChange={(e) => setCalcCustomer(e.target.value)} sx={{ minWidth: 180 }}
            SelectProps={{ SelectDisplayProps: { 'data-testid': 'sp-calc-customer' } as React.HTMLAttributes<HTMLDivElement> }}>
            <MenuItem value="">通用物料价</MenuItem>
            {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="物料" value={calcMaterial} onChange={(e) => onPickCalcMaterial(e.target.value)} sx={{ minWidth: 200 }}
            SelectProps={{ SelectDisplayProps: { 'data-testid': 'sp-calc-material' } as React.HTMLAttributes<HTMLDivElement> }}>
            {materials.slice(0, 30).map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
          <TextField label="数量" type="number" value={calcQty} onChange={(e) => setCalcQty(Number(e.target.value))} sx={{ width: 100 }} inputProps={{ 'data-testid': 'sp-calc-qty' }} />
          <Button variant="contained" startIcon={<Calculate />} onClick={doCalc} data-testid="sp-calc-btn">试算</Button>
        </Stack>
        {calcResult && <Typography variant="body2" sx={{ mt: 1.5, color: '#0F766E', fontWeight: 600 }} data-testid="sp-calc-result">{calcResult}</Typography>}
      </Paper>

      {/* 价目表 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>价目表（{priceList.length}）</Typography>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => { setEditingId(null); setItem(emptyItem); setOpen(true); }} data-testid="sp-price-add">新增价目表项</Button>
      </Box>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>客户</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>物料</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>基准价</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>折扣率</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>阶梯量价</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {priceList.map((p) => (
              <TableRow key={p.id} data-testid={`sp-price-row-${p.id}`}>
                <TableCell>{p.customerName || <Chip size="small" label="通用" color="default" />}</TableCell>
                <TableCell>{p.materialName} <Typography variant="caption" color="text.secondary">({p.materialCode})</Typography></TableCell>
                <TableCell align="right">{formatCurrency(p.basePrice)}</TableCell>
                <TableCell align="right">{p.discountRate}%</TableCell>
                <TableCell>{p.tiers?.length ? p.tiers.map((t) => `≥${t.minQty}:${t.unitPrice}`).join(' / ') : '-'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(p)} data-testid={`sp-price-edit-${p.id}`} aria-label="编辑价目表项"><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deletePriceItem(p.id)} data-testid={`sp-price-delete-${p.id}`} aria-label="删除价目表项"><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 促销 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>促销活动（{promotions.length}）</Typography>
        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => { setEditingPromoId(null); setPromo(emptyPromo); setPromoOpen(true); }} data-testid="sp-promo-add">新增促销</Button>
      </Box>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>值</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>适用</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promotions.map((p) => (
              <TableRow key={p.id} data-testid={`sp-promo-row-${p.id}`}>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={p.type === 'percent' ? '百分比折扣' : p.type === 'amount' ? '立减金额' : '固定特价'} />
                </TableCell>
                <TableCell align="right">{p.value}{p.type === 'percent' ? '%' : ''}</TableCell>
                <TableCell>
                  {p.customerId ? `客户 ${customers.find((c) => c.id === p.customerId)?.name || p.customerId}` : '全部客户'}
                  {' / '}
                  {p.materialId ? `物料 ${materials.find((m) => m.id === p.materialId)?.name || p.materialId}` : '全部物料'}
                </TableCell>
                <TableCell><Chip size="small" label={p.enabled ? '启用' : '停用'} color={p.enabled ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEditPromo(p)} data-testid={`sp-promo-edit-${p.id}`} aria-label="编辑促销"><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deletePromotion(p.id)} data-testid={`sp-promo-delete-${p.id}`} aria-label="删除促销"><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 价目表新增/编辑 */}
      <Dialog open={open} onClose={() => { setEditingId(null); setOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? '编辑价目表项' : '新增价目表项'}</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="客户(可空=通用)" value={item.customerId} onChange={(e) => setItem({ ...item, customerId: e.target.value })} sx={{ mt: 1, mb: 2 }}
            SelectProps={{ SelectDisplayProps: { 'data-testid': 'sp-dlg-customer' } as React.HTMLAttributes<HTMLDivElement> }}>
            <MenuItem value="">通用物料价</MenuItem>
            {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="物料" value={item.materialId} onChange={(e) => onPickMaterial(e.target.value)} sx={{ mb: 2 }}
            SelectProps={{ SelectDisplayProps: { 'data-testid': 'sp-dlg-material' } as React.HTMLAttributes<HTMLDivElement> }}>
            {materials.slice(0, 30).map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField fullWidth label="基准单价" type="number" value={item.basePrice} onChange={(e) => setItem({ ...item, basePrice: Number(e.target.value) })} data-testid="sp-dlg-basePrice" />
            <TextField fullWidth label="折扣率(%)" type="number" value={item.discountRate} onChange={(e) => setItem({ ...item, discountRate: Number(e.target.value) })} data-testid="sp-dlg-discount" />
          </Stack>
          <Divider sx={{ my: 1 }}><Typography variant="caption">阶梯量价（可选，每行：起订量:单价，逗号分隔）</Typography></Divider>
          <TextField fullWidth label="阶梯量价" value={(item.tiers || []).map((t) => `${t.minQty}:${t.unitPrice}`).join(', ')}
            onChange={(e) => {
              const tiers = e.target.value.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
                const [minQty, unitPrice] = s.split(':').map((x) => Number(x));
                return { minQty: minQty || 0, unitPrice: unitPrice || 0 };
              }).filter((t) => t.unitPrice > 0);
              setItem({ ...item, tiers });
            }} helperText="例：50:4050, 100:3950" data-testid="sp-dlg-tiers" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingId(null); setOpen(false); }}>取消</Button>
          <Button variant="contained" onClick={handleSave} data-testid="sp-dlg-save">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 促销新增/编辑 */}
      <Dialog open={promoOpen} onClose={() => { setEditingPromoId(null); setPromoOpen(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPromoId ? '编辑促销' : '新增促销'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="促销名称" value={promo.name} onChange={(e) => setPromo({ ...promo, name: e.target.value })} sx={{ mt: 1, mb: 2 }} data-testid="sp-dlg-promo-name" />
          <TextField select fullWidth label="类型" value={promo.type} onChange={(e) => setPromo({ ...promo, type: e.target.value as SalesPromotionType })} sx={{ mb: 2 }}
            SelectProps={{ SelectDisplayProps: { 'data-testid': 'sp-dlg-promo-type' } as React.HTMLAttributes<HTMLDivElement> }}>
            <MenuItem value="percent">百分比折扣</MenuItem>
            <MenuItem value="amount">立减金额</MenuItem>
            <MenuItem value="fixed">固定特价</MenuItem>
          </TextField>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField fullWidth label="优惠值" type="number" value={promo.value} onChange={(e) => setPromo({ ...promo, value: Number(e.target.value) })} data-testid="sp-dlg-promo-value" />
            <TextField select fullWidth label="适用客户(可空=全部)" value={promo.customerId || ''} onChange={(e) => setPromo({ ...promo, customerId: e.target.value || undefined })}>
              <MenuItem value="">全部客户</MenuItem>
              {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField select fullWidth label="适用物料(可空=全部)" value={promo.materialId || ''} onChange={(e) => setPromo({ ...promo, materialId: e.target.value || undefined })}>
            <MenuItem value="">全部物料</MenuItem>
            {materials.slice(0, 30).map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingPromoId(null); setPromoOpen(false); }}>取消</Button>
          <Button variant="contained" onClick={handleSavePromo} data-testid="sp-dlg-promo-save">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesPriceTab;
