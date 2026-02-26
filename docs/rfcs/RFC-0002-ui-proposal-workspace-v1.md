# RFC-0002: UI Proposal Workspace v1 (Draft/List/Detail/Submit)

- Status: IMPLEMENTED
- Date: 2026-02-22
- Depends on: RFC-0001

## Goal

Deliver a visible end-to-end advisor proposal flow on top of lotus-gateway + lotus-manage: create draft, list proposals, inspect detail, and submit draft for first review.

## Decision

UI routes:

- `/proposals/simulate` supports simulation and "Save Draft"
- `/proposals` lists proposals from lotus-gateway
- `/proposals/[proposalId]` shows detail and enables submit-for-review from `DRAFT`

lotus-gateway contract usage:

- simulate: `POST /api/v1/proposals/simulate`
- create: `POST /api/v1/proposals`
- list: `GET /api/v1/proposals`
- detail: `GET /api/v1/proposals/{proposal_id}`
- submit: `POST /api/v1/proposals/{proposal_id}/submit`

## Out of Scope

- Full approval chain UX (risk/compliance/client consent execution stages).
- Multi-service portfolio/performance widgets.

## Acceptance Criteria

- Integration tests cover list and detail submit interactions.
- Existing simulate test remains green.
- `make check` passes (lint/typecheck/test/build).
