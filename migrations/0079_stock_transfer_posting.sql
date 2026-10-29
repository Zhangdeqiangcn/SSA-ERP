-- 迁移 0079：库存过账支撑（V3.45.0 第3批 · 对标审计 S-04 / S-05）
--
-- ═══════════════ 背景（为什么需要这三列）═══════════════
-- ① 调拨单（stock_transfers）是「只留单据的空壳」：PUT 只更新单据头尾与明细，
--    全文没有任何 postInbound / postOutbound，且 statusMachine 的 DocType 里
--    没有 stock_transfer ⇒ 状态可任意置 completed 而不触发任何过账。
--    后果：调一批货后两仓数字永久偏差，系统内无任何痕迹（"库存不准"主要来源之一）。
-- ② 库存调整单（inventory_adjustments）同样不过账：盘点差异只在前端内存里改，
--    刷新即失、materials.current_stock 不变、无盘盈盘亏凭证。
-- ③ 盘点任务（check_tasks）的 difference_amount **从不被写入**，
--    盘点差异金额在接口与界面上永远显示 0。
--
-- 这三列的作用：**过账幂等标志**（与 inbound_orders / outbound_orders 同款约定）。
--   没有它就无法做到「首次过账一次、重复提交不重复扣加」——
--   重复点"完成"就会把库存扣两次，这比不过账更糟。
--
-- ═══════════════ 为什么用 ADD COLUMN 而非重建表 ═══════════════
-- 三张表都没有入站外键、没有自引用，重建表会丢数据且无必要；
-- ADD COLUMN 在 D1 上是单语句原子操作，对存量零影响
-- （0 视为"未过账"，与历史数据语义一致 —— 历史单据本就没过账）。
--
-- 顺带把 RLS 需要的 owner_id / dept_id 补齐吗？**不补**：那是另一件事（跨域 S-27），
-- 混进本迁移会让"这些列为什么加"变得不清楚。保持一次迁移只做一件事。

-- ① 调拨单：过账幂等标志
ALTER TABLE stock_transfers ADD COLUMN inventory_posted INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_st_inventory_posted
  ON stock_transfers(org_id, inventory_posted);

-- ② 库存调整单：盘点差异真正落库存 + 生成盘盈盘亏凭证
ALTER TABLE inventory_adjustments ADD COLUMN inventory_posted INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_ia_inventory_posted
  ON inventory_adjustments(org_id, inventory_posted);

-- ③ 盘点任务：过账标志（difference_amount 列已存在于 0035，本次不回填历史值）
ALTER TABLE check_tasks ADD COLUMN inventory_posted INTEGER DEFAULT 0;
