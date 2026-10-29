-- V3.92.0 P1（B 路线）：电商化落地 —— 订单中台 + 渠道凭证 + 店铺绑定 + 同步日志
-- 设计口径（对齐 0100 范式）：
--   · org_id 隔离 + created_at/updated_at/created_by/updated_by/created_by_name/updated_by_name 审计列；
--   · 嵌套明细（订单行、SKU 映射）封 extra_json / lines，不改通用实体框架；
--   · 全部 CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS，可重复执行；
--   · 不新增源数据没有的唯一约束（按 org_id + 业务键 非唯一索引处理，避免回填撞键）。
-- 安全提示：channel_credentials 存 AppSecret/access_token，生产应改用 Cloudflare Secrets 或加密列，
--   此处先落表以便联调，后续接入密钥加密（铁律：密钥绝不落前端）。

-- ──────────────────────────────────────────────
-- 订单中台（order_hub）：各渠道归一化后的统一订单
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_hub (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  platform TEXT,
  platform_order_id TEXT,
  order_status TEXT,
  buyer_name TEXT,
  buyer_phone TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  province TEXT,
  city TEXT,
  district TEXT,
  pay_time TEXT,
  total_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  freight REAL DEFAULT 0,
  currency TEXT,
  lines TEXT,           -- JSON 数组：NormalizedOrderLine[]
  raw_payload TEXT,      -- JSON：平台原始报文（存档备查）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_hub_org ON order_hub(org_id);
CREATE INDEX IF NOT EXISTS idx_order_hub_platform ON order_hub(org_id, platform);
CREATE INDEX IF NOT EXISTS idx_order_hub_poid ON order_hub(org_id, platform_order_id);

-- ──────────────────────────────────────────────
-- 渠道凭证（channel_credentials）：平台 AppKey/Secret/Token（后端持有）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_credentials (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  platform TEXT,
  app_key TEXT,
  app_secret TEXT,
  access_token TEXT,
  token_expire TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_channel_credentials_org ON channel_credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_credentials_pk ON channel_credentials(org_id, platform);

-- ──────────────────────────────────────────────
-- 店铺绑定（channel_bindings）：平台店铺 + SKU 映射
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_bindings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  platform TEXT,
  shop_id TEXT,
  shop_name TEXT,
  sku_map TEXT,         -- JSON：{ platformSku: internalSku }
  status TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_channel_bindings_org ON channel_bindings(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_bindings_pk ON channel_bindings(org_id, platform);

-- ──────────────────────────────────────────────
-- 渠道同步日志（channel_sync_logs）：拉单/推库存/回写物流的审计流水
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_sync_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  platform TEXT,
  action TEXT,
  status TEXT,
  message TEXT,
  count INTEGER DEFAULT 0,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_org ON channel_sync_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_pt ON channel_sync_logs(org_id, platform, action);
