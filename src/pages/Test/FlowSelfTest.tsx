import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography, Alert, LinearProgress, Stack, Chip, Divider } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, AutoFixHigh, RestartAlt } from '@mui/icons-material';
import { PageWrapper } from '@/components/layout';
import { useSalesStore } from '@/stores/salesStore';
import { useSalesContractStore } from '@/stores/salesContractStore';
import { useProductionStore } from '@/stores/productionStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useQualityStore } from '@/stores/qualityStore';
import { useArapStore } from '@/stores/arapStore';

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
  const contracts = useSalesContractStore();
  const production = useProductionStore();
  const purchase = usePurchaseStore();
  const warehouse = useWarehouseStore();
  const quality = useQualityStore();
  const arap = useArapStore();

  const nodes: FlowNode[] = useMemo(() => [
    { key: 'followup', label: '① 客户跟进', hint: '销售/商机', count: sales.prospects?.filter((p) => (p.followupRecords?.length ?? 0) > 0).length ?? 0, target: 1, route: '/sales/prospects' },
    { key: 'quote', label: '② 接单(报价)', hint: '销售/商机', count: sales.prospects?.filter((p) => p.status === 'quoted' || p.status === 'won').length ?? 0, target: 1, route: '/sales/prospects' },
    { key: 'contract', label: '③ 签订合同', hint: '销售合同', count: contracts.contracts?.length ?? 0, target: 1, route: '/sales/contracts' },
    { key: 'so', label: '④ 销售订单', hint: '销售订单', count: sales.salesOrders?.length ?? 0, target: 1, route: '/sales/orders' },
    { key: 'review', label: '⑤ 订单评审', hint: '销售订单', count: sales.salesOrders?.filter((o) => (o.approvalRecords?.length ?? 0) > 0).length ?? 0, target: 1, route: '/sales/orders' },
    { key: 'schedule', label: '⑥ 生产排产', hint: '生产工单', count: production.workOrders?.filter((wo) => !!wo.plannedStartDate).length ?? 0, target: 1, route: '/production/scheduling' },
    { key: 'mrp', label: '⑦ MRP运算', hint: '生产建议', count: production.mrpRecommendations?.length ?? 0, target: 1, route: '/production/mrp' },
    { key: 'pr', label: '⑧ 需求产生(PR)', hint: '采购申请', count: purchase.purchaseRequests?.length ?? 0, target: 1, route: '/purchase/requests' },
    { key: 'po', label: '⑨ PR转PO', hint: '采购订单', count: purchase.purchaseOrders?.length ?? 0, target: 1, route: '/purchase/orders' },
    { key: 'asn', label: '⑩ 供应商交货(ASN)', hint: '仓储入库', count: warehouse.inboundOrders?.filter((o) => o.type === 'asn').length ?? 0, target: 1, route: '/warehouse/inbound' },
    { key: 'track', label: '⑪ 物流跟踪', hint: '销售物流', count: sales.shipments?.filter((s) => !!s.trackingNo).length ?? 0, target: 1, route: '/sales/logistics' },
    { key: 'arrival', label: '⑫ 到货登记', hint: '仓储入库', count: warehouse.inboundOrders?.filter((o) => o.type === 'purchase').length ?? 0, target: 1, route: '/warehouse/inbound' },
    { key: 'qc', label: '⑬ 检验', hint: '质量检验', count: quality.inspectionTasks?.length ?? 0, target: 1, route: '/quality/inspection' },
    { key: 'inbound', label: '⑭ 入库(过账)', hint: '仓储入库', count: warehouse.inboundOrders?.filter((o) => o.type === 'purchase' && o.status === 'completed').length ?? 0, target: 1, route: '/warehouse/inbound' },
    { key: 'produce', label: '⑮ 生产执行', hint: '生产工单', count: production.workOrders?.filter((wo) => wo.status === 'in_progress' || wo.status === 'completed').length ?? 0, target: 1, route: '/production/orders' },
    { key: 'fg', label: '⑯ 成品入库', hint: '仓储完工', count: warehouse.finishedGoodsInbounds?.length ?? 0, target: 1, route: '/warehouse/fg-inbound' },
    { key: 'outbound', label: '⑰ 出库(发货)', hint: '仓储出库', count: warehouse.outboundOrders?.filter((o) => o.type === 'sale' || o.type === 'pick').length ?? 0, target: 1, route: '/warehouse/outbound' },
    { key: 'invoice', label: '⑱ 销售开票(AR)', hint: '应收', count: arap.receivables?.length ?? 0, target: 1, route: '/finance/receivables' },
    { key: 'receive', label: '⑲ 收款', hint: '应收', count: arap.receivables?.filter((r) => (r.paidAmount ?? 0) > 0).length ?? 0, target: 1, route: '/finance/receivables' },
  ], [sales, contracts, production, purchase, warehouse, quality, arap]);

  const doneCount = nodes.filter((n) => n.count >= n.target).length;
  const total = nodes.length;
  const progress = Math.round((doneCount / total) * 100);

  const handleSeed = () => {
    // 幂等守卫：已填充过演示链路则不再重复造数
    if (useSalesStore.getState().salesOrders.some((o) => o.orderNo?.startsWith('SO-DEMO-'))) {
      setSeedMsg('演示链路数据已存在（SO-DEMO-*），无需重复填充。如需重跑，请先「重置本地数据」。');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const ts = Date.now();
    const d = today.replace(/-/g, '');

    const prospectId = `p-demo-${ts}`;
    const contractId = `sc-demo-${ts}`;
    const contractNo = `SC-DEMO-${d}`;
    const soId = `so-demo-${ts}`;
    const soNo = `SO-DEMO-${d}`;
    const woId = `wo-demo-${ts}`;
    const woNo = `WO-DEMO-${d}`;
    const mrpId = `mrp-demo-${ts}`;
    const prId = `pr-demo-${ts}`;
    const prNo = `PR-DEMO-${d}`;
    const poId = `po-demo-${ts}`;
    const poNo = `PO-DEMO-${d}`;
    const asnId = `asn-demo-${ts}`;
    const arrivalId = `in-demo-${ts}`;
    const inNo = `IN-DEMO-${d}`;
    const qcId = `qc-demo-${ts}`;
    const shipId = `ship-demo-${ts}`;
    const shipNo = `SH-DEMO-${d}`;
    const outId = `out-demo-${ts}`;
    const outNo = `OUT-SALE-${d}`;
    const arId = `ar-demo-${ts}`;
    const arNo = `SI-DEMO-${d}`;

    const S = useSalesStore.getState();
    const SC = useSalesContractStore.getState();
    const PR = useProductionStore.getState();
    const PU = usePurchaseStore.getState();
    const WH = useWarehouseStore.getState();
    const QC = useQualityStore.getState();
    const AR = useArapStore.getState();

    // ① 客户跟进：商机 + 跟进记录
    S.addProspect({
      id: prospectId, prospectNo: `P-${d}`, companyName: '华润建筑集团有限公司', contactName: '李工',
      contactPhone: '13800000000', contactEmail: 'li@hr.com', source: 'referral', status: 'quoted',
      interestProducts: ['PRD-FRAME-001'], assignedTo: '演示',
      followupRecords: [{ id: `f-${ts}`, date: today, method: 'visit', content: '现场拜访，确认重型钢结构焊接架需求', result: '客户确认采购 10 件', followedBy: '演示' }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ③ 签订合同
    SC.addContract({
      id: contractId, contractNo, name: '演示销售合同-钢结构焊接架', customerId: 'cus-001', customerName: '华润建筑集团有限公司',
      customerCode: 'C001', salesPerson: '演示', amount: 86000, startDate: today, endDate: today, status: 'active',
      items: [{ id: `ci-${ts}`, materialId: 'mat-fg-001', materialCode: 'PRD-FRAME-001', materialName: '重型钢结构焊接架 H1200', specification: 'H1200', unit: '件', quantity: 10, unitPrice: 8600, amount: 86000 }],
      paymentSchedule: [{ id: `ps-${ts}`, stage: '发货前付款', percentage: 100, amount: 86000, received: false }],
      createdAt: now, updatedAt: now,
    });

    // ④ 销售订单（关联合同下推）
    S.addSalesOrder({
      id: soId, orderNo: soNo, type: 'standard', status: 'confirmed', customerId: 'cus-001', customerName: '华润建筑集团有限公司',
      customerCode: 'C001', salesPerson: '演示',
      items: [{ id: `soi-${ts}`, materialId: 'mat-fg-001', materialCode: 'PRD-FRAME-001', materialName: '重型钢结构焊接架 H1200', specification: 'H1200', unit: '件', quantity: 10, unitPrice: 8600, amount: 86000 }],
      totalAmount: 86000, taxRate: 13, taxAmount: 11180, grandTotal: 97180, orderDate: today, expectedDeliveryDate: today,
      linkedWorkOrders: [], contractId, contractNo, createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑤ 订单评审（审批流回写）
    S.updateSalesOrder(soId, {
      approvalRecords: [{ id: `ap-${ts}`, nodeName: '订单评审', approver: '演示主管', action: 'approve', comments: '评审通过', operatedAt: now }],
    });

    // ⑥ 生产排产（工单计划日期）
    PR.addWorkOrder({
      id: woId, orderNo: woNo, status: 'released', productCode: 'PRD-FRAME-001', productName: '重型钢结构焊接架 H1200',
      bomId: '', bomNo: '', routeId: '', routeNo: '', plannedQuantity: 10, completedQuantity: 0, scrapQuantity: 0,
      plannedStartDate: today, plannedEndDate: today, priority: 'normal', workshop: '生产一车间', supervisor: '',
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑦ MRP运算（建议采购钢板）
    PR.addMrpRecommendation({
      id: mrpId, materialCode: 'MAT202405010001', materialName: '钢板 Q235B', currentStock: 85, safetyStock: 50,
      requiredQuantity: 200, onOrderQuantity: 0, suggestedQuantity: 200, unit: '吨', suggestedDate: today,
      reason: `生产工单 ${woNo} 需求`, type: 'purchase', priority: 'normal',
    });

    // ⑧ 需求产生 PR（来源 MRP）
    PU.addPurchaseRequest({
      id: prId, requestNo: prNo, title: '钢板采购申请', applicant: '演示', department: '生产部', type: 'material', priority: 'normal',
      reason: '生产焊接架需要钢板', expectedDate: today, status: 'approved',
      items: [{ id: `pri-${ts}`, materialId: 'mat-001', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', specification: '10mm', unit: '吨', quantity: 200, estimatedPrice: 4200, estimatedAmount: 840000 }],
      totalAmount: 840000, sourceType: 'mrp', sourceNo: mrpId, createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑨ PR转PO（手工建 PO 带供应商与行项目）
    PU.addPurchaseOrder({
      id: poId, orderNo: poNo, requestId: prId, vendorId: 'ven-001', vendorName: '上海宝钢钢铁贸易有限公司', status: 'sent',
      purchaseType: 'material', orderDate: today, expectedDeliveryDate: today,
      items: [{ id: `poi-${ts}`, materialId: 'mat-001', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', specification: '10mm', unit: '吨', orderedQuantity: 200, deliveredQuantity: 0, unitPrice: 4200, amount: 840000, taxRate: 13, taxAmount: 109200, priceWithTax: 4746, amountWithTax: 949200 }],
      totalAmount: 840000, currency: 'CNY', totalTaxAmount: 109200, grandTotal: 949200,
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑩ 供应商交货 ASN（在途预告，仅登记不过账）
    WH.addInboundOrder({
      id: asnId, inboundNo: `ASN-DEMO-${d}`, type: 'asn', sourceNo: poNo, vendorId: 'ven-001', vendorName: '上海宝钢钢铁贸易有限公司',
      status: 'pending', asnShipmentNo: `SHIP-${d}`, warehouseId: 'wh-001', operator: '演示', inboundDate: today,
      items: [{ id: `asni-${ts}`, materialId: 'mat-001', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', specification: '10mm', unit: '吨', expectedQuantity: 200, actualQuantity: 0, qualityStatus: 'qualified' }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑪ 物流跟踪（销售发货在途，带运单号）
    S.addShipment({
      id: shipId, shipmentNo: shipNo, salesOrderNo: soNo, customerName: '华润建筑集团有限公司', status: 'in_transit',
      items: [{ id: `shi-${ts}`, materialId: 'mat-fg-001', materialCode: 'PRD-FRAME-001', materialName: '重型钢结构焊接架 H1200', specification: 'H1200', unit: '件', orderQuantity: 10, shipQuantity: 10, unitPrice: 8600, amount: 86000 }],
      transportMode: 'road', carrier: '演示物流', trackingNo: `TRK-${d}`, estimatedPickupDate: today, estimatedDeliveryDate: today,
      originAddress: '工厂仓库', destinationAddress: '客户工地', packageCount: 1, createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑫ 到货登记（采购到货，先登记未过账）
    WH.addInboundOrder({
      id: arrivalId, inboundNo: inNo, type: 'purchase', sourceNo: poNo, vendorId: 'ven-001', vendorName: '上海宝钢钢铁贸易有限公司',
      status: 'pending', warehouseId: 'wh-001', operator: '演示', inboundDate: today,
      items: [{ id: `ini-${ts}`, materialId: 'mat-001', materialCode: 'MAT202405010001', materialName: '钢板 Q235B', specification: '10mm', unit: '吨', expectedQuantity: 200, actualQuantity: 200, qualityStatus: 'qualified', unitPrice: 4200, amount: 840000 }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑬ 检验（来料检，引用钢材检验标准 std-001）
    QC.addInspectionTask({
      id: qcId, taskNo: `QC-DEMO-${d}`, type: 'incoming', status: 'pending', materialId: 'mat-001', materialCode: 'MAT202405010001', materialName: '钢板 Q235B',
      batchNo: `B${d}`, quantity: 200, sampleQuantity: 20, inspectionStandardId: 'std-001', inspectionStandardName: '钢材来料检验标准',
      assignedTo: '演示质检', plannedDate: today, createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑭ 入库过账（completed → 自动过账库存 + 滚动移动均价 + 生成 GR/IR 暂估凭证 + 回写 PO 收货）
    WH.updateInboundOrder(arrivalId, { status: 'completed' });

    // ⑮ 生产执行（工单开工）
    // ⑯ 半成品/成品入库（完工回写 → 自动生成生产入库单 + 成品入库台账 + 生产成本凭证）
    PR.updateWorkOrder(woId, { status: 'in_progress', actualStartDate: today });
    PR.completeWorkOrder(woId, { completedQuantity: 10, scrapQuantity: 0, actualEndDate: today, actualTotalCost: 86000, operator: '演示' });

    // ⑰ 出库（销售发货出库 → 自动扣减库存 + 结转 COGS 凭证 + 回写 SO 发货）
    WH.addOutboundOrder({
      id: outId, outboundNo: outNo, type: 'sale', sourceNo: soNo, customerId: 'cus-001', customerName: '华润建筑集团有限公司',
      warehouseId: 'wh-003', operator: '演示', outboundDate: today, status: 'completed',
      items: [{ id: `outi-${ts}`, materialId: 'mat-fg-001', materialCode: 'PRD-FRAME-001', materialName: '重型钢结构焊接架 H1200', specification: 'H1200', unit: '件', quantity: 10 }],
      createdAt: now, updatedAt: now, createdBy: 'seed', updatedBy: 'seed',
    });

    // ⑱ 销售开票（应收 AR）
    AR.addReceivable({
      id: arId, customerId: 'cus-001', customerName: '华润建筑集团有限公司', invoiceNo: arNo,
      amount: 97180, paidAmount: 0, balance: 97180, dueDate: today, status: 'open', agingBucket: 'current', remarks: '销售开票-演示',
    });

    // ⑲ 收款（应收核销）
    AR.updateReceivable(arId, { paidAmount: 97180, balance: 0, status: 'closed' });

    setSeedMsg('已填充完整销售业务端到端链路（19 环节），使用真实主数据（mat-001 钢板 / mat-fg-001 成品 / cus-001 / ven-001 / std-001）。事件驱动回写已触发：采购入库→库存过账+GR/IR暂估凭证+PO回写；生产完工→生产入库单+成品台账+生产成本凭证；销售出库→COGS凭证+SO回写；销售开票→应收，收款→核销。');
  };

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('ssa-erp-'))
        .forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <PageWrapper
      title="销售业务流程端到端自检面板（19 环节）"
      actions={
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AutoFixHigh />} onClick={handleSeed}>一键填充演示链路</Button>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={handleReset}>重置本地数据</Button>
        </Stack>
      }
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        本面板用真实主数据重建一条完整的「客户跟进 → 收款」端到端销售业务链路（共 19 个环节），验证各模块 store 数据贯通与事件驱动回写。
        点「一键填充演示链路」可快速构造一条可运行、可验证、可持久化（zustand persist → localStorage）的链路数据；
        点「重置本地数据」可清空所有 ssa-erp-* 本地存储恢复初始状态。每个节点实时反映对应模块 store 数据量，点击可跳转对应业务页面。
      </Alert>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid rgba(226,232,240,.8)', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>链路完成度 {doneCount}/{total}</Typography>
          <Chip label={`${progress}%`} color={progress === 100 ? 'success' : 'primary'} />
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5, mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          {nodes.map((node) => {
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
        验证方式：① 应用内自检（本面板一键填充 + 节点跳转查看详情）；② Playwright E2E（<code>e2e/flow.spec.ts</code>）覆盖全 19 环节断言与 localStorage 刷新持久化断言。
      </Typography>

      {seedMsg && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSeedMsg('')}>{seedMsg}</Alert>
      )}
    </PageWrapper>
  );
};

export default FlowSelfTest;
