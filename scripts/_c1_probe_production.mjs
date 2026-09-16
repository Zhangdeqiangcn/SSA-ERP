/**
 * C1 关系化 · 开工前「三件套」量化 —— production 生产域
 *
 * 三件套（MEMORY.md 硬规矩，必须靠脚本量化，不能目测）：
 *   1. 消费方清单：多少个文件引用了本域 store
 *   2. 真实体积：app_state 里该键多少字节、各切片多少行
 *   3. CRUD 写入调用点：几处、是否 await 返回值（决定能否改 async）
 *
 * ★ 坑（已踩过）：app_state 的 value 是 JSON 文本，且有 `{"state":{...}}` 包裹层，
 *   直接查顶层键会全部返回 null。必须解析后再取 .state。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const root = process.cwd();

function loadEnv() {
  const p = resolve(root, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
loadEnv();

function wranglerBin() {
  if (process.env.WRANGLER_BIN) return process.env.WRANGLER_BIN;
  const local = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
  if (existsSync(local)) return local;
  return 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';
}

function d1(sql) {
  const r = spawnSync(process.execPath, [wranglerBin(), 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command', sql], {
    encoding: 'utf8', cwd: root, maxBuffer: 128 * 1024 * 1024,
  });
  const out = r.stdout || '';
  // ★ 必须从「最外层」JSON 起始符切：错误响应是 `{...}`，但它内部有 "notes": [ ，
  //   用 indexOf('[') 会切进数组里，把 SQL 报错伪装成解析报错，极难定位（已踩）。
  const a = out.indexOf('['), b = out.indexOf('{');
  const start = a === -1 ? b : b === -1 ? a : Math.min(a, b);
  if (start === -1) throw new Error('wrangler 无输出：\n' + (r.stderr || '').slice(0, 600));
  const parsed = JSON.parse(out.slice(start));
  // ★ SQL 报错优先暴露，不要让它混在解析层
  if (parsed && parsed.error) throw new Error('SQL 执行失败：' + JSON.stringify(parsed.error.notes || parsed.error));
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  if (first && first.error) throw new Error('SQL 执行失败：' + JSON.stringify(first.error));
  return (first && first.results) || [];
}

// ───────── 1. 消费方清单 ─────────
function walk(dir, out = []) {
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    const p = resolve(dir, n);
    if (/node_modules|dist|_dist_bak|_buildtrash|\.workbuddy/.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}
const srcFiles = walk(resolve(root, 'src'));

const HOOKS = ['useProductionStore', 'useProductionOperationStore'];
console.log('══════ ① 消费方清单 ══════');
const consumerMap = {};
for (const h of HOOKS) {
  const files = srcFiles.filter(f => readFileSync(f, 'utf8').includes(h));
  const rel = files.map(f => relative(root, f).split(sep).join('/'));
  const biz = rel.filter(p => !p.includes('/stores/') && !p.includes('manual.tsx'));
  consumerMap[h] = { all: rel, biz };
  console.log(`${h}`);
  console.log(`   引用文件 = ${rel.length}　其中业务消费方 = ${biz.length}`);
  console.log(`   业务消费方：${biz.join(', ')}`);
  console.log('');
}

// ───────── 2. 真实体积 ─────────
console.log('══════ ② 真实体积（生产库 app_state）══════');
const keys = ['ssa-erp-production', 'ssa-erp-production-op'];
for (const k of keys) {
  // ★ 键列名是 `key` 不是 `k`（app_state 建表：org_id / key / value / updated_at / version）
  const rows = d1(`SELECT org_id, length(value) AS bytes, value FROM app_state WHERE key='${k}'`);
  if (!rows.length) { console.log(`${k}：生产库无此键（0 字节）\n`); continue; }
  let total = 0;
  const perOrg = [];
  for (const r of rows) {
    total += r.bytes;
    let parsed = null, slices = null;
    try {
      parsed = JSON.parse(r.value);
      const st = parsed?.state ?? parsed;
      slices = Object.entries(st || {}).map(([n, v]) => {
        const n2 = Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 1);
        return `${n}=${n2}`;
      });
    } catch (e) { slices = [`(解析失败: ${e.message})`]; }
    perOrg.push({ org: r.org_id, bytes: r.bytes, slices });
  }
  console.log(`${k}：${rows.length} 个组织，合计 ${total} 字节`);
  for (const p of perOrg) {
    console.log(`   org=${p.org}  ${p.bytes} 字节`);
    console.log(`      切片：${(p.slices || []).join('  ')}`);
  }
  console.log('');
}

// ───────── 3. CRUD 写入调用点 ─────────
console.log('══════ ③ CRUD 写入调用点 ══════');
for (const [file, label] of [
  ['src/stores/productionStore.ts', 'productionStore'],
  ['src/stores/productionOperationStore.ts', 'productionOperationStore'],
]) {
  const p = resolve(root, file);
  if (!existsSync(p)) { console.log(`${label}：文件不存在\n`); continue; }
  const src = readFileSync(p, 'utf8');
  const lines = src.split('\n');
  // store 内部的定义点（写入状态的方法）
  const defs = [];
  lines.forEach((l, i) => {
    if (/^\s{2}(async\s+)?(add|update|remove|delete|set|create|save|complete|start|issue|finish|report)\w*\s*[:(]/.test(l)) {
      defs.push(`${i + 1}: ${l.trim().slice(0, 60)}`);
    }
  });
  console.log(`${label}：内部写入方法 ${defs.length} 个`);
  defs.slice(0, 30).forEach(d => console.log(`   ${d}`));
  console.log('');
}

// 外部调用点（业务页面里怎么用）
for (const h of HOOKS) {
  const short = h.replace('use', '');
  const calls = [];
  for (const f of srcFiles) {
    const rel = relative(root, f).split(sep).join('/');
    if (rel.includes('/stores/')) continue;
    const src = readFileSync(f, 'utf8');
    src.split('\n').forEach((l, i) => {
      // 调用形如 useProductionStore.getState().addXxx(...) 或 .addXxx(
      const m = l.match(new RegExp(`${h}[^\n]*?\\.\\s*(getState\\(\\)[^\n]*?)?\\.\\s*(add|update|remove|delete|set|create|save|complete|start|issue|finish|report)\\w*\\s*\\(`));
      if (m) calls.push(`${rel}:${i + 1}  ${l.trim().slice(0, 90)}`);
    });
  }
  console.log(`${h} 外部写入调用点 = ${calls.length}`);
  calls.slice(0, 25).forEach(c => console.log(`   ${c}`));
  console.log('');
}
