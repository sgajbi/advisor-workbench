# API Surface

## Product routes

- `/portfolio`
- `/portfolios`
- `/intake`
- `/performance`
- `/workbench`
- `/workbench/{portfolioId}`
- `/api/bff/*`

## Compatibility routes

- `/recommendations`
  redirects to supported active surfaces
- `/proposals`
- `/proposals/simulate`
- `/proposals/{proposalId}`
  compatibility redirects, not primary shell apps

## Current contract notes

- risk is currently served through `/performance` route mode selection, not a separate top-level URL
- internal browser-to-gateway traffic can flow through `/api/bff/*`
- canonical product proof should use `workbench.dev.lotus`, not ad hoc localhost URLs

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

Compatibility recommendation redirect:

```txt
http://workbench.dev.lotus/recommendations?portfolioId=PB_SG_GLOBAL_BAL_001
```

These examples are here to keep the active-versus-legacy route posture explicit.
