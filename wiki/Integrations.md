# Integrations

## Primary backend posture

- `lotus-gateway`
  primary backend contract for product flows

## Canonical local runtime participants

- `lotus-core`
- `lotus-performance`
- `lotus-risk`
- `lotus-ai`
- `lotus-advise`
- `lotus-manage`
- `lotus-report`
- `lotus-gateway`
- `lotus-workbench`

## Canonical local identities

- workbench:
  `http://workbench.dev.lotus`
- gateway:
  `http://gateway.dev.lotus`

## Contract notes

1. gateway-first integration is the default
2. `/api/bff/*` is an internal bridge, not a second product API authority
3. canonical front-office validation depends on governed `*.dev.lotus` routing and seeded data
4. shell navigation supportability is informed by gateway-backed capability posture rather than by
   the mere existence of historical routes
