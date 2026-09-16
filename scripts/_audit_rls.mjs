// ★ RLS 登记表 与 数据库真实表 双向机器核对
//
// 为什么必须机器核对（不是看一眼就行）：
//   rls.ts 的语义是「**未登记 = 默认拒绝**」——漏登记一张表，
//   表现不是「报错」，而是**接口正常返回 200 + 空数组**。
//   页面显示「暂无数据」，用户以为没数据，其实是权限把数据全挡了。
//   这类故障不会出现在错误日志里，也不会让任何测试变红，
//   只能靠「表清单 vs 登记表」两套数据机械比对才能发现。
//
// 双向都查：
//   ① 漏登记（库里有表、rls.ts 里没有）→ 静默空表（致命）
//   ② 僵尸登记（rls.ts 里有、库里没表）→ 多半是表已改名/删除，指向不存在的东西
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const localWrangler = resolve(ROOT, 'node_modules/wrangler/bin/wrangler.js');
const FALLBACK =
  'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
const WRANGLER = existsSync(localWrangler) ? localWrangler : FALLBACK;


// ── 读生产库真实表清单 ────────────────────────────────────────────
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
}
const SQL = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%' ORDER BY name";
const r = spawnSync(
  process.execPath,
  [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', SQL],
  { encoding: 'utf8', cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }
);
const out = (r.stdout || '') + (r.stderr || '');
const s = out.search(/[[{]/);
const dbTables = JSON.parse(out.slice(s))[0].results.map((r) => r.name);

// ── 读 rls.ts 登记表 ─────────────────────────────────────────────
const rlsSrc = fs.readFileSync('functions/_shared/rls.ts', 'utf8');
// 抓 RLS_SCOPE 对象体
// ★ 必须锚在 'export const'：rls.ts 的注释里也出现 RLS_SCOPE 字样，
//   只按名字找会定位到注释行，后面的 { 配对全错，解析出 0 条 → 假报「全部漏登记」。
const start = rlsSrc.indexOf('export const RLS_SCOPE');
const objStart = rlsSrc.indexOf('{', start);
let depth = 0, objEnd = -1;
for (let i = objStart; i < rlsSrc.length; i++) {
  if (rlsSrc[i] === '{') depth++;
  else if (rlsSrc[i] === '}') { depth--; if (depth === 0) { objEnd = i; break; } }
}
const objBody = rlsSrc.slice(objStart + 1, objEnd);
const registered = {};
const exempt = {};
{
  const es = rlsSrc.indexOf('export const RLS_EXEMPT');
  const eo = rlsSrc.indexOf('{', es);
  let d = 0, ee = -1;
  for (let i = eo; i < rlsSrc.length; i++) {
    if (rlsSrc[i] === '{') d++;
    else if (rlsSrc[i] === '}') { d--; if (d === 0) { ee = i; break; } }
  }
  for (const m of rlsSrc.slice(eo + 1, ee).matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*'([^']*)'/g)) exempt[m[1]] = m[2];
}
// ★ 作用域枚举必须写全：第一版只写了 (own|all|none)，漏了 'dept'，
//   结果把 5 张 dept 表误报成「漏登记」。审计脚本自身也可能是假的——
//   所以任何「机器查出来的问题」都要拿真实请求复核一次再下结论。
for (const m of objBody.matchAll(/['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*:\s*'(own|all|dept|none)'/g)) {
  registered[m[1]] = m[2];
}

// 豁免名单（视图/元数据/内部表不需要登记）
const EXEMPT = new Set(['migrations', 'd1_migrations', 'job_ticks', 'audit_degraded_log', 'schema_versions']);

const missing = dbTables.filter((t) => !(t in registered) && !(t in exempt));
const zombie = [...Object.keys(registered), ...Object.keys(exempt)].filter((t) => !dbTables.includes(t));

console.log(`生产库业务表 ${dbTables.length} 张；RLS 登记表 ${Object.keys(registered).length} 条`);
console.log(`\n① 漏登记（→ 静默空表，致命）：${missing.length} 张`);
for (const t of missing) console.log(`   ❌ ${t}`);
if (!missing.length) console.log('   ✅ 无');

console.log(`\n② 僵尸登记（表里没有这张表）：${zombie.length} 条`);
for (const t of zombie) console.log(`   ⚠️  ${t} → '${registered[t]}'`);
if (!zombie.length) console.log('   ✅ 无');

console.log(`\n③ 作用域分布：`);
const byScope = { all: 0, own: 0, dept: 0, none: 0 };
for (const [t, v] of Object.entries(registered)) byScope[v] = (byScope[v] || 0) + 1;
console.log('   ' + Object.entries(byScope).map(([k, v]) => `${k}=${v}`).join('  '));
