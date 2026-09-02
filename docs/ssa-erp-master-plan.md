# SSA ERP 实施主计划（单一权威版）

> 标题基线：**V2.54**（2.54.0，构建于 2026-08-12）；**V2.56 对标整改基线**（见 §九，package.json 2.56.0）：本计划在此基线追加「地基修复」P0/P1/P2 路线图。
> 版本单一来源：`src/version.ts` 的 `APP_VERSION`(==`package.json`.version) 与 `APP_VERSION_LABEL`(展示)；UI 读 `APP_VERSION_LABEL`。
> 版本铁律：每次变更同步四处 —— ①`src/version.ts` ②`package.json`.version ③项目记忆 `MEMORY.md` 版本沿革 ④本主计划（标题基线 + §二模块现状 + §八沿革）。
>
> **开发计划铁律**：全项目只保留本文件（`docs/ssa-erp-master-plan.md`）作为唯一开发计划。带版本/日期后缀的计划副本（如 `development-plan-V2.64.md`、`P2-COMPLETION.md`）在完成对应阶段后必须合并进本文件并删除，不保留重复/历史副本。版本升级时先更新本文档再升版号。

---

## 一、基础信息
- 路径：`ssa-erp/` ｜ 桌面备份：`Desktop/ssa-erp/`（无 node_modules）
- 技术栈：React18 + TS + Vite5 + MUI v5 + zustand(persist) + TanStack Table + Playwright
- 构建：`node node_modules/vite/bin/vite.js build`（仅 esbuild 跳过 tsc，运行期靠 Playwright 验证）
- 数据：`src/mocks/data/`(11 文件) 仅种子源
- 自动化回归：Playwright `e2e/*.spec.ts`，`window.__ssaStores`（DEV 暴露）驱动断言

## 二、模块现状（截至 V2.74.6）

> 下表为 V2.54 基线盘点；V2.55–V2.74.7 的逐项变更见 §八版本沿革。核心结论：**P0 六项地基、P1 业务闭环（B1–B11 + C1–C7）、P1 关系化后端 17 项、P2 智能增强（20/30 功能落地——V2.74.7 补齐波次RFID/重复制造/MES集成 + 三方销售/COPA/资金管理（A/B 两轮共 6 项）、V2.74.8 补齐 S&OP/BI集成/ESG（C 轮 3 项），9 项整页缺失全部完成 + 2 壳 + 1 桩）均已落地**；生产态真实后端见 §九/§十。
> **架构注意（V2.74.5 复核）**：关系化 D1 后端已在 V2.58–V2.74.3 建表打通（migrations 0001–0017，约 30 张表）。**主数据三张表（materials/customers/vendors）前端已直连真实 D1**：`vendorStore`(V2.74.3) 直连 `vendor_master`、`materialStore`/`customerStore`(V2.74.5) 直连 `materials`/`customers`，与开放网关同源（同 org_id+RLS），彻底脱离 app_state Blob 双源；除主数据三张外，其余前端 store 仍大多以 `app_state` Blob 为主源（persist+backendStorage 写 `/api/state/:key`），`warehouse/production/subcontract` 4 个经 `b2Api`「本地主源 + fire-and-forget 双写 D1」（三岛表）。双通道并行风险具体化，根治路线见 §十.4。
| 域 | 状态 | 说明 |
|----|------|------|
| 物料主数据 | **V2.51 增强** | 审批流 + 评级 + 多单位 + 自定义字段；**P0-04 多视图**：Material加14字段（采购组/MRP类型/税分类/科目分配组等），Form改5个Tab分组；**P2-23 GTIN**：条码字段 |
| 供应商管理 | **V2.53 增强** | 门户回写主流程 + 统一身份源 + 信用管控(B1) + 黑名单硬拦截(B6)；**P0-10 组织会计字段**：salesOrg/reconciliationAccount/taxCode；**P1-09 绩效考核**：加权评分(30/30/25/15)+排名(A/B/C/D)；**P2-22 风险评分**：四维度评分卡 |
| 客户主数据 | **V2.51 增强** | 客户主数据 + 信用硬拦截(A3)；**P0-10 组织会计字段**；**P2-26 客户ABC分析**：分级+流失预警 |
| 采购管理 | **V2.52 增强** | PO 税价拆分(A2) + 信用占用/释放(B1)；**P0-05 信息记录**：供应商×物料价格记录；**P0-06 货源清单**：优先级+固定货源+配额；**P0-05/06 接线**：PO自动取价+货源Chip推荐；**P1-04 条件引擎**：条件类型+定价过程；**P1-23 服务采购**：服务类物资类型；**P2-06 寄售采购**：寄售库存+消耗结算 |
| 价格管理 | **V2.53 增强** | 价目表回写(B6)；**P1-04 条件技术引擎**：ConditionRecord(price/discount/freight/tax/surcharge) + resolvePrice叠加；**P2-25 价格分析**：趋势图+同比/环比+价差 |
| 仓储管理 | **V2.52 增强** | 入库/出库过账 + 序列号(HU) + 批次追溯(C1)；**P1-07 拣配/包装/发货**：picking→picked→packed→shipped流程+快递信息；**P1-08 保质期**：shelfLifeDays+入库算到期日+FEFO排序+库存状态Chip；**P1-21 循环盘点**：盲盘模式+ABC周期计划；**P2-24 呆滞料ABC**：>90天标红 |
| 生产管理 | **V2.53 增强** | 工单完工(B3) + MRP增强(B8) + 甘特排产(C2)；**P1-20 自动排程引擎**：正排/倒排+产能约束自动重排+冲突检测+解决建议 |
| 质量管理 | **V2.54 增强** | NCR→CAPA + AQL样(B9)；**P1-10 CAPA闭环**：不合格品→CAPA自动生成+纠正/预防/验证+状态流转；**P1-25 SPC Cpk/Ppk**：CPU/CPL/Cpk/Ppk仪表盘圆环图；**P2-15 FMEA**：失效模式分析+RPN自动计算；**P2-16 动态检验**：加严/放宽/跳批规则；**P2-17 COA**：合格证自动生成+打印；**P2-18 计量校准**：校准天数+到期预警 |
| 财务管理 | **V2.51 增强** | 凭证(A1)+成本(A4)+退货税额(A5)+会计期间(A6)；**P0-07 三单匹配差异计算**：数量/价格/金额差异+可配阈值红黄高亮+汇总卡；**P0-12 凭证冲销+编号校验**：红字冲销+编号去重；**P1-12 应收应付**：Receivable/Payable+账龄桶+催款/付款建议 |
| 销售管理 | **V2.52 增强** | 客户+信用(A3)+销售价目表(C5)；**P0-11 订单补全**：tradeTerms/shipToAddress；**P1-13 销售合同**：SalesContract(收款计划/合同明细)；**P1-14 销售漏斗**：5阶段纯CSS漏斗图；**P2-11 返利管理**：规则+自动结算；**P2-12 三方销售**：标准/直发/三方发货方式 |
| 供应商门户 | 稳定 | 订单确认/报价/资料变更/身份源(B5)+发货/质量/对账回写(B7)+黑名单拦截(B6) |
| 平台/分析 | **V2.54 增强** | 低代码+工作流；**C4字段权限**(visible/readonly/required/mask)；**C7服务端化**：sessionStore+auditStore+serverService；**P0-01-03 数据管理**：导出JSON/导入恢复/重置；**P1-24 Webhook扩**：5→15事件；**P2-01 AI Agent**：对话助手(模拟)；**P2-02 ChatBI**：对话式分析(模拟)；**P2-05 异常预警**：库存/逾期/临期/信用四类规则引擎；**P2-28 RLS行级安全**：角色敏感字段屏蔽；**P2-29 帮助体系**：引导Tour+?按钮+快捷键20+ |
| 智能分析 | **V2.52 增强** | 经营驾驶舱+需求预测+OCR；**KPI扩充**：8→20张；**P1-16 嵌入式分析**：采购/销售/生产页内嵌SVG图表 |
| 系统设置 | **V2.54 增强** | 编号规则(C3)+数据权限(C3)+字段权限(C4)+Webhook(C4)；**P0-01-03 数据管理Tab**；**P1-04 条件技术Tab**；**C7 服务审计Tab**；**P2-28 敏感字段Tab**；**API统一接口Tab**：交互式说明书+Try it控制台，覆盖11模块50+端点 |
| P2 智能 | **V2.54 新增** | AI助手(右下角对话)+ChatBI(自然语言问数)+异常检测预警+返利管理+寄售采购+FMEA+动态检验+COA+计量校准+价格分析+客户ABC+RLS+帮助体系 (17/30项) |
| P1 增强 | **完成** | 多组织/应收应付/销售合同/销售漏斗/供应商绩效/物料模板/保质期FEFO/CAPA/循环盘点/Webhook/SPC Cpk/KPI/嵌入分析/拣配流程/条件引擎/排程引擎 (18/25项，7项纯后端跳过) |
| P0 地基 | **完成** | 信息记录/货源清单/三单匹配/凭证冲销/物料多视图/数据管理/客户供应商字段/销售订单字段/PO自动取价 (10/12项，2项需外部API跳过) |

## 三、P0 六项地基（已完成）
- A1 凭证结构重构（Voucher{头+行} + 借贷平衡 + 状态机）
- A2 采购订单税价拆分（币种/税率/税额/价税合计 + 三单匹配口径统一）
- A3 客户主数据建档 + 信用硬拦截
- A4 成本核算闭环（移动平均价滚动 + 出库 COGS + GR/IR 暂估）
- A5 退货红冲税额修复（销售 AR 销项税 / 采购进项税红冲 + 应付含税）
- A6 会计期间与期末结账管控（12 期日历 + 开关账 + 反结账）

## 四、P1 业务闭环路线图
| 阶段 | 主题 | 状态 | 版本 |
|------|------|------|------|
| B1 | 信用卡点闭环 | ✅ 完成 | V2.36 |
| B2 | 三岛后台联动（序列号/委外/领料） | ✅ 完成 | V2.37 |
| B3 | 完工回写（工单→成品入库→生产成本凭证） | ✅ 完成 | V2.38 |
| B4 | NCR 联动库存（报废扣库存+报废凭证） | ✅ 完成 | V2.39 |
| **B5** | **门户回写主流程（订单/报价/资料 + 统一身份源）** | ✅ **完成** | **V2.40** |
| **B6** | **黑名单硬拦截 + 价目表回写主数据** | ✅ **完成** | **V2.41** |
| **B7** | **门户更多单据回写（发货ASN预告 / 质量NCR / 对账Reconciliation）** | ✅ **完成** | **V2.42** |
| **B9** | **AQL 抽样接入检验任务域（GB/T 2828.1 自动算样本量/Ac/Re 回写检验记录）** | ✅ **完成** | **V2.43** |
| **B8** | **MRP 增强（消费 lotSize/leadTime/安全库存分层 + 提前期偏置排产）** | ✅ **完成** | **V2.44** |
| **C1** | **批次正反向追溯穿透视图（含序列号级一物一码溯源）** | ✅ **完成** | **V2.45** |
| **C2** | **甘特图拖拽排产 + 负荷联动重排（排产体验对标 PPDS）** | ✅ **完成** | **V2.46** |
| **C3** | **统一编号规则中心（所有单据）+ 数据权限（行级/组织级）** | ✅ **完成** | **V2.47** |
| **C4** | **字段权限扩展（只读/必填/脱敏）+ Webhook 鉴权/重试** | ✅ **完成** | **V2.48** |
| **C5** | **销售价目表 + 折扣/促销（销售定价规范）** | ✅ **完成** | **V2.49** |
| **C7** | **服务端化雏形（多用户会话 + 落库审计 + 持久化抽象层）** | ✅ **完成** | **V2.50** |
| C6 | AI 助手（自然语言查数/建单） | ⏸ 未排期 | — |

## 五、门户回写（B5·V2.40）与黑名单/价目表（B6·V2.41）要点
### B5 门户回写主流程
- **订单确认回写**：门户确认订单 → `purchaseStore.confirmOrderByVendor` 回写 PO `vendorConfirmed`（幂等守卫终态不重复回写）。
- **报价回写**：`VendorQuotation.handleSubmitQuotation` 改 `alert` 为写 `priceStore.addVendorQuotation` + 推进询价单 `quotation_received` 并回写关联报价单号；同供应商+同询价单重复提交走 `updateVendorQuotation`（幂等）。
- **资料回写（主数据治理）**：门户保存资料不直接覆主档、写入 `vendor.profilePending` 待审区；甲方 `VendorList`「审核通过并并入/驳回」经 `reviewVendorProfilePending` 把待审字段并入主数据。
- **统一身份源**：`VendorQualityPage/VendorFinancePage` 硬编码 `ven-001` 常量替换为 `getVendorPortalIdentity()`（`PORTAL_VENDOR_BINDING` 登录 code→主数据供应商唯一权威）。
- **顺带修复**：`ConfirmOrderDialog` 因 `if(!order) return null` 置于 `useState` 之前违反 Hooks 规则、打开即整页崩溃的 bug（hooks 先于 return + null 守卫）。
- **验收**：`e2e/v61-b5-portal-writeback.spec.ts` 7 用例全绿；全量 46 spec / 192 用例。

### B6 黑名单硬拦截 + 价目表回写主数据
- **黑名单硬拦截（三入口）**：新增 `vendorStore.checkVendorBlacklist(id)` 纯读判定（命中 `status==='blacklisted'` 即返回原因）；在 ①PO 建单（插信用检查前先拦截，预警横幅 + 暂存/提交均 alert 返回不落库）②询价发布（`vendorOptions` 过滤黑名单 + `blockedByBlacklist()` 发布前拦截）③门户报价（按登录身份 `getVendorPortalIdentity()` 判定，命中即红色横幅 + 提交 alert 返回）三处植入「命中即 alert+return 不落库」。
- **价目表回写主数据**：`PriceListItem` 加 `writtenBack/syncedAt/erpPriceId`；`approvePriceApproval` 事件驱动生成项置回写标记并 `updateMaterial(materialId, { standardPrice })` 回写物料主数据；新增 `getActivePrice(vendorId, materialId)` 选择器；`PriceList` 页加「已回写主数据 / 待回写」徽标 + 概览统计；PO 行项目选定「供应商+物料」自动带出价目表价并打「价目表价 PAxxx」Chip（成本核算优先级 `movingAvgPrice > standardPrice > price`，回写 `standardPrice` 不干扰 A4 移动平均价）。
- **验收**：`e2e/v62-b6-price-blacklist.spec.ts` 6 用例全绿（B6-1~B6-6：拦截三入口 + 价目表回写 + PO 联动 + 对照）；全量 47 spec / 198 用例。

## 六、关键工程纪律（red lines）
1. `vite build` 仅 esbuild，类型/未定义引用运行期白屏 → 改动后必跑 Playwright 验证。
2. 共享组件/图标漏 import（Grid/Alert/Description/MenuItem）→ 整站白屏。
3. 门户 DataTable 行操作走「更多」菜单的「查看/编辑」MenuItem，**非行点击**；对话框组件 hooks 须在所有 return 之前无条件调用。
4. 版本四处同步铁律（见顶部）；任一缺失视为未完成。
5. 文件管理：同一事项只保留一个最新文件（对标/计划/测试步骤均单一不副本）。

## 七、待办与后续候选
- **P2 达标线（V2.54）**：AI Agent + ChatBI + 异常预警 + 返利管理 + 寄售采购 + FMEA + 动态检验 + COA + 计量校准 + 价格分析 + 客户ABC + RLS + 帮助体系 已落地（17/30项）
- **P1 达标线（V2.52~V2.53）**：多组织/应收应付/销售合同/销售漏斗/供应商绩效/物料模板/保质期/CAPA/循环盘点/Webhook/SPC/KPI/嵌入分析/拣配/条件引擎/排程 已落地（18/25项）
- **P0 达标线（V2.51）**：信息记录/货源清单/三单匹配/凭证冲销/物料多视图/数据管理 已落地（10/12项）
- **P2 剩余（真实缺口，V2.74.3 代码扫描复核）**：以下为扫描确认**仍缺失/壳/桩**的项（开放API P2-21、多币种 P2-27、AI Agent P2-01、ChatBI P2-02、智能推荐 P2-03、智能排程 P2-04 大部、发票OCR P2 智能 均已落地，已从剩余清单移除）：
  - **整页缺失（9 项，按三轮排期推进，见 §七之二）**：波次RFID(P2-07)✅V2.74.6、重复制造(P2-08)✅V2.74.6、MES集成(P2-09)✅V2.74.6、三方销售(P2-12)✅V2.74.7、COPA获利分析(P2-13)✅V2.74.7、资金管理(P2-14)✅V2.74.7、S&OP(P2-10)✅V2.74.8、BI集成(P2-19)✅V2.74.8、ESG(P2-30)✅V2.74.8（9 项全部补齐）
  - **壳（2 项）**：智能排程 DetailedScheduling(P2-04 部分，Gantt/APS/CRP 已真实)、移动端 MobileTab(P2-20，仅模拟 PDA 屏 + 伪二维码)
  - **桩（1 项）**：数电票核验 `tax-gateway/verify.ts`（mockVerifyInvoice + TODO 真实 API）
  - 其余 P2（寄售/返利/FMEA/动态检验/COA/计量校准/价格分析/客户ABC/RLS/帮助/异常预警）均已真实落地。

### 七之二、9 项整页缺失的三轮实施计划（V2.74.6 排定）

统一落地深度（用户已拍板）：**前端页 + mock 持久化** —— 与 productionStore/warehouseStore 完全一致（列表 + 创建/编辑弹窗 + 详情齐全），客户端 CRUD 经 `backendStorage` 落 `app_state` Blob（登录态同步 D1、未登录回退 localStorage）；**不新建 D1 表、不改后端 Functions**，沿用系统 80+ store 主流范式，零后端改动、零既有回归风险。每轮收口动作：类型校验 → 构建 → 四处注册（App 路由 / Sidebar 菜单 / searchIndex / stores 导出）→ 版本四处同步 → 构建部署。

| 轮次 | 项 | 编号 | 归属 | 状态 | 关键内容 |
|---|---|---|---|---|---|
| **A 轮** | 波次RFID | P2-07 | 仓储物流 | ✅ V2.74.6 | 波次（草稿/已下达/拣货中/已完成/关闭）+ 波次行明细 + 下达并拣货；RFID 事件（收货/上架/拣货/移位/盘点，含失败事件）+ 模拟扫描登记 |
| **A 轮** | 重复制造 | P2-08 | 生产管理 | ✅ V2.74.6 | 生产线（运行/空闲/保养）+ 生产周期 + **倒冲 backflush**：产量报工按「合格数 × 单件标准耗用」累加物料消耗，已关闭周期拒绝报工；倒冲明细查看标准耗用 vs 累计消耗 |
| **A 轮** | MES集成 | P2-09 | 生产管理 | ✅ V2.74.6 | 连接配置（已连接/异常）+ 手动同步；设备状态（运行/停机/保养）；在制品 WIP 跟踪；工序报工 |
| **B 轮** | 三方销售 | P2-12 | 销售管理 | ✅ V2.74.7 | 三方贸易/直发：供应商直发客户、两头在外的订单与结算 |
| **B 轮** | COPA获利分析 | P2-13 | 财务与报表 | ✅ V2.74.7 | 获利能力分析：按产品/客户/区域/渠道多维度贡献毛利 |
| **B 轮** | 资金管理 | P2-14 | 财务与报表 | ✅ V2.74.7 | 资金计划/头寸/内部计息/银行账户与流水 |
| **C 轮** | S&OP | P2-10 | 计划 | ✅ V2.74.8 | 销售与运营计划：需求-供应平衡会、共识预测与产能对齐 |
| **C 轮** | BI集成 | P2-19 | 分析报表 | ✅ V2.74.8 | 外部 BI 数据源/看板嵌入与数据集发布 |
| **C 轮** | ESG | P2-30 | 分析报表 | ✅ V2.74.8 | 碳排/能耗/合规披露指标采集与报表 |

**排期理由**：A 轮三项同属仓储/生产执行层、彼此无依赖且可独立验收，先补齐执行层台账缺口；B 轮偏交易与财务、需与既有销售/财务域联动；C 轮偏计划与分析、依赖前两轮的数据沉淀。

## 八、版本沿革
- V2.5–V2.21 价格闭环/销售财务/全面 store 化/P2 五域深化/P3 财务·生产·供应链·质量·平台·智能分析（全量 E2E 110→127）
- V2.22 P3-5 平台生态/低代码 · V2.23 P3-6 智能分析收官 + P4 UI/UX 路线 · V2.24 P4 七项精修（127 全绿）
- V2.25 性能优化（首屏 gzip 474→283KB）· V2.26 供应商门户 F1-F5 · V2.27 物料审批 F6-1~4 · V2.28 门户自注册 F7 · V2.29 采购申请 F8（全量 131/131）
- V2.30 A1 凭证结构重构（v49 5/5）
- V2.31 A2 PO 税价拆分（v50 5/5）
- V2.32 A3 客户主数据建档 + 信用硬拦截（v51 5/5）
- V2.33 A4 成本核算闭环（v52/53/54 各 3/3）
- V2.34 A5 退货红冲税额修复（v55 3/3）
- V2.35 A6 会计期间与期末结账管控（v56 5/5，全量 163/163 全绿）
- V2.36 **B1 信用卡点闭环**（v57 5/5，全量 168/168）
- V2.37 **B2 三岛后台联动**（v58 6/6）
- V2.38 **B3 完工回写**（v59 6/6，全量 44 spec/180 用例）
- V2.39 **B4 NCR 联动库存**（v60 5/5，全量 45 spec/185 用例）
- **V2.40 B5 门户回写主流程**（v61 7/7，全量 46 spec/192 用例）—— 打通供应商门户 4 个关键操作回写主 ERP + 统一身份源；顺带修复 ConfirmOrderDialog Hooks 崩溃。P1 系列（B1–B5）全数收官。
- **V2.41 B6 黑名单硬拦截 + 价目表回写主数据**（v62 6/6，全量 47 spec/198 用例）—— ①供应商黑名单在三入口（PO 建单 / 询价发布 / 门户报价）硬拦截不落库；②价格审批通过事件驱动回写物料主数据 `standardPrice` + `getActivePrice` 选择器 + PO 行项目「价目表价」Chip + 价目表页回写徽标。P1 系列（B1–B6）全数收官。
- **V2.42 B7 门户更多单据回写**（v63 8/8，全量 48 spec/206 用例）—— 延续 B5/B6 门户回写主线，打通「发货通知 / 质量问题单 / 对账单」三类门户单据由 flowStore 数据岛回写主 ERP：①发货通知 → `warehouseStore.addInboundOrder` 建 ASN 在途预告（`type:'asn' status:'in_transit'`，幂等去重，纯预告不碰库存财务，安全）；②质量问题单 → `qualityStore.addVendorQualityIssue` 幂等建 NCR（`source:'vendor'`+`portalIssueId` 双向追溯，`UnqualifiedItem.source` 枚举扩 vendor）；③对账单 → `financeStore.addReconciliation/confirmReconciliation` 幂等 upsert 往来对账（`statementNo+vendorId` 唯一，确认态不重复）。顺带修复 `DeliveryShipment.tsx` 的 `NewShipmentDialog` 使用 `<IconButton>` 但未从 `@mui/material` 导入（预存 bug 致发货页常驻挂载即白屏）。P1 系列（B1–B7）全数收官。
- **V2.43 B9 AQL 抽样接入检验任务域**（v64 2/2，全量 49 spec/208 用例）—— 质量域收口：把原先孤立在 `AqlSampling.tsx` + localStorage 的 AQL 抽样（GB/T 2828.1）抽成共享模块 `src/utils/aql.ts`（`computeAqlPlan(lotSize,level,aql)` 含字码表/主表/`↓↑`箭头特例）；新建检验任务选「检验水平 + AQL%」即按批量自动算样本量 n/Ac/Re 并**回填抽样数量**、写入 `qualityStore` 的 `InspectionTask`（`aql/inspectionLevel/aqlCode/aqlAc/aqlRe` 五字段，`types/quality.ts` 扩）；详情页 `InspectionTask` 含 `aqlCode` 时展示「AQL 抽样方案」块（Ac/Re 判定口径）。验收：`e2e/v64-b9-aql-inspection.spec.ts` 2 用例全绿（B9-1 自动算 n 回写详情 / B9-2 切换 AQL/水平重算）。全量 49 spec/208 用例。
- **V2.44 B8 MRP 增强**（v65 2/2，全量 50 spec/210 用例）—— 生产·物料域补强（对标文档 §14 G6 短板「MRP 未消费 lotSize/leadTime/安全库存分层」）：改造 `MRPPlan.tsx` 的 `computeNetRequirements` 真实运算三处——①安全库存分层：净需求 = max(0, 毛需求 + 安全库存 - 现有库存 - 在途)；②批量规则：计划订单量按 `lotSize` 向上取整且不低于 `moq`；③提前期偏置排产：建议下单/开工日期 = 最早销售订单交期 - 有效提前期（采购 `leadTime` / 自制 `cycleTime`）。结果表追加「安全库存/批量/提前期/需求日期/建议下单日期」五列；种子给 mat-001/002/003 补 `leadTime/lotSize/moq`。同步修正旧 `v34-p1-mrp.spec.ts` 钢板净需求断言 585→635（含安全库存）。验收：`e2e/v65-b8-mrp.spec.ts` 2 用例全绿（B8-1 安全库存+批量700+提前期偏置7天 / B8-2 新列表头可见无报错）。全量 50 spec/210 用例。
- **V2.45 C1 批次正反向追溯穿透视图**（v66 3/3，全量 51 spec/213 用例）—— P2 增强阶段首项（质量·仓储域，对标文档 §C「批次正反向追溯穿透视图（含序列号级）」）：新增只读追溯引擎 `src/pages/Warehouse/TraceBatch.tsx`（纯函数 `buildTrace(batchNo, ctx)` 不改任何 store），消费 BatchRecord/InboundOrder/OutboundOrder/FinishedGoodsInbound/SerialMaster 做正反向穿透：①反向上游——批次→采购入库（供应商 + 采购订单）；成品批次→工单→领料原料批次→原料供应商；②正向下游——原料批次→领料（工单）→成品批次；销售出库→客户；③序列号级——serialNo 匹配后取 `batchNo` 复用同引擎 + 序列号信息面板（生命周期 movements 轨迹）。新增自洽种子闭环：成品批次 F20240620X ↔ 原料批次 B20240601X ↔ 工单 WO20240601001 ↔ 采购入库 IN20240601001（上海宝钢 / PO20240601001）+ 销售出库 OUT20240610001（宁波钢结构）+ 序列号 SN-2024-0001（交流接触器 / HQ20240508 / 深圳华强入库 / 宁波钢结构发货）。路由：`Sidebar` 仓储物流组加「批次追溯穿透」(/warehouse/trace) + `App.tsx` lazy/Route。验收：`e2e/v66-c1-trace.spec.ts` 3 用例全绿（C1-1 成品批次反向上游穿透至上海宝钢+PO / C1-2 原料批次正向下游穿透至成品批次 F20240620X / C1-3 序列号反向深圳华强+正向宁波钢结构）。全量 51 spec/213 用例。
- **V2.46 C2 甘特图拖拽排产 + 负荷联动重排**（v67 3/3，全量 52 spec/216 用例）—— P2 增强阶段第二项（生产域，对标文档 §C「甘特图拖拽排产 + 负荷联动重排 | 排产体验对标 PPDS」）：新增 `src/pages/Production/GanttSchedule.tsx`——5 大工作中心泳道（DEFAULT_WORK_CENTERS），工单按工艺路线首工序 `mapCenter` 映射主中心泳道；纯 CSS 甘特 + 原生 pointer 拖拽（不引第三方拖拽/甘特库）；前/后移一天按钮为确定性改期入口（pointer 拖拽为增强 UX）；负荷采用有限能力模型——工单占用中心当日即计满该中心日产能，利用率 = 当日重叠工单数 × 100%，峰值 > 100% 标红「超载」；「负荷联动重排」按优先级做同中心前向顺排（时长 = ⌈工单工时 / 日产能⌉、不重叠），重排后峰值利用率 ≤ 100%。路由：`Sidebar` 生产组加「甘特排产」(/production/gantt, icon ViewTimeline) + `App.tsx` lazy/Route。验收：`e2e/v67-c2-gantt.spec.ts` 3 用例全绿（C2-1 前移减 1 天并持久化 / C2-2 切割中心初始超载标红 + 峰值 > 100% / C2-3 重排后超载消失 + 峰值 ≤ 100% + 同中心不重叠）。全量 52 spec/216 用例。
- **V2.47 C3 统一编号规则中心 + 数据权限（行级/组织级）**——完成。
- V2.48 **C4 字段权限四模式 + Webhook 鉴权/重试**——完成。
- V2.49 **C5 销售价目表/折扣/促销**——完成。
- V2.50 **C7 服务端化雏形（多用户+审计+持久化抽象层）**——P2增强阶段收官，V2.50全量226/227。
- **V2.51 P0 生产就绪增强**（v72 9/9 全绿）——对标报告优先项10/12落地：信息记录/货源清单/三单匹配差异/凭证冲销/物料多视图/数据管理/客户供应商字段/PO自动取价。全量232/236。
- **V2.52 P1 对标增强第一波**（v73 8/8 全绿）——供应商绩效/应收应付/销售合同/销售漏斗/物料模板/保质期FEFO/CAPA闭环/循环盘点/Webhook扩展/SPC Cpk。全量236+。
- **V2.53 P1 对标增强第二波**（构建EXIT=0）——多组织/条件技术引擎/排程引擎/拣配流程/KPI扩充20张/嵌入式分析（纯SVG）。P1合计18/25落地。全量235/244。
- **V2.54 P2 智能增强**（构建EXIT=0）——AI Agent对话助手/ChatBI/异常检测预警/返利管理/寄售采购/FMEA/动态检验/COA/计量校准/价格分析/客户ABC/RLS/帮助体系/三方销售。P2合计17/30落地，13项后端依赖跳过。
- **V2.55 SAP/ALV 列表能力统一 + 全列表导入导出**（构建EXIT=0）——把 SAP ALV 式交互（Ctrl+Y 块选复制、列排序、列漏斗检索、Excel 粘贴按物料属性回填、SAP 蓝灰表头+网格线+斑马纹）统一到共享 `DataTable` 组件，并扩展导入(粘贴/上传 TSV-CSV)+导出(xlsx/CSV)；①增强 `DataTable` 一次性获得以上能力，原 13 页即时升级；②将残留 16 个裸 MUI `<Table>` 列表页（销售/生产/质量/BOM/物料/财务）+ 全部详情页子表 + SalesOrderDetail 迁移到 `DataTable`；③修 TDZ(`Cannot access 'table' before initialization`)崩溃（V2.55.5）；④**V2.55.6 排序/筛选补全**：组件内对「有 id 但缺 accessor 的列」自动补 `accessorKey:id`（覆盖绝大多数"点了没反应"的列），并让 `fuzzyIncludes` 状态列同时匹配 `StatusBadge.statusConfig` 中文标签，实现中文检索。dev server :3002。
- **V2.56 对标整改基线**（2026-08-12）——确立"先修地基"路线：深度对标 SAP/金蝶/用友，发布 V2.56 改善报告，定义 P0 地基修复(13项)/P1 关系化(17项)/P2 合规智能化(14项)三套路线图（详见 §九）。
- **V2.57 密码与认证加固**——`functions/_shared/auth.ts` 弱哈希升级 PBKDF2-HMAC-SHA-256（10万次迭代+随机盐，兼容旧 SHA-256）；D1 云端备份下载（P0-07）；供应商激活死路修复（P0-08）；DEPLOY.md 更正为"前端 SPA + Cloudflare Pages Functions(D1+KV)"。
- **V2.58 物料主数据关系化（P1 Phase 1）**——`migrations/0003_materials.sql` + `functions/api/materials` + 幂等迁移脚本，D1 `materials` 表落地（对标 §9.3）。
- **V2.59 供应商/客户主数据关系化（P1 Phase 2）**——`vendors`(增强)/`customers` 表 + 对应 functions，12 供应商 + 5 客户种子入生产 D1。
- **V2.60 采购订单/入库/出库关系化（P1 Phase 3）**——6 张表 `purchase_orders`/`purchase_order_items`/`inbound_orders`(+items)/`outbound_orders`(+items) + functions；D1 表 8→14。
- **V2.61 销售订单关系化（P1 Phase 4）**——`sales_orders`/`sales_order_items` + functions；3 销售订单种子入 D1；D1 表 14→16。
- **V2.62 凭证/库存/工单关系化（P1 Phase 5）**——`vouchers`/`inventory_records`/`work_orders` + functions。
- **V2.63 审计日志落库（P1 Phase 6）**——`audit_logs`(不可篡改) + functions，P1 关系化 17 项全完。
- **V2.64 三单匹配服务端闭环（P1 Phase 7）+ 深度对标收官**——`three_way_match` 表 + functions；P0 六项地基全成；发布 `benchmark-V2.64-deep-analysis.md` + `development-plan-V2.64.md`；D1 关系表达 21 张。
- **V2.65 P1 Phase 1（B1–B5）流程闭环 + E2E 基建修复**——B4 NCR 四处置全出凭证（评估类分流+幂等）、B5 交期回写独立列 `vendorConfirmedDate`、B2-② 工单领料出库单、B2-① 序列号 FIFO 核销（整合 warehouseStore 冗余、修复循环依赖 TDZ 白屏）、E2E 基建（DEV 登录放行+演示用户+引导跳过）；全量回归 30/30 全绿。
- **V2.66 B10 采购订单变更单（P1 Phase 2 唯一空白项）**——`PurchaseOrder.version/history[]` + `changePurchaseOrder`(锁定校验+快照留痕+版本自增) + 详情页「变更订单/版本历史」差异对比；E2E `v70-b10-po-change.spec.ts` 4/4 + 全量 34/34 全绿。
- **V2.67 B7 工作流引擎统一收尾 + E2E 全量回归修复**——价格/物料/三队列统一接入审批引擎(`approvalFlowStore`+`approvalFlowConfig`)，条件技术引擎(`useConditionStore`)与审批流引擎解耦，`resolvePrice` 经条件引擎叠加含税价；E2E 修复 9 项陈旧用例，最终 17/17 全绿。
- **V2.68 全量 E2E 回归收口 + 开发计划合并 + 代码审计**（2026-08-28）——①全量 271 E2E 用例收口全绿（修复 v50/v51/v68/v80 四例过时定位器、v34/v37/v38/v69 资源噪声守卫误判、v30 reload race、v68 goto race，新增 B8/B9 固化用例）；②开发计划合并为单一权威版（本文件），删除 `development-plan-V2.64.md`/`P2-COMPLETION.md` 冗余副本，确立开发计划铁律；③全仓 src 代码审计（见 §十），如实标注实现度与双通道风险。
- **V2.69 D1 后端 E2E 打通 + 2 真实缺陷修复**（2026-08-28）——真实 Cloudflare 运行时 + 本地 D1 跑通生产后端全链路（注册→登录→app_state Blob 往返→10 域关系表读→B2 三岛探测）；新增可复用 harness `scripts/d1-backend-e2e.mjs`(13/13 全绿)；修复 15 个 functions 漏 `await getUserFromRequest`（7 域 GET 500）+ PO/inbound/outbound 列表查询 `FROM` 缺别名（no such column 500）；迁移 `schema_migrations` 主键 INTEGER→TEXT；架构实证双通道（10 张关系表只读、业务写经 app_state Blob）+ B2 三岛无专属后端。
- **V2.70 B2 三岛专属 D1 后端落地**（2026-08-28）——新增三岛关系表（0010 serial_masters/serial_movements、0011 subcontract_orders/subcontract_issue_items、0012 work_order_pickings）+ 端点（序列号 GET/POST/[id] + FIFO 核销 consume、委外、工单领料）+ 出/入库补 POST 落 D1；前端 `b2Api.ts` 双写桥接（登录态 fire-and-forget 落 D1、失败静默回退本地 persist），UI 零回归。**已部署生产**。
- **V2.73 P1 快赢三项**（2026-09-01）——BI 报表导出 / 预警规则可配置 UI / 数电票核验台账；新增 6 条 E2E(v83-v85)，全量 277 用例通过。
- **V2.74.0 RLS 下沉 D1 + 开放 API 网关 + 多币种 FX**（2026-09-01）——④ RLS：10 表 owner_id/dept_id + 应用层行级策略下沉 D1（`functions/_shared/rls.ts`）；⑤ FX：`fx_rates` + `fxStore` 三角换算引擎 + FxConfig；⑤ 开放网关：`api_keys`(SHA-256+scope) + 读写全端点（写操作四道护栏）+ 前端 ApiKeyManager；生产鉴权实测生效，部署 `b764bd27.ssa-erp.pages.dev`。
- **V2.74.1 网关生产实测 + 3 真实缺陷修复**（2026-09-01）——真实 sk_ Key 打生产 D1 暴露：写路径 500(缺审计列)、scope 语义错误(write⊃read)、Key 吊销 405(缺 [id].ts 路由)；根因修复 + 复测全绿；升 V2.74.1，部署 `90722bc4`。
- **V2.74.2 供应商主数据独立关系表 vendor_master**（2026-09-01）——新建 `vendor_master`(0016，主数据列+审计列，**不含 password_hash/salt**)+ 网关 `vendors` 端点改指；顺带修复子路由漏改([id].ts 仍指旧门户表致 GET/:id 404)；生产实测全绿（零凭据泄露），部署 `484836d3`。
- **V2.74.3 前端 vendorStore 对齐 D1 vendor_master（消除双数据源）**（2026-09-01）——`vendorStore` 移除 persist+backendStorage(app_state Blob 双源根治)，改经 `vendorApi` 直连 `vendor_master`；后端 `functions/api/vendors/*` 由门户表改指 vendor_master + RLS own + POST 创建(201)；修复 PUT `.bind` 未传字段 undefined→D1 500；迁移 0017 补 6 JSON 扩展列；同源冒烟全绿（前端 POST→网关 GET 同一条 / PUT 改 credit_limit 网关反映 / DELETE 网关消失）；部署 `a7572d01`，归档 ima。
- **V2.74.4 常驻生产 E2E 套件 + 5 真实后端缺陷修复（待部署验证）**（2026-09-01）——①新增 `scripts/prod-e2e/` 常驻生产 E2E 套件：`lib/{http,harness,report}.mjs` + `suites/01-auth`…`10-intelligence` 共 10 套件，覆盖认证/Blob 通道/关系 10 域/供应商同源/B2 三岛/开放网关/RLS/多币种 FX/审计三单/智能端点；打真实生产域（默认 `https://ssa-erp.pages.dev`，`PROD_E2E_BASE` 可覆盖）、时间戳隔离组织 `E2E-<runId>`、跑完自动清理业务行+吊销测试 Key、`npm run test:prod-e2e` 入口、输出 `test-reports/prod-e2e/latest.{md,json}`。②套件首跑即暴露并修复 5 个真实后端缺陷：`functions/api/open/keys.ts` 创建响应 id 与库内 id 不一致（`uid('ak')` 双调用，致调用方无法按 id 吊销）；`functions/api/audit/logs.ts` 用 `user.userId`(undefined)致 D1 绑参 500→改 `user.id`；`functions/api/ocr/recognize.ts` 非表单请求 `request.formData()` 抛错 500→包 try/catch 返回 400；开放网关 `functions/api/open/[resource]/[id].ts` PUT/DELETE 误用 `res.changes`（D1 应为 `res.meta.changes`）致缺失 404；`functions/api/alerts/index.ts` 引用不存在的 `warehouses` 表 JOIN 与 `inventory_records.quantity_on_hand` 列漂移→改用已有 `warehouse_name`/`quantity` 列。基线：首跑 18 FAIL → 修正我方断言后 7 FAIL（均为上述后端缺陷，部署后即全绿）。注意：`scripts/d1-backend-e2e.mjs`（V2.69 本地 harness）断言已过时（仍称「关系表无 POST 创建端点」「B2 三岛无专属后端」），V2.70/V2.74.3 后不成立，仅作历史参考，以 `scripts/prod-e2e/` 为准。
- **V2.74.5 主数据 materialStore/customerStore 迁真实 D1 API（根治双通道·收口物料+客户）**（2026-09-01）——① 后端 `functions/api/materials` 补 POST 创建（校验 code/name 必填、code 唯一查重 409、uid('mat')、INSERT 全列含 owner_id/dept_id/审计列 + audit helper）；`[id].ts` DELETE 修 D1 changes 坑（`res.meta?.changes ?? res.changes`，否则非存在 id 返回 200 缺 404，与 V2.74.4 网关修复同因）。② 后端 `functions/api/customers` 同构补 POST + DELETE meta.changes 修复。③ 前端新建 `src/services/customer.ts`（customerApi，与 vendorApi 同构直连 /customers）。④ 前端 `materialStore`/`customerStore` 重写去 `persist`+`backendStorage`(app_state Blob)：`loadMaterials`/`loadCustomers` 经 `materialApi`/`customerApi` 读 D1；add/update/delete 改 async 乐观更新+写回 D1（写失败 catch 保留内存态、离线回退 mock）；首次空库从 legacy app_state(或 mock)一次性回填 D1；App 启动 useEffect 同时拉 vendor/material/customer 三张主数据。⑤ MSW handlers：materials 5 处理器去 success 包裹与真实端点同构；补 customers 5 个 CRUD 处理器（原缺失）。tsc 0 错；vite build 通过（safe-delete 清空 dist 超时，按既定 workaround 移旧 dist 后构建到全新 dist）。主数据三张表（materials/customers/vendors）至此全部直连真实 D1、与开放网关同源，双通道仅剩非主数据部分（仓库/设备/单位换算/数据字典等后端暂无表仍走 Blob）。
- **V2.74.7 整页缺失补齐 B 轮（三方销售 P2-12 / COPA获利分析 P2-13 / 资金管理 P2-14）**（2026-08-27）——延续 A 轮「前端页 + mock 持久化」深度（CRUD 经 `backendStorage` 落 `app_state` Blob，不建 D1 表、不改后端 Functions），本版交付 B 轮三项：①**三方销售**（`types/tripartySales.ts` + `mocks/data/tripartySales.ts` + `stores/tripartySalesStore.ts` + `pages/Sales/TripartySalesList.tsx`，路由 `/sales/triparty`）：代销结算单（pending/partial/settled 三态）+ 统计卡（代销总额/待结算/已结算）+ 新建代销结算单（`useNumberingStore.nextNo('TPS')`）+ DataTable 增删改。②**COPA 获利分析**（`types/copa.ts` + mocks 12 条 + `stores/copaStore.ts` + `pages/Finance/CopaAnalysis.tsx`，路由 `/finance/copa`）：按 产品/客户/区域/期间 四维，派生 毛利/毛利率 + 统计卡 + 毛利条形图 + 新增分析行弹窗。③**资金管理**（`types/cashMgmt.ts` + mocks 3 账户/4 流水 + `stores/cashMgmtStore.ts` + `pages/Finance/CashMgmtList.tsx`，路由 `/finance/cash`）：账户总余额 + 账户/流水双 Tab，`addFlow` 余额联动（in 加/out 减 四舍五入 2 位），新增账户（`nextNo('ACC')`）/新增流水。复用范式：编号中心 `numberingStore` 的 `DocType` 为封闭 union + `seedRules` 强类型，新单号前缀须同步扩展两处（tsc 修 TPS/ACC 缺键）。tsc 0 错；vite build 通过（三页面分块均产出）；e2e v88 三页面冒烟 3 passed；全局 flow 回归 5 passed 无破坏；已部署 `https://afe36928.ssa-erp.pages.dev`，提交 368cb7a。四处注册齐备（types/index re-export / stores/index 导出 / App lazy+Route / Sidebar 销售组+财务组 / searchIndex）+ manual 版本登记。
- **V2.74.6 整页缺失补齐 A 轮（波次RFID P2-07 / 重复制造 P2-08 / MES集成 P2-09）**（2026-09-02）——9 项整页缺失排定三轮实施计划（见 §七之二），统一落地深度=「前端页 + mock 持久化」（与 productionStore/warehouseStore 完全一致，CRUD 经 `backendStorage` 落 `app_state` Blob，不建 D1 表、不改后端 Functions），本版交付 A 轮三项：①**波次RFID**（`types/waveRfid.ts` + `mocks/data/waveRfid.ts` + `stores/waveRfidStore.ts` + `pages/Warehouse/WaveRfidList.tsx`，路由 `/warehouse/wave-rfid`）：波次（草稿/已下达/拣货中/已完成/关闭，策略=按区域/按订单/按承运商）+ 波次行明细内嵌编辑 + 「下达并拣货」推进状态；RFID 事件（收货/上架/拣货/移位/盘点，含失败事件）+ 模拟 RFID 扫描登记。②**重复制造**（`types/repetitiveMfg.ts` + mocks + `stores/repetitiveMfgStore.ts` + `pages/Production/RepetitiveMfgList.tsx`，路由 `/production/repetitive`）：生产线（运行/空闲/保养）+ 生产周期；核心 `reportProduction(periodId, goodQty, scrapQty)` 按「合格数 × 单件标准耗用」累加倒冲消耗（3 位小数），已关闭周期拒绝报工；倒冲明细对比标准耗用 vs 累计消耗。③**MES集成**（`types/mes.ts` + mocks + `stores/mesStore.ts` + `pages/Production/MesIntegrationList.tsx`，路由 `/production/mes`）：连接配置（已连接/异常 + 手动同步）、设备状态（运行/停机/保养）、在制品 WIP 跟踪、工序报工四 Tab。④ 四处注册齐备（App lazy+Route / Sidebar 仓储组+生产组 / searchIndex / stores/index.ts 导出）+ manual 版本登记。tsc 0 错（修 4 类问题：mock 重复属性、`DocType` 不含 WAVE/LINE/RP 改本地 `seqNo` 生成编号、DataTable `batchActions.color` 不支持 'info'）；vite build 通过，三页面分块均已产出。
- **V2.75.0 启动根治双通道（W0 基建 + S&OP 参考实现）**（2026-09-02）——通用会话鉴权实体后端（functions/api/entities/[resource] 列表/创建 + [resource]/[id] 单条 CRUD，复用 getUserFromRequest+rlsFragment+audit_logs，资源注册表 ENTITY_RESOURCES 集中登记）+ 前端工厂（src/services/entityRepo.ts + src/stores/createEntityStore.ts：load/add/update/remove 乐观更新+失败回滚+离线 Mock 兜底+首次空库回填）；**S&OP(P2-10) 作首个参考实现迁 D1**（迁移 0018_sop.sql 建 sop_plans 表 + sopStore 改用工厂移除 Blob persist + 页面接 load()），验证全链路（tsc 0 错 / build / e2e v89+flow 8 passed / 远程 D1 应用 0018 + 部署生产）。下一步 W1 接已建后端 12 域、W2 软域新建表批量铺开，每域只配 resource+seed 即可接管（详见 docs/d1-migration-plan.md）。

> 部署门禁：每次生产部署后运行 `npm run test:prod-e2e`（默认自动清理），全绿方可视为收口；WARN 属外部依赖（OCR/AI/数电票/汇率刷新）不阻断，FAIL 必修。

## 九、V2.56 对标整改路线图（地基修复 P0/P1/P2）

> 来源：`docs/SSA-ERP-V2.56-对标测试与改善建议报告.md`（对标 SAP 2608 / 金蝶灵基 / 用友 U9C 2026）。
> 核心结论：**别追功能，先修地基**。对标主矛盾已从「功能差距」转为「地基浅 + 智能化断层 + 合规空白」。
> 命名区分：本节 P0/P1/P2 = **地基修复路线图**，与 §二/§四 既有的「功能增强 P0/P1/P2」是两套独立路线，勿混淆。

### 9.1 当前实测事实（V2.56 基线）
- 规模：191 页面 / 约 9.1 万行 / 67 store / 8 后端文件 / D1 仅 5 张表。
- 阻断缺陷：3 个页面运行期白屏崩溃（已修 2：ProjectDetail + OutboundDetail；WorkOrderDetail 经核实当前代码已含 `Button`/`EditIcon`/`sourceItems`，无需修）。
- 类型债：`tsc --noEmit` 实测 **418 处类型错误 / 144 文件**（StateStorage 类型不兼容 63 处、partialize 签名 37 处为集中债务）。
- 实现深度抽查 24 项：真实现 13 / 半实现 7 / 壳或缺失 4。
- 覆盖率落差：名义 85% → 实质 65% → 生产就绪 40%。
- 架构真相：业务数据以 JSON blob 存 D1 `app_state`，无业务实体表 / 服务端校验 / 事务。

### 9.2 P0 地基修复（13 项，约 13 人日）—— 目标：让系统「能用」
| 项 | 内容 | 状态 |
|----|------|------|
| P0-01 | 修 `ProjectDetail.tsx` 白屏（缺 `Button`/`Edit` import） | ✅ 已完成（2026-08-24） |
| P0-02 | 修 `OutboundDetail.tsx` 白屏（缺 `Button` import） | ✅ 已完成（2026-08-24） |
| P0-03 | 修 `WorkOrderDetail.tsx` 白屏（`sourceItems` 未定义） | ✅ 复核通过，当前代码已含，无需修 |
| P0-04 | `tsc` 纳入构建门禁（`build-with-gate.bat` 硬失败） | ✅ 已建门禁；✅ P0-05 清债后门禁已生效（tsc 0 错误） |
| P0-05 | 清理 418 处类型错误集中债务（StateStorage 63 / partialize 37 等） | ✅ 已完成（418→0，2026-08-24） |
| P0-06 | 堵越权风险：`functions/_shared/auth.ts` 弱哈希 → 升级 PBKDF2-HMAC-SHA-256（10 万次迭代 + 随机盐） | ✅ 已完成（2026-08-24）：新增 `hashPasswordPbkdf2`/`verifyPassword` 兼容分流，注册/改密写新格式，存量账号走旧 SHA-256 自动兼容，无需重设密码；删除 `vendor/login.ts` 重复哈希副本 |
| P0-07 | 加数据备份机制（D1 当前无备份） | ✅ 已完成（2026-08-24）：新增 `functions/api/system/backup.ts`（org 隔离导出）+ 前端「云端备份下载」按钮 |
| P0-08 | 修供应商激活死路（业务流程走不通，待 Playwright/手动复现定位） | ✅ 已完成（2026-08-24）：`functions/api/vendor/login.ts` 放宽放行条件为 `approved`/`registered`，消除「注册→永远 pending→登录 403」死路 |
| P0-09 | 修 `aql.ts:118` `code` 属性重复指定（潜在业务 Bug） | ✅ 复核通过（`resolvePlan` 已正确返回 code，无需改） |
| P0-10 | 更新 `DEPLOY.md`（仍写"纯前端、不共享"，与现状不符） | ✅ 已完成（2026-08-24） |
| P0-11 | `Sidebar` 硬编码 `v2.0.0` → 改读 `APP_VERSION_LABEL` | ✅ 已完成（2026-08-24） |
| P0-12 | Playwright 回归补全 3 白屏修复用例（防回归） | ✅ 已完成（2026-08-24）：`e2e/white-screen-guard.spec.ts` 2 用例全绿（注入缺字段脏数据访问两详情页无 pageerror） |
| P0-13 | 构建产物校验：dist 内确认 3 页面 chunk 正常产出 | ✅ 已完成（2026-08-24）：dist 构建成功，3 页面 chunk 正常 |

### 9.3 P1 关系化地基（17 项，约 4 人月）—— 目标：从 KV 变关系库

> 当前已启动 Phase 1「物料主数据关系化」，后续按计划逐步推进。

#### 9.3.1 P1 分阶段路线图

| 阶段 | 主题 | D1 表 | 预估工作量 | 状态 |
|------|------|-------|-----------|------|
| **Phase 1** | 物料主数据关系化 | `materials` | ~3 天 | ✅ **已完成（V2.58）** |
| **Phase 2** | 供应商/客户主数据关系化 | `vendors`(增强) / `customers` | ~4 天 | ✅ **已完成（V2.59）** |
| **Phase 3** | 采购订单/入库/出库关系化 | `purchase_orders` / `inbound_orders` / `outbound_orders` | ~5 天 | ✅ **已完成（V2.60）** |
| **Phase 4** | 销售订单关系化 | `sales_orders` / `sales_order_items` | ~4 天 | ✅ **已完成（V2.61）** |
| **Phase 5** | 凭证/库存/工单关系化 | `vouchers` / `inventory_records` / `work_orders` | ~5 天 | ✅ **已完成（V2.62）** |
| **Phase 6** | 审计日志落库 | `audit_logs`（不可篡改） | ~3 天 | ✅ **已完成（V2.63）** |
| **Phase 7** | 三单匹配服务端闭环 | `three_way_match` | ~3 天 | ✅ **已完成（V2.64）** |

#### Phase 2 已落地（V2.59）
- `migrations/0004_vendors_enhance.sql`：vendors 表增强（短名、类型、资质、评级、信用、黑名单等字段）
- `migrations/0004_customers.sql`：新建 customers 表（信用管控、开票信息、银行信息、销售组织）
- `functions/api/vendors/index.ts`：GET 分页查询（keyword/status/type 过滤）
- `functions/api/vendors/[id].ts`：GET/PUT/DELETE（code 唯一性校验）
- `functions/api/customers/index.ts`：GET 分页查询
- `functions/api/customers/[id].ts`：GET/PUT/DELETE
- 种子数据：12 条供应商 + 5 条客户已写入生产 D1
- **V2.74.2/74.3 供应商主数据重构（重要）**：V2.59 的 `vendors` 增强表实为「门户登录账号表」（含 `password_hash`/`salt` + role/status），并非纯主数据，网关/前端直读会泄露凭据或触发 NOT NULL 约束。V2.74.2 新建**独立** `vendor_master`(0016，主数据列 + 审计列，**不含 password_hash/salt**) + 扩展(0017 补 6 JSON 列)；网关 `vendors` 端点与前端 `vendorStore`(V2.74.3) 均改指 `vendor_master`，与开放网关 `/api/open/vendors` 同源、消除双数据源（前端仅 `vendor-ratings` 走 localStorage）。原 `vendors` 门户表保留用于登录鉴权。
#### Phase 3 已落地（V2.60）
- `migrations/0005_purchase_orders.sql`：新建 6 张表 `purchase_orders` / `purchase_order_items` / `inbound_orders` / `inbound_order_items` / `outbound_orders` / `outbound_order_items`
- `functions/api/purchase-orders/index.ts`：GET 分页查询（keyword/vendorId/status 过滤）
- `functions/api/purchase-orders/[id].ts`：GET/PUT/DELETE（code 唯一性校验）
- `functions/api/inbound-orders/`：GET 分页查询 + GET/PUT/DELETE
- `functions/api/outbound-orders/`：GET 分页查询 + GET/PUT/DELETE
- 种子数据：3 条采购订单 + 3 行明细、2 条入库单 + 2 行明细、2 条出库单 + 2 行明细已写入生产 D1
- D1 表从 8 张增至 14 张
#### Phase 4 已落地（V2.61）
- `migrations/0006_sales_orders.sql`：新建 2 张表 `sales_orders` / `sales_order_items`
- `functions/api/sales-orders/index.ts`：GET 分页查询（keyword/status/customerId 过滤）
- `functions/api/sales-orders/[id].ts`：GET/PUT/DELETE
- 种子数据：3 条销售订单 + 6 行明细已写入生产 D1（华润建筑/新源机械/远达钢结构项目）
- D1 表从 14 张增至 16 张
- `migrations/0003_materials.sql`：`materials` 表 + 索引 + `schema_migrations` 版本守卫
- `functions/api/materials/index.ts`：GET 分页查询（keyword/type/status 过滤）
- `functions/api/materials/[id].ts`：GET/PUT/DELETE（code 唯一性校验、org 隔离）
- `functions/api/system/migrate-materials.ts`：app_state → materials 迁移脚本（幂等、admin 鉴权）
- 前端 DataManagement 增加「同步物料至云端表」按钮

#### 实现纪律
1. 所有实体表均按 `org_id` 隔离，天然多租户
2. 对象数组字段（parameters/plantParams/customFields）以 TEXT JSON 序列化落库
3. 迁移脚本幂等：ON CONFLICT(org_id, code) DO UPDATE/INSERT
4. 迁移前必先做云端备份（`/api/system/backup`）
5. 每次 Phase 落地后 bump 版本号、更新 §九 状态表、更新 manual.tsx

### 9.4 P2 合规与智能化（14 项，约 6 人月）—— 目标：跨合规红线 + 真 AI（V2.74.3 复核状态）
- 等保/审计/权限矩阵（RLS 强化）：✅ **已完成**——V2.74.0 `functions/_shared/rls.ts` 11 表行级策略下沉 D1；前端 `dataPermissionStore`/`SecureField` 为展示级脱敏（非强制，真强制在后端）。
- 真正 ChatBI：✅ **已完成（规则型）**——`functions/api/chatbi` 关键词→类型映射 + 真实 D1 SQL 执行（非 LLM-to-SQL，无写死 MOCK_RESPONSES）。
- 发票 OCR 模型对接：🟢 **部分**——`ocr/recognize.ts` 已调 Tesseract.js 真实 OCR，但字段抽取仍 `text.match` 正则（OCR 已真、结构化抽取待模型化）。
- 异常预警规则引擎：✅ **已完成**——`functions/api/alerts` 库存/逾期/临期/信用/待审批 6 类真实计算。
- AI Agent 真实化：✅ **已完成**——`functions/api/ai/chat.ts` 真实 LLM 代理（KV 模型配置 + fetch `/chat/completions`），无模拟兜底。
- 数电票核验：🟡 **仍桩**——`tax-gateway/verify.ts` `mockVerifyInvoice` + TODO 真实 API（全仓唯一确认桩）。
- 多币种：✅ **已完成（V2.74.0）**；开放 API：✅ **已完成（V2.74.0–74.2）**；BI 集成(P2-19)/ESG(P2-30) ✅ **已完成（V2.74.8，见 §七之二）**。

### 9.5 版本沿革补充
- **V2.56 对标整改基线**（2026-08-12）—— 本基线在后续 V2.57 轮落地：P0-01~P0-13 全部完成（白屏修复 + 类型门禁 + 弱哈希升级为 PBKDF2 + D1 备份 + 供应商激活死路修复 + DEPLOY.md 更正 + Sidebar 版本号修正 + 防回归 e2e 用例），同步推进至 V2.57.0；P1 关系化地基（17 项，约 4 人月）与 P2 合规智能化（14 项，约 6 人月）为下一阶段的长期路线。

---

## 十、代码审计现实（V2.74.3 全仓 src + functions 扫描）

> 来源：V2.74.3 轮 4 个 Explore 子代理对 `src/`（67 store / 191 页 / ~9 万行）+ `functions/`（39 serverless）+ `migrations/`（0001–0017）全量扫描。结论校准"计划声称"与"代码真实"的偏差。**关键修正：V2.68 审计的多项 🟡 已在 V2.69–V2.74.3 闭合（B10 / 类型门禁 / RLS / AI / ChatBI / 开放API / 多币种）。**

### 10.1 双数据通道（关键架构前提，已细化）
- **DEV/本地/E2E/离线演示**：`src/main.tsx` 仅 `import.meta.env.DEV` 启动 MSW（`src/mocks/handlers.ts` 拦截 `/api/*`），stores 直接 import `@/mocks/data/*` 种子 → 浏览器内 mock，不触达 D1。
- **生产通道**：Cloudflare Pages 构建不启动 MSW，`fetch('/api/...')` 真实打 `functions/api` + D1（migrations 0001–0017，约 30 张表）。`functions/api` 39 个端点绝大多数真实落库（详见 §十.3）。
- **双通道现状（V2.74.5 实测）**：关系化后端已在 V2.58–V2.64 建表 + 函数在 V2.69–V2.74.5 打通。**主数据三张（materials/customers/vendors）前端已直连真实 D1**：`vendorStore`(V2.74.3) 直连 `vendor_master`、`materialStore`/`customerStore`(V2.74.5) 直连 `materials`/`customers`（与开放网关同源）；其余前端 store 仍大多以 `app_state` Blob 为主源（`persist`+`backendStorage` 写 `/api/state/:key`），`warehouse/production/subcontract` 4 个经 `b2Api`「本地主源 + fire-and-forget 双写 D1」（三岛表）。即"后端关系表"与"前端主源 Blob"并行仅剩非主数据部分，主数据三张已根治双源。
- 含义：下文"已实现"指源码含真实业务逻辑/算法；依赖持久化与跨表关系的，在生产态落 D1、在 DEV 落 Blob。

### 10.2 实现度校准（偏差项，V2.74.3）
| 功能 | 计划声称 | 代码真实（V2.74.3 扫描） | 证据/说明 |
|------|---------|---------|-----------|
| B2 三岛后台联动 | ✅ 完成 V2.37 | ✅ 已闭环（V2.70） | `b2Api.ts` + 迁移 0010–0012（serial_masters/subcontract_orders/work_order_pickings）+ `functions/api/serial-numbers`、`subcontracts`、`work-orders/picking` 真实端点；仅源码未用"三岛"代号。注意：V2.70 发布说明称"失败回退本地 Blob"不实——全仓无 Blob/R2 回退通道，失败静默 `return null`，真实回退为本地 zustand persist(localStorage) |
| B8 MRP 增强 | ✅ 完成 V2.44 | ✅ 真实（页面内算法） | `MRPPlan.tsx#computeNetRequirements` 安全库存/批量/提前期偏置真实运算；`productionStore.MRP` 仅 mock 推荐无计算引擎 |
| B10 PO 变更单 | ✅ 完成 V2.66 | ✅ 真实独立变更单 | `purchaseStore.changePurchaseOrder`(L137) 版本自增+快照入 `history[]`+终态/已收货锁定禁改；`OrderDetail.tsx` 版本历史差异对比视图（非原单标记） |
| 类型门禁 tsc 0 错 | ✅ 已建门禁 | ✅ 已纳入默认构建 | `package.json` build = `tsc --noEmit && vite build`（门禁强制默认，`build-with-gate.bat` 同逻辑） |
| RLS 行级安全 | ✅ P2-28 | ✅ 后端下沉 D1 | `functions/_shared/rls.ts` TABLE_RLS 映射 11 表 + `rlsFragment`/`assertRlsOwnership` 22 处调用；前端 `dataPermissionStore`/`SecureField` 仍为展示级脱敏（非强制） |
| 智能推荐 P2-03 | 部分 | ✅ 真实 | `Forecast.tsx#computeDemandForecast/buildMonthlySales` 真实算法 |
| 智能排程 P2-04 | 部分 | 🟢 大部分真实（仅 1 壳） | `GanttSchedule`/`FiniteCapacity`(APS)/`CRP`(`utils/crp.ts`) 真实有限产能排程；`DetailedScheduling.tsx` 仅锁单/锚定 UI（壳） |
| 移动端 P2-20 | 部分 | 🟡 壳 | `Settings/MobileTab.tsx` 静态模拟 PDA 屏 + 伪二维码，无真实移动端构建/路由 |
| 三方销售 P2-12 | 部分 | 🟡 无专项实体 | 销售含 SO/Quotation/Contract，三方/代销无独立实体 |
| AI Agent（P2-01） | 模拟对话 | ✅ 真实代理 | `functions/api/ai/chat.ts` 读 KV 模型配置 + `fetch` LLM `/chat/completions`（无写死）；前端 `AIAssistant.tsx` 真实 fetch，无模拟兜底 |
| ChatBI（P2-02） | 模拟 | ✅ 真实（规则型） | `functions/api/chatbi` 关键词→类型映射 + 真实 D1 SQL 执行（非 LLM-to-SQL） |
| 发票 OCR | 正则 parseInvoice | 🟢 真实 OCR + 正则抽取 | `ocr/recognize.ts` 调 Tesseract.js 真实 OCR；字段抽取仍用 `text.match` 正则（OCR 已真，抽取待模型化） |
| 数电票核验 | 真实转发 | 🟡 仍桩 | `tax-gateway/verify.ts` `mockVerifyInvoice` + `TODO` 真实 API（唯一确认桩）；`index.ts` `encryptApiKey` 仅 base64 |
| 开放 API（P2-21） | 跳过 | ✅ 已完成（V2.74.0–74.2） | `functions/api/open/*` 网关：materials/vendors(vendor_master)/customers/purchase-orders/sales-orders + api_keys(scope write⊃read) |
| 多币种 FX（P2-27） | 跳过 | ✅ 已完成（V2.74.0） | `fxStore.convert` 三角折算 + `fx_rates` 表 + 网关刷新 exchangerate.host |

### 10.3 真实落地（确认无偏差，V2.74.3）
- **P0 六项地基**：A1 凭证(`utils/voucher.ts`)、A2 税价(`utils/tax.ts`)、A3 信用(`customerStore`)、A4 成本(`utils/cost.ts`)、A5 红冲(`buildReversalVoucher`)、A6 期间(`PeriodClosing.tsx`)——核心算法逐行可核验。
- **P1 关系化后端**：materials/customers/purchase_orders/sales_orders/vouchers/inventory_records/work_orders/three_way_match/audit_logs + **vendor_master(0016/0017)** + **三岛表(0010–0012)** + **fx_rates(0014)/api_keys(0015)** 均真实落库；网关/会话/关系端点 39 个真实。
- **P2 智能后端**：AI(`ai/chat.ts` 真实 LLM 代理)、ChatBI(`chatbi` 规则+真实 SQL)、异常预警(`alerts` 6 类规则)、审计(`audit`)、OCR(`ocr` Tesseract)——均为真实实现（仅 `tax-gateway/verify` 为桩）。
- **整改项**：PBKDF2(`auth.ts`)、D1 备份(`system/backup.ts`)、白屏(`ErrorBoundary`+`PageFallback`+`white-screen-guard.spec.ts`)、RLS 下沉 D1、DEPLOY 更正——代码/配置已落地。
- **供应商主数据同源**：V2.74.3 `vendorStore` 直连 `vendor_master`，与开放网关 `/api/open/vendors` 同源，双数据源消除（前端仅 `vendor-ratings` 走 localStorage）。

### 10.4 下一步重点（按用户价值排序，V2.74.3）
1. **生产态常驻 E2E（已交付 V2.74.4）**：`scripts/prod-e2e/` 常驻套件（10 套件，默认打真实生产 `https://ssa-erp.pages.dev`、时间戳隔离组织+自动清理+机器可读报告，`npm run test:prod-e2e` 入口）已补，覆盖认证/Blob/关系10域/供应商同源/B2三岛/开放网关/RLS/多币种/审计三单/智能端点；部署后重跑 **214/0 全绿**，"双通道并行"残留风险由套件持续值守（前端 store 仍多走 Blob 属已知架构事实）；旧 `d1-backend-e2e.mjs`(13/13) 断言已过时（关系表已支持 POST、B2 三岛已有专属后端），建议标注废弃或更新。
2. **根治双通道（W0 已启动，V2.75.0）**：根因=79 个前端 store 仍 persist 到 `app_state` Blob、未接后端（后端 12 业务域 Functions 早建好）。W0 已落地「通用实体后端（/api/entities/[resource] 会话鉴权 CRUD）+ 前端工厂（createEntityStore）」，**S&OP(P2-10) 作首个参考实现迁 D1**（sop_plans 表 + 移除 Blob persist），验证全链路（tsc 0 错 / build / e2e 8 passed / 部署生产）。后续 **W1 接已建后端的 12 域**（customers/vendors/PO/SO/出入库/工单/凭证/库存/序列号/委外）、**W2 软域**（MES/S&OP/BI/ESG/COPA/资金…）新建表批量铺开，每域只配 resource+seed 即可接管（详见 docs/d1-migration-plan.md）。纯本地类 store（UI 偏好/会话/主题）明确不迁，仅业务实体类计入根治（非双通道问题）。
3. **P2 深水区（9 项整页缺失 + 2 壳 + 1 桩）**：9 项已按三轮排期（详见 §七之二），**A+B+C 三轮共 9 项全部交付（V2.74.6 + V2.74.7 + V2.74.8）**（A 轮=波次RFID P2-07 / 重复制造 P2-08 / MES集成 P2-09；B 轮=三方销售 P2-12 / COPA P2-13 / 资金管理 P2-14；C 轮=S&OP P2-10 / BI集成 P2-19 / ESG P2-30，均「前端页 + mock 持久化」深度）。**9 项整页缺失已全部收口 ✅**。另：DetailedScheduling(P2-04 壳)/MobileTab(P2-20 壳)；数电票核验(tax-gateway/verify 桩)。
4. **OCR 字段抽取模型化**：Tesseract 已真，字段解析仍正则，待接大模型结构化抽取。
5. **采购订单变更单**：已实现独立版本化变更单，按业务是否需要进一步升为"独立变更单实体 + 独立审批流"再评估（当前已满足大多数场景）。
