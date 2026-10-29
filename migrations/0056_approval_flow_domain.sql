-- 迁移 0056：审批流域关系化（V3.10.0 · C1）
--
-- ── 本迁移做什么 ────────────────────────────────────────────────
-- 把 app_state 里 `ssa-erp-approval-flows` 这个 JSON 大对象中的审批流
-- 配置迁到 D1 关系表（父表 approval_flows + 子表 approval_flow_nodes）。
--
-- ── 为什么本域与前面四个域性质不同（先想清楚再动手）─────────────
-- BOM / 财务 / 销售三个域的数据都是**业务流水**（订单、分录、出货），
-- 而审批流是**用户可调的配置**。这带来两个直接后果：
--   1. 数据量极小（实测 6799 字节 / 13 条流程 / 26 个节点），
--      迁走它对「打开速度」几乎没有影响——**但这不是迁它的理由**。
--   2. 真正的问题是「配置存在哪里」：现在配置与业务单据混在同一个
--      app_state 表里，导致「换台电脑审批流配置就变了」与
--      「哪份配置为准说不清」。
--
-- ── ★ 迁表前必须做的一件事：逐字段比对生产库数据 vs 代码默认值 ──
-- 本轮实测结论（脚本 scripts/_cmp_approval.mjs 比对，非目测）：
--   · 生产库 13 条流程，全部 `status='system'`
--   · **`status='system'` 不是用户改的**——它是 persist 的 `migrate`
--     （version 1→2）给所有旧流程补上的标志位，代码默认值里没这个字段。
--     若不查证，会误判成「用户配置过」，从而做出错误的迁移假设。
--   · **唯一的真实用户改动是 `inbound.enabled: false → true`**
--     （用户在设置页把「采购入库」流程启用了）
--   · **★ 生产库只有 13 条，代码默认有 20 条** —— 少的那 7 条
--     （customer / inquiry / comparison / check_task / inbound_order /
--      outbound_order / quality_inspeCTION）是后来才加进代码的默认值。
--     因为 persist 里已有数据，`seedFlows()` 不会重新播种，
--     **这 7 个流程在生产库从来就不存在**。
--     → 这是既有的持久化缺陷（代码加默认值，老用户永远看不到），
--       本迁移「D1 空则播种」的逻辑正好把它一并修正。
--
-- 因此迁移策略是：**必须把库里这 13 条真实数据迁过去，不能用代码默认值
-- 覆盖**（否则用户那处 `inbound` 改动会丢）。回填由 store 的 pullSlice
-- 从旧 Blob 读取完成，本迁移只负责建表。
--
-- ── 字段契约来源（硬纪律）───────────────────────────────────────
-- 全部列名由 `src/stores/approvalFlowStore.ts` 的
-- ApprovalFlowConfig / ApprovalNode / ConditionGroup / SkipRule /
-- EscalationRule 接口逐一反推为 snake_case。
-- **表结构必须服从前端契约，不是反过来** —— 0053 按「会计常识」推断
-- 列名的教训见 migrations/0054_finance_domain_fix.sql 文件头。
--
-- ── ★ 本域最特殊之处：子表行内也有嵌套（新能力）─────────────────
-- 前面四个域里，嵌套只出现在「父表带子数组」这一层。审批流不同：
-- **每个节点（子表行）自己还带嵌套对象与字符串数组**：
--   · node.conditions     : ConditionGroup（单对象，含 conditions[] 两层）
--   · node.skipRule       : SkipRule（单对象，含 when: ConditionGroup）
--   · node.escalation     : EscalationRule（单对象，含 notify: string[]）
--   · node.approverRoles  : UserRole[]（字符串数组）
--   · node.approverUserIds: string[]（字符串数组）
--   · node.fields         : string[]（该步骤可编辑的业务字段，字符串数组）
--   · flow.visibleRoles   : string[]（父表上的字符串数组）
-- 处理方式：**全部走 JSON 文本列**（父表的存父表，子表的存子表）。
-- 理由与 sales 域的 interestProducts 一致：它们没有独立 id、没有可查询
-- 属性、不参与 SQL 统计与排序。为 `fields: ['name','unit',...]` 建一张
-- 「每行一个字段名」的子表，只会得到一张永远只能整体读出的空壳表。
--
-- 出现频次实测（决定建几列）：conditions 8 次 / escalation 1 次 /
-- skipRule 0 次（类型支持但当前数据未用，**仍需建列**——否则用户一旦
-- 在界面上配置跳过规则，写入会被静默丢弃且返回成功）。
--
-- ── 前置核对（已执行）──────────────────────────────────────────
-- 本迁移执行前已用探针核对：`approval_flows` / `approval_flow_nodes`
-- **在生产库均不存在**（查询 sqlite_master 返回空），因此这里是纯新建，
-- 不涉及任何数据搬迁或破坏。

PRAGMA foreign_keys = ON;

-- ==================== 审批流定义：对齐 ApprovalFlowConfig ====================
CREATE TABLE IF NOT EXISTS approval_flows (
  id TEXT PRIMARY KEY,                  -- 流程标识（模块名，如 sales_order / 自定义 custom-xxx）
  org_id TEXT NOT NULL,
  module TEXT,                          -- module（业务模块标识）
  module_label TEXT,                    -- moduleLabel（模块中文名）
  enabled INTEGER DEFAULT 0,            -- enabled（布尔）
  profile TEXT,                         -- profile: standard|simplified，默认 standard
  status TEXT,                          -- status: system|draft|pending|published，默认 system
  created_by TEXT,                      -- createdBy
  approved_by TEXT,                     -- approvedBy
  created_at TEXT,                      -- createdAt（ISO）
  approved_at TEXT,                     -- approvedAt（ISO）
  visible_roles TEXT,                   -- visibleRoles: string[] → JSON 文本（空=全部可见）
  description TEXT,                     -- description（流程描述）
  updated_at TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_approval_flows_module ON approval_flows(org_id, module);
CREATE INDEX IF NOT EXISTS idx_approval_flows_status ON approval_flows(org_id, status);

-- 审批节点（子表）：一行一个审批步骤
-- ★ 本表是「子表行内带嵌套」的首个案例——JSON 文本列在子表上，
--   而非父表上。parentChild.ts 的 ChildSpec 已相应扩展 jsonCols 能力。
--
-- ★ 关于 seq 列（刻意保留但代码不用）：
--   建表时留了 seq，但 `_shared/approvalFlowConfig.ts` 的 childCols
--   最终**没有登记它** —— 前端 ApprovalNode 契约里没有 seq 字段，
--   登记了也只会永远取到 undefined、永远写 0，成为死列。
--   节点的顺序号唯一来源是 node_order（前端字段名叫 order）。
--   这里保留列是为了与已下发的建表结构一致（避免改表），
--   新代码一律忽略它；排序子句只用 node_order ASC。
CREATE TABLE IF NOT EXISTS approval_flow_nodes (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,                -- 从属流程，不重复存 org_id
  seq INTEGER DEFAULT 0,                -- 保留列（历史建表遗留），代码不用；顺序看 node_order
  name TEXT,                            -- name（节点名称）
  role TEXT,                            -- role（主审批角色 id，向后兼容单审批人场景）
  role_name TEXT,                       -- roleName（主审批角色名称）
  condition TEXT,                       -- condition（旧版自由文本条件，向后兼容）
  timeout INTEGER DEFAULT 0,            -- timeout（超时小时）
  node_order INTEGER DEFAULT 0,         -- order（节点顺序号，前端字段名就是 order）
  approver_type TEXT,                   -- approverType: role|position|supervisor|dept_head|specific_user
  approver_roles TEXT,                  -- approverRoles: UserRole[] → JSON 文本
  approver_user_ids TEXT,               -- approverUserIds: string[] → JSON 文本
  mode TEXT,                            -- mode: serial|parallel|or，默认 serial
  conditions TEXT,                      -- conditions: ConditionGroup（单对象）→ JSON 文本
  skip_rule TEXT,                       -- skipRule: SkipRule（单对象）→ JSON 文本
  escalation TEXT,                      -- escalation: EscalationRule（单对象）→ JSON 文本
  optional INTEGER DEFAULT 0,           -- optional（布尔）
  fields TEXT,                          -- fields: string[]（该步骤可编辑字段）→ JSON 文本
  FOREIGN KEY (flow_id) REFERENCES approval_flows(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_approval_flow_nodes_flow ON approval_flow_nodes(flow_id, node_order);

-- 幂等守卫
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0056_approval_flow_domain', datetime('now'))
ON CONFLICT(version) DO NOTHING;
