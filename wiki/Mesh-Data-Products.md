# Mesh Data Products

## Mesh role

`lotus-workbench` is the self-serve discovery and operator/customer-facing consumption surface for Lotus mesh products.

## Governed surface

- Route: `/data-products`
- Business operating guide: [Data Product Catalogue](Data-Product-Catalogue-Screen-Guide)
- Integration boundary: Workbench BFF to `lotus-gateway`
- Displayed facts: product identity, producer repository, lifecycle, approved consumers, dependencies, certification/trust state, and degraded states

## Platform relationship

Workbench consumes gateway APIs only. It must not read `lotus-platform/generated/`, `platform-contracts/`, or `output/trust-certification/` directly.

## Operating rule

Workbench discovery must show truthful loading, empty, partial, stale, blocked, unavailable, and
error states. Catalogue, assurance, and dependency reads are independent: an optional-source
failure must not hide usable catalogue evidence, and retained earlier evidence must not be labelled
current. Workbench must not show decorative mesh trust when Gateway or platform certification
evidence is missing.

## Observability posture

RFC-0108 coverage records bounded route, panel, operation, state, freshness, and supportability
labels for catalog, dependency graph, and trust-certification reads. Metric labels must not include
product identifiers, source paths, dependency routes, correlation identifiers, request bodies, or
response bodies.
