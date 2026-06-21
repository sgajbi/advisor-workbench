# UI Approval Chain Demo Script

Use this sequence during demos:

1. Route: `/proposals/simulate`
2. Input:
   - `Created By`: `advisor_demo_1`
   - `Proposal Title`: `Demo Approval Chain`
3. Click `Save Draft`; Workbench creates/evaluates a Gateway advisory workspace and captures the handed-off `proposal_id`.
4. Open `/proposals/{proposal_id}`.
5. Action sequence:
   - `Submit To Risk Review`
   - `Approve Risk`
   - `Record Client Consent`
6. Validate:
   - state displayed as `EXECUTION_READY`
   - timeline has `CREATED`, `SUBMITTED_FOR_RISK_REVIEW`, `RISK_APPROVED`, `CLIENT_CONSENT_RECORDED`
   - approvals list has at least `RISK` and `CLIENT_CONSENT`
