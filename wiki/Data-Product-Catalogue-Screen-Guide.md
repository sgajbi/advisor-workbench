# Data Product Catalogue

Data Product Catalogue is the Workbench utility for finding governed data products and checking
whether their ownership, approved use, downstream reliance, and live assurance are fit for the
intended purpose. It presents source evidence; it does not certify a business workflow or create
access to a product.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/data-products` |
| Navigation | Active cross-platform utility reached from **Source Catalog** in Portfolio Review; it is deliberately not represented as an advisor workspace in the primary shell |
| Supported scope | Governed catalogue, declared consumers, dependency impact, and live assurance published for `lotus-workbench` |
| Evidence posture | Focused API and component proof plus isolated optimized-browser success, partial-failure, recovery, keyboard-focus, desktop, tablet, and narrow-screen validation |
| Primary next action | Confirm the accountable source and assurance posture before relying on the product in an adjacent workflow |

The page is useful to product, data-governance, operations, support, investment, and engineering
users. Role names describe intended use; they are not production entitlement claims.

## Business Purpose

The catalogue helps a reviewer answer four questions before relying on a data product:

1. Which governed products are available and who is accountable for each one?
2. Which consuming systems are approved to use the product?
3. Which downstream relationships could be affected by a product change?
4. Is certification, freshness, completeness, quality, and lineage evidence currently available?

This hierarchy follows established enterprise catalogue practice: product identity and business
context lead, while ownership, health, lineage, and downstream use provide the evidence needed to
decide whether a product is suitable for the intended work.

## Who Uses This Screen

- **Product owners and data stewards** review product ownership, lifecycle, approved consumers, and
  assurance exceptions.
- **Operations and support teams** distinguish a catalogue outage from an assurance or dependency
  evidence outage before escalating the affected source.
- **Investment specialists and portfolio teams** use the catalogue as supporting evidence when a
  Workbench workflow identifies its source product; they do not infer suitability or approval from
  catalogue presence.
- **Architecture, risk, and engineering teams** review declared dependency and fail-closed posture
  before changing a product contract.

The screen does not infer a user's permission to consume a product, delegated authority, or
production identity posture.

## Workflow Position

1. Start from [Portfolio Review](Portfolio-Review-Screen-Guide) and choose **Source Catalog**, or
   open the cross-platform utility directly.
2. Confirm the catalogue publication time, contract version, and source-confirmed posture.
3. Find the relevant product and review accountable source, lifecycle, approved consumers,
   freshness, completeness, and lineage.
4. Review **Data assurance** for current certification or source-owned attention evidence.
5. Review **Approved use** and **Dependency impact** before relying on or changing the product.
6. Return to the originating business workflow. Product access, contract publication, and source
   remediation continue outside this screen.

## Implemented Capabilities

- Loads catalogue, live assurance, and dependency impact as three independent Gateway reads.
- Keeps a source-confirmed catalogue usable when assurance or dependency impact is temporarily
  unavailable; optional-source failure never erases product identity or approved-use evidence.
- Blocks discovery when the catalogue itself is unavailable and never substitutes a local or
  historical catalogue.
- Presents product identity, authoritative domain, lifecycle, accountable source, approved
  consumers, freshness, completeness, lineage, and bounded product reference.
- Presents declared consumers and their permitted product dependencies.
- Presents product-and-consumer nodes, declared relationships, and fail-closed relationship count
  only when dependency evidence is available.
- Retains earlier source-confirmed optional evidence after a refresh failure and labels it as
  earlier evidence instead of treating it as current.
- Provides separate, source-contacting assurance and dependency refresh controls with accessible
  live status and stable keyboard focus.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Rely on a product in an adjacent workflow | Accountable source, intended consumer, and assurance posture must fit the intended use | None; the catalogue is evidence, not an approval |
| Assess change impact | Current dependency graph and failure posture | None; no dependency is edited in Workbench |
| Refresh assurance | Existing page access; the action recontacts the Gateway assurance source | None; newer source evidence replaces or qualifies the displayed posture |
| Refresh dependency impact | Existing page access; the action recontacts the Gateway graph source | None; no relationship is recalculated in the browser |

There are no create, edit, certify, approve, access-request, publish, or AI-generated actions on the
current screen.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Product identity, lifecycle, accountable source, approved consumers, and declared consumer dependencies | Read through the Workbench BFF and presented without reconstructing catalogue entries | Gateway over platform-generated domain-product catalogue contracts contributed by owning Lotus domains |
| Certification, freshness, completeness, quality, lineage, issues, and publication time | Independently read and shown only when the source publishes assurance evidence | Gateway over the platform live trust-certification artifact |
| Product, consumer, relationship, and fail-closed counts | Independently read; Workbench counts only source-returned graph relationships and does not infer missing edges | Gateway over the platform dependency-graph artifact |
| Refresh result | Source status is announced and the corresponding section is updated in place | Gateway response for the selected contract family |

The browser calls `/api/bff/api/v1/domain-products/{catalog,dependency-graph,trust-certification}`
and never reads platform files or domain services directly. Shared contract detail remains in
[API Surface](API-Surface) and [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Catalogue loading | A dedicated catalogue loading state | Wait for the required source; optional evidence does not create a substitute catalogue |
| Catalogue ready | Source context, business summary, products, approved use, assurance, and dependency impact | Confirm the publication time and intended use |
| Empty catalogue | An explicit source-confirmed absence of products | Do not infer that products exist; follow the first support step if entries are expected |
| Catalogue unavailable | A blocking business-safe error with no raw Gateway response and no product cards | Choose **Retry catalogue**; the full discovery surface remains unavailable until the catalogue succeeds |
| Assurance checking | Product cards remain visible with assurance fields marked **Checking** | Wait or keep reviewing catalogue facts that do not depend on assurance |
| Assurance unavailable | Product cards and approved use remain visible; assurance fields show **Not available** and no certified total is invented | Choose **Retry assurance** or **Refresh assurance** |
| Source-reported assurance unavailable | The source-owned reason and unavailable posture are shown | Do not interpret catalogue presence as certification |
| Assurance attention or stale | Source issues and product-level posture remain visible | Review the stated evidence and source owner before use |
| Assurance refresh failure | Earlier confirmed assurance remains visible and is labelled as earlier evidence | Retry; newer explicit source evidence replaces the retained posture |
| Dependency impact unavailable | Catalogue and assurance remain usable; relationship totals are not estimated | Choose **Retry impact evidence** |
| Dependency refresh failure | Earlier confirmed graph evidence remains visible and is labelled as earlier evidence | Retry before making a change-impact decision |

An authorization or protected-source rejection is not reinterpreted as permission. The screen
fails closed to unavailable evidence and does not add browser-supplied authority.

## Workbench Boundaries

Data Product Catalogue deliberately does not:

- create, edit, version, publish, certify, approve, deprecate, or retire a data product,
- request or grant product access, infer entitlement, or establish production identity,
- calculate certification, freshness, quality, completeness, lineage, or dependency truth,
- treat catalogue presence or a **Certified** label as proof that an adjacent private-banking
  workflow is ready, suitable, approved, or client deliverable,
- call Lotus domain services or platform artifact stores directly,
- create proposals, reports, communications, orders, execution, settlement, or downstream workflow
  state,
- generate or summarize evidence with AI.

This guide records implemented behavior. It is not a claim of bank approval or competitor
superiority.

## Adjacent Handoffs

- [Portfolio Review](Portfolio-Review-Screen-Guide) provides the selected-portfolio decision
  context and the **Source Catalog** entry.
- [Supported Features](Supported-Features) records supported Workbench capability posture.
- Product contract authoring, assurance remediation, access governance, and dependency changes stop
  at the owning domain or platform process; no unsupported Workbench screen is implied.

## Evidence And Validation

- `tests/unit/domain-products-api.test.ts` proves the three independent BFF contract reads and
  bounded observability labels.
- `tests/unit/domain-product-discovery-client.test.tsx` proves success, empty catalogue, blocking
  catalogue failure, source-owned unavailable assurance, optional-source failure, retained earlier
  evidence, recovery, safe copy, no fabricated certification, and stable focus.
- `tests/e2e/data-product-catalogue.spec.ts` runs against an optimized Workbench build and proves
  desktop, tablet, narrow-screen, horizontal-overflow, console, partial-source failure, recovery,
  and keyboard-focus posture.
- The focused production-browser command uses an isolated port and does not require or mutate the
  shared canonical stack.
- Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
  governed PR and exact-main sequence. A screenshot alone is not readiness evidence.

## First Support Step

Identify whether **Catalogue**, **Data assurance**, or **Dependency impact** is unavailable, then
retry only that source once. If the state persists, record the affected section, publication time,
contract version, and displayed correlation reference without copying product payloads or client
data into a support channel; then follow [Troubleshooting](Troubleshooting). Do not read platform
files directly or call a domain service to bypass Gateway evidence.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Mesh Data Products](Mesh-Data-Products)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Troubleshooting](Troubleshooting)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)

External design rationale was checked against the
[Microsoft Purview Unified Catalog](https://learn.microsoft.com/en-us/purview/unified-catalog),
[Microsoft data-product management guidance](https://learn.microsoft.com/en-in/purview/unified-catalog-data-products-create-manage),
and [IBM data-product guidance](https://www.ibm.com/docs/en/watsonx/wdi/saas?topic=data-products).
These references informed information hierarchy only; Lotus source contracts remain authoritative.
