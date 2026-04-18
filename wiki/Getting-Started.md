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

Canonical identities:

- workbench: `http://workbench.dev.lotus`
- gateway: `http://gateway.dev.lotus`

Required environment posture:

```txt
BFF_BASE_URL=http://gateway.dev.lotus
```

## First checks

```txt
http://workbench.dev.lotus/portfolio
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001
```

If the product loads against localhost but not the canonical hostnames, fix the governed hosts and
runtime flow before debugging UI components.

## First docs to read

- [README.md](../README.md)
- [REPOSITORY-ENGINEERING-CONTEXT.md](../REPOSITORY-ENGINEERING-CONTEXT.md)
- [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- [docs/documentation/product-architecture-blueprint.md](../docs/documentation/product-architecture-blueprint.md)
