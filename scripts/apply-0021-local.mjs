import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const file = process.argv[2];
const sql = readFileSync('migrations/0021_vouchers_ext.sql', 'utf8');
const db = new DatabaseSync(file);
db.exec('PRAGMA foreign_keys = ON;');
for (const stmt of sql.split(';')) {
  const s = stmt.trim();
  if (!s) continue;
  try { db.exec(s); console.log('OK:', s.slice(0, 60)); }
  catch (e) { console.log('SKIP/ERR:', s.slice(0,60), '->', e.message); }
}
const cols = db.prepare("PRAGMA table_info(vouchers)").all().map(c => c.name);
console.log('vouchers columns now:', cols.join(', '));
