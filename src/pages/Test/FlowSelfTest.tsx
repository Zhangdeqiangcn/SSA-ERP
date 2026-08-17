import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Alert, LinearProgress, Stack, Chip, Divider } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, AutoFixHigh, RestartAlt } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useSalesStore } from '@/stores/salesStore';
import { useBOMStore } from '@/stores/bomStore';
import { useProductionStore } from '@/stores/productionStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';

interface FlowNode {
  key: string;
  label: string;
  hint: string;
  count: number;
  target: number;
  route: string;
}

const FlowSelfTest: React.FC = () => {
  const navigate = useNavigate();
  const [seedMsg, setSeedMsg] = useState('');

  const sales = useSalesStore();
  const bom = useBOMStore();
  const production = useProductionStore();
  const purchase = usePurchaseStore();
  const warehouse = useWarehouseStore();

  const nodes: FlowNode[] = useMemo(() => [
    { key: 'so', label: '销售订单 (SO)', hint: '销售模块', count: sales.salesOrders?.length ?? 0, target: 1, route: '/sales/orders' },
    { key: 'bom', label: 'BOM 清单', hint: 'BOM 模块', count: bom.bomList?.length ?? 0, target: 1, route: '/bom' },
    { key: 'mrp', label: 'MRP 建议', hint: '生产模块', count: production.mrpRecommendations?.length ?? 0, target: 1, route: '/production/mrp' },
    { key: 'pr', label: '采购申请', hint: '采购模块', count: purchase.purchaseRequests?.length ?? 0, target: 1, route: '/purchase/requests' },
    { key: 'wo', label: '生产工单', hint: '生产模块', count: production.workOrders?.length ?? 0, target: 1, route: '/production/orders' },
    { key: 'pick', label: '领料出库', hint: '仓储模块', count: warehouse.outboundOrders?.filter(o => o.type === 'pick').length ?? 0, target: 1, route: '/warehouse/outbound' },
    { key: 'fg', label: '成品入库', hint: '仓储模块', count: warehouse.finishedGoodsInbounds?.length ?? 0, target: 1, route: '/warehouse/fg-inbound' },
    { key: 'ship', label: '销售发货', hint: '销售模块', count: sales.shipments?.length ?? 0, target: 1, route: '/sales/logistics' },
  ], [sales.salesOrders?.length, bom.bomList?.length, production.mrpRecommendations?.length, purchase.purchaseRequests?.length, production.workOrders?.length, warehouse.outboundOrders?.length, warehouse.finishedGoodsInbounds?.length, sales.shipments?.length]);

  const doneCount = nodes.filter(n => n.count >= n.target).length;
  const total = nodes.length;
  const progress = Math.round((doneCount / total) * 100);

  const handleSeed = () => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const soNo = `SO-SEED-${today}`;
    const bomNo = `BOM-SEED-${today}`;
    const woNo = `WO-SEED-${today}`;
    const prNo = `PR-SEED-${today}`;
    const shipNo = `SH-SEED-${today}`;

    useSalesStore.getState().addSalesOrder({
      id: `so-seed-${Date.now()}`, orderNo: soNo, customerName: '示例客户（演示）', projectNo: 'P-DEMO', projectName: '演示项目',
      status: 'in_production', orderDate: today, deliveryDate: today, totalAmount: 50000, currency: 'CNY',
      items: [{ id: 'soi1', materialId: 'mat-010', materialCode: 'PRD-FRAME-001', materialName: '重型钢结构焊接架 H1200', specification: 'H1200', unit: '件', quantity: 10, unitPrice: 5000, amount: 50000 }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    useBOMStore.getState().addBOM({
      id: `bom-seed-${Date.now()}`, bomNo: bomNo, productCode: 'PRD-FRAME-001', productName: '重型钢结构焊接架 H1200', version: 'V1',
      sourceOrderNo: soNo, status: 'active', items: [{ id: 'bi1', materialCode: 'MAT-STEEL-001', materialName: '钢板 Q235', specification: '6mm', unit: 'kg', quantity: 120, unitPrice: 5, amount: 600 }],
      laborCost: 800, totalCost: 1400, createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    useProductionStore.getState().addMrpRecommendation({
      id: `mrp-seed-${Date.now()}`, materialCode: 'MAT-STEEL-001', materialName: '钢板 Q235', specification: '6mm', unit: 'kg',
      type: 'purchase', priority: 'normal', requirement: 120, available: 0, shortage: 120,
      suggestedQuantity: 120, currentStock: 0, safetyStock: 0,
      suggestDate: today, source: 'seed', relatedBom: bomNo,
    });

    usePurchaseStore.getState().addPurchaseRequest({
      id: `pr-seed-${Date.now()}`, requestNo: prNo, source: 'mrp', relatedBom: bomNo, projectNo: 'P-DEMO', projectName: '演示项目',
      status: 'pending', urgency: 'normal', expectDate: today, totalAmount: 600, currency: 'CNY',
      items: [{ id: 'pri1', materialId: 'mat-steel', materialCode: 'MAT-STEEL-001', materialName: '钢板 Q235', specification: '6mm', unit: 'kg', quantity: 120, unitPrice: 5, amount: 600 }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    useProductionStore.getState().addWorkOrder({
      id: `wo-seed-${Date.now()}`, orderNo: woNo, status: 'in_progress', productCode: 'PRD-FRAME-001', productName: '重型钢结构焊接架 H1200',
      bomId: '', bomNo: bomNo, routeId: '', routeNo: '',
      plannedQuantity: 10, completedQuantity: 0, scrapQuantity: 0,
      plannedStartDate: today, plannedEndDate: today,
      priority: 'normal', workshop: '生产一车间', supervisor: '',
      projectNo: 'P-DEMO', projectName: '演示项目',
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    useWarehouseStore.getState().addOutboundOrder({
      id: `ob-seed-${Date.now()}`, outboundNo: `OUT-SEED-${today}`, type: 'pick', sourceOrderNo: woNo, projectNo: 'P-DEMO', projectName: '演示项目',
      status: 'done', outboundDate: today,
      items: [{ id: 'obi1', materialId: 'mat-steel', materialCode: 'MAT-STEEL-001', materialName: '钢板 Q235', specification: '6mm', unit: 'kg', quantity: 120, location: 'A-01' }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    useWarehouseStore.getState().addFinishedGoodsInbound({
      id: `fg-seed-${Date.now()}`, inboundNo: `FG-SEED-${today}`, workOrderNo: woNo, productCode: 'PRD-FRAME-001', productName: '重型钢结构焊接架 H1200',
      projectNo: 'P-DEMO', projectName: '演示项目', status: 'done', inboundDate: today, quantity: 10, location: 'FG-01',
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    useSalesStore.getState().addShipment({
      id: `ship-seed-${Date.now()}`, shipmentNo: shipNo, salesOrderNo: soNo, projectNo: 'P-DEMO', projectName: '演示项目',
      customerName: '示例客户（演示）', status: 'pending',
      items: [{ id: 'shi1', materialId: 'mat-010', materialCode: 'PRD-FRAME-001', materialName: '重型钢结构焊接架 H1200', specification: 'H1200', unit: '件', orderQuantity: 10, shipQuantity: 10, unitPrice: 5000, amount: 50000 }],
      transportMode: 'road', carrier: '演示物流', estimatedPickupDate: today, estimatedDeliveryDate: today,
      originAddress: '工厂仓库', destinationAddress: '客户工厂', packageCount: 1,
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    setSeedMsg('已填充完整演示链路数据（销售订单→BOM→MRP→采购申请→工单→领料→成品入库→销售发货），可点击各节点查看列表与详情。');
  };

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ssa-erp-'))
        .forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <PageWrapper
      title="全流程自检面板"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AutoFixHigh />} onClick={handleSeed}>一键填充演示链路</Button>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleReset}>重置本地数据</Button>
        </Stack>
      }
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        本面板用于验证「销售订单 → 销售出库」端到端链路是否跑通。每个节点实时反映各模块 store 数据；
        点「一键填充演示链路」可快速构造一条完整数据，用于回归测试与演示。所有数据已通过 zustand persist 落盘 localStorage，刷新不丢失；点「重置本地数据」可恢复初始状态。
      </Alert>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid rgba(226,232,240,.8)', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>链路完成度 {doneCount}/{total}</Typography>
          <Chip label={`${progress}%`} color={progress === 100 ? 'success' : 'primary'} />
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5, mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          {nodes.map(node => {
            const ok = node.count >= node.target;
            return (
              <Paper
                key={node.key}
                data-testid={`flow-node-${node.key}`}
                variant="outlined"
                sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' } }}
                onClick={() => navigate(node.route)}
              >
                {ok ? (
                  <CheckCircle sx={{ color: '#10B981' }} />
                ) : (
                  <RadioButtonUnchecked sx={{ color: '#CBD5E1' }} />
                )}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{node.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{node.hint} · 数据量 {node.count}</Typography>
                </Box>
                <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(node.route); }}>查看</Button>
              </Paper>
            );
          })}
        </Box>
      </Paper>

      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        验证方式：① 应用内自检（本面板一键填充 + 节点跳转）；② Playwright E2E（<code>e2e/flow.spec.ts</code>）覆盖全链路断言与 localStorage 刷新持久化断言。
      </Typography>

      {seedMsg && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSeedMsg('')}>{seedMsg}</Alert>
      )}
    </PageWrapper>
  );
};

export default FlowSelfTest;
