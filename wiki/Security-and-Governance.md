# Security and Governance

## Current Scope And Evidence Posture

This page describes controls implemented in the current Workbench repository: the browser-to-BFF
request boundary, development-only caller fixtures, route-specific authority narrowing, dependency
and image security gates, capability-truth rules, and exact-head delivery evidence.

These controls reduce impersonation, contract-drift, dependency, and unsupported-feature risk. They
do **not** certify production authentication, authorization, entitlement, data privacy, operational
resilience, regulatory compliance, or bank acceptance. Production principal/session resolution is
still owned by [Workbench #436](https://github.com/sgajbi/lotus-workbench/issues/436) and
[lotus-platform #563](https://github.com/sgajbi/lotus-platform/issues/563). Local configured callers
are non-certifying development fixtures and fail closed outside permitted development environments.

## Control And Evidence Map

| Control area | Implemented boundary | Primary evidence | Remaining boundary |
| --- | --- | --- | --- |
| Browser request trust | BFF rebuilds Gateway headers from a closed allowlist and discards browser-supplied authority | `quality:bff-header-boundary`, behavioral BFF tests | Not an IdP or session implementation |
| Route authority | Server-owned development context is narrowed per route and portfolio scope | Route-family tests and canonical local validation | Production claims await authenticated principal resolution |
| Capability truth | Disabled, unsupported, partial, and unavailable states remain explicit | `quality:screen-docs`, product-copy gate, browser scenarios | Implemented route does not imply production promotion |
| Dependency and image risk | Direct dependency admission, `npm audit`, pinned production image, vulnerability and SBOM gates | Feature, PR, and main releasability lanes | Not a production penetration test or deployment certification |
| Release governance | Signed commits, protected CI, exact-head review authority, exact-main validation | GitHub PR checks and Main Releasability | Green CI cannot override a blocking review finding |
| Integrated product proof | Governed runtime and `PB_SG_GLOBAL_BAL_001` canonical validation | `npm run live:validate` evidence | Does not prove production capacity, DR, or bank acceptance |

Use [API Surface](API-Surface) for request contracts, [Validation and CI](Validation-and-CI) for
evidence classes, [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support) for the
supported stack, and [Operations Runbook](Operations-Runbook) for runtime response.

## Governing Standards

- Platform RFC-0070 — product experience foundation and ownership model.
- Platform RFC-0071 — environment-scoped service identity and ingress governance.
- Platform RFC-0072 — multi-lane CI and release governance.
- Platform RFC-0073 — context and agent guidance system.

Repo-specific guardrails require Gateway-first integration, canonical seeded-data validation,
coverage-backed and browser proof, audited dependencies and images, explicit capability posture,
and no fabricated business state. Compatibility routes and disabled shell entries are documented
without presenting them as active production ownership.

## Universal BFF request-header boundary

Every browser request entering `/api/bff/**` is treated as untrusted. Workbench builds a new
Gateway header set from one explicit allowlist before any route-family authority adapter runs.

The allowlist is limited to:

1. content negotiation and type: `Accept`, `Accept-Language`, and `Content-Type`,
2. mutation replay protection: `Idempotency-Key` and `X-Idempotency-Key`,
3. conditional and range requests: `If-Match`, `If-None-Match`, `If-Modified-Since`,
   `If-Unmodified-Since`, `Range`, and `If-Range`,
4. validated support context: `X-Correlation-Id`, `X-Trace-Id`, and `traceparent`.

Browser `Authorization`, cookies, proxy authorization, session identifiers, forwarding aliases,
caller identity, tenant, region, booking centre, role, capability, principal status, service
identity, and portfolio/client/book entitlements are not forwarded. The BFF always writes its
configured development caller context and specialized adapters may replace it with narrower
server-derived route authority.

`npm run quality:bff-header-boundary` is a syntax-aware CI backstop that fails when a BFF route
omits the shared builder, accesses browser headers outside it, or the scanner finds no BFF routes.
Behavioral regression coverage injects every forbidden authority
header across portfolio, Performance, Risk, DPM, proposals, advisory workspaces, documents,
Intake, lookups, and platform route families.

This is a request-boundary control, not production authentication. It neither creates an IdP
session nor certifies identity, token claims, logout, or revocation. Workbench #436 and platform
#563 remain the owners of that separate production-principal contract.

## Advisor Cockpit authority boundary

Advisor Cockpit browser requests carry business scope, not caller authority. The Workbench BFF:

1. discards caller identity, tenant, region, booking centre, legal entity, role, capability,
   principal status, advisor scope, portfolio entitlement, browser `Authorization`, browser
   `Cookie`, proxy authorization, session id, and common upstream-auth identity aliases supplied
   by the browser,
2. rejects advisor, role, or other authority claims in query parameters or acknowledgement bodies,
3. derives the development advisor from a server-configured actor and verifies the selected
   portfolio against a server-configured entitlement list,
4. assigns `advisory.advisor_cockpit.read` only to allowlisted reads and
   `advisory.advisor_cockpit.acknowledge` only to the acknowledgement route,
5. rejects unsupported routes, missing scope, cross-portfolio scope, malformed authority, and
   non-development configured-principal use before Gateway is contacted.

This is a local and test fixture, not production authentication. UAT and production remain closed
until Workbench #436 and platform #563 supply the governed authenticated-session principal.

## Advisory Copilot review authority boundary

Advisory Copilot browser review submissions carry only business review intent, not reviewer,
proposal, portfolio, or upstream authority. The Workbench BFF:

1. discards browser-supplied caller identity, tenant, legal entity, role, capability, principal
   status, proposal scope, portfolio scope, browser `Authorization`, browser `Cookie`, proxy
   authorization, session id, and common upstream-auth identity aliases,
2. rejects reviewer or authority claims in the review request body,
3. resolves the source-owned Gateway copilot action run before forwarding the review mutation,
4. verifies the run portfolio against the server-configured development entitlement list,
5. forwards only the server-derived reviewer context, `advisory.copilot.review`, and the
   source-owned proposal and portfolio identifiers needed by Gateway review authorization,
6. rejects malformed, unresolved, or cross-entitlement source scope before Gateway receives the
   review mutation.

This is a local and test fixture, not production authentication. UAT and production remain closed
until Workbench #436 and platform #563 supply the governed authenticated-session principal.

Workbench now consumes the `lotus-platform.bff-principal-session.v1` source-contract identifiers
for the governed BFF principal boundary and keeps the certification posture explicit:
`not_certified`, `productionIdentityCertified=false`, `supportedFeaturePromoted=false`, and
`localDevFixtureNonCertifying=true`. This clears only the source-contract consumer boundary. It
does not install an IdP, validate token claims, certify revocation/logout, or promote Lotus Idea or
advisor workflows as production-authenticated features.
