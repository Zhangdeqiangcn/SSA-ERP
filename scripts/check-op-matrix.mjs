#!/usr/bin/env node
// ============================================================
// SSA ERP · 操作权限「默认矩阵」一致性门禁（前端 ↔ 后端兜底）
// ------------------------------------------------------------------
// 为什么需要它（硬规矩㉛「同口径两处实现必须对得上」）：
//
// 角色×模块×操作 的默认矩阵有**两份来源**：
//   ① 前端 src/stores/dataPermissionStore.ts 的 defaultRoleModuleOps
//      —— 管理员在「操作权限」页看到的初始状态，也是前端 <SecureField>/按钮显隐判定依据；
//   ② 后端 functions/_shared/operationGuard.ts 的 BUILTIN_ROLE_OPS
//      —— 当 app_state 里读不到管理员配置时的服务端兜底（权威守卫）。
//
// 这两份必须**逐条一致**。若只改一处：
//   · 前端有、后端无 → 界面给了按钮，点却 403 OPERATION_FORBIDDEN（体验坏、报错诡异）；
//   · 后端有、前端无 → 后端放行但界面找不到入口（能力"隐身"，用户以为系统没这功能）。
// 两者都不报错、只有机器比对能发现（坑㉛㉟）。
//
// 方向说明：后端是**权威**守卫（端点真正拦截），前端只做"少给按钮"的显示层。
// 前端多显示一条后端已有的权限 = 安全无害（后端仍拦）；前端少显示 = 入口隐身。
// 故本门禁目标是「前后端逐条一致」，任一侧出现对侧没有的条目都阻断。
//
// 用法：node scripts/check-op-matrix.mjs
// 退出码 0 = 一致；1 = 不一致（门禁阻断）。
// 解析方式：纯文本正则（不 import TS 文件），与 check-field-policy.mjs 同范式。
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const FE_FILE = 'src/stores/dataPermissionStore.ts';
const BE_FILE = 'functions/_shared/operationGuard.ts';

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

/** 截取「从 startMark 起、到 startMark 后第一次出现 endMark」的中间片段 */
function sliceBetween(src, startMark, endMark) {
  const i = src.indexOf(startMark);
  if (i < 0) return null;
  const j = src.indexOf(endMark, i + startMark.length);
  if (j < 0) return null;
  return src.slice(i + startMark.length, j);
}

/** 从 operations 对象体提取 4 个布尔值 */
function parseOps(body) {
  const out = {};
  for (const k of ['create', 'read', 'update', 'delete']) {
    const m = body.match(new RegExp(k + '\\s*:\\s*(true|false)'));
    out[k] = m ? m[1] === 'true' : false;
  }
  return out;
}

/** normalize 成 role|module|create|read|update|delete */
function keyOf(role, module, ops) {
  return `${role}|${module}|${ops.create}|${ops.read}|${ops.update}|${ops.delete}`;
}

/** 解析前端 defaultRoleModuleOps → Map(key -> 计数)（multiset，重复条目也正确） */
function parseFrontend(src) {
  const seg = sliceBetween(src, 'const defaultRoleModuleOps: RoleModuleOperation[] = [', '\n];');
  if (seg == null) return { ok: false, reason: '未找到 defaultRoleModuleOps 数组定义' };

  // 先解析数组之前的两个常量（SUPER_ADMIN_ROLE_OPS / PLAIN_USER_ROLE_OPS）。
  // 注意：匹配到内层 operations 的 `}` 即停（不追外层 `}`），因实际文本内层 } 后是 `,`+换行再到外层 }。
  const consts = {};
  for (const m of src.matchAll(
    /const (\w+): RoleModuleOperation = \{\s*role:\s*'([^']+)',\s*module:\s*'([^']+)',\s*operations:\s*\{([^}]*)\}/g,
  )) {
    consts[m[1]] = { role: m[2], module: m[3], ops: parseOps(m[4]) };
  }

  const counter = new Map();
  const add = (role, module, ops) => {
    const k = keyOf(role, module, ops);
    counter.set(k, (counter.get(k) || 0) + 1);
  };
  // 内联行
  const inline = [...seg.matchAll(/\{\s*role:\s*'([^']+)',\s*module:\s*'([^']+)',\s*operations:\s*\{([^}]*)\}\s*\}/g)];
  for (const m of inline) add(m[1], m[2], parseOps(m[3]));
  // 常量引用行（如 `SUPER_ADMIN_ROLE_OPS,`）——只认已解析出的常量名，避免误配
  const refs = [...seg.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*,/gm)].map((x) => x[1]).filter((n) => n in consts);
  for (const n of refs) add(consts[n].role, consts[n].module, consts[n].ops);

  if (counter.size === 0) return { ok: false, reason: 'defaultRoleModuleOps 里没解析到任何条目' };
  return { ok: true, counter };
}

/** 解析后端 BUILTIN_ROLE_OPS → Map(key -> 计数) */
function parseBackend(src) {
  const seg = sliceBetween(src, 'export const BUILTIN_ROLE_OPS: RoleModuleOperation[] = [', '\n];');
  if (seg == null) return { ok: false, reason: '未找到 BUILTIN_ROLE_OPS 数组定义' };

  const counter = new Map();
  const add = (role, module, ops) => {
    const k = keyOf(role, module, ops);
    counter.set(k, (counter.get(k) || 0) + 1);
  };
  const inline = [...seg.matchAll(/\{\s*role:\s*'([^']+)',\s*module:\s*'([^']+)',\s*operations:\s*\{([^}]*)\}\s*\}/g)];
  for (const m of inline) add(m[1], m[2], parseOps(m[3]));

  if (counter.size === 0) return { ok: false, reason: 'BUILTIN_ROLE_OPS 里没解析到任何条目' };
  return { ok: true, counter };
}

function totalCounter(counter) {
  let n = 0;
  for (const v of counter.values()) n += v;
  return n;
}

/** multiset 对称差：只在 A 的条目列表 / 只在 B 的条目列表 */
function diff(a, b) {
  const onlyA = [];
  const onlyB = [];
  const all = new Set([...a.keys(), ...b.keys()]);
  for (const k of all) {
    const ca = a.get(k) || 0;
    const cb = b.get(k) || 0;
    for (let i = 0; i < ca - cb; i++) onlyA.push(k);
    for (let i = 0; i < cb - ca; i++) onlyB.push(k);
  }
  return { onlyA: onlyA.sort(), onlyB: onlyB.sort() };
}

function main() {
  console.log('════════════════════════════════════════════════════');
  console.log('  操作权限默认矩阵一致性检查（前端 ↔ 后端兜底）');
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
  console.log(`      条目 ${fe.ok ? totalCounter(fe.counter) : '解析失败'}（去重 ${fe.ok ? fe.counter.size : '-'}）`);
  console.log(`  后端 ${BE_FILE}`);
  console.log(`      条目 ${be.ok ? totalCounter(be.counter) : '解析失败'}（去重 ${be.ok ? be.counter.size : '-'}）`);

  if (!fe.ok) { console.log(`\n  ❌ 前端解析失败：${fe.reason}`); process.exit(1); }
  if (!be.ok) { console.log(`\n  ❌ 后端解析失败：${be.reason}`); process.exit(1); }

  const { onlyA: onlyFe, onlyB: onlyBe } = diff(fe.counter, be.counter);

  console.log('');
  if (!onlyFe.length && !onlyBe.length) {
    console.log('  ✅ 一致：两份默认操作矩阵逐条相同');
    console.log(`     （共 ${fe.counter.size} 组 role|module|操作 组合）`);
    process.exit(0);
  }

  if (onlyFe.length) {
    console.log(`  ❌ 只在前端存在（${onlyFe.length} 条）—— 界面给了按钮、后端会 403：`);
    for (const x of onlyFe) console.log(`       ${x}`);
  }
  if (onlyBe.length) {
    console.log(`  ❌ 只在后端存在（${onlyBe.length} 条）—— 后端放行但界面找不到入口：`);
    for (const x of onlyBe) console.log(`       ${x}`);
  }
  console.log('');
  console.log('  修正方法：把两边改成逐条一致（前端 defaultRoleModuleOps ↔ 后端 BUILTIN_ROLE_OPS）');
  process.exit(1);
}

main();
