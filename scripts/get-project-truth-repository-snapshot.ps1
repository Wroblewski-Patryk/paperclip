param(
  [Parameter(Mandatory = $true)]
  [string]$RepositoryRoot
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = (Resolve-Path -LiteralPath $RepositoryRoot -ErrorAction Stop).Path

function Invoke-ProjectTruthGit {
  param([string[]]$GitArgs)

  $output = & git -C $resolvedRoot @GitArgs 2>&1
  if ($LASTEXITCODE -ne 0) {
    $detail = (($output | Out-String).Trim())
    if ($detail.Length -gt 500) { $detail = $detail.Substring(0, 500) }
    throw "Git discovery failed for '$resolvedRoot': git $($GitArgs -join ' ') exited $LASTEXITCODE. $detail"
  }
  return (($output | Out-String).Trim())
}

$headSha = (Invoke-ProjectTruthGit -GitArgs @('rev-parse', '--verify', 'HEAD')).ToLowerInvariant()
$upstreamSha = (Invoke-ProjectTruthGit -GitArgs @('rev-parse', '--verify', '@{upstream}')).ToLowerInvariant()
$divergence = Invoke-ProjectTruthGit -GitArgs @('rev-list', '--left-right', '--count', '@{upstream}...HEAD')
$parts = @($divergence -split '\s+' | Where-Object { $_ })
if ($parts.Count -ne 2 -or $parts[0] -notmatch '^\d+$' -or $parts[1] -notmatch '^\d+$') {
  throw "Git discovery returned invalid divergence for '$resolvedRoot': $divergence"
}
$behind = [int]$parts[0]
$ahead = [int]$parts[1]
$aheadPaths = @()
if ($ahead -gt 0) {
  $aheadPathText = Invoke-ProjectTruthGit -GitArgs @('diff', '--name-only', '@{upstream}..HEAD')
  $aheadPaths = @($aheadPathText -split '\r?\n' | Where-Object { $_ } | ForEach-Object { $_.Replace('\', '/') })
}

$controlPlaneOnlyAhead = $aheadPaths.Count -gt 0
foreach ($candidate in $aheadPaths) {
  if ($candidate -notmatch '^(?:(?:docs?|history|\.agents|\.codex)(?:/|$)|(?:README|AGENTS)\.md$)') {
    $controlPlaneOnlyAhead = $false
    break
  }
}

[ordered]@{
  schemaVersion = 1
  repositoryRoot = $resolvedRoot.Replace('\', '/')
  headSha = $headSha
  upstreamSha = $upstreamSha
  behind = $behind
  ahead = $ahead
  aheadPaths = $aheadPaths
  controlPlaneOnlyAhead = $controlPlaneOnlyAhead
  releaseSha = if ($controlPlaneOnlyAhead) { $upstreamSha } else { $headSha }
} | ConvertTo-Json -Compress
