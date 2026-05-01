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

- workbench: `http://workbench.dev.lotus`
- gateway: `http://gateway.dev.lotus`
- manage: `http://manage.dev.lotus`
- archive: `http://archive.dev.lotus`
- render: `http://render.dev.lotus`

Required environment posture:

```txt
BFF_BASE_URL=http://gateway.dev.lotus
```

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
