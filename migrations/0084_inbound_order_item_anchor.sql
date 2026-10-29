-- ─────────────────────────────────────────────────────────────
-- 迁移 0084：入库明细补「订单行锚点」列（V3.47.0 第3批 3-05 补漏）
--
-- ═══════════════ 为什么需要单独一个迁移 ═════════════════════════
-- 0083 里已写了同一句 ALTER TABLE，但**0083 在追加这句之前就已经 apply 过**，
-- D1 的 schema_migrations 记录版本号、不会重跑同一版本 ⇒ 那句永不执行。
-- 表现（生产守护套件 39 实测）：带 orderItemId 的入库返回
--   400 SCHEMA_MISMATCH「提交的数据包含系统无法识别的字段」
-- 而错误映射把 `no such column` 归到 SCHEMA_MISMATCH，报文说的是"字段无法识别"，
-- 业务人员会以为是自己填错了字段，方向完全错。
--
-- 教训：迁移一旦 apply 过就视为不可变；后续补充的 DDL 必须**新建迁移版本**，
--   不能往已 apply 的文件里追加（追加等于没写，且没有任何报错提示）。
--
-- ═══════════════ 列的用途 ═══════════════���══════════════════════
-- 行级三单匹配需要把「入库行」对到「采购订单行」。入库明细原先只有
-- source_no 指到订单头，没有行级锚点；同一物料在一个订单里可能有多行
-- （不同单价/交期），此时按物料编码匹配会把多行并成一行，比对结果失真。
--
-- 兼容：历史行该列为 NULL，行级比对自动退回「物料编码+单位」匹配
--   （见 threeWayLineMatch.keyOf），不报错也不误拦。

-- ⚠️ 索引**不带 org_id**：`inbound_order_items` 是子表，**没有 org_id 列**
--   （组织隔离靠父表 inbound_orders.org_id，见 0005 建表说明）。
--   我首版按常规写成 (org_id, order_item_id)，apply 时报
--   「no such column: org_id at offset 76」—— 子表加不存在��列是常见坑。
ALTER TABLE inbound_order_items ADD COLUMN order_item_id TEXT;

CREATE INDEX IF NOT EXISTS idx_in_items_order_item
  ON inbound_order_items(order_item_id);
