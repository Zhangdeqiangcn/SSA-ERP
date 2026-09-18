// 一次性脚本：核对 V3.15.9 五处版本号同步（不纳入常驻门禁，用完可删）
import { readFileSync } from 'node:fs';

const V = '3.15.9';
const LV = 'V3.15.9';
const root = process.cwd();
const read = (p) => readFileSync(root + '/' + p, 'utf8');

const checks = [
  ['① src/version.ts · APP_VERSION', () => new RegExp(`APP_VERSION\\s*=\\s*'${V}'`).test(read('src/version.ts'))],
  ['① src/version.ts · APP_VERSION_LABEL', () => new RegExp(`APP_VERSION_LABEL\\s*=\\s*'${LV}'`).test(read('src/version.ts'))],
  ['② package.json · version', () => new RegExp(`"version"\\s*:\\s*"${V}"`).test(read('package.json'))],
  ['③ src/content/manual.tsx · V3.15.9 词条', () => read('src/content/manual.tsx').includes(`V3.15.9（2026-09-19）`)],
  ['④ docs/ssa-erp-master-plan.md · 顶部基线', () => read('docs/ssa-erp-master-plan.md').includes(`当前版本 ${LV}`)],
  ['④ docs/ssa-erp-master-plan.md · §八沿革', () => read('docs/ssa-erp-master-plan.md').includes(`V3.15.9 凭证服务端借贷平衡强制校验`)],
  ['⑤ .workbuddy/memory/MEMORY.md · 版本沿革', () => read('.workbuddy/memory/MEMORY.md').includes(`**${LV}**（2026-09-19）`)],
];

let fail = 0;
for (const [name, fn] of checks) {
  let ok = false;
  try { ok = fn(); } catch (e) { ok = false; }
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}`);
}

// 反向断言：确认旧版本号已从各处移除（防止"加了新的、旧的没删"）
const stale = [
  ['src/version.ts 无 3.15.8', !read('src/version.ts').includes('3.15.8')],
  ['package.json 无 3.15.8', !/"version"\s*:\s*"3\.15\.8"/.test(read('package.json'))],
  ['master-plan 顶部基线无 V3.15.8', !read('docs/ssa-erp-master-plan.md').includes('当前版本 V3.15.8')],
  // 注意：MEMORY.md 与 manual.tsx 是「沿革日志」，保留上一版条目是**正确且必需**的，
  //       不能做"无 3.15.8"的反向断言，否则会把历史记录误判为残留。
  ['master-plan §八保留 V3.15.8 沿革', read('docs/ssa-erp-master-plan.md').includes('V3.15.8 无管理员公司的审批自动上收超级管理员')],
  ['manual.tsx 保留 V3.15.8 沿革', read('src/content/manual.tsx').includes("V3.15.8（2026-09-18）")],
];
console.log('── 反向断言（旧版本是否已清）──');
for (const [name, ok] of stale) {
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}`);
}

console.log(fail === 0 ? '\n✅ 五处版本号全部同步，无残留' : `\n❌ 有 ${fail} 处不一致`);
process.exit(fail === 0 ? 0 : 1);
