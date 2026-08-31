# 演示种子数据（可选脚本，已移出 migrations/）

## 为什么移出 migrations/

2026-08-28 执行 `wrangler d1 migrations apply ssa-erp-db --remote` 时，`migrations/` 目录下的
`seed_*.sql` 被 wrangler 当作迁移一并执行，把演示数据写进了**生产共享库**。

由于这些脚本原先把 `org_id` 硬编码成了某个真实组织的 ID（或写成 `VALUES` 里不会执行的字面量
子查询 `'(SELECT id FROM orgs ...)'`），产生了两类污染：

- 混入真实组织的演示数据（供应商 12 条 / 客户 5 条 / 采购订单 3 条 / 销售订单 3 条 / 工单 3 条）
- org_id 为无效字面量的孤儿数据（物料 6 条，前端按 org_id 过滤时不可见）

因此已把 6 个 `seed_*.sql` 从 `migrations/` 移到本目录，**wrangler 不会再自动执行它们**。

## 如何使用（如需灌演示数据）

脚本里的 `org_id` 已统一替换为占位符 `'{{ORG_ID}}'`，执行前必须先替换成目标组织的真实 ID。

1. 取目标组织 ID（只读）：

   ```bash
   ./node_modules/.bin/wrangler d1 execute ssa-erp-db --remote \
     --command "SELECT id, name, company_code FROM orgs ORDER BY created_at;"
   ```

2. 生成可执行的 SQL（以本地为例，把 `{{ORG_ID}}` 替换为第 1 步拿到的 id）：

   ```bash
   sed "s/{{ORG_ID}}/org_xxxxxxxx/g" scripts/seed/seed_vendors.sql > /tmp/seed_vendors_ready.sql
   ```

3. 执行（**生产库一律用 `--command`，不要用 `--file`**，后者走 import API 易触发 `D1_RESET_DO`）：

   ```bash
   ./node_modules/.bin/wrangler d1 execute ssa-erp-db --remote --command "$(cat /tmp/seed_vendors_ready.sql)"
   ```

## 现状说明

- 这 6 个脚本写入的是**关系表**。当前架构下关系表是只读模型，业务数据以 `app_state` Blob 为
  system-of-record，因此灌入的演示数据默认不会出现在前端页面（除非使用「从云端表读取」类功能）。
- 2026-08-31 已清理生产库中由这些脚本产生的演示数据残留，但**未删除本目录文件**，留作参考。
  若确认不再需要演示数据，可直接删除本目录。

## 文件清单

| 文件 | 内容 | 行数 |
|---|---|---|
| seed_vendors.sql | 演示供应商（上海宝钢等） | 12 |
| seed_customers.sql | 演示客户 | 5 |
| seed_materials.sql | 演示物料（钢板 Q235B 等） | 6 |
| seed_purchase.sql | 演示采购订单 + 明细 + 入库单 | 15 |
| seed_sales.sql | 演示销售订单 + 明细 + 出库单 | 11 |
| seed_wo.sql | 演示工单 | - |
