# RFC-0023 Slice 1: Risk Hardening Guardrail Baseline

- RFC: [RFC-0023](..\rfcs\RFC-0023-risk-workspace-ux-hardening-and-production-readiness.md)
- Date: 2026-04-08
- Status: completed

## Purpose

Slice 1 exists to lock in the architectural boundaries for the next Risk workspace hardening wave
before more UI reshaping lands.

This slice does not change production behavior.

It establishes explicit guardrails for:

1. Gateway-only browser integration,
2. shared methodology access,
3. shared analytical drill-down drawers,
4. no reintroduction of removed inline detail patterns.

## Guardrail Coverage

### Existing architecture boundary retained

The pre-existing RFC-0022 architecture guard continues to enforce:

1. no direct browser calls to `lotus-risk` analytics routes,
2. no legacy `/analytics/workbench/risk-proxy` references in Workbench runtime code,
3. no reintroduction of the removed `risk_proxy` field into the legacy Workbench analytics contract.

Primary test:

1. [rfc0022-risk-architecture-guard.test.ts](..\..\tests\unit\rfc0022-risk-architecture-guard.test.ts)

### New RFC-0023 hardening guards

Slice 1 adds explicit protection for the hardened Risk workspace interaction model:

1. hardened risk panels must use `RiskPanelInfoDrawer` for methodology and coverage access,
2. hardened risk panels must not reintroduce `RiskContextList` as a large persistent methodology
   block,
3. `Drawdown` must keep `View underwater path` as a drawer-backed drill-down action,
4. `Rolling Risk` must keep `View rolling series` as a drawer-backed drill-down action,
5. the Risk component layer must not reintroduce legacy inline-expansion labels such as
   `Expand underwater path`, `Expand rolling series`, or the older persistent
   `Coverage and methodology` framing.

Primary test:

1. [rfc0023-risk-hardening-guard.test.ts](..\..\tests\unit\rfc0023-risk-hardening-guard.test.ts)

## Runtime Behavior Check

Slice 1 also tightens one panel-level contract test so the runtime behavior is explicit:

1. `Risk Snapshot` must expose methodology through the on-demand access action,
2. methodology content must remain hidden until requested,
3. the panel should no longer render a visible persistent `Context and methodology` section on
   first paint.

Primary test:

1. [risk-snapshot-panel.test.tsx](..\..\tests\unit\risk-snapshot-panel.test.tsx)

## Why This Slice Matters

Without these guards, later refactors could silently regress the workspace back toward:

1. page-lengthening inline detail expansions,
2. duplicated panel-local methodology blocks,
3. inconsistent interaction models across modules,
4. looser separation between first-read business content and deeper analytical detail.

That would weaken the quality bar RFC-0023 is supposed to enforce.

## Validation

Recommended local validation for this slice:

1. `npm run test -- tests/unit/rfc0022-risk-architecture-guard.test.ts tests/unit/rfc0023-risk-hardening-guard.test.ts tests/unit/risk-snapshot-panel.test.tsx`
2. `npm run typecheck`
3. `npm run lint`
