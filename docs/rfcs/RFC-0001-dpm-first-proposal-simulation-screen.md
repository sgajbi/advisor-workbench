# RFC-0001: lotus-manage-First Proposal Simulation Screen

- Status: IMPLEMENTED
- Date: 2026-02-22

## Goal

Deliver proposal simulation UX first, integrated through lotus-gateway to lotus-manage only.

## Decision

- Primary route: `/proposals/simulate`.
- UI sends payload to lotus-gateway endpoint `POST /api/v1/proposals/simulate`.
- UI renders status and run id from lotus-manage simulation response.

## Out of Scope

- Portfolio core widgets and performance analytics integration in this phase.

## Acceptance Criteria

- Route available and functional with lotus-manage + lotus-gateway only.
- UI test coverage for base render and submit path.
- CI green with lint/typecheck/test/build.
