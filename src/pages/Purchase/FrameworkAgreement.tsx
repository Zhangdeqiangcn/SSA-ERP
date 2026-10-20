import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { usePurchaseAdvancedStore } from '@/stores/purchaseAdvancedStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useVendorStore } from '@/stores/vendorStore';
import { FrameworkAgreement } from '@/types';

const STATUS_LABEL: Record<FrameworkAgreement['status'], string> = {
  active: '生效中', expired: '已过期', closed: '已关闭',
};

export default function FrameworkAgreementPage() {
  const { frameworkAgreements, addFramework, releaseFramework } = usePurchaseAdvancedStore();
  const { materials } = useMaterialStore();
  const { vendors } = useVendorStore();
  const [open, setOpen] = useState(false);
  const [relOpen, setRelOpen] = useState(false);
  const [relTarget, setRelTarget] = useState<FrameworkAgreement | null>(null);
  const [relForm, setRelForm] = useState({ date: '2026-07-15', amount: 100000, note: '月度释放' });
  const [form, setForm] = useState({
    vendorId: 'ven-001', startDate: '2026-01-01', endDate: '2026-12-31',
    totalCeiling: 5000000, materialId: '', ceilingPrice: 42, committedQty: 1000,
  });

  const selectedMaterial = useMemo(() => materials.find((m) => m.id === form.materialId), [materials, form.materialId]);
  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.name ?? id;

  const handleAdd = () => {
    if (!selectedMaterial) return;
    const fa: FrameworkAgreement = {
      id: `fa-${Date.now()}`,
      agreementNo: `FA-2026-${Date.now()}`,
      vendorId: form.vendorId,
      vendorName: vendorName(form.vendorId),
      status: 'active',
      startDate: form.startDate,
      endDate: form.endDate,
      currency: 'CNY',
      totalCeiling: Number(form.totalCeiling),
      releasedAmount: 0,
      items: [{
        id: `fai-${Date.now()}`, materialId: selectedMaterial.id, materialCode: selectedMaterial.code,
        materialName: selectedMaterial.name, unit: selectedMaterial.unit,
        ceilingPrice: Number(form.ceilingPrice), committedQty: Number(form.committedQty),
      }],
      releases: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '采购员', updatedBy: '采购员',
    };
    addFramework(fa);
    setOpen(false);
    setForm({ ...form, materialId: '', ceilingPrice: 42, committedQty: 1000 });
  };

  const handleRelease = () => {
    if (!relTarget) return;
    releaseFramework(relTarget.id, {
      id: `rel-${Date.now()}`, releaseNo: `REL-${Date.now()}`, date: relForm.date,
      amount: Number(relForm.amount), note: relForm.note,
    });
    setRelOpen(false);
    setRelTarget(null);
  };

  return (
    <Box sx={{ p: 2 }} data-testid="framework">
      <Typography variant="h5" gutterBottom>采购框架协议</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>框架协议可按额度释放生成采购订单（PO），跟踪已释放金额与协议上限。</Alert>
      <Button data-testid="framework-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增框架协议
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>协议号</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>协议上限</TableCell>
              <TableCell>已释放</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {frameworkAgreements.map((fa) => (
              <TableRow key={fa.id} data-testid="framework-row">
                <TableCell>{fa.agreementNo}</TableCell>
                <TableCell>{fa.vendorName}</TableCell>
                <TableCell>{fa.totalCeiling.toLocaleString()}</TableCell>
                <TableCell>{fa.releasedAmount.toLocaleString()}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[fa.status]} color={fa.status === 'active' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  {fa.status === 'active' && (
                    <Button size="small" data-testid="framework-release" onClick={() => { setRelTarget(fa); setRelOpen(true); }}>释放→PO</Button>
                  )}
                  {fa.releases.length > 0 && <Chip size="small" color="info" label={`${fa.releases.length}次释放`} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增框架协议</DialogTitle>
        <DialogContent>
          {/* 与后端 REQUIRED_CORE_FIELDS（framework_agreements: vendorId）对齐：供应商必填（该 select 有默认值，永不为空，仅加标记，不重复拦截） */}
          <TextField fullWidth margin="dense" select label="供应商" required value={form.vendorId}
            onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
            {vendors.map((v) => (
              <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" select label="物料" value={form.materialId}
            onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>{m.code} {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" label="协议上限" type="number" value={form.totalCeiling}
            onChange={(e) => setForm({ ...form, totalCeiling: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="承购数量" type="number" value={form.committedQty}
            onChange={(e) => setForm({ ...form, committedQty: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="协议价格" type="number" value={form.ceilingPrice}
            onChange={(e) => setForm({ ...form, ceilingPrice: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="起始日" type="date" value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="截止日" type="date" value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })} InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="framework-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={relOpen} onClose={() => setRelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>释放框架协议 → 采购订单</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="释放日期" type="date" value={relForm.date}
            onChange={(e) => setRelForm({ ...relForm, date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="释放金额" type="number" value={relForm.amount}
            onChange={(e) => setRelForm({ ...relForm, amount: Number(e.target.value) })} />
          <TextField fullWidth margin="dense" label="备注" value={relForm.note}
            onChange={(e) => setRelForm({ ...relForm, note: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="framework-release-confirm" onClick={handleRelease}>生成PO</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
