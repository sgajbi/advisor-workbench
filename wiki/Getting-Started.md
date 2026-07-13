# Getting Started

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

## First checks

```txt
http://workbench.dev.lotus/portfolio
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
