param(
  [switch]$Apply,
  [switch]$IncludeRecentOwnedTestArtifacts,
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
$namePattern = '^(?i)(pcvt-|paperclip|soar|roost|featherly|vitest|pglite|postgres)'
$ownedRecentTestPattern = '^(?i)(pcvt-\d+-\d+-[A-Za-z0-9]+|paperclip-(?:activity-service|runtime-[A-Za-z0-9-]+|worktree-[A-Za-z0-9-]+)-[A-Za-z0-9]+)$'
$repoDisposableNamePattern = '^(?i)(tmp-.+|(?:cto-)?closeout(?:-.+)?\.md|completion-evidence(?:-.+)?\.json|\.paperclip-dev-(?:restart|start).*\.log|coolify(?:\..+)?\.(?:html|txt))$'
$candidates = @(
  Get-ChildItem -LiteralPath $tempRoot -Force -ErrorAction Stop |
    Where-Object {
      ($_.Name -match $namePattern -and $_.LastWriteTime -lt $cutoff) -or
      ($IncludeRecentOwnedTestArtifacts -and $_.Name -match $ownedRecentTestPattern)
    }
)
if ($candidates.Count -gt 1000) {
  throw "Refusing to inspect an unexpected candidate count: $($candidates.Count)"
}

$trackedRootFiles = @(
  & git -C $repoRoot ls-files --full-name -- .
)
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to enumerate tracked repository files before hygiene audit.'
}
$trackedRootFileSet = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($trackedFile in $trackedRootFiles) {
  if ($trackedFile -notmatch '[/\\]') {
    [void]$trackedRootFileSet.Add($trackedFile)
  }
}
$repoCandidates = @(
  Get-ChildItem -LiteralPath $repoRoot -File -Force -ErrorAction Stop |
    Where-Object {
      $_.Name -match $repoDisposableNamePattern -and
      $_.LastWriteTime -lt $cutoff -and
      -not $trackedRootFileSet.Contains($_.Name)
    }
)
if ($repoCandidates.Count -gt 250) {
  throw "Refusing to inspect an unexpected repository-root candidate count: $($repoCandidates.Count)"
}

$processCommandLines = (Get-CimInstance Win32_Process -ErrorAction Stop | ForEach-Object CommandLine) -join "`n"
$canonicalSkillTarget = Join-Path $repoRoot 'skills\paperclip'
$applicationsRoot = [IO.Path]::GetDirectoryName($repoRoot)
$approvedApplicationRoots = @(
  $repoRoot
  (Join-Path $applicationsRoot 'Soar')
  (Join-Path $applicationsRoot 'Roost')
  (Join-Path $applicationsRoot 'Featherly')
) | ForEach-Object { [IO.Path]::GetFullPath($_).TrimEnd('\') }
$allowedExternalTargets = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
[void]$allowedExternalTargets.Add([IO.Path]::GetFullPath($canonicalSkillTarget).TrimEnd('\'))
$junctions = @()
$manifest = @()
$repoManifest = @()

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
      $insideApprovedApplication = @($approvedApplicationRoots | Where-Object {
        $targetPath -eq $_ -or $targetPath.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase)
      }).Count -gt 0
      if (-not $insideTemp -and -not $insideApprovedApplication) {
        throw "Unexpected junction target: $targetPath"
      }
      if (-not $insideTemp) {
        [void]$allowedExternalTargets.Add($targetPath)
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

foreach ($candidate in $repoCandidates) {
  $fullPath = [IO.Path]::GetFullPath($candidate.FullName)
  if ([IO.Path]::GetDirectoryName($fullPath) -ne $repoRoot) {
    throw "Candidate escaped the repository root: $fullPath"
  }
  if ($candidate.PSIsContainer -or ($candidate.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Repository-root candidate is not a regular file: $fullPath"
  }
  if ($trackedRootFileSet.Contains($candidate.Name)) {
    throw "Refusing to remove a tracked repository file: $fullPath"
  }
  if ($processCommandLines.IndexOf($fullPath, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
    throw "Repository-root candidate is referenced by a live process: $fullPath"
  }
  $repoManifest += [pscustomobject]@{
    path = $fullPath
    type = 'file'
    lastWriteTime = $candidate.LastWriteTime
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

if ($Apply -and $repoCandidates.Count -gt 0) {
  foreach ($candidate in $repoCandidates) {
    Remove-Item -LiteralPath $candidate.FullName -Force -ErrorAction Stop
    if (Test-Path -LiteralPath $candidate.FullName) {
      throw "Repository-root candidate still exists after cleanup: $($candidate.FullName)"
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
$remainingRepoStale = @(
  Get-ChildItem -LiteralPath $repoRoot -File -Force -ErrorAction Stop |
    Where-Object {
      $_.Name -match $repoDisposableNamePattern -and
      $_.LastWriteTime -lt $cutoff -and
      -not $trackedRootFileSet.Contains($_.Name)
    }
)
$retainedRepoRecent = @(
  Get-ChildItem -LiteralPath $repoRoot -File -Force -ErrorAction Stop |
    Where-Object {
      $_.Name -match $repoDisposableNamePattern -and
      $_.LastWriteTime -ge $cutoff -and
      -not $trackedRootFileSet.Contains($_.Name)
    }
)

[pscustomobject]@{
  mode = $(if ($Apply) { 'apply' } else { 'audit' })
  includeRecentOwnedTestArtifacts = [bool]$IncludeRecentOwnedTestArtifacts
  tempRoot = $tempRoot
  cutoff = $cutoff
  candidateCount = $candidates.Count
  junctionCount = $junctions.Count
  remainingStaleCount = $remainingStale.Count
  retainedRecentCount = $retainedRecent.Count
  candidates = $manifest
  repoRoot = $repoRoot
  repoCandidateCount = $repoCandidates.Count
  remainingRepoStaleCount = $remainingRepoStale.Count
  retainedRepoRecentCount = $retainedRepoRecent.Count
  repoCandidates = $repoManifest
} | ConvertTo-Json -Depth 5
