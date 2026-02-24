param(
  [string]$ConfigPath = "scripts/automation/repos.json",
  [string]$OutputPath = "output/pr-monitor.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$repos = Get-Content $ConfigPath | ConvertFrom-Json
$allResults = @()

foreach ($repo in $repos) {
  $ghRepo = $repo.github
  $itemsRaw = gh pr list --repo $ghRepo --search "author:@me state:open" --json number,title,headRefName,baseRefName,mergeStateStatus,isDraft,url,updatedAt 2>$null

  if ([string]::IsNullOrWhiteSpace($itemsRaw)) {
    $allResults += [pscustomobject]@{
      repo = $ghRepo
      pulls = @()
    }
    continue
  }

  $items = $itemsRaw | ConvertFrom-Json
  $allResults += [pscustomobject]@{
    repo = $ghRepo
    pulls = $items
  }
}

$dir = Split-Path -Parent $OutputPath
if ($dir -and -not (Test-Path $dir)) {
  New-Item -ItemType Directory -Force $dir | Out-Null
}

$allResults | ConvertTo-Json -Depth 8 | Set-Content $OutputPath
Write-Host "Wrote PR monitor output: $OutputPath"

foreach ($entry in $allResults) {
  foreach ($pr in $entry.pulls) {
    Write-Host ("[{0}] #{1} {2} | {3} | {4}" -f $entry.repo, $pr.number, $pr.title, $pr.mergeStateStatus, $pr.url)
  }
}
