-- 迁移 0074：单位换算规则关系表（V3.17.9 修复差距15）
--
-- 背景：unitConversionStore.ts 使用 zustand persist，数据存在 localStorage，
-- 换设备后不同步、无权限控制、无审计。本迁移将其迁到 D1 关系表。
--
-- 字段契约：对齐 src/stores/unitConversionStore.ts 的 UnitRule 接口
--   - id: string
--   - fromUnit: string
--   - toUnit: string
--   - factor: number
--
-- 注意：不加 org_id——单位换算是全局基础数据，不区分组织

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS unit_conversions (
  id TEXT PRIMARY KEY,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  factor REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE(from_unit, to_unit)
);

-- 种子数据（与前端 DEFAULT_UNIT_RULES 一致）
INSERT OR IGNORE INTO unit_conversions (id, from_unit, to_unit, factor)
VALUES
  ('u1', '箱', '个', 12),
  ('u2', '吨', '公斤', 1000),
  ('u3', '米', '厘米', 100),
  ('u4', '千只', '只', 1000),
  ('u5', '卷', '米', 50),
  ('u6', '捆', '根', 20);

-- 登记迁移
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0074_unit_conversions', datetime('now'))
ON CONFLICT(version) DO NOTHING;
