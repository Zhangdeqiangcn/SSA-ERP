import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DynamicThemeProvider from './components/theme/DynamicThemeProvider';
import App from './App';
import { b2Api } from './services/b2Api';
import './index.css';

// P0-1A：上线自动重放离线队列（网络恢复后把「未同步到 D1 的写操作」自动重放）
//   ① 监听 window 'online' 事件，网络恢复立即重放；
//   ② 应用启动即清积压（若此刻在线）；
//   ③ 每 30s 心跳：若在线则重试一次，覆盖「online 事件未触发但网络已恢复」的边界。
// 仅处理「可重试写失败」（网络/5xx），业务校验(4xx)与登录失效(401)本就不入队。
function setupOfflineSync(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void b2Api.retryAll();
  });
  if (navigator.onLine) {
    void b2Api.retryAll();
  }
  if (typeof setInterval === 'function') {
    setInterval(() => {
      if (navigator.onLine) void b2Api.retryAll();
    }, 30_000);
  }
}

async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    return worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
}

// 仅开发环境：把业务 store 暴露到 window，供 E2E 回归（如 add→persist 断言）直接调用
if (import.meta.env.DEV) {
  import('./stores').then((m) => {
    (window as unknown as Record<string, unknown>).__ssaStores = m;
  });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <DynamicThemeProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LocalizationProvider>
      </DynamicThemeProvider>
    </React.StrictMode>
  );

  // P0-1A：启动离线同步监听（上线自动重放未同步写操作）
  setupOfflineSync();

  // PWA：仅生产环境注册 Service Worker（public/ssa-sw.js）。
  // DEV 不注册——避免与 MSW 的 mockServiceWorker 冲突（同源只能有一个 SW）。
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/ssa-sw.js').catch(() => {
        /* SW 注册失败不影响应用本身（如非 HTTPS 环境自动跳过） */
      });
    });
  }
});
