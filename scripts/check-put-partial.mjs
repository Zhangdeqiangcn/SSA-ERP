#!/usr/bin/env node
// ============================================================
// SSA ERP · PUT 必填语义门禁（P0-2 防回归）
// ------------------------------------------------------------
// 为什么需要它（硬规矩同源坑㉛「改一处忘改另一处」+ V3.86 PUT 回归事故）：
//
// V3.86 曾把「新建必填」用的 validateOrReject 默认语义（partial:false）直接套到
//   PUT 局部更新端点，导致「只传单字段的局部更新」被误拦 400，E2E 全线转红。
// 约定（V3.86 起铁律）：
//   ★ 所有 PUT 端点（functions/api/**/[id].ts 的 onRequestPut）若调用 validateOrReject，
//     必须传 { partial: true } —— 含义是「没传的字段放行、传了空值的字段仍拦」。
//
// 本门禁做静态扫描，漏配即阻断 npm run check，把回归挡在提交前：
//   对 functions/api 下所有 [id].ts（含任意层级目录）：
//     · 定位 onRequestPut 函数体；
//     · 若体内出现 validateOrReject( 调用，要求该调用参数内含 `partial: true`；
//     · 不含则判违规（该 PUT 端点会把局部更新误拦）。
//   注：POST 用默认 partial:false 是正确行为，不在本门禁范围；
//        PUT 内若完全不调用 validateOrReject（走自定义校验）也不违规，放行。
//
// 用法：node scripts/check-put-partial.mjs
// 退出码 0 = 通过；1 = 违规（用于门禁阻断）。
// 纯本地、无副作用、无网络依赖。
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const API_DIR = path.join(root, 'functions', 'api');

/** 递归收集所有动态路由文件 [id].ts */
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name === '[id].ts') out.push(p);
  }
  return out;
}

/** 取 onRequestPut 函数体（从首个 { 到配对的 }） */
function extractPutBlock(src) {
  const idx = src.indexOf('onRequestPut');
  if (idx === -1) return null;
  const open = src.indexOf('{', idx);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return src.slice(open + 1);
}

/** 判断某段代码里每个 validateOrReject(...) 调用是否都带 partial: true */
function allValidateCallsHavePartial(block) {
  const re = /validateOrReject\s*\(/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const startParen = block.indexOf('(', m.index);
    let depth = 0;
    let end = -1;
    for (let i = startParen; i < block.length; i++) {
      const ch = block[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) return false; // 括号不配对，视为可疑
    const args = block.slice(startParen + 1, end);
    if (!/partial\s*:\s*true/.test(args)) return false;
  }
  return true;
}

const files = fs.existsSync(API_DIR) ? walk(API_DIR) : [];
const violations = [];
let checked = 0;

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const putBlock = extractPutBlock(src);
  if (!putBlock) continue;                              // 无 PUT 处理器，跳过
  if (!/validateOrReject\s*\(/.test(putBlock)) continue; // PUT 内未用必填校验，跳过
  checked++;
  if (!allValidateCallsHavePartial(putBlock)) {
    const rel = path.relative(root, f);
    const lineNo = src.slice(0, src.indexOf('onRequestPut')).split('\n').length;
    violations.push(`${rel}:${lineNo}  PUT 处理器调用 validateOrReject 但缺少 { partial: true }`);
  }
}

console.log('─'.repeat(64));
console.log(`  PUT 必填语义门禁：扫描 ${files.length} 个 [id].ts，其中 ${checked} 个含必填校验`);
console.log('─'.repeat(64));

if (violations.length > 0) {
  console.log(`\n❌ 发现 ${violations.length} 处 PUT 端点未用 partial 语义（会把局部更新误拦 400）：\n`);
  for (const v of violations) console.log('  · ' + v);
  console.log('\n修复：把该 validateOrReject(table, body) 改为 validateOrReject(table, body, { partial: true });\n');
  process.exit(1);
}

console.log('\n✅ 通过：所有含必填校验的 PUT 端点均已使用 { partial: true }。\n');
process.exit(0);
