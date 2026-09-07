-- V2.80.0 W2：移动端即时消息（轮询拉取，D1 多人共享，org 隔离）
CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  sender_id    TEXT,
  sender_name  TEXT,
  recipient_id TEXT,
  recipient_role TEXT,
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT DEFAULT 'system',
  ref_module   TEXT,
  ref_id       TEXT,
  read         INTEGER DEFAULT 0,
  read_at      TEXT,
  created_at   TEXT,
  updated_at   TEXT,
  created_by   TEXT,
  updated_by   TEXT
);
