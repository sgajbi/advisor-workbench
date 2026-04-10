param(
  [string]$ProjectsRoot = "C:\\Users\\Sandeep\\projects"
)

$ErrorActionPreference = "Stop"

$coreRepo = Join-Path $ProjectsRoot "lotus-core"
$performanceRepo = Join-Path $ProjectsRoot "lotus-performance"
$riskRepo = Join-Path $ProjectsRoot "lotus-risk"
$aiRepo = Join-Path $ProjectsRoot "lotus-ai"
$adviseRepo = Join-Path $ProjectsRoot "lotus-advise"
$manageRepo = Join-Path $ProjectsRoot "lotus-manage"
$reportRepo = Join-Path $ProjectsRoot "lotus-report"

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

function Stop-ListenersOnPorts {
  param([int[]]$Ports)

  $owningProcesses = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $Ports } |
    Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($processId in $owningProcesses) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped host process $processId"
    } catch {
      Write-Warning ("Unable to stop host process {0}: {1}" -f $processId, $_.Exception.Message)
    }
  }
}

function Remove-ContainerIfPresent {
  param([string]$Name)

  $existing = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $Name }
  if ($existing) {
    docker rm -f $Name | Out-Null
    Write-Host "Removed container $Name"
  }
}

Write-Host "Stopping canonical host processes..."
Stop-ListenersOnPorts @(3000, 8001, 8111)

Write-Host "Stopping direct ingress..."
Remove-ContainerIfPresent "lotus-direct-dev-ingress"

Write-Host "Stopping Docker-backed Lotus services..."
Invoke-RepoCommand $coreRepo "docker compose down"
Invoke-RepoCommand $performanceRepo "docker compose down"
Invoke-RepoCommand $riskRepo "docker compose down"
Invoke-RepoCommand $aiRepo "docker compose down"
Invoke-RepoCommand $adviseRepo "docker compose down"
Invoke-RepoCommand $manageRepo "docker compose down"
Invoke-RepoCommand $reportRepo "docker compose down"

Write-Host "Canonical front-office local runtime stopped."
