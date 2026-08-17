import React, { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, FormControlLabel, Snackbar,
} from '@mui/material';
import { Add, Edit, Visibility } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQualityStore } from '@/stores/qualityStore';

const InspectionStandard: React.FC = () => {
  const { inspectionStandards, addInspectionStandard } = useQualityStore();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [form, setForm] = useState({
    standardNo: '',
    name: '',
    materialCategory: '',
    version: 'V1.0',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>检验标准管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>
          新建检验标准
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>标准编号</TableCell>
                <TableCell>标准名称</TableCell>
                <TableCell>适用分类</TableCell>
                <TableCell>版本</TableCell>
                <TableCell>检验项目数</TableCell>
                <TableCell>关键项目数</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspectionStandards.map((std) => (
                <TableRow key={std.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace', color: '#3B82F6' }}>
                      {std.standardNo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{std.name}</Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>{std.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={std.materialCategory} size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={std.version} size="small" sx={{ bgcolor: '#F8FAFC', color: '#475569' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{std.inspectionItems.length} 项</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 500 }}>
                      {std.inspectionItems.filter(i => i.isCritical).length} 项
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={std.status === 'active' ? '启用' : '停用'}
                      size="small"
                      sx={{
                        bgcolor: std.status === 'active' ? '#ECFDF5' : '#F8FAFC',
                        color: std.status === 'active' ? '#10B981' : '#94A3B8',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                    <IconButton size="small"><Edit fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>新建检验标准</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="标准编号"
              fullWidth
              placeholder="如：IQC-STD-004"
              value={form.standardNo}
              onChange={(e) => setForm((f) => ({ ...f, standardNo: e.target.value }))}
            />
            <TextField
              label="标准名称"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="适用物料分类"
              fullWidth
              value={form.materialCategory}
              onChange={(e) => setForm((f) => ({ ...f, materialCategory: e.target.value }))}
            />
            <TextField
              label="版本号"
              fullWidth
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            />
            <TextField
              label="说明"
              multiline
              rows={2}
              fullWidth
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.status === 'active'}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? 'active' : 'inactive' }))}
                />
              }
              label="启用"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={() => {
              addInspectionStandard({
                id: `std-${Date.now()}`,
                standardNo: form.standardNo || `STD-${Date.now()}`,
                name: form.name || '未命名标准',
                materialCategory: form.materialCategory || '通用',
                version: form.version,
                status: form.status,
                inspectionItems: [],
                description: form.description,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'admin',
                updatedBy: 'admin',
              });
              setDialog(false);
              setSnackbar(true);
              setForm({ standardNo: '', name: '', materialCategory: '', version: 'V1.0', description: '', status: 'active' });
            }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar} autoHideDuration={2500} onClose={() => setSnackbar(false)} message="检验标准已创建" />
    </Box>
  );
};

export default InspectionStandard;
