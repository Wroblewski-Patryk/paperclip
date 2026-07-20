$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'
$OrphanCleanupScript = Join-Path $PSScriptRoot 'cleanup-orphaned-embedded-postgres.ps1'

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

if (-not (Test-Path -LiteralPath $PidPath)) {
  if (Test-Path -LiteralPath $OrphanCleanupScript) {
    & $OrphanCleanupScript -Apply | Write-Output
  }
  Write-Output 'LuckySparrow Software House PID file is missing; registered service and verified listeners are stopped.'
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
  & taskkill.exe /PID $process.Id /T /F | Write-Output
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to stop LuckySparrow Software House process tree rooted at PID $pidValue"
  }
  Write-Output "Stopped LuckySparrow Software House process tree rooted at PID $pidValue"
} else {
  Write-Output "No running process found for PID $pidValue"
}

Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $OrphanCleanupScript) {
  & $OrphanCleanupScript -Apply | Write-Output
}
