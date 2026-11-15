#!/usr/bin/env node
/**
 * 全量自检：提交之前、拿到代码包之后各跑一次。
 *   一、构建契约包
 *   二、后端骨架、Web、小程序的类型检查
 *   三、在临时端口起一个全新的模拟后端，跑完 68 项验收
 * 用法：npm run check            全部
 *       npm run check -- --build 再加上 Web 和微信小程序的正式构建（慢一些）
 */
const { spawn, spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const miniapp = path.join(root, 'frontend', 'miniapp');
const withBuild = process.argv.includes('--build');
const results = [];

function run(name, command, args, cwd = root, env) {
  process.stdout.write(`\n── ${name}\n`);
  const t = Date.now();
  // node 本身直接执行（安装路径里可能有空格）；npm、npx 走命令行
  const opts = { cwd, stdio: 'inherit', env: { ...process.env, ...env } };
  const ok = (command === process.execPath ? spawnSync(command, args, opts) : spawnSync([command, ...args].join(' '), { ...opts, shell: true })).status === 0;
  results.push({ name, ok, seconds: ((Date.now() - t) / 1000).toFixed(1) });
  return ok;
}
const ping = (url) => new Promise((resolve) => {
  const req = http.get(url, { timeout: 800 }, (res) => (res.resume(), resolve(res.statusCode === 200)));
  req.on('error', () => resolve(false)).on('timeout', () => (req.destroy(), resolve(false)));
});

(async () => {
  if (!existsSync(path.join(root, 'node_modules'))) {
    console.error('还没有安装依赖。请先执行：npm run setup');
    process.exit(1);
  }
  const hasMiniapp = existsSync(path.join(miniapp, 'node_modules'));

  if (!run('构建契约包', 'npm', ['run', 'build:contracts'])) return finish();
  run('后端骨架类型检查', 'npx', ['tsc', '--noEmit', '-p', 'backend']);
  run('Web 类型检查', 'npx', ['tsc', '--noEmit', '-p', 'frontend/web']);
  if (hasMiniapp) run('小程序类型检查', 'npx', ['tsc', '--noEmit', '-p', '.'], miniapp);
  else results.push({ name: '小程序类型检查（未安装依赖，已跳过）', ok: true, seconds: '0' });

  // 验收会写入数据，所以每次都起一个全新的模拟后端，用完即停；不占用 3000 端口
  const port = 3900 + Math.floor(Math.random() * 90);
  const mock = spawn(process.execPath, ['contracts/tools/mock-server.cjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    up = await ping(`http://localhost:${port}/api/v1/health`);
    if (!up) await new Promise((r) => setTimeout(r, 250));
  }
  if (up) run('68 项验收（对全新的模拟后端）', process.execPath, ['contracts/tools/accept.cjs', `http://localhost:${port}`]);
  else results.push({ name: '68 项验收（模拟后端没有启动）', ok: false, seconds: '0' });
  mock.kill();

  if (withBuild) {
    run('Web 正式构建', 'npm', ['run', 'build', '-w', '@yunling/web']);
    if (hasMiniapp) run('微信小程序构建', 'npm', ['run', 'build:weapp'], miniapp);
  }
  finish();
})();

function finish() {
  console.log('\n════════ 自检结果 ════════');
  for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}  ${r.seconds}s`);
  const bad = results.filter((r) => !r.ok).length;
  console.log(bad ? `\n有 ${bad} 项没有通过，往上翻看对应的输出。` : '\n全部通过。');
  process.exit(bad ? 1 : 0);
}
