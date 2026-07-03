import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const appsRoot = process.env.LUCKYSPARROW_APPS_ROOT ?? path.resolve(repoRoot, "..");
const targetDir = path.join(appsRoot, "scripts");
const targetPath = path.join(targetDir, "update-applications-index.ps1");

const script = String.raw`param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Test-AnyPath {
  param([string[]]$Paths)
  foreach ($Path in $Paths) {
    if (Test-Path -LiteralPath $Path) {
      return $true
    }
  }
  return $false
}

function Score-Project {
  param([string]$ProjectRoot)

  $docsRoot = Join-Path $ProjectRoot "docs"
  $templateFiles = @(
    (Join-Path $ProjectRoot "AGENTS.md"),
    (Join-Path $ProjectRoot "README.md"),
    (Join-Path $docsRoot "documentation-map.md"),
    (Join-Path $ProjectRoot "scripts\template-sync.ps1")
  )
  $templateScore = [math]::Round((($templateFiles | Where-Object { Test-Path -LiteralPath $_ }).Count / $templateFiles.Count) * 100)

  $scanScore = if (Test-AnyPath @(
    (Join-Path $docsRoot "architecture\codebase-map.md"),
    (Join-Path $docsRoot "maps"),
    (Join-Path $docsRoot "graphs")
  )) { 100 } else { 0 }

  $architectureScore = if (Test-AnyPath @(
    (Join-Path $docsRoot "graphs\architecture-awareness.json"),
    (Join-Path $docsRoot "graphs\architecture-graph.md"),
    (Join-Path $docsRoot "architecture")
  )) { 100 } else { 0 }

  $productScore = if (Test-AnyPath @(
    (Join-Path $docsRoot "product"),
    (Join-Path $docsRoot "planning"),
    (Join-Path $ProjectRoot "NEW_PROJECT_BOOTSTRAP.md")
  )) { 100 } else { 0 }

  $qualityScore = if (Test-AnyPath @(
    (Join-Path $docsRoot "quality"),
    (Join-Path $docsRoot "testing"),
    (Join-Path $ProjectRoot "tests")
  )) { 100 } else { 0 }

  $opsScore = if (Test-AnyPath @(
    (Join-Path $docsRoot "operations"),
    (Join-Path $ProjectRoot "deploy"),
    (Join-Path $ProjectRoot "docker"),
    (Join-Path $ProjectRoot "docker-compose.yml")
  )) { 100 } else { 0 }

  $historyScore = if (Test-AnyPath @(
    (Join-Path $ProjectRoot "history"),
    (Join-Path $ProjectRoot "tasks")
  )) { 100 } else { 0 }

  $overall = [math]::Round(($templateScore + $scanScore + $architectureScore + $productScore + $qualityScore + $opsScore + $historyScore) / 7)
  $status = if ($overall -ge 95) {
    "structure-ready"
  } elseif ($overall -ge 60) {
    "partial"
  } else {
    "needs-audit"
  }

  return [pscustomobject]@{
    Overall = $overall
    TemplateBackbone = $templateScore
    ProjectScan = $scanScore
    ArchitectureEvidence = $architectureScore
    ProductModel = $productScore
    QualityGuardrails = $qualityScore
    OperationsRelease = $opsScore
    HistoryEvidence = $historyScore
    Status = $status
    DetailsLink = if (Test-Path -LiteralPath (Join-Path $docsRoot "documentation-map.md")) {
      "$((Split-Path $ProjectRoot -Leaf))/docs/documentation-map.md"
    } elseif (Test-Path -LiteralPath $docsRoot) {
      "$((Split-Path $ProjectRoot -Leaf))/docs"
    } else {
      "$((Split-Path $ProjectRoot -Leaf))"
    }
  }
}

$excludedNames = @("!archived", "!template", ".codex", ".playwright-cli", "_tmp_paperclipai", "scripts")
$projects = Get-ChildItem -LiteralPath $Root -Directory |
  Where-Object { $excludedNames -notcontains $_.Name } |
  Sort-Object Name |
  ForEach-Object {
    $score = Score-Project -ProjectRoot $_.FullName
    [pscustomobject]@{
      Application = $_.Name
      Project = $_.Name
      DocRoot = if (Test-Path -LiteralPath (Join-Path $_.FullName "docs")) { "docs" } else { "" }
      Overall = $score.Overall
      TemplateBackbone = $score.TemplateBackbone
      ProjectScan = $score.ProjectScan
      ArchitectureEvidence = $score.ArchitectureEvidence
      ProductModel = $score.ProductModel
      QualityGuardrails = $score.QualityGuardrails
      OperationsRelease = $score.OperationsRelease
      HistoryEvidence = $score.HistoryEvidence
      Status = $score.Status
      ProjectLink = $_.Name
      DetailsLink = $score.DetailsLink
      Updated = Get-Date -Format "yyyy-MM-dd HH:mm zzz"
    }
  }

$csvPath = Join-Path $Root "APPLICATIONS_INDEX.csv"
$projects | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8

$updated = Get-Date -Format "yyyy-MM-dd HH:mm zzz"
$mdPath = Join-Path $Root "APPLICATIONS_INDEX.md"
$lines = @(
  "# Applications Index",
  "",
  "Last updated: $updated",
  "",
  "This file is the root radar for projects under \`\`/Aplikacje\`\`. Update detailed project state inside each project first, then run \`\`./scripts/update-applications-index.ps1\`\` from this directory to refresh the table.",
  "",
  "Percentages are structural readiness signals based on expected template files and project status artifacts. They are not a promise that runtime behavior is correct; runtime truth must be proven in each project evidence/status files.",
  "",
  "| Application | Project | Status | Overall | Template | Scan | Architecture | Product | Quality | Ops | History | Details |",
  "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |"
)

foreach ($project in $projects) {
  $details = if ($project.DetailsLink) { "[docs]($($project.DetailsLink -replace ' ', '%20'))" } else { "" }
  $lines += "| $($project.Application) | [$($project.Project)]($($project.ProjectLink -replace ' ', '%20')) | $($project.Status) | $($project.Overall)% | $($project.TemplateBackbone)% | $($project.ProjectScan)% | $($project.ArchitectureEvidence)% | $($project.ProductModel)% | $($project.QualityGuardrails)% | $($project.OperationsRelease)% | $($project.HistoryEvidence)% | $details |"
}

$lines += @(
  "",
  "## Stage Meaning",
  "",
  "- \`\`Template\`\`: project has the propagated documentation/runtime backbone and sync script.",
  "- \`\`Scan\`\`: codebase maps, registries, function/component indexes, or graph/map directories exist.",
  "- \`\`Architecture\`\`: evidence graph, traceability, dependencies, or architecture docs exist.",
  "- \`\`Product\`\`: problem, users, capabilities, success metrics, planning docs, or bootstrap contract exist.",
  "- \`\`Quality\`\`: quality scenarios, test docs, tests, or proof/readiness artifacts exist.",
  "- \`\`Ops\`\`: environment, service topology, runtime config, deployment, or release train exists.",
  "- \`\`History\`\`: agent work history has tasks, plans, audits, or evidence places.",
  "",
  "## Operating Rule",
  "",
  "When an agent finishes a project audit or meaningful implementation, it should update the detailed project docs/status first, then refresh this root index so \`\`/Aplikacje\`\` stays the entry point for deciding where to work next.",
  "",
  "A row marked \`\`structure-ready\`\` means the project has the project-knowledge backbone in place. It still needs current runtime evidence before anyone can claim that user workflows are actually working."
)

Set-Content -LiteralPath $mdPath -Value $lines -Encoding UTF8

Write-Host "Updated $mdPath"
Write-Host "Updated $csvPath"
`;

await mkdir(targetDir, { recursive: true });
let previous = null;
try {
  previous = await readFile(targetPath, "utf8");
} catch {
  previous = null;
}
if (previous !== script) {
  await writeFile(targetPath, script, "utf8");
}

console.log(JSON.stringify({
  appsRoot,
  targetPath,
  changed: previous !== script,
}, null, 2));
