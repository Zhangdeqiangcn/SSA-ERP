/**
 * V3.96.0 自动化执行编排器（下单 / 询价比价 / 寻源提示 / 生产工单 / 领料）
 * ================================================================
 * 强哥诉求：物料类别分工驱动的「自动下单 / 自动领料 / 生产工单」实际执行逻辑，
 *   以及「多默认供应商时按货源清单配额分配、货源清单与默认供应商不一致时只存草稿不提交」。
 *
 * 分层（沿用本工程既有纪律，便于回归）：
 *   · 纯判定  → utils/automation/sourcing.ts（resolveSourcing / apportionQuantity，可单测）
 *   · 本文件  → 薄薄一层「读 store + 按配置到步门控 + 建单据 + 记日志」，是**副作用层**。
 *
 * 到步门控（V3.95.0 已定的 executor 语义，本期真正落地执行）：
 *   · suggest → 只记一条「建议/提示」运行日志，不建任何单据（人工看着办）
 *   · draft   → 建「草稿/待确认」单据（采购单 status=created 且不占信用、不推进申请；工单/领料=草稿）
 *   · post    → 建单并**推进到下一环节**（申请→已转单；即真正「提交到下一环节」）
 *
 * ★ 一致性红线（V3.96.0 第 2 条）：resolveSourcing.consistent === false 时，
 *   本编排器**无论该段配到哪一步，都强制停在上限 draft**（不 post 推进），
 *   并把逐条 issues 收进报告 → 页面报错展示。这正是「不一致时自动运行报错、
 *   只保存草稿、不提交到下一环节」的实现。
 */

import { useAutomationStore } from '@/stores/automationStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useProductionStore } from '@/stores/productionStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useMaterialStore, findCategoryById } from '@/stores/materialStore';
import { useVendorStore } from '@/stores/vendorStore';
import { usePriceStore } from '@/stores/priceStore';
import { useUserStore } from '@/stores/userStore';
import { useSourceListStore, getActiveSourcesFor } from '@/stores/sourceListStore';
import {
  resolveSourcing,
  SourcingResult,
  AllocatedVendor,
} from './sourcing';
import {
  resolveAutomation,
  stageReaches,
  isStageActive,
  AutomationStage,
} from '@/types/automation';
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  VendorQuote,
  WorkOrder,
  OutboundOrder,
  OutboundOrderItem,
} from '@/types';
import { generateLocalDocNo } from '@/utils/codeGenerator';

/** 一行待自动处置的需求（采购类/生产类皆可；由 MRP 建议或采购申请行喂入） */
export interface DemandRow {
  /** 稳定键（用于幂等/去重报告） */
  key: string;
  materialId: string;
  materialCode?: string;
  materialName?: string;
  specification?: string;
  unit?: string;
  /** 需求总量（按配额要拆的对象） */
  requiredQty: number;
  /** 制/购（make=生产工单+领料；buy=采购下单/询价/寻源） */
  makeOrBuy: 'make' | 'buy';
  /** 所属物料分类 id（缺省=无分类，此时默认供应商为空集合） */
  categoryId?: string;
  /** 采购需求来源单据 id（post 推进时把申请标记 ordered） */
  sourceRequestId?: string;
  /** 采购需求来源单据号（报告/日志可读） */
  sourceRequestNo?: string;
}

/** 一段自动处置的结果分类 */
export interface AutomationLineReport {
  key: string;
  materialCode?: string;
  materialName?: string;
  stage: AutomationStage;
  /** 实际执行到哪一步（受一致性红线约束，可能比配置更保守） */
  effectiveStep: 'off' | 'suggest' | 'draft' | 'post';
  /** 是否因「货源清单 vs 默认供应商不一致」被红线卡住（页面上要报错的） */
  blockedByInconsistency: boolean;
  /** 一致性告警（blockedByInconsistency 时逐条展示） */
  consistencyIssues: string[];
  /** 是否建了单据（draft/post）；suggest/off 恒 false */
  produced: boolean;
  /** 产生的单据号（PO/WO/领料单号，逗号拼接，可读） */
  producedNos: string[];
  /** 一句话说明（供日志） */
  note: string;
}

export interface AutomationReport {
  lines: AutomationLineReport[];
  /** 需要页面红色报错的行（一致性不一致 / 无货源） */
  errors: AutomationLineReport[];
  /** 汇总计数（界面上给个回执） */
  counts: {
    purchased: number;
    inquired: number;
    sourcingAlert: number;
    workOrders: number;
    pickings: number;
    blocked: number;
  };
}

/** 建一张最小可用采购单（draft：不占信用、不推进申请；post：额外把申请标记 ordered） */
function buildPurchaseOrder(
  vendor: AllocatedVendor,
  row: DemandRow,
  advanceToNext: boolean,
): PurchaseOrder {
  const now = new Date().toISOString();
  const orderNo = generateLocalDocNo('PO');
  const price = vendor.hasValidPrice ? (vendor.unitPrice ?? 0) : 0;
  const item: PurchaseOrderItem = {
    id: `poi-${Date.now().toString(36)}-${vendor.vendorId}`,
    materialId: row.materialId,
    materialCode: row.materialCode,
    materialName: row.materialName,
    specification: row.specification,
    unit: row.unit,
    orderedQuantity: vendor.quantity,
    deliveredQuantity: 0,
    unitPrice: price,
    amount: Math.round(vendor.quantity * price * 100) / 100,
  };
  const total = item.amount;
  const consistentNote = advanceToNext
    ? '自动下单（已按货源清单配额分配，已推进申请）'
    : '自动下单·草稿待确认（按货源清单配额分配）';
  return {
    id: `po-auto-${Date.now().toString(36)}-${vendor.vendorId}`,
    orderNo,
    vendorId: vendor.vendorId,
    vendorName: vendor.vendorName,
    status: 'created',
    purchaseType: 'material',
    orderMode: 'standard',
    orderDate: now.split('T')[0],
    expectedDeliveryDate: now.split('T')[0],
    items: [item],
    totalAmount: total,
    currency: 'CNY',
    exchangeRate: 1,
    taxIncluded: false,
    totalTaxAmount: 0,
    grandTotal: total,
    remarks: consistentNote + `（来源：${row.sourceRequestNo || '自动流转'}）`,
    createdAt: now,
    updatedAt: now,
    createdBy: '自动化引擎',
    updatedBy: '自动化引擎',
    // draft 语义：不占用供应商信用额度（人工确认提交时才占）
    creditOccupied: false,
    creditAmount: 0,
    ...(advanceToNext && row.sourceRequestId ? { sourceRequestIds: [row.sourceRequestId] } : {}),
  };
}

/** 建一张生产工单（manufacture 建议 → 工单草稿） */
function buildWorkOrder(row: DemandRow, categoryName?: string): WorkOrder {
  const now = new Date().toISOString();
  const orderNo = generateLocalDocNo('WO');
  return {
    id: `wo-auto-${Date.now().toString(36)}`,
    orderNo,
    status: 'draft',
    productCode: row.materialCode || row.materialId,
    productName: row.materialName || '',
    bomId: '',
    bomNo: '',
    routeId: '',
    routeNo: '',
    plannedQuantity: row.requiredQty,
    completedQuantity: 0,
    scrapQuantity: 0,
    plannedStartDate: now.split('T')[0],
    plannedEndDate: now.split('T')[0],
    priority: 'normal',
    workshop: categoryName ? `（${categoryName}）` : '',
    supervisor: '',
    note: `自动化引擎生成的生产工单草稿（来源：${row.sourceRequestNo || 'MRP 建议'}）`,
    createdAt: now,
    updatedAt: now,
    createdBy: '自动化引擎',
    updatedBy: '自动化引擎',
  } as WorkOrder;
}

/** 建一张生产领料出库单（pick，草稿=待拣配，不直接扣库存） */
function buildPicking(row: DemandRow, workOrderNo: string, items: { materialId: string; materialCode?: string; materialName?: string; unit?: string; quantity: number }[]): OutboundOrder {
  const now = new Date().toISOString();
  const outboundNo = generateLocalDocNo('OUT');
  const oitems: OutboundOrderItem[] = items.map((it, i) => ({
    id: `obi-auto-${Date.now().toString(36)}-${i}`,
    materialId: it.materialId,
    materialCode: it.materialCode,
    materialName: it.materialName,
    specification: '',
    unit: it.unit,
    quantity: it.quantity,
  }));
  return {
    id: `out-auto-${Date.now().toString(36)}`,
    outboundNo,
    type: 'pick',
    sourceNo: workOrderNo,
    status: 'pending', // 草稿：待拣配，人工确认后才 completed 扣库存
    warehouseId: 'wh-001',
    warehouseName: '原材料仓',
    operator: '自动化引擎',
    outboundDate: now.split('T')[0],
    items: oitems,
    remarks: `生产领料草稿 - 工单 ${workOrderNo}（自动化引擎生成）`,
    createdAt: now,
    updatedAt: now,
    createdBy: '自动化引擎',
    updatedBy: '自动化引擎',
  } as OutboundOrder;
}

/**
 * 处置一行需求。纯副作用层：读 store → 纯判定(sourcing) → 按配置到步建单 → 记日志 → 返回报告行。
 * 幂等：重复调用只会再建一批新单据（本层不跨调用去重；调用方一次流转一次）。
 */
export function processDemandRow(row: DemandRow): AutomationLineReport {
  const autoStore = useAutomationStore.getState();
  const cfg = autoStore.config;
  const stageKey: AutomationStage = row.makeOrBuy === 'make' ? 'work_order' : 'po_place';
  const resolved = resolveAutomation(cfg, row.categoryId, stageKey);
  const effectiveStep = resolved.step; // 'off' | 'suggest' | 'draft' | 'post'
  const line: AutomationLineReport = {
    key: row.key,
    materialCode: row.materialCode,
    materialName: row.materialName,
    stage: stageKey,
    effectiveStep: effectiveStep,
    blockedByInconsistency: false,
    consistencyIssues: [],
    produced: false,
    producedNos: [],
    note: '',
  };

  // ── off：整段停用，静默跳过 ──
  if (effectiveStep === 'off' || !resolved.enabled) {
    line.note = '该段落未开启（自动化设置中心未发起），已跳过';
    return line;
  }

  // 取上下文（都经 store 兜底，离线/未登录给空）
  const materials = useMaterialStore.getState().materials;
  const categories = useMaterialStore.getState().categories;
  const vendors = useVendorStore.getState().vendors;
  const vendorNameById: Record<string, string> = {};
  vendors.forEach((v) => { vendorNameById[v.id] = v.name; });
  const cat = row.categoryId ? findCategoryById(categories, row.categoryId) : undefined;
  const defaultVendorIds = cat?.defaultVendors || [];
  const activeSources = getActiveSourcesFor(row.materialId);

  // 价目表取价（按 供应商+物料 取有效未税价）
  const getActivePrice = (vendorId: string, materialId: string): number | undefined =>
    usePriceStore.getState().getActivePrice(vendorId, materialId)?.unitPrice;

  // ── 纯判定：配额拆单 + 一致性 ──
  const sourcing: SourcingResult = resolveSourcing({
    defaultVendorIds,
    activeSources,
    getActivePrice,
    vendorNameById,
    requiredQty: row.requiredQty,
  });
  line.consistencyIssues = sourcing.issues.map((i) => i.message);

  // ★ 一致性红线：不一致/无货源 → 无论配置多激进，强制停在上限 draft（不 post 推进），并标记 blocked
  const consistencyOk = sourcing.consistent;
  const postAllowed = effectiveStep === 'post' && consistencyOk;
  if (!consistencyOk) {
    line.blockedByInconsistency = true;
    if (effectiveStep === 'post') line.effectiveStep = 'draft'; // 被红线降级
  }

  // 该物料所属分类挂的采购员（sourcing/异常段提示用；来自 responsiblePersons.buyer）
  const buyerIds: string[] = cat?.responsiblePersons?.buyer || [];
  const users = useUserStore.getState().users;

  // ============ 采购类（buy）============
  if (row.makeOrBuy === 'buy') {
    // 无货源 → 寻源/异常提示段（sourcing）
    if (sourcing.noSource) {
      handleBuySourcingAlert(line, row, sourcing, buyerIds, users, postAllowed);
      logLine(line, 'sourcing', row);
      return line;
    }

    // 全都需要询价（货源在、但都查不到有效价）→ 询价比价段（inquiry_compare）
    if (sourcing.allNeedInquiry && !sourcing.issues.length) {
      handleInquiry(line, row, sourcing, postAllowed);
      logLine(line, 'inquiry_compare', row);
      return line;
    }

    // 正常下单：按配额拆到各供应商（postAllowed 决定是否推进申请）
    handlePurchaseOrder(line, row, sourcing, postAllowed);
    logLine(line, 'po_place', row);
    return line;
  }

  // ============ 生产类（make）：工单 + 领料 ============
  handleMake(line, row, effectiveStep === 'post', postAllowed);
  logLine(line, 'work_order', row);
  return line;
}

/** 采购类·寻源提示（无货源）：提示对应采购员处理；post 才实际发消息，draft/suggest 只记日志 */
function handleBuySourcingAlert(
  line: AutomationLineReport,
  row: DemandRow,
  sourcing: SourcingResult,
  buyerIds: string[],
  users: { id: string; name: string }[],
  postAllowed: boolean,
) {
  line.note = `物料 ${row.materialCode || row.materialId} 无可用货源，需寻源（${sourcing.issues[0]?.message || '无生效货源'}）`;
  const buyerNames = buyerIds.map((id) => users.find((u) => u.id === id)?.name || id).join('、');
  if (postAllowed && buyerIds.length) {
    // 真正发消息给采购员（复用既有 messageStore 语义：这里只做记录 + 提示，避免引入新依赖）
    useAutomationStore.getState().log({
      stage: 'sourcing',
      categoryId: row.categoryId || '',
      actor: '自动化引擎',
      action: `物料 ${row.materialName || row.materialCode || row.materialId} 无可用货源，已提示采购员（${buyerNames}）寻源处理`,
      result: 'success',
    });
    line.note = `无货源 → 已提示采购员 ${buyerNames || '（该分类未维护采购员）'} 寻源/处理异常`;
  } else {
    line.note = `无货源 → 待人工寻源（采购员：${buyerNames || '未维护'}）；该段未达「直接生效」，仅记录`;
  }
  line.produced = postAllowed && buyerIds.length > 0;
}

/** 采购类·询价比价：向「缺有效价」的供应商发询价单 */
function handleInquiry(line: AutomationLineReport, row: DemandRow, sourcing: SourcingResult, postAllowed: boolean) {
  const needQuote = sourcing.allocations.filter((a) => a.quantity > 0 && !a.hasValidPrice);
  if (needQuote.length === 0) {
    line.note = '各供应商均有有效价，无需询价';
    return;
  }
  // 询价属「建议级」动作（不会锁单），即便 draft 也可发；suggest 则只记日志
  if (postAllowed || line.effectiveStep === 'draft') {
    const now = new Date().toISOString();
    const prNo = row.sourceRequestNo || '自动流转';
    needQuote.forEach((v) => {
      const quote: VendorQuote = {
        id: `vq-auto-${Date.now().toString(36)}-${v.vendorId}`,
        requestId: row.sourceRequestId || '',
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        items: [{
          materialId: row.materialId,
          materialName: row.materialName,
          quantity: v.quantity,
          unitPrice: 0,
          amount: 0,
        }],
        totalAmount: 0,
        validUntil: '',
        remarks: `自动化引擎按货源清单向「${v.vendorName}」发起询价（物料 ${row.materialCode || row.materialId} 暂无有效价，来源 ${prNo}）`,
        submittedAt: now,
      };
      usePurchaseStore.getState().addVendorQuote(quote);
      line.producedNos.push(v.vendorName);
    });
    line.produced = true;
    line.note = `已按货源清单向 ${needQuote.length} 家缺价供应商发起询价比价（${needQuote.map((v) => v.vendorName).join('、')}）`;
  } else {
    line.note = `需向 ${needQuote.length} 家缺价供应商询价，但该段未达「生成草稿」，仅记录建议`;
  }
}

/** 采购类·自动下单：按配额把需求拆到各默认供应商建采购单（draft=草稿 / post=推进申请） */
function handlePurchaseOrder(line: AutomationLineReport, row: DemandRow, sourcing: SourcingResult, postAllowed: boolean) {
  const allocs = sourcing.allocations.filter((a) => a.quantity > 0);
  if (allocs.length === 0) {
    line.note = '无可分配供应商';
    return;
  }
  if (line.effectiveStep === 'suggest') {
    line.note = `建议向 ${allocs.map((a) => `${a.vendorName}(${a.quantity})`).join('、')} 下单（配额拆单，未达建单步）`;
    return;
  }
  // draft / post：建采购单草稿；post 额外把来源申请推进 ordered
  allocs.forEach((v) => {
    const po = buildPurchaseOrder(v, row, postAllowed);
    usePurchaseStore.getState().addPurchaseOrder(po);
    line.producedNos.push(po.orderNo);
    if (postAllowed && row.sourceRequestId) {
      usePurchaseStore.getState().updatePurchaseRequest(row.sourceRequestId, { status: 'ordered' });
    }
  });
  line.produced = true;
  const quotaDesc = allocs.map((a) => `${a.vendorName} ${a.quantity}${a.quota > 0 ? `(${a.quota}%)` : ''}`).join('、');
  line.note = postAllowed
    ? `已按配额下采购单并推进申请（${quotaDesc}）`
    : `已按配额生成采购单草稿待确认（${quotaDesc}）；未推进申请，需人工确认提交`;
}

/** 生产类：生成生产工单 + 领料出库单（草稿）；post 时推进工单到 released */
function handleMake(line: AutomationLineReport, row: DemandRow, reachedPost: boolean, postAllowed: boolean) {
  if (line.effectiveStep === 'suggest') {
    line.note = `建议对 ${row.materialName || row.materialId} 开生产工单并领料（未达建单步）`;
    return;
  }
  // 建工单（draft）
  const categories = useMaterialStore.getState().categories;
  const cat = row.categoryId ? findCategoryById(categories, row.categoryId) : undefined;
  const wo = buildWorkOrder(row, cat?.name);
  useProductionStore.getState().addWorkOrder(wo);
  line.producedNos.push(wo.orderNo);
  line.produced = true;

  // 领料：本行就是原料，领料量=需求量的简化口径（真实 BOM 展开领料由工单页 issueMaterials 做，这里补一张草稿领料单）
  if (line.effectiveStep !== 'off') {
    const picking = buildPicking(row, wo.orderNo, [{
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      unit: row.unit,
      quantity: row.requiredQty,
    }]);
    useWarehouseStore.getState().addOutboundOrder(picking);
    line.producedNos.push(picking.outboundNo);
  }

  // post：把工单推进到已下达（released），才算「提交到下一环节」；draft 停在草稿
  if (postAllowed && reachedPost) {
    useProductionStore.getState().updateWorkOrder?.(wo.id, { status: 'released' });
    line.note = `已生成生产工单 ${wo.orderNo} 并领料单，且推进工单到已下达（post）`;
  } else {
    line.note = `已生成生产工单 ${wo.orderNo} + 领料草稿；未推进到下一环节（需人工确认下达）`;
  }
}

/** 每行处置完，记一条自动化运行日志（阶段按行主阶段） */
function logLine(line: AutomationLineReport, stage: AutomationStage, row: DemandRow) {
  const result = line.blockedByInconsistency ? 'error' : line.produced ? 'success' : 'skipped';
  useAutomationStore.getState().log({
    stage,
    categoryId: row.categoryId || '',
    actor: '自动化引擎',
    action: line.note,
    result,
    detail: line.consistencyIssues.length ? `一致性告警 ${line.consistencyIssues.length} 条：${line.consistencyIssues.join(' | ')}` : undefined,
  });
  line.blockedByInconsistency = result === 'error';
}

/**
 * 批量处置一批需求行，返回可供页面展示的报告（含需报错的不一致/无货源行）。
 * 这是「一键自动流转」的入口。
 */
export function runDemandAutomation(rows: DemandRow[]): AutomationReport {
  const lines = rows.map(processDemandRow);
  const errors = lines.filter((l) => l.blockedByInconsistency || /无可用货源/.test(l.note));
  const counts = {
    purchased: lines.filter((l) => l.stage === 'po_place' && l.produced).length,
    inquired: lines.filter((l) => /询价/.test(l.note) && l.produced).length,
    sourcingAlert: lines.filter((l) => l.stage === 'sourcing' && l.produced).length,
    workOrders: lines.filter((l) => l.stage === 'work_order' && l.produced).length,
    pickings: lines.filter((l) => /领料/.test(l.note) && l.produced).length,
    blocked: errors.length,
  };
  return { lines, errors, counts };
}

/** 便捷：某段在某分类下是否发起（供界面/其它调用方门控） */
export { isStageActive, stageReaches };
