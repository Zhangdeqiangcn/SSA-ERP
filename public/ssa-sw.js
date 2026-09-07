// ============================================================
// SSA ERP PWA Service Worker（仅生产环境注册，见 src/main.tsx）
// ------------------------------------------------------------
// 策略（设计要点）：
//  1. /api/* 与一切非 GET（POST/PUT/DELETE）→ 一律直连网络，绝不缓存。
//     业务数据（D1 单据/库存）永不经 SW 之手，杜绝读到旧数据或串组织数据。
//  2. 导航请求（HTML）→ network-first：优先拿最新壳，断网时回退缓存，
//     弱网/离线时已安装的 App 仍可打开（配合移动端作业兜底提示）。
//  3. /assets/*（vite 产物，文件名带内容 hash，天然不可变）→ cache-first。
//  4. 其余同源静态（/icons、manifest 等）→ cache-first。
//  5. 缓存名带版本号：新 SW activate 时整批淘汰旧版本缓存，
//     杜绝「部署了新版本还跑旧资源」的经典 PWA 坑。
// 注意：DEV 环境不注册本 SW，避免与 MSW 的 mockServiceWorker 冲突。
// ============================================================

const CACHE_HTML = 'ssa-erp-html-v1';
const CACHE_ASSETS = 'ssa-erp-assets-v1';
const CACHE_STATIC = 'ssa-erp-static-v1';
const ALL = [CACHE_HTML, CACHE_ASSETS, CACHE_STATIC];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !ALL.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // 写操作直连网络
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // 跨域不拦截
  if (url.pathname.startsWith('/api/')) return;           // 业务 API 直连网络

  const accept = req.headers.get('accept') || '';
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(networkFirstHtml(req));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(CACHE_ASSETS, req));
    return;
  }
  event.respondWith(cacheFirst(CACHE_STATIC, req));
});

/** 导航请求：network-first，断网回退缓存的壳；连壳也没有时给离线提示页 */
async function networkFirstHtml(req) {
  const cache = await caches.open(CACHE_HTML);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = (await cache.match(req, { ignoreSearch: true }))
      || (await cache.match('/', { ignoreSearch: true }));
    if (cached) return cached;
    return new Response(
      '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<body style="font-family:system-ui;background:#0F172A;color:#E2E8F0;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center">'
      + '<div><h2 style="margin:0 0 8px">当前处于离线状态</h2>'
      + '<p style="margin:0;color:#94A3B8">网络恢复后重新打开即可继续作业；已提交的数据都在云端，不会丢失。</p></div>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

/** 静态资源：cache-first，未命中时回源并写入缓存 */
async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok && (fresh.type === 'basic' || fresh.type === 'cors')) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}
