param(
  [string]$PortfolioId = "PB_SG_GLOBAL_BAL_001",
  [string]$BenchmarkCode = "BMK_PB_GLOBAL_BALANCED_60_40",
  [string]$WorkbenchBaseUrl = "http://workbench.dev.lotus",
  [string]$GatewayBaseUrl = "http://gateway.dev.lotus",
  [string]$ScreenshotDirectory = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

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
    [int]$Attempts = 8,
    [int]$DelaySeconds = 3
  )

  $lastError = $null
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 45
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
Test-CanonicalHost "ai.dev.lotus" -Optional

Test-Endpoint "$GatewayBaseUrl/health/ready" "Gateway readiness"
Test-Endpoint "$WorkbenchBaseUrl/portfolio?portfolioId=$PortfolioId" "Workbench portfolio route"
Test-Endpoint "$WorkbenchBaseUrl/performance?portfolioId=$PortfolioId" "Workbench performance route"
Test-Endpoint "http://manage.dev.lotus/health/ready" "lotus-manage readiness"
Test-Endpoint "http://report.dev.lotus/health/ready" "lotus-report readiness"
Test-Endpoint "http://archive.dev.lotus/health/ready" "lotus-archive readiness"
Test-Endpoint "http://render.dev.lotus/health/ready" "lotus-render readiness"
Test-Endpoint "http://manage.dev.lotus/integration/capabilities?consumer_system=lotus-gateway&tenant_id=default" "lotus-manage integration capabilities"
Test-Endpoint "http://report.dev.lotus/integration/capabilities?consumerSystem=lotus-gateway&tenantId=default" "lotus-report integration capabilities"
Test-Endpoint "$GatewayBaseUrl/api/v1/foundation/portfolios/$PortfolioId/workspace" "Gateway foundation workspace"
Test-Endpoint "$GatewayBaseUrl/api/v1/platform/capabilities" "Gateway platform capabilities"
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/overview" "Gateway workbench overview"
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/performance/summary?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=$BenchmarkCode" "Gateway performance summary"
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/risk/summary?period=YTD&detail_basis=NET&benchmark_code=$BenchmarkCode" "Gateway risk summary"
Test-Endpoint "$GatewayBaseUrl/api/v1/workbench/$PortfolioId/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=$BenchmarkCode" "Gateway advisor brief"

Push-Location $repoRoot
try {
  $validatorArguments = @(
    "$repoRoot\\scripts\\live\\validate-canonical-workbench-live.mjs",
    "--portfolio-id",
    $PortfolioId,
    "--benchmark-code",
    $BenchmarkCode,
    "--workbench-base-url",
    $WorkbenchBaseUrl,
    "--gateway-base-url",
    $GatewayBaseUrl
  )
  if (-not [string]::IsNullOrWhiteSpace($ScreenshotDirectory)) {
    $validatorArguments += @("--output-dir", $ScreenshotDirectory)
  }

  & node @validatorArguments

  if ($LASTEXITCODE -ne 0) {
    throw "Canonical Workbench browser validation failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
