-- 迁移 0089：工单增加折旧成本与制造费用字段（诚实边界①）
-- 完工结转（贷 5001）含 材料 + 人工 + 折旧 + 制造费用，不再系统性低估生产成本。
-- 折旧/制造费用为工单 manual 录入（分配动作另立项，本期不自动从固定资产计提分摊）。
ALTER TABLE work_orders ADD COLUMN depreciation_cost REAL DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN overhead_cost REAL DEFAULT 0;
