# API Surface

## Product routes

- `/portfolio`
- `/portfolios`
- `/intake`
- `/performance`
- `/data-products`
- `/workbench`
- `/workbench/{portfolioId}`
- `/api/bff/*`

## Capability-gated shell navigation

- active product entries:
  `Portfolio`, `Performance`, `Risk`
- disabled entries in the current normalized shell bootstrap contract:
  `Proposal`, `Advisory`

Treat the active shell contract as the source of truth for supported front-office navigation. Do not
promote dormant labels into product ownership just because historical route files still exist.

## Compatibility routes

- `/recommendations`
  redirects to supported active surfaces
- `/proposals`
- `/proposals/simulate`
- `/proposals/{proposalId}`
  compatibility redirects, not primary shell apps

## Current contract notes

- risk is currently served through `/performance` route mode selection, not a separate top-level URL
- data-product discovery is served through `/data-products` and consumes gateway
  `/api/v1/domain-products/*` APIs through the internal BFF only
- internal browser-to-gateway traffic can flow through `/api/bff/*`
- canonical product proof should use `workbench.dev.lotus`, not ad hoc localhost URLs
- shell navigation support is narrower than the historical route set: `Proposal` and `Advisory`
  are currently disabled even though compatibility routes still exist
- canonical evidence should be taken from `output/playwright/live-canonical/` after
  `npm run live:validate`
- RFC-0108 observability coverage is implemented for supported Portfolio, Performance, Risk,
  Reporting, and legacy advisor Workbench gateway-backed reads/mutations. The coverage registry is
  code-backed and tested so active product surfaces cannot silently drift outside bounded
  route/panel/operation metrics.

## Route examples

Portfolio:

```txt
http://workbench.dev.lotus/portfolio
```

Performance:

```txt
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001
```

Performance risk mode:

```txt
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
```

Data products:

```txt
http://workbench.dev.lotus/data-products
```

Capability-gated navigation truth:

```txt
Active: Portfolio, Performance, Risk
Disabled: Proposal, Advisory
```

Compatibility recommendation redirect:

```txt
http://workbench.dev.lotus/recommendations?portfolioId=PB_SG_GLOBAL_BAL_001
```

Compatibility proposal redirect posture:

```txt
/proposals -> /portfolio
/proposals/{proposalId} -> /portfolio
/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001 -> /performance?portfolioId=PB_SG_GLOBAL_BAL_001
```

These examples keep the active-versus-legacy route posture explicit.
