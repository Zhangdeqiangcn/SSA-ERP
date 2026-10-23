/**
 * 中央选项源（数据字典雏形）
 * 目的：把散落在各页面/ mocks 的枚举、下拉选项集中到一处，作为可复用、可扩展的单一来源，
 * 为「可定制性 / 选项丰富度」提供基础。后续可接入设置页「数据字典」做用户维护。
 */

/** 计量单位（物料、订单、库存共用） */
export const UNIT_OPTIONS: string[] = [
  '件', '个', '套', '台', '吨', '千克', '公斤', '克', '毫克', '米', '毫米', '厘米',
  '千米', '米²', '米³', '升', '毫升', '加仑', '批', '卷', '根', '块', '张', '箱',
  '包', '捆', '对', '支', '罐', '桶', '袋', '车', '柜', '令', '双', '副', '组', '套件',
];

/** 采购类型 */
export const PURCHASE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'material', label: '物料采购' },
  { value: 'service', label: '服务采购' },
  { value: 'asset', label: '固定资产' },
  { value: 'consumable', label: '耗材采购' },
];

/** 付款方式 */
export const PAYMENT_METHOD_OPTIONS: string[] = [
  '电汇(T/T)', '银行承兑汇票', '商业承兑汇票', '信用证(L/C)', '支票', '现金', '在线支付',
];

/** 付款条件（采购订单） */
export const PAYMENT_TERM_OPTIONS: string[] = [
  '货到验收后30天付清', '货到验收后60天付清', '货到验收后90天付清',
  '预付款30%+发货前70%', '预付款50%+发货前50%',
  '月结30天', '月结60天', '月结90天', '账期45天',
  '款到发货', '发货前付全款', '验收合格后付全款',
  '货到付款(COD)', '分批付款(3/3/4)', '见提单复印件付款',
];

/** 贸易条件（Incoterms，与设置页 BasicConfig 互补） */
export const TRADE_TERM_OPTIONS: string[] = [
  'FOB（离岸价）', 'CIF（到岸价）', 'CFR（成本加运费）', 'EXW（工厂交货）',
  'DDP（完税后交货）', 'DAP（目的地交货）', 'FCA（货交承运人）',
];

/** V3.104.0 交付条件（采购订单表头下拉；数据字典 deliveryTerms 分类的出厂种子，设置页可维护） */
export const DELIVERY_TERM_OPTIONS: string[] = [
  '含运费到厂', '送货上门', '需方自提', '供方代办运输', '物流代发', '包邮到厂', '自提或代发物流',
];

/** A2 币种（采购/销售/财务共用，与 financeExtensionStore 汇率表口径一致） */
export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'CNY', label: 'CNY 人民币' },
  { value: 'USD', label: 'USD 美元' },
  { value: 'EUR', label: 'EUR 欧元' },
  { value: 'JPY', label: 'JPY 日元' },
  { value: 'HKD', label: 'HKD 港币' },
];

/** A2 增值税率（百分数整数，13/9/6/3/0） */
export const TAX_RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 13, label: '13%（一般货物）' },
  { value: 9, label: '9%（交通运输/建筑）' },
  { value: 6, label: '6%（现代服务）' },
  { value: 3, label: '3%（小规模征收率）' },
  { value: 0, label: '0%（免税/出口）' },
];

/** A2 价格类型（录入价含税与否） */
export const TAX_INCLUDED_OPTIONS: { value: string; label: string }[] = [
  { value: 'false', label: '未税价' },
  { value: 'true', label: '含税价' },
];

/** 发票类型 */
export const INVOICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'vat_special', label: '增值税专用发票' },
  { value: 'vat_normal', label: '增值税普通发票' },
  { value: 'receipt', label: '收据' },
];

/** A3 客户分类 */
export const CUSTOMER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'direct', label: '直接客户' },
  { value: 'distributor', label: '经销商' },
  { value: 'agent', label: '代理商' },
  { value: 'end_user', label: '终端用户' },
];

/** A3 客户状态 */
export const CUSTOMER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: '正常' },
  { value: 'inactive', label: '停用' },
  { value: 'blacklisted', label: '黑名单' },
];

/** A3 信用等级 */
export const CREDIT_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'AAA', label: 'AAA' },
  { value: 'AA', label: 'AA' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

/** A3 账期（天） */
export const SETTLEMENT_TERM_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '预付 / 款到发货' },
  { value: 30, label: '月结 30 天' },
  { value: 45, label: '账期 45 天' },
  { value: 60, label: '月结 60 天' },
  { value: 90, label: '月结 90 天' },
];

/** 处置方式（不合格品，兼容旧4种枚举） */
export const DISPOSITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'return_vendor', label: '退货供应商' },
  { value: 'conditional_accept', label: '让步接收' },
  { value: 'rework', label: '返工' },
  { value: 'scrap', label: '报废' },
  { value: 'isolate', label: '隔离' },
  { value: 'discount', label: '折价入库' },
  { value: 'other', label: '其他' },
];

/**
 * 读取数据字典单一数据源（ssa-erp-datadict）中的用户维护选项，缺省回退到中央默认值。
 * 向后兼容：旧调用方（如物料单位）仍通过本函数取值，但来源已统一到 dataDictStore 的持久化存储。
 */
export const loadUserOptions = (key: string, fallback: string[]): string[] => {
  try {
    const saved = localStorage.getItem('ssa-erp-datadict');
    if (saved) {
      const parsed = JSON.parse(saved);
      const state = parsed?.state || {};
      // 选项源对外 key 与 store 分类名一致（units/paymentMethods/...）
      const val = state[key] as string[] | undefined;
      if (Array.isArray(val) && val.length > 0) return val;
    }
  } catch {
    /* ignore */
  }
  return fallback;
};
