# Portfolio Record Route Bundle Governance

## Purpose

The Allocation, Positions, Transactions, Cashflow, and Income routes support distinct private-
banking review tasks. They share portfolio acquisition, navigation, evidence, and degraded-state
behavior, but must not ship unrelated task workspaces in the same initial client graph.

## Composition boundary

1. `src/apps/portfolio/portfolio-record-screen-data.ts` loads the selected portfolio and its
   Gateway-backed record data on the server.
2. `portfolio-record-screen-shell.tsx` renders the reusable record frame, business identity,
   navigation, evidence rail, KPIs, and unavailable state.
3. Each route imports one task-owned Client entry point. Grid dependencies belong only to
   Allocation, Positions, and Transactions; Cashflow and Income remain non-grid tasks.
4. Route `loading.tsx` and `error.tsx` files bind one reusable, layout-stable state frame to the
   correct business task.

Do not replace this with a client dispatcher that statically imports all five workspaces. Branching
on a `screen` prop after static imports does not isolate the client module graph.

## Production budget

`npm run build` runs `next build` and then `npm run quality:portfolio-record-bundles`. The quality
script reads `.next-build/app-build-manifest.json`, sums uncompressed initial JavaScript asset bytes, and
inspects those assets for the AG Grid module marker.

| Business task | Raw initial JS budget | AG Grid posture |
| --- | ---: | --- |
| Allocation | 4.50 MB | Required |
| Positions | 4.50 MB | Required |
| Transactions | 4.50 MB | Required |
| Cashflow | 3.35 MB | Forbidden |
| Income and activity | 3.35 MB | Forbidden |

The budgets retain bounded build variance while preventing Cashflow and Income from returning to
the 4.16 MB to 4.18 MB grid-task range. They are not compressed transfer-size claims.

## Verification

Run:

```text
npm run build
npm test -- --run tests/unit/portfolio-record-bundle-budget.test.ts
```

The build must print all five rows and finish with `Portfolio record bundle budgets passed.` A
missing route, missing asset, over-budget graph, absent required grid, or grid in a non-grid task is
a release-blocking failure.

When a legitimate business requirement changes a task graph, first preserve route-local ownership,
record before/after production evidence in an issue, and update the implementation, test fixtures,
budget, this document, repository context, and research/codebase ledgers together. Do not raise a
budget merely to make CI pass.

## Baseline and current evidence

Issue #481 recorded a 1.31 MB Next.js First Load JS baseline for every record route. After task
isolation, the same production report records 988 kB for Cashflow and approximately 980 kB for Income, while the
three grid routes retain their business behavior. The deterministic raw report records 3.07 MB and
3.04 MB respectively and confirms AG Grid is absent from both initial graphs.

No Gateway contract, public route, supported feature, or operator procedure changed. Repo-authored
wiki content therefore requires no change for this architecture slice.
