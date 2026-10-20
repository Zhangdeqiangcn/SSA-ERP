// 一次性脚本：向本地全新 D1 注入 E2E 测试超管（复刻生产 org_e2e_sandbox / user_e2e_supervisor）
// 背景：super_admin 角色不可经接口授予，只能由数据库运维直接设置；
//       生产上该账号由部署阶段创建，本地全新库需手动复刻，门禁 harness 才能完成引导。
// 凭据来源：scripts/prod-e2e/.e2e-credentials.json（已 gitignore，勿外传）
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'C:/Users/zhangdeqiang/WorkBuddy/2026-05-08-task-1/ssa-erp';
const cred = JSON.parse(readFileSync(`${ROOT}/scripts/prod-e2e/.e2e-credentials.json`, 'utf8'));

// 与 functions/_shared/auth.ts 的 makeSalt / hashPasswordPbkdf2 完全同构
const salt = randomBytes(16).toString('hex');
const hashHex = pbkdf2Sync(cred.password, Buffer.from(salt, 'utf8'), 100000, 32, 'sha256').toString('hex');
const passwordHash = `pbkdf2$100000$${salt}$${hashHex}`;
const now = new Date().toISOString();

const sql = `
INSERT OR IGNORE INTO orgs (id, name, company_code, created_at, status, created_by, org_type)
VALUES ('org_e2e_sandbox', 'E2E 沙箱组织', 'E2E-SANDBOX', '${now}', 'active', 'system', 'company');
INSERT OR IGNORE INTO users (id, org_id, username, password_hash, salt, name, role, department, status, is_owner, created_at)
VALUES ('user_e2e_supervisor', 'org_e2e_sandbox', '${cred.username}', '${passwordHash}', '${salt}', 'E2E 测试超管', 'super_admin', NULL, 'active', 1, '${now}');
`;

execSync(`npx wrangler d1 execute ssa-erp-db --local --command "${sql.replace(/\n/g, ' ')}"`, {
  cwd: ROOT,
  stdio: 'inherit',
});
console.log('✅ 测试超管已注入本地库');
