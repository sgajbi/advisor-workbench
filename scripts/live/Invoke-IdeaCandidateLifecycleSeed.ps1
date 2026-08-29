[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$IdeaBaseUrl,
  [Parameter(Mandatory = $true)][string]$CandidateId,
  [Parameter(Mandatory = $true)][string]$GeneratedAtUtc,
  [Parameter(Mandatory = $true)][string]$TenantId,
  [Parameter(Mandatory = $true)][string]$BookId,
  [Parameter(Mandatory = $true)][string]$PortfolioId,
  [Parameter(Mandatory = $true)][string]$ClientId,
  [string]$CorrelationId = "corr-canonical-idea-lifecycle-seed"
)

$ErrorActionPreference = "Stop"
$invariantCulture = [System.Globalization.CultureInfo]::InvariantCulture
$dateStyles = [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal
$generatedAt = [DateTimeOffset]::Parse($GeneratedAtUtc, $invariantCulture, $dateStyles)
$encodedCandidateId = [uri]::EscapeDataString($CandidateId)
$ideaBaseUrl = $IdeaBaseUrl.TrimEnd('/')
$lifecycleStatuses = @(
  "enriched",
  "scored",
  "governance_checked",
  "ready_for_review"
)
$lifecycleRank = @{
  generated = 0
  enriched = 1
  scored = 2
  governance_checked = 3
  ready_for_review = 4
}
$detailHeaders = @{
  "X-Caller-Subject" = "canonical-front-office-lifecycle-seed"
  "X-Caller-Roles" = "advisor"
  "X-Caller-Capabilities" = "idea.candidate.detail.read"
  "X-Caller-Tenant-Ids" = $TenantId
  "X-Caller-Book-Ids" = $BookId
  "X-Caller-Portfolio-Ids" = $PortfolioId
  "X-Caller-Client-Ids" = $ClientId
  "X-Correlation-Id" = $CorrelationId
}

function Get-SourceLifecycleStatus {
  $detail = Invoke-RestMethod `
    -Uri "$ideaBaseUrl/api/v1/idea-candidates/$encodedCandidateId" `
    -Headers $detailHeaders
  $sourceCandidateId = [string]$detail.candidate.candidateId
  $sourceStatus = [string]$detail.candidate.lifecycleStatus
  if ($sourceCandidateId -ne $CandidateId) {
    throw "Canonical Lotus Idea detail returned candidate '$sourceCandidateId' instead of '$CandidateId'."
  }
  if (-not $lifecycleRank.ContainsKey($sourceStatus)) {
    throw "Canonical Lotus Idea candidate is in non-seedable source state '$sourceStatus'."
  }
  return $sourceStatus
}

$currentStatus = Get-SourceLifecycleStatus
for ($index = 0; $index -lt $lifecycleStatuses.Count; $index++) {
  $targetStatus = $lifecycleStatuses[$index]
  if ($lifecycleRank[$currentStatus] -gt $lifecycleRank[$targetStatus]) {
    continue
  }
  if ($currentStatus -eq $targetStatus) {
    Write-Host "Canonical Lotus Idea candidate already has source lifecycle '$currentStatus'."
    continue
  }
  if ($lifecycleRank[$currentStatus] -ne ($lifecycleRank[$targetStatus] - 1)) {
    throw "Canonical Lotus Idea lifecycle cannot progress from '$currentStatus' directly to '$targetStatus'."
  }
  $changedAtUtc = $generatedAt.AddMinutes($index + 1).ToString(
    "yyyy-MM-ddTHH:mm:ss.fffZ",
    $invariantCulture
  )
  $transitionIdentity = "canonical-idea-lifecycle:$CandidateId`:$targetStatus`:$GeneratedAtUtc"
  $headers = @{
    "X-Caller-Subject" = "canonical-front-office-lifecycle-seed"
    "X-Caller-Capabilities" = "idea.candidate.lifecycle.transition"
    "X-Correlation-Id" = $CorrelationId
    "Idempotency-Key" = $transitionIdentity
  }
  $payload = @{
    transitionId = $transitionIdentity
    targetLifecycleStatus = $targetStatus
    changedAtUtc = $changedAtUtc
    reasonCodes = @("review_required")
  }

  $response = Invoke-RestMethod `
    -Method Post `
    -Uri "$ideaBaseUrl/api/v1/idea-candidates/$encodedCandidateId/lifecycle-transitions" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body ($payload | ConvertTo-Json -Depth 5)

  $decision = [string]$response.persistence.decision
  $persistedCandidateId = [string]$response.persistence.candidateId
  if ($decision -notin @("accepted", "replayed")) {
    throw "Canonical Lotus Idea lifecycle transition to '$targetStatus' was not persisted. Decision: $decision"
  }
  if ($persistedCandidateId -ne $CandidateId) {
    throw "Canonical Lotus Idea lifecycle transition returned candidate '$persistedCandidateId' instead of '$CandidateId'."
  }
  $currentStatus = Get-SourceLifecycleStatus
  if ($currentStatus -ne $targetStatus) {
    throw "Canonical Lotus Idea detail returned state '$currentStatus' instead of '$targetStatus' after persistence."
  }

  Write-Host "Canonical Lotus Idea candidate reached source lifecycle '$targetStatus' ($decision)."
}
