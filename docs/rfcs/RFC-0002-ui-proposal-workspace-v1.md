# RFC-0002: UI Proposal Workspace v1 (Draft/List/Detail/Submit)

- Status: IMPLEMENTED
- Date: 2026-02-22
- Depends on: RFC-0001

## Goal

Deliver a visible end-to-end advisor proposal flow on top of lotus-gateway and the
`lotus-advise` advisory proposal contract: create draft, list proposals, inspect detail, and submit
draft for first review. Discretionary mandate rebalance execution remains a separate
`lotus-manage` workflow.

## Decision

UI routes:

- `/proposals/simulate` supports simulation and "Save Draft"
- `/proposals` lists proposals from lotus-gateway
- `/proposals/[proposalId]` shows detail and enables submit-for-review from `DRAFT`

lotus-gateway contract usage:

- simulate/save draft screen: `/api/v1/advisory-workspaces*`
- create: `POST /api/v1/proposals`
- list: `GET /api/v1/proposals`
- detail: `GET /api/v1/proposals/{proposal_id}`
- submit: `POST /api/v1/proposals/{proposal_id}/submit`

Gateway routes proposal queue/detail calls to the `lotus-advise` `/advisory/proposals*` upstream
family and advisory workspace calls to the `lotus-advise` advisory workspace upstream family.
Workbench must not couple this advisory proposal surface to `lotus-manage` DPM rebalance execution
or `/rebalance/simulate`.

## Out of Scope

- Full approval chain UX (risk/compliance/client consent execution stages).
- Multi-service portfolio/performance widgets.

## Acceptance Criteria

- Integration tests cover list and detail submit interactions.
- Existing simulate test remains green.
- `make check` passes (lint/typecheck/test/build).
