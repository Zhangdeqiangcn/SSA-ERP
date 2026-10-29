-- V3.95.0 物料分类「默认供应商」一等公民列
-- 供应商是外部主体（门户 vendor），不适合塞进 responsible_persons（内部责任人多选）；
-- 故单列 default_vendors（JSON 文本，存供应商 id 数组），供采购按物料分类向默认供应商询价/下单。
-- D1 不支持 ALTER TABLE ADD COLUMN IF NOT EXISTS，用裸 ALTER；
-- 幂等靠 schema_migrations 守卫（迁移只 apply 一次）。
ALTER TABLE material_categories ADD COLUMN default_vendors TEXT;
