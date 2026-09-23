// 门禁：LIKE 转义一致性核对（V3.21.0）
// ------------------------------------------------------------------
// 为什么需要机器核对：
//   `likePattern()` 会转义 `%` `_` `\`，但 SQLite 只有在 SQL 里声明
//   `ESCAPE '\'` 时才认这个转义符。二者**必须成对出现**，且出错方向很隐蔽：
//
//     · 只转义不声明 ESCAPE  →  模式里的 `\%` 会被理解成「字面反斜杠 + 通配符」，
//                              搜索去找数据里根本不存在的反斜杠 → 搜什么都搜不到。
//                              比不改还糟，而且不会报错。
//     · 只声明不转义         →  通配符照旧生效（＝本缺陷未修）。
//
//   这种「两处必须对齐」的约定，靠人记住一定会漏（项目里反复吃过这个亏，坑㉛）。
//   故做成门禁：扫全项目，凡 SQL 里出现 `LIKE ?`（占位符 = 用户输入驱动）
//   而未跟 `ESCAPE`，一律 FAIL。
//
// 判据为什么选「LIKE ?」而不是「所有 LIKE」：
//   内置固定模式（如 `name NOT LIKE 'sqlite_%'`、`key LIKE 'mail.%'`）里的
//   `%` 是**故意的通配符**，与用户输入无关，不应加 ESCAPE —— 加了反而改变行为。
//   只有走占位符绑定的那一类才是用户输入。
//
// 用法：
//   node scripts/check-search-escape.mjs            正常检查
//   node scripts/check-search-escape.mjs --self-test 连带跑反例自证（证明检查没被改松）
import fs from 'node:fs';
import path from 'node:path';

/** 白名单：这些文件里的 LIKE 与用户输入无关（或只是注释里的示意） */
const WHITELIST = new Set([
  'functions/_shared/searchKeyword.ts', // 本模块自己的注释里举例提到 LIKE
  'functions/_shared/backupSchema.ts',  // 内置模式 'sqlite_%' / '_cf_%' / 'd1_%'
  'functions/_shared/mailer.ts',        // 内置模式 'mail.%'
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

/**
 * 检查一行源码是否违规。
 * 返回 null 表示合规，否则返回违规说明。
 */
export function inspectLine(line, file) {
  if (!/\bLIKE\s+\?/i.test(line)) return null;      // 不是占位符驱动的 LIKE
  if (WHITELIST.has(file.replace(/\\/g, '/'))) return null;
  if (/\bESCAPE\b/i.test(line)) return null;        // 已声明转义符
  return '缺少 ESCAPE 子句';
}

function runCheck() {
  const files = walk('functions').map((f) => f.replace(/\\/g, '/'));
  const violations = [];
  let scanned = 0;

  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      // 跳过纯注释行（说明性文字不算 SQL）
      const trimmed = l.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      scanned++;
      const bad = inspectLine(l, f);
      if (bad) violations.push({ file: f, line: i + 1, text: trimmed.slice(0, 130), bad });
    });
  }

  return { violations, scanned, fileCount: files.length };
}

// ── 反例自证：确认检查逻辑本身没被改松 ────────────────────────────────
function selfTest() {
  const cases = [
    // [行内容, 期望是否违规, 说明]
    [`sql += ' AND (code LIKE ?)';`, true, '占位符 LIKE 无 ESCAPE → 应报违规'],
    [`sql += ' AND (code LIKE ? ESCAPE \\'\\\\\\')';`, false, '已带 ESCAPE → 应通过'],
    [`const sql = "AND name NOT LIKE 'sqlite_%'";`, false, '内置模式（无占位符）→ 不要求'],
    [`sql += ' AND (code = ?)';`, false, '非 LIKE → 不要求'],
  ];
  let ok = true;
  for (const [line, expectViolation, desc] of cases) {
    const got = !!inspectLine(line, 'functions/api/demo/index.ts');
    const pass = got === expectViolation;
    if (!pass) ok = false;
    console.log(`  ${pass ? '✅' : '❌'} ${desc}  期望违规=${expectViolation} 实际=${got}`);
  }
  return ok;
}

const selfTestMode = process.argv.includes('--self-test');

if (selfTestMode) {
  console.log('── 反例自证（证明检查没被改松）──');
  const ok = selfTest();
  console.log(ok ? '\n  ✅ 反例自证通过\n' : '\n  ❌ 反例自证失败：检查逻辑本身有问题\n');
  if (!ok) process.exit(1);
}

console.log('════════════════════════════════════════════════════');
console.log('  门禁：LIKE 转义一致性（凡 LIKE ? 必带 ESCAPE \'\\\'）');
console.log('════════════════════════════════════════════════════');

const { violations, scanned, fileCount } = runCheck();

console.log(`  扫描范围 : ${fileCount} 个后端文件 / ${scanned} 行含 SQL`);
console.log(`  违规     : ${violations.length} 处`);

if (violations.length === 0) {
  console.log('\n  ✅ 全部占位符 LIKE 均已声明 ESCAPE');
  process.exit(0);
}

console.log('\n  违规明细：');
for (const v of violations) {
  console.log(`   ❌ ${v.file}:${v.line}  ${v.bad}`);
  console.log(`      ${v.text}`);
}
console.log('\n  ❌ 存在未声明 ESCAPE 的占位符 LIKE：');
console.log('     转义符不会被识别 → 搜索会去找字面反斜杠 → 搜什么都搜不到（且不报错）。');
console.log('     修法：在该 LIKE 后补 ` ESCAPE \'\\\'`（注意 JS 字符串/模板串的转义写法）。');
process.exit(1);
