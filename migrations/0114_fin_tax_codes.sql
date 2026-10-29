-- V3.96.0 供应商组织与会计整改：新增「税码主数据」
--
-- 背景（强哥诉求）：
--   供应商注册申请里「统驭科目」「税码」是**甲方财务视角**的字段，外部供应商
--   不了解、也不该在注册时填。应改由采购/财务在审批环节从主数据里【选择】。
--   统驭科目复用现有会计科目表（fin_chart_of_accounts，选应付类科目）；
--   税码此前没有独立维护入口，只有注册表单里写死的税率下拉，缺一个正经的
--   「税码主数据」。本迁移把税码主数据落 D1，与会计科目表同一范式。
--
-- 范式对齐 fin_chart_of_accounts（迁移 0053）：组织级共享主数据，带 org_id 隔离，
--   通用实体路由 functions/api/entities/[resource] 接管（前端在 entities.ts 登记
--   finTaxCode），零新增后端函数；RLS 在 _shared/rls.ts 的 RLS_SCOPE 登 'all'。

CREATE TABLE IF NOT EXISTS fin_tax_codes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT NOT NULL,                  -- 税码编码（如 V13 / V9 / V0）
  name TEXT NOT NULL,                  -- 税码名称（如 增值税13%专票）
  tax_rate REAL DEFAULT 0,            -- 税率（0-100，对应税率百分比数值）
  deductible INTEGER DEFAULT 1,       -- 进项是否可抵扣（1=可抵扣 0=不可）
  remark TEXT,                         -- 说明/适用场景
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT,
  UNIQUE (org_id, code)
);
CREATE INDEX IF NOT EXISTS idx_fin_tax_code ON fin_tax_codes(org_id, code);
CREATE INDEX IF NOT EXISTS idx_fin_tax_rate ON fin_tax_codes(org_id, tax_rate);

-- 种子：常用增值税税码（与中国现行税率对齐），组织 'default'。
-- 幂等：ON CONFLICT DO NOTHING，已有不重复写入。
INSERT INTO fin_tax_codes (id, org_id, code, name, tax_rate, deductible, remark, created_at) VALUES
  ('ftc-v13', 'default', 'V13', '增值税13%专票（可抵扣）', 13, 1, '一般纳税人标准税率，进项可抵扣', datetime('now')),
  ('ftc-v9',  'default', 'V9',  '增值税9%专票（可抵扣）',  9,  1, '交通运输/建筑/基础服务等',       datetime('now')),
  ('ftc-v6',  'default', 'V6',  '增值税6%专票（可抵扣）',  6,  1, '现代服务/信息技术/金融等',       datetime('now')),
  ('ftc-v3',  'default', 'V3',  '增值税3%征收率',          3,  1, '小规模纳税人/简易征收',           datetime('now')),
  ('ftc-v0',  'default', 'V0',  '免税/零税率',             0,  0, '出口/免税项目，进项不可抵扣',     datetime('now'))
ON CONFLICT (id) DO NOTHING;

-- 幂等守卫（业务版本登记）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0114_fin_tax_codes', datetime('now'))
ON CONFLICT(version) DO NOTHING;
