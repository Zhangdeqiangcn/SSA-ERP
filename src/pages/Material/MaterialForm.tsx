import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, TextField, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Paper,
  Grid, Divider, Typography, Snackbar, Alert, FormControl,
  InputLabel, Select, Chip, Stack, Tooltip, Autocomplete,
  Tabs, Tab,
} from '@mui/material';
import { Add, Delete, ArrowBack, Save, Autorenew } from '@mui/icons-material';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageWrapper } from '@/components/layout';
import { FileUpload, CustomFieldsSection } from '@/components/common';
import { useMaterialStore, useDataDictStore, useCustomFieldStore } from '@/stores';
import { useSettingsStore } from '@/stores/settingsStore';
import { useApprovalFlowStore } from '@/stores/approvalFlowStore';
import { getApprovalSteps } from '@/data/approvalFlowConfig';
import { useMaterialApprovalStore } from '@/stores/materialApprovalStore';
import { useAuthStore } from '@/stores/authStore';
import { Material, MaterialApplication, MaterialType, MakeOrBuy, MaterialCategory } from '@/types';
import { generateMaterialCodeByCategory, getCategoryFullCode } from '@/utils/codeGenerator';

// 物料类型 / 自制外购 选项
const MATERIAL_TYPE_OPTIONS = [
  { value: 'raw', label: '原材料' },
  { value: 'semi', label: '半成品' },
  { value: 'finished', label: '成品' },
  { value: 'purchased', label: '外购件' },
  { value: 'service', label: '服务' },
];
const MAKE_OR_BUY_OPTIONS = [
  { value: 'make', label: '自制' },
  { value: 'buy', label: '外购' },
];

// 递归构建树形分类选项（扁平带层级标记）
const buildCategoryOptions = (
  nodes: MaterialCategory[],
  depth: number = 0
): { id: string; label: string; depth: number }[] => {
  const options: { id: string; label: string; depth: number }[] = [];
  nodes.forEach(node => {
    const indent = '\u00A0\u00A0'.repeat(depth);
    options.push({
      id: node.id,
      label: `${indent}${depth > 0 ? '└ ' : ''}${node.name}`,
      depth,
    });
    if (node.children) {
      options.push(...buildCategoryOptions(node.children, depth + 1));
    }
  });
  return options;
};

// 递归查找分类名称
const findCategoryName = (nodes: MaterialCategory[], id: string): string => {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    if (node.children) {
      const name = findCategoryName(node.children, id);
      if (name) return name;
    }
  }
  return '';
};

// 递归查找分类 code
const findCategoryCode = (nodes: MaterialCategory[], id: string): string => {
  for (const node of nodes) {
    if (node.id === id) return node.code;
    if (node.children) {
      const code = findCategoryCode(node.children, id);
      if (code) return code;
    }
  }
  return '';
};

const materialSchema = z.object({
  code: z.string().min(1, '请输入物料编码'),
  name: z.string().min(1, '请输入物料名称'),
  categoryId: z.string().min(1, '请选择物料分类'),
  specification: z.string().optional(),
  model: z.string().optional(),
  materialType: z.enum(['raw', 'semi', 'finished', 'purchased', 'service'] as const).optional(),
  makeOrBuy: z.enum(['make', 'buy']).optional(),
  unit: z.string().min(1, '请输入单位'),
  safetyStock: z.number().min(0),
  minStock: z.number().min(0),
  maxStock: z.number().min(0),
  price: z.number().min(0),
  currency: z.string(),
  status: z.enum(['draft', 'active', 'inactive', 'pending', 'approved', 'rejected']),
  remarks: z.string().optional(),
  leadTime: z.number().optional(),
  moq: z.number().optional(),
  mpq: z.number().optional(),
  defaultVendorId: z.string().optional(),
  defaultVendorName: z.string().optional(),
  purchaseUnit: z.string().optional(),
  unitConversion: z.number().optional(),
  parameters: z.array(z.object({
    key: z.string(),
    value: z.string(),
    unit: z.string().optional(),
  })).optional(),
  // 采购视图
  purchasingGroup: z.string().optional(),
  orderUnit: z.string().optional(),
  purchasingValueKey: z.string().optional(),
  grProcessingDays: z.number().optional(),
  // MRP 视图
  mrpType: z.string().optional(),
  mrpController: z.string().optional(),
  lotSize: z.number().optional(),
  reorderPoint: z.number().optional(),
  plannedDeliveryDays: z.number().optional(),
  // 销售视图
  taxClassification: z.string().optional(),
  deliveryUnit: z.string().optional(),
  minOrderQty: z.number().optional(),
  minDeliveryQty: z.number().optional(),
  accountAssignmentGroup: z.string().optional(),
  // P2-23 GTIN 条码
  gtin: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialSchema>;

// P2-23 GTIN 校验位算法（适用于 GTIN-8/12/13/14，mod-10 权重 1/3 交替）
const validateGTIN = (raw: string): { valid: boolean; message: string } => {
  const code = (raw || '').replace(/[\s-]/g, '');
  if (!code) return { valid: true, message: '未填写' };
  if (!/^\d+$/.test(code)) return { valid: false, message: 'GTIN 仅能包含数字' };
  const len = code.length;
  if (![8, 12, 13, 14].includes(len)) {
    return { valid: false, message: `长度应为 8 / 12 / 13 / 14 位（当前 ${len} 位）` };
  }
  let sum = 0;
  for (let p = 1; p <= len - 1; p++) {
    sum += Number(code[p - 1]) * (p % 2 === 1 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(code[len - 1])) {
    return { valid: false, message: `校验位错误（应为 ${check}）` };
  }
  return { valid: true, message: `有效（GTIN-${len}）` };
};

const MaterialForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const templateName = searchParams.get('template');
  const templateCategoryId = searchParams.get('categoryId');
  const templateCategoryName = searchParams.get('categoryName');
  const templateMaterialType = searchParams.get('materialType');
  const templateMakeOrBuy = searchParams.get('makeOrBuy');
  const templateUnit = searchParams.get('unit');
  const templateSpecification = searchParams.get('specification');
  const { materials, addMaterial, updateMaterial, categories } = useMaterialStore();
  // 审批配置（新增物料时若启用审批，则走申请流程，统一由审批流引擎 material 模块驱动）
  const materialFlowEnabled = useApprovalFlowStore(s => s.flows.find(f => f.module === 'material')?.enabled ?? true);
  const steps = getApprovalSteps('material');
  const addMaterialApplication = useMaterialApprovalStore(s => s.addMaterialApplication);
  const currentUser = useAuthStore(s => s.currentUser);

  const isApprovalMode = !isEdit && materialFlowEnabled;

  const categoryOptions = buildCategoryOptions(categories);
  // 单位下拉：直接读取数据字典单一数据源（ssa-erp-datadict），随设置页维护实时同步
  const unitOptions = useDataDictStore((s) => s.units);
  const existingMaterial = isEdit ? materials.find(m => m.id === id) : null;

  const [parameterRows, setParameterRows] = useState<{ key: string; value: string; unit?: string }[]>(
    existingMaterial?.parameters || []
  );
  // 自定义字段值（按设置页配置动态扩展）
  const [customFields, setCustomFields] = useState<Record<string, unknown>>(
    existingMaterial?.customFields || {}
  );
  const [snackbar, setSnackbar] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 编码规则相关状态（按分类层级自动编码）
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  // Tab 切换
  const [tabValue, setTabValue] = useState(0);

  // react-hook-form
  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      code: existingMaterial?.code || (!isEdit && templateName ? `TMPL-${templateName}` : ''),
      name: existingMaterial?.name || (!isEdit && templateName ? templateName : ''),
      categoryId: existingMaterial?.categoryId || templateCategoryId || '',
      specification: existingMaterial?.specification || templateSpecification || '',
      model: existingMaterial?.model || '',
      materialType: existingMaterial?.materialType || (templateMaterialType as MaterialType) || '',
      makeOrBuy: existingMaterial?.makeOrBuy || (templateMakeOrBuy as MakeOrBuy) || '',
      unit: existingMaterial?.unit || templateUnit || '',
      safetyStock: existingMaterial?.safetyStock || 0,
      minStock: existingMaterial?.minStock || 0,
      maxStock: existingMaterial?.maxStock || 0,
      price: existingMaterial?.price || 0,
      currency: existingMaterial?.currency || 'CNY',
      status: existingMaterial?.status || 'active',
      remarks: existingMaterial?.remarks || '',
      leadTime: existingMaterial?.leadTime || 0,
      moq: existingMaterial?.moq || 0,
      mpq: existingMaterial?.mpq || 0,
      defaultVendorId: existingMaterial?.defaultVendorId || '',
      defaultVendorName: existingMaterial?.defaultVendorName || '',
      purchaseUnit: existingMaterial?.purchaseUnit || '',
      unitConversion: existingMaterial?.unitConversion || 0,
      // 采购视图
      purchasingGroup: existingMaterial?.purchasingGroup || '',
      orderUnit: existingMaterial?.orderUnit || '',
      purchasingValueKey: existingMaterial?.purchasingValueKey || '',
      grProcessingDays: existingMaterial?.grProcessingDays || 0,
      // MRP 视图
      mrpType: existingMaterial?.mrpType || '',
      mrpController: existingMaterial?.mrpController || '',
      lotSize: existingMaterial?.lotSize || 0,
      reorderPoint: existingMaterial?.reorderPoint || 0,
      plannedDeliveryDays: existingMaterial?.plannedDeliveryDays || 0,
      // 销售视图
      taxClassification: existingMaterial?.taxClassification || '',
      deliveryUnit: existingMaterial?.deliveryUnit || '',
      minOrderQty: existingMaterial?.minOrderQty || 0,
      minDeliveryQty: existingMaterial?.minDeliveryQty || 0,
      accountAssignmentGroup: existingMaterial?.accountAssignmentGroup || '',
      // P2-23 GTIN
      gtin: existingMaterial?.gtin || '',
    },
  });

  // P2-23 GTIN 实时校验
  const gtinValue = useWatch({ control, name: 'gtin' }) || '';
  const gtinCheck = validateGTIN(gtinValue);

  // 监听分类变化
  const watchedCategoryId = watch('categoryId');

  // 按分类层级自动生成物料编码（分类编码前缀 + 流水号）
  const generatedCode = useMemo(() => {
    if (!watchedCategoryId) return '';
    return generateMaterialCodeByCategory(watchedCategoryId, categories, materials);
  }, [watchedCategoryId, categories, materials]);

  const categoryPrefix = useMemo(
    () => (watchedCategoryId ? getCategoryFullCode(categories, watchedCategoryId) : ''),
    [watchedCategoryId, categories]
  );

  // 当分类变化时，自动生成编码（仅新增模式且未手动编辑）
  useEffect(() => {
    if (isEdit || codeManuallyEdited) return;
    if (!generatedCode) {
      setValue('code', '');
      return;
    }
    setValue('code', generatedCode);
  }, [generatedCode, isEdit, codeManuallyEdited, setValue]);

  // 手动重新生成编码
  const handleRegenerateCode = useCallback(() => {
    if (!generatedCode) return;
    setValue('code', generatedCode);
    setCodeManuallyEdited(false);
  }, [generatedCode, setValue]);

  const addParameter = () => {
    setParameterRows([...parameterRows, { key: '', value: '', unit: '' }]);
  };

  const removeParameter = (index: number) => {
    setParameterRows(parameterRows.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: string, value: string) => {
    const updated = [...parameterRows];
    updated[index] = { ...updated[index], [field]: value };
    setParameterRows(updated);
  };

  const onSubmit = (data: MaterialFormData) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const categoryName = findCategoryName(categories, data.categoryId);

    // 自定义字段必填校验
    const cfDefs = useCustomFieldStore.getState().fields.material || [];
    for (const def of cfDefs) {
      if (def.required) {
        const v = customFields[def.key];
        if (v === undefined || v === null || v === '' || (def.type === 'checkbox' && v === false)) {
          setFormError(`「${def.label}」为必填项`);
          return;
        }
      }
    }
    setFormError(null);

    // 新增 + 审批启用：构建物料新增申请，不生成正式物料
    if (isApprovalMode) {
      const app: MaterialApplication = {
        id: `ma-${Date.now()}`,
        applicationNo: `MA${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000)}`,
        applicant: currentUser?.name || '未知',
        applicantRole: currentUser?.role || 'admin',
        status: 'pending',
        currentStep: 0,
        draft: { ...data, materialType: data.materialType as MaterialType, parameters: parameterRows as Material['parameters'] },
        stepHistory: [{
          step: 0,
          role: currentUser?.role || 'admin',
          label: steps[0]?.name || '发起申请',
          action: 'submit',
          fields: steps[0]?.fields ?? [],
          at: new Date().toISOString(),
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addMaterialApplication(app);
      setSubmitted(true);
      return;
    }

    if (isEdit && existingMaterial) {
      // 编辑模式：更新 store 中已有数据
      updateMaterial(existingMaterial.id, {
        ...data,
        materialType: data.materialType as MaterialType,
        categoryName,
        currentStock: existingMaterial.currentStock,
        parameters: parameterRows as Material['parameters'],
        customFields,
        updatedAt: now,
        updatedBy: 'admin',
      });
      setSnackbar(true);
      setTimeout(() => navigate('/material/list'), 500);
    } else {
      // 新增模式：添加新物料到 store
      const newMaterial: Material = {
        id: `mat-${Date.now()}`,
        ...data,
        materialType: data.materialType as MaterialType,
        categoryName,
        currentStock: 0,
        currency: data.currency as Material['currency'],
        status: data.status as Material['status'],
        parameters: parameterRows as Material['parameters'],
        customFields,
        createdAt: now,
        updatedAt: now,
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      addMaterial(newMaterial);
      setSnackbar(true);
      setTimeout(() => navigate('/material/list'), 500);
    }
  };

  const handleSaveDraft = () => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    // 暂存：使用当前表单数据（可能不完整），标记为 draft
    const formValues = getValues();
    const categoryName = findCategoryName(categories, formValues.categoryId || '');

    if (isEdit && existingMaterial) {
      updateMaterial(existingMaterial.id, {
        ...formValues,
        materialType: formValues.materialType as MaterialType,
        categoryName,
        status: 'draft' as Material['status'],
        currentStock: existingMaterial.currentStock,
        customFields,
        updatedAt: now,
        updatedBy: 'admin',
      });
    } else {
      const newMaterial: Material = {
        id: `mat-${Date.now()}`,
        code: formValues.code || 'AUTO',
        name: formValues.name || '未命名',
        categoryId: formValues.categoryId || '',
        categoryName,
        specification: formValues.specification || '',
        model: formValues.model || '',
        materialType: formValues.materialType as Material['materialType'],
        makeOrBuy: formValues.makeOrBuy as Material['makeOrBuy'],
        unit: formValues.unit || '',
        safetyStock: formValues.safetyStock || 0,
        minStock: formValues.minStock || 0,
        maxStock: formValues.maxStock || 0,
        currentStock: 0,
        price: formValues.price || 0,
        currency: (formValues.currency || 'CNY') as Material['currency'],
        status: 'draft' as Material['status'],
        remarks: formValues.remarks || '',
        leadTime: formValues.leadTime,
        moq: formValues.moq,
        mpq: formValues.mpq,
        defaultVendorId: formValues.defaultVendorId || '',
        defaultVendorName: formValues.defaultVendorName || '',
        purchaseUnit: formValues.purchaseUnit || '',
        unitConversion: formValues.unitConversion,
        purchasingGroup: formValues.purchasingGroup,
        orderUnit: formValues.orderUnit,
        purchasingValueKey: formValues.purchasingValueKey,
        grProcessingDays: formValues.grProcessingDays,
        mrpType: formValues.mrpType,
        mrpController: formValues.mrpController,
        lotSize: formValues.lotSize,
        reorderPoint: formValues.reorderPoint,
        plannedDeliveryDays: formValues.plannedDeliveryDays,
        taxClassification: formValues.taxClassification,
        deliveryUnit: formValues.deliveryUnit,
        minOrderQty: formValues.minOrderQty,
        minDeliveryQty: formValues.minDeliveryQty,
        accountAssignmentGroup: formValues.accountAssignmentGroup,
        // P2-23 GTIN
        gtin: formValues.gtin || '',
        parameters: parameterRows as Material['parameters'],
        customFields,
        createdAt: now,
        updatedAt: now,
        createdBy: 'admin',
        updatedBy: 'admin',
      };
      addMaterial(newMaterial);
    }
    setSnackbar(true);
    setTimeout(() => navigate('/material/list'), 500);
  };

  return (
    <PageWrapper
      title={isEdit ? '编辑物料' : (isApprovalMode ? '新增物料（审批）' : templateName ? `新增物料（模板：${templateName}）` : '新增物料')}
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
          >
            取消
          </Button>
          {!isApprovalMode && (
            <Button
              variant="outlined"
              onClick={handleSaveDraft}
            >
              暂存
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Save />}
            data-testid={isApprovalMode ? 'material-submit' : undefined}
            onClick={handleSubmit(onSubmit)}
          >
            保存
          </Button>
        </Box>
      }
    >
      {submitted ? (
        <Stack spacing={2}>
          <Alert severity="success" variant="filled">
            已提交物料新增审批，等待采购审核与批准生效
          </Alert>
          <Box>
            <Button variant="contained" onClick={() => navigate('/material/list')}>
              返回物料列表
            </Button>
          </Box>
        </Stack>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="基本信息" />
            <Tab label="采购" />
            <Tab label="MRP" />
            <Tab label="销售" />
            <Tab label="会计" />
          </Tabs>

          {/* ========== Tab 0: 基本信息 ========== */}
          {tabValue === 0 && (
            <>
              <Grid container spacing={2}>
                {/* 编码规则说明（分类即编码规则：分类编码前缀 + 流水号） */}
                {!isEdit && (
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip
                        label="编码规则：按分类自动生成"
                        color="info"
                        size="small"
                        variant="outlined"
                      />
                      {categoryPrefix && (
                        <Typography variant="body2" color="text.secondary">
                          前缀 <strong>{categoryPrefix}</strong> + 流水号（由所属分类定义）
                        </Typography>
                      )}
                      {generatedCode && (
                        <Chip
                          label={`预览：${generatedCode}`}
                          color="success"
                          size="small"
                        />
                      )}
                      <Tooltip title="重新生成编码">
                        <IconButton onClick={handleRegenerateCode} color="primary">
                          <Autorenew />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="物料编码"
                        fullWidth
                        error={!!errors.code}
                        helperText={generatedCode && !codeManuallyEdited ? '已按分类自动生成，可手动修改' : errors.code?.message}
                        onChange={e => {
                          field.onChange(e);
                          setCodeManuallyEdited(true);
                        }}
                        InputProps={{
                          readOnly: false,
                          endAdornment: generatedCode && !codeManuallyEdited ? (
                            <Chip label="自动" color="success" size="small" sx={{ mr: 1 }} />
                          ) : null,
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="物料名称"
                        fullWidth
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="物料分类"
                        fullWidth
                        error={!!errors.categoryId}
                        helperText={errors.categoryId?.message}
                      >
                        {categoryOptions.map(opt => (
                          <MenuItem key={opt.id} value={opt.id}
                            sx={{ pl: 2 + opt.depth * 2 }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        freeSolo
                        options={unitOptions}
                        value={field.value || ''}
                        onChange={(_, v) => field.onChange(v || '')}
                        onInputChange={(_, v) => field.onChange(v || '')}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="单位"
                            fullWidth
                            error={!!errors.unit}
                            helperText={errors.unit?.message}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="型号"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="materialType"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="物料类型"
                        fullWidth
                      >
                        {MATERIAL_TYPE_OPTIONS.map(o => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="makeOrBuy"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="自制/外购"
                        fullWidth
                      >
                        {MAKE_OR_BUY_OPTIONS.map(o => (
                          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="specification"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="规格型号"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                {/* P2-23 GTIN 条码字段 + 扫码校验 */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="gtin"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="GTIN 条码"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-gtin' }}
                        placeholder="全球贸易项目代码（EAN/UPC/GTIN）"
                        error={!!gtinValue && !gtinCheck.valid}
                        helperText={gtinValue ? gtinCheck.message : '可点击右侧"扫码"录入并自动校验'}
                        FormHelperTextProps={{ component: 'div' }}
                        InputProps={{
                          endAdornment: (
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} data-testid="mat-gtin-scan"
                              onClick={() => {
                                const scanned = window.prompt('请扫描或粘贴 GTIN 条码：');
                                if (scanned != null) {
                                  const v = scanned.trim();
                                  setValue('gtin', v, { shouldValidate: true, shouldDirty: true });
                                  const r = validateGTIN(v);
                                  if (v && !r.valid) window.alert(`GTIN 校验未通过：${r.message}`);
                                }
                              }}>
                              扫码
                            </Button>
                          ),
                        }}
                      />
                    )}
                  />
                  {gtinValue && (
                    <Chip
                      size="small"
                      sx={{ mt: 0.5 }}
                      data-testid="mat-gtin-status"
                      label={gtinCheck.valid ? `✓ ${gtinCheck.message}` : `✗ ${gtinCheck.message}`}
                      color={gtinCheck.valid ? 'success' : 'error'}
                      variant="outlined"
                    />
                  )}
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">库存设置</Typography>
              </Divider>

              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="safetyStock"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="安全库存"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="minStock"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="最小库存"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="maxStock"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="最大库存"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="单价"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }}>
                <Typography variant="caption" color="text.secondary">技术参数</Typography>
              </Divider>

              <Box sx={{ mb: 2 }}>
                <Button startIcon={<Add />} onClick={addParameter}>
                  添加参数
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>参数名称</TableCell>
                      <TableCell>参数值</TableCell>
                      <TableCell>单位</TableCell>
                      <TableCell width={80}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parameterRows.map((param, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={param.key}
                            onChange={e => updateParameter(index, 'key', e.target.value)}
                            placeholder="如：厚度"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={param.value}
                            onChange={e => updateParameter(index, 'value', e.target.value)}
                            placeholder="如：10mm"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={param.unit || ''}
                            onChange={e => updateParameter(index, 'unit', e.target.value)}
                            placeholder="如：mm"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeParameter(index)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {parameterRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          暂无技术参数
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <FileUpload multiple />

              <CustomFieldsSection entity="material" value={customFields} onChange={setCustomFields} />
            </>
          )}

          {/* ========== Tab 1: 采购 ========== */}
          {tabValue === 1 && !isApprovalMode && (
            <>
              <Divider sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">采购视图</Typography>
              </Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="leadTime"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="采购提前期(天)"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-leadtime' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="moq"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="最小订单量(MOQ)"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="mpq"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="最小包装量(MPQ)"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="purchaseUnit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="采购单位"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="unitConversion"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="单位换算系数"
                        fullWidth
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="purchasingGroup"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="采购组"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-purchasing-group' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="orderUnit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="订单单位"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-order-unit' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="purchasingValueKey"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="采购值键"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-purchasing-value-key' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="grProcessingDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="收货处理天数"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-gr-processing-days' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="defaultVendorId"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="默认供应商ID"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="defaultVendorName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="默认供应商名称"
                        fullWidth
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* ========== Tab 2: MRP ========== */}
          {tabValue === 2 && (
            <>
              <Divider sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">MRP 视图</Typography>
              </Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="mrpType"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="MRP 类型"
                        fullWidth
                        placeholder="PD / VB / ND"
                        inputProps={{ 'data-testid': 'mat-mrp-type' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="mrpController"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="MRP 控制者"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-mrp-controller' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="lotSize"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="批量大小"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-lot-size' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="reorderPoint"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="再订货点"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-reorder-point' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="plannedDeliveryDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="计划交货天数"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-planned-delivery-days' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* ========== Tab 3: 销售 ========== */}
          {tabValue === 3 && (
            <>
              <Divider sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">销售视图</Typography>
              </Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="taxClassification"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="税分类"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-tax-classification' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="deliveryUnit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="交货单位"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-delivery-unit' }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="minOrderQty"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="最小订单量"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-min-order-qty' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="minDeliveryQty"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="最小交货量"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-min-delivery-qty' }}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Controller
                    name="accountAssignmentGroup"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="科目分配组"
                        fullWidth
                        inputProps={{ 'data-testid': 'mat-account-assignment-group' }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* ========== Tab 4: 会计 ========== */}
          {tabValue === 4 && (
            <>
              <Divider sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary">会计视图</Typography>
              </Divider>
              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                暂无会计相关字段
              </Typography>
            </>
          )}
        </Box>
      )}

      <Snackbar open={snackbar} autoHideDuration={2000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" variant="filled">
          {isEdit ? '物料已更新！' : '物料已保存，可在列表中查看！'}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

export default MaterialForm;
