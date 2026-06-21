# RFC-0001: Advisory Proposal Simulation Screen

- Status: IMPLEMENTED
- Date: 2026-02-22

## Goal

Deliver proposal simulation UX first, integrated through lotus-gateway to the advisory proposal
contract. The current upstream owner is `lotus-advise`; historical `lotus-manage` proposal
compatibility is not the product ownership model.

## Decision

- Primary route: `/proposals/simulate`.
- UI creates and evaluates advisory proposal drafts through Gateway
  `/api/v1/advisory-workspaces*` endpoints backed by `lotus-advise`.
- UI renders workspace status and saved draft posture from the Gateway advisory workspace response.

## Out of Scope

- Portfolio core widgets and performance analytics integration in this phase.

## Acceptance Criteria

- Route available and functional through the Gateway advisory proposal contract.
- UI test coverage for base render and submit path.
- CI green with lint/typecheck/test/build.
