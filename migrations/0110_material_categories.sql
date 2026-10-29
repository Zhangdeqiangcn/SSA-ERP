-- V3.94.0 物料分类落库（根治内存 mock 双通道，开启「分类自配置自定义字段」地基）
-- 分类为组织级共享主数据，RLS 登 'all'（组织隔离靠 org_id，'all' ≠ 跨组织放行）。
-- responsible_persons / attributes 以 JSON 文本落库，前端读取后自行 JSON.parse；
-- attributes 承载管理员在「设置→自定义字段（实体=物料分类）」中自助加列后写入的值。
CREATE TABLE IF NOT EXISTS material_categories (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  parent_id TEXT,
  code TEXT,
  name TEXT NOT NULL,
  sequence_length INTEGER,
  responsible_persons TEXT,
  attributes TEXT,
  sort_order INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  description TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
