param(
  [string]$ProjectsRoot = "C:\\Users\\Sandeep\\projects",
  [string]$PortfolioId = "PB_SG_GLOBAL_BAL_001",
  [string]$BenchmarkCode = "BMK_PB_GLOBAL_BALANCED_60_40",
  [string]$ScreenshotDirectory = "",
  [int]$SeedWaitSeconds = 900,
  [switch]$CleanCoreState,
  [switch]$BuildImages,
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
$gatewayRepo = Join-Path $ProjectsRoot "lotus-gateway"
$workbenchRepo = Join-Path $ProjectsRoot "lotus-workbench"
$platformRepo = Join-Path $ProjectsRoot "lotus-platform"
$ingressCaddyfile = Join-Path $platformRepo "platform-stack\\dev-ingress\\Caddyfile.direct-host"

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

    Write-Host "Stopping stale $Description process on :$Port (PID $processId) ..."
    Stop-Process -Id $processId -Force -ErrorAction Stop
  }

  Start-Sleep -Seconds 2
}

Write-Host "Previewing managed canonical hosts block from lotus-platform ..."
Invoke-RepoCommand $platformRepo "powershell -ExecutionPolicy Bypass -File automation\\Sync-Dev-Ingress-Hosts.ps1"

if ($CleanCoreState) {
  Write-Host "Resetting lotus-core Docker state before canonical reseed ..."
  Invoke-RepoCommand $coreRepo "docker compose down -v --remove-orphans"
}

Write-Host "Starting Docker-backed upstream services..."
$composeUpCommand = "docker compose up -d"
if ($BuildImages) {
  $composeUpCommand = "$composeUpCommand --build"
}
Invoke-RepoCommand $coreRepo $composeUpCommand
Invoke-RepoCommand $performanceRepo $composeUpCommand
Invoke-RepoCommand $riskRepo $composeUpCommand
Invoke-RepoCommand $aiRepo $composeUpCommand
Invoke-RepoCommand $adviseRepo $composeUpCommand
Invoke-RepoCommand $reportRepo $composeUpCommand

Write-Host "Ensuring direct ingress container is running..."
Remove-ContainerIfPresent "lotus-direct-dev-ingress"
docker run -d --name lotus-direct-dev-ingress -p 80:80 -v "${ingressCaddyfile}:/etc/caddy/Caddyfile" caddy:2.8.4 | Out-Null

Write-Host "Starting canonical Gateway on :8111 ..."
& (Join-Path $gatewayRepo "scripts\\Start-CanonicalGateway.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Canonical Gateway startup failed with exit code $LASTEXITCODE."
}

Write-Host "Seeding governed front-office portfolio data for $PortfolioId ..."
Invoke-RepoCommand $coreRepo "python tools/front_office_portfolio_seed.py --portfolio-id $PortfolioId --start-date 2025-03-31 --end-date 2026-04-10 --benchmark-start-date 2025-01-06 --wait-seconds $SeedWaitSeconds"

Write-Host "Starting canonical lotus-manage on :8001 ..."
& (Join-Path $manageRepo "scripts\\Start-CanonicalManage.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Canonical lotus-manage startup failed with exit code $LASTEXITCODE."
}

Stop-HostProcessOnPort -Port 3000 -Description "Workbench"
Write-Host "Starting Workbench dev server on :3000 ..."
$out = Join-Path $workbenchRepo "workbench-3000.dev.out.log"
$err = Join-Path $workbenchRepo "workbench-3000.dev.err.log"
if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $err) { Remove-Item $err -Force }
Start-Process -FilePath "npm.cmd" `
  -ArgumentList "run","dev","--","--hostname","0.0.0.0","--port","3000" `
  -WorkingDirectory $workbenchRepo `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err | Out-Null
Start-Sleep -Seconds 10

if (-not $RunValidation) {
  if (-not [string]::IsNullOrWhiteSpace($ScreenshotDirectory)) {
    Write-Warning "ScreenshotDirectory is ignored unless -RunValidation is also supplied."
  }

  Write-Host ""
  Write-Host "Canonical front-office stack is up."
  Write-Host "  Workbench: http://workbench.dev.lotus"
  Write-Host "  Gateway:   http://gateway.dev.lotus"
  Write-Host "  Manage:    http://manage.dev.lotus"
  Write-Host ""
  Write-Host "Run 'npm run live:validate' from lotus-workbench when you want end-to-end validation."
  return
}

Write-Host "Running canonical live validation ..."
$validationArguments = @{
  PortfolioId = $PortfolioId
  BenchmarkCode = $BenchmarkCode
}
if (-not [string]::IsNullOrWhiteSpace($ScreenshotDirectory)) {
  $validationArguments.ScreenshotDirectory = $ScreenshotDirectory
}
& (Join-Path $workbenchRepo "scripts\\live\\Validate-LotusFrontOfficeCanonical.ps1") @validationArguments
