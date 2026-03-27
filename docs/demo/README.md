# Advisor Workbench Demo Pack

## Goal

Run deterministic UI walkthroughs for:

1. the benchmark-aware `Performance` workstation, and
2. the proposal lifecycle / approval chain flow.

## Prerequisites

- lotus-manage running at `http://127.0.0.1:8000`
- lotus-gateway running at `http://127.0.0.1:8100`
- UI running at `http://127.0.0.1:3000`
- lotus-core query running at `http://127.0.0.1:8201`
- lotus-core control plane running at `http://127.0.0.1:8202`
- lotus-performance running at `http://127.0.0.1:8002`

## Performance Workstation Walkthrough

Open `http://127.0.0.1:3000/performance`.

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

## Proposal Workflow Walkthrough

1. Open `/proposals/simulate` and click `Save Draft`.
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
