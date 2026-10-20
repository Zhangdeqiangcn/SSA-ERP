#!/usr/bin/env node
// ============================================================
// SSA ERP · 状态色收敛门禁（界面一致性审计 P0 防复发）
// ------------------------------------------------------------
// 为什么需要它（硬规矩㉛「同口径两处实现必须对得上」）：
//
// 「业务状态 → 颜色 + 中文标签」的唯一真源是
//   src/components/common/StatusBadge.tsx 的 statusConfig
// 页面只应做两件事：
//   ① 状态列渲染 <StatusBadge status={key} />；
//   ② 需要一个极小的 `dataStatus → statusConfig key` 映射（约定名 *_STATUS_KEY）。
//
// 但审计（界面一致性审计报告.md §4）发现全站有 4+ 套本地状态色定义，
// 同一状态在不同页面颜色/标签不一致，且大量写死 '#hex'，换肤/深色模式失效。
// 这类问题**不会报错**，只会让界面慢慢漂移，只能靠机器扫描发现。
//
// 判定规则（对 src/pages 与 src/components 生效，中央登记表本身除外）：
//   · 声明一个名字含 STATUS / 以 _COLORS、_COLOR、_CONFIG、_PALETTE 结尾的常量；
//   · 且其对象字面量里出现 '#hex' 硬编码色值；
//   · 且该常量在本文件被引用 ≥2 次（即"活着"并在驱动渲染，死代码不算回归）；
//   → 判为违规。
//
// 合法例外（审计报告 §7「图表/特殊可视化可例外并加注释」）：
//   在声明前 3 行内加一行注释 `// status-color-exception: <理由>` 即可豁免，
//   例如图表配色数组、仪表盘专用色板。没有理由注释的硬编码一律不放行。
//
// 修复方式（不是删颜色，是搬到真源）：
//   · 页面状态 → <StatusBadge status={key} />，颜色只在 statusConfig 登记一次；
//   · 非 Chip 的可视化元素（进度条填充/图标着色）→ 用 statusTokenPath(key)
//     拿到 'success.main' 这类主题色路径，仍然不写 '#hex'。
//
// 用法：node scripts/check-status-colors.mjs
// 退出码 0 = 无违规；1 = 有违规（可用于门禁阻断）。
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

/** 扫描范围：页面与组件；中央登记表自身不扫 */
const SCAN_DIRS = ['src/pages', 'src/components'];
const EXCLUDE_FILES = new Set([
  // 状态色唯一真源，允许在此集中登记颜色
  path.join('src', 'components', 'common', 'StatusBadge.tsx'),
]);

// 名字含 STATUS，或以 _COLORS/_COLOR/_CONFIG/_PALETTE 结尾，或就叫 COLORS
const NAME_RE = /(STATUS|_COLORS$|_COLOR$|_CONFIG$|_PALETTE$|^COLORS$)/i;
const HEX_RE = /['"]#[0-9a-fA-F]{3,8}['"]/;
const EXCEPTION_RE = /status-color-exception/i;
const DECL_RE = /([ \t]*)const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=/g;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** 从 startIdx 起取第一个 {...} 的配对内容（找不到返回空串） */
function sliceBalanced(src, startIdx) {
  const open = src.indexOf('{', startIdx);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return src.slice(open, open + 800);
}

const violations = [];
const scanned = [];

for (const dir of SCAN_DIRS) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const rel = path.relative(root, file);
    if (EXCLUDE_FILES.has(rel)) continue;
    scanned.push(rel);

    const src = fs.readFileSync(file, 'utf8');
    DECL_RE.lastIndex = 0;
    let m;
    while ((m = DECL_RE.exec(src)) !== null) {
      const name = m[2];
      if (!NAME_RE.test(name)) continue;

      const body = sliceBalanced(src, m.index + m[0].length);
      if (!HEX_RE.test(body)) continue;

      // 「活着」的判定：本文件被引用 ≥2 次（声明本身算 1 次）
      const refs = (src.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
      if (refs < 2) continue;

      // 例外注释：声明行往前 3 个「非空行」内
      const prevLines = src.slice(0, m.index).split('\n').filter((l) => l.trim() !== '').slice(-3);
      if (prevLines.some((l) => EXCEPTION_RE.test(l))) continue;

      const lineNo = src.slice(0, m.index).split('\n').length;
      violations.push(`${rel}:${lineNo}  本地状态色副本 \`${name}\`（含 #hex）`);
    }
  }
}

console.log('─'.repeat(64));
console.log(`  状态色收敛门禁：扫描 ${scanned.length} 个页面/组件文件`);
console.log('─'.repeat(64));

if (violations.length > 0) {
  console.log(`\n❌ 发现 ${violations.length} 处本地状态色副本（应收敛到 StatusBadge.statusConfig）：\n`);
  for (const v of violations) console.log('  · ' + v);
  console.log('\n修复：状态列改用 <StatusBadge status={key} />；');
  console.log('      可视化元素改用 statusTokenPath(key) 拿主题色路径；');
  console.log('      确需例外的（图表配色等）在声明前加 // status-color-exception: <理由>\n');
  process.exit(1);
}

console.log('\n✅ 通过：未发现"活着"的本地状态色副本。\n');
process.exit(0);
