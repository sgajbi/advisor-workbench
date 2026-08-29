# Canonical DPM Proof — Issues 940–943

These diagnostic captures come from the governed `PB_SG_GLOBAL_BAL_001` browser journey on
30 August 2026. They show the Workbench rendering Gateway-backed DPM evidence after the source
mapping, caller-scope, and exact-heading corrections in this delivery slice.

| Screen | What the capture proves | Owning issue |
| --- | --- | --- |
| [Outcome reviews](./diagnostic-outcome-review.png) | Expected and realised snapshot evidence is available from the selected source review record. | #940 |
| [PM operating quality](./diagnostic-pm-operating-quality.png) | The Workbench caller context can read the seeded PM-quality evidence created for the same tenant. | #942 |
| [PM Copilot](./diagnostic-pm-copilot.png) | Canonical validation reaches the business-first `PM Copilot` and `Decision-support workflows` hierarchy. | #943 |

## Evidence boundary

These are diagnostic review artifacts, not client-demo certification. The full cross-screen run
continued beyond these panels and later stopped because `performance.summary` was source-reported
as partial while canonical panel governance required ready. Workbench did not upgrade that state or
weaken the assertion. The upstream calculation gap remains tracked by
[lotus-core#1069](https://github.com/sgajbi/lotus-core/issues/1069) and
[lotus-performance#250](https://github.com/sgajbi/lotus-performance/issues/250).

Raw identifiers or source reason codes visible in these captures remain evidence for the open
product-copy programme in #798; their presence is not a claim that the broader copy programme is
complete.
