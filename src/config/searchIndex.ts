// ─────────────────────────────────────────────────────────────
// 全局搜索索引（单一数据源）
// 覆盖左侧导航的全部菜单页面，供 Header 顶栏搜索框使用。
// 新增/调整菜单后，请同步更新本文件，保证搜索与导航一致。
// ─────────────────────────────────────────────────────────────

export interface SearchEntry {
  /** 页面名称（与菜单一致） */
  label: string;
  /** 路由路径 */
  path: string;
  /** 一级模块（侧边栏分组） */
  module: string;
  /** 二级分类（侧边栏父菜单） */
  group: string;
  /** 关键词：英文 / 缩写 / 别名，提升搜索命中率 */
  keywords: string[];
  /** 一句话用途描述，结果列表的次要文案 */
  desc: string;
  /** 仅管理员（super_admin / admin）可见，对应后端已收口的特权配置入口 */
  adminOnly?: boolean;
}

export const searchIndex: SearchEntry[] = [
  // ── 首页 / 工作台 ──
  { label: '仪表盘', path: '/', module: '首页', group: '首页', keywords: ['dashboard', 'home', '首页', '总览'], desc: '经营指标总览与待办' },
  { label: '个人工作台', path: '/workbench', module: '首页', group: '首页', keywords: ['workbench', 'my', '待办', '工作台'], desc: '我的待办与常用入口' },

  // ── 审批中心 ──
  { label: '物料审批', path: '/material/approvals', module: '审批中心', group: '审批中心', keywords: ['material approve', '物料', '审批'], desc: '物料主数据新增/变更审批' },
  { label: '供应商注册审批', path: '/vendor/approvals', module: '审批中心', group: '审批中心', keywords: ['vendor approve', '供应商', '准入'], desc: '供应商准入审核' },
  { label: '采购审批', path: '/purchase/approvals', module: '审批中心', group: '审批中心', keywords: ['purchase approve', '采购', '审批'], desc: '采购申请与订单审批' },
  { label: '价格审批', path: '/price/approvals', module: '审批中心', group: '审批中心', keywords: ['price approve', '价格', '审批'], desc: '价格主数据审批' },

  // ── 主数据 · 物料 ──
  { label: '物料分类', path: '/material/categories', module: '主数据', group: '物料管理', keywords: ['material category', '分类', '物料组'], desc: '物料分类树维护' },
  { label: '物料列表', path: '/material/list', module: '主数据', group: '物料管理', keywords: ['material', 'item', '料号', '物料主数据'], desc: '物料主数据维护' },
  { label: '评估类与价控', path: '/material/valuation', module: '主数据', group: '物料管理', keywords: ['valuation', '评估类', '价控', '价格控制'], desc: '评估类/价格控制/工厂维度' },

  // ── 主数据 · 供应商 ──
  { label: '供应商列表', path: '/vendor/list', module: '主数据', group: '供应商管理', keywords: ['vendor', 'supplier', '供应商主数据'], desc: '供应商主数据' },
  { label: '黑名单', path: '/vendor/blacklist', module: '主数据', group: '供应商管理', keywords: ['blacklist', '黑名单', '禁入'], desc: '供应商黑名单' },
  { label: '评级管理', path: '/vendor/rating', module: '主数据', group: '供应商管理', keywords: ['rating', '评级', '等级'], desc: '供应商评级' },
  { label: '绩效考核', path: '/vendor/performance', module: '主数据', group: '供应商管理', keywords: ['performance', '绩效', '考核'], desc: '供应商绩效' },
  { label: '风险评分', path: '/vendor/risk', module: '主数据', group: '供应商管理', keywords: ['risk', '风险', '评分卡'], desc: '供应商风险评分卡' },
  { label: '供应商门户', path: '/vendor-portal/login', module: '主数据', group: '供应商管理', keywords: ['portal', '门户', '协同'], desc: '供应商协同平台' },

  // ── 供应链 · 采购 ──
  { label: '采购申请', path: '/purchase/requests', module: '供应链', group: '采购管理', keywords: ['pr', 'purchase request', '请购', '采购需求'], desc: '采购需求申请 PR' },
  { label: '采购订单', path: '/purchase/orders', module: '供应链', group: '采购管理', keywords: ['po', 'purchase order', '订单'], desc: '采购订单 PO' },
  { label: '交期跟踪', path: '/purchase/track', module: '供应链', group: '采购管理', keywords: ['track', '交期', '到货跟踪'], desc: '采购订单交期跟踪' },
  { label: '框架协议', path: '/purchase/framework', module: '供应链', group: '采购管理', keywords: ['framework', '框架', '长期协议'], desc: '长期采购框架协议' },
  { label: '采购信息记录', path: '/purchase/info-records', module: '供应链', group: '采购管理', keywords: ['info record', '信息记录', '价格记录'], desc: '供应商价格信息记录' },
  { label: '货源清单', path: '/purchase/source-list', module: '供应链', group: '采购管理', keywords: ['source list', '货源', '配额'], desc: '物料-供应商货源清单' },
  { label: '采购退货', path: '/purchase/returns', module: '供应链', group: '采购管理', keywords: ['return', '退货', '采购退回'], desc: '采购退货处理' },

  // ── 供应链 · 价格 ──
  { label: '询价单', path: '/price/inquiry', module: '供应链', group: '价格管理', keywords: ['inquiry', '询价', 'rfq'], desc: '向供应商询价' },
  { label: '比价单', path: '/price/comparisons', module: '供应链', group: '价格管理', keywords: ['comparison', '比价', '核价'], desc: '多供应商比价' },
  { label: '价目表', path: '/price/list', module: '供应链', group: '价格管理', keywords: ['price list', '价目表', '报价'], desc: '物料价格表' },

  // ── 供应链 · 仓储物流 ──
  { label: '报检单', path: '/warehouse/inspection-notice', module: '供应链', group: '仓储物流', keywords: ['inspection notice', '报检', '送检'], desc: '到货报检通知' },
  { label: '采购入库', path: '/warehouse/inbound', module: '供应链', group: '仓储物流', keywords: ['inbound', 'gr', '收货', '入库'], desc: '采购到货入库' },
  { label: '成品入库', path: '/warehouse/fg-inbound', module: '供应链', group: '仓储物流', keywords: ['fg inbound', '成品入库', '生产入库'], desc: '生产成品入库' },
  { label: '出库管理', path: '/warehouse/outbound', module: '供应链', group: '仓储物流', keywords: ['outbound', 'gi', '发货', '领料', '出库'], desc: '销售/领料出库' },
  { label: '库存盘点', path: '/warehouse/check', module: '供应链', group: '仓储物流', keywords: ['stocktake', '盘点', '盘盈盘亏'], desc: '库存盘点调整' },
  { label: '库存查询', path: '/warehouse/inventory', module: '供应链', group: '仓储物流', keywords: ['inventory', '库存', '结存'], desc: '实时库存查询' },
  { label: '批次管理', path: '/warehouse/batch', module: '供应链', group: '仓储物流', keywords: ['batch', '批次'], desc: '批次主数据' },
  { label: '库龄分析', path: '/warehouse/aging', module: '供应链', group: '仓储物流', keywords: ['aging', '库龄', '呆滞'], desc: '库存库龄分析' },
  { label: '条码打印', path: '/warehouse/barcode', module: '供应链', group: '仓储物流', keywords: ['barcode', '条码', '标签'], desc: '物料/批次条码' },
  { label: '仓库主数据', path: '/warehouse/master', module: '供应链', group: '仓储物流', keywords: ['warehouse master', '仓库', '库位'], desc: '仓库与库位' },
  { label: '跨组织转储', path: '/warehouse/transfer', module: '供应链', group: '仓储物流', keywords: ['transfer', '转储', '调拨'], desc: '组织间库存转储' },
  { label: '库存调整', path: '/warehouse/adjustment', module: '供应链', group: '仓储物流', keywords: ['adjustment', '调整', '盘盈'], desc: '库存盘盈盘亏调整' },
  { label: '序列号/HU', path: '/warehouse/serial', module: '供应链', group: '仓储物流', keywords: ['serial', '序列号', 'hu', '处理单元'], desc: '序列号与处理单元' },
  { label: '批次追溯穿透', path: '/warehouse/trace', module: '供应链', group: '仓储物流', keywords: ['trace', '追溯', '穿透'], desc: '批次全链路追溯' },
  { label: '寄售库存', path: '/warehouse/consignment', module: '供应链', group: '仓储物流', keywords: ['consignment', '寄售'], desc: '供应商寄售库存' },
  { label: '波次RFID', path: '/warehouse/wave-rfid', module: '供应链', group: '仓储物流', keywords: ['wave', 'rfid', '波次', '拣货', '射频'], desc: '波次拣货与 RFID 事件' },

  // ── 销售管理 ──
  { label: '意向客户', path: '/sales/prospects', module: '销售管理', group: '销售管理', keywords: ['prospect', '线索', '潜在客户', 'crm'], desc: '潜在客户跟进' },
  { label: '客户主数据', path: '/sales/customers', module: '销售管理', group: '销售管理', keywords: ['customer', '客户', '档案'], desc: '客户档案' },
  { label: '销售订单', path: '/sales/orders', module: '销售管理', group: '销售管理', keywords: ['so', 'sales order', '销售订单'], desc: '销售订单 SO' },
  { label: '销售合同', path: '/sales/contracts', module: '销售管理', group: '销售管理', keywords: ['contract', '合同'], desc: '销售合同' },
  { label: '物流发货', path: '/sales/logistics', module: '销售管理', group: '销售管理', keywords: ['logistics', '发货', 'shipment', '物流'], desc: '销售发货物流' },
  { label: '销售报价', path: '/sales/quotation', module: '销售管理', group: '销售管理', keywords: ['quotation', '报价', 'qp'], desc: '销售报价单' },
  { label: '销售开票', path: '/sales/invoices', module: '销售管理', group: '销售管理', keywords: ['sales invoice', '开票', '发票'], desc: '销售发票开具' },
  { label: '销售退货', path: '/sales/returns', module: '销售管理', group: '销售管理', keywords: ['sales return', '退货'], desc: '销售退货' },
  { label: '可用量承诺', path: '/sales/atp', module: '销售管理', group: '销售管理', keywords: ['atp', '可用量', '承诺'], desc: 'ATP 可用量检查' },
  { label: '销售漏斗', path: '/sales/funnel', module: '销售管理', group: '销售管理', keywords: ['funnel', '漏斗', '机会'], desc: '销售机会漏斗' },
  { label: '返利管理', path: '/sales/rebates', module: '销售管理', group: '销售管理', keywords: ['rebate', '返利'], desc: '客户返利' },
  { label: '客户ABC分析', path: '/sales/customer-abc', module: '销售管理', group: '销售管理', keywords: ['abc', '客户分级'], desc: '客户 ABC 分级' },
  { label: '市场分析', path: '/sales/analysis', module: '销售管理', group: '销售管理', keywords: ['analysis', '市场', '分析'], desc: '销售市场分析' },
  { label: '项目管理', path: '/sales/projects', module: '销售管理', group: '销售管理', keywords: ['project', '项目'], desc: '销售项目管理' },
  { label: '三方销售', path: '/sales/triparty', module: '销售管理', group: '销售管理', keywords: ['triparty', '三方', '代销', '寄售结算'], desc: '三方代销与实销结算' },

  // ── 生产与质量 · 质量 ──
  { label: '检验任务', path: '/quality/inspection', module: '生产与质量', group: '质量管理', keywords: ['inspection', '检验', 'iqc', 'oqc'], desc: '来料/过程/成品检验' },
  { label: '检验标准', path: '/quality/standards', module: '生产与质量', group: '质量管理', keywords: ['standard', '标准', '检验规范'], desc: '检验标准维护' },
  { label: 'AQL抽样', path: '/quality/aql', module: '生产与质量', group: '质量管理', keywords: ['aql', '抽样', 'sample'], desc: 'AQL 抽样检验' },
  { label: '检验批/COQ', path: '/quality/inspection-lot', module: '生产与质量', group: '质量管理', keywords: ['lot', 'coq', '检验批', '质量成本'], desc: '检验批与质量成本' },
  { label: '不合格品', path: '/quality/unqualified', module: '生产与质量', group: '质量管理', keywords: ['ncr', '不合格', '不良'], desc: '不合格品处理' },
  { label: 'PDCA改进', path: '/quality/pdca', module: '生产与质量', group: '质量管理', keywords: ['pdca', '改进', '持续改善'], desc: '质量 PDCA 改进' },
  { label: '8D问题求解', path: '/quality/8d', module: '生产与质量', group: '质量管理', keywords: ['8d', '问题求解', '根因'], desc: '8D 问题解决' },
  { label: 'SPC控制图', path: '/quality/spc', module: '生产与质量', group: '质量管理', keywords: ['spc', '控制图', '统计过程'], desc: '统计过程控制' },
  { label: '实验室设备', path: '/quality/lab', module: '生产与质量', group: '质量管理', keywords: ['lab', '实验室', '设备'], desc: '实验室设备管理' },
  { label: 'FMEA分析', path: '/quality/fmea', module: '生产与质量', group: '质量管理', keywords: ['fmea', '失效模式', '风险'], desc: '失效模式分析' },
  { label: 'COA合格证', path: '/quality/coa', module: '生产与质量', group: '质量管理', keywords: ['coa', '合格证', '质检单'], desc: '产品合格证' },
  { label: '质量报表', path: '/quality/report', module: '生产与质量', group: '质量管理', keywords: ['quality report', '质量报表'], desc: '质量统计报表' },

  // ── 生产与质量 · BOM ──
  { label: 'BOM列表', path: '/bom/list', module: '生产与质量', group: 'BOM管理', keywords: ['bom', '物料清单', '配方'], desc: '物料清单' },
  { label: '成本卷积', path: '/bom/cost-rollup', module: '生产与质量', group: 'BOM管理', keywords: ['cost rollup', '成本卷积', '标准成本'], desc: 'BOM 成本卷积' },

  // ── 生产与质量 · 生产 ──
  { label: '工单管理', path: '/production/orders', module: '生产与质量', group: '生产管理', keywords: ['work order', 'wo', '工单', '生产订单'], desc: '生产工单' },
  { label: '工艺路线', path: '/production/routes', module: '生产与质量', group: '生产管理', keywords: ['routing', '工艺路线', '工序'], desc: '工艺路线' },
  { label: 'MRP计划', path: '/production/mrp', module: '生产与质量', group: '生产管理', keywords: ['mrp', '物料需求计划', '计划'], desc: '物料需求计划' },
  { label: '生产报表', path: '/production/report', module: '生产与质量', group: '生产管理', keywords: ['production report', '生产报表'], desc: '生产统计' },
  { label: '产能排产', path: '/production/capacity', module: '生产与质量', group: '生产管理', keywords: ['capacity', '产能', '负荷'], desc: '产能负荷排产' },
  { label: '工序报工', path: '/production/operation-reporting', module: '生产与质量', group: '生产管理', keywords: ['operation', '报工', '完工'], desc: '工序完工报工' },
  { label: 'WIP看板', path: '/production/wip', module: '生产与质量', group: '生产管理', keywords: ['wip', '在制品', '看板'], desc: '在制品看板' },
  { label: '成本归集', path: '/production/cost', module: '生产与质量', group: '生产管理', keywords: ['cost', '成本', '归集'], desc: '工单成本归集' },
  { label: 'APS排程', path: '/production/aps', module: '生产与质量', group: '生产管理', keywords: ['aps', '高级排程', '排产'], desc: '高级计划排程' },
  { label: '生产版本', path: '/production/versions', module: '生产与质量', group: '生产管理', keywords: ['version', '生产版本'], desc: '生产版本管理' },
  { label: '工程变更ECN', path: '/production/ecn', module: '生产与质量', group: '生产管理', keywords: ['ecn', '工程变更', '变更'], desc: '工程变更' },
  { label: '委外加工', path: '/production/subcontract', module: '生产与质量', group: '生产管理', keywords: ['subcontract', '委外', '外协'], desc: '委外加工管理' },
  { label: 'CRP产能计划', path: '/production/crp', module: '生产与质量', group: '生产管理', keywords: ['crp', '能力需求', '产能计划'], desc: '能力需求计划' },
  { label: '设备工装', path: '/production/equipment', module: '生产与质量', group: '生产管理', keywords: ['equipment', '设备', '工装'], desc: '设备与工装' },
  { label: 'MTO生成', path: '/production/mto', module: '生产与质量', group: '生产管理', keywords: ['mto', '按单生产'], desc: '按单生产生成' },
  { label: '详细排程', path: '/production/scheduling', module: '生产与质量', group: '生产管理', keywords: ['scheduling', '详细排程', '工序排程'], desc: '工序详细排程' },
  { label: '甘特排产', path: '/production/gantt', module: '生产与质量', group: '生产管理', keywords: ['gantt', '甘特', '排产'], desc: '甘特图排产' },
  { label: '工序SPC', path: '/production/spc', module: '生产与质量', group: '生产管理', keywords: ['spc', '工序质量'], desc: '工序质量控制' },
  { label: '重复制造', path: '/production/repetitive', module: '生产与质量', group: '生产管理', keywords: ['repetitive', 'backflush', '重复制造', '倒冲'], desc: '重复制造产线与倒冲' },
  { label: 'MES集成', path: '/production/mes', module: '生产与质量', group: '生产管理', keywords: ['mes', '集成', '设备', 'wip'], desc: 'MES 连接与在制品同步' },
  { label: 'S&OP销售与运营计划', path: '/production/sop', module: '生产与质量', group: '生产管理', keywords: ['sop', '销售运营计划', '产销平衡', '需求预测', '供应计划'], desc: '需求预测与供应能力平衡的月度计划' },

  // ── 财务与报表 ──
  { label: '发票管理', path: '/finance/invoices', module: '财务与报表', group: '财务管理', keywords: ['invoice', '发票', '采购发票'], desc: '采购发票管理' },
  { label: '付款计划', path: '/finance/payments', module: '财务与报表', group: '财务管理', keywords: ['payment', '付款', '支付'], desc: '付款计划' },
  { label: '会计分录', path: '/finance/entries', module: '财务与报表', group: '财务管理', keywords: ['entry', '分录', '记账'], desc: '会计分录' },
  { label: '科目余额表', path: '/finance/trial-balance', module: '财务与报表', group: '财务管理', keywords: ['trial balance', '余额', '科目余额'], desc: '科目余额' },
  { label: '科目表', path: '/finance/chart-accounts', module: '财务与报表', group: '财务管理', keywords: ['chart of accounts', '科目', '会计科目'], desc: '会计科目表' },
  { label: '凭证列表', path: '/finance/vouchers', module: '财务与报表', group: '财务管理', keywords: ['voucher', '凭证', '会计凭证'], desc: '会计凭证' },
  { label: '三单匹配', path: '/finance/three-way', module: '财务与报表', group: '财务管理', keywords: ['three way', '三单匹配', '订单收货发票'], desc: '订单/收货/发票匹配' },
  { label: '财务报表', path: '/finance/report', module: '财务与报表', group: '财务管理', keywords: ['financial report', '财报'], desc: '财务报表' },
  { label: '税务核算', path: '/finance/tax', module: '财务与报表', group: '财务管理', keywords: ['tax', '税务', '增值税'], desc: '税务核算' },
  { label: '项目核算', path: '/finance/project-accounting', module: '财务与报表', group: '财务管理', keywords: ['project accounting', '项目核算'], desc: '项目成本核算' },
  { label: '现金流量表', path: '/finance/cash-flow', module: '财务与报表', group: '财务管理', keywords: ['cash flow', '现金流'], desc: '现金流量' },
  { label: '汇率管理', path: '/finance/exchange-rates', module: '财务与报表', group: '财务管理', keywords: ['exchange rate', '汇率'], desc: '汇率维护' },
  { label: '账龄分析', path: '/finance/aging', module: '财务与报表', group: '财务管理', keywords: ['aging', '账龄'], desc: '应收应付账龄' },
  { label: '辅助核算', path: '/finance/auxiliary', module: '财务与报表', group: '财务管理', keywords: ['auxiliary', '辅助核算', '核算项'], desc: '辅助核算项' },
  { label: '预算控制', path: '/finance/budget', module: '财务与报表', group: '财务管理', keywords: ['budget', '预算'], desc: '预算编制控制' },
  { label: '三大财务报表', path: '/finance/statements', module: '财务与报表', group: '财务管理', keywords: ['statements', '三大报表', '资产负债表'], desc: '三大报表' },
  { label: '合并报表', path: '/finance/consolidated', module: '财务与报表', group: '财务管理', keywords: ['consolidation', '合并', '多账簿', '集团报表', '抵消'], desc: '多账簿与集团合并报表（C2）' },
  { label: '固定资产', path: '/finance/fixed-assets', module: '财务与报表', group: '财务管理', keywords: ['fixed asset', '固定资产', '折旧'], desc: '固定资产管理' },
  { label: '期末结账', path: '/finance/closing', module: '财务与报表', group: '财务管理', keywords: ['closing', '结账', '月结'], desc: '期末结账' },
  { label: '应收管理', path: '/finance/receivables', module: '财务与报表', group: '财务管理', keywords: ['ar', 'receivable', '应收', '应收账款'], desc: '应收账款' },
  { label: '应付管理', path: '/finance/payables', module: '财务与报表', group: '财务管理', keywords: ['ap', 'payable', '应付', '应付账款'], desc: '应付账款' },
  { label: 'COPA获利分析', path: '/finance/copa', module: '财务与报表', group: '财务管理', keywords: ['copa', '获利分析', '毛利', '贡献'], desc: '按产品/客户/区域/期间的获利分析' },
  { label: '资金管理', path: '/finance/cash', module: '财务与报表', group: '财务管理', keywords: ['cash', '资金', '账户', '流水', '余额'], desc: '资金账户与收付款流水' },
  { label: 'BI集成', path: '/finance/bi', module: '财务与报表', group: '财务管理', keywords: ['bi', '商业智能', 'powerbi', 'tableau', '帆软', '看板', '集成'], desc: '外部 BI 平台连接与看板同步' },
  { label: 'ESG报告', path: '/finance/esg', module: '财务与报表', group: '财务管理', keywords: ['esg', '环境', '社会', '治理', '可持续', '碳'], desc: '环境/社会/治理可持续发展指标' },

  // ── 分析与报表 ──
  { label: '报表中心', path: '/reports', module: '分析与报表', group: '报表中心', keywords: ['report center', '报表'], desc: '报表查询中心' },
  { label: '报表设计器', path: '/reports/designer', module: '分析与报表', group: '报表中心', keywords: ['designer', '报表设计', '自定义'], desc: '自定义报表' },
  { label: 'BI自助分析', path: '/reports/bi', module: '分析与报表', group: '报表中心', keywords: ['bi', '自助分析', 'olap'], desc: '自助式 BI 分析' },
  { label: '报表权限与订阅', path: '/reports/permissions', module: '分析与报表', group: '报表中心', keywords: ['permission', '订阅', '报表权限'], desc: '报表权限订阅', adminOnly: true },
  { label: '经营驾驶舱', path: '/analytics/cockpit', module: '分析与报表', group: '分析与报表', keywords: ['cockpit', '驾驶舱', '大屏'], desc: '经营指标驾驶舱' },
  { label: '需求预测与补货', path: '/analytics/forecast', module: '分析与报表', group: '分析与报表', keywords: ['forecast', '预测', '补货'], desc: '需求预测补货' },
  { label: '发票OCR与凭证', path: '/analytics/ocr', module: '分析与报表', group: '分析与报表', keywords: ['ocr', '发票识别', '识别'], desc: '发票 OCR 识别' },
  { label: 'ChatBI对话分析', path: '/analytics/chatbi', module: '分析与报表', group: '分析与报表', keywords: ['chatbi', '对话分析', '问答'], desc: '对话式 BI' },
  { label: '异常检测预警', path: '/analytics/alerts', module: '分析与报表', group: '分析与报表', keywords: ['alert', '预警', '异常'], desc: '异常预警' },
  { label: '价格趋势分析', path: '/analytics/price', module: '分析与报表', group: '分析与报表', keywords: ['price trend', '价格趋势'], desc: '价格趋势分析' },
  { label: '数电票核验台账', path: '/analytics/invoice-verify', module: '分析与报表', group: '分析与报表', keywords: ['invoice', '核验', '发票核验', '数电票', '台账'], desc: '数电票批量核验与历史记录台账' },
  { label: '系统设置', path: '/settings', module: '系统', group: '系统设置', keywords: ['setting', '设置', '配置', '参数'], desc: '系统参数配置' },
  // A4/A5（V3.4.0）：多语言底座与数据容量守护 —— 均为管理员运维入口
  { label: '多语言', path: '/platform/i18n', module: '系统', group: '系统设置', keywords: ['i18n', 'locale', '语言', '翻译', 'english', '本地化'], desc: '界面语言切换、词条覆盖与缺失词条补录', adminOnly: true },
  { label: '数据容量守护', path: '/platform/data-capacity', module: '系统', group: '系统设置', keywords: ['capacity', '容量', '体积', '大对象', 'app_state', '存储上限', '运维'], desc: '各数据域体积监控与超限预警', adminOnly: true },
  { label: '字段级权限', path: '/platform/field-permissions', module: '系统', group: '系统设置', keywords: ['field permission', '字段权限', '遮蔽', '脱敏'], desc: '字段级可见性与遮蔽规则', adminOnly: true },
  { label: '使用说明书', path: '/help/manual', module: '系统', group: '帮助中心', keywords: ['manual', '说明书', '帮助', 'help', '文档'], desc: 'ERP 使用说明书' },
  { label: '账号登录', path: '/login', module: '系统', group: '账号', keywords: ['login', '登录', '注册', '账号', '密码', '登出', 'logout', '公司码'], desc: '账号注册/登录与多人协同' },
  { label: '全流程自检', path: '/test/flow', module: '系统', group: '测试与诊断', keywords: ['selftest', '自检', '测试', '流程'], desc: '业务流程自检' },
];
