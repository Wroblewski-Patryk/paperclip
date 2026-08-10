$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'
$OrphanCleanupScript = Join-Path $PSScriptRoot 'cleanup-orphaned-embedded-postgres.ps1'
$RuntimeInventoryScript = Join-Path $PSScriptRoot 'lib\windows-runtime-inventory.mjs'

Set-Location $Root
$env:PAPERCLIP_CONFIG = "$Root\.paperclip\config.json"
$env:PAPERCLIP_HOME = "$Root\.paperclip\runtime\home"
$env:PORT = '3200'
pnpm --filter '@paperclipai/server' exec tsx ../scripts/dev-service.ts stop

$json = & node $RuntimeInventoryScript --port 3200
if ($LASTEXITCODE -ne 0) { throw 'Could not inventory strict Paperclip port 3200.' }
$parsedListeners = $json | ConvertFrom-Json
$listeners = if ($null -eq $parsedListeners) { @() } else { @($parsedListeners) }
if ($listeners.Count -gt 1) { throw "Refusing stop: strict port 3200 has $($listeners.Count) listener PIDs." }
foreach ($listener in $listeners) {
  if ($listener.imageName -ne 'node.exe') {
    throw "Refusing stop: strict port 3200 is owned by $($listener.imageName) PID $($listener.pid), not node.exe."
  }
  Stop-Process -Id ([int]$listener.pid) -Force -ErrorAction Stop
  Write-Output "Stopped verified node.exe listener PID $($listener.pid) on port 3200"
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

# The registry/PID file may be stale after a child-process replacement. Never
# kill that PID blindly: the exact listener above is the authoritative target.
Write-Output "Discarding recorded service PID $pidValue after exact listener stop."

Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $OrphanCleanupScript) {
  & $OrphanCleanupScript -Apply | Write-Output
}
