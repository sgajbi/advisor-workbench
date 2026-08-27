# Proposal Memo Reconciliation Evidence

This directory contains supporting visual evidence for Workbench #877.

`proposal-memo-awaiting-confirmation.png` shows the optimized-production recovery alert after
Gateway-backed memo review persistence succeeds while the first owning reads remain stale. It
offers one read-only **Refresh record** action without claiming confirmation.

The screenshot is not persistence proof. The browser scenario in
`tests/e2e/proposal-memo-posture.spec.ts` additionally proves that the screen presents **Awaiting
confirmation**, memo mutations remain unavailable, the review mutation count remains exactly one,
keyboard refresh reconciles the exact source record, and success appears only after the refreshed
evidence agrees.
