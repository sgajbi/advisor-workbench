# Single-Report Receipt Binding Evidence

Workbench #1004 closes a report-ordering correctness gap without changing the Report Centre
workflow or Gateway contract. A single-report response becomes visible as accepted only when its
strictly parsed receipt proves both identities supplied by Gateway:

- `idempotency_key` equals the exact reviewed request key; and
- the encoded final segment of `status_url` decodes to the returned opaque `report_job_id`.

The check runs before Workbench stores the handle or publishes accepted state. Wrong keys,
inconsistent job/status links, malformed paths, and malformed receipt shapes therefore remain
**Report request not accepted** with no unverified support reference. An unchanged retry preserves
the byte-equivalent request and key. Once a valid receipt is accepted, a separate history refresh
failure keeps that acceptance and the last confirmed history visible with an explicit freshness
warning.

## Proof

- `tests/unit/report-job-receipt.test.ts` proves exact identity, encoded opaque job ids, wrong keys,
  path mismatch, extra segments, query/fragment ambiguity, malformed encoding, absolute URLs, and
  unsupported paths.
- `tests/unit/report-ordering-contracts.test.ts` proves malformed success envelopes fail strict
  parsing.
- `tests/integration/report-ordering-workspace.test.tsx` proves rejected receipts never store a
  handle, same-key replay succeeds, accepted-order state survives a failed history refresh, and the
  existing cross-generation and batch safeguards remain intact.
- `tests/e2e/report-centre-state.smoke.spec.ts` proves the optimized browser never presents a
  mismatched receipt as accepted and never exposes either conflicting job identity.

No screenshot is required: the change deliberately prevents invalid success presentation and does
not alter valid Report Centre composition. The browser regression is the stronger rendered-state
evidence. No Gateway, Report, dependency, runtime, identity, entitlement, or platform skill change
is required.
