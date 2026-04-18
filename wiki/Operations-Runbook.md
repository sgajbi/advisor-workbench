# Operations Runbook

## Important operational checks

- use `workbench.dev.lotus` and `gateway.dev.lotus` for canonical product proof
- use seeded portfolio `PB_SG_GLOBAL_BAL_001` unless the slice explicitly targets another dataset
- keep diagnostic screenshots separate from final demo evidence
- validate the canonical stack before treating screenshots as review-ready
- treat capability-disabled shell entries as contract truth, not as something to work around in
  demo documentation

## Practical runtime flow

```powershell
npm run live:stack:up
npm run live:validate
npm run live:stack:down
```

## Browser-facing probes

```txt
http://workbench.dev.lotus/portfolio
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
```

## Output paths

- screenshots and summary:
  `output/playwright/live-canonical/`
- machine-readable summary:
  `output/playwright/live-canonical/live-validation-summary.json`

## Review-ready evidence

- use canonical validated captures for demos, PR review, and operator handoff
- keep pre-validation captures clearly labeled as diagnostic artifacts only
- when a route exists but is capability-disabled, capture the supported active path instead of the
  dormant compatibility page

## Key references

- [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- [docs/demo/README.md](../docs/demo/README.md)
