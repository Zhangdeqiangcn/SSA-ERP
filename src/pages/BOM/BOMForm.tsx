import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Divider, Grid,
  TextField, Autocomplete, Stack, Alert, Tooltip, MenuItem,
  Switch, Slider, FormControlLabel,
} from '@mui/material';
import {
  ArrowBack, Edit, ExpandMore, ExpandLess, Add, Delete, Save,
} from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { FlowTracker, MaterialLineItemsGrid, GridColumn, PrintPreviewButton } from '@/components/common';
import { useMaterialStore } from '@/stores/materialStore';
import { useBOMStore } from '@/stores/bomStore';
import { BOMItem, BOMType, BOMStatus, CoProduct, ByProduct, CostSplitMethod } from '@/types/bom';
import { formatCurrency } from '@/utils/format';

interface BOMItemRow extends BOMItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialSpec?: string;
  quantity: number;
  unit: string;
  scrapRate: number;
  source: 'purchase' | 'manufacture' | 'phantom';
  unitCost: number;
  totalCost: number;
  isCritical: boolean;
  children?: BOMItemRow[];
}

const BOMForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== 'create';
  const materials = useMaterialStore(s => s.materials);
  const { addBOM, updateBOM, bomList: storeBomList } = useBOMStore();
  
  // 编辑模式：从 store 读取现有 BOM 数据
  const existingBOM = isEdit ? storeBomList.find(b => b.id === id) : null;

  // 基本信息
  const [bomNo, setBomNo] = useState(existingBOM?.bomNo ?? 'BOM-2024-001');
  const [productName, setProductName] = useState(existingBOM?.productName ?? '桥梁支座');
  const [productCode, setProductCode] = useState(existingBOM?.productCode ?? 'P-001');
  const [type, setType] = useState<BOMType>(existingBOM?.type ?? 'EBOM');
  const [version, setVersion] = useState(existingBOM?.version ?? 'V1.0');
  const [status, setStatus] = useState<BOMStatus>(existingBOM?.status ?? 'draft');
  const [effectiveDate, setEffectiveDate] = useState(existingBOM?.effectiveDate ?? '2024-01-01');
  const [remarks, setRemarks] = useState(existingBOM?.description ?? '');

  // ── P1-18 替代BOM ──
  const [isAlternate, setIsAlternate] = useState(existingBOM?.isAlternate ?? false);
  const [usageProbability, setUsageProbability] = useState(existingBOM?.usageProbability ?? 50);
  const [priority, setPriority] = useState(existingBOM?.priority ?? 1);

  // ── P1-19 联产品 ──
  const [coProducts, setCoProducts] = useState<CoProduct[]>(existingBOM?.coProducts ?? []);
  // ── P1-19 副产品 ──
  const [byProducts, setByProducts] = useState<ByProduct[]>(existingBOM?.byProducts ?? []);
  // ── P1-19 成本分摊方法 ──
  const [costSplitMethod, setCostSplitMethod] = useState<CostSplitMethod | ''>(existingBOM?.costSplitMethod ?? '');
  
  // BOM物料清单
  const [items, setItems] = useState<BOMItemRow[]>(existingBOM?.items?.map(item => ({
    ...item,
    id: item.id,
    materialSpec: item.materialSpec ?? '',
  })) ?? [
    {
      id: 'bom-item-001',
      materialId: 'M001',
      materialCode: 'M001',
      materialName: '钢板Q235B',
      materialSpec: '12mm',
      quantity: 10,
      unit: '张',
      scrapRate: 5,
      source: 'purchase',
      unitCost: 150,
      totalCost: 1500,
      isCritical: true,
    },
    {
      id: 'bom-item-002',
      materialId: 'M002',
      materialCode: 'M002',
      materialName: 'H型钢Q345B',
      materialSpec: 'H300×300×10×15',
      quantity: 20,
      unit: '米',
      scrapRate: 3,
      source: 'purchase',
      unitCost: 85,
      totalCost: 1700,
      isCritical: false,
    },
  ] as BOMItemRow[]);

  // 物料选项
  const materialOptions = materials.map(m => ({
    id: m.id,
    code: m.code,
    name: m.name,
    specification: m.specification || '',
    unit: m.unit,
    price: m.price,
  }));

  // ── 物料明细：Excel 式网格（多行复制粘贴 / 列显隐 / 物料号名称分列）──
  const computeBomRow = (row: any) => ({
    ...row,
    totalCost: (Number(row.quantity) || 0) * (Number(row.unitCost) || 0),
  });

  // 选择物料时按物料主数据单价带出单价
  const handleBomMaterialPricing = (_rowId: string, materialId: string): Record<string, any> => {
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) return {};
    return { unitCost: mat.price };
  };

  const bomColumns: GridColumn[] = [
    { key: 'materialCode', label: '物料编码', materialRole: 'code', fillFromMaterial: 'code', width: 140, fixed: true },
    { key: 'materialName', label: '物料名称', materialRole: 'name', fillFromMaterial: 'name', width: 200, fixed: true },
    { key: 'materialSpec', label: '规格', fillFromMaterial: 'specification', width: 140, hideable: true },
    { key: 'unit', label: '单位', fillFromMaterial: 'unit', width: 70, hideable: true },
    { key: 'quantity', label: '用量', type: 'number', align: 'right', width: 90, min: 0, step: 1 },
    { key: 'scrapRate', label: '废品率(%)', type: 'number', align: 'right', width: 100, min: 0, max: 100, step: 1, hideable: true },
    { key: 'source', label: '来源', type: 'select', width: 110, options: [
      { value: 'purchase', label: '外购' },
      { value: 'manufacture', label: '自制' },
      { value: 'phantom', label: '虚项' },
    ] },
    { key: 'unitCost', label: '单价(¥)', type: 'number', align: 'right', width: 110, min: 0, step: 0.01 },
    { key: 'totalCost', label: '小计(¥)', type: 'readonly', align: 'right', width: 110 },
    {
      key: 'isCritical', label: '关键', width: 70,
      renderCell: (row) => (
        <Chip
          label={row.isCritical ? '是' : '否'}
          size="small"
          color={row.isCritical ? 'error' : 'default'}
          onClick={() => setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, isCritical: !i.isCritical } : i)))}
          sx={{ cursor: 'pointer' }}
        />
      ),
    },
  ];

  const makeBomRow = () => ({
    id: '', materialId: '', materialCode: '', materialName: '', materialSpec: '',
    quantity: 1, unit: '件', scrapRate: 0, source: 'purchase', unitCost: 0, totalCost: 0, isCritical: false,
  });

  // ── P1-19 联产品操作 ──
  const handleAddCoProduct = () => {
    setCoProducts(prev => [...prev, { materialId: '', materialName: '', outputRatio: 1 }]);
  };
  const handleCoProductChange = (index: number, field: keyof CoProduct, value: string | number) => {
    setCoProducts(prev => prev.map((cp, i) => i === index ? { ...cp, [field]: value } : cp));
  };
  const handleCoProductMaterialSelect = (index: number, materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;
    setCoProducts(prev => prev.map((cp, i) =>
      i === index ? { ...cp, materialId: mat.id, materialName: mat.name } : cp
    ));
  };
  const handleDeleteCoProduct = (index: number) => {
    setCoProducts(prev => prev.filter((_, i) => i !== index));
  };

  // ── P1-19 副产品操作 ──
  const handleAddByProduct = () => {
    setByProducts(prev => [...prev, { materialId: '', materialName: '', outputQuantity: 1, unitPrice: 0 }]);
  };
  const handleByProductChange = (index: number, field: keyof ByProduct, value: string | number) => {
    setByProducts(prev => prev.map((bp, i) => i === index ? { ...bp, [field]: value } : bp));
  };
  const handleByProductMaterialSelect = (index: number, materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat) return;
    setByProducts(prev => prev.map((bp, i) =>
      i === index ? { ...bp, materialId: mat.id, materialName: mat.name } : bp
    ));
  };
  const handleDeleteByProduct = (index: number) => {
    setByProducts(prev => prev.filter((_, i) => i !== index));
  };

  // 计算总成本（物料成本 - 副产品价值）
  const materialCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  const byProductValue = byProducts.reduce((sum, bp) => sum + (bp.outputQuantity * (bp.unitPrice ?? 0)), 0);
  const totalCost = Math.max(0, materialCost - byProductValue);

  // 保存BOM（草稿）
  const handleSave = () => {
    // 验证
    if (!productName.trim()) {
      alert('请输入产品名称');
      return;
    }
    
    if (items.length === 0) {
      alert('请添加至少一项物料');
      return;
    }

    const bomData = {
      bomNo,
      name: productName,
      type,
      status: 'draft' as BOMStatus,
      productId: productCode,
      productCode,
      productName,
      version,
      effectiveDate,
      totalCost,
      currency: 'CNY',
      description: remarks,
      items,
      isAlternate,
      usageProbability: isAlternate ? usageProbability : undefined,
      priority: isAlternate ? priority : undefined,
      coProducts: coProducts.length > 0 ? coProducts : undefined,
      byProducts: byProducts.length > 0 ? byProducts : undefined,
      costSplitMethod: costSplitMethod || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: 'currentUser',
    };

    if (isEdit && existingBOM) {
      updateBOM(existingBOM.id, bomData);
    } else {
      addBOM({
        id: `bom-${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: 'currentUser',
        ...bomData,
      });
    }
    navigate('/bom');
  };

  // 发布BOM
  const handleRelease = () => {
    if (!productName.trim()) {
      alert('请输入产品名称');
      return;
    }
    
    if (items.length === 0) {
      alert('请添加至少一项物料');
      return;
    }

    const bomData = {
      bomNo,
      name: productName,
      type,
      status: 'released' as BOMStatus,
      productId: productCode,
      productCode,
      productName,
      version,
      effectiveDate,
      totalCost,
      currency: 'CNY',
      description: remarks,
      items,
      isAlternate,
      usageProbability: isAlternate ? usageProbability : undefined,
      priority: isAlternate ? priority : undefined,
      coProducts: coProducts.length > 0 ? coProducts : undefined,
      byProducts: byProducts.length > 0 ? byProducts : undefined,
      costSplitMethod: costSplitMethod || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: 'currentUser',
    };

    if (isEdit && existingBOM) {
      updateBOM(existingBOM.id, bomData);
    } else {
      addBOM({
        id: `bom-${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: 'currentUser',
        ...bomData,
      });
    }
    navigate('/bom');
  };

  const buildPrintRecord = (): Record<string, any> => ({
    bomNo,
    productName,
    productCode,
    type,
    version,
    status,
    effectiveDate,
    remarks,
    items: items.map((it) => ({
      materialCode: it.materialCode,
      materialName: it.materialName,
      specification: it.materialSpec,
      unit: it.unit,
      quantity: it.quantity,
      scrapRate: it.scrapRate,
      source: it.source,
      unitCost: it.unitCost,
      amount: it.totalCost,
      isCritical: it.isCritical,
    })),
  });

  return (
    <PageWrapper
      title={isEdit ? `编辑BOM - ${bomNo}` : '新建BOM'}
      actions={
        <Stack direction="row" spacing={1}>
          <FlowTracker 
            module="bom" 
            currentStatus={status === 'released' ? 'bom_release' : 'bom_design'} 
          />
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/bom')}>返回</Button>
          <PrintPreviewButton entity="bom" record={buildPrintRecord()} showBoth />
          <Button variant="outlined" startIcon={<Save />} onClick={handleSave}>保存草稿</Button>
          <Button variant="contained" startIcon={<Save />} onClick={handleRelease}>发布</Button>
        </Stack>
      }
    >
      {/* 基本信息 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>基本信息</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="BOM编号"
              value={bomNo}
              onChange={e => setBomNo(e.target.value)}
              disabled={!!isEdit}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="产品名称"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="产品编码"
              value={productCode}
              onChange={e => setProductCode(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="BOM类型"
              value={type}
              onChange={e => setType(e.target.value as BOMType)}
            >
              <MenuItem value="EBOM">EBOM（设计BOM）</MenuItem>
              <MenuItem value="MBOM">MBOM（制造BOM）</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="版本"
              value={version}
              onChange={e => setVersion(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="生效日期"
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* P1-18 替代BOM开关 */}
          <Grid item xs={12} sm={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={isAlternate}
                  onChange={(e) => setIsAlternate(e.target.checked)}
                  data-testid="bom-is-alt"
                />
              }
              label="替代BOM"
            />
          </Grid>

          {/* P1-18 替代BOM附加字段 */}
          {isAlternate && (
            <>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block' }}>
                  使用概率：{usageProbability}%
                </Typography>
                <Slider
                  value={usageProbability}
                  onChange={(_, val) => setUsageProbability(val as number)}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="优先级"
                  type="number"
                  value={priority}
                  onChange={e => setPriority(Number(e.target.value))}
                  helperText="越小越优先选"
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="备注"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* BOM物料清单 */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <MaterialLineItemsGrid
          columns={bomColumns}
          value={items}
          onChange={(rows) => setItems(rows as any)}
          materials={materialOptions}
          onMaterialChange={handleBomMaterialPricing}
          computeRow={computeBomRow}
          newRow={makeBomRow}
          storageKey="ssa-bom-material-columns"
          addLabel="添加物料"
          testIdPrefix="bom"
          footer={
            <Stack direction="row" justifyContent="space-between" alignItems="center" px={1}>
              <Typography variant="body2" color="text.secondary">
                共 {items.length} 项物料
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                BOM总成本：{formatCurrency(totalCost)}
              </Typography>
            </Stack>
          }
        />
      </Paper>

      {/* ── P1-19 联产品 Section ── */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>联产品</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            data-testid="bom-add-coproduct"
            onClick={handleAddCoProduct}
          >
            添加联产品
          </Button>
        </Stack>

        {coProducts.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>物料</TableCell>
                  <TableCell align="right">产出比率</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coProducts.map((cp, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={materialOptions}
                        getOptionLabel={(option) => `${option.name} (${option.code})`}
                        value={materialOptions.find(m => m.id === cp.materialId) || null}
                        onChange={(_, newValue) => {
                          if (newValue) handleCoProductMaterialSelect(index, newValue.id);
                        }}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="选择物料" sx={{ minWidth: 180 }} />
                        )}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={cp.outputRatio}
                        onChange={e => handleCoProductChange(index, 'outputRatio', Number(e.target.value))}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText="单位/单位主产品"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => handleDeleteCoProduct(index)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 成本分摊方法 */}
        <TextField
          select
          size="small"
          label="成本分摊方法"
          value={costSplitMethod}
          onChange={e => setCostSplitMethod(e.target.value as CostSplitMethod)}
          sx={{ mt: 2, minWidth: 200 }}
        >
          <MenuItem value="">无</MenuItem>
          <MenuItem value="weight">重量法</MenuItem>
          <MenuItem value="volume">体积法</MenuItem>
          <MenuItem value="market_value">市场价值法</MenuItem>
        </TextField>
      </Paper>

      {/* ── P1-19 副产品 Section ── */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle1" fontWeight={600}>副产品</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            data-testid="bom-add-byproduct"
            onClick={handleAddByProduct}
          >
            添加副产品
          </Button>
        </Stack>

        {byProducts.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>物料</TableCell>
                  <TableCell align="right">产出数量</TableCell>
                  <TableCell align="right">单价(¥)</TableCell>
                  <TableCell align="right">抵减价值(¥)</TableCell>
                  <TableCell width={60}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byProducts.map((bp, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={materialOptions}
                        getOptionLabel={(option) => `${option.name} (${option.code})`}
                        value={materialOptions.find(m => m.id === bp.materialId) || null}
                        onChange={(_, newValue) => {
                          if (newValue) handleByProductMaterialSelect(index, newValue.id);
                        }}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="选择物料" sx={{ minWidth: 180 }} />
                        )}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={bp.outputQuantity}
                        onChange={e => handleByProductChange(index, 'outputQuantity', Number(e.target.value))}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={bp.unitPrice ?? 0}
                        onChange={e => handleByProductChange(index, 'unitPrice', Number(e.target.value))}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        ¥{((bp.outputQuantity || 0) * (bp.unitPrice ?? 0)).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error" onClick={() => handleDeleteByProduct(index)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {byProducts.length > 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            主产品成本 = 总投入成本 {formatCurrency(materialCost)} - 副产品价值之和 {formatCurrency(byProductValue)}
            {' = '}{formatCurrency(totalCost)}
          </Alert>
        )}
      </Paper>
    </PageWrapper>
  );
};

export default BOMForm;
