-- V2.84.0 C9 物料替代料组 + 优先级（根治 BOM/生产灵活可配硬缺口，源码零实现 → 闭合）
-- 复用通用实体路由 /api/entities/materialSubstitute（会话鉴权 + 按公司 org 隔离 + 行级权限 + 写审计），零新增后端函数。
-- 字段全为标量；materialSubstitute 资源在 functions/_shared/entities.ts 注册（驼峰↔蛇形自动转换）。
-- 与 ENTITY_RESOURCES.materialSubstitute 同源。
CREATE TABLE IF NOT EXISTS material_substitutes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  material_code TEXT NOT NULL,
  material_name TEXT,
  substitute_code TEXT NOT NULL,
  substitute_name TEXT,
  priority INTEGER DEFAULT 1,
  substitute_type TEXT DEFAULT 'full',
  conversion_ratio REAL DEFAULT 1,
  effective_from TEXT,
  effective_to TEXT,
  reason TEXT,
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_material_substitutes_org ON material_substitutes(org_id);
CREATE INDEX IF NOT EXISTS idx_material_substitutes_material ON material_substitutes(material_code, org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0038_material_substitutes', datetime('now'))
ON CONFLICT(version) DO NOTHING;
