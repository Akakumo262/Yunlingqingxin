#!/usr/bin/env node
/**
 * 一键安装：根目录依赖 + 小程序依赖 + 构建契约包。
 * 用法：npm run setup            官方源装不上时自动换国内镜像
 *       npm run setup -- --mirror  直接用国内镜像
 */
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const MIRROR = '--registry=https://registry.npmmirror.com';
let useMirror = process.argv.includes('--mirror');

const major = Number(process.versions.node.split('.')[0]);
if (major < 22) {
  console.error(`需要 Node 22 或更高版本，当前是 ${process.versions.node}。请到 https://nodejs.org 安装长期支持版后重试。`);
  process.exit(1);
}

function npm(args, cwd) {
  const full = useMirror ? [...args, MIRROR] : args;
  console.log(`\n> npm ${full.join(' ')}   （${path.relative(root, cwd) || '根目录'}）`);
  return spawnSync(`npm ${full.join(' ')}`, { cwd, stdio: 'inherit', shell: true }).status === 0;
}
function install(cwd) {
  if (npm(['install', '--no-audit', '--no-fund'], cwd)) return;
  if (useMirror) fail('依赖安装失败。请检查网络后重新执行 npm run setup。');
  console.log('\n官方源没有装成功，改用国内镜像再试一次。');
  useMirror = true;
  if (!npm(['install', '--no-audit', '--no-fund'], cwd)) fail('依赖安装失败。请检查网络后重新执行 npm run setup。');
}
function fail(msg) {
  console.error(`\n${msg}`);
  process.exit(1);
}

console.log('一、安装根目录依赖（契约、后端骨架、Web）');
install(root);
console.log('\n二、安装小程序依赖');
install(path.join(root, 'frontend', 'miniapp'));
console.log('\n三、构建契约包');
if (spawnSync('npm run build:contracts', { cwd: root, stdio: 'inherit', shell: true }).status !== 0) fail('契约包构建失败。');
if (!existsSync(path.join(root, 'contracts', 'dist', 'index.js'))) fail('没有找到 contracts/dist/index.js。');

console.log(`
安装完成。接下来：
  npm run demo     一条命令启动模拟后端、Web 和小程序预览
  npm run check    一条命令做全量自检（类型检查 + 68 项验收）
  按自己的分工读 docs/成员上手指南.md
`);
