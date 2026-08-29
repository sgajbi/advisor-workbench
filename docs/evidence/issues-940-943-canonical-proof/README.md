# Canonical DPM Proof — Issues 940–943

These diagnostic captures come from capture session
`workbench-live-validate-20260830T034935+0800-a59a1b72` on 30 August 2026. The
[run manifest](./run-manifest.json) binds the images to Workbench head `a59a1b72`, the
`canonical-front-office-demo-data-contract` version `1.0.0`, RFC-0076, exact timestamps, and
SHA-256 digests. They show the Workbench rendering Gateway-backed DPM evidence after the source
mapping, caller-scope, and exact-heading corrections in this delivery slice.

| Screen | What the capture proves | Owning issue |
| --- | --- | --- |
| [Outcome reviews](./diagnostic-outcome-review.png) | Expected and realised snapshot evidence is available from the selected source review record. | #940 |
| [PM operating quality](./diagnostic-pm-operating-quality.png) | The Workbench caller context can read the seeded PM-quality evidence created for the same tenant. | #942 |
| [PM Copilot](./diagnostic-pm-copilot.png) | Canonical validation reaches the business-first `PM Copilot` and `Decision-support workflows` hierarchy. | #943 |

## Evidence boundary

These are diagnostic review artifacts, not client-demo certification. The browser journey captured
Performance before these DPM panels, then completed the DPM captures shown here. After the browser
closed, final panel-governance reconciliation rejected `performance.summary` because it had been
source-reported as partial while the registry required ready. The validation summary writer runs
after that reconciliation, so no current-run summary was produced; the manifest records this failed
terminal stage instead of reusing the stale summary already present in the output directory.
Workbench did not upgrade that state or weaken the assertion. The upstream calculation gap remains
tracked by
[lotus-core#1069](https://github.com/sgajbi/lotus-core/issues/1069) and
[lotus-performance#250](https://github.com/sgajbi/lotus-performance/issues/250).

Raw identifiers or source reason codes visible in these captures remain evidence for the open
product-copy programme in #798; their presence is not a claim that the broader copy programme is
complete.
