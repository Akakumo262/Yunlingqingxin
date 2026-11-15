#!/usr/bin/env bash
# macOS / Linux：在终端里执行 bash 启动演示.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "没有找到 Node.js。请先安装 22 或更高版本：https://nodejs.org"; exit 1; }
if [ ! -d node_modules ] || [ ! -d frontend/miniapp/node_modules ]; then
  echo "第一次运行，先安装依赖，需要几分钟……"
  npm run setup
fi
npm run demo
