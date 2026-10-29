-- V2.81.0 盘点任务迁真实 D1（根治 Blob 双通道，对齐 W0/W1 实体范式）
-- 前端 warehouseStore.loadCheckTasks 经 /api/entities/checkTask 读写；
-- 嵌套 items（CheckTaskItem[]）以 JSON 文本落库；blindMode 布尔→INTEGER(0/1)。
-- 与 functions/_shared/entities.ts 注册 ENTITY_RESOURCES.checkTask 同源。
CREATE TABLE IF NOT EXISTS check_tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  task_no TEXT NOT NULL,
  warehouse_id TEXT,
  warehouse_name TEXT,
  type TEXT DEFAULT 'full',
  status TEXT DEFAULT 'pending',
  start_date TEXT,
  end_date TEXT,
  operator TEXT,
  items TEXT,
  difference_amount REAL DEFAULT 0,
  remarks TEXT,
  blind_mode INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_check_tasks_org ON check_tasks(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0035_check_tasks', datetime('now'))
ON CONFLICT(version) DO NOTHING;
