-- 0071: 工单（work_orders）增加乐观锁版本号
--
-- 背景：缺陷台账 #10 —— 乐观锁（optimisticLock.withVersionGuard）已在采购单/销售单/入库单/出库单
--       四个接口启用，但工单（生产核心单据）尚未接入，并发改同一张工单会静默覆盖。
-- 方案：给 work_orders 补 version 列，更新时按版本号比对，版本对不上即返回 409 冲突。
-- 兼容：存量行统一置为 1；前端不传 version 时保持原行为（不加锁），老客户端不受影响。
--       本迁移仅做 ADD COLUMN + 回填，不改动任何写入路径（写入侧改为在 work-orders/[id].ts 接入守卫）。

ALTER TABLE work_orders ADD COLUMN version INTEGER DEFAULT 1;

UPDATE work_orders SET version = 1 WHERE version IS NULL;
