# SSA ERP 逐功能界面深度对标分析报告
## —— vs SAP S/4HANA Cloud · 金蝶云·星空 V9.1 · 用友 YonSuite/BIP（V2.29 基线 · 7 维度逐项对比 · **V2.29 增强版（含 SAP/金蝶/用友 三家一手调研）**）

> **编制**：2026-08-04 ｜ **功能基线**：SSA ERP **V2.29**（2.29.0，构建于 2026-07-27）
> **方法**：基于 SSA ERP 源码逐文件勘探（`src/types/` 18 个类型文件 + `src/stores/` 50 个 store + `src/utils/` 12 个算法文件 + 约 120 个页面路由）建立内部基线；竞品侧基于三家厂商**最新公开版本**的官方资料与 2025–2026 第三方测评交叉验证。本报告**不浮于表面**——每个模块先给 7 维度量化评分，再下钻到**功能界面级逐项对比**，最后给可落地的改善措施与优先级。
> **竞品侧增强（V2.29 增强版）**：已补充 **SAP / 金蝶 / 用友 三家一手调研**（含官方 Help Portal / 白皮书 / API 文档来源 URL，部分项标“待验证”），见各模块 `#### 一手调研增补（SAP / 金蝶 / 用友）` 与 `## 跨模块系统性能力·三家实现对比`。一手调研仅作“补充”，未改动原 7 维度评分与任何结论；若某结论被一手调研明确推翻，仅在增补节注明，不修改原评分卡。
> **本文件为唯一权威对标文档**，替代并吸收此前所有版本（V2.17/V2.22/V2.23 基线）。

---

## 0. 方法论 · 维度定义 · 版本基线

### 0.1 对标版本基线（确保对比的是各家"最新版本"）

| 厂商 | 对标产品（最新版） | 关键底座 / 2025–2026 新特性 |
|---|---|---|
| **SAP** | S/4HANA Cloud（2025/2026 release） | HANA 内存计算；Fiori 角色化 Launchpad；嵌入式分析；实时成本核算（月末结账 7 天→约 8 小时）；APO/PPDS 多约束排产；Ariba 采购协同；BTP Build 低代码扩展 |
| **金蝶** | 云·星空 企业版 **V9.1**（+ 云·苍穹底座） | 第四代动态领域模型 KDDM；云原生 + AI 原生（BOSS助理 / 金钥财报 / 数电票全场景）；多维库存预警；委外联副产品直接入库；业务数据全链路归档；苍穹 5 大 AI 智能体 + 信创适配 |
| **用友** | YonSuite + BIP（2026 版，含 U9 cloud / NC Cloud 能力） | 云原生微服务；YonGPT（19 类端到端业务流程 / 2500+ 流程场景）；YonBuilder 模型驱动三级低代码（无代码/低代码/专业代码，30+ 连接器 3000+ OpenAPI）；MTS/MTO/ETO 多模式制造；167 币种实时折算 |
| **SSA ERP** | V2.29（自研） | React 18 + TS + Vite 5 + MUI v5 + zustand(persist) + TanStack Table + Playwright；事件驱动跨 store 联动；131 个 E2E 用例全绿 |

### 0.2 七个对比维度定义

| # | 维度 | 评估口径（看什么） |
|---|---|---|
| D1 | **功能完整度** | 该模块/界面覆盖的业务场景与操作是否齐全（对标三家标杆能力清单） |
| D2 | **界面与交互** | 信息架构、布局、列表/表单/图表组织、角色化工作台、操作效率、可视化 |
| D3 | **可定制性** | 低代码/自定义字段/列配置/审批流/打印模板/数据字典/扩展点/二开能力 |
| D4 | **维护难易度** | 代码可读性、模块化、配置化程度、升级/扩展成本（分值越高越易维护） |
| D5 | **界面内工作逻辑** | 页面背后的业务规则深度：状态机、校验、联动、自动流转、单据血缘、过账回写 |
| D6 | **数据齐全性** | 主数据/单据字段维度是否达到真实 ERP 要求（币种/税率/批次/序列号/组织/成本等） |
| D7 | **稳定性** | 架构健壮性、并发/大数据量承载、幂等防重、测试覆盖、生产级验证 |

### 0.3 评分标尺

- **5 分**＝与三家标杆最优者同档；**4 分**＝接近，有小幅差距；**3 分**＝能用但深度/逻辑不完整；**2 分**＝明显缺失或半成品；**1 分**＝基本缺失。
- 标识：✅ 达标（≥4）｜🔶 部分（2.5–3.9）｜🔴 缺失（<2.5）。
- **重要前提（诚实边界）**：SSA ERP 是**演示级单页应用**——zustand `persist` 落在浏览器 localStorage，无服务端、无真实数据库、无多用户并发、无权限落库审计。因此 **D7 稳定性** 与 **D4 维护难易度** 的口径与三家商用产品**不可直接对等**：三家是"生产级 SaaS（服务几十万家企业、金融级可用率 99.99%）"，SSA 是"单机演示 + 全量 E2E 兜底"。本报告对 D7 会明确标注这一口径差异，避免虚高。

---

## 0.4 总览评分卡（12 模块 × 7 维度 · SSA V2.29 vs 三家标杆均值）

> 「标杆」列取 SAP/金蝶/用友三者在该模块的最高水平（5 分制）；「SSA」为 V2.29 实际得分；「差距」＝标杆 − SSA。

| 模块 | D1功能 | D2界面 | D3定制 | D4维护 | D5工作逻辑 | D6数据齐全 | D7稳定 | SSA综合 | 标杆综合 |
|---|---|---|---|---|---|---|---|---|---|
| 1 物料 Material | 3.5 | 3.5 | 3.5 | 4.5 | 3.5 | 4.0 | 2.5 | **3.6** | 4.8 |
| 2 供应商 Vendor | 3.5 | 3.5 | 3.0 | 4.5 | 3.5 | 3.5 | 2.5 | **3.4** | 4.7 |
| 3 BOM | 3.5 | 3.5 | 3.0 | 4.5 | 4.0 | 3.5 | 2.5 | **3.5** | 4.8 |
| 4 采购 Purchase | 3.5 | 3.5 | 3.5 | 4.5 | 4.0 | 3.0 | 2.5 | **3.5** | 4.8 |
| 5 价格 Price | 3.5 | 3.5 | 3.0 | 4.5 | 4.0 | 3.5 | 2.5 | **3.5** | 4.6 |
| 6 仓储 Warehouse | 4.0 | 3.5 | 3.0 | 4.5 | 4.5 | 3.5 | 2.5 | **3.6** | 4.8 |
| 7 质量 Quality | 4.0 | 3.5 | 3.0 | 4.5 | 4.5 | 3.5 | 2.5 | **3.6** | 4.7 |
| 8 生产 Production | 3.5 | 3.0 | 3.0 | 4.0 | 4.0 | 3.5 | 2.5 | **3.4** | 4.8 |
| 9 财务 Finance | 3.5 | 3.0 | 3.0 | 4.0 | 4.0 | 3.5 | 2.5 | **3.4** | 4.9 |
| 10 销售 Sales | 3.0 | 3.0 | 3.0 | 4.5 | 3.5 | 3.0 | 2.5 | **3.2** | 4.7 |
| 11 报表/平台/分析 | 3.0 | 3.5 | 3.5 | 4.0 | 3.0 | 3.0 | 2.5 | **3.2** | 4.7 |
| 12 系统设置 Settings | 3.5 | 3.5 | 4.0 | 4.5 | 3.5 | 3.5 | 3.0 | **3.7** | 4.8 |

**一句话总判（V2.29）**：经过 P1–P4 + F1–F8 迭代，SSA ERP 的**功能广度已覆盖三家标杆的约 70–75%**，且在**事件驱动的单据血缘（入库→过账→回写 PO/SO、检验批→NCR→评级回流、框架协议→PO、开票→凭证）**、**QM 闭环（检验批/8D/SPC/COQ/评级回流）**、**寻源五段式（询/报/比/审/价目表）** 三处已达到"中型国产 ERP 标准水位"，个别点（批次 FIFO、成本卷积、MRP 净需求、ATP、三大报表从凭证取数）甚至**逻辑骨架完整、方向正确**。

但**纵深仍差一代半**，差距集中在四条主线：
1. **成本核算断链**——物料有移动平均价字段但**过账不滚动**、出库无 COGS 凭证、无 GR/IR 暂估、工单实际成本不结转回写；
2. **税务/凭证不严谨**——PO 无税率/含税拆分、销售退货红冲税额写死 0、凭证是扁平借贷行**无借贷平衡校验**、无凭证头+分录结构；
3. **信用/账期/主数据空心化**——creditLimit 有字段无下单卡点、AR 账龄只有 dueDate 无区间、客户主数据/会计期间主数据缺失；
4. **生产级能力缺位**——localStorage 单机、无服务端/数据库/多用户/权限落库审计，D7 与商用产品不在同一量级。

下文逐模块、逐功能界面展开。

---

## 1. 物料 Material（对标 SAP MM 物料主数据 / 金蝶 物料 / 用友 存货档案）

### 1.1 现状事实（V2.29，源码级）
- **实体 `Material`** 字段维度已对标 SAP MM 视图：`code/name/categoryId/specification/model/unit/materialType(raw|semi|finished|purchased|service)/makeOrBuy/safetyStock/minStock/maxStock/currentStock/price/currency/leadTime/moq/mpq/defaultVendorId/purchaseUnit/unitConversion/status/customFields`；工艺属性 `routing/workCenter/cycleTime/scrapRate/inspectionPoint`；**SAP 化字段** `valuationClass(RAW|SEMI|FG|TRADING|PACKAGING|CONSUMABLE)/priceControl(S标准价|V移动平均)/standardPrice/movingAvgPrice/batchManaged/serialized/plantParams[]`（工厂级评估视图）。
- **支撑实体**：`MaterialCategory`（树形 level/path）、`MaterialCodeRule`（pattern/prefix/sequenceLength/dateFormat）、`MaterialApplication`（新增审批 draft|pending|approved|rejected + stepHistory）、`MaterialChangeDoc`（字段级 oldValue/newValue 变更留痕）。
- **页面**：分类 / 列表 / 新建·编辑表单 / 详情 / 编码规则 / 导入导出 / 审批队列（外购→采购审核、自制→工艺审核双路径）/ 评估价控。
- **工作逻辑**：审批通过→按编码规则生成 code→生成正式物料（`buildMaterialFromApplication`）；`logMaterialChange()` 生成变更单。

### 1.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | 增删改查/分类/编码/导入导出/审批/评估齐全；缺替代料、图档、反冲标志 |
| D2 界面 | 3.5 | 5 | 4 | 4 | 单页表单分区；SAP Fiori 分视图分权更强，金蝶/用友多页签 |
| D3 可定制 | 3.5 | 5 | 4.5 | 4.5 | 有自定义字段/列配置/审批步骤配置；三家有完整字段扩展+布局设计器 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | SSA 全源码可读可改，维护门槛低；三家靠 IMG/BOS/精智云配置，学习成本高 |
| D5 工作逻辑 | 3.5 | 5 | 4 | 4 | 审批双路径落地；但 `currentStock` 不被仓储回写、评估类不驱动科目 |
| D6 数据齐全 | 4.0 | 5 | 4.5 | 4.5 | 评估类/价控/批次/序列号/多工厂/多单位换算字段全；缺物料组-科目挂钩 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机 localStorage，无量产验证；三家金融级可用率 |

### 1.3 逐功能界面对比

| 界面 | 对比项 | SAP MM | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 物料列表 | 搜索/分类筛选/状态筛选/批量/列配置/导入导出 | 🟢 | 🟢 | 🟢 | 全部具备 | ✅ | 导出按当前筛选条件；批量改评估类 |
| 物料表单 | 多视图（基本/采购/销售/MRP/会计/成本） | 🟢 分视图分权 | 🟢 多页签 | 🟢 多页签 | 单页分区 + materialType 显隐 | 🔶 | 拆真多页签，按 materialType 控制字段显隐 |
| 物料表单 | 评估类 + 价控 S/V + 标准价/移动平均价 | 🟢 驱动 CO 科目 | 🟢 | 🟢 | 字段已建但未驱动凭证科目 | 🔶 | valuationClass→科目映射表，过账自动取科目 |
| 物料表单 | 工厂/组织级评估与 MRP 参数 | 🟢 plant view | 🟢 组织级 | 🟢 | `plantParams[]` 已建 | 🔶 | MRP 消费 plantParams 的 lotSize/leadTime |
| 物料表单 | 批次/序列号开关 | 🟢 | 🟢 | 🟢 | `batchManaged/serialized` 已建 | 🔶 | 开关驱动仓储批次/序列强制（见 §6） |
| 物料详情 | 变更记录 Change Document | 🟢 CDHDR/CDPOS | 🟢 | 🟢 | `MaterialChangeDoc` 已建 | ✅ | 详情页接真实变更流（弃硬编码） |
| 审批队列 | 外购→采购审核 / 自制→工艺审核双路径 | 🟡 需定制 | 🟢 | 🟢 | 已落地（F6） | ✅ | 审批步骤条件改可执行表达式 |
| 评估价控 | 标准价/移动平均价维护与滚动 | 🟢 MR21/过账滚动 | 🟢 | 🟢 | 页面有，**过账不滚动 movingAvgPrice** | 🔴 | 入库过账时按 (旧值×旧量+新值×新量)/新总量 滚动 |

#### 一手调研增补（SAP / 金蝶 / 用友）

> 以下为三家厂商一手调研（官方 Help Portal / 白皮书 / API 文档）提取的操作级功能点，供 SSA 团队逐条复核。标注（待验证）者以厂商官方文档为最终依据。

- **SAP（S/4HANA Cloud）**：物料主数据按**视图（Basic / Purchasing / Sales / MRP / Accounting / Costing）分层**并按**工厂维度**维护评估视图；物料号支持 40 字符；**分割评估（Split Valuation）** 按评估类型区分价格；**字段状态组（Field Status Group）** 按业务场景控制字段 必填/可选/隐藏；所有字段变更写入**变更文档 CDHDR/CDPOS**；开放 `API_PRODUCT_SRV`。工作逻辑：物料作为统一入口，组织级参数（lotSize/leadTime/valuationClass）驱动 MRP 与自动记账。
  - 来源：SAP Help — Product Master（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）；`API_PRODUCT_SRV`（https://api.sap.com/api/API_PRODUCT_SRV/overview）。
- **金蝶（云·星空 V9.1）**：物料为**分配型基础资料**，含 11 个属性组、7 个页签（基本/采购/销售/库存/计划/财务/质量），按组织维度分配使用；通过 BOS 平台扩展字段。工作逻辑：物料作为多组织共享主数据，页签承载不同业务视角字段。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；物料（id=物料）。
- **用友（YonSuite/BIP）**：支持**批次管理、编码规则、序列号**。（待验证：序列号在存货档案的具体启用范围以官方文档为准。）
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 1.4 差距小结
广度达标（字段维度甚至偏 SAP 化），**纵深三缺**：①评估类/价控**只建字段未驱动凭证与成本**；②**移动平均价不随入库滚动**；③`currentStock` 与仓储库存**两套数据不一致**（物料主数据库存不回写）。这三项是"物料→自动记账/成本卷积/MRP 组织级参数"的支点。

---

## 2. 供应商 Vendor + 供应商门户（对标 SAP MM/Ariba · 金蝶 SRM · 用友 供应商协同）

### 2.1 现状事实（V2.29，源码级）
- **采购方侧 `Vendor`**：`code/name/type(manufacturer|trader|agent)/status(registered|pending|approved|rejected|blacklisted)/qualificationFiles/qualificationExpiry/rating/creditLevel/taxId/bankAccount/creditLimit/usedCredit/blacklistReasonHistory[]`；`VendorApplication`（准入：统一社会信用代码/营业执照/法人/注册资本/供货类别/认证/银行/税率 + stepHistory）；`VendorRatingRecord`（manual|auto）。
- **供应商门户**（独立路由 + 4 角色权限矩阵 admin/business/finance/quality）：工作台 / 订单确认 / 发货 / 质量(问题+8D) / 财务(对账单+开票申请) / 付款计划 / 企业资料 / 权限 / 询价报价 / **自注册**（F7，5 步表单→写 vendorApplications 进入审批）。
- **评级引擎** `computeVendorRating()`：质量合格率(40)/交期达成率(35)/价格竞争力(25) 可配权重 → A/B/C/D；质量数据源自检验任务。
- **工作逻辑**：评级 QM 自动回流（检验批判定 fail→写失败检验任务→纳入评级）。

### 2.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | 准入/评级/黑名单/门户协同齐；缺供应商分类、采购组织维度、冻结付款 |
| D2 界面 | 3.5 | 5 | 4 | 4 | 门户暗色主题完整；SAP Ariba 协同体验最佳 |
| D3 可定制 | 3.0 | 5 | 4.5 | 4 | 评级权重可配；缺门户单据自定义、审批模板 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 全源码；三家配置化但复杂 |
| D5 工作逻辑 | 3.5 | 5 | 4.5 | 4 | 准入/评级回流落地；**门户单据不回写主流程**、信用无卡点 |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 准入三证/资质/银行/税号全；**creditLimit/usedCredit 无业务占用** |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 门户 sessionStorage 鉴权（演示级）；三家真实多租户 |

### 2.3 逐功能界面对比

| 界面 | 对比项 | SAP | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 供应商列表 | 搜索/类型/状态/评级/黑名单 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| 准入/注册 | 注册→审批→批准启用 | 🟢 Ariba | 🟢 | 🟢 | ✅ 含门户自注册(F7) | ✅ | 审批接 ApprovalFlowTab 级次 |
| 供应商详情 | 资质/评级记录/绩效/交易 | 🟢 | 🟢 | 🟢 | ✅ 绩效卡 | 🟢 | 交易明细联动采购/质量真实数据 |
| 资质 | 到期预警（列表红标+工作台待办） | 🟢 | 🟢 | 🟢 | 🔶 有字段无预警 | 🔶 | qualificationExpiry 到期自动预警入通知中心 |
| 黑名单 | 下单/询价时拦截或强提醒 | 🟢 | 🟢 | 🟢 | 🔶 有状态不拦截 | 🔶 | OrderForm/InquiryForm 选供应商时过滤+强提醒 |
| 信用额度 | 下单占用/释放/超额拦截 | 🟢 | 🟢 | 🟢 | 🔴 仅字段 | 🔴 | PO 确认时占用 usedCredit、收货释放、超额阻断 |
| 门户订单确认 | 确认数量/交期回写 PO | 🟢 | 🟢 | 🟢 | 🔶 门户确认不回写 PO 状态 | 🔶 | VendorOrderConfirm→回写 PO confirmed/交期 |
| 门户对账/开票 | 对账单→开票申请→采购方受理 | 🟢 | 🟢 | 🟢 | ✅ F5 已通 | ✅ | 对账单与入库单/PO 三单核对 |
| 评级 | QM 来料合格率自动回流 | 🟢 | 🟢 | 🟢 | ✅ 已回流 | ✅ | 交期达成率由收货 vs 承诺日期自动算 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：供应商通过**业务伙伴 BP 统一入口**（通用数据 + 客户/供应商角色），CVI 同步；**供应商评估**按质量/交期/价格自动评分；协同通过 **Ariba / SAP Business Network** 门户（订单确认/发货/开票协同）；支持冻结与黑名单；**QM 信息记录**控制供应商质量放行。工作逻辑：BP 统一种子，门户协同回写 PO/收货，评级回流供应商主数据。
  - 来源：SAP Help — Business Partner / Supplier Management（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）；Ariba 供应商管理（https://www.sap.com/products/spend-management/supplier-management.html）。
- **金蝶（云·星空 V9.1）**：供应商为**分配型基础资料**，支持 **8 项冻结**；提供**供应商协同门户**（订单确认/发货/对账/开票）。工作逻辑：冻结 + 协同门户驱动供应商侧动作。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；供应商协同（id=供应商协同）。
- **用友（YonSuite/BIP）**：支持**准入、YCN 码、绩效评分**。工作逻辑：准入 + 绩效评分闭环。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 2.4 差距小结
准入与评级闭环 + 门户协同是**强项（已达国产 SRM 水位）**。短板四处：①**信用额度空心**（无下单卡点）；②**门户单据不回写主流程**（订单确认/对账与 PO/入库脱节）；③**黑名单不拦截**；④**资质到期无预警**。均为"中粒度增强"，不涉及架构改动。

---

## 3. BOM（对标 SAP CS/PP BOM · 金蝶 BOM · 用友 物料清单）

### 3.1 现状事实（V2.29，源码级）
- **实体 `BOMHeader`**：`bomNo/type(EBOM|MBOM)/status(draft|released|obsolete)/productId/version/effectiveDate/expiryDate/totalCost/currency/approvedBy/sourceOrderNo`（可由 SO 一键创建）；**`BOMItem`**：`level/sequence/quantity/scrapRate(废品率)/unitCost/leadTime/source(purchase|manufacture|phantom)/isCritical/children/childProductCode(子装配递归锚点)/laborCost/processCost`。
- **算法 `computeBOMCost()`**：递归成本卷积——普通件取物料最新价×用量；子装配经 childProductCode 递归子 BOM；叠加 per-item 人工/工序成本；深度上限 10 防自引用。
- **联动**：BOM 展开缺口写入 `productionStore.setMrpRecommendations()`（BOM→MRP）；ECN 发布→BOM 切新版本（见 §8）。
- **页面**：列表 / 新建·编辑 / 详情（树形展开）/ 成本卷积。

### 3.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | EBOM/MBOM/版本/生效期/phantom/成本卷积齐；缺替代料/联副产品 |
| D2 界面 | 3.5 | 5 | 4 | 4 | 树形展开清晰；SAP 多级 BOM 图形化更强 |
| D3 可定制 | 3.0 | 5 | 4.5 | 4.5 | 缺 BOM 用途/项目类别可配、替代策略 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 算法单文件可读 |
| D5 工作逻辑 | 4.0 | 5 | 4.5 | 4.5 | 递归卷积 + BOM→MRP + ECN 切换，方向正确且完整 |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 废品率/人工/工序成本有；缺制造费用分摊、成本类型区分 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机 |

### 3.3 逐功能界面对比

| 界面 | 对比项 | SAP CS | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| BOM 列表 | 分类/状态/版本筛选 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| BOM 表单 | 多级树形编辑/phantom/废品率 | 🟢 | 🟢 | 🟢 | ✅ 树形+phantom+scrapRate | ✅ | 增替代料组与优先级 |
| BOM 详情 | 多级展开 / 反查 where-used | 🟢 | 🟢 | 🟢 | 🔶 正查有，反查弱 | 🔶 | 加 where-used 多级反查视图 |
| BOM 详情 | 由销售订单一键生成 BOM | 🟢 | 🟢 | 🟢 | ✅ sourceOrderNo | ✅ | — |
| 成本卷积 | 材料/人工/工序三段卷积 | 🟢 | 🟢 | 🟢 | ✅ computeBOMCost | ✅ | 增制造费用分摊率 |
| 成本卷积 | 成本类型（标准/实际/模拟） | 🟢 | 🟢 | 🟢 | 🔴 单一卷积 | 🔴 | 区分标准/实际/模拟成本口径 |
| 版本 | 版本+生效期+ECN 切换 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | 版本间差异对比视图 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：BOM 支持**用途（1 生产 / 2 工程 / 3 通用 / …）**与**替代 BOM**；**虚拟件（Phantom）**；**生产版本（Production Version）** 组合 物料+BOM+工艺路线；**ECN 工程变更**切换版本；**备选项目组（Alternative Item Group）** 在 BOM 内定义可互换组件；开放 `API_BILL_OF_MATERIAL_SRV`。工作逻辑：BOM 用途 + 生产版本确定 MRP 展开路径，ECN 控制版本生效期。
  - 来源：SAP Help — BOM（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）；`API_BILL_OF_MATERIAL_SRV`（https://api.sap.com/api/API_BILL_OF_MATERIAL_SRV/overview）。
- **金蝶（云·星空 V9.1）**：BOM 含**六页签**，支持**联产品/副产品**、**阶梯用量**、**BOP（业务对象流程）**、**ECN 工程变更单**。工作逻辑：版本 + 联副产品 + 阶梯用量支撑复杂制造。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；工程变更单（id=工程变更单）。
- **用友（YonSuite/BIP）**：支持 BOM **维护、ECN、替代 BOM**。工作逻辑：替代 BOM + ECN 支撑变型生产。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 3.4 差距小结
BOM 是 SSA **完成度最高的模块之一**：EBOM/MBOM 分类、版本+生效日期、phantom、废品率、递归成本卷积、BOM→MRP、ECN 切换均已落地。**缺口**：替代料/联副产品、where-used 反查、成本类型区分（标准/实际/模拟）、制造费用分摊。属"精修"而非"补课"。

---

## 4. 采购 Purchase（对标 SAP MM 采购 · 金蝶 采购 · 用友 采购）—— 含 F8 申请增强

### 4.1 现状事实（V2.29，源码级）
- **`PurchaseRequest`**（F8 增强）：`requestNo`（**PR-{部门编号}-{YYYYMMDD}-{3位流水}** 自动生成）/`applicant/department/type/priority/status(draft|pending|approved|rejected|ordered)/totalAmount/projectNo/sourceType(manual|salesOrder|workOrder|mrp)/sourceNo/currentStep/approvalRecords/customFields`；行 `materialId(物料号)/materialName(名称拆分)/quantity/estimatedPrice/estimatedAmount/deliveryDate`；**支持 Excel 多行/TSV 粘贴批量导入 + 自动匹配物料主数据 + 表格框选复制**。
- **`PurchaseOrder`**：`orderNo/requestId/sourceRequestIds[]/vendorId/status(created|sent|confirmed|partial|received|closed|cancelled)/orderDate/expectedDeliveryDate/actualDeliveryDate/totalAmount/paymentTerms/tradeTerms/deliveryAddress/projectNo/deliveredQuantity(累计回写)`；行 `orderedQuantity/deliveredQuantity/unitPrice/amount`。**⚠️ 无 taxRate/taxAmount/currency 字段**。
- **`FrameworkAgreement`**（框架协议）：`totalCeiling/releasedAmount/items(ceilingPrice,committedQty)/releases[]`——释放自动生成 confirmed 态 PO；**`PurchaseReturn`**：完成→红字出库（扣库存）+ AP 冲销凭证。
- **页面**：申请列表 / 新建·编辑（F8）/ 详情 / 比价 / 订单列表 / 订单新建·编辑 / 订单详情 / 订单跟踪 / 采购审批 / 框架协议 / 采购退货。

### 4.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | 申请→订单→收货→退货→框架协议闭环；缺订单变更单、预付款/分批付款 |
| D2 界面 | 3.5 | 5 | 4 | 4 | F8 录入体验好（Excel 粘贴）；三家有采购工作台/监控器 |
| D3 可定制 | 3.5 | 5 | 4.5 | 4.5 | 自定义字段/审批步骤可配；缺采购组织/采购组维度配置 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 全源码 |
| D5 工作逻辑 | 4.0 | 5 | 4.5 | 4.5 | 收货回写 PO/框架协议释放/退货红冲自动；**PO 无税价拆分是硬伤** |
| D6 数据齐全 | 3.0 | 5 | 4.5 | 4.5 | **PO 缺 currency/taxRate/taxAmount**；缺采购组织/采购组 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机 |

### 4.3 逐功能界面对比

| 界面 | 对比项 | SAP MM | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 采购申请 | 申请号自动生成（部门+流水） | 🟢 号段 | 🟢 | 🟢 | ✅ F8 `PR-{部门}-{日期}-{流水}` | ✅ | 号段规则可配置化 |
| 采购申请 | Excel 多行粘贴导入物料 + 自动匹配 | 🟢 | 🟢 | 🟢 | ✅ F8 onPaste 拦截+TSV 首列 | ✅ | 粘贴后高亮未匹配行供补全 |
| 采购申请 | 来源选择（销售单/生产单/MRP）拉取明细 | 🟢 | 🟢 | 🟢 | ✅ F8 sourceType+拉取 | ✅ | 来源单据变更可追溯 |
| 采购申请 | 物料号/名称分列 + 框选复制 | 🟢 | 🟢 | 🟢 | ✅ F8 | ✅ | — |
| 采购订单 | 币种/税率/含税与不含税拆分 | 🟢 | 🟢 | 🟢 | 🔴 **无 currency/taxRate/taxAmount** | 🔴 | PO 头加 currency+税率，行加税额/价税合计 |
| 采购订单 | 三单匹配（PO-入库-发票）容差 | 🟢 MIRO | 🟢 | 🟢 | 🔶 有三单匹配页（财务侧） | 🔶 | 容差规则可配+超差阻断过账 |
| 采购订单 | 订单变更单（版本留痕） | 🟢 | 🟢 | 🟢 | 🔴 | 🔴 | 订单变更走变更单+版本 |
| 采购订单 | 预付款/分批付款计划挂 PO | 🟢 | 🟢 | 🟢 | 🔶 PaymentPlan 仅关联号 | 🔶 | PO 挂分批付款计划 |
| 采购订单 | 强制取价目表价（价格管控） | 🟢 | 🟢 | 🟢 | 🔶 不强制 | 🔶 | 下单时校验价目表，偏离需审批 |
| 框架协议 | 释放订单 + ceiling 上限校验 | 🟢 合同/计划协议 | 🟢 | 🟢 | 🔶 释放生成 PO 但未校验 ceiling | 🔶 | 释放累计 releasedAmount 校验 totalCeiling |
| 采购退货 | 退货冲减 PO deliveredQuantity | 🟢 | 🟢 | 🟢 | 🔶 红字出库+冲销但不回写 PO 量 | 🔶 | 退货完成回写 PO 行 deliveredQuantity |
| 订单跟踪 | 交期预警/逾期看板 | 🟢 | 🟢 | 🟢 | 🔶 有跟踪页 | 🔶 | 逾期 PO 入通知中心+跟踪页红标 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：采购含 **PR → PO → GR → IR** 完整链；**三单匹配**按容差键校验——**PP 价格 / DQ 数量 / AN·AP 金额 / BD 小额自动调整 / ST 日期**；超容差**过账成功但冻结付款（Payment Block）**；**GR/IR 清算科目**作为过渡；支持**框架协议、外协（541/543）、寄售、STO**；开放 `API_PURCHASEORDER_PROCESS_SRV`。工作逻辑：PO 历史（EKBE）逐笔记录 GR/IR，容差超限只阻付款不阻记账。
  - 来源：SAP Help — Invoice Verification / Tolerance Limits（https://help.sap.com/docs/SAP_S4HANA_CLOUD）；`API_PURCHASEORDER_PROCESS_SRV`（https://api.sap.com/api/API_PURCHASEORDER_PROCESS_SRV/overview）。
- **金蝶（云·星空 V9.1）**：**采购订单（id=采购订单）/ 采购入库单（id=采购入库单）** 支撑收货与三单匹配；支持**交货安排、付款计划**。工作逻辑：入库单驱动应付，付款计划挂订单。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；采购订单（id=采购订单）。
- **用友（YonSuite/BIP）**：支持**三单匹配、自动暂估、取价策略**。工作逻辑：PO/入库/发票匹配 + 取价策略确定采购价。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 4.4 差距小结
采购**流程闭环完整**（申请→订单→收货回写→退货红冲→框架协议释放），F8 把申请录入体验做到**超过部分国产 ERP**（Excel 粘贴/来源拉取/框选复制）。**最致命的单一短板是 PO 无币种/税率/含税拆分**——这直接卡住"三单匹配、应付核算、进项税"的准确性，属 P0。其次是订单变更单、预付款分批付款、价格强制取价目表、框架协议 ceiling 校验。

---

## 5. 价格 Price（对标 SAP MM 采购定价 · 金蝶 价格管理 · 用友 价格）

### 5.1 现状事实（V2.29，源码级）
- **完整寻源链（五段式）**：询价单 `PriceInquiry`（`inquiryNo/targetVendorIds/deadline/currency/status(draft|published|closed|compared)`）→ 供应商报价 `VendorQuotation`（`unitPrice/deliveryDays/validUntil/paymentTerms/currency/status`）→ 比价单 `PriceComparison`（每物料多供应商对比 + 自动标记 `lowestVendorId/lowestUnitPrice` + 人工 `selectedVendorId`）→ 价格审批 `PriceApproval`（`approvalRecords/status`）→ 价目表 `PriceListItem`（`vendorId/unitPrice/currency/effectiveDate/expiryDate/minOrderQty/sourceApprovalNo/status(active|expired|frozen)`）。
- **工作逻辑**：`approvePriceApproval()` 审批通过→**事件驱动自动生成价目表行**（幂等去重 `sourceApprovalId|materialId`）。
- **页面**：询价列表 / 询价新建（F6-4 需求来源勾选填充）/ 询价详情 / 比价 / 比价列表 / 价格审批 / 审批列表 / 价目表。

### 5.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 4.5 | 4.5 | 4.5 | 询报比审价五段完整；缺量价阶梯/阶梯折扣/价格类型 |
| D2 界面 | 3.5 | 4.5 | 4 | 4 | 比价对比表直观；缺雷达图/价格趋势可视化 |
| D3 可定制 | 3.0 | 4.5 | 4 | 4 | 缺定价策略/价格审批规则可配 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 全源码 |
| D5 工作逻辑 | 4.0 | 4.5 | 4.5 | 4.5 | 审批→价目表自动且幂等；比价仅最低价无综合评分 |
| D6 数据齐全 | 3.5 | 4.5 | 4 | 4 | 币种/生效失效期/MOQ 有；审批单 currency 类型缺口 |
| D7 稳定 | 2.5 | 4.5 | 4.5 | 4.5 | 单机 |

### 5.3 逐功能界面对比

| 界面 | 对比项 | SAP | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 询价单 | 需求来源勾选快速填充（采购申请/新增物料/客户询价） | 🟡 | 🟢 | 🟢 | ✅ F6-4 | ✅ | — |
| 询价单 | 多供应商邀请 + 报价截止 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | 报价截止自动关闭 |
| 比价单 | 多供应商对比 + 最低价标记 | 🟢 | 🟢 | 🟢 | ✅ 自动标最低 | ✅ | 加综合评分（价/交期/质量加权） |
| 比价单 | 加权评分 / 价格趋势 / 历史价参考 | 🟢 | 🟢 | 🟢 | 🔴 仅最低价 | 🔴 | 引入加权评分卡 + 历史价曲线 |
| 价格审批 | 审批流 + 记录 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | 审批条件（涨幅/金额阈值）可配 |
| 价目表 | 审批通过自动生成 + 幂等 | 🟢 条件表 | 🟢 | 🟢 | ✅ | ✅ | — |
| 价目表 | 量价阶梯 / 阶梯折扣 | 🟢 | 🟢 | 🟢 | 🔴 单一价 | 🔴 | 加数量区间阶梯价 |
| 价目表 | 生效/失效期 + 冻结 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | 失效自动置 expired（定时） |
| 价目表 | 回写物料主数据 price | 🟢 | 🟢 | 🟢 | 🔴 不回写 | 🔴 | 价目表生效回写物料 price/默认供应商 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：定价基于**条件技术**五要素（条件类型 / 确定过程 / 条件记录 / 条件方案 / 定价日期）；**采购信息记录**承载供应商专属价；支持**价目表、比例尺（Scale，量价阶梯）**。工作逻辑：定价过程按“客户定价过程 + 凭证定价过程”确定，条件记录匹配取价。
  - 来源：SAP Help — Condition Technique / Pricing（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）。
- **金蝶（云·星空 V9.1）**：**采购价目表（id=采购价目表）/ 采购折扣表（id=采购折扣表）**，支持**自定义维度取价**。工作逻辑：价目表 + 折扣表确定采购执行价。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；采购价目表（id=采购价目表）。
- **用友（YonSuite/BIP）**：支持**采购价目表、定价中心、取价优先级**。工作逻辑：定价中心按优先级匹配价目表取价。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 5.4 差距小结
寻源五段式是国内 ERP 标准流程，SSA **链路完整且审批→价目表自动闭环（幂等）**，这是亮点。**缺口**：比价只有最低价**无加权综合评分**、价目表**无量价阶梯/阶梯折扣**、**价目表不回写物料主数据价格**。三项都是"增强"非"重构"。

---

## 6. 仓储 Warehouse（对标 SAP IM/WM·EWM · 金蝶 仓存 · 用友 库存）—— SSA 事件驱动最强枢纽

### 6.1 现状事实（V2.29，源码级）
- **核心实体**：`InboundOrder`（`inboundNo/type(purchase|return|transfer)/sourceNo/vendorId/warehouseId/orgId/status/operator/inventoryPosted(防重)`；行 `expectedQuantity/actualQuantity/batchNo/locationId/qualityStatus`）、`OutboundOrder`（同构+customerId）、`CheckTask`（盘点 bookQuantity/countQuantity/difference/differenceAmount）、`InventoryRecord`（`materialId+warehouseId+locationId+orgId/quantity/availableQuantity/frozenQuantity/lastIn/lastOut`）、`BatchRecord`（`batchNo/productionDate/expiryDate/status(normal|expiring|expired|locked)`）、`StockTransfer`（跨组织）、`InventoryAdjustment`、`SerialMaster`、`QualityHold`。
- **工作逻辑（全系统最强事件驱动）**：
  - `postInboundToInventory()`：入库 completed→按 物料+仓库+库位 聚合增库存；带批次行 upsert 批次；`inventoryPosted` 幂等防重。
  - `postOutboundToInventory()`：出库→库存扣减 + **批次 FIFO 消耗**（指定批次优先，否则按入库/生产日期升序，跳过 locked）。
  - `writeBackPurchaseReceipt()`：采购入库→**回写 PO 行 deliveredQuantity + 推进 PO 状态 partial/received**；`writeBackSalesShipment()`：销售出库→回写 SO + 推进状态。
  - `postCheckAdjustment()`：盘点差异→调整库存；`confirmTransfer()`：转储**调出出库+调入入库双边过账**；`postAdjustment()`：调整→库存修正+按现价生成存货凭证。
  - `qualityAdvancedStore` 订阅入库单→`autoCreateLotsFromInbound()` 生成检验批 + QualityHold 质检扣留。
- **页面**：报检单 / 入库 / 出库 / 产成品入库 / 盘点 / 库存 / 批次 / 库龄 / 条码打印 / 仓库主数据 / 跨组织转储 / 库存调整 / 序列号 HU。

### 6.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 4.0 | 5 | 4.5 | 4.5 | 出入库/盘点/批次/转储/调整/序列号/报检齐；缺拣货波次/上架策略 |
| D2 界面 | 3.5 | 5 | 4 | 4 | 单据+看板清晰；三家有 PDA/RF 移动端、图形化仓位 |
| D3 可定制 | 3.0 | 5 | 4.5 | 4.5 | 缺上架/拣货策略可配、仓库布局设计 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 过账逻辑纯函数、可读 |
| D5 工作逻辑 | 4.5 | 5 | 4.5 | 4.5 | **批次 FIFO + 幂等防重 + PO/SO 回写 + 双边过账 + 质检扣留，方向完全正确** |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 批次/库位/质检扣留/防重标志全；缺在途库存、成本字段 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机；但幂等设计思路达标 |

### 6.3 逐功能界面对比

| 界面 | 对比项 | SAP | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 入库单 | 收货过账→库存+批次 upsert+PO 回写 | 🟢 MIGO | 🟢 | 🟢 | ✅ postInbound+writeBackPO | ✅ | — |
| 出库单 | 批次 FIFO 消耗 + SO 回写 | 🟢 | 🟢 | 🟢 | ✅ postOutbound(FIFO) | ✅ | 可切换 FEFO（按失效期先出） |
| 出入库 | 防重复过账 | 🟢 | 🟢 | 🟢 | ✅ inventoryPosted 幂等 | ✅ | — |
| 序列号 | 出入库驱动 SerialMaster 流转 | 🟢 | 🟢 | 🟢 | 🔴 **SerialMaster 存在但过账不驱动** | 🔴 | 序列号物料出入库强制扫描+流转 |
| 库存 | 冻结/解冻（frozenQuantity 动作） | 🟢 | 🟢 | 🟢 | 🔶 有字段无动作 | 🔶 | 加冻结/解冻操作+原因 |
| 库存 | 质检扣留 QualityHold | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| 转储 | 跨组织转储双边过账 | 🟢 | 🟢 | 🟢 | ✅ confirmTransfer | ✅ | 增在途库存形态（两步过账） |
| 盘点 | 盘点差异→调整+凭证 | 🟢 | 🟢 | 🟢 | ✅ postCheckAdjustment | ✅ | — |
| 仓储成本 | 入库滚动移动平均价 / 出库 COGS 凭证 | 🟢 | 🟢 | 🟢 | 🔴 **过账不触发计价** | 🔴 | 入库滚动 MAP、出库生成 COGS 凭证 |
| 条码/PDA | 移动端扫码收发 | 🟢 | 🟢 | 🟢 | 🔶 仅条码打印 | 🔶 | PDA 扫码收发存（设置已有 PDA 配置位） |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：库存通过**移动类型（Movement Type，101/261/601…）** 抽象所有库存动作；支持**特殊库存（K 寄售 / O 委外 / E 销售订单 / Q 项目 / W 客户寄售）**；**物料凭证 MATDOC** 为库存流水；批次/HU、在途库存、库存传送（Stock Transport）；入库**滚动移动平均价**；EWM 支持仓库精细化管理。工作逻辑：移动类型驱动库存增减与自动记账，MATDOC 为单一流水。
  - 来源：SAP Help — Inventory Management（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）；`API_MATERIAL_DOCUMENT_SRV`（https://api.sap.com/api/API_MATERIAL_DOCUMENT_SRV/overview）；EWM（https://help.sap.com/docs/SAP_EWM）。
- **金蝶（云·星空 V9.1）**：**即时库存（id=即时库存）** 提供 **11 维度**查询，区分**货主 / 保管者 / 库存状态**。工作逻辑：货主 + 保管者 + 库存状态多维刻画库存。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；即时库存（id=即时库存）。
- **用友（YonSuite/BIP）**：支持**调拨、可用量、批次效期、移动平均**。工作逻辑：可用量 = 在手 − 已分配，批次效期支撑 FEFO。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 6.4 差距小结
仓储是 SSA **工作逻辑最接近商用 ERP 的模块**：批次 FIFO、幂等防重、PO/SO 状态回写、转储双边过账、质检扣留——骨架方向完全正确。**最大断链是"出入库不触发成本核算"**（移动平均价不滚动、无 COGS 凭证），这把仓储与财务割裂开了；其次是**序列号主数据空转**（不被过账驱动）、冻结/解冻无动作、缺在途库存与拣货上架策略。

---

## 7. 质量 Quality（对标 SAP QM · 金蝶 质量 · 用友 质量）—— 超预期强项

### 7.1 现状事实（V2.29，源码级）
- **核心实体**：`InspectionTask`（`taskNo/type(incoming|process|final)/status(pending|in_progress|passed|failed|conditional_pass)/batchNo/quantity/sampleQuantity/vendorId/purchaseOrderNo/workOrderNo/inspectionStandardId/passedQuantity/failedQuantity/defectItems[](severity critical|major|minor)`）、`InspectionStandard`（版本化 + `inspectionItems(method/spec/upperLimit/lowerLimit/isCritical)`）、`UnqualifiedItem`（NCR：`disposition(rework|scrap|conditional_accept|return_vendor)/status(open|capa_raised|closed)`）、`PDCARecord`、`EightDRecord`（D0–D8 全字段）、`SpcChart`（USL/LSL/子组）、`LabEquipment`（校准周期）、`InspectionLot`（检验批，来源 inbound|production|manual）、`COQRecord`（预防/鉴定/内部失败/外部失败四类质量成本）、`QmVendorFeedback`、`BatchTraceNode`（批次追溯树）。
- **工作逻辑**：入库→`autoCreateLotsFromInbound()` 生成检验批 + QualityHold；`judgeLot()`→**释放 QualityHold + QM 回流供应商评级**（fail 自动写失败检验任务）；`recalcVendorQm()` 跨 4 个 store 重算评级；`calibrateEquipment()` 自动推算下次校准；`closeEightD()` 闭环；`computeSPC()` 判异。
- **页面**：检验列表 / 检验任务执行 / 不合格品 / PDCA / 质量报告 / 检验标准 / AQL 抽样 / 检验批 / 8D / SPC 控制图 / 实验室设备。

### 7.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 4.0 | 5 | 4.5 | 4.5 | 检验/标准/NCR/PDCA/8D/SPC/COQ/检验批/实验室全；缺完整 AQL 抽样方案 |
| D2 界面 | 3.5 | 5 | 4 | 4 | SPC 控制图可视化；三家有质量驾驶舱 |
| D3 可定制 | 3.0 | 5 | 4.5 | 4.5 | 检验标准版本化可配；缺抽样方案/检验计划可配 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 全源码 |
| D5 工作逻辑 | 4.5 | 5 | 4.5 | 4.5 | **检验批→NCR→8D/PDCA→SPC→COQ→评级回流，闭环完整** |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 缺陷分级/COQ 四类/检验项上下限全；缺序列号级追溯 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机 |

### 7.3 逐功能界面对比

| 界面 | 对比项 | SAP QM | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 检验批 | 入库/完工自动生成 + 质检扣留 | 🟢 | 🟢 | 🟢 | ✅ 订阅自动建批 | ✅ | 检验批与检验任务强关联（消除双轨） |
| 检验标准 | 版本化 + 检验项上下限/关键项 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| 抽样 | AQL 抽样方案（GB/T 2828 检索表） | 🟢 | 🟢 | 🟢 | 🔶 仅 sampleQuantity 数值 | 🔶 | 内置 AQL 检索表自动算样本量/Ac/Re |
| 检验执行 | 缺陷分级 + 判定 + 自动处置 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | 判定联动 NCR 自动开单 |
| 不合格品 NCR | 处置（返工/报废/让步/退货） | 🟢 | 🟢 | 🟢 | ✅ | ✅ | **处置联动库存**（返工/报废生成出入库单） |
| 8D/PDCA | 结构化 CAPA 闭环 | 🟢 | 🟢 | 🟢 | ✅ D0–D8 / PDCA | ✅ | — |
| SPC | 控制图 + 判异规则 | 🟢 | 🟢 | 🟢 | ✅ computeSPC | ✅ | 接实时过程数据流 |
| COQ | 质量成本四类归集 | 🟢 | 🟡 | 🟡 | ✅ 四类 | 🟢 | COQ 与财务科目挂钩 |
| 批次追溯 | 正反向追溯树 | 🟢 | 🟢 | 🟢 | 🔶 追溯节点有，视图弱 | 🔶 | 批次正反向追溯穿透视图（含序列号级） |
| QM 回流 | 检验结果回流供应商评级 | 🟢 | 🟢 | 🟢 | ✅ 已回流 | ✅ | — |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：**检验批（Inspection Lot）** 由收货/生产入库/交货触发；**检验类型** 01(采购GR)/04(生产入库)/08(转储)/09(复检) 等；**检验计划 QP01** + **抽样方案（AQL，对应 ISO 2859 / GB/T 2828 抽检表）** + 动态修改规则（放宽/加严）；**使用决策 UD（QA11）** 完成判定 + 库存过账；**QM 通知 8D / SPC 控制图 / COA 质量证书**。工作逻辑：GR 101 → 自动建检验批 → 检计划/抽样 → 结果记录 → UD 过账库存（321/350/122/553）→ 评级回流。
  - 来源：SAP Help — QM（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）。（待验证：SAP 标准是否提供开箱即用的“8D 报告”表单，业界普遍做法为 QM 通知 + Adobe Form 定制。）
- **金蝶（云·星空 V9.1）**：**检验单（id=检验单）** 支持 **12 种检验类型**，内置 **AQL（GB/T 2828.1）** 抽样，**MRB** 不良品评审。工作逻辑：检验单驱动不合格品处置。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；检验单（id=检验单）。
- **用友（YonSuite/BIP）**：支持**多场景检验、不良品处理单、MRB**。（待验证：SPC、8D 在质量管理模块的具体能力范围以官方文档为准。）
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 7.4 差距小结
质量是 SSA **完成度最高的模块**：检验标准版本化、缺陷分级、NCR→CAPA(8D/PDCA) 闭环、SPC、COQ、QM 评级回流——**深度已超一般国产中型 ERP**，个别维度（检验批自动建批、评级回流）甚至做到位。**缺口**：①**AQL 只有数值无检索表**（不能按 GB/T 2828 自动算样本量与 Ac/Re 判定数）；②**NCR 处置不联动库存**（返工/报废不生成出入库单）；③**检验批与检验任务双轨关系弱**；④批次追溯无视图化穿透。

---

## 8. 生产 Production（对标 SAP PP · 金蝶 生产制造 · 用友 生产/U9 cloud）

### 8.1 现状事实（V2.29，源码级）
- **核心实体**：`ProcessRoute`（`version/status/totalLeadTime/operations[](sequence/workCenter/setupTime/runTime/waitTime/skills)`）、`WorkOrder`（`orderNo/status(draft|released|in_progress|completed|closed)/bomId/routeId/plannedQuantity/completedQuantity/scrapQuantity/plannedStart~actualEnd/priority/workshop/costCenterId/actualLaborCost/actualMaterialCost/actualMachineCost/actualTotalCost`）、`OperationReport`（工序报工 goodQuantity/scrapQuantity/laborHours）、`WorkCenter`（capacityHours）、`MRPRecommendation`、`ProductionVersion`（物料+BOM+路线组合）、`ECN`（oldVersion→newVersion/effectiveDate）、`SubcontractOrder`（process工序|whole整体 + issueItems 委外发料）、`Equipment/MaintenanceOrder`、`ScheduleLock`。
- **工作逻辑**：`releaseECN()`→**联动 BOM 切新版本**；MRP 净需求 `net=max(0, gross−onHand−onOrder)`（BOM 多级展开）；`computeCRP()` 按未完工工单×路线累计工作中心负荷率；工单成本归集（料/工/机 + 成本中心）；工序排程锁。
- **页面**：工单列表/详情 / 工艺路线 / MRP / 生产报告 / 产能排程 / 工序报工 / WIP 看板 / 成本收集 / APS 有限产能 / 生产版本 / ECN / 委外 / CRP / 设备 / MTO / 详细排产 / 工艺 SPC。

### 8.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | 工单/路线/MRP/CRP/报工/版本/ECN/委外/设备齐；缺领料/反冲/看板/重复制造 |
| D2 界面 | 3.0 | 5 | 4 | 4 | WIP 看板有；缺甘特图拖拽排产、车间 Andon |
| D3 可定制 | 3.0 | 5 | 4.5 | 4.5 | 缺排产策略/工作中心日历可配 |
| D4 维护 | 4.0 | 3 | 3.5 | 3.5 | 全源码；排产算法可读 |
| D5 工作逻辑 | 4.0 | 5 | 4.5 | 4.5 | MRP 净需求+CRP+ECN 切换+成本归集有真实运算；**委外/领料不联动库存** |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 工单成本四维/报工工时全；缺批量规则/提前期偏置字段消费 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机 |

### 8.3 逐功能界面对比

| 界面 | 对比项 | SAP PP | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 工单 | 创建/下达/报工/完工状态机 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| 工单 | 领料单 / 反冲 backflush | 🟢 | 🟢 | 🟢 | 🔴 **不发料、无领料单/反冲** | 🔴 | 工单领料生成出库单扣库存 |
| 工单 | 完工入库回写 completedQuantity+成本结转 | 🟢 | 🟢 | 🟢 | 🔶 完工入库有但不回写工单/成本 | 🔶 | 成品入库回写工单量+实际成本结转 |
| MRP | 净需求运算（毛需求−在手−在途） | 🟢 | 🟢 | 🟢 | ✅ net=max(0,gross−onHand−onOrder) | ✅ | 计入安全库存分层 |
| MRP | 提前期偏置 / 批量规则 / 供需时界 | 🟢 | 🟢 | 🟢 | 🔴 未用 lotSize/leadTime | 🔴 | MRP 消费 plantParams 的 lotSize/leadTime |
| CRP | 工作中心负荷率 + 超载提示 | 🟢 | 🟢 | 🟢 | ✅ computeCRP | ✅ | 负荷→有限产能重排联动 |
| 排产 | 甘特图拖拽 + 工序锁 | 🟢 PPDS | 🟢 | 🟢 | 🔶 有排程锁无甘特拖拽 | 🔶 | 甘特图可视化拖拽排产 |
| 生产版本 | 物料+BOM+路线组合版本 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| ECN | 工程变更→BOM 切版本 | 🟢 | 🟢 | 🟢 | ✅ releaseECN | ✅ | ECN 影响范围分析（在制/库存） |
| 委外 | 发料/回收联动库存 + 加工费结算 | 🟢 | 🟢 | 🟢 | 🔴 **仅状态翻转，不生成出入库单** | 🔴 | 委外发料/回收生成出入库单+应付 |
| 设备 | 设备/模具 + 保养工单 | 🟢 PM | 🟢 | 🟢 | ✅ | ✅ | 保养计划到期预警 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：**生产订单**状态机 CRTD→REL→CNF→TECO→CLSD；**工艺路线 / 工作中心 / 作业类型（KP26 作业价）** 支撑成本归集；**MRP Live（MD01N）** HANA 内计算；**倒冲（Backflush）** 自动发料；**COGI** 移动失败队列；**物料分类账实际成本卷积（CKMLCP）** 单/多层价格确定。工作逻辑：MRP 低层码展开 → 净需求 → 生产订单 → 领料/报工（倒冲）→ 完工入库 → 期末 WIP/差异/结算 → 多层成本卷积。
  - 来源：SAP Help — PP（https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE）；`API_PRODUCTION_ORDER_2`（https://api.sap.com/api/API_PRODUCTION_ORDER_2/overview）。
- **金蝶（云·星空 V9.1）**：**生产订单（id=生产订单）** 含**六态状态机**，支持**跨组织生产**。工作逻辑：状态机 + 跨组织支撑多工厂制造。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；生产订单（id=生产订单）。
- **用友（YonSuite/BIP）**：支持 **MRP（MTS/MTO/ATO）/ 批量规则 / 委外 / 成本核算**。工作逻辑：计划策略 + 批量规则驱动生产需求。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 8.4 差距小结
生产**计划层骨架完整**（MRP 净需求 + CRP 负荷 + 生产版本 + ECN 切换 + 工单成本归集），已达中型 ERP 门槛。**三大孤岛**：①**工单不发料**（无领料单/反冲，库存与生产脱节）；②**委外不联动**（发料/回收不生成出入库单、无加工费结算应付）；③**完工入库不回写工单**（completedQuantity 与实际成本不结转）。加上 MRP 未消费 lotSize/leadTime/安全库存分层、无甘特拖拽排产——这些是生产从"演示"走向"可用"的关键。

---

## 9. 财务 Finance（对标 SAP FI/CO · 金蝶 财务云 · 用友 财务/NC Cloud）

### 9.1 现状事实（V2.29，源码级）
- **核心实体**：`Invoice`（采购发票：`invoiceType(vat_special|vat_normal|receipt)/status(draft|submitted|verified|paid|cancelled)/vendorTaxNo/amount/taxRate/taxAmount/totalAmount/verifiedBy/voucherGenerated/currency/exchangeRate`）、`PaymentPlan`、`AccountEntry`（**⚠️ 扁平借贷行 `debitAccount/creditAccount/amount/currency/voucherNo/costCenterId/projectId`，非凭证头+多行分录**）、`ChartAccount`（5 大类/balance 期初/normalSide 借贷方向/statement(BS|IS|CF)/section）、`FixedAsset`（直线法折旧）、`ClosedPeriod`（profitVoucherNo/fxVoucherNo）、`TaxRecord`、`ProjectAccount`、`ExchangeRate`、`CostCenter`、`Budget`。
- **工作逻辑**：`updateInvoice()` status→verified 自动 `generateVoucherFromInvoice()`（借原材料+进项税/贷应付，幂等）；`updatePaymentPlan()` status→paid 自动付款凭证（借应付/贷银行存款）；`deprecateAll()` 批量折旧；`buildBalanceSheet/buildIncomeStatement/buildCashFlowStatement/buildAPSubledger/buildARSubledger/computeTrialBalance`——**从凭证+期初直接算三大报表与 AP/AR 明细**。
- **页面**：发票 / 付款计划 / 会计分录 / 试算平衡 / 科目表 / 凭证 / 三单匹配 / 财务报表 / 税务 / 项目核算 / 现金流 / 汇率 / 账龄 / 辅助核算 / 预算 / 三大报表 / 固定资产 / 期末结账。

### 9.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | 发票/付款/凭证/TB/三大报表/固定资产/结账/汇率/预算齐；缺现金银行日记账/票据/合并报表 |
| D2 界面 | 3.0 | 4.5 | 4.5 | 4.5 | 报表展示有；缺凭证录入界面（借贷分行）、金蝶金钥财报 AI |
| D3 可定制 | 3.0 | 5 | 4.5 | 4.5 | 科目表可配；缺凭证模板/报表模板自定义/核算维度扩展 |
| D4 维护 | 4.0 | 3 | 3.5 | 3.5 | 报表算法单文件可读 |
| D5 工作逻辑 | 4.0 | 5 | 4.5 | 4.5 | 发票/付款自动凭证+三大报表从凭证取数，方向正确；**凭证无平衡校验** |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 税价分离/多币种/科目方向/报表分组全；**凭证结构扁平**、无 GR/IR |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机；无借贷平衡校验是正确性风险 |

### 9.3 逐功能界面对比

| 界面 | 对比项 | SAP FI | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 凭证 | **凭证头+多行分录结构** | 🟢 | 🟢 | 🟢 | 🔴 **扁平借贷行** | 🔴 | 重构 Voucher{head+items[]}，借贷分行 |
| 凭证 | 借贷平衡校验（借=贷才可保存） | 🟢 | 🟢 | 🟢 | 🔴 **无校验** | 🔴 | 保存前强制 Σ借=Σ贷 |
| 凭证 | 凭证字号/审核/过账/冲销流程 | 🟢 | 🟢 | 🟢 | 🔴 无 | 🔴 | 加凭证状态机（制单→审核→过账→冲销） |
| 发票 | verified 自动生成 AP 凭证 | 🟢 | 🟢 | 🟢 | ✅ 幂等 | ✅ | — |
| 三单匹配 | PO-入库-发票 容差匹配+超差阻断 | 🟢 | 🟢 | 🟢 | 🔶 有页面 | 🔶 | 容差可配+超差阻断过账 |
| 暂估 | GR/IR 暂估入库（货到票未到） | 🟢 | 🟢 | 🟢 | 🔴 发票直接借原材料 | 🔴 | 入库先借在途物资/GRIR，票到冲销 |
| 三大报表 | BS/IS/CF 从凭证+期初取数 | 🟢 | 🟢 | 🟢 | ✅ buildBS/IS/CF | ✅ | 报表项目映射可配 |
| 期末结账 | 结转损益/关账/反关账 | 🟢 | 🟢 | 🟢 | 🔶 ClosedPeriod 状态机 | 🔶 | 结转损益自动生成凭证 |
| 汇兑损益 | 期末汇兑损益自动结转 | 🟢 | 🟢 | 🟢 | 🔴 仅字段 | 🔴 | 按期末汇率重估外币余额生成凭证 |
| 固定资产 | 折旧/报废/资产凭证 | 🟢 | 🟢 | 🟢 | ✅ 直线法 | ✅ | 折旧自动生成凭证 |
| 账龄 | AR/AP 账龄区间（30/60/90+） | 🟢 | 🟢 | 🟢 | 🔶 仅 dueDate | 🔶 | 按区间自动分桶 |
| 税务 | 进销项自动汇总 + 增值税申报 | 🟢 | 🟢 数电票 | 🟢 | 🔶 手工 TaxRecord | 🔶 | 进销项从发票自动汇总生成申报底稿 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：**Universal Journal（ACDOCA）** 为单一事实源，FI/CO 不再需要对账；**平行分类账**、**凭证拆分**、**GR/IR 暂估**、**信用管理（FIN-FSCM-CR）**、**物料分类账实际成本卷积**；所有物流事件实时生成财务凭证。工作逻辑：GR 借库存/贷 GR-IR，IR 借 GR-IR/贷应付，GR-IR 余额期末重分类。
  - 来源：SAP Help — Universal Journal（https://help.sap.com/docs/SAP_S4HANA_CLOUD）；`API_JOURNALENTRYITEMBASIC_SRV`（https://api.sap.com/）。
- **金蝶（云·星空 V9.1）**：**应付单（id=应付单）** 支持 **暂估应付 → 财务应付立账**，**数电票**全场景。工作逻辑：入库暂估 → 发票立账，数电票贯通。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；应付单（id=应付单）。
- **用友（YonSuite/BIP）**：支持**总账、会计期间、GR-IR 暂估、事项会计中台、多币种**。工作逻辑：事项会计中台统一承载业务事件到分录。
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 9.4 差距小结
财务闭环**超出预期**：发票/付款自动凭证（幂等）、三大报表从凭证+期初真实取数、固定资产折旧、期末结账、多币种汇率、预算对照——这套骨架方向完全正确，已是"能用"的财务。**但有一处结构性硬伤**：`AccountEntry` 是**扁平借贷行而非"凭证头+多行分录"**，且**无借贷平衡校验**——这会导致账能做"错"，是财务模块的 P0 正确性风险。其次是 GR/IR 暂估缺失、汇兑损益无计算、AR 账龄无区间、税务为手工记录。

---

## 10. 销售 Sales（对标 SAP SD · 金蝶 销售 · 用友 销售/YonSuite 营销）—— 相对最弱

### 10.1 现状事实（V2.29，源码级）
- **核心实体**：`Prospect`（商机漏斗 source/status(new→contacted→negotiating→quoted→won|lost)/probability/followupRecords/creditLimit/usedCredit/convertedToCustomer）、`SalesOrder`（`orderNo/type(standard|sample|maintenance)/status(draft|confirmed|in_production|partial_shipped|fully_shipped|completed|cancelled)/customerName/projectNo/totalAmount/taxRate/taxAmount/grandTotal/paymentTerms/salesPerson/approvalRecords/linkedWorkOrders/deliveredQuantity/receivedAmount/arDueDate`）、`Project`（里程碑/异常）、`Shipment`（运输方式/承运商/运单号/运费/保险）、`Quotation`、`SalesInvoice`、`SalesReturn`、`MarketData`。
- **工作逻辑**：`convertQuotationToSO()` 报价→一键 confirmed SO；`issueInvoice()` 销售开票→**自动 AR 三行凭证**（借应收/贷主营收入/贷销项税）；`completeReturn()` 退货完成→**红字入库 + 红冲 AR + 红字发票（credit_note）**；SO 状态由出库回写推进。
- **页面**：商机 / 订单 / 订单新建·编辑 / 订单详情 / 市场分析 / 项目 / 物流 / 报价 / 开票 / 退货 / ATP。

### 10.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.0 | 5 | 4.5 | 4.5 | 报价→订单→发货→开票→退货→ATP 闭环；缺客户主数据/价目表/折扣/促销 |
| D2 界面 | 3.0 | 5 | 4 | 4 | 漏斗+看板有；缺销售工作台/订单监控器 |
| D3 可定制 | 3.0 | 5 | 4.5 | 4.5 | 缺价格策略/信用规则/审批条件可配 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 全源码 |
| D5 工作逻辑 | 3.5 | 5 | 4.5 | 4.5 | 报价转单/开票凭证/退货红冲自动；**信用无 SO 卡点、退货税额为 0** |
| D6 数据齐全 | 3.0 | 5 | 4.5 | 4.5 | 税价分离/AR 字段有；**客户主数据缺失**、退货税额逻辑不完整 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | 单机 |

### 10.3 逐功能界面对比

| 界面 | 对比项 | SAP SD | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 客户 | **独立客户主数据实体** | 🟢 | 🟢 | 🟢 | 🔴 **只有 customerName 字符串+Prospect** | 🔴 | 建 Customer 主数据（含信用/账期/地址/开票资料） |
| 商机 | 漏斗 + 跟进记录 + 赢单转客户 | 🟢 | 🟢 | 🟢 | ✅ Prospect | ✅ | 转正式客户主数据 |
| 报价 | 报价→一键转订单 | 🟢 | 🟢 | 🟢 | ✅ convertQuotationToSO | ✅ | — |
| 销售订单 | **确认时信用检查** | 🟢 | 🟢 | 🟢 | 🔴 无信用卡点 | 🔴 | SO 确认校验 usedCredit+本单≤creditLimit |
| 销售订单 | 销售价格价目表 | 🟢 | 🟢 | 🟢 | 🔴 价格手填 | 🔴 | 建销售价目表（客户/物料/阶梯） |
| 销售订单 | SO→工单 MTO | 🟢 | 🟢 | 🟢 | 🔶 linkedWorkOrders 有 | 🔶 | 一键 MTO 生成工单写 sourceSalesOrderId |
| 开票 | 开票→AR 三行凭证 | 🟢 | 🟢 | 🟢 | ✅ issueInvoice | ✅ | 发票与出库单三单匹配 |
| 退货 | 红字入库+红冲AR+红字发票 | 🟢 | 🟢 | 🟢 | 🔶 有，**但红冲税额写死 0** | 🔶 | 红冲按原单税额冲销（修税额=0 bug） |
| ATP | 可用量检查（在手−承诺+在途） | 🟢 | 🟢 | 🟢 | ✅ computeATP | ✅ | ATP 含批次/质检扣留分层 |
| 物流 | 运单/运费/保险/跟踪 | 🟢 | 🟢 | 🟢 | ✅ Shipment | ✅ | 物流状态回写 SO 交付 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：**凭证流（Document Flow, VBFA）** 端到端可追溯；**项目类别 / 计划行类别** 控制行行为；**aATP（PAL 配额 / BOP 延期订单 / ABC 替代确认）**；**信用检查**在订单/交货/PGI 三时点，超限冻结（VKM 释放）；寄售/第三方直运。工作逻辑：订单保存 → 确定链（项目类别/计划行/定价/装运/伙伴/文本）→ ATP → 信用检查 → 交货 → PGI → 开票 → 清账。
  - 来源：SAP Help — SD（https://help.sap.com/docs/SAP_S4HANA_CLOUD）；`API_SALES_ORDER_SRV`（https://api.sap.com/api/API_SALES_ORDER_SRV/overview）。
- **金蝶（云·星空 V9.1）**：**销售订单（id=销售订单）** 支持 **9 种单据类型**、**信用查询、ATP**。工作逻辑：单据类型 + 信用 + ATP 支撑订单管控。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；销售订单（id=销售订单）。
- **用友（YonSuite/BIP）**：支持**信用管理、账期、ATP**。（待验证：客户主数据在销售模块的具体字段范围以官方文档为准。）
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 10.4 差距小结
销售是 SSA **相对最弱的模块**（之前评分即最低）。链路（报价→订单→发货→开票→退货→ATP）已闭环且开票/退货自动凭证——方向对。**核心短板**：①**客户主数据缺失**（只有 customerName 字符串，信用额度挂在 Prospect 而非正式客户）；②**SO 确认无信用检查**；③**销售退货红冲税额写死 0（逻辑 bug）**；④无销售价目表/折扣。客户主数据是"地基"，牵涉信用/账期/开票/物流多处，属 P0。

---

## 11. 报表 + 平台生态（低代码）+ 智能分析（对标 SAP BW/BTP Build · 金蝶苍穹 BOS+金钥财报 · 用友 YonBuilder+YonGPT）

### 11.1 现状事实（V2.29，源码级）
- **报表**：ReportCenter / ReportDesigner（报表设计器）/ BISelfService（自助 BI）/ ReportPermissions（角色授权+邮件/webhook 订阅）。
- **平台/低代码**：LowCodeDesigner（6 种字段类型表单定义+记录提交）、`customFieldStore`（物料/PO/PR 动态扩展字段持久化）、`printTemplateStore`（PO/物料/供应商打印模板）、WorkflowEngine（BPMN-lite：start/task/approval/end + 实例 advance/reject）、IntegrationHub（`API_REGISTRY` 9 个 REST 端点 + Webhook 5 种事件**真实 fetch + 日志**）、FieldPermissions（8 模块字段级可见性）、I18nSettings（zh/en 字典+覆盖）、`dataDictStore`（10 类字典）、`unitConversionStore`、`orderTemplateStore`、`notificationStore`（**跨 5 个业务 store 实时聚合**：逾期付款/待付/库存告急/供应商待审/检验待办/安全库存）。
- **智能分析**：经营驾驶舱 Cockpit / 需求预测 Forecast（12 个月销量→移动平均+标准差→**95% 服务水平安全库存 + ROP + 建议补货量（含 MOQ/MPQ）**，一键生成采购申请）/ 发票 OCR→凭证 / `computeATP()`。

### 11.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.0 | 5 | 4.5 | 4.5 | 低代码/工作流/集成/字段权限/i18n/字典/打印/通知/预测/OCR 齐；深度不足 |
| D2 界面 | 3.5 | 5 | 4.5 | 4.5 | 驾驶舱/BI 有；三家有 AI 助手（金钥财报/BOSS助理/YonGPT） |
| D3 可定制 | 3.5 | 5 | 5 | 5 | **低代码是三家命根**（BTP/苍穹KDDM/YonBuilder 三级开发）；SSA 仅表单级 |
| D4 维护 | 4.0 | 3.5 | 3.5 | 3.5 | 全源码 |
| D5 工作逻辑 | 3.0 | 4.5 | 4.5 | 4.5 | 通知聚合/Webhook 真实触发；**工作流引擎与业务审批双轨未统一** |
| D6 数据齐全 | 3.0 | 4.5 | 4.5 | 4.5 | 字段权限仅 visible；缺只读/必填控制 |
| D7 稳定 | 2.5 | 5 | 4.5 | 4.5 | Webhook 无鉴权/重试；单机 |

### 11.3 逐功能界面对比

| 界面 | 对比项 | SAP | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 低代码 | 表单/字段/流程可视化设计 | 🟢 BTP Build | 🟢 苍穹 KDDM | 🟢 YonBuilder | 🔶 表单级（6 字段类型） | 🔶 | 扩到单据级（自定义实体+视图+流程） |
| 工作流 | BPMN 引擎 vs 业务审批 | 🟢 | 🟢 | 🟢 | 🔶 **引擎与审批双轨未统一** | 🔶 | 统一：业务审批走 workflow 引擎 |
| 集成 | OpenAPI 目录 + Webhook | 🟢 | 🟢 | 🟢 | 🔶 有目录+Webhook 真实 fetch | 🔶 | Webhook 加鉴权/重试/签名 |
| 字段权限 | 字段级可见性 | 🟢 | 🟢 | 🟢 | 🔶 仅 visible | 🔶 | 扩只读/必填/脱敏 |
| 自定义字段 | 主数据动态扩展字段 | 🟢 | 🟢 | 🟢 | ✅ 物料/PO/PR | ✅ | 推广到全部主数据 |
| 打印模板 | 可视化套打设计 | 🟢 | 🟢 | 🟢 | ✅ PO/物料/供应商 | ✅ | 推广到全部单据 |
| 数据字典 | 10 类字典统一 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| 通知中心 | 跨模块待办实时聚合 | 🟢 | 🟢 | 🟢 | ✅ 5 store 聚合 | ✅ | 接入邮件/IM 推送 |
| 驾驶舱 | KPI 钻取 | 🟢 | 🟢 BOSS助理 | 🟢 | ✅ Cockpit | ✅ | KPI 下钻到单据 |
| 需求预测 | 安全库存/ROP/补货建议 | 🟢 | 🟢 智能补货 | 🟢 | ✅ 移动平均+95%服务水平 | 🟢 | 加指数平滑/季节性模型选择 |
| 发票 OCR | OCR→智能凭证 | 🟢 | 🟢 | 🟢 | 🔶 演示级 | 🔶 | 接真实 OCR（发票查验 API） |
| AI 助手 | 读财报/经营分析/智能决策 | 🟢 Joule | 🟢 金钥财报 | 🟢 YonGPT | 🔴 无 | 🔴 | 接 LLM 做经营问答/凭证推荐 |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：扩展性分三层——**Key User（Custom Fields / Custom Logic / CBO / Custom CDS）**、**Developer（RAP / ABAP Cloud，仅 Released API）**、**Side-by-Side（BTP / CAP / Build）**；**Clean Core** 保证升级；**Flexible Workflow**（条件+步骤+审批人解析）、**Situation Handling**；**Fiori Elements 注解驱动 UI**；**角色权限 + 限制类型（行级组织权限）+ DCL**。工作逻辑：自定义字段一次定义全链路可用，Workflow 数据驱动，权限在 CDS 层行级控制。
  - 来源：SAP Help — Extensibility（https://help.sap.com/docs/SAP_S4HANA_CLOUD）；Fiori Elements（https://experience.sap.com/fiori-design-web/smart-templates/）。
- **金蝶（云·星空 V9.1）**：**BOS 平台（id=bos平台）/ 报表平台**，苍穹 **KDDM** 动态领域模型，**OpenAPI** 开放。工作逻辑：BOS 元数据驱动表单/流程/报表。
  - 来源：金蝶帮助中心（https://help.open.kingdee.com）；BOS 平台（id=bos平台）；苍穹（https://www.kingdee.com/products/cosmic_platform.html）。
- **用友（YonSuite/BIP）**：**iuap / YonBuilder** 三级低代码（无代码/低代码/专业代码），**532 原则**。（待验证：字段级权限在 YonBuilder 的具体能力以官方文档为准。）
  - 来源：用友社区案例（https://success.yonyou.com/community/askDetail）。

### 11.4 差距小结
平台层已达**金蝶 BOS 雏形**（低代码/字段权限/Webhook/字典/打印/通知聚合），这是 SSA 差异化潜力所在。**但与三家的"可定制性"差距是全方位的**：三家低代码是"单据+视图+流程+报表+移动端的模型驱动全栈平台"（苍穹 KDDM / YonBuilder 三级开发 / BTP Build），SSA 目前仅"表单级"。**最该补的三件**：①工作流引擎与业务审批**双轨合一**；②字段权限扩**只读/必填/脱敏**；③Webhook 加**鉴权/重试**。AI 助手（读财报/经营问答）是 2025–2026 三家的新战场，SSA 为空白，可作差异化亮点补。

---

## 12. 系统设置 Settings（对标 SAP IMG · 金蝶 BOS · 用友 精智云）

### 12.1 现状事实（V2.29，源码级）
- **13 个 Tab**：角色权限（13 种 UserRole + `module.action` 权限点 + `*` 通配）、11 模块审批流配置（节点 role/condition/timeout）、物料新增审批步骤（外购/自制双路径按角色分字段）、物料自动评级权重（A/B/C 阈值）、供应商评级权重（质量40/交期35/价格25）、集成通道（WMS/TMS/MES/PLM/SRM/FINANCE）、移动端 PDA 配置、菜单配置、供应商门户配置（订单自动确认时限/询价附件策略）、系统设置（货币/时区/语言/主题）、数据字典、单位换算、主题中心。

### 12.2 7 维度评分

| 维度 | SSA | SAP | 金蝶 | 用友 | 说明 |
|---|---|---|---|---|---|
| D1 功能 | 3.5 | 5 | 4.5 | 4.5 | 角色/审批/评级权重/集成/门户/字典/换算齐；缺会计日历/期间主数据 |
| D2 界面 | 3.5 | 4 | 4 | 4 | 分 Tab 清晰 |
| D3 可定制 | 4.0 | 5 | 4.5 | 4.5 | 配置项较丰富；审批条件仍是字符串非表达式 |
| D4 维护 | 4.5 | 3 | 3.5 | 3.5 | 配置集中 settingsStore |
| D5 工作逻辑 | 3.5 | 5 | 4.5 | 4.5 | 配置驱动业务（审批/评级）；条件表达式待加强 |
| D6 数据齐全 | 3.5 | 5 | 4.5 | 4.5 | 缺会计期间/日历、编号规则中心 |
| D7 稳定 | 3.0 | 5 | 4.5 | 4.5 | 配置落 localStorage |

### 12.3 逐功能界面对比

| 界面 | 对比项 | SAP IMG | 金蝶 | 用友 | SSA V2.29 | 状态 | 改善点 |
|---|---|---|---|---|---|---|---|
| 角色权限 | 模块.动作权限点 + 通配 | 🟢 | 🟢 | 🟢 | ✅ 13 角色 | ✅ | 数据权限（按组织/部门行级） |
| 审批流 | 11 模块可视化配置 | 🟢 | 🟢 | 🟢 | ✅ 节点 role/condition/timeout | ✅ | condition 改可执行表达式 |
| 评级权重 | 物料/供应商权重+阈值可配 | 🟢 | 🟢 | 🟢 | ✅ | ✅ | — |
| 集成通道 | WMS/TMS/MES/PLM/SRM/FINANCE | 🟢 | 🟢 | 🟢 | ✅ 通道配置 | ✅ | 通道健康检查/日志 |
| 会计期间 | 会计日历/期间主数据 | 🟢 | 🟢 | 🟢 | 🔴 无（仅 ClosedPeriod） | 🔴 | 建会计期间主数据+开关账 |
| 编号规则 | 全模块编号规则中心 | 🟢 | 🟢 | 🟢 | 🔶 仅物料/采购有 | 🔶 | 统一编号规则中心（所有单据） |
| 门户配置 | 自动确认时限/附件策略 | 🟢 Ariba | 🟢 | 🟢 | ✅ | ✅ | — |

#### 一手调研增补（SAP / 金蝶 / 用友）

- **SAP（S/4HANA Cloud）**：**嵌入式分析** 基于 CDS VDM 三层（I_ 基础 / C_ 组合 / Consumption 查询），**OVP / ALP / KPI Tile / 多维报表**；**Custom Analytical Queries** 自助建模；**SAC** 集成（预测/故事）；**无 ETL 实时分析**（直查 ACDOCA/MATDOC）；**Joule** 生成式 AI 助手。工作逻辑：事务过账即实时聚合，注解驱动 UI，KPI 阈值联动告警。
  - 来源：SAP Help — Analytics（https://help.sap.com/docs/SAP_S4HANA_CLOUD）；SAC（https://www.sap.com/products/technology-platform/cloud-analytics.html）。
- **金蝶（云·星空 V9.1）**：**轻分析**、**四大智能体**、**金钥财报**、**BOSS 助理**、**ChatBI**。工作逻辑：AI 智能体 + 轻分析支撑经营分析。
  - 来源：金蝶苍穹平台（https://www.kingdee.com/products/cosmic_platform.html）。
- **用友（YonSuite/BIP）**：**YonGPT / Chat BI / 智能助手**。工作逻辑：YonGPT 驱动的智能分析问答。
  - 来源：用友 YonSuite（https://yonsuite.com）。

### 12.4 差距小结
设置中心**配置化程度高于预期**（角色/审批/评级/集成/门户/字典/主题），是 SSA 可定制性的集中体现。**缺口**：①**会计期间/日历主数据缺失**（期末结账无依托）；②**审批条件是字符串非可执行表达式**；③编号规则分散（仅物料/采购有，应建统一编号规则中心）；④缺**数据权限**（行级/组织级）。

---

## 13. 横向系统性差距（跨模块根因 · 7 维度视角）

| # | 根因 | 具体表现 | 波及模块 | 维度 | 优先级 |
|---|---|---|---|---|---|
| G1 | **成本核算断链** | 移动平均价不随入库滚动；出库无 COGS 凭证；无 GR/IR 暂估；工单实际成本不结转回写 | 物料/仓储/生产/财务 | D5/D6 | **P0** |
| G2 | **税务/凭证不严谨** | PO 无币种/税率/含税拆分；销售退货红冲税额写死 0；凭证扁平借贷行**无借贷平衡校验**、无凭证头+分录结构 | 采购/销售/财务 | D5/D6/D7 | **P0** |
| G3 | **信用/账期/主数据空心化** | 供应商 creditLimit 无下单卡点；**客户主数据缺失**；AR 账龄仅 dueDate 无区间；无会计期间/日历主数据 | 供应商/销售/财务/设置 | D5/D6 | **P0** |
| G4 | **单据孤岛（有骨架无联动）** | 序列号不被过账驱动；委外发料回收不生成出入库；工单不领料；门户单据不回写主流程 | 仓储/生产/供应商门户 | D5 | **P1** |
| G5 | **生产级能力缺位** | localStorage 单机、无服务端/数据库/多用户并发/权限落库审计 | 全局 | D7 | P2（架构级） |
| G6 | **计划层简化** | MRP 未消费 lotSize/leadTime/安全库存分层；无供需时界；无甘特拖拽排产 | 生产/物料 | D5 | P1 |
| G7 | **可定制性深度不足** | 低代码仅表单级；字段权限仅 visible；Webhook 无鉴权重试；审批条件字符串非表达式 | 平台/设置 | D3 | P1 |
| G8 | **智能化空白** | 无 AI 助手（读财报/经营问答/凭证推荐）；OCR 演示级；预测无模型选择 | 分析/财务 | D1/D2 | P2 |

---

## 跨模块系统性能力·三家实现对比

> 本节将三家“缝合”各模块的关键系统性能力并排对比（数据取自三家一手调研报告的“跨模块系统性能力”节）。SAP 条目标注（待验证）者以官方文档为准。

| 系统性能力 | SAP S/4HANA Cloud | 金蝶 云·星空 V9.1 | 用友 YonSuite/BIP |
|---|---|---|---|
| **三单匹配（GR/IR + 容差）** | GR/IR 清算科目为过渡；容差键 **PP 价格 / DQ 数量 / AN·AP 金额 / BD 小额 / ST 日期**；超差**过账成功但冻结付款（MRBR 释放）**；GR-Based IV 控制逐笔/累计匹配 | 采购入库单 → **暂估应付 → 财务应付立账**；三单在采购入库单匹配 | **三单匹配**（供应商 + 存货匹配 / 容差）+ **自动暂估** |
| **MRP 净需求** | **低层码**驱动计算顺序；净需求 = 现有 + 已确认收货 − 需求 − 安全库存；批量程序 EX/FX/HB/TB/WB/MB；**MRP Live（MD01N）** HANA 内计算 | 计划策略 **LFL（批对批）/ FOQ（固定批量）/ POQ（周期批量）/ ROP（再订货点）** + 时界 | 计划策略 **MTS 10/20/30 / MTO 10 / ATO 10** + 批量规则 |
| **成本卷积** | **标准成本估算 CK11N**（数量结构 = BOM + 工艺路线，递归卷积 + 成本组件拆分）+ **物料分类账实际成本 CKMLCP**（单层/多层价格确定 → PUP 期间单位实际成本） | 成本权重 + **拆卸成本比例** | **移动平均 / 全月平均 / 先进先出**；不支持个别计价 |
| **信用与账期** | **付款条件 ZTERM**（基准日规则 / 分期 / 现金折扣）；**信用管理 FSCM-CR**：信用段 + 信用暴露（未清应收 + 交货 + 订单）+ 静态/动态检查 + 冻结（VKM 释放） | **收款条件 → 收款计划 → 控制环节** | **信用三件套**：检查规则 / 额度占用 / 对象信用 |
| **批次追溯** | 批次为库存维度；**批次特性（类类型 023）**；批次确定 **FIFO / FEFO / LIFO**；**批次派生（Batch Derivation）**；**MB56 正反向追溯**（原料→成品→客户 / 成品→原料→供应商） | **11 维即时库存** + 供应商批号 + 合并检验 | **正逆向精准追溯** + SPC |

- 来源（SAP）：SAP Help — Invoice Verification / MRP / Material Ledger / Credit Management / Batch Management（https://help.sap.com/docs/SAP_S4HANA_CLOUD）。
- 来源（金蝶）：金蝶帮助中心（https://help.open.kingdee.com）；苍穹平台（https://www.kingdee.com/products/cosmic_platform.html）。
- 来源（用友）：用友社区案例（https://success.yonyou.com/community/askDetail）。

> 对 SSA 的启示（与 §13 横向差距一致）：三单匹配 + GR/IR 暂估、统一分录行表、低层码 MRP、成本卷积、信用冻结 + 释放、批次流水 + 谱系图，是“系统自洽”的支点，对应 §14 路线图的 A1/A2/A4/B1/B8/C1 等项。

---

## 14. 分级改善路线图（按"先 A 再 B 最后 C"排序）

> 原则（沿用协作铁律）：**优先成熟做法不重复造轮子；修正确性 bug 优先于加新功能；地基（主数据/凭证结构）优先于上层增强**。每项标注【优先级｜工作量 S/M/L｜预期收益｜涉及模块】。

### A. P0 —— 正确性与地基（先做，不做账会错/数据不可信）

| # | 改善措施 | 工作量 | 预期收益 | 模块 |
|---|---|---|---|---|
| A1 | **凭证重构**：`AccountEntry` 扁平借贷行 → `Voucher{head+items[]}`，保存前强制 **Σ借=Σ贷** 平衡校验；加凭证状态机（制单→审核→过账→冲销） | L | 财务正确性根基，杜绝错账 | 财务 |
| A2 | **PO 税价拆分**：PO 头加 `currency`，行加 `taxRate/taxAmount/价税合计`，打通三单匹配与进项税 | M | 三单匹配/应付/进项税准确 | 采购/财务 |
| A3 | **客户主数据实体**：新建 Customer（信用/账期/地址/开票资料），SO 关联 customerId | M | 信用/账期/开票/物流的地基 | 销售 |
| A4 | **成本核算闭环**：入库滚动移动平均价 `(旧值×旧量+新值×新量)/新总量`；出库生成 COGS 凭证；加 GR/IR 暂估（货到票未到先借在途物资） | L | 仓储与财务打通，成本可信 | 仓储/财务/物料 |
| A5 | **修销售退货税额 bug**：红冲凭证按原单税额冲销（当前写死 0） | S | 退货税务正确 | 销售/财务 |
| A6 | **会计期间主数据**：建会计日历/期间 + 开关账，支撑期末结账 | M | 结账/报表分期正确 | 设置/财务 |

### B. P1 —— 流程闭环与业务卡点（次之，让流程真正"跑通"）

| # | 改善措施 | 工作量 | 预期收益 | 模块 |
|---|---|---|---|---|
| B1 | **信用卡点**：PO 确认占用 usedCredit/收货释放/超额阻断；SO 确认校验客户信用 | M | 信用从字段变管控 | 采购/销售 |
| B2 | **三大孤岛联动**：序列号出入库驱动 SerialMaster；委外发料/回收生成出入库单+加工费应付；工单领料生成出库单 | L | 库存/生产/委外数据一致 | 仓储/生产 |
| B3 | **完工入库回写**：成品入库回写工单 completedQuantity + 实际成本结转 | M | 工单成本闭环 | 生产/财务 |
| B4 | **NCR 处置联动库存**：返工/报废生成出入库单 | M | 质量与库存一致 | 质量/仓储 |
| B5 | **门户单据回写**：订单确认/对账回写 PO 状态与交期 | M | 门户协同闭环 | 供应商门户 |
| B6 | **价目表回写物料价 + 黑名单拦截 + 资质预警 + 框架协议 ceiling 校验** | M | 价格管控+风险拦截 | 价格/供应商/采购 |
| B7 | **工作流引擎与业务审批双轨合一** + 审批条件可执行表达式 | M | 流程体系统一 | 平台/设置 |
| B8 | **MRP 增强**：消费 lotSize/leadTime/安全库存分层 + 提前期偏置排产 | M | 计划可执行 | 生产/物料 |
| B9 | **AQL 检索表抽样**（GB/T 2828 自动算样本量/Ac/Re） | M | 抽样合规 | 质量 |

### C. P2 —— 增强与差异化（最后做，锦上添花/差异化亮点）

| # | 改善措施 | 工作量 | 预期收益 | 模块 |
|---|---|---|---|---|
| C1 | **批次正反向追溯穿透视图**（含序列号级） | M | 追溯能力对标 | 质量/仓储 |
| C2 | **甘特图拖拽排产** + 负荷联动重排 | L | 排产体验对标 PPDS | 生产 |
| C3 | **统一编号规则中心**（所有单据）+ 数据权限（行级/组织级） | M | 管控精细 | 设置 |
| C4 | **字段权限扩只读/必填/脱敏 + Webhook 鉴权/重试** | M | 平台企业级 | 平台 |
| C5 | **销售价目表 + 折扣/促销** | M | 销售定价规范 | 销售 |
| C6 | **AI 助手**：经营问答/读财报/智能凭证推荐（差异化亮点，对标金钥财报/YonGPT/Joule） | L | 智能化差异化 | 分析/财务 |
| C7 | **服务端化**（数据库 + 多用户 + 权限落库审计 + 真实持久化）——架构级演进 | XL | 从演示到生产 | 全局 |

---

## 15. 验证口径（沿用工程纪律）

- 构建：`node node_modules/vite/bin/vite.js build` 绿（esbuild 跳过 tsc，运行期靠 E2E 兜底）。
- 全量 Playwright E2E：当前 **33 个 spec / 131 用例全绿**（V2.29 基线）；每批新增用例覆盖关联/引擎改动。
- 版本三处同步：`src/version.ts`（APP_VERSION 2.29.0 / LABEL V2.29）+ `package.json`（2.29.0）+ 主计划「版本沿革」。
- 桌面 `robocopy /MIR` 同步（排除 node_modules/dist/test-results）。

---

## 16. 总结（一页结论）

**SSA ERP V2.29 已是一款"骨架完整、方向正确"的中型 ERP 雏形**：12 大业务域 + 供应商门户，功能广度覆盖三家标杆约 70–75%；**事件驱动的单据血缘**（入库→过账→回写 PO/SO、检验批→NCR→评级回流、框架协议→PO、开票→凭证）、**QM 闭环**、**寻源五段式**、**BOM 成本卷积 + MRP 净需求 + ATP + 三大报表从凭证取数** 是它最扎实的地方，个别点已达国产中型 ERP 标准水位。

**与 SAP/金蝶/用友的差距，本质是"演示级 vs 生产级" + "纵深差一代半"**，集中在四条主线：**成本核算断链、税务/凭证不严谨、信用/账期/主数据空心化、生产级能力缺位（localStorage 单机）**。

**下一步建议**：先做 **P0 六项**（凭证重构 + PO 税价拆分 + 客户主数据 + 成本核算闭环 + 退货税额 bug + 会计期间）——这些是"不做账会错/数据不可信"的地基；再做 **P1 九项**（信用卡点/孤岛联动/完工回写/工作流合一/MRP/AQL 等）让流程真正闭环；**P2** 作为差异化增强（甘特排产/AI 助手/服务端化）。

> 本报告基于源码逐文件勘探 + 三家最新版公开资料交叉验证编制；竞品功能描述以 2025–2026 公开版本为准，具体以厂商官方文档为最终依据。

