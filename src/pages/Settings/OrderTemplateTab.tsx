import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Grid, Stack, Alert,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Autocomplete, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, Save, ContentCopy } from '@mui/icons-material';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import {
  useOrderTemplateStore,
  type OrderTemplate,
  type TemplateItem,
} from '@/stores/orderTemplateStore';
import { useDataDictStore } from '@/stores/dataDictStore';
import { FilterBar } from '@/components/common';
import type { ColumnDef } from '@tanstack/react-table';
import { applyColumnFilters } from '@/utils/listSearch';

const OrderTemplateTab: React.FC = () => {
  const { vendors } = useVendorStore();
  const materials = useMaterialStore((s) => s.materials);
  const templates = useOrderTemplateStore((s) => s.templates);
  const setTemplates = useOrderTemplateStore((s) => s.setTemplates);
  const upsertTemplate = useOrderTemplateStore((s) => s.upsertTemplate);
  const removeTemplate = useOrderTemplateStore((s) => s.removeTemplate);
  const duplicateTemplate = useOrderTemplateStore((s) => s.duplicateTemplate);
  const tradeTermOptions = useDataDictStore((s) => s.tradeTerms);

  const [dialog, setDialog] = useState<{ open: boolean; template: OrderTemplate | null }>({
    open: false, template: null,
  });

  const [filterData, setFilterData] = useState<Record<string, unknown>>({});

  // 列定义（驱动检索条派生检索项；表格为内联渲染；物料数为派生展示，不纳入检索）
  const columns: ColumnDef<OrderTemplate, unknown>[] = [
    { id: 'name', header: '模板名称', accessorFn: (t) => t.name, meta: { searchable: true } },
    { id: 'vendorName', header: '供应商', accessorFn: (t) => t.vendorName, meta: { searchable: true } },
    { id: 'paymentTerms', header: '付款条件', accessorFn: (t) => t.paymentTerms, meta: { searchable: true } },
    { id: 'tradeTerms', header: '贸易条件', accessorFn: (t) => t.tradeTerms, meta: { searchable: true } },
    { id: 'remarks', header: '备注', accessorFn: (t) => t.remarks, meta: { searchable: true } },
  ];

  const filtered = useMemo(
    () => applyColumnFilters(templates, columns, filterData, { module: 'settings' }),
    [templates, columns, filterData]
  );

  const vendorOptions = useMemo(() =>
    vendors.map(v => ({ id: v.id, name: v.name })),
    []
  );

  const handleSave = () => {
    // 数据已由各操作实时写入 orderTemplateStore 并持久化，这里作为显式保存入口
    setTemplates([...templates]);
  };

  const handleCreate = () => {
    const newTemplate: OrderTemplate = {
      id: `tpl-${Date.now()}`,
      name: '',
      vendorId: '',
      vendorName: '',
      paymentTerms: '',
      tradeTerms: '',
      deliveryTerms: '',
      remarks: '',
      expectedDeliveryDate: '',
      items: [],
      createdAt: new Date().toISOString(),
    };
    setDialog({ open: true, template: newTemplate });
  };

  const handleEdit = (template: OrderTemplate) => {
    setDialog({ open: true, template: { ...template, items: [...template.items] } });
  };

  const handleDelete = (id: string) => {
    removeTemplate(id);
  };

  const handleDialogSave = () => {
    if (!dialog.template) return;
    if (!dialog.template.name.trim()) return;
    upsertTemplate(dialog.template);
    setDialog({ open: false, template: null });
  };

  const handleAddItem = () => {
    if (!dialog.template) return;
    setDialog({
      open: true,
      template: {
        ...dialog.template,
        items: [...dialog.template.items, {
          materialId: '',
          materialCode: '',
          materialName: '',
          specification: '',
          unit: '件',
          quantity: 1,
          unitPrice: 0,
        }],
      },
    });
  };

  const handleDeleteItem = (idx: number) => {
    if (!dialog.template) return;
    setDialog({
      open: true,
      template: {
        ...dialog.template,
        items: dialog.template.items.filter((_, i) => i !== idx),
      },
    });
  };

  const handleItemChange = (idx: number, field: keyof TemplateItem, value: any) => {
    if (!dialog.template) return;
    const items = [...dialog.template.items];
    items[idx] = { ...items[idx], [field]: value };
    setDialog({ open: true, template: { ...dialog.template, items } });
  };

  const handleMaterialSelect = (idx: number, materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    if (!material || !dialog.template) return;
    const items = [...dialog.template.items];
    items[idx] = {
      ...items[idx],
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      specification: material.specification || '',
      unit: material.unit,
      unitPrice: material.price,
    };
    setDialog({ open: true, template: { ...dialog.template, items } });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>订单模板管理</Typography>
          <Typography variant="caption" color="text.secondary">
            创建和管理采购订单模板，新建订单时可选择模板快速填充
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Save />} onClick={handleSave}>保存到本地</Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreate}>新建模板</Button>
        </Stack>
      </Box>

      <FilterBar columns={columns} module="settings" onSearch={setFilterData} listKey="settings-order-template" />

      {filtered.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          暂无订单模板，点击「新建模板」创建第一个模板。
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>模板名称</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>供应商</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>付款条件</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>贸易条件</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }} align="center">物料数</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>备注</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.8125rem' }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(tpl => (
                <TableRow key={tpl.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{tpl.name}</Typography>
                  </TableCell>
                  <TableCell>{tpl.vendorName || '-'}</TableCell>
                  <TableCell>{tpl.paymentTerms || '-'}</TableCell>
                  <TableCell>{tpl.tradeTerms || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip label={tpl.items.length} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                      {tpl.remarks || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => handleEdit(tpl)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="复制">
                        <IconButton size="small" onClick={() => duplicateTemplate(tpl.id)}><ContentCopy fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton size="small" color="error" onClick={() => handleDelete(tpl.id)}><Delete fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新建/编辑对话框 */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, template: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {dialog.template?.id && templates.find(t => t.id === dialog.template?.id) ? '编辑模板' : '新建模板'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialog.template && (
            <Stack spacing={2.5}>
              <TextField
                label="模板名称"
                fullWidth
                value={dialog.template.name}
                onChange={e => setDialog({ open: true, template: { ...dialog.template!, name: e.target.value } })}
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={vendorOptions}
                    getOptionLabel={(o) => o.name}
                    value={vendorOptions.find(v => v.id === dialog.template!.vendorId) || null}
                    onChange={(_, newVal) => setDialog({
                      open: true,
                      template: { ...dialog.template!, vendorId: newVal?.id || '', vendorName: newVal?.name || '' },
                    })}
                    renderInput={(params) => <TextField {...params} label="默认供应商" />}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="付款条件"
                    value={dialog.template.paymentTerms}
                    onChange={e => setDialog({ open: true, template: { ...dialog.template!, paymentTerms: e.target.value } })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={tradeTermOptions}
                    value={dialog.template.tradeTerms || null}
                    onChange={(_, newVal) => setDialog({
                      open: true,
                      template: { ...dialog.template!, tradeTerms: newVal || '' },
                    })}
                    renderInput={(params) => <TextField {...params} label="贸易条件" />}
                    freeSolo
                    isOptionEqualToValue={(o, v) => o === v}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="交付条件"
                    value={dialog.template.deliveryTerms}
                    onChange={e => setDialog({ open: true, template: { ...dialog.template!, deliveryTerms: e.target.value } })}
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth label="备注"
                value={dialog.template.remarks}
                onChange={e => setDialog({ open: true, template: { ...dialog.template!, remarks: e.target.value } })}
                multiline rows={2}
              />

              {/* 物料列表 */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight={600}>模板物料</Typography>
                  <Button size="small" startIcon={<Add />} onClick={handleAddItem}>添加物料</Button>
                </Stack>
                {dialog.template.items.length === 0 ? (
                  <Alert severity="info" sx={{ fontSize: '0.8125rem' }}>暂无物料，点击「添加物料」</Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>物料</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>物料编码</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>规格</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>单位</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }} align="right">数量</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }} align="right">单价</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, width: 50 }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dialog.template.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ minWidth: 160 }}>
                              <Autocomplete
                                size="small"
                                options={materials}
                                getOptionLabel={(opt) => `${opt.name} (${opt.code})`}
                                value={materials.find(m => m.id === item.materialId) || null}
                                onChange={(_, newVal) => {
                                  if (newVal) handleMaterialSelect(idx, newVal.id);
                                }}
                                renderInput={(params) => <TextField {...params} placeholder="搜索物料" />}
                                isOptionEqualToValue={(o, v) => o.id === v.id}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#0345A1' }}>{item.materialCode || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{item.specification || '-'}</Typography>
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell align="right" sx={{ width: 80 }}>
                              <TextField
                                size="small" type="number"
                                value={item.quantity}
                                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                inputProps={{ min: 1 }}
                                sx={{ width: 70 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ width: 100 }}>
                              <TextField
                                size="small" type="number"
                                value={item.unitPrice}
                                onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                inputProps={{ min: 0, step: 0.01 }}
                                sx={{ width: 90 }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" color="error" onClick={() => handleDeleteItem(idx)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog({ open: false, template: null })}>取消</Button>
          <Button variant="contained" onClick={handleDialogSave}>保存模板</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderTemplateTab;
