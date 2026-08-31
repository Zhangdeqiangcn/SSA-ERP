import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    // 本地诊断用：把 /api 代理到 wrangler pages dev（8788，含真实 Functions + D1），
    // 以便用 React dev 模式复现生产 #300 渲染死循环并拿到可读报错。生产部署不需要此代理。
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
  build: {
    // 提升 chunk 体积告警阈值
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // 仅隔离「不依赖 React」的大体积库（xlsx 仅点击导出时动态加载，无 React 顶层引用，可安全独立成 chunk）
          if (id.includes('/xlsx') || id.includes('file-saver')) {
            return 'vendor-xlsx';
          }
          // OCR 引擎体积大且仅「浏览器本地识别」模式按需动态 import，隔离成独立 chunk，
          // 避免被合进首屏 modulepreload 的 vendor 主包（tesseract.js 不依赖 React，可安全独立）
          if (id.includes('/tesseract.js') || id.includes('/tesseract.js-core')) {
            return 'vendor-tesseract';
          }
          // 其余第三方库（含 React / MUI / zustand / react-hook-form / 图表等）统一留在主 vendor chunk，
          // 避免「顶层引用 React 的库」被拆到与 React 不同的 chunk 而触发
          // 「Cannot access 'React' before initialization」的跨 chunk 循环依赖 TDZ。
          // 图表/大库本就经动态 import 懒加载，仍会自动单独分块。
          return 'vendor';
        },
      },
    },
  },
});
