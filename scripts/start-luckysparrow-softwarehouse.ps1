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
$StartupTimeoutSeconds = 180

function Test-PaperclipHealth {
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3200/api/health' -TimeoutSec 3
    return $health.status -eq 'ok'
  } catch {
    return $false
  }
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

function Test-ProcessDescendsFrom {
  param(
    [int]$ProcessId,
    [int]$RootProcessId
  )

  $cursor = $ProcessId
  for ($depth = 0; $depth -lt 24 -and $cursor -gt 0; $depth++) {
    if ($cursor -eq $RootProcessId) { return $true }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $cursor" -ErrorAction SilentlyContinue
    if (-not $processInfo) { return $false }
    $cursor = [int]$processInfo.ParentProcessId
  }
  return $false
}

function Test-PaperclipOwnedHealth {
  param(
    [int]$RootProcessId
  )

  if (-not (Test-PaperclipHealth)) { return $false }
  foreach ($listener in @(Get-NetTCPConnection -LocalPort 3200 -State Listen -ErrorAction SilentlyContinue)) {
    if (Test-ProcessDescendsFrom -ProcessId ([int]$listener.OwningProcess) -RootProcessId $RootProcessId) {
      return $true
    }
  }
  return $false
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

$listeners = Get-NetTCPConnection -LocalPort 3200,3201 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $listeners) {
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if ($processInfo -and $processInfo.CommandLine -like "*$Root*") {
    throw "LuckySparrow Software House already has a listener on port $($listener.LocalPort) as PID $($listener.OwningProcess). Run scripts/stop-luckysparrow-softwarehouse.ps1 first."
  }
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
