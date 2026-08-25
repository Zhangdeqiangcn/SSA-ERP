# SSA ERP 实施主计划（单一权威版）

> 标题基线：**V2.54**（2.54.0，构建于 2026-08-12）；**V2.56 对标整改基线**（见 §九，package.json 2.56.0）：本计划在此基线追加「地基修复」P0/P1/P2 路线图。
> 版本单一来源：`src/version.ts` 的 `APP_VERSION`(==`package.json`.version) 与 `APP_VERSION_LABEL`(展示)；UI 读 `APP_VERSION_LABEL`。
> 版本铁律：每次变更同步四处 —— ①`src/version.ts` ②`package.json`.version ③项目记忆 `MEMORY.md` 版本沿革 ④本主计划（标题基线 + §二模块现状 + §八沿革）。

---

## 一、基础信息
- 路径：`ssa-erp/` ｜ 桌面备份：`Desktop/ssa-erp/`（无 node_modules）
- 技术栈：React18 + TS + Vite5 + MUI v5 + zustand(persist) + TanStack Table + Playwright
- 构建：`node node_modules/vite/bin/vite.js build`（仅 esbuild 跳过 tsc，运行期靠 Playwright 验证）
- 数据：`src/mocks/data/`(11 文件) 仅种子源
- 自动化回归：Playwright `e2e/*.spec.ts`，`window.__ssaStores`（DEV 暴露）驱动断言

## 二、模块现状（截至 V2.54）
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
- **P2 剩余（13项跳过）**：智能推荐(P2-03)、智能排程(P2-04)、波次RFID(P2-07)、重复制造(P2-08)、MES集成(P2-09)、S&OP(P2-10)、COPA(P2-13)、资金管理(P2-14)、BI集成(P2-19)、移动端(P2-20)、开放API(P2-21)、多币种(P2-27)、ESG(P2-30)——均需后端/外部系统/行业定制

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

---

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

### 9.4 P2 合规与智能化（14 项，约 6 人月）—— 目标：跨合规红线 + 真 AI

### 9.4 P2 合规与智能化（14 项，约 6 人月）—— 目标：跨合规红线 + 真 AI
- 等保/审计/权限矩阵（角色 × 敏感字段屏蔽，强化 RLS）。
- 真正 ChatBI（自然语言→查询，替换写死 `MOCK_RESPONSES`）。
- 发票 OCR 模型对接（替换仅正则的 `parseInvoice`）。
- 异常预警规则引擎（库存/逾期/临期/信用四类真实计算）。
- AI Agent 真实化（当前为模拟对话）。
- 多币种、开放 API、BI 集成等 P2 剩余项（见 §七）。

### 9.5 版本沿革补充
- **V2.56 对标整改基线**（2026-08-12）—— 本基线在后续 V2.57 轮落地：P0-01~P0-13 全部完成（白屏修复 + 类型门禁 + 弱哈希升级为 PBKDF2 + D1 备份 + 供应商激活死路修复 + DEPLOY.md 更正 + Sidebar 版本号修正 + 防回归 e2e 用例），同步推进至 V2.57.0；P1 关系化地基（17 项，约 4 人月）与 P2 合规智能化（14 项，约 6 人月）为下一阶段的长期路线。
