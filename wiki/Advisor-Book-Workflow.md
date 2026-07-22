# Advisor Book Workflow

`/book` is the source-backed entry point for a relationship manager's supported own-book
portfolio coverage.

## Business flow

1. Open **My book** from the portfolio context switcher.
2. Confirm the own-book scope, business date, booking centre, availability, and operating
   limitations.
3. Review source membership counts. Client counts are limited to the returned page; Lotus does
   not present them as households.
4. Filter by an exact client reference or supported mandate type, sort by a Gateway-supported
   field, and page through source results.
5. Open a portfolio to continue into Portfolio Review.
6. From Portfolio, Allocation, Positions, Transactions, Income, Cashflow, Performance, Risk,
   Proposal, Advisory, Reports, or Manage, use **Portfolio context** to change portfolio while
   keeping the current business task and supported filters. Workbench loads own-book choices only
   when this disclosure is opened.

## Source and authority

- Workbench calls Gateway `GET /api/v1/advisor-book/portfolios` through its same-origin BFF.
- Gateway consumes Core `PortfolioManagerBookMembership:v1`; Workbench validates the exact `v1`
  own-book contract and does not reconstruct membership.
- The BFF removes browser-supplied identity, tenant, region, booking-centre, role, and capability
  headers. Development configuration is allowed only in an explicitly development-scoped runtime.
- UAT and production fail closed until Workbench #436 provides an authenticated principal.

## Deliberate boundaries

This first slice supports own-book membership only. It does not claim or calculate:

- team, delegated, or supervisor coverage,
- households or grouped client relationships,
- book or client AUM,
- source-backed attention ranking or favourites,
- suitability, recommendation, communication, order, or execution authority.

If Gateway reports tenant scope as trusted-context-only, legacy advisor projection, stale evidence,
or another source limitation, Workbench keeps that boundary visible. If membership is unavailable,
Workbench shows an explicit unavailable or permission state and does not substitute a global
portfolio catalogue.

## Canonical proof

The governed browser validator requires exactly one canonical portfolio in the returned own-book
scope. It proves `PortfolioManagerBookMembership:v1`, a governed role-assignment basis, current
accepted snapshot/content evidence, the exact requested business-date scope, and
`portfolio_party_role_assignments` / `role_type` lineage;
legacy projection, duplicate membership, stale evidence, or unrelated degradation fails closed.
Trusted-context-only tenant scope is accepted only as the explicit, separately owned Core #798
limitation and is recorded in the machine-readable summary. The validator then classifies
`advisor.book_overview` and captures `advisor-book-overview-live.png` only after the API and panel
checks pass. The governed platform panel registry must contain that panel before the screenshot can
be treated as demo-ready evidence; publication is tracked by lotus-platform #583.
