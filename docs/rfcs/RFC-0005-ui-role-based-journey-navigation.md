# RFC-0005 UI Role-Based Journey Navigation

- Status: SUPERSEDED
- Date: 2026-02-23

## Supersession

The original `/suite` composition was retired under issue #573 because it published hard-coded
client, portfolio, workflow, and analytics claims and exposed technical policy diagnostics in the
primary business UI. `/suite` is now a compatibility alias of the canonical Home entry.

The durable authenticated advisor-first Home is governed separately by issue #470 and must not be
implemented until its principal/session authority is available. Existing Gateway-backed Advisor
Book, Portfolio, Performance, Advisory, Report Centre, and Manage routes remain the supported task
surfaces.

## Summary

Enhance command-center navigation flow with explicit role journeys for:
- Client Advisor
- Portfolio Manager

## Historical decision

Add journey panels in `/suite` that provide natural step-by-step navigation:

1. Client Advisor flow
- Portfolio intake
- Analytics context
- Proposal simulation
- Proposal pipeline submit/track

2. Portfolio Manager flow
- Decision console
- Proposal review pipeline
- Approval-chain entry
- Command center operating metrics

## Rationale

1. Improves clarity of end-to-end workflow ownership.
2. Reduces navigation friction between key platform features.
3. Aligns UI with lotus-gateway-orchestrated operating model.
