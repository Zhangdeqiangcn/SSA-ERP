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
  },
  build: {
    // 提升 chunk 体积告警阈值，并通过 manualChunks 拆分 vendor，提升浏览器缓存命中与首屏加载效率
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // 图表：@mui/x-charts + d3 家族（仅仪表盘/BI 等图表页需要，已懒加载）
          if (id.includes('@mui/x-charts') || id.includes('/d3-') || id.includes('d3-array') || id.includes('d3-scale') || id.includes('d3-shape') || id.includes('d3-time') || id.includes('internmap') || id.includes('delaunator') || id.includes('robust-predicates')) {
            return 'vendor-charts';
          }
          // 表格导出：xlsx + file-saver（体积大，DataTable 已改动态导入，仅点击导出时加载）
          if (id.includes('/xlsx') || id.includes('file-saver')) {
            return 'vendor-xlsx';
          }
          // 表单校验栈：react-hook-form + zod + resolvers（仅表单页需要，全部懒加载）
          if (id.includes('react-hook-form') || id.includes('/zod') || id.includes('@hookform')) {
            return 'vendor-forms';
          }
          // 日期：dayjs（date-pickers 首屏 LocalizationProvider 需要）
          if (id.includes('/dayjs')) {
            return 'vendor-date';
          }
          // 数据表：@tanstack/react-table（DataTable 通用组件）
          if (id.includes('@tanstack')) {
            return 'vendor-table';
          }
          if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
          if (id.includes('react-router') || id.includes('/react/') || id.includes('react-dom') || id.includes('scheduler') || id.includes('use-sync-external-store')) {
            return 'vendor-react';
          }
          return 'vendor';
        },
      },
    },
  },
});
