# restart-server.ps1 — 杀掉占用预览端口的进程，重启服务器
$conns = Get-NetTCPConnection -LocalPort 8091 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Output ("killed PID " + $c.OwningProcess) }
  catch {}
}
