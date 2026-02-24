param(
  [string]$ConfigPath = "scripts/automation/repos.json",
  [switch]$FastForwardOnly = $true,
  [switch]$Prune = $true,
  [string[]]$DefaultBranches = @("main", "master")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$repos = Get-Content $ConfigPath | ConvertFrom-Json
$results = @()

foreach ($repo in $repos) {
  $name = $repo.name
  $path = $repo.path

  if (-not (Test-Path $path)) {
    $results += [pscustomobject]@{
      repo = $name
      path = $path
      status = "missing"
      branch = ""
      detail = "path_not_found"
    }
    continue
  }

  $statusOutput = git -C $path status --porcelain
  $branch = git -C $path rev-parse --abbrev-ref HEAD

  git -C $path fetch --all $(if ($Prune) { "--prune" }) | Out-Null

  if ([string]::IsNullOrWhiteSpace(($statusOutput -join ""))) {
    if ($DefaultBranches -notcontains $branch) {
      $results += [pscustomobject]@{
        repo = $name
        path = $path
        status = "clean_non_default_branch_skipped_pull"
        branch = $branch
        detail = "branch_not_in_default_set"
      }
      continue
    }
    if ($FastForwardOnly) {
      try {
        $pullOutput = git -C $path pull --ff-only 2>&1
      } catch {
        $pullOutput = $_.ToString()
      }
    } else {
      try {
        $pullOutput = git -C $path pull 2>&1
      } catch {
        $pullOutput = $_.ToString()
      }
    }
    if ($LASTEXITCODE -ne 0) {
      $results += [pscustomobject]@{
        repo = $name
        path = $path
        status = "pull_failed"
        branch = $branch
        detail = ($pullOutput -join " `n")
      }
      continue
    }
    $results += [pscustomobject]@{
      repo = $name
      path = $path
      status = "synced"
      branch = $branch
      detail = ($pullOutput -join " `n")
    }
  } else {
    $results += [pscustomobject]@{
      repo = $name
      path = $path
      status = "dirty_skipped_pull"
      branch = $branch
      detail = "local_changes_detected"
    }
  }
}

$results | Sort-Object repo | Format-Table -AutoSize
