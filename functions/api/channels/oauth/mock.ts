// 模拟登录授权页（仅用于未配置真实应用密钥时演示完整 OAuth 流程）
// 渲染一个极简 HTML「登录并授权」页，点击后带模拟 code 跳回 callback。
import { getProvider } from '../../../_shared/channelOAuth';

function html(label: string, cb: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>模拟授权 - ${label}</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;background:#F1F5F9;display:flex;align-items:center;justify-content:center;height:100vh}
 .card{background:#fff;border-radius:16px;padding:32px;width:360px;box-shadow:0 8px 30px rgba(15,23,42,.08);text-align:center}
 h2{margin:0 0 6px;color:#0F172A}.sub{color:#64748B;font-size:13px;margin-bottom:20px}
 .badge{display:inline-block;background:#FEF3C7;color:#92400E;font-size:12px;padding:3px 10px;border-radius:999px;margin-bottom:16px}
 button{background:#2563EB;color:#fff;border:0;padding:11px 18px;border-radius:10px;font-size:15px;cursor:pointer;width:100%}
 button:hover{background:#1D4ED8}
 .note{color:#94A3B8;font-size:12px;margin-top:16px}
</style></head><body><div class="card">
 <div class="badge">模拟环境 · 非真实平台</div>
 <h2>${label} 授权</h2>
 <div class="sub">这是本地模拟登录页，用于演示「登录即连接」完整流程。<br/>真实接入请在开放平台注册应用后配置密钥。</div>
 <a href="${cb}"><button>登录并授权（模拟）</button></a>
 <div class="note">点击后将生成模拟令牌并写回系统，状态标记为「模拟」。</div>
</div></body></html>`;
}

export async function onRequestGet(context: any) {
  const url = new URL(context.request.url);
  const platform = url.searchParams.get('platform') || '';
  const state = url.searchParams.get('state') || '';
  const provider = getProvider(platform);
  const label = provider?.label || platform || '未知平台';
  const cb =
    `${url.origin}/api/channels/oauth/callback` +
    `?platform=${encodeURIComponent(platform)}` +
    `&code=mock_${platform}_${Date.now()}` +
    `&state=${encodeURIComponent(state)}`;
  return new Response(html(label, cb), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
