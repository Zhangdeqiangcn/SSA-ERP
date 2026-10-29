-- 迁移 0088：发货单增加发货仓库字段（诚实边界④）
-- 多仓场景下用户可在发货单上指定发货仓库，发货→出库联动不再默认取本组织首个仓库。
ALTER TABLE shipments ADD COLUMN warehouse_id TEXT;
