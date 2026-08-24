$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'
$OrphanCleanupScript = Join-Path $PSScriptRoot 'cleanup-orphaned-embedded-postgres.ps1'
$RuntimeInventoryScript = Join-Path $PSScriptRoot 'lib\windows-runtime-inventory.mjs'

function Get-ProcessAncestry {
  param([int]$ProcessId)

  $result = @()
  $seen = [System.Collections.Generic.HashSet[int]]::new()
  $currentProcessId = $ProcessId
  for ($depth = 0; $depth -lt 32 -and $currentProcessId -gt 0; $depth++) {
    if (-not $seen.Add($currentProcessId)) { break }
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $currentProcessId" -ErrorAction SilentlyContinue
    if (-not $current) { break }
    $result += $current
    $currentProcessId = [int]$current.ParentProcessId
  }
  return @($result)
}

function Get-VerifiedRuntimeSupervisor {
  param(
    [int]$ListenerProcessId,
    [string]$RepositoryRoot
  )

  $rootNeedle = $RepositoryRoot.Replace('\', '/').ToLowerInvariant()
  $matches = @(Get-ProcessAncestry -ProcessId $ListenerProcessId | Where-Object {
    $commandLine = [string]$_.CommandLine
    $normalized = $commandLine.Replace('\', '/').ToLowerInvariant()
    $normalized.Contains($rootNeedle) -and
      $normalized -match 'scripts/dev-(runner|watch)\.ts'
  })
  return $matches | Select-Object -Last 1
}

function Stop-VerifiedProcessTree {
  param([int]$RootProcessId)

  $snapshot = @(Get-CimInstance Win32_Process)
  $queue = [System.Collections.Generic.Queue[object]]::new()
  $queue.Enqueue([pscustomobject]@{ ProcessId = $RootProcessId; Depth = 0 })
  $tree = @()
  $seen = [System.Collections.Generic.HashSet[int]]::new()

  while ($queue.Count -gt 0) {
    $item = $queue.Dequeue()
    $processId = [int]$item.ProcessId
    if (-not $seen.Add($processId)) { continue }
    $process = $snapshot | Where-Object { $_.ProcessId -eq $processId } | Select-Object -First 1
    if (-not $process) { continue }
    $tree += [pscustomobject]@{ ProcessId = $processId; Depth = [int]$item.Depth }
    $snapshot | Where-Object { $_.ParentProcessId -eq $processId } | ForEach-Object {
      $queue.Enqueue([pscustomobject]@{ ProcessId = [int]$_.ProcessId; Depth = [int]$item.Depth + 1 })
    }
  }

  foreach ($item in @($tree | Sort-Object Depth -Descending)) {
    Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue
  }
  return $tree.Count
}

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
  $supervisor = Get-VerifiedRuntimeSupervisor -ListenerProcessId ([int]$listener.pid) -RepositoryRoot "$Root"
  if ($supervisor) {
    $stoppedCount = Stop-VerifiedProcessTree -RootProcessId ([int]$supervisor.ProcessId)
    Write-Output "Stopped verified Paperclip runtime tree rooted at PID $($supervisor.ProcessId) ($stoppedCount processes)"
  } else {
    Stop-Process -Id ([int]$listener.pid) -Force -ErrorAction Stop
    Write-Output "Stopped verified node.exe listener PID $($listener.pid) on port 3200"
  }
}

Start-Sleep -Milliseconds 500
$remainingListeners = @(& node $RuntimeInventoryScript --port 3200 | ConvertFrom-Json)
if ($remainingListeners.Count -gt 0) {
  $remainingSummary = ($remainingListeners | ForEach-Object { "PID $($_.pid) ($($_.imageName))" }) -join ', '
  throw "Refusing incomplete stop: strict port 3200 was recreated by $remainingSummary."
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
