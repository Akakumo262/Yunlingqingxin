const fs = require('node:fs');
const path = require('node:path');

// npm workspace 脚本通常从仓库根目录运行；直接进入 backend 运行时也要能找到同一份配置。
const candidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), 'backend', '.env.local'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../.env.local'),
];

for (const file of [...new Set(candidates)]) {
  if (!fs.existsSync(file)) continue;
  process.loadEnvFile(file);
  break;
}
