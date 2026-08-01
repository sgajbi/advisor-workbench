# Security and Governance

## Current governance

- RFC-0070
  gold-standard product experience foundation and ownership model
- RFC-0071
  environment-scoped service identity and ingress governance
- RFC-0072
  multi-lane CI and release governance
- RFC-0073
  context and agent guidance system

## Repo-specific guardrails

- gateway-first product integration
- canonical seeded-data runtime validation
- Playwright browser smoke and coverage-backed tests
- audit-clean browser and build-tool dependencies before demo-ready canonical proof
- no unsupported UI states or fabricated data

## Operational discipline

- keep active product-surface truth explicit
- treat Portfolio and Performance as the supported front-office paths
- document compatibility redirects without presenting them as active product ownership
- distinguish disabled shell entries from active apps when capability posture says they are not
  supported yet
- remove high-risk client dependencies when a smaller browser-native implementation satisfies the
  same front-office workflow

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
