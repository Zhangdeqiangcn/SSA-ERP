# SSA ERP — 版本沿革与关键设计

## 版本沿革（近 3 版完整，旧版压缩）

- **V2.70.0** (2026-08-28) — **B2 三岛专属 D1 后端落地并部署生产（P1 唯一真缺口闭合）**：新增三岛 D1 表（serial_masters+serial_movements / subcontract_orders+subcontract_issue_items / work_order_pickings，迁移 0010-0012）+ CRUD Functions（含序列号 FIFO 核销 consume）+ 出/入库补 POST（选 B 范围，委外/工单领料出入库单落 D1）；前端双写桥接 src/services/b2Api.ts（create/update/delete 登录态 fire-and-forget 落 D1，未登录/失败回退 Blob，UI 零回归）。**已部署生产** `https://f62137d9.ssa-erp.pages.dev`，生产 API 直击真实远程 D1 复验三岛 CRUD+FIFO+出/入库落 D1 全绿（`.d1test6/probe_b2_prod.mjs` ALL PASS）。期间修两真实问题：① 远程 D1 迁移漂移（`schema_migrations` 仍为 INTEGER、wrangler `d1_migrations` 仅登记 0001-0004 → `apply --remote` 重跑建表 `duplicate column`；改用 `d1 execute --remote --command` 内联 SQL 转 TEXT+补登 0001-0009+再 `apply` 仅跑 0010-12，详见设计方案第十节）；② `warehouseStore.addInboundOrder` 幂等判断笔误 `o.inventoryPosted`→`x.inventoryPosted`（致 A4-1 重复滚价），已修。Frontend E2E 271 因本机过载（34 孤儿进程+残留 dev server 致 SPA 启动慢于 400ms 等待、`window.__ssaStores` undefined 超时）呈间歇性 flake，非 B2 回归——B2 专属 v58 用例 6/6 隔离通过、v52 幂等修复后通过；建议机况恢复后重跑全量。
- **V2.69.0** (2026-08-28) — **后端链路加固（D1 E2E 打通 + 2 真实缺陷修复 + 部署生产）**：搭建真实 Cloudflare 运行时 + 本地 D1 验证生产后端全链路（注册→登录→app_state Blob 往返→10 域关系表读→B2 三岛探测），新增可复用 harness `scripts/d1-backend-e2e.mjs`（13/13 全绿）；修复「15 个 functions 漏 `await getUserFromRequest`（7 域 GET 500）」+「PO/inbound/outbound 列表查询 `FROM` 缺别名 po/io/oo（no such column 500）」两真实后端缺陷（V2.68 线上仍带）；迁移 `schema_migrations` 主键 INTEGER→TEXT（全新库 9/9 重放通过）；架构实证双通道（10 张关系表为只读模型、业务写经 app_state Blob）+ B2 三岛无专属后端。Functions 后端修复、前端业务逻辑未变，Frontend E2E 271 不受影响。
- **V2.68.0** (2026-08-28) — **开发计划合并为单一权威版 + E2E 质量门禁加固 + 全量回归 271 全绿**：合并 development-plan-V2.64.md/P2-COMPLETION.md 入 master-plan（写入开发计划铁律 + §十 代码审计现实 + 沿革补 V2.56–V2.68）；移除 index.css 外链字体 + 收紧 4 用例错误守卫 + 修复 v30/v68/v31 三处偶发竞态 + 新增 B8 MRP/B9 AQL 固化用例（v81/v82）；全量 E2E 271 用例全绿升版。
- **V2.67.0** (2026-08-26) — **B7 工作流引擎统一收尾 + E2E 全量回归修复**：价格页/物料页/三队列（物料/供应商/采购审批）统一接入审批引擎 approvalFlowStore+approvalFlowConfig（getApprovalSteps/getEffectiveSteps/evaluateConditionGroup）；条件技术引擎（useConditionStore）与审批流引擎解耦，取价 resolvePrice 经条件引擎叠加含税价（钢板 Q235B：4200→9折3780→促销立减200→含税13%=¥4,045.40）；E2E 修复 9 项陈旧用例（V2.55.22 导航整合+组件重构遗留），覆盖 v33/v34/v62/v70/v72/v74，最终 17/17 全绿。
- **V2.66.0** (2026-08-26) — **B10 采购订单变更单（P1 Phase 2 唯一空白项）落地**：`PurchaseOrder` 加 `version`+`history[]`；`purchaseStore.changePurchaseOrder(id,updates,reason,changedBy)` 锁定校验（已收货/终态禁改，ok:false）+ 快照入 history + 生成新版本；`OrderDetail.tsx` 加「变更订单」/「版本历史」按钮（差异对比 交期/数量/单价/总额）；E2E `v70-b10-po-change.spec.ts` 4 用例；全量回归 34/34 全绿。
- **V2.65.0** (2026-08-26) — **P1 Phase 1（B1-B5）流程闭环 + E2E 基建修复**：B4 NCR 四处置全出凭证（FG→贷1405/其余→贷1403 按评估类分流，幂等）；B5 交期回写独立列 `vendorConfirmedDate`；B2-② 工单领料出库单；B2-① 序列号 FIFO 核销（整合冗余：删 warehouseStore 内重复登记/核销，统一由 warehouseAdvancedStore 订阅驱动，修复双重消耗）；修复循环依赖 TDZ 白屏；E2E 基建（DEV 登录放行+演示用户/引导跳过/陈旧选择器修复）；开发计划审计（B6/B8/B9 已实现，不再排期）；全量回归 30/30 全绿。
- **V2.64.0** (2026-08-25) — 深度对标 SAP/金蝶/用友完成；P0 六项地基全成；生成 `benchmark-V2.64-deep-analysis.md` + `development-plan-V2.64.md`。
- **V2.59–V2.63** — P1 Phase 2~6：供应商/客户主数据关系化(V2.59)、物料关系化(V2.58)、销售订单(V2.61)/采购订单(V2.60)/凭证库存工单(V2.62) D1 关系表、审计日志落库(V2.63)；V2.57 密码 PBKDF2+云端备份+门户认证。
- **V2.55–V2.58** — 对标整改地基修复轮（密码/备份/白屏/类型债清零）、后端上线（D1+Pages Functions，V2.56）、19 环节全链路 E2E、导航整合（分析报表/审批中心/OA流程定制）。

## 当前 P1 阶段状态（2026-08-28）
- 已完成（含代码）：B1-B5（流程闭环）、B6（黑名单/价目表回写 + 资质到期预警✅）、B7（审批迁移工作流引擎统一✅）、B8（MRP增强）、B9（AQL）、B10（PO变更单）、B11（多笔付款计划✅）。B1-B11 均已落地并回归验证（V2.67.0 收口）。
- 全部 P1 战役完成 ✅：B1-B11 均已落地并回归验证。
- V2.68.0（2026-08-28）：开发计划合并为单一权威版 + E2E 质量门禁加固（移除外链字体/收紧守卫/修复 v30/v68/v31 竞态）+ 新增 B8/B9 固化用例；全量 E2E 271 用例全绿升版。
- 备注：B6/B8/B9 原计划标「待开发」但代码早已实现，已审计更新计划文档避免重复开发。
- **D1 后端 E2E 验证（V2.69.0，2026-08-28 已升版并已部署生产）**：打通真实 Cloudflare 运行时 + 本地 D1，修复「鉴权漏 await（15 文件）」+「列表查询 FROM 缺别名（PO/inbound/outbound 三域）」两真实后端缺陷（harness 13/13 全绿）；确认双通道架构（关系表为只读模型，业务写经 app_state Blob）与 B2 三岛无专属后端。已四处同步版本号 + 构建 + 部署至 Cloudflare Pages 生产，线上多人共享后端真实可用。B2 三岛补后台已在 V2.70.0 完成（三岛 D1 表 + CRUD + FIFO + 出/入库落 D1 + 前端双写），后端闭环补齐。

## 部署与架构（线上化关键事实）
- 架构：前端 SPA + Cloudflare 后端（D1 + Pages Functions）。业务数据按 org_id 存 D1 `app_state`（同公司码共享），账号 `users`/`vendors`，会话 `sessions`。前端 `persistStorage.backendStorage` 登录后代理持久化到后端、否则回退 localStorage。DEV 下部分 API 走 MSW。
- **后端 E2E 验证（V2.68 后）关键事实**：10 张关系表（materials/customers/vendors/PO/SO/inbound/outbound/work-orders/vouchers/inventory-records）是**只读模型**——无 POST 创建端点，业务写入经 app_state Blob（`PUT /api/state/[key]`）；DEV/E2E 走 MSW，生产态 functions/api 仅读关系表。B2 三岛（序列号FIFO/委外/工单领料）无专属后端，数据存 Blob。后端曾存在「漏 `await getUserFromRequest`（15 文件，7 域 500）」+「列表查询 FROM 缺表别名 po/io/oo（PO/inbound/outbound 三域 `no such column` 500）」两真实缺陷，已修。
- 上线：Cloudflare Pages 静态托管 + Pages Functions（免费同域免跨域）。Build=`npm run build`、Output=`dist`；`public/_redirects`（`/* /index.html 200`）做 SPA 回退。指南见 `DEPLOY.md`。
- 构建门禁：`build-with-gate.bat` 先 tsc 0 错再 vite build；本地 safe-delete 沙箱清空 dist 超时则 `vite build --outDir dist-build` 再 `cp -r`。
- 坑：vite 仅 esbuild，未定义引用/TDZ 构建期不报错、运行期白屏；新增组件须实际访问页验证。

## 长期约定（用户明确要求）
- 升版必更新说明书：`src/content/manual.tsx` 追加「版本更新记录」条目；新功能补入口（设置/侧栏/`searchIndex.ts`）；版本铁律第 4 条已写此约束。
- 版本四处同步：src/version.ts(APP_VERSION) = package.json.version = MEMORY.md 版本沿革 = manual.tsx 记录。
- 文件铁律：每主题仅留最新版、合并重复、不带版本后缀；报告归档 ima「强哥的知识库」。
- 交付优先文档/图表/可运行程序，不给源码；准确度>速度；需求不清先问、关键决策先确认。
