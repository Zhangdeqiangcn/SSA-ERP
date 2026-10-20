import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Stack, Alert, Autocomplete, Chip, Divider, MenuItem,
  Select, FormControl, InputLabel, Checkbox,
} from '@mui/material';
import { Snackbar, Alert as MuiAlert } from '@mui/material';
import Grid2 from '@mui/material/Unstable_Grid2';
import { Add, Delete, Save, Send, ArrowBack, PlaylistAdd } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { MaterialLineItemsGrid, GridColumn, PrintPreviewButton } from '@/components/common';
import { useVendorStore } from '@/stores/vendorStore';
import { useMaterialStore } from '@/stores/materialStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { usePriceStore } from '@/stores/priceStore';
import type { PriceInquiry } from '@/types/price';
import type { PurchaseRequest, PurchaseRequestItem } from '@/types/purchase';
import { formatCurrency } from '@/utils/format';
import DemoBanner from '@/components/common/DemoBanner';

interface InquiryItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  quantity: number;
  requiredDate: string;
  estimatedPrice?: number;
  estimatedAmount?: number;
  sourceRequestId?: string;
  sourceRequestNo?: string;
  sourceType?: string;        // 需求来源类型标识
  remarks?: string;
}

/** 需求来源类型 */
type DemandSourceType = 'manual' | 'purchase_request' | 'new_material' | 'customer_inquiry';

const SOURCE_OPTIONS: { value: DemandSourceType; label: string; desc: string }[] = [
  { value: 'manual', label: '手动输入', desc: '逐行手动添加物料' },
  { value: 'purchase_request', label: '采购申请', desc: '从已审批的采购申请中选择行项' },
  { value: 'new_material', label: '新增物料', desc: '从物料主数据中选择外购件' },
  { value: 'customer_inquiry', label: '客户询价', desc: '从客户询价/报价单导入（开发中）' },
];

const InquiryForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const materials = useMaterialStore(s => s.materials);
  const vendors = useVendorStore(s => s.vendors);
  const checkVendorBlacklist = useVendorStore(s => s.checkVendorBlacklist);
  const purchaseRequests = usePurchaseStore(s => s.purchaseRequests);
  const addPriceInquiry = usePriceStore(s => s.addPriceInquiry);

  const [title, setTitle] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const [deadline, setDeadline] = useState('');
  const [currency, setCurrency] = useState('CNY');
  const [remarks, setRemarks] = useState('');
  const [targetVendors, setTargetVendors] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<InquiryItem[]>([]);

  // ── 需求来源状态 ──
  const [sourceType, setSourceType] = useState<DemandSourceType>('manual');
  const [selectedPRIds, setSelectedPRIds] = useState<Set<string>>(new Set());   // 已勾选的采购申请行项 ID（materialId+index 复合）
  const [selectedMatIds, setSelectedMatIds] = useState<Set<string>>(new Set()); // 已勾选的物料 ID

  // 从采购申请导入（兼容旧路由 state）
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromRequests) {
      const importedItems: InquiryItem[] = state.fromRequests.map((item: any, idx: number) => ({
        id: `new-${idx}`,
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        specification: item.specification,
        unit: item.unit,
        quantity: item.quantity,
        requiredDate: item.requiredDate || '',
        estimatedPrice: item.estimatedPrice,
        estimatedAmount: item.estimatedAmount,
        sourceRequestId: item.sourceRequestId,
        sourceRequestNo: item.sourceRequestNo,
        sourceType: 'purchase_request',
        remarks: '',
      }));
      setItems(importedItems);
      setSourceType('purchase_request');
    }
  }, [location.state]);

  // 筛选可用于导入的数据源
  const approvedPRs = useMemo(() =>
    purchaseRequests.filter(pr => pr.status === 'approved' || pr.status === 'pending'),
    [purchaseRequests]
  );

  const purchasableMaterials = useMemo(() =>
    materials.filter(m => m.makeOrBuy === 'buy' || m.materialType === 'purchased' || !m.makeOrBuy),
    [materials]
  );

  const totalAmount = items.reduce((sum, item) => sum + (item.estimatedAmount || item.quantity * (item.estimatedPrice || 0)), 0);
  // B6 黑名单卡点：黑名单供应商不进入可选清单（第一道防线）
  const vendorOptions = vendors.filter(v => v.status !== 'blacklisted').map(v => ({ id: v.id, name: v.name }));
  const blacklistedCount = vendors.filter(v => v.status === 'blacklisted').length;

  // ── 需求来源切换时清空选择 ──
  const handleSourceTypeChange = (newType: DemandSourceType) => {
    setSourceType(newType);
    setSelectedPRIds(new Set());
    setSelectedMatIds(new Set());
  };

  // ── 采购申请勾选 ──
  const togglePRItem = (prId: string, itemIdx: number) => {
    const key = `${prId}-${itemIdx}`;
    setSelectedPRIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── 物料勾选 ──
  const toggleMaterial = (matId: string) => {
    setSelectedMatIds(prev => {
      const next = new Set(prev);
      if (next.has(matId)) next.delete(matId); else next.add(matId);
      return next;
    });
  };

  // ── 批量加入明细 ──
  const handleBatchAdd = () => {
    if (sourceType === 'purchase_request') {
      const newItems: InquiryItem[] = [];
      approvedPRs.forEach(pr => {
        pr.items.forEach((pItem, idx) => {
          const key = `${pr.id}-${idx}`;
          if (!selectedPRIds.has(key)) return;
          // 去重：同一 materialId 不重复追加
          const exists = items.some(i => i.materialId === pItem.materialId && i.sourceRequestId === pr.id);
          if (exists) return;
          newItems.push({
            id: `src-pr-${Date.now()}-${pItem.id || idx}`,
            materialId: pItem.materialId || '',
            materialCode: pItem.materialCode || '',
            materialName: pItem.materialName || '',
            specification: pItem.specification || '',
            unit: pItem.unit || '件',
            quantity: pItem.quantity || 1,
            requiredDate: pItem.deliveryDate || '',
            estimatedPrice: pItem.estimatedPrice,
            estimatedAmount: pItem.estimatedAmount || (pItem.quantity || 1) * (pItem.estimatedPrice || 0),
            sourceRequestId: pr.id,
            sourceRequestNo: pr.requestNo,
            sourceType: 'purchase_request',
            remarks: '',
          });
        });
      });
      if (newItems.length === 0) { setSnackbar({ open: true, message: '请先勾选需要加入的采购申请行项', severity: 'error' }); return; }
      else setItems(prev => [...prev, ...newItems]);
      setSelectedPRIds(new Set());
    }

    if (sourceType === 'new_material') {
      const newItems: InquiryItem[] = [];
      selectedMatIds.forEach(matId => {
        const mat = purchasableMaterials.find(m => m.id === matId);
        if (!mat) return;
        const exists = items.some(i => i.materialId === matId);
        if (exists) return;
        newItems.push({
          id: `src-mat-${Date.now()}-${matId}`,
          materialId: mat.id,
          materialCode: mat.code,
          materialName: mat.name,
          specification: mat.specification || '',
          unit: mat.unit,
          quantity: 1,
          requiredDate: '',
          estimatedPrice: mat.price || undefined,
          estimatedAmount: mat.price || undefined,
          sourceType: 'new_material',
          remarks: '',
        });
      });
      if (newItems.length === 0) { setSnackbar({ open: true, message: '请先勾选需要加入的物料', severity: 'error' }); return; }
      else setItems(prev => [...prev, ...newItems]);
      setSelectedMatIds(new Set());
    }

    if (sourceType === 'customer_inquiry') {
      setSnackbar({ open: true, message: '客户询价来源功能开发中，敬请期待', severity: 'info' });
    }
  };

  // 网格物料数据源
  const inquiryMaterialOptions = materials.map(m => ({
    id: m.id, code: m.code, name: m.name, specification: m.specification || '', unit: m.unit, price: m.price,
  }));

  // ── 物料明细：Excel 式网格（多行复制粘贴 / 列显隐 / 物料号名称分列）──
  const computeInquiryRow = (row: any) => ({
    ...row,
    estimatedAmount: (Number(row.quantity) || 0) * (Number(row.estimatedPrice) || 0),
  });

  const handleInquiryMaterialPricing = (_rowId: string, materialId: string): Record<string, any> => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return {};
    return { estimatedPrice: mat.price };
  };

  const inquiryColumns: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', materialRole: 'code', fillFromMaterial: 'code', width: 140, fixed: true },
    { key: 'materialName', label: '物料名称', materialRole: 'name', fillFromMaterial: 'name', width: 200, fixed: true },
    { key: 'specification', label: '规格', fillFromMaterial: 'specification', width: 140, hideable: true },
    { key: 'unit', label: '单位', fillFromMaterial: 'unit', width: 70, hideable: true },
    { key: 'quantity', label: '数量', type: 'number', align: 'right', width: 90, min: 1, step: 1 },
    { key: 'estimatedPrice', label: '预估单价', type: 'number', align: 'right', width: 110, min: 0, step: 0.01 },
    { key: 'estimatedAmount', label: '预估金额', type: 'readonly', align: 'right', width: 110 },
    { key: 'requiredDate', label: '需求日期', type: 'date', width: 150, hideable: true },
    {
      key: 'sourceType', label: '来源', width: 140, hideable: true,
      renderCell: (row) => row.sourceRequestNo
        ? <Chip label={`采购申请:${row.sourceRequestNo}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
        : row.sourceType === 'new_material'
          ? <Chip label="新增物料" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
          : <Typography variant="caption" color="text.secondary">手动</Typography>,
    },
    { key: 'remarks', label: '备注', width: 120, hideable: true },
  ];

  const makeInquiryRow = () => ({
    id: '', materialId: '', materialCode: '', materialName: '', specification: '',
    unit: '件', quantity: 1, requiredDate: '', estimatedPrice: undefined, estimatedAmount: undefined,
    sourceType: 'manual', remarks: '',
  });

  const buildPriceInquiry = (status: 'draft' | 'published'): PriceInquiry => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(Date.now() % 1000).padStart(3, '0');
    return {
      id: `inquiry-${Date.now()}`,
      inquiryNo: `IQ${dateStr}${seq}`,
      title,
      inquiryDate: now.toISOString().split('T')[0],
      inquirer: '当前用户',
      department: '采购部',
      items: items.map(({ estimatedAmount, estimatedPrice, ...rest }) => ({
        ...rest,
        estimatedAmount: rest.quantity * (estimatedPrice || 0),
        estimatedPrice,
      })),
      targetVendorIds: targetVendors.map(v => v.id),
      targetVendorNames: targetVendors.map(v => v.name),
      deadline,
      currency,
      status,
      totalEstimatedAmount: totalAmount,
      remarks: remarks || undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      createdBy: '当前用户',
      updatedBy: '当前用户',
    };
  };

  /**
   * B6 黑名单硬卡点（第二道防线）：目标供应商中只要有一家在黑名单，整单阻断不落库。
   * 覆盖"选完供应商后才被拉黑"的时间差场景。
   */
  const blockedByBlacklist = (): boolean => {
    const hits = targetVendors
      .map(tv => ({ tv, bl: checkVendorBlacklist(tv.id) }))
      .filter(x => x.bl.blacklisted);
    if (hits.length === 0) return false;
    setSnackbar({ open: true, message: '以下目标供应商已列入黑名单，询价单无法发布：\n' + hits.map(h => `· ${h.bl.vendorName || h.tv.name}：${h.bl.reason || '未填写原因'}`).join('\n') + '\n\n请移除上述供应商后重新发布。', severity: 'error' });
    return true;
  };

  const handleSaveDraft = () => {
    const inquiry = buildPriceInquiry('draft');
    addPriceInquiry(inquiry);
    navigate('/price/inquiry');
  };

  const handlePublish = () => {
    if (!title.trim()) {
      setSnackbar({ open: true, message: '请输入询价单标题', severity: 'error' });
      return;
    }
    if (items.length === 0) {
      setSnackbar({ open: true, message: '请添加至少一项物料', severity: 'error' });
      return;
    }
    if (!deadline) {
      setSnackbar({ open: true, message: '请设置报价截止日期', severity: 'error' });
      return;
    }
    if (targetVendors.length === 0) {
      setSnackbar({ open: true, message: '请选择至少一个目标供应商', severity: 'error' });
      return;
    }
    // B6：黑名单供应商命中即阻断，询价单不落库
    if (blockedByBlacklist()) return;
    const inquiry = buildPriceInquiry('published');
    addPriceInquiry(inquiry);
    navigate('/price/inquiry');
  };

  // 统计已勾选数量
  const prSelectedCount = Array.from(selectedPRIds).length;
  const matSelectedCount = selectedMatIds.size;

  const buildPrintRecord = (): Record<string, any> => ({
    inquiryNo: '(尚未保存)',
    title,
    deadline,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.specification,
      unit: it.unit,
      quantity: it.quantity,
      requiredDate: it.requiredDate,
      unitPrice: it.estimatedPrice,
      amount: it.estimatedAmount,
      sourceType: it.sourceType,
      remarks: it.remarks,
    })),
  });

  return (
    <>
    <PageWrapper
      title="新建询价单"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/price/inquiry')}>返回</Button>
          <PrintPreviewButton entity="inquiry" record={buildPrintRecord()} showBoth />
          <Button variant="outlined" startIcon={<Save />} onClick={handleSaveDraft}>保存草稿</Button>
          <Button variant="contained" startIcon={<Send />} onClick={handlePublish}>发布询价</Button>
        </Stack>
      }
    >
      <DemoBanner reason="询价单「保存草稿 / 发布询价」均**已真实写入询价池**（status=draft/published，可在询价列表与比价单查看）；当前**未对接供应商自动邀请与寻源平台**，发布后需线下通知供应商报价。" />
      {/* 基本信息 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>基本信息</Typography>
        <Grid2 container spacing={2}>
          <Grid2 xs={12} sm={6}>
            <TextField fullWidth label="询价标题" value={title}
              onChange={e => setTitle(e.target.value)} required
              placeholder="如：钢板Q235B+H型钢Q345B询价" />
          </Grid2>
          <Grid2 xs={12} sm={3}>
            <TextField fullWidth label="报价截止日期" type="date" value={deadline}
              onChange={e => setDeadline(e.target.value)} required
              InputLabelProps={{ shrink: true }} />
          </Grid2>
          <Grid2 xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>币种</InputLabel>
              <Select value={currency} onChange={e => setCurrency(e.target.value)} label="币种">
                <MenuItem value="CNY">人民币 CNY</MenuItem>
                <MenuItem value="USD">美元 USD</MenuItem>
                <MenuItem value="EUR">欧元 EUR</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 xs={12}>
            <Autocomplete
              multiple
              options={vendorOptions}
              getOptionLabel={(option) => option.name}
              value={targetVendors}
              onChange={(_, newValue) => setTargetVendors(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="目标供应商" placeholder="选择供应商" required />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option.name} size="small" {...getTagProps({ index })} />
                ))
              }
            />
            {blacklistedCount > 0 && (
              <Alert severity="info" sx={{ mt: 1, py: 0.25 }} data-testid="inquiry-blacklist-hint">
                已按黑名单规则屏蔽 {blacklistedCount} 家供应商，不可选为询价对象。
              </Alert>
            )}
          </Grid2>
          <Grid2 xs={12}>
            <TextField fullWidth label="备注" value={remarks} onChange={e => setRemarks(e.target.value)}
              multiline rows={2} placeholder="特殊要求、付款条件等" />
          </Grid2>
        </Grid2>
      </Paper>

      {/* 需求来源 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>📥 需求来源</Typography>
        <Grid2 container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid2 xs={12} sm={5}>
            <FormControl fullWidth size="small">
              <InputLabel>选择需求来源</InputLabel>
              <Select value={sourceType} label="选择需求来源" inputProps={{ 'data-testid': 'inquiry-source-type' }} onChange={e => handleSourceTypeChange(e.target.value as DemandSourceType)}>
                {SOURCE_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 xs={12} sm={7}>
            {sourceType !== 'manual' && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PlaylistAdd />}
                onClick={handleBatchAdd}
                disabled={sourceType === 'purchase_request' ? prSelectedCount === 0 : sourceType === 'new_material' ? matSelectedCount === 0 : true}
              >
                批量加入明细{`(${sourceType === 'purchase_request' ? prSelectedCount : sourceType === 'new_material' ? matSelectedCount : 0})`}
              </Button>
            )}
          </Grid2>
        </Grid2>

        {/* 来源数据列表 */}
        {sourceType === 'purchase_request' && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              已审批的采购申请（共 {approvedPRs.length} 单，展开可查看行项并勾选）
            </Typography>
            {approvedPRs.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>暂无已审批的采购申请</Alert>
            ) : (
              approvedPRs.map(pr => (
                <Paper key={pr.id} variant="outlined" sx={{ p: 1.5, mt: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Checkbox
                      indeterminate={
                        pr.items.length > 0 &&
                        pr.items.some((_, i) => selectedPRIds.has(`${pr.id}-${i}`)) &&
                        !pr.items.every((_, i) => selectedPRIds.has(`${pr.id}-${i}`))
                      }
                      checked={pr.items.length > 0 && pr.items.every((_, i) => selectedPRIds.has(`${pr.id}-${i}`))}
                      onChange={() => {
                        const allChecked = pr.items.length > 0 && pr.items.every((_, i) => selectedPRIds.has(`${pr.id}-${i}`));
                        const next = new Set(selectedPRIds);
                        pr.items.forEach((_, i) => {
                          const key = `${pr.id}-${i}`;
                          if (allChecked) next.delete(key); else next.add(key);
                        });
                        setSelectedPRIds(next);
                      }}
                      size="small"
                    />
                    <Typography variant="body2" fontWeight={600}>{pr.requestNo}</Typography>
                    <Typography variant="caption" color="text.secondary">{pr.title}</Typography>
                    <Chip label={`${pr.items.length} 行`} size="small" variant="outlined" sx={{ height: 18, fontSize: '.65rem' }} />
                  </Stack>
                  {pr.items.map((pItem, idx) => (
                    <Stack key={`${pr.id}-${idx}`} direction="row" spacing={1} alignItems="center" sx={{ pl: 3, py: 0.25 }}>
                      <Checkbox
                        checked={selectedPRIds.has(`${pr.id}-${idx}`)}
                        onChange={() => togglePRItem(pr.id, idx)}
                        size="small"
                      />
                      <Typography variant="caption">{pItem.materialCode || '—'}</Typography>
                      <Typography variant="caption" sx={{ flex: 1 }}>{pItem.materialName}</Typography>
                      <Typography variant="caption" color="text.secondary">×{pItem.quantity}{pItem.unit || ''}</Typography>
                    </Stack>
                  ))}
                </Paper>
              ))
            )}
          </Box>
        )}

        {sourceType === 'new_material' && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              外购件物料列表（共 {purchasableMaterials.length} 个，勾选后批量加入）
            </Typography>
            {purchasableMaterials.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>暂无可用的外购件物料</Alert>
            ) : (
              <TableContainer sx={{ mt: 1, maxHeight: 280 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width={50}>
                        <Checkbox
                          indeterminate={matSelectedCount > 0 && matSelectedCount < purchasableMaterials.length}
                          checked={matSelectedCount === purchasableMaterials.length && purchasableMaterials.length > 0}
                          onChange={() => {
                            const allChecked = matSelectedCount === purchasableMaterials.length;
                            setSelectedMatIds(allChecked ? new Set() : new Set(purchasableMaterials.map(m => m.id)));
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>编码</TableCell>
                      <TableCell>名称</TableCell>
                      <TableCell>规格</TableCell>
                      <TableCell>单价</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchasableMaterials.slice(0, 50).map(mat => (
                      <TableRow key={mat.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedMatIds.has(mat.id)}
                            onChange={() => toggleMaterial(mat.id)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell><Typography variant="caption">{mat.code}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{mat.name}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{mat.specification || '—'}</Typography></TableCell>
                        <TableCell>{mat.price > 0 ? `¥${mat.price}` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {sourceType === 'customer_inquiry' && (
          <Alert severity="info" sx={{ mt: 1 }}>
            客户询价来源功能正在开发中，将支持从销售报价单/客户询价导入行项。
            当前可使用「手动输入」或「新增物料」方式添加物料。
          </Alert>
        )}

        {sourceType === 'manual' && (
          <Alert severity="info" sx={{ mt: 1 }}>
            手动模式：点击下方「添加物料」按钮逐行录入，或在物料明细表中直接编辑。
          </Alert>
        )}
      </Paper>

      {/* 物料明细 — Excel 式网格 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <MaterialLineItemsGrid
          columns={inquiryColumns}
          value={items}
          onChange={(rows) => setItems(rows as any)}
          materials={inquiryMaterialOptions}
          onMaterialChange={handleInquiryMaterialPricing}
          computeRow={computeInquiryRow}
          newRow={makeInquiryRow}
          storageKey="ssa-inquiry-material-columns"
          addLabel="添加物料"
          testIdPrefix="inquiry"
          footer={
            <Stack direction="row" justifyContent="space-between" alignItems="center" px={1}>
              <Typography variant="body2" color="text.secondary">
                共 {items.length} 项物料
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                预估总金额：{formatCurrency(totalAmount)}
              </Typography>
            </Stack>
          }
        />
      </Paper>
    </PageWrapper>
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3000}
      onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
    </>
  );
};

export default InquiryForm;
