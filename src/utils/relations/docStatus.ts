// 单据状态取值器（V3.115.0 新增）
// ─────────────────────────────────────────────────────────────────────────────
// 背景（强哥需求）：各类单据列表里要能直接看到"关联单据现在是什么状态"，
//   例如采购订单列表里，入库单那一列不光给单号，还要看得出是待入库还是已完成；
//   发票那一列要看得出待验证 / 已验证；付款计划要看得出待支付 / 已付清。
//
// 设计原则（不破坏既有约定）：
//   1. 状态标签**唯一真源仍是 StatusBadge 的 statusConfig**，本文件不另造中文标签，
//      只负责「从单据数据里把 status 值取出来 + 算出该走哪个 badge 键」。
//      财务域有模块专属键（发票 inv_*、付款计划 pp_*），其余单据直接用通用键。
//   2. 本文件不 import 任何 store，只依赖 DOC_SOURCES（运行时被 relations.ts 填充），
//      因此可被组件层自由复用，也不会把 30 个 store 的副作用拉进单测。
//   3. 查不到实体 / 实体没有 status 字段时返回 null —— 宁可不显示，也不编造状态。

import { DOC_SOURCES, DOC_RELATIONS } from './documentRelations';
import { statusConfig } from '@/components/common/StatusBadge';

/** 模块专属状态键前缀（与 StatusBadge.statusConfig 的登记保持一致） */
const STATUS_PREFIX: Record<string, string> = {
  finInvoice: 'inv_',
  paymentPlan: 'pp_',
};

/** 关联单据的当前状态（供单元格渲染小标签 & 文本检索） */
export interface DocStatusInfo {
  /** 单据里的原始状态值（如 completed / verified / partial） */
  value: string;
  /** 交给 <StatusBadge status={badgeKey} /> 的键（已含模块前缀） */
  badgeKey: string;
  /** 中文标签（来自 statusConfig，未登记则回退原值） */
  label: string;
  /** MUI 语义色调（直接取自 statusConfig，不另定义颜色） */
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * 按「单据类型 + 单号」在关联数据源里定位实体。
 * 找不到返回 undefined（调用方据此不渲染状态）。
 */
export function findDocEntity(
  type: string,
  no: string
): Record<string, any> | undefined {
  const src = DOC_SOURCES[type];
  if (!src || no == null || no === '') return undefined;
  let docs: unknown;
  try {
    docs = src.getDocs();
  } catch {
    return undefined;
  }
  if (!Array.isArray(docs)) return undefined;
  return docs.find(
    (d: Record<string, any>) => String(d?.[src.numberField]) === String(no)
  ) as Record<string, any> | undefined;
}

/** 把实体的 status 值翻译成 badge 键 + 中文标签 */
export function statusOfEntity(type: string, entity: Record<string, any> | undefined): DocStatusInfo | null {
  const value = entity?.status;
  if (value == null || value === '') return null;
  const raw = String(value);
  // V3.116.0：类型专属字典优先。
  // 理由：issued 在库存域是「已发料」，在门户开票申请里是「已开票」；received 在仓储域是
  //   「已收货」，在门户是「已收票」。走通用字典会把供应商的发票标成"已发料"——性质错误，
  //   不是措辞问题。故只有本类型显式声明过的 key 才覆盖，其余仍回退通用字典。
  const own = DOC_RELATIONS[type]?.statusLabels?.[raw];
  if (own) return { value: raw, badgeKey: raw, label: own.label, color: own.color };
  const prefix = STATUS_PREFIX[type] ?? '';
  const prefixed = prefix ? `${prefix}${raw}` : raw;
  // 优先用带前缀的模块专属键；未登记则回退通用键；都没有则回退原值（StatusBadge 内部亦为同款降级）
  const badgeKey = statusConfig[prefixed] ? prefixed : raw;
  const cfg = statusConfig[badgeKey];
  return {
    value: raw,
    badgeKey,
    label: cfg?.label ?? raw,
    color: cfg?.color ?? 'default',
  };
}

/** 按「单据类型 + 单号」直接取状态；查不到实体或无 status 时返回 null */
export function getDocStatus(type: string, no: string): DocStatusInfo | null {
  return statusOfEntity(type, findDocEntity(type, no));
}
