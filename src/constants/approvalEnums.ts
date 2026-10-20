/**
 * 审批状态枚举统一登记表（审计 P1-4 收敛，V3.75.0）
 *
 * 背景：审计发现「审批状态枚举散落多处」——框架层 types/approval.ts 的
 * ApprovalInstanceStatus（D1 approval_instances 落库）、业务层
 * MaterialApprovalStatus（material.ts）/ PriceApproval.status（price.ts）/
 * ApplicationStatus（vendor.ts）/ PurchaseRequestStatus（purchase.ts）、
 * 流程定义层 FlowStatus（approvalFlowStore.ts），各页面还各自再抄一份
 * label/color map（MaterialApprovalQueue / Price·ApprovalList /
 * Vendor·ApprovalQueue / Settings·ApprovalFlowTab / Purchase·PurchaseList）。
 * 同义词漂移实例：pending 在物料页叫「待审批」、在框架叫「审批中」；
 * rejected 在物料/价格页叫「已驳回」、在供应商/采购页叫「已拒绝」。
 *
 * 收敛策略（非破坏，零数据迁移）：
 *   1. 不动任何已落库的字面值——各类型联合原样保留，只是「标签 / 颜色 /
 *      相位 / 谓词」集中到本表，页面改为从本表派生；
 *   2. 每模块一张 Record<该模块状态联合, Entry>——类型即覆盖率断言：
 *      某模块状态联合将来新增成员而忘了登记，tsc 直接报错（防再发散）；
 *   3. 统一相位（phase）与谓词：in_flight（审批中，可催办/可审批）/
 *      approved / rejected / closed（终态其他）/ draft（未提交），
 *      替换各页面散落的 `['submitted','reviewing','supplement'].includes(s)`
 *      这类手写清单；
 *   4. 标签措辞按各页面现状逐一保留（本版不做文案统一，避免无谓界面变动；
 *      若要统一用词，只改本表 label 一处即可全局生效）。
 *
 * 审批框架自身的动作/模块标签仍在 types/approval.ts（APPROVAL_ACTION_LABELS /
 * APPROVAL_MODULE_LABELS），那些不是「状态枚举」，不在本表范围。
 */

import type { ApprovalInstanceStatus } from '@/types/approval';
import type { MaterialApprovalStatus } from '@/types/material';
import type { ApplicationStatus } from '@/types/vendor';
import type { PurchaseRequestStatus } from '@/types/purchase';
import type { PriceApproval } from '@/types/price';
// 仅类型导入（编译期擦除），不构成运行时循环依赖
import type { FlowStatus } from '@/stores/approvalFlowStore';

/** 登记表覆盖的审批相关模块（键与 types/approval.ts APPROVAL_MODULE_LABELS 对齐） */
export type ApprovalModuleKey =
  | 'approval_instance'    // 审批框架实例（D1 approval_instances）
  | 'material_application' // 物料申请（MaterialApprovalStatus）
  | 'price_approval'       // 价格审批（PriceApproval.status）
  | 'vendor_application'   // 供应商注册申请（ApplicationStatus）
  | 'purchase_request'     // 采购申请（PurchaseRequestStatus）
  | 'approval_flow';       // 审批流定义（FlowStatus，定义类生命周期）

/**
 * 粗粒度相位：把各模块不同的状态词归一成「流程走到哪了」，
 * 供审批中心/待办数/按钮可用性统一判断。
 *   draft      未提交（可编辑）
 *   in_flight  审批中（可审批/可催办/可补充）
 *   approved   已通过
 *   rejected   已驳回
 *   closed     其他终态（撤回/已下单/已发布等，流程已结束）
 */
export type ApprovalPhase = 'draft' | 'in_flight' | 'approved' | 'rejected' | 'closed';

/** 与 MUI Chip color 取值对齐的子集（页面直接 <Chip color={...}> 用） */
export type ApprovalChipColor = 'default' | 'warning' | 'success' | 'error' | 'info';

export interface ApprovalStatusEntry {
  label: string;
  color: ApprovalChipColor;
  phase: ApprovalPhase;
}

// ──────────────────────────────────────────────
// 各模块状态词表（Record<状态联合, Entry>：漏登记 = tsc 报错）
// ──────────────────────────────────────────────

/** 审批框架实例（原 types/approval.ts APPROVAL_STATUS_LABELS，标签措辞原样保留） */
const APPROVAL_INSTANCE: Record<ApprovalInstanceStatus, ApprovalStatusEntry> = {
  pending:   { label: '审批中', color: 'warning', phase: 'in_flight' },
  approved:  { label: '已通过', color: 'success', phase: 'approved' },
  rejected:  { label: '已驳回', color: 'error',   phase: 'rejected' },
  withdrawn: { label: '已撤回', color: 'default', phase: 'closed' },
};

/** 物料申请（原 MaterialApprovalQueue.tsx STATUS_LABEL/STATUS_COLOR） */
const MATERIAL_APPLICATION: Record<MaterialApprovalStatus, ApprovalStatusEntry> = {
  draft:    { label: '草稿',   color: 'default', phase: 'draft' },
  pending:  { label: '待审批', color: 'warning', phase: 'in_flight' },
  approved: { label: '已批准', color: 'success', phase: 'approved' },
  rejected: { label: '已驳回', color: 'error',   phase: 'rejected' },
};

/** 价格审批（原 Price/ApprovalList.tsx STATUS_MAP；reviewing 原表缺失，补「审批中」） */
const PRICE_APPROVAL: Record<PriceApproval['status'], ApprovalStatusEntry> = {
  pending:   { label: '待审批', color: 'warning', phase: 'in_flight' },
  reviewing: { label: '审批中', color: 'warning', phase: 'in_flight' },
  approved:  { label: '已通过', color: 'success', phase: 'approved' },
  rejected:  { label: '已驳回', color: 'error',   phase: 'rejected' },
};

/** 供应商注册申请（原 Vendor/ApprovalQueue.tsx statusMap） */
const VENDOR_APPLICATION: Record<ApplicationStatus, ApprovalStatusEntry> = {
  submitted:  { label: '已提交', color: 'info',    phase: 'in_flight' },
  reviewing:  { label: '审核中', color: 'warning', phase: 'in_flight' },
  approved:   { label: '已批准', color: 'success', phase: 'approved' },
  rejected:   { label: '已拒绝', color: 'error',   phase: 'rejected' },
  supplement: { label: '需补充', color: 'warning', phase: 'in_flight' },
};

/** 采购申请（原 Purchase/PurchaseList.tsx 状态下拉硬编码选项） */
const PURCHASE_REQUEST: Record<PurchaseRequestStatus, ApprovalStatusEntry> = {
  draft:    { label: '草稿',   color: 'default', phase: 'draft' },
  pending:  { label: '待审批', color: 'warning', phase: 'in_flight' },
  approved: { label: '已批准', color: 'success', phase: 'approved' },
  rejected: { label: '已拒绝', color: 'error',   phase: 'rejected' },
  ordered:  { label: '已下单', color: 'default', phase: 'closed' },
};

/**
 * 审批流定义（原 Settings/ApprovalFlowTab.tsx 内联 map + approvalFlowConfig.ts
 * ACTIVE_STATUSES）。这是「流程定义」的生命周期而非单据审批：
 * system/published 均为生效态（phase=approved），pending 为待审。
 */
const APPROVAL_FLOW: Record<FlowStatus, ApprovalStatusEntry> = {
  system:    { label: '系统预置', color: 'default', phase: 'approved' },
  draft:     { label: '草稿',     color: 'default', phase: 'draft' },
  pending:   { label: '待审',     color: 'warning', phase: 'in_flight' },
  published: { label: '已发布',   color: 'success', phase: 'approved' },
};

// ──────────────────────────────────────────────
// 登记表总装 + 统一访问器
// ──────────────────────────────────────────────

export const APPROVAL_STATUS_REGISTRY: Record<ApprovalModuleKey, Record<string, ApprovalStatusEntry>> = {
  approval_instance: APPROVAL_INSTANCE,
  material_application: MATERIAL_APPLICATION,
  price_approval: PRICE_APPROVAL,
  vendor_application: VENDOR_APPLICATION,
  purchase_request: PURCHASE_REQUEST,
  approval_flow: APPROVAL_FLOW,
};

/** 查某模块某状态的完整条目（label/color/phase）；未登记返回 undefined */
export function approvalStatusInfo(
  module: ApprovalModuleKey,
  status: string | undefined | null,
): ApprovalStatusEntry | undefined {
  if (!status) return undefined;
  return APPROVAL_STATUS_REGISTRY[module]?.[status];
}

/** 状态标签（未登记时回退为原值，保证老数据/新值不渲染空白） */
export function approvalStatusLabel(
  module: ApprovalModuleKey,
  status: string | undefined | null,
  fallback = '—',
): string {
  return approvalStatusInfo(module, status)?.label ?? (status || fallback);
}

/** 状态 Chip 颜色（未登记回退 default） */
export function approvalStatusColor(
  module: ApprovalModuleKey,
  status: string | undefined | null,
): ApprovalChipColor {
  return approvalStatusInfo(module, status)?.color ?? 'default';
}

/** 状态相位（未登记返回 undefined，调用方按「未知」处理，勿默认放行） */
export function approvalStatusPhase(
  module: ApprovalModuleKey,
  status: string | undefined | null,
): ApprovalPhase | undefined {
  return approvalStatusInfo(module, status)?.phase;
}

/** 是否审批中（可审批/可催办/可补充材料） */
export function isApprovalInFlight(
  module: ApprovalModuleKey,
  status: string | undefined | null,
): boolean {
  return approvalStatusPhase(module, status) === 'in_flight';
}

/** 是否已了结（通过/驳回/其他终态——流程结束，不可再审批） */
export function isApprovalSettled(
  module: ApprovalModuleKey,
  status: string | undefined | null,
): boolean {
  const phase = approvalStatusPhase(module, status);
  return phase === 'approved' || phase === 'rejected' || phase === 'closed';
}

/** 筛选项选项（供状态下拉/批量编辑用，顺序即词表声明序） */
export function approvalStatusOptions(
  module: ApprovalModuleKey,
): { value: string; label: string }[] {
  return Object.entries(APPROVAL_STATUS_REGISTRY[module] ?? {}).map(([value, e]) => ({
    value,
    label: e.label,
  }));
}

/** 审批流定义是否生效态（替代 approvalFlowConfig.ts 的 ACTIVE_STATUSES 硬编码） */
export function isFlowStatusActive(status: FlowStatus | undefined): boolean {
  return approvalStatusPhase('approval_flow', status) === 'approved';
}

// ──────────────────────────────────────────────
// 向后兼容导出（types/approval.ts 原 APPROVAL_STATUS_LABELS 改从本表派生）
// ──────────────────────────────────────────────

export const APPROVAL_INSTANCE_STATUS_LABELS = Object.fromEntries(
  Object.entries(APPROVAL_INSTANCE).map(([k, v]) => [k, v.label]),
) as Record<ApprovalInstanceStatus, string>;
