/**
 * 前端调用的 API 路径 ↔ 后端 functions/api 实际路由 双向核对
 *
 * 为什么查：与 fieldSchema / 清单登记表同构 —— 「两边各写一份，靠人记住对齐」。
 * 漏了的表现是**运行时 404**，类型检查抓不到、打包也抓不到（前端只是拼字符串）。
 * 反过来「后端有、前端没调」通常无害（预留端点），但量大说明有死代码。
 *
 * 事实源：后端 = functions/api 目录结构；前端 = 源码里的请求路径字面量。
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const root = process.cwd();
const apiDir = resolve(root, 'functions/api');

// ── 1. 后端路由：目录结构 → /api/xxx 路径 ──────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|js)$/.test(name)) out.push(p);
  }
  return out;
}

function fileToRoute(file) {
  const rel = relative(apiDir, file).split(sep).join('/');
  let r = rel.replace(/\.(ts|js)$/, '');
  r = r.replace(/\/index$/, '');            // xxx/index.ts → /xxx
  r = r.replace(/\[([^\]]+)\]/g, ':$1');    // [id].ts → :id
  return '/api/' + r;
}

const backendFiles = walk(apiDir);
const backendRoutes = new Set(backendFiles.map(fileToRoute));

// ── 2. 前端调用点：抓 '/api/...' 字面量与模板串 ─────────────
const srcDirs = [resolve(root, 'src'), resolve(root, 'functions')];
const IGNORE = /(^|\/)(dist|node_modules|_dist_bak|_buildtrash|e2e|test-reports|\.workbuddy)(\/|$)/;

/**
 * ★ 噪音源必须排除，否则「真 404 风险」会被几十条假报淹掉：
 *   - src/mocks/**            MSW 接口模拟层，定义的是**模拟**端点，与真实后端无关
 *   - APIDocTab.tsx           API 文档页，罗列的是「文档里写了什么」，不是调用
 *   - manual.tsx              使用说明书正文，路径只是文本示例
 *   第一版没排除时 42 条里 40 条是这三类，真问题只有 1~2 条。
 */
const NOISE_FILE = /(^|\/)(mocks)(\/|$)|APIDocTab\.tsx$|manual\.tsx$|\/docs\/|integrationStore\.ts$/;

function walkSrc(dir, out = []) {
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    const p = resolve(dir, name);
    if (IGNORE.test(p.replace(root, ''))) continue;
    const st = statSync(p);
    if (st.isDirectory()) walkSrc(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const frontendCalls = new Map(); // 归一化路径 → [文件:行]
const rawCalls = new Set();

for (const dir of srcDirs) {
  for (const file of walkSrc(dir)) {
    const relF = relative(root, file).split(sep).join('/');
    if (NOISE_FILE.test(relF)) continue;
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    src.split('\n').forEach((line, i) => {
      // 匹配 '/api/xxx'、`/api/xxx`、"/api/xxx"，含模板串前缀 ${...} 的跳过（动态路径）
      for (const m of line.matchAll(/['"`](\/api\/[A-Za-z0-9_\-/:${}.]*)/g)) {
        const raw = m[1];
        rawCalls.add(raw);
        // ★ 跳过「路径守卫」型字面量：middleware 用 pathname.startsWith('/api/') 判定是否 API 请求，
        //   属于路由判断而非发起调用，若当作「前端调用点」会误报 /api 根路径。
        if (/(startsWith|endsWith|includes|indexOf|pathname)\s*\(/.test(line)) continue;
        // 把 ${xxx} 替换成占位符，用于「前缀是否属于后端」的判断
        const norm = raw.replace(/\$\{[^}]*\}/g, '*');
        const key = norm.replace(/\/+$/, '');
        if (!frontendCalls.has(key)) frontendCalls.set(key, []);
        frontendCalls.get(key).push(`${relative(root, file).split(sep).join('/')}:${i + 1}`);
      }
    });
  }
}

// ── 3. 比对 ──────────────────────────────────────────────
// 后端路由里把 :param 视作通配
function backendMatches(fePath) {
  if (backendRoutes.has(fePath)) return true;
  const segs = fePath.split('/');
  for (const b of backendRoutes) {
    const bs = b.split('/');
    if (bs.length !== segs.length) continue;
    let ok = true;
    for (let i = 0; i < bs.length; i++) {
      if (bs[i] === segs[i]) continue;
      if (bs[i].startsWith(':') || segs[i] === '*' || segs[i].startsWith('*')) continue;
      ok = false; break;
    }
    if (ok) return true;
  }
  return false;
}

const missing = [];
for (const [path, locs] of frontendCalls) {
  if (!backendMatches(path)) missing.push({ path, locs });
}

// 反向：后端有但前端从未调用（仅统计，不算失败）
const unused = [...backendRoutes].filter(b => {
  for (const fe of frontendCalls.keys()) if (backendMatches(fe) && fileToRoute.length >= 0) {
    // 逐个判断前端路径是否命中该后端路由
    const segs = fe.split('/'); const bs = b.split('/');
    if (bs.length !== segs.length) continue;
    let ok = true;
    for (let i = 0; i < bs.length; i++) {
      if (bs[i] === segs[i]) continue;
      if (bs[i].startsWith(':') || segs[i] === '*' || segs[i].startsWith('*')) continue;
      ok = false; break;
    }
    if (ok) return true;
  }
  return false;
});

console.log('══════ 前端 API 调用点 ↔ 后端路由 核对 ══════\n');
console.log(`后端路由（functions/api）  = ${backendRoutes.size} 条`);
console.log(`前端调用点（去重后路径）   = ${frontendCalls.size} 条`);
const dynCount = [...rawCalls].filter(r => r.includes('${')).length;
console.log(`其中含动态拼接的原始串     = ${dynCount} 条\n`);

if (missing.length) {
  console.log(`❌ 前端调用了但后端没有的端点 = ${missing.length}：`);
  for (const m of missing) {
    console.log(`   ${m.path}`);
    console.log(`      调用处：${m.locs.slice(0, 3).join(' | ')}${m.locs.length > 3 ? ' …' : ''}`);
  }
} else {
  console.log('✅ 前端调用的端点后端全部存在（0 处 404 风险）');
}

console.log(`\n－ 后端有但前端未调用 = ${backendRoutes.size - unused.length} 条（预留/后台端点，通常无害）`);

process.exit(missing.length ? 1 : 0);
