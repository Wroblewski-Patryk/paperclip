$ErrorActionPreference = 'Stop'

$CanonicalPort = 54329
$DynamicStartPort = 55000
$DynamicPortCount = 10000
$ResultPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')) '.paperclip\runtime\postgres-port-repair.json'
$ManagedServices = @('hns', 'vmcompute', 'winnat')

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'This repair must run from an elevated Windows session.'
}

function Get-ExcludedTcpPortRanges {
  param([string]$Family)

  $ranges = @()
  foreach ($line in @(& netsh int $Family show excludedportrange protocol=tcp)) {
    if ($line -notmatch '^\s*(\d+)\s+(\d+)(?:\s+\*)?\s*$') { continue }
    $ranges += [pscustomobject]@{
      Family = $Family
      StartPort = [int]$Matches[1]
      EndPort = [int]$Matches[2]
    }
  }
  return $ranges
}

function Invoke-NetshChecked {
  param([string[]]$Arguments)

  $output = @(& netsh @Arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "netsh $($Arguments -join ' ') failed with exit code $LASTEXITCODE`: $($output -join ' | ')"
  }
  return $output
}

function Test-CanonicalPortExcluded {
  return @(foreach ($family in @('ipv4', 'ipv6')) {
    Get-ExcludedTcpPortRanges -Family $family |
      Where-Object { $CanonicalPort -ge $_.StartPort -and $CanonicalPort -le $_.EndPort }
  })
}

function Test-CanonicalPortBind {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $CanonicalPort)
  try {
    $listener.Start()
  } finally {
    $listener.Stop()
  }
}

$initialServiceStates = @{}
foreach ($serviceName in $ManagedServices) {
  $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
  if ($service) { $initialServiceStates[$serviceName] = $service.Status.ToString() }
}

$result = [ordered]@{
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
  canonicalPort = $CanonicalPort
  dynamicRange = [ordered]@{ startPort = $DynamicStartPort; numberOfPorts = $DynamicPortCount }
  initialServiceStates = $initialServiceStates
  exclusionsBefore = @(Test-CanonicalPortExcluded)
  exclusionsRemoved = @()
  exclusionsAfter = @()
  bindVerified = $false
  completedAt = $null
}

try {
  foreach ($serviceName in @('winnat', 'vmcompute', 'hns')) {
    if ($initialServiceStates[$serviceName] -eq 'Running') {
      Stop-Service -Name $serviceName -Force -ErrorAction Stop
    }
  }

  foreach ($family in @('ipv4', 'ipv6')) {
    Invoke-NetshChecked -Arguments @(
      'int', $family, 'set', 'dynamicport', 'tcp',
      "startport=$DynamicStartPort", "numberofports=$DynamicPortCount"
    ) | Out-Null

    $conflicts = @(Get-ExcludedTcpPortRanges -Family $family |
      Where-Object { $CanonicalPort -ge $_.StartPort -and $CanonicalPort -le $_.EndPort })
    foreach ($conflict in $conflicts) {
      $count = $conflict.EndPort - $conflict.StartPort + 1
      Invoke-NetshChecked -Arguments @(
        'int', $family, 'delete', 'excludedportrange', 'protocol=tcp',
        "startport=$($conflict.StartPort)", "numberofports=$count", 'store=active'
      ) | Out-Null
      $result.exclusionsRemoved += $conflict
    }
  }
} finally {
  foreach ($serviceName in @('hns', 'vmcompute', 'winnat')) {
    if ($initialServiceStates[$serviceName] -eq 'Running') {
      Start-Service -Name $serviceName -ErrorAction Stop
    }
  }
}

$result.exclusionsAfter = @(Test-CanonicalPortExcluded)
if ($result.exclusionsAfter.Count -gt 0) {
  throw "Windows still excludes canonical PostgreSQL port $CanonicalPort after network-service repair."
}

Test-CanonicalPortBind
$result.bindVerified = $true
$result.completedAt = (Get-Date).ToUniversalTime().ToString('o')
New-Item -ItemType Directory -Path (Split-Path $ResultPath) -Force | Out-Null
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ResultPath -Encoding utf8
$result | ConvertTo-Json -Depth 8
