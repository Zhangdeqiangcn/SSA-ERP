/**
 * 多语言词条注册表（D5 适配性 · A4 底座）
 *
 * 设计取舍（诚实说明）：
 *  1. 不做 209 个页面的全量翻译 —— 那是 >40 人天的持续负债，且每加一个页面就欠一次翻译债。
 *     本轮先建立「能真正切过去」的底座：导航树 + 通用动作词 + 状态词 + 日期/数字/金额格式化。
 *  2. 词条 key 采用「命名空间.语义」：nav.* / group.* / common.* / status.* / field.*
 *     导航 key 直接用路径（nav./material/list），这样新增页面时少一层映射维护。
 *  3. 缺失词条一律回退中文原文（见 translate()），绝不显示裸 key —— 用户看到 key 比看到中文更糟。
 *  4. 缺英文词条时不编造机翻，统一登记到 missing 集合，由「多语言」设置页暴露给管理员补录。
 */

/** 支持的语言 */
export type Locale = 'zh-CN' | 'en-US';

export const LOCALES: { value: Locale; label: string; nativeLabel: string }[] = [
  { value: 'zh-CN', label: '简体中文', nativeLabel: '简体中文' },
  { value: 'en-US', label: '英语（美国）', nativeLabel: 'English (US)' },
];

/** 词条库：key → { zh-CN, en-US? }。en-US 缺省时回退 zh-CN。 */
export type Entry = { 'zh-CN': string; 'en-US'?: string };

const dict: Record<string, Entry> = {};

/** 批量登记词条（内部用） */
function reg(prefix: string, entries: Record<string, string>) {
  for (const [k, zh] of Object.entries(entries)) {
    dict[`${prefix}.${k}`] = { 'zh-CN': zh };
  }
}
/** 带英文的批量登记 */
function regBi(entries: Record<string, [string, string]>) {
  for (const [k, [zh, en]] of Object.entries(entries)) {
    dict[k] = { 'zh-CN': zh, 'en-US': en };
  }
}

// ── 应用级 ──
regBi({
  'app.title': ['SSA ERP 企业资源管理平台', 'SSA ERP Enterprise Resource Platform'],
  'app.shortTitle': ['SSA ERP', 'SSA ERP'],
  'app.searchPlaceholder': ['搜索菜单、页面、功能…', 'Search menus, pages, features…'],
});

// ── 平台设置页（多语言面板自身也要能被翻译，否则切英文就露馅） ──
regBi({
  'page.i18n': ['多语言', 'Localization'],
  'page.i18nFormat': ['本地化格式预览', 'Localized Format Preview'],
  'page.i18nPending': ['待补录', 'Pending'],
  'page.i18nAll': ['全部词条', 'All Entries'],
  'page.i18nReset': ['清除该条补录，恢复为中文回退', 'Clear this override and fall back to Chinese'],
  'page.i18nManual': ['人工补录', 'Manual'],
  'page.i18nBuiltin': ['内置', 'Built-in'],
  'page.i18nFallback': ['回退中文', 'Chinese fallback'],
  'field.language': ['界面语言', 'Interface Language'],
  'field.rate': ['汇率', 'Exchange Rate'],
  'page.dataCapacity': ['数据容量守护', 'Data Capacity Guard'],
  'page.capacityKeys': ['已监控数据域', 'Monitored Data Domains'],
  'page.capacityWarn': ['逼近/超限数据域', 'Near/Over Limit'],
});

// ── 通用动作 ──
regBi({
  'common.save': ['保存', 'Save'],
  'common.cancel': ['取消', 'Cancel'],
  'common.add': ['新增', 'Add'],
  'common.edit': ['编辑', 'Edit'],
  'common.delete': ['删除', 'Delete'],
  'common.submit': ['提交', 'Submit'],
  'common.approve': ['审批', 'Approve'],
  'common.reject': ['驳回', 'Reject'],
  'common.confirm': ['确定', 'Confirm'],
  'common.close': ['关闭', 'Close'],
  'common.search': ['查询', 'Search'],
  'common.reset': ['重置', 'Reset'],
  'common.export': ['导出', 'Export'],
  'common.import': ['导入', 'Import'],
  'common.print': ['打印', 'Print'],
  'common.refresh': ['刷新', 'Refresh'],
  'common.detail': ['详情', 'Details'],
  'common.remark': ['备注', 'Remarks'],
  'common.total': ['合计', 'Total'],
  'common.operation': ['操作', 'Actions'],
  'common.status': ['状态', 'Status'],
  'common.loading': ['加载中…', 'Loading…'],
  'common.noData': ['暂无符合条件的数据', 'No matching data'],
  'common.selectAll': ['全选', 'Select all'],
  'common.batchDelete': ['批量删除', 'Delete selected'],
  'common.more': ['更多', 'More'],
});

// ── 状态词 ──
regBi({
  'status.draft': ['草稿', 'Draft'],
  'status.pending': ['待审批', 'Pending Approval'],
  'status.approved': ['已审批', 'Approved'],
  'status.rejected': ['已驳回', 'Rejected'],
  'status.active': ['启用', 'Active'],
  'status.inactive': ['停用', 'Inactive'],
  'status.completed': ['已完成', 'Completed'],
  'status.cancelled': ['已取消', 'Cancelled'],
  'status.inProgress': ['进行中', 'In Progress'],
  'status.released': ['已发布', 'Released'],
  'status.obsolete': ['已失效', 'Obsolete'],
});

// ── 通用字段 ──
regBi({
  'field.code': ['编码', 'Code'],
  'field.name': ['名称', 'Name'],
  'field.spec': ['规格', 'Specification'],
  'field.unit': ['单位', 'Unit'],
  'field.quantity': ['数量', 'Quantity'],
  'field.price': ['单价', 'Unit Price'],
  'field.amount': ['金额', 'Amount'],
  'field.currency': ['币种', 'Currency'],
  'field.date': ['日期', 'Date'],
  'field.createDate': ['创建日期', 'Created On'],
  'field.deliveryDate': ['交期', 'Delivery Date'],
  'field.creator': ['创建人', 'Created By'],
  'field.supplier': ['供应商', 'Supplier'],
  'field.customer': ['客户', 'Customer'],
  'field.material': ['物料', 'Material'],
  'field.warehouse': ['仓库', 'Warehouse'],
  'field.rate': ['汇率', 'Exchange Rate'],
  'field.organization': ['组织', 'Organization'],
});

// ── 导航分组（侧栏大组标题） ──
regBi({
  'group.approval': ['审批中心', 'Approval Center'],
  'group.masterData': ['主数据', 'Master Data'],
  'group.supplyChain': ['供应链', 'Supply Chain'],
  'group.sales': ['销售管理', 'Sales'],
  'group.productionQuality': ['生产与质量', 'Production & Quality'],
  'group.financeReports': ['财务与报表', 'Finance & Reports'],
  'group.analytics': ['分析与报表', 'Analytics & Reports'],
  'group.testDiag': ['测试与诊断', 'Testing & Diagnostics'],
});

// ── 导航叶子（key 用路由路径，新增页面时只需在页面里加一条词条） ──
const navZh: Record<string, string> = {
  '/': '仪表盘',
  '/workbench': '个人工作台',
  // 审批中心
  '/material/approvals': '物料审批',
  '/vendor/approvals': '供应商注册审批',
  '/purchase/approvals': '采购审批',
  '/price/approvals': '价格审批',
  '/settings/approval-flow': '自定义审批流程',
  // 主数据
  '/material/categories': '物料分类',
  '/material/list': '物料列表',
  '/material/valuation': '评估类与价控',
  '/vendor/list': '供应商列表',
  '/vendor/blacklist': '黑名单',
  '/vendor/rating': '评级管理',
  '/vendor/performance': '绩效考核',
  '/vendor/risk': '风险评分',
  '/vendor-portal/login': '供应商门户',
  // 供应链
  '/purchase/requests': '采购申请',
  '/purchase/orders': '采购订单',
  '/purchase/track': '交期跟踪',
  '/purchase/framework': '框架协议',
  '/purchase/info-records': '采购信息记录',
  '/purchase/source-list': '货源清单',
  '/purchase/returns': '采购退货',
  '/price/inquiry': '询价单',
  '/price/comparisons': '比价单',
  '/price/list': '价目表',
  '/warehouse/inspection-notice': '报检单',
  '/warehouse/inbound': '采购入库',
  '/warehouse/fg-inbound': '成品入库',
  '/warehouse/outbound': '出库管理',
  '/warehouse/check': '库存盘点',
  '/warehouse/inventory': '库存查询',
  '/warehouse/batch': '批次管理',
  '/warehouse/aging': '库龄分析',
  '/warehouse/barcode': '条码打印',
  '/warehouse/master': '仓库主数据',
  '/warehouse/transfer': '跨组织转储',
  '/warehouse/adjustment': '库存调整',
  '/warehouse/serial': '序列号/包装单元',
  '/warehouse/trace': '批次追溯穿透',
  '/warehouse/consignment': '寄售库存',
  '/warehouse/wave-rfid': '波次与无线射频',
  // 销售
  '/sales/prospects': '意向客户',
  '/sales/customers': '客户主数据',
  '/sales/orders': '销售订单',
  '/sales/contracts': '销售合同',
  '/sales/logistics': '物流发货',
  '/sales/quotation': '销售报价',
  '/sales/invoices': '销售开票',
  '/sales/returns': '销售退货',
  '/sales/atp': '可用量承诺',
  '/sales/funnel': '销售漏斗',
  '/sales/rebates': '返利管理',
  '/sales/customer-abc': '客户ABC分析',
  '/sales/triparty': '三方销售',
  '/sales/analysis': '市场分析',
  '/sales/projects': '项目管理',
  // 质量
  '/quality/inspection': '检验任务',
  '/quality/standards': '检验标准',
  '/quality/aql': 'AQL抽样',
  '/quality/inspection-lot': '检验批与质量成本',
  '/quality/unqualified': '不合格品',
  '/quality/pdca': 'PDCA改进',
  '/quality/8d': '8D问题求解',
  '/quality/spc': 'SPC控制图',
  '/quality/lab': '实验室设备',
  '/quality/fmea': 'FMEA分析',
  '/quality/coa': 'COA合格证',
  '/quality/report': '质量报表',
  // BOM 与生产
  '/bom/list': 'BOM列表',
  '/bom/cost-rollup': '成本卷积',
  '/production/orders': '工单管理',
  '/production/routes': '工艺路线',
  '/production/mrp': 'MRP计划',
  '/production/report': '生产报表',
  '/production/capacity': '产能排产',
  '/production/operation-reporting': '工序报工',
  '/production/wip': '在制品看板',
  '/production/cost': '成本归集',
  '/production/aps': '高级排程',
  '/production/versions': '生产版本',
  '/production/ecn': '工程变更',
  '/production/subcontract': '委外加工',
  '/production/crp': '产能需求计划',
  '/production/equipment': '设备工装',
  '/production/mto': '按单生产',
  '/production/scheduling': '详细排程',
  '/production/gantt': '甘特排产',
  '/production/spc': '工序SPC',
  '/production/repetitive': '重复制造',
  '/production/mes': '制造执行集成',
  '/production/sop': '销售与运营计划',
  // 财务
  '/finance/invoices': '发票管理',
  '/finance/payments': '付款计划',
  '/finance/entries': '会计分录',
  '/finance/trial-balance': '科目余额表',
  '/finance/chart-accounts': '科目表',
  '/finance/vouchers': '凭证列表',
  '/finance/three-way': '三单匹配',
  '/finance/report': '财务报表',
  '/finance/tax': '税务核算',
  '/finance/project-accounting': '项目核算',
  '/finance/cash-flow': '现金流量表',
  '/finance/exchange-rates': '汇率管理',
  '/finance/aging': '账龄分析',
  '/finance/auxiliary': '辅助核算',
  '/finance/budget': '预算控制',
  '/finance/statements': '三大财务报表',
  '/finance/consolidated': '合并报表',
  '/finance/fixed-assets': '固定资产',
  '/finance/closing': '期末结账',
  '/finance/receivables': '应收管理',
  '/finance/payables': '应付管理',
  '/finance/copa': '获利分析',
  '/finance/cash': '资金管理',
  '/finance/bi': '商业智能集成',
  '/finance/esg': 'ESG报告',
  // 分析与报表
  '/reports': '报表中心',
  '/reports/designer': '报表设计器',
  '/reports/bi': 'BI自助分析',
  '/reports/permissions': '报表权限与订阅',
  '/analytics/cockpit': '经营驾驶舱',
  '/analytics/forecast': '需求预测与补货',
  '/analytics/ocr': '发票识别与凭证',
  '/analytics/chatbi': '对话式分析',
  '/analytics/alerts': '异常检测预警',
  '/analytics/price': '价格趋势分析',
  // 其它
  '/settings': '系统设置',
  '/test/flow': '全流程自检',
  '/help/manual': '使用说明书',
};
for (const [path, zh] of Object.entries(navZh)) {
  dict[`nav.${path}`] = { 'zh-CN': zh };
}

// ── 导航英文（只覆盖高管/外籍同事最常看的入口，其余回退中文，见文件头说明）──
const navEn: Record<string, string> = {
  '/': 'Dashboard',
  '/workbench': 'My Workspace',
  '/material/approvals': 'Material Approvals',
  '/vendor/approvals': 'Supplier Registration',
  '/purchase/approvals': 'Purchase Approvals',
  '/price/approvals': 'Price Approvals',
  '/settings/approval-flow': 'Custom Approval Flows',
  '/material/categories': 'Material Categories',
  '/material/list': 'Material List',
  '/material/valuation': 'Valuation & Price Control',
  '/vendor/list': 'Supplier List',
  '/vendor/blacklist': 'Blacklist',
  '/vendor/rating': 'Supplier Rating',
  '/vendor/performance': 'Performance Review',
  '/vendor/risk': 'Risk Scoring',
  '/vendor-portal/login': 'Supplier Portal',
  '/purchase/requests': 'Purchase Requests',
  '/purchase/orders': 'Purchase Orders',
  '/purchase/track': 'Delivery Tracking',
  '/purchase/framework': 'Framework Agreements',
  '/purchase/info-records': 'Purchasing Info Records',
  '/purchase/source-list': 'Source List',
  '/purchase/returns': 'Purchase Returns',
  '/price/inquiry': 'RFQ',
  '/price/comparisons': 'Quote Comparison',
  '/price/list': 'Price List',
  '/warehouse/inspection-notice': 'Inspection Notice',
  '/warehouse/inbound': 'Goods Receipt',
  '/warehouse/fg-inbound': 'FG Receipt',
  '/warehouse/outbound': 'Goods Issue',
  '/warehouse/check': 'Physical Inventory',
  '/warehouse/inventory': 'Stock Overview',
  '/warehouse/batch': 'Batch Management',
  '/warehouse/aging': 'Stock Aging',
  '/warehouse/barcode': 'Barcode Printing',
  '/warehouse/master': 'Warehouse Master',
  '/warehouse/transfer': 'Stock Transfer',
  '/warehouse/adjustment': 'Inventory Adjustment',
  '/warehouse/serial': 'Serial Numbers / HU',
  '/warehouse/trace': 'Batch Traceability',
  '/warehouse/consignment': 'Consignment Stock',
  '/warehouse/wave-rfid': 'Wave & RFID',
  '/sales/prospects': 'Prospects',
  '/sales/customers': 'Customer Master',
  '/sales/orders': 'Sales Orders',
  '/sales/contracts': 'Sales Contracts',
  '/sales/logistics': 'Shipping',
  '/sales/quotation': 'Quotations',
  '/sales/invoices': 'Sales Invoicing',
  '/sales/returns': 'Sales Returns',
  '/sales/atp': 'Available to Promise',
  '/sales/funnel': 'Sales Funnel',
  '/sales/rebates': 'Rebates',
  '/sales/customer-abc': 'Customer ABC Analysis',
  '/sales/triparty': 'Tri-party Sales',
  '/sales/analysis': 'Market Analysis',
  '/sales/projects': 'Project Management',
  '/quality/inspection': 'Inspection Tasks',
  '/quality/standards': 'Inspection Standards',
  '/quality/aql': 'AQL Sampling',
  '/quality/inspection-lot': 'Inspection Lots & COQ',
  '/quality/unqualified': 'Nonconformance',
  '/quality/pdca': 'PDCA Improvement',
  '/quality/8d': '8D Problem Solving',
  '/quality/spc': 'SPC Control Charts',
  '/quality/lab': 'Lab Equipment',
  '/quality/fmea': 'FMEA Analysis',
  '/quality/coa': 'Certificate of Analysis',
  '/quality/report': 'Quality Reports',
  '/bom/list': 'BOM List',
  '/bom/cost-rollup': 'Cost Roll-up',
  '/production/orders': 'Work Orders',
  '/production/routes': 'Routings',
  '/production/mrp': 'MRP Planning',
  '/production/report': 'Production Reports',
  '/production/capacity': 'Capacity Planning',
  '/production/operation-reporting': 'Operation Reporting',
  '/production/wip': 'WIP Board',
  '/production/cost': 'Cost Collection',
  '/production/aps': 'Advanced Scheduling',
  '/production/versions': 'Production Versions',
  '/production/ecn': 'Engineering Change',
  '/production/subcontract': 'Subcontracting',
  '/production/crp': 'Capacity Requirements Planning',
  '/production/equipment': 'Equipment & Tooling',
  '/production/mto': 'Make to Order',
  '/production/scheduling': 'Detailed Scheduling',
  '/production/gantt': 'Gantt Scheduling',
  '/production/spc': 'Process SPC',
  '/production/repetitive': 'Repetitive Manufacturing',
  '/production/mes': 'MES Integration',
  '/production/sop': 'Sales & Operations Planning',
  '/finance/invoices': 'Invoice Management',
  '/finance/payments': 'Payment Planning',
  '/finance/entries': 'Journal Entries',
  '/finance/trial-balance': 'Trial Balance',
  '/finance/chart-accounts': 'Chart of Accounts',
  '/finance/vouchers': 'Accounting Vouchers',
  '/finance/three-way': 'Three-way Match',
  '/finance/report': 'Financial Reports',
  '/finance/tax': 'Tax Accounting',
  '/finance/project-accounting': 'Project Accounting',
  '/finance/cash-flow': 'Cash Flow Statement',
  '/finance/exchange-rates': 'Exchange Rates',
  '/finance/aging': 'Aging Analysis',
  '/finance/auxiliary': 'Auxiliary Accounting',
  '/finance/budget': 'Budget Control',
  '/finance/statements': 'Financial Statements',
  '/finance/fixed-assets': 'Fixed Assets',
  '/finance/closing': 'Period-End Closing',
  '/finance/receivables': 'Accounts Receivable',
  '/finance/payables': 'Accounts Payable',
  '/finance/copa': 'Profitability Analysis',
  '/finance/cash': 'Treasury',
  '/finance/bi': 'BI Integration',
  '/finance/esg': 'ESG Reporting',
  '/reports': 'Report Center',
  '/reports/designer': 'Report Designer',
  '/reports/bi': 'Self-service BI',
  '/reports/permissions': 'Report Access & Subscription',
  '/analytics/cockpit': 'Executive Cockpit',
  '/analytics/forecast': 'Demand Forecast & Replenishment',
  '/analytics/ocr': 'Invoice OCR & Vouchers',
  '/analytics/chatbi': 'Conversational Analytics',
  '/analytics/alerts': 'Anomaly Alerts',
  '/analytics/price': 'Price Trend Analysis',
  '/settings': 'System Settings',
  '/test/flow': 'End-to-End Self Check',
  '/help/manual': 'User Manual',
};
for (const [path, en] of Object.entries(navEn)) {
  const key = `nav.${path}`;
  if (dict[key]) dict[key]['en-US'] = en;
}

export const I18N_CATALOG = dict;

/** 词条总数（「多语言」设置页展示用） */
export const CATALOG_SIZE = Object.keys(dict).length;

// ── 导航分组标题 key 映射：侧栏大组中文 → key ──
export const GROUP_LABEL_KEY: Record<string, string> = {
  审批中心: 'group.approval',
  主数据: 'group.masterData',
  供应链: 'group.supplyChain',
  销售管理: 'group.sales',
  生产与质量: 'group.productionQuality',
  财务与报表: 'group.financeReports',
  分析与报表: 'group.analytics',
  测试与诊断: 'group.testDiag',
};
