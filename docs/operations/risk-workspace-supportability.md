# Risk Workspace Supportability

This note defines the operational supportability posture for the Workbench `Performance > Risk`
mode implemented under RFC-0022.

## Supported v1 modules

The Risk workspace is backed only by Gateway BFF routes over canonical `lotus-risk` stateful APIs.

| Module | Gateway route | First paint behavior | Detail behavior |
| --- | --- | --- | --- |
| Risk Snapshot | `GET /api/v1/workbench/{portfolioId}/risk/summary` | loaded on first paint | no secondary detail fetch |
| Concentration | `GET /api/v1/workbench/{portfolioId}/risk/concentration` | loaded on first paint with portfolio HHI, issuer HHI, top-driver identities, current/proposed comparisons, and coverage controls | simulation deltas only with explicit `sessionId` |
| Drawdown | `GET /api/v1/workbench/{portfolioId}/risk/drawdown` | summary and worst episodes on first paint | underwater series only when explicitly expanded |
| Rolling Risk | `GET /api/v1/workbench/{portfolioId}/risk/rolling` | rolling summaries on first paint | time series only when explicitly expanded |
| Historical Risk Attribution | `GET /api/v1/workbench/{portfolioId}/risk/attribution` | lazy-loaded after the shell renders | grouping and attribution selector changes refetch only the attribution module |

## Risk Snapshot first-read contract

Risk Snapshot is the executive first-read module for the Risk workspace.

The UI must answer three questions within the first viewport:

1. what the current portfolio risk posture is,
2. whether benchmark-relative measures are reliable enough to use,
3. what the front office should review next.

The first metric row is reserved for:

1. `Volatility`
2. `Sharpe`
3. `Beta`
4. `Tracking Error`

Secondary measures such as `Information Ratio`, `Sortino`, and `Value at Risk` remain
contract-backed, but they belong below the headline row as supporting interpretation rather than
the first executive read.

## Stateful-only rule

Workbench does not surface stateless risk execution.

Allowed execution modes:

1. `stateful` for summary, drawdown, rolling, and attribution.
2. `stateful` or `simulation` for concentration, where simulation requires an explicit sandbox
   session.

Blocked behaviors:

1. direct browser calls to `lotus-risk`,
2. stateless payload authoring in the UI,
3. free-form return-series upload,
4. browser-visible service hostnames outside Gateway.

## Active-risk attribution support matrix

The implemented active-risk support matrix is:

| Attribution type | Grouping | State |
| --- | --- | --- |
| `TOTAL_RISK` | `POSITION` | ready |
| `TOTAL_RISK` | `SECTOR` | ready |
| `TOTAL_RISK` | `ASSET_CLASS` | ready |
| `TOTAL_RISK` | `ISSUER` | ready |
| `ACTIVE_RISK` | `POSITION` | ready |
| `ACTIVE_RISK` | `SECTOR` | ready |
| `ACTIVE_RISK` | `ASSET_CLASS` | ready |
| `ACTIVE_RISK` | `ISSUER` | blocked |

`ACTIVE_RISK + ISSUER` remains blocked until upstream benchmark issuer exposure semantics exist.

## Supportability states

Every risk module returns explicit supportability items normalized to:

1. `ready`
2. `partial`
3. `unavailable`
4. `blocked`

The UI must render the upstream reason text when a state is not `ready`.

## Concentration contract posture

The concentration workspace uses a Gateway-normalized contract rather than exposing upstream
`lotus-risk` block names directly.

Current payload blocks:

1. `portfolio_concentration`
   - portfolio-level HHI current / proposed / delta
2. `single_position_concentration`
   - top-position weights
   - top-`n` cumulative weights
   - named current / proposed top-position drivers
3. `issuer_concentration`
   - issuer HHI current / proposed / delta
   - named current / proposed top-issuer drivers
   - coverage ratios and uncovered counts
4. `valuation_context`
   - portfolio and reporting currency
   - position / weight basis
5. `execution_context`
   - issuer grouping level
   - enrichment policy
   - cash / zero-quantity inclusion posture

This gives the front office three explicit answers on first paint:

1. how concentrated the live book is,
2. which position and issuer are driving that concentration,
3. how trustworthy the issuer concentration view is.

## Cache and refresh posture

Gateway owns bounded caching for repeated identical risk requests.

Rules:

1. cache keys include portfolio, period, basis, benchmark, as-of date, reporting currency, and
   session context where relevant,
2. heavy detail payloads are not fetched on first paint,
3. module refreshes stay isolated to the module that owns the query,
4. a failed heavy module must not blank the rest of Risk mode.

## Legacy compatibility posture

The old workbench analytics `risk_proxy` field is removed from the production contract.

Implications:

1. `src/app/workbench/[portfolioId]` links to the live Risk workspace instead of reading a legacy
   HHI value,
2. concentration analytics belong to the dedicated Risk BFF contract,
3. `/analytics/workbench/risk-proxy` remains removed and must not be reintroduced.
