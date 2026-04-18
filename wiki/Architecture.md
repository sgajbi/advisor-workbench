# Architecture

## Runtime model

- Next.js App Router application
- app-route mounting under `src/app/`
- app-local product ownership under `src/apps/`
- shared primitives under `src/design-system/`
- shell composition under `src/shell/`
- internal `/api/bff/*` proxy bridge to `lotus-gateway`

## Product-surface map

- `Portfolio`
  primary holdings, allocation, readiness, and next-actions experience
- `Performance`
  benchmark-aware performance, analysis, advisor brief, evidence, and risk modes
- `Workbench`
  compatibility workspace entry and portfolio-linked operational route
- legacy compatibility surfaces
  recommendations and proposals redirects

## Boundary notes

1. workbench consumes gateway-shaped contracts
2. domain truth stays upstream
3. shell and design-system primitives should be preferred over page-local hacks
4. legacy compatibility routes should not be documented as the main active topology
