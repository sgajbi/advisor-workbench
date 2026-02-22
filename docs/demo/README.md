# Advisor Workbench Demo Pack

## Goal

Run a deterministic UI walkthrough for proposal lifecycle and approval chain.

## Prerequisites

- DPM running at `http://127.0.0.1:8000`
- BFF running at `http://127.0.0.1:8100`
- UI running at `http://127.0.0.1:3000`

## Walkthrough

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
