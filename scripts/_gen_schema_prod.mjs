#!/usr/bin/env node
// 由**生产库真实 DDL** 生成 scripts/_schema_raw.json → 再交给 _emit_schema.mjs 出 fieldSchema.ts
//
// ── 为什么不用原来的 _gen_schema.py ─────────────────────────────
// 原脚本读的是**本地某个历史 miniflare 库**（`.d1audit_rebuild_20260911/...`），
// 那个库停留在 2026-09-11，因此：
//   · 漏掉 0051 之后所有新表（bom_items / fin_* / sales_* / approval_flow_nodes…）
//   · V3.10.0 建了 approval_flow_nodes，但 `_schema_raw.json` 里**没有它**，
//     于是 `validate.ts` 的 CHILD_TABLE_OVERRIDE 指向一张 FIELD_SCHEMA 里
//     不存在的表 → `childTableOf` 返回 null → **审批节点明细校验被静默跳过**
//     （condition 传任意类型、timeout 传文本都能入库）。
//     这个隐患在 V3.10.0 就已存在，只是当时没人发现。
//
// ★ 教训：**schema 的来源必须是「现在真实的库」，不能是某个快照目录。**
//   快照会悄悄过期，而过期的表现不是报错，是**校验静默失效**。
//   因此本脚本固定打生产库（--remote），与「字段约束必须服从线上事实」一致。
//
// 用法：node scripts/_gen_schema_prod.mjs
//   → 写 scripts/_schema_raw.json
//   → 然后 node scripts/_emit_schema.mjs 生成 fieldSchema.ts
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;
const localWrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const FALLBACK_WRANGLER =
  'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
const WRANGLER = process.env.WRANGLER_BIN || (existsSync(localWrangler) ? localWrangler : FALLBACK_WRANGLER);
const DB = 'ssa-erp-db';

// 注入 .env.local（非交互环境 wrangler 需要 CLOUDFLARE_API_TOKEN）
const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

// 1) 取生产库全部表的 DDL
const sql = `SELECT name, sql FROM sqlite_master WHERE type='table'
  AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
  AND name NOT LIKE 'd1_%' AND name != 'schema_migrations' ORDER BY name`;
const r = spawnSync(
  NODE,
  [WRANGLER, 'd1', 'execute', DB, '--remote', '--json', '--command', sql],
  { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 }
);
if (r.status !== 0) {
  console.error('❌ 读取生产库表结构失败：', r.stderr?.slice(0, 500));
  process.exit(r.status ?? 1);
}
// ★ wrangler 会在 stdout **最前面**打印一行代理/环境提示
//   （如 "Proxy environment variables detected..."），直接 JSON.parse 会炸。
//   因此从第一个 `[` 或 `{` 开始截取 —— 这是比「过滤特定行」更稳的做法：
//   提示文字会变，但 JSON 的起始字符固定。
const rawOut = r.stdout || '';
const jsonStart = (() => {
  const a = rawOut.indexOf('[');
  const b = rawOut.indexOf('{');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
})();
if (jsonStart === -1) {
  console.error('❌ wrangler 输出中找不到 JSON 起始字符：', rawOut.slice(0, 300));
  process.exit(1);
}
const parsed = JSON.parse(rawOut.slice(jsonStart));
const rows = parsed[0]?.results || [];
if (!rows.length) {
  console.error('❌ 生产库返回 0 张表，拒绝生成（生成空 schema 会静默关闭全站写入校验）');
  process.exit(1);
}

// 2) 解析 DDL → 列名 + 类型
//
// ── ★ 为什么不能「按行切分」（V3.11.1 修正）────────────────────
// 第一版用 `body.split('\n')` 逐行匹配列定义，**只在「一列一行」的 DDL 下成立**。
// 但本项目的迁移里有大量 `CREATE TABLE x (id TEXT, name TEXT, ...)` **单行书写**，
// 于是整条 DDL 只匹配到第一个 `id`，**其余列全部丢掉**。
// 后果实测（16 张空对象表里 15 张受害）：
//   sales_orders 1137 字符 → 只解析出 1 列 id（真实 44 列，丢 43）
//   purchase_orders 1055 → 丢 39；vouchers → 丢 37；work_orders → 丢 34 …
// 丢掉的恰是金额/数量/日期字段，即**校验最该管的那批**。
// 表现不是报错，而是 `orderDate: '2026-13-45'` 一路放行入库（13-hardening 抓到）。
//
// ★ 正确做法：按**圆括号深度**在顶层切逗号。这样单行/多行 DDL 都能正确切分，
//   且 `CHECK (x IN ('a','b'))` 这类含逗号的约束不会把列切断。
const NUM = /\b(INT|REAL|NUM|DEC|FLOAT|DOUBLE|BOOL)\w*/i;
const DATE_NAME = /(_at|_date$|^date$|date_|expiry|deadline|period_start|period_end)/i;

/** 按顶层逗号切分 SQL 括号体（忽略嵌套括号内的逗号） */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

const out = {};
for (const { name, sql: ddl } of rows) {
  const cols = {};
  if (ddl) {
    // ★ 必须先剥掉 `--` 行注释（V3.11.1 第二个修正）
    //
    // 本项目的迁移大量使用「注释行 + 一列一行」的分组写法：
    //     -- 信用管控
    //     credit_level    TEXT CHECK (...),
    // 而**按顶层逗号切分时，注释与该列会被切进同一段** →
    // 段首是 `--` → 被当注释整段跳过 → 该列消失。
    // 实测后果：customers 丢 8 列（每列前面都有一个注释行）、materials 丢 15 列、
    // vendors 丢 5 列、fin_project_cost_items 丢 2 列 —— 全是「注释刚好贴在列前面」的列。
    //
    // 所以顺序必须是：**先剥注释，再切分**。反之（先切再剥）会让带注释的段被误判为非列定义。
    const noComment = ddl
      .split('\n')
      .map((l) => {
        // 找到不在引号内的 `--`，截断之
        let inStr = null;
        for (let i = 0; i < l.length; i++) {
          const ch = l[i];
          if (inStr) {
            if (ch === inStr) inStr = null;
          } else if (ch === "'" || ch === '"') {
            inStr = ch;
          } else if (ch === '-' && l[i + 1] === '-') {
            return l.slice(0, i);
          }
        }
        return l;
      })
      .join('\n');

    const open = noComment.indexOf('(');
    const close = noComment.lastIndexOf(')');
    if (open === -1 || close === -1) { out[name] = cols; continue; }
    const body = noComment.slice(open + 1, close);
    for (const rawPart of splitTopLevel(body)) {
      const line = rawPart.trim().replace(/\s+/g, ' ').replace(/,$/, '');
      if (!line) continue;
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(line)) continue;
      const m = line.match(/^["'`\[]?([A-Za-z_][A-Za-z0-9_]*)["'`\]]?\s+([A-Za-z_]+)/);
      if (!m) continue;
      const [, colName, colType] = m;
      const t = colType.toUpperCase();
      const kind = NUM.test(t) ? 'number' : DATE_NAME.test(colName) ? 'date' : 'text';
      cols[colName] = { t: kind, sql: t };
    }
  }
  out[name] = cols;
}

// 3) ★ 自检：拒绝产出「明显残缺」的 schema
//
// 上面的 Bug 之所以能潜伏，是因为它**静默成功**：文件照样生成、console 照样 ✅、
// 校验悄悄失效，没有任何一层会报错。所以这里必须让「解析结果不合理」变成**硬失败**。
//
// 判据：任何除 `id` 外没有其他列的表都视为解析失败。
//   · 本项目全部业务表都有 org_id / created_at 等列，不可能只有 id；
//   · 只有 id 一列，正是「按行切分」失败的**特征指纹**。
const suspicious = Object.entries(out).filter(([, cols]) => {
  const names = Object.keys(cols);
  return names.length === 0 || (names.length === 1 && names[0] === 'id');
});
if (suspicious.length) {
  console.error(
    `❌ 解析结果异常，拒绝写出（否则会静默关闭这些表的写入校验）：\n` +
      suspicious.map(([t, c]) => `   · ${t}：仅解析出 ${Object.keys(c).length} 列`).join('\n') +
      `\n   → 请检查 DDL 解析逻辑（列定义是否被切断），而不是继续生成。`
  );
  process.exit(1);
}

writeFileSync(resolve(root, 'scripts/_schema_raw.json'), JSON.stringify(out, null, 1), 'utf8');
const total = Object.keys(out).length;
const totalCols = Object.values(out).reduce((n, c) => n + Object.keys(c).length, 0);
console.log(`✅ 已生成 _schema_raw.json：${total} 张表 / ${totalCols} 个已登记字段（来源：生产库真实 DDL）`);

