@echo off
chcp 65001 >nul
title 嘉豪值测试 · 停止预览

echo ========================================
echo   嘉豪值测试 · 停止本地预览
echo ========================================
echo.

REM 杀掉占用预览端口的 node 进程（8091-8095）
for %%p in (8091 8092 8093 8094 8095) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr "LISTENING"') do (
    echo 正在停止端口 %%p 上的进程 PID %%a ...
    taskkill /F /PID %%a >nul 2>nul
  )
)

echo.
echo 已尝试停止所有预览服务。
pause
