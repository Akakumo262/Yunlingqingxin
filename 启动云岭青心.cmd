@echo off
setlocal
set "ROOT=D:\Research Data\2026yunlingqinxing\具体实现\Yunlingqingxin"

echo 正在启动云岭青心，请保持这三个窗口不要关闭...
start "云岭青心-后端" /D "%ROOT%" cmd /k "npm.cmd run dev:api"
start "云岭青心-Web" /D "%ROOT%" cmd /k "npm.cmd run dev -w @yunling/web -- --host 0.0.0.0"
start "云岭青心-学生家长H5" /D "%ROOT%\frontend\miniapp" cmd /k "npm.cmd run dev:h5"

timeout /t 8 /nobreak >nul
start "" "http://127.0.0.1:5173/"
start "" "http://127.0.0.1:10086/#/pages/login/index"

echo.
echo 教师/管理端: http://127.0.0.1:5173/
echo 学生/家长端: http://127.0.0.1:10086/#/pages/login/index
echo 后端健康检查: http://127.0.0.1:3000/api/v1/health
echo.
pause
