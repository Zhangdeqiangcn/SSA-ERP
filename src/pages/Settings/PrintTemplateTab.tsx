import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Select, MenuItem, TextField, FormControl,
  InputLabel, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Snackbar, Tooltip,
  FormControlLabel, Checkbox, Alert, Grid,
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Add, Delete, Edit, RestartAlt, Print, Description } from '@mui/icons-material';
import {
  usePrintTemplateStore, PrintEntity, PRINT_ENTITY_LABELS, PRINT_FIELD_CATALOG,
  PrintTemplate, PaperSize, Orientation,
  HeaderFooterConfig, DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG,
} from '@/stores/printTemplateStore';
import PrintPreview from '@/components/common/PrintPreview';

const ENTITIES = Object.keys(PRINT_ENTITY_LABELS) as PrintEntity[];

// 预览用样例数据
const SAMPLE_RECORDS: Partial<Record<PrintEntity, Record<string, any>>> = {
  purchaseOrder: {
    orderNo: 'PO20260713001', vendorName: '宝钢股份', orderDate: '2026-07-13',
    expectedDeliveryDate: '2026-08-01', paymentTerms: '货到验收后30天', tradeTerms: 'CIF（到岸价）',
    projectName: 'XX技改项目', totalAmount: 125000, remarks: '请按交期准时到货',
    items: [{ materialCode: 'MAT-Q235B-1.5', materialName: '冷轧钢板', specification: 'Q235B 1.5mm', unit: '张', orderedQuantity: 100, unitPrice: 1250, amount: 125000 }],
  },
  salesOrder: {
    orderNo: 'SO20260715001', customerName: '成都新光科技有限公司', customerCode: 'CUS-XG001',
    orderDate: '2026-07-15', expectedDeliveryDate: '2026-08-10', paymentTerms: '预付30%发货',
    tradeTerms: 'DDP（完税后交货）', qualityStandard: 'GB/T 13237-2013', projectName: '年度框架',
    salesPerson: '张三', grandTotal: 280000, remarks: '按月分批交货',
    items: [
      { materialCode: 'MAT-ZJ-001', materialName: '精密轴芯', specification: 'Φ25×200 45#', unit: '件', quantity: 500, unitPrice: 320, amount: 160000 },
      { materialCode: 'MAT-ZJ-002', materialName: '轴承座', specification: 'UCP205 铸铁', unit: '件', quantity: 200, unitPrice: 600, amount: 120000 },
    ],
  },
  salesQuotation: {
    quotationNo: 'QT20260710001', customerName: '武汉东风零部件', validUntil: '2026-08-10',
    salesPerson: '李四', currency: 'CNY', totalAmount: 95000, grandTotal: 110350,
    remarks: '报价有效期30天',
    items: [{ materialCode: 'MAT-CG-003', materialName: '连接法兰', specification: 'DN80 PN16 Q235', unit: '件', quantity: 50, unitPrice: 1900, amount: 95000 }],
  },
  salesContract: {
    contractNo: 'CT20260601001', name: '2026年度供货框架合同', customerName: '成都新光科技',
    customerCode: 'CUS-XG001', startDate: '2026-06-01', endDate: '2027-05-31',
    salesPerson: '张三', amount: 3600000, terms: '按订单分批交货，质保12个月',
    remarks: '自动续约条款',
    items: [{ materialCode: 'MAT-FRAME-01', materialName: '精密零部件年度包', specification: '见附件BOM清单', unit: '批', quantity: 12, unitPrice: 300000, amount: 3600000 }],
  },
  bom: {
    bomNo: 'BOM-PROD-001', productName: '减速机总成', productCode: 'PROD-JSJ-001',
    type: '标准BOM', version: 'V3.2', effectiveDate: '2026-05-01',
    totalCost: 2850, description: '主产品BOM',
    items: [
      { materialCode: 'MAT-BODY-001', materialName: '箱体', specification: 'HT250 铸铁', unit: '件', quantity: 1, unitPrice: 800 },
      { materialCode: 'MAT-GEAR-001', materialName: '齿轮轴', specification: '20CrMnTi 渗碳淬火', unit: '根', quantity: 2, unitPrice: 350 },
      { materialCode: 'MAT-BEAR-001', materialName: '深沟球轴承', specification: '6208-2RZ P5', unit: '套', quantity: 4, unitPrice: 120 },
      { materialCode: 'MAT-SEAL-001', materialName: '油封', specification: 'TC 45×65×8 NBR', unit: '个', quantity: 4, unitPrice: 15 },
    ],
  },
  inquiry: {
    inquiryNo: 'INQ20260720001', title: 'Q3不锈钢板询价', inquirer: '王五',
    department: '采购部', deadline: '2026-07-25', currency: 'CNY',
    totalEstimatedAmount: 85000, remarks: '需提供材质证明书',
    items: [
      { materialCode: 'MAT-SS-304', materialName: '不锈钢板', specification: '304 3.0mm×1500×6000', unit: '张', quantity: 50, unitPrice: 1700, amount: 85000 },
    ],
  },
  workOrder: {
    workOrderNo: 'WO20260722001', productName: '减速机总成', bomName: 'BOM-PROD-001 (V3.2)',
    quantity: 100, plannedStartDate: '2026-07-22', plannedEndDate: '2026-08-05',
    status: '已下达', remarks: '优先排产',
    items: [
      { materialCode: 'MAT-BODY-001', materialName: '箱体', specification: 'HT250 铸铁', unit: '件', requirementQty: 100 },
      { materialCode: 'MAT-GEAR-001', materialName: '齿轮轴', specification: '20CrMnTi 渗碳淬火', unit: '根', requirementQty: 200 },
    ],
  },
  purchaseRequest: {
    requestNo: 'PR20260718001', title: '7月份生产辅料采购申请', applicant: '赵六',
    department: '生产部', expectedDate: '2026-07-25', priority: '高',
    status: '待审批', remarks: '产线急需',
    items: [
      { materialCode: 'MAT-LUBE-001', materialName: '工业润滑油', specification: 'L-HM 68 200L/桶', unit: '桶', quantity: 20, unitPrice: 850 },
      { materialCode: 'MAT-WELD-001', materialName: '焊丝', specification: 'ER50-6 Φ1.2mm', unit: 'kg', quantity: 100, unitPrice: 15 },
    ],
  },
  warehouseOutbound: {
    outboundNo: 'WOB20260723001', type: '销售出库', warehouseName: '成品仓',
    status: '已完成', createdAt: '2026-07-23 14:30', totalAmount: 280000,
    items: [
      { materialCode: 'MAT-ZJ-001', materialName: '精密轴芯', specification: 'Φ25×200 45#', unit: '件', quantity: 500, unitPrice: 560, amount: 280000 },
    ],
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
  const [headerConfig, setHeaderConfig] = useState<HeaderFooterConfig>(DEFAULT_HEADER_CONFIG);
  const [footerConfig, setFooterConfig] = useState<HeaderFooterConfig>(DEFAULT_FOOTER_CONFIG);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setTitle(PRINT_ENTITY_LABELS[entity] + '打印模板');
    setPaperSize('A4');
    setOrientation('portrait');
    setHeaderText('');
    setFooterText('打印时间：{now}');
    setFieldKeys(PRINT_FIELD_CATALOG[entity].map((c) => c.key));
    setHeaderConfig({ ...DEFAULT_HEADER_CONFIG });
    setFooterConfig({ ...DEFAULT_FOOTER_CONFIG });
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
    setHeaderConfig(tpl.headerConfig ? { ...tpl.headerConfig } : { ...DEFAULT_HEADER_CONFIG, text: tpl.headerText });
    setFooterConfig(tpl.footerConfig ? { ...tpl.footerConfig } : { ...DEFAULT_FOOTER_CONFIG, text: tpl.footerText });
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
      headerText: headerConfig.text || headerText,
      footerText: footerConfig.text || footerText,
      headerConfig: { ...headerConfig, text: headerConfig.text || headerText },
      footerConfig: { ...footerConfig, text: footerConfig.text || footerText },
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
            <PrintPreview template={previewTemplate} record={SAMPLE_RECORDS[entity] ?? {}} />
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
            <TextField fullWidth multiline rows={2} label="页眉" value={headerText} onChange={(e) => { setHeaderText(e.target.value); setHeaderConfig({ ...headerConfig, text: e.target.value }); }} placeholder="支持换行，留空不显示" />
            <TextField fullWidth multiline rows={2} label="页脚" value={footerText} onChange={(e) => { setFooterText(e.target.value); setFooterConfig({ ...footerConfig, text: e.target.value }); }} placeholder="可用 {now} 表示打印时间" />

            {/* === 页眉高级编辑（V2.88.0）=== */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                页眉高级设置
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>对齐方式</InputLabel>
                    <Select value={headerConfig.align} label="对齐方式" onChange={(e) => setHeaderConfig({ ...headerConfig, align: e.target.value as any })}>
                      <MenuItem value="left">左对齐</MenuItem>
                      <MenuItem value="center">居中</MenuItem>
                      <MenuItem value="right">右对齐</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth size="small" type="number" label="字号(px)" value={headerConfig.fontSize || ''} onChange={(e) => setHeaderConfig({ ...headerConfig, fontSize: Number(e.target.value) || 0 })} placeholder="留空=默认" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>字重</InputLabel>
                    <Select value={headerConfig.fontWeight} label="字重" onChange={(e) => setHeaderConfig({ ...headerConfig, fontWeight: e.target.value as any })}>
                      <MenuItem value="normal">常规</MenuItem>
                      <MenuItem value="bold">粗体</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="文字颜色" value={headerConfig.color} onChange={(e) => setHeaderConfig({ ...headerConfig, color: e.target.value })} placeholder="#475569 或 red" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox checked={headerConfig.showDate} onChange={(e) => setHeaderConfig({ ...headerConfig, showDate: e.target.checked })} />}
                    label="自动追加打印时间"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="图片URL (logo)" value={headerConfig.imageUrl} onChange={(e) => setHeaderConfig({ ...headerConfig, imageUrl: e.target.value })} placeholder="https://... 或 data:image/..." />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>图片位置</InputLabel>
                    <Select value={headerConfig.imagePosition} label="图片位置" onChange={(e) => setHeaderConfig({ ...headerConfig, imagePosition: e.target.value as any })}>
                      <MenuItem value="left">左侧</MenuItem>
                      <MenuItem value="right">右侧</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth size="small" type="number" label="图片高度(px)" value={headerConfig.imageHeight || ''} onChange={(e) => setHeaderConfig({ ...headerConfig, imageHeight: Number(e.target.value) || 40 })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="电子印章图片URL" value={headerConfig.stampUrl} onChange={(e) => setHeaderConfig({ ...headerConfig, stampUrl: e.target.value })} placeholder="印章图片地址（PNG透明底推荐）" />
                </Grid>
              </Grid>
            </Paper>

            {/* === 页脚高级编辑（V2.88.0）=== */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                页脚高级设置
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>对齐方式</InputLabel>
                    <Select value={footerConfig.align} label="对齐方式" onChange={(e) => setFooterConfig({ ...footerConfig, align: e.target.value as any })}>
                      <MenuItem value="left">左对齐</MenuItem>
                      <MenuItem value="center">居中</MenuItem>
                      <MenuItem value="right">右对齐</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth size="small" type="number" label="字号(px)" value={footerConfig.fontSize || ''} onChange={(e) => setFooterConfig({ ...footerConfig, fontSize: Number(e.target.value) || 0 })} placeholder="留空=默认" />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>字重</InputLabel>
                    <Select value={footerConfig.fontWeight} label="字重" onChange={(e) => setFooterConfig({ ...footerConfig, fontWeight: e.target.value as any })}>
                      <MenuItem value="normal">常规</MenuItem>
                      <MenuItem value="bold">粗体</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="文字颜色" value={footerConfig.color} onChange={(e) => setFooterConfig({ ...footerConfig, color: e.target.value })} placeholder="#475569 或 gray" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox checked={footerConfig.showDate} onChange={(e) => setFooterConfig({ ...footerConfig, showDate: e.target.checked })} />}
                    label="自动追加打印时间"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="图片URL (logo)" value={footerConfig.imageUrl} onChange={(e) => setFooterConfig({ ...footerConfig, imageUrl: e.target.value })} placeholder="https://..." />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>图片位置</InputLabel>
                    <Select value={footerConfig.imagePosition} label="图片位置" onChange={(e) => setFooterConfig({ ...footerConfig, imagePosition: e.target.value as any })}>
                      <MenuItem value="left">左侧</MenuItem>
                      <MenuItem value="right">右侧</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth size="small" type="number" label="图片高度(px)" value={footerConfig.imageHeight || ''} onChange={(e) => setFooterConfig({ ...footerConfig, imageHeight: Number(e.target.value) || 30 })} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="电子印章图片URL" value={footerConfig.stampUrl} onChange={(e) => setFooterConfig({ ...footerConfig, stampUrl: e.target.value })} placeholder="印章图片地址（PNG透明底推荐）" />
                </Grid>
              </Grid>
            </Paper>
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
