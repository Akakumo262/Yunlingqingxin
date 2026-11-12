import { defineConfig } from '@tarojs/cli';
import path from 'node:path';

// 端口与 contracts/src/routes.ts 的 PORTS 保持一致
export default defineConfig(async () => ({
  projectName: 'yunling-miniapp',
  date: '2026-11-11',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 375: 2, 828: 1.81 / 2 },
  sourceRoot: 'src',
  outputRoot: `dist/${process.env.TARO_ENV}`,
  plugins: [],
  defineConstants: {
    // 小程序真机调试时改成局域网地址或已备案域名
    API_ORIGIN: JSON.stringify(process.env.TARO_APP_API_ORIGIN || 'http://localhost:3000'),
    // auto：有后端连后端，没有就用内置演示数据；http / mock 为强制指定
    API_MODE: JSON.stringify(process.env.TARO_APP_API_MODE || 'auto'),
  },
  alias: {
    // 小程序读契约的构建产物（CommonJS），改契约后需先在根目录执行 npm run build:contracts
    '@yunling/contracts': path.resolve(__dirname, '../../../contracts/dist/index.js'),
    '@': path.resolve(__dirname, '../src'),
  },
  framework: 'react',
  // 依赖预编译在当前 Node 版本下会报错，关掉后开发模式可正常启动
  compiler: { type: 'webpack5', prebundle: { enable: false } },
  cache: { enable: false },
  mini: {
    postcss: { pxtransform: { enable: true, config: {} }, cssModules: { enable: false } },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: { mode: 'hash' },
    devServer: { port: 10086, open: false },
    postcss: { autoprefixer: { enable: true, config: {} }, cssModules: { enable: false } },
  },
}));
