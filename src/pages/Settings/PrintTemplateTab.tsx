import React, { useState, useRef } from 'react';
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
  PrintExtraOptions, DEFAULT_EXTRA_OPTIONS, textToHtml,
} from '@/stores/printTemplateStore';
import PrintPreview from '@/components/common/PrintPreview';
import { ConfirmDialog } from '@/components/common';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { NodeSelection } from '@tiptap/pm/state';
import {
  RichTextEditor, ControlledBubbleMenu, MenuControlsContainer, MenuDivider,
  MenuButtonBold, MenuButtonItalic, MenuButtonUnderline, MenuButtonTextColor,
  MenuButtonAlignLeft, MenuButtonAlignCenter, MenuButtonAlignRight,
  MenuButtonImageUpload, FontSize, ResizableImage,
} from 'mui-tiptap';

/** 本地图片文件 → base64 data URL（内嵌到富文本，离线可打印、随模板持久化） */
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface RichTextEditorFieldProps {
  label: string;
  initialHtml: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

/**
 * Word 式富文本编辑器（基于 mui-tiptap / Tiptap v3）
 * - 顶部工具栏：加粗/斜体/下划线/字体颜色/对齐/插入图片
 * - 选中文字时弹出气泡菜单（Bubble Menu）快速调格式
 * - 插入图片：本地文件直选 → base64 内嵌（电子印章/Logo 同为图片）
 * - 图片支持拖拽缩放（ResizableImage）
 */
const RichTextEditorField: React.FC<RichTextEditorFieldProps> = ({ label, initialHtml, onChange, minHeight = 90 }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const uploadImages = async (files: File[]) => {
    const urls = await Promise.all(files.map(fileToDataUrl));
    return urls.map((src) => ({ src }));
  };
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>{label}</Typography>
      <RichTextEditor
        className="ssa-print-rte"
        extensions={[
          StarterKit,
          Underline,
          // 'image' 加入 types：让对齐命令可作用于图片块（选中图片后可左/中/右定位）
          TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
          TextStyle,       // FontSize 的前置依赖（Tiptap 官方要求）
          Color,
          FontSize,
          // allowBase64：允许 base64 图片被解析（否则保存后重新打开会被丢弃）
          ResizableImage.configure({ allowBase64: true }),
        ]}
        content={initialHtml || ''}
        editorProps={{ attributes: { style: `min-height:${minHeight}px; padding:8px 10px;` } }}
        onUpdate={({ editor }) => onChangeRef.current(editor.getHTML())}
        renderControls={() => (
          <MenuControlsContainer>
            <MenuButtonBold />
            <MenuButtonItalic />
            <MenuButtonUnderline />
            <MenuButtonTextColor />
            <MenuButtonAlignLeft />
            <MenuButtonAlignCenter />
            <MenuButtonAlignRight />
            <MenuDivider />
            <MenuButtonImageUpload onUploadFiles={uploadImages} inputProps={{ accept: 'image/*', multiple: false }} />
          </MenuControlsContainer>
        )}
      >
        {(editor) => {
          if (!editor) return null;
          // 选中图片时弹出图片专属菜单（左/中/右对齐定位），否则弹文字格式菜单
          const sel = editor.state.selection;
          const isImageSelected =
            sel instanceof NodeSelection && sel.node.type.name === 'image';
          if (isImageSelected) {
            return (
              <ControlledBubbleMenu editor={editor} open={editor.isFocused}>
                <MenuControlsContainer>
                  <MenuButtonAlignLeft />
                  <MenuButtonAlignCenter />
                  <MenuButtonAlignRight />
                </MenuControlsContainer>
              </ControlledBubbleMenu>
            );
          }
          return (
            <ControlledBubbleMenu
              editor={editor}
              open={editor.isFocused && !editor.state.selection.empty}
            >
              <MenuControlsContainer>
                <MenuButtonBold />
                <MenuButtonItalic />
                <MenuButtonUnderline />
                <MenuButtonTextColor />
                <MenuButtonAlignLeft />
                <MenuButtonAlignCenter />
                <MenuButtonAlignRight />
              </MenuControlsContainer>
            </ControlledBubbleMenu>
          );
        }}
      </RichTextEditor>
    </Box>
  );
};

const ENTITIES = Object.keys(PRINT_ENTITY_LABELS) as PrintEntity[];

/** 打印附加信息可选项（审批记录/制单人/时间/审核人/时间/页码） */
const EXTRA_OPTION_CATALOG: { key: keyof PrintExtraOptions; label: string }[] = [
  { key: 'approvalRecord', label: '审批记录' },
  { key: 'createdBy', label: '制单人' },
  { key: 'createdAt', label: '制单时间' },
  { key: 'approvedBy', label: '审核人' },
  { key: 'approvedAt', label: '审核时间' },
  { key: 'pageNumber', label: '页码' },
];

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
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState('');
  const [headerConfig, setHeaderConfig] = useState<HeaderFooterConfig>(DEFAULT_HEADER_CONFIG);
  const [footerConfig, setFooterConfig] = useState<HeaderFooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [extraOptions, setExtraOptions] = useState<PrintExtraOptions>({ ...DEFAULT_EXTRA_OPTIONS });
  const [openSeq, setOpenSeq] = useState(0);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setTitle(PRINT_ENTITY_LABELS[entity] + '打印模板');
    setPaperSize('A4');
    setOrientation('portrait');
    setFieldKeys(PRINT_FIELD_CATALOG[entity].map((c) => c.key));
    setHeaderConfig({ html: '', showDate: false });
    setFooterConfig({ html: '', showDate: true });
    setExtraOptions({ ...DEFAULT_EXTRA_OPTIONS });
    setOpenSeq((s) => s + 1);
    setDialogOpen(true);
  };

  const openEdit = (tpl: PrintTemplate) => {
    setEditing(tpl);
    setName(tpl.name);
    setTitle(tpl.title);
    setPaperSize(tpl.paperSize);
    setOrientation(tpl.orientation);
    setFieldKeys([...tpl.fieldKeys]);
    setHeaderConfig(tpl.headerConfig ? { html: tpl.headerConfig.html || '', showDate: tpl.headerConfig.showDate ?? false } : { html: textToHtml(tpl.headerText), showDate: false });
    setFooterConfig(tpl.footerConfig ? { html: tpl.footerConfig.html || '', showDate: tpl.footerConfig.showDate ?? true } : { html: textToHtml(tpl.footerText), showDate: true });
    setExtraOptions({ ...DEFAULT_EXTRA_OPTIONS, ...(tpl.extraOptions || {}) });
    setOpenSeq((s) => s + 1);
    setDialogOpen(true);
  };

  const toggleField = (key: string) => {
    setFieldKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const toggleExtraOption = (key: keyof PrintExtraOptions) => {
    setExtraOptions((prev) => ({ ...prev, [key]: !prev[key] }));
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
      // ★ V3.7.0 修复「图片存两遍」：这两个字段是 V2.89 之前的旧结构，
      // 标注 @deprecated，已无任何读取方（PrintPreview 的兜底分支永远走不到，
      // 因为 headerConfig 在下面一定被赋成非空字符串）。
      // 此前保存时把 headerConfig.html 原样复制一份进来，导致页眉里那张
      // 203 KB 的 Logo **在库里存了两份**（实测两份字节完全相同），
      // 整个打印模板域 404 KB 里有 199 KB 是这份纯冗余。
      // 这里置空：结构保留（老数据/老代码兼容），但不再写内容。
      headerText: '',
      footerText: '',
      headerConfig: { html: headerConfig.html || '', showDate: headerConfig.showDate },
      footerConfig: { html: footerConfig.html || '', showDate: footerConfig.showDate },
      fieldKeys,
      extraOptions: { ...extraOptions },
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

  // V3.92.0：删除模板 / 恢复默认均为不可逆操作，改走统一确认弹窗
  // （替代浏览器原生 confirm：样式与全站割裂、无法回看、无障碍差）
  const [confirmState, setConfirmState] = useState<
    { kind: 'delete'; id: string } | { kind: 'reset' } | null
  >(null);

  const handleDelete = (id: string) => setConfirmState({ kind: 'delete', id });

  const runConfirmed = () => {
    if (!confirmState) return;
    if (confirmState.kind === 'delete') {
      removeTemplate(confirmState.id);
      setSnackbar('已删除模板');
    } else {
      resetTemplates();
      setSnackbar('已恢复默认');
    }
    setConfirmState(null);
  };

  return (
    <Box>
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.kind === 'reset' ? '确认恢复默认' : '确认删除'}
        content={confirmState?.kind === 'reset'
          ? '确定恢复全部默认模板？当前自定义模板将被覆盖。'
          : '确定删除该打印模板？删除后不可恢复。'}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmState(null)}
        confirmText="确认"
        confirmColor="error"
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>打印模板设计器</Typography>
          <Typography variant="caption" color="text.secondary">
            为单据设计打印版式（标题/纸张/页眉页脚/字段），业务页面「打印」按钮将套用对应模板。
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RestartAlt />} color="warning" onClick={() => setConfirmState({ kind: 'reset' })}>
            恢复默认
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>新增模板</Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        {/* 与后端 REQUIRED_CORE_FIELDS（print_templates: name + entity）对齐：entity（适用单据类型）必填 */}
        <FormControl size="small" sx={{ minWidth: 200 }} required>
          <InputLabel required>业务实体</InputLabel>
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
            {/* 与后端 REQUIRED_CORE_FIELDS（print_templates: name + entity）对齐：name 必填 */}
            <TextField fullWidth required label="模板名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
            <RichTextEditorField
              key={`header-rte-${openSeq}`}
              label="页眉（选中文字改格式；插入图片/印章后：按住图片拖动可移动，选中图片弹出按钮可左/中/右定位）"
              initialHtml={headerConfig.html}
              onChange={(html) => setHeaderConfig((c) => ({ ...c, html }))}
            />
            <FormControlLabel
              control={<Checkbox checked={headerConfig.showDate} onChange={(e) => setHeaderConfig((c) => ({ ...c, showDate: e.target.checked }))} />}
              label="页眉自动追加打印时间"
            />

            <RichTextEditorField
              key={`footer-rte-${openSeq}`}
              label="页脚（选中文字改格式；插入图片/印章后：按住图片拖动可移动，选中图片弹出按钮可左/中/右定位）"
              initialHtml={footerConfig.html}
              onChange={(html) => setFooterConfig((c) => ({ ...c, html }))}
            />
            <FormControlLabel
              control={<Checkbox checked={footerConfig.showDate} onChange={(e) => setFooterConfig((c) => ({ ...c, showDate: e.target.checked }))} />}
              label="页脚自动追加打印时间"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>打印附加信息（勾选）</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {EXTRA_OPTION_CATALOG.map((o) => (
                  <FormControlLabel
                    key={o.key}
                    control={<Checkbox checked={extraOptions[o.key]} onChange={() => toggleExtraOption(o.key)} />}
                    label={o.label}
                  />
                ))}
              </Box>
            </Box>
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
