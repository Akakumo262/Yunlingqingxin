import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// 端口与 contracts/src/routes.ts 的 PORTS 保持一致
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // 模拟后端单独成块，只有用到内置演示数据时才加载
      { find: '@yunling/contracts/mock', replacement: src('../../contracts/src/mock/index.ts') },
      // 前端直接读契约源码（不含模拟后端），改完契约无需构建即可生效
      { find: /^@yunling\/contracts$/, replacement: src('../../contracts/src/core.ts') },
      { find: '@', replacement: src('./src') },
    ],
  },
  build: {
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] } } },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
