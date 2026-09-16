/**
 * 清单型登记表 ↔ 生产库真实表 双向核对
 *
 * 背景（V3.11.2）：V3.11.1 修掉 fieldSchema「按行切分 DDL + 没剥 -- 注释」导致
 * 15 张表字段全丢的缺陷。这类问题的共性是**静默**：产物看着正常、程序不报错、
 * 能力悄悄失效。而项目里不止 fieldSchema 一份「清单」，还有 5 份登记表：
 *   rls.ts         RLS_SCOPE / RLS_EXEMPT
 *   entities.ts    ENTITY_RESOURCES
 *   validate.ts    CHILD_TABLE_OVERRIDE / CHILD_BY_FIELD
 *   backupSchema.ts CHILD_TABLES / EXCLUDED_TABLES
 * 它们与真实库之间同样会漂移，且漂移方向有两个：
 *   - 漏登记（库里有表、清单里没有）→ 能力静默失效（如 RLS 漏登 = 默认拒绝 = 空表）
 *   - 僵尸登记（清单里有、库里没表）→ 误导后来人 / 校验指向不存在的表
 *
 * 做法：以**生产库 sqlite_master 为唯一事实源**，逐份清单双向比对。
 * 通过门槛：漏登记 0、僵尸登记 0（允许的例外必须显式登记在 ALLOW_* 白名单里并写明理由）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function loadEnv() {
  const p = resolve(root, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

function wranglerBin() {
  if (process.env.WRANGLER_BIN) return process.env.WRANGLER_BIN;
  const local = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
  if (existsSync(local)) return local;
  // 与 _gen_schema_prod.mjs 保持同一套 fallback（本机 wrangler 装在托管工作区）
  const fallback =
    'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
  if (existsSync(fallback)) return fallback;
  throw new Error('找不到 wrangler：请设置 WRANGLER_BIN 环境变量');
}

function d1(sql) {
  const r = spawnSync(process.execPath, [wranglerBin(), 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql], {
    encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024,
  });
  const out = r.stdout || '';
  const i = out.indexOf('[');
  if (i < 0) throw new Error('wrangler 输出异常:\n' + out.slice(0, 800) + (r.stderr || ''));
  return JSON.parse(out.slice(i))[0].results;
}

/**
 * 从 `const X ... = <开括号>` 处开始截取块体。
 * ★ 必须从 `=` 之后找开括号：类型标注里的方括号（`ChildTableDef[]`）会让
 *   `indexOf('[')` 命中类型而非数组本体 —— 这是本脚本第一版把 CHILD_TABLES
 *   判成「0 项」的原因（★ 找错括号是这类解析器的经典死法）。
 */
function blockBody(src, constName, open, close) {
  const start = src.indexOf(`const ${constName}`);
  if (start < 0) return null;
  const eq = src.indexOf('=', start);
  if (eq < 0) return null;
  const br = src.indexOf(open, eq);
  if (br < 0) return null;
  let depth = 0, end = -1;
  for (let i = br; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  return src.slice(br + 1, end);
}

/** 抓 `Record` 形态登记表的一级 key（★ key 可能是驼峰，不能只认全小写） */
function grabKeys(file, constName) {
  const src = readFileSync(resolve(root, file), 'utf8');
  const body = blockBody(src, constName, '{', '}');
  if (!body) return null;
  // 去掉注释行，避免把注释里的 `- 表名` 误当 key
  const clean = body.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const keys = [];
  for (const m of clean.matchAll(/^\s{2}(['"]?)([A-Za-z_][A-Za-z_0-9]*)\1\s*:/gm)) keys.push(m[2]);
  return keys;
}

/**
 * 抓指定字段的字符串值（如 ENTITY_RESOURCES 的 table / CHILD_TABLES 的 parent）
 * ★ open/close 必须按该常量**实际形态**传：ENTITY_RESOURCES 是 Record 对象 `{...}`，
 *   若仍按数组 `[` 找块，会命中 columns 数组的方括号 → 抓到 0 项 → **假绿**。
 */
function grabFieldValues(file, constName, fields, open = '[', close = ']') {
  const src = readFileSync(resolve(root, file), 'utf8');
  const body = blockBody(src, constName, open, close);
  if (!body) return null;
  const out = [];
  for (const m of body.matchAll(new RegExp(`\\b(?:${fields.join('|')})\\s*:\\s*['"]([a-z_][a-z_0-9]*)['"]`, 'g'))) {
    out.push(m[1]);
  }
  return out;
}

/** 抓数组/Set 里的字符串元素（如 EXCLUDED_TABLES） */
function grabArrayStrings(file, constName) {
  const src = readFileSync(resolve(root, file), 'utf8');
  const body = blockBody(src, constName, '[', ']');
  if (!body) return null;
  return [...body.matchAll(/['"]([a-z_][a-z_0-9]*)['"]/g)].map(m => m[1]);
}

console.log('══════ 清单型登记表 ↔ 生产库 双向核对 ══════\n');

// ── 1. 事实源：生产库真实表 ──────────────────────────────
const rows = d1("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
const dbTables = new Set(rows.map(r => r.name).filter(n => !n.startsWith('sqlite_') && !n.startsWith('_cf_')));
console.log(`生产库真实表 = ${dbTables.size} 张（已排除 sqlite_ / _cf_ 前缀）\n`);

// ── 2. 各清单 ────────────────────────────────────────────
/**
 * ★ 口径比正则更重要：每份清单要先问「它打算覆盖什么」，只核对那一维。
 *   - 全量式（打算覆盖所有业务表）→ 漏登记 + 僵尸登记 **双向都查**
 *   - 覆盖式（只登记特殊情况，如多子表）→ **只查僵尸登记**（查漏登记会全是噪音）
 */
const registries = [
  {
    label: 'rls.ts  RLS_SCOPE ∪ RLS_EXEMPT',
    note: '全量式：任何一张业务表都必须在二者之一，否则 RLS 返回 1=0（静默空表）',
    mode: 'full',
    // ★ RLS 是「SCOPE + EXEMPT 两张表合起来覆盖」，只查 SCOPE 会把豁免表全误报成漏登记
    grab: () => [
      ...(grabKeys('functions/_shared/rls.ts', 'RLS_SCOPE') || []),
      ...(grabKeys('functions/_shared/rls.ts', 'RLS_EXEMPT') || []),
    ],
    allowMissing: ['schema_migrations', 'd1_migrations'], // 迁移元数据，非业务表
  },
  {
    label: 'entities.ts  ENTITY_RESOURCES.table',
    note: '覆盖式：只登记走通用实体端点的资源，故只查「登记的表名在库里是否存在」',
    mode: 'ghost',
    // ★ ENTITY_RESOURCES 是 Record 对象形态，块括号是 {} 不是 []
    grab: () => grabFieldValues('functions/_shared/entities.ts', 'ENTITY_RESOURCES', ['table'], '{', '}'),
  },
  {
    label: 'validate.ts  CHILD_TABLE_OVERRIDE',
    note: '覆盖式：只有「父子表名不按默认规则推导」才登记',
    mode: 'ghost',
    grab: () => grabKeys('functions/_shared/validate.ts', 'CHILD_TABLE_OVERRIDE'),
  },
  {
    label: 'backupSchema.ts  CHILD_TABLES(table+parent)',
    note: '覆盖式：备份用的父子表关系，table 与 parent 双方都必须真实存在',
    mode: 'ghost',
    grab: () => grabFieldValues('functions/_shared/backupSchema.ts', 'CHILD_TABLES', ['table', 'parent']),
  },
  {
    label: 'backupSchema.ts  EXCLUDED_TABLES',
    note: '白名单：不参与备份的表，须真实存在（否则是拼错的死条目）',
    mode: 'ghost',
    grab: () => grabArrayStrings('functions/_shared/backupSchema.ts', 'EXCLUDED_TABLES'),
  },
];

let totalGhost = 0, totalMissing = 0;
const report = [];

for (const reg of registries) {
  let keys;
  try { keys = reg.grab(); } catch (e) { report.push(`⚠️  ${reg.label} 解析失败：${e.message}`); totalGhost++; continue; }
  if (!keys) { report.push(`⚠️  ${reg.label} 未找到该常量，跳过`); totalGhost++; continue; }
  // ★「0 项」是不可信信号：通常是解析器又找错了块/正则，而不是清单真的空。
  //   与其给出一片「僵尸 0」的假绿，不如直接判失败逼人去看。
  if (keys.length === 0) {
    report.push(`── ${reg.label}`);
    report.push(`   ❌ 解析出 0 项 —— 判为核对器缺陷，不认可为「通过」（请检查块括号形态与正则）`);
    report.push('');
    totalGhost++;
    continue;
  }
  const set = new Set(keys);
  const ghost = [...set].filter(k => !dbTables.has(k));
  totalGhost += ghost.length;

  report.push(`── ${reg.label}（有效项 ${set.size}）`);
  report.push(`   ${reg.note}`);
  if (ghost.length) report.push(`   ❌ 僵尸登记 ${ghost.length}：${ghost.join(', ')}`);
  else report.push(`   ✅ 僵尸登记 0`);

  if (reg.mode === 'full') {
    const allow = new Set(reg.allowMissing || []);
    const missing = [...dbTables].filter(t => !set.has(t) && !allow.has(t));
    totalMissing += missing.length;
    if (missing.length) {
      report.push(`   ❌ 漏登记 ${missing.length}：${missing.join(', ')}`);
    } else {
      report.push(`   ✅ 漏登记 0${allow.size ? `（显式放行 ${allow.size}：${[...allow].join(', ')}）` : ''}`);
    }
  } else {
    report.push(`   － 漏登记不查（覆盖式清单，查了全是噪音）`);
  }
  report.push('');
}

console.log(report.join('\n'));
console.log(`\n══════ 汇总 ══════`);
console.log(`僵尸登记 = ${totalGhost}　漏登记 = ${totalMissing}`);
console.log(totalGhost === 0 && totalMissing === 0 ? '✅ 全部对齐' : '❌ 存在不一致，须逐项处理');
process.exit(totalGhost === 0 && totalMissing === 0 ? 0 : 1);
