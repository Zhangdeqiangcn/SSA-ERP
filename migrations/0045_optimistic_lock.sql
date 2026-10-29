-- 0045: 关键单据增加乐观锁版本号
--
-- 背景：并发修改同一张单据时，后提交者会静默覆盖先提交者的改动，
--       双方都看到「保存成功」，实际丢了一次修改。
-- 方案：给三类核心单据补 version 列（采购单已有），更新时按版本号比对，
--       版本对不上即返回 409 冲突，由前端提示用户刷新后重试。
-- 兼容：存量行统一置为 1；前端不传 version 时保持原行为（不加锁），
--       因此老客户端不会因本次迁移而报错。

ALTER TABLE sales_orders ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE inbound_orders ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE outbound_orders ADD COLUMN version INTEGER DEFAULT 1;

UPDATE sales_orders SET version = 1 WHERE version IS NULL;
UPDATE inbound_orders SET version = 1 WHERE version IS NULL;
UPDATE outbound_orders SET version = 1 WHERE version IS NULL;
UPDATE purchase_orders SET version = 1 WHERE version IS NULL;
