# Issue #786 Business Timestamp Evidence

## Evidence Classification

These are isolated optimized-production diagnostic renders of the Advisor Brief human-review
transaction. The scenario uses the process-owned Performance fixture for
`PB_SG_GLOBAL_BAL_001`; it does not prove a live Gateway or Lotus AI runtime, canonical readiness,
production identity, entitlement, demo readiness, or bank certification.

The product and browser-proof implementation under test is `d3b5c78e`. The evidence is committed
so reviewers can inspect the rendered result without treating ignored `output/` artifacts as
durable truth.

## Reviewer Views

| View | Evidence |
| --- | --- |
| 1440px workstation after source-confirmed review | [Open render](diagnostic-advisor-brief-reviewed-1440.png) |
| Human Review evidence close-up | [Open render](diagnostic-human-review-evidence-1440.png) |
| 519px compact workstation after source-confirmed review | [Open render](diagnostic-advisor-brief-reviewed-519.png) |

## Proven Behaviour

- No review request is sent before the advisor confirms the exact decision.
- Confirmation sends exactly one Workbench BFF request; the success state appears only after the
  returned source evidence proves persistence.
- Reloading the screen renders the persisted review evidence as
  **Recorded 21 Apr 2026, 03:22 UTC**.
- The visible disclosure does not contain the raw source value `2026-04-21T03:22:00Z`.
- The atomic `advisor-brief-human-review-evidence` record retains that exact source value in its
  machine-readable `data-recorded-at` attribute for canonical validation and support tooling.
- A second browser context configured for `Asia/Singapore` renders the same UTC disclosure and
  source attribute; it does not silently convert the instant to `11:22`.
- The source-confirmed evidence remains contained at 1440, 1024, 720, and 519 pixels.

## Presentation Contract

Exact audit instants require a source value containing `Z` or an explicit numeric offset. The
shared design-system formatter normalizes the instant to UTC and discloses the timezone in business
copy. Missing, malformed, or unzoned values fail closed to **Not reported**. Calendar-semantic
business dates remain separate and are not converted into timestamps.

The raw exact value may remain in source models and stable machine-readable evidence; it must not
become advisor-facing copy. Browser locale and timezone defaults are never presentation authority.

## Reproduction

```bash
npm run test:e2e:performance:advisor-brief-review
```

Result at `d3b5c78e`: `1 passed`. The scenario runs an isolated optimized Workbench fixture on
checkout-specific ports and leaves no listener behind. The shared canonical runtime is not started,
stopped, or modified.

Canonical `npm run live:validate` remains the release proof for the real Gateway/Lotus AI feedback
path. This diagnostic pack cannot substitute for that source-backed validation.
