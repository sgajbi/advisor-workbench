# RFC-0005 UI Role-Based Journey Navigation

- Status: IMPLEMENTED
- Date: 2026-02-23

## Summary

Enhance command-center navigation flow with explicit role journeys for:
- Client Advisor
- Portfolio Manager

## Decision

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
