import { WorkOrder, ProcessRoute, WorkCenter } from '@/types/production';

export interface CRPLine {
  workCenterId: string;
  name: string;
  capacityHours: number;      // 日产能（小时）
  requiredHours: number;      // 需求工时（来自未完工工单工序）
  loadPct: number;            // 负荷率 = requiredHours / capacityHours
  orderCount: number;         // 涉及工单数
}

export interface CRPResult {
  lines: CRPLine[];
  totalCapacity: number;
  totalRequired: number;
  overloadCount: number;      // 负荷率 > 100% 的资源数
}

/**
 * CRP 产能需求计划：把所有未完工工单按工艺路线展开，累计各工作中心的工序需求工时，
 * 与日产能比较得出负荷率。runTime 单位为 分钟/件，setupTime 为分钟。
 */
export function computeCRP(
  workOrders: WorkOrder[],
  routes: ProcessRoute[],
  workCenters: WorkCenter[],
): CRPResult {
  // 仅统计未完工（draft/released/in_progress）工单
  const active = workOrders.filter((w) => w.status !== 'completed' && w.status !== 'closed');
  const reqMap = new Map<string, { requiredHours: number; orderCount: number }>();

  for (const wo of active) {
    const route =
      routes.find((r) => r.id === wo.routeId) ||
      routes.find((r) => r.routeNo === wo.routeNo) ||
      routes.find((r) => r.productCode === wo.productCode);
    if (!route) continue;
    for (const op of route.operations) {
      const wcName = op.workCenter;
      const perPieceMin = (op.setupTime + op.runTime * wo.plannedQuantity) / 60; // 小时
      const prev = reqMap.get(wcName) || { requiredHours: 0, orderCount: 0 };
      reqMap.set(wcName, {
        requiredHours: prev.requiredHours + perPieceMin,
        orderCount: prev.orderCount + 1,
      });
    }
  }

  const lines: CRPLine[] = workCenters.map((wc) => {
    const agg = reqMap.get(wc.name) || { requiredHours: 0, orderCount: 0 };
    const requiredHours = Math.round(agg.requiredHours * 100) / 100;
    return {
      workCenterId: wc.id,
      name: wc.name,
      capacityHours: wc.capacityHours,
      requiredHours,
      loadPct: wc.capacityHours > 0 ? Math.round((requiredHours / wc.capacityHours) * 1000) / 10 : 0,
      orderCount: agg.orderCount,
    };
  });

  const totalCapacity = lines.reduce((s, l) => s + l.capacityHours, 0);
  const totalRequired = Math.round(lines.reduce((s, l) => s + l.requiredHours, 0) * 100) / 100;
  const overloadCount = lines.filter((l) => l.loadPct > 100).length;

  return { lines, totalCapacity, totalRequired, overloadCount };
}
