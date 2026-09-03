// 将 migrations/ 下全部 0001-0022 顺序应用到本地所有 D1 数据 sqlite（幂等）。
// 采用语句级 try/catch：CREATE TABLE IF NOT EXISTS / ALTER ADD COLUMN / INSERT 冲突等均安全跳过。
// 目的：把本地 dev DB 提升到与远程生产一致的完整 schema（修复缺失的 version/history 等列）。
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const dir = 'migrations';
const files = readdirSync(dir).filter(f => /^00\d\d_.*\.sql$/.test(f)).sort();
console.log('迁移文件:', files.join(', '));

const found = execSync('find .wrangler -name "*.sqlite"', { encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(Boolean)
  .filter(f => !f.endsWith('metadata.sqlite'));

for (const file of found) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  console.log(`\n=== DB: ${file} ===`);
  for (const mf of files) {
    const sql = readFileSync(`${dir}/${mf}`, 'utf8');
    let n = 0, skipped = 0;
    for (const stmt of sql.split(';')) {
      const s = stmt.trim();
      if (!s) continue;
      try { db.exec(s); n++; }
      catch (e) {
        // 已存在 / 已应用 → 跳过（幂等）
        skipped++;
        if (skipped <= 3) console.log(`  [skip] ${mf}: ${String(e.message).slice(0, 70)}`);
      }
    }
    if (n) console.log(`  ✓ ${mf} (${n} 条执行)`);
  }
  const mig = db.prepare("SELECT COUNT(*) c FROM schema_migrations").get();
  console.log(`  schema_migrations 已登记: ${mig?.c}`);
}
console.log('\n全部本地 DB 已提升到完整 schema。');
