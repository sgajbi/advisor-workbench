# RFC-0022 Slice 1 Risk Workspace Inventory

- Date: 2026-04-07
- Scope: RFC approval and current-state inventory
- Workbench branch: `feat/rfc0022-stateful-risk-workspace-ui`
- Production behavior change: none

## Slice 1 Decision Record

The approved RFC-0022 v1 direction is:

1. add `Risk` as a Performance workspace mode,
2. surface only stateful risk execution in Workbench,
3. allow concentration simulation only when tied to an explicit sandbox/session context,
4. route all Workbench risk reads through Gateway BFF contracts,
5. remove the old Gateway `/analytics/workbench/risk-proxy` path instead of wrapping it,
6. expose only supported `ACTIVE_RISK` attribution dimensions and explicitly block unsupported combinations.

## lotus-risk Baseline

Reviewed branch:

```text
fix/docker-upstream-runtime-validation...origin/fix/docker-upstream-runtime-validation
```

Working tree note:

```text
M docs/domain-apis/lotus-core-performance-requirements-for-historical-attribution.md
M src/app/services/benchmark_exposure_history.py
M tests/integration/test_historical_attribution_endpoint.py
M tests/unit/test_benchmark_exposure_history.py
?? .tmp_live_probe_results.json
```

Slice 1 treats `lotus-risk` as read-only because active hardening work is in progress.

Available canonical `lotus-risk` routes for the Workbench Risk BFF:

| Capability | Canonical route | UI posture |
|---|---|---|
| Risk Snapshot | `POST /analytics/risk/calculate` | stateful only |
| Drawdown | `POST /analytics/risk/drawdown` | stateful only |
| Rolling Risk | `POST /analytics/risk/rolling-metrics` | stateful only |
| Concentration | `POST /analytics/risk/concentration` | stateful; simulation only with sandbox/session |
| Historical Risk Attribution | `POST /analytics/risk/historical-attribution` | stateful `TOTAL_RISK`; stateful `ACTIVE_RISK` for `POSITION`, `SECTOR`, `ASSET_CLASS`; `ISSUER` gated |
| Capabilities | `GET /integration/capabilities` | Gateway capability aggregation |

Legacy route status:

```text
POST /analytics/workbench/risk-proxy -> removed from lotus-risk runtime surface
```

## Gateway Legacy Risk-Proxy Inventory

Command:

```powershell
rg -n "analytics/workbench/risk-proxy|get_workbench_risk_proxy|riskProxy|risk_proxy|WorkbenchRiskProxy" src tests docs
```

Production references that must be removed or replaced in later slices:

| Area | Evidence | Required Slice |
|---|---|---|
| Gateway client calls removed endpoint | `src/app/clients/lotus_analytics_client.py#get_workbench_risk_proxy` | Slice 2 |
| Gateway service merges legacy proxy result | `src/app/services/workbench_service.py` risk-proxy merge/fallback block | Slice 2 |
| Gateway Workbench contract contains legacy proxy field | `src/app/contracts/workbench.py#WorkbenchRiskProxy` and `risk_proxy` | Slice 2 or new BFF cutover |

Test references to update:

| Area | Evidence | Required Slice |
|---|---|---|
| Router integration tests | `tests/integration/test_workbench_router.py` | Slice 2 |
| Workbench service tests | `tests/unit/test_workbench_service.py`, `tests/unit/test_workbench_service_additional.py` | Slice 2 |
| Upstream client tests | `tests/unit/test_upstream_clients.py` | Slice 2 |

## Workbench Risk Surface Inventory

Command:

```powershell
rg -n "analytics/workbench/risk-proxy|analytics/risk/|risk\\.dev\\.lotus|risk_proxy|riskProxy|Concentration Signal|HHI|risk-and-suitability" src tests docs
```

Active UI references to replace or redirect during implementation:

| Area | Evidence | Required Slice |
|---|---|---|
| Workbench page reads legacy risk proxy | `src/app/workbench/[portfolioId]/page.tsx` reads `analytics?.risk_proxy.hhi_proposed` | Slice 2 or Slice 3 cutover |
| Workbench type exposes legacy risk proxy | `src/features/workbench/types.ts` `risk_proxy` | Slice 2 or Slice 3 cutover |
| Workbench decision readiness renders HHI signal | `src/features/workbench/components/decision-readiness-panel.tsx` | Slice 2 degradation, Slice 3/5 replacement |
| Portfolio risk nav points to old route | `src/apps/portfolio/workspace-config.ts` `/risk-and-suitability` | Slice 9 |
| Shell registry has disabled/placeholder risk app route | `src/shell/app-registry.ts` `/risk-and-suitability`, `/risk` | Slice 9 or later shell decision |

Architecture guard added in Slice 1:

```text
tests/unit/rfc0022-risk-architecture-guard.test.ts
```

The guard prevents new browser-side code under `src/` from introducing:

1. raw `lotus-risk` analytics paths,
2. `risk.dev.lotus` service URLs,
3. the removed `/analytics/workbench/risk-proxy` path.

## Approved Placement

The first-class Risk workspace is a Performance mode:

```text
Summary | Analysis | Advisor Brief | Risk | Evidence
```

Rationale:

1. risk is analytical and benchmark-aware,
2. it shares period, basis, as-of, and benchmark context with Performance,
3. Portfolio should link into Risk rather than duplicate full risk analytics,
4. Advisor Brief can cite Risk only after Gateway-backed evidence exists.

## Slice 1 Exit Criteria

Status:

| Criteria | Result |
|---|---|
| RFC scope approved | Done |
| Legacy Gateway risk-proxy inventory recorded | Done |
| Workbench risk/concentration surface inventory recorded | Done |
| lotus-risk branch baseline recorded | Done |
| Statefulness and active-risk gating confirmed | Done |
| Browser-to-risk direct-call guard added | Done |
| Production behavior unchanged | Done |

Next slice:

```text
Slice 2: Gateway legacy risk-proxy removal
```

## Slice 2 Completion Note

Status: completed on 2026-04-07.

Gateway branch:

```text
feat/rfc0022-stateful-risk-workspace-bff
```

Completed changes:

1. removed the Gateway client method for `/analytics/workbench/risk-proxy`,
2. removed WorkbenchService's split risk-proxy client dependency,
3. changed legacy Workbench analytics risk output to an explicit controlled unavailable state,
4. added a Gateway source guard preventing the removed endpoint and client method from returning,
5. updated Workbench to treat `risk_proxy` as nullable and show `Concentration Risk: UNAVAILABLE`,
6. surfaced analytics partial failures in the Workbench page so the risk gap is visible in the
   operational degraded-state flow.

Slice 2 validation:

```text
lotus-gateway:
python -m pytest tests/unit/test_workbench_service.py tests/unit/test_workbench_service_additional.py tests/unit/test_upstream_clients.py tests/unit/test_rfc0022_risk_proxy_guard.py tests/integration/test_workbench_router.py -q
python -m ruff check src tests

lotus-workbench:
npm test -- --run tests/integration/workbench-page.test.tsx tests/unit/rfc0022-risk-architecture-guard.test.ts tests/unit/workbench-api.test.ts
npm run lint
npm run typecheck
```

Slice 3 remains responsible for introducing the new stateful Gateway Risk BFF. Slice 2 intentionally
does not add a replacement metric because every UI feature must be genuinely backed by supported
backend functionality.
