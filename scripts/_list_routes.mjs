// 只读：列出前端路由清单（用于核对页面可用率巡检的页面路径是否真实存在）
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const hits = [];
function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const st = statSync(p);
    if (st.isDirectory()) { if (f === 'node_modules') continue; walk(p); }
    else if (/\.(tsx|ts)$/.test(f)) {
      const s = readFileSync(p, 'utf8');
      const re = /path:\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(s))) hits.push(m[1]);
    }
  }
}
walk('src');
const uniq = [...new Set(hits)].sort();
console.log('路由总数 =', uniq.length);
for (const k of ['finance', 'approv', 'print', 'dash', 'home', 'workbench', 'voucher', 'ledger']) {
  const list = uniq.filter((u) => u.toLowerCase().includes(k));
  if (list.length) console.log('\n--- 含 ' + k + ' ---\n' + list.slice(0, 30).join('\n'));
}
