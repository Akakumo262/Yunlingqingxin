@echo off
chcp 65001 >nul
title 云岭青心 演示
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo 没有找到 Node.js。请先到 https://nodejs.org 安装长期支持版（22 或更高），装好后再双击本文件。
  pause
  exit /b 1
)

if not exist "node_modules" goto setup
if not exist "frontend\miniapp\node_modules" goto setup
goto demo

:setup
echo 第一次运行，先安装依赖，需要几分钟……
call npm run setup
if errorlevel 1 (
  echo.
  echo 安装没有成功。请检查网络后再双击本文件。
  pause
  exit /b 1
)

:demo
start "" /min cmd /c "timeout /t 25 >nul & start http://localhost:5173 & start http://localhost:10086"
call npm run demo
pause
