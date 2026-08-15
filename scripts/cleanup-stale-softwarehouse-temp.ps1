param(
  [switch]$Apply,
  [ValidateRange(1, 720)]
  [int]$MinAgeHours = 6
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$resolvedTempRoot = (Resolve-Path -LiteralPath $tempRoot -ErrorAction Stop).Path.TrimEnd('\')
if ($tempRoot -ne $resolvedTempRoot) {
  throw "Temporary root does not resolve to itself: $tempRoot -> $resolvedTempRoot"
}

$cutoff = (Get-Date).AddHours(-$MinAgeHours)
$namePattern = '^(?i)(paperclip|soar|roost|featherly|vitest|pglite|postgres)'
$candidates = @(
  Get-ChildItem -LiteralPath $tempRoot -Force -ErrorAction Stop |
    Where-Object { $_.Name -match $namePattern -and $_.LastWriteTime -lt $cutoff }
)
if ($candidates.Count -gt 1000) {
  throw "Refusing to inspect an unexpected candidate count: $($candidates.Count)"
}

$processCommandLines = (Get-CimInstance Win32_Process -ErrorAction Stop | ForEach-Object CommandLine) -join "`n"
$canonicalSkillTarget = Join-Path $repoRoot 'skills\paperclip'
$allowedExternalTargets = @([IO.Path]::GetFullPath($canonicalSkillTarget).TrimEnd('\'))
$junctions = @()
$manifest = @()

foreach ($candidate in $candidates) {
  $fullPath = [IO.Path]::GetFullPath($candidate.FullName).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($fullPath) -ne $tempRoot) {
    throw "Candidate escaped the temporary root: $fullPath"
  }
  if ($candidate.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "Top-level candidate is a reparse point: $fullPath"
  }
  if ($processCommandLines.IndexOf($fullPath, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
    throw "Candidate is referenced by a live process: $fullPath"
  }

  $descendants = @()
  if ($candidate.PSIsContainer) {
    $descendants = @(Get-ChildItem -LiteralPath $fullPath -Force -Recurse -ErrorAction Stop)
  }
  $candidateJunctions = @($descendants | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
  foreach ($junction in $candidateJunctions) {
    $junctionPath = [IO.Path]::GetFullPath($junction.FullName)
    if (-not $junctionPath.StartsWith($fullPath + '\', [StringComparison]::OrdinalIgnoreCase)) {
      throw "Junction escaped its candidate: $junctionPath"
    }
    if ($junction.LinkType -ne 'Junction') {
      throw "Unsupported reparse point $($junction.LinkType): $junctionPath"
    }
    foreach ($target in @($junction.Target)) {
      $targetPath = [IO.Path]::GetFullPath($target).TrimEnd('\')
      $insideTemp = $targetPath.StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase)
      if (-not $insideTemp -and $allowedExternalTargets -notcontains $targetPath) {
        throw "Unexpected junction target: $targetPath"
      }
    }
    $junctions += $junction
  }

  $manifest += [pscustomobject]@{
    path = $fullPath
    type = $(if ($candidate.PSIsContainer) { 'directory' } else { 'file' })
    lastWriteTime = $candidate.LastWriteTime
    junctionCount = $candidateJunctions.Count
  }
}

if ($Apply -and $candidates.Count -gt 0) {
  $externalTargetsBefore = @{}
  foreach ($target in $allowedExternalTargets) {
    $externalTargetsBefore[$target] = Test-Path -LiteralPath $target -PathType Container
  }

  foreach ($junction in $junctions | Sort-Object { $_.FullName.Length } -Descending) {
    Remove-Item -LiteralPath $junction.FullName -Force -ErrorAction Stop
    if (Test-Path -LiteralPath $junction.FullName) {
      throw "Junction still exists after unlinking: $($junction.FullName)"
    }
  }

  foreach ($target in $allowedExternalTargets) {
    if ($externalTargetsBefore[$target] -and -not (Test-Path -LiteralPath $target -PathType Container)) {
      throw "External junction target was affected: $target"
    }
  }

  foreach ($candidate in $candidates) {
    if ($candidate.PSIsContainer) {
      $remainingReparsePoints = @(
        Get-ChildItem -LiteralPath $candidate.FullName -Force -Recurse -ErrorAction Stop |
          Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }
      )
      if ($remainingReparsePoints.Count -gt 0) {
        throw "Reparse points remain in candidate: $($candidate.FullName)"
      }
    }
    Remove-Item -LiteralPath $candidate.FullName -Recurse -Force -ErrorAction Stop
    if (Test-Path -LiteralPath $candidate.FullName) {
      throw "Candidate still exists after cleanup: $($candidate.FullName)"
    }
  }
}

$remainingStale = @(
  Get-ChildItem -LiteralPath $tempRoot -Force -ErrorAction Stop |
    Where-Object { $_.Name -match $namePattern -and $_.LastWriteTime -lt $cutoff }
)
$retainedRecent = @(
  Get-ChildItem -LiteralPath $tempRoot -Force -ErrorAction Stop |
    Where-Object { $_.Name -match $namePattern -and $_.LastWriteTime -ge $cutoff }
)

[pscustomobject]@{
  mode = $(if ($Apply) { 'apply' } else { 'audit' })
  tempRoot = $tempRoot
  cutoff = $cutoff
  candidateCount = $candidates.Count
  junctionCount = $junctions.Count
  remainingStaleCount = $remainingStale.Count
  retainedRecentCount = $retainedRecent.Count
  candidates = $manifest
} | ConvertTo-Json -Depth 5
