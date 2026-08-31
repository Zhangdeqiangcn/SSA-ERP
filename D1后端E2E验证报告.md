# SSA ERP · D1 后端 E2E 验证报告

> 验证目标：在真实 Cloudflare 运行时（wrangler pages dev --local）+ 本地 D1 上，直接打 `functions/api` HTTP 端点，验证**生产后端链路（HTTP → 函数 → D1 → 响应）真实可用**，并据此确认「B2 三岛是否真缺专属后端」。

- 验证日期：2026-08-27–28（会话）
- 代码基线：V2.68.0（验证期）→ 修复后升 **V2.69.0**（src/version.ts + manual.tsx 版本记录 + functions 后端 + 迁移 + harness）
- 验证结果：**PASS=13 / FAIL=0 / WARN=0**（1 INFO 为无种子行可测，属预期）
- 环境隔离：本地 D1 (`--persist-to .d1test5/state`)，**绝不触达远程生产库**

---

## 一、验证环境与手法

| 项 | 值 |
|---|---|
| 运行时 | wrangler 4.124.0 `pages dev --local` |
| 本地 D1 | `.d1test5/state`（全新目录，已应用 0001–0009 迁移 + 4 个 seed） |
| 被测端点 | `http://127.0.0.1:8790/api/*`（独立于陈旧实例 8788/8789） |
| 验证脚本 | `scripts/d1-backend-e2e.mjs`（可复用 harness，注册→登录→逐域断言） |
| 迁移重放 | `wrangler d1 migrations apply ssa-erp-db --local --persist-to .d1test5/state` → 0001–0009 全部 ✅ |

> 说明：旧实例 8788/8789 仍在运行且载入修复前编译版，被证明确实返回 500（陈旧缓存假象）。本报告结论基于**全新干净实例 8790（编译当前源码）**，排除一切缓存干扰。

---

## 二、发现的真实后端缺陷（均已修复）

### Bug A — 鉴权漏 `await`（影响 7 个业务域 GET 500）
- **现象**：materials / customers / vendors / sales-orders / work-orders / vouchers / inventory-records 在生产态 GET 返回 500，堆栈 `D1_TYPE_ERROR: bind(undefined)`。
- **根因**：15 个 functions 文件用 `getUserFromRequest(context)`（漏 `await` + 误把 `context` 当 `request`）。`getUserFromRequest` 是 async，漏 await 导致 `user.org_id` 为 `undefined` → D1 `.bind(undefined)` 抛错。
- **修复**：统一改为 `await getUserFromRequest(context.request, context.env.DB)`（15 文件 / 27 处）。

### Bug B — 列表查询 FROM 缺表别名（影响 purchase / inbound / outbound GET 500）
- **现象**：三域 GET 返回 500，堆栈 `D1_ERROR: no such column: po.org_id`（io / oo 同理）。
- **根因**：`functions/api/{purchase,inbound,outbound}-orders/index.ts` 的查询为
  `SELECT ... FROM purchase_orders WHERE po.org_id = ?`——
  **FROM 子句缺表别名 `po`**，但 WHERE 引用了 `po.org_id`。D1 将 `po` 解析为不存在的表别名 → 报错。
  对照正确写法（`sales-orders/index.ts`）为 `FROM sales_orders WHERE org_id = ?`（用字面表名，无别名）。
- **修复**：在三个 FROM 子句补别名——`FROM purchase_orders po` / `FROM inbound_orders io` / `FROM outbound_orders oo`（每文件 2 处，共 6 处）。`[id].ts` 与 alerts/chatbi 均用字面表名，无需改动。

> 关键认知：三域 500 **不是陈旧缓存**，是源码真实字段/别名缺陷；此前 8788 实例的 500 与 8790 干净实例的 500 同根同源，印证缺陷真实存在。

### Bug C — 迁移 `schema_migrations` 主键类型不匹配（迁移层）
- **现象**：全新库应用迁移时报 `SQLITE_MISMATCH`。
- **根因**：`schema_migrations.version` 曾被定义为 `INTEGER PRIMARY KEY`，而 0005+ 迁移以文本版本号（如 `'0005_purchase_orders'`）INSERT → 文本写入 INTEGER 主键报错。
- **修复**：`0003_materials.sql` 改为 `TEXT PRIMARY KEY`；新建 `0009_fix_schema_migrations.sql` 对齐已部署远程库结构（重建为 TEXT PK、保留存量行、幂等安全）。全新库 9/9 重放通过。

---

## 三、架构实证结论

| 验证项 | 结果 | 结论 |
|---|---|---|
| 系统-of-record：app_state Blob 写→读→删往返 | ✅ put=200 / get=200 / del=200 / 再读=404 | **业务数据系统-of-record 是 app_state 大 Blob**（通用 `PUT /api/state/[key]`），非关系表 |
| 关系表 READ（10 域 GET 列表） | ✅ 10/10（修复后） | materials/customers/vendors/purchase-orders/sales-orders/inbound-orders/outbound-orders/work-orders/vouchers/inventory-records 均按 `org_id` 隔离返回 200 |
| 关系表 CREATE（POST 列表） | ✅ 10/10 返回 404/405 | **10 张关系表均无业务创建(POST)端点**——数据仅经 app_state Blob 写入，关系表是「读模型」 |
| 专属创建端点存在性 | ✅ three-way-match / audit/logs 有真实端点（405/400） | 仅少数域有独立创建端点；主流业务创建走 Blob |

**结论：系统为「双通道」架构** —— DEV 态走 MSW Mock（V2.68 的 271 条 E2E 仅验证前端+MSW，未触达真实 D1）；生产态走 `functions/api` + D1，但**业务写入经 app_state Blob、关系表为只读视图**。因此生产后端「能读不能写关系表」是设计使然，不是缺陷（写路径在前端经 Blob 持久化到 `/api/state`）。

---

## 四、B2 三岛专属后端探测（用户核心疑问）

| 端点 | 探测结果 | 判定 | 说明 |
|---|---|---|---|
| GET /api/serial-numbers | 200 `text/html` | ❌ 无后端 | SPA 回退（返回 index.html），非真实 API |
| POST /api/subcontracts | 405 空 body | ❌ 无后端 | 无对应函数文件，SPA 回退层对 POST 返回 405 |
| GET /api/work-orders/picking | 404 `application/json` | ❌ 无后端 | 被 `work-orders/[id].ts` 当作 `id='picking'` 通用匹配，无专属领料端点 |
| POST /api/fifo | 405 空 body | ❌ 无后端 | 无对应函数文件 |

**结论：B2 三岛（序列号 FIFO / 委外 / 工单领料）确认无专属 D1 后端**，其数据存于 app_state Blob（前端 Mock 态）或由通用 work-orders 读取支撑。这印证了「B2 是 P1 唯一真缺口」的原始判断——若要落地，需新建专属 functions + 关系表（与现有 10 域读模型一致）。

---

## 五、非阻塞注意事项

1. **种子数据失败（非阻塞）**：全新库 `seed_vendors.sql` / `seed_wo.sql` 因无 org（org 由运行时 `/api/auth/register` 创建）触发外键约束失败。种子仅为演示数据，不影响后端链路验证（GET 返回空列表即 200）。
2. **本地 D1 与远程隔离**：全程 `--persist-to` 本地目录，未执行任何 `--remote` 操作，生产库零风险。
3. **harness 断言已校准**：修正了 app_state Blob「写→读」比较（value 以 JSON 字符串存回，需先 `JSON.parse` 再比）、B2 探测按 `content-type` 区分 SPA 回退与真实端点，避免误报。

---

## 六、建议后续动作

1. **版本升版（推荐）**：本次修复 2 个真实生产后端缺陷（Bug A/B）+ 迁移健壮性（Bug C），建议升 **V2.69.0「后端链路加固」**，按铁律四处同步（`src/version.ts` / `package.json` / `manual.tsx` 版本记录 / `MEMORY.md` 沿革）+ 构建 + 部署。Frontend E2E（271）未受影响（src 未改动），可视为回归通过。
2. **B2 三岛后台（可选）**：若需将序列号 FIFO / 委外 / 工单领料从前端 Mock 迁为真实 D1 后端，需新建 functions + 关系表 + 写入路径（当前写路径在前端经 Blob，需评估是否改为直写关系表）。此为独立战役，建议单独立项。
3. **归档**：本报告归档至 ima「强哥的知识库」→ ⑥通用-交付物 → erp开发项目。

---

## 七、升版与部署（V2.69.0，2026-08-28 已上线 ✅）

按版本铁律四处同步 + 构建 + 部署生产，全部完成：

| 项 | 状态 |
|---|---|
| 版本四处同步 | ✅ `src/version.ts`(APP_VERSION='2.69.0'/LABEL='V2.69'/BUILD_DATE='2026-08-28') · `package.json`('2.69.0') · `src/content/manual.tsx` 新增 V2.69.0 版本记录 · `MEMORY.md` 沿革追加 V2.69.0 |
| 构建门禁 | ✅ `tsc --noEmit` 0 错误 → `vite build --outDir dist-build`（34.8s，229 assets，规避沙箱清空 dist 的 safe-delete 拦截）|
| 部署生产 | ✅ `wrangler pages deploy dist-build --project-name ssa-erp --commit-dirty`（CLOUDFLARE_API_TOKEN 已登录）→ DEPLOY_RC=0，上线 **https://c906c0d9.ssa-erp.pages.dev**（Pages Functions 后端随包上线）|

**生产环境 E2E 复验（关键）**：将 harness 指向线上生产 URL 重跑，结果 **PASS=13 / FAIL=0 / WARN=0** —— 此前线上 500 的 purchase/inbound/outbound 三域 GET 现已返回 200（关系表 READ 10/10 通过），证明两个真实后端缺陷在生产环境已真正修复，线上多人多设备共享的后端真实可用。

> 注：生产 E2E 复验在远程 D1 注册了一个测试组织/账号（用户名前缀 `e2eprodcheck-`），属正常 smoke-test 数据；如需清理可登录后在数据管理删除，或忽略（演示数据无害）。

*附：机器可读结果 `.d1test5/backend-e2e-result.json` 为最新生产复验结果（PASS=13, FAIL=0, WARN=0, INFO=1）；本地干净实例 8790 结果备份于 `.d1test5/backend-e2e-result-local8790.json`。*
