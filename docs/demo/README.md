# Advisor Workbench Demo Pack

## Goal

Run deterministic UI walkthroughs for:

1. the benchmark-aware `Performance` workstation, and
2. the proposal lifecycle / approval chain flow.

## Prerequisites

- lotus-advise running at `http://advise.dev.lotus`
- lotus-gateway running at `http://gateway.dev.lotus`
- UI running at `http://workbench.dev.lotus`
- lotus-core query running at `http://core-query.dev.lotus`
- lotus-core ingestion running at `http://core-ingestion.dev.lotus`
- lotus-performance running at `http://performance.dev.lotus`

## Performance Workstation Walkthrough

Open `http://workbench.dev.lotus/performance`.

Expected seeded runtime context:

- portfolio: `DEMO_ADV_USD_001`
- default benchmark: `Global Balanced 60/40`
- alternate benchmark: `Global Growth 80/20`

Verify:

1. summary first paint shows:
   - `DEMO_ADV_USD_001`
   - `As of 2026-03-27`
   - benchmark context
   - market value / MWR / active return context
2. the main chart stage supports:
   - `MTD`, `QTD`, `YTD`, `1Y`, `3Y`, `5Y`
   - explicit `From` / `To` dates
   - `Monthly` / `Quarterly`
   - `NET` / `GROSS`
   - benchmark selector sourced from the live benchmark catalog
3. switching benchmark from `Global Balanced 60/40` to `Global Growth 80/20` updates:
   - benchmark chip values
   - active return
   - multi-horizon comparison bars
   - attribution context
4. the lower analytical canvas shows:
   - `Multi-Horizon Returns`
   - `Attribution Over Time`
   - `Top / Bottom Contributors`
   - `Attribution Detail`
   - `Relative Segment Matrix`
   - `Contribution Detail`
5. `Advisor Brief` shows bounded provider provenance without opening browser dev tools:
   - provenance strip includes execution mode and source-ref count
   - audit drawer exposes provider mode, provider id, adapter kind, and model id
   - the same brief contract should render whether the upstream author was managed OpenAI or a local OpenAI-compatible model

## Proposal Workflow Walkthrough

1. Open `/proposals/simulate` and click `Save Draft`; Workbench creates and evaluates the draft through Gateway advisory workspace APIs backed by `lotus-advise`.
2. Open `/proposals` and select the created proposal.
3. On detail page:
   - click `Submit To Risk Review`
   - click `Approve Risk`
   - click `Record Client Consent`
4. Verify:
   - state becomes `EXECUTION_READY`
   - workflow timeline includes create/submit/approval/consent events
   - approvals panel includes risk and client consent records

## Reference Script

- `docs/demo/scripts/demo-ui-approval-chain.md`
