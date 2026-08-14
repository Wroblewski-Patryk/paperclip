$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$LogDir = Join-Path $Root '.paperclip\runtime\logs'
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'
$OutPath = Join-Path $LogDir 'softwarehouse.out.log'
$ErrPath = Join-Path $LogDir 'softwarehouse.err.log'
$ConfigPath = Join-Path $Root '.paperclip\config.json'
$EnvPath = Join-Path $Root '.paperclip\.env'
$ServiceDir = Join-Path $Root '.paperclip\runtime\home\instances\default\runtime-services'
$OrphanCleanupScript = Join-Path $PSScriptRoot 'cleanup-orphaned-embedded-postgres.ps1'
$RuntimeInventoryScript = Join-Path $PSScriptRoot 'lib\windows-runtime-inventory.mjs'
$StartupTimeoutSeconds = 180

function Get-StrictPortListeners {
  param([int]$Port)
  $json = & node $RuntimeInventoryScript --port $Port
  if ($LASTEXITCODE -ne 0) { throw "Could not inventory strict port $Port." }
  $parsed = $json | ConvertFrom-Json
  if ($null -eq $parsed) { return @() }
  return @($parsed)
}

function Test-PaperclipHealth {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3200/api/health' -TimeoutSec 3
    return $health.status -eq 'ok'
  } catch {
    return $false
  }
}

function Test-ProcessDescendsFrom {
  param(
    [int]$ProcessId,
    [int]$AncestorProcessId
  )

  # The listener can be a pnpm/node descendant rather than the PowerShell
  # launcher itself. Walk only its verified PID ancestry so an unrelated Node
  # process on the strict port cannot satisfy the startup ownership check.
  $seen = [System.Collections.Generic.HashSet[int]]::new()
  $currentProcessId = $ProcessId
  for ($depth = 0; $depth -lt 32 -and $currentProcessId -gt 0; $depth++) {
    if ($currentProcessId -eq $AncestorProcessId) { return $true }
    if (-not $seen.Add($currentProcessId)) { return $false }
    $current = Get-CimInstance Win32_Process -Filter "ProcessId = $currentProcessId" -ErrorAction SilentlyContinue
    if (-not $current) { return $false }
    $currentProcessId = [int]$current.ParentProcessId
  }

  return $false
}

function Wait-PaperclipHealth {
  param(
    [int]$TimeoutSeconds = $StartupTimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    if (Test-PaperclipHealth) { return $true }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  return Test-PaperclipHealth
}

function Test-PaperclipOwnedHealth {
  param(
    [int]$RootProcessId
  )

  if (-not (Test-PaperclipHealth)) { return $false }
  $rootProcess = Get-Process -Id $RootProcessId -ErrorAction SilentlyContinue
  if (-not $rootProcess) { return $false }
  $listeners = @(Get-StrictPortListeners -Port 3200)
  return $listeners.Count -eq 1 -and
    $listeners[0].imageName -eq 'node.exe' -and
    (Test-ProcessDescendsFrom -ProcessId $listeners[0].pid -AncestorProcessId $RootProcessId)
}

function Wait-PaperclipOwnedHealth {
  param(
    [int]$RootProcessId,
    [int]$TimeoutSeconds = $StartupTimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    if (Test-PaperclipOwnedHealth -RootProcessId $RootProcessId) { return $true }
    $rootProcess = Get-Process -Id $RootProcessId -ErrorAction SilentlyContinue
    if (-not $rootProcess) { return $false }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  return Test-PaperclipOwnedHealth -RootProcessId $RootProcessId
}

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Root '.paperclip') -Force | Out-Null

if (Test-Path -LiteralPath $OrphanCleanupScript) {
  & $OrphanCleanupScript -Apply | Write-Output
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  Copy-Item -LiteralPath (Join-Path $Root 'softwarehouse\local-config.example.json') -Destination $ConfigPath
}
if (-not (Test-Path -LiteralPath $EnvPath)) {
  Copy-Item -LiteralPath (Join-Path $Root 'softwarehouse\local-env.example') -Destination $EnvPath
}

if (Test-Path -LiteralPath $PidPath) {
  $existingPid = Get-Content -LiteralPath $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existingPid) {
    $existing = Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue
    if ($existing -and (Test-PaperclipHealth)) {
      Write-Output "LuckySparrow Software House is already running as PID $existingPid"
      Write-Output "URL: http://127.0.0.1:3200"
      exit 0
    }
  }
}

if (Test-Path -LiteralPath $ServiceDir) {
  $existingService = Get-ChildItem -LiteralPath $ServiceDir -Filter '*.json' -ErrorAction SilentlyContinue |
    ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json } |
    Where-Object { $_.cwd -eq "$Root" -and $_.port -eq 3200 } |
    Select-Object -First 1
  if ($existingService -and $existingService.pid) {
    $existingServiceProcess = Get-Process -Id ([int]$existingService.pid) -ErrorAction SilentlyContinue
    if ($existingServiceProcess) {
      Set-Content -LiteralPath $PidPath -Value ([int]$existingService.pid)
      if (Test-PaperclipHealth) {
        Write-Output "LuckySparrow Software House is already running as PID $($existingService.pid)"
        Write-Output "URL: http://127.0.0.1:3200"
        exit 0
      }

      Write-Output "LuckySparrow Software House startup is already in progress as PID $($existingService.pid); waiting up to $StartupTimeoutSeconds seconds."
      if (Wait-PaperclipHealth) {
        Write-Output "LuckySparrow Software House became healthy as PID $($existingService.pid)"
        Write-Output "URL: http://127.0.0.1:3200"
        exit 0
      }

      throw "LuckySparrow Software House process $($existingService.pid) stayed alive but did not become healthy within $StartupTimeoutSeconds seconds. Inspect $OutPath and $ErrPath."
    }
  }
}

$listeners = @((Get-StrictPortListeners -Port 3200)) + @((Get-StrictPortListeners -Port 3201))
if ($listeners.Count -gt 0) {
  $listenerSummary = ($listeners | ForEach-Object { "PID $($_.pid) ($($_.imageName))" }) -join ', '
  throw "A listener already occupies strict Paperclip port 3200/3201: $listenerSummary. Run scripts/stop-luckysparrow-softwarehouse.ps1 first."
}

& node (Join-Path $Root 'scripts\ensure-softwarehouse-runtime-dependencies.mjs')
if ($LASTEXITCODE -ne 0) {
  throw "LuckySparrow Software House dependency links could not be restored from the managed offline store."
}

$command = @"
Set-Location '$Root'
`$env:PAPERCLIP_CONFIG = '$Root\.paperclip\config.json'
`$env:PAPERCLIP_HOME = '$Root\.paperclip\runtime\home'
`$env:PORT = '3200'
`$env:HEARTBEAT_SCHEDULER_ENABLED = 'true'
`$env:HEARTBEAT_SCHEDULER_INTERVAL_MS = '30000'
`$env:PAPERCLIP_MIGRATION_AUTO_APPLY = 'true'
`$env:PAPERCLIP_MIGRATION_PROMPT = 'never'
# The autonomous control plane must not restart while its own agents edit this
# checkout. Apply validated changes through an explicit controlled restart.
pnpm dev:once
"@

$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
$process = Start-Process `
  -FilePath 'powershell.exe' `
  -ArgumentList @('-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand) `
  -WorkingDirectory "$Root" `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutPath `
  -RedirectStandardError $ErrPath `
  -PassThru

Start-Sleep -Seconds 3
$servicePid = $process.Id
Set-Content -LiteralPath $PidPath -Value $servicePid
if (-not (Wait-PaperclipOwnedHealth -RootProcessId $process.Id)) {
  throw "LuckySparrow Software House process $($process.Id) did not own a healthy descendant on strict port 3200 within $StartupTimeoutSeconds seconds. Inspect $OutPath and $ErrPath."
}

if (Test-Path -LiteralPath $ServiceDir) {
  $service = Get-ChildItem -LiteralPath $ServiceDir -Filter '*.json' -ErrorAction SilentlyContinue |
    ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json } |
    Where-Object { $_.cwd -eq "$Root" -and $_.port -eq 3200 } |
    Select-Object -First 1
  if ($service -and $service.pid) {
    $servicePid = [int]$service.pid
    Set-Content -LiteralPath $PidPath -Value $servicePid
  }
}
Write-Output "Started LuckySparrow Software House as PID $servicePid"
Write-Output "URL: http://127.0.0.1:3200"
Write-Output "Logs: $LogDir"
