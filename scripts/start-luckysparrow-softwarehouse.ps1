$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$LogDir = Join-Path $Root '.paperclip\runtime\logs'
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'
$OutPath = Join-Path $LogDir 'softwarehouse.out.log'
$ErrPath = Join-Path $LogDir 'softwarehouse.err.log'
$ConfigPath = Join-Path $Root '.paperclip\config.json'
$EnvPath = Join-Path $Root '.paperclip\.env'
$ServiceDir = Join-Path $Root '.paperclip\runtime\home\instances\default\runtime-services'

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Root '.paperclip') -Force | Out-Null

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
    if ($existing) {
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
      Write-Output "LuckySparrow Software House is already running as PID $($existingService.pid)"
      Write-Output "URL: http://127.0.0.1:3200"
      exit 0
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
Set-Location '$Root\server'
`$env:PAPERCLIP_CONFIG = '$Root\.paperclip\config.json'
`$env:PAPERCLIP_HOME = '$Root\.paperclip\runtime\home'
`$env:PORT = '3200'
`$env:HEARTBEAT_SCHEDULER_ENABLED = 'true'
`$env:HEARTBEAT_SCHEDULER_INTERVAL_MS = '30000'
`$env:PAPERCLIP_MIGRATION_AUTO_APPLY = 'true'
`$env:PAPERCLIP_MIGRATION_PROMPT = 'never'
pnpm dev
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
if (Test-Path -LiteralPath $ServiceDir) {
  $service = Get-ChildItem -LiteralPath $ServiceDir -Filter '*.json' -ErrorAction SilentlyContinue |
    ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json } |
    Where-Object { $_.cwd -eq "$Root" -and $_.port -eq 3200 } |
    Select-Object -First 1
  if ($service -and $service.pid) {
    $servicePid = [int]$service.pid
  }
}

Set-Content -LiteralPath $PidPath -Value $servicePid
Write-Output "Started LuckySparrow Software House as PID $servicePid"
Write-Output "URL: http://127.0.0.1:3200"
Write-Output "Logs: $LogDir"
