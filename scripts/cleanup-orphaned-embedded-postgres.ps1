[CmdletBinding()]
param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RootNeedle = $Root.Replace('\', '/').ToLowerInvariant()
$Candidates = @()
$CandidateIds = [System.Collections.Generic.HashSet[int]]::new()

function Add-Candidate {
  param(
    [int]$ProcessId,
    [int]$ParentProcessId,
    [string]$Role
  )

  if (-not $CandidateIds.Add($ProcessId)) { return }
  $script:Candidates += [pscustomobject]@{
    processId = $ProcessId
    parentProcessId = $ParentProcessId
    role = $Role
  }
}

# A crashed Windows Postgres master can disappear while its fork children keep
# the canonical listener alive. In that state the TCP table still reports the
# missing master PID, so the old io_worker-only sweep cannot identify the tree.
$ConfigPath = Join-Path $Root '.paperclip\config.json'
$CanonicalPort = 54329
if (Test-Path -LiteralPath $ConfigPath) {
  $Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  if ($Config.database.embeddedPostgresStrictPort -eq $true -and $Config.database.embeddedPostgresPort) {
    $CanonicalPort = [int]$Config.database.embeddedPostgresPort
  }
}

$CanonicalListeners = @(Get-NetTCPConnection -State Listen -LocalPort $CanonicalPort -ErrorAction SilentlyContinue)
foreach ($ownerPid in @($CanonicalListeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
  if (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue) { continue }

  foreach ($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $ownerPid" -ErrorAction SilentlyContinue)) {
    $childCommandLine = ([string]$child.CommandLine).Replace('\', '/').ToLowerInvariant()
    if ($child.Name -ne 'postgres.exe') { continue }
    if (-not $childCommandLine.Contains($RootNeedle)) { continue }
    Add-Candidate -ProcessId ([int]$child.ProcessId) -ParentProcessId ([int]$ownerPid) -Role 'canonical_orphan_child'
  }
}

foreach ($process in @(Get-CimInstance Win32_Process -Filter "Name = 'postgres.exe'" -ErrorAction SilentlyContinue)) {
  $commandLine = [string]$process.CommandLine
  $normalizedCommandLine = $commandLine.Replace('\', '/').ToLowerInvariant()
  if (-not $normalizedCommandLine.Contains($RootNeedle)) { continue }
  if ($commandLine -notmatch '--forkchild="io_worker"') { continue }

  $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($process.ParentProcessId)" -ErrorAction SilentlyContinue
  $parentCommandLine = if ($parent) { ([string]$parent.CommandLine).Replace('\', '/').ToLowerInvariant() } else { '' }
  $hasManagedPostgresParent =
    $parent -and
    $parent.Name -eq 'postgres.exe' -and
    $parentCommandLine.Contains($RootNeedle)
  if ($hasManagedPostgresParent) { continue }

  Add-Candidate -ProcessId ([int]$process.ProcessId) -ParentProcessId ([int]$process.ParentProcessId) -Role 'io_worker'
}

$Stopped = @()
if ($Apply) {
  foreach ($candidate in $Candidates) {
    $live = Get-Process -Id $candidate.processId -ErrorAction SilentlyContinue
    if (-not $live) { continue }
    Stop-Process -Id $candidate.processId -ErrorAction Stop
    $Stopped += $candidate.processId
  }
}

[pscustomobject]@{
  mode = if ($Apply) { 'apply' } else { 'dry-run' }
  repoRoot = $Root
  orphanCount = $Candidates.Count
  orphanProcessIds = @($Candidates | ForEach-Object { $_.processId })
  stoppedCount = $Stopped.Count
  stoppedProcessIds = $Stopped
} | ConvertTo-Json -Depth 4
