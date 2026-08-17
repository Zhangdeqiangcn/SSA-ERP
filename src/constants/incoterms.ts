// ============================================================
// 国际贸易术语 (Incoterms 2020)
// ------------------------------------------------------------
// 依据国际商会《Incoterms 2020》整理，含中文名称与责任划分说明，
// 用于销售/采购订单「贸易条款」字段的可选下拉 + 自由编辑。
// ============================================================

export interface Incoterm {
  /** 术语缩写，如 EXW / FOB */
  code: string;
  /** 英文全称 */
  enName: string;
  /** 中文名称 */
  cnName: string;
  /** 风险转移点（中文说明） */
  riskTransfer: string;
  /** 费用划分要点（中文说明） */
  costSplit: string;
  /** 适用运输方式 */
  transport: string;
}

export const INCOTERMS_2020: Incoterm[] = [
  {
    code: 'EXW',
    enName: 'Ex Works',
    cnName: '工厂交货',
    riskTransfer: '卖方工厂/仓库货交买方时，风险即转移。',
    costSplit: '卖方不负责装车、出口清关及任何费用，买方承担全程费用。',
    transport: '任何方式',
  },
  {
    code: 'FCA',
    enName: 'Free Carrier',
    cnName: '货交承运人',
    riskTransfer: '货物在指定地点交付承运人/代理时风险转移。',
    costSplit: '卖方负责出口清关并交至承运人；其后费用由买方承担。',
    transport: '任何方式',
  },
  {
    code: 'FAS',
    enName: 'Free Alongside Ship',
    cnName: '船边交货',
    riskTransfer: '货物置于指定装运港船边时风险转移。',
    costSplit: '卖方负责运至船边并出口清关；装船及海运费由买方承担。',
    transport: '水路',
  },
  {
    code: 'FOB',
    enName: 'Free On Board',
    cnName: '船上交货',
    riskTransfer: '货物装上指定装运港船上时风险转移。',
    costSplit: '卖方负责装船与出口清关；海运费及保险由买方承担。',
    transport: '水路',
  },
  {
    code: 'CFR',
    enName: 'Cost and Freight',
    cnName: '成本加运费',
    riskTransfer: '货物装上船时风险转移（与运费支付分离）。',
    costSplit: '卖方承担运费至目的港，但风险在装船时转移给买方。',
    transport: '水路',
  },
  {
    code: 'CIF',
    enName: 'Cost, Insurance and Freight',
    cnName: '成本、保险费加运费',
    riskTransfer: '货物装上船时风险转移（保险由卖方投保）。',
    costSplit: '卖方承担运费与保险费至目的港，风险在装船时转移。',
    transport: '水路',
  },
  {
    code: 'CPT',
    enName: 'Carriage Paid To',
    cnName: '运费付至',
    riskTransfer: '货物交付第一承运人时风险转移。',
    costSplit: '卖方支付至目的地的运费，风险在交承运人时转移。',
    transport: '任何方式',
  },
  {
    code: 'CIP',
    enName: 'Carriage and Insurance Paid To',
    cnName: '运费和保险费付至',
    riskTransfer: '货物交付第一承运人时风险转移（保险由卖方投保）。',
    costSplit: '卖方支付运费与保险费至目的地，风险在交承运人时转移。',
    transport: '任何方式',
  },
  {
    code: 'DAP',
    enName: 'Delivered At Place',
    cnName: '目的地交货',
    riskTransfer: '货物在指定目的地交付买方处置时风险转移。',
    costSplit: '卖方承担全程运费与风险，但不负责进口清关与税费。',
    transport: '任何方式',
  },
  {
    code: 'DPU',
    enName: 'Delivered At Place Unloaded',
    cnName: '目的地卸货交货',
    riskTransfer: '货物在目的地卸货后交付买方处置时风险转移。',
    costSplit: '卖方承担运费、风险及卸货费用，不负责进口清关与税费。',
    transport: '任何方式',
  },
  {
    code: 'DDP',
    enName: 'Delivered Duty Paid',
    cnName: '完税后交货',
    riskTransfer: '货物在目的地完成进口清关后交付时风险转移。',
    costSplit: '卖方承担全程运费、风险及进口税费，责任最重。',
    transport: '任何方式',
  },
];

/** 选项标签：用于 Autocomplete 显示，例如 "FOB - 船上交货" */
export const incotermOptionLabel = (it: Incoterm): string =>
  `${it.code} - ${it.cnName}`;

/** 根据 code 查找术语 */
export const findIncoterm = (code?: string | null): Incoterm | undefined =>
  INCOTERMS_2020.find((it) => it.code === (code || '').trim().toUpperCase());
