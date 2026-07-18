[CmdletBinding()]
param(
  [string]$ProjectsRoot = "C:\\Users\\Sandeep\\projects",
  [switch]$RemoveVolumes,
  [switch]$RemoveImages
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
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      if ($process -and $process.ProcessName -match "^(com\.docker|docker|vpnkit)") {
        Write-Host "Leaving Docker-owned listener $processId ($($process.ProcessName)) in place"
        continue
      }
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
Stop-ListenersOnPorts @(3000, 8001, 8100, 8111, 8150, 8310, 8330)

Write-Host "Stopping direct ingress..."
Remove-ContainerIfPresent "lotus-direct-dev-ingress"

Write-Host "Stopping Docker-backed Lotus services..."
$downCommand = "docker compose down --remove-orphans"
if ($RemoveVolumes) {
  $downCommand = "$downCommand -v"
}
if ($RemoveImages) {
  $downCommand = "$downCommand --rmi local"
}
Invoke-RepoCommand $coreRepo $downCommand
Invoke-RepoCommand $performanceRepo $downCommand
Invoke-RepoCommand $riskRepo $downCommand
Invoke-RepoCommand $aiRepo $downCommand
Invoke-RepoCommand $adviseRepo $downCommand
Invoke-RepoCommand $manageRepo $downCommand
Invoke-RepoCommand $reportRepo $downCommand
Invoke-RepoCommand $archiveRepo $downCommand
Invoke-RepoCommand $renderRepo $downCommand
Invoke-RepoCommand $ideaRepo $downCommand
Invoke-RepoCommand $gatewayRepo $downCommand
Invoke-RepoCommand $workbenchRepo $downCommand

Write-Host "Canonical front-office local runtime stopped."
