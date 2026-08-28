# Getting Started

Current scope: this page covers the supported Workbench installation, local UI development, and
governed front-office runtime entry points. Local startup proves that the application can run; it
does not by itself certify populated source data, integrated panel support, or demo readiness.

## Quick Decision Map

| If you need to | Start with | Evidence boundary |
| --- | --- | --- |
| Install dependencies or work on isolated UI code | `make install`, then `make run` | Local development only |
| Validate Workbench with the governed Lotus services | `npm run live:stack:up`, then `npm run live:validate` | Integrated source and panel checks must pass |
| Capture support or demo evidence | Complete canonical validation before `npm run live:evidence` | Diagnostic output is not promoted as demo proof |

## Navigating Workbench

1. Use **My book** to select a source-backed portfolio from the advisor's current book. Returning
   there preserves the active review date when one is already selected.
2. Use **Workspace — Switch** to open the **Workspace directory** and move only between
   Gateway-published product capabilities. Unavailable entries remain visible for orientation but
   do not behave or appear like selectable destinations.
3. Within a selected portfolio, use **Daily work** for Portfolio review, Performance, Advice,
   Reporting, or Mandate management.
4. Open **All workspaces** for specialist records such as Holdings, Transactions, Cash movements,
   Risk, or Proposals.
5. In a multi-step workspace, confirm **Current workflow** first. **Change workflow step** appears
   only when at least one other step is selectable, and its availability count excludes
   source-disabled steps.

This is one responsive information architecture, not separate desktop and mobile products. On a
compact screen, open the current-view disclosure to reach the same task rail; Escape closes an open
navigation disclosure and returns focus to its trigger.

## Install

```bash
make install
```

## Local development

```bash
make run
```

## Canonical local runtime

```bash
npm run live:stack:up
npm run live:validate
```

Use `npm run live:stack:up:workbench-local` when Workbench UI changes need hot reload while the
rest of the canonical app set remains Docker-backed.

Canonical identities:

- [Workbench](http://workbench.dev.lotus)
- [Gateway](http://gateway.dev.lotus)
- [Manage](http://manage.dev.lotus)
- [Archive](http://archive.dev.lotus)
- [Render](http://render.dev.lotus)

Required environment posture:

```txt
BFF_BASE_URL=http://gateway.dev.lotus
```

Workbench BFF caller-context defaults:

```txt
WORKBENCH_BFF_ACTOR_ID=workbench-system
WORKBENCH_BFF_CALLER_APPLICATION=lotus-workbench
WORKBENCH_BFF_TENANT_ID=tenant-sg
WORKBENCH_BFF_REGION=APAC
WORKBENCH_BFF_BOOKING_CENTER_CODE=SG
WORKBENCH_BFF_ROLE=advisor
```

These values are injected only when a browser request does not provide explicit caller context.
Use the overrides for scenario-specific validation, entitlement testing, or client-demo evidence
capture that needs a named actor, tenant, region, booking center, or role.

### Lotus Idea local authority fixture

Canonical local startup sets the following server-side fixture for Lotus Idea queue, detail, and
candidate-action routes:

```txt
LOTUS_ENVIRONMENT=dev
WORKBENCH_IDEA_AUTH_MODE=development_configured
```

The BFF discards browser-supplied Idea authority headers and may use the configured local subject,
role, and `PB_SG_GLOBAL_BAL_001` entitlement only in explicitly declared `dev`, `development`, `local`, or `test`.
The fixture is rejected when the environment is unset or differs. Until the tracked authenticated session and token-claims resolver
is implemented, non-development Idea requests fail closed with `401` before Gateway is called.

### Advisor book local authority fixture

The own-book route uses a separate, BFF-owned development fixture:

```txt
WORKBENCH_ADVISOR_BOOK_AUTH_MODE=development_configured
WORKBENCH_ADVISOR_BOOK_ACTOR_ID=PM_SG_001
WORKBENCH_ADVISOR_BOOK_TENANT_ID=tenant-sg
WORKBENCH_ADVISOR_BOOK_REGION=APAC
WORKBENCH_ADVISOR_BOOK_BOOKING_CENTER_CODE=Singapore
WORKBENCH_ADVISOR_BOOK_ROLE=ADVISOR
NEXT_PUBLIC_WORKBENCH_ADVISOR_BOOK_AS_OF_DATE=2026-04-10
```

The BFF discards browser-supplied authority and adds only `advisor.book.read`. Development caller
authority is rejected outside `dev`, `development`, `local`, or `test`; UAT and production require
the future authenticated principal resolver tracked by Workbench #436. The public as-of value is an
explicitly configured local request-date fixture: an explicit URL date takes precedence, invalid
input does not fall back to it, and a missing valid date blocks the own-book request until the user
selects one.

### Advisor Cockpit local authority fixture

The portfolio-scoped advisor operating workflow uses a dedicated BFF-owned development fixture:

```txt
WORKBENCH_ADVISOR_COCKPIT_AUTH_MODE=development_configured
WORKBENCH_ADVISOR_COCKPIT_ACTOR_ID=advisor_sg_001
WORKBENCH_ADVISOR_COCKPIT_TENANT_ID=tenant-sg
WORKBENCH_ADVISOR_COCKPIT_REGION=APAC
WORKBENCH_ADVISOR_COCKPIT_BOOKING_CENTER_CODE=SG
WORKBENCH_ADVISOR_COCKPIT_LEGAL_ENTITY_CODE=SGPB
WORKBENCH_ADVISOR_COCKPIT_PRINCIPAL_STATUS=ACTIVE
WORKBENCH_ADVISOR_COCKPIT_PORTFOLIO_IDS=PB_SG_GLOBAL_BAL_001
```

The browser selects a portfolio but does not select the advisor, role, capability, legal entity,
principal posture, or entitlement. Workbench derives the advisor from the server-side actor,
checks the portfolio against the configured entitlement list, and supplies only the read or
acknowledgement capability needed by the exact allowlisted route. Authority in browser headers,
query parameters, or the acknowledgement body is rejected. The fixture is rejected outside
`dev`, `development`, `local`, or `test`; UAT and production require Workbench #436 and the
platform authenticated-principal contract in #563.

### Advisory Copilot local review authority fixture

Advisor-use copilot review submissions use a separate BFF-owned development fixture:

```txt
WORKBENCH_ADVISORY_COPILOT_AUTH_MODE=development_configured
WORKBENCH_ADVISORY_COPILOT_ACTOR_ID=desk_head_sg_001
WORKBENCH_ADVISORY_COPILOT_TENANT_ID=tenant-sg-001
WORKBENCH_ADVISORY_COPILOT_LEGAL_ENTITY_CODE=PB_SG
WORKBENCH_ADVISORY_COPILOT_ROLE=ADVISORY_SUPERVISOR
WORKBENCH_ADVISORY_COPILOT_PRINCIPAL_STATUS=ACTIVE
WORKBENCH_ADVISORY_COPILOT_PORTFOLIO_IDS=PB_SG_GLOBAL_BAL_001
```

The browser submits only the review action and business reason. Workbench strips browser-supplied
reviewer and authority headers, reads the source-owned Gateway copilot run, verifies the run
portfolio against the configured entitlement list, and forwards the run's proposal and portfolio
scope with `advisory.copilot.review`. Missing run scope or cross-entitlement scope fails closed
before the review mutation reaches Gateway.

## First checks

```txt
http://workbench.dev.lotus/portfolio
http://workbench.dev.lotus/book?asOfDate=2026-04-10
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
http://workbench.dev.lotus/data-products
```

If the product loads against localhost but not the canonical hostnames, fix the governed hosts and
runtime flow before debugging UI components.

`/data-products` uses the Workbench BFF to consume gateway domain-product catalog,
dependency-graph, and live trust certification endpoints. It should show an unavailable trust
posture until the gateway has access to the platform-generated RFC-0087 certification artifact.

## First docs to read

- [README.md](https://github.com/sgajbi/lotus-workbench/blob/main/README.md)
- [REPOSITORY-ENGINEERING-CONTEXT.md](https://github.com/sgajbi/lotus-workbench/blob/main/REPOSITORY-ENGINEERING-CONTEXT.md)
- [docs/operations/canonical-front-office-local-runtime.md](https://github.com/sgajbi/lotus-workbench/blob/main/docs/operations/canonical-front-office-local-runtime.md)
- [docs/documentation/product-architecture-blueprint.md](https://github.com/sgajbi/lotus-workbench/blob/main/docs/documentation/product-architecture-blueprint.md)
