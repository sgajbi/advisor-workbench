param(
  [string]$ProjectsRoot = "C:\\Users\\Sandeep\\projects",
  [string]$PortfolioId = "PB_SG_GLOBAL_BAL_001",
  [string]$BenchmarkCode = "BMK_PB_GLOBAL_BALANCED_60_40",
  [switch]$BuildImages
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
    Invoke-Expression $Command
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

Write-Host "Previewing managed canonical hosts block from lotus-platform ..."
Invoke-RepoCommand $platformRepo "powershell -ExecutionPolicy Bypass -File automation\\Sync-Dev-Ingress-Hosts.ps1"

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

Write-Host "Seeding governed front-office portfolio data for $PortfolioId ..."
Invoke-RepoCommand $coreRepo "python tools/front_office_portfolio_seed.py --portfolio-id $PortfolioId --start-date 2025-03-31 --end-date 2026-03-28 --benchmark-start-date 2025-01-06 --wait-seconds 300"

Write-Host "Starting canonical lotus-manage on :8001 ..."
& (Join-Path $manageRepo "scripts\\Start-CanonicalManage.ps1")

if (-not (Test-HttpReady "http://127.0.0.1:3000")) {
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
} else {
  Write-Host "Workbench already responding on :3000"
}

Write-Host "Running canonical live validation ..."
& (Join-Path $workbenchRepo "scripts\\live\\Validate-LotusFrontOfficeCanonical.ps1") `
  -PortfolioId $PortfolioId `
  -BenchmarkCode $BenchmarkCode
