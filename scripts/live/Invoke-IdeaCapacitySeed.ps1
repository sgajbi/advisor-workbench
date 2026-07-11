param(
  [string]$ProjectsRoot = "C:\Users\Sandeep\projects",
  [string]$IdeaBaseUrl = "http://127.0.0.1:8330",
  [Parameter(Mandatory = $true)][string]$AsOfDate,
  [Parameter(Mandatory = $true)][string]$SeededAtUtc,
  [Parameter(Mandatory = $true)][string]$RunId,
  [Parameter(Mandatory = $true)][string]$EvidenceDirectory
)

$ErrorActionPreference = "Stop"
$ideaRepo = Join-Path $ProjectsRoot "lotus-idea"
$workbenchRepo = Join-Path $ProjectsRoot "lotus-workbench"
$python = Join-Path $ideaRepo ".venv\Scripts\python.exe"
$seedScript = Join-Path $ideaRepo "scripts\seed_downstream_capacity_resource.py"
$manifestPath = Join-Path $EvidenceDirectory "idea-capacity-seed-manifest.json"
$evidencePath = Join-Path $EvidenceDirectory "idea-capacity-seed-evidence.json"

if (-not (Test-Path $python)) {
  throw "Lotus Idea repository Python was not found: $python"
}
if (-not (Test-Path $seedScript)) {
  throw "Lotus Idea capacity seed producer was not found: $seedScript"
}

$version = Invoke-RestMethod -Uri "$IdeaBaseUrl/version" -TimeoutSec 30
$commitSha = [string]$version.build.gitCommitSha
$branch = [string]$version.build.gitBranch
if ([string]::IsNullOrWhiteSpace($commitSha) -or [string]::IsNullOrWhiteSpace($branch)) {
  throw "Lotus Idea /version did not expose commit and branch provenance."
}

New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null
$seedArguments = @(
  $seedScript,
  "--base-url", $IdeaBaseUrl,
  "--as-of-date", $AsOfDate,
  "--seeded-at-utc", $SeededAtUtc,
  "--commit-sha", $commitSha,
  "--branch", $branch,
  "--run-id", $RunId,
  "--confirmation", "SEED_SYNTHETIC_LOTUS_IDEA_CAPACITY_RESOURCE",
  "--output", $manifestPath
)
& $python @seedArguments
if ($LASTEXITCODE -ne 0) {
  throw "Lotus Idea capacity seed producer failed with exit code $LASTEXITCODE."
}

$validator = Join-Path $workbenchRepo "scripts\live\Validate-IdeaCapacitySeedEvidence.mjs"
& node $validator `
  --manifest $manifestPath `
  --output $evidencePath `
  --commit-sha $commitSha `
  --branch $branch `
  --run-id $RunId
if ($LASTEXITCODE -ne 0) {
  throw "Workbench Idea capacity seed evidence validation failed with exit code $LASTEXITCODE."
}

Write-Host "Validated isolated Lotus Idea capacity seed evidence: $evidencePath"
