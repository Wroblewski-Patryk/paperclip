param(
  [ValidateSet("scan", "plan", "apply", "report")]
  [string]$Mode = "scan",
  [string]$TemplateRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$TargetRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$BackboneFiles = @(
  "docs/documentation-map.md",
  "docs/product/problem-statement.md",
  "docs/product/user-model.md",
  "docs/product/success-metrics.md",
  "docs/product/non-goals.md",
  "docs/planning/idea-ledger.csv",
  "docs/planning/idea-to-function-chain-playbook.md",
  "docs/planning/work-package-index.csv",
  "docs/planning/work-package-template.md",
  "docs/planning/work-packages/.gitkeep",
  "docs/product/capability-map.md",
  "docs/architecture/architecture-evidence-graph-system.md",
  "docs/architecture/capability-to-implementation-map.csv",
  "docs/architecture/data-ownership-map.md",
  "docs/architecture/data-lifecycle-map.csv",
  "docs/pipelines/pipeline-registry.md",
  "docs/operations/environment-matrix.md",
  "docs/operations/service-topology.md",
  "docs/operations/runtime-config-ledger.csv",
  "docs/decisions/decision-register.csv",
  "docs/decisions/README.md",
  "docs/decisions/ADR-000-template.md",
  "docs/releases/release-train.md",
  "docs/releases/release-template.md",
  "docs/releases/release-index.csv",
  "docs/quality/quality-attribute-scenarios.md",
  "docs/automation/tooling-contract.md",
  "docs/automation/agent-command-catalog.csv",
  "docs/automation/guardrail-commands.md",
  "scripts/template-sync.ps1",
  "history/history-overview.md"
)

function Get-ProjectDocRoot {
  param([string]$Root)
  if (Test-Path (Join-Path $Root "docs")) { return "docs" }
  $candidates = Get-ChildItem -Path $Root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "* - docs" }
  if ($candidates.Count -eq 1) { return $candidates[0].Name }
  return "docs"
}

$docRoot = Get-ProjectDocRoot -Root $TargetRoot
$rows = foreach ($rel in $BackboneFiles) {
  $destRel = if ($rel.StartsWith("docs/")) { ($docRoot + "/" + $rel.Substring(5)) } else { $rel }
  $src = Join-Path $TemplateRoot ($rel -replace "/", "\")
  $dest = Join-Path $TargetRoot ($destRel -replace "/", "\")
  [pscustomobject]@{
    Source = $rel
    Destination = $destRel
    SourceExists = Test-Path $src
    DestinationExists = Test-Path $dest
  }
}

if ($Mode -in @("scan", "plan")) {
  $rows | Sort-Object Destination | Format-Table -AutoSize
  exit 0
}

if ($Mode -eq "apply") {
  foreach ($row in $rows) {
    if (-not $row.SourceExists -or $row.DestinationExists) { continue }
    $src = Join-Path $TemplateRoot ($row.Source -replace "/", "\")
    $dest = Join-Path $TargetRoot ($row.Destination -replace "/", "\")
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dest
  }
  $rows | Where-Object { -not $_.DestinationExists -and $_.SourceExists } | Format-Table -AutoSize
  exit 0
}

if ($Mode -eq "report") {
  $statusDir = Join-Path $TargetRoot (Join-Path $docRoot "status")
  New-Item -ItemType Directory -Force -Path $statusDir | Out-Null
  $reportPath = Join-Path $statusDir ("template-sync-report-" + (Get-Date -Format "yyyy-MM-dd") + ".md")
  $content = @("# Template Sync Report", "", "- Mode: report", "- Template: $TemplateRoot", "- Target: $TargetRoot", "- Doc root: $docRoot", "", "## Files")
  foreach ($row in ($rows | Sort-Object Destination)) {
    $state = if ($row.DestinationExists) { "present" } else { "missing" }
    $content += "- $($row.Destination): $state"
  }
  Set-Content -Path $reportPath -Value ($content -join "`r`n") -Encoding UTF8
  Write-Output $reportPath
}
