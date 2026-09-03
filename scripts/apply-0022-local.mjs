// 将 0022_vouchers_created_by.sql 应用到本地所有 D1 数据 sqlite
// 与 apply-0021-local.mjs 同法；带存在性守卫，可重复执行（幂等）。
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const sql = readFileSync('migrations/0022_vouchers_created_by.sql', 'utf8');
// 找出所有 D1 业务 sqlite（排除 metadata.sqlite）
const found = execSync('find .wrangler -name "*.sqlite"', { encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean)
  .filter(f => !f.endsWith('metadata.sqlite'));

for (const file of found) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  // 该 DB 是否含 vouchers 表？不含则跳过（可能是其它 binding 的空库）
  const hasTable = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='vouchers'`).get();
  if (!hasTable) { console.log(`SKIP (无 vouchers 表): ${file}`); continue; }
  const cols = db.prepare('PRAGMA table_info(vouchers)').all().map(c => c.name);
  if (cols.includes('created_by')) {
    console.log(`SKIP (已有 created_by): ${file}`);
  } else {
    db.exec('ALTER TABLE vouchers ADD COLUMN created_by TEXT;');
    console.log(`OK 加列 created_by: ${file}`);
  }
  // schema_migrations 登记（version 已是 PK，冲突忽略）
  try {
    db.prepare(`INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime('now')) ON CONFLICT(version) DO NOTHING`).run('0022_vouchers_created_by');
  } catch (e) { console.log(`schema_migrations 登记跳过: ${e.message}`); }
  const after = db.prepare('PRAGMA table_info(vouchers)').all().map(c => c.name);
  console.log(`  vouchers 列(${after.length}): ${after.join(', ')}`);
}
console.log('\n完成。');
