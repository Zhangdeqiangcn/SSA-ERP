import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, List, ListItemButton, ListItemText, Badge,
  Divider, Alert, Snackbar, Tooltip,
} from '@mui/material';
import { Add, Delete, Edit, RestartAlt, Save, Storage, Replay } from '@mui/icons-material';
import {
  useDataDictStore,
  DATA_DICT_LABELS,
  type DataDictCategory,
} from '@/stores/dataDictStore';

const CATEGORY_ORDER: DataDictCategory[] = [
  'units',
  'paymentMethods',
  'paymentTerms',
  'tradeTerms',
  'currencies',
  'languages',
  'jobRoles',
  'invoiceTypes',
  'dispositions',
  'purchaseTypes',
];

const DataDictTab: React.FC = () => {
  const store = useDataDictStore();
  const [selected, setSelected] = useState<DataDictCategory>('units');
  const [dialog, setDialog] = useState<{ open: boolean; index: number; value: string }>({
    open: false, index: -1, value: '',
  });
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });

  const items = store[selected] || [];

  const openAdd = () => setDialog({ open: true, index: -1, value: '' });
  const openEdit = (index: number) => setDialog({ open: true, index, value: items[index] });

  const handleConfirm = () => {
    const v = dialog.value.trim();
    if (!v) return;
    if (dialog.index >= 0) store.updateItem(selected, dialog.index, v);
    else store.addItem(selected, v);
    setDialog({ open: false, index: -1, value: '' });
    setSnackbar({ open: true, msg: dialog.index >= 0 ? '已更新选项' : '已添加选项' });
  };

  const handleDelete = (index: number) => {
    store.removeItem(selected, index);
    setSnackbar({ open: true, msg: '已删除选项' });
  };

  const handleResetCategory = () => {
    store.resetCategory(selected);
    setSnackbar({ open: true, msg: `${DATA_DICT_LABELS[selected]} 已恢复默认值` });
  };

  const handleResetAll = () => {
    store.resetAll();
    setResetAllOpen(false);
    setSnackbar({ open: true, msg: '全部数据字典已恢复默认值' });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>数据字典</Typography>
          <Typography variant="caption" color="text.secondary">
            全系统下拉选项的唯一数据源，各业务表单（物料单位、付款条件等）均从此读取
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<Replay />}
          onClick={() => setResetAllOpen(true)}
        >
          全部恢复默认
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* 左侧分类列表 */}
        <Paper variant="outlined" sx={{ width: 220, flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
            <Typography variant="subtitle2" fontWeight={600} color="#475569">分类（{CATEGORY_ORDER.length}）</Typography>
          </Box>
          <List disablePadding>
            {CATEGORY_ORDER.map((cat) => {
              const count = (store[cat] || []).length;
              const active = cat === selected;
              return (
                <ListItemButton
                  key={cat}
                  selected={active}
                  onClick={() => setSelected(cat)}
                  sx={{
                    borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent',
                    bgcolor: active ? '#EFF6FF' : 'transparent',
                  }}
                >
                  <ListItemText
                    primary={DATA_DICT_LABELS[cat]}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500 }}
                  />
                  <Badge badgeContent={count} color="primary" sx={{ ml: 1 }} />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        {/* 右侧明细 */}
        <Paper variant="outlined" sx={{ flex: 1, p: 2.5, borderRadius: 2, minHeight: 360 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600}>{DATA_DICT_LABELS[selected]}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="恢复该类默认">
                <Button size="small" startIcon={<RestartAlt />} onClick={handleResetCategory}>重置</Button>
              </Tooltip>
              <Button size="small" variant="contained" startIcon={<Add />} onClick={openAdd}>添加</Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {items.map((item, idx) => (
              <Chip
                key={`${item}-${idx}`}
                label={item}
                size="small"
                onDelete={() => handleDelete(idx)}
                onClick={() => openEdit(idx)}
                sx={{
                  bgcolor: '#F1F5F9',
                  '&:hover': { bgcolor: '#E2E8F0' },
                  cursor: 'pointer',
                }}
              />
            ))}
            {items.length === 0 && (
              <Typography variant="caption" color="text.secondary">暂无，点击「添加」新增</Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* 添加/编辑对话框 */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, index: -1, value: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {dialog.index >= 0 ? `编辑${DATA_DICT_LABELS[selected]}选项` : `添加${DATA_DICT_LABELS[selected]}选项`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="名称"
            value={dialog.value}
            onChange={(e) => setDialog((prev) => ({ ...prev, value: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog({ open: false, index: -1, value: '' })}>取消</Button>
          <Button variant="contained" onClick={handleConfirm}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 全部恢复默认确认 */}
      <Dialog open={resetAllOpen} onClose={() => setResetAllOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>确认恢复全部默认？</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            此操作将把所有分类（单位、付款方式、货币等）清空并恢复为系统出厂默认值，你自定义的选项将丢失。
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetAllOpen(false)}>取消</Button>
          <Button color="warning" variant="contained" startIcon={<Replay />} onClick={handleResetAll}>确认恢复</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, msg: '' })}
        message={snackbar.msg}
      />
    </Box>
  );
};

export default DataDictTab;
