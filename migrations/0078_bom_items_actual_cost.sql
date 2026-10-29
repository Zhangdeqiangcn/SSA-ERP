-- 迁移 0078：BOM 子件增加实际单价列（决策 E 后续 · V3.32.0）
--
-- ── 为什么加这一列 ──────────────────────────────────────────
-- 标准成本差异分析（成本卷积页）需要「实际成本」对比「标准单价（unit_cost）」。
-- 真实来源本应是物料主数据的 moving_avg_price，但 BOM 子件的 materialId 与物料主数据
-- 存在历史口径错位（同名不同单位、甚至同名不同物），无法可靠关联移动均价。
-- 为避免「假关联 → 假差异率」，差异分析的「实际成本」改由 BOM 子件自身维护
-- （actual_unit_cost），与标准单价同单位同口径、由 BOM 维护者填入，诚实不伪造。
-- 物料移动均价仍作为预埋真实来源（当 materialId 能正确关联同口径物料时自动采用）。

ALTER TABLE bom_items ADD COLUMN actual_unit_cost REAL;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0078_bom_items_actual_cost', datetime('now'))
ON CONFLICT(version) DO NOTHING;
