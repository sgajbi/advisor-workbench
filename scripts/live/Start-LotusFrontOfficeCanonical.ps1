param(
  [string]$ProjectsRoot = "C:\\Users\\Sandeep\\projects",
  [string]$PortfolioId = "PB_SG_GLOBAL_BAL_001",
  [string]$BenchmarkCode = "BMK_PB_GLOBAL_BALANCED_60_40",
  [string]$ScreenshotDirectory = "",
  [string]$CanonicalEvidenceDirectory = "",
  [string]$LotusAiEnvFile = ".env.example",
  [int]$SeedWaitSeconds = 900,
  [string[]]$LocalApps = @(),
  [switch]$CleanCoreState,
  [switch]$SkipSeedCleanup,
  [switch]$BuildImages,
  [switch]$CoreManageOnly,
  [switch]$RunValidation
)

$ErrorActionPreference = "Stop"

$coreRepo = Join-Path $ProjectsRoot "lotus-core"
$performanceRepo = Join-Path $ProjectsRoot "lotus-performance"
$riskRepo = Join-Path $ProjectsRoot "lotus-risk"
$aiRepo = Join-Path $ProjectsRoot "lotus-ai"
$adviseRepo = Join-Path $ProjectsRoot "lotus-advise"
$manageRepo = Join-Path $ProjectsRoot "lotus-manage"
$reportRepo = Join-Path $ProjectsRoot "lotus-report"
$archiveRepo = Join-Path $ProjectsRoot "lotus-archive"
$renderRepo = Join-Path $ProjectsRoot "lotus-render"
$ideaRepo = Join-Path $ProjectsRoot "lotus-idea"
$gatewayRepo = Join-Path $ProjectsRoot "lotus-gateway"
$workbenchRepo = Join-Path $ProjectsRoot "lotus-workbench"
$platformRepo = Join-Path $ProjectsRoot "lotus-platform"
$ingressCaddyfile = Join-Path $platformRepo "platform-stack\\dev-ingress\\Caddyfile.direct-host"
$canonicalContractPath = Join-Path $platformRepo "context\\contracts\\canonical-front-office-demo-data-contract.json"
$canonicalEvidenceRoot = if ([string]::IsNullOrWhiteSpace($CanonicalEvidenceDirectory)) {
  Join-Path $workbenchRepo "output\\canonical-front-office"
} elseif ([System.IO.Path]::IsPathRooted($CanonicalEvidenceDirectory)) {
  $CanonicalEvidenceDirectory
} else {
  Join-Path $workbenchRepo $CanonicalEvidenceDirectory
}
$composeUpCommand = "docker compose up -d"
if ($BuildImages) {
  $composeUpCommand = "$composeUpCommand --build"
}
$localAppSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($item in $LocalApps) {
  foreach ($appName in ($item -split ",")) {
    $trimmed = $appName.Trim()
    if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
      [void]$localAppSet.Add($trimmed)
    }
  }
}

function Invoke-RepoCommand {
  param(
    [string]$RepoPath,
    [string]$Command
  )

  Push-Location $RepoPath
  try {
    $global:LASTEXITCODE = 0
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code $LASTEXITCODE in '$RepoPath': $Command"
    }
  } finally {
    Pop-Location
  }
}

function Test-HttpReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
  } catch {
    return $false
  }
}

function Get-GitRepositoryIdentity {
  param([string]$RepoPath)

  $commitSha = (& git -C $RepoPath rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($commitSha)) {
    throw "Unable to resolve Git commit for $RepoPath."
  }
  $branch = (& git -C $RepoPath branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
    throw "Unable to resolve Git branch for $RepoPath."
  }
  return [ordered]@{ CommitSha = $commitSha; Branch = $branch }
}

function Wait-HttpReady {
  param(
    [string]$Url,
    [string]$Description,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpReady $Url) {
      return
    }
    Start-Sleep -Seconds 2
  }
  throw "$Description did not become ready at $Url within $TimeoutSeconds seconds."
}

function Remove-ContainerIfPresent {
  param([string]$Name)

  $existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Name }
  if ($existing) {
    docker rm -f $Name | Out-Null
  }
}

function Stop-HostProcessOnPort {
  param(
    [int]$Port,
    [string]$Description
  )

  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    return
  }

  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    if (-not $processId) {
      continue
    }

    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $process) {
      Write-Host "Skipping stale $Description listener on :$Port (PID $processId) because the process already exited."
      continue
    }
    if ($process -and $process.ProcessName -match "^(com\.docker|docker|vpnkit)") {
      Write-Host "Leaving Docker-owned $Description listener on :$Port (PID $processId) in place."
      continue
    }

    Write-Host "Stopping stale $Description process on :$Port (PID $processId) ..."
    Stop-Process -Id $processId -Force -ErrorAction Stop
  }

  Start-Sleep -Seconds 2
}

function Test-LocalApp {
  param([string]$AppName)

  return $localAppSet.Contains($AppName)
}

function Get-CanonicalFrontOfficeDatePolicy {
  if (-not (Test-Path $canonicalContractPath)) {
    throw "Canonical front-office demo data contract not found: $canonicalContractPath"
  }

  $contract = Get-Content -Raw $canonicalContractPath | ConvertFrom-Json
  $asOfDate = [string]$contract.date_policy.canonical_as_of_date
  if ([string]::IsNullOrWhiteSpace($asOfDate)) {
    throw "Canonical front-office demo data contract is missing date_policy.canonical_as_of_date."
  }

  return [ordered]@{
    AsOfDate = $asOfDate
    GeneratedAtUtc = "$($asOfDate)T10:00:00Z"
  }
}

function Invoke-ComposeUp {
  param(
    [string]$RepoPath,
    [hashtable]$Environment = @{}
  )

  Invoke-WithProcessEnvironment -Environment $Environment -ScriptBlock {
    Invoke-RepoCommand $RepoPath $composeUpCommand
  }
}

function Invoke-WithProcessEnvironment {
  param(
    [hashtable]$Environment,
    [scriptblock]$ScriptBlock
  )

  $previousValues = @{}
  foreach ($key in $Environment.Keys) {
    $previousValues[$key] = [Environment]::GetEnvironmentVariable($key, "Process")
    [Environment]::SetEnvironmentVariable($key, $Environment[$key], "Process")
  }

  try {
    & $ScriptBlock
  } finally {
    foreach ($key in $Environment.Keys) {
      [Environment]::SetEnvironmentVariable($key, $previousValues[$key], "Process")
    }
  }
}

function Start-LocalUvicornService {
  param(
    [string]$RepoPath,
    [string]$ServiceName,
    [string]$AppModule,
    [int]$Port
  )

  Stop-HostProcessOnPort -Port $Port -Description $ServiceName

  $python = if (Test-Path (Join-Path $RepoPath ".venv\\Scripts\\python.exe")) {
    Join-Path $RepoPath ".venv\\Scripts\\python.exe"
  } else {
    "C:\\Python313\\python.exe"
  }
  $out = Join-Path $RepoPath "$ServiceName-$Port.dev.out.log"
  $err = Join-Path $RepoPath "$ServiceName-$Port.dev.err.log"
  if (Test-Path $out) { Remove-Item $out -Force }
  if (Test-Path $err) { Remove-Item $err -Force }

  $previousPythonPath = $env:PYTHONPATH
  $env:PYTHONPATH = "$(Join-Path $RepoPath "src");$RepoPath"
  try {
    Start-Process -FilePath $python `
      -ArgumentList "-m","uvicorn",$AppModule,"--app-dir","src","--host","0.0.0.0","--port","$Port" `
      -WorkingDirectory $RepoPath `
      -RedirectStandardOutput $out `
      -RedirectStandardError $err `
      -WindowStyle Hidden | Out-Null
  } finally {
    $env:PYTHONPATH = $previousPythonPath
  }

  Start-Sleep -Seconds 5
  if (-not (Test-HttpReady "http://127.0.0.1:$Port/health/ready")) {
    throw "$ServiceName local startup failed readiness on port $Port."
  }
}

function Start-WorkbenchDevServer {
  Stop-HostProcessOnPort -Port 3000 -Description "Workbench"
  Write-Host "Starting Workbench local dev server on :3000 ..."
  $out = Join-Path $workbenchRepo "workbench-3000.dev.out.log"
  $err = Join-Path $workbenchRepo "workbench-3000.dev.err.log"
  if (Test-Path $out) { Remove-Item $out -Force }
  if (Test-Path $err) { Remove-Item $err -Force }
  $previousBffBaseUrl = $env:BFF_BASE_URL
  $previousNextTelemetryDisabled = $env:NEXT_TELEMETRY_DISABLED
  $env:BFF_BASE_URL = "http://gateway.dev.lotus"
  $env:NEXT_TELEMETRY_DISABLED = "1"
  try {
    Start-Process -FilePath "npm.cmd" `
      -ArgumentList "run","dev","--","--hostname","0.0.0.0","--port","3000" `
      -WorkingDirectory $workbenchRepo `
      -RedirectStandardOutput $out `
      -RedirectStandardError $err `
      -WindowStyle Hidden | Out-Null
  } finally {
    $env:BFF_BASE_URL = $previousBffBaseUrl
    $env:NEXT_TELEMETRY_DISABLED = $previousNextTelemetryDisabled
  }
  Start-Sleep -Seconds 10
}

function Resolve-LotusAiEnvFile {
  param([string]$EnvFile)

  if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    return ""
  }

  $resolved = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
    $EnvFile
  } else {
    Join-Path $aiRepo $EnvFile
  }
  if (-not (Test-Path $resolved)) {
    throw "Lotus AI env file not found: $resolved"
  }
  return $resolved
}

function Get-EnvScopedComposeCommand {
  param(
    [string]$Command,
    [string]$EnvFile
  )

  if ([string]::IsNullOrWhiteSpace($EnvFile)) {
    return $Command
  }
  return "`$env:LOTUS_AI_ENV_FILE = '$EnvFile'; $Command"
}

function Start-CanonicalManage {
  $localManageEnvironment = @{
    LOTUS_MANAGE_HOST_PORT = "8001"
    DPM_CAP_INPUT_MODE_PORTFOLIO_ID_ENABLED = "true"
    DPM_STATEFUL_CORE_SOURCING_ENABLED = "true"
    DPM_WORKFLOW_ENABLED = "true"
    DPM_CORE_BASE_URL = "http://core-control.dev.lotus"
    DPM_CORE_QUERY_BASE_URL = "http://core-query.dev.lotus"
  }
  $dockerManageEnvironment = $localManageEnvironment.Clone()
  $dockerManageEnvironment["DPM_CORE_BASE_URL"] = "http://host.docker.internal:8202"
  $dockerManageEnvironment["DPM_CORE_QUERY_BASE_URL"] = "http://host.docker.internal:8201"

  if (Test-LocalApp "manage") {
    Invoke-RepoCommand $manageRepo "docker compose down --remove-orphans"
    Write-Host "Starting canonical lotus-manage locally on :8001 ..."
    Invoke-WithProcessEnvironment -Environment $localManageEnvironment -ScriptBlock {
      & (Join-Path $manageRepo "scripts\\Start-CanonicalManage.ps1") -Port 8001
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Canonical lotus-manage local startup failed with exit code $LASTEXITCODE."
    }
    return
  }

  Stop-HostProcessOnPort -Port 8001 -Description "lotus-manage"
  Invoke-ComposeUp $manageRepo $dockerManageEnvironment
}

function Start-DirectIngress {
  Write-Host "Ensuring direct ingress container is running..."
  Remove-ContainerIfPresent "lotus-direct-dev-ingress"
  docker run -d --name lotus-direct-dev-ingress -p 80:80 -v "${ingressCaddyfile}:/etc/caddy/Caddyfile" caddy:2.8.4 | Out-Null
}

function Invoke-CanonicalCoreSeed {
  param([switch]$IngestOnly)

  $seedCommand = "python tools/front_office_portfolio_seed.py --portfolio-id $PortfolioId --start-date 2025-03-31 --end-date 2026-04-10 --benchmark-start-date 2025-01-06 --wait-seconds $SeedWaitSeconds"
  if ($IngestOnly) {
    $seedCommand = "$seedCommand --ingest-only"
  }
  if ($SkipSeedCleanup) {
    $seedCommand = "$seedCommand --skip-cleanup"
  }

  Write-Host "Seeding governed front-office portfolio data for $PortfolioId ..."
  Invoke-RepoCommand $coreRepo $seedCommand
}

function Invoke-DpmCommandCenterSeed {
  $dpmSeedCommand = (
    "powershell -ExecutionPolicy Bypass -File automation\Invoke-DpmCommandCenterSeed.ps1 " +
    "-PortfolioId $PortfolioId"
  )

  Write-Host "Seeding governed DPM command-center and action-register evidence for $PortfolioId ..."
  Invoke-RepoCommand $platformRepo $dpmSeedCommand
}

function Invoke-CanonicalIdeaSeed {
  $ideaBaseUrl = "http://127.0.0.1:8330"
  $datePolicy = Get-CanonicalFrontOfficeDatePolicy
  $asOfDate = $datePolicy.AsOfDate
  $generatedAtUtc = $datePolicy.GeneratedAtUtc
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpReady "$ideaBaseUrl/health/ready") {
      break
    }
    Start-Sleep -Seconds 2
  }
  if (-not (Test-HttpReady "$ideaBaseUrl/health/ready")) {
    throw "lotus-idea did not become ready before canonical advisor queue seed."
  }

  $sourceRef = {
    param([string]$ProductId)
    return @{
      productId = $ProductId
      sourceSystem = "lotus-core"
      productVersion = "v1"
      route = "/source/$ProductId"
      asOfDate = $asOfDate
      generatedAtUtc = $generatedAtUtc
      contentHash = "sha256:$($ProductId):canonical-workbench-seed"
      dataQualityStatus = "complete"
      freshness = "current"
    }
  }

  $payload = @{
    asOfDate = $asOfDate
    evaluatedAtUtc = $generatedAtUtc
    sourceReportedCashWeight = "0.18"
    sourceEvidence = @{
      portfolioStateRef = & $sourceRef "lotus-core:PortfolioStateSnapshot:v1"
      holdingsRef = & $sourceRef "lotus-core:HoldingsAsOf:v1"
      cashMovementRef = & $sourceRef "lotus-core:PortfolioCashMovementSummary:v1"
      cashflowProjectionRef = & $sourceRef "lotus-core:PortfolioCashflowProjection:v1"
    }
    accessScope = @{
      tenantId = "tenant-private-bank-sg"
      bookId = "book-advisor-001"
      portfolioId = $PortfolioId
      clientId = "client-001"
    }
    entitlementAllowed = $true
  }
  $headers = @{
    "X-Caller-Subject" = "canonical-front-office-seed"
    "X-Caller-Capabilities" = "idea.candidate.persist"
    "X-Correlation-Id" = "corr-canonical-idea-seed"
    "Idempotency-Key" = "canonical-idea-high-cash:$($PortfolioId):$generatedAtUtc"
  }

  Write-Host "Seeding governed Lotus Idea advisor queue candidate for $PortfolioId ..."
  $response = Invoke-RestMethod `
    -Method Post `
    -Uri "$ideaBaseUrl/api/v1/idea-signals/high-cash/evaluate-and-persist" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body ($payload | ConvertTo-Json -Depth 12)

  $decision = $response.persistence.decision
  if ($decision -notin @("accepted", "replayed", "duplicate_candidate")) {
    throw "Canonical Lotus Idea seed did not persist an advisor queue candidate. Decision: $decision"
  }

  $queueHeaders = @{
    "X-Caller-Subject" = "canonical-front-office-validator"
    "X-Caller-Roles" = "advisor"
    "X-Caller-Capabilities" = "idea.review.queue.read"
    "X-Caller-Portfolio-Ids" = $PortfolioId
  }
  $queue = Invoke-RestMethod `
    -Uri "$ideaBaseUrl/api/v1/review-queues/advisor" `
    -Headers $queueHeaders
  if ($queue.page.returnedItemCount -lt 1) {
    throw "Canonical Lotus Idea advisor queue seed completed but returned no reviewable items."
  }
}

function Invoke-CanonicalIdeaCapacitySeed {
  $datePolicy = Get-CanonicalFrontOfficeDatePolicy
  Wait-HttpReady -Url "http://127.0.0.1:8330/health/ready" -Description "lotus-idea"
  Wait-HttpReady -Url "http://127.0.0.1:8000/health/ready" -Description "lotus-advise"
  $runId = "canonical-front-office-$($datePolicy.AsOfDate)"

  Write-Host "Seeding isolated Lotus Idea downstream-capacity evidence ..."
  & (Join-Path $workbenchRepo "scripts\\live\\Invoke-IdeaCapacitySeed.ps1") `
    -ProjectsRoot $ProjectsRoot `
    -IdeaBaseUrl "http://127.0.0.1:8330" `
    -AsOfDate $datePolicy.AsOfDate `
    -SeededAtUtc $datePolicy.GeneratedAtUtc `
    -RunId $runId `
    -ExpectedCommitSha $ideaSourceIdentity.CommitSha `
    -ExpectedBranch $ideaSourceIdentity.Branch `
    -EvidenceDirectory $canonicalEvidenceRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Canonical Lotus Idea capacity seed failed with exit code $LASTEXITCODE."
  }
}

Write-Host "Previewing managed canonical hosts block from lotus-platform ..."
Invoke-RepoCommand $platformRepo "powershell -ExecutionPolicy Bypass -File automation\\Sync-Dev-Ingress-Hosts.ps1"

if ($CleanCoreState) {
  Write-Host "Resetting lotus-core Docker state before canonical reseed ..."
  Invoke-RepoCommand $coreRepo "docker compose down -v --remove-orphans"
}

if ($localAppSet.Count -gt 0) {
  Write-Host "Local app overrides: $(($localAppSet | Sort-Object) -join ', ')"
}

Write-Host "Starting Docker-backed canonical services..."
$canonicalCoreEnvironment = @{
  DEMO_DATA_PACK_ENABLED = "false"
}
Write-Host "Starting lotus-core with auxiliary demo data pack disabled for canonical PB seed isolation."
Invoke-ComposeUp $coreRepo $canonicalCoreEnvironment

if ($CoreManageOnly) {
  Write-Host "Core/manage proof mode enabled; skipping non-essential front-office services."
  Start-CanonicalManage
  Start-DirectIngress
  Invoke-CanonicalCoreSeed -IngestOnly
  Write-Host ""
  Write-Host "Canonical core/manage proof stack is up."
  Write-Host "  Core query:   http://core-query.dev.lotus"
  Write-Host "  Core control: http://core-control.dev.lotus"
  Write-Host "  Manage:       http://manage.dev.lotus"
  Write-Host ""
  Write-Host "Run the core and manage API validators for RFC-087/RFC-0036 proof."
  return
}

$ideaSourceIdentity = Get-GitRepositoryIdentity -RepoPath $ideaRepo
$ideaDatePolicy = Get-CanonicalFrontOfficeDatePolicy
$ideaCanonicalRunId = "canonical-front-office-$($ideaDatePolicy.AsOfDate)"
$ideaBuildTimestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$ideaBuildEnvironment = @{
  LOTUS_IDEA_BUILD_GIT_COMMIT_SHA = $ideaSourceIdentity.CommitSha
  LOTUS_IDEA_BUILD_GIT_BRANCH = $ideaSourceIdentity.Branch
  LOTUS_IDEA_BUILD_TIMESTAMP = $ideaBuildTimestamp
  LOTUS_IDEA_BUILD_REPO_URL = "https://github.com/sgajbi/lotus-idea.git"
  LOTUS_IDEA_BUILD_RUN_ID = $ideaCanonicalRunId
  LOTUS_IDEA_BUILD_IMAGE_ID = "$($ideaSourceIdentity.CommitSha).$ideaCanonicalRunId"
  LOTUS_IDEA_BUILD_SERVICE_VERSION = "0.1.0"
}
$resolvedLotusAiEnvFile = Resolve-LotusAiEnvFile -EnvFile $LotusAiEnvFile
Write-Host "Using lotus-ai env file for canonical proof: $resolvedLotusAiEnvFile"

Invoke-ComposeUp $performanceRepo
Invoke-ComposeUp $riskRepo
Invoke-RepoCommand $aiRepo (Get-EnvScopedComposeCommand -Command $composeUpCommand -EnvFile $resolvedLotusAiEnvFile)
Invoke-ComposeUp $adviseRepo

Start-CanonicalManage

Invoke-ComposeUp $reportRepo
Invoke-ComposeUp $ideaRepo $ideaBuildEnvironment
Invoke-CanonicalIdeaSeed

if (Test-LocalApp "archive") {
  Invoke-RepoCommand $archiveRepo "docker compose down --remove-orphans"
  Write-Host "Starting canonical lotus-archive locally on :8150 ..."
  Start-LocalUvicornService -RepoPath $archiveRepo -ServiceName "lotus-archive" -AppModule "app.main:app" -Port 8150
} else {
  Stop-HostProcessOnPort -Port 8150 -Description "lotus-archive"
  Invoke-ComposeUp $archiveRepo
}

if (Test-LocalApp "render") {
  Invoke-RepoCommand $renderRepo "docker compose down --remove-orphans"
  Write-Host "Starting canonical lotus-render locally on :8310 ..."
  Start-LocalUvicornService -RepoPath $renderRepo -ServiceName "lotus-render" -AppModule "app.main:app" -Port 8310
} else {
  Stop-HostProcessOnPort -Port 8310 -Description "lotus-render"
  Invoke-ComposeUp $renderRepo
}

Start-DirectIngress

if (Test-LocalApp "gateway") {
  Invoke-RepoCommand $gatewayRepo "docker compose down --remove-orphans"
  Write-Host "Starting canonical Gateway locally on :8100 ..."
  & (Join-Path $gatewayRepo "scripts\\Start-CanonicalGateway.ps1") -Port 8100
  if ($LASTEXITCODE -ne 0) {
    throw "Canonical Gateway local startup failed with exit code $LASTEXITCODE."
  }
} else {
  Stop-HostProcessOnPort -Port 8100 -Description "Gateway"
  Invoke-ComposeUp $gatewayRepo
}

Invoke-CanonicalCoreSeed
Invoke-DpmCommandCenterSeed
Invoke-CanonicalIdeaCapacitySeed

if (Test-LocalApp "workbench") {
  Invoke-RepoCommand $workbenchRepo "docker compose down --remove-orphans"
  Start-WorkbenchDevServer
} else {
  Stop-HostProcessOnPort -Port 3000 -Description "Workbench"
  Invoke-ComposeUp $workbenchRepo @{ BFF_BASE_URL = "http://host.docker.internal:8100" }
}

if (-not $RunValidation) {
  if (-not [string]::IsNullOrWhiteSpace($ScreenshotDirectory)) {
    Write-Warning "ScreenshotDirectory is ignored unless -RunValidation is also supplied."
  }

  Write-Host ""
  Write-Host "Canonical front-office stack is up."
  Write-Host "  Workbench: http://workbench.dev.lotus"
  Write-Host "  Gateway:   http://gateway.dev.lotus"
  Write-Host "  Manage:    http://manage.dev.lotus"
  Write-Host "  Idea:      http://idea.dev.lotus"
  Write-Host "  Archive:   http://archive.dev.lotus"
  Write-Host "  Render:    http://render.dev.lotus"
  Write-Host ""
  Write-Host "Run 'npm run live:validate' from lotus-workbench when you want end-to-end validation."
  return
}

Write-Host "Running canonical live validation ..."
$validationArguments = @{
  PortfolioId = $PortfolioId
  BenchmarkCode = $BenchmarkCode
  CanonicalEvidenceDirectory = $canonicalEvidenceRoot
}
if (-not [string]::IsNullOrWhiteSpace($ScreenshotDirectory)) {
  $validationArguments.ScreenshotDirectory = $ScreenshotDirectory
}
& (Join-Path $workbenchRepo "scripts\\live\\Validate-LotusFrontOfficeCanonical.ps1") @validationArguments
