# Product Experience Records

This folder holds durable, screen-level product decisions for Lotus Workbench. It complements the
target architecture in `docs/documentation/product-architecture-blueprint.md` with the research,
business workflow, adopted patterns, rejected patterns, and validation evidence behind each UI
slice.

## Records

1. [Workbench experience research ledger](WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md)

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
