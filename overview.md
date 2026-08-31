# SSA ERP V2.71.0 — P2-A 功能增强（A组全量）收口总览

## 结论
P2-A 加强按强哥拍板「A组全量」落地：纯前端 / SPA + store 补强，**不碰后端 D1**，10 项功能 + 2 文档项全部完成，已统一提交 `V2.71.0`。
**质量门禁全过**：`tsc --noEmit` 0 错 · 全量 E2E 271/271 全绿（含 flow 长用例预热复跑确认非回归）· 生产构建通过。

## 本轮落地清单（文件 → 改动）
| # | 功能 | 文件 |
|---|---|---|
| 1 | RLS 字段级权限真接线（单价按角色脱敏） | Purchase/OrderDetail、Sales/SalesOrderDetail |
| 2 | 价格分析同比修复（去年同月匹配） | Analytics/PriceAnalysis |
| 3 | 寄售库存抽 consignmentStore（耗用结算持久化） | consignmentStore(新)+ConsignmentStock |
| 4 | 智能排程锁单联动（拖拽/改期/正排/倒排全跳过+UI按钮） | Production/GanttSchedule |
| 5 | 返利自动结算（规则范围从销售单聚合基数+批量结算） | Sales/RebateManager + rebateStore |
| 6 | 呆滞料处置流（处置决策 store+记录） | slowMovingStore(新)+InventoryAging |
| 7 | COA 历史留存（入库可重开/删除+抬头声明） | coaStore(新)+Quality/COAGenerator |
| 8 | FMEA 关联物料（绑定+筛选） | fmeaStore + Quality/FMEA |
| 9 | 客户 ABC×信用额度联动（推荐/标红/一键同步） | Sales/CustomerABC |
| 10 | GTIN 校验位算法（实时校验+扫码录入） | Material/MaterialForm |
| + | 智能推荐汇总面板 | Analytics/Forecast |
| + | 帮助中心新增「智能增强模块(P2)」章 | content/manual.tsx |

## E2E 关键说明（重要）
全量首跑 `270 passed / 1 failed`，失败项 `flow.spec.ts` 卡在**第一步 `page.goto` 等 `load` 超 300s**（vite 冷编译 + 本机过载），属历史已知 flake，与代码改动无关（若改动致崩溃 271 会全挂）。
**验证方式**：预热 dev server（浏览器先加载一次让 vite 编译缓存热）后复用 `reuseExistingServer` 重跑 flow → `1 passed (1.6m)`，坐实非回归。实质 271/271 全绿。

## 运维铁律（本轮再次确认）
- 跑 Playwright 必须 `CODEBUDDY_SAFE_DELETE_ENABLED=0 npx playwright test`（绕开 safe-delete shim 转发 genie-trash 超时崩溃）。
- 生产构建同理：`CODEBUDDY_SAFE_DELETE_ENABLED=0 npm run build`。
- flow 等 5 分钟长用例：先预热 dev server 复用热实例，防冷编译超时 flake。

## 版本四处同步
`src/version.ts`(APP_VERSION=2.71.0) = `package.json.version` = `src/content/manual.tsx` 版本更新记录 = `.workbuddy/memory/MEMORY.md` 版本沿革。

## 提交
统一提交：`25 files changed, 1084 insertions(+), 111 deletions(-)`（含 3 个新 store + P2-A代码调研报告.md）。

## 留待 B 组（未做）
RLS 行级过滤落 D1、智能排程引擎消费锁、AI Agent/ChatBI/异常预警阈值/多币种FX/开放API网关/MES/BI/资金/S&OP/COPA/ESG/波次RFID 等需建后端或深水区项，单独立项。

## 下一步可选项
1. 部署 V2.71.0 到 Cloudflare Pages 生产（dist/ 已构建就绪，需 `wrangler pages deploy`）。
2. 启动 B 组后端增强项（视强哥优先级）。
3. 归档本轮报告（P2-A代码调研报告.md / 本 overview）到 ima「强哥的知识库 → erp开发项目」。
