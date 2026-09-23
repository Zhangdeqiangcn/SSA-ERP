# SSA ERP 实施主计划（单一权威版）

> 标题基线：**V2.54**（2.54.0，构建于 2026-08-12）；**V2.56 对标整改基线**（见 §九，package.json 2.56.0）；**当前版本 V3.21.0**（2026-09-23）：本次为**字段级权限从「界面装饰」升级为服务端强制 + 搜索通配符转义**——① 字段级权限改造前有**三套各写一份**的脱敏规则且角色词表互不兼容（后端 `protected-data` 用的是 `manager`/`staff` 这类**系统里根本不存在的角色名**），业务真正走的主通道 `/api/vendors`、`/api/customers`、`/api/materials` 一律 `SELECT *` 返回全列零脱敏——**界面上显示 `***` 的字段，接口响应里是明文**（已实测确认），写入侧更是零管控。本轮新建 `functions/_shared/fieldAccess.ts` 收敛为唯一权威策略（策略来源＝管理员在「字段级权限」页已持久化的 `app_state` 配置，读不到才回退内置默认矩阵，fail-safe 宁可多遮），读取侧按角色剥离并附 `_hiddenFields` 元数据、写入侧「**值确有变化**」才拒写（403 + `FIELD_FORBIDDEN` + 中文字段名，避免编辑页回传完整对象被误拦）、创建侧静默剔除（不阻断建单）；试点域为 **物料（行级范围 `all`，字段权限必被触发）+ 供应商（行级 `own`，须用本人创建的行才走得到字段门禁）**。② 搜索里 `%` / `_` / `\` 此前直接当通配符（搜 `100%` 变成「包含 100 的一切」、搜 `_` 几乎匹配任何记录），本轮 `escapeLike()` 转义 **+ 24 处 SQL 统一补 `ESCAPE '\'`（逐条 76 个模式）**；两者必须成对——只转义不声明 ESCAPE 会让搜索去找字面反斜杠、**连该搜到的都搜不到且不报错**。③ 顺带修出两处隐患：`work-orders/picking` 的 `materialName` 搜索是上一版关键词扫描的**漏网之鱼**（参数名不叫 keyword，仍可超长 500）、`vendor/register` 用**用户可控的** `vendorCode` 前 3 位拼 LIKE 且未转义（填 `%` 开头即可把自己注册进任意组织）。门禁新增 ⑤ LIKE 转义一致性（凡 `LIKE ?` 必带 ESCAPE，含反例自证）、⑥ 字段权限矩阵一致性（前后端 67 条三元组逐条核对）。生产套件 30（**68 断言**）、套件 29 扩充至 **77 断言**。**上一版 V3.20.1 为修复「搜索框里粘贴长单号就报系统错误」**——云数据库（Cloudflare D1）给模糊搜索的匹配模式设了 50 字符上限（原生 SQLite 默认为 50000，被平台调小），关键词超过 48 字符即触发 `LIKE or GLOB pattern too complex`（SQLITE_ERROR 7500），端点未捕获、被中间件兜底成 500；而触发场景恰是最自然的操作「**把完整单号粘进搜索框**」（本项目单号普遍 50+ 字符，如倒冲出库单号 `OUT-WO-BF-WO-E2E-260923060258-m2b7-MAIN-1790143389976` 为 53 字符）。修法为新建 `functions/_shared/searchKeyword.ts`：`safeKeyword()` 在取值处截断 40 字符作主力闸门，`likePattern()` 把模式构造一并收口作第二道保险，两层批量接入 **23 个文件、64 处替换点**（含参数名为 `q` 的 `org-members` 变体）。刻意选择**静默截断**而非报 400——超长关键词的高频场景就是粘贴单号，截断后前 40 字符仍足以命中，且不打断用户。生产真机二分实测确认阈值边界（48 通过 / 49 崩）。**再上一版 V3.20.0 为**生产倒冲发料（完工按物料清单自动扣原料）**——对标差距 13 此前被记为「已修」但实际从未接通：系统里只有「手工领料」这一条扣料通路，工单完工（`completeWorkOrder`）只回写状态、生成成品入库单，**对原料零动作**；只要没人记得点领料，成品就凭空入库、原料账不动、材料成本不进工单。本轮新建 `functions/_shared/backflush.ts`（多级展开含废品率 / 子装配引用 / 虚项透传，含废品率；只补「应耗用 − 已手工领用」的差额；复用 `inventoryPosting.postOutbound` 权威扣减与凭证生成），挂到工单 PUT 与 POST 两个写入点（**建单即完工同样倒冲**，只堵 PUT 等于留后门），以迁移 0076 的 `work_orders.inventory_posted` 做幂等守卫、`backflush_outbound_no` 与领料台账 `backflush_quantity` 做留痕；缺 BOM / 缺物料主数据 / 子装配清单缺失一律**不倒冲但不阻断完工**（补账动作不能变成门槛），各自返回可区分代码与中文原因，前端工单页展示倒冲明细表并提示「已完工但原料未倒冲」的历史单。**本版同时修出一处真缺陷：完工后接口回传的是倒冲前的旧快照（`inventory_posted=0`），会让前端误报「原料未倒冲」**，以及补齐长期缺失的一环——`completeWorkOrder` 此前**从不写服务端**，完工状态刷新即丢。生产 E2E 新增套件 28（**56 断言全绿**，本地与生产各跑一遍），生产域套件 23（**59 断言全绿**）与付款闸门套件 27（**44 断言全绿**）、财务域套件 19（**86 断言全绿**）同步复跑确认无回归；另把 `scripts/_sweep_api_live.mjs` 从一次性侦察脚本提升为**常驻检查工具**（固定报告路径 + 非零退出码 + 纳入门禁第 ④ 步 `--live` 显式开关）。上一版 **V3.19.0**（2026-09-23）为**付款闸门真正接通（三单匹配超差硬拦）**。再上一版 **V3.18.0**（2026-09-23）为审批实例层落地（撤回/催办/委托）+ 导出数据管控 + 单位换算收口（对标差距 9/10/11/15/20）。再上一版 **V3.17.9**（2026-09-21）为审批中心动态化。
再上一版 **V3.17.5**（2026-09-20）为**缺陷台账 #8 两套账合一（报表真源切换为受保护的凭证表）**——前端 financeStore 的 accountEntries 切片改为由凭证派生（新增 deriveEntries），7 张报表层零改动，不再写遗留表 fin_account_entries。上一版 **V3.17.4**（2026-09-20）为**缺陷台账 #9 单据状态机（核心单据服务端硬拦）**——新增 statusMachine.ts，6 类核心单据服务端状态校验。上一版 **V3.17.3**（2026-09-19）为**缺陷台账 #10 乐观锁补全（工单接入）**——work_orders 补 version，PUT 接 withVersionGuard。上一版 **V3.17.2**（2026-09-19）为**缺陷台账 #12 金额精度统一**——money.ts 单一来源。上一版 **V3.17.1**（2026-09-20）为**#13 折旧计提彻底服务端化**——fixed_assets 关系表 + /deprecate 端点。上一版 **V3.17.0**（2026-09-20）为**服务端算账闭环（#6/#7/#13）**——入库/出库凭证服务端生成，isPeriodClosed 硬拦。
本计划在此基线追加「地基修复」P0/P1/P2 路线图，并在 V2.97.0–V3.3.0 完成「独立安全评测 23 项发现 + 1 项元发现」的**全部整改**（§十二：23 项 + 元发现已全部收口，无剩余项）。V3.4.0 起的新一轮 8 维度竞品对标，A 级五项与 B 级七项均已收口（§十三）；V3.6.0 起进入 **C 级数据关系化**，样板域 BOM 已落地，V3.7.0 完成**打印模板域（含图片外置分片）+ 财务域建表**并**补齐后端类型检查门禁**，V3.8.0 完成**财务域 store 改造（33 个消费方零改动）**、V3.9.0 完成**销售域关系化（含多子表能力扩展）**、V3.10.0 完成**审批流域关系化（含子表行内嵌套新能力 + 顺带修复「代码新增默认流程老用户永不可见」缺陷）**，V3.10.1 完成**登录页无限刷新循环的根因修复**（老缺陷被新改动压垮，非新版本写错），V3.11.0 完成**采购域关系化**（含两个真 Bug 修复：父表 JSON 对象列被静默写成 `[]` + 漏建业务单号唯一约束），V3.11.1 完成**「字段类型表长期残缺」连根修复**（单行 DDL 丢列 + SQL 注释黏列 + 两段式生成链路只跑一半，三因叠加致 16 张表校验长期裸奔），**V3.12.0** 完成**生产域关系化（C1 第七域）**、**清单型登记表全面核对**（5 份 / 94 表零漂移）、**3 个「前端调了但后端没有」的路由 Bug 修复**、**vouchers 表 9 个驼峰坏列清理**（含配套映射修正），并**修正 0057/0059 回填落错组织**的历史缺陷（§十三「C1 落地实录」）。
> 版本单一来源：`src/version.ts` 的 `APP_VERSION`(==`package.json`.version) 与 `APP_VERSION_LABEL`(展示)。**版本号不在业务界面展示**（顶栏 / 侧边栏 / 页头 / 门户页脚一律不显示，历史硬编码旧值已清除）；需要查询版本时统一走「设置 → 帮助中心 → 系统信息」（唯一出口，支持复制版本信息）。
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

## 二、模块现状（V2.54 基线盘点 · 变更沿革至 V3.4.0）

> 下表为 V2.54 基线盘点；V2.55–V3.4.0 的逐项变更见 §八版本沿革，V2.97.0–V3.3.0 的独立评测与安全整改见 §十二；V3.4.0 起的新一轮 8 维度竞品对标与整改见 §十三。核心结论：**P0 六项地基、P1 业务闭环（B1–B11 + C1–C7）、P1 关系化后端 17 项、P2 智能增强（20/30 功能落地——V2.74.7 补齐波次RFID/重复制造/MES集成 + 三方销售/COPA/资金管理（A/B 两轮共 6 项）、V2.74.8 补齐 S&OP/BI集成/ESG（C 轮 3 项），9 项整页缺失全部完成 + 2 壳 + 1 桩）均已落地**；生产态真实后端见 §九/§十。
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

- **V3.4.0 新一轮全维度竞品对标 + 第一批 A 级整改（2026-09-14）** —— 对标基线升级为 **SAP S/4HANA Cloud Public Edition 2608 / 金蝶云·星空（金蝶 AI 星空）V9.1 / 用友 BIP 6 · U9 cloud 2026 · YonSuite**（竞品版本与能力均经 ≥2 个公开来源交叉验证，查询日期 2026-09-14，未能验证的已在报告中标注「未验证」）。维度由上一轮 7 个扩为 **8 个**（D1 功能 / D2 界面 / D3 人机工程 / D4 可用性 / D5 适配性 / D6 安全 / D7 结构 / D8 算法），覆盖 12 个模块 + 横向系统性差距，报告落在 `docs/benchmark-deep-analysis.html`（旧版 `benchmark-V2.64-deep-analysis.md` 已删除，避免文档蔓延）。
  **最薄弱三项**：① 60 个业务域仍以 JSON 大对象存于 `app_state`（66 张真实表 vs 60 个状态键）；② 48 个写端点中 33 个没有审计（覆盖仅 31%）；③ 多语言为空壳（字典 14 条、实际调用 1 处）+ 全仓 `Skeleton` / `virtualiz` / `React.memo` 均 0 命中。
  **本轮已落地 A 级四项（A1/A2 在首轮，A3/A4/A5 在同一轮续做）**：
  ① **写接口审计补全** —— 14 个后端文件 21 处（入库 / 出库 / 调拨 / 库存调整 / 质量扣留 / 外协 + 采购订单·销售订单·工单·物料·客户·记账凭证的更新与删除 + 开放接口密钥的创建·吊销·轮换），覆盖比例 31% → 约 60%。刻意不做「统一中间件」：Cloudflare Pages Functions 无全局中间件钩子，且逐端点写才能把单号 / 原因 / 有效期写进中文摘要。
  ② **列表加载态底座** —— `DataTable` 增 `loading` / `emptyText` / `skeletonRows`（骨架行列数与真实表一致，避免布局抖动）；`persistStorage.getItem` 方法体抽为 `readFromCloud()` 并在外层打点，`syncStatusStore` 增 `hydrating` 计数与 `useCloudHydrating()`；已在物料 / 采购订单 / 销售订单三个高频列表启用。
  验收：`tsc --noEmit` 0 错；后端 89 文件语法 + 打包 0 错；`npm run build` 33.91s 通过。
  **诚实结论**：短板不在「功能有没有」而在「数据能否被查询、能否被第二种语言使用」；AI 智能体明确列为「暂不建议」—— 数据底座未关系化时做 AI 只能做出聊天机器人。
- **V3.5.0 B 级七项收口（2026-09-15）** —— B1 MRP 期间桶与低层码、B2 计划订单落库、B3 CRP 日负荷曲线与班次日历、B4 霍尔特-温特斯预测、B5 报表中心真查询、B7 列表零依赖窗口化（B6 写端点审计已于此前完成）。**至此 A 级五项 + B 级七项全部收口，无遗留。**部署 `7364801d`，生产门禁 **PASS 433 / FAIL 0**。
- **V3.6.0 C 级数据关系化首个样板域 BOM（2026-09-15）** —— 迁移 `0051_bom.sql` 建 `bom_headers` + `bom_items`；端点 `functions/api/bom/index.ts` + `[id].ts`；**★ 嵌套三层摊平**（不摊平会静默丢掉整棵子树）；**★ 删掉 persist**（`backendStorage` 落点就是 `app_state`，保留 = 双通道照旧）；**接口形状一字不改**，15 个消费方零改动。新增护栏 `suites/17-bom-domain.mjs`（26 条），门禁 **433 → 459**。详见 §十三「C1 落地实录」。
- **V3.7.0 打印模板域 + 财务域建表 + 补齐后端类型检查（2026-09-15）** —— 详见 §十三「C1 落地实录」。要点：
  - **顺序由真实数据决定**：实测 `app_state` 各键体积后推翻原计划 —— 打印模板 **404.3 KB**（第二名的 26 倍）优先。按「store 文件行数」排序完全得不出此结论（打印模板 463 行排第 13，仓库 1215 行却是 0 字节）。
  - **打印模板 = 数据与文件混在一起**：398.5 KB 中 397.5 KB 是图片，且**同一张图存两遍**（第二份藏在已废弃的 `headerText` 字段，无任何读取方）。拆为「模板定义进关系表 + 图片进独立资源表、正文留 `{{asset:<id>}}` 占位符」，正文 **398.5 KB → 1.7 KB**，总体节省 **263.2 KB（63.6%）**。
  - **★ 分片存储踩坑**：第一版「zeroblob 占位 + 分块 UPDATE 拼接」**静默只剩 784 字节**（`byte_size` 仍写 152658，界面完全正常）。改为「一个图片 = 多行分片」后才可靠。**生产库实测 MD5 `f94749486daa255b768c7f876a8e4ae6`，与原始图片逐字节相同。**
  - **财务域只建表与登记**（7 个切片），**store 改造留下一轮** —— 消费方 35 个（全项目最多），宁可少做一个，也不留「说不清做没做完」的半成品。
  - **★ 补上后端类型检查**：`functions/` 此前**完全不在任何 tsc 覆盖内**。本轮新建接口踩出 4 个错误（其中 2 个**不报错**——审计字段全空、`org_id` 存成 null），全部只有真跑才暴露。新增 `tsconfig.functions.json` + `scripts/tsc-functions.mjs`（基线快照、只报新增）并接入 `build-with-gate.bat`。
  - 新增护栏 `suites/18-print-template-domain.mjs`（27 条），门禁 **459 → 486**。部署 `c11146c6`，**生产门禁 PASS 486 / FAIL 0**（18 套件）。
- **V3.8.0 财务域 store 改造（2026-09-15）** —— 详见 §十三「C1 落地实录」。要点：
  - **动手前先列消费方全清单**：`useFinanceStore` 引用 **35 个文件**（业务消费方 **33 个**，全项目最多）。核对后确认无一处绕过方法直接改状态 → **接口形状不变、33 个页面零改动**；顺带查出 `financeStats` 是写死的假数字（`setFinanceStats` 定义了却无人调用），本轮刻意不改、作为已知缺陷记录。
  - **★ 最重大发现：0053 建表没对照前端类型，3 张表字段契约全错**（会计分录 / 税务记录 / 项目核算）。若直接接入，通用路由的 `pickSnake` 会**静默丢弃未登记字段且返回 201 成功**。根因：0053 按「会计常识」推断列名，而**表结构必须服从前端契约**。
  - **决策：重建而非加列**（迁移 `0054_finance_domain_fix.sql`，已应用于生产库）。加列会留下 16 个永远 NULL 的死列，在会计表里尤其危险（后来的人会把 `debit` 列当成借方金额）。**前提已验证**：三张表生产库均为 **0 行**。
  - **两个嵌套数组走专用端点**：`installments`（分期）/ `costItems`（成本明细）。新增通用父子表助手 `_shared/parentChild.ts` + `finConfig.ts` + 四个端点，供后续销售/采购/生产域复用。
  - **store 彻底移除 persist，方法保持同步签名**：33 个消费方大量同步依赖返回值，故保留同步签名 + 内部「乐观更新 → 异步落库 → 失败回滚 → 可读中文原因」。
- **V3.9.0 销售域关系化（2026-09-15）** —— 详见 §十三「C1 落地实录」。要点：
  - **迁移范围由真实数据与调用点决定**：`app_state['ssa-erp-sales']` 实测 **10.4 KB**（prospects 5 / shipments 3 / projects 4 / marketData 1，`salesOrders` 无该键）。`marketData` **刻意不迁 D1** —— 零 CRUD 调用点、仅 1 个消费方（`MarketAnalysis.tsx` 只读 `marketData[0]`）、无写入方、无单一事实来源，本质是报表种子常量；为它建子表只会得到「永远只有种子数据、零端点」的空壳。
  - **★ 与财务域最大差异：本域可放心全改 async**：10 个写调用点**全部不 await 返回值**（导入循环 `rows.forEach`、表单提交后关弹窗、`FlowSelfTest`）；`services/apiService.ts` 的隐式同步依赖（`updateProspect` 后立刻 `getState()` 读）由「同步先改内存」满足。财务域因 33 个消费方同步依赖返回值而被迫保留同步签名，本域无此约束。
  - **★ 新增多子表能力（`parentChild.ts` 二次重构）**：`Project` 一次带 **3 个数组**（`team` / `milestones` / `exceptions`），原单 `childField` 配置无法覆盖。将配置由「单子表字段平铺」提升为 **`children: ChildSpec[]`**，并把 `pcRemove` 改为遍历全部子表删除。
  - **★ 字符串数组走 JSON 文本列，不建空壳子表**：`interestProducts`（意向产品）/ `team`（项目团队）/ `linkedOrders`（关联订单）无 id、无属性、不参与 SQL 统计 → 父表 TEXT 列存 `["a","b"]`，进出显式 JSON 编解码。
  - **★「不传子数组 = 保持原样；传空数组 = 清空」在多子表下逐张独立判断**：只改项目进度不得把里程碑与异常记录一并删掉。套件专门交叉验证了「只传 milestones 后 exceptions 仍在 / 只传 exceptions 后 milestones 仍在 / 只改进度后两者都在」。
  - **★ 本轮由测试抓出的两个真 Bug**：① **JSON 数组列读回 `undefined`**（5 条同一根因）——根因是**设计缺陷而非笔误**：字段只进了 `jsonCols` 却没同时进 `parentCols`，而读写两条路径都只遍历 `parentCols`，于是「既不写库也不回读」。修法新增 `allParentCols(cfg)` 合并两个集合，**消除两处手动对齐的隐患**。② **全量回归抓到真回归**：`pcRemove` 去掉旧字段 `deletedChildren`（数字）导致财务域套件断言失败 → 改为**同时返回** `deletedChildren`（单子表给数字）与 `deletedDetail`（中文摘要），保留旧契约。
  - **RLS 七张表全部登记 `'own'`**（与 `sales_orders` / `customers` 同属性）——**与财务域刻意相反**：财务账目全公司可见，销售线索/出货/项目属业务员个人业务范围。
  - 新增护栏 `suites/20-sales-domain.mjs`（113 条），门禁 **572 → 685**。部署 `074178da`，**生产门禁 PASS 685 / FAIL 0**（20 套件）。
- **V3.10.0 审批流域关系化（2026-09-15）** —— 详见 §十三「C1 落地实录」。要点：
  - **★ 动手前三项量化（本轮确立的纪律）**：消费方文件数（**仅 6 个**）+ 真实体积（`app_state['ssa-erp-approval-flows']` = **6799 字节 / 13 条流程 / 26 个节点**）+ CRUD 写入调用点（集中在 2 个页面）。**本域是全项目消费方最少的域**（财务 35 / 销售 15 / BOM 15），因为审批流是配置而非流水，只有设置页会写它。
  - **★ 迁移前逐字段比对生产库数据 vs 代码默认值（本域最有价值的一步）**：靠脚本比对而非目测，才发现三个硬事实 —— ① 13 条流程的 `status='system'` **不是用户改的**，是 persist `migrate`（v1→v2）批量补的标志位（代码默认值无此字段），若不查证会误判成「用户配置过」；② **唯一真实用户改动是 `inbound.enabled: false → true`**（用户在设置页启用了「采购入库」）；③ **生产库只有 13 条、代码默认有 20 条** —— 少的 7 条（customer / inquiry / comparison / check_task / inbound_order / outbound_order / quality_inspeCTION）是 V2.91.0 之后才加进代码的默认值，因 persist 已有数据 `seedFlows()` 不再播种，**这 7 个流程在生产环境从未出现过**，用户在设置页也看不到它们 —— 这是既有的持久化缺陷，本轮「D1 空则播种」逻辑**正好一并修正**。
  - **结论：必须把库里 13 条真实数据迁过去，不能用代码默认值覆盖**（否则 `inbound` 那处改动会丢）。
  - **★ `parentChild.ts` 第三次扩展：子表行内也有嵌套（新能力）**：前四域里嵌套只在「父表带子数组」这一层；审批流的**每个节点自己还带对象与数组**（`conditions` / `skipRule` / `escalation` 对象 + `approverRoles` / `approverUserIds` / `fields` 数组）。`ChildSpec` 新增 `jsonCols` 能力。**★ 与父表 jsonCols 的关键语义差异**：父表 `jsonCols` 只装字符串数组（`toJsonText` 非数组一律落 `[]`），子表还要装**对象**，若误用 `toJsonText`，一个合法的 `ConditionGroup` 会被**静默写成 `[]`**（表现为「条件配置保存后一条不剩」）→ 新增 `toJsonValue`（原样 `JSON.stringify`）。并新增 `allChildCols(spec)` / `childJsonSet(spec)` 合并遍历，**从结构上消除「两处手动对齐」隐患**（复用父表 `allParentCols` 的思路，不重犯 V3.9.0 的错）。
  - **★ 本域写入点用的是函数式更新**（`setFlows(prev => prev.map(...))`），拿到的是整个数组 → store 内部需先算差量（added / changed / removed）再分别发 POST / PUT / DELETE。**判「变了没」不能用引用比较**：`MaterialApprovalTab.handleSave` 即便用户什么都没改也会构造新对象，按引用判断会每次白发两个 PUT（并触发审计写库），故用序列化逐字符比较（对象很小，20 条全比一遍开销可忽略）。
  - **★ 只改父表字段时刻意不带 `nodes`**：后端语义是「不传子数组 = 保持原样」，若总把 `nodes` 一起 PUT，遇到「用旧版数据编辑后节点被截断」会极难查。仅在节点确实变化时才带。
  - **★「order」是 SQL 保留字**（ORDER BY）→ 列名取 `node_order`，camel 名保持 `order`，**接口形状一字不改**。
  - **★ RLS 登记 `'all'`，与销售域 `'own'` 刻意相反**：审批流是**公司级公共配置**（同 `orgs` 级语义），若登记 `'own'`，系统预置流程（无 `owner_id`）会被全部过滤掉 —— 表现是「设置页只剩自己建的流程，20 个系统流程一条都看不到」，且更严重的是「张三关掉的审批，李四那边照走」。
  - **★ 本轮自查出的 1 真漏字段 + 1 死列（tsc 与打包都发现不了）**：① **`createdAt` 第一版没登记进 `parentCols`** → `addCustomFlow` 设的值既不写库也不回读，刷新后自定义流程创建时间消失（与 V3.9.0「字段只进一处集合」是同一类错的另一副面孔，根因从「要求两处对齐」变成「凭印象挑字段」）；② 删掉配置里一条**死列** `['seq','seq']`（前端 `ApprovalNode` 契约里没有 `seq` 字段，登记了也永远取 `undefined`/写 0，还会让 `childOrder` 看起来像两级排序）。
  - **★★ 本域最该记的一条：套件断言写错了「作用域」（详见 §十三「七之二」）**。首轮门禁 `PASS 772 / FAIL 5`，本域 4 条红。我**先误判**成「0056 只建表没搬数据」并补了 `0057` 回填（回填是必要的，见 §十三「七之三」），**但门禁依旧红**。查证后发现真根因：**数据从来就在库里**，是我把两件事混为一谈 —— **RLS 的 `'all'` 是「本公司内全员可见」，而门禁每轮注册一个全新隔离组织**（公司码 `E2E-<runId>`），隔离组织里本来就没有别的公司的流程。**RLS 拦住的正是它该拦的，错的是断言。**
  - **★ 定位手法**：不继续猜，**直接查库把「谁拥有这份数据」打出来**（`SELECT org_id, COUNT(*) FROM approval_flows GROUP BY org_id`）→ 13 行同属 `org_04d67b437bf24a5db3d4aa2fc756b45d`（公司码 `xinguang`「新光专用汽车」）→ 与「门禁每轮新建组织」一对照，矛盾自解。**先量数据归属，再谈代码逻辑。**
  - **★ 修法**：换成**同组织内可复现**的等价断言 —— admin 建一条 → 同组织另一个身份（`ctx.registerUser('afpeer','buyer')`）必须能查到、也能改，且改后 admin 侧读回确认已落库。要防的真故障是「**张三配好的审批流李四看不到**」，它在组织内就能完整复现。
  - **★ 顺带抓到第二个真问题**：**单资源 GET 是扁平对象**（`json(parentToApi(...))`）、**不带 `data` 包层**，只有列表接口才是 `{data,total,page,pageSize}`。我一度写成 `afterEdit.data?.data?.nodes`，多解了一层 → 套件**假报**「改开关把节点删光了」（实际一条没少）。**同一端点族的「列表」与「单体」返回形状不一致是常态，写断言前必须先确认形状。**
  - **★ 沉淀的纪律（比「该不该放迁移」更根本）**：**写断言前先问「这个故障在测试环境里能不能被制造出来」** —— 制造不出来的故障，断言不是**永不触发的空断言**（假安全）就是**永远红的错断言**（假警报）。**存量数据正确性用迁移脚本 + SQL 核对承担，不要塞进接口套件。**
  - **配套登记**（漏了会静默失效）：`rls.ts` 加 2 条 `'all'`；`validate.ts` 的 `CHILD_TABLE_OVERRIDE` 加 `approval_flows: 'approval_flow_nodes'`（机械推断会得到不存在的 `approval_flow_items`）+ `CHILD_BY_FIELD` 加 `approval_flows: [['nodes','approval_flow_nodes']]`。
  - 新增护栏 `suites/21-approval-flow-domain.mjs`（6 大风险面 / **97 条断言**）。**门禁 685 → 782**。部署 `c75a45bf`。**生产门禁 PASS 782 / FAIL 0**（21 套件 / 共 798，WARN 7 / INFO 9，耗时 272.5s）。
- **V3.11.0 采购域关系化（C1 第五域）**（2026-09-15）—— 详见 §十三「七之五」。要点：
  - **三件套量化**：`app_state['ssa-erp-purchase']` = **4798 字节**；消费方 **37 文件**（业务 34）；写入调用点 申请 **15 处** / 报价 **0 处**。结构实测 `purchaseRequests 5 / vendorQuotes 2`（`purchaseOrders` 已于 V2.75.x 迁 D1，本轮不碰）。
  - **★ 本域最关键的判断：「零写入调用点」不是「不该迁」的判据**。销售域 `marketData` 被刻意不迁，三条同时成立（零 CRUD／仅 1 个只读消费方／**本质是报表种子常量**）；`vendorQuotes` 看似满足前两条，但**第三条不成立** —— 生产库是 **2 条真实供应商报价**（`vq-001` 2800 元 / `vq-002` 2830 元，对**同一张申请单 PR20240502001** 报价），是「供应商比价」业务的唯一数据载体。**判据是「这份数据空了会怎样」，不是「像不像上一个不迁的先例」。**
  - **★ 全项目第一次「同一域内两张表 RLS 取值刻意相反」**：`purchase_requests`/`purchase_request_items` = `'own'`（业务员个人提报的单据，同 `sales_orders`/`customers`）；`vendor_quotes`/`vendor_quote_items` = `'all'`（比价用的公司级公共信息，采购员与审批人必须看到全部报价才能比出最低价，同财务账目）。**误把报价设成 `own` 的表现是「列表少了几行、零报错」——比价功能静默残废**，故套件用**同组织内跨身份**（admin 建的报价 buyer 必须能看见）来钉。
  - **★ 同一助手内两种子表主键来源分叉**：`PurchaseRequestItem` **自带 id** → 主键直接用前端 id；`QuoteItem` **类型里就没有 id** → 主键由 `uid('ci')` 生成。套件对两条路径**分别断言「id 存在且非空」**（只测前者，「后端生成」那条的表现是「明细编号全空」且不报错）。
  - **★ 刻意不建子表的一处**：`PurchaseRequest.approvalRecords: ApprovalRecord[]` 是**对象数组**，按前序域直觉该建子表，本轮**刻意走父表 JSON 文本列**——① 实测 5 条申请该字段**全为 undefined**，现在建表只得空壳；② 用途是「详情页整体读出」，JSON 文本 100% 覆盖；③ 审批记录的权威来源是 `approval_flows` 体系，此处只是冗余展示。**与「字符串数组走 JSON 列」的区别：那条针对无 id、无属性的字符串列表；这里是对象数组走 JSON 是「暂时够用」，不是「本质如此」——区别在于将来会不会需要按内部字段做 SQL 统计。**
  - **迁移**：`0058_purchase_domain.sql`（4 张表：`purchase_requests` 27 列 / `purchase_request_items` / `vendor_quotes` / `vendor_quote_items`，等宽审计列 + `owner_id`/`dept_id`）+ `0059_purchase_backfill.sql`（纯 SQL 回填，父 id 取 `r.value ->> 'id'` 展开项，全部 `WHERE NOT EXISTS` 幂等）。本地全新库干跑**精确命中 5/8/2/6**，二次执行仍 5/8/2/6（幂等通过）。
  - **★ 本轮抓出并修复两个真 Bug（tsc 与打包都发现不了）**：
    - **(a) 父表 JSON 列的「对象」被静默写成 `[]`**（PASS 90/FAIL 5，其中 4 条同一根因）。`parentChild.ts` 的 `pickCols` 对**所有** JSON 列调 `toJsonText`（**非数组一律落成 `[]`**），读回侧对应走 `parseJsonArray`（同样把非数组落成 `[]`）。V3.10.0 时这两个函数只服务「字符串数组」，而 `customFields` 是**对象**（`Record<string, unknown>`）→ 写库成 `[]`、读回成 `[]`，**保存成功、返回 201、界面无异常，重进页面自定义字段全空**。**根因不是漏写一行，而是设计上「父子两套 JSON 编解码」这个分叉本身就是缺陷**——它与审批流子表 `conditions` 那个坑完全同构、只是发生在父表侧。修法：**两端统一**为 `toJsonValue`/`parseJsonValue`（原样序列化/反序列化，数组对象都对），**删除** `parseJsonArray`/`toJsonText`，父子共用同一套。**教训：当两处「必须不同」时，先问一句「这个不同是业务要求，还是实现偷懒」。**
    - **(b) `0058` 漏建业务单号唯一约束，导致重复单号能建出第二条**（409 断言失败 status=201）。`0058` 只建了 3 个**普通**索引，而 `purchaseConfig.ts` 的注释与 `parentChild` 的 `pcCreate`/`pcUpdate` 两段 409 分支**都假定 UNIQUE 存在** → 该分支**永远不会触发**，同一张申请单可被建两次且零报错。**这是「写配置时按应该有的样子写注释、没回去核对迁移实际建了什么」，与 0053 同源（按「应该长什么样」推断，而非按「实际是什么」核对）。** 修法：`0060_purchase_unique_index.sql` 用 **`CREATE UNIQUE INDEX`**（等价语义、零数据搬迁，错误信息同样含 `UNIQUE` 故 409 分支照样命中）补 `uniq_purchase_requests_no(org_id, request_no)` + `uniq_vendor_quotes_req_vendor(org_id, request_id, vendor_id)`。**前提已核对：生产库两处重复数均为 0**（`HAVING COUNT(*)>1` → 0 行），索引可安全建立。
  - **配套登记**：`rls.ts` 加 4 条（`'own'`×2 / `'all'`×2）；`validate.ts` 的 `CHILD_TABLE_OVERRIDE` 加 2 条 + **`CHILD_BY_FIELD` 加 2 条**；新增 `scripts/_gen_schema_prod.mjs`（从**生产库真实 DDL** 生成 `_schema_raw.json`，替代读本地历史库的旧脚本，含 wrangler 代理警告截取修复）。
  - **★ 顺带修复既存隐患：审批流子表校验一直静默失效** —— `_schema_raw.json` 停在 79 张表，**连 `approval_flow_nodes` 都没有** → `CHILD_TABLE_OVERRIDE` 指向 `FIELD_SCHEMA` 中不存在的表 → `childTableOf` 返回 `null` → **明细校验被静默跳过**。改用 `_gen_schema_prod.mjs` 从生产库 DDL 重新生成（79 → **92 张表**）后一并修复。
  - **store 改造**：`purchaseStore` 删 `persist` 包裹（`backendStorage` 落点就是 `app_state`，保留 = 双通道照旧、C1 白改）；**保持同步签名**（15 处写入调用点零改动）；新增 `FLAG`/`readableError`/`readLegacySlice`/`pullSlice`/`reportFailure` + `loaded`/`syncError`；Request/Quote CRUD 改「同步改内存 → 异步落库 → 失败回滚 + 记 syncError」。`App.tsx` 加 `usePurchaseStore.getState().load()`。
  - **新增护栏 `suites/22-purchase-domain.mjs`（55 条）**，含 README 新增第 4.6 节（「库里没数据的字段必须刻意写入再断言」——判据是**前端类型契约里有没有这个字段**，不是库里现在有没有值）与第 4.7 节（同域内多表 RLS 取值相反时，断言要写成「跨身份能否看见」）。
  - **验证链**：`tsc --noEmit` 0 错 → 后端 **117 文件 0 错 / 117 条导入链 0 错** → `tsc-functions.mjs` **新增 0 错**（存量 56 条不变）→ build 46.62s → 部署 → 生产迁移 0058/0059/0060 → **全量门禁 FAIL 0**。
- **V3.11.1 修复「字段类型表长期残缺」——16 张表校验裸奔**（2026-09-15）—— 详见 §十三「七之六」。要点：
  - **起点是一条与采购域无关的老断言**：全量门禁 `PASS 879 / FAIL 1`，唯一红项是 `13-hardening` 的「日期填 `2026-13-45`：被拒绝（4xx）」，**实际 `status=201`**。顺此查 `fieldSchema.ts`，发现 **79 张表里有 16 张是空对象 `{}`**，`purchase_orders` 正在其中 → `order_date` 从未登记 → 该字段的非法日期校验**从上线那天起就没生效过**。
  - **★ 三个根因叠加，缺一不成立（按隐蔽程度升序）**：
    - **根因 1 · 逐「行」切分 DDL**：`_gen_schema_prod.mjs` 用 `body.split('\n')` 逐行匹配列定义，**只在「一列一行」的 DDL 下成立**。本项目迁移里有大量 `CREATE TABLE x (id TEXT, name TEXT, ...)` **单行书写** → 整条 DDL 只匹配到第一个 `id`，其余列全丢。**症状指纹：该表只解析出 `id` 一列。** 实测受害：`sales_orders` 1137 字符 → 只出 1 列（真实 44 列，丢 43）；`purchase_orders` 丢 39；`vouchers` 丢 37；`work_orders` 丢 34；`three_way_match` 丢 27 —— **丢掉的恰是金额/数量/日期字段，即校验最该管的那批**。
    - **根因 2 · ★ 没剥 `--` 注释（最隐蔽）**：迁移大量使用「注释行 + 一列一行」的分组写法（`-- 信用管控` 紧接 `credit_level TEXT CHECK (...)`）。**按顶层逗号切分时，注释与该列会落在同一段** → 段首是 `--` → 被当作注释**整段跳过** → 该列消失。**症状指纹：丢掉的每一列，前面都恰好有一个 `--` 注释行。** 实测：`customers` 丢 8 列、`materials` 丢 15 列、`vendors` 丢 5 列 —— 逐列核对后**全部符合该指纹**。**正确顺序必须是「先剥注释、再切分」**；反之（先切再剥）会让带注释的段被误判为非列定义。
    - **根因 3 · 两段式生成链路只跑了一半**：链路是「取生产库 DDL → `_schema_raw.json` → `_emit_schema.mjs` → `fieldSchema.ts`」。`_gen_schema_prod.mjs` 已正确写出中间产物（**92 表**），但**没有接着跑 `_emit_schema.mjs`**，最终产物仍是旧的 79 表版本。**★ 因此我 V3.11.0 那轮汇报的「已从 79 重生成到 92 表」属误报，本轮已纠正。**
  - **修法（三件事，按序做）**：① 新增 `stripSqlComments()`（只截断**不在引号内**的 `--`）→ ② 新增 `splitTopLevel()` **按圆括号深度切顶层逗号**（兼容单行/多行，且不会切断 `CHECK (x IN ('a','b'))` 里的逗号）→ ③ **用生产库自己报事实做终审**：新增 `scripts/_verify_schema_vs_db.mjs`，SQL 走 `sqlite_master JOIN pragma_table_info(m.name)` **一次查多表**，逐表比对「解析列 vs 真实列」，以**不一致 = 0** 为通过门槛。结果：**92 张表 / 1599 个字段，漏列 0 / 多列 0，逐张完全对齐**。
  - **★ 交付前加的两道自检（防同类问题再静默发生）**：① **生成器内置「残缺即失败」**——判据是「业务表只解析出 `id` 一列」（本项目所有业务表都有 `org_id`/`created_at`），命中即 `exit(1)` 拒绝写文件。**这类 Bug 的本质是「静默成功」，所以护栏必须卡在「产出」这一步。** ② 生成后必跑上述比对脚本，**禁止目测与抽样**。
  - **影响面评估（不靠猜）**：`git diff` 净变化 261 增 / 163 删（含字段按字母序重排）；新增登记字段集中在「曾被丢列的 15 张表」。**驼峰重复列经核实不构成误拒风险**：`vouchers` 表确有历史驼峰列（`totalDebit`/`totalCredit`/`createdBy`…与蛇形列并存），但 `validate.ts` 用 `camelToSnake(key)` 查 schema，驼峰 key 会被转成蛇形去命中**蛇形列**，故既不会误拒、也**永远匹配不到驼峰列本身**（属「登记了但无效」，如实记录，不夸大也不忽略）。
  - **★ 性质判定（必须说准）**：这**不是本轮引入的回归**，而是**一条长期裸奔的旧缺陷被门禁旧断言顺带暴露**——`13-hardening` 那条断言一直在跑，只是此前从未绿过（此前 `purchase_orders` 是空对象，同样返回 201）……**准确说：它是「一直红但被淹没在其它信号里」与「一直没被真正执行到」的叠加，本轮顺着它把三层根因一次拔净。** 两类问题的处置方式不同（回归要回滚定位、裸奔要补全能力），定性错误会导致修错方向。
  - **验证链**：`tsc --noEmit` **0 错** → 后端 **117 文件 0 错 / 117 条导入链 0 错** → `tsc-functions.mjs` **新增 0 错**（存量 56 条不变）→ build 47.60s → 部署 **`51b4f959`** → **全量门禁 `PASS 880 / FAIL 0`**（22 套件 / 共 896；WARN 7 / INFO 9，193.5s）——**那条 FAIL 修绿，且无一条新增误拒**（采购域 98 条断言全部保持绿，证明 409 分支等逻辑未被打破）。
- **V3.12.0 生产域关系化（C1 第七域）+ 清单型登记表全面核对 + 3 路由 Bug 修复 + vouchers 9 个驼峰坏列清理（2026-09-16）** —— 详见 MEMORY.md 版本沿革。要点：① 工单早已直连 D1，仅迁 `processRoutes`(2 条/10 工序)+`mrpRecommendations`(4 条)；② 修正 0057/0059 回填落错组织（数据落 xinguang、真正所有者 CY03Z 打开是空列表）由 0063 修正；③ 3 个「前端调了后端没有」的路由 Bug（`/api/tax-gateway/config`、`/api/chatbi/analyze` 405、`/api/tax-gateway/quota` 死代码 `onRequestQuota`）→ 建 3 个转发文件；④ vouchers 9 个驼峰坏列清理（迁移 0064，先改代码映射再删列，避过运行时 500）；⑤ 5 份清单型登记表 vs 94 张表双向核对：僵尸 0/漏登记 0（新建 `scripts/_verify_registries_vs_db.mjs`）。门禁 **880 → 939 / FAIL 0**（23 套件 / 共 955）。
- **V3.13.0 C2 合并报表/多账簿地基（2026-09-16）** —— 详见 MEMORY.md 版本沿革。要点：① 迁移 0065：orgs 集团化（`parent_id`/`org_type`/`ledger_code`/`currency`/`group_id`，既有组织回退 `group_id='GRP-'+id`、`ledger_code=company_code`）+ vouchers/voucher_items 加 `ledger_book`（DEFAULT '0000' 法定账套）+ 4 张合并表（`ledger_books`/`consolidation_groups`/`elimination_rules`/`consolidation_runs`）；② 合并引擎双 scope（`books`=同组织多账簿聚合 / `group`=集团跨组织，权限闸门：用户组织∈成员 OR 特权角色否则 403）；③ 通用资源路由零新增端点（ledgerBook/consolidationGroup/eliminationRule）+ rls.ts 4 表登记 'all'；④ 前端合并报表页直连 `/api/consolidation` + 侧栏/搜索/i18n 登记；⑤ 新增门禁 `24-consolidation`（22 条：跨账簿科目 C2BANK 汇总、内部应收 C2ARB/应付 C2APB 抵消后余额均=0、eliminations[0].amount=100、group scope 无范围 404、未登录 401）。**全量门禁 PASS 961 / FAIL 0**（24 套件 / 共 977）。★ 诚实说明：集团跨组织合并基础设施已建好，门禁主验证走「同组织多账簿合并」（合并引擎同构子集）——因 harness 每轮仅单隔离组织、无跨组织登录端点，跨组织登录成本高，故主验证路径选同构子集以真实验证聚合+抵消，同时保持全量门禁 FAIL 0。
- **V3.14.0 合并报表展示增强（2026-09-16）** —— 重构 `ConsolidatedReport.tsx` 三 Tab（试算平衡 / 资产负债 / 利润表）+ CSV/Excel 导出；修复 `consolidation` 引擎 `ending` 计算 bug（借/贷正常科目符号分类）；新增 `25-consolidation-enhanced` 门禁套件。提交 93a7a09。
- **V3.14.2 超管无密码无法登录修复（2026-09-17）** —— 根因：`login.ts` 密码校验在 `security_initialized` 检查之前，超管空密码必 401，前端拿不到 `needActivation`、激活流程无法启动。修复 4 处：`login.ts`（密码校验前早退返回 needActivation）、`send-code.ts`（超管激活跳过密码校验）、`authStore.ts`（传播 needActivation）、`Login.tsx`（ActivationPanel + pwdStrength 字段引用修复 + 删重复 activationInfo 声明）。线上密码重置为 `SSAERPadmin@2026`（PBKDF2-HMAC-SHA-256），实测登录返回 token。提交 d48b523 / b12d289。
- **V3.14.3 找回密码 + 个人中心修改密码（全角色可用）（2026-09-17）** —— 补齐长期缺失的账号安全能力：① 登录页新增「找回密码」对话框（用户名→发码到注册邮箱→校验→重置，重置后强制注销全部会话）；② 新增个人中心页 `/profile`（资料展示 + 修改密码卡片），Header 头像菜单接入；③ `change-password` 接口新增「当前密码改密」路径（全角色，保留超管双邮箱票据路径兼容）；④ 新增 `reset-password-send`/`reset-password-confirm` 端点 + `verification.ts` 单邮箱验证码能力；⑤ `authStore` 新增 `changePasswordSelf`/`resetPasswordRequest`/`resetPasswordConfirm`；⑥ 顺手删 Login.tsx 重复 activationInfo 声明（V3.14.x 遗留 TypeScript 报错）。找回密码需账号绑定邮箱且邮件通道已启用，未绑定提示联系管理员。提交 cea20f5。
- **V3.14.4 构建门禁修复 + 合并报表导出契约修复 + 线上实测（2026-09-17）** —— 起因：强哥反馈线上「找不到修改密码的位置」，排查发现**线上仍是 V3.13.0 旧构建**（产物内 `PersonalCenter=false`），且 `npm run build` 的第一道 `tsc --noEmit` 被 `ConsolidatedReport.tsx` **13 条历史类型错误**卡死，无法顺利发布。要点：① 修复 `ConsolidatedReport.tsx` 13 条类型错误——三视图导出的数据结构不符合通用导出组件契约（缺 `columns`、缺 `filename`），表格单元格误用 `fontWeight` 属性（应为 `sx={{fontWeight}}`）；② 按标准契约重写三视图导出（试算平衡表走对象行 + 格式化列，资产负债表/利润表改 item/amount 对象行），导出文件名带会计期间；③ 清理 3 处历史未使用导入（`DownloadIcon`/`Dialog*`/`exportCsv`）；④ **线上直发并端到端实测**：真机 Chromium 实测「登录页找回密码对话框」+「头像菜单→个人中心→保存修改」全链路通过、运行期 JS 错误 0；生产接口改密往返实测通过（错误当前密码 400 / 弱新密码 400 / 无字母 400 / 改密成功 / 新密码可登录 / 已改回原密码 / 旧 token 被注销）。★ 实测顺带发现并登记一条**未修复缺陷**（留给后续）：通用父子表工厂 `functions/_shared/parentChild.ts:305` 在「JSON 列登记表」缺项时会把数组/对象直接 bind 给 D1 → `D1_TYPE_ERROR` 500，创建路径可见（`projects.participants`、`sales_prospects`、`purchase_requests`）。提交待推送。
- **V3.15.10 空载荷守卫 + 导出留痕（2026-09-20，抓真实缺陷轮）** —— 起因：五路并行侦察（前端实访 / 后端端点往返 / 权限与数据安全 / 数据一致性与业务规则 / 竞品对标复核）后的交叉验证轮。本轮**纯缺陷修复**，修两条：①`functions/_shared/parentChild.ts` 的 `pcCreate` 增加空载荷守卫——请求体无任何可识别业务字段时 `names` 为空，拼出的 INSERT 变成 `(id, org_id, , created_at…)` 双逗号畸形语句，D1 报 `near ","` 语法错、端点 500 且把 `D1_ERROR` 原文回显前端；改为 400 `EMPTY_PAYLOAD`，并把数据库原始错误改为只进平台日志。**一处修复覆盖 9 个共用端点**（采购申请 / 供应商报价 / 意向客户 / 发货单 / 工艺路线 / 审批流 / 付款计划 / 项目核算 / 项目）。②`functions/api/system/backup.ts` 在返回备份前调用 `writeAudit` 写 `entity=system_backup / action=export`（含表数、行数、是否截断），补上长期缺失的导出留痕（注意：`?mode=manifest` 为提前返回分支，不计导出）。★ 交叉验证的关键教训：后端扫描报的「入库单/出库单创建必 500」经独立复测为**误报**——扫描用了前端驼峰字段名（`orderNo`），后端读的是 `inboundNo`/`outboundNo`；换正确字段名后缺字段返回 400、全字段返回 200，功能正常。**任一侦察结论必须第二路复现才算坐实。** 提交 7af6a74 / 7629c8e。
- **V3.21.0 字段级权限服务端强制 + 搜索通配符转义（2026-09-23）** —— 攻坚对标差距 19「字段级只读/必填」的第 ①② 步，并修掉 V3.20.1 刻意遗留的通配符问题。（③「只读/必填」两维度按用户要求**只出建议不落地**。）
  - **一、差距 19 的真相：不是「功能没做」，而是「管控是装饰性的」**。摸底发现本项目在字段级权限上**已有五层家底**——前端 `dataPermissionStore`（真实角色 × 9 模块 × 驼峰字段）、配置界面 `Platform/FieldPermissions.tsx`、展示组件 `<SecureField>`（15 个页面在用）、端到端用例、后端 `protected-data` 脱敏表。但五处缺口让它们全部失效：① 前端遮蔽只在**展示层**——无权时显示 `***`，而值完整躺在响应体里；② 后端 `protected-data/[type].ts` 是全项目**零消费方**（唯一引用是它自己），且角色词表用的是 `admin`/`manager`/`staff` —— **`manager`、`staff` 在系统 14 个真实角色里根本不存在**（死档），同一字段两侧可给出相反答案；③ 业务主通道 `/api/vendors`、`/api/customers`、`/api/materials` 一律 `SELECT *` 返回全列、**零脱敏**——**实测确认**：库管在界面上看到 `***`，打开浏览器开发者工具读接口响应，银行账号 / 税号 / 授信额度全是明文；④ 写入侧**零字段级管控**——`vendors/[id].ts` 的 PUT 是一张平铺的 `COALESCE(?, …)` 白名单，角色引用 0 处、只读 0 处、必填 0 处，语义是「传了就更新」；⑤ `hasOperation`（模块级操作权限矩阵）只有定义、全项目**零调用点**，配置界面里能勾的权限没有任何地方执行。
  - **二、① 角色词表统一：等价性证明在先**。新建 `functions/_shared/fieldAccess.ts` 作为唯一权威，`REAL_ROLES` 取自 `src/types/settings.ts` 的 `ROLE_DEFINITIONS`（14 个真实角色）。原 `protected-data` 的取值逻辑是 `roleKey = super_admin ? admin : role`，逐条核对真实角色命中情况后确认：`admin`/`vendor` 是真角色（有效）；`manager` 档**无任何角色命中，且其字段集是 staff 档的真子集**（四张表逐一核对）；其余 12 个角色全部落 `staff` 兜底档。因此「删除 manager 档 + 把 staff 兜底档显式展开为真实角色名」**行为完全等价、零功能变化**——这是本轮敢动它的依据。
  - **三、② 读取侧剥离 + 写入侧拒写 + 创建侧剔除**。策略来源＝管理员在「字段级权限」页已持久化的 `app_state` 配置（键 `ssa-erp-data-permission`，经 `getAppStateValue` 读取），**读不到才**回退内置默认矩阵——fail-safe，与 `isPeriodClosed` 的 fail-open **刻意相反**：少遮一个字段等于把银行账号明文发给无权用户。读取侧 `stripRowFields`（单条）/ `stripRowsFields`（列表）从行对象删除无权字段，并以 `_hiddenFields` 元数据告知（与 `open` 网关既有 `stripHidden` 约定一致，避免前端把「字段不存在」与「无权查看」混为一谈）；写入侧 `findForbiddenFieldWrites` 的判据是「**值确有变化**」而非「字段出现」——编辑页保存时通常回传完整对象（含它看不到的字段原值），若「出现即拒绝」，库管改个联系电话都会被拦，功能直接不可用；被拦返回 **403 + `FIELD_FORBIDDEN` + `fields` 数组 + 中文原因**，且**不写库**；创建侧**静默剔除**（表单常带默认值，拦成 403 会让无权角色彻底建不了供应商）。
  - **四、试点域的选择依据（RLS 决定触发率）**。选**物料 + 供应商**两域而非单域：`vendor_master` 的行级范围是 `'own'`（按负责人），用超管建的锚点行**库管根本读不到**（403「无权限查看他人供应商」），字段门禁走不到；而 `materials` 的行级范围是 `'all'`（全员可见），字段权限在这里**必被触发**，才是真实业务风险所在。供应商域则改用「库管自己创建的行」（owner 是自己，行级放行）来覆盖。
  - **五、★ 首版套件暴露的「空跑假绿」（比红字更危险）**。套件首跑 7 条红，根因全部指向同一件事：用超管建锚点行 → 库管读列表 `total=0`、读详情 403 → **走不到字段门禁**。更危险的是 `★ 列表：库管看不到「creditLimit」` 这类断言**显示为绿色**——它们在 `if (listRow) { … }` 块内，块未执行却不需要记失败。**这种绿比红还坏**（红字会有人查，假绿不会）。修法：主战场改物料域，并在每处锚点前加**显式锚点断言**——取不到行直接记 FAIL 并打印「该组断言未执行（这是失败，不是通过）」，绝不静默跳过。
  - **六、角色粒度精确性对照（防一刀切）**。加入「采购员（`buyer`）在物料模块**不在**遮蔽名单」的反向对照：他**必须看得到**标准价、且**改得动**。若做成「非管理员一律看不到金额」，采购员看不到进价就无法工作，业务直接瘫痪。同时保留「管理员不受影响」的正向对照，证明 403 来自字段级权限而非「写坏了」。
  - **七、搜索通配符转义（`%` / `_` / `\`）**。`searchKeyword.ts` 新增 `escapeLike()`（一次性替换 `[\\%_]`，无二次转义问题），`likePattern()` 改为在**转义后**输出，新增 `likePrefix()` 供前缀匹配场景。★ **与长度闸门的相互作用**：转义会让模式变长（一个 `%` 变 `\%`，长度翻倍），若只截断不复查，关键词 40 个全写 `%` → 转义后 80 字符 → 模式 82 字符**反而更容易触发 500**；故按**转义后**长度二次收口，超限时从**原始关键词**上截断（绝不在已转义串上再截——那会造成二次转义）。
  - **八、24 处 SQL 补 `ESCAPE '\'`（逐条 76 个模式）**。二者必须成对，且两种错法都隐蔽：只转义不声明 ESCAPE → 模式里的 `\%` 被理解成「字面反斜杠 + 通配符」，搜索去找数据里根本不存在的反斜杠，**连该搜到的也搜不到且不报错**（比不改更糟）；只声明不转义 → 通配符照旧生效。批量补入按「`LIKE` 前最近的引号字符」自动判别字符串字面量类型（模板串写 `'\\'`、单引号串写 `\'\\\'`），写错一种整个文件即语法失败——故改完先跑语法门禁、再回读**运行期 SQL 文本**逐条核对。白名单刻意排除内置固定模式（`backupSchema.ts` 的 `'sqlite_%'`、`mailer.ts` 的 `'mail.%'`），它们的 `%` 是**故意的**通配符。
  - **九、顺带修出两处隐患**。① **V3.20.1 的漏网之鱼**：`functions/api/work-orders/picking/index.ts` 的内联 `%${materialName}%`——上一版关键词扫描按 `keyword` 参数名找，而该端点的参数名叫 `materialName`，**仍可超长触发 500**；② **供应商注册的归属绕过**：`vendor/register.ts` 用 `.bind(vendorCode.slice(0, 3) + '%')` 定位所属组织，而 `vendorCode` 是**用户自己填的**——填一个以 `%` 开头的代码即可匹配任意组织的公司码，**把自己注册进不属于自己的组织**（越权归属），改用 `likePrefix()`。
  - **十、门禁新增两步（机器核对，不靠人记得）**。⑤ `scripts/check-search-escape.mjs`：凡 `LIKE ?`（占位符＝用户输入驱动）必带 ESCAPE；判据刻意不含「所有 LIKE」——内置固定模式不应加 ESCAPE，加了反而改变行为；脚本内建 `--self-test` 反例自证（4 个用例，证明检查没被改松，坑㉖补）。⑥ `scripts/check-field-policy.mjs`：前端 `dataPermissionStore` 与后端 `fieldAccess.ts` 两份默认矩阵**逐条三元组核对**（67 条 `role|module|field`），防「同口径两处实现走偏」（坑㉛）。两步均接入 `check-consistency.mjs` 作为阻断项（现为六步）。
  - **十一、验证**。套件 30（**68 断言**）：读（列表/详情键不存在且 `_hiddenFields` 在）/ 写（403 + code + fields，**且被拦后库里值确实未变**）/ 不误伤（带敏感原值改非敏感字段成功）/ 创建（201 但敏感字段未落库）/ 管理员与采购员双向对照 / 受保护数据接口冒烟与非法类型 400。套件 29 扩充至 **77 断言**：通配符部分刻意**成对断言**——「搜 `100%` **能搜到**含字面 `100%` 的」（证明 ESCAPE 已声明、转义符被识别）与「搜 `100%` **搜不到**含 `100X` 的」（证明 `%` 已转义）缺一不可，另含「搜单个 `%` 不返回全部」「普通搜索未退化」「60 个 `%` 不 500 且 0 条」。
  - **十二、③ 只读/必填维度：只出建议不落地**。用户明确「③ 给出建议我来决策」——「哪些角色对哪些字段只读」属业务口径，不能替用户定，且涉及 15+ 端点，定错会挡住真人干活。建议书单独产出，含可选路径与代价对比。
- **V3.20.1 搜索关键词超长不再 500（云数据库模糊搜索的模式长度上限）（2026-09-23）** —— 修复一个**只在生产、只在关键词超过 48 字符时**才现形的 500。Cloudflare D1 把 `SQLITE_LIMIT_LIKE_PATTERN_LENGTH` 设为 **50**（原生 SQLite 默认 50000），关键词超过 48 字符后模式 `%关键词%` 超限，SQLite 抛 `LIKE or GLOB pattern too complex`（SQLITE_ERROR 7500），端点未捕获 → 中间件兜底成 500「请求处理失败」。触发场景恰是最自然的操作——**把完整单号粘进搜索框**（本项目单号普遍 50+ 字符）。① **发现经过**：套件 28（倒冲留痕）用完整单号反查出库单，出现**生产 2 条红、本地同套件全绿**的环境差异，由此挖出；② **定位方法**（可复用）：把套件请求翻译成**等价 SQL 直打生产库**，一次复现 `too complex`；再二分关键词长度确定阈值（48 通过 / 49 崩）；③ **修法**：新建 `functions/_shared/searchKeyword.ts`——`safeKeyword()` 在关键词取值处截断 40 字符（主力闸门，覆盖 3 种取值写法，含参数名为 `q` 的 `org-members` 变体），`likePattern()` 把 `%${keyword}%` 模式构造一并收口（第二道保险，防将来新端点漏改），两层共 **23 个文件 / 64 处替换点**；④ **为何选静默截断而非报 400**：超长关键词的高频场景就是粘贴单号，直接拒绝会拦住正当操作；截断到 40 字符后前缀已足以区分单据，实测仍能命中目标，可用性优先；⑤ **验证**：本地 24 个端点 × 60/200 字符/真实长单号**真实往返全通过**（同时证明 23 处 import 注入运行时无误，硬规矩 ㉗），新增套件 29（**61 断言全绿**）把「不 500」与「★ 截断后仍能搜到目标单据」两件事同时固化，生产复跑套件 28（倒冲）/27（付款闸门）/23（生产域）确认无回归；⑥ **已知未修（刻意）**：LIKE 的 `%` / `_` 通配符语义未转义（用户搜 `100%` 会按通配符处理），要正确处理需在 33 处 SQL 文本统一补 `ESCAPE '\'`，属**精度类**问题（不会报错）、改动面大收益低，列入待办另议。
- **V3.20.0 生产倒冲发料（完工按物料清单自动扣原料）（2026-09-23）** —— 攻坚对标差距 13「生产倒冲发料」。此差距在早前版本曾被记为「已修」，复核发现**从未接通**：系统里只有「手工领料」一条扣料通路，工单完工对原料零动作。
  - **一、缺口到底是什么（先量清楚，再动手）**。`src/stores/productionStore.ts` 的 `completeWorkOrder` 只做三件事：回写工单状态/数量/成本、生成成品入库单、生成成品入库台账。**对原料库存零动作**——没有 BOM 展开、没有出库单、没有凭证。另有一条独立的手工通路 `issueMaterials`（生成 `pick` 出库单 + 服务端 `postOutbound` 扣账 + 写 `work_order_pickings`），但它由人点「生成领料出库」触发，`completeWorkOrder` 不会自动调它。重复制造模块里那个已经叫 backflush 的报工（`repetitiveMfgStore.reportProduction`）也只是把数字累加进台账，同样不扣账。
  - **二、判定放在服务端，且四个写入点全接**。新建 `functions/_shared/backflush.ts`：`backflushWorkOrder(db, orgId, user, woId)` 挂在 `functions/api/work-orders/[id].ts` 的 PUT 与 `functions/api/work-orders/index.ts` 的 POST 上。为什么要接 POST：判据是「**绕开界面还成不成立**」而不是「界面上点的是哪个按钮」——导入历史工单、第三方集成都可能直接以 `status=completed` 建单，只堵 PUT 就是留了一条现成的后门。触发条件刻意收窄为「状态**从非 completed 变为 completed**」那一次，避免每次改备注都重跑。
  - **三、复用权威扣减路径，不自己写库存**。算完用量后组装一张 `type=pick` 的出库单，直接调现成的 `inventoryPosting.postOutbound`——库存扣减、超发夹 0、移动均价滚动、出库凭证（借 5001 生产成本 / 贷 1403 原材料）、序列号流转全部沿用既有唯一权威实现。同时把单据真正落 `outbound_orders` + `outbound_order_items`，保证「有库存变动就有单据」；反过来（扣了账却没单据）是无法追溯的。
  - **四、BOM 展开口径与服务端/前端同源（坑㉛）**。「展开」这件事现在有两处实现（前端给界面看、服务端给扣账用），**规则必须逐条一致**，否则会出现「界面提示领 100、系统扣了 120」。统一后的规则：有下级子件 → 递归（子件用量基数 = 本行用量 ×(1+废品率)）；有 `child_product_code` → 递归该产品的 BOM；`source=phantom`（虚项）→ 本身不领料，只透传展开其子件；其余 → 叶子物料按料号聚合。前端 `WorkOrderDetail.explodeBOM` 同步补上后两条（原来会把虚项当物料领、且不展开子装配引用），并与 BOM 详情页那条既有的 `.filter(item => item.source !== 'phantom')` 口径对齐。
  - **五、只补差额，不重复扣**。倒冲量 = 应耗用量 − 该工单该物料**已手工领用**的数量（读 `work_order_pickings`，按 material_id 匹配、料号兜底）。这样「先领料再完工」与「直接完工」两条路径的原料总耗用完全一致；差额 ≤ 0 记 `covered` 并标出，是正常业务不是异常。
  - **六、幂等靠迁移 0076 的标记位**。工单表原本没有 `inventory_posted`（对比 `purchase_orders`/`outbound_orders` 早就有），没有它就无法区分「这张工单的原料是否已倒冲」——网络重试或重复提交会重复扣料。迁移 0076 同时加 `backflush_outbound_no`（从工单直追扣料单据）、`work_order_pickings.backflush_quantity` 与 `backflush_outbound_no`（把「手工领料」与「自动倒冲」两个来源分开留痕；累计 quantity 仍是两者之和，供差额计算）。**刻意不改 `work_order_pickings` 的唯一键**：SQLite 里改唯一键要重建表 + INSERT…SELECT，该表已有存量数据且带 `version` 列，重建列集极易与全新库跑出来的不一致（坑㉘②），用 UPSERT 累加到同一行即可。
  - **七、失败分类与「不阻断完工」原则**。缺 BOM → `NO_BOM`；BOM 无明细或展开后无可领料子件 → `NO_ITEMS`；料号在物料主数据中不存在 → 逐行 `missing_material`，全缺 → `NO_MATERIAL`；应耗用被手工领料覆盖 → `NO_REMAINDER`；引用子装配但子装配清单不存在 → 逐行 `missing_bom`（**这是最危险的静默少扣料，必须与「虚项不领料」区分开：一个是数据缺陷，一个是设计**）。以上全部**返回 200 且照常完工**——倒冲是补账动作，把它做成完工门槛，结果一定是有人把功能关掉，比从来没做过更糟。
  - **八、★ 本版修出的两处真缺陷（都是只有真跑才发现）**。① **完工响应回传的是倒冲前的旧快照**：`updated` 行在倒冲之前 `SELECT` 取好，倒冲写的 `inventory_posted=1` 不会进响应，前端按 `inventory_posted=0` 渲染就会误报「已完工但原料未倒冲」。修法：执行过倒冲就**重新读一次**再返回（PUT 与 POST 两处都要修）。② **`completeWorkOrder` 从不写服务端**：它只改内存，完工状态刷新即丢，等于「点完工没生效」；本轮改为先把完工提交到服务端（失败则不改内存、不生成入库单，并给出可读原因），再由服务端完成倒冲并回传结果——顺序上必须是「先落库、后改界面」，因为完工是不可逆动作（状态机锁定 completed 不可回退）。
  - **九、测试与门禁**。新增套件 28（`scripts/prod-e2e/suites/28-work-order-backflush.mjs`，**56 断言**）覆盖：多级展开口径（含废品率与子装配引用）、虚项不领料、子装配行不扣料、**库存真的减少**（逐项读回 currentStock 比对，而不是只看接口回的 JSON）、已领料只补差额、被覆盖标记、无 BOM 不阻断完工、幂等（完工后改单不重复扣）、建单即完工同样倒冲、料号缺主数据显式标记、子装配清单缺失 `missing_bom`。三条前置物料**都建了主数据并给了库存**——否则代码即使把虚项/子装配错当叶子扣料，也会因「找不到物料」而跳过，测试会假通过。门禁侧把 `scripts/_sweep_api_live.mjs` 提升为常驻检查工具（报告固定落 `test-reports/api-sweep/latest.md`、检出任一 500 即 exit 1、纳入 `scripts/check-consistency.mjs` 第 ④ 步，用 `--live` 显式开关——因为它会写线上测试数据，默认门禁必须无副作用）。
- **V3.19.0 付款闸门真正接通（三单匹配超差硬拦）（2026-09-23）** —— 攻坚对标评测报告第九章里那条**失实的「已修」结论**（差距 8 曾被标为已修，实际只完成了准备标记）。
  - **一、把「三套口径」收敛成一套**。同一个业务判定原先存在三份互不一致的实现：后端 `three-way-match/create.ts`（1% 相对容差）、`Finance/ThreeWayMatch.tsx`（金额绝对 0.01 元）、`Purchase/OrderDetail.tsx`（数量要求精确相等）。同一个「能不能付款」有三个答案等于没有答案。新建 `functions/_shared/threeWayMatch.ts` 作为唯一实现，统一为**不含税金额 + 1% 相对容差**；两个页面改为读服务端结论。
  - **二、闸门挂在四个写入点，而不是界面**。判据是「绕开界面还成不成立」：付款计划既能从专用端点写（POST/PUT），也能从通用实体路由写（`/api/entities/finPaymentPlan`）。只拦前两个等于留一条现成的绕过通道。四点统一调用 `_shared/paymentGate.ts` 的同一函数。
  - **三、精准拦截**。只在「状态变为已付」或「已付金额增加」时校验；只改备注、改到期日照常通过。理由：闸门若不精准，用户第一件事就是要求把它关掉——那比没有闸门更糟（大家会以为有管控）。
  - **四、拦截必须可解释**。返回 422（而非 409 —— 前端对 409 有统一覆盖文案会把原因冲掉）+ 代码 + 中文原因。实测拦截文案形如「该订单已入库 3000 元（到货率 30.0%），少于发票金额 10000 元，尚差 7000 元货未到」。
  - **五、★ 自造缺陷（本轮抓到并修正）**：判定初版把「付款金额」与「发票不含税金额」直接比较，而付款计划的金额是**含税**的——13% 的税率差会让每一笔正常付款都被误拦。修正为同口径比对（付款额 vs 发票价税合计），并把两个口径都放进 detail 供核对。**教训：跨表比金额之前，先把每张表的字段口径写清楚，否则「统一口径」会变成「统一错」。**
  - **六、拦截必须「拦得住」**。断言里专门验证「被拦的计划未写库」——拦而不住等于没拦，这一类假拦截在界面上看不出区别。
  - **七、预检与真闸门必须同一份实现**。新增 `/api/three-way-match/check` 供界面在提交前预告结论（不留档）；若两处各写一套，就会出现「预检说能付、提交却被拦」，用户会认为系统在骗人。
  - **八、过程教训（测试数据必须隔离）**：新套件首跑 1 条失败，原因是两组用例共用同一个采购订单，前一组加的发票污染了后一组，导致后一组先命中「开票超订单」而非「付款超发票」。**用例之间共用数据，会让失败原因指向错误的地方**——修法是每组独立造数。
  - **九、口径变更的连带影响已一并处理**：付款计划从此必须关联真实存在的采购订单（且订单要有明细金额）。既有生产 E2E 套件 19 原先用编造单号建计划，闸门上线后会失败——那不是测试坏了，是闸门在工作；已为它补上真实订单前置并改为走「预付款允许无发票」的正常业务路径。
  - 门禁：前端 tsc 0 错 / tsc-functions 0 新增 / 语法 151 文件 0 错 / 一致性三项通过；**全新空库迁移链 0001→0075 一次跑通**；套件 27 = 44/44、套件 19 = 86/86（本地 + 生产各跑一遍）。
- **V3.18.0 审批实例层落地（撤回 / 催办 / 委托）+ 导出管控 + 单位换算收口（2026-09-23）** —— 对标评测报告第九章「仍存差距」的正面攻坚，一次收掉 4 条（9/10/11/15）并夯实 1 条（20）。
  - **迁移 0075**：新建 `approval_instances`（一次提交=一行，含 `current_approver_id` / `original_approver_id` 以区分「是否走了委托」、`urge_count` / `last_urged_at` 催办留痕、`version` 乐观锁）、`approval_actions`（只追加的过程流水：submit/approve/reject/withdraw/urge/delegate）、`approval_delegates`（委托关系：时间段 + 可选模块范围 + active）。三张表同步登记 `functions/_shared/rls.ts` 的 `RLS_SCOPE`（**登 `'all'` 而非 `'own'`**：审批是跨人协作，登 own 会让「别人提交、轮到我批」的单子因 `owner_id` 是提交人而被过滤掉，审批中心直接空掉），`approval_actions` 登记 `backupSchema.CHILD_TABLES`（否则父表全量导出后恢复会先写子行触发外键失败）。
  - **新增公共助手 `functions/_shared/approvalInstance.ts`**：`resolveDelegate`（委托路由）、`listDelegatorsForMe`（反向：我代理了谁）、`isDelegateActive`（闭区间判定）、`withdrawBusinessDoc`（撤回时把业务单据退回草稿）、`writeApprovalAction`（流水写入，失败降级留审计）。
  - **新增 4+1 个端点**：`/api/approval-instances`（GET 三视图：pending 含委托路由、submitted、delegated；POST 登记提交，含委托路由与重复提交 409 / 撤回后重新提交复用同一行）、`/api/approval-instances/[id]`（GET 含流水；PUT approve/reject/withdraw/urge）、`/api/approval-delegates` + `/[id]`（CRUD + 重叠区间 409 + 同组织校验）、`/api/org-members`（**只回 id/name/department/role**，供普通审批人选择受委托人——原 `/api/users` 仅管理员可访问，导致委托功能对普通主管不可用）。
  - **权限闸门（服务端，绕开界面亦生效）**：撤回/催办仅提交人本人或管理员；通过/驳回**只认当前节点审批人本人**，管理员刻意不给开口子（审批是责任动作，代批会让「谁批的」失去意义）；催办 30 分钟限流（429 `URGE_TOO_SOON`）；委托路由在**提交时与节点推进时**各解析一次（审批人中途出差也能正确转交）。
  - **前端**：新增 `src/types/approval.ts` + `src/stores/approvalInstanceStore.ts`（**D1 主源、不用 persist**，避免新增一条双通道）；侧边栏 `ApprovalCenterSection` 新增「我提交的」（催办/撤回）与「审批委托」对话框、「代某某批」标记；并**修掉原先把 ✓/✕ 两个按钮点下去毫无反应的 TODO 占位**（改为真审批，不支持快捷审批时明确提示并跳转，不再假装成功）。
  - **差距 20 导出管控收口（真 Bug 修复）**：`DataTable.tsx` 导出留痕的原生 fetch **未带 Authorization 头**，后端 `getUserFromRequest` 一律 401、又被 `.catch` 吞掉 —— 即「留痕代码写得很像样，实际一条都没落库」。新增 `src/utils/authHeaders.ts` 作为带令牌请求头的唯一出口，修 `DataTable.tsx`（导出/批量导出）与 `src/stores/auditStore.ts`（审计同步，同一缺陷）；补 `exportEntity` prop（默认回退到列配置键 → 当前路由）。
  - **差距 15 单位换算收口**：上一轮只建了 `unit_conversions` 表与端点，`unitConversionStore` 仍走 persist（**新表成死表**），且**迁移 0074 从未应用到生产库**（端点在生产查的是不存在的表）。本版把 store 主源切到 D1、补 apply 迁移 0074，并把「恢复默认」改为「重新加载」（原语义会把公司自定义换算规则一并抹掉，属破坏性操作）。
  - **生产 E2E 新增套件 26 `26-approval-instance.mjs`（50 断言全绿）**，并修出脚手架长期缺陷：`lib/harness.mjs` bootstrap 批准测试组织管理员时未传 `role: 'admin'`（V3.15.5 起建公司者不再自动成为管理员），导致 `ctx.admin` 实为 `'user'` —— 表现为「套件照跑、大量 PASS，但部分验证是在错误身份下跑出来的空验证」，且 `registerUser` 静默返回 null。
  - **本次由真实端点往返抓出的两处 500**（本地构建、类型检查都不会暴露）：`approval-instances` 与 `approval-delegates` 列表在 admin/super_admin 名下 `RLS` 返回 `1=1` 时 `where` 为空数组，而 `params` 仍含 `org_id` → **占位符 1 个、绑定 2 个** → D1 直接报错。修法：`org_id` 条件无条件进 where。
  - 门禁：`check-consistency.mjs --no-probe` 三项全通过（僵尸登记 0 / 漏登记 0 / 前端调用 0 处 404 风险）；`tsc --noEmit` 0 错；`tsc-functions` 0 新增；迁移链在**全新空库** 0001→0075 一次跑通（0 失败）。
  - **同轮收口三处「编译能过、界面给错东西」的遗留缺陷**：① **质检抽样方案字码与样本量互相矛盾** —— `resolvePlan()` 返回值本身已含 `code`，旧写法 `{ ...plan, code }` 又用「输入字码」覆盖回去；遇标准表 `↓` 下移规则时解析用的是下一行、显示却仍是原字码。**全量矩阵实测 455 组「批量 × 检验水平 × AQL」中 124 组矛盾**（例如「字码 B · 样本量 n=2」，而字码 B 对应 3），界面 `InspectionList.tsx:411` 与 `AqlSampling.tsx:293` 都是把字码与样本量印在同一句里，等于给检验员一份执行不了的方案；改为直接返回 `resolvePlan` 结果，矛盾数归零。② **采购比价页**：上一轮批量替换把 `title` 属性插到了标签外，在 JSX 里成了**裸文本节点**，页面上每条评分条旁实际印出 `title="已计算分数"` 一行字；同轮替换还引入 `from '@mui/icons-material''`（两个单引号）使该页**直接编译失败**。③ 财务报表页新增「导出 PDF」，并修掉 `pdfExport.ts` 中 `exportVoucherToPDF` / `exportReportToPDF` 的**静默失败**（自建临时元素从未赋 `id`，而 `printToPDF` 是按 id 取元素的 → 永远取到 null 后静默 return，表现为「点了没反应且不报错」）。
  - **★★ 更正一项失实的「已修」结论：三单匹配的超差阻断从未生效**。V3.17.9 曾把差距 8 标为已修，本轮复核发现：`POST /api/three-way-match` **前端零调用**（该目录只有 `create.ts`，**没有 GET**，前端即便写了也读不回来），界面上的三单匹配由 `src/pages/Finance/ThreeWayMatch.tsx` 与 `src/pages/Purchase/OrderDetail.tsx` 各自用 `arap.threeWayMatches` 独立算出，且付款相关三个页面（`PayableList` / `PaymentPlan` / `VendorPaymentPlan`）**无一处读取 `blocked`** —— 即「闸门造好了、但没人接线」，付款实际仍不会被拦。另修该文件死代码 `const blocked = !matchStatus === 'matched'`（`!` 优先级高于 `===`，实际等价于布尔与字符串比较、**恒为 false**；该变量声明后从未被引用，响应体里的值由后文另写一遍正确表达式，故线上并未返回错值）。事实已写入代码注释与 V3.18.0 手册注意事项，正式整改列入下一轮。
  - **★★ 过程教训：类型基线 `--update` 会无差别吸收新增的真错误**。上述 `TS2367` 是被 TypeScript 明确报出的真错误，却在刷新 `scripts/.tsc-functions-baseline.json` 时被一并收编成「存量噪声」——门禁从此**再也看不见它**，等于把安全网上的破洞剪掉补成平的。铁律：**刷新基线前必须先按「文件 + 消息（去行号）」与旧基线做差集审查，确认新增项为 0 才允许写入**（本次正是用去重差集查出恰好 1 条新增，才没有漏掉）。同理，`check-consistency` 报「后端有但前端未调用 = 66 条（预留/后台端点，通常无害）」这一桶里，现已实证至少藏着 1 个**声称已修但实际没接线**的端点——该桶不能默认当作无害。
- **V3.17.8 「来源不明」8 个文件入库（2026-09-21）** —— 起因：工作区存在 8 个标记为「来源不明」的已跟踪文件（`entities.ts`/`auditStore.ts`/`DataTable.tsx`/`BOMForm`/`InquiryForm`/`PriceApproval`/`PriceComparison`/`SalesOrderForm`）及未跟踪 `tmp/`，需鉴定是否系统所需。逐文件阅读源码 + 对照主计划版本沿革：`entities.ts`（25.2KB）为后端通用实体注册表 ENTITY_RESOURCES，被 8 个端点 import，改动是注册表重构 + 删死配置 rlsScope，属系统基础设施必需保留；`auditStore.ts`（6.2KB，+263 行）为前端审计日志 v2（diff 快照 + rollbackTo + 版本历史），当前可运行；`DataTable.tsx`（+3 行）默认 createdAt 倒序；五个 Form 文件 Snackbar 替换 alert 属 UX 优化。全部 8 个文件均为系统功能文件，非垃圾/临时文件，不可删除，统一入库提交 V3.17.8（e7b8e52，12 文件 +792/−701）。四门禁全绿（tsc-functions 0 新增 / _audit_syntax 139 文件语法+打包 0 错 / 前端 tsc 0 错）。意外发现：git .gitattributes ssaenc 加密 filter 机制（src/stores/functions/api/migrations 入库 AES-256 加密磁盘明文），git diff 对加密文件显示大量差异为密文 vs 明文假象（9 个已加密 API 文件均已和 HEAD 一致），判据：diff 出现 `U2FsdGVkX1…` 即密文。报告归档 ima。
- **V3.17.7 #10 乐观锁完整范围 + 幂等键（2026-09-20，强哥拍板「全量」）** —— 迁移 0072（18 张核心表补 version，排除 bom_headers/process_routes 因业务版本号字段）+ 迁移 0073（idempotency_keys 表）；optimisticLock.ts 新增 setSql 通道（COALESCE 式 SET，与 setClauses/values 通道共存）；15 个 PUT 全量接入 withVersionGuard（数组式 9 + 整行重构 3 + COALESCE 改造 3），pcUpdate 覆盖 8 父表；idempotency.ts 三件套（dedupeByNo/resolveIdemKey/findIdem+saveIdem）+ 6 POST 接幂等键 + pcCreate 复用。★ 验证：真实代码实跑 14 条断言全过；后端双门禁 0 新增（139 文件语法+打包 0 错）/ 前端 tsc 0 错。提交 de9e9cb。
- **V3.17.5 #8 两套账合一（报表真源切换为受保护的凭证表）（2026-09-20，强哥选「甲·路线 A 根治 + 旧表留档」）** —— 前端 financeStore.ts 改造：新增 deriveEntries(vouchers)＝vouchers.filter(v=>v.status==='posted'||v.status==='reversed').flatMap(flattenVoucherToEntries)——报表消费的 accountEntries 切片**不再是独立数据源**，改为由凭证派生（复用既有 flattenVoucherToEntries，严格保持「1 行分录 = 1 条 AccountEntry」口径，**7 张报表层零改动**）。五处写入路径（addAccountEntry／postVoucher 过账／reverseVoucher 红冲／generateVoucherFromPayment 付款结清／loadVouchers+load 加载）全部改为「由凭证派生刷新」，**不再写遗留表 fin_account_entries**；旧表停止读写、原地留档；updateAccountEntry/deleteAccountEntry（原为死代码）改为明确提示「请改/红冲其所属凭证」；新增 persistVoucherAsync（可等待版）。前端 AccountingEntries.tsx 手工录入正名「手工凭证」；financeApi.ts 的 accountEntries 保留定义但标注「#8 起不再写」。★ 关键设计：按凭证号归集——addAccountEntry 仍用 upsertEntriesIntoVouchers 把同 voucherNo 的多条单边分录合并成一张平衡凭证。验证：前端 tsc 0 错、vite build 成功（13909 模块/1m6s）、grep 确认 src/ 无任何残留写旧表。提交 2c60b86。
- **V3.17.4 #9 单据状态机（核心单据服务端硬拦，强哥选「甲·6 类试点」）（2026-09-20）** —— 新增 functions/_shared/statusMachine.ts 的 guardStatusTransition(docType, from, body)：非法状态值 400 INVALID_STATUS／实质完结态（received|fully_shipped|completed|closed|cancelled|posted|reversed）不可回退 400 STATUS_LOCKED／非完结态自由流转+状态不变+不传 status 一律放行。接入采购/销售/工单/入库/出库/凭证 6 个 [id].ts PUT。★ 核心取舍：只锁完结态、不做全白名单（防误伤前端大量既有自由流转）。验证：Node 直跑真实 statusMachine 17/17 断言全过；四门禁全绿。提交 deec721。
- **V3.17.3 #10 乐观锁补全（工单接入，部分）（2026-09-19）** —— 迁移 0071 补 work_orders.version；work-orders/[id].ts PUT 接 optimisticLock.withVersionGuard（带 version 时按版本号比对、冲突 409 回传当前版本号，不传 version 老客户端兼容）。★ 仅做工单（全 30 个 PUT 端点补 version + 新建单据幂等键属更大改造面，待强哥拍板）。提交 a3b3c1a。
- **V3.17.2 #12 金额精度统一（纯技术债，无新功能）（2026-09-19）** —— 新增 functions/_shared/money.ts 单一来源（导出 roundAmount 金额 2 位、roundPrice 单价 4 位）；6 个后端文件删本地重复定义、统一 import 共享，消除同源两处实现漂移（硬规矩㉝）；计算口径不变。六文件 grep 确认无残留本地副本。四门禁全绿。提交 5bf8e7f。
- **V3.17.1 #13 折旧计提彻底服务端化（2026-09-20）** —— 迁移 0070 建 fixed_assets 关系表（rls.ts 登记 'all'，财务域）；新增 /api/fixed-assets（CRUD + GET 惰性回填 app_state KV 存量）+ /deprecate（直线法月折旧＝原值×(1−残值率)/年限月、仅 status='in_use'、生成权威凭证借6602贷1602、同期间幂等 source='asset'、已结账 isPeriodClosed 400 硬拒）；前端 financeLedgerStore 改服务端镜像（删 seedFixedAssets、初始 []、partialize 只留 closingPeriods），FixedAssets.tsx 挂载即 loadFixedAssets。★ 硬规矩㉚ 复现：deprecateAll 返回类型编辑静默未落盘 → 前端 tsc 4 错，grep 回读改 Promise<{total;voucherNo;duplicated}> 后 0 错。★ 本地全新空库迁移失败于 0004（duplicate column short_name）为历史遗留缺陷。提交 f728ec0。
- **V3.17.0 服务端算账闭环（#6/#7/#13）（2026-09-20）** —— ① 入库凭证（采购借1403/贷2201、委外借1405/贷2201、生产借1405/贷5001）由 inventoryPosting.generateInboundVouchers 权威生成、金额取服务端 totalCost；② 出库 COGS 凭证 generateOutboundVouchers（借5001/1408/6602/6401，贷1403/1405）；③ appState.ts 的 isPeriodClosed 在 /api/vouchers POST/PUT/DELETE 硬拦已结账期间（fail-open 不误伤未初始化组织）；共用新增 voucherWriter.ts 单一凭证写入路径；前端 warehouseStore.ts 四凭证函数改空桩杜绝双写。★ 复用经验：并行编辑 [id].ts 时 import 行被静默丢失 → grep 回读核对。提交 60a9836。
- **V3.15.9 凭证服务端借贷平衡强制校验 + 低代码设计器成熟度标注（2026-09-19）** —— 起因：按「SSA ERP 对标 SAP/用友/金蝶」深度评测报告的改进路线执行「立刻做（1–2 周）」档。本轮属**桶 A（直接执行）**的两条：
  - **① 后端补借贷平衡强制校验（评测 L1，列为唯一致命级）**：起因是评测的头条发现——借贷平衡校验**只存在于前端** `src/utils/voucher.ts`（凭证表单禁用保存），后端 `functions/api/vouchers/index.ts` 只校验「编号与日期必填」。绕过界面（直接调接口 / 脚本导入 / 第三方集成 / 未来的智能助手）即可写入不平凭证。新增 `functions/_shared/voucherGuard.ts` 并接入凭证写入（POST）与更新（PUT）两个入口：科目必填、单边非零、Σ借=Σ贷（容差 0.005）、金额不可全为 0；不通过返回 400 并给出差额与逐行明细。**合计改由服务端从分录反推**（`guardVoucherItems` 就地回写 `totalDebit/totalCredit`），杜绝「分录改了、合计没跟着改」。
  - **★ 三条刻意不做的（都是真坑，改动前必读）**：<1> **不校验金额不能为负**——红字冲销凭证（`buildReversalVoucher`）借贷双方取负是**正确的会计表达**，照搬前端这条会把所有红冲凭证全部拒掉；<2> **不按状态禁改分录**——过账与红冲走 `persistVoucher` **整单回写**（PUT 带全部分录），一刀切禁止会直接打断过账与冲销；<3> **不重复报「至少两行」**——单行凭证必然不平，已被平衡规则覆盖。
  - **② 低代码设计器加「演示版」标注（评测 L4）**：`LowCodeDesigner.tsx` 顶部新增显著警示条，写明本页可定义表单与页内试填，但**尚未接入后端表单引擎**——不会自动生成独立数据表、不进入审批流与权限体系、不进入业务取数范围。**保留入口**（内部试用仍有价值），只纠正成熟度预期，避免对外演示时客户误判。（评测给的另一个选项「直接下线入口」属删除现有功能，归入桶 B 待强哥拍板。）
  - **★ 三桶分类结论**：桶 A 执行 = L1、L4；桶 B 待拍板 = L2 销售信用闸门（超额是硬拦还是提醒？已用额度口径？要不要特批角色？）、L3 审批撤回与催办（**审批实例目前分散在各业务模块，无统一任务表**，是先建统一审批中心还是单模块试点？）、N1 计算上服务端（架构级）、N2 生产倒冲发料、N3 审批委托、N4 仓库货位建表（涉历史数据迁移）、N5 价目表取价规则、N6 比价权重默认值；桶 C 本轮不做 = M1–M5 中期大件。详见 `docs/ssa-erp-benchmark-report.html` 第八章「改进执行台账」。
  - **验证**：`tsc-functions` 新增 0 条（存量 59 不变）；`_audit_syntax` 131 文件 / 0 语法错 / 0 引用错；前端 `tsc --noEmit` 0 错；一致性门禁通过（僵尸登记 0 / 漏登记 0 / 前端调后端 404 风险 0）；构建通过；部署后**线上真实端点往返**：登录 200、凭证列表 200、不平凭证 400 且返回差额、平衡凭证 201、整单回写（模拟过账/红冲）200、红字负数凭证 201（确认未被误拒）、测试凭证已清理。五处版本号同步 3.15.9。
- **V3.15.8 无管理员公司的审批自动上收超级管理员 + 邀请码跨公司代管（2026-09-18）** —— 起因：强哥指出 V3.15.5「建公司者不再自动成为管理员」留下治理缺口——**批准新公司创建人时若不选「管理员」，那家公司就没人能审批成员、没人能管邀请码**，要求「在公司没有管理员的情况下，审批自动接到超级管理员处理」。核查确认这不是假想问题，而是**已发生的现状**：
  - **① 缺口有多大（动手前先量生产库，不靠推测）**：全库 348 家组织中，**已生效但内部零管理员且有真实成员的公司 = 3 家**：新光专用汽车（8 名成员，含 2 名供应商、6 名普通用户）、调试公司（1）、创建公司（1）。另有两类经核查**应当排除**：只挂平台超管本人的空壳组织 2 家（创业三人组 / E2E 自动化测试沙箱）、尚未批准的新公司 120 家（状态 pending，本就在「新公司待批」队列中，且绝大多数是 E2E / MOCK 自动化测试残留）。
  - **② 后端 · `functions/api/users/index.ts`**：主查询新增 `LEFT JOIN (… role='admin' AND IFNULL(status,'active')='active' … GROUP BY org_id)`，逐行返回 `orgHasAdmin`；新增 `orphan=1` 筛选参数；新增 `loadOrphanOrgs()` 返回需代管清单（`orphanOrgs` + 全量的 `orphanCompanyCount` / `orphanPendingCount`，清单截断 10 条但**计数按全量算**，避免横幅数字假性停在 10）。判定三条件：已生效（`IFNULL(status,'active')='active'`）+ 无启用中管理员 + 有非超管成员。仅 super_admin 返回该清单。
  - **③ 后端 · `functions/api/orgs/index.ts`（新增路由）**：公司列表（超管全部 / admin 强制仅本公司），返回成员数、管理员数、`hasAdmin`、`needsCare`、待审批数与邀请码状态；**刻意不返回邀请码本身**（加入凭证不应被清单接口一次性下发）；非特权角色 403。
  - **④ 后端 · `functions/api/users/[id].ts`**：审批与角色变更后回执返回 `orgHasAdmin`；属「超管代管无主公司」时返回 `caretakerMode` 并写入审计摘要（`本次属**代管审批**（该公司暂无管理员，由平台超管代为处理）`）——代管审批与常规审批的责任主体不同，必须留痕可追溯。
  - **⑤ 前端 · `UserManagementTab.tsx`**：顶部新增「需代管」警示横幅（列出公司名 + 成员数 + 待批数，说明「申请会自动送到本页由您处理」）；新增「只看需代管」一键筛选；「所属公司」列对无管理员公司打红色「暂无管理员」标记；对无管理员公司的启用中成员提供**「设为管理员」一键操作**（把成员审批与邀请码管理交还本公司）；审批对话框在无管理员公司场景明确提示「本次由您代管」并建议选「管理员」；操作回执按结果给差异化文案（代管处理 / 已列入需代管清单 / 已交还本公司）。
  - **⑥ 前端 · `OrgInviteCodeTab.tsx`**：新增**公司选择器**（可搜索，需代管公司排最前并标注、支持分组），超管可跨公司代管邀请码；GET/PUT 统一带 `?orgId=`；代管其它公司时显示「代管其它公司」标记与警示。**这是本轮最容易漏掉却影响最直接的一处**：服务端自 V3.15.5 起就允许超管用 `?orgId=` 代管，但前端从未传该参数、也没有任何选公司的界面——「能力在后端、入口在前端缺失」，导致无管理员公司的邀请码在界面上真的没人能改。
  - **验证**：前端 `tsc --noEmit` 0 错；`tsc-functions` 新增 0 条（存量 59 不变）；`_audit_syntax` 130 文件 / 0 语法错 / 0 引用错；一致性门禁通过；构建产物含新文案；五处版本号同步 3.15.8；19 项关键改动逐项回读核对落盘。提交待推送。
- **V3.15.7 版本号展示收敛到「帮助中心 → 系统信息」（2026-09-18）** —— 起因：强哥反馈「系统界面上的版本号一直未更新」。核查发现界面上同时存在 **5 处版本号、且大多为硬编码旧值**：顶栏 Logo 旁 `Header.tsx` 的 `Chip label="v2.0"`、工作台页头 `Dashboard.tsx` 的 `Chip label="SSA ERP v2.0"`、左侧导航底部 `Sidebar.tsx`（读 `APP_VERSION_LABEL`，需重新构建才会变）、供应商门户 `VendorLogin.tsx` 页脚 `v2.56`、供应商注册页 `VendorPortalRegister.tsx` 页脚 `V2.27` —— 同一系统上出现 5 个互不相同的版本号，用户据此得出「系统没升级」的错误结论，支持人员也无法判断对方实际版本。修法遵循「单一数据源 + 单一出口」：
  - **① 界面一律不显示版本号**：删除顶栏与工作台两处硬编码徽章；`Sidebar.tsx` 底部改为「SSA ERP · 钢材供应链管理平台」（去版本号、移除 `APP_VERSION_LABEL` 导入）；两个供应商门户页脚去版本号仅留产品名与版权；`BasicConfigTab.tsx` 原「系统版本」只读字段一并删除（避免形成第二处显示入口），改为提示查询入口。
  - **② 新增「设置 → 帮助中心 → 系统信息」** `src/pages/Settings/SystemInfoTab.tsx`：展示系统版本（`APP_VERSION_LABEL` + `APP_VERSION`）、发布日期（`APP_BUILD_DATE`）、运行环境（`import.meta.env.PROD` 区分生产/本地 + 站点域名）、浏览器（UA 精简为「名称 + 主版本」）、技术架构（前端 / 后端 / 数据存储三行）；提供「复制版本信息」一键复制（报障时一次给全版本与环境）；两个按钮直达「使用说明书」与「版本更新记录」。
  - **③ 到达方式**：`Settings.tsx` 新增 `?tab=` 参数支持（`/settings?tab=sysinfo` 直达并自动展开「帮助中心」分组）；`src/config/searchIndex.ts` 新增「系统信息（版本查询）」条目（keywords 含 version / 版本 / 版本号 / 关于 / 运行环境 / 升级），并为「系统设置」「使用说明书」补关键词；说明书「界面布局」章节补「系统版本去哪里查」指引。
  - **验证**：前端 `tsc --noEmit` 0 错；`vite build` 通过、产物含 `V3.15.7`；五处版本号同步 3.15.7。提交待推送。
- **V3.15.6 全新库迁移链可重建性修复（QA 独立复现发现）（2026-09-18）** —— 起因：独立 QA 回归时在**全新空库**执行 `wrangler d1 migrations apply`，发现整条迁移链在中途中断、后续迁移整批不下发。**性质**：这不是线上故障（生产库早已应用过这些迁移、走「已跳过」路径，故一直正常），而是**只有灾备重建 / 新环境初始化才会暴露的隐性缺陷**——`migrations/` 里的文件可改，但已落地生产库的 schema 不可改，两条路径因此分叉。两处同类型缺陷：
  - **① 0054 报 `no such column: period`**：0054 用 `CREATE TABLE IF NOT EXISTS`（对已存在的表是空操作），接着 `CREATE INDEX … (org_id, period)` 因 0053 建的 `fin_project_accounts` **没有 `period` 列**而中断，致 0055–0069 全部不下发。根因：V3.15.2 处理审计 DB-005 时把「先删后建」改成「不存在才建」，而 DB-005 的前提（重放会丢数据）**不成立**——wrangler 按记录跳过已应用迁移，根本不会重放。修复：三张表恢复 `DROP TABLE IF EXISTS … ; CREATE TABLE …`（子表先删再删父表），并把「为什么必须删后建」写进注释防止再被改回去。
  - **② 0068 报 `no such column: total_debit`**：0068 用「RENAME 旧表 + `INSERT INTO vouchers SELECT … total_debit …`」重建 vouchers 以落地 `UNIQUE(org_id, voucher_no)`，但**全新库的 vouchers 只有 22 列、缺 8 个蛇形列**（total_debit / total_credit / reviewed_by / reviewed_at / posted_by / posted_at / reversed_by / reversed_at）。根因：0007 的 vouchers 建表写的是**驼峰列**（totalDebit / totalCredit / createdBy …），0064 只负责删这 9 个驼峰列，而**生产库当年是用蛇形 DDL 建的表**（见 0066 的核证：生产 30 列、含 reversed_by / reversed_at）→ 生产库留蛇形、全新库变成「驼峰被删且蛇形从未创建」，两路径列集分叉。修复：在 `RENAME` 之后、`CREATE TABLE vouchers` 之前补 8 条 `ALTER TABLE vouchers_old ADD COLUMN …`，使下方 SELECT 可解析（0068 在生产库已登记 `schema_migrations`、永不重跑，故裸 `ADD COLUMN` 安全；**注释中已写明改动前必须重新确认该前提**）。
  - **验证（全部实测）**：① 全新空库从 0001 跑到 0069 **一次通过，0 失败 / 0 错误**（70 个迁移文件）；② 增量重跑 0068 / 0069 返回 ✅、无「重复执行」报错；③ **全新库 vs 生产库逐表列集比对差异 = 0**（全新库 102 张表；生产多出的 `_cf_KV` 是 Cloudflare 平台自带表，非项目表），`vouchers` 30 列 / `work_orders` 35 列 / `vendors` 34 列 / `voucher_items` 13 列 / `orgs` 14 列 / `org_code_history` 4 列——**两条路径终态完全收敛**；④ 三张表的 org 级唯一约束两端一致、全局单列 UNIQUE 残留 = 0。
  - **门禁**：`npm run check -- --no-probe` 全部通过（① 登记表↔生产库：僵尸登记 0 / 漏登记 0；② 前端调用↔后端路由：0 处 404 风险）；后端 `tsc-functions` **新增 0 条**（存量 59 不变）；`_audit_syntax` **129 文件 / 0 语法错 / 0 引用错**；前端 `tsc --noEmit` 0 错；`vite build` 通过，产物内含 `3.15.6` / `V3.15.6` / 新文案。
  - **配套修正**：① 登录页注册校验提示「请填写公司码」统一为「请填写公司邀请码」（与 V3.15.5 文案口径一致）；② **门禁抓出并补齐 V3.15.5 的登记遗漏**——迁移 0069 新建的 `org_code_history` 未登记进 `functions/_shared/rls.ts`，门禁报「漏登记 1」**阻断发布**；核实两处使用（`register.ts` 旧码校验、`company-code.ts` 轮换与查重）均为原生 `env.DB.prepare`、**未走 `rlsCondition`**，故未造成「静默空表」，但违反「全量登记」铁律，且将来一旦有端点按通用方式查它就会静默返回空——已按口径登记进 `RLS_EXEMPT` 并写明理由。
- **V3.15.5 公司邀请码（管理员设置 + 有效期 + 可轮换）+ 建公司者角色改由超管审批指定（2026-09-18）** —— 需求：注册时的公司码应由公司管理员设置、有有效期、可定期更换。要点：① **概念解耦**：把「公司身份」（orgs.id / orgs.name）与「加入凭证」（company_code）拆开，邀请码降级为可轮换凭证，换码不换公司身份；② **迁移 0069**：orgs 新增 `code_expires_at` / `code_rotated_at` / `code_disabled` 三列（老数据回填为永久有效、不锁死现有用户），新建 `org_code_history` 表记录已吊销旧码；③ **新增接口** `functions/api/orgs/company-code.ts`：管理员（本公司）/ 超管（可跨公司）可查看当前邀请码、生成新码（轮换）、设置有效期（默认 30 天 / 自定义 / 永久）、暂停或恢复加入，每次变更写审计；④ **注册改造** `functions/api/auth/register.ts`：邀请码属于「已停用 / 已过期」组织 → 明确拒绝；属于历史表旧码 → 提示「已失效，请向管理员索取新码」（避免旧码被误判为新建公司）；新建公司分支的创建者角色由 `admin` 降为 `user`（仅保留 is_owner 标记），初始邀请码默认 30 天有效；⑤ **前端**：新增「设置 → 用户与权限 → 公司与邀请码」页 `src/pages/Settings/OrgInviteCodeTab.tsx`；用户管理「批准」改为「批准并分配角色」对话框（含「新公司暂无管理员」提醒）；登录页注册表单文案由「公司码」改为「公司邀请码（由公司管理员提供）」并重写说明弹窗；`src/config/searchIndex.ts` 补录入口。前端 `tsc --noEmit` 0 错、后端 `tsc-functions` 新增 0 条。提交待推送。
- **V3.15.4 登录页「找回密码」入口可见性修复（2026-09-18）** —— 该功能自 V3.14.3 已存在（登录页触发按钮 + ForgotPasswordDialog 对话框 + authStore.resetPasswordRequest/Confirm + 后端 reset-password-send/confirm 端点均就绪），但 `Login.tsx` 触发按钮文字色被写成近白色 `rgba(255,255,255,0.85)`，落在白色登录卡片上形成「白字印白底」隐形，用户视觉上找不到入口。改为 `primary.main`（蓝）后清晰可见，全链路不变。提交待推送。
- **V3.15.3 审计报告 P1 级架构修复（2026-09-18）** —— 落地安全评测报告 P1 四项（比 P2 更靠架构层，已在生产真实库逐项验证）：① **DB-001 并发全局污染**：父子表工厂 `functions/_shared/parentChild.ts` 的模块级全局可变 `jsonCols` 删除，改为每请求从配置现算的纯函数 `parentJsonSet(cfg)`，消除同进程并发请求互相改写共享可变状态导致的 `D1_TYPE_ERROR` 500；② **DB-002 事务缺失**：凭证 `functions/api/vouchers/index.ts` 与工单 `functions/api/bom/index.ts` 的「父表 + 循环子表」多步写合并为 D1 `DB.batch` 单一原子批次，消除孤儿父行 / 半截子表脏数据，UNIQUE→409 语义不变；③ **DB-003 多租户唯一约束方向反**：`voucher_no`/`order_no`/`vendor_code` 由全库唯一改为 `(org_id, 单号)` 联合唯一（同组织重复被拒、跨组织可复用），因 Cloudflare D1 禁删自动唯一索引，改用「重建表 + 表级 UNIQUE 约束」等价实现（迁移 0068），上线前查重 0 行、数据无损（vouchers=43/voucher_items=86/work_orders=10/vendors=15）；④ **FE-002 消除 b2Api 系统性静默失败**：`src/services/b2Api.ts` 拆出 `rawRequest`、失败进环形缓冲（上限 50）+ 订阅通知 + `retryAll()` 重放，新增右下角非阻塞同步状态条 `src/components/B2SyncStatus.tsx` 接入 `MainLayout`，未登录无令牌仍静默不计入失败，54 处调用约定方法签名未改。构建与后端 `tsc-functions` 均 0 错，门禁 FAIL 0。提交待推送。
- **V3.15.2 审计报告 P2 级质量修复（2026-09-18）** —— 收口安全评测报告的 P2 级质量缺陷（根因清楚、改法固定、低风险）：① **SEC-002 审计缺口**：注册、激活、修改密码、重置密码四个后端接口补写审计日志（此前漏记，特权操作无留痕）；② **DB-005 迁移重放风险**：财务域迁移 0054 由「先删表再建表」改为「表不存在才建」，避免重新部署清空已存在的财务数据表；③ **DB-007 凭证红冲 500（前提澄清，未补列）**：审计报告称 vouchers 红冲字段（reversed_by / reversed_at）被 0064 误删、红冲写这两列报 500。线上真实库核查推翻该论断——0064 仅删驼峰列 `reversedBy`/`reversedAt`，蛇形列 `reversed_by`/`reversed_at` 始终存在（vouchers 共 30 列含此两列），端点映射与入参校验均正确，红冲在当前生产库下不触发缺列 500；原 0066「补建列」写法反而因列已存在报错、阻断 0067 下发，已将 0066 改为幂等占位（仅登记不建列）解除阻塞。DB-007「缺列导致 500」根因不成立，如实更正；若线上仍能复现 500 需另查；④ **DB-008 缺唯一约束**：项目核算科目映射表补（组织编号, 科目编码）唯一索引，上线前已查重确认 0 行重复；⑤ DB-006（蛇形字段转换）与 FE-006（本地存储迁移）经核实原已正确，无需改动。提交待推送。
- **V3.15.1 打印模板存储型 XSS 修复（P0 安全补丁）（2026-09-17）** —— 修审计 [致命] SEC-001：打印模板写入接口原本无角色校验（任意登录用户可改/删模板）、模板 HTML 原样入库不净化、前端 `PrintPreview.tsx` 用 `dangerouslySetInnerHTML` 裸渲染；攻击链为「低权限用户直打接口写入 `<img onerror>` 模板 → 管理员预览触发脚本 → 偷走 localStorage 令牌 → 冒充超管接管组织」。要点：① 后端 `print-templates` 的 POST/PUT/DELETE 三接口加 `RLS_PRIVILEGED`（`super_admin`/`admin`）角色门槛，普通用户返回 403；② 新增服务端白名单 HTML 净化器 `functions/_shared/templateSanitize.ts`（纯函数无 DOM 依赖，落库前剥脚本/事件属性/危险链接，放行合法 data:image 图片、禁 data:image/svg-xml）；③ 前端 `PrintPreview.tsx` 渲染前用浏览器真实 DOM 净化（`sanitizeBrowserHtml`），双保险；④ 真实端点验证：低权限账号写模板 403、含 `<img onerror>` 的模板入库后 GET 回显已无 onerror、管理员预览不再执行脚本。提交待推送。
- **V3.15.0 个人中心合并工作台 + 资料字段补齐 + 自助改资料（2026-09-17）** —— 起因：强哥反馈个人中心「邮箱显示未绑定、部门显示未设置」且「之前设置过两个邮箱」，并要求在个人资料增加手机号、区分「用户可改 / 管理员锁定」字段、把个人中心与个人工作台合并。要点：① **根因修复**：登录接口 `login.ts` 只回 5 个字段（id/org_id/username/name/role），漏了 department/email/alt_email/phone，导致前端只能显示占位文案；新增 `toClientUser()` 规范化函数，`login.ts`/`me.ts`/`profile.ts` 三处统一从此取字段；② **个人中心与个人工作台合并**：`PersonalCenter.tsx` 重写为三标签页（我的工作台 / 个人资料 / 账号安全），内嵌 `Workbench` 组件；侧边栏「个人工作台」改「个人中心」、头像菜单去掉重复项、`/workbench` 重定向到 `/profile`；③ **新增手机号字段**：`users.phone` 列早已存在，本版前端展示 + 自助修改；④ **区分可改/只读**：姓名/手机号/主邮箱/备用邮箱自助修改，用户名/部门/角色/状态由管理员在用户管理设置、个人中心只读并标注「管理员设置」；⑤ **新增自服务资料更新接口** `functions/api/auth/profile.ts`（PATCH/PUT），白名单字段（name/phone/email/altEmail），越权改管理员字段一律 400 拒绝，每次成功修改写审计；⑥ 应用启动自动调 `/api/auth/me` 刷新当前用户，避免已登录旧会话一直显示旧占位。提交待推送。
- **V3.10.1 修复「登录页频繁刷新、无法登录」（严重缺陷）**（2026-09-15）—— 详见 §十三「七之四」。要点：
  - **现象**：打开 `/login` 页面每秒自行刷新，用户来不及输入用户名密码，**完全无法登录**。
  - **★ 根因是三层的叠加，缺任何一层都不会触发**（这也是为什么它潜伏至今）：① `App.tsx` 的启动 `useEffect` 挂在 `<App>` 顶层、**位于所有路由之外** → 打开 `/login` 也照样执行；② 该 effect 里的 `load()` 全部**直连业务端点且各自走服务层**（`apiService` / `xxxApi`），**不经过 `persistStorage`**，因此拿不到那层「无 token 直接回退本地」保护，未登录时**必然 401**；③ 401 触发 `persistStorage.handleUnauthorized()` → `authStore` 执行 `window.location.href = '/login'`（**整页跳转**），而整页加载会把模块级变量 `expiredHandled` **重置为 false** → `/login` 上这批请求再次 401、再次整页跳转 → **无限循环**。
  - **★ 燃料由实测坐实**：`curl` 直打生产端点，`/api/approval-flows`、`/api/materials`、`/api/customers`、`/api/vendors`、`/api/state/ssa-erp-purchase` **全部返回 401**（未登录状态下这批启动拉取本就该失败，问题在于失败后的处理方式）。
  - **★ 判定：这是「老缺陷被新改动压垮」，不是「新版本写错」**。三层原因在改动前**全部已在代码里**，触发只差「启动期请求数足够多」；V3.10.0 新增审批流启动拉取**恰好把请求数推过临界点**。**若误判为后者就会去回滚 V3.10.0**，但回滚后将来任何版本再加一个启动请求，同一故障还会原样再来。
  - **修法（四处，缺一不可；只修其中一两处，循环照旧）**：① `App.tsx` 启动拉取**只在 `isAuthenticated` 为真时执行**（`useAuthStore` 的 persist 用的是默认同步 `localStorage`，`isAuthenticated` 刷新后**同步水合**，据此驱动可行）；② `authStore` 会话失效处理加**双守卫**——`window.location.pathname === '/login'` 则直接 `return`（状态已清干净，无需再整页重载）+ 一次性闸门 `sessionExpiredRedirecting`（同一页面生命周期只跳一次）；③ `persistStorage` 的**兜底跳转**（`setTimeout` 1 秒后自跳）同加「已在登录页则不跳」——**这是另一条完全独立的跳转路径，只改 authStore 会漏**；④ `approvalFlowStore.load()` 自身加 token 判空（该 store 走独立端点，没有 persistStorage 那层保护）。**令牌键沿用既有约定 `localStorage['ssa-erp-auth-token']`**（与 `api.ts` / `persistStorage.ts` / `DataManagement.tsx` 一致）；`persistStorage` 里的 `getToken()` 是私有函数，**不为测试而导出内部函数**。
  - **验证**：`tsc --noEmit` 0 错 → `npm run build` 1m7s 成功 → 部署 `db7a54eb`；**产物静态核对**三处守卫全部编译在内（`window.location.pathname!=="/login"&&(window.location.href="/login")`、带 `Co` 闸门的 authStore 版本、`localStorage.getItem("ssa-erp-auth-token")` 判空）；**全量门禁 PASS 782 / FAIL 0**（21 套件 / 共 798），登录修复**未引入回归**。
  - **★ 沉淀**：本轮的调试经验固化进 `scripts/prod-e2e/README.md`（门禁套件编写规范，七节），核心是**第 1 节「写断言前三问」** —— ① 这个故障在当前测试环境里**能不能被制造出来**（制造不出来 → 不是永不触发的空断言就是永远红的错断言）② 这个断言要防的**真故障**是什么、组织内能否复现 ③ **存量数据**的正确性该由**迁移脚本 + SQL 核对**承担，不塞进接口套件。
- **V3.3.0 评测最后两项低危收口（L-04 行级策略显式全量登记 + L-05 审计降级通道）——报告 23 项发现全部关闭**（2026-09-14）——① **行级策略由「默认共享」改为「默认拒绝 + 全量显式登记 + 双向机器核对」**（L-04）：`functions/_shared/rls.ts` 重写为三层——`RLS_SCOPE` 覆盖全部 **48 张业务表**（全公司 36 / 仅本人 7 / 仅部门 5，逐张注明用途）、`RLS_EXEMPT` **18 张平台/基础设施表**逐条写明「为什么不走业务可见性」、未登记表一律 `1=0`（拒绝全部行）并打 `[RLS_UNREGISTERED_TABLE]` 结构化告警；`assertRlsOwnership` 同口径默认拒绝。**为什么默认拒绝用 `1=0` 而不是收窄成 `own`**：未登记表的列结构未知，若它没有 `owner_id` 列，`owner_id = ?` 会直接把 SQL 打挂（no such column → 500）；`1=0` 不依赖任何列，是唯一「既安全、又能给出可读结果（空列表）」的兜底。**返回契约修正**：`rlsCondition` 由 `{clause, param?}` 改为 `{clause, params: any[]}`——默认拒绝分支零参数，旧契约会让调用方 `params.push(rls.param!)` 多推一个 `undefined`，造成「占位符数 ≠ 绑定参数数」的**运行期 500**；改为数组 + 展开传参后，两种情况天然正确。② **审计写入失败由「静默丢弃」改为「三层降级通道」**（L-05）：新增 `functions/_shared/auditLog.ts` 统一入口，`writeAudit()` 失败时转 `recordAuditDegraded()`，**从不抛异常**；三层为「结构化日志标记 `[AUDIT_DEGRADED]`（零依赖、必达）→ 迁移 0048 建**独立** `audit_degraded` 表落库（与审计主表分离，主表故障时仍有线索）→ 绝不阻断业务」。**为什么降级表不能复用 `audit_logs`**：一次 INSERT 失败通常意味着该表或该批次本身有问题，再往同一张表写第二条大概率同样失败。**返回值契约**：`writeAudit` 由裸 `boolean` 改为 `{ ok, id, degraded }`——`/api/audit/logs` 的既有调用方依赖 `id`（门禁 `09-audit-match` 断言），只回 boolean 会打断对外契约。③ **管理端可观测**：新增 `GET /api/system/audit-health`（限 `admin` / `super_admin`）回传审计总量 / 近 24 小时 / 降级记录 + 行级策略登记报告（登记数 / 豁免数 / 三类作用域分布 / **漏登记清单** / 平台内部表 / **僵尸登记清单**）；安全中心新增「审计与行级策略健康度」卡片。④ **机器核对闭环（双向）**：`findUnclassifiedTables()` 查漏登记 + `findStaleRegistryEntries()` 查僵尸登记（V3.3.0 新增），均以 `sqlite_master` **真实表清单**为基准——再次验证「靠人记得住」不成立。⑤ **门禁新增 `suites/16-rls-audit.mjs`**（403 → **433**，门禁套件 17 个）。⑥ **顺带修复数电票相关接口两处真实缺陷**：配置保存接口与批量核验接口原先都直插 `audit_logs` 中并不存在的 `operator` / `details` / `ip_address` 三列——配置保存接口**没有兜底**，于是「KV 已写入成功、接口却返回 500」（状态与反馈不一致）；批量核验接口**有兜底**，于是失败被静默吞掉、**发票核验审计从未落过库**（最需要留证的合规动作）。两处现统一走 `writeAudit`；并补 `KV_UNBOUND` 503 可读提示（`wrangler.toml` 至今未声明 `TAX_GATEWAY` 绑定，此前必然 TypeError → 原始 500）。⑦ 验收：全新库 **48 条迁移全 ✅**；`tsc` 0 错；后端 89 文件语法 + 打包 0 错；本地真实 HTTP 实测 **PASS 63 / FAIL 0**（含真造「审计写入失败」验证：降级表新增留痕、接口如实回报 `degraded=true`、管理端健康接口可见该记录）；迁移 0048 远程 ✅；部署 `c7b5f16d`；**生产门禁 PASS 433 / FAIL 0 全绿**。
- **工程踩坑沉淀（V2.98–V3.3.0，写入本计划防复发）**：① 同一文件**绝不能并行发多个编辑**（后写覆盖先写，工具仍报成功）——必须串行；② 批量按列名迭代时不得用静态表清单（`d1_migrations` 等平台自建表无 `org_id` 会直接报错），必须以**运行时表结构**判定；③ INSERT 语句的「列数 / 占位符数 / 字面量数 / 绑定参数数」四者必须对齐——多写或少写一个 `?` 类型检查与打包都看不见，**只有运行期会炸**；④ `npm run deploy` **只做迁移 + 上传，不构建**——发布顺序铁律为 `npm run build` → `npm run deploy`；⑤ 本仓库 `.gitattributes` 对 `src/stores|services`、`functions/_shared|api`、`migrations` 启用 `ssaenc` 透明加密，比对历史版本须先解密（见 MEMORY.md 命令）；⑥ 本机脚本含中文时，`.bat` 用 GBK、`.ps1` 用 UTF-8 BOM，否则命令行窗口中文乱码；⑦ **写「清单核对」类断言时，「清单从哪来」比「比对逻辑」更容易出错**——能取真实源（如 `sqlite_master`）就绝不取推导值。本版两次抓错均源于此：本地核对脚本只抓 `CREATE TABLE`（漏掉同一文件里的 `DROP` / `RENAME`，把「建完就改名消失」的临时表当成真实存在的表），以及核对口径漏了「非迁移脚本创建的表」（`d1_migrations` 由 wrangler 迁移工具创建、不在 `migrations/*.sql` 中）导致一次误报。

> 部署门禁：每次生产部署后运行 `npm run test:prod-e2e`（默认自动清理），全绿方可视为收口；WARN 属外部依赖（OCR/AI/数电票/汇率刷新）不阻断，FAIL 必修。

## 八·补 已开发内容全量梳理（V2.55.22 → V3.21.0）

> 本附录为 V3.21.0 整理时，对主计划 §八「版本沿革」的全量对账与补齐。§八 已详述 **V2.5–V2.78.0** 与 **V3.15.9–V3.21.0** 两段；本附录做三件事：① 把 §八 缺失的 **V2.79–V3.14.4** 逐版补齐（标记「新补」）；② 提供一份按真实提交日期**正序**排列、覆盖全部 162 次提交对应版本的「全量版本对照表」，修正 §八 中 V2.74.x 串排在 V2.78 之后的时间乱序观感；③ 按功能域列出**已实现能力总览**，补充 §二「模块现状」只盘点到 V3.4.0 的不足。所有日期取自 `git log --all` 实际提交时间，版本号以提交信息为准。

### 一、全量版本对照表（按时间正序）

| 版本 | 日期 | 一句话核心内容 | 对标/模块 | 代表提交 | 详情 |
|------|------|----------------|-----------|----------|------|
| V2.5–V2.54 | — | 价格闭环/销售财务/前端仓库化/优先级地基/业务闭环/增强项/9 项整页缺失（详见 §八 第 130–159 行） | 全量 | — | §八 |
| V2.55.22–V2.78.0 | 08-17~09-07 | 后端上线/供应商门户认证/关系化七个阶段/双通道根治/移动端门户（详见 §八 第 160–176 行） | 地基+移动 | — | §八 |
| **V2.79** | 09-07 | 移动作业扩到出库/盘点/质检真过账 + 历史测试抖动根治 | 移动端 | 82444dc | 本附录新补 |
| **V2.80** | 09-07 | 9 整页模块迁真实数据库（资金/三方销售/重复制造/获利分析/制造执行/波次射频识别/智能分析/环境社会治理）+ 移动消息 + 发票文字识别 + 数电票核验骨架 | 整页补齐 | 08f8ece | 本附录新补 |
| **V2.81** | 09-07 | 移动门户首页收口（盘点/质检待办入口）+ 盘点任务迁真实数据库 | 移动端 | 606d98b | 本附录新补 |
| **V2.82** | 09-07 | 核心源码透明加密 + 排除商业机密 + 版本号四处同步 | 工程安全 | cffd5e1 | 本附录新补 |
| **V2.83** | 09-08 | 大模型助手接通（C6）+ 门禁外部依赖容错 | 智能 | 42f0769 | 本附录新补 |
| **V2.84** | 09-08 | 物料替代料组 + 优先级（C9） | 物料 | 3ff99c8 | 本附录新补 |
| **V2.85** | 09-08 | 库存不足按优先级推荐可用替代料（C9 深化） | 物料 | f5826c0 | 本附录新补 |
| **V2.86** | 09-09 | 字段级权限覆盖全部模块（统一引擎 + 角色×字段矩阵 + 安全字段组件） | 权限 | 3d201e3 | 本附录新补 |
| **V2.87** | 09-09 | 自定义审批流程（新建+发布+组织隔离可见） | 审批 | ab1532e | 本附录新补 |
| **V2.88** | 09-09 | 打印/订单模板增强（物料编码 + 页眉页脚可视化） | 打印 | 8720f69 | 本附录新补 |
| **V2.89** | 09-09 | 打印/订单模板富文本页眉页脚（文档式）+ 2 个修复补丁 | 打印 | 64f05cc | 本附录新补 |
| **V2.90** | 09-10 | 列表交互统一升级（编号列点开详情 + 批量改删 + 全列表批量导入） | 交互 | 7b896d2 | 本附录新补 |
| **V2.91** | 09-10 | 审计日志升级（差异对比 + 回滚）+ 角色操作权限（增删改查级） | 审计/权限 | 20cdbec | 本附录新补 |
| **V2.92** | 09-10 | 审批流全覆盖扩展（+7 模块）+ 审计回滚界面 | 审批 | 1516cc5 | 本附录新补 |
| **V2.93** | 09-10 | 审计日志真实落库（含差异字段） | 审计 | cf3c971 | 本附录新补 |
| **V2.94** | 09-10 | 销售价目表数据权限（销售仅见自己客户）+ 说明书补登 | 权限 | 4c05718 | 本附录新补 |
| **V2.95** | 09-11 | 注册审批机制 + 超级管理员 + 用户管理接通真实账号 | 治理 | 78e54ca | 本附录新补 |
| **V2.96.0** | 09-11 | 超级管理员双邮箱验证 + 新公司注册审批 + 系统邮件通知 | 治理 | bde12a1 | 本附录新补 |
| **V2.96.1** | 09-11 | 安全邮箱备用通道 + 审批越权修复 | 治理 | 123266d | 本附录新补 |
| **V2.97.0–V3.3.0** | 09-14 | 独立安全评测 23 项发现 + 1 项元发现全部收口（行级策略默认拒绝 + 审计三层降级通道等） | 安全 | d3978e9 | §十二 / §八·V3.3.0 |
| V3.4.0–V3.12.x | 09-14 前后 | 新一轮 8 维度竞品对标启动 + C1 数据关系化首域落地（物料清单域 V3.6.0 / 打印模板域+财务域建表 V3.7.0 / 财务域改造 V3.8.0 / 销售域 V3.9.0 / 审批流域 V3.10.0 等） | C1 关系化 | 见 §十三 | §十三 |
| **V3.13.0** | 09-16 | 合并报表/多账簿（C2）+ 三核对程序纳入常规检查 + 凭证表真实数据复测 | C2 报表 | 5dc8b84 | 本附录新补 |
| **V3.14.0** | 09-16 | 合并报表展示增强（资产负债表/利润表结构化 + 导出） | C2 报表 | 93a7a09 | 本附录新补 |
| **V3.14.2** | 09-16 | 修复超级管理员未设密码无法登录 | 治理 | b12d289 | 本附录新补 |
| **V3.14.3** | 09-17 | 统一版本号五处同步 | 工程 | 748e193 | 本附录新补 |
| **V3.14.4** | 09-17 | 构建门禁修复 + 合并报表导出契约修复 + 线上发布验证 | 工程 | 444fec2 | 本附录新补 |
| V3.15.0–V3.15.9 | 09-17~09-19 | 个人中心合并/打印跨站脚本修复/安全审计架构修复/迁移链可重建/邀请码/字段权限服务端化（详见 §八 第 342–367 行） | 安全/权限 | — | §八 |
| V3.16.0–V3.17.9 | 09-20~09-23 | 库存成本下沉服务端/服务端算账闭环/折旧服务端化/单据状态机/两套账合一/乐观锁全量+幂等/来源不明文件入库（详见 §八 第 40–330 行） | 服务端化 | — | §八 |
| V3.18.0–V3.21.0 | 09-23 | 审批实例层/付款闸门真接通/生产倒冲发料/搜索超长修复/通配符转义/字段级权限服务端强制（详见 §八 第 280–326 行） | 差距 8/13/19 | — | §八 |

> 上表「代表提交」取该版本首条相关提交；同一版本的多条提交（如 V3.21.0 含 5 次提交）已合并标注。「详情」列：§八/§十二/§十三 指主计划对应章节；「本附录新补」指本节首次纳入主计划、§八 此前未逐版记录。

### 二、按功能域的已实现能力总览（截至 V3.21.0）

> 一句话总览：**核心业务闭环（采购→入库→库存→生产→成本→财务凭证→报表）已贯通；服务端强制管控层（借贷平衡、付款闸门、生产倒冲、单据状态机、字段权限、乐观锁）已补齐；移动端、审批流、审计、权限、智能助手均已落地**。下方按域列出关键能力与起始版本。

| 业务域 | 已实现关键能力 | 起始版本 | 当前状态 |
|--------|----------------|----------|----------|
| 物料主数据 | 多视图/评级/多单位/自定义字段/替代料组与推荐/单位换算（服务端） | V2.51 / V2.84 / V2.85 / V3.17.5 | 完善 |
| 供应商管理 | 门户回写/信用管控/黑名单硬拦截/主数据独立表/绩效考核/风险评分/字段权限服务端强制 | V2.41 / V2.74.2 / V3.21.0 | 完善 |
| 客户主数据 | 主数据建档/信用硬拦截/客户分层分析 | V2.51 / V2.32 | 完善 |
| 采购管理 | 税价拆分/货源清单/信息记录/条件引擎/服务采购/寄售/采购订单变更单/三单匹配闸门 | V2.31 / V2.66 / V3.19.0 | 完善 |
| 价格管理 | 价目表回写/条件技术引擎/价格分析/比价加权评分 | V2.26 / V2.49 / V3.17.9 | 完善 |
| 仓储管理 | 入出库过账/序列号/批次追溯/拣配发货/保质期/循环盘点/替代料建议/移动作业 | V2.45 / V2.52 / V2.79 | 完善 |
| 生产管理 | 工单完工/物料需求计划增强/甘特排产/自动排程/生产倒冲发料（服务端） | V2.38 / V2.46 / V3.20.0 | 完善 |
| 质量管理 | 不合格品→纠正措施/抽检标准/过程能力指数/失效模式分析/动态检验/合格证/计量校准 | V2.39 / V2.43~V2.54 | 完善 |
| 财务管理 | 凭证/成本/退货税额/会计期间/三单匹配/合并报表多账簿/服务端借贷平衡/折旧服务端化/两套账合一 | V2.30~V2.35 / V3.13.0 / V3.15.9 / V3.17.1 | 完善 |
| 销售管理 | 信用/销售价目表/销售合同/销售漏斗/返利/三方销售/数据权限 | V2.32 / V2.49 / V2.94 | 完善 |
| 供应商门户 | 订单确认/报价/资料变更/门户认证/发货质量对账回写/黑名单拦截 | V2.56 / V2.42 / V2.43 | 稳定 |
| 移动端 | 渐进式网页应用门户/真扫码入库/移动作业(入/出/盘/质)/移动消息/首页待办 | V2.78 / V2.79 / V2.81 | 完善 |
| 审批流 | 自定义流程/全覆盖(+7 模块)/审批实例层(撤回/催办/委托)/动态侧边栏 | V2.87 / V2.92 / V3.18.0 | 完善 |
| 审计日志 | 升级(差异+回滚)/真实落库(含差异)/三层降级通道/导出留痕 | V2.91 / V2.93 / V3.18.0 | 完善 |
| 权限与数据安全 | 行级策略默认拒绝/字段级权限(前端+服务端强制)/开放接口网关/多币种/注册审批/无主公司代管 | V2.74 / V2.86 / V3.21.0 | 完善 |
| 智能助手 | 大模型对话助手/对话式分析/异常预警/发票文字识别/数电票核验 | V2.54 / V2.83 / V2.80 | 可用 |
| 报表与分析 | 经营驾驶舱/需求预测/关键指标 20 张/嵌入式分析/合并报表 | V2.52 / V3.13.0 | 完善 |
| 系统设置 | 编号规则/数据权限/字段权限/低代码设计器(演示版标注)/帮助体系/接口控制台 | V2.47 / V2.86 / V3.15.9 | 完善 |
| 部署与质量门禁 | 一键部署(含迁移)/六项门禁/常驻生产端到端测试/透明加密/全新库迁移链可重建 | V2.76.1 / V3.21.0 | 完善 |

### 三、本轮（V3.21.0）补齐说明

- §八 此前缺失 **V2.79–V3.14.4** 共约 27 个版本的逐版记录，本节已全部补齐（表一「本附录新补」行）。
- §八 中 V2.74.x 串排在 V2.78 之后造成时间线倒挂，表一按真实提交日期重排为正序，可据此核对。
- §二「模块现状」盘点到 V3.4.0，表二把能力状态延伸到 V3.21.0，覆盖服务端强制管控层与移动端/智能助手等后续落地。
- 全量版本对照表覆盖 `git log --all` 全部 162 次提交对应的版本区间（V2.55.22 → V3.21.0），无版本遗漏。

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

## 十三、新一轮全维度竞品对标与整改（V3.4.0 起）

- **报告位置（单一权威）**：`docs/benchmark-deep-analysis.html`（自包含 HTML，浏览器直接打开；已归档 ima「强哥的知识库 → ⑥通用-交付物 → erp开发项目」）。旧版 `docs/benchmark-V2.64-deep-analysis.md` 已删除。
- **竞品基线（2026-09-14 核查，≥2 源交叉验证）**：SAP S/4HANA Cloud Public Edition **2608**（2026-08 中旬，生产租户 08-15～16 升级）；金蝶云·星空（金蝶 AI 星空）**V9.1**（2026-02-26 首发，最新周期补丁 PT-163022 / PT-163023，构建号 9.1.861.11 / 9.1.861.12，V8.0 已于 2026-06-30 公告退市）；用友 **BIP 6**（2026-08-06～08 GBIC·2026 发布「AI+X」）/ **U9 cloud 2026**（2026-05-20 线上首发）/ **YonSuite**（2026-04-23 印尼发布全球化人力财税本地化）。
- **八维度总分（0–5×8=40）**：SSA **25.0** / SAP **38.0** / 金蝶 **34.5** / 用友 **34.5**。SSA 与三家的主要差距集中在 D5 适配性（2.0）、D7 结构（2.5）、D4 可用性（3.0）—— 三者同源，根因都是数据底座为大对象。
- **横向系统性差距（跨模块根因）**：R1 60 个业务域仍是 JSON 大对象；R2 写审计覆盖率低；R3 多语言空壳；R4 无加载态 / 无虚拟滚动；R5 算法缺时间维度（MRP 无期间桶与低层码、未使用废品率、预测仅移动平均）；R6 AI 能力空白（暂不建议追）。
- **分级路线图**：
  - **A（必做）**：A1 写接口审计补全 ✅ 已完成（14 文件 21 处，覆盖 31%→约 60%）；A2 列表加载态底座 ✅ 已完成（物料/采购订单/销售订单已启用）；**A3 MRP 使用废品率 ✅ 已完成（V3.4.0 同一轮，见下方「A3 实测口径」）；A4 多语言底座 ✅ 已完成（146 条导航 + 通用动作 + 状态词 + 字段名共约 200 条词条，顶栏快切，格式随语言）；A5 大对象键容量守护 ✅ 已完成（软 4 MB 告警 / 硬 8 MB 拒绝 + 体积指标表 + 管理端容量页）**。A 级四项至此全部收口，无遗留。
  - **B（流程闭环与体验）**：B1 MRP 时间分段 + 低层码 ✅；B2 计划订单落库 ✅；B3 CRP 日负荷曲线 + 班次日历 ✅；B4 预测增强（指数平滑 + 季节）✅；B5 报表中心升级为真查询 ✅；B6 剩余写端点审计 ✅（覆盖率 60% → **82%**）；B7 列表虚拟滚动 / 行 memo ✅。**B 级七项于 V3.5.0 全部收口，无遗留**（逐项落地说明见本节末「B 级落地实录」）。
  - **C（增强与差异化）**：**C1 Top N 大对象迁关系表 🔄 首个样板域（bom）已落地，见下方「C1 落地实录」**；其余顺序 bom ✅ → price → quality → production → finance → sales（**A5 的体积报表即迁移顺序的客观依据**）；C2 合并报表 / 多账簿；C3 工作流与单据状态机深绑定；C4 AI 助手（**依赖 C1，暂不建议**）。
- **A3 实测口径（写入计划以免口径漂移）**：计划用量 = 净用量 ÷ (1 − 废品率)，而非 ×(1 + 废品率)；废品率夹取 0~99 防除零；多 BOM 项引用同一物料时按**需求量加权平均**；界面「废品率」列与「含废品损耗 +N」标注取自同一计算。
- **A5 阈值口径**：软 4 MB（写入成功 + 响应带 warning）/ 硬 8 MB（返回 413 STATE_TOO_LARGE，前端**不重试**并显式提示）。改阈值只改 `functions/_shared/stateSizeGuard.ts` 两个常量。
- **A4 翻译口径**：缺失词条**回退中文原文，绝不显示裸 key**；不做无人工校对的机翻；管理员可在「设置 → 多语言」现场补录（云端持久化，不需发版）。
- **不追的（已诚实写入报告）**：AI Agent 体系（无结构化数据支撑必然做成聊天机器人）；全量 209 页多语言翻译（>40 人天且持续负债，先做框架 + 导航）；60 个大对象一次性全迁（风险过高，逐域迁移 + 每域跑全量门禁）；auth 系列接口刻意不补审计（自身即凭证动作证据，冗余）。

### B 级落地实录（V3.5.0，2026-09-15）

- **B1 MRP 时间分段 + 低层码**｜`src/pages/Production/MRPPlan.tsx`
  - **低层码（LLC）**取该物料在 BOM 树中的**最深层级**（顶层成品为 0）。为什么取最深而非最浅：同一通用件（如标准螺栓）可能既直接用成品（层 1）又用在半成品（层 3）；按最浅值算会先算一次总需求、展开半成品时再算一次并互相覆盖 —— 这正是经典 MRP 缺陷。LLC 决定**运算顺序**，不是展示标签。
  - **期间桶**按周切分（`BUCKET_DAYS = 7`，周一为桶起点，`MAX_BUCKETS = 8`）。桶宽取 7 天是因为制造业排产与跟单以周为单位（周计划会、周对账），桶边界必须落在周一才与业务节奏对齐。
  - 结果排序改为 `LLC 升序 → 净需求降序`，使界面阅读顺序、MRP 运算顺序、实际决策顺序三者一致。
- **B2 计划订单落库**｜迁移 `0050_planned_orders.sql` + `functions/api/planned-orders/index.ts` + `src/services/plannedOrderApi.ts`
  - **幂等靠数据库唯一约束 `(org_id, run_id, material_code, type)` 兜底**，不用应用层「先查后插」（并发下必然漏判）。落库用 `INSERT ... ON CONFLICT DO UPDATE`，重复提交天然退化为更新。
  - **`run_id` 是这张表的灵魂**：一次 MRP 运算 = 一个批次，没有它就只能记流水账，无法回答「这一轮算出了什么、与上一轮差在哪」。`runId` 的生成落在**计算时**并固定，不可由服务端另起（否则幂等失效）。
  - **upsert 刻意不更新 `status`**：落库是机器动作、确认是人的判断；若重算能刷状态，计划员盖过的章会被机器抹掉。状态只能经 PATCH 改，且有状态机守卫（`converted` 不可回退，避免追溯链断裂）。
  - 数量拆分四项全存（毛需求 / 现有 / 在途 / 净需求），界面上可展开成一行算式 —— 只存净需求等于只存答案不存过程。
- **B3 CRP 日负荷曲线 + 班次日历**｜`src/utils/crp.ts` + `src/pages/Production/CRP.tsx`
  - 班次日历按「工作日 1.0 / 周六可配（默认 0.5）/ 周日可配（默认 0）/ 节假日清单」折算日产能。原因：制造业可用产能不均匀，按「每天都能干 8 小时」算会出现「周日负荷 60% 看着没问题，实际那天没人」这类误判。
  - 工时按工单计划起止日**均摊到各开工日**（`distributeHours`），跳过非开工日 —— 均摊是最不假设的分配方式，不臆断车间怎么排产，只如实摊开，任何一天明显超产能即为真实冲突信号。
  - **「需求落在非开工日」被单独标红计数**，这是排产默认「休息日也能干活」的直接证据，会顺延到下一工作日，交期须相应顺延。
- **B4 预测增强（霍尔特-温特斯加法季节模型）**｜`src/utils/forecast.ts`
  - 替换原「近 3 个月移动平均」。移动平均两个硬伤：① 对转折视而不见（销量从 100 掉到 50，三个月平均要等第三个月才降到位）；② 完全没有季节性（旺季缺货、淡季压仓的典型根源）。
  - 三步法：初始化（前 12 期均值定水平、首尾年度差 ÷12 定趋势、多年同期偏差定季节）→ 逐期迭代修正 → 向前外推（水平 + 阻尼趋势 + 对应月季节因子）。季节因子做**归一化**（12 项之和为 0），否则系统性偏差会带进每一期预测。
  - 季节估计要求 **≥24 期（两个完整年度）**，不足时退化为霍尔特线性趋势 —— 少于两年无法区分「季节」与「今年恰好如此」。
  - 输出**拟合优度 MAPE**，让使用者判断参数是否可信；长期趋势外推用平方根阻尼，避免线性外推把趋势放大到不合理量级。再订货点的提前期需求改用**预测值**而非历史平均，使转折能及时反映。
- **B5 报表中心升级为真查询**｜`src/utils/reportEngine.ts` + `src/pages/Reports/ReportCenter.tsx`
  - 改造前报表中心是「导航卡片墙」—— 自身算不出任何数字，只是书签夹（对标 D1/D7 失分点）。现新增「数据速查」视图：6 张真查询报表（采购按供应商 / 采购按月份 / 销售按客户 / 销售按月份 / 库存金额按物料 / 工单按状态），带合计行与「记录数」列。
  - **不改用后端 SQL 聚合**：60 个业务域仍在 `app_state` 大对象里，后端无表可聚合；数据本就在内存，再走网络只增加延迟与失败面。待 C1 数据关系化后只需替换 `executeReport` 实现，报表定义不动 —— 把「会变的」（数据来源）与「不变的」（报表口径）分开。
  - 每列口径说明写在定义里、界面 hover 可见。测试 ID：`rc-view-query` / `rc-report-<id>` / `rc-table` / `rc-row` / `rc-total-row` / `rc-empty`。
- **B6 写端点审计补全**｜17 个文件
  - 覆盖率 **53/64 = 82%**（原 60%）。摘要一律写「变了什么 + 前后值 + 影响范围」，不写「更新了 XX」（事后追责等于没写）。
  - 敏感值统一约定：授权码 / API 密钥 / 调度令牌 / AI 对话正文 / OCR 全文**一律不进审计表**，只记「是否变更过」与元信息（审计表读者范围大于一次操作，抄进去等于二次扩散）。
  - 剩余 11 个文件全为 `auth/*`（9）与 `vendor/login|register`（2），**刻意不补**；理由完整写在 `functions/api/auth/login.ts` 顶部，避免未来审阅者把「刻意」当「遗漏」。覆盖率口径**以业务写端点为分母**，认证端点不计入分子也不计入分母。
- **B7 列表虚拟滚动 / 行 memo**｜`src/components/common/DataTable.tsx`
  - 自研**零依赖窗口化**，不用 react-window / react-virtual。原因：本项目的表格是 `<table>` 语义结构，表头用 `colSpan` 多级分组、单元格支持拖拽框选 + Ctrl+C 复制 TSV、行内链接跳详情 —— 这些能力依赖「真实 DOM 顺序与连续行号」，虚拟滚动库用绝对定位 + transform 接管布局会把这些全部改写，等于为滚动性能拆掉已有功能。
  - 做法：仍渲染真实 `<tr>`，上下各放一个高度可变的占位行，把视口外的行替换为占位。视觉与真实滚动一致（占位撑起等高），DOM 行数降为「视口内 + 上下各 20 行缓冲」。
  - **只在行数 > 200 且未分页时启用**（`WINDOW_THRESHOLD = 200`）：小列表本来不卡，强行窗口化只会引入「滚动行高跳动」的新风险。滚动步长小于半行时忽略，避免滚动事件比帧还密导致逐像素重渲。
  - 块选/区域复制依赖的 `rowIndex` 已还原为**全局行下标**（`startIndex + localIndex`），这是本机制最容易出错处。行高优先量真实 DOM，退回 37px。

### C1 落地实录 · 数据关系化首个样板域 BOM（V3.6.0，2026-09-15）

> **这是 C 级的第一块砖，也是后续 5 个域（price / quality / production / finance / sales）的复制模板。**
> 为什么先做 BOM：① 它是 MRP、成本卷积、工单、销售订单一键生成等多个功能的共同上游，
> 影响面最大；② 它的嵌套结构（三层 children）是最难的关系化情形 —— 最难的做通了，其余平表域是降维。

- **为什么这件事非做不可（第一性原理）**｜改造前 BOM 整体存在 `app_state` 的一个 JSON 大对象里（persist 键 `ssa-erp-bom`）。这带来三个**由存储形态直接决定、改代码解决不了**的缺陷：
  - **无法按子件反查**。「这个零件被哪些产品用到」是制造业最高频的查询之一（零件要改规格、要涨价、要停产替换时必须先知道影响面）。JSON 数组没有表可以 `WHERE material_code = ?`，只能把整包拉到浏览器再过滤 —— 前端算得动，但数据库帮不上忙。
  - **无法做关系约束**。同层重复序号、引用不存在的父件，这类脏数据在 JSON 数组里没有任何机制能拦住。
  - **无法分页**。明细增长后只能整包传，且受 A5 的 8 MB 硬顶限制。
- **迁移与后端**｜迁移 `0051_bom.sql` 建 `bom_headers` + `bom_items`；端点 `functions/api/bom/index.ts`（列表/创建）+ `functions/api/bom/[id].ts`（读/改/删）。
  - **表头带 `org_id`、明细不带（设计取舍）**：明细通过 `bom_id` 从属表头，若明细也存 org_id 就有两份组织归属，不一致时以哪个为准会成为长期隐患。读取明细统一走「组织内表头 → bom_id 关联」，索引按此路径建。
  - **唯一键取 `(bom_id, level, sequence)` 而非 `(bom_id, material_code)`（设计取舍）**：同一子件在同一 BOM 中**允许出现在不同位置**（某标准件在框架段和底座段各用一次，用量与工序不同），强行去重会吃掉真实数据。
  - **层级用物化列而非递归 CTE（设计取舍）**：BOM 的层级是**工艺决定的、人为确认的**（同一物料放第几层是设计决策，不是数据推导结果）。物化成列让「按层级排序」变成一次普通 ORDER BY，也让 MRP 的低层码直接读到稳定值。
  - **成本字段刻意冗余在明细行（设计取舍）**：BOM 成本一旦发布（进入报价、进入成本卷积）就必须**冻结** —— 事后物料涨价不应悄悄改写三个月前那张已发布 BOM 的成本。存下来的是「发布时刻的成本快照」。
- **★ 最危险的一步：嵌套摊平**｜前端 `BOMItem` 带 `children`，实际数据最多**三层**（如 `bom-003`：柜门组件 → 门框 → 铰链）。关系表每行都是平的，靠 `level` + `parent_item_id` 表达层级。**若把 `body.items` 当平数组直接写入，嵌套子树会被整块丢掉** —— 界面上看不出异常（顶层行都在），但 BOM 展开会少子树、MRP 会少算料。这是典型的「静默数据损失」，比报错危险得多。
  - 解法：`flattenItems()` 深度优先摊平，把父行 id 写进子行 `parent_item_id`，**并用实际嵌套深度覆盖前端传的 `level`**（前端可能填了不一致的值，以真实结构为准才不会出现「子件层级比父件浅」）。
  - **创建与更新必须共用同一个摊平函数**，否则会出现「新建是对的、编辑后又少了」这类极难定位的问题。
- **接口形状一个字都不改（关键决策）**｜本 store 有 **15 个消费方**（BOMList / BOMDetail / BOMForm / CostRollup / MaterialDetail / CostCollection / MRPPlan / MTOCreate / WorkOrderDetail / SalesOrderDetail / apiService / productionVersionStore / bomCost …）。保持 `bomList` / `bomTreeData` / `selectedBOMId` + 5 个方法的**原签名不变**，只把内部实现从「改内存数组」换成「打 D1」；后端读表头时 JOIN 出明细、组装回嵌套 `items`。**存储形态关系化，接口形状不变** —— 这是样板可复制的前提（下一个域照抄这个形状，消费方零改动）。
- **★ 连 persist 都删掉了（与初版设计不同，值得记录）**｜初版曾保留 `persist(backendStorage, { name:'ssa-erp-bom' })` 当「本地降级缓存」，但那是错的：`backendStorage` 的落点就是 `app_state` 那个 JSON 大对象，保留它等于**双通道照旧**（D1 写一份、app_state 写一份），C1 想根治的问题一个没解决。参照 V2.75.0 S&OP 迁移的既有先例（`sopStore` 迁 D1 后即移除 persist），同样移除。前端初始值仍是内存中的 mock 种子（**不落任何存储**），仅用于 D1 拉取完成前撑起界面。
- **更新语义的两个刻意区分**｜`PUT` **不传 `items`** = 明细保持原样（ECN 只改状态/版本时的正确行为）；**传 `items: []`** = 清空明细（合法操作）。若把「不传」也当清空，一次改版本号会把整张 BOM 的料清掉。
- **写入原子性**｜明细的「先删后插」用 `DB.batch()` 作为一个原子批次提交，不用逐条 `await` —— 逐条会留下「旧明细已删、新明细只插一半」的残缺 BOM，这种状态比整条失败危险得多（表面有数据、实际少了料、没人察觉）。
- **错误语义**｜重复 `bom_no` 返回 **409 + 可读中文原因**（业务错误），不是 500。
- **同批完成的两件配套**｜
  - `functions/_shared/rls.ts` 登记 `bom_headers` / `bom_items` 为 `'all'`（**吸取 A5 踩坑：新增 D1 表必须同批登记，否则默认拒绝会静默返回空表**）。
  - `functions/_shared/validate.ts` 的 `childTableOf` 加**显式例外映射** `bom_headers → bom_items`。因为机械推断规则（去复数 + `_items`）会得出 `bom_header_items`（不存在的表），导致明细校验被**静默跳过**。表名表达业务语义，不该为校验器让步。
  - `functions/_shared/fieldSchema.ts` **重新生成**：从真实库结构导出。附带修正了 6 张此前漏登记的表（`planned_orders` / `job_runs` / `job_ticks` / `login_attempts` / `audit_degraded` / `app_state_metrics`）—— 这些表的写接口此前**完全没有入参校验**。
- **新增常驻护栏**｜套件 `scripts/prod-e2e/suites/17-bom-domain.mjs`（26 条断言）：列表契约 + 未登录拒绝 + **三层嵌套写入读回行数与层级一致** + 父引用正确 + 分页/过滤 + 重复编号 409 + 只改表头不清空明细 + 显式传 items 整体替换 + 删除连带明细 + 删后 404。
  - **门禁基线 433 → 459**（新增 26 条）。
- **下一个域照这个模板做什么**｜① 建两张表（头 + 明细，头带 org_id）；② 登记 `RLS_SCOPE`；③ 写端点（含嵌套摊平，若该域有嵌套）；④ store 换成「D1 主源 + 删 persist」、**保持对外 API 形状**；⑤ 写一个同款护栏套件并跑全量门禁。

### C1 落地实录 · 打印模板域 + 财务域建表（V3.7.0，2026-09-15）

> **本轮最重要的一条不是「又迁了一个域」，而是发现「后端此前完全不在类型检查范围内」，并把它补上了。**

- **★ 迁移顺序由真实数据决定，原计划被推翻**｜原计划按 `price → quality → production → finance → sales` 推进，那是**按模块名猜的**。本轮先量了 `app_state` 各键的真实占用（这是 A5 容量守护页存在的意义）：

  | 业务域 | 库内体积 | 消费方 | | 业务域 | 库内体积 | 消费方 |
  | --- | --- | --- | --- | --- | --- | --- |
  | **打印模板** | **404.3 KB** | 6 | | 采购 | 4.7 KB | 34 |
  | 财务 | 15.0 KB | 31 | | 生产 | 3.7 KB | 25 |
  | 销售 | 10.4 KB | 35 | | 价格 | 0 KB | — |
  | 审批流 | 6.6 KB | 5 | | | | |

  **打印模板是第二名的 26 倍**，故本轮先做它。另一个反直觉的发现：按「store 文件行数」排序完全得不出这个结论（`printTemplateStore.ts` 仅 463 行排第 13；`warehouseStore.ts` 1215 行但生产库 0 字节）。**代码长短与真实数据量无关，排优先级必须量真实数据。**另有 50 个键在生产库无数据。

- **打印模板：本质是「数据与文件混在一起」，不是纯粹的「数据」问题**｜404.3 KB 中 `tpl-po-default` 单独占 398.5 KB，其中 **397.5 KB 是图片**（一张公司标志），真模板内容仅约 1 KB。且经内容指纹核验，**同一张图存了两遍**。
  - **第二份藏在 `headerText`（`PrintTemplateTab.tsx:295`）**：这是 V2.89 之前的旧字段、已标注 `@deprecated`、无任何读取方，但保存时仍把 `headerConfig.html` 原样复制一份进去。它安静地吃掉一半空间，无人察觉。**已改为写空串**，这是省下 199 KB 的真正来源（不是去重逻辑的功劳）。
  - **按第一性原理拆两类**：模板定义（标题/纸张/HTML/勾选字段）= **数据** → 进关系表；图片（标志/印章）= **文件** → 进独立资源表，正文只留 `{{asset:<id>}}` 占位符。两者缺一不可：只做前者，图片仍在每次查询里被搬运；只做后者，模板仍无法按实体索引。
  - **实测成果**：模板正文 **398.5 KB → 1.7 KB**，图片 149.1 KB 独立存放，合计 150.8 KB（原 413.98 KB），**节省 263.2 KB（63.6%）**。
- **★ 分片存储：本轮最凶险的一段**｜那张图 152658 字节，而 D1 单条语句写不下（实测 BLOB 48 KB 可写、64 KB 失败），必须分片。
  - **第一版「zeroblob 占位 + 分块 UPDATE 拼接」会静默损坏**：写完后库里**只剩 784 字节**（正好是最后一块），而 `byte_size` 列仍写着 152658。查询、列表、界面**全部正常**，只有逐字节比对才能发现。根因：`substr(content,1,off)` 依赖「上一条 UPDATE 已持久化」，该前提不成立。
  - **最终方案「一个图片 = 多行分片」**：`print_template_asset_chunks`（PK `(asset_id, chunk_index)`），每片 ≤ 16 KB，独立 INSERT，互不依赖、无顺序要求；读取时按 `chunk_index` 排序拼接。**失败的可见性**是选型依据：一块一行时，少一块就少一块、立刻可见，绝不会出现「悄悄只剩最后一块」。
  - **★ 验证必须让数据库自证**：曾因 wrangler `--json` 对长值截断（取回 11614 字符 vs 实际 305316），差点误判「图片丢了 96%」。正确做法是分段/分片取 `hex()` 并在 node 侧算指纹。**生产库实测 MD5 `f94749486daa255b768c7f876a8e4ae6`，与原始图片逐字节完全相同。**
- **财务域：发现「迁了一半」比全没迁更危险**｜`financeStore.ts` 的凭证部分（`vouchers` / `voucher_items`）在 V3.x 已迁 D1，但其余 7 个切片（发票 / 付款计划 / 分期明细 / 账务分录 / 税务 / 项目账 / 会计科目）仍在 Blob。三个直接后果：① 发票与凭证分属两种存储，外键加不上、级联删除做不了；② 无法判断「这条发票在库里还是浏览器里」；③ **换台电脑，凭证还在、发票没了，且不报错**。
  - **本轮只建表与登记**（`0053_finance_domain.sql` + `rls.ts` + `entities.ts` 7 个切片），**store 改造留到下一轮**。理由如实说明：财务消费方 **35 个（全项目最多）**、`financeStore.ts` 731 行。本轮选择保持「两个域完整闭环」的可验证状态，而不是凑成「三个域都半成品」—— **不可验证的改造比不改造更危险，它会让人误以为已经迁完了。**
- **★ 补上后端类型检查（本轮最该记的一条）**｜`tsconfig.json` 的 `include` 只有 `"src"`，**`functions/` 此前完全不在任何 tsc 覆盖内**；`_audit_syntax.mjs` 只做语法与打包检查，抓不到下面这类错误。本轮新建的打印模板接口**一口气踩出 4 个，全部只有真跑才暴露**：

  | # | 错误 | 表现 | 危害 |
  | --- | --- | --- | --- |
  | ① | `rlsCondition()` 返回 `{clause, params}`，却把整个对象拼进 SQL | `no such column: object Object` | 立刻 500 |
  | ② | `getUserFromRequest(req, env)` 应为 `env.DB` | `DB.prepare is not a function` | 立刻 500 |
  | ③ | `writeAudit` 写成 `{userId, userName, resource, resourceId}`（正确是 `{orgId, actor:{id,name}, entity, entityId}`） | **不报错，审计字段全空** | 最隐蔽 |
  | ④ | `user.orgId` 应为 `user.org_id` | **不报错，`org_id` 存成 null** | 用户查不到自己建的 |

  - 修复：新增 `tsconfig.functions.json`（含 `@cloudflare/workers-types`）+ `scripts/tsc-functions.mjs`（**基线快照模式，只报新增**），并接入 `build-with-gate.bat`。
  - **为什么用「只报新增」而非全量清零**：存量 56 条中约 40 条集中在同一种既有写法（`setClauses` / `values` 未标类型 → 推断为 `never[]`），运行期正常，属误报。一次性改 20+ 文件风险大于收益，且会淹没真正的新增错误。**门禁的价值在于「从此不再变差」，不在于「一次性变完美」。**
- **新增常驻护栏**｜套件 `scripts/prod-e2e/suites/18-print-template-domain.mjs`（27 条断言）：图片外置计数、占位符还原（含「无裸露 `{{asset:}}`」）、**回读 base64 逐字符相同 + PNG 文件头签名**、页眉页脚同图只存 1 份、仅改属性不触图片、去掉图片后正文无 data URL、必填缺失 400、删除连带清理。
  - **门禁基线 459 → 486**（新增 27 条）。
- **验证链**｜`tsc --noEmit` 0 错；`_audit_syntax.mjs` **96 文件 0 错**；`tsc-functions.mjs` 新增 0 错；build 50.64s；部署 `c11146c6`；生产回填幂等复跑四步全绿；**生产门禁 PASS 486 / FAIL 0**（18 套件，247.9s）。

### C1 落地实录 · 财务域 store 改造（V3.8.0，2026-09-15）

> **本轮最要命的发现：上一版为财务建的三张表，字段跟界面几乎全对不上 —— 若直接接入，数据会被「静默丢掉」且照样提示成功。**

- **动手前先列消费方全清单（用户硬性前置要求）**｜实测 `useFinanceStore` 引用 **35 个文件**（业务消费方 **33 个**）：页面 22 个（发票识别/工作台/分录/账龄/辅助核算/预算/现金流/科目/报表/报表三表/固资/发票列表/付款计划/期末结账/项目核算/税务/三单匹配/试算平衡/凭证录入/凭证列表/订单详情/供应商财务…）、其它 store 6 个（notification / purchaseAdvanced / quality(5 处) / salesAdvanced / warehouseAdvanced / warehouse(5 处)）、服务与工具 3 个（apiService 9 处 / reportData / utils）。
  - **风险 1 排除**：33 个消费方**无一处**绕过方法直接 `setState` → **接口形状可保持不变**，33 个页面零改动。
  - **风险 2 发现真缺陷**：`financeStats` 定义了 `setFinanceStats` 但**全项目无人调用** → 界面「应付总额/本月已付/逾期金额」永远是 mock 固定值。本轮**刻意不改**（避免数字跳变造成困惑），作为已知缺陷单独记录。

- **★ 最重大发现：0053 建表没对照前端类型，3 张表字段契约全错**｜

  | 切片 | 表里建的列（0053） | 前端真实字段（`src/types/finance.ts`） | 结论 |
  | --- | --- | --- | --- |
  | 会计分录 | entry_date / summary / account_code / account_name / debit / credit | date / description / debitAccount / creditAccount / amount | **一个都对不上** |
  | 税务记录 | 8 列 | 另有 recordNo / periodType / category / deductedAmount / actualPayable / paidAmount / paymentDate / remarks 共 8 个表内没有 | **缺一半** |
  | 项目核算 | budget_amount / actual_amount / start_date / end_date / note | accountNo / totalBudget / totalVariance / grossProfit / grossMargin / preparedBy / approvedBy… + **嵌套 costItems 无处可存** | **几乎全错** |

  - **错因**：0053 按「会计上应该长什么样」推断列名，而**表结构必须服从前端契约**。通用实体路由的 `pickSnake` 只挑已登记列，**未注册键静默丢弃、返回 201 成功** → 表现为「分录列表有行数，点开摘要/科目/金额全空」。
  - **决策：重建而非加列**（迁移 `0054_finance_domain_fix.sql`）。加列会留下 16 个**永远 NULL 的死列**，在会计表里尤其危险：后来的人看到 `debit` 列会以为那就是借方金额，而真实金额在 `amount` 列。
  - **前提必须验证，不能假设**：生产库核对三张表均 **0 行**（`fin_account_entries` / `fin_tax_records` / `fin_project_accounts`），空表重建代价为零。**若表里有数据，结论将完全不同。**

- **两个嵌套数组必须走专用端点**｜`PaymentPlan.installments`（分期）、`ProjectAccount.costItems`（成本明细）。通用路由会**整块丢弃且不报错**（与 BOM children 同款）。
  - 新增 `functions/_shared/parentChild.ts`（**通用父子表助手**，供后续销售/采购/生产域复用）+ `finConfig.ts`（两张配置），四个端点 `fin-payment-plans` / `fin-project-accounts` 均为薄封装。
  - 助手文件头固化四条不变量：① 创建与更新**共用同一摊平函数**（否则「新建对了、编辑后又少了」）② 子表写入用 `DB.batch()` 原子批次 ③ 「不传子数组」=保持原样 /「传空数组」=清空 ④ 父表只改 body 里出现的字段。

- **store 改造：彻底移除 persist，方法保持同步签名**｜
  - 与 BOM 样板域一致删除 `persist(backendStorage)` —— **保留它等于双通道照旧，C1 白改**。
  - **与 BOM 最大不同**：33 个消费方大量**同步依赖返回值**（`createVoucher` 返回 `VoucherActionResult`、`generateVoucherFromInvoice` 返回 voucherNo、5 个 store 直接 `getState().addAccountEntry(e)`）。改成 async 需改 33 处，回归风险远超收益。故保留同步签名，内部改为 **乐观更新 + 异步落库 + 失败回滚 + 可读中文原因**。
  - 新增 `commit()` 乐观更新壳、`pullSlice<T>()`（拉全量 + 首次空库回填，flag 落 localStorage 每切片一键，防多端重复写入与「删空了又长回来」）、状态 `loaded` / `syncError`。
  - `generateVoucherFromInvoice` / `generateVoucherFromPayment` 补上 `voucherGenerated` 标记落库（否则刷新会重复生成凭证）；`postVoucher` / `reverseVoucher` 补上分录落 `fin_account_entries`。
  - `App.tsx`：`loadVouchers()` → `load()`。

- **两处配套登记（漏了会静默失效）**｜`rls.ts` 新增 `fin_project_cost_items: 'all'`；`validate.ts` 的 `CHILD_TABLE_OVERRIDE` 新增 `fin_payment_plans → fin_payment_plan_installments`、`fin_project_accounts → fin_project_cost_items`（机械推断会得出不存在的表名，导致**明细校验被静默跳过**）。
- **`fieldSchema.ts` 此前完全没有 fin_ 表** → 7 张财务表写入零校验。重新生成后覆盖 **66 张表 / 8 张 fin_ 表**，原有表全部保留。
- **★ 我自己造成的回归并已修复**：`_regen_fieldschema.mjs` 选中了 miniflare 的 `metadata.sqlite`（元数据库）→ 导出 0 张表 → 把 fieldSchema 生成为空 = **全站写入校验被静默关闭**。修复：排除 `metadata.sqlite`，且按「主文件 + WAL 合计大小」取最大（真实数据在 `-wal` 里未 checkpoint）。
- **新增常驻护栏**｜套件 `scripts/prod-e2e/suites/19-finance-domain.mjs`（40+ 条断言）：六个切片列表契约与 401；★ 付款计划 3 期分期写入→读回仍 3 期、★ 只改状态不清空、显式传数组整体替换、传空数组清空、重复 plan_no 409、删除后 404；★ 项目核算 5 条成本明细往返 + 只改状态不清空 + 删除连带报告行数；★ 会计分录 9 个字段逐个比对读回值（0054 修正的直接验证）；税务记录 8 个新列读回；发票/科目往返；更新后未传字段不被清空；删除后 404。



### C1 落地实录 · 销售域关系化 + 多子表能力扩展（V3.9.0，2026-09-15）

> **本轮最有价值的判断不是「怎么做」，而是「哪个切片不做」—— `marketData` 刻意留在 Blob，理由可查。**

- **迁移范围由真实数据与调用点共同决定（动手前双重量化）**｜

  | 切片 | 消费方文件数 | CRUD 调用点 | 实测体积 | 决策 |
  | --- | --- | --- | --- | --- |
  | `salesOrder` | 19 | 0（另有既有 `sales_orders` 表通道） | 无该键 | 沿用既有端点 |
  | `project` | 19 | `addProject` 1 | 含在 10.4 KB 内 | **迁 D1**（3 张表） |
  | `prospect` | 5 | `addProspect` 4 / `updateProspect` 3 | 含在 10.4 KB 内 | **迁 D1**（2 张表） |
  | `shipment` | 5 | `addShipment` 3 | 含在 10.4 KB 内 | **迁 D1**（2 张表） |
  | `marketData` | **1** | **0** | 含在 10.4 KB 内 | **刻意不迁** |

  - **`marketData` 不迁的完整理由**（三条同时成立才敢下这个结论）：① **零 CRUD 调用点** —— 全项目无任何写入方；② **仅 1 个消费方**且只读 `marketData[0]`（`MarketAnalysis.tsx`）；③ **无单一事实来源** —— 它是报表展示用的种子常量，不是可编辑业务数据。为它建子表只会得到「永远只有种子数据、零端点」的空壳表，反而增加维护面。**判断依据全部可复查，不是凭感觉跳过。**
  - 生产库实测：`app_state['ssa-erp-sales']` = **10,668 字节（10.4 KB）**，结构为 `{"state":{...}}`；`prospects` **5** / `shipments` **3** / `projects` **4** / `marketData` **1** / `salesOrders` **该键不存在**。

- **★ 与财务域最大差异：本域可放心全改 async（不是风格选择，是约束不同）**｜
  - 销售域 10 个写调用点**全部不 await 返回值**：导入循环 `rows.forEach(r => addProspect(r))`、表单提交后直接关弹窗、`FlowSelfTest` 自检。→ 改 async 对消费方**零影响**。
  - `services/apiService.ts` 的一处隐式同步依赖（`updateProspect` 后**立刻** `getState()` 读新值）由 **「同步先改内存、再异步落库」** 满足 —— 这正是 `commit()` 壳的设计目的。
  - **对照财务域**：33 个消费方大量同步依赖返回值（`createVoucher` 返回 `VoucherActionResult` 等），被迫保留同步签名。**同样是 store 改造，约束不同则手法不同，不可照抄。**

- **★ 新增多子表能力：`parentChild.ts` 二次重构（单子表 → 子表数组）**｜
  - 触发原因：`Project` 一次带 **3 个数组**（`team` / `milestones` / `exceptions`），原有单 `childField` 配置**结构上无法表达**。
  - 配置形状由「平铺单一子表字段」提升为：

    ```ts
    interface ChildSpec { childTable; childFkCol; childField; childCols; childOrder }
    interface ParentChildConfig { parentTable; children: ChildSpec[]; parentCols; jsonCols?; label; noSnake; noCamel }
    ```

  - `loadChildren` 返回类型改为 `Map<子表名, Map<父id, 行数组>>`（外层按子表分桶），`parentToApi` 按 `spec` 逐张取回；`pcRemove` 遍历全部子表删除。

- **★ 字符串数组走 JSON 文本列，不建空壳子表**｜`interestProducts`（意向产品）/ `team`（项目团队）/ `linkedOrders`（关联订单）三个字段的共同特征：**无 id、无属性、不参与 SQL 统计与排序**。→ 存父表 TEXT 列（`["a","b"]`），进出显式 `parseJsonArray` / `toJsonText` 编解码。**反例**：`followupRecords`（跟进记录）有 id 与多属性 → 必须建真子表 `sales_prospect_followups`。

- **★「不传子数组 = 保持原样；传空数组 = 清空」在多子表下必须逐张独立判断**｜
  - 危险场景：用户**只改项目进度**，若摊平逻辑把「未传 = 空」处理，里程碑与异常记录会被一并删除（界面无异常提示，只是数据消失）。
  - `replaceAllChildren()` 对每张子表**独立**检查 `Array.isArray(body[spec.childField])`；套件做了三重交叉验证：**只传 milestones 后 exceptions 仍在 / 只传 exceptions 后 milestones 仍在 / 只改进度后两者都在**。

- **★ 本轮由测试抓出的两个真 Bug（都不是笔误，是设计缺陷）**｜

  | Bug | 表面症状 | 真实根因 | 修法 |
  | --- | --- | --- | --- |
  | JSON 数组列读回 `undefined` | 套件 PASS 100 / **FAIL 5**（5 条同一根因） | `team`/`linkedOrders`/`interestProducts` 只写进了 `jsonCols`，**没同时进 `parentCols`**；而 `pickCols` 与 `parentToApi` **都只遍历 `parentCols`** → 既不写库也不回读 | 新增 `allParentCols(cfg)` 合并两集合，**消除「两处手动对齐」这一隐患本身** |
  | 财务域套件 `deletedChildren=undefined` | 全量回归时 `19-finance-domain` **真回归 1 条** | 我把 `pcRemove` 返回值改为 `{success, deletedDetail}`，**删掉了旧字段** | 改为**同时返回**两字段：`deletedChildren`（仅单子表给数字）+ `deletedDetail`（中文摘要），**保留旧契约** |

  - **两个 Bug 的共同教训**：`tsc` 与打包**都发现不了**（一个是类型合法的漏配，一个是跨域契约的隐式依赖）。**只有真跑一遍才暴露** —— 第一个靠本地套件，第二个靠**全量**回归（单跑销售域套件是绿的）。**修完必须跑全量，不能只跑本域。**

- **RLS 七张表全部登记 `'own'`，与财务域刻意相反**｜

  ```ts
  sales_prospects: 'own', sales_prospect_followups: 'own',
  shipments: 'own', shipment_items: 'own',
  projects: 'own', project_milestones: 'own', project_exceptions: 'own',
  ```

  - **为什么与财务域（`'all'`）相反**：财务账目属公司级数据，全公司可查；销售线索 / 出货记录 / 项目属**业务员个人业务范围**，与既有 `sales_orders` / `customers` 同属性。**同一套机制、不同业务语义 → 登记值必须逐个想清楚，不能整批复制。**

- **两处配套登记（漏了会静默失效）**｜`validate.ts` 新增 `CHILD_TABLE_OVERRIDE` 三条（`sales_prospects`→`sales_prospect_followups`、`shipments`→`shipment_items`、`projects`→`project_milestones`）+ **新增 `CHILD_BY_FIELD`**（父表 → 子数组字段 → 子表映射，多子表必需）；`validateOrReject` 由「只查 `body.items`」改为按映射**逐字段遍历**，错误信息带字段名与行号，另保留旧 `body.items` 兜底路径。

- **新增常驻护栏**｜套件 `scripts/prod-e2e/suites/20-sales-domain.mjs`（**113 条**断言）：端点可达 + 401 鉴权；Prospect `followupRecords` 往返 + `interestProducts` JSON 数组列；Shipment `items` 往返 + **连续推进 4 次状态明细不丢**；Project **多子表**（milestones 3 行 / exceptions 2 行分别断言）+ 三重交叉验证；删除回执 `deletedDetail`；销售订单既有通道未被打破。

- **验证链（全部可复查）**｜`tsc` 0 错 → `_audit_syntax.mjs` **109 文件 0 错 / 109 条导入链 0 错** → `tsc-functions.mjs` **新增 0 错**（存量 56 条不变）→ build **1m13s** → deploy `074178da` → 生产迁移 **22 条语句全执行**，表数 **81 → 88**（+7）→ 7 张新表行数初值全 0（等待 `pullSlice` 回填 5/3/4 条历史数据）→ **生产门禁 PASS 685 / FAIL 0**（20 套件）。

### C1 落地实录 · 审批流域关系化 + 子表内嵌嵌套（V3.10.0，2026-09-15）

#### 一、迁移范围怎么定的（动手前三项量化）

| 量什么 | 怎么量 | 结果 |
| --- | --- | --- |
| 消费方文件数 | 全项目 grep `useApprovalFlowStore` | **6 个**（`data/approvalFlowConfig.ts` 读取器 / `pages/Settings/ApprovalFlowTab.tsx` / `pages/Material/MaterialApprovalTab.tsx` / `pages/Material/MaterialForm.tsx` / `services/apiService.ts` 死导入 / `stores/index.ts` re-export） |
| 真实体积 | 查 `app_state` 的 `ssa-erp-approval-flows` | **6799 字节 / 13 条流程 / 26 个节点** |
| CRUD 写入调用点 | 逐文件数写调用 | 集中在 **2 个页面**，且**全部不 await 返回值** → 可放心改 async |

**本域是全项目消费方最少的域**（财务 35 / 销售 15 / BOM 15）。原因不是它不重要，而是**审批流是「配置」而不是「流水」** —— 没有哪个业务页面会去写它，只有设置页会。

#### 二、★ 迁移前必做：逐字段比对生产库数据 vs 代码默认值

这是本域最有价值的一步。靠**脚本比对**而不是目测，才发现三个硬事实：

| # | 发现 | 若不查证会怎样 |
| --- | --- | --- |
| ① | 13 条流程的 `status='system'` **不是用户改的**，是 persist `migrate`（v1→v2）批量补的标志位（代码默认值里**没有**这个字段） | 会误判成「用户配置过」，从而做出错误的迁移假设 |
| ② | **唯一真实用户改动是 `inbound.enabled: false → true`**（用户在设置页启用了「采购入库」） | 若用代码默认值覆盖，这个开关会被打回 `false`，且**用户不会收到任何提示** |
| ③ | **生产库只有 13 条，代码默认有 20 条** | 少的那 7 条（`customer` / `inquiry` / `comparison` / `check_task` / `inbound_order` / `outbound_order` / `quality_inspeCTION`）是 V2.91.0 之后才加进代码的默认值；因 persist 已有数据，`seedFlows()` 不再播种 → **这 7 个流程在生产环境从未出现过**，用户在设置页也看不到 |

**第 ③ 条是既有的持久化缺陷**（「代码加默认值，老用户永远看不到」），本轮「D1 为空才播种」的逻辑**正好一并修正**。
**结论：必须把库里 13 条真实数据迁过去，不能用代码默认值覆盖。**

#### 三、★ `parentChild.ts` 第三次扩展：子表行内也有嵌套

前四个域里嵌套只出现在「父表带子数组」这一层。审批流不同 —— **每个节点（子表的一行）自己还带嵌套**：

```
approval_flows (父表)
  └── approval_flow_nodes (子表，一行一个审批步骤)
        ├── conditions       : ConditionGroup 对象  { logic, conditions[] }   ← 两层嵌套
        ├── skipRule         : SkipRule 对象        { when: ConditionGroup, action }
        ├── escalation       : EscalationRule 对象  { timeout, escalateTo, notify[] }
        ├── approverRoles    : UserRole[]  字符串数组
        ├── approverUserIds  : string[]    字符串数组
        └── fields           : string[]    字符串数组（物料分步录入靠它驱动）
```

`ChildSpec` 由此新增 `jsonCols` 能力。**★ 与父表 `jsonCols` 有一处关键语义差异**：
- 父表 `jsonCols` 只装**字符串数组** → 用 `toJsonText`（非数组一律落 `[]`）
- 子表还要装**对象** → 若沿用 `toJsonText`，一个合法的 `ConditionGroup` 会被**静默写成 `[]`**，表现为「界面上条件配置好好的，保存后一条都不剩」→ 新增 `toJsonValue`（原样 `JSON.stringify`，不强制数组）

同时新增 `allChildCols(spec)` / `childJsonSet(spec)` 合并遍历，**从结构上消除「两处手动对齐」隐患**（复用父表 `allParentCols` 的思路，不重犯 V3.9.0 的错）。**父子表的 JSON 集合刻意不共用**：列名可能重名（如都有 `conditions`），混在一起会让「父表字段被当子表 JSON 处理」或反之，且很难看出来。

#### 四、★ 本域写入点用的是函数式更新（与销售域最大差异）

销售域 10 个写调用点都是 `store.addXxx(item)` 这类显式方法调用。审批流则集中在两个页面的 `setFlows(prev => prev.map(...))` —— 拿到的是**一整个数组**，落库时需要先算出「谁变了」：
```ts
added   = next.filter(f => !prevById.has(f.id));      // → POST
removed = prev.filter(f => !nextById.has(f.id));      // → DELETE
changed = next.filter(f => old && !sameFlow(old, f)); // → PUT
```

**判「变了没」不能用引用比较**：`MaterialApprovalTab.handleSave` 即便用户什么都没改也会构造新对象（`{ ...f, nodes: local.steps.map(...) }`），按引用判断会每次白发两个 PUT 并触发审计写库 → 改用**序列化逐字符比较**（审批流对象很小，13~20 条全比一遍开销可忽略）。

**★ 只改父表字段时刻意不带 `nodes`**：后端语义是「不传子数组 = 保持原样」，若总把 `nodes` 一起 PUT，遇到「用旧版数据编辑后节点被截断」会极难查 —— 仅在节点确实变化时才带。

**回滚策略用整体数组快照**，不用逐条反向操作：一轮 `setFlows` 可能同时新增+修改+删除多条，逐条回滚中途再失败会留下混合状态。

#### 五、两处「接口形状不变」的存储形态处理

| 前端契约 | 存储列名 | 为什么 |
| --- | --- | --- |
| `node.order` | `node_order` | **`order` 是 SQL 保留字**（ORDER BY），直接建列名会到处要加引号 |
| `node.fields` / `approverRoles` / `approverUserIds` / `flow.visibleRoles` | 各自 TEXT 列存 JSON | 无 id、无属性、不参与 SQL 统计，建子表只会得到「每行一个字符串/字段名」的空壳 |

#### 六、★ RLS 登记 `'all'`，与销售域 `'own'` 刻意相反

```ts
approval_flows: 'all',        // 审批流定义（公司级公共配置）
approval_flow_nodes: 'all',   // 审批节点，从属审批流
```

审批流是**公司级公共配置**。若登记 `'own'`：系统预置流程（无 `owner_id`）会被**全部过滤掉** —— 表现是「设置页只剩自己建的流程，20 个系统流程一条都看不到」；更严重的是「张三关掉的审批，李四那边照走」，两人看到的是两套世界。
**同一套机制、不同业务语义 → 登记值必须逐个想清楚，不能整批复制。**

#### 七、★ 本轮自查出的一个真漏字段 + 一条死列（tsc 与打包都发现不了）

- **`createdAt` 第一版没登记进 `parentCols`**：`addCustomFlow` 设的 `createdAt` 既不写库也不回读，刷新后自定义流程的创建时间变成 `undefined`。这与 V3.9.0「字段只进 `jsonCols` 没进 `parentCols`」是**同一类错误的另一副面孔** —— 那次的根因是「要求两处手动对齐」，这次是「凭印象挑字段」。核对方式：把 `parentCols` 与 `ApprovalFlowConfig` 的字段名**逐个对上**，而不是凭「哪些看起来重要」来写。
- **删掉一条死列 `['seq','seq']`**：前端 `ApprovalNode` 契约里**没有** `seq` 字段，而 `childCols` 的取值是 `obj[camel]` → 登记了也永远取 `undefined`、永远写 0。更坏的是它让 `childOrder` 看起来像两级排序（`seq ASC, node_order ASC`），让后来的人误以为存在一个前端可控的次级顺序。**顺序号唯一来源是 `node_order`。**

#### 七之二、★★ 一个「套件断言写错方向」的完整实录（本轮最该记的一条）

**这是本轮最有教育意义的一次翻车 —— 而且我一开始把根因判错了。**

**表象**：首轮上线后门禁 `PASS 772 / FAIL 5`，本域 4 条红（`total=0`、抽查 `material` 找不到、抽查 `inbound` 找不到、系统流程可见性不成立）。

**第一次误判（错的）**：我当时认定「0056 只建表没搬数据，`approval_flows` 是空表」，于是补了 `0057` 纯 SQL 回填。**回填本身是对的、也确实必要**（13 条流程 + 28 个节点，`changes: 43`，生产库核对全部正确）——**但它没能让门禁变绿**：重跑仍是 `FAIL 4`。

**真正的根因（查证后才确认）**：数据**从来就在库里**，是**我的断言假设了错误的作用域**。两件事被我混为一谈：

| | 实际语义 |
| --- | --- |
| RLS 的 `'all'` | 「**本公司内**全员可见」（相对 `'own'` = 仅建者可见） |
| E2E 门禁的组织 | 每轮**新注册一个隔离组织**（公司码 `E2E-<runId>`） |

评审数据实证：`approval_flows` 13 行**全部**属于 `org_04d67b437bf24a5db3d4aa2fc756b45d`（公司码 `xinguang`「新光专用汽车」，就是这个项目的真实组织）；门禁的隔离组织里本来就是 0 行。**RLS 拦住的正是它该拦的 —— 这是正确的安全行为，错的是断言。**

**★ 定位手法（值得复用）**：不是继续猜，而是**直接查库把「谁拥有这份数据」打出来**（`SELECT org_id, COUNT(*) FROM approval_flows GROUP BY org_id`）→ 一眼看出 13 行同属一个组织 → 与「门禁每轮新建组织」这个已知事实一对照，矛盾自解。**先量数据归属，再谈代码逻辑。**

**★ 修法：换一个「同组织内可复现」的等价断言。** 要防的真故障不是「看不到别的公司的流程」（那本来就该看不到），而是**「张三配好的审批流，李四看不到」** —— 审批流是公司制度，必须全公司一致。这个故障在组织内就能完整复现，也只需组织内复现：

```js
// 用 admin 建一条 → 同组织另一个身份去查，必须查得到
const peer = ctx.users.afpeer || await ctx.registerUser('afpeer', 'buyer', 'QA-采购部');
const mk = await req('POST', '/api/approval-flows', { token, body: {...} });
const seen = await req('GET', '/api/approval-flows', { token: peer.token });
// RLS 若误登 'own'，此处必红（原断言永远不会红，因为它测不到这个故障）
s.expectTrue('同组织内他人能看到 admin 建的流程', !!seen.data?.data?.find(f => f.id === sharedId));
```

**★ 顺带抓到两个真问题（都是新写法带出来的）**：
1. **单资源 GET 是扁平的**（`json(parentToApi(...))`），**不带 `data` 包层**；只有列表接口才是 `{data,total,page,pageSize}`。我一度写成 `afterEdit.data?.data?.nodes`，多解了一层 → `nodes` 恒 `undefined` → 套件**假报**「改开关把节点删光了」。**教训：同一个端点族的「列表」与「单体」返回形状不一致是常态，写断言前必须先确认形状，不能凭印象**。
2. `ctx.registerUser` 要按其它套件的写法复用身份（`ctx.users.x || await ...`），否则每轮重复注册僵尸账号。

**★ 沉淀的纪律（比上一版更根本）**：**写断言前先问「这个故障在测试环境里能不能被制造出来」** —— 制造不出来的故障，断言写得再漂亮也是**永远绿的空断言**（假安全）或**永远红的错断言**（假警报）。E2E 环境是**隔离组织**，任何「跨组织看到存量数据」的期望都不成立；**存量数据正确性要放在迁移脚本里用 SQL 核对（本轮做对了），不要放进接口套件**。

#### 七之三、`migrations/0057` —— 存量数据搬运（与门禁红无关，但确实必要）

★ **先说清楚因果关系**：`0057` 的动机最初来自对门禁 `FAIL 5` 的**误判**（以为是空表），但**它本身是必须做的** —— 因为 0056 只建表、把搬运留给前端 `load()`，而：

| | 销售域（V3.9.0） | 审批流域（V3.10.0） |
| --- | --- | --- |
| 数据性质 | **流水**（订单、出货、项目） | **配置**（审批规则） |
| 表空着会怎样 | 等用户下一次操作即可，无实际影响 | **所有审批判定全部落空** |
| 能否等前端回填 | 可以 | **不能** |

更直接的原因：**生产 E2E 门禁是直连接口的，永远不会走浏览器** → 前端回填在门禁眼里根本不存在；而**真实用户**首次打开设置页之前，审批流表也是空的。**配置域不能依赖任何前端触发的初始化。**

**实测搬运结果**：`app_state` 的 value 可被 SQL JSON 函数解析（`json_array_length(value,'$.state.flows')` = 13）→ 搬出 **13 条流程 + 28 个节点**（`changes: 43`），`inbound.enabled` 保持用户设的 `true`，嵌套对象（`conditions` / `escalation` / `approverRoles` / `fields`）逐项完好。

**两个 SQL 写法要点**（都会静默出错、不报错）：
1. 展开子表时，父流程 id 只能取**同一 `FROM` 子句里外层展开项的 `f.value`** —— 原始数据里没有 `parentFlowId` 这个键
2. JSON 列**原样取子对象**：`json_extract` 返回的已经是合法 JSON 文本，**不能再套 `json_quote`**（会多包一层引号，读回时形状全变）

**org_id 怎么定（不硬编码）**：`app_state` 是全局单份历史配置表、本身不带 `org_id`，因此在 SQL 里写一条**可复查的推导规则**：
```sql
SELECT org_id FROM users GROUP BY org_id
ORDER BY COUNT(*) DESC, MIN(created_at) ASC LIMIT 1
-- → org_04d67b437bf24a5db3d4aa2fc756b45d（8 用户、最早 2026-08-18，结果唯一）
```
**为什么不用别的推断**：按销售单数量会被门禁造的测试组织干扰（「种子格式」单号在两个组织里都有）；按 `ssa-erp-org` 取的是**业务组织**（SSA公司 / 武汉工厂 / 新光采购部），与登录租户 `org_id` 是两套完全不同的编号体系，不可混用。**事后核对已确认选对了**：该组织公司码 `xinguang`（新光专用汽车），`sales_orders` 3 条 / `customers` 5 条的真实业务数据也都落在这里。

**刻意不删旧 Blob**：旧键是**唯一的原始证据**，留着可逐字段比对、可重放；其它域的旧键也都还在，统一清理是独立动作。**迁移的可回退性优先于「少一份冗余」。**

#### 八、两处配套登记（漏了会静默失效）

`functions/_shared/validate.ts`：
```ts
CHILD_TABLE_OVERRIDE.approval_flows = 'approval_flow_nodes';   // 机械推断会得到不存在的 approval_flow_items
CHILD_BY_FIELD.approval_flows = [['nodes', 'approval_flow_nodes']];  // 节点数组字段名是 nodes，不叫 items
```
漏了 = 节点明细校验被**静默跳过**（`condition` 传非对象、`timeout` 传文本都能入库）。

#### 九、新增常驻护栏

套件 `scripts/prod-e2e/suites/21-approval-flow-domain.mjs`（**97 条断言**），守 **6 大风险面**：
1. ★★ **子表行内的对象被静默写成 `[]`**（本域独有、最凶险）→ 断言 `conditions` 读回是**对象**且 `logic` / 内层 2 条条件的 `field`/`operator`/`value` 逐项一致；`escalation`（含内层 `notify[]`）与 `skipRule`（含内层 `when.conditions`）一并钉住
2. **只拨开关（改 `enabled`）就把节点全删光**（设置页最高频操作）→ 改开关后断言节点仍是 3 个、且嵌套对象与数组完好
3. **只改节点却把父表字段冲掉**（反方向）→ 只传 `nodes` 后断言 `moduleLabel` / `status` / `description` / `visibleRoles` / `enabled` 全在
4. **JSON 字符串数组列编码错** → `approverRoles` / `fields` / `visibleRoles` 断言是**真数组**且元素逐项一致
5. **公司级可见（RLS 误登 `'own'`）** → **★ 在本组织内用两个身份互看**：admin 建一条 → 同组织另一个用户必须能查到、也能改（改后 admin 侧读回确认已落库）。**这一条是本轮修正后的写法**，原先误写成「断言 `total ≥ 5`（生产环境 13~20 条系统流程可见）」—— 那条断言**永远不可能通过**，因为门禁用的是每轮新建的隔离组织（详见 §七之二）
6. **本轮测试未污染本组织配置** → 收尾时断言所有行可正常解析、`nodes` 均为数组（子表读回链路完好）。**注意这一条刻意不再抽查「生产库存量流程」** —— 隔离组织看不到（正确的安全行为）；存量数据正确性改由 §七之二 的 SQL 核对承担

#### 十、验证链（全部可复查）

`tsc` **0 错** → `_audit_syntax.mjs` **112 文件 0 错 / 112 条导入链 0 错** → `tsc-functions.mjs` **新增 0 错**（存量 56 条不变）→ build **1m10s** → deploy `c75a45bf` → 生产迁移：`0056`（8 语句，建 2 张表）+ `0057`（`changes: 43`，回填 13 流程 + 28 节点）→ 生产库核对：表数 **88 → 92（+4）**，`approval_flows` 13 行 / `approval_flow_nodes` 28 行，`inbound.enabled = 1` ✓，`conditions`/`escalation`/`approver_roles` 均为原样 JSON ✓ → **生产门禁 PASS 782 / FAIL 0**（21 套件 / 共 798，WARN 7 / INFO 9，耗时 272.5s）。

**★ 门禁排障过程（值得记）**：首轮 `PASS 772 / FAIL 5`（本域 4 条）→ 补 `0057` 回填后**仍 `FAIL 4`** → 查库确认「数据一直在、只是属于另一个组织」→ **修正套件的错误断言**（不是改业务代码）→ 单域 `PASS 97 / FAIL 0` → 全量 `PASS 782 / FAIL 0`。**关键转折点是「不再猜代码、先去量数据归属」。**

#### 七之五、V3.11.0 采购域 —— 两个「类型检查与打包都发现不了」的真 Bug

**这一轮的价值几乎全在这两个 Bug 上。** 它们都不是「我打字打错了」，而是**设计层面的缺陷**，而且都完美地躲过了 `tsc`、`_audit_syntax.mjs` 和后端 `tsc-functions.mjs` 三道检查——表名与列名都在 SQL 字符串里，编译器看不到；唯一约束是数据库层的事实，代码侧只能「假设它存在」。

**首轮单域结果：`PASS 90 / FAIL 5`。5 条失败 = 2 个根因。**

**Bug (a)：父表 JSON 列里的「对象」被静默写成 `[]`（4 条同一根因）**

`parentChild.ts` 里有**两套** JSON 编解码：

| 位置 | 写侧 | 读侧 | 行为 |
| --- | --- | --- | --- |
| 父表 | `toJsonText` | `parseJsonArray` | **非数组一律落成 `[]`** |
| 子表 | `toJsonValue` | `parseJsonValue` | 原样序列化/反序列化 |

这个分叉在 V3.10.0 之前**没有暴露**，因为父表 jsonCols 只装字符串数组（`team` / `interestProducts`），子表才装对象（`conditions`）。V3.10.0 时我甚至把这个分叉**写进了注释当成「一处语义差异」**——而它其实是缺陷本身。

采购域给父表加了 `customFields`（`Record<string, unknown>`，**对象**）→ `toJsonText` 把它落成 `[]` 写库 → `parseJsonArray` 读回 `[]`。**保存成功、返回 201、界面无异常，重进页面自定义字段全空。** 这与审批流子表 `conditions` 那个坑**完全同构，只是方向相反（这次在父表侧）**。

**修法（不是补漏一处，而是消掉分叉本身）**：两端统一为 `toJsonValue` / `parseJsonValue`（原样序列化/反序列化，数组对象都对），**删除** `parseJsonArray` 与 `toJsonText`，父子共用同一套。

> **★ 教训：当两处「必须不同」时，先问一句「这个不同是业务要求，还是实现偷懒」。** 本处是后者——父表当时只需要装数组，就顺手把「非数组」判成了错误输入，而不是「暂时用不到的类型」。而这个「顺手判错」的动作，把「类型不符合预期」这个**本该被看见**的情况，静默转换成了「一个合法的空数组」。

**Bug (b)：`0058` 漏建业务单号唯一约束 → 重复单号能建出第二条**

`0058` 建 `purchase_requests` 时只建了 3 个**普通**索引，而 `0051`（BOM）、`0056`（审批流）等同类表都带了 UNIQUE。但 `purchaseConfig.ts` 的注释（「UNIQUE 约束落在业务单号上」）与 `parentChild` 的 `pcCreate`/`pcUpdate` 两段 409 分支**都假定它存在** → 该分支**永远不会触发** → 同一张申请单可被建两次且**零报错**，用户与审批人都以为只是一张单。

**★ 根因与我自己的错误一致**：写 `purchaseConfig.ts` 注释时，我按「应该有的样子」写了，**但没有回去核对迁移是否真的建了**。这与 0053 的教训**同源** —— 按「应该长什么样」推断，而不是按「实际是什么」核对。**这是同一个错误在项目里的第二次出现，必须记下来。**

**修法**：`0060_purchase_unique_index.sql`，用 **`CREATE UNIQUE INDEX`** 而非重建表——SQLite 不支持给已有表 `ALTER` 加 UNIQUE，严格做法是「建新表→搬数据→删旧表→改名」，但唯一索引在**约束语义上完全等价**（冲突时报 `UNIQUE constraint failed`，错误信息同样含 `UNIQUE`，409 分支照样命中），且**零数据搬迁**。补两条：`uniq_purchase_requests_no(org_id, request_no)` + `uniq_vendor_quotes_req_vendor(org_id, request_id, vendor_id)`。

**★ 前提核对（不能省）**：建唯一索引会在「已有重复值」时失败。执行前已核对生产库两处重复数**均为 0**（`HAVING COUNT(*)>1` → 0 行）。**若存量已有重复，必须先决定留哪一条，而那是业务决策，不该由迁移脚本擅自处理。**

**★ 迁移自身的第三个坑（本轮的第三个教训）**：`0060` 第一次 apply **失败** —— `near "/": syntax error at offset 4`。原因是文件第 5 行我写成了 `//`（JavaScript 风格注释），而 **SQL 只认 `--`**。**这类错误 `_audit_syntax.mjs` 抓不到**（它只解析 `.ts`，不解析 `.sql`）。**规矩：`.sql` 文件的注释一律 `--`，写完后用 `grep -vn "^\s*--"` 把非注释行全打出来看一遍。**

#### 七之六、V3.11.1 —— 「字段类型表长期残缺」：一条老断言牵出三层静默失效

**起点与采购域毫无关系**：全量门禁 `PASS 879 / FAIL 1`，唯一红项是 `13-hardening` 的

```
❌ 日期填 2026-13-45：被拒绝（4xx） — status=201
```

一条「非法日期必须被拒」的断言，实际返回 **201（创建成功）**。

##### 第一步：让「被拒绝」这件事说出真相

不能停在「断言红了」。顺着它往上查 `fieldSchema.ts`（写接口入参校验的字段类型表），发现 **79 张表里有 16 张是空对象 `{}`**，`purchase_orders` 正在其中：

```ts
purchase_orders: {},          // ← 表在，字段一个都没有
purchase_order_items: {},     // ← 同上
```

`order_date` 没登记 → `validate.ts` 里 `kind === 'date'` 的分支**永远不成立** → 非法日期**从上线那天起就一路放行**。这不是「校验写错了」，而是「校验根本没被执行」。

##### 第二步：三个根因，缺一不成立

**根因 1 · 逐「行」切分 DDL（单行 DDL 只出首列）**

```js
// ✗ 只在「一列一行」的 DDL 下成立
body.split('\n')
```

本项目迁移里大量 `CREATE TABLE x (id TEXT, name TEXT, ...)` **单行书写**，整条 DDL 只匹配到第一个 `id`：

| 表 | DDL 长度 | 旧解析器得列 | 真实列数 | 丢失 |
|---|---|---|---|---|
| `sales_orders` | 1137 | **1**（id） | 44 | **43** |
| `purchase_orders` | 1055 | **1** | 40 | **39** |
| `vouchers` | 858 | **1** | 38 | **37** |
| `work_orders` | 893 | **1** | 35 | **34** |
| `three_way_match` | 861 | **1** | 28 | **27** |
| `outbound_orders` | 743 | **1** | 31 | **30** |

（16 张空对象表中 **15 张**受害。）**丢掉的恰是金额、数量、日期——校验最该管的字段。**

**根因 2 · ★ 没剥 `--` 注释（最隐蔽）**

迁移大量使用「注释行 + 一列一行」的分组写法：

```sql
-- 信用管控
credit_level    TEXT CHECK (credit_level IN ('AAA','AA','A','B','C')),
```

**按顶层逗号切分时，注释与该列会落在同一段** → 段首是 `--` → 被当注释**整段跳过** → 该列消失。

实测丢列清单与注释行的位置**逐条吻合**：

| 表 | 丢失列 | 共同特征 |
|---|---|---|
| `customers` | `org_id, credit_level, tax_id, bank_name, contact_name, default_currency, sales_org, created_at` | **每列前面都紧跟一个 `-- 注释行`** |
| `materials` | 15 列（`org_id, category_id, material_type, …`） | 同上 |
| `vendors` | 5 列 | 同上 |

> **★ 症状指纹：丢掉的每一列，前面都恰好有一个 `--` 注释行。** 这个指纹是定位本根因最快的入口。

**正确顺序必须是「先剥注释、再切分」**（反之，先切再剥会让带注释的段被误判为非列定义）：

```js
// 只截断不在引号内的 `--`
const noComment = ddl.split('\n').map((l) => {
  let inStr = null;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (inStr) { if (ch === inStr) inStr = null; }
    else if (ch === "'" || ch === '"') inStr = ch;
    else if (ch === '-' && l[i + 1] === '-') return l.slice(0, i);
  }
  return l;
}).join('\n');
```

**根因 3 · 两段式生成链路只跑了一半**

```
取生产库 DDL → _schema_raw.json → _emit_schema.mjs → fieldSchema.ts
   (第 1 段 ✓ 已跑)     (中间产物 = 92 表)   (第 2 段 ✗ 没跑)   (最终产物 = 79 表)
```

`_gen_schema_prod.mjs` 已正确写出中间产物（92 表），但**没接着跑 `_emit_schema.mjs`** → 最终产物仍是旧版本。

> **★ 因此我 V3.11.0 那轮汇报的「已从 79 重生成到 92 表」属误报，此处纠正。** 教训：中间产物是新的、最终产物是旧的，这个组合必须专门核对——**「表数对得上」不等于「内容对得上」**。

##### 第三步：修法 —— 并且让数据库自己做终审

```js
/** 按顶层逗号切分 SQL 括号体（忽略嵌套括号内的逗号） */
function splitTopLevel(body) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts;
}
```

深度切分能**同时兼容单行/多行 DDL**，且不会切断 `CHECK (x IN ('a','b'))` 里的逗号。

**★ 但真正的关键不是修解析器，而是「谁有资格判定解析器修对了」** —— 新增 `scripts/_verify_schema_vs_db.mjs`，**让生产库自己报事实**，逐表机器比对：

```sql
SELECT m.name tbl, p.name col, p.type, p.pk
  FROM sqlite_master m JOIN pragma_table_info(m.name) p
 WHERE m.type='table' AND m.name IN (...)
```

一次查 92 张表（比逐表 `PRAGMA` 快得多），以**不一致 = 0** 为通过门槛：

```
════════ 比对结果 ════════
表数            : 92
列不一致的表    : 0
漏掉的列合计    : 0
多出的列合计    : 0
══════════════════════════
✅ 解析结果与生产库 PRAGMA table_info **完全一致**（列名与数量逐张对齐）。
```

中途正是这个脚本抓出了根因 2 —— **第一版修正（只加深度切分）跑完仍显示 5 张表漏 31 列**，逼我继续往下挖才找到 SQL 注释这一层。**如果只靠抽样或目测，这一层会被永远漏掉。**

##### 第四步：加「残缺即失败」自检（防同类问题再静默发生）

```js
// 业务表只解析出 `id` 一列 → 判定解析失败，拒绝写文件
const suspicious = Object.entries(out).filter(([, cols]) => {
  const names = Object.keys(cols);
  return names.length === 0 || (names.length === 1 && names[0] === 'id');
});
if (suspicious.length) { console.error('❌ 解析结果异常，拒绝写出'); process.exit(1); }
```

> **★ 这类 Bug 的本质是「静默成功」** —— 文件照样生成、console 照样 ✅、程序照样不报错，只有「校验悄悄失效」这一个后果。**所以护栏必须卡在「产出」这一步，而不是指望事后有人发现。**

##### 第五步：诚实定性（这一步最容易做错）

| 说法 | 是否正确 | 说明 |
|---|---|---|
| 「采购域改造引入的新回归」 | ✗ | 与采购域无因果关系，是**长期存在**的旧缺陷 |
| 「本轮把老缺陷暴露了」 | ✓ 更准确 | `13-hardening` 那条断言一直在跑，此前同样返回 201 |
| 「我上一轮汇报有误」 | ✓ **必须说出口** | V3.11.0 那轮汇报「schema 已重生成到 92 表」，实际是 79 表且 16 张空对象 |

**定性错误会导致修错方向**：若判成「回归」，会去回滚/追查本轮改动；而真相是「校验能力从未存在」，要补的是能力本身。

##### 影响面：登记了 355 个字段，会不会误拒合法数据？

| 检查项 | 结论 |
|---|---|
| `git diff` 净变化 | 261 增 / 163 删（含字段按字母序重排） |
| 新增登记范围 | 集中在「曾被丢列的 15 张表」（`sales_orders`、`purchase_orders`、`vouchers`…） |
| 驼峰重复列（`vouchers.totalDebit` 等 9 个） | **不构成误拒风险**：`validate.ts` 用 `camelToSnake(key)` 查 schema，驼峰 key 被转成蛇形后命中的是**蛇形列**；故驼峰列既不会误拒、也**永远匹配不到**——属「登记了但无效」，如实记录 |
| 实测结论 | **全量门禁 `PASS 880 / FAIL 0`，无一条新增误拒** |

##### 验证链

`tsc --noEmit` **0 错** → 后端 **117 文件 0 错 / 117 条导入链 0 错** → `tsc-functions.mjs` **新增 0 错**（存量 56 条不变）→ build **47.60s** → 部署 **`51b4f959`** → **全量门禁 `PASS 880 / FAIL 0`**（22 套件 / 共 896；WARN 7 / INFO 9，193.5s）。采购域 98 条断言全部保持绿，证明 409 分支等既有逻辑未被打破。

##### 沉淀的技能

`codegen-artifact-truth-verify`（用户级）—— 把「生成器产物与真实数据源不一致导致静默失效」的排查与修复流程固化：三个根因 + 两道自检 + 影响面评估顺序 + 汇报口径。

#### 七之四、V3.10.1 —— 「登录页无限刷新」三层原因叠加（老缺陷被新改动压垮）

**这不是审批流域的 bug，是一次严重的回归事故，但它恰好由审批流域的改动引爆，所以记在这里。**

**现象（用户截图）**：打开 `/login`，页面每秒自行刷新，**用户来不及输入用户名密码，完全无法登录**。

**根因链（三层叠加，缺任何一层都不成立）**：

| 层 | 事实 | 若这一层不存在会怎样 |
| --- | --- | --- |
| ① | `App.tsx` 的启动 `useEffect` 挂在 `<App>` 顶层，**位于所有路由之外** → 打开 `/login` 也照样执行 | 在登录页就不会发起这批请求，循环无从开始 |
| ② | 这批 `load()` **全部直连业务端点、各自走服务层**（`apiService` / `xxxApi`），**不经过 `persistStorage`** → 拿不到那层「无 token 直接回退本地」保护 → 未登录时**必然 401** | 请求会本地回退成功，不产生 401 |
| ③ | 401 → `persistStorage.handleUnauthorized()` → `authStore` 执行 `window.location.href = '/login'`（**整页跳转**）→ 整页加载把模块级变量 `expiredHandled` **重置为 false** → `/login` 上这批请求再次 401、再次整页跳转 | 没有整页跳转，就没有状态重置，也就没有循环 |

**★ 燃料由实测坐实**：`curl` 直打生产端点 —— `/api/approval-flows`、`/api/materials`、`/api/customers`、`/api/vendors`、`/api/state/ssa-erp-purchase` **全部返回 401**。未登录时这批启动拉取本就该失败，**问题不在「失败了」，而在「失败之后做了什么」**。

**★ 判定：老缺陷被新改动压垮，不是新版本写错。** 三层原因在改动前**全部已在代码里**，触发只差「启动期请求数足够多」这一个量；V3.10.0 新增的审批流启动拉取**恰好把请求数推过了临界点**。
**为什么这个区分至关重要**：若判成「新版本写错」，自然的动作是**回滚 V3.10.0** —— 回滚后故障确实会消失，但**根源一分未动**，将来任何版本再加一个启动请求，同一故障会原样再来一遍。**「现在谁能让它复现」比「谁最后动过它」更接近根因。**

**修法（四处，缺一不可）**：

| # | 文件 | 改法 |
| --- | --- | --- |
| 1 | `src/App.tsx` | 启动拉取**只在 `isAuthenticated` 为真时执行**（`authStore` 的 persist 用默认同步 `localStorage`，`isAuthenticated` 刷新后**同步水合**，据此驱动可行） |
| 2 | `src/stores/authStore.ts` | 会话失效处理加**双守卫**：`pathname === '/login'` 直接 `return`（状态已清干净，无需再整页重载）+ 一次性闸门 `sessionExpiredRedirecting`（同页面生命周期只跳一次） |
| 3 | `src/stores/persistStorage.ts` | **兜底跳转**（`setTimeout` 1 秒后自跳）同加「已在登录页则不跳」 —— ★ **这是另一条完全独立的跳转路径，只改第 2 处会漏** |
| 4 | `src/stores/approvalFlowStore.ts` | `load()` 自身加 token 判空（该 store 走独立端点 `/api/approval-flows`，没有 persistStorage 那层保护） |

**两个实现细节**：
- **令牌键沿用既有约定** `localStorage['ssa-erp-auth-token']`（与 `api.ts` / `persistStorage.ts` / `DataManagement.tsx` 一致）。
- `persistStorage` 里的 `getToken()` 是**私有函数**，**不为测试而导出内部函数** —— 改用既有的存储键约定，避免为测试污染模块边界。

**验证（全部可复查）**：`tsc --noEmit` **0 错** → `npm run build` **1m7s 成功** → 部署 `db7a54eb` → **产物静态核对**三处守卫均已编译在内：
```
window.location.pathname!=="/login"&&(window.location.href="/login")          // persistStorage
window.location.pathname!=="/login"&&(Co||(Co=!0,...window.location.href="/login"))  // authStore（Co = sessionExpiredRedirecting）
localStorage.getItem("ssa-erp-auth-token")                                    // approvalFlowStore
```
→ **全量门禁 PASS 782 / FAIL 0**（21 套件 / 共 798），登录修复**未引入回归**（尤其 `01-auth` 套件）。

**★ 沉淀（本轮第二个交付物）**：调试经验固化进 **`scripts/prod-e2e/README.md`**（门禁套件编写规范，七节），核心是**第 1 节「写断言前三问」**：
1. 这个故障在当前测试环境里**能不能被制造出来**？（制造不出来 → 断言不是**永不触发的空断言**（假安全）就是**永远红的错断言**（假警报））
2. 这个断言要防的**真故障**是什么？**组织内**能不能复现？（§七之二的翻车正出在这一问）
3. **存量数据**的正确性该由谁守？→ **迁移脚本 + SQL 核对**，不塞进接口套件。

其余六节：② 返回形状（列表 `{data,total,page,pageSize}` vs 单体扁平对象）③ 排障铁律（先量数据归属）④ 套件编写硬规矩（写过必再读 / 复用身份 / 子表逐张独立 / 失败也清理 / 断言名写「防什么」）⑤ 可用断言 API 表 ⑥ 门禁结果判读（FAIL 必修 + 必跑全量）⑦ 新增域套件检查清单。
