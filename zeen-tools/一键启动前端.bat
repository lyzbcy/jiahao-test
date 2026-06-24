@echo off
chcp 65001 >nul
title 嘉豪值测试 · 本地预览

cd /d "%~dp0\.."

echo ========================================
echo   嘉豪值测试 · 启动本地预览
echo ========================================
echo.

REM 检测 node
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装：https://nodejs.org
  pause
  exit /b 1
)

echo 正在启动本地预览服务...
echo 浏览器将自动打开，如未打开请手动访问 http://localhost:8091
echo 按 Ctrl+C 可停止服务
echo.
node local-preview-server.js

pause
