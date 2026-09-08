import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { Share, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { PageWrapper, ObjectPage } from '@/components/layout';
import { DetailSection, OperationTimeline, StatusBadge, FileUpload, ConfirmDialog, DataTable, DetailActions } from '@/components/common';
import ResponsiblePersons from '@/components/common/ResponsiblePersons';
import { useMaterialStore } from '@/stores';
import { useSettingsStore } from '@/stores/settingsStore';
import { useBOMStore } from '@/stores/bomStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useQualityStore } from '@/stores/qualityStore';
import { MaterialRatingConfig, MaterialRatingWeights } from '@/stores/settingsStore';
import { Material, MaterialSubstitute } from '@/types/material';
import { formatDate, formatCurrency } from '@/utils/format';

const WEIGHT_LABELS: Record<keyof MaterialRatingWeights, string> = {
  bomUsage: '更多BOM使用',
  purchaseFreq: '采购频次高',
  shortLead: '交货期短',
  lowMoq: '起订量低',
  goodQuality: '质量好',
};

interface RatingInput {
  bomCount: number;
  purchaseCount: number;
  qualityPassRate: number | null;
}

interface IndicatorResult {
  key: keyof MaterialRatingWeights;
  label: string;
  value: number | null;
  available: boolean;
}

interface RatingResult {
  score: number | null;
  grade: 'A' | 'B' | 'C' | 'D' | '数据不足';
  indicators: IndicatorResult[];
}

function leadScore(lt: number): number {
  if (lt <= 7) return 100;
  if (lt <= 15) return 85;
  if (lt <= 30) return 65;
  if (lt <= 60) return 40;
  return 20;
}

function moqScore(moq: number): number {
  if (moq <= 10) return 100;
  if (moq <= 50) return 85;
  if (moq <= 200) return 65;
  if (moq <= 1000) return 40;
  return 20;
}

function computeRating(
  material: Material,
  input: RatingInput,
  config: MaterialRatingConfig
): RatingResult {
  const shortLeadVal = material.leadTime === undefined ? null : leadScore(material.leadTime);
  const lowMoqVal = material.moq === undefined ? null : moqScore(material.moq);

  const indicators: IndicatorResult[] = [
    {
      key: 'bomUsage',
      label: WEIGHT_LABELS.bomUsage,
      value: input.bomCount > 0 ? Math.min(input.bomCount * 25, 100) : 0,
      available: true,
    },
    {
      key: 'purchaseFreq',
      label: WEIGHT_LABELS.purchaseFreq,
      value: input.purchaseCount > 0 ? Math.min(input.purchaseCount * 10, 100) : 0,
      available: true,
    },
    { key: 'shortLead', label: WEIGHT_LABELS.shortLead, value: shortLeadVal, available: shortLeadVal !== null },
    { key: 'lowMoq', label: WEIGHT_LABELS.lowMoq, value: lowMoqVal, available: lowMoqVal !== null },
    {
      key: 'goodQuality',
      label: WEIGHT_LABELS.goodQuality,
      value: input.qualityPassRate,
      available: input.qualityPassRate !== null,
    },
  ];

  const available = indicators.filter((i) => i.available);
  if (available.length === 0) {
    return { score: null, grade: '数据不足', indicators };
  }

  const weightSum = available.reduce((s, i) => s + config.weights[i.key], 0);
  const sum = available.reduce((s, i) => s + (i.value ?? 0) * config.weights[i.key], 0);
  const score = weightSum > 0 ? Math.round(sum / weightSum) : 0;

  let grade: 'A' | 'B' | 'C' | 'D';
  if (score >= config.thresholds.A) grade = 'A';
  else if (score >= config.thresholds.B) grade = 'B';
  else if (score >= config.thresholds.C) grade = 'C';
  else grade = 'D';

  return { score, grade, indicators };
}

const GRADE_COLOR: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'default'> = {
  A: 'success',
  B: 'primary',
  C: 'warning',
  D: 'error',
  数据不足: 'default',
};

const MaterialDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const { materials, deleteMaterial, categories, substitutes, addSubstitute, updateSubstitute, removeSubstitute } = useMaterialStore();
  const materialRatingConfig = useSettingsStore((s) => s.materialRatingConfig);
  const material = materials.find(m => m.id === id);

  if (!material) {
    return (
      <PageWrapper title="物料详情">
        <Box>物料不存在</Box>
      </PageWrapper>
    );
  }

  const bomState = useBOMStore.getState();
  const purchaseState = usePurchaseStore.getState();
  const qualityState = useQualityStore.getState();

  const bomCount = bomState.bomList.filter((b) =>
    (b.items ?? []).some((it) => it.materialId === material.id)
  ).length;
  const purchaseCount = [...purchaseState.purchaseRequests, ...purchaseState.purchaseOrders].reduce(
    (acc, doc) => acc + (doc.items ?? []).filter((it) => it.materialId === material.id).length,
    0
  );
  const matInspections = qualityState.inspectionTasks.filter((t) => t.materialId === material.id);
  const qualityPassRate =
    matInspections.length === 0
      ? null
      : Math.round(
          (matInspections.filter((t) => t.status === 'passed').length / matInspections.length) * 100
        );

  const rating = computeRating(
    material,
    { bomCount, purchaseCount, qualityPassRate },
    materialRatingConfig
  );

  const purchasingFields = [
    { label: '采购组', value: material.purchasingGroup ?? '—' },
    { label: '订单单位', value: material.orderUnit ?? '—' },
    { label: '采购值键', value: material.purchasingValueKey ?? '—' },
    { label: '收货处理天数', value: material.grProcessingDays ?? '—' },
    { label: '采购提前期(天)', value: material.leadTime ?? '—' },
    { label: '最小订单量(MOQ)', value: material.moq ?? '—' },
    { label: '最小包装量(MPQ)', value: material.mpq ?? '—' },
    { label: '采购单位', value: material.purchaseUnit ?? '—' },
    { label: '单位换算系数', value: material.unitConversion ?? '—' },
    { label: '默认供应商', value: material.defaultVendorName || material.defaultVendorId || '—' },
  ];

  const mrpFields = [
    { label: 'MRP 类型', value: material.mrpType ?? '—' },
    { label: 'MRP 控制者', value: material.mrpController ?? '—' },
    { label: '批量大小', value: material.lotSize ?? '—' },
    { label: '再订货点', value: material.reorderPoint ?? '—' },
    { label: '计划交货天数', value: material.plannedDeliveryDays ?? '—' },
  ];

  const salesFields = [
    { label: '税分类', value: material.taxClassification ?? '—' },
    { label: '交货单位', value: material.deliveryUnit ?? '—' },
    { label: '最小订单量', value: material.minOrderQty ?? '—' },
    { label: '最小交货量', value: material.minDeliveryQty ?? '—' },
    { label: '科目分配组', value: material.accountAssignmentGroup ?? '—' },
  ];

  const basicFields = [
    { label: '物料编码', value: material.code },
    { label: '物料名称', value: material.name },
    { label: '物料分类', value: material.categoryName },
    { label: '规格型号', value: material.specification },
    { label: '单位', value: material.unit },
    { label: '状态', value: <StatusBadge status={material.status} /> },
    { label: '安全库存', value: material.safetyStock },
    { label: '最小库存', value: material.minStock },
    { label: '最大库存', value: material.maxStock },
    { label: '当前库存', value: `${material.currentStock} ${material.unit}` },
    { label: '单价', value: formatCurrency(material.price) },
    { label: '创建时间', value: formatDate(material.createdAt) },
    { label: '创建人', value: material.createdBy },
  ];

  const operationLogs: Array<{
    id: string;
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'info';
    operator: string;
    time: string;
    description: string;
  }> = [
    { id: '1', action: 'create', operator: material.createdBy, time: material.createdAt, description: '创建物料' },
    { id: '2', action: 'update', operator: 'admin', time: material.updatedAt, description: '更新物料信息' },
  ];

  const handleShare = () => {
    const text = `物料 ${material.code} - ${material.name}\n规格：${material.specification}\n单价：${formatCurrency(material.price)}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  // 多单位绑定：基本单位 ↔ 采购单位 换算
  const unitConversionBlock =
    material.purchaseUnit && material.purchaseUnit !== material.unit ? (
      <Box
        data-testid="unit-conversion"
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 1,
          px: 2, py: 1, borderRadius: 2, bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
        }}
      >
        <Typography variant="body1" fontWeight={600}>
          1 {material.purchaseUnit} = {material.unitConversion ?? 1} {material.unit}
        </Typography>
        <Chip size="small" color="info" variant="outlined" label="采购单位绑定" />
      </Box>
    ) : null;

  // 技术参数表
  const parametersBlock =
    material.parameters && material.parameters.length > 0 ? (
      <DataTable
        data={material.parameters.map((param, index) => ({ ...param, id: param.key || String(index) }))}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        columns={[
          { id: 'key', header: '参数名称', accessorKey: 'key' },
          { id: 'value', header: '参数值', accessorKey: 'value' },
          { id: 'unit', header: '单位', accessorKey: 'unit', cell: ({ row }) => row.original.unit || '-' },
        ]}
      />
    ) : null;

  const ratingPaper = (
    <Paper variant="outlined" sx={{ p: 3 }} data-testid="material-rating">
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>物料自动评级</Typography>
        {materialRatingConfig.enabled ? (
          <Chip
            label={rating.grade}
            color={GRADE_COLOR[rating.grade]}
            sx={{ fontSize: '1.25rem', height: 40, minWidth: 48, fontWeight: 700 }}
          />
        ) : null}
      </Stack>

      {!materialRatingConfig.enabled ? (
        <Alert severity="info">自动评级已关闭</Alert>
      ) : rating.grade === '数据不足' ? (
        <Alert severity="warning">数据不足，无法计算评级（请补充 BOM / 采购 / 质量数据）</Alert>
      ) : (
        <Box>
          <Stack direction="row" spacing={2} alignItems="baseline" sx={{ mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>{rating.score}</Typography>
            <Typography variant="body2" color="text.secondary">/ 100 综合得分</Typography>
          </Stack>
          <Stack spacing={1.5}>
            {rating.indicators.map((ind) => (
              <Box key={ind.key}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2">{ind.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ind.available ? `${ind.value}` : '数据不足'}
                  </Typography>
                </Stack>
                {ind.available ? (
                  <LinearProgress variant="determinate" value={ind.value ?? 0} sx={{ height: 8, borderRadius: 1 }} />
                ) : (
                  <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 1, opacity: 0.3 }} />
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );

  const responsibleBlock = (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <ResponsiblePersons categoryIds={[material.categoryId]} />
    </Paper>
  );

  // V2.84.0 C9 物料替代料组 + 优先级：该物料的替代料按优先级升序展示，支持增删改（乐观更新 + 即发即弃写回 D1）
  const mySubs = substitutes
    .filter((s) => s.materialCode === material.code)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const [subDialog, setSubDialog] = useState<{ open: boolean; editing?: MaterialSubstitute }>({ open: false });
  const [subForm, setSubForm] = useState<Partial<MaterialSubstitute>>({});

  const openAddSub = () => {
    setSubForm({
      materialCode: material.code, materialName: material.name,
      priority: mySubs.length + 1, substituteType: 'full', conversionRatio: 1,
    });
    setSubDialog({ open: true });
  };
  const openEditSub = (s: MaterialSubstitute) => {
    setSubForm(s);
    setSubDialog({ open: true, editing: s });
  };
  const saveSub = () => {
    if (!subForm.substituteCode) return;
    const payload = { ...subForm, materialCode: material.code, materialName: material.name };
    if (subDialog.editing && subDialog.editing.id) updateSubstitute(subDialog.editing.id, payload);
    else addSubstitute(payload as Omit<MaterialSubstitute, 'id'>);
    setSubDialog({ open: false });
  };

  const substituteBlock = (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>替代料组（按优先级推荐）</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAddSub}>新增替代料</Button>
      </Stack>
      {mySubs.length === 0 ? (
        <Alert severity="info">该物料暂无替代料。可新增完全/部分替代料并按优先级排序，缺料时按序推荐。</Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>优先级</TableCell>
                <TableCell>替代料编码</TableCell>
                <TableCell>替代料名称</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>替换比例</TableCell>
                <TableCell>生效期</TableCell>
                <TableCell>原因</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mySubs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.priority}</TableCell>
                  <TableCell>{s.substituteCode}</TableCell>
                  <TableCell>{s.substituteName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={s.substituteType === 'full' ? '完全替代' : '部分替代'}
                      color={s.substituteType === 'full' ? 'success' : 'warning'} />
                  </TableCell>
                  <TableCell>{s.substituteType === 'partial' ? (s.conversionRatio ?? 1) : '—'}</TableCell>
                  <TableCell>{[s.effectiveFrom, s.effectiveTo].filter(Boolean).join(' ~ ') || '—'}</TableCell>
                  <TableCell>{s.reason || '—'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="编辑">
                      <IconButton size="small" onClick={() => openEditSub(s)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton size="small" color="error" onClick={() => removeSubstitute(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={subDialog.open} onClose={() => setSubDialog({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle>{subDialog.editing ? '编辑替代料' : '新增替代料'}</DialogTitle>
        <DialogContent>
          <TextField select fullWidth margin="dense" label="替代料" value={subForm.substituteCode || ''}
            onChange={(e) => { const m = materials.find((x) => x.code === e.target.value); setSubForm({ ...subForm, substituteCode: e.target.value, substituteName: m?.name }); }}>
            {materials.filter((m) => m.code !== material.code).map((m) => (
              <MenuItem key={m.id} value={m.code}>{m.code} - {m.name}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth margin="dense" type="number" label="优先级" value={subForm.priority ?? 1}
            onChange={(e) => setSubForm({ ...subForm, priority: Number(e.target.value) })} />
          <TextField select fullWidth margin="dense" label="替代类型" value={subForm.substituteType || 'full'}
            onChange={(e) => setSubForm({ ...subForm, substituteType: e.target.value as MaterialSubstitute['substituteType'] })}>
            <MenuItem value="full">完全替代</MenuItem>
            <MenuItem value="partial">部分替代</MenuItem>
          </TextField>
          {subForm.substituteType === 'partial' && (
            <TextField fullWidth margin="dense" type="number" label="替换比例（1 主 = ? 替代）" value={subForm.conversionRatio ?? 1}
              onChange={(e) => setSubForm({ ...subForm, conversionRatio: Number(e.target.value) })} />
          )}
          <TextField fullWidth margin="dense" type="date" label="生效起始" value={subForm.effectiveFrom || ''}
            onChange={(e) => setSubForm({ ...subForm, effectiveFrom: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" type="date" label="生效截止" value={subForm.effectiveTo || ''}
            onChange={(e) => setSubForm({ ...subForm, effectiveTo: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth margin="dense" label="替代原因" value={subForm.reason || ''}
            onChange={(e) => setSubForm({ ...subForm, reason: e.target.value })} />
          <TextField fullWidth margin="dense" label="备注" value={subForm.remarks || ''}
            onChange={(e) => setSubForm({ ...subForm, remarks: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubDialog({ open: false })}>取消</Button>
          <Button variant="contained" onClick={saveSub}>保存</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );

  const sections = [
    { id: 'rating', title: '物料评级', content: ratingPaper },
    { id: 'basic', title: '基本信息', content: <DetailSection fields={basicFields} columns={2} /> },
    { id: 'responsible', title: '物料责任人', content: responsibleBlock },
    { id: 'purchasing', title: '采购视图', content: <DetailSection fields={purchasingFields} columns={2} /> },
    { id: 'mrp', title: 'MRP 视图', content: <DetailSection fields={mrpFields} columns={2} /> },
    { id: 'sales', title: '销售视图', content: <DetailSection fields={salesFields} columns={2} /> },
    ...(unitConversionBlock
      ? [{ id: 'unit', title: '单位换算', content: unitConversionBlock }]
      : []),
    ...(parametersBlock
      ? [{ id: 'params', title: '技术参数', content: parametersBlock }]
      : []),
    { id: 'attachments', title: '附件', content: <FileUpload multiple /> },
    { id: 'substitutes', title: '替代料组', content: substituteBlock },
    { id: 'logs', title: '操作日志', content: <OperationTimeline title="操作日志" events={operationLogs} /> },
  ];

  return (
    <ObjectPage
      title={material.code}
      subtitle={material.name}
      breadcrumbs={[{ label: '物料列表', path: '/material/list' }]}
      status={<StatusBadge status={material.status} />}
      headerFields={[
        { label: '分类', value: material.categoryName },
        { label: '单位', value: material.unit },
        { label: '当前库存', value: `${material.currentStock} ${material.unit}` },
        { label: '单价', value: formatCurrency(material.price) },
        { label: '安全库存', value: material.safetyStock },
      ]}
      actions={
        <DetailActions
          entity="material"
          record={material}
          onBack={() => navigate('/material/list')}
          onEdit={() => navigate(`/material/${id}/edit`)}
          onDelete={() => setDeleteDialog(true)}
          extra={[
            { key: 'share', label: '分享', icon: <Share />, onClick: handleShare },
          ]}
        />
      }
      sections={sections}
    />
  );
};

export default MaterialDetail;
