-- V3.92.0 P1-6 物流面单（电子面单 + 物流轨迹回写）
-- 设计口径（对齐 0100/0101/0102 范式）：
--   · org_id 隔离 + created_at/updated_at/created_by/updated_by/created_by_name/updated_by_name 审计列；
--   · 全部 CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS，可重复执行；
--   · 不新增源数据没有的唯一约束（按 org_id + 业务键 非唯一索引）。
-- 关联：waybills.order_hub_id → order_hub.id；waybills.pack_no → pack_records.pack_no；
--       logistics_tracks.waybill_no → waybills.waybill_no（承运商运单号作业务锚点）。

-- ──────────────────────────────────────────────
-- 电子面单（waybills）：向承运商申请到的运单
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waybills (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  carrier TEXT,                 -- douyin / pinduoduo / kdniao / ...
  waybill_no TEXT,              -- 承运商回传的运单号
  order_hub_id TEXT,
  pack_no TEXT,
  wave_id TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  province TEXT,
  city TEXT,
  district TEXT,
  weight REAL,
  label_url TEXT,              -- 面单 PDF/HTML 地址
  status TEXT,                 -- created/printed/dispatched/intransit/delivered/signed/exception
  mock INTEGER DEFAULT 0,      -- 1=Mock 生成（未接真实承运商），0=真实承运商回传
  raw_payload TEXT,            -- 承运商原始报文
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_waybills_org ON waybills(org_id);
CREATE INDEX IF NOT EXISTS idx_waybills_carrier ON waybills(org_id, carrier);
CREATE INDEX IF NOT EXISTS idx_waybills_order ON waybills(org_id, order_hub_id);

-- ──────────────────────────────────────────────
-- 物流轨迹（logistics_tracks）：承运商回传的轨迹流水
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logistics_tracks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  carrier TEXT,
  waybill_no TEXT,
  event_time TEXT,             -- 轨迹发生时间
  status TEXT,                 -- 归一化状态：collected/dispatched/intransit/delivered/signed/exception
  location TEXT,
  description TEXT,
  raw TEXT,                    -- 承运商原始轨迹节点
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tracks_org ON logistics_tracks(org_id);
CREATE INDEX IF NOT EXISTS idx_tracks_wb ON logistics_tracks(org_id, waybill_no);
CREATE INDEX IF NOT EXISTS idx_tracks_time ON logistics_tracks(org_id, event_time);
-- 同一运单 + 时间 + 地点 视为同一物理节点：承运商重复推送时幂等（INSERT OR IGNORE）
CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_uniq ON logistics_tracks(org_id, waybill_no, event_time, status, location);
