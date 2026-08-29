[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$IdeaBaseUrl,
  [Parameter(Mandatory = $true)][string]$CandidateId,
  [Parameter(Mandatory = $true)][string]$GeneratedAtUtc,
  [string]$CorrelationId = "corr-canonical-idea-lifecycle-seed"
)

$ErrorActionPreference = "Stop"
$invariantCulture = [System.Globalization.CultureInfo]::InvariantCulture
$dateStyles = [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal
$generatedAt = [DateTimeOffset]::Parse($GeneratedAtUtc, $invariantCulture, $dateStyles)
$encodedCandidateId = [uri]::EscapeDataString($CandidateId)
$lifecycleStatuses = @(
  "enriched",
  "scored",
  "governance_checked",
  "ready_for_review"
)

for ($index = 0; $index -lt $lifecycleStatuses.Count; $index++) {
  $targetStatus = $lifecycleStatuses[$index]
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
    -Uri "$($IdeaBaseUrl.TrimEnd('/'))/api/v1/idea-candidates/$encodedCandidateId/lifecycle-transitions" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body ($payload | ConvertTo-Json -Depth 5)

  $decision = [string]$response.persistence.decision
  $persistedCandidateId = [string]$response.persistence.candidateId
  $persistedStatus = [string]$response.persistence.lifecycleStatus
  if ($decision -notin @("accepted", "replayed")) {
    throw "Canonical Lotus Idea lifecycle transition to '$targetStatus' was not persisted. Decision: $decision"
  }
  if ($persistedCandidateId -ne $CandidateId) {
    throw "Canonical Lotus Idea lifecycle transition returned candidate '$persistedCandidateId' instead of '$CandidateId'."
  }
  if ($persistedStatus -ne $targetStatus) {
    throw "Canonical Lotus Idea lifecycle transition returned state '$persistedStatus' instead of '$targetStatus'."
  }

  Write-Host "Canonical Lotus Idea candidate reached source lifecycle '$targetStatus' ($decision)."
}
