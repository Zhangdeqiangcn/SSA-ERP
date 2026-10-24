import React from 'react';
import { Chip, Box, type Theme } from '@mui/material';
import { Status } from '@/types';

interface StatusBadgeProps {
  status: Status | string;
  size?: 'small' | 'medium';
}

/**
 * 全站「状态 → 颜色 + 中文标签」唯一真源（视觉统一基线）。
 *
 * 设计约定（参照 src/constants/approvalEnums.ts 的集中登记范式）：
 * 1. 所有页面展示业务状态一律走 <StatusBadge status={key} />，禁止在页面内另写
 *    STATUS_CONFIG / STATUS_COLORS / STATUS_MAP 等本地副本（审计报告 P0 整改项）。
 * 2. color 仅使用 MUI 语义色名（default/primary/secondary/success/warning/error/info），
 *    这些都是主题令牌，天然支持换肤 / 深色模式；禁止在此写 '#hex' 硬编码。
 * 3. 同一 key 在全站只有一种标签与配色（如 pending 永远是「待处理 / 警告橙」），
 *    跨模块同义即对齐，杜绝「同义漂移」。
 * 4. 模块专属标签（如出库单的 pending 想显示「待出库」）用带前缀的 key
 *    （ob_pending 等）登记，页面用极小的 `dataStatus → 显示key` 映射即可，
 *    避免污染通用 key 的语义。
 */
export const statusConfig: Record<string, { color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'; label: string }> = {
  // ── 通用生命周期 ──
  draft: { color: 'default', label: '草稿' },
  reviewed: { color: 'warning', label: '已评审' },
  active: { color: 'success', label: '启用' },
  inactive: { color: 'default', label: '停用' },
  pending: { color: 'warning', label: '待处理' },
  approved: { color: 'success', label: '已批准' },
  rejected: { color: 'error', label: '已拒绝' },
  submitted: { color: 'warning', label: '已提交' },
  verified: { color: 'success', label: '已验证' },
  published: { color: 'info', label: '已发布' },
  closed: { color: 'default', label: '已关闭' },
  cancelled: { color: 'error', label: '已取消' },
  frozen: { color: 'error', label: '已冻结' },
  locked: { color: 'default', label: '锁定' },
  expired: { color: 'default', label: '已过期' },
  obsolete: { color: 'default', label: '已废弃' },

  // ── 供应商 / 客户 ──
  registered: { color: 'info', label: '已注册' },
  blacklisted: { color: 'error', label: '黑名单' },
  selected: { color: 'info', label: '已选定' },
  manufacturer: { color: 'primary', label: '生产商' },
  trader: { color: 'info', label: '贸易商' },
  agent: { color: 'warning', label: '代理商' },
  tier_a: { color: 'error', label: '核心客户(A)' },
  tier_b: { color: 'warning', label: '重要客户(B)' },
  tier_c: { color: 'success', label: '一般客户(C)' },

  // ── 采购申请 / 采购订单 ──
  ordered: { color: 'info', label: '已下单' },
  created: { color: 'default', label: '已创建' },
  sent: { color: 'info', label: '已发送' },
  vendorConfirmed: { color: 'secondary', label: '供应商已确认' },
  confirmed: { color: 'primary', label: '已确认' },
  partial: { color: 'info', label: '部分' },
  received: { color: 'success', label: '已收货' },
  issued: { color: 'info', label: '已发料' },
  returned: { color: 'default', label: '已回收' },
  settled: { color: 'success', label: '已结清' },
  paid: { color: 'success', label: '已付款' },
  overdue: { color: 'error', label: '已逾期' },
  open: { color: 'default', label: '未开始' },
  quotation_received: { color: 'primary', label: '已收到报价' },
  compared: { color: 'success', label: '已比价' },
  inquiry_closed: { color: 'warning', label: '已截止' },

  // ── 生产工单 / 工艺 ──
  released: { color: 'info', label: '已下达' },
  in_progress: { color: 'warning', label: '进行中' },
  completed: { color: 'success', label: '已完成' },
  implemented: { color: 'success', label: '已执行' },
  in_production: { color: 'secondary', label: '生产中' },
  executing: { color: 'primary', label: '执行中' },
  waiting: { color: 'default', label: '等待' },
  running: { color: 'success', label: '运行中' },
  down: { color: 'error', label: '停机' },
  maintenance: { color: 'warning', label: '维护中' },
  idle: { color: 'default', label: '闲置' },
  in_use: { color: 'success', label: '使用中' },
  scrapped: { color: 'error', label: '报废' },
  balanced: { color: 'info', label: '平衡' },

  // ── 出入库 / 仓储作业 ──
  processing: { color: 'warning', label: '处理中' },
  picking: { color: 'info', label: '拣配中' },
  picked: { color: 'secondary', label: '已拣配' },
  packed: { color: 'warning', label: '已包装' },
  shipped: { color: 'success', label: '已发货' },
  in_transit: { color: 'warning', label: '在途' },
  delivered: { color: 'success', label: '已签收' },
  in_stock: { color: 'success', label: '在库' },
  receive: { color: 'info', label: '收货' },
  putaway: { color: 'secondary', label: '上架' },
  pick: { color: 'warning', label: '拣货' },
  transfer: { color: 'info', label: '调拨' },
  count: { color: 'secondary', label: '盘点' },
  posted: { color: 'success', label: '已过账' },
  partial_shipped: { color: 'warning', label: '部分发货' },
  fully_shipped: { color: 'success', label: '已发货' },
  connected: { color: 'success', label: '已连接' },
  disconnected: { color: 'default', label: '已断开' },

  // 出库单专属标签（避免污染通用 pending 等语义）
  ob_pending: { color: 'default', label: '待出库' },
  ob_processing: { color: 'warning', label: '出库中' },
  ob_picking: { color: 'info', label: '拣配中' },
  ob_picked: { color: 'secondary', label: '已拣配' },
  ob_packed: { color: 'warning', label: '已包装' },
  ob_shipped: { color: 'success', label: '已发货' },
  ob_completed: { color: 'success', label: '已完成' },
  ob_cancelled: { color: 'error', label: '已取消' },

  // 报检单专属标签（InspectionNotice 详情页；passed/failed 复用通用 key）
  qn_pending: { color: 'default', label: '待报检' },
  qn_inspecting: { color: 'info', label: '检验中' },
  qn_partial: { color: 'warning', label: '部分合格' },

  // ── 质量检验 ──
  qualified: { color: 'success', label: '合格' },
  unqualified: { color: 'error', label: '不合格' },
  passed: { color: 'success', label: '合格' },
  failed: { color: 'error', label: '不合格' },
  conditional_pass: { color: 'warning', label: '条件接收' },
  in_inspection: { color: 'warning', label: '检验中' },
  calibrating: { color: 'warning', label: '校准中' },
  tightened: { color: 'warning', label: '加严检验' },
  reduced: { color: 'info', label: '放宽检验' },
  skip: { color: 'default', label: '跳批检验' },
  incoming: { color: 'info', label: '来料检验' },
  process: { color: 'warning', label: '过程检验' },
  final: { color: 'success', label: '成品检验' },
  rework: { color: 'warning', label: '返工' },
  conditional_accept: { color: 'primary', label: '让步接收' },
  return_vendor: { color: 'default', label: '退货供应商' },
  return: { color: 'error', label: '退货' },
  concession: { color: 'warning', label: '折价' },
  discount: { color: 'primary', label: '折扣' },
  isolate: { color: 'info', label: '隔离' },
  scrap: { color: 'error', label: '报废' },
  critical: { color: 'error', label: '严重' },
  medium: { color: 'warning', label: '中' },

  // ── 8D 问题改善 PDCA 阶段 ──
  pdca_plan: { color: 'info', label: 'P-计划' },
  pdca_do: { color: 'warning', label: 'D-执行' },
  pdca_check: { color: 'primary', label: 'C-检查' },
  pdca_act: { color: 'success', label: 'A-改进' },
  pdca_open: { color: 'error', label: '待处理' },
  inspection: { color: 'default', label: '检验发现' },
  customer_complaint: { color: 'error', label: '客户投诉' },
  internal_audit: { color: 'info', label: '内部审核' },

  // ── 销售线索 / 商机 ──
  new: { color: 'primary', label: '新线索' },
  contacted: { color: 'info', label: '已联系' },
  negotiating: { color: 'warning', label: '洽谈中' },
  quoted: { color: 'secondary', label: '已报价' },
  won: { color: 'success', label: '已成交' },
  lost: { color: 'default', label: '已丢失' },
  converted: { color: 'success', label: '已转订单' },
  suspended: { color: 'warning', label: '已暂停' },
  terminated: { color: 'error', label: '已终止' },
  contract_active: { color: 'success', label: '执行中' },
  planning: { color: 'primary', label: '规划中' },
  at_risk: { color: 'error', label: '风险' },

  // ── 物料生命周期（MaterialList 专属）──
  lifecycle_draft: { color: 'default', label: '创建中' },
  lifecycle_active: { color: 'success', label: '激活' },
  lifecycle_phasing_out: { color: 'warning', label: '逐步淘汰' },
  lifecycle_obsolete: { color: 'error', label: '已淘汰' },

  // ── 销售项目 / 异常反馈（ProjectDetail 专属）──
  project_in_progress: { color: 'primary', label: '执行中' },
  exc_low: { color: 'warning', label: '低' },
  exc_medium: { color: 'warning', label: '中' },
  exc_high: { color: 'error', label: '高' },
  exc_critical: { color: 'error', label: '严重' },
  exc_open: { color: 'error', label: '待处理' },
  exc_investigating: { color: 'warning', label: '调查中' },
  exc_resolved: { color: 'success', label: '已解决' },
  exc_closed: { color: 'success', label: '关闭' },

  // ── 财务三单匹配 ──
  tpm_no_po: { color: 'default', label: '未关联采购订单' },
  tpm_po_not_found: { color: 'error', label: '采购订单不存在' },
  tpm_po_amount_invalid: { color: 'error', label: '采购订单金额无效' },
  tpm_no_invoice: { color: 'warning', label: '缺少有效发票' },
  tpm_over_po: { color: 'warning', label: '开票超过订单金额' },
  tpm_insufficient_inbound: { color: 'warning', label: '入库不足' },
  tpm_over_invoice: { color: 'warning', label: '付款超发票' },

  // ── 三单匹配校验结论（OrderDetail 进项税对账）──
  twm_pending: { color: 'default', label: '待处理' },
  twm_matched: { color: 'success', label: '匹配一致' },
  twm_diff: { color: 'warning', label: '存在差异' },

  // ── 优先级 ──
  low: { color: 'default', label: '低' },
  normal: { color: 'info', label: '普通' },
  high: { color: 'warning', label: '高' },
  urgent: { color: 'error', label: '紧急' },

  // ── 库存预警类型 ──
  low_stock: { color: 'warning', label: '库存不足' },
  overstock: { color: 'info', label: '库存过剩' },
  expiring: { color: 'warning', label: '临期' },

  // ── 手动 / 自动 ──
  manual: { color: 'primary', label: '手动' },
  auto: { color: 'info', label: '自动' },

  // ── 盘点类型 ──
  full: { color: 'primary', label: '全盘' },
  partial_type: { color: 'info', label: '抽盘' },

  // ── 其他语义态 ──
  done: { color: 'success', label: '已完成' },
  error: { color: 'error', label: '错误' },

  // ── 波次RFID（WaveRfidList 专属）──
  wave_draft: { color: 'default', label: '草稿' },
  wave_released: { color: 'primary', label: '已下达' },
  wave_in_progress: { color: 'warning', label: '拣货中' },
  wave_completed: { color: 'success', label: '已完成' },
  wave_closed: { color: 'secondary', label: '已关闭' },
  wave_receive: { color: 'primary', label: '收货' },
  wave_putaway: { color: 'secondary', label: '上架' },
  wave_pick: { color: 'warning', label: '拣货' },
  wave_transfer: { color: 'primary', label: '转储' },
  wave_count: { color: 'secondary', label: '盘点' },

  // ── 跨组织转储（StockTransferDetail 专属；draft/completed/cancelled 语义与通用键一致但标签按模块口径统一登记）──
  st_draft: { color: 'default', label: '草稿' },
  st_shipped: { color: 'info', label: '已发出' },
  st_received: { color: 'primary', label: '已收货' },
  st_completed: { color: 'success', label: '已完成' },
  st_cancelled: { color: 'error', label: '已取消' },

  // ── 成品入库（FinishedGoodsInboundDetail 专属；completed 复用通用 key）──
  fin_pending: { color: 'warning', label: '待入库' },
  fin_inspecting: { color: 'info', label: '检验中' },
  fin_completed: { color: 'success', label: '已完成' },
  fin_partial: { color: 'warning', label: '部分入库' },

  // ── 电子面单 / 物流轨迹（LogisticsWaybill 专属）──
  waybill_created: { color: 'default', label: '已创建' },
  waybill_printed: { color: 'info', label: '已打印' },
  waybill_dispatched: { color: 'primary', label: '已发运' },
  waybill_intransit: { color: 'warning', label: '运输中' },
  waybill_signed: { color: 'success', label: '已签收' },
  waybill_exception: { color: 'error', label: '异常' },
  track_collected: { color: 'info', label: '已揽收' },
  track_dispatched: { color: 'warning', label: '派件中' },
  track_intransit: { color: 'warning', label: '运输中' },
  track_signed: { color: 'success', label: '已签收' },
  track_exception: { color: 'error', label: '异常' },

  // ── 批次管理（BatchManage 专属）──
  batch_normal: { color: 'success', label: '正常' },
  batch_expired: { color: 'error', label: '已过期' },

  // ── 供应商报价（VendorQuotation 专属）──
  vq_closed: { color: 'warning', label: '已截止' },
  vq_submitted: { color: 'success', label: '已提交' },

  // ── BI 集成（BiIntegration 专属）──
  bi_connected: { color: 'success', label: '已连接' },
  bi_disconnected: { color: 'default', label: '未连接' },
  bi_error: { color: 'error', label: '异常' },

  // ── 付款计划（PaymentPlan / VendorPaymentPlan 专属；overdue 复用通用 key）──
  pp_pending: { color: 'warning', label: '待支付' },
  pp_partial: { color: 'info', label: '部分付款' },
  pp_paid: { color: 'success', label: '已付清' },

  // ── 发票管理（InvoiceList 专属；draft / paid 复用通用 key）──
  inv_submitted: { color: 'warning', label: '待验证' },
  inv_verified: { color: 'info', label: '已验证' },
  inv_cancelled: { color: 'error', label: '已作废' },

  // ── 价格模块（ComparisonsList / PriceList / InquiryList；expired/frozen/draft/published/selected/quotation_received/compared 复用通用 key）──
  pr_pending: { color: 'warning', label: '待选定' },
  pr_approved: { color: 'success', label: '已审批' },
  pr_rejected: { color: 'error', label: '已驳回' },
  pr_active: { color: 'success', label: '有效' },
  pr_closed: { color: 'warning', label: '已截止' },

  // ── BOM（BOMList；obsolete 复用通用 key）──
  bom_draft: { color: 'warning', label: '草稿' },
  bom_released: { color: 'success', label: '已发布' },

  // ── 三方销售结算（TripartySalesList）──
  settle_pending: { color: 'warning', label: '待结算' },
  settle_partial: { color: 'primary', label: '部分结算' },
  settle_settled: { color: 'success', label: '已结算' },

  // ── 销售订单（SalesOrderList；draft/completed/cancelled 复用通用 key）──
  so_confirmed: { color: 'primary', label: '已确认' },
  so_in_production: { color: 'secondary', label: '生产中' },
  so_partial_shipped: { color: 'warning', label: '部分发货' },
  so_fully_shipped: { color: 'success', label: '已发货' },

  // ── 物流发货（LogisticsList；delivered/cancelled 复用通用 key）──
  ship_pending: { color: 'default', label: '待发货' },
  ship_picked: { color: 'secondary', label: '已拣货' },
  ship_packed: { color: 'secondary', label: '已打包' },
  ship_shipped: { color: 'primary', label: '已出库' },
  ship_in_transit: { color: 'warning', label: '运输中' },

  // ── 意向客户（ProspectList；negotiating/quoted/won/lost 复用通用 key）──
  lead_new: { color: 'secondary', label: '新线索' },
  lead_contacted: { color: 'primary', label: '已联系' },

  // ── 销售项目（ProjectList；at_risk/completed/closed 复用通用 key）──
  proj_planning: { color: 'secondary', label: '规划中' },
  proj_in_progress: { color: 'primary', label: '执行中' },
  proj_pending: { color: 'warning', label: '暂停' },

  // ── MES 集成（MesIntegrationList；连接态复用 bi_ key，设备/WIP/报工用专属前缀 key）──
  mes_dev_running: { color: 'success', label: '运行' },
  mes_dev_idle: { color: 'default', label: '空闲' },
  mes_dev_down: { color: 'error', label: '故障' },
  mes_dev_maintenance: { color: 'warning', label: '保养' },
  mes_wip_waiting: { color: 'default', label: '等待' },
  mes_wip_processing: { color: 'warning', label: '加工中' },
  mes_wip_done: { color: 'success', label: '完成' },
  mes_op_pending: { color: 'default', label: '待报工' },
  mes_op_in_progress: { color: 'warning', label: '进行中' },
  mes_op_completed: { color: 'success', label: '已报工' },

  // ── 不合格品（UnqualifiedList；处置方式复用 rework/scrap/conditional_accept/return_vendor 通用 key，NCR 闭环用专属前缀 key）──
  unq_open: { color: 'default', label: '未关闭' },
  unq_capa_raised: { color: 'primary', label: '已发起CAPA' },
  unq_closed: { color: 'success', label: '已关闭' },

  // ── 生产工单（WorkOrderList；draft/released/completed/closed 复用通用 key）──
  wo_in_progress: { color: 'warning', label: '生产中' },

  // ── S&OP 计划（SopPlan；draft 复用通用 key，approved 复用通用 key）──
  sop_balanced: { color: 'primary', label: '已平衡' },
  sop_executing: { color: 'secondary', label: '执行中' },

  // ── 质量检验（InspectionList；passed/failed/conditional_pass 复用通用 key）──
  insp_incoming: { color: 'primary', label: '来料检验' },
  insp_process: { color: 'warning', label: '过程检验' },
  insp_final: { color: 'success', label: '成品检验' },
  insp_pending: { color: 'default', label: '待检' },
  insp_in_progress: { color: 'primary', label: '检验中' },

  // ── 工艺路线（ProcessRouteList；draft 复用通用 key，active 复用通用 key）──
  route_obsolete: { color: 'default', label: '废弃' },

  // ── 重复制造（RepetitiveMfgList）──
  rep_idle: { color: 'default', label: '空闲' },
  rep_maintenance: { color: 'warning', label: '保养中' },
  rep_period_active: { color: 'primary', label: '进行中' },
  rep_period_closed: { color: 'secondary', label: '已关闭' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'small',
}) => {
  const config = statusConfig[status] || { color: 'default' as const, label: status };

  return (
    <Box component="span" sx={{ display: 'inline-flex' }}>
      <Chip
        label={config.label}
        color={config.color}
        size={size}
        sx={{ minWidth: 70 }}
      />
    </Box>
  );
};

/**
 * 把状态 key 解析成 MUI 主题色路径（如 'success.main'），供非 Chip 的可视化元素
 * （进度条填充、图标着色、边框等）复用同一套语义色，避免页面另写 '#hex'。
 * 用法：sx={{ bgcolor: statusTokenPath(key) }}
 */
const COLOR_TOKEN_PATH: Record<string, string> = {
  default: 'grey.500',
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  info: 'info.main',
};

export const statusTokenPath = (status: string): string =>
  COLOR_TOKEN_PATH[statusConfig[status]?.color ?? 'default'] ?? 'grey.500';

/**
 * 把 'error.main' 形式的主题色路径解析成 theme 实例上的真实色值。
 * 仅在「必须拿具体色值」的场景使用：alpha() 调淡、边框/SVG 描边、
 * 以及第三方图表库（不解析主题路径）的入参。
 * 普通 sx 的 bgcolor / color 直接传 'error.main' 路径即可，不需要此函数。
 */
export const resolveToken = (theme: Theme, path: string): string => {
  const [group, shade] = path.split('.');
  const grp = (theme.palette as unknown as Record<string, Record<string, string> | string>)[group];
  const val = typeof grp === 'string' ? grp : grp?.[shade ?? 'main'];
  return val ?? theme.palette.text.secondary;
};

export default StatusBadge;
