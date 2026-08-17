import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Alert, Tooltip,
  LinearProgress, Card, CardContent, Divider, Checkbox, Snackbar,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FactoryIcon from '@mui/icons-material/Factory';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { FlowTracker } from '@/components/common';
import { useProductionStore } from '@/stores/productionStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useBOMStore } from '@/stores/bomStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useSalesStore } from '@/stores/salesStore';
import { MRPRecommendation } from '@/types/production';
import type {
  SalesOrder, SalesOrderStatus, PurchaseOrder, PurchaseOrderStatus, Material, BOMHeader,
} from '@/types';

const PRIORITY_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'default' }> = {
  urgent: { label: '紧急', color: 'error' },
  high: { label: '高', color: 'warning' },
  normal: { label: '正常', color: 'default' },
};

/**
 * 单行净需求计算结果（本地组件状态，不污染 store）
 */
export interface MrpResultRow {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  gross: number;   // 毛需求（经 BOM 多级展开后）
  onHand: number;  // 现有库存
  onOrder: number; // 在途（已下单未到货）
  safetyStock: number; // 安全库存（B8：纳入净需求分层，不被消耗）
  net: number;     // 净需求 = max(0, 毛需求 + 安全库存 - 现有库存 - 在途)
  planned: number; // 计划订单量（B8：按 lotSize/MOQ 批量取整，net 为 0 则为 0）
  lotSize: number; // B8：采购/生产批量（0 表示不取整，按净需求下单）
  leadTime: number; // B8：有效提前期（天；采购用 leadTime，自制用 cycleTime）
  demandDate: string; // B8：需求日期（取最早销售订单交期，缺省今天+30天）
  releaseDate: string; // B8：建议下单/开工日期 = 需求日期 - 提前期（提前期偏置排产）
}

// 已关闭/取消的销售订单状态不计入需求
const EXCLUDED_SO_STATUS = new Set<SalesOrderStatus>(['completed', 'cancelled']);
// 已收货/关闭/取消的采购订单不计入在途
const TERMINAL_PO_STATUS = new Set<PurchaseOrderStatus>(['received', 'closed', 'cancelled']);
const MAX_BOM_DEPTH = 10;

// ── 日期工具（B8 提前期偏置排产）──
function parseDate(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * 计算净需求（纯函数，供点击处理器调用）。
 * - 需求来源：活跃销售订单行项目（按 materialId 汇总）
 * - 通过 BOM 多级递归展开（productId 命中 BOM 即继续向下展开，深度封顶 10）
 * - 供应：现有库存(material.currentStock) + 在途采购(orderedQuantity - deliveredQuantity)
 * - B8 增强：消费物料主数据的安全库存 / 批量(lotSize,MOQ) / 提前期(leadTime,cycleTime)
 *   · 净需求 = max(0, 毛需求 + 安全库存 - 现有库存 - 在途)  （安全库存分层，不被消耗）
 *   · 计划订单量 = 按 lotSize 向上取整到整数倍，且不低于 MOQ（lotSize<=1 则不取整）
 *   · 建议下单/开工日期 = 需求日期 - 有效提前期（提前期偏置排产）
 */
function computeNetRequirements(
  salesOrders: SalesOrder[],
  materials: Material[],
  bomList: BOMHeader[],
  purchaseOrders: PurchaseOrder[],
): MrpResultRow[] {
  const materialById = new Map(materials.map((m) => [m.id, m]));
  // 以 productId 为键索引 BOM：用于判断某物料本身是否为“成品/半成品”（拥有自己的 BOM）
  const bomByProductId = new Map(bomList.map((b) => [b.productId, b]));

  const grossDemand = new Map<string, number>();
  // 需求日期：取该物料被需求的最早销售订单交期（B8 提前期偏置用）
  const demandDateByMaterial = new Map<string, string>();
  const recordDemand = (materialId: string, soDate?: string) => {
    if (!soDate) return;
    const cur = demandDateByMaterial.get(materialId);
    if (!cur || soDate < cur) demandDateByMaterial.set(materialId, soDate);
  };

  // 多级 BOM 展开：把对某个物料/产品的需求，向下展开为其组件物料需求
  const explode = (materialId: string, qty: number, depth: number, soDate?: string) => {
    if (depth > MAX_BOM_DEPTH) return;
    const bom = bomByProductId.get(materialId);
    if (bom && bom.items && bom.items.length > 0) {
      for (const item of bom.items) {
        const need = qty * item.quantity;
        const childBom = bomByProductId.get(item.materialId);
        if (childBom && item.materialId !== materialId) {
          // 该组件本身也是一个拥有 BOM 的产品 → 继续向下展开（多级）
          explode(item.materialId, need, depth + 1, soDate);
        } else {
          // 叶子物料（采购件/原材料）：直接累加需求
          grossDemand.set(item.materialId, (grossDemand.get(item.materialId) ?? 0) + need);
          recordDemand(item.materialId, soDate);
        }
      }
    } else {
      // 无 BOM 的叶子物料：需求直接落在本物料上
      grossDemand.set(materialId, (grossDemand.get(materialId) ?? 0) + qty);
      recordDemand(materialId, soDate);
    }
  };

  // 1) 汇总活跃销售订单的毛需求（同时记录最早需求日期）
  for (const so of salesOrders) {
    if (EXCLUDED_SO_STATUS.has(so.status)) continue;
    for (const line of so.items) {
      explode(line.materialId, line.quantity, 0, so.expectedDeliveryDate);
    }
  }

  // 2) 汇总在途供应（已下单未到货的采购量）
  const onOrder = new Map<string, number>();
  for (const po of purchaseOrders) {
    if (TERMINAL_PO_STATUS.has(po.status)) continue;
    for (const li of po.items) {
      const remaining = li.orderedQuantity - li.deliveredQuantity;
      if (remaining > 0) {
        onOrder.set(li.materialId, (onOrder.get(li.materialId) ?? 0) + remaining);
      }
    }
  }

  // 3) 计算净需求 + 批量规则 + 提前期偏置
  const fallbackDate = fmtDate(addDays(new Date(), 30));
  const rows: MrpResultRow[] = [];
  for (const [materialId, gross] of grossDemand) {
    const mat = materialById.get(materialId);
    if (!mat) continue; // 引用的物料在物料主数据中不存在，跳过
    const onHand = mat.currentStock;
    const oo = onOrder.get(materialId) ?? 0;
    const safetyStock = mat.safetyStock ?? 0;
    // 安全库存分层：净需求须把安全库存补回，保障安全库存不被消耗
    const net = Math.max(0, gross + safetyStock - onHand - oo);

    // 批量规则（lotSize / MOQ）：计划订单量向上取整到 lotSize 整数倍，且不低于 MOQ
    const lotSize = mat.lotSize && mat.lotSize > 1 ? mat.lotSize : 0;
    const moq = mat.moq ?? 0;
    let planned = net;
    if (lotSize > 0 && net > 0) {
      planned = Math.ceil(net / lotSize) * lotSize;
    }
    if (moq > 0 && planned < moq) planned = moq;
    if (net === 0) planned = 0;

    // 提前期偏置：采购用 leadTime，自制用 cycleTime（缺省 0 → 建议下单日期=需求日期）
    const isMake = mat.makeOrBuy === 'manufacture';
    const effLead = isMake
      ? (mat.cycleTime ?? mat.leadTime ?? 0)
      : (mat.leadTime ?? 0);
    const demandDate = demandDateByMaterial.get(materialId) ?? fallbackDate;
    const releaseDate = effLead > 0
      ? fmtDate(addDays(parseDate(demandDate)!, -effLead))
      : demandDate;

    rows.push({
      materialId,
      materialCode: mat.code,
      materialName: mat.name,
      unit: mat.unit,
      gross,
      onHand,
      onOrder: oo,
      safetyStock,
      net,
      planned,
      lotSize,
      leadTime: effLead,
      demandDate,
      releaseDate,
    });
  }

  // 净需求大的排前面，便于优先处理
  rows.sort((a, b) => b.net - a.net);
  return rows;
}

export default function MRPPlan() {
  const navigate = useNavigate();
  const { mrpRecommendations, addWorkOrder } = useProductionStore();
  const { addPurchaseRequest } = usePurchaseStore();
  const { bomList } = useBOMStore();

  const [lastCalcTime, setLastCalcTime] = useState<string>('2024-05-10 14:30');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState('');

  // 净需求计算结果（本地状态）
  const [mrpResult, setMrpResult] = useState<MrpResultRow[]>([]);
  const [hasComputed, setHasComputed] = useState(false);

  // ── 计算净需求（真实 MRP 运算）──
  const handleCompute = () => {
    setLoading(true);
    setSelectedIds(new Set());
    // 通过 getState() 在点击处理器内读取其它 store 的最新数据
    setTimeout(() => {
      const { salesOrders } = useSalesStore.getState();
      const { materials } = useMaterialStore.getState();
      const { bomList: boms } = useBOMStore.getState();
      const { purchaseOrders } = usePurchaseStore.getState();

      const rows = computeNetRequirements(salesOrders, materials, boms, purchaseOrders);
      setMrpResult(rows);
      setHasComputed(true);

      const now = new Date();
      setLastCalcTime(now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
      setLoading(false);
    }, 300);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === mrpRecommendations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(mrpRecommendations.map(m => m.id)));
    }
  };

  const selectedRows = mrpRecommendations.filter(m => selectedIds.has(m.id));
  const selectedPurchase = selectedRows.filter(m => m.type === 'purchase');
  const selectedManufacture = selectedRows.filter(m => m.type === 'manufacture');

  // ── 一键生成采购申请 ──
  const handleGenPurchaseRequest = () => {
    if (selectedPurchase.length === 0) {
      setSnackbar('请选择类型为"采购"的MRP建议');
      return;
    }
    const now = new Date().toISOString();
    const nowDate = now.split('T')[0];
    const seq = String(Date.now()).slice(-6);
    const requestId = `pr-mrp-${Date.now()}`;
    const requestNo = `PR-MRP-${seq}`;

    const totalAmount = selectedPurchase.reduce((sum, m) => {
      return sum + m.suggestedQuantity * 100; // 估算单价100
    }, 0);

    addPurchaseRequest({
      id: requestId,
      requestNo,
      title: `MRP自动生成采购申请 - ${nowDate}`,
      applicant: 'MRP系统',
      department: '生产部',
      type: 'material',
      priority: selectedPurchase.some(m => m.priority === 'urgent') ? 'urgent' : 'normal',
      reason: '根据MRP运算结果自动生成',
      expectedDate: selectedPurchase[0]?.suggestedDate || nowDate,
      status: 'draft',
      totalAmount,
      projectNo: undefined,
      projectName: undefined,
      createdAt: now,
      updatedAt: now,
      items: selectedPurchase.map((m, i) => ({
        id: `pri-mrp-${i}`,
        materialId: `mat-${m.materialCode}`,
        materialCode: m.materialCode,
        materialName: m.materialName,
        specification: '',
        unit: m.unit,
        quantity: m.suggestedQuantity,
        estimatedPrice: 100,
        estimatedAmount: m.suggestedQuantity * 100,
        deliveryDate: m.suggestedDate,
        remarks: m.reason,
      })),
    });

    // 从 MRP 列表中移除已处理的建议
    selectedPurchase.forEach(m => {
      useProductionStore.getState().deleteMrpRecommendation(m.id);
    });
    setSelectedIds(new Set());
    setSnackbar(`已生成采购申请 ${requestNo}，共 ${selectedPurchase.length} 条物料`);
  };

  // ── 一键生成生产工单 ──
  const handleGenWorkOrder = () => {
    if (selectedManufacture.length === 0) {
      setSnackbar('请选择类型为"生产"的MRP建议');
      return;
    }

    // 按产品分组生成工单
    const productGroups = new Map<string, MRPRecommendation[]>();
    selectedManufacture.forEach(m => {
      const key = m.materialCode;
      if (!productGroups.has(key)) productGroups.set(key, []);
      productGroups.get(key)!.push(m);
    });

    const now = new Date().toISOString();
    let woCount = 0;

    // 查找对应的BOM
    const findBOM = (materialCode: string) => bomList.find(b => b.productCode === materialCode);

    productGroups.forEach((items, materialCode) => {
      const firstItem = items[0];
      const bom = findBOM(materialCode);
      const seq = String(Date.now() + woCount).slice(-8);
      const woId = `wo-mrp-${Date.now()}-${woCount}`;
      const woNo = `WO-MRP-${seq}`;
      const neededQty = items.reduce((sum, m) => sum + m.suggestedQuantity, 0);

      addWorkOrder({
        id: woId,
        orderNo: woNo,
        status: 'draft',
        productCode: materialCode,
        productName: firstItem.materialName,
        bomId: bom?.id || '',
        bomNo: bom?.bomNo || '',
        routeId: '',
        routeNo: '',
        plannedQuantity: neededQty,
        completedQuantity: 0,
        scrapQuantity: 0,
        plannedStartDate: now.split('T')[0],
        plannedEndDate: firstItem.suggestedDate,
        priority: items.some(m => m.priority === 'urgent') ? 'urgent' : 'normal',
        workshop: '生产一车间',
        supervisor: '',
        note: '根据MRP运算结果自动生成',
        createdAt: now,
        updatedAt: now,
      });
      woCount++;
    });

    // 从 MRP 列表中移除
    selectedManufacture.forEach(m => {
      useProductionStore.getState().deleteMrpRecommendation(m.id);
    });
    setSelectedIds(new Set());
    setSnackbar(`已生成 ${woCount} 张生产工单`);
  };

  const urgentCount = mrpRecommendations.filter(m => m.priority === 'urgent').length;
  const purchaseCount = mrpRecommendations.filter(m => m.type === 'purchase').length;
  const makeCount = mrpRecommendations.filter(m => m.type === 'manufacture').length;

  const netCount = mrpResult.filter(r => r.net > 0).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>MRP 物料需求计划</Typography>
        <FlowTracker module="mrp" currentStatus="mrp_result" />
        <Box flex={1} />
        <Typography variant="caption" color="text.secondary">上次运算：{lastCalcTime}</Typography>
        <Button
          variant="contained"
          data-testid="mrp-compute"
          startIcon={<RefreshIcon />}
          onClick={handleCompute}
          disabled={loading}
          size="small"
        >
          {loading ? '运算中...' : '计算净需求'}
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: '建议采购', value: purchaseCount, icon: <ShoppingCartIcon />, color: '#1976d2' },
          { label: '建议生产', value: makeCount, icon: <FactoryIcon />, color: '#388e3c' },
          { label: '紧急需求', value: urgentCount, icon: <WarningAmberIcon />, color: '#d32f2f' },
          { label: '建议总数', value: mrpRecommendations.length, icon: <RefreshIcon />, color: '#7b1fa2' },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                  <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: kpi.color }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {urgentCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          发现 <b>{urgentCount}</b> 条紧急物料需求，请尽快处理！
        </Alert>
      )}

      {/* 净需求计算结果（真实 MRP 运算） */}
      {!hasComputed ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          点击右上角「计算净需求」，系统将基于<b>活跃销售订单</b>（排除已关闭/取消）经 <b>BOM 多级展开</b>，
          结合<b>现有库存</b>与<b>在途采购</b>，计算各物料的净需求与计划订单量。
        </Alert>
      ) : (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight={600}>净需求计算结果</Typography>
            <Box flex={1} />
            <Typography
              variant="caption"
              color="text.secondary"
              data-testid="mrp-summary"
            >
              共 {netCount} 个物料存在净需求
            </Typography>
          </Box>
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>毛需求</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>现有库存</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>在途</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>净需求</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>计划订单量</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>安全库存</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>批量</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>提前期(天)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>需求日期</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>建议下单日期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mrpResult.map((row) => (
                  <TableRow key={row.materialId} data-testid="mrp-result-row" hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.materialCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.materialName}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.gross} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.onHand} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.onOrder} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.net > 0 ? 'error.main' : 'text.secondary'}
                        data-testid="mrp-net"
                      >
                        {row.net > 0 ? `${row.net} ${row.unit}` : '0'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={row.planned > 0 ? 'primary.main' : 'text.secondary'}
                        data-testid="mrp-planned"
                      >
                        {row.planned > 0 ? `${row.planned} ${row.unit}` : '无需补充'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={row.net > 0 && row.onHand < row.safetyStock ? 'error.main' : 'text.secondary'}>
                        {row.safetyStock} {row.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.lotSize > 0 ? `${row.lotSize} ${row.unit}` : '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.leadTime > 0 ? `${row.leadTime}` : '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace">{row.demandDate}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="secondary.main">
                        {row.releaseDate}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1, mb: 2,
          bgcolor: '#EFF6FF', borderRadius: 2,
          border: '1px solid rgba(59,130,246,.2)',
        }}>
          <Chip label={`已选 ${selectedIds.size} 条`} size="small" sx={{ bgcolor: '#DBEAFE', color: '#3B82F6', fontWeight: 600 }} />
          {selectedPurchase.length > 0 && (
            <Button size="small" startIcon={<AddShoppingCartIcon sx={{ fontSize: 14 }} />} onClick={handleGenPurchaseRequest}
              sx={{ fontSize: '0.8125rem', color: '#2563EB' }}>
              生成采购申请 ({selectedPurchase.length})
            </Button>
          )}
          {selectedManufacture.length > 0 && (
            <Button size="small" startIcon={<EngineeringIcon sx={{ fontSize: 14 }} />} onClick={handleGenWorkOrder}
              sx={{ fontSize: '0.8125rem', color: '#16A34A' }}>
              生成生产工单 ({selectedManufacture.length})
            </Button>
          )}
          <Box flex={1} />
          <Button size="small" onClick={() => setSelectedIds(new Set())} sx={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
            取消选择
          </Button>
        </Box>
      )}

      {/* 需求明细表（历史/种子 MRP 建议） */}
      <Paper>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>需求明细</Typography>
          <Box flex={1} />
          <Typography variant="caption" color="text.secondary">共 {mrpRecommendations.length} 条建议</Typography>
        </Box>
        <Divider />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={selectedIds.size === mrpRecommendations.length && mrpRecommendations.length > 0}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < mrpRecommendations.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>物料名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>优先级</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>当前库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>安全库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>需求量</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>在途量</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>建议量</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>建议日期</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>原因说明</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mrpRecommendations.map(row => {
                const priorConf = PRIORITY_CONFIG[row.priority] || PRIORITY_CONFIG.normal;
                const stockAlert = row.currentStock < row.safetyStock;
                const isSelected = selectedIds.has(row.id);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    selected={isSelected}
                    onClick={() => toggleSelect(row.id)}
                    sx={{
                      bgcolor: row.priority === 'urgent' ? 'error.50' : 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox size="small" checked={isSelected} onChange={() => toggleSelect(row.id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{row.materialCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.materialName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={row.type === 'purchase' ? <ShoppingCartIcon sx={{ fontSize: '0.9rem !important' }} /> : <FactoryIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label={row.type === 'purchase' ? '采购' : '生产'}
                        size="small"
                        color={row.type === 'purchase' ? 'info' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={priorConf.label} size="small" color={priorConf.color} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={stockAlert ? '低于安全库存' : ''}>
                        <Typography variant="body2" color={stockAlert ? 'error.main' : 'text.primary'} fontWeight={stockAlert ? 600 : 400}>
                          {row.currentStock} {row.unit}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.safetyStock} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.requiredQuantity} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.onOrderQuantity} {row.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color={row.suggestedQuantity > 0 ? 'primary.main' : 'text.secondary'}>
                        {row.suggestedQuantity > 0 ? `${row.suggestedQuantity} ${row.unit}` : '无需补充'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.suggestedDate}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="caption" color="text.secondary">{row.reason}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
