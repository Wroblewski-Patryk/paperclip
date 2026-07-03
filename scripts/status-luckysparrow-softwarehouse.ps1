$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$PidPath = Join-Path $Root '.paperclip\runtime\paperclip-softwarehouse.pid'
$Url = 'http://127.0.0.1:3200/api/health'
$serviceProcess = $null

$ServiceDir = Join-Path $Root '.paperclip\runtime\home\instances\default\runtime-services'
if (Test-Path -LiteralPath $ServiceDir) {
  $service = Get-ChildItem -LiteralPath $ServiceDir -Filter '*.json' -ErrorAction SilentlyContinue |
    ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json } |
    Where-Object { $_.cwd -eq "$Root" -and $_.port -eq 3200 } |
    Select-Object -First 1
  if ($service -and $service.pid) {
    $serviceProcess = Get-Process -Id ([int]$service.pid) -ErrorAction SilentlyContinue
  }
}

if (Test-Path -LiteralPath $PidPath) {
  $pidValue = Get-Content -LiteralPath $PidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  $process = if ($pidValue) { Get-Process -Id ([int]$pidValue) -ErrorAction SilentlyContinue } else { $null }
  if ($serviceProcess) {
    Write-Output "Process: running PID $($serviceProcess.Id)"
  } elseif ($process) {
    Write-Output "Process: running PID $pidValue"
  } else {
    Write-Output "Process: not running, stale PID $pidValue"
  }
} else {
  if ($serviceProcess) {
    Write-Output "Process: running PID $($serviceProcess.Id)"
  } else {
    Write-Output 'Process: no PID file'
  }
}

try {
  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
  Write-Output "Health: HTTP $($response.StatusCode)"
} catch {
  Write-Output "Health: unavailable ($($_.Exception.Message))"
}

Write-Output 'URL: http://127.0.0.1:3200'
