import { useMemo, useState, type ReactNode } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Stack, Alert,
  Divider, Card, CardContent, TextField, Button, IconButton, Tooltip,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SaveIcon from '@mui/icons-material/Save';
import { PageWrapper } from '@/components/layout';
import { useProductionStore } from '@/stores/productionStore';
import { useProductionOperationStore, DEFAULT_LABOR_RATE, DEFAULT_MACHINE_RATE } from '@/stores/productionOperationStore';
import { useBOMStore } from '@/stores/bomStore';
import { SecureField } from '@/components/common';
import { resolveBOM } from '@/utils/bomResolver';
import { calcLaborCost, calcMaterialCost } from '@/utils/costBasis';
import { roundAmount } from '@/utils/cost';

const WO_STATUS_LABEL: Record<string, string> = {
  draft: '草稿', released: '已下达', in_progress: '生产中', completed: '已完成', closed: '已关闭',
};

const fmt = (n: number) => `¥${Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;

/** 生产成本敏感字段包装：对无权限角色（质检/采购/库管/物流/供应商）屏蔽金额 */
function CostField({ children }: { children: ReactNode }) {
  return <SecureField module="production" fieldName="cost">{children}</SecureField>;
}

export default function CostCollection() {
  const { workOrders, processRoutes, updateWorkOrder } = useProductionStore();
  const { operationReports, laborRate, machineRate, setLaborRate, setMachineRate } = useProductionOperationStore();
  const { bomList } = useBOMStore();

  const [laborInput, setLaborInput] = useState<string>(String(laborRate));
  const [machineInput, setMachineInput] = useState<string>(String(machineRate));

  const activeWos = useMemo(() => workOrders.filter((wo) => wo.status !== 'closed'), [workOrders]);

  const compute = useMemo(() => {
    return activeWos.map((wo) => {
      const route =
        processRoutes.find((r) => r.id === wo.routeId) ||
        processRoutes.find((r) => r.routeNo === wo.routeNo) ||
        processRoutes.find((r) => r.productCode === wo.productCode);
      // ★ V3.47.0 3-04：改用唯一解析口径（原先按 id/bomNo 兜底，跨组织同号会取错 BOM）
      const bom = resolveBOM(bomList, wo.productCode, { bomId: wo.bomId });
      // ★ 材料成本走统一口径（含废品率放大，只放大一次）
      const unitMaterial = calcMaterialCost(bom?.items || []);
      // 缺 BOM / 缺工艺路线都要显式看见 —— 原先静默按 0 参与运算，
      // 差异率会显示成一个看似正常的数字（分母小了而已），无法察觉。
      const missingBom = !bom;
      const missingRoute = !route;

      // 标准成本（按计划量）：工时口径统一到 costBasis（原式 setupTime 每道工序
      // 都按全量摊，与「准备时间按批量摊一次」口径不一致，会随工序数放大）
      const std = calcLaborCost({
        operations: route?.operations,
        plannedQty: wo.plannedQuantity,
        rates: { laborRate, machineRate },
      });
      const stdHours = std.totalHours;
      const stdMaterial = roundAmount(unitMaterial * wo.plannedQuantity);
      const stdLabor = std.laborCost;
      const stdMachine = std.processCost;
      const stdTotal = roundAmount(stdMaterial + stdLabor + stdMachine);

      // 实际成本（按报工 / 完成量）
      const reports = operationReports.filter((r) => r.workOrderId === wo.id);
      let actHours = 0;
      reports.forEach((r) => {
        const op = route?.operations.find((o) => o.id === r.operationId);
        const h = r.laborHours ?? (op ? (op.setupTime + op.runTime * r.goodQuantity) / 60 : 0);
        actHours += h;
      });
      const actMaterial = roundAmount(unitMaterial * wo.completedQuantity);
      const actLabor = roundAmount(actHours * laborRate);
      const actMachine = roundAmount(actHours * machineRate);
      const actTotal = roundAmount(actMaterial + actLabor + actMachine);

      const variance = roundAmount(actTotal - stdTotal);
      const variancePct = stdTotal > 0 ? (variance / stdTotal) * 100 : 0;

      return {
        wo, hasBom: !!bom, missingBom, missingRoute,
        unitMaterial,
        stdMaterial, stdLabor, stdMachine, stdTotal,
        actMaterial, actLabor, actMachine, actTotal, actHours,
        variance, variancePct,
      };
    });
  }, [activeWos, processRoutes, bomList, operationReports, laborRate, machineRate]);

  const grandStd = compute.reduce((s, c) => s + c.stdTotal, 0);
  const grandAct = compute.reduce((s, c) => s + c.actTotal, 0);
  const grandVar = grandAct - grandStd;

  const applyRates = () => {
    setLaborRate(Number(laborInput) || DEFAULT_LABOR_RATE);
    setMachineRate(Number(machineInput) || DEFAULT_MACHINE_RATE);
  };

  const saveWoCost = (c: (typeof compute)[number]) => {
    updateWorkOrder(c.wo.id, {
      actualMaterialCost: Number(c.actMaterial.toFixed(2)),
      actualLaborCost: Number(c.actLabor.toFixed(2)),
      actualMachineCost: Number(c.actMachine.toFixed(2)),
      actualTotalCost: Number(c.actTotal.toFixed(2)),
    });
  };

  return (
    <PageWrapper title="成本归集" subtitle="按工单归集 物料(BOM) / 人工(报工工时×费率) / 机器费用，对比标准成本差异">
      <Alert severity="info" sx={{ mb: 2 }}>
        物料成本取 BOM 单位成本 × 数量；人工与机器费用取<strong>报工工时 × 费率</strong>。
        标准成本按<strong>计划量</strong>测算，实际成本按<strong>完成量/报工</strong>测算，差异 = 实际 − 标准（正值代表超支）。
      </Alert>

      {/* 费率配置 */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <AttachMoneyIcon sx={{ color: '#10B981' }} />
          <Typography variant="subtitle2" fontWeight={600}>成本费率（元/小时）</Typography>
          <TextField
            label="人工费率"
            type="number"
            size="small"
            value={laborInput}
            onChange={(e) => setLaborInput(e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ width: 140 }}
          />
          <TextField
            label="机器费率"
            type="number"
            size="small"
            value={machineInput}
            onChange={(e) => setMachineInput(e.target.value)}
            inputProps={{ min: 0 }}
            sx={{ width: 140 }}
          />
          <Button variant="contained" onClick={applyRates}>应用费率</Button>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">标准总成本</Typography>
              <Typography variant="h6" fontWeight={700}><CostField>{fmt(grandStd)}</CostField></Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">实际总成本</Typography>
              <Typography variant="h6" fontWeight={700} color="#3B82F6"><CostField>{fmt(grandAct)}</CostField></Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">总差异</Typography>
              <Typography variant="h6" fontWeight={700} color={grandVar > 0 ? '#EF4444' : '#10B981'}>
                <CostField>{grandVar >= 0 ? '+' : ''}{fmt(grandVar)}</CostField>
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {compute.map((c) => (
          <Grid item xs={12} key={c.wo.id}>
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {c.wo.orderNo} · {c.wo.productName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    计划 {c.wo.plannedQuantity} / 完成 {c.wo.completedQuantity} 件
                    {!c.hasBom && ' · 无关联 BOM（物料成本按 0 计）'}
                    {c.missingRoute && ' · 无关联工艺路线（人工/工序成本按 0 计，差异率会偏小）'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={<><SecureField module="production" fieldName="cost">{`差异 ${c.variance >= 0 ? '+' : ''}${fmt(c.variance)}`}</SecureField> ({c.variancePct.toFixed(0)}%)</>}
                      size="small"
                      color={c.variance > 0 ? 'error' : 'success'}
                    />
                  <Tooltip title="归集并保存至工单">
                    <IconButton size="small" color="primary" onClick={() => saveWoCost(c)}>
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>成本项</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>标准成本</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>实际成本</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>差异</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { name: '物料成本', s: c.stdMaterial, a: c.actMaterial },
                      { name: '人工成本', s: c.stdLabor, a: c.actLabor },
                      { name: '机器费用', s: c.stdMachine, a: c.actMachine },
                    ].map((row) => (
                      <TableRow key={row.name} hover>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right"><CostField>{fmt(row.s)}</CostField></TableCell>
                        <TableCell align="right"><CostField>{fmt(row.a)}</CostField></TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: row.a - row.s > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}
                        >
                          <CostField>{row.a - row.s >= 0 ? '+' : ''}{fmt(row.a - row.s)}</CostField>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                      <TableCell sx={{ fontWeight: 700 }}>合计</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}><CostField>{fmt(c.stdTotal)}</CostField></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}><CostField>{fmt(c.actTotal)}</CostField></TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: c.variance > 0 ? '#EF4444' : '#10B981' }}
                      >
                        <CostField>{c.variance >= 0 ? '+' : ''}{fmt(c.variance)}</CostField>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                报工工时合计 {c.actHours.toFixed(2)} h
                {c.wo.actualTotalCost != null && ' · 已保存实际总成本至工单'}
              </Typography>
            </Paper>
          </Grid>
        ))}
        {compute.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography color="text.secondary">当前没有可归集成本的工单。</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </PageWrapper>
  );
}
