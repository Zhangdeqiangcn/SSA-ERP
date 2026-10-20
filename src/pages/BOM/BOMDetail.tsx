import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Chip, Button, Stack, Snackbar, Alert, Tooltip,
} from '@mui/material';
import {
  ArrowBack, Edit, AccountTree,
  Delete, Share, Calculate,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { FlowTracker, ConfirmDialog, PrintPreviewButton, DataTable } from '@/components/common';
import { ObjectPage } from '@/components/layout';
import { BOMItem } from '@/types/bom';
import { MRPRecommendation } from '@/types/production';
import { useBOMStore } from '@/stores/bomStore';
import { useProductionStore } from '@/stores/productionStore';
import { useMaterialStore } from '@/stores/materialStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { computeBOMCost, type RollupResult, type CostLine } from '@/utils/bomCost';

type FlatCostLine = CostLine & { depth: number; id: string };
const flattenCostLines = (lines: CostLine[], depth = 0): FlatCostLine[] => {
  const result: FlatCostLine[] = [];
  for (const l of lines) {
    result.push({ ...l, depth, id: l.itemId });
    if (l.breakdown && l.breakdown.length > 0) {
      result.push(...flattenCostLines(l.breakdown, depth + 1));
    }
  }
  return result;
};

type FlatBOMItem = BOMItem & { depth: number };

/** 递归展开 BOM 物料树（含 children 嵌套），保留每项自身的 level 作为真实层级 */
const flattenBOMItems = (items: BOMItem[], baseDepth = 0): FlatBOMItem[] => {
  const out: FlatBOMItem[] = [];
  for (const it of items) {
    const lv = typeof it.level === 'number' ? it.level : baseDepth;
    out.push({ ...it, depth: lv });
    if (it.children && it.children.length > 0) {
      out.push(...flattenBOMItems(it.children, lv + 1));
    }
  }
  return out;
};

const BOMDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState(false);
  const [costResult, setCostResult] = useState<RollupResult | null>(null);

  const { bomList, deleteBOM, bomTreeData, setSelectedBOM } = useBOMStore();
  const { setMrpRecommendations } = useProductionStore();
  const { materials, substitutes } = useMaterialStore();
  const { purchaseOrders } = usePurchaseStore();
  // V2.84.0 C9：有替代料组的物料编码集合（只读提示，低风险）
  const subCodes = useMemo(() => new Set(substitutes.map((s) => s.materialCode)), [substitutes]);

  const bom = bomList.find((b) => b.id === id) || bomList[0];
  // 优先使用真实 BOM 物料清单；老 mock BOM 无 items 时回退到树形演示数据
  // 保留每项自身的 level 作为真实层级（不再强制 depth=0，避免层级信息丢失）
  const displayItems: FlatBOMItem[] = flattenBOMItems(
    ((bom.items && bom.items.length ? bom.items : bomTreeData) as BOMItem[])
  );

  // ── 物料来源标签（单表里每行显示来源 chip：自制 / 外购 / 虚项） ──
  const SOURCE_META: Record<string, { label: string; color: string; bg: string }> = {
    manufacture: { label: '自制件', color: '#10B981', bg: '#ECFDF5' },
    purchase:    { label: '外购件', color: '#3B82F6', bg: '#EFF6FF' },
    phantom:     { label: '虚项',   color: '#94A3B8', bg: '#F8FAFC' },
  };

  const totalMaterialCost = displayItems.reduce((sum, item) => sum + item.totalCost, 0);

  // 成本卷积：基于「当前选中的 BOM」递归计算总成本
  const handleComputeCost = () => {
    setSelectedBOM(bom.id);
    setCostResult(computeBOMCost(bom.id));
  };

  // 触发MRP运算：复用 MRP 页面口径，读取真实库存/安全库存/在途，避免建议量失真
  //   现有库存 = 物料主数据 currentStock
  //   安全库存 = 物料主数据 safetyStock（纳入净需求，安全库存不被消耗）
  //   在途量   = 采购订单（已订 − 已交），排除已收货/已关闭/已取消
  //   建议量   = max(0, 需求量 + 安全库存 − 现有库存 − 在途量)
  const handleMrpCalculation = () => {
    const TERMINAL_PO_STATUS = new Set(['received', 'closed', 'cancelled']);
    const onOrderByCode = new Map<string, number>();
    for (const po of purchaseOrders) {
      if (TERMINAL_PO_STATUS.has(po.status as string)) continue;
      for (const li of po.items || []) {
        const remaining = (li.orderedQuantity || 0) - (li.deliveredQuantity || 0);
        if (remaining > 0) {
          const key = li.materialCode || li.materialId;
          onOrderByCode.set(key, (onOrderByCode.get(key) || 0) + remaining);
        }
      }
    }

    const recommendations: MRPRecommendation[] = displayItems
      .filter((item) => item.source !== 'phantom')
      .map((item) => {
        const mat = materials.find((m) => m.code === item.materialCode || m.id === item.materialId);
        const currentStock = mat?.currentStock ?? 0;
        const safetyStock = mat?.safetyStock ?? 0;
        const onOrderQuantity = onOrderByCode.get(item.materialCode) ?? 0;
        const required = item.quantity;
        const net = Math.max(0, required + safetyStock - currentStock - onOrderQuantity);
        return {
          id: `mrp-${Date.now()}-${item.id}`,
          materialCode: item.materialCode,
          materialName: item.materialName,
          currentStock,
          safetyStock,
          requiredQuantity: required,
          onOrderQuantity,
          suggestedQuantity: net,
          unit: item.unit,
          suggestedDate: new Date().toISOString().split('T')[0],
          reason: `BOM ${bom.bomNo} MRP运算：建议 ${net} = 需求 ${required} + 安全库存 ${safetyStock} − 库存 ${currentStock} − 在途 ${onOrderQuantity}`,
          type: item.source === 'purchase' ? 'purchase' : 'manufacture',
          priority: item.isCritical ? 'urgent' : 'normal',
        };
      });
    setMrpRecommendations(recommendations);
    navigate('/production/mrp');
  };

  const handleShare = () => {
    const text = `BOM ${bom.bomNo}\n产品：${bom.productName}\n版本：${bom.version}\n类型：${bom.type}`;
    navigator.clipboard.writeText(text).then(() => setSnackbar(true));
  };

  const statusChips = (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Chip label={bom.type} size="small" sx={{ bgcolor: bom.type === 'EBOM' ? '#EFF6FF' : '#ECFDF5', color: bom.type === 'EBOM' ? '#3B82F6' : '#10B981', fontWeight: 600 }} />
      <Chip label={bom.status === 'released' ? '已发布' : '草稿'} size="small" sx={{ bgcolor: bom.status === 'released' ? '#ECFDF5' : '#FFF7ED', color: bom.status === 'released' ? '#10B981' : '#F59E0B', fontWeight: 500 }} />
      <Chip label={bom.version} size="small" sx={{ bgcolor: '#F8FAFC', color: '#475569' }} />
    </Box>
  );

  const itemsBlock = (
    <Paper sx={{ borderRadius: 3 }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(226,232,240,0.8)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <AccountTree sx={{ color: '#3B82F6' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>物料清单</Typography>
        <Chip label={`${displayItems.length} 种物料`} size="small" sx={{ bgcolor: '#EFF6FF', color: '#3B82F6' }} />
        <Chip
          label={`关键件 ${displayItems.filter((i) => i.isCritical).length}`}
          size="small"
          sx={{ bgcolor: '#FEF2F2', color: '#EF4444', fontWeight: 600 }}
        />
        <Box sx={{ ml: 'auto' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            物料总成本：<strong style={{ color: '#1E293B' }}>¥{totalMaterialCost.toFixed(2)}</strong>
          </Typography>
        </Box>
      </Box>
      <DataTable
        data={displayItems}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        onView={(row) => navigate(`/material/${(row as FlatBOMItem).materialId || (row as FlatBOMItem).id}`)}
        onEdit={(row) => navigate(`/material/${(row as FlatBOMItem).materialId || (row as FlatBOMItem).id}/edit`)}
        columns={[
          {
            id: 'level', header: '层级',
            accessorFn: (row) => (row as FlatBOMItem).level ?? (row as FlatBOMItem).depth ?? 0,
            cell: ({ row }) => {
              const item = row.original as FlatBOMItem;
              const lv = item.level ?? item.depth ?? 0;
              const hasChildren = (item.children && item.children.length > 0) || !!item.childProductCode;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: lv * 1.5 }}>
                  {hasChildren && <AccountTree sx={{ fontSize: 15, color: '#8B5CF6' }} />}
                  <Chip
                    label={lv === 0 ? '顶层' : `第${lv}层`}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.7rem', fontWeight: 600,
                      bgcolor: lv === 0 ? '#EDE9FE' : '#F1F5F9',
                      color: lv === 0 ? '#7C3AED' : '#475569',
                    }}
                  />
                </Box>
              );
            },
          },
          {
            id: 'materialCode', header: '物料编码',
            cell: ({ row }) => {
              const isCritical = row.original.isCritical;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isCritical && (
                    <Chip label="关键" size="small" sx={{
                      height: 18, fontSize: '0.65rem', bgcolor: '#FEF2F2', color: '#EF4444',
                    }} />
                  )}
                  <Typography variant="body2" sx={{
                    fontFamily: 'monospace',
                    color: isCritical ? '#EF4444' : '#475569',
                    fontWeight: isCritical ? 700 : 500,
                  }}>
                    {row.original.materialCode}
                  </Typography>
                </Box>
              );
            },
          },
          {
            id: 'materialName', header: '物料名称', accessorKey: 'materialName',
            cell: ({ row }) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: row.original.isCritical ? 600 : 400 }}>{row.original.materialName}</Typography>
                {subCodes.has(row.original.materialCode) && (
                  <Tooltip title="该物料已配置替代料组，可在物料详情查看优先级">
                    <Chip label="可替代" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#ECFDF5', color: '#059669' }} />
                  </Tooltip>
                )}
              </Box>
            ),
          },
          {
            id: 'materialSpec', header: '规格', accessorKey: 'materialSpec',
            cell: ({ row }) => <Typography variant="caption" sx={{ color: '#94A3B8' }}>{row.original.materialSpec || '-'}</Typography>,
          },
          {
            id: 'source', header: '来源',
            accessorFn: (row) => (row as FlatBOMItem).source,
            cell: ({ row }) => {
              const s = (row.original as FlatBOMItem).source;
              const meta = SOURCE_META[s] || SOURCE_META.purchase;
              return (
                <Chip
                  size="small"
                  label={meta.label}
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: meta.bg, color: meta.color }}
                />
              );
            },
          },
          {
            id: 'quantity', header: '用量',
            cell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.original.quantity}</Typography>,
          },
          {
            id: 'unit', header: '单位', accessorKey: 'unit',
            cell: ({ row }) => <Typography variant="body2">{row.original.unit}</Typography>,
          },
          {
            id: 'scrapRate', header: '废品率',
            cell: ({ row }) => (
              <Typography variant="body2" sx={{ color: row.original.scrapRate > 5 ? '#F59E0B' : '#64748B' }}>
                {row.original.scrapRate}%
              </Typography>
            ),
          },
          {
            id: 'unitCost', header: '单价 (¥)',
            cell: ({ row }) => <Typography variant="body2">¥{row.original.unitCost.toFixed(2)}</Typography>,
          },
          {
            id: 'totalCost', header: '小计 (¥)',
            cell: ({ row }) => (
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                ¥{row.original.totalCost.toFixed(2)}
              </Typography>
            ),
          },
          {
            id: 'stock', header: '当前库存',
            cell: ({ row }) => {
              const m = materials.find((x) => x.code === row.original.materialCode || x.id === row.original.materialId);
              return m ? (
                <Typography variant="body2" sx={{ fontWeight: 500, color: (m.currentStock ?? 0) < row.original.quantity ? '#EF4444' : '#10B981' }}>
                  {(m.currentStock ?? 0).toLocaleString()} {m.unit}
                </Typography>
              ) : <Typography variant="caption" sx={{ color: '#94A3B8' }}>-</Typography>;
            },
          },
        ]}
      />
      <Box sx={{ p: 2, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>合计</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#3B82F6' }}>¥{totalMaterialCost.toFixed(2)}</Typography>
      </Box>
    </Paper>
  );

  const costBlock = costResult ? (
    <Paper sx={{ borderRadius: 3 }}>
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(226,232,240,0.8)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Calculate sx={{ color: '#10B981' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>成本卷积结果</Typography>
        <Chip
          label={costResult.bomNo}
          size="small"
          sx={{ bgcolor: '#ECFDF5', color: '#10B981' }}
        />
        <Box sx={{ ml: 'auto' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            物料成本 <strong style={{ color: '#1E293B' }}>¥{costResult.materialCost.toFixed(2)}</strong>
            {' · '}
            人工/工序 <strong style={{ color: '#1E293B' }}>¥{costResult.laborCost.toFixed(2)}</strong>
          </Typography>
        </Box>
      </Box>
      <DataTable
        data={flattenCostLines(costResult.lines)}
        enablePagination={false}
        enableRowSelection={false}
        sapStyle
        columns={[
          {
            id: 'code', header: '编码',
            cell: ({ row }) => (
              <Typography variant="body2" sx={{ pl: 2 + row.original.depth * 3, fontFamily: 'monospace',
                color: row.original.isChildAssembly ? '#8B5CF6' : row.original.depth === 0 ? '#3B82F6' : '#475569',
                fontWeight: row.original.depth === 0 ? 600 : 400 }}>
                {row.original.isChildAssembly ? `⮑ ${row.original.code} (子装配)` : row.original.code}
              </Typography>
            ),
          },
          {
            id: 'name', header: '名称', accessorKey: 'name',
            cell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: row.original.depth === 0 ? 500 : 400 }}>{row.original.name}</Typography>,
          },
          {
            id: 'qtyUnit', header: '用量',
            cell: ({ row }) => <Typography variant="body2">{row.original.qty}{row.original.unit}</Typography>,
          },
          {
            id: 'unitCost', header: '单价 (¥)',
            cell: ({ row }) => <Typography variant="body2">¥{row.original.unitCost.toFixed(2)}</Typography>,
          },
          {
            id: 'materialCost', header: '物料成本 (¥)',
            cell: ({ row }) => <Typography variant="body2">¥{row.original.materialCost.toFixed(2)}</Typography>,
          },
          {
            id: 'laborCost', header: '人工/工序 (¥)',
            cell: ({ row }) => <Typography variant="body2">{row.original.laborCost ? `¥${row.original.laborCost.toFixed(2)}` : '-'}</Typography>,
          },
          {
            id: 'extendedCost', header: '小计 (¥)',
            cell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>¥{row.original.extendedCost.toFixed(2)}</Typography>,
          },
        ]}
      />
      <Box sx={{ p: 2, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>合计</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }} data-testid="bom-total-cost">
          ¥{costResult.totalCost.toFixed(2)}
        </Typography>
      </Box>
      {costResult.totalCost === 0 && (
        <Alert severity="info" sx={{ m: 2 }}>
          该 BOM 没有可卷积的物料或子装配项。
        </Alert>
      )}
    </Paper>
  ) : null;

  const sections = [
    { id: 'items', title: '物料清单', content: itemsBlock },
    ...(costBlock ? [{ id: 'cost', title: '成本卷积结果', content: costBlock }] : []),
  ];

  return (
    <>
      <ObjectPage
        title={bom.bomNo}
        subtitle={bom.productName}
        breadcrumbs={[{ label: 'BOM 列表', path: '/bom/list' }]}
        status={statusChips}
        headerFields={[
          { label: '产品编码', value: bom.productCode },
          { label: '生效日期', value: bom.effectiveDate },
          { label: '物料成本', value: `¥${totalMaterialCost.toFixed(2)}` },
          { label: '发布人', value: bom.approvedBy || '-' },
        ]}
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FlowTracker module="bom" currentStatus={bom.status === 'released' ? 'bom_release' : 'bom_design'} />
            <Button variant="outlined" startIcon={<ArrowBack />} size="small" onClick={() => navigate(-1)}>返回</Button>
            <Button variant="outlined" startIcon={<Edit />} size="small" onClick={() => navigate(`/bom/${id}/edit`)}>编辑</Button>
            <Button variant="outlined" color="error" startIcon={<Delete />} size="small" onClick={() => setDeleteDialog(true)}>删除</Button>
            <Button variant="outlined" startIcon={<Share />} size="small" onClick={handleShare}>分享</Button>
            <Button variant="contained" size="small" onClick={handleMrpCalculation}>触发MRP运算</Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              data-testid="bom-cost"
              startIcon={<Calculate />}
              onClick={handleComputeCost}
            >
              计算成本
            </Button>
            <PrintPreviewButton
              entity="bom"
              record={{
                ...bom,
                items: (bom.items || []).map((i: any) => ({
                  materialCode: i.materialCode, materialName: i.materialName, specification: i.materialSpec,
                  unit: i.unit, quantity: i.quantity, unitPrice: i.unitCost, amount: i.totalCost,
                })),
              }}
              showBoth
            />
          </Stack>
        }
        sections={sections}
      />

      <ConfirmDialog
        open={deleteDialog}
        title="确认删除"
        content={`确定删除BOM"${bom.bomNo}"吗？此操作不可撤销。`}
        onConfirm={() => { deleteBOM(bom.id); setDeleteDialog(false); }}
        onCancel={() => setDeleteDialog(false)}
        confirmText="确认删除"
        confirmColor="error"
      />
      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        message="分享内容已复制到剪贴板"
      />
    </>
  );
};

export default BOMDetail;
