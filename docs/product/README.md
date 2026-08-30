# Product Experience Records

This folder holds durable, screen-level product decisions for Lotus Workbench. It complements the
target architecture in `docs/documentation/product-architecture-blueprint.md` with the research,
business workflow, adopted patterns, rejected patterns, and validation evidence behind each UI
slice.

## Records

1. [Workbench experience research ledger](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md)

## Research Ledger Index

The ledger is append-only product-decision evidence. Use these entry points rather than scanning or
copying the complete record into the wiki.

| Domain | Representative entry points |
| --- | --- |
| Shell and navigation | [Task-aware navigation](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#task-aware-private-banking-navigation), [global workspace orientation](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#global-workspace-orientation), [review-context continuity](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#governed-review-context-and-cross-workspace-continuity) |
| Adviser book and portfolio | [Portfolio Review](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#portfolio-review), [own-book coverage](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#advisor-own-book-coverage-and-portfolio-context-switching), [selected portfolio value](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#selected-portfolio-value-versus-adviser-book-aum) |
| Performance and risk | [Performance controls](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#performance-review-controls-one-context-inherited-comparison-progressive-detail), [Risk Review](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#risk-review-measured-evidence-before-policy-judgement), [calculation assurance](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#performance-evidence-calculation-assurance) |
| Portfolio management | [Mandate Health](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#mandate-health-review-continuity-source-identity-before-row-position), [Manage Overview](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#manage-overview-exception-led-decision-flow), [Rebalance Waves](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#rebalance-waves-decision-first-source-context), [PM operating quality](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#pm-operating-quality-supervisory-record-context) |
| Advisory and proposals | [Advisory Overview](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#advisory-overview-recoverable-proposal-prioritisation), [Proposal Builder](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#proposal-builder-evidence-before-persistent-action), [opportunity presentation evidence](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#2026-08-31--adviser-opportunity-presentation-evidence-954), [discussion-pack review](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#discussion-pack-review-decision-led-client-meeting-preparation) |
| Reporting and data products | [Report ordering](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#report-ordering), [reporting source posture](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#portfolio-reporting-source-posture), [data-product catalogue](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#data-product-catalogue-resilience-and-information-hierarchy) |
| Design system and accessibility | [Exclusive choices and tabs](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#cross-screen-exclusive-choices-and-true-tabs), [typography](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#productive-workbench-typography-and-financial-scan-geometry), [interactive relationships](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#stable-interactive-relationships-across-server-rendering) |
| Governance, runtime, and security | [BFF trust boundary](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#bff-browser-header-trust-boundary-allowlist-before-authority), [runtime support](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#runtime-support-and-bank-technology-risk-baseline), [CSS Module governance](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md#2026-08-28--css-module-escape-governance-and-review-evidence-ownership-805) |

## Working Rule

For every material screen change:

1. identify the user, decision, source-owned information, and next supported action,
2. research current comparable products and applicable accessibility guidance,
3. record both adopted and rejected patterns,
4. prefer an existing Workbench primitive or add a reusable primitive with focused tests,
5. keep calculations, thresholds, readiness, and workflow authority in the owning service or
   Gateway contract,
6. validate realistic populated, empty, loading, partial, error, and unsupported states as the
   changed surface requires.

Repository-local wiki content changes only when supported product, integration, operating, or
validation truth changes. Visual composition and internal component refactors remain here unless
they alter that published truth.
