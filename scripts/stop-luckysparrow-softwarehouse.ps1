$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'

Set-Location $Root
$env:PAPERCLIP_CONFIG = "$Root\.paperclip\config.json"
$env:PAPERCLIP_HOME = "$Root\.paperclip\runtime\home"
$env:PORT = '3200'
pnpm --filter '@paperclipai/server' exec tsx ../scripts/dev-service.ts stop

$listeners = Get-NetTCPConnection -LocalPort 3200,3201 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($processInfo -and $processInfo.CommandLine -like "*$Root*") {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Output "Stopped listener PID $($listener.OwningProcess) on port $($listener.LocalPort)"
  }
}

$repoProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -in @('node.exe', 'cmd.exe', 'powershell.exe', 'postgres.exe', 'esbuild.exe') -and
  $_.CommandLine -like "*$Root*" -and
  $_.ProcessId -ne $PID
}
foreach ($repoProcess in $repoProcesses) {
  Stop-Process -Id $repoProcess.ProcessId -Force -ErrorAction SilentlyContinue
  Write-Output "Stopped repo process PID $($repoProcess.ProcessId) ($($repoProcess.Name))"
}

if (-not (Test-Path -LiteralPath $PidPath)) {
  Write-Output 'LuckySparrow Software House PID file is missing.'
  exit 0
}

$pidValue = Get-Content -LiteralPath $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $pidValue) {
  Remove-Item -LiteralPath $PidPath -Force
  Write-Output 'LuckySparrow Software House PID file was empty.'
  exit 0
}

$process = Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $process.Id -Force
  Write-Output "Stopped LuckySparrow Software House PID $pidValue"
} else {
  Write-Output "No running process found for PID $pidValue"
}

Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
