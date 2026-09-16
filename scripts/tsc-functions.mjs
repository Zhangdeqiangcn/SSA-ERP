#!/usr/bin/env node
// SSA ERP · 后端 Functions 类型检查（基线快照 + 只报新增）
// ============================================================
// 为什么需要这个脚本（V3.7.0 新增）：
//   tsconfig.json 的 include 只有 "src"，**functions/ 此前完全不在任何 tsc 覆盖内**。
//   后果不是「少查一点」，而是运行期 500 才被发现：
//     · rlsCondition() 返回 { clause, params }，直接拼进 SQL 会得到字面量 "object Object"
//       → D1 报 no such column: object Object
//     · getUserFromRequest(req, env) 应为 env.DB → DB.prepare is not a function
//     · writeAudit 的字段是 { orgId, actor:{id,name}, entity, entityId }，
//       写成 { userId, userName, resource, resourceId } 会被静默忽略 → 审计丢字段
//     · user.orgId 应为 user.org_id → org_id 写入 null
//   以上四个错误全部由本轮「打印模板域」实证踩到，靠本地跑 E2E 才暴露。
//
// 为什么不直接把全部错误清零：
//   functions/ 下有 ~40 条存量告警集中在「setClauses/values 未标注类型 → 推断为 never[]」
//   这一既有写法上（运行期正常，属误报）。一次性改 20+ 文件风险大于收益，
//   且会淹没真正的新增错误。故采用**基线快照**：存量登记在案，从此只报新增。
//
// 用法：
//   node scripts/tsc-functions.mjs              # 检查，仅新增错误会退出 1
//   node scripts/tsc-functions.mjs --update     # 把当前全部错误写入基线（仅在确认无新问题时用）
//   node scripts/tsc-functions.mjs --full       # 打印全部（含基线内），便于复盘

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const BASELINE = 'scripts/.tsc-functions-baseline.json';
const args = process.argv.slice(2);

function runTsc() {
  let out = '';
  try {
    out = execFileSync('npx', ['tsc', '-p', 'tsconfig.functions.json', '--noEmit'], {
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    out = String(e.stdout || '') + String(e.stderr || '');
  }
  // cloudflare:sockets 是 Workers 专有模块，本机缺 ambient 声明，非真实错误
  return out
    .split(/\r?\n/)
    .filter((l) => /error TS\d+/.test(l))
    .filter((l) => !/cloudflare:sockets/.test(l))
    .filter((l) => !/allowHalfOpen|SocketOptions/.test(l))
    .map((l) => l.trim());
}

const errors = runTsc();

if (args.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(errors, null, 2), 'utf8');
  console.log(`已把 ${errors.length} 条存量错误写入基线 ${BASELINE}`);
  process.exit(0);
}

const baselineRaw = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, 'utf8'))
  : [];

/**
 * ★ 基线匹配指纹：**去掉行号，只留「文件 + 列号 + 消息」**。
 *
 * 为什么不能用整串（含行号）匹配：行号会随「在文件里插入或删除任意一行」整体平移，
 * 于是**存量错误会被误判成新增**。
 * 实际踩到（V3.11.2）：只在 vouchers/[id].ts 头部加了 4 行注释，
 * 4 条已在基线里的错误行号 59/60/63/64 → 63/64/67/68，全部被报成「新增」，
 * 差点让人以为是自己改坏了，其实只是注释挪动了行号。
 * 列号在同一行内容没变时是稳定的，故用它做指纹更可靠。
 */
const fingerprint = (e) => String(e).replace(/^(.*?)\(\d+,(\d+)\)/, '$1(*,$2)');

const baseline = new Set(baselineRaw.map(fingerprint));
const baselineFull = new Set(baselineRaw);

const fresh = errors.filter((e) => !baseline.has(fingerprint(e)));

console.log('════════════════════════════════════════════════════');
console.log('  后端 Functions 类型检查（基线快照模式）');
console.log('════════════════════════════════════════════════════');
console.log(`  存量基线 : ${baselineRaw.length} 条（按「文件+列号」去重后 ${baseline.size}）`);
console.log(`  本次检出 : ${errors.length} 条`);
console.log(`  ★ 新增   : ${fresh.length} 条`);
if (args.includes('--full') && errors.length) {
  console.log('\n  ── 全部检出 ──');
  for (const e of errors) {
    const known = baseline.has(fingerprint(e));
    console.log('    ' + e + (known ? '   [存量]' : '   [新增]') + (known && !baselineFull.has(e) ? '（行号已变，按列号匹配）' : ''));
  }
}
if (fresh.length) {
  console.log('\n  ❌ 新增类型错误（必须修完再提交）：');
  for (const e of fresh) console.log('    ' + e);
  console.log('\n  若确认这些是既有写法导致、且运行期正常，请人工核对后用 --update 收进基线。');
  process.exit(1);
}
console.log('\n  ✅ 无新增类型错误');
process.exit(0);
