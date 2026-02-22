# RFC-0003: UI Approval Chain v1 and Supportability Panels

- Status: IMPLEMENTED
- Date: 2026-02-22
- Depends on: RFC-0002

## Goal

Complete the proposal workflow UI for first operational path: submit, approve, consent, and visible workflow evidence.

## Decision

Proposal detail route supports state-driven actions:

- `DRAFT` -> submit to risk/compliance
- `RISK_REVIEW` -> approve risk
- `COMPLIANCE_REVIEW` -> approve compliance
- `AWAITING_CLIENT_CONSENT` -> record client consent

Also render:

- workflow timeline (`/workflow-events`)
- approvals list (`/approvals`)

## Acceptance Criteria

- Integration tests cover actionable states and API action dispatch.
- API unit tests validate URL/route mapping.
- CI and Docker parity checks are green.
