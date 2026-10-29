-- 迁移 0055：销售域关系化（V3.9.0 · C1）
--
-- ── 本迁移做什么 ────────────────────────────────────────────────
-- 把 app_state 里 `ssa-erp-sales` 这个 JSON 大对象中的三个业务切片
-- （prospects / shipments / projects）迁到 D1 关系表。
--
-- ── 为什么是现在、为什么是这三个切片 ────────────────────────────
-- 实测（探针查生产库 app_state）：
--   · `ssa-erp-sales` 键体积 **10668 字节**，其中四个切片合计约 10.4 KB
--   · `salesOrders` 已于 W1 迁 D1（sales_orders 9 行 / sales_order_items 12 行），
--     不在这个键里了
-- 也就是说：迁完这三个切片，`ssa-erp-sales` 这个键就可以整体摘除，
-- 「双通道」（同一份数据 Blob 一份、D1 一份）在销售域彻底根治。
--
-- **`marketData` 刻意不迁**（这是本轮一个明确的判断，不是遗漏）：
--   它是「报表型展示数据」，全项目仅 MarketAnalysis.tsx 一个消费方，
--   只做 `marketData[0]` 读取，**零 CRUD 方法**（salesStore 里没有任何
--   addMarketData / updateMarketData）。也就是说它没有写入方、没有单一
--   事实来源，本质是种子常量。为它建三张子表（topProducts / regionalData /
--   salesTrend）只会得到「永远只有种子数据的表 + 零个端点」，
--   白白增加三张需要在 RLS 里登记、需要维护的表。因此保留前端常量。
--
-- ── 字段契约来源（硬纪律）───────────────────────────────────────
-- 全部列名由 `src/types/sales.ts` 的 Prospect / FollowupRecord /
-- Shipment / ShipmentItem / Project / ProjectMilestone / ProjectException
-- 逐一反推为 snake_case。
-- **表结构必须服从前端契约，不是反过来** —— 0053 按「会计常识」推断列名的
-- 教训见 migrations/0054_finance_domain_fix.sql 文件头。
--
-- ── 多层嵌套的处理（本域比财务域复杂）───────────────────────────
--   · Prospect.interestProducts: string[]  → 父表 JSON 文本列
--   · Prospect.followupRecords: FollowupRecord[] → 子表 sales_prospect_followups
--   · Shipment.items: ShipmentItem[]       → 子表 shipment_items
--   · Project.team: string[]               → 父表 JSON 文本列
--   · Project.linkedOrders: string[]       → 父表 JSON 文本列
--   · Project.milestones[]                 → 子表 project_milestones
--   · Project.exceptions[]                 → 子表 project_exceptions
-- 字符串数组**不建子表**：它们没有 id、没有属性、不参与 SQL 统计，
-- 建成子表只会得到「每行一个字符串」的空壳表，反而让 JOIN 变复杂。
--
-- ── 前置核对（已执行）──────────────────────────────────────────
-- 本迁移执行前已用探针核对：`shipments` / `projects` / `prospects` /
-- `sales_prospects` / `project_milestones` / `project_exceptions` /
-- `shipment_items` / `sales_prospect_followups` **在生产库均不存在**，
-- 因此这里是纯新建，不涉及任何数据搬迁或破坏。父表用 CREATE TABLE
-- 而非 DROP + CREATE（对不存在的表 DROP 也无害，但保持最小动作）。

PRAGMA foreign_keys = ON;

-- ==================== 意向客户：对齐 Prospect ====================
CREATE TABLE IF NOT EXISTS sales_prospects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  prospect_no TEXT,                     -- prospectNo
  company_name TEXT,                    -- companyName
  contact_name TEXT,                    -- contactName
  contact_phone TEXT,                   -- contactPhone
  contact_email TEXT,                   -- contactEmail
  industry TEXT,                        -- industry
  region TEXT,                          -- region
  source TEXT,                          -- source: web|exhibition|referral|cold_call|advertise|other
  status TEXT,                          -- status: new|contacted|negotiating|quoted|won|lost
  interest_products TEXT,               -- interestProducts: string[] → JSON 文本
  estimated_value REAL DEFAULT 0,       -- estimatedValue
  probability INTEGER DEFAULT 0,        -- probability（成交概率 0-100）
  next_followup_date TEXT,              -- nextFollowupDate
  assigned_to TEXT,                     -- assignedTo
  converted_to_customer INTEGER DEFAULT 0, -- convertedToCustomer（布尔）
  credit_limit REAL DEFAULT 0,          -- creditLimit（V2.7 信用额度）
  used_credit REAL DEFAULT 0,           -- usedCredit（V2.7 已用信用）
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE(org_id, prospect_no)
);
CREATE INDEX IF NOT EXISTS idx_sales_prospect_status ON sales_prospects(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_prospect_assigned ON sales_prospects(org_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_prospect_company ON sales_prospects(org_id, company_name);

-- 意向客户跟进记录（子表）：一行一次跟进，可 SQL 统计「本月跟进几次」
CREATE TABLE IF NOT EXISTS sales_prospect_followups (
  id TEXT PRIMARY KEY,
  prospect_id TEXT NOT NULL,            -- 从属意向客户，不重复存 org_id
  seq INTEGER DEFAULT 0,                -- 保持前端数组顺序
  date TEXT,                            -- date
  method TEXT,                          -- phone|email|visit|meeting|other
  content TEXT,                         -- content
  result TEXT,                          -- result
  next_action TEXT,                     -- nextAction
  followed_by TEXT,                     -- followedBy
  FOREIGN KEY (prospect_id) REFERENCES sales_prospects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sales_followup_prospect ON sales_prospect_followups(prospect_id, seq);

-- ==================== 物流发货：对齐 Shipment ====================
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  shipment_no TEXT,                     -- shipmentNo
  sales_order_no TEXT,                  -- salesOrderNo
  project_no TEXT,                      -- projectNo
  project_name TEXT,                    -- projectName
  customer_name TEXT,                   -- customerName
  status TEXT,                          -- pending|picked|packed|shipped|in_transit|delivered|cancelled
  transport_mode TEXT,                  -- road|rail|sea|air|express
  carrier TEXT,                         -- carrier
  tracking_no TEXT,                     -- trackingNo
  estimated_pickup_date TEXT,           -- estimatedPickupDate
  estimated_delivery_date TEXT,         -- estimatedDeliveryDate
  actual_pickup_date TEXT,              -- actualPickupDate
  actual_delivery_date TEXT,            -- actualDeliveryDate
  origin_address TEXT,                  -- originAddress
  destination_address TEXT,             -- destinationAddress
  driver_name TEXT,                     -- driverName
  driver_phone TEXT,                    -- driverPhone
  vehicle_no TEXT,                      -- vehicleNo
  total_weight REAL DEFAULT 0,          -- totalWeight
  total_volume REAL DEFAULT 0,          -- totalVolume
  package_count INTEGER DEFAULT 0,      -- packageCount
  freight REAL DEFAULT 0,               -- freight
  insurance REAL DEFAULT 0,             -- insurance
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE(org_id, shipment_no)
);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(org_id, sales_order_no);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(org_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(org_id, customer_name);

-- 发货明细（子表）
CREATE TABLE IF NOT EXISTS shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,            -- 从属发货单，不重复存 org_id
  seq INTEGER DEFAULT 0,
  material_id TEXT,                     -- materialId
  material_code TEXT,                   -- materialCode
  material_name TEXT,                   -- materialName
  specification TEXT,                   -- specification
  unit TEXT,                            -- unit
  order_quantity REAL DEFAULT 0,        -- orderQuantity
  ship_quantity REAL DEFAULT 0,         -- shipQuantity
  unit_price REAL DEFAULT 0,            -- unitPrice
  amount REAL DEFAULT 0,                -- amount
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id, seq);

-- ==================== 项目管理：对齐 Project ====================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_no TEXT,                      -- projectNo
  project_name TEXT,                    -- projectName
  customer_name TEXT,                   -- customerName
  customer_code TEXT,                   -- customerCode
  status TEXT,                          -- planning|in_progress|pending|at_risk|completed|closed
  start_date TEXT,                      -- startDate
  end_date TEXT,                        -- endDate
  contract_amount REAL DEFAULT 0,       -- contractAmount
  received_amount REAL DEFAULT 0,       -- receivedAmount
  budget REAL DEFAULT 0,                -- budget
  actual_cost REAL DEFAULT 0,           -- actualCost
  progress INTEGER DEFAULT 0,           -- progress（0-100）
  manager TEXT,                         -- manager
  team TEXT,                            -- team: string[] → JSON 文本
  linked_orders TEXT,                   -- linkedOrders: string[]（关联销售订单号）→ JSON 文本
  description TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE(org_id, project_no)
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(org_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(org_id, customer_name);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(org_id, manager);

-- 项目里程碑（子表 1/2）
CREATE TABLE IF NOT EXISTS project_milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,             -- 从属项目，不重复存 org_id
  seq INTEGER DEFAULT 0,
  name TEXT,                            -- name
  planned_date TEXT,                    -- plannedDate
  actual_date TEXT,                     -- actualDate
  status TEXT,                          -- pending|in_progress|completed|delayed
  description TEXT,                     -- description
  deliverable TEXT,                     -- deliverable
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id, seq);

-- 项目异常（子表 2/2）
-- ★ 这是 Project 的第二个嵌套数组。若沿用单子表配置，它会被静默丢弃，
--   表现为「项目详情页正常打开、进度条正常，但异常列表全空」且不报错。
CREATE TABLE IF NOT EXISTS project_exceptions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,             -- 从属项目，不重复存 org_id
  seq INTEGER DEFAULT 0,
  exception_no TEXT,                    -- exceptionNo
  type TEXT,                            -- schedule|cost|quality|resource|customer|other
  severity TEXT,                        -- low|medium|high|critical
  title TEXT,                           -- title
  description TEXT,                     -- description
  reported_by TEXT,                     -- reportedBy
  reported_at TEXT,                     -- reportedAt
  status TEXT,                          -- open|investigating|resolved|closed
  resolution TEXT,                      -- resolution
  resolved_by TEXT,                     -- resolvedBy
  resolved_at TEXT,                     -- resolvedAt
  impact_description TEXT,              -- impactDescription
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_exceptions_project ON project_exceptions(project_id, seq);

-- 幂等守卫
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0055_sales_domain', datetime('now'))
ON CONFLICT(version) DO NOTHING;
