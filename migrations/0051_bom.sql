-- 迁移 0051：BOM（物料清单）关系化 —— C1 数据关系化首个样板域
-- 整改版本：V3.6.0
--
-- ── 为什么要做这件事（第一性原理）──────────────────────────────────
-- C1 的目标不是「建两张表」，而是**把「一次读写一个 JSON 大对象」改成「按行读写关系表」**。
-- BOM 域此前存在三个由「大对象存储」直接导致的硬缺陷：
--
--   1) **无法按子件反查**。「这个零件被哪些产品用到」是制造业最高频的查询之一
--      （零件要改规格、要涨价、要停产替换时必须先知道影响面）。数据存在
--      `app_state` 的一个 JSON 数组里，后端没有表可以 `WHERE material_code = ?`，
--      只能把整包 JSON 拉到浏览器再过滤 —— 前端算得动，但数据库帮不上忙。
--   2) **无法做关系约束**。同一产品同一版本出现两条相同子件、子件引用不存在的父件，
--      这类问题在 JSON 数组里没有任何机制能拦住；关系表可以靠唯一约束 + 外键拦住。
--   3) **无法分页**。BOM 明细增长后只能整包传，越用越慢，且受 A5 的 8 MB 硬顶限制。
--
-- 因此本迁移不是「换个地方存」，而是让数据库第一次**知道** BOM 的内部结构。
--
-- ── 设计取舍 1：为什么拆成两张表 bom_headers + bom_items ───────────
-- BOM 天然是「一个表头 + N 行明细」的主从结构：
--   bom_headers = 产品级的用料清单头（一个产品一个版本一行）
--   bom_items   = 该清单下的每一行用料（含层级 level，支持多层嵌套）
-- 拆表才能做到「按子件反查」（查 bom_items.material_code），
-- 这在单表 JSON 方案下是不可能的。
--
-- ── 设计取舍 2：为什么明细的父子层级用「物化列」而不是递归查询 ──────
-- `bom_items` 里每一行自带 `level`（层级）与 `parent_item_id`（父行）。
-- 为什么不靠 SQL 递归 CTE 从 material_code 自动推层级？因为 BOM 的层级是
-- **工艺决定的、人为确认的**（同一物料在装配体里放第几层是设计决策，不是数据推导结果）。
-- 把它物化成列，既能让「按层级排序展示」变成一次普通 ORDER BY，
-- 也能让 MRP 的低层码（B1 已实现）直接读到稳定值，不必每次重新遍历。
--
-- ── 设计取舍 3：唯一约束为什么是 (org_id, bom_id, level, sequence) ──
-- 一条 BOM 明细的天然身份 = 「哪张清单 + 第几层 + 该层第几序号」。
-- 用这三者 + 组织做唯一键，能拦住「同一位置插入两行」这种脏数据；
-- 而不用 (org_id, bom_id, material_code) 做唯一键，是因为**同一子件在同一 BOM 中
-- 允许出现在不同位置**（例如某标准件在框架段和底座段各用一次，用量与工序不同），
-- 强行去重反而会吃掉真实数据。
--
-- ── 设计取舍 4：为什么不给 bom_items 建 org_id ─────────────────────
-- 明细行通过 bom_id 从属于表头，而表头已带 org_id。若明细也存 org_id，
-- 就有两份组织归属，两者不一致时以哪个为准会成为长期隐患。
-- 但查询侧仍然需要按组织过滤，故这里采用**「表头带 org_id + 明细靠 bom_id 关联」**，
-- 读取明细时统一 `WHERE bom_id IN (组织内的表头)`。索引按此查询路径建。
--
-- ── 设计取舍 5：成本字段为什么冗余存在明细行上 ─────────────────────
-- `unit_cost` / `total_cost` 是从物料主数据与工艺路线**推算**出来的，理论上可算不存。
-- 但 BOM 的成本数字一旦被发布（进入报价、进入成本卷积），就必须**冻结**：
-- 事后物料涨价不应悄悄改写三个月前那张已发布的 BOM 的成本。
-- 所以存下来的是「发布时刻的成本快照」，这是刻意冗余，不是设计失误。
--
-- ── 设计取舍 6：bom_headers.items 这个 JSON 字段为什么不保留 ────────
-- 前端类型 `BOMHeader.items?: BOMItem[]` 仍然存在（接口形状不变，避免改动 15 个消费方），
-- 但**数据库不再存这个嵌套数组**，而是由后端在读取表头时 JOIN 出明细、组装回嵌套结构。
-- 这样前端零改动，后端拿到关系化的全部好处 —— 接口形状与存储形态解耦。
--
-- ── 与 RLS 的关系（重要）────────────────────────────────────────
-- 两张表均为**共享主数据**（BOM 是研发/生产/采购共同查阅的基础资料，
-- 与 materials 同属性），必须在 functions/_shared/rls.ts 的 RLS_SCOPE 中
-- 登记为 'all'，否则 V3.3.0 起的「默认拒绝」会让查询静默返回空表。
-- ⚠️ 这是 V3.4.0 A5 轮次踩过的坑：新增 D1 表必须同批登记 RLS。

PRAGMA foreign_keys = ON;

-- ── 表头：产品级用料清单 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_headers (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL,

  bom_no          TEXT NOT NULL,              -- 清单编号（业务单号，组织内唯一）
  name            TEXT,                       -- 清单名称
  source_order_no TEXT,                       -- 关联来源销售订单号（由 SO 一键创建 BOM 时写入）

  type            TEXT NOT NULL DEFAULT 'EBOM',   -- EBOM（设计）/ MBOM（制造）
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft | released | obsolete

  product_id      TEXT,
  product_code    TEXT,
  product_name    TEXT,

  version         TEXT NOT NULL DEFAULT 'V1.0',   -- 版本号：BOM 的核心，同产品可多版本共存
  effective_date  TEXT,                       -- 生效日期（YYYY-MM-DD）
  expiry_date     TEXT,                       -- 失效日期（空 = 长期有效）

  total_cost      REAL DEFAULT 0,             -- 成本快照（见设计取舍 5）
  currency        TEXT DEFAULT 'CNY',
  description     TEXT,
  approved_by     TEXT,
  approved_at     TEXT,

  -- ── 替代 BOM（P1-18）：同产品可有多张 BOM，按优先级选用 ──
  is_alternate       INTEGER NOT NULL DEFAULT 0,  -- 是否替代 BOM（0/1）
  usage_probability  REAL,                        -- 使用概率（%）
  priority           INTEGER,                     -- 优先级（越小越优先）

  -- ── 联产品 / 副产品（P1-19）：以 JSON 文本存，因其为「次要产出」而非主结构 ──
  -- 刻意不拆表：联副产品数量少、不参与 BOM 展开、不被反查，拆表收益低于维护成本。
  co_products        TEXT,                        -- CoProduct[] JSON
  by_products        TEXT,                        -- ByProduct[] JSON
  cost_split_method  TEXT,                        -- weight | volume | market_value

  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_by      TEXT,

  -- 业务唯一键：同一组织内清单编号唯一（版本通过 bom_no 编号体系区分）
  UNIQUE (org_id, bom_no)
);

-- 按产品查清单（最高频：进产品详情看它的用料）
CREATE INDEX IF NOT EXISTS idx_bom_header_product ON bom_headers(org_id, product_code);
-- 按产品编码取「已发布」版本（getBOMByProductCode 的查询路径）
CREATE INDEX IF NOT EXISTS idx_bom_header_status ON bom_headers(org_id, product_code, status);
-- 按来源销售订单反查（SO 一键创建后要能找回来）
CREATE INDEX IF NOT EXISTS idx_bom_header_source ON bom_headers(org_id, source_order_no);
-- 替代 BOM 选择：同产品按优先级排序
CREATE INDEX IF NOT EXISTS idx_bom_header_priority ON bom_headers(org_id, product_code, priority);

-- ── 明细：每一行用料 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bom_items (
  id              TEXT PRIMARY KEY,
  bom_id          TEXT NOT NULL,              -- 所属表头（明细不存 org_id，见设计取舍 4）

  level           INTEGER NOT NULL DEFAULT 1, -- 层级（1 = 直接子件，2 = 二级子件…）
  sequence        INTEGER NOT NULL DEFAULT 0, -- 同层内的顺序号（决定装配顺序与展示顺序）
  parent_item_id  TEXT,                       -- 父明细行（多层结构用，见设计取舍 2）

  material_id     TEXT,
  material_code   TEXT,
  material_name   TEXT,
  material_spec   TEXT,
  unit            TEXT,

  quantity        REAL NOT NULL DEFAULT 0,    -- 单位用量的需求量
  scrap_rate      REAL NOT NULL DEFAULT 0,    -- 废品率 %（A3 已把它接进 MRP 计算）
  unit_cost       REAL NOT NULL DEFAULT 0,    -- 单位成本快照（见设计取舍 5）
  total_cost      REAL NOT NULL DEFAULT 0,    -- 行合计成本快照

  lead_time       INTEGER,                    -- 采购/生产提前期（天）
  source          TEXT NOT NULL DEFAULT 'purchase',  -- purchase | manufacture | phantom
  is_critical     INTEGER NOT NULL DEFAULT 0, -- 是否关键件（0/1）

  -- 成本卷积扩展
  child_product_code TEXT,                    -- 若引用子装配，通过 productCode 递归其 BOM
  labor_cost      REAL DEFAULT 0,             -- 人工/工时成本
  process_cost    REAL DEFAULT 0,             -- 工序成本

  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,

  -- 唯一键 = 「哪张清单 + 第几层 + 该层第几序号」（见设计取舍 3）
  UNIQUE (bom_id, level, sequence),

  FOREIGN KEY (bom_id) REFERENCES bom_headers(id) ON DELETE CASCADE
);

-- ★ 本迁移最重要的索引：按子件反查「这个零件被哪些产品用到」
--   这正是 JSON 大对象方案下**做不了**的查询，也是关系化最直接的价值兑现。
CREATE INDEX IF NOT EXISTS idx_bom_item_material ON bom_items(material_code);
-- 取一张清单的明细（按层级 + 序号排序，与界面展示顺序一致）
CREATE INDEX IF NOT EXISTS idx_bom_item_bom ON bom_items(bom_id, level, sequence);
-- 多层结构按父行取子行
CREATE INDEX IF NOT EXISTS idx_bom_item_parent ON bom_items(parent_item_id);

-- 行级策略扩展列（与既有业务表保持一致：库内 0013 迁移为业务表统一加了这两列）
ALTER TABLE bom_headers ADD COLUMN owner_id TEXT;
ALTER TABLE bom_headers ADD COLUMN dept_id  TEXT;
ALTER TABLE bom_items   ADD COLUMN owner_id TEXT;
ALTER TABLE bom_items   ADD COLUMN dept_id  TEXT;

-- 幂等守卫（业务版本登记）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0051_bom', datetime('now'))
ON CONFLICT(version) DO NOTHING;
