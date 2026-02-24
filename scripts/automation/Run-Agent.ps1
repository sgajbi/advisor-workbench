param(
  [int]$IntervalSeconds = 120,
  [string]$ConfigPath = "scripts/automation/repos.json",
  [string]$OutputPath = "output/agent-status.md",
  [switch]$Once
)

$ErrorActionPreference = "Stop"

function Write-Status {
  param([string]$Path, [string[]]$Lines)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force $dir | Out-Null
  }
  $Lines | Set-Content $Path
}

while ($true) {
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

  $syncOutput = & powershell -ExecutionPolicy Bypass -File "scripts/automation/Sync-Repos.ps1" -ConfigPath $ConfigPath 2>&1 | Out-String
  $prOutput = & powershell -ExecutionPolicy Bypass -File "scripts/automation/PR-Monitor.ps1" -ConfigPath $ConfigPath -OutputPath "output/pr-monitor.json" 2>&1 | Out-String

  $lines = @()
  $lines += "# Platform Agent Status"
  $lines += ""
  $lines += "Updated: $timestamp"
  $lines += ""
  $lines += "## Repo Sync"
  $lines += '```text'
  $lines += $syncOutput.TrimEnd()
  $lines += '```'
  $lines += ""
  $lines += "## Open PRs (author:@me)"
  $lines += '```text'
  $lines += $prOutput.TrimEnd()
  $lines += '```'

  Write-Status -Path $OutputPath -Lines $lines
  Write-Host "[$timestamp] agent iteration complete. Next run in $IntervalSeconds sec."

  if ($Once) {
    break
  }

  Start-Sleep -Seconds $IntervalSeconds
}
