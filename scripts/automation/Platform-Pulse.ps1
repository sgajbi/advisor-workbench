param(
  [string]$ConfigPath = "scripts/automation/repos.json"
)

$ErrorActionPreference = "Stop"

powershell -ExecutionPolicy Bypass -File "scripts/automation/Sync-Repos.ps1" -ConfigPath $ConfigPath
powershell -ExecutionPolicy Bypass -File "scripts/automation/PR-Monitor.ps1" -ConfigPath $ConfigPath
