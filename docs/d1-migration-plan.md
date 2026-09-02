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
