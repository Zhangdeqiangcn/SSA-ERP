// 字段级权限「默认矩阵」一致性门禁
// ------------------------------------------------------------------
// 为什么需要它（硬规矩㉛「同口径两处实现必须对得上」）：
//
// 字段级权限的策略有**两个来源**：
//   ① 前端 src/stores/dataPermissionStore.ts 的 defaultSensitiveFields
//      —— 管理员在「字段级权限」页面看到的初始勾选状态，也是前端 <SecureField> 的判定依据；
//   ② 后端 functions/_shared/fieldAccess.ts 的 DEFAULT_ROLE_POLICY
//      —— 当 app_state 里读不到管理员配置时的服务端兜底。
//
// 这两份必须**逐条一致**。若只改一处：
//   · 只改前端 → 服务端兜底更严：界面显示「看得到」，接口却把字段抹掉 → 用户看到空白（诡异 bug）；
//   · 只改后端 → 服务端兜底更松：界面显示 ***，接口却把明文发出去 → **安全漏洞**。
// 后者尤其危险，且不会有任何报错，只能靠机器比对发现。
//
// 用法：node scripts/check-field-policy.mjs
// 退出码 0 = 一致；1 = 不一致（可用于门禁阻断）。
import fs from 'node:fs';
import path from 'node:path';

const FE_FILE = 'src/stores/dataPermissionStore.ts';
const BE_FILE = 'functions/_shared/fieldAccess.ts';

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

/** 截取「从某标记开始、到配对结束符」的片段（找不到返回 null） */
function sliceBetween(src, startMark, endMark) {
  const i = src.indexOf(startMark);
  if (i < 0) return null;
  const j = src.indexOf(endMark, i + startMark.length);
  if (j < 0) return null;
  return src.slice(i + startMark.length, j);
}

/** 解析前端 defaultSensitiveFields → Set('role|module|field') */
function parseFrontend(src) {
  const seg = sliceBetween(
    src,
    'const defaultSensitiveFields: SensitiveFieldConfig[] = [',
    '\n];'
  );
  if (seg == null) return { ok: false, reason: '未找到 defaultSensitiveFields 数组定义' };

  const out = new Set();
  const rows = [...seg.matchAll(/\{\s*role:\s*'([^']+)',\s*module:\s*'([^']+)',\s*fields:\s*\[([^\]]*)\]\s*\}/g)];
  if (!rows.length) return { ok: false, reason: 'defaultSensitiveFields 里没解析到任何规则行' };
  for (const m of rows) {
    const [, role, module, fieldsRaw] = m;
    const fields = [...fieldsRaw.matchAll(/'([^']+)'/g)].map((x) => x[1]);
    for (const f of fields) out.add(`${role}|${module}|${f}`);
  }
  return { ok: true, set: out, rowCount: rows.length };
}

/** 解析后端 DEFAULT_ROLE_POLICY 里的 add() 调用 → Set('role|module|field') */
function parseBackend(src) {
  const seg = sliceBetween(
    src,
    'export const DEFAULT_ROLE_POLICY: FieldRule[] = (() => {',
    '\n})();'
  );
  if (seg == null) return { ok: false, reason: '未找到 DEFAULT_ROLE_POLICY 定义' };

  const out = new Set();
  const rows = [...seg.matchAll(/add\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\[([^\]]*)\]\s*\)/g)];
  if (!rows.length) return { ok: false, reason: 'DEFAULT_ROLE_POLICY 里没解析到任何 add() 调用' };
  for (const m of rows) {
    const [, module, field, rolesRaw] = m;
    const roles = [...rolesRaw.matchAll(/'([^']+)'/g)].map((x) => x[1]);
    for (const r of roles) out.add(`${r}|${module}|${field}`);
  }
  return { ok: true, set: out, rowCount: rows.length };
}

function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('  字段级权限默认矩阵一致性检查（前端 ↔ 后端兜底）');
  console.log('════════════════════════════════════════════════════');

  let fe, be;
  try {
    fe = parseFrontend(read(FE_FILE));
  } catch (e) {
    console.log(`  ❌ 读取 ${FE_FILE} 失败：${e.message}`);
    process.exit(1);
  }
  try {
    be = parseBackend(read(BE_FILE));
  } catch (e) {
    console.log(`  ❌ 读取 ${BE_FILE} 失败：${e.message}`);
    process.exit(1);
  }

  console.log(`  前端 ${FE_FILE}`);
  console.log(`      规则行 ${fe.ok ? fe.rowCount : '解析失败'}；展开后三元组 ${fe.ok ? fe.set.size : '-'} 条`);
  console.log(`  后端 ${BE_FILE}`);
  console.log(`      规则行 ${be.ok ? be.rowCount : '解析失败'}；展开后三元组 ${be.ok ? be.set.size : '-'} 条`);

  if (!fe.ok) { console.log(`\n  ❌ 前端解析失败：${fe.reason}`); process.exit(1); }
  if (!be.ok) { console.log(`\n  ❌ 后端解析失败：${be.reason}`); process.exit(1); }

  // 只在前端出现 = 服务端兜底更松（安全漏洞方向）
  const onlyFe = [...fe.set].filter((x) => !be.set.has(x)).sort();
  // 只在后端出现 = 服务端兜底更严（界面显示看得到、数据却被抹掉）
  const onlyBe = [...be.set].filter((x) => !fe.set.has(x)).sort();

  console.log('');
  if (!onlyFe.length && !onlyBe.length) {
    console.log('  ✅ 一致：两份默认矩阵逐条相同');
    console.log(`     （共 ${fe.set.size} 条 role|module|field 三元组）`);
    process.exit(0);
  }

  if (onlyFe.length) {
    console.log(`  ❌ 只在前端存在（${onlyFe.length} 条）—— 服务端兜底更松，属安全方向：`);
    for (const x of onlyFe) console.log(`       ${x}`);
  }
  if (onlyBe.length) {
    console.log(`  ❌ 只在后端存在（${onlyBe.length} 条）—— 服务端兜底更严，界面与数据会不一致：`);
    for (const x of onlyBe) console.log(`       ${x}`);
  }
  console.log('');
  console.log('  修正方法：把两边改成逐条一致（前端 defaultSensitiveFields ↔ 后端 DEFAULT_ROLE_POLICY）');
  process.exit(1);
}

main();
