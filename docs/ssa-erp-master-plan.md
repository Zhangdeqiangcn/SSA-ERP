# SSA ERP 实施主计划（单一权威版）

> 标题基线：**V2.54**（2.54.0，构建于 2026-08-12）；**V2.56 对标整改基线**（见 §九，package.json 2.56.0）；**当前版本 V3.3.0**（2026-09-14，见 §八 / §十二）：本计划在此基线追加「地基修复」P0/P1/P2 路线图，并在 V2.97.0–V3.3.0 完成「独立安全评测 23 项发现 + 1 项元发现」的**全部整改**（§十二：23 项 + 元发现已全部收口，无剩余项）。
> 版本单一来源：`src/version.ts` 的 `APP_VERSION`(==`package.json`.version) 与 `APP_VERSION_LABEL`(展示)；UI 读 `APP_VERSION_LABEL`。
> 版本铁律：每次变更同步五处 —— ①`src/version.ts` ②`package.json`.version ③项目记忆 `MEMORY.md` 版本沿革 ④本主计划（顶部基线 + §二模块现状 + §八沿革）⑤`src/content/manual.tsx` 版本记录（并补入口：设置/侧栏/searchIndex）。
>
> **开发计划铁律**：全项目只保留本文件（`docs/ssa-erp-master-plan.md`）作为唯一开发计划。带版本/日期后缀的计划副本（如 `development-plan-V2.64.md`、`P2-COMPLETION.md`）在完成对应阶段后必须合并进本文件并删除，不保留重复/历史副本。版本升级时先更新本文档再升版号。

---

## 一、基础信息
- 路径：`ssa-erp/` ｜ 桌面备份：`Desktop/ssa-erp/`（无 node_modules）
- 技术栈：React18 + TS + Vite5 + MUI v5 + zustand(persist) + TanStack Table + Playwright
- 构建：`node node_modules/vite/bin/vite.js build`（仅 esbuild 跳过 tsc，运行期靠 Playwright 验证）
- 数据：`src/mocks/data/`(11 文件) 仅种子源
- 自动化回归：Playwright `e2e/*.spec.ts`，`window.__ssaStores`（DEV 暴露）驱动断言

## 二、模块现状（V2.54 基线盘点 · 变更沿革至 V3.3.0）

> 下表为 V2.54 基线盘点；V2.55–V3.3.0 的逐项变更见 §八版本沿革，V2.97.0–V3.3.0 的独立评测与安全整改见 §十二。核心结论：**P0 六项地基、P1 业务闭环（B1–B11 + C1–C7）、P1 关系化后端 17 项、P2 智能增强（20/30 功能落地——V2.74.7 补齐波次RFID/重复制造/MES集成 + 三方销售/COPA/资金管理（A/B 两轮共 6 项）、V2.74.8 补齐 S&OP/BI集成/ESG（C 轮 3 项），9 项整页缺失全部完成 + 2 壳 + 1 桩）均已落地**；生产态真实后端见 §九/§十。
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
4. 版本五处同步铁律（见顶部）；任一缺失视为未完成。
5. 文件管理：同一事项只保留一个最新文件（对标/计划/测试步骤均单一不副本）。
6. **发布顺序铁律（V3.1.0 固化）**：`npm run build`（先构建 dist）→ `npm run deploy`（迁移 apply + 上传）。**`npm run deploy` 只做迁移与上传、不构建**——漏掉 build 会把上一次的旧 dist 重新传一遍（表现为「部署成功但页面没变化」）。沙箱清 dist 超时时设 `CODEBUDDY_SAFE_DELETE_ENABLED=0`。
7. **写库四者对齐（V2.97.0 固化）**：任何 INSERT/UPDATE 的「列数 / 占位符数 / 字面量数 / 绑定参数数」必须逐一核对——多写或少写一个 `?` 类型检查与打包都看不见，**只有运行期 SQL 层会炸**；同类隐蔽坑还有「静态表清单」（如 `d1_migrations` 等平台自建表无 `org_id`）必须以运行时表结构判定。
8. **编辑纪律（V3.0.0 固化）**：同一个文件**不得并行发多个编辑**（后写静默覆盖先写，工具仍报成功）——必须串行并逐次回读校验。
9. **验证双轨（V2.74.4 起）**：后端/Functions 改动除类型检查外，须用 esbuild `transformSync` 逐文件语法自查（测试文件不在 tsc 范围内）；`.mjs` 用 `node --check`；最终以生产端到端门禁为准。

## 七、待办与后续候选
- **P2 达标线（V2.54）**：AI Agent + ChatBI + 异常预警 + 返利管理 + 寄售采购 + FMEA + 动态检验 + COA + 计量校准 + 价格分析 + 客户ABC + RLS + 帮助体系 已落地（17/30项）
- **P1 达标线（V2.52~V2.53）**：多组织/应收应付/销售合同/销售漏斗/供应商绩效/物料模板/保质期/CAPA/循环盘点/Webhook/SPC/KPI/嵌入分析/拣配/条件引擎/排程 已落地（18/25项）
- **P0 达标线（V2.51）**：信息记录/货源清单/三单匹配/凭证冲销/物料多视图/数据管理 已落地（10/12项）
- **P2 剩余（真实缺口，V2.74.3 代码扫描复核）**：以下为扫描确认**仍缺失/壳/桩**的项（开放API P2-21、多币种 P2-27、AI Agent P2-01、ChatBI P2-02、智能推荐 P2-03、智能排程 P2-04 大部、发票OCR P2 智能 均已落地，已从剩余清单移除）：
  - **整页缺失（9 项，按三轮排期推进，见 §七之二）**：波次RFID(P2-07)✅V2.74.6、重复制造(P2-08)✅V2.74.6、MES集成(P2-09)✅V2.74.6、三方销售(P2-12)✅V2.74.7、COPA获利分析(P2-13)✅V2.74.7、资金管理(P2-14)✅V2.74.7、S&OP(P2-10)✅V2.74.8、BI集成(P2-19)✅V2.74.8、ESG(P2-30)✅V2.74.8（9 项全部补齐）
  - **壳（1 项，仅剩）**：智能排程 DetailedScheduling(P2-04 部分，Gantt/APS/CRP 已真实、**锁单/锚定「壳」已于 V2.76.0 补全为真实生效**)；移动端 MobileTab(P2-20，**扫码入库真门户已于 V2.78.0 落地**：/m PWA 路由 + 真扫码匹配明细行 + 写回 D1 过账，伪二维码→真二维码、门户按钮由 disabled 改可点 ✅)
  - **桩（1 项）**：数电票核验 `tax-gateway/verify.ts`（mockVerifyInvoice + TODO 真实 API）
  - 其余 P2（寄售/返利/FMEA/动态检验/COA/计量校准/价格分析/客户ABC/RLS/帮助/异常预警）均已真实落地。
- **安全评测遗留 2 项（V3.3.0 已全部收口）**：L-04 行级策略表未改显式全量登记 → 已改为「默认拒绝 + 48 张业务表全量显式登记（全公司 36 / 仅本人 7 / 仅部门 5）+ 18 张平台表免登记（逐张注明原因）+ 真实表清单双向机器比对（漏登记 + 僵尸登记）」；L-05 审计写入失败无降级记录 → 已建三层降级通道（日志标记 → 独立降级表 → 绝不阻断业务）+ 管理员健康度入口。
- **已完成（V3.3.0）**：L-04（行级策略显式全量登记 + 默认拒绝 + 漏登记机器自检）、L-05（审计失败三层降级 + 健康度可视化）；顺带修复数电票核验接口两处真实缺陷（写错审计字段名导致记录丢失、外部通道未开通时先写审计再报 500）。
- **已完成（V3.2.0）**：M-12（接口密钥有效期 + 网址参数显式拒绝）、L-02（密钥轮换）、L-03（孤儿组织账号准入闸门）。
- **数电票真实核验（需外部条件）**：代码已就位（多服务商路由 + 结构化校验），默认模拟兜底；待企业税号 + 服务商密钥（后端 KV `TAX_GATEWAY`）启用真实通道。

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
- **V2.74–V2.77 系列（2026-09-02 ~ 2026-09-04）——** 根治双通道 W0–W3（S&OP/主数据三张/4 事务域/仓库入出库/高级三切片去 Blob 直连真实 D1，100% 闭环，详见 MEMORY.md 版本沿革）；部署 SOP 固化（`scripts/deploy.mjs` + 生产 `d1_migrations` 元数据对齐，防 V2.76.0 漏迁移事故复发）。
- **V2.78.0 移动端 PWA 真门户落地（2026-09-04）——** MobileTab(P2-20) 从壳变真功能：新增 /m 路由 PWA 移动门户（manifest.webmanifest + ssa-sw.js + 192/512/maskable 图标），本轮作业=扫码入库；BarcodeScanner 双通道（原生 BarcodeDetector → @zxing/library 解 Code 39/128/QR → 手动输入兜底，兼容老旧 PDA 扫码枪）；MobileInbound 扫码/搜物料编码（Code 39 内容=物料编码大写）命中明细行→录实收数→updateInboundOrder 真实写回 D1 过账；MobileHome 渲染真实待入库任务（warehouseStore.inboundOrders）；Settings/MobileTab 伪二维码→真二维码 + 打开移动门户按钮由 disabled 改可点。新增 E2E v77 5/5 全绿；tsc 0 错；部署生产。
- **V2.74.0 RLS 下沉 D1 + 开放 API 网关 + 多币种 FX**（2026-09-01）——④ RLS：10 表 owner_id/dept_id + 应用层行级策略下沉 D1（`functions/_shared/rls.ts`）；⑤ FX：`fx_rates` + `fxStore` 三角换算引擎 + FxConfig；⑤ 开放网关：`api_keys`(SHA-256+scope) + 读写全端点（写操作四道护栏）+ 前端 ApiKeyManager；生产鉴权实测生效，部署 `b764bd27.ssa-erp.pages.dev`。
- **V2.74.1 网关生产实测 + 3 真实缺陷修复**（2026-09-01）——真实 sk_ Key 打生产 D1 暴露：写路径 500(缺审计列)、scope 语义错误(write⊃read)、Key 吊销 405(缺 [id].ts 路由)；根因修复 + 复测全绿；升 V2.74.1，部署 `90722bc4`。
- **V2.74.2 供应商主数据独立关系表 vendor_master**（2026-09-01）——新建 `vendor_master`(0016，主数据列+审计列，**不含 password_hash/salt**)+ 网关 `vendors` 端点改指；顺带修复子路由漏改([id].ts 仍指旧门户表致 GET/:id 404)；生产实测全绿（零凭据泄露），部署 `484836d3`。
- **V2.74.3 前端 vendorStore 对齐 D1 vendor_master（消除双数据源）**（2026-09-01）——`vendorStore` 移除 persist+backendStorage(app_state Blob 双源根治)，改经 `vendorApi` 直连 `vendor_master`；后端 `functions/api/vendors/*` 由门户表改指 vendor_master + RLS own + POST 创建(201)；修复 PUT `.bind` 未传字段 undefined→D1 500；迁移 0017 补 6 JSON 扩展列；同源冒烟全绿（前端 POST→网关 GET 同一条 / PUT 改 credit_limit 网关反映 / DELETE 网关消失）；部署 `a7572d01`，归档 ima。
- **V2.74.4 常驻生产 E2E 套件 + 5 真实后端缺陷修复（待部署验证）**（2026-09-01）——①新增 `scripts/prod-e2e/` 常驻生产 E2E 套件：`lib/{http,harness,report}.mjs` + `suites/01-auth`…`10-intelligence` 共 10 套件，覆盖认证/Blob 通道/关系 10 域/供应商同源/B2 三岛/开放网关/RLS/多币种 FX/审计三单/智能端点；打真实生产域（默认 `https://ssa-erp.pages.dev`，`PROD_E2E_BASE` 可覆盖）、时间戳隔离组织 `E2E-<runId>`、跑完自动清理业务行+吊销测试 Key、`npm run test:prod-e2e` 入口、输出 `test-reports/prod-e2e/latest.{md,json}`。②套件首跑即暴露并修复 5 个真实后端缺陷：`functions/api/open/keys.ts` 创建响应 id 与库内 id 不一致（`uid('ak')` 双调用，致调用方无法按 id 吊销）；`functions/api/audit/logs.ts` 用 `user.userId`(undefined)致 D1 绑参 500→改 `user.id`；`functions/api/ocr/recognize.ts` 非表单请求 `request.formData()` 抛错 500→包 try/catch 返回 400；开放网关 `functions/api/open/[resource]/[id].ts` PUT/DELETE 误用 `res.changes`（D1 应为 `res.meta.changes`）致缺失 404；`functions/api/alerts/index.ts` 引用不存在的 `warehouses` 表 JOIN 与 `inventory_records.quantity_on_hand` 列漂移→改用已有 `warehouse_name`/`quantity` 列。基线：首跑 18 FAIL → 修正我方断言后 7 FAIL（均为上述后端缺陷，部署后即全绿）。注意：`scripts/d1-backend-e2e.mjs`（V2.69 本地 harness）断言已过时（仍称「关系表无 POST 创建端点」「B2 三岛无专属后端」），V2.70/V2.74.3 后不成立，仅作历史参考，以 `scripts/prod-e2e/` 为准。
- **V2.74.5 主数据 materialStore/customerStore 迁真实 D1 API（根治双通道·收口物料+客户）**（2026-09-01）——① 后端 `functions/api/materials` 补 POST 创建（校验 code/name 必填、code 唯一查重 409、uid('mat')、INSERT 全列含 owner_id/dept_id/审计列 + audit helper）；`[id].ts` DELETE 修 D1 changes 坑（`res.meta?.changes ?? res.changes`，否则非存在 id 返回 200 缺 404，与 V2.74.4 网关修复同因）。② 后端 `functions/api/customers` 同构补 POST + DELETE meta.changes 修复。③ 前端新建 `src/services/customer.ts`（customerApi，与 vendorApi 同构直连 /customers）。④ 前端 `materialStore`/`customerStore` 重写去 `persist`+`backendStorage`(app_state Blob)：`loadMaterials`/`loadCustomers` 经 `materialApi`/`customerApi` 读 D1；add/update/delete 改 async 乐观更新+写回 D1（写失败 catch 保留内存态、离线回退 mock）；首次空库从 legacy app_state(或 mock)一次性回填 D1；App 启动 useEffect 同时拉 vendor/material/customer 三张主数据。⑤ MSW handlers：materials 5 处理器去 success 包裹与真实端点同构；补 customers 5 个 CRUD 处理器（原缺失）。tsc 0 错；vite build 通过（safe-delete 清空 dist 超时，按既定 workaround 移旧 dist 后构建到全新 dist）。主数据三张表（materials/customers/vendors）至此全部直连真实 D1、与开放网关同源，双通道仅剩非主数据部分（仓库/设备/单位换算/数据字典等后端暂无表仍走 Blob）。
- **V2.74.7 整页缺失补齐 B 轮（三方销售 P2-12 / COPA获利分析 P2-13 / 资金管理 P2-14）**（2026-08-27）——延续 A 轮「前端页 + mock 持久化」深度（CRUD 经 `backendStorage` 落 `app_state` Blob，不建 D1 表、不改后端 Functions），本版交付 B 轮三项：①**三方销售**（`types/tripartySales.ts` + `mocks/data/tripartySales.ts` + `stores/tripartySalesStore.ts` + `pages/Sales/TripartySalesList.tsx`，路由 `/sales/triparty`）：代销结算单（pending/partial/settled 三态）+ 统计卡（代销总额/待结算/已结算）+ 新建代销结算单（`useNumberingStore.nextNo('TPS')`）+ DataTable 增删改。②**COPA 获利分析**（`types/copa.ts` + mocks 12 条 + `stores/copaStore.ts` + `pages/Finance/CopaAnalysis.tsx`，路由 `/finance/copa`）：按 产品/客户/区域/期间 四维，派生 毛利/毛利率 + 统计卡 + 毛利条形图 + 新增分析行弹窗。③**资金管理**（`types/cashMgmt.ts` + mocks 3 账户/4 流水 + `stores/cashMgmtStore.ts` + `pages/Finance/CashMgmtList.tsx`，路由 `/finance/cash`）：账户总余额 + 账户/流水双 Tab，`addFlow` 余额联动（in 加/out 减 四舍五入 2 位），新增账户（`nextNo('ACC')`）/新增流水。复用范式：编号中心 `numberingStore` 的 `DocType` 为封闭 union + `seedRules` 强类型，新单号前缀须同步扩展两处（tsc 修 TPS/ACC 缺键）。tsc 0 错；vite build 通过（三页面分块均产出）；e2e v88 三页面冒烟 3 passed；全局 flow 回归 5 passed 无破坏；已部署 `https://afe36928.ssa-erp.pages.dev`，提交 368cb7a。四处注册齐备（types/index re-export / stores/index 导出 / App lazy+Route / Sidebar 销售组+财务组 / searchIndex）+ manual 版本登记。
- **V2.74.6 整页缺失补齐 A 轮（波次RFID P2-07 / 重复制造 P2-08 / MES集成 P2-09）**（2026-09-02）——9 项整页缺失排定三轮实施计划（见 §七之二），统一落地深度=「前端页 + mock 持久化」（与 productionStore/warehouseStore 完全一致，CRUD 经 `backendStorage` 落 `app_state` Blob，不建 D1 表、不改后端 Functions），本版交付 A 轮三项：①**波次RFID**（`types/waveRfid.ts` + `mocks/data/waveRfid.ts` + `stores/waveRfidStore.ts` + `pages/Warehouse/WaveRfidList.tsx`，路由 `/warehouse/wave-rfid`）：波次（草稿/已下达/拣货中/已完成/关闭，策略=按区域/按订单/按承运商）+ 波次行明细内嵌编辑 + 「下达并拣货」推进状态；RFID 事件（收货/上架/拣货/移位/盘点，含失败事件）+ 模拟 RFID 扫描登记。②**重复制造**（`types/repetitiveMfg.ts` + mocks + `stores/repetitiveMfgStore.ts` + `pages/Production/RepetitiveMfgList.tsx`，路由 `/production/repetitive`）：生产线（运行/空闲/保养）+ 生产周期；核心 `reportProduction(periodId, goodQty, scrapQty)` 按「合格数 × 单件标准耗用」累加倒冲消耗（3 位小数），已关闭周期拒绝报工；倒冲明细对比标准耗用 vs 累计消耗。③**MES集成**（`types/mes.ts` + mocks + `stores/mesStore.ts` + `pages/Production/MesIntegrationList.tsx`，路由 `/production/mes`）：连接配置（已连接/异常 + 手动同步）、设备状态（运行/停机/保养）、在制品 WIP 跟踪、工序报工四 Tab。④ 四处注册齐备（App lazy+Route / Sidebar 仓储组+生产组 / searchIndex / stores/index.ts 导出）+ manual 版本登记。tsc 0 错（修 4 类问题：mock 重复属性、`DocType` 不含 WAVE/LINE/RP 改本地 `seqNo` 生成编号、DataTable `batchActions.color` 不支持 'info'）；vite build 通过，三页面分块均已产出。
- **V2.75.0 启动根治双通道（W0 基建 + S&OP 参考实现）**（2026-09-02）——通用会话鉴权实体后端（functions/api/entities/[resource] 列表/创建 + [resource]/[id] 单条 CRUD，复用 getUserFromRequest+rlsFragment+audit_logs，资源注册表 ENTITY_RESOURCES 集中登记）+ 前端工厂（src/services/entityRepo.ts + src/stores/createEntityStore.ts：load/add/update/remove 乐观更新+失败回滚+离线 Mock 兜底+首次空库回填）；**S&OP(P2-10) 作首个参考实现迁 D1**（迁移 0018_sop.sql 建 sop_plans 表 + sopStore 改用工厂移除 Blob persist + 页面接 load()），验证全链路（tsc 0 错 / build / e2e v89+flow 8 passed / 远程 D1 应用 0018 + 部署生产）。下一步 W1 接已建后端 12 域、W2 软域新建表批量铺开，每域只配 resource+seed 即可接管（详见 docs/d1-migration-plan.md）。
- **V2.76.0 P2-04 详细工序排程「锁单/锚定」真实生效（补壳）**（2026-09-03）——前序 P2 盘点仅剩 2 壳+1 桩（DetailedScheduling(P2-04 部分)/MobileTab(P2-20)/tax-gateway 数电票核验桩），选 DetailedScheduling 锁/锚「壳」作首项（纯前端、零外部依赖、可测真功能）。**根因**：`DetailedScheduling.tsx` 写 `productionSchedulingStore.locks[`${wo.id}:${op.id}`]`（工序级，含 `locked`+`anchorDate`），但 `GanttSchedule.tsx` 原只读取工单级 `locks[wo.id]?.locked`、且重排函数从不消费 `anchorDate` → 详细页锁/锚对真实排产完全无效。**修复（只改读端聚合，不动写端）**：`GanttSchedule.tsx` 新增 `woLockState` memo 将工序级锁聚合成工单级 `{locked, anchorDate}`（key 取 `l.key.split(':')[0]`），5 处锁读取改读 `woLockState`；负荷联动重排 + 自动重排正排钉 `plannedStartDate=anchorDate`、倒排钉 `plannedEndDate=anchorDate`，锁定工单保持原位不重排。新增 `e2e/v76-detailed-scheduling.spec.ts`：C1 锚定钉住 wo-001 计划开始日==D（setAnchor 经 `window.__ssaStores` 同详细页代码路径）/ C2 锁单防移动（toggleLock 后重排 plannedStartDate 不变），**2/2 全绿**。tsc 0 错；vite build 通过；部署生产。已知 DEV 环境污染（非本功能回归）：V2.70.0 B2 三岛迁真实 D1 后端后 `src/mocks/handlers.ts` 缺 8 个端点 handler（serial-numbers/subcontracts/sales-orders/work-orders/vouchers/stock-transfers/inventory-adjustments/quality-holds），本地 dev `GET /api/*` 返回 500（属「在线同步」调用、失败回退 Blob、UI 零回归），仅污染本地 dev E2E 错误守卫，**不影响生产 `test:prod-e2e` 门禁**（真实后端服务）；v76 错误守卫已按「资源 500 = 在线同步失败（DEV 环境噪声）」排除，补 MSW handler 列为待办。⑤ **生产 E2E 门禁（§八，部署后必修）首跑捕获并修复一生产级遗漏迁移**：首跑 4 FAIL 全为 `POST /api/serial-numbers` 500——根因 W1-B1 修过的迁移 0019（serial_movements 补 created_at/created_by）从未 apply 到远程生产 D1（wrangler pages deploy 不跑迁移），远程表缺这两列而 insertSerialMovement 写之 → 序列号创建在生产全断；经 `d1 execute --remote --command` 内联补两列 + 补登 schema_migrations(0019_serial_movements_audit)，代码无需重部署即生效（已部署 8f93b359 本就含正确 insertSerialMovement）。重跑 prod-e2e：PASS 239 / FAIL 0 / WARN 2 / INFO 6 全绿收口。**运维教训**：`wrangler pages deploy` 不会自动跑 D1 迁移，每次含迁移的版本升版须显式 `wrangler d1 migrations apply --remote`（或内联 d1 execute）以保证生产表结构与代码一致；建议将「apply --remote」纳入部署 SOP。
- **V2.76.1 消除本地 dev E2E 全局 500 噪声（DEV mock 层补壳）**（2026-09-04）——强哥「continue」后自主推进 V2.76.0 结项汇报首要待办（补 MSW handler 消本地 dev E2E 500）。**根因**：V2.70.0 B2 三岛迁真实 D1 后 `src/mocks/handlers.ts` 缺 8 个 GET handler（serial-numbers/subcontracts/sales-orders/work-orders/vouchers/stock-transfers/inventory-adjustments/quality-holds），DEV 下 `GET /api/*` 落 vite dev server（MSW `onUnhandledRequest:'bypass'`）返 500，污染本地 dev E2E 控制台错误守卫。**修复（纯 DEV mock、不影响生产）**：handlers.ts 补这 8 端点 GET handler——work-orders/sales-orders 返回与真实 D1 同构种子（productionStore/salesStore 初始化即来自同数组，等效原「500→回退 mock」、无回归，v76 依赖 wo-001 须存在）；其余 6 域返空列表 `{data,pagination}`（stock-transfers/inventory-adjustments/quality-holds 按 warehouseAdv 期望的 `{data,total,page,pageSize}`）；tsc 0 错。**v76 错误守卫回归真实断言**：移除「资源 500 = 在线同步失败（DEV 噪声）」排除项，使「任何真实 500 即失败」真实语义恢复（杜绝后续真回归被噪声掩盖）；两用例补 SPA 路由+Tab 激活异步渲染稳定等待（消 warm server 下 load 早于 React 提交竞态）。**验证**：v76 E2E 2/2 全绿、无真实 console 错误；dist 构建并部署生产。**测试环境坑（非代码缺陷，写入备查）**：`vite.config.ts` 对 `/api` 配 `proxy:'http://localhost:8788'`（指向 wrangler pages dev），若本机 wrangler 占 8788 代理返 `{"error":"未登录"}` 触发鉴权重定向、销毁 JS 上下文致 E2E 报「context destroyed」误判回归；本地跑 E2E 前须确保 8788 无 wrangler 占用（代理后端不可达→500、stores 正常回退 mock）。
- **V2.76.1 后续 · 部署 SOP 固化 + 生产 d1_migrations 元数据对齐（运维收口，未 bump 应用版本）**——强哥「continue」后自主推进 V2.76.0 运维教训（"apply --remote 纳入部署 SOP"）。**根因**：`wrangler d1 migrations apply` 读的是内部表 **`d1_migrations`**（`name` 列存带 `.sql` 后缀的迁移文件名），**不是** `schema_migrations`；V2.75.x/V2.76.0 的迁移 0019–0025 均用 `d1 execute --remote` 内联建表/补列、从没走 `wrangler apply`，故 `d1_migrations` 只登记到 0018，而 `schema_migrations` 虽全（手动 INSERT），wrangler 不读它 → 裸 `apply` 误判 0019 未应用、重跑 `ALTER TABLE serial_movements ADD COLUMN created_at` 报 `duplicate column name: created_at` 直接失败。**修复（低风险，纯元数据 + DevOps 工具，无应用运行时变更）**：① 生产 `d1_migrations` 补登 0019–0025 七行（`changes:7`），与已落地表结构对齐；② 新增 `scripts/deploy.mjs`——注入 `.env.local` 凭据 → `d1 migrations apply --remote`（幂等，已应用跳过）→ `pages deploy dist`，把"先 apply 迁移再 deploy"变强制步骤；③ `package.json` 加 `"deploy": "node scripts/deploy.mjs"`；④ `DEPLOY.md` 补「方式 C：一键部署脚本（含 D1 迁移）」。**验证**：`npm run deploy` 端到端跑通——`d1 migrations apply --remote` 返回 `No migrations to apply!`、幂等跳过，`pages deploy` 成功（`26800d04.ssa-erp.pages.dev`，251 文件已上传 0 新），生产代码仍为 V2.76.1。**结论**：自此含迁移升版一律 `npm run deploy`，杜绝 V2.76.0 那种生产漏迁移事故；强哥机器若 wrangler 不在项目本地 `node_modules`，脚本自动回退隔离 workspace 路径或读 `WRANGLER_BIN` 环境变量。
- **V2.77.0 部署 SOP 固化正式升版 + 重新部署生产**（2026-09-04）——强哥拍板「先 A 补版本号重部署」：上述 V2.76.1 后续的运维收口原按「无应用运行时变更」未 bump 版本，但交付侧要求线上版本标识与实际交付一致、可追溯，故正式升 V2.77.0 并四处同步（`src/version.ts` = `package.json` = `MEMORY.md` 沿革 = `manual.tsx` v2770 = 本条）。**结论/约定**：自此**含迁移的升版一律 `npm run deploy`**（脚本强制先 `d1 migrations apply --remote` 再 `pages deploy`），不再裸跑 `wrangler pages deploy`；仅纯文档/测试改动（无 dist 重建）时可不升版，但凡重建 dist 并部署生产即须升版同步，杜绝线上版本标识漂移。验证：tsc 0 错 → dist 重建 → `npm run deploy` 成功 → 生产 E2E 门禁复核。

- **V2.78.0 → V2.96.2 系列摘要**（2026-09-04 ~ 09-11，逐版明细见 `MEMORY.md` 版本沿革与根目录 `SSA ERP V2.xx.0 版本更新记录.html`）——PWA 移动门户深化（V2.78.0 起，`/m` 真扫码 + 出库/盘点/质检过账写回 D1）；双通道根治收尾（V2.79–V2.82，`inventoryAlerts` / `finishedGoodsInbounds` 迁 D1，业务实体去 Blob）；发票 OCR 大模型结构化抽取（V2.80）；C6 大模型 AI 助手接通（V2.83，Agnes 2.5 Flash）；C9 物料替代料组 + 优先级推荐（V2.84/V2.85）；字段级权限引擎全覆盖（V2.86.0，`SecureField`）；自定义审批流程（V2.87.0）；列表交互统一（V2.90.0）；审计 D1 真实落库（V2.93.0）；注册审批制 + `super_admin`/`user` 角色（V2.95.0）；云端 SMTP 邮件 + 超管双邮箱验证 + 新公司注册审批（V2.96.0）；安全邮箱延时投递通道（V2.96.1）；修复迁移「从零重建」失败（V2.96.2，`audit_logs` 从未在任何迁移中建表）。
- **V2.97.0 运行期安全审计整改 15 项 + 迁移 0043 补齐生产缺失索引**（2026-09-11）——① 安全审计报告产出（15 项：P0×1 / P1×4 / P2×9 / 信息×1）；② 迁移 0043 为生产补 8 个索引（`idx_purchase_orders_vendor/status/order_date`、`idx_sales_orders_customer/status/order_date`、`idx_soi_order`、`idx_inv_unique`）；③ **A1 账号状态每请求校验**（P0，停用账号即时失效，原先仅登录瞬间校验）；④ A2 供应商会话隔离；⑤ A3–A6 禁止自我审批/改权限、供应商登录只放行 `approved`、注册口令强度、验证码**原子批量核销**（堵并发重放）；⑥ B1/B6 单条资源补 `assertRlsOwnership`（原先换编号即可读他人单据）；⑦ B2 脱敏角色归一（`super_admin`→`admin` 后再查矩阵）；⑧ B3 仓库域部门隔离（含 COUNT 同步过滤，防计数侧泄露）；⑨ B4 开放网关敏感字段 `stripHidden()` 收敛（订单金额刻意不收敛）；⑩ B5/C2/D1 备份/迁移/邮件配置限权，不再回显口令片段；⑪ C1 组织级特权配置键（users / data-permission / approval-flows / report-perm / audit）写删收口管理员，**读刻意不限**（前端字段遮蔽与审批流路由依赖）。验收：全新库 44 条迁移全 ✅、tsc 0 错、9 文件 esbuild 0 错、生产门禁 **PASS 314 / FAIL 0**。
- **V2.98.0 评测整改第一批（6 项快赢）**（2026-09-14）——① 新增 `functions/_shared/errors.ts` 统一错误分类（数据库约束类 → 400 + 中文提示，其余 → 500 + 错误编号，原始报错只进服务端日志）；② `entities/[resource].ts` 统计 COUNT 与列表 SELECT 共用同一套过滤条件（原先分页总数与列表口径不一致）；③ 验证码尝试次数改库内自增（原先读-改-写丢计数）；④ 审计日志读取按角色收敛（管理员全组织 / 其余仅本人）；⑤ 脱敏统一走 `vendor_master` + `rlsFragment`；⑥ 新增 `POST /api/auth/logout-all` + 登录时清扫过期会话。
- **V2.99.0 评测整改第二批（2 项系统化）**（2026-09-14）——① **写接口统一入参校验**：由数据库真实结构生成 `functions/_shared/fieldSchema.ts`（`scripts/_emit_schema.mjs` 产出）+ `functions/_shared/validate.ts`，拒绝「数字传成文本、非法日期（回环比对）、超长文本（>2 万字符）」，接入 39 处写接口，返回 400 + `INVALID_FIELD` + 字段与当前值，服务端自管列跳过；② **登录失败限流**：迁移 0044 建 `login_attempts` + `functions/_shared/loginGuard.ts`，维度 = 用户名 + 来源地址，15 分钟窗口，阶梯锁定 10 次→5 分钟 / 20 次→30 分钟 / 50 次→24 小时。门禁 PASS 319。
- **V3.0.0 评测整改第三批（3 项 + 修 1 遗留缺陷）**（2026-09-14）——① **备份恢复体系重建**（可靠性最大短板：旧备份只导出 `app_state`、业务表零行且无恢复通道）：新增 `functions/_shared/backupSchema.ts`（主/明细表父子映射 + **运行时** `PRAGMA table_info` 判断含 `org_id` 才导出）+ 重写 `system/backup.ts`（真实 52 张业务表导出）+ 新增 `system/restore.ts`（预演 / 覆盖 / 清空，强制 `org_id` 隔离）+ 设置页数据管理 UI；② **关键单据乐观锁**：迁移 0045 补 version 列，`functions/_shared/optimisticLock.ts` 把版本条件写进 UPDATE 语句本身（非「先查后写」），并剔除客户端传来的 version 字段；③ 门禁新增 `suites/13-hardening.mjs`（反向越权 / 并发 / 数据边界 / 备份有效性四类）；④ 修复采购 / 销售 / 入库 / 出库 **6 处明细行 INSERT 缺字段即 500** 的缺陷（统一空值兜底）。
- **V3.1.0 评测遗留最后两项架构级问题收口**（2026-09-14）——① **前端持久化可感知失败 + 多端冲突检测 + 会话失效真正生效**（H-02 / H-03 / M-13）：迁移 0046 给 `app_state` 加 `version`/`updated_by`，`state/[key].ts` GET 回传版本、PUT 支持 `baseVersion`，不一致返回 **409 + `VERSION_CONFLICT` + 云端最新值**（不传则保持旧覆盖行为，老客户端兼容）；前端重写 `src/stores/persistStorage.ts`（写失败入重试队列，5/15/30/60 秒退避、上限 4 次；403 权限类只提示不自动重试）+ 新增 `syncStatusStore` 与右下角常驻提示 `SyncStatusBanner`（含「立即重试」）；409 以云端为准写回本地并提示刷新；**401 派发会话失效事件 → 清 token + 清本机全部业务缓存（含 `auth-storage`）+ 跳登录页**，堵住「账号被停用后靠本地缓存继续看全量业务数据」的影子数据问题（网络异常仍保留离线可用）。② **后台任务可靠调度**（H-04）：迁移 0046 建 `job_ticks`（每次推进一行留痕）+ `job_runs`（每次真实投递一行）+ 配置 `jobs.tick_token`（自动生成）/`interval_min`/`enabled`；新增 `functions/_shared/jobs.ts`（`runJobTick` 统一入口 + 留痕 + 概览 + 重放 + 令牌恒定时间比对）与 `functions/api/system/jobs.ts`（GET 概览 / POST run|replay|rotate-token）；**调度令牌仅允许 run**（replay 与读令牌一律 403）；中间件与安全邮箱的懒触发改走统一入口、降级为兜底；安全中心新增「后台任务调度」卡片（队列状态 / 立即推进 / 重放失败 / 轮换令牌 / 最近执行留痕）；提供外部调度脚本 `scripts/job-tick.ps1`（UTF-8 BOM）+ `scripts/register-job-tick-task.bat`（GBK 编码，双击注册 Windows 计划任务，令牌落 `job-tick.conf`）。③ 门禁新增 `suites/14-sync-jobs.mjs`（21 条断言，345→366），**刻意不触发真实投递**以免门禁运行期间外发邮件。验收：全新库 47 条迁移全 ✅、tsc 0 错、后端 87 文件 esbuild 0 错、本地真实 HTTP 实测 **PASS 30 / FAIL 0**、迁移 0046 远程 ✅、部署 `1636d968`、**生产门禁 PASS 366 / FAIL 0 全绿**。
- **V3.2.0 独立评测遗留再收口 3 项（凭据生命周期 2 项 + 组织准入 1 项）**（2026-09-14）——① **接口密钥有效期（M-12 前半）**：迁移 0047 给 `api_keys` 加 `expires_at` / `rotated_at`；创建支持 30/90（默认）/180/365 天或永久；网关鉴权新增有效期校验（空值 = 永久，兼容迁移前签发的历史密钥）。② **密钥不再允许经网址参数传递（M-12 后半）**：`_shared/apiKey.ts` 重写为 `resolveApiKey()`，返回**可区分的失败原因**（`missing` / `malformed` / `query_param` / `invalid` / `revoked` / `expired`），发现 `?api_key=` 一律 401 + `code=query_param`；采用**显式拒绝而非静默忽略**（静默忽略会让调用方以为改好了、实则另一处凭据在生效，问题被掩盖）。③ **密钥轮换（L-02）**：`POST /api/open/keys/:id` 原地替换密钥哈希（编号/标签/权限/限流/审计归属不变，调用方只需替换配置里的字符串），旧密钥同一时刻失效；已吊销的密钥不允许轮换复活（409 + `REVOKED`）；顺带把 `res.changes` 修为 `res.meta?.changes`（此前吊销/轮换不存在的密钥会误报 200）。④ **组织准入闸门（L-03）**：登录（`auth/login.ts`）与会话（`_shared/auth.ts`，改为 `users LEFT JOIN orgs` 一次查出、避免每请求多一次往返）**双层**校验 `orgs.status`——公司不存在（`ORG_MISSING`）/ 待审批（`ORG_PENDING`）/ 已停用（`ORG_SUSPENDED`）一律拒绝签发会话，既有会话于下次请求立即失效；**`super_admin` 豁免**（防「唯一超管所在公司异常 → 无人能进系统修复」的自锁）；老库（无 `orgs.status` 列）走 try/catch 降级跳过、不阻断鉴权。⑤ 前端「API Key 管理」新增有效期选择、有效期状态列（有效 / N 天后到期 / 已过期 / 永久）与一键轮换按钮。⑥ 门禁新增 `suites/15-key-lifecycle.mjs`（覆盖有效期契约 / 网址参数拒绝 / 轮换失效 / 吊销终态 / 组织准入五类）。验收：全新库 **48 条迁移全 ✅**；tsc 0 错；后端 87 文件 esbuild 0 错；本地真实 HTTP 实测 **PASS 31 / FAIL 0**（含造数验证「密钥过期」「组织停用 / 待审批 / 不存在」这两类生产门禁无法构造的路径）；迁移 0047 远程 ✅；部署 `7297bfd8`；生产门禁 **PASS 403 / FAIL 0**（新增 37 条断言，366→403）。

- **V3.3.0 评测最后两项低危收口（L-04 行级策略显式全量登记 + L-05 审计降级通道）——报告 23 项发现全部关闭**（2026-09-14）——① **行级策略由「默认共享」改为「默认拒绝 + 全量显式登记 + 双向机器核对」**（L-04）：`functions/_shared/rls.ts` 重写为三层——`RLS_SCOPE` 覆盖全部 **48 张业务表**（全公司 36 / 仅本人 7 / 仅部门 5，逐张注明用途）、`RLS_EXEMPT` **18 张平台/基础设施表**逐条写明「为什么不走业务可见性」、未登记表一律 `1=0`（拒绝全部行）并打 `[RLS_UNREGISTERED_TABLE]` 结构化告警；`assertRlsOwnership` 同口径默认拒绝。**为什么默认拒绝用 `1=0` 而不是收窄成 `own`**：未登记表的列结构未知，若它没有 `owner_id` 列，`owner_id = ?` 会直接把 SQL 打挂（no such column → 500）；`1=0` 不依赖任何列，是唯一「既安全、又能给出可读结果（空列表）」的兜底。**返回契约修正**：`rlsCondition` 由 `{clause, param?}` 改为 `{clause, params: any[]}`——默认拒绝分支零参数，旧契约会让调用方 `params.push(rls.param!)` 多推一个 `undefined`，造成「占位符数 ≠ 绑定参数数」的**运行期 500**；改为数组 + 展开传参后，两种情况天然正确。② **审计写入失败由「静默丢弃」改为「三层降级通道」**（L-05）：新增 `functions/_shared/auditLog.ts` 统一入口，`writeAudit()` 失败时转 `recordAuditDegraded()`，**从不抛异常**；三层为「结构化日志标记 `[AUDIT_DEGRADED]`（零依赖、必达）→ 迁移 0048 建**独立** `audit_degraded` 表落库（与审计主表分离，主表故障时仍有线索）→ 绝不阻断业务」。**为什么降级表不能复用 `audit_logs`**：一次 INSERT 失败通常意味着该表或该批次本身有问题，再往同一张表写第二条大概率同样失败。**返回值契约**：`writeAudit` 由裸 `boolean` 改为 `{ ok, id, degraded }`——`/api/audit/logs` 的既有调用方依赖 `id`（门禁 `09-audit-match` 断言），只回 boolean 会打断对外契约。③ **管理端可观测**：新增 `GET /api/system/audit-health`（限 `admin` / `super_admin`）回传审计总量 / 近 24 小时 / 降级记录 + 行级策略登记报告（登记数 / 豁免数 / 三类作用域分布 / **漏登记清单** / 平台内部表 / **僵尸登记清单**）；安全中心新增「审计与行级策略健康度」卡片。④ **机器核对闭环（双向）**：`findUnclassifiedTables()` 查漏登记 + `findStaleRegistryEntries()` 查僵尸登记（V3.3.0 新增），均以 `sqlite_master` **真实表清单**为基准——再次验证「靠人记得住」不成立。⑤ **门禁新增 `suites/16-rls-audit.mjs`**（403 → **433**，门禁套件 17 个）。⑥ **顺带修复数电票相关接口两处真实缺陷**：配置保存接口与批量核验接口原先都直插 `audit_logs` 中并不存在的 `operator` / `details` / `ip_address` 三列——配置保存接口**没有兜底**，于是「KV 已写入成功、接口却返回 500」（状态与反馈不一致）；批量核验接口**有兜底**，于是失败被静默吞掉、**发票核验审计从未落过库**（最需要留证的合规动作）。两处现统一走 `writeAudit`；并补 `KV_UNBOUND` 503 可读提示（`wrangler.toml` 至今未声明 `TAX_GATEWAY` 绑定，此前必然 TypeError → 原始 500）。⑦ 验收：全新库 **48 条迁移全 ✅**；`tsc` 0 错；后端 89 文件语法 + 打包 0 错；本地真实 HTTP 实测 **PASS 63 / FAIL 0**（含真造「审计写入失败」验证：降级表新增留痕、接口如实回报 `degraded=true`、管理端健康接口可见该记录）；迁移 0048 远程 ✅；部署 `c7b5f16d`；**生产门禁 PASS 433 / FAIL 0 全绿**。
- **工程踩坑沉淀（V2.98–V3.3.0，写入本计划防复发）**：① 同一文件**绝不能并行发多个编辑**（后写覆盖先写，工具仍报成功）——必须串行；② 批量按列名迭代时不得用静态表清单（`d1_migrations` 等平台自建表无 `org_id` 会直接报错），必须以**运行时表结构**判定；③ INSERT 语句的「列数 / 占位符数 / 字面量数 / 绑定参数数」四者必须对齐——多写或少写一个 `?` 类型检查与打包都看不见，**只有运行期会炸**；④ `npm run deploy` **只做迁移 + 上传，不构建**——发布顺序铁律为 `npm run build` → `npm run deploy`；⑤ 本仓库 `.gitattributes` 对 `src/stores|services`、`functions/_shared|api`、`migrations` 启用 `ssaenc` 透明加密，比对历史版本须先解密（见 MEMORY.md 命令）；⑥ 本机脚本含中文时，`.bat` 用 GBK、`.ps1` 用 UTF-8 BOM，否则命令行窗口中文乱码；⑦ **写「清单核对」类断言时，「清单从哪来」比「比对逻辑」更容易出错**——能取真实源（如 `sqlite_master`）就绝不取推导值。本版两次抓错均源于此：本地核对脚本只抓 `CREATE TABLE`（漏掉同一文件里的 `DROP` / `RENAME`，把「建完就改名消失」的临时表当成真实存在的表），以及核对口径漏了「非迁移脚本创建的表」（`d1_migrations` 由 wrangler 迁移工具创建、不在 `migrations/*.sql` 中）导致一次误报。

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
- 发票 OCR 模型对接：✅ **已完成（V2.80）**——`ocr/recognize.ts` 真实 Tesseract.js OCR + 大模型结构化抽取（发票类型/购销方/金额/税额/发票号字段），已落地页面 `Analytics/InvoiceOcr.tsx`。
- 异常预警规则引擎：✅ **已完成**——`functions/api/alerts` 库存/逾期/临期/信用/待审批 6 类真实计算。
- AI Agent 真实化：✅ **已完成**——`functions/api/ai/chat.ts` 真实 LLM 代理（KV 模型配置 + fetch `/chat/completions`），无模拟兜底。
- 数电票核验：🟢 **部分（V2.80 真实通道代码已就位）**——`tax-gateway/verify.ts` 已写 etoplive/航信/百望/票联云多服务商路由真实转发 + 发票结构化校验；默认走 `mockVerifyInvoice` 模拟兜底，**启用真实通道需配后端 KV `TAX_GATEWAY`（企业税号 + 服务商密钥）**；前端 `Analytics/InvoiceVerification.tsx` 已接真/模拟双通道。
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
- **双通道根治进展（V2.81 实际）**：W0–W1 通用实体后端（`/api/entities`）+ 9 整页模块（V2.80）+ 入库/出库/盘点（`checkTasks`，V2.81）已迁真实 D1；截至 V2.81，仅 `inventoryAlerts` / `finishedGoodsInbounds` 两块仍走 Blob（仓库域双通道最后残留）。**V2.82 计划将这两块迁 D1（迁移 0036/0037 + 实体注册 + 启动期 load + 乐观更新 fire-and-forget 写回），彻底根治双通道**（详见 §十一.5）。

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
| 移动端 P2-20 | 部分 | ✅ 已真落地（V2.78） | `/m` PWA 门户（manifest + SW + 真图标）+ `MobileInbound/Home/PortalLayout` 真实路由 + 真扫码 `BarcodeScanner` + 出库/盘点/质检移动过账写回 D1；`MobileTab` 仅设置入口说明（旧伪二维码壳已废弃） |
| 三方销售 P2-12 | 部分 | 🟡 无专项实体 | 销售含 SO/Quotation/Contract，三方/代销无独立实体 |
| AI Agent（P2-01） | 模拟对话 | ✅ 真实代理 | `functions/api/ai/chat.ts` 读 KV 模型配置 + `fetch` LLM `/chat/completions`（无写死）；前端 `AIAssistant.tsx` 真实 fetch，无模拟兜底 |
| ChatBI（P2-02） | 模拟 | ✅ 真实（规则型） | `functions/api/chatbi` 关键词→类型映射 + 真实 D1 SQL 执行（非 LLM-to-SQL） |
| 发票 OCR | 正则 parseInvoice | ✅ 已模型化（V2.80） | `ocr/recognize.ts` 真实 Tesseract.js OCR + 大模型结构化抽取；`Analytics/InvoiceOcr.tsx` 落地 |
| 数电票核验 | 真实转发 | 🟢 部分（V2.80） | `tax-gateway/verify.ts` 已写多服务商路由真实转发 + 结构化校验，默认模拟兜底；待 KV `TAX_GATEWAY` 密钥启用真实通道 |
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

---

## 十一、深度功能对标计划（V2.81 基线，对照 SAP S/4HANA 2026 / 金蝶云·星空 V9.1 / 用友 BIP·U9 cloud）

> 来源：`SSA ERP 深度对标分析报告.html`（V2.81 基线，2026-09-07 生成，已归档 ima「强哥的知识库 → erp开发项目」REPLACE 覆盖）。
> 方法：12 业务域 × 7 维度（功能完备度 / 深度 / 合规 / 智能 / 移动 / 集成 / 可扩展）评分；横向根因 G1–G8；分级路线图 P0/P1/P2。
> 三家 2026 最新能力对标点：**SAP S/4HANA**（Joule 生成式 AI 助手 + 原生 Fiori 移动）、**金蝶云·星空 V9.1**（金钥 财报 AI + 数电票直连）、**用友 BIP / YonSuite / U9 cloud**（YonGPT 企业大模型 + 原生移动 App）——均把「大模型级智能助手 + 数电票直连 + 原生移动 App」作为新战场。

### 11.1 总体跃迁（V2.64 → V2.81）
| 指标 | V2.64 | V2.81 |
|------|-------|-------|
| 12 域综合评分均值 | 3.9 | 4.4 |
| 三家标杆功能覆盖 | 82–85% | 92–95% |
| 与三家平均差距 | ~0.8 | ~0.4–0.5 |
| 云端 D1 实体资源（functions/_shared/entities.ts） | 10 | 19 |
| 数据库迁移总数（migrations/） | 29 | 35（V2.82 本次 +2 → 37） |

### 11.2 路线图完成状态
- **P0 六项地基（A1–A6）**：✅ 全部完成（凭证/税价/信用/成本/红冲/期间；构建门禁 tsc 0 错；PBKDF2；D1 备份；白屏兜底；RLS 下沉 D1）。
- **P1 业务闭环（B1–B11）**：✅ 11/11 全闭环（含 B2 三岛 D1 专属后端 + 序列号 FIFO 核销 + 委外 + 工单领料；B6 黑名单/价目表回写；B7 审批引擎统一；B8 MRP；B9 AQL；B10 PO 变更单；B11 多笔付款计划）。
- **P2 合规与智能化（C1–C10）**：✅ 10/10 落地（C6 大模型助手 V2.83 接通 Agnes 2.5 Flash、C9 物料替代料组 V2.84 闭合）。
  - 已落地：C1 批次追溯穿透、C3 统一编号规则中心、C4 字段权限（readonly/required/mask）、C5 销售价目表/折扣/促销、C7 工作流引擎统一、C8 AQL（GB/T 2828.1 自动算 Ac/Re）、C10 生产版本组合；9 整页模块迁 D1（资金/三方销售/重复制造/COPA/MES/波次RFID/BI/ESG/S&OP）+ 发票 OCR 大模型抽取 + AI 真实代理（LLM-to-SQL 规则型 ChatBI）+ 异常预警 6 类规则引擎。

### 11.3 横向根因 G1–G8 现状（V2.64 八条 → V2.81 校准）
| 根因 | V2.64 判定 | V2.81 现状 |
|------|-----------|-----------|
| G1 成本核算深度 | 弱（无移动均价/COGS/暂估） | ✅ 闭合：移动均价滚动（`utils/cost.ts`）+ 出库 COGS 凭证（借 1405/1406 贷 6001）+ GR/IR 暂估（借 1403 贷 2201）+ 发票校验冲销 |
| G2 信用管控 | 部分 | ✅ 闭合：信用额度占用（`customerStore`）+ 逾期冻结 |
| G3 价格体系 | 部分 | ✅ 闭合：销售价目表/折扣/促销（`C5`）+ 条件技术引擎叠加含税价 |
| G4 单据孤岛 | 严重 | ✅ 闭合：入库/出库/盘点/成品入库全迁 D1 + 三单匹配服务端闭环 |
| G5 服务端化 | 弱（多 Blob） | ✅ 闭合：21 实体资源迁真实 D1（含 inventoryAlerts/0036、finishedGoodsInbounds/0037、materialSubstitutes/0038） |
| G6 计划层 | 弱 | ✅ 闭合：MRP/BOM/甘特拖拽排产/有限产能 APS/CRP |
| G7 可定制性 | 弱 | ✅ 闭合：字段权限 + 工作流引擎 + 审批流配置 + OA 流程定制 |
| G8 移动化 | 壳 | ✅ 闭合：PWA 门户（`/m` 真扫码 + 出库/盘点/质检过账写回 D1） |

### 11.4 剩余净缺口（按用户价值排序）
1. ✅ **C6 大模型级 AI 助手**（V2.83 已接通）：默认模型 Agnes 2.5 Flash（国产 OpenAI 兼容），设置页可选；红线——对话勿粘商业机密。
2. ✅ **C9 物料替代料组 + 优先级**（V2.84 已闭合，V2.85 深化已落地）：material_substitutes 表 + 通用实体路由 + 物料详情替代料组 UI + BOM 可替代提示；V2.85 新增「库存不足按优先级推荐可用替代料」——工单缺料预警与替代料建议、MRP 净需求替代料建议列、移动出库可替代提示（均只读、零新增后端）；MRP 运算期自动替代展开（净需求直接改用替代料）列为后续可选深化项。
3. 🔶 **数电票真实核验**：V2.80 代码已就位（`tax-gateway/verify.ts` etoplive/航信/百望/票联云多服务商路由 + 结构化校验），默认模拟兜底——需您提供**企业税号 + 服务商密钥**（配后端 KV `TAX_GATEWAY`）才启用真实通道。
4. 🔶 **精修项**：**字段权限覆盖全部模块 ✅（V2.86.0 已闭合）**、**自定义审批流程 ✅（V2.87.0 已闭合：新建+发布审批+组织隔离可见）**、Webhook 鉴权重试、物料表单拆多视图、凭证专业录入界面、应收账龄/汇兑损益。

### 11.5 下一步路线（建议）
- **短期（已排 V2.82）**：迁 `inventoryAlerts` / `finishedGoodsInbounds` 到 D1（根治双通道最后两块，迁移 0036/0037 + 实体注册 + 启动期 load + 乐观更新写回）。
- **中期**：字段权限全覆盖 → Webhook 鉴权重试 → 物料表单拆多视图（C9 替代料已于 V2.84 闭合）。
- **差异化（需密钥）**：C6 大模型助手接通 → 数电票真实核验启用。
- **持续**：生产态常驻 E2E（prod-e2e）门禁全绿值守；全量前端 E2E 296 用例逐文件根除历史 flake。
- **落地情况（V3.1.0 复核）**：上述「短期（V2.82）/ 中期 / 差异化」条目均已落地——V2.82 迁 `inventoryAlerts`/`finishedGoodsInbounds` 到 D1、V2.86.0 字段权限全覆盖、V2.87.0 自定义审批流程、V2.83 大模型助手（Agnes 2.5 Flash）；仅「数电票真实核验」仍待外部密钥（企业税号 + 服务商密钥 → 后端 KV `TAX_GATEWAY`）。逐版明细见 §八摘要。

---

## 十二、独立安全评测与整改（V2.97.0 基线 → V3.3.0 全部收口）

> 来源：`SSA ERP 稳定性·可靠性·安全性深度评测报告.html`（第三方独立审计视角，2026-09-11，被测版本 V2.97.0；评测期间**未修改任何业务代码**，夹具仅建于与生产完全隔离的本地一次性测试库）。
> 方法：以生产端到端门禁为基线（V2.97.0 实测 314 通过），另建本地真实运行时（`wrangler pages dev` + 全新本地 D1 + 47 条迁移从零重建）跑三轮独立断言（54 条），并对源码逐条复核；所有发现标注可信度（**实测** / **推演**），未验证项明确说明卡点。
> 核心结论：**V2.97.0 的 15 项运行期安全整改经实测确认为真实、有效、无「纸面修复」、无明显功能回退**；「把状态校验与身份类别校验收敛到统一入口」的思路正确——它解决了「鉴权只做在入口、而权限需在每次请求持续生效」这一类根因。但门禁「全绿」同时掩盖了 **23 项新发现（高 5 / 中 13 / 低 5）+ 1 项元发现**，集中在「负向越权 / 并发竞态 / 数据边界 / 备份有效性 / 可观测性」五类。

### 12.1 发现与整改对照总表（23 项 + 1 项元发现；至 V3.3.0 已**全部收口**，无剩余项）

| 编号 | 严重度 | 发现 | 可信度 | 维度 | 整改落点 | 状态 |
|------|--------|------|--------|------|----------|------|
| H-01 | 高 | 备份导出不含业务表数据，无恢复通道与演练 | 实测 | 可靠性 | V3.0.0：`backupSchema.ts` + 重写 `system/backup.ts`（52 张力表）+ 新增 `system/restore.ts`（预演/覆盖/清空） | ✅ |
| H-02 | 高 | 云端写入失败静默吞掉，用户改动看似成功实则丢失 | 实测 | 可靠性 | V3.1.0：`persistStorage.ts` 重试队列 + `SyncStatusBanner` 常驻提示 + 「立即重试」 | ✅ |
| H-03 | 高 | 账号停用后本地缓存仍呈现全量业务数据 | 推演 | 安全性 | V3.1.0：401 → 清 token + 清本机全部业务缓存 + 跳登录（不再回退本地渲染） | ✅ |
| H-04 | 高 | 后台延时任务依赖有人访问，投递时间不可控 | 推演 | 可靠性 | V3.1.0：`job_ticks`/`job_runs` 留痕 + `/api/system/jobs` 推进接口 + 外部定时源脚本 | ✅ |
| H-05 | 高 | 登录无失败限流与锁定 | 推演 | 安全性 | V2.99.0：迁移 0044 + `loginGuard.ts`（用户名+来源地址，阶梯锁定 10/20/50 次） | ✅ |
| M-01 | 中 | 通用实体分页总数不随关键字收敛 | 实测 | 稳定性 | V2.98.0：COUNT 与 SELECT 共用同一套过滤条件 | ✅ |
| M-02 | 中 | 约束冲突返回 500 并回显数据库内部结构 | 实测 | 稳定性 | V2.98.0：`errors.ts` 约束类 → 400 + 中文提示，其余 → 500 + 错误编号（原文只进日志） | ✅ |
| M-03 | 中 | 数值字段传非数字文本照样入库 | 实测 | 稳定性 | V2.99.0：`validate.ts` 数值必须可转数字 | ✅ |
| M-04 | 中 | 非法日期入库，破坏统计口径 | 实测 | 稳定性 | V2.99.0：`validate.ts` 日期回环比对 | ✅ |
| M-05 | 中 | 超长字段无长度校验 | 实测 | 稳定性 | V2.99.0：`validate.ts` 文本上限 2 万字符 | ✅ |
| M-06 | 中 | 脱敏接口绕过归属过滤且查遗留表 | 推演 | 安全性 | V2.98.0：统一走 `vendor_master` + `rlsFragment` | ✅ |
| M-07 | 中 | 更新无乐观锁，并发覆盖丢失 | 实测 | 稳定性 | V3.0.0：迁移 0045 + `optimisticLock.ts`（版本条件写进 UPDATE 语句本身） | ✅ |
| M-08 | 中 | 验证码尝试计数并发丢失更新 | 推演 | 安全性 | V2.98.0：计数改库内自增 / 原子核销（V2.97.0 已起步，本版收口） | ✅ |
| M-09 | 中 | 会话无并发上限、登出只删当前、过期不清理 | 实测 | 安全性 | V2.98.0：`POST /api/auth/logout-all` + 登录时清扫过期会话 | ✅ |
| M-10 | 中 | 审计日志无角色分级，超量静默丢弃 | 实测 | 安全性 | V2.98.0：读取按角色收敛（管理员全组织 / 其余本人） | ✅ |
| M-11 | 中 | 供应商数据双源（遗留表与主数据表并存） | 推演 | 稳定性 | V2.98.0：与主数据接口同表同过滤（`vendor_master`） | ✅ |
| M-12 | 中 | 接口密钥无有效期、支持网址参数传递 | 推演 | 安全性 | V3.2.0：迁移 0047 加 `expires_at`；网关校验有效期；网址参数**显式拒绝**（401 + `query_param`） | ✅ |
| M-13 | 中 | 状态键值整块覆盖、无版本号、多端互相覆盖 | 推演 | 可靠性 | V3.1.0：迁移 0046 `app_state.version` + `baseVersion` 比对 → 409 `VERSION_CONFLICT` | ✅ |
| L-01 | 低 | 部分接口回显异常原文 | 推演 | 安全性 | V2.98.0：随 `errors.ts` 一并收敛 | ✅ |
| L-02 | 低 | 密钥无轮换机制 | 推演 | 安全性 | V3.2.0：`POST /api/open/keys/:id` 原地轮换，旧密钥即时失效；已吊销不可复活 | ✅ |
| L-03 | 低 | 孤儿组织账号仍可签发会话 | 实测 | 稳定性 | V3.2.0：登录 + 会话**双层**校验 `orgs.status`（不存在 / 待审批 / 停用一律拒绝），`super_admin` 豁免防自锁 | ✅ |
| L-04 | 低 | 52 个接口认证但未纳入行级策略表 | 推演 | 安全性 | V3.3.0：`_shared/rls.ts` 改为**默认拒绝 + 48 张业务表全量显式登记**（全公司 36 / 仅本人 7 / 仅部门 5）+ 18 张平台表免登记（逐张注明原因）+ 真实表清单**双向**机器比对（漏登记 `findUnclassifiedTables` + 僵尸登记 `findStaleRegistryEntries`） | ✅ |
| L-05 | 低 | 审计写入失败无降级记录 | 推演 | 可靠性 | V3.3.0：新增 `_shared/auditLog.ts` 三层降级（结构化日志标记 → 独立 `audit_degraded` 表 → **绝不阻断业务**）+ 迁移 0048 + 管理员健康度入口 `/api/system/audit-health` | ✅ |
| 元发现 | — | 门禁覆盖面不足（319 全绿但独立评测仍发现 3 项实测失败） | — | 门禁 | V3.0.0：新增 `suites/13-hardening.mjs`（反向越权 / 并发 / 数据边界 / 备份有效性四类） | ✅ |

### 12.2 三批整改的执行顺序与实际落地（报告 8.1 / 8.2 建议 → 版本）

- **第一批 · 低成本快赢 6 项（V2.98.0，当天完成）**——按报告建议顺序执行：③ 错误分类（M-02/L-01）→ ① 统计条件统一（M-01）→ ⑥ 验证码计数（M-08）→ ⑦ 审计读取限权（M-10）→ ⑧ 脱敏统一（M-06/M-11）→ ⑤ 会话清理（M-09）。
- **第二批 · 系统化 2 项（V2.99.0）**——② 写接口统一入参校验（M-03/M-04/M-05，由数据库真实结构生成字段清单，接入 39 处写接口；**不手工维护字段表**）+ ④ 登录失败限流（H-05）。
- **第三批 · 专项 3 项（V3.0.0）**——① 备份恢复体系重建（H-01）→ ④ 关键单据乐观锁（M-07）→ ⑤ 门禁补齐四类缺失断言（元发现）。同版修复 6 处「明细行 INSERT 缺字段即 500」缺陷（属评测过程新暴露的问题 1）。
- **收尾 · 剩余两项架构级（V3.1.0）**——② 前端持久化「可感知失败 + 可冲突检测 + 会话失效生效」（H-02/H-03/M-13）+ ③ 后台任务可靠调度（H-04）。
- **第四批 · 评测余项再收口 3 项（V3.2.0）**——① 密钥有效期（M-12 前半）+ 网址参数显式拒绝（M-12 后半）→ ② 密钥轮换（L-02）→ ③ 登录与会话双层组织准入闸门（L-03）。至此报告「改善建议清单」覆盖的 21 项全部落地。
- **第五批 · 最后两项低危收口（V3.3.0，**报告 23 项发现全部完成**）**——① 行级策略「默认拒绝 + 全量显式登记」（L-04）→ ② 审计写入失败三层降级通道（L-05）。两项各附带一项「防复发」机制：L-04 附**真实表清单机器比对**（漏登记自动可见告警，杜绝再次依赖人工核对）、L-05 附**独立降级表 + 管理员健康度入口**（失败可查、可告警，不再静默）。同版顺带修复数电票核验接口两处真实缺陷（写错审计字段名致记录丢失、外部通道未开通时先写审计再报 500）。

> **取舍记录（V3.1.0）**：401 才清理本地缓存（让「账号停用」真正生效），网络类故障仍保留离线可用——即「离线可用」这一现有特性只在网络不通时成立。此项已确认接受。

### 12.3 门禁演进与验证证据

| 阶段 | 门禁结果 | 说明 |
|------|----------|------|
| V2.97.0（被测基线） | PASS 314 / FAIL 0 | 15 项运行期安全整改 + 迁移 0043 |
| 审计轮基线 | PASS 319 / FAIL 0 | 319 全绿仍暴露 3 项实测失败 → 元发现「门禁覆盖面不足」 |
| V2.98.0 / V2.99.0 | PASS 319 / FAIL 0 | 只修缺陷、暂未加断言 |
| V3.0.0 | PASS 345 / FAIL 0 | 新增 `13-hardening.mjs`（345 = 319 + 26） |
| V3.1.0 | PASS 366 / FAIL 0 | 新增 `14-sync-jobs.mjs`（21 条）；门禁套件 15 个 |
| V3.2.0 | PASS 403 / FAIL 0 | 新增 `15-key-lifecycle.mjs`（37 条，凭据生命周期与组织准入）；门禁套件 16 个 |
| **V3.3.0（当前）** | **PASS 433 / FAIL 0** | 新增 `16-rls-audit.mjs`（行级策略登记闭环 + 审计降级通道）；门禁套件 17 个。**首轮上生产即以「实有 68 ≠ 登记+豁免+平台 69」抓出登记表僵尸条目 `schema_migrations_new`**（迁移 0009 的临时表，改名后不存在），修后复跑全绿 |

- 每版均过：全新本地库从零重建迁移全 ✅（当前 48 条，含 0043–0048）→ `tsc --noEmit` 0 错 → 后端全量 esbuild 语法 + 打包 0 错 → 本地真实 HTTP 实测 → `npm run build` → `npm run deploy`（迁移 apply + 上传）→ 生产门禁全绿。
- V3.1.0 本地实测 **PASS 30 / FAIL 0**，含反向用例：错误调度令牌 401、令牌越权重放 403、轮换后旧令牌立即失效。
- **门禁设计取舍**：`14-sync-jobs` 刻意不触发真实投递（推进接口会真发邮件），避免门禁运行期间外发。

### 12.4 剩余项清单（V3.3.0 起：**已清零**）

> **V3.3.0 收口**：原列 4 项（M-12 / L-02 / L-03 / L-04 / L-05，其中 M-12 拆前后半）均已落地——M-12 / L-02 / L-03 于 V3.2.0 收口（见 12.1 表），**最后的 L-04 / L-05 于 V3.3.0 收口**。至此本报告发现与建议清单**全部关闭，无剩余待办**。

| 编号 | 发现 | V3.3.0 落地方式 |
|------|------|-----------------|
| L-04 | 52 个接口认证但未纳入行级策略表 | ① **默认值反转**：未登记 → `1=0`（默认拒绝）而非默认全公司可见；② **全量显式登记**：48 张业务表逐张写明范围（全公司 36 / 仅本人 7 / 仅部门 5），18 张平台表列入免登记并**逐张注明原因**；③ **机器自检（双向）**：`findUnclassifiedTables()` 查漏登记、`findStaleRegistryEntries()` 查「僵尸登记」（登记了但库里不存在），均以数据库**真实表清单**（`sqlite_master`）为基准，结果在安全中心可见；④ 平台内部表前缀（`sqlite_` / `_cf_`）排除但**如实列出**不隐藏；⑤ 返回契约由 `{clause, param?}` 改为 `{clause, params: []}`——默认拒绝分支零参数，旧契约会让调用方 `push(undefined)` 造成「占位符数 ≠ 绑定数」运行期 500，改用展开传参后两种分支都安全；⑥ `assertRlsOwnership` 同样默认拒绝（未登记表判为无权限）。 |
| L-05 | 审计写入失败无降级记录 | ① 新增 `functions/_shared/auditLog.ts`：`writeAudit()` 失败时调 `recordAuditDegraded()`，**从不抛异常**（审计绝不可阻断业务）；② 三层降级：结构化日志标记 `[AUDIT_DEGRADED]`（零依赖必达）→ 迁移 0048 建**独立** `audit_degraded` 表落库（与审计主表分离，主表故障时仍有线索）→ 绝不阻断；③ `auditHealth()` + `GET /api/system/audit-health`（限管理员）回传审计总量 / 近 24 小时 / 降级记录 / 行级策略登记报告；④ 安全中心新增「审计与行级策略健康度」卡片。旧库无 `audit_degraded` 表时自动降级跳过、不阻断。 |

### 12.5 结论与后续候选

- 评测报告结论（原文口径）：**「本次实测未发现任何一项整改是纸面修复」**——V2.97.0 的整改真实有效；本次 23 项新发现已于 V2.98.0–V3.3.0 **全部收口（23 / 23）**，1 项元发现（门禁覆盖面不足）已于 V3.0.0 收口。其中 21 项按报告「改善建议清单」落地，余 2 项（L-04 / L-05）虽未进入建议清单、仍于 V3.3.0 主动收口。
- **评测边界（未完整验证项，报告已逐条标注）**：浏览器端前端降级表现（需浏览器运行）、真实口令爆破（会影响生产告警）、外键孤儿数据全量梳理（需逐表业务语义）、B1/B2/B4/B6/C2/D1 等需特定生产角色配置的整改项。
- **报告归档状态**：`SSA ERP 稳定性·可靠性·安全性深度评测报告.html` 位于项目根目录（单一权威副本），已**成功归档** ima「强哥的知识库」→ ⑥通用-交付物 → erp开发项目（`folder_7487365102714930`），采用同名覆盖（`DUPLICATE_NAME_STRATEGY_REPLACE`），每次更新只保留最新一份。此前反复出现的 `InvalidAccessKeyId` 根因已坐实为**长令牌人工转录出错**；现固化流程为「`create_media` 返回的凭证对象**直接写文件落盘**（绝不手打转录）→ 把该文件路径喂给上传脚本」，此后一次通过。工作区 `强哥的知识库/` 目录仅作离线暂存副本，内容与根目录保持同步。
- **本计划与报告的联动约定**：报告发现的整改状态以本节 12.1 表为准；后续再出新评测，直接在本节追加对照，不新建计划副本（遵守开发计划铁律）。
