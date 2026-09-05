# Idea Action Retry Evidence

This pack proves Workbench issue #1002 at the rendered candidate-action boundary.

The isolated optimized-production Playwright journey forces an ambiguous source timeout, then
proves two distinct adviser paths:

- editing a review outcome or basis creates a new submission with a fresh idempotency key; and
- choosing **Retry exact conversion intent** preserves the retained payload and idempotency key.

The inline recovery notice shows the retained business terms before either action. Candidate facts
and the other supported actions remain available. The test does not simulate source persistence as
successful until the mocked Gateway response returns an accepted or replayed receipt and the
source-owned queue and detail refresh complete.

## Artifact

- `idea-action-exact-retry.png` — diagnostic fixture-contract proof of the retained review terms and
  explicit exact-retry choice after an ambiguous Gateway response.
- `idea-action-exact-retry-receipt.png` — source-confirmed exact conversion retry receipt showing
  the persisted terms separately from the adviser’s unsaved form changes.

This is browser contract evidence, not canonical live-service or production identity evidence.
