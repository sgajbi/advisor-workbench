param(
  [Parameter(Mandatory = $true)][string]$ProjectPath,
  [Parameter(Mandatory = $true)][string[]]$Services,
  [switch]$Build = $true
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ProjectPath)) {
  throw "Project path not found: $ProjectPath"
}

$composeArgs = @("compose", "up", "-d")
if ($Build) {
  $composeArgs += "--build"
}
$composeArgs += $Services

Push-Location $ProjectPath
try {
  docker @composeArgs
  docker compose ps
} finally {
  Pop-Location
}
