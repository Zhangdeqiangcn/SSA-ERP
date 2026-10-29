-- 迁移 0075：审批实例统一表 + 动作流水 + 审批委托关系（V3.17.9 修复差距9/10/11）
--
-- ── 背景：配置层早已统一，实例层一直散着 ──────────────────────────
-- 迁移 0056 已经把「审批流配置」统一到 approval_flows / approval_flow_nodes，
-- 但「一次真正的提交—审批过程」（实例层）至今仍寄存在各业务单据自己的字段里：
--   · purchase_requests.current_step / approval_records（唯一真正落 D1 的）
--   · priceApprovals.currentStep / approvalRecords（前端 localStorage）
--   · materialApplications.currentStep / stepHistory（前端 localStorage）
-- 这套结构撑不起下面三件事，也正是对标报告列为「仍存」的差距 9/10/11：
--   差距9 撤回：必须知道「现在卡在哪个节点、谁还没批」，才谈得上把单子收回来；
--   差距10 催办：必须能按节点算出「该催谁」，并留下催过几次的痕迹；
--   差距11 委托：必须有一张委托关系表，才能把某人的待办在委托期内转给别人。
-- 因此本迁移把「实例」与「动作」从业务单据里抽出来，单独成表。
--
-- ── 为什么不要往各单据的 approvalRecords JSON 里继续塞 ─────────────
-- ① 跨单据查询做不到：审批中心要一次列出「待我审批 / 我提交的 / 委托给我的」，
--    如果实例信息散在 N 张业务表里，就得 UNION N 次且每张表字段名都不一样；
-- ② 撤回/催办是「过程动作」，不是单据字段，塞进 JSON 会让单据表越写越大、
--    且无法用索引按「催办时间」排序；
-- ③ 委托关系是「人→人+时间段」的独立实体，和任何单据都没有从属关系。
--
-- ── 设计口径 ──────────────────────────────────────────────────
-- · approval_instances：一次提交 = 一行。业务单据本身仍保留自己的 status，
--   本表是「审批过程的权威账本」，两者通过 (org_id, module, entity_id) 关联。
-- · approval_actions：所有过程动作的流水（提交/通过/驳回/撤回/催办/委托/撤销委托）。
--   只追加、不修改，作为审计与「催办了几次、谁催的」的唯一依据。
-- · approval_delegates：委托关系（时间段 + 可选模块范围）。生效判定在应用层做，
--   不用触发器 —— 与全项目「业务判定不藏在 DDL 里」的既有约定一致。
--
-- 注意：不加外键约束到业务表 —— 业务单据分散在多张表、模块名是字符串，
--       数据库层面无法表达；归属校验由端点按 (org_id, module, entity_id) 做。

PRAGMA foreign_keys = ON;

-- ════════════ 1) 审批实例 ════════════
CREATE TABLE IF NOT EXISTS approval_instances (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  flow_id TEXT,                              -- 引 approval_flows.id（可为空：未配置流程的模块）
  module TEXT NOT NULL,                      -- 业务模块：purchase_request / sales_order / price_approval / material_application…
  entity_id TEXT NOT NULL,                   -- 业务单据 id
  entity_no TEXT,                            -- 单据编号（界面展示用，避免每次回查业务表）
  title TEXT,                                -- 标题（界面展示用）
  submitter_id TEXT,
  submitter_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected | withdrawn
  total_nodes INTEGER DEFAULT 0,
  current_node_order INTEGER DEFAULT 0,      -- 当前卡在第几个节点（1 起）
  current_node_name TEXT,
  current_approver_id TEXT,                  -- 当前应审批人（委托路由后的「实际」审批人）
  current_approver_name TEXT,
  original_approver_id TEXT,                 -- 配置上本应的审批人（用于区分「是否走了委托」）
  submitted_at TEXT NOT NULL,
  finished_at TEXT,                          -- 通过/驳回的收口时间
  withdrawn_at TEXT,
  withdrawn_by TEXT,
  withdraw_reason TEXT,
  urge_count INTEGER DEFAULT 0,              -- 累计催办次数
  last_urged_at TEXT,
  version INTEGER DEFAULT 1,                 -- 乐观锁（与项目 #10 全量乐观锁口径一致）
  created_at TEXT NOT NULL,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE (org_id, module, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_appr_inst_org_status ON approval_instances(org_id, status);
CREATE INDEX IF NOT EXISTS idx_appr_inst_approver ON approval_instances(org_id, current_approver_id, status);
CREATE INDEX IF NOT EXISTS idx_appr_inst_submitter ON approval_instances(org_id, submitter_id);
CREATE INDEX IF NOT EXISTS idx_appr_inst_entity ON approval_instances(org_id, module, entity_id);

-- ════════════ 2) 审批动作流水（只追加）════════════
CREATE TABLE IF NOT EXISTS approval_actions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  instance_id TEXT NOT NULL,                 -- 引 approval_instances.id
  action TEXT NOT NULL,                      -- submit | approve | reject | withdraw | urge | delegate | revoke_delegate
  node_order INTEGER,
  node_name TEXT,
  actor_id TEXT,                             -- 动作发起人
  actor_name TEXT,
  target_id TEXT,                            -- 催办/委托的目标人
  target_name TEXT,
  comment TEXT,                              -- 意见 / 撤回原因 / 委托事由
  created_at TEXT NOT NULL,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_appr_act_instance ON approval_actions(instance_id, created_at);
CREATE INDEX IF NOT EXISTS idx_appr_act_org ON approval_actions(org_id, created_at DESC);

-- ════════════ 3) 审批委托关系 ════════════
-- 语义：delegator 在 [start_date, end_date] 期间，把自己 module 范围内的审批权交给 delegate。
-- · module 为空 = 全部模块
-- · active = 0 表示手工撤销（撤销后保留历史，不物理删除）
-- · 生效判定在应用层用「日期闭区间 + active」算，不用 DDL 默认值兜
CREATE TABLE IF NOT EXISTS approval_delegates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  delegator_id TEXT NOT NULL,
  delegator_name TEXT,
  delegate_id TEXT NOT NULL,
  delegate_name TEXT,
  module TEXT,                               -- 空 = 全部模块
  start_date TEXT NOT NULL,                  -- YYYY-MM-DD
  end_date TEXT NOT NULL,                    -- YYYY-MM-DD（含当日）
  reason TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_appr_deleg_org_delegate ON approval_delegates(org_id, delegate_id, active);
CREATE INDEX IF NOT EXISTS idx_appr_deleg_org_delegator ON approval_delegates(org_id, delegator_id, active);

-- 登记迁移
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0075_approval_instances', datetime('now'))
ON CONFLICT(version) DO NOTHING;
