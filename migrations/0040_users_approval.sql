-- V2.95.0 账号审批与超级管理员：users 增加审批状态 / 组织所有者 / 联系方式列
-- 背景：原注册接口直接信任请求体传入的 role（可自封 admin），且新账号无审批即开通。
--   本次引入 status(pending/active/rejected) + is_owner，公司码已存在的再次注册需管理员审批。
-- 说明：D1(SQLite) 不支持 ALTER TABLE ... ADD COLUMN IF NOT EXISTS；本迁移由
--   `wrangler d1 migrations apply` 记录进 schema_migrations，成功后自动跳过，
--   保证重复 apply 不报错（与 0017_vendor_master_ext 同一约定）。

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;

-- 历史数据归一化：role 不在有效角色集合内的一律降为普通用户 'user'。
-- 存量库中存在大量 user/manager 等无效值（前端角色表中并不存在），会导致这些账号权限为空。
-- 有效角色集合（与后端 users 接口的 VALID_ROLES 保持一致）：
UPDATE users
SET role = 'user'
WHERE role IS NULL
   OR trim(role) = ''
   OR role NOT IN (
        'super_admin','admin','rd_engineer','process_engineer','qa_engineer',
        'qa_inspector','warehouse_keeper','logistics','finance_manager','accountant',
        'buyer','prod_manager','prod_leader','vendor','user'
      );

-- 历史存量账号（迁移前已存在）视为已通过审批：status 默认值即为 'active'，保持可用，
-- 避免升级后老账号被 403 拦在门外。仅升级后新注册的账号才会是 'pending'。

-- 用户管理列表 / 待审批计数的常用过滤（org_id + status）
CREATE INDEX IF NOT EXISTS idx_users_org_status ON users(org_id, status);

-- 幂等守卫（version 为 TEXT 主键）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0040_users_approval', datetime('now'))
ON CONFLICT(version) DO NOTHING;
