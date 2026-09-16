/**
 * 生产端点存在性探针
 *
 * ★★ 关键前提（本脚本存在的理由）：**这个架构下 HTTP 状态码不能用来判断端点是否存在**。
 * Cloudflare Pages 的 SPA 回退会把任何未匹配路径都返回 200 + index.html，
 * 实测连瞎编的 `/api/nonexistent-xyz-123` 也是 `200 text/html`。
 * 所以判据必须是：**响应体是不是 JSON**（真实 Functions 端点返回 JSON，回退返回 HTML）。
 *
 * 判据表：
 *   JSON 体               → 端点真实存在（401/400/200 都算存在）
 *   text/html             → 落到 SPA 回退 = 端点不存在（该路径没有对应文件/导出）
 *   405 且非 HTML         → 路径被匹配到但方法不允许（也要算存在，只是方法不匹配）
 *   超时/其它             → 需人工看
 */
const BASE = process.env.PROBE_BASE || 'https://ssa-erp.pages.dev';

const cases = [
  // ── 对照组：两者的结论必须与预期一致，否则本次探测整体无效 ──
  ['GET', '/api/nonexistent-xyz-123', '对照组·瞎编路径（期望=不存在）'],
  ['POST', '/api/auth/login', '对照组·登录端点（期望=存在）'],

  // ── tax-gateway：前端写的是 /config，后端 index.ts 导出的是 onRequestGet/Post/Delete ──
  ['GET', '/api/tax-gateway/config', '★ 前端实际调用（TaxConfigPage 3 处）'],
  ['GET', '/api/tax-gateway', '对照·根路径（若存在 = 前端多写了 /config）'],
  ['GET', '/api/tax-gateway/verify', '对照·verify 子路径'],
  ['GET', '/api/tax-gateway/quota', '对照·quota（onRequestQuota 对应路径）'],

  // ── chatbi：前端 POST /analyze，后端 index.ts 导出 onRequest ──
  ['POST', '/api/chatbi/analyze', '★ 前端实际调用（ChatBI 页面 POST）'],
  ['POST', '/api/chatbi', '对照·根路径'],
];

async function probe(method, path) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 25000);
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : '{"query":"test"}',
      signal: ctl.signal,
    });
    clearTimeout(t);
    const ct = res.headers.get('content-type') || '';
    const txt = await res.text();
    const isHtml = ct.includes('html') || txt.trimStart().startsWith('<!');
    const isJson = ct.includes('json') || (!isHtml && /^\s*[{[]/.test(txt));
    const matched = !isHtml; // 只要没落到 SPA 回退，就说明路由被匹配到了
    return { code: res.status, ct: ct.split(';')[0] || '(空)', isJson, matched, sample: txt.slice(0, 90).replace(/\s+/g, ' ') };
  } catch (e) {
    return { code: -1, ct: 'ERR', isJson: false, matched: false, sample: e.message };
  }
}

console.log('══════ 生产端点存在性探针 ══════');
console.log(`目标 = ${BASE}`);
console.log('判据：非 HTML = 路由已匹配；HTML = 落到 SPA 回退 = 该路径没有对应文件/导出\n');

const results = [];
for (const [m, p, note] of cases) {
  const r = await probe(m, p);
  const verdict = r.matched ? (r.isJson ? '✅ 已匹配·JSON' : `⚠️  已匹配·非JSON(${r.ct})`) : '❌ 未匹配（SPA 回退）';
  results.push({ m, p, note, r, verdict });
  console.log(`${m.padEnd(5)} ${p.padEnd(30)} ${String(r.code).padEnd(4)} ${r.ct.padEnd(18)} ${verdict}`);
  console.log(`      ${note}`);
  if (r.sample) console.log(`      响应：${r.sample}`);
  console.log('');
}

const fake = results[0], login = results[1];
let ctrlOk = true;
if (fake.r.matched) { console.log('❌ 探针自检失败：瞎编路径被判为「已匹配」，本次结果不可信'); ctrlOk = false; }
if (!login.r.matched) { console.log('❌ 探针自检失败：登录端点被判为「未匹配」，本次结果不可信'); ctrlOk = false; }
if (ctrlOk) console.log('✅ 探针自检通过（瞎编=未匹配、登录=已匹配），以上结论可信');
process.exit(ctrlOk ? 0 : 1);
