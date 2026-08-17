import { useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useProductionVersionStore } from '@/stores/productionVersionStore';
import { ProductionVersion, ProductionVersionStatus } from '@/types/production';

const STATUS_LABEL: Record<ProductionVersionStatus, string> = {
  draft: '草稿', active: '生效', obsolete: '作废',
};

export default function ProductionVersions() {
  const { versions, addVersion, deleteVersion } = useProductionVersionStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    materialCode: '', materialName: '', bomNo: '', routeNo: '', version: 'V1.0',
    effectiveDate: '2026-01-01', status: 'draft' as ProductionVersionStatus,
  });

  const rows = useMemo(() => versions, [versions]);

  const handleAdd = () => {
    const v: ProductionVersion = {
      id: `pv-${Date.now()}`,
      version: form.version,
      materialId: `mat-${Date.now()}`,
      materialCode: form.materialCode || 'PRD-NEW',
      materialName: form.materialName || '新产品',
      bomId: 'bom-001',
      bomNo: form.bomNo || 'BOM-2024-001',
      routeId: 'route-001',
      routeNo: form.routeNo || 'R-2024-001',
      status: form.status,
      effectiveDate: form.effectiveDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addVersion(v);
    setOpen(false);
    setForm({ materialCode: '', materialName: '', bomNo: '', routeNo: '', version: 'V1.0', effectiveDate: '2026-01-01', status: 'draft' });
  };

  return (
    <Box sx={{ p: 2 }} data-testid="production-versions">
      <Typography variant="h5" gutterBottom>生产版本</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        生产版本 = 物料 + BOM + 工艺路线 的组合，用于按产品指定不同的制造配方（对标 SAP 生产版本 / 金蝶 生产用料清单版本）。
      </Alert>
      <Button data-testid="pv-add" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        新增版本
      </Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>版本</TableCell>
              <TableCell>物料编码</TableCell>
              <TableCell>物料名称</TableCell>
              <TableCell>BOM</TableCell>
              <TableCell>工艺路线</TableCell>
              <TableCell>生效日期</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id} data-testid="pv-row">
                <TableCell>{v.version}</TableCell>
                <TableCell>{v.materialCode}</TableCell>
                <TableCell>{v.materialName}</TableCell>
                <TableCell>{v.bomNo}</TableCell>
                <TableCell>{v.routeNo}</TableCell>
                <TableCell>{v.effectiveDate}</TableCell>
                <TableCell><Chip size="small" label={STATUS_LABEL[v.status]} color={v.status === 'active' ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  <Button size="small" color="error" onClick={() => deleteVersion(v.id)}>删除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增生产版本</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="物料编码" value={form.materialCode}
            onChange={(e) => setForm({ ...form, materialCode: e.target.value })} />
          <TextField fullWidth margin="dense" label="物料名称" value={form.materialName}
            onChange={(e) => setForm({ ...form, materialName: e.target.value })} />
          <TextField fullWidth margin="dense" label="BOM 编号" value={form.bomNo}
            onChange={(e) => setForm({ ...form, bomNo: e.target.value })} />
          <TextField fullWidth margin="dense" label="工艺路线编号" value={form.routeNo}
            onChange={(e) => setForm({ ...form, routeNo: e.target.value })} />
          <TextField fullWidth margin="dense" label="版本号" value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })} />
          <TextField fullWidth margin="dense" label="生效日期" type="date" value={form.effectiveDate}
            onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
            InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" select label="状态" value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as ProductionVersionStatus })}>
            <MenuItem value="draft">草稿</MenuItem>
            <MenuItem value="active">生效</MenuItem>
            <MenuItem value="obsolete">作废</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" data-testid="pv-add-confirm" onClick={handleAdd}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
