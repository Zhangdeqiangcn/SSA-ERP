import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Select, MenuItem, TextField, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Snackbar, Tooltip,
  FormControlLabel, Checkbox, Alert,
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Add, Delete, Edit, RestartAlt, Print, Description } from '@mui/icons-material';
import {
  usePrintTemplateStore, PrintEntity, PRINT_ENTITY_LABELS, PRINT_FIELD_CATALOG,
  PrintTemplate, PaperSize, Orientation,
} from '@/stores/printTemplateStore';
import PrintPreview from '@/components/common/PrintPreview';

const ENTITIES = Object.keys(PRINT_ENTITY_LABELS) as PrintEntity[];

// 预览用样例数据
const SAMPLE_RECORDS: Record<PrintEntity, Record<string, any>> = {
  purchaseOrder: {
    orderNo: 'PO20260713001', vendorName: '宝钢股份', orderDate: '2026-07-13',
    expectedDeliveryDate: '2026-08-01', paymentTerms: '货到验收后30天', tradeTerms: 'CIF（到岸价）',
    projectName: 'XX技改项目', totalAmount: 125000, remarks: '请按交期准时到货',
    items: [{ materialName: '冷轧钢板', specification: 'Q235B 1.5mm', unit: '张', orderedQuantity: 100, unitPrice: 1250, amount: 125000 }],
  },
  material: {
    code: 'MAT-001', name: '冷轧钢板', specification: 'Q235B 1.5mm', unit: '张',
    materialType: 'raw', price: 1250, safetyStock: 50, currentStock: 320, remarks: '常规备料',
  },
  vendor: {
    name: '宝钢股份', code: 'VEN-001', contact: '王经理', phone: '13800000000',
    email: 'sales@baosteel.com', address: '上海市浦东新区', level: 'A', remarks: '战略供应商',
  },
};

const PrintTemplateTab: React.FC = () => {
  const { templates, addTemplate, updateTemplate, removeTemplate, resetTemplates, getTemplateByEntity } = usePrintTemplateStore();
  const [entity, setEntity] = useState<PrintEntity>('purchaseOrder');
  const entityTemplates = templates.filter((t) => t.entity === entity);
  const previewTemplate = getTemplateByEntity(entity);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrintTemplate | null>(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState('');

  const openAdd = () => {
    setEditing(null);
    setName('');
    setTitle(PRINT_ENTITY_LABELS[entity] + '打印模板');
    setPaperSize('A4');
    setOrientation('portrait');
    setHeaderText('');
    setFooterText('打印时间：{now}');
    setFieldKeys(PRINT_FIELD_CATALOG[entity].map((c) => c.key));
    setDialogOpen(true);
  };

  const openEdit = (tpl: PrintTemplate) => {
    setEditing(tpl);
    setName(tpl.name);
    setTitle(tpl.title);
    setPaperSize(tpl.paperSize);
    setOrientation(tpl.orientation);
    setHeaderText(tpl.headerText);
    setFooterText(tpl.footerText);
    setFieldKeys([...tpl.fieldKeys]);
    setDialogOpen(true);
  };

  const toggleField = (key: string) => {
    setFieldKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setSnackbar('请输入模板名称');
      return;
    }
    const tpl: PrintTemplate = {
      id: editing?.id || `tpl-${entity}-${Date.now()}`,
      name: name.trim(),
      entity,
      title: title.trim() || name.trim(),
      paperSize,
      orientation,
      headerText,
      footerText,
      fieldKeys,
    };
    if (editing) {
      updateTemplate(editing.id, tpl);
      setSnackbar('已更新模板');
    } else {
      addTemplate(tpl);
      setSnackbar('已新增模板');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定删除该打印模板？')) {
      removeTemplate(id);
      setSnackbar('已删除模板');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>打印模板设计器</Typography>
          <Typography variant="caption" color="text.secondary">
            为单据设计打印版式（标题/纸张/页眉页脚/字段），业务页面「打印」按钮将套用对应模板。
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RestartAlt />} color="warning" onClick={() => { if (confirm('恢复全部默认模板？')) { resetTemplates(); setSnackbar('已恢复默认'); } }}>
            恢复默认
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>新增模板</Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>业务实体</InputLabel>
          <Select value={entity} label="业务实体" onChange={(e) => setEntity(e.target.value as PrintEntity)}>
            {ENTITIES.map((en) => (
              <MenuItem key={en} value={en}>{PRINT_ENTITY_LABELS[en]}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid_>
        <Box sx={{ flex: '1 1 320px' }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600 }}>模板名称</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>纸张</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>字段数</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entityTemplates.map((tpl) => (
                  <TableRow key={tpl.id} hover>
                    <TableCell>{tpl.name}</TableCell>
                    <TableCell><Chip size="small" label={`${tpl.paperSize}·${tpl.orientation === 'portrait' ? '纵向' : '横向'}`} /></TableCell>
                    <TableCell>{tpl.fieldKeys.length}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(tpl)}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => handleDelete(tpl.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {entityTemplates.length === 0 && (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                    <Description sx={{ fontSize: 32, opacity: 0.3, display: 'block', mx: 'auto', mb: 1 }} />
                    暂无模板，点击「新增模板」
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={{ flex: '1 1 420px' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Print fontSize="small" /> 实时预览（样例数据）
          </Typography>
          {previewTemplate ? (
            <PrintPreview template={previewTemplate} record={SAMPLE_RECORDS[entity]} />
          ) : (
            <Alert severity="info">该实体暂无模板，请先新增。</Alert>
          )}
        </Box>
      </Grid_>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? '编辑打印模板' : '新增打印模板'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField fullWidth label="模板名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <TextField fullWidth label="单据标题" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：采购订单" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>纸张</InputLabel>
                <Select value={paperSize} label="纸张" onChange={(e) => setPaperSize(e.target.value as PaperSize)}>
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="A5">A5</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>方向</InputLabel>
                <Select value={orientation} label="方向" onChange={(e) => setOrientation(e.target.value as Orientation)}>
                  <MenuItem value="portrait">纵向</MenuItem>
                  <MenuItem value="landscape">横向</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField fullWidth multiline rows={2} label="页眉" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="支持换行，留空不显示" />
            <TextField fullWidth multiline rows={2} label="页脚" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="可用 {now} 表示打印时间" />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>打印字段（勾选）</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {PRINT_FIELD_CATALOG[entity].map((c) => (
                  <FormControlLabel
                    key={c.key}
                    control={<Checkbox checked={fieldKeys.includes(c.key)} onChange={() => toggleField(c.key)} />}
                    label={c.label}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={2000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
};

// 简易栅格容器（避免额外依赖）
const Grid_: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>{children}</Box>
);

export default PrintTemplateTab;
