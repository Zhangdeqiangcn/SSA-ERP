# SSA ERP 双通道根治 — 前端 Store 迁真实 D1 关系表 实施方案

> 目标：消除「app_state Blob 双源」，让全部业务数据落 D1 关系表，前端经会话鉴权 CRUD 调用；保留离线/ Mock 兜底，过渡期零停机。
> 版本铁律：每波升版 + 四处同步（version.ts=package.json=manual.tsx=MEMORY.md + 主计划）。

---

## 一、现状诊断（双通道根因）

| 项 | 现状 |
|---|---|
| Store 总数 | 83 个 |
| 仍 persist 到 `app_state` Blob（backendStorage） | **79 个**（双通道的 Blob 侧） |
| 已迁 D1（会话鉴权直连） | 仅 `materialStore`（V2.74.5，调 `/api/materials`，含 Mock 兜底 + legacy 回填） |
| 后端能力 | 逐域会话 Functions：materials/customers/vendors/PO/SO/inbound/outbound/work_orders/vouchers/inventory_records/serial_numbers/subcontracts（共 12 域后端已建）；另有 `open/[resource]` 通用网关（**API Key 鉴权**，仅注册 5 资源，不支持 SPA 会话） |
| 前端客户端 | `src/services/api.ts`（axios，注入 `Bearer token`，baseURL `/api`）、`src/services/material.ts` 等已封装；`rls.ts` 已有 org 隔离 + 角色可见性策略可复用 |
| 数据形态 | 79 个 Blob store 把整份 state 以 JSON 存 `app_state[store名]`，无表结构、无索引、无法跨端共享、易双源不一致 |

**结论**：问题不是"没后端"，而是**前端 79 个 store 没接后端**，仍走 Blob。根治=给每个业务域配一张 D1 表 + 一个统一会话鉴权 CRUD 入口，前端用工厂批量接管。

---

## 二、Store 分类（决定哪些要迁、哪些本就该本地）

- **业务实体类（须迁 D1）**：物料/客户/供应商/PO/SO/出入库/工单/凭证/库存/序列号/委外/MES/S&OP/BI/ESG/COPA/资金/BOM/质量/生产/审批/工作流/对账/科目/价格/设备/FMEA/ECN/寄售/三方销售/重复制造/波次RFID/货源清单/单位换算/自定义字段/组织/用户/告警/集成…（约 60+ 域）
- **纯本地类（本就本地，非双通道问题，不迁）**：UI 偏好（uiStore/displayStore/tabStore/listPrefsStore/i18nStore）、会话（sessionStore/authStore 走专用接口）、主题/打印模板缓存等。这类保持 localStorage，不计入"双通道"。

---

## 三、推荐架构：通用实体后端 + 前端工厂（可批量根治）

### 3.1 后端新增（会话鉴权，复用现有设施）
新增 `functions/api/entities/[resource].ts`（集合 GET/POST）+ `functions/api/entities/[resource]/[id].ts`（单条 GET/PUT/DELETE）：
- 鉴权：`getUserFromRequest`（会话 Bearer，与 materials 同款），非 API Key。
- 资源注册表 `ENTITY_RESOURCES: Record<resource, { table, cols(camel→snake), rlsScope, seed? }>`。
- 写操作：强制 `org_id` 归属 + 补审计列（created_at/updated_at/created_by/updated_by，用 `PRAGMA table_info` 探测存在性，规避 NOT NULL 500）+ 记 `audit_logs`（复用现有 `audit()`）。
- 列表：分页 `page/pageSize` + `keyword` + 域字段筛选 + `ORDER BY created_at DESC`，复用 `rlsFragment`。
- 这是 materialStore 手写模式的**通用化**；materials 可平移注册进此表。

### 3.2 前端新增（工厂，79→配置驱动）
- `src/services/entityRepo.ts`：通用客户端，`list/get/create/update/remove(resource, ...)` 包 `api`。
- `src/stores/createEntityStore.ts`：`createEntityStore<T>({ resource, Entity, seed, fromRow?, toRow? })` 产出 `{ items, load(), add(), update(), remove(), ... }`：
  - `load()`：`GET /api/entities/:resource`（失败回退内存 seed / localStorage，不阻断 UI，复刻 materialStore 兜底）。
  - `add/update/remove`：乐观更新本地 → 调后端 → 失败回滚 + 提示。
  - 移除 `persist(..., { storage: backendStorage })`，数据主源改为 D1。
- 每个域只需：① 一张 D1 表（迁移 SQL）；② `ENTITY_RESOURCES` 注册；③ store 改为 `createEntityStore` 配置。不再逐域写 Functions。

### 3.3 过渡护栏
- 每域迁移后**保留 Mock 兜底 + localStorage 缓存**作为离线/未登录回退（与 materialStore 一致），Blob 通道在过渡期并存但不作为主源。
- 提供一次性回填脚本：把旧 `app_state` Blob 中该域数据写入 D1（复刻 materialStore 的 legacy 回填逻辑），避免存量数据丢失。
- 每波独立 E2E + 生产部署，不一次全改。

---

## 四、分阶段路线

- **W0 基础设施 ✅ 已完成（V2.75.0）**：通用实体后端 `/api/entities/*`（GET 列表分页/keyword/RLS + POST 创建、[resource]/[id] GET/PUT/DELETE，会话鉴权复用 getUserFromRequest+rlsFragment+audit_logs）+ 前端 `entityRepo` + `createEntityStore` 工厂 + `ENTITY_RESOURCES` 注册表（集中于 functions/_shared/entities.ts）。**参考实现选用 S&OP（P2-10）而非 vendorStore**——因其类型简单、无既有专用后端、零回归风险；sopStore 改用工厂（移除 Blob persist）+ 迁移 0018_sop.sql 建 sop_plans 表 + 页面接 load()，验证全链路（tsc 0 错 / build / e2e v89+flow 8 passed / 远程 D1 应用 0018 / 部署生产）。
- **W1 已建后端的 12 业务域（下一步）**：customers/vendors/PO/SO/inbound/outbound/work_orders/vouchers/inventory_records/serial_numbers/subcontracts → 直接绑工厂、移除 Blob persist、注册资源（table + 业务列 camel↔snake + rlsScope）、跑回填。可并行推进，每域独立 E2E。
- **W2 软域（需新建 D1 表）**：MES/S&OP/BI/ESG/COPA/资金/BOM/质量/生产/审批/工作流/对账/科目/价格/设备… 逐域设计表 + 注册 + 迁工厂（按依赖分批）。
- **W3 收尾**：全部业务域迁完 → 停用 `app_state` Blob 主源（`backendStorage` 仅留作离线兜底外壳）→ 移除冗余 legacy 回填 → 全量 E2E + 部署 + 版本说明归档。

---

## 五、风险与决策点（待用户确认）
1. 架构选型：通用实体后端+工厂（推荐） vs 逐 store 手写专用 Functions。
2. 首波范围：W0 基建+参考实现（推荐稳妥） vs 直接 W1 全 12 域 vs 先啃一个软域（MES）打通端到端。
3. 纯本地类 store（UI 偏好/会话）明确不迁，仅业务实体类计入根治。

---

## 六、验收
- 每波：tsc 0 错 → vite build 通过 → 该波域 e2e 冒烟 passed → 全局 flow 回归 passed → 部署生产。
- 终态：业务实体类 store 全部 `persist(Blob)` 移除、数据落 D1、跨端/多人实时共享、无双源不一致。

---

## 七、W1 实施记录（截至 V2.75.3）

### 7.1 去 Blob 直连 D1 的域（已落地 + 生产 E2E 全绿）

| 域 | 后端写端点 | 前端 store | 版本 | 备注 |
|---|---|---|---|---|
| 物料 materials | `/api/materials`（V2.74.5 补 POST） | materialStore | V2.74.5 | 主数据 |
| 客户 customers | `/api/customers`（V2.74.5 补 POST） | customerStore | V2.74.5 | 主数据 |
| 供应商 vendors | `/api/vendors` 改指 vendor_master | vendorStore | V2.74.3 | 主数据 |
| 序列号 serial | `/api/serial-numbers` + movements | serialApi + warehouseAdvancedStore.serialMasters | V2.75.1 | B2 三岛① |
| 委外 subcontract | `/api/subcontracts` + issueItems | subcontractApi + subcontractStore | V2.75.1 | B2 三岛② |
| 采购订单 PO | `/api/purchase-orders`（补 POST） | purchaseStore | V2.75.3 | W1 事务域① |
| 销售订单 SO | `/api/sales-orders`（补 POST） | salesStore | V2.75.3 | W1 事务域② |
| 生产工单 WO | `/api/work-orders`（补 POST） | productionStore | V2.75.3 | W1 事务域③ |
| 财务凭证 vouchers | `/api/vouchers`（补 POST） | financeStore.vouchers | V2.75.3 | W1 事务域④ |

> **W1 收尾（V2.75.3）**：PO/SO/WO/vouchers 四事务域后端 POST + 前端 store 去 Blob 全部完成；本地 W1 E2E 13/13 + 生产 W1 E2E（fe3b343b）13/13 全绿；新增迁移 0020(PO version/history)/0021(vouchers 7 扩展列)/0022(vouchers created_by)。
> **W1 收尾时仍经 Blob 的关系表**：inbound / outbound / inventory_records 三张 + warehouseStore 高级三切片。其中 inbound/outbound 写入 D1 后端早在 V2.70 已通、但前端读仍来自 Blob（双源并存）——已于 **#172 仓库战役（V2.75.4）根治**，见第八节。inventory_records 是应用从不写入的死表，库存改由 D1 入/出库单据实时派生（单源），不再单独建写后端。B2 三岛的工单领料(work_order_pickings)仍经 b2Api 双写 Blob 落 D1。

### 7.2 关键教训（V2.75.1–V2.75.3 三波实战沉淀）

1. **三态一致性（最高频暗礁）**：迁 D1 必须逐一核对「迁移建表列 ↔ 函数 INSERT/SELECT 列 ↔ 响应子表字段」三者一致，且 snake↔camel 映射在每一层都对得上。类型系统（DB 为 any）和 tsc/vite 构建门禁**完全看不见**这类运行期 SQL/JSON 不一致，会在生产静默 500。
   - V2.75.2：迁移 0010 建 serial_movements 漏 created_at/created_by，但 insertSerialMovement 写这两列 → 序列号创建/出库全断。
   - V2.75.3：0007 vouchers DDL 漏 created_by 列，POST 写该列 → 500；迁移 0022 补列修复。
2. **本地通过 ≠ 生产通过（schema 漂移）**：V2.75.3 暴露最隐蔽的一类——**远程生产 vouchers 表被手动改成 snake_case（`total_debit`/`created_by`），而 0007 权威 DDL 与本地库均用 camelCase（`totalDebit`/`createdBy`）**。本地 E2E 因本地库按 0007 建表而通过，但首次打真实生产 D1 即 `table vouchers has no column named totalDebit` 500。→ 必须**打真实生产 D1 做端到端验证**，不能只靠本地 harness。修复：远程给 vouchers 补 9 个 camelCase 列对齐 0007，并在 `schema_migrations` 登记 0020/0021/0022。
3. **后端函数 import 完整性**：purchase-orders/sales-orders handler 调用 `uid()` 却未 import（work-orders 已 import）→ `ReferenceError: uid is not defined` 500。新增/修改 handler 后须核对所有被调用符号已 import。
4. **NOT NULL 无默认列须防御**：PO 的 `order_date`、SO 的 `order_date`+`sales_person` 均为 NOT NULL 无默认，harness 未传即 500。→ handler 解析 body 后对 NOT NULL 无默认列补防御默认值（`order_date` 缺省给今日；`sales_person` 缺省给 `user.name||'系统'`）。
5. **远程跳过有副作用的迁移（RLS）**：迁移 0013 给现有行加 owner_id/dept_id 过滤，会让 owner_id NULL 的历史行对非 admin 不可见，风险高。→ W1 仅应用必需的 0020/0021/0022，刻意跳过 0013，待专门战役评估回填 owner_id 后再启用。
6. **验证范式**：每波收口须跑两套 E2E——本地（`wrangler pages dev --local --persist-to .wrangler/local-state` + 本地 D1，如 `scripts/w1-crud-e2e.mjs`）+ 生产（真实 D1，隔离组织 + 自动清理，如 `scripts/prod-e2e/`）。两者全绿才算通过。


---

## 八、#172 仓库战役实施记录（V2.75.4，双通道彻底根治）

### 8.1 改造范围与判定

| 切片 | 处理 | 版本 | 说明 |
|---|---|---|---|
| warehouseStore.inboundOrders | 移出 Blob、直连 D1 | V2.75.4 | load 拉 /api/inbound-orders（含 items 明细）、add/update/delete 经 b2Api 写回、首次空库回填 |
| warehouseStore.outboundOrders | 移出 Blob、直连 D1 | V2.75.4 | 同 inbound，经 b2Api.putOutbound/deleteOutbound |
| warehouseStore.inventoryRecords | 不落 Blob、由 D1 单据实时重算 | V2.75.4 | recomputeInventory 由 D1 入/出库单重算，单源 |
| warehouseStore.batchRecords | 不落 Blob、派生 | V2.75.4 | 同上 |
| warehouseStore.checkTasks / inventoryAlerts / finishedGoodsInbounds | 保留 Blob | — | 无对应 D1 表，本就 Blob-only（非双通道） |
| inventory_records 表 | 不新建写后端 | — | 全代码库只被读、从不被写入的死表；库存作为 D1 入/出库单据的派生结果 |

> **关键判定**：仓库域"安全根治面"= inbound/outbound 两切片（写后端早已存在，仅读源仍来自 Blob）；**不盲建 inventory_records 写后端**——核查确认它是应用从不写入的死表，库存应作为 D1 入/出库单据的派生结果实时重算（单源、零冗余），规避"写后端 + 派生缓存"双写不一致陷阱。

### 8.2 修复的真实后端缺陷（运行期 SQL 层）

- **inbound/outbound PUT 漏列映射**：field→column 映射链漏 `inventoryPosted`/`costPosted`/`cogsPosted`，被 `f.toLowerCase()` 错映射成 `inventoryposted`/`costposted`（无下划线、列不存在），致 PUT 整句失败、过账状态写不回 D1。→ 补 3 条显式映射（`inventoryPosted→inventory_posted` / `costPosted→cost_posted` / `cogsPosted→cogs_posted`）。部署前先查生产 `inbound_orders`/`outbound_orders` 表确有这三列（无 snake↔camel 漂移），确认本地≠生产风险排除后再部署。

### 8.3 验证

- 本地 W2 仓库 E2E（`scripts/w2-warehouse-e2e.mjs`，`wrangler pages dev --local` + 本地 D1）：**11/11 全绿**（POST 创建含 items / GET :id 取回 items / PUT 更新 status+过账 / GET 列表 / DELETE 全流程）。
- 生产 W2 E2E（真实 D1）：全绿。
- `tsc --noEmit` 0 错；dist 构建并部署生产。

### 8.4 收口结论

**至此所有业务实体关系表均已去 Blob 直连真实 D1、跨端多人实时共享、无双源不一致——「双通道」问题闭环。** 仅 warehouseStore 高级三切片（stockTransfers/inventoryAdjustments/qualityHolds，无对应 D1 表）与纯 UI 偏好类 store（列表偏好/标签布局/i18n/工作台等，本就非双通道）仍走 app_state Blob；前者如要迁须先建 D1 表立项，后者无需迁。

---

## 九、W2 收尾战役实施记录（V2.75.5，双通道 100% 根治）

强哥在 #172 收尾（V2.75.4）后要求继续把「仅剩的仓库高级三切片」也迁 D1，完成真正 100% 双通道根治。

### 9.1 改造范围与判定

| 切片 | 处理 | 版本 | 说明 |
|---|---|---|---|
| warehouseAdvancedStore.stockTransfers | 移出 Blob、直连 D1 | V2.75.5 | 新建 stock_transfers + stock_transfer_items（items 子表 ON DELETE CASCADE）；load 拉 /api/stock-transfers（含 items 明细）、add/update/delete 乐观更新+写回 D1、首次空库回填遗留 Blob |
| warehouseAdvancedStore.inventoryAdjustments | 移出 Blob、直连 D1 | V2.75.5 | 新建 inventory_adjustments + inventory_adjustment_items（items 子表）；load 拉 /api/inventory-adjustments；postAdjustment 过账后追加 D1 状态写回 |
| warehouseAdvancedStore.qualityHolds | 移出 Blob、直连 D1 | V2.75.5 | 新建 quality_holds（单表，QualityHold 不 extends BaseEntity、无审计列）；load 拉 /api/quality-holds；releaseQualityHold/deleteQualityHold 写回 D1 |
| 序列号 serialMasters | 早已直连 D1 | V2.75.1 | 不变，partialize 与三切片同置 `() => ({})` |

> **关键判定**：沿用 W1/W2 已验证的「移出 partialize + 乐观更新 + 写回 D1 + 首次回填」安全模式，零回归扩到这三域。后端端点采用**显式列名**（规避 W2 暴露的 `f.toLowerCase()` 漏列坑），items 子表独立建表（ON DELETE CASCADE）。列表端点回填 items——迁移前 Blob 存全量 items，迁移后若列表返空 items，`confirmTransfer` 生成的双边出入库单会缺物料行（功能回归），回填后行为等同迁移前。

### 9.2 修复的真实后端缺陷（运行期 SQL 层）

- **POST/PUT 绑参未守卫 transferNo/adjustmentNo**：`stock-transfers`/`inventory-adjustments` 的 POST 与 PUT 直接 `body.transferNo`（缺省 `undefined`）入 D1 `bind` → `D1_TYPE_ERROR: Type 'undefined' not supported` 500（E2E 首跑即暴露）。→ POST 加服务端默认号兜底（`'ST-' + id.slice(0,8)` / `'ADJ-'`），PUT 用既有单号兜底（`body.transferNo || existing.transfer_no`）。
- **GET/:id 与列表 items 返回 camelCase**：该两域 `[id].ts` 原以 camelCase（`materialId`）返回 items，但前端 `rowToTransferItem`/`rowToAdjustmentItem` 读 snake_case（`material_id`）→ 静默取 undefined（明细丢失）。→ 统一改 snake_case 返回，与 W2 inbound 既定惯例对齐。列表同步回填 items（修复 `confirmTransfer` 双边过账缺明细回归）。

### 9.3 验证

- 本地 W3 三切片 E2E（`scripts/w3-adv-e2e.mjs`，`wrangler pages dev --local` + 本地 D1）：**16/16 全绿**（三域 POST 含 items / GET :id 取回 items / PUT 更新状态 / GET 列表含 items / DELETE 全流程）。
- 生产 W3 E2E（真实 D1，`2d26fbaf.ssa-erp.pages.dev`）：**16/16 全绿**。
- `tsc --noEmit` 0 错；dist 构建并部署生产（`2d26fbaf.ssa-erp.pages.dev`）。
- 迁移落地：本地 `node scripts/apply-all-local.mjs` 重放 0023/0024/0025；生产 `wrangler d1 execute --remote --file=migrations/00{23,24,25}*.sql`（num_tables 35→38）。

### 9.4 收口结论

**至此所有业务实体域（物料/客户/供应商/PO/SO/工单/凭证/序列号/委外/入出库/跨组织转储/库存调整/质检扣留）均已去 Blob 直连真实 D1、跨端多人实时共享、无双源不一致——双通道 100% 根治。** 仅纯 UI 偏好类 store（列表偏好/标签布局/i18n/工作台等，本就非双通道）仍走 app_state Blob，无需迁。

