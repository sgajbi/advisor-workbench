# RFC-0001: DPM-First Proposal Simulation Screen

- Status: IMPLEMENTED
- Date: 2026-02-22

## Goal

Deliver proposal simulation UX first, integrated through BFF to DPM only.

## Decision

- Primary route: `/proposals/simulate`.
- UI sends payload to BFF endpoint `POST /api/v1/proposals/simulate`.
- UI renders status and run id from DPM simulation response.

## Out of Scope

- Portfolio core widgets and performance analytics integration in this phase.

## Acceptance Criteria

- Route available and functional with DPM + BFF only.
- UI test coverage for base render and submit path.
- CI green with lint/typecheck/test/build.
