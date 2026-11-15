#!/usr/bin/env node
/**
 * 打代码包：把当前已提交的内容打成一个 zip，发给拿不到仓库的成员。
 * 用法：npm run pack
 * 包里是源码和文档，不含 node_modules、构建产物、密钥和演示素材（和仓库里入库的内容完全一致）。
 * 对方解压后执行 npm run setup，再 npm run demo。
 */
const { spawnSync } = require('node:child_process');
const { mkdirSync, statSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });

if (git(['rev-parse', '--is-inside-work-tree']).status !== 0) {
  console.error('这里不是 git 仓库，无法打包。');
  process.exit(1);
}
const dirty = git(['status', '--porcelain']).stdout.trim();
if (dirty) console.log('提示：有还没提交的改动，它们不会进包。包里是最近一次提交的内容。\n');

const { version } = require(path.join(root, 'package.json'));
const sha = git(['rev-parse', '--short', 'HEAD']).stdout.trim();
const d = new Date(), date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const name = `yunling-qingxin-v${version}-${date}-${sha}`;
const out = path.join(root, 'release', `${name}.zip`);
mkdirSync(path.dirname(out), { recursive: true });

const r = spawnSync('git', ['archive', '--format=zip', `--prefix=${name}/`, '-o', out, 'HEAD'], { cwd: root, stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
const files = git(['ls-files']).stdout.trim().split('\n').length;
console.log(`已生成：${out}\n${files} 个文件，${(statSync(out).size / 1024 / 1024).toFixed(2)} MB，对应提交 ${sha}。`);
