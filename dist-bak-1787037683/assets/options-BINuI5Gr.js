const UNIT_OPTIONS = [
  "件",
  "个",
  "套",
  "台",
  "吨",
  "千克",
  "公斤",
  "克",
  "毫克",
  "米",
  "毫米",
  "厘米",
  "千米",
  "米²",
  "米³",
  "升",
  "毫升",
  "加仑",
  "批",
  "卷",
  "根",
  "块",
  "张",
  "箱",
  "包",
  "捆",
  "对",
  "支",
  "罐",
  "桶",
  "袋",
  "车",
  "柜",
  "令",
  "双",
  "副",
  "组",
  "套件"
];
const PURCHASE_TYPE_OPTIONS = [
  { value: "material", label: "物料采购" },
  { value: "service", label: "服务采购" },
  { value: "asset", label: "固定资产" },
  { value: "consumable", label: "耗材采购" }
];
const PAYMENT_METHOD_OPTIONS = [
  "电汇(T/T)",
  "银行承兑汇票",
  "商业承兑汇票",
  "信用证(L/C)",
  "支票",
  "现金",
  "在线支付"
];
const PAYMENT_TERM_OPTIONS = [
  "货到验收后30天付清",
  "货到验收后60天付清",
  "货到验收后90天付清",
  "预付款30%+发货前70%",
  "预付款50%+发货前50%",
  "月结30天",
  "月结60天",
  "月结90天",
  "账期45天",
  "款到发货",
  "发货前付全款",
  "验收合格后付全款",
  "货到付款(COD)",
  "分批付款(3/3/4)",
  "见提单复印件付款"
];
const TRADE_TERM_OPTIONS = [
  "FOB（离岸价）",
  "CIF（到岸价）",
  "CFR（成本加运费）",
  "EXW（工厂交货）",
  "DDP（完税后交货）",
  "DAP（目的地交货）",
  "FCA（货交承运人）"
];
const CURRENCY_OPTIONS = [
  { value: "CNY", label: "CNY 人民币" },
  { value: "USD", label: "USD 美元" },
  { value: "EUR", label: "EUR 欧元" },
  { value: "JPY", label: "JPY 日元" },
  { value: "HKD", label: "HKD 港币" }
];
const TAX_RATE_OPTIONS = [
  { value: 13, label: "13%（一般货物）" },
  { value: 9, label: "9%（交通运输/建筑）" },
  { value: 6, label: "6%（现代服务）" },
  { value: 3, label: "3%（小规模征收率）" },
  { value: 0, label: "0%（免税/出口）" }
];
const INVOICE_TYPE_OPTIONS = [
  { value: "vat_special", label: "增值税专用发票" },
  { value: "vat_normal", label: "增值税普通发票" },
  { value: "receipt", label: "收据" }
];
const CUSTOMER_TYPE_OPTIONS = [
  { value: "direct", label: "直接客户" },
  { value: "distributor", label: "经销商" },
  { value: "agent", label: "代理商" },
  { value: "end_user", label: "终端用户" }
];
const CUSTOMER_STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "inactive", label: "停用" },
  { value: "blacklisted", label: "黑名单" }
];
const CREDIT_LEVEL_OPTIONS = [
  { value: "AAA", label: "AAA" },
  { value: "AA", label: "AA" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" }
];
const SETTLEMENT_TERM_OPTIONS = [
  { value: 0, label: "预付 / 款到发货" },
  { value: 30, label: "月结 30 天" },
  { value: 45, label: "账期 45 天" },
  { value: 60, label: "月结 60 天" },
  { value: 90, label: "月结 90 天" }
];
const DISPOSITION_OPTIONS = [
  { value: "return_vendor", label: "退货供应商" },
  { value: "conditional_accept", label: "让步接收" },
  { value: "rework", label: "返工" },
  { value: "scrap", label: "报废" },
  { value: "isolate", label: "隔离" },
  { value: "discount", label: "折价入库" },
  { value: "other", label: "其他" }
];
export {
  CURRENCY_OPTIONS as C,
  DISPOSITION_OPTIONS as D,
  INVOICE_TYPE_OPTIONS as I,
  PAYMENT_TERM_OPTIONS as P,
  SETTLEMENT_TERM_OPTIONS as S,
  TRADE_TERM_OPTIONS as T,
  UNIT_OPTIONS as U,
  PAYMENT_METHOD_OPTIONS as a,
  PURCHASE_TYPE_OPTIONS as b,
  TAX_RATE_OPTIONS as c,
  CUSTOMER_TYPE_OPTIONS as d,
  CUSTOMER_STATUS_OPTIONS as e,
  CREDIT_LEVEL_OPTIONS as f
};
