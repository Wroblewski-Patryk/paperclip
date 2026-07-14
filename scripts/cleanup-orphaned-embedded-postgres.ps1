[CmdletBinding()]
param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RootNeedle = $Root.Replace('\', '/').ToLowerInvariant()
$Candidates = @()

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

  $Candidates += [pscustomobject]@{
    processId = [int]$process.ProcessId
    parentProcessId = [int]$process.ParentProcessId
    role = 'io_worker'
  }
}

$Stopped = @()
if ($Apply) {
  foreach ($candidate in $Candidates) {
    $live = Get-Process -Id $candidate.processId -ErrorAction SilentlyContinue
    if (-not $live) { continue }
    Stop-Process -Id $candidate.processId -Force -ErrorAction Stop
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
