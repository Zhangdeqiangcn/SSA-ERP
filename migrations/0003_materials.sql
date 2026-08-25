-- P1 Phase 1 · 物料主数据关系化
-- 将 src/stores/materialStore 中散存于 app_state 的物料 JSON blob 迁至真实关系表。
-- 表结构覆盖 Material 接口全部字段，parameters/plantParams/customFields 等对象数组
-- 以 TEXT 形式序列化后落库，便于后续查询。
-- 幂等：ON CONFLICT(org_id, code) DO UPDATE 避免重复写入。

CREATE TABLE IF NOT EXISTS materials (
  -- 主键 & 组织隔离
  org_id          TEXT NOT NULL,
  id              TEXT NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,

  -- 基本属性
  category_id     TEXT,
  category_name   TEXT,
  specification   TEXT,
  model           TEXT,
  unit            TEXT NOT NULL DEFAULT '个',

  -- 分类视图
  material_type   TEXT CHECK (material_type IN ('raw','semi','finished','purchased','service')),
  make_or_buy     TEXT CHECK (make_or_buy IN ('make','buy')),

  -- 库存水位
  safety_stock    REAL NOT NULL DEFAULT 0,
  min_stock       REAL NOT NULL DEFAULT 0,
  max_stock       REAL NOT NULL DEFAULT 0,
  current_stock   REAL NOT NULL DEFAULT 0,

  -- 价格视图
  price           REAL NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'CNY',
  standard_price  REAL,
  moving_avg_price REAL,
  stock_value     REAL,

  -- 采购视图
  lead_time       INTEGER,
  moq             REAL,
  mpq             REAL,
  default_vendor_id TEXT,
  default_vendor_name TEXT,
  purchase_unit   TEXT,
  unit_conversion REAL,
  purchasing_group TEXT,
  order_unit      TEXT,
  purchasing_value_key TEXT,
  gr_processing_days INTEGER,

  -- MRP 视图
  mrp_type        TEXT,
  mrp_controller  TEXT,
  lot_size        REAL,
  reorder_point   REAL,
  planned_delivery_days INTEGER,

  -- 销售视图
  tax_classification TEXT,
  delivery_unit   TEXT,
  min_order_qty   REAL,
  min_delivery_qty REAL,
  account_assignment_group TEXT,

  -- 评估视图
  valuation_class TEXT CHECK (valuation_class IN ('RAW','SEMI','FG','TRADING','PACKAGING','CONSUMABLE')),
  price_control   TEXT CHECK (price_control IN ('S','V')),

  -- 工艺属性（自制件）
  routing         TEXT,
  work_center     TEXT,
  cycle_time      REAL,
  scrap_rate      REAL,
  inspection_point TEXT,

  -- 生命周期
  status          TEXT NOT NULL DEFAULT 'draft',
  lifecycle_status TEXT CHECK (lifecycle_status IN ('draft','active','phasing_out','obsolete')),
  shelf_life_days INTEGER DEFAULT 0,
  shelf_life_warning_days INTEGER DEFAULT 0,
  batch_managed   INTEGER DEFAULT 0,
  serialized      INTEGER DEFAULT 0,
  gtin            TEXT,

  -- 扩展
  remarks         TEXT,
  parameters      TEXT,   -- JSON array of {key, value, unit?}
  plant_params    TEXT,   -- JSON array of PlantParam
  custom_fields   TEXT,   -- JSON object

  -- 审计
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  created_by      TEXT NOT NULL,
  updated_by      TEXT NOT NULL,

  PRIMARY KEY (id),
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_materials_org ON materials(org_id);
CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(material_type);

-- 记录迁移状态（幂等守卫）
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
