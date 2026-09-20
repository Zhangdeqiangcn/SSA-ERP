// 只读：按 11 个业务域统计前端路由数（功能覆盖率指标的「已有点数」客观依据之一）
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
const uniq = [...new Set(hits)].filter((u) => u.startsWith('/'));

// 11 域归类（按路由前缀/关键词手工映射，规则固定可复核）
const DOMAINS = {
  '基础数据': (u) => /^\/(material|vendor|customer|sales\/customers|warehouse\/master|unit|department)/.test(u) || u === '/material/list',
  '采购': (u) => /^\/(purchase|price)/.test(u),
  '销售': (u) => /^\/sales/.test(u) && !/^\/sales\/(customers|projects)/.test(u),
  '库存': (u) => /^\/warehouse/.test(u) && !/^\/warehouse\/master/.test(u),
  '生产': (u) => /^\/production/.test(u),
  '财务': (u) => /^\/finance/.test(u),
  '审批流': (u) => /approvals?|approval/.test(u),
  '权限合规': (u) => /^\/(settings|users|roles|permission|security|compliance|admin)/.test(u),
  '打印输出': (u) => /print|template/.test(u),
  '平台能力': (u) => /^\/(platform|lowcode|integration|open|api)/.test(u),
  '体验工程': (u) => /^\/(mobile|pwa|dashboard|portal|profile|notification)/.test(u) || u === '/',
};

const counted = new Set();
const out = [];
for (const [name, fn] of Object.entries(DOMAINS)) {
  const list = uniq.filter((u) => { if (counted.has(u)) return false; if (fn(u)) { counted.add(u); return true; } return false; });
  out.push([name, list.length, list.slice(0, 4)]);
}
console.log('路由总数（去重、以 / 开头）=', uniq.length);
let sum = 0;
for (const [n, c] of out) { sum += c; console.log(`${n.padEnd(6)} ${String(c).padStart(3)} 条`); }
console.log('已归类合计 =', sum, '｜未归类 =', uniq.length - sum);
