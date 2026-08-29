[CmdletBinding()]
param(
  [string]$PortfolioId = "PB_SG_GLOBAL_BAL_001",
  [string]$BenchmarkCode = "BMK_PB_GLOBAL_BALANCED_60_40",
  [string]$StartDate = "2025-03-31",
  [string]$AsOfDate = "2026-04-10",
  [string]$WorkbenchBaseUrl = "http://workbench.dev.lotus",
  [string]$GatewayBaseUrl = "http://gateway.dev.lotus",
  [string]$ScreenshotDirectory = "",
  [string]$CanonicalEvidenceDirectory = "",
  [string]$IdeaCandidateSeedEvidencePath = "",
  [string]$IdeaCapacitySeedEvidencePath = "",
  [string]$MainlineSourceProvenancePath = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$canonicalEvidenceRoot = if ([string]::IsNullOrWhiteSpace($CanonicalEvidenceDirectory)) {
  Join-Path $repoRoot "output\\canonical-front-office"
} elseif ([System.IO.Path]::IsPathRooted($CanonicalEvidenceDirectory)) {
  $CanonicalEvidenceDirectory
} else {
  Join-Path $repoRoot $CanonicalEvidenceDirectory
}
$ideaCapacitySeedEvidencePath = if ([string]::IsNullOrWhiteSpace($IdeaCapacitySeedEvidencePath)) {
  Join-Path $canonicalEvidenceRoot "idea-capacity-seed-evidence.json"
} else {
  $IdeaCapacitySeedEvidencePath
}
$ideaCandidateSeedEvidencePath = if ([string]::IsNullOrWhiteSpace($IdeaCandidateSeedEvidencePath)) {
  Join-Path $canonicalEvidenceRoot "idea-candidate-seed-evidence.json"
} else {
  $IdeaCandidateSeedEvidencePath
}
$canonicalCallerContextHeaders = @{
  "X-Actor-Id" = "workbench-system"
  "X-Tenant-Id" = "tenant-sg"
  "X-Region" = "APAC"
}

function Test-CanonicalHost {
  param(
    [string]$HostName,
    [switch]$Optional
  )

  try {
    Resolve-DnsName -Name $HostName -ErrorAction Stop | Out-Null
    Write-Host "[ok] host resolves: $HostName"
  } catch {
    if ($Optional) {
      Write-Warning "Optional canonical host is not resolvable: $HostName"
    } else {
      throw "Required canonical host is not resolvable: $HostName"
    }
  }
}

function Test-Endpoint {
  param(
    [string]$Url,
    [string]$Label,
    [hashtable]$Headers = @{},
    [int]$Attempts = 8,
    [int]$DelaySeconds = 3
  )

  $lastError = $null
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 45 -Headers $Headers
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        Write-Host "[ok] $Label -> $Url"
        return
      }
      $lastError = "$Label returned HTTP $($response.StatusCode) at $Url"
    } catch {
      $statusCode = $null
      if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
        $statusCode = [int]$_.Exception.Response.StatusCode
      }
      if ($statusCode) {
        $lastError = "$Label returned HTTP $statusCode at $Url"
      } else {
        $lastError = "$Label request failed at ${Url}: $($_.Exception.Message)"
      }
    }

    if ($attempt -lt $Attempts) {
      Write-Warning "$lastError; retrying ($attempt/$Attempts)."
      Start-Sleep -Seconds $DelaySeconds
    }
  }

  throw "$lastError after $Attempts attempts."
}

function Read-IdeaCandidateSeedEvidence {
  if (-not (Test-Path -LiteralPath $ideaCandidateSeedEvidencePath)) {
    throw "Canonical Lotus Idea candidate seed evidence is missing: $ideaCandidateSeedEvidencePath"
  }
  $evidence = Get-Content -LiteralPath $ideaCandidateSeedEvidencePath -Raw | ConvertFrom-Json
  if ($evidence.schemaVersion -ne "lotus-workbench.idea-candidate-seed-evidence.v1") {
    throw "Canonical Lotus Idea candidate seed evidence has an unsupported schema version."
  }
  if ([string]$evidence.portfolioId -ne $PortfolioId) {
    throw "Canonical Lotus Idea candidate seed evidence does not match portfolio $PortfolioId."
  }
  if ([string]$evidence.candidateId -notmatch '^idea_high_cash_[0-9a-f]{16}$') {
    throw "Canonical Lotus Idea candidate seed evidence has an invalid candidate identity."
  }
  if ([string]$evidence.lifecycleStatus -ne "ready_for_review") {
    throw "Canonical Lotus Idea candidate seed evidence is not ready for advisor review."
  }
  if ([string]::IsNullOrWhiteSpace([string]$evidence.runId)) {
    throw "Canonical Lotus Idea candidate seed evidence has no run identity."
  }
  $ideaVersion = Invoke-RestMethod -Uri "http://idea.dev.lotus/version" -TimeoutSec 45
  $activeIdeaRunId = [string]$ideaVersion.build.ciRunId
  if ([string]::IsNullOrWhiteSpace($activeIdeaRunId)) {
    throw "Active Lotus Idea runtime exposes no build run identity."
  }
  if ([string]$evidence.runId -ne $activeIdeaRunId) {
    throw (
      "Canonical Lotus Idea candidate seed evidence belongs to run '$($evidence.runId)', " +
      "but the active Idea runtime identifies run '$activeIdeaRunId'."
    )
  }
  return $evidence
}

function Assert-IdeaQueueSeed {
  param([string]$ExpectedCandidateId)

  $headers = @{
    "X-Caller-Subject" = "canonical-front-office-validator"
    "X-Caller-Roles" = "advisor"
    "X-Caller-Capabilities" = "idea.review.queue.read,idea.candidate.detail.read"
    "X-Caller-Portfolio-Ids" = $PortfolioId
  }
  $url = "$GatewayBaseUrl/api/v1/ideas/review-queues/advisor"
  $queue = Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 45
  $matchingItems = @($queue.items | Where-Object {
      [string]$_.candidate.candidateId -eq $ExpectedCandidateId
    })
  if ($matchingItems.Count -ne 1) {
    throw (
      "Gateway Idea review queue did not expose current-run candidate '$ExpectedCandidateId' " +
      "exactly once for $PortfolioId. Matches: $($matchingItems.Count)."
    )
  }
  Write-Host "[ok] Gateway Idea review queue contains current-run candidate $ExpectedCandidateId -> $url"
}

Test-CanonicalHost "workbench.dev.lotus"
Test-CanonicalHost "gateway.dev.lotus"
Test-CanonicalHost "core-query.dev.lotus"
Test-CanonicalHost "core-control.dev.lotus"
Test-CanonicalHost "core-ingestion.dev.lotus"
Test-CanonicalHost "performance.dev.lotus"
Test-CanonicalHost "risk.dev.lotus"
Test-CanonicalHost "advise.dev.lotus"
Test-CanonicalHost "manage.dev.lotus"
Test-CanonicalHost "report.dev.lotus"
Test-CanonicalHost "archive.dev.lotus"
Test-CanonicalHost "render.dev.lotus"
Test-CanonicalHost "idea.dev.lotus"
Test-CanonicalHost "ai.dev.lotus" -Optional

Test-Endpoint "$GatewayBaseUrl/health/ready" "Gateway readiness"
Test-Endpoint "$WorkbenchBaseUrl/portfolio?portfolioId=$PortfolioId" "Workbench portfolio route"
Test-Endpoint "$WorkbenchBaseUrl/performance?portfolioId=$PortfolioId" "Workbench performance route"
Test-Endpoint "http://manage.dev.lotus/health/ready" "lotus-manage readiness"
Test-Endpoint "http://report.dev.lotus/health/ready" "lotus-report readiness"
Test-Endpoint "http://archive.dev.lotus/health/ready" "lotus-archive readiness"
Test-Endpoint "http://render.dev.lotus/health/ready" "lotus-render readiness"
Test-Endpoint "http://idea.dev.lotus/health/ready" "lotus-idea readiness"
Test-Endpoint "http://manage.dev.lotus/api/v1/rebalance/supportability/summary" "lotus-manage supportability summary"
Test-Endpoint "http://report.dev.lotus/integration/capabilities?consumerSystem=lotus-gateway&tenantId=default" "lotus-report integration capabilities"
Test-Endpoint "$GatewayBaseUrl/api/v1/portfolio/portfolios/$PortfolioId/workspace" "Gateway portfolio workspace" -Headers $canonicalCallerContextHeaders
Test-Endpoint "$GatewayBaseUrl/api/v1/platform/capabilities" "Gateway platform capabilities" -Headers $canonicalCallerContextHeaders
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/overview" "Gateway workbench overview" -Headers $canonicalCallerContextHeaders
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/performance/summary?period=EXPLICIT&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=$BenchmarkCode&report_start_date=$StartDate&report_end_date=$AsOfDate" "Gateway performance summary" -Headers $canonicalCallerContextHeaders
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/risk/summary?period=EXPLICIT&detail_basis=NET&benchmark_code=$BenchmarkCode&report_start_date=$StartDate&report_end_date=$AsOfDate&as_of_date=$AsOfDate" "Gateway risk summary" -Headers $canonicalCallerContextHeaders
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/performance/advisor-brief?period=EXPLICIT&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=$BenchmarkCode&report_start_date=$StartDate&report_end_date=$AsOfDate" "Gateway advisor brief" -Headers $canonicalCallerContextHeaders
$ideaCandidateSeedEvidence = Read-IdeaCandidateSeedEvidence
Assert-IdeaQueueSeed -ExpectedCandidateId $ideaCandidateSeedEvidence.candidateId
if (-not (Test-Path $ideaCapacitySeedEvidencePath)) {
  throw "Canonical Lotus Idea capacity seed evidence is missing: $ideaCapacitySeedEvidencePath"
}

Push-Location $repoRoot
try {
  $validatorArguments = @(
    "$repoRoot\\scripts\\live\\validate-canonical-workbench-live.mjs",
    "--portfolio-id",
    $PortfolioId,
    "--benchmark-code",
    $BenchmarkCode,
    "--start-date",
    $StartDate,
    "--as-of-date",
    $AsOfDate,
    "--workbench-base-url",
    $WorkbenchBaseUrl,
    "--gateway-base-url",
    $GatewayBaseUrl,
    "--idea-capacity-seed-evidence",
    $ideaCapacitySeedEvidencePath,
    "--idea-candidate-id",
    $ideaCandidateSeedEvidence.candidateId
  )
  if (-not [string]::IsNullOrWhiteSpace($ScreenshotDirectory)) {
    $validatorArguments += @("--output-dir", $ScreenshotDirectory)
  }
  if (-not [string]::IsNullOrWhiteSpace($MainlineSourceProvenancePath)) {
    $validatorArguments += @("--mainline-source-provenance", $MainlineSourceProvenancePath)
  }

  & node @validatorArguments

  if ($LASTEXITCODE -ne 0) {
    throw "Canonical Workbench browser validation failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
