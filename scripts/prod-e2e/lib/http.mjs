// SSA ERP · 生产 E2E 常驻套件 — HTTP 客户端
// ------------------------------------------------------------
// 统一 fetch 封装：会话 Bearer / API Key Bearer 双鉴权、超时、JSON 容错、耗时统计。
// 不含任何断言逻辑，保持纯粹可复用。

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * 创建绑定 base 的请求器。
 * @param {string} base 形如 https://ssa-erp.pages.dev
 * @returns {(method:string, path:string, opts?:object)=>Promise<object>}
 */
export function createClient(base, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const stats = { calls: 0, totalMs: 0, failures: 0 };

  async function req(method, path, opts = {}) {
    const { token, apiKey, body, headers: extraHeaders } = opts;
    const headers = { 'Content-Type': 'application/json', ...(extraHeaders || {}) };
    // apiKey 优先级高于 token（网关路径显式指定时不应被会话覆盖）
    if (token) headers.Authorization = 'Bearer ' + token;
    if (apiKey) headers.Authorization = 'Bearer ' + apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const started = Date.now();
    stats.calls += 1;

    try {
      const res = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text().catch(() => '');
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { /* 非 JSON（如 SPA 回退 HTML） */ }
      const ms = Date.now() - started;
      stats.totalMs += ms;
      return {
        status: res.status,
        ok: res.ok,
        data,
        text,
        contentType,
        isJson: contentType.includes('json'),
        ms,
      };
    } catch (e) {
      const ms = Date.now() - started;
      stats.totalMs += ms;
      stats.failures += 1;
      return {
        status: 0,
        ok: false,
        data: null,
        text: null,
        contentType: '',
        isJson: false,
        ms,
        error: e?.name === 'AbortError' ? `请求超时(${timeout}ms)` : (e?.message || String(e)),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  req.stats = () => ({ ...stats, avgMs: stats.calls ? Math.round(stats.totalMs / stats.calls) : 0 });
  req.base = base;
  return req;
}
