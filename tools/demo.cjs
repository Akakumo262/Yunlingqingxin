#!/usr/bin/env node
/**
 * 一键演示：同时启动 后端（3000）、Web（5173）、小程序 H5 预览（10086）。
 * 用法：npm run demo               用内置的模拟后端
 *       npm run demo -- --api      改用 backend/ 里的真实后端（需按 backend/README.md 准备好数据库）
 *       npm run demo -- --no-miniapp / --no-web   只起一部分
 * 按 Ctrl+C 一起停掉。3000 端口上已经有后端在跑时，不再重复启动。
 */
const { spawn, spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const miniapp = path.join(root, 'frontend', 'miniapp');

if (!existsSync(path.join(root, 'node_modules')) || (!has('--no-miniapp') && !existsSync(path.join(miniapp, 'node_modules')))) {
  console.error('还没有安装依赖。请先执行：npm run setup');
  process.exit(1);
}

const ping = (url) => new Promise((resolve) => {
  const req = http.get(url, { timeout: 800 }, (res) => (res.resume(), resolve(res.statusCode < 500)));
  req.on('error', () => resolve(false)).on('timeout', () => (req.destroy(), resolve(false)));
});
async function waitFor(url, seconds) {
  for (let i = 0; i < seconds * 2; i++) {
    if (await ping(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const children = [];
function start(tag, command, cmdArgs, cwd) {
  const child = command === process.execPath
    ? spawn(command, cmdArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn([command, ...cmdArgs].join(' '), { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  // 打包器的进度条和反复出现的等待提示不往外打，只留有用的行
  const noise = /\x1b\[[0-9]*[AK]|wait until bundle finished|Webpack .*building|modules \d+ active/;
  // 小程序的打包器每次编译都会打一大段体积统计，只留“编译结果”和报错
  const keep = tag === '小程序' ? /compiled|error|失败|Loopback/i : /./;
  const print = (buf) => String(buf).split(/\r?\n/).filter((l) => l.trim() && l.length < 300 && !noise.test(l) && keep.test(l)).forEach((l) => console.log(`[${tag}] ${l}`));
  child.stdout.on('data', print);
  child.stderr.on('data', print);
  child.on('exit', (code) => { if (!stopping && code) console.log(`[${tag}] 已退出（${code}）`); });
  children.push(child);
}
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    // Windows 下要连同子进程一起结束，否则端口不会释放
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    else c.kill('SIGTERM');
  }
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

(async () => {
  console.log('构建契约包…');
  if (spawnSync('npm run build:contracts', { cwd: root, stdio: 'inherit', shell: true }).status !== 0) process.exit(1);

  const health = 'http://localhost:3000/api/v1/health';
  if (await ping(health)) console.log('3000 端口上已经有后端在运行，直接使用它。');
  else if (has('--api')) start('后端', 'npm', ['run', 'dev', '-w', '@yunling/backend'], root);
  else start('模拟后端', process.execPath, ['contracts/tools/mock-server.cjs'], root);
  if (!(await waitFor(health, 40))) console.log('后端 40 秒内没有就绪。前端会自动改用内置的演示数据，三端之间的联动看不到。');

  // 已经在运行的就不再重复启动，避免换到别的端口上
  if (!has('--no-web')) (await ping('http://localhost:5173')) ? console.log('5173 端口上的 Web 已经在运行。') : start('Web', 'npm', ['run', 'dev', '-w', '@yunling/web'], root);
  if (!has('--no-miniapp')) (await ping('http://localhost:10086')) ? console.log('10086 端口上的小程序预览已经在运行。') : start('小程序', 'npm', ['run', 'dev:h5'], miniapp);

  const webOk = has('--no-web') || (await waitFor('http://localhost:5173', 60));
  const miniOk = has('--no-miniapp') || (await waitFor('http://localhost:10086', 180));
  console.log(`
────────────────────────────────────────────────────
  教师端 / 管理端   http://localhost:5173   ${webOk ? '' : '（还没就绪，稍等再刷新）'}
  学生端 / 家长端   http://localhost:10086  ${miniOk ? '' : '（还没就绪，稍等再刷新）'}
  后端接口          http://localhost:3000/api/v1

  登录页可以直接点身份进入，数据全部是合成的。
  演示路线见 README 的“演示时可以这样走一遍”。
  按 Ctrl+C 全部停止。
────────────────────────────────────────────────────`);
  if (children.length === 0) console.log('三个服务本来就都在运行，这里没有新启动任何东西。');
})();
