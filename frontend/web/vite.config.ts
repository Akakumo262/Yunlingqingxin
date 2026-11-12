import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// 端口与 contracts/src/routes.ts 的 PORTS 保持一致
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 前端直接读契约源码，改完契约无需构建即可生效
      '@yunling/contracts': fileURLToPath(new URL('../../contracts/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
