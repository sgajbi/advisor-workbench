# Issue 855 — Hydration relationship evidence

This diagnostic pack records the populated canonical-portfolio browser state used to reproduce and
correct the shared Workbench relationship-id hydration mismatch. It is reviewer evidence, not a
production or bank certification claim.

## Scope

- portfolio: `PB_SG_GLOBAL_BAL_001`
- affected route: `/workbench/PB_SG_GLOBAL_BAL_001?portfolioId=PB_SG_GLOBAL_BAL_001`
- comparison routes: `/performance` and `/portfolio` for the same portfolio
- source boundary: the already-running governed local Workbench and Gateway runtime; no service was
  restarted or replaced for this diagnostic pass

## Before

React reported different server and initial-client ids for the shared portfolio rail and the Manage
decision worklist. The server relationships were internally valid, but React would not patch the
client-calculated attributes. Exact before-state values and the primary-source diagnosis are
recorded on [issue #855](https://github.com/sgajbi/lotus-workbench/issues/855#issuecomment-5396341991).

## After

The shared components receive an explicit semantic `relationshipIdBase` from the owning business
screen. A fresh Manage document load produced no console or page error, no duplicate id, and one
present target for every `aria-controls` value. Fresh Performance and Portfolio document loads
reported the same clean relationship posture.

- `diagnostic-manage-relationships-1440.png` — desktop workstation composition
- `diagnostic-manage-relationships-519.png` — compact workstation composition
- `hydration-relationship-proof.json` — machine-readable route and relationship evidence

Optimized-production proof passed on implementation head `59d0fa56` with checkout-owned fixture
Gateways, ports, and `.next-build` output. The repository-owned scenarios exercised Manage at four
widths, Portfolio Review at seven widths, and Performance at three widths. Each route asserted its
exact semantic relationship ids, one present target for every relationship, no duplicate document
ids, head-managed styles, and no browser console or uncaught page error.

The tests use one reusable relationship-evidence helper rather than route-local DOM checks. This
keeps the regression proof aligned as more Workbench screens adopt the shared rail and worklist.

## Primary sources

- [React `useId`](https://react.dev/reference/react/useId)
- [Next.js confirmed composition-sensitive hydration defect](https://github.com/vercel/next.js/issues/84029)
- [WAI-ARIA disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [W3C unique-id technique](https://www.w3.org/WAI/WCAG21/Techniques/html/H93)
