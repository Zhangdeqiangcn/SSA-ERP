// ============================================================
// 常用质量标准（Quality Standards）
// ------------------------------------------------------------
// 用于销售/采购/生产订单「质量标准」字段的可选下拉 + 自由编辑。
// ============================================================

export interface QualityStandard {
  /** 标准代号，如 GB / ASTM */
  code: string;
  /** 中文名称 */
  cnName: string;
  /** 说明 */
  description: string;
  /** 适用领域 */
  domain: string;
}

export const QUALITY_STANDARDS: QualityStandard[] = [
  { code: 'GB', cnName: '中国国家标准（强制）', description: '中华人民共和国强制性国家标准，必须执行。', domain: '全行业' },
  { code: 'GB/T', cnName: '中国国家标准（推荐）', description: '中华人民共和国推荐性国家标准，鼓励采用。', domain: '全行业' },
  { code: 'GBJ', cnName: '国家军用标准', description: '中华人民共和国国家军用标准（GJB）。', domain: '军工' },
  { code: 'ASTM', cnName: '美国材料与试验协会标准', description: 'ASTM International 材料、制品、系统与服务的标准。', domain: '材料/金属/化工' },
  { code: 'JIS', cnName: '日本工业标准', description: 'Japanese Industrial Standards，日本国家级工业标准。', domain: '制造/电子/材料' },
  { code: 'ISO', cnName: '国际标准化组织标准', description: 'International Organization for Standardization 管理体系与产品标准（如 ISO 9001）。', domain: '管理体系/通用' },
  { code: 'EN', cnName: '欧洲标准', description: 'European Norm，欧盟协调标准。', domain: '出口欧盟' },
  { code: 'DIN', cnName: '德国工业标准', description: 'Deutsches Institut für Normung，德国国家标准。', domain: '机械/制造' },
  { code: '企标', cnName: '企业标准', description: '企业内部制定的严于国标/行标的技术要求。', domain: '定制化产品' },
  { code: '客标', cnName: '客户指定标准', description: '按客户技术协议/规格书执行的质量要求。', domain: '按订单' },
];

export const qualityOptionLabel = (q: QualityStandard): string =>
  `${q.code} - ${q.cnName}`;

export const findQualityStandard = (code?: string | null): QualityStandard | undefined =>
  QUALITY_STANDARDS.find((q) => q.code === (code || '').trim());
