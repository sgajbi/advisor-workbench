# Mesh Data Products

## Mesh role

`lotus-workbench` is the self-serve discovery and operator/customer-facing consumption surface for Lotus mesh products.

## Governed surface

- Route: `/data-products`
- Integration boundary: Workbench BFF to `lotus-gateway`
- Displayed facts: product identity, producer repository, lifecycle, approved consumers, dependencies, certification/trust state, and degraded states

## Platform relationship

Workbench consumes gateway APIs only. It must not read `lotus-platform/generated/`, `platform-contracts/`, or `output/trust-certification/` directly.

## Operating rule

Workbench discovery must show truthful loading, empty, partial, stale, blocked, unavailable, and error states. It must not show decorative mesh trust when gateway/platform certification evidence is missing.
