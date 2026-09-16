#!/usr/bin/env node
// ★ 动手前必做：逐字段比对「生产库真实数据」vs「代码默认值」（C1 模板第 ④ 步）
// 为什么必须靠脚本：V3.10.0 审批流域凭这一步查出三件只看代码永远发现不了的事
//   · 13 条 status='system' 不是人设的（程序补的）
//   · 唯一真实用户改动是「采购入库」审批被打开
//   · 库里 13 条 vs 代码 20 条（7 个流程在生产从未出现过）
// 拿代码默认值当种子会**悄悄覆盖用户的真实改动**。
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const NODE = process.execPath;
const localWrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const WRANGLER = existsSync(localWrangler)
  ? localWrangler
  : 'C:/Users/zhangdeqiang/.workbuddy/binaries/node/workspace/node_modules/wrangler/bin/wrangler.js';

const envPath = resolve(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

// 1) 用 esbuild 把 mock TS 转成可取值的 JS
const outfile = resolve(root, '.tmp_mock_prod.mjs');
buildSync({
  entryPoints: [resolve(root, 'src/mocks/data/production.ts')],
  bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error',
});
const mock = await import('file://' + outfile.replace(/\\/g, '/'));

// 2) 取生产库真实数据
const r = spawnSync(
  NODE,
  [WRANGLER, 'd1', 'execute', 'ssa-erp-db', '--remote', '--json', '--command',
   `SELECT org_id, value FROM app_state WHERE key='ssa-erp-production'`],
  { encoding: 'utf8', cwd: root, maxBuffer: 256 * 1024 * 1024 }
);
const out = (r.stdout || '') + (r.stderr || '');
const s = out.search(/[[{]/);
if (s < 0) { console.error('❌ 无 JSON：\n' + out.slice(0, 1200)); process.exit(1); }
const rows = JSON.parse(out.slice(s))[0]?.results || [];

function flatDiff(a, b, prefix = '') {
  const diffs = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const av = a?.[k], bv = b?.[k];
    const bothObj = av && bv && typeof av === 'object' && typeof bv === 'object';
    if (bothObj && !Array.isArray(av) && !Array.isArray(bv)) {
      diffs.push(...flatDiff(av, bv, `${prefix}${k}.`));
    } else if (JSON.stringify(av) !== JSON.stringify(bv)) {
      diffs.push({ field: `${prefix}${k}`, db: bv, mock: av });
    }
  }
  return diffs;
}

for (const row of rows) {
  const db = JSON.parse(row.value).state;
  console.log(`\n════════ org=${row.org_id} ════════`);
  for (const slice of ['processRoutes', 'mrpRecommendations']) {
    const dbList = db[slice] || [];
    const mockList = mock[slice] || [];
    console.log(`\n── ${slice}：库 ${dbList.length} 条 / 代码默认 ${mockList.length} 条`);

    const dbIds = new Set(dbList.map((x) => x.id));
    const mockIds = new Set(mockList.map((x) => x.id));
    const onlyDb = [...dbIds].filter((i) => !mockIds.has(i));
    const onlyMock = [...mockIds].filter((i) => !dbIds.has(i));
    const both = [...dbIds].filter((i) => mockIds.has(i));
    console.log(`   仅库里有: ${onlyDb.length ? onlyDb.join(', ') : '（无）'}`);
    console.log(`   仅代码里有: ${onlyMock.length ? onlyMock.join(', ') : '（无）'}`);
    console.log(`   两边都有: ${both.length}`);

    for (const id of both) {
      const a = mockList.find((x) => x.id === id);
      const b = dbList.find((x) => x.id === id);
      const d = flatDiff(a, b);
      if (d.length === 0) { console.log(`   ✓ ${id} 完全一致`); continue; }
      console.log(`   ✗ ${id} 有 ${d.length} 处不同：`);
      for (const x of d) {
        const dbv = typeof x.db === 'object' ? JSON.stringify(x.db) : String(x.db);
        const mkv = typeof x.mock === 'object' ? JSON.stringify(x.mock) : String(x.mock);
        const cut = (v) => (v && v.length > 70 ? v.slice(0, 70) + '…' : v);
        console.log(`       ${x.field}: 库=${cut(dbv)} | 代码=${cut(mkv)}`);
      }
    }
    // 完整字段清单（用于建表列登记）
    const sample = dbList[0] || mockList[0];
    if (sample) console.log(`   字段清单: ${Object.keys(sample).join(', ')}`);
    if (dbList[0]?.operations?.[0]) {
      console.log(`   operations[0] 字段: ${Object.keys(dbList[0].operations[0]).join(', ')}`);
      console.log(`   operations 行数（各条）: ${dbList.map((x) => `${x.id}=${(x.operations || []).length}`).join(', ')}`);
    }
  }
}
try { require('node:fs').unlinkSync(outfile); } catch {}
