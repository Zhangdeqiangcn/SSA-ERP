// 行级安全(RLS)应用层策略 —— D1/SQLite 无原生 RLS，统一在此强制。
//
// ── V3.3.0（评测 L-04 整改）：由「部分登记 + 默认共享」改为「显式全量登记 + 默认拒绝」──
// 缺陷原状：原 TABLE_RLS 只显式登记了 11 张表，其余业务表落在 `?? 'all'` 这个分支上——
//   即「没登记 = 组织内全员可见」。后果是新增业务表时一旦漏登记，不会有报错、不会有
//   日志、不会有任何提示，直接变成全组织可见。这属于最危险的一类安全默认值（默认放行）。
// 现改为三层结构：
//   ① `RLS_SCOPE`：**覆盖全部业务表**，逐张显式给出 all/own/dept，新增业务表必须在此登记；
//   ② `RLS_EXEMPT`：平台/基础设施表显式豁免，并逐条写明「为什么它不走业务数据可见性」；
//   ③ 未登记的表一律 **默认拒绝**（子句 `1=0`，查不到任何行）+ 响亮告警，
//      使「漏登记」以「功能不可用 + 有告警」的形式立刻暴露，而不是静默放行。
//
// 为什么默认拒绝用 `1=0` 而不是收窄成 'own'：
//   未登记表的实际列结构未知。若它没有 owner_id 列，收窄成 'own' 会生成
//   `owner_id = ?` 直接把 SQL 打挂（no such column）→ 500 错误；
//   而 `1=0` 不依赖任何列，是唯一「既安全、又能给出可读结果（空列表）」的兜底。
import type { SessionUser } from './auth';

// 表 → 可见性范围
//  'all'  : 组织内全员可见（共享主数据 / 共享单据，仅靠 org_id 做组织隔离）
//  'own'  : 仅 owner_id = 本人，或遗留数据(owner_id IS NULL)全员可见
//  'dept' : 仅 dept_id = 本人部门
export type RlsScope = 'all' | 'own' | 'dept';

/** 业务表可见性登记表（**全量**，不得有遗漏；新增业务表必须在此登记） */
export const RLS_SCOPE: Record<string, RlsScope> = {
  // ── 共享主数据 / 共享单据：组织内全员可见 ──────────────────────────
  materials: 'all',                 // 物料主数据
  material_categories: 'all',        // 物料分类（V3.94.0 落库：组织级共享主数据，与 materials 同属性）
  bom_headers: 'all',               // BOM 清单头（V3.6.0 C1）：研发/生产/采购共同查阅的基础资料，与 materials 同属性
  bom_items: 'all',                 // BOM 明细行（V3.6.0 C1）：从属于表头，可见性与表头一致
  material_substitutes: 'all',      // 物料替代关系
  work_orders: 'all',               // 工单
  work_order_pickings: 'all',       // 工单领料
  planned_orders: 'all',            // 计划订单（V3.5.0 B2）：与工单同属性，是组织内的共享计划单据
  vouchers: 'all',                  // 会计凭证
  voucher_items: 'all',
  // ── 凭证模板域（V3.26.0）：与 vouchers 同属性（组织级共享配置） ──────
  voucher_templates: 'all',          // 凭证模板头
  voucher_template_items: 'all',     // 模板分录行，从属模板，可见性一致
  // ── 财务域其余切片（V3.7.0 C1）：与 vouchers 同属性 ────────────────
  // 财务数据是组织级共享单据/主数据；此前它们散落在 app_state 的 JSON 大对象里，
  // 根本走不到 RLS 判定（没有表可判），等于绕过了行级权限。
  // 迁入关系表后必须逐张登记，否则会被「未登记默认拒绝」拦下（这正是该机制的作用）。
  fin_invoices: 'all',                             // 发票
  fin_payment_plans: 'all',                        // 付款计划
  // ★ V3.61.0 P0-2：销售收款单。与发票/付款计划同属性=组织内共享（'all' ≠跨组织放行，
  //   rlsCondition 仍会拼 org_id 条件），财务角色全组织可见、非财务角色按 default 处理。
  fin_sales_receipts: 'all',
  fin_payment_plan_installments: 'all',            // 付款计划的期次明细，从属计划
  fin_account_entries: 'all',                      // 会计分录（legacy 来源）
  fin_tax_records: 'all',                          // 税务记录
  fin_project_accounts: 'all',                     // 项目核算
  fin_project_cost_items: 'all',                   // 项目核算的成本明细，从属核算单（V3.8.0 新增表）
  fin_chart_of_accounts: 'all',                    // 会计科目（主数据）
  fin_tax_codes: 'all',                            // 税码主数据（V3.96.0 新增：组织级共享主数据，采购/财务审批供应商时选择）
  fixed_assets: 'all',                             // 固定资产（#13 折旧计提服务端化，V3.17.1 迁入关系表，与凭证同属财务域）
  // ── 打印模板域（V3.7.0 C1）──────────────────────────────────────
  print_templates: 'all',                          // 打印模板（组织级基础配置，全员可用于打印）
  print_template_assets: 'all',                    // 模板图片资源，从属模板、可见性一致
  print_template_asset_chunks: 'all',              // 图片二进制分片（V3.7.0）：一片一行，从属资源
  // ── 销售域其余切片（V3.9.0 C1）：与 sales_orders 同为 'own' ──────
  // ⚠️ 这里刻意取 'own' 而不是 'all'，与财务域的选择相反，理由是业务性质：
  //   · 财务数据（凭证/发票/付款计划）是组织级共享单据，出纳、会计、主管
  //     都要看同一批数据，按人隔离会让对账直接做不下去 → 'all'
  //   · 销售线索与项目是**销售员个人业绩资产**：意向客户信息、跟进记录、
  //     项目报价与成本，同组织内互相可见就是内部抢单与信息泄露。
  //     sales_orders / customers 原本就是 'own'，这三个切片与之同属性，
  //     必须保持一致 —— 否则会出现「看不到别人的订单，但能看到他所有
  //     意向客户和项目成本」这种明显自相矛盾的权限缝隙。
  //   · 遗留数据（owner_id IS NULL）对全员可见，避免历史数据凭空消失。
  sales_prospects: 'own',                          // 意向客户（销售员自有意向客户）
  sales_prospect_followups: 'own',                 // 跟进记录，从属意向客户
  shipments: 'own',                                // 发货单（对应 sales_orders 归属）
  shipment_items: 'own',                           // 发货明细，从属发货单
  projects: 'own',                                 // 项目（含报价与成本，销售员自有）
  project_milestones: 'own',                       // 项目里程碑，从属项目
  project_exceptions: 'own',                       // 项目异常，从属项目
  // ── 审批流（V3.10.0）：'all'，与销售域刻意相反 ──────────────────
  //   审批流是**公司级公共配置**：全公司共用同一套审批规则，
  //   「采购订单超过 20 万要财务审批」这条规则对所有人都一样。
  //   若登记成 'own'，会出现「每个人只看到自己建的那几条流程」——
  //   结果是不同的人走不同的审批链，而这正是审批制度最不能出现的情况。
  //   注意区分：审批流的**配置**是公共的，而**审批产生的单据**（待办、
  //   审批记录）归发起人，那些属于各自的业务表，不在本域。
  //   成员表 approval_flow_nodes 从属流程，同理 'all'。
  approval_flows: 'all',                           // 审批流定义（公司级公共配置）
  approval_flow_nodes: 'all',                      // 审批节点，从属审批流
  inventory_adjustments: 'all',     // 库存调整
  inventory_adjustment_items: 'all',
  stock_transfers: 'all',           // 调拨
  stock_transfer_items: 'all',
  subcontract_orders: 'all',        // 委外
  subcontract_issue_items: 'all',
  quality_holds: 'all',             // 质量冻结
  inspection_tasks: 'all',          // 检验任务（V3.63 关系化）
  inspection_standards: 'all',      // 检验标准
  unqualified_items: 'all',          // 不合格品
  pdca_records: 'all',              // PDCA 改进
  vendor_performance: 'all',        // 供应商绩效（V3.63 关系化）
  sales_returns: 'all',             // 销售退货（V3.63 关系化）
  purchase_returns: 'all',          // 采购退货（V3.63 关系化）
  framework_agreements: 'all',      // 供应商框架协议头（V3.65 立项④ 协议价基准，组织共享主数据）
  // V3.66.0 页面级联动审计 P0 数据地基：检验批台账/编号规则/批次台账 关系化
  inspection_lots: 'all',           // 检验批台账（与服务端 checkQualityBlocked 同源，根治台账-拦截错位）
  numbering_rules: 'all',           // 编号规则（组织共享配置，多终端不再漂移）
  batch_records: 'all',             // 批次台账（批次级成本/库位对账）
  order_templates: 'all',          // 订单模板（组织共享配置，items 封 extra_json）
  data_dict: 'all',                // 数据字典（组织共享枚举，每值一行）
  // V3.66.0 页面级联动审计 P1 关系化：排程锁/返利/合同（多用户共享真源）
  scheduling_locks: 'all',         // 详细工序排程锁（多用户排产互不可见 → 共享）
  rebate_rules: 'all',             // 返利规则
  rebate_settlements: 'all',       // 返利结算
  sales_contracts: 'all',          // 销售合同（履约/回款跟踪）
  framework_agreement_items: 'all', // 框架协议物料行（ceiling_price 协议价上限，从属头表）
  serial_masters: 'all',            // 序列号主档
  serial_movements: 'all',
  three_way_match: 'all',           // 三单匹配
  finished_goods_inbounds: 'all',   // 成品入库
  fx_rates: 'all',                   // 汇率（组织级公共参数）
  sop_plans: 'all',                 // S&OP 计划
  cash_accounts: 'all',             // 资金账户
  cash_flows: 'all',                // 资金流水
  triparty_sales: 'all',            // 三方销售
  rep_mfg_lines: 'all',             // 重复制造
  rep_mfg_periods: 'all',
  copa_analysis: 'all',             // 获利分析
  mes_connections: 'all',           // MES 集成
  mes_devices: 'all',
  mes_wips: 'all',
  mes_operation_reports: 'all',
  wave_rfid: 'all',                 // 波次 / RFID
  wave_rfid_tags: 'all',
  // ══════ V3.92.0 P1 电商化（迁移 0101 / 0102）═══════
  // 订单中台 + 渠道 + 仓储执行层：均为组织内共享运营数据，登 'all'（组织隔离靠 org_id）。
  // ⚠️ 这 8 张在 P1 / P1-5 阶段新建，初期漏登会导致 rlsCondition 默认拒绝（查空集）——功能静默不可用，
  //    故在此一次性补齐登记（与 wave_rfid 同属性）。
  order_hub: 'all',              // 订单中台（各渠道归一化统一订单）
  channel_credentials: 'all',    // 渠道凭证（密钥后端持有，组织内共享配置，前端不可读明文）
  channel_bindings: 'all',       // 店铺绑定 + SKU 映射
  channel_sync_logs: 'all',      // 渠道同步审计流水
  waves: 'all',                  // 波次（仓储执行批次）
  pick_tasks: 'all',             // 拣货任务
  pack_records: 'all',           // 打包记录
  ship_checks: 'all',            // 发货校验
  // ⚠️ P1-6 物流面单：运单 + 物流轨迹，组织内共享运营数据，登 'all'（组织隔离靠 org_id）。
  //    漏登会触发 rlsCondition 默认拒绝（查空集）——功能静默不可用，与上面 8 张 P1 表同坑，务必登记。
  waybills: 'all',               // 电子面单（承运商运单）
  logistics_tracks: 'all',       // 物流轨迹回写流水
  bi_integrations: 'all',           // BI 集成
  esg_reports: 'all',               // ESG 报表
  messages: 'all',                  // 站内消息
  check_tasks: 'all',               // 盘点任务
  inventory_alerts: 'all',          // 库存预警
  warehouses: 'all',             // 仓库主数据（W4 整改：迁真实 D1，全组织共享基础资料，与 materials 同属性）
  // V3.76.0 B 类第 4 批：应收应付台账 + Blob 残余迁 D1（迁移 0100）
  fin_receivables: 'all',        // 应收台账（原 arapStore Blob；与凭证 1122 科目同源可对）
  fin_payables: 'all',           // 应付台账（原 arapStore Blob；与凭证 2202 科目同源可对）
  consignment_stocks: 'all',     // 寄售库存（原 consignmentStore Blob）
  purchase_info_records: 'all',  // 采购信息记录（原 purchaseInfoRecordStore Blob）
  sales_quotations: 'all',       // 销售报价（原 salesAdvancedStore quotations 切片 Blob，items 封 extra_json）
  sales_invoices: 'all',         // 销售发票（V3.112.0 持久化：原内存态切片，items 封 extra_json）

  // ══════ V3.77.0 全模块联动审计整改·数据地基（迁移 0101）═══════
  // 本地孤岛 store 迁 D1（统一 payload 列）；均为组织内共享基础资料/配置。
  ecns: 'all',                     // 工程变更（物料域 ECN）
  production_versions: 'all',      // 生产版本
  production_ecns: 'all',          // 工程变更（生产域 ECN）
  price_inquiries: 'all',          // 询价
  price_quotations: 'all',         // 报价
  price_comparisons: 'all',        // 比价
  price_approvals: 'all',          // 价格审批
  price_lists: 'all',              // 价目表
  coa_reports: 'all',              // 质量 COA 检验报告
  vendor_portals: 'all',           // 供应商门户业务数据
  sales_prices: 'all',             // 销售价目表
  material_extensions: 'all',      // 物料扩展属性
  quality_extensions: 'all',       // 质量扩展属性
  material_approvals: 'all',       // 物料审批
  finance_extensions: 'all',       // 财务扩展属性
  system_settings: 'all',          // 系统设置（集成/移动端配置等）
  report_permissions: 'all',       // 报表权限
  data_permissions: 'all',         // 数据权限
  system_users: 'all',              // 设置侧用户目录（与鉴权 users 表解耦）
  system_orgs: 'all',               // 设置侧组织目录（与鉴权 orgs 表解耦）

  // ══════ V3.80.0 强协作型本地 blob store 迁 D1（迁移 0102）═══════
  // 均为组织内多人协作共享数据，登 'all'（组织隔离靠 org_id，'all' ≠ 跨组织放行）。
  flow_shared: 'all',                // 报检/供应商申请/订单确认/发货/质量问题/改进报告/对账/发票申请（flowStore 8 切片，__kind 分流）
  equipment_ledger: 'all',           // 设备台账 + 保养工单（equipmentStore 双切片，__kind 分流）
  invoice_verification: 'all',       // 数电票核验批次台账（财务多人）
  purchase_conditions: 'all',        // 采购价格/折扣/运费条款（采购多方）
  source_lists: 'all',               // 货源清单（采购多方）
  slow_moving_disposals: 'all',      // 呆滞物料处置决策（仓储/采购）

  // ══════ V3.81.0 B 类共享配置/留痕型 blob store 迁 D1（迁移 0103）═══════
  // 均为组织内共享配置/留痕，登 'all'（组织隔离靠 org_id）。
  custom_fields: 'all',              // 自定义字段定义（三实体，整块 config 单行）
  alert_rules: 'all',                // 异常预警规则（整块 config 单行）
  fmea_items: 'all',                 // FMEA 分析记录（逐行）
  integration_shared: 'all',         // 外部系统集成：webhooks + webhookLogs（__kind 分流）
  low_code_shared: 'all',            // 低代码：表单定义 + 表单记录（__kind 分流）
  workflow_shared: 'all',            // 通用工作流：定义 + 实例（__kind 分流，实验性）
  analytics_shared: 'all',           // 智能分析：预测建议 + OCR 历史（__kind 分流）
  // ════ V3.95.0 自动化设置中心（迁移 0113）：组织内共享配置/留痕，登 'all'（隔离靠 org_id）═══
  automation_config: 'all',          // 自动化配置（全局默认 + 按物料分类覆盖，整块 config 单行）
  automation_logs: 'all',            // 自动化运行日志（逐行：谁/何时/哪段/结果）

  // ── 归属本人：业务员只看自己名下的 ──────────────────────────────
  customers: 'own',                 // 销售看自己客户
  sales_orders: 'own',              // 销售看自己订单
  sales_order_items: 'own',
  vendors: 'own',                   // 供应商门户登录表（历史保留，主数据已迁 vendor_master）
  vendor_master: 'own',             // 采购看自己供应商主数据
  // V3.100.0：采购员定向邀请供应商注册（迁移 0115）。邀请记录归发起采购员本人，
  //   与 vendors / vendor_master 同属性（'own'）；admin/super 特权绕过看全部。
  //   注意：公开查询/提交接口（/api/vendor-invite、/api/vendor-application-public）
  //   不进 RLS——按邀请码直查、按邀请码写 flow_shared，org_id 取自邀请记录。
  vendor_invitations: 'own',
  purchase_orders: 'own',           // 采购看自己订单
  purchase_order_items: 'own',
  // ── 采购域（V3.11.0 C1 第六域）：同一业务域内两张表刻意不同 ──────
  //   · 采购申请 = 个人提报的单据（applicant 即提报人）→ 'own'，
  //     与 purchase_orders / sales_orders 同属性，保持一致。
  //   · 供应商报价 = **比价用的公共信息** → 'all'。
  //     采购员与审批人都必须看到全部报价才能比出最低价；
  //     若误登 'own'，表现是「别人提交的报价我看不到 → 比价页永远只有自己那份」，
  //     而比价的全部意义就在于横向对比。
  //   ★ 这两条是同域内的直接对照，最能说明「权限值必须逐张按业务语义定」。
  purchase_requests: 'own',
  purchase_request_items: 'own',
  vendor_quotes: 'all',
  vendor_quote_items: 'all',
  // ── 生产域（V3.12.0 C1 第七域）：三张表全取 'all'，逐张说明理由 ──
  //   · 工艺路线 = 「这个产品该怎么造」的**公司级制造标准**，与 BOM 同属性
  //     （bom_headers 已 'all'）。车间主任 / 工艺员 / 计划员要看同一份。
  //     误登 'own' 的表现：工单创建时工艺路线下拉框**少几项、零报错**
  //     → 开不出工单，而没人会想到是权限问题。
  //   · MRP 建议 = **中央计划的输出**，由共享的 BOM / 库存 / 工单算出，
  //     谁跑都是同一结果，不是个人资产（与 planned_orders 同属性，V3.5.0 已 'all'）。
  //     误登 'own' 的表现：计划员 A 看不到 B 算的建议 → **对同一物料重复下单**。
  //   ★★ 与采购域的对照要说清：采购域是「同域内两张表刻意相反」
  //     （申请 'own' / 报价 'all'），因为那里有「个人提报单据」这一属性。
  //     本域三张表**没有**这种对立 —— 不能为了制造对照而制造差异，
  //     权限值的唯一依据是业务语义。同域 work_orders 早已是 'all'，三张新表与之保持一致。
  process_routes: 'all',
  process_route_operations: 'all',
  mrp_recommendations: 'all',
  // ── C2 合并报表/多账簿（V3.13.0）：组织级共享配置与合并结果 ──────
  //   账簿定义、合并范围、抵消规则是**公司级公共配置**（与审批流同属性，
  //   误登 'own' 会"别人建的账簿/规则我看不到"）；合并结果快照是共享的查询产物。
  //   真正的"跨组织读取"不由 RLS 承担 —— 它在 /api/consolidation 端点内
  //   按 group_id 成员做了显式权限校验（详见该端点）。
  ledger_books: 'all',
  consolidation_groups: 'all',
  elimination_rules: 'all',
  consolidation_runs: 'all',

  // ── 按部门：仓储域按部门隔离 ────────────────────────────────────
  inbound_orders: 'dept',
  inbound_order_items: 'dept',
  outbound_orders: 'dept',
  outbound_order_items: 'dept',
  inventory_records: 'dept',

  // ── 库存流水台账（V3.46.0 第2批①，迁移 0080）────────────────────
  // 登 'dept'：流水是库存余额的**追溯依据**（余额可由流水 SUM 重建），
  //   可见范围必须与 inventory_records 一致，否则会出现「余额看得见、流水看不见」
  //   ——恰好把对账能力废掉（能看余额却看不到变动原因，等于没法查账）。
  inventory_transactions: 'dept',

  // ── 财务配置：结账期间 / 预算（V3.46.0 第2批②，迁移 0081）──────
  // 登 'all'：这两张是**组织级管控配置**（期间锁、预算额度），不是某人的私有数据。
  //   若登 'own'/'dept'，跨部门用户读不到自己被预算限制的额度，
  //   会出现「付款被拦但界面不显示预算」的错判；期间锁同理（看不到＝不知道被锁）。
  fin_closing_periods: 'all',
  fin_budgets: 'all',

  // ── 生产运营域（V3.46.0 第2批③，迁移 0082）────────────────────
  // 工作中心 / 成本费率登记为 'all'：两者都是**全厂统一的管控主数据**，
  //   排产必须看到全部工作中心、成本核算必须用同一套费率；
  //   若按部门隔离，跨车间排产会以为产能不存在、费率会各算各的。
  work_centers: 'all',
  production_rates: 'all',

  // ── 发票明细（V3.47.0 第3批 3-05，迁移 0083）────────────────────
  // 登 'dept'：与 fin_invoices（发票头）保持一致 —— 明细必须随头同范围可见，
  //   否则会出现"能看到发票金额、看不到发票明细"的错位（对不上账又查不出原因）。
  fin_invoice_items: 'dept',

  // ── 审批实例域（V3.17.9 迁移 0075，修复差距 9/10/11）────────────
  // 审批实例登记为 'all' 而不是 'own'：**审批是跨人的协作过程**。
  //   若登 'own'，审批人按 owner_id 过滤就看不到「别人提交、轮到我批」的单子
  //   （owner_id 是提交人，不是审批人），审批中心会直接空掉 —— 这是最典型的
  //   「把协作数据误当成个人数据」的错登记。
  //   真正的可见性收敛不靠 RLS，而是靠端点内的视图条件
  //   （view=pending 收敛到「当前审批人是我或委托给我的」、
  //     view=submitted 收敛到「提交人是我」）——见 /api/approval-instances。
  approval_instances: 'all',
  approval_actions: 'all',     // 动作流水，从属实例，可见性必须与实例一致
  approval_delegates: 'all',   // 委托关系：审批路由要跨人查询，且端点内已按 delegator/delegate 收敛

  // ── 基础数据（补登记）────────────────────────────────────────
  // ★ 补登记原因（V3.17.9）：迁移 0074 / 0073 新增这两张表时漏登。
  //   当前两处端点都走原生 SQL、不经 rlsCondition，所以没有造成静默空表；
  //   但违反「全量登记」铁律，且一旦将来有端点按通用方式查它就会静默返回空 ——
  //   这正是 V3.3.0 把默认值从「放行」反转成「默认拒绝」要防的那类隐患。
  //   unit_conversions 是**全局**换算规则（无 org_id 列），故 'all' 后不加 org 过滤也不越权；
  //   idempotency_keys 是技术表（密钥→结果 id 映射），按 org_id 隔离，'all' 表示组织内不做二次收窄。
  unit_conversions: 'all',
  idempotency_keys: 'all',

  // ── 外部 ERP 同步域（V3.68.0 迁移 0098）──────────────────────
  // 连接配置 / 运行历史 / 逐行结果：组织级共享的配置与账本，与 backupSchema 同口径
  // （discoverTables 仅导出业务表，系统表天然排除）。三张表均按 org_id 隔离，
  // 端点内再限定 connection_id 归属本组织，'all' 表示组织内不做二次收窄。
  erp_sync_connections: 'all',
  erp_sync_runs: 'all',
  erp_sync_run_items: 'all',
};

/**
 * 平台 / 基础设施表：**显式豁免**行级策略，逐条注明原因。
 * 这些表不承载「业务数据可见性」，其访问控制由各自的机制负责（角色、状态、归属校验等），
 * 因此不纳入 RLS_SCOPE。豁免必须写明理由——不允许出现「没写理由的豁免」。
 */
export const RLS_EXEMPT: Record<string, string> = {
  users: '账号表，访问控制由 role / status 与管理员收口负责',
  orgs: '组织表，登录与会话准入单独校验（V3.2.0 组织闸门）',
  org_code_history: '已吊销邀请码历史（V3.15.5 迁移 0069）：仅服务端在「注册时识别旧码」与「邀请码轮换」两处用原生 SQL 读写，从不下发客户端；访问控制由注册校验链路与 RLS_PRIVILEGED（管理员/超管）收口。★ 补登记原因：V3.15.5 新增该表时漏登，由 `npm run check`（登记表↔生产库）机器核对抓出——漏登本身不会造成静默空表（两处都未走 rlsCondition），但违反「全量登记」铁律，且一旦将来有端点按通用方式查它就会静默返回空。',
  org_settings: '组织级配置，写操作收口管理员',
  system_config: '系统配置，特权键写删收口管理员',
  app_state: '前端状态键值表，按 org 键空间隔离',
  app_state_metrics: '业务键体积指标（V3.4.0 A5），按 org 维度记录，仅管理员经 /api/state/metrics 读取',
  sessions: '登录会话表，按 token 归属校验',
  audit_logs: '审计日志，读按角色收敛（管理员全组织 / 其余本人）',
  audit_degraded: '审计降级留痕（V3.3.0），仅管理员可读',
  login_attempts: '登录限流计数，按 用户名+来源地址 维度',
  mail_logs: '邮件发送日志，仅管理员可读',
  email_verifications: '邮箱验证码，按账号+用途校验',
  security_mail_queue: '安全邮箱投递队列，内部通道',
  security_tickets: '安全工单（改密等），凭据票据校验',
  api_keys: '接口密钥，归属按 org 校验，开放网关单独鉴权',
  job_ticks: '后台任务推进留痕，仅管理员可读',
  job_runs: '后台任务投递留痕，仅管理员可读',
  schema_migrations: '平台迁移登记表',
  d1_migrations: 'Cloudflare 迁移工具自建的迁移账本表（本地实测发现，非业务数据）',
};

// ⚠️ 登记表必须「只登记真实存在的表」。
// 反例（V3.3.0 生产门禁抓出）：本表曾登记 `schema_migrations_new`——它是迁移 0009
// 的**临时表**（建表 → 拷贝数据 → `ALTER TABLE ... RENAME TO schema_migrations`），
// 改名后即不复存在，因此任何真实库都不会有它。一旦登记了不存在的表，
// 「实有表 = 登记 + 豁免 + 平台内部」这类守恒式就永远差 1 且难以定位。
// 现由 `findStaleRegistryEntries()` 做机器核对：登记了但库里不存在的，一律回报为「僵尸登记」。

/**
 * 平台内部表前缀：由运行时或迁移工具自建、不承载业务数据。
 * 这类表**不适用**行级策略，也不需要逐张登记（平台可能随时新增），
 * 因此按前缀排除；但排除是**可见的**——接口会把被排除的表名一并回报，不做隐藏。
 *   sqlite_  → SQLite 内部表（sqlite_sequence 等）
 *   _cf_     → Cloudflare 运行时内部表（_cf_KV、本地预览的 _cf_METADATA 等）
 */
export const RLS_PLATFORM_PREFIXES = ['sqlite_', '_cf_'];

export function isPlatformTable(table: string): boolean {
  return RLS_PLATFORM_PREFIXES.some((p) => table.startsWith(p));
}

/** 未登记表的兜底可见性 = 拒绝全部行 */
export const RLS_DENY_CLAUSE = '1=0';

/** 豁免角色：看全部（平台超管 / 组织管理员） */
export const RLS_PRIVILEGED = new Set(['super_admin', 'admin']);

export function isRlsPrivileged(role: string): boolean {
  return RLS_PRIVILEGED.has(role);
}

/** 表是否已在策略中显式处理（登记或豁免） */
export function isRlsKnown(table: string): boolean {
  return Object.prototype.hasOwnProperty.call(RLS_SCOPE, table)
    || Object.prototype.hasOwnProperty.call(RLS_EXEMPT, table);
}

/**
 * 用**数据库真实表清单**核对登记完整性。
 * 这是 L-04「显式全量登记」的机器校验闭环：
 *   登记表写没写全，不能靠人记得住——拿真实库里的表逐个比对，任何一张
 *   「既不在 RLS_SCOPE、也不在 RLS_EXEMPT」的表都会被列出来。
 *   门禁套件断言该结果为**空**，从而把「漏登记」变成一道会拦住发布的检查。
 *
 * 首次本地实测即靠这条检查抓出 `d1_migrations`（wrangler 迁移账本）漏登记——
 *   说明「靠人记得住」确实不成立，机器核对是必要的。
 *
 * @param allTables 来自 `SELECT name FROM sqlite_master WHERE type='table'`
 */
export function findUnclassifiedTables(allTables: string[]): string[] {
  return allTables
    .filter((t) => !!t && !isPlatformTable(t))
    .filter((t) => !isRlsKnown(t))
    .sort();
}

/** 被按前缀排除的平台内部表（仅供管理端如实展示，不做隐藏） */
export function findPlatformTables(allTables: string[]): string[] {
  return allTables.filter((t) => !!t && isPlatformTable(t)).sort();
}

/**
 * 「僵尸登记」核对：登记在案、但数据库里并不存在的表。
 *
 * 为什么需要它：漏登记（库里有的没登记）由 `findUnclassifiedTables` 负责；
 * 而它的反面——登记了一堆不存在的表——会把「实有表 = 登记 + 豁免 + 平台内部」
 * 这类守恒式悄悄破坏掉（差额恒定存在、却看不出是哪张表造成）。
 * V3.3.0 生产门禁即以 68 ≠ 69 暴露了 `schema_migrations_new`（迁移 0009 的临时表）。
 * 僵尸登记虽不像漏登记那样有越权后果，但会让登记清单失去可信度——
 * 一份「包含不存在条目」的清单，无法再作为权限审计的依据。
 */
export function findStaleRegistryEntries(allTables: string[]): string[] {
  const real = new Set(allTables.filter((t) => !!t));
  return [...Object.keys(RLS_SCOPE), ...Object.keys(RLS_EXEMPT)]
    .filter((t) => !real.has(t))
    .sort();
}

// ── 未登记表「默认拒绝」的可观测性 ─────────────────────────────────
// rlsCondition 是同步函数，无法在此写库，故：① 每次命中打结构化错误日志（按表名去重，
// 避免刷屏）——这是主要信号，Cloudflare 平台日志可直接检索；② 进程内计数，供
// /api/system/audit-health 读取（隔离实例回收后重新计数，属预期，仅作趋势参考）。
// 真正的「不漏登记」保证放在门禁断言里（对比迁移建表清单做静态核对）。
const unregisteredHits = new Map<string, number>();
const unregisteredLogged = new Set<string>();

export function recordUnregisteredTable(table: string): void {
  unregisteredHits.set(table, (unregisteredHits.get(table) || 0) + 1);
  if (!unregisteredLogged.has(table)) {
    unregisteredLogged.add(table);
    console.error(
      '[RLS_UNREGISTERED_TABLE] 行级策略未登记的表被访问，已按默认拒绝处理（返回空集）。' +
      '请在 functions/_shared/rls.ts 的 RLS_SCOPE 或 RLS_EXEMPT 中显式登记。 table=' + table,
    );
  }
}

/** 行级策略登记状态概览（供管理端只读展示） */
export function rlsRegistryReport() {
  const registered = Object.keys(RLS_SCOPE).sort();
  const exempt = Object.keys(RLS_EXEMPT).sort();
  const scopes: Record<string, number> = { all: 0, own: 0, dept: 0 };
  for (const t of registered) scopes[RLS_SCOPE[t]] += 1;
  return {
    registeredCount: registered.length,
    exemptCount: exempt.length,
    scopes,
    registered,
    exempt,
    unregisteredHits: [...unregisteredHits.entries()].map(([table, count]) => ({ table, count })),
    denyClause: RLS_DENY_CLAUSE,
  };
}

// ── 对外主接口 ───────────────────────────────────────────────────

/**
 * 生成要追加到 `WHERE org_id = ?` 之后的**行级过滤条件**。
 *
 * 返回值统一为 `{ clause, params }`：
 *   - clause === '1=1' → 不过滤（调用方应跳过拼接，避免产生无意义的 SQL）
 *   - clause === '1=0' → 默认拒绝，查不到任何行（未登记表 / 非豁免的未知表）
 *   - 其它         → 需要占位符，参数在 `params` 中（'own' 1 个参数，'dept' 1 个参数）
 *
 * 契约要点（V3.3.0 修正）：**参数一律放在 `params` 数组里，不要再用 `param!` 取单值**。
 *   旧契约返回 `param?: string`，调用方普遍写成
 *   `if (clause !== '1=1') params.push(rls.param!)`——当兜底换成无参数的 `1=0` 时，
 *   这句会多推入一个 undefined，导致「占位符数 ≠ 绑定参数数」在运行期直接 500。
 *   改为数组后，调用方只需 `params.push(...rls.params)`，两种情况都天然正确。
 */
export function rlsCondition(user: SessionUser, table: string): { clause: string; params: any[] } {
  if (isRlsPrivileged(user.role)) return { clause: '1=1', params: [] };

  if (Object.prototype.hasOwnProperty.call(RLS_SCOPE, table)) {
    const scope = RLS_SCOPE[table];
    if (scope === 'all') return { clause: '1=1', params: [] };
    if (scope === 'own') return { clause: '(owner_id = ? OR owner_id IS NULL)', params: [user.id] };
    return { clause: '(dept_id = ? OR dept_id IS NULL)', params: [user.department || ''] };
  }

  // 显式豁免的平台表：调用方本就不该对它们做行级过滤（豁免 = 不适用，而非放行）
  if (Object.prototype.hasOwnProperty.call(RLS_EXEMPT, table)) return { clause: '1=1', params: [] };

  // 未登记：默认拒绝
  recordUnregisteredTable(table);
  return { clause: RLS_DENY_CLAUSE, params: [] };
}

/** 写操作（新建）时填入的 owner_id */
export function rlsOwnerId(user: SessionUser): string {
  return user.id;
}

/**
 * 写操作（更新/删除）前校验归属；privileged 或 'all' 表直接放行。
 * 默认拒绝：未登记且未豁免的表一律判为「无权限」，并留下降级告警。
 */
export function assertRlsOwnership(user: SessionUser, row: any, table: string): boolean {
  if (isRlsPrivileged(user.role)) return true;

  if (Object.prototype.hasOwnProperty.call(RLS_SCOPE, table)) {
    const scope = RLS_SCOPE[table];
    if (scope === 'all') return true;
    if (scope === 'own') return !row?.owner_id || row.owner_id === user.id;
    return !row?.dept_id || row.dept_id === (user.department || '');
  }

  if (Object.prototype.hasOwnProperty.call(RLS_EXEMPT, table)) return true;

  recordUnregisteredTable(table);
  return false;
}
