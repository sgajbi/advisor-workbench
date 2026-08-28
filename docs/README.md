# Workbench Documentation Map

This directory holds implementation-backed engineering and product records for Lotus Workbench.
Business and operator guidance is authored in [`wiki/`](../wiki/Home.md); this directory owns deep
architecture, standards, RFCs, runtime procedures, evidence, and historical delivery records.

## Choose A Reader Path

| Audience | Start here | Continue with |
| --- | --- | --- |
| Relationship manager, adviser, or portfolio manager | [Screen Guide Catalogue](../wiki/Screen-Guide-Catalogue.md) | [Product Vocabulary](../wiki/Product-Vocabulary.md), [Supported Features](../wiki/Supported-Features.md) |
| Product owner or bank stakeholder | [Architecture](../wiki/Architecture.md) | [Supported Features](../wiki/Supported-Features.md), [Technology Risk and Runtime Support](../wiki/Technology-Risk-and-Runtime-Support.md), [target architecture blueprint](documentation/product-architecture-blueprint.md) |
| Engineer | [Getting Started](../wiki/Getting-Started.md) | [Architecture records](architecture/README.md), [Development Workflow](../wiki/Development-Workflow.md) |
| Operations or support | [Operations index](operations/README.md) | [Operations Runbook](../wiki/Operations-Runbook.md), [Troubleshooting](../wiki/Troubleshooting.md) |
| Security, risk, or governance | [Security and Governance](../wiki/Security-and-Governance.md) | [Validation and CI](../wiki/Validation-and-CI.md), [runtime support decision](architecture/workbench-production-runtime-decision.md) |
| Reviewer or auditor | [Evidence index](evidence/README.md) | [Codebase review ledger](architecture/CODEBASE-REVIEW-LEDGER.md), [RFC Index](rfcs/README.md) |

## Authoritative Collections

| Collection | Owns | Does not own |
| --- | --- | --- |
| [`architecture/`](architecture/README.md) | Current component boundaries, quality policy, runtime decisions, and historical delivery records | Business operating instructions |
| [`documentation/`](documentation/README.md) | Documentation standards, registries, vocabulary, branch guidance, and architecture blueprint | Published operator guidance |
| [`operations/`](operations/README.md) | Canonical runtime, CI strategy, supportability, invocation posture, and response examples | Domain-service deployment manuals |
| [`automation/`](automation/Automation-Ecosystem.md) | Repository automation entry points and platform handoffs | Portable path resolution for `auto:refresh:pas`, which remains tracked in #913 |
| [`product/`](product/README.md) | Product research and screen-level design decisions | Source-owned business methodology |
| [`rfcs/`](rfcs/README.md) | Workbench-specific decisions and their implementation posture | Cross-repository platform RFCs |
| [`demo/`](demo/README.md) | Governed demonstration entry point and supported walkthrough scope | Production certification |
| [`evidence/`](evidence/README.md) | Issue-scoped diagnostic and review artefacts with stated proof boundaries | Canonical runtime or production assurance by itself |
| [`licenses/`](licenses/) | Third-party asset licence notices retained with the repository | Dependency admission or runtime support policy |

## Current, Historical, And Planned Truth

- **Current product and operating truth** belongs in the wiki, current architecture decisions, and
  canonical runtime guide.
- **Historical delivery records** remain useful evidence of why a design changed, but are not the
  current architecture authority. Architecture and RFC indexes label these records explicitly.
- **Planned work** must be linked to an open GitHub issue or an RFC whose status is not
  `IMPLEMENTED`. It must not be presented as available behavior.
- **Source-owned domain truth** is summarized only enough to explain the Workbench boundary; the
  owning service remains authoritative for calculations, policy, data, and workflow state.

## Documentation Change Rules

1. Verify claims against current code, tests, configuration, contracts, or runtime evidence.
2. Keep one authoritative location per concept and link to it from reader maps.
3. Update `wiki/` in the same pull request when business, operating, support, or governance truth
   changes; record an explicit no-wiki-change decision otherwise.
4. Distinguish fixture proof, canonical source-backed proof, exact-main CI, and production
   certification.
5. Use the [implementation documentation standard](documentation/implementation-documentation-standard.md)
   and [screen guide template](documentation/workbench-screen-guide-template.md).
