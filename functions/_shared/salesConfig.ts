// 销售域父子表配置（C1 · V3.9.0）
//
// 三张配置驱动 /api/sales-prospects、/api/shipments、/api/projects 六个端点，
// 实际 CRUD 逻辑在 `_shared/parentChild.ts`（通用父子表助手，本轮扩展为多子表）。
//
// ── 列名来源 ────────────────────────────────────────────────────
// 全部列名由 `src/types/sales.ts` 的 Prospect / Shipment / Project 及其子接口
// 反推（snake_case），**不按「销售上应该长什么样」推断**。
// 这条纪律来自 0053 的教训：当时按会计常识推断了财务三张表的列名，
// 结果三张表与前端契约完全对不上，且通用路由 pickSnake 会静默丢弃未登记字段、
// 仍然返回 201 成功 —— 表现为「列表有行数、详情全空」，极难定位。
//
// ── 为什么销售域的嵌套比财务域复杂得多 ──────────────────────────
// 财务域两张表各只有 1 个嵌套数组（installments / costItems），单子表够用。
// 销售域：
//   · Prospect  2 个数组：interestProducts: string[]、followupRecords: FollowupRecord[]
//   · Shipment  1 个数组：items: ShipmentItem[]
//   · Project   3 个数组：team: string[]、milestones[]、exceptions[]
// 因此 parentChild.ts 在本轮被扩展为 children: ChildSpec[]（多子表），
// 而字符串数组（interestProducts / team / linkedOrders）走父表 JSON 文本列。
import type { ParentChildConfig } from './parentChild';

/** 意向客户：父 sales_prospects + 子 sales_prospect_followups */
export const PROSPECT_PC: ParentChildConfig = {
  parentTable: 'sales_prospects',
  module: 'sales', // P0-1：sales_manager/salesperson 已有 sales 写权
  children: [
    {
      childTable: 'sales_prospect_followups',
      childFkCol: 'prospect_id',
      childField: 'followupRecords',
      childCols: [
        ['seq', 'seq'],
        ['date', 'date'],
        ['method', 'method'],
        ['content', 'content'],
        ['result', 'result'],
        ['next_action', 'nextAction'],
        ['followed_by', 'followedBy'],
      ],
      childOrder: 'seq ASC, date ASC',
    },
  ],
  parentCols: [
    ['prospect_no', 'prospectNo'],
    ['company_name', 'companyName'],
    ['contact_name', 'contactName'],
    ['contact_phone', 'contactPhone'],
    ['contact_email', 'contactEmail'],
    ['industry', 'industry'],
    ['region', 'region'],
    ['source', 'source'],
    ['status', 'status'],
    ['estimated_value', 'estimatedValue'],
    ['probability', 'probability'],
    ['next_followup_date', 'nextFollowupDate'],
    ['assigned_to', 'assignedTo'],
    ['converted_to_customer', 'convertedToCustomer'],
    ['credit_limit', 'creditLimit'],
    ['used_credit', 'usedCredit'],
    ['notes', 'notes'],
  ],
  // 字符串数组：无 id、无属性、不参与 SQL 统计 → JSON 文本列
  jsonCols: [['interest_products', 'interestProducts']],
  label: '意向客户',
  noSnake: 'prospect_no',
  noCamel: 'prospectNo',
};

/** 物流发货：父 shipments + 子 shipment_items */
export const SHIPMENT_PC: ParentChildConfig = {
  parentTable: 'shipments',
  module: 'sales', // P0-1：发货属销售履约，sales 写角色覆盖
  children: [
    {
      childTable: 'shipment_items',
      childFkCol: 'shipment_id',
      childField: 'items',
      childCols: [
        ['seq', 'seq'],
        ['material_id', 'materialId'],
        ['material_code', 'materialCode'],
        ['material_name', 'materialName'],
        ['specification', 'specification'],
        ['unit', 'unit'],
        ['order_quantity', 'orderQuantity'],
        ['ship_quantity', 'shipQuantity'],
        ['unit_price', 'unitPrice'],
        ['amount', 'amount'],
      ],
      childOrder: 'seq ASC',
    },
  ],
  parentCols: [
    ['shipment_no', 'shipmentNo'],
    ['warehouse_id', 'warehouseId'],
    ['sales_order_no', 'salesOrderNo'],
    ['project_no', 'projectNo'],
    ['project_name', 'projectName'],
    ['customer_name', 'customerName'],
    ['status', 'status'],
    ['transport_mode', 'transportMode'],
    ['carrier', 'carrier'],
    ['tracking_no', 'trackingNo'],
    ['ship_date', 'shipDate'],
    ['estimated_pickup_date', 'estimatedPickupDate'],
    ['estimated_delivery_date', 'estimatedDeliveryDate'],
    ['actual_pickup_date', 'actualPickupDate'],
    ['actual_delivery_date', 'actualDeliveryDate'],
    ['origin_address', 'originAddress'],
    ['destination_address', 'destinationAddress'],
    ['driver_name', 'driverName'],
    ['driver_phone', 'driverPhone'],
    ['vehicle_no', 'vehicleNo'],
    ['total_weight', 'totalWeight'],
    ['total_volume', 'totalVolume'],
    ['package_count', 'packageCount'],
    ['freight', 'freight'],
    ['insurance', 'insurance'],
    ['notes', 'notes'],
  ],
  label: '发货单',
  noSnake: 'shipment_no',
  noCamel: 'shipmentNo',
};

/**
 * 项目管理：父 projects + 子 project_milestones + 子 project_exceptions
 *
 * ★ 这是本域风险最高的一处：`Project` 一次带**三个**数组。
 *   若沿用单子表配置，第二、三个数组会被静默丢弃 —— 表现为
 *   「项目详情页能打开、进度条正常，但里程碑列表和异常列表全空」，
 *   没有任何报错。因此这里给两个真正的子表，`team` 走 JSON 列。
 */
export const PROJECT_PC: ParentChildConfig = {
  parentTable: 'projects',
  module: 'sales', // P0-1：销售项目属销售域，sales 写角色覆盖
  children: [
    {
      childTable: 'project_milestones',
      childFkCol: 'project_id',
      childField: 'milestones',
      childCols: [
        ['seq', 'seq'],
        ['name', 'name'],
        ['planned_date', 'plannedDate'],
        ['actual_date', 'actualDate'],
        ['status', 'status'],
        ['description', 'description'],
        ['deliverable', 'deliverable'],
      ],
      childOrder: 'seq ASC, planned_date ASC',
    },
    {
      childTable: 'project_exceptions',
      childFkCol: 'project_id',
      childField: 'exceptions',
      childCols: [
        ['seq', 'seq'],
        ['exception_no', 'exceptionNo'],
        ['type', 'type'],
        ['severity', 'severity'],
        ['title', 'title'],
        ['description', 'description'],
        ['reported_by', 'reportedBy'],
        ['reported_at', 'reportedAt'],
        ['status', 'status'],
        ['resolution', 'resolution'],
        ['resolved_by', 'resolvedBy'],
        ['resolved_at', 'resolvedAt'],
        ['impact_description', 'impactDescription'],
      ],
      childOrder: 'seq ASC, reported_at DESC',
    },
  ],
  parentCols: [
    ['project_no', 'projectNo'],
    ['project_name', 'projectName'],
    ['customer_name', 'customerName'],
    ['customer_code', 'customerCode'],
    ['status', 'status'],
    ['start_date', 'startDate'],
    ['end_date', 'endDate'],
    ['contract_amount', 'contractAmount'],
    ['received_amount', 'receivedAmount'],
    ['budget', 'budget'],
    ['actual_cost', 'actualCost'],
    ['progress', 'progress'],
    ['manager', 'manager'],
    ['description', 'description'],
    ['notes', 'notes'],
  ],
  // team / linkedOrders 都是字符串数组 → JSON 文本列
  jsonCols: [
    ['team', 'team'],
    ['linked_orders', 'linkedOrders'],
  ],
  label: '项目',
  noSnake: 'project_no',
  noCamel: 'projectNo',
};
