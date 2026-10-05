import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, LinearProgress, Chip, Divider,
} from '@mui/material';
import { Calculate, Refresh, FileDownload } from '@mui/icons-material';
import { ResponsiveChartContainer, PiePlot } from '@mui/x-charts';
import Alert from '@mui/material/Alert';
import { useBOMStore } from '@/stores/bomStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore } from '@/stores/productionOperationStore';
import { calcLaborCost, calcMaterialCost, calcOverheadCost } from '@/utils/costBasis';
import { roundAmount } from '@/utils/cost';
import { Material } from '@/types';

const COST_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

/** 差异分析的"实际成本"来源：优先 BOM 子件维护的实际单价（同口径、可维护），其次物料移动均价（单位一致时） */
type ActualSource = 'bomActual' | 'movingAvg' | 'none';
interface ActualResult {
  value: number | undefined;
  source: ActualSource;
}

/**
 * 解析某 BOM 子件的"实际单价"（用于标准成本差异分析）。
 * 优先级：
 *  ① BOM 子件自身维护的 actualUnitCost —— 与标准单价（unitCost）同单位同口径，
 *     由 BOM 维护者填入，诚实不伪造，最可靠（避免强依赖物料主数据对齐）。
 *  ② 物料主数据的 movingAvgPrice —— 预埋真实来源，仅当 materialId 能正确关联同口径物料（单位一致）时采用。
 *     （历史数据里 BOM 子件与物料主数据存在口径错位，故仅作兜底，不强行换算。）
 *  ③ 两者皆无 → 返回 undefined，界面如实显示"—"，不编造差异率。
 */
function resolveActual(item: { materialId?: string; unit: string; unitCost: number; actualUnitCost?: number }, matMap: Map<string, Material>): ActualResult {
  if (typeof item.actualUnitCost === 'number') {
    return { value: item.actualUnitCost, source: 'bomActual' };
  }
  const mat = item.materialId ? matMap.get(item.materialId) : undefined;
  if (mat && typeof mat.movingAvgPrice === 'number' && mat.movingAvgPrice > 0 && mat.unit === item.unit) {
    return { value: mat.movingAvgPrice, source: 'movingAvg' };
  }
  return { value: undefined, source: 'none' };
}

/**
 * 把（可能嵌套的）BOM 子件树递归展平为最底层物料行。
 * - D1 返回的 items 已是平铺数组（按 level/parentItemId），递归时直接收集；
 * - mock 回填前的 items 可能带 children 嵌套，递归展开；
 * - 排除"子装配占位行"（source=manufacture 且 unitCost=0、totalCost=0）：其成本在子件中，避免重复计算。
 */
function collectLeaves(items: any[]): any[] {
  const out: any[] = [];
  for (const it of items || []) {
    if (it?.children && it.children.length) {
      out.push(...collectLeaves(it.children));
    } else if (it?.source === 'manufacture' && (it?.unitCost ?? 0) === 0 && (it?.totalCost ?? 0) === 0) {
      continue; // 子装配占位：成本已计入其子件，跳过
    } else {
      out.push(it);
    }
  }
  return out;
}

const CostRollup: React.FC = () => {
  const { bomList } = useBOMStore();
  const { materials } = useMaterialStore();
  const [selectedBOM, setSelectedBOM] = useState(bomList[0]);
  const [calculated, setCalculated] = useState(true);

  // 选中 BOM 跟随 D1 数据（load 完成后 bomList 被真实数据覆盖，按 id 重新定位）
  const activeBOM = bomList.find((b) => b.id === (selectedBOM?.id ?? bomList[0]?.id)) || bomList[0] || selectedBOM;

  const matMap = new Map<string, Material>(materials.map((m) => [m.id, m]));
  // ★ V3.47.0 3-04：人工/工序成本改由「工序工时 × 费率」算出（对标金蝶/用友/SAP），
  //   费率来自 production_rates（已落库、按生效日取，见 V3.46.0 第2批③）。
  const { laborRate, machineRate } = useProductionOperationStore();
  const { processRoutes } = useProductionStore();
  // 工艺路线：BOM 本身不挂路线，按「产品编码」匹配（同 resolveBOM 的思路）
  const route = useMemo(
    () => processRoutes.find((r: any) => String(r?.productCode || '') === String(activeBOM?.productCode || '')),
    [processRoutes, activeBOM]
  );

  // ── 接通 D1：直接取真实 BOM 子件（递归摊平到最底层），不再用全局 mock bomTreeData ──
  const bomItems = useMemo(() => collectLeaves((activeBOM as any)?.items || []), [activeBOM]);

  // 材料成本：统一口径（含废品率放大，只放大一次；原先用 totalCost 逐行相加，
  //   而 totalCost 是否含废品率取决于各行怎么填，口径不稳）
  const materialCost = calcMaterialCost(bomItems as any);
  // 人工/工序成本：工时 × 费率。批次按 BOM 明细合计数量取（成本卷积是单件视角，
  //   但费率是元/小时，必须给一个批量才能把准备时间摊掉，故用合计数量作批量）
  const batchQty = bomItems.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const lc = calcLaborCost({
    operations: (route as any)?.operations,
    plannedQty: batchQty,
    rates: { laborRate, machineRate },
  });
  const laborCost = lc.laborCost;
  const processCost = lc.processCost;
  // 制造费用：按工时分摊（原先按材料金额 × 12% —— 材料涨价会让制造费用跟着涨，
  //   这在会计上是错误的联动）。无工时数据时按 0 计并显式标注。
  const overheadCost = calcOverheadCost(lc.totalHours, machineRate);
  const totalCost = roundAmount(materialCost + laborCost + overheadCost);

  // ── 标准成本差异分析（决策 E · V3.32.0 接通 D1 后真实化）──
  const varianceRows = bomItems.map((i) => {
    const actual = resolveActual(i, matMap);
    const stdQty = i.quantity * (1 + (i.scrapRate || 0) / 100);
    const stdTotal = (i.unitCost || 0) * stdQty;
    const actTotal = actual.value !== undefined ? actual.value * stdQty : undefined;
    const diffTotal = actTotal !== undefined ? actTotal - stdTotal : undefined;
    const diffPct = actual.value !== undefined ? actual.value / (i.unitCost || 1) - 1 : undefined;
    return { ...i, actual, stdTotal, actTotal, diffTotal, diffPct };
  });
  const actualTotalCost = varianceRows.reduce((s, r) => s + (r.actTotal || 0), 0);
  const varianceTotal = actualTotalCost - materialCost;
  const variancePct = materialCost > 0 ? varianceTotal / materialCost : 0;
  const hasActual = varianceRows.some((r) => r.actual.value !== undefined);

  const _pct = (v: number) => (totalCost > 0 ? (v / totalCost) * 100 : 0);
  const breakdown = [
    { label: '原材料成本', value: materialCost, percentage: _pct(materialCost), color: '#3B82F6' },
    { label: `人工成本（${laborRate} 元/工时）`, value: laborCost, percentage: _pct(laborCost), color: '#10B981' },
    { label: '工序成本', value: processCost, percentage: _pct(processCost), color: '#8B5CF6' },
    { label: '制造费用', value: overheadCost, percentage: _pct(overheadCost), color: '#F59E0B' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B' }}>成本卷积计算</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} size="small" onClick={() => setCalculated(false)}>重新计算</Button>
          <Button variant="contained" startIcon={<Calculate />} size="small" onClick={() => setCalculated(true)}>执行卷积</Button>
          <Button variant="outlined" startIcon={<FileDownload />} size="small">导出</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 选择BOM */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>选择 BOM</Typography>
            {bomList.filter(b => b.status !== 'obsolete').map((bom) => (
              <Box
                key={bom.id}
                onClick={() => setSelectedBOM(bom)}
                sx={{
                  p: 1.5, borderRadius: 2, cursor: 'pointer', mb: 1,
                  border: `1px solid ${(selectedBOM?.id ?? bomList[0]?.id) === bom.id ? '#3B82F6' : 'rgba(226,232,240,0.8)'}`,
                  bgcolor: (selectedBOM?.id ?? bomList[0]?.id) === bom.id ? '#EFF6FF' : '#FAFAFA',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{bom.productName}</Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>{bom.bomNo} · {bom.type} · {bom.version}</Typography>
                  </Box>
                  <Chip
                    label={bom.status === 'released' ? '已发布' : '草稿'}
                    size="small"
                    sx={{ bgcolor: bom.status === 'released' ? '#ECFDF5' : '#FFF7ED', color: bom.status === 'released' ? '#10B981' : '#F59E0B' }}
                  />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* 成本汇总 */}
        <Grid item xs={12} md={8}>
          {calculated ? (
            <>
              {/* 成本饼图 */}
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>成本构成</Typography>
                {/* ★ V3.47.0 3-04：缺工艺路线时人工/工序成本恒 0。原先此处写死
                    「材料成本 × 15%」所以永远有数；改成工时口径后没数据就是 0，
                    必须显式说明，否则看板上的人工成本 0 会被当成"人工免费"。 */}
                {lc.missingRoute && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    该产品没有匹配的工艺路线，<b>人工成本与工序成本按 0 计</b>，当前总成本仅含材料成本。
                    请在「生产 → 工艺路线」中为产品编码 {activeBOM?.productCode || '（未填）'} 维护工序工时。
                  </Alert>
                )}
                <Grid container>
                  <Grid item xs={12} md={5}>
                    <ResponsiveChartContainer
                      series={[{
                        type: 'pie',
                        data: breakdown.map((b, i) => ({ id: i, value: b.value, label: b.label, color: b.color })),
                        innerRadius: 50,
                      }]}
                      height={200}
                    >
                      <PiePlot />
                    </ResponsiveChartContainer>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Box sx={{ pt: 2 }}>
                      {breakdown.map((item) => (
                        <Box key={item.label} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                              <Typography variant="body2">{item.label}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              ¥{item.value.toFixed(2)} ({item.percentage.toFixed(1)}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={item.percentage}
                            sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 3 } }}
                          />
                        </Box>
                      ))}
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>产品总成本</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3B82F6' }}>
                          ¥{totalCost.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* 标准成本差异分析（决策 E · 接通 D1 真实化） */}
              <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>标准成本差异分析</Typography>
                  <Chip
                    size="small"
                    label={hasActual ? '已含实际成本' : '尚未维护实际成本'}
                    sx={{ bgcolor: hasActual ? '#ECFDF5' : '#FEF3C7', color: hasActual ? '#10B981' : '#92400E' }}
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>标准总成本 (¥)</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>¥{materialCost.toFixed(2)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>实际总成本 (¥)</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>¥{actualTotalCost.toFixed(2)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>差异额 (¥)</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: varianceTotal > 0 ? '#EF4444' : '#10B981' }}>
                        {varianceTotal > 0 ? '+' : ''}¥{varianceTotal.toFixed(2)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>差异率</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: varianceTotal > 0 ? '#EF4444' : '#10B981' }}>
                        {varianceTotal > 0 ? '+' : ''}{(variancePct * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 1.5 }}>
                  实际成本优先取 BOM 子件维护的「实际单价」（与标准单价同口径、由 BOM 维护者填入）；物料主数据移动均价为预埋真实来源（单位一致时自动采用）。差异率＝(实际−标准)/标准，正值=超支(红)、负值=节约(绿)。
                </Typography>
              </Paper>

              {/* 物料明细（接通 D1 真实子件） */}
              <Paper sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>物料成本明细</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>物料编码</TableCell>
                        <TableCell>物料名称</TableCell>
                        <TableCell>数量</TableCell>
                        <TableCell>单位</TableCell>
                        <TableCell>标准单价 (¥)</TableCell>
                        <TableCell>实际单价 (¥)</TableCell>
                        <TableCell>小计 (¥)</TableCell>
                        <TableCell>差异率</TableCell>
                        <TableCell>占比</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {varianceRows.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#3B82F6' }}>{row.materialCode}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.materialName}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.quantity}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{row.unit}</Typography></TableCell>
                          <TableCell><Typography variant="body2">¥{(row.unitCost || 0).toFixed(2)}</Typography></TableCell>
                          <TableCell>
                            {row.actual.value !== undefined ? (
                              <Box>
                                <Typography variant="body2">¥{row.actual.value.toFixed(2)}</Typography>
                                <Typography variant="caption" sx={{ color: row.actual.source === 'movingAvg' ? '#10B981' : '#64748B' }}>
                                  {row.actual.source === 'movingAvg' ? '移动均价' : '维护实际'}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#94A3B8' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>¥{(row.totalCost || 0).toFixed(2)}</Typography></TableCell>
                          <TableCell>
                            {row.diffPct !== undefined ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: row.diffPct > 0.005 ? '#EF4444' : row.diffPct < -0.005 ? '#10B981' : '#64748B' }}>
                                  {row.diffPct > 0 ? '+' : ''}{(row.diffPct * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ color: '#94A3B8' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={materialCost > 0 ? (row.totalCost / materialCost) * 100 : 0}
                                sx={{ width: 50, height: 4, borderRadius: 2, bgcolor: '#F1F5F9' }}
                              />
                              <Typography variant="caption" sx={{ color: '#64748B' }}>
                                {materialCost > 0 ? ((row.totalCost / materialCost) * 100).toFixed(1) : '0.0'}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          ) : (
            <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Calculate sx={{ fontSize: 56, color: '#CBD5E1', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#64748B', mb: 1 }}>点击「执行卷积」开始计算</Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>将基于当前BOM和物料成本数据进行卷积计算</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default CostRollup;
