// ★ 审查：所有直连 D1 的写操作端点，是否包了 try/catch
// 为什么必须机器查：没包 try/catch 的端点在正常情况下 100% 正常，
//   只有数据库抛错（CHECK 约束 / NOT NULL / 唯一冲突）时才暴露，
//   而那一瞬间返回的是 Cloudflare 的 500 HTML 页，前端按 JSON 解析 → 白屏。
//   类型检查、打包、甚至常规功能测试**全都发现不了**。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API = path.join(ROOT, 'functions', 'api');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const files = walk(API);
const risky = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // 按导出函数切块
  const parts = src.split(/export\s+async\s+function\s+/).slice(1);
  for (const part of parts) {
    const name = part.slice(0, part.indexOf('('));
    const isWrite = /onRequestPost|onRequestPut|onRequestPatch|onRequestDelete/.test(name);
    if (!isWrite) continue;
    // 找函数体结尾（下一个 export 之前；这里 split 已保证）
    const body = part;
    const hasRun = /\.run\(\s*\)|\.batch\(/.test(body);
    if (!hasRun) continue;
    // 统计 try / catch
    const tries = (body.match(/\btry\s*\{/g) || []).length;
    const catches = (body.match(/\}\s*catch\s*\(/g) || []).length;
    // 找到所有 .run( 位置，判断前面最近的 try{ 是否在其之前且未被闭合
    let riskyRuns = 0;
    const runIdx = [...body.matchAll(/\.run\(\s*\)/g)].map((m) => m.index);
    for (const idx of runIdx) {
      const before = body.slice(0, idx);
      const openTries = (before.match(/\btry\s*\{/g) || []).length;
      const closeBlocks = (before.match(/\}\s*catch/g) || []).length;
      // 粗略：若 try 数量 == 已闭合 catch 数量，则该 run 不在一个 still-open 的 try 里
      if (openTries - closeBlocks <= 0) riskyRuns++;
    }
    if (riskyRuns > 0) {
      risky.push({
        file: path.relative(ROOT, f).replace(/\\/g, '/'),
        fn: name,
        runs: runIdx.length,
        unguarded: riskyRuns,
        tries,
        catches,
      });
    }
  }
}

console.log(`扫描端点文件 ${files.length} 个`);
console.log(`\n★★ 写操作端点中「有 .run() 但可能未被 try/catch 包裹」的共 ${risky.length} 个：\n`);
risky.sort((a, b) => b.unguarded - a.unguarded);
for (const r of risky) {
  console.log(`  ${r.file}  ${r.fn}  run=${r.runs} 未包裹≈${r.unguarded}  try=${r.tries} catch=${r.catches}`);
}
