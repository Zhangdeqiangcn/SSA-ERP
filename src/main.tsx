import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DynamicThemeProvider from './components/theme/DynamicThemeProvider';
import App from './App';
import './index.css';

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
