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

The BFF discards browser-supplied authority and adds only `advisor.book.read`. This fixture is
rejected outside `dev`, `development`, `local`, or `test`; UAT and production require the future
authenticated principal resolver tracked by Workbench #436.

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

- [README.md](../README.md)
- [REPOSITORY-ENGINEERING-CONTEXT.md](../REPOSITORY-ENGINEERING-CONTEXT.md)
- [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- [docs/documentation/product-architecture-blueprint.md](../docs/documentation/product-architecture-blueprint.md)
