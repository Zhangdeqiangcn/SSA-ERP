// 版本铁律断言：五处版本号必须完全一致
// 用法：node scripts/_verify_version_31510.mjs
import { readFileSync, existsSync } from 'node:fs';

const WANT = '3.15.10';
const WANT_LABEL = 'V3.15.10';
let pass = 0, fail = 0;
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`  ✅ ${n}${e ? ' — ' + e : ''}`); } else { fail++; console.log(`  ❌ ${n}${e ? ' — ' + e : ''}`); } };

const v = readFileSync('src/version.ts', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const manual = readFileSync('src/content/manual.tsx', 'utf8');
const plan = readFileSync('docs/ssa-erp-master-plan.md', 'utf8');
const memPath = '.workbuddy/memory/MEMORY.md';
const mem = existsSync(memPath) ? readFileSync(memPath, 'utf8') : '';

console.log(`\n══ 版本号一致性断言（期望 ${WANT_LABEL}）══\n`);

ok('① src/version.ts · APP_VERSION', new RegExp(`APP_VERSION = '${WANT}'`).test(v));
ok('① src/version.ts · APP_VERSION_LABEL', new RegExp(`APP_VERSION_LABEL = '${WANT_LABEL}'`).test(v));
ok('② package.json · version', pkg.version === WANT, `实际 ${pkg.version}`);
ok('③ src/content/manual.tsx · 词条存在', manual.includes(`V3.15.10（2026-09-20）`));
ok('③ src/content/manual.tsx · 条目 id 唯一', (manual.match(/id: 'v315100'/g) || []).length === 1);
ok('④ docs/ssa-erp-master-plan.md · 顶部基线', plan.includes(`**当前版本 ${WANT_LABEL}**（2026-09-20`));
ok('④ docs/ssa-erp-master-plan.md · 沿革条目', plan.includes(`**${WANT_LABEL} 空载荷守卫 + 导出留痕`));
ok('⑤ .workbuddy/memory/MEMORY.md · 沿革条目', mem.includes(`**${WANT_LABEL}**（2026-09-20）`));

// 反向断言：不应残留旧版本号作为「当前版本」
ok('无残留旧版本号（version.ts 不含 3.15.9）', !v.includes('3.15.9'));
ok('无残留旧版本号（package.json 不为 3.15.9）', pkg.version !== '3.15.9');

console.log(`\n══ 结果：${pass} 通过 / ${fail} 失败 ══\n`);
process.exit(fail === 0 ? 0 : 1);
