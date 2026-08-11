# Workbench Screen Guide Template

Use this template for one canonical, independently navigable Workbench business screen or mode.
Aliases and redirects link to the canonical guide; they do not receive duplicate pages. Keep the
opening sections useful to advisors, portfolio managers, operations, product, and support readers.
Put implementation identifiers and service detail in the bounded source and evidence sections.

The checked-in
[`workbench-screen-registry.v1.json`](./workbench-screen-registry.v1.json) owns the route-to-guide
mapping. A guide is complete only when its registry exception is removed and the documentation
quality gate passes.

## Current Scope

State the canonical route or mode, current navigation posture, intended readers, and evidence
status. Distinguish active, runtime-gated, compatibility-only, and capability-disabled posture.

## Business Purpose

Explain the private-banking job this screen supports and the decision it helps the user make.

## Who Uses This Screen

Name the supported roles and their reason for using the screen. Do not invent entitlements,
delegation, supervision, household ownership, or production identity posture.

## Workflow Position

Explain what normally precedes this screen, what the user reviews here, and the supported next
handoff.

## Implemented Capabilities

List only source-backed capabilities that are currently implemented. Keep each statement tied to
the screen's source or evidence map.

## Decisions And Actions

Separate information review from persisted actions. State the evidence, workflow gate, or
permission required before each supported action becomes available.

## Information And Source Authority

Use a narrow table. Summarize contract families rather than copying endpoint inventories.

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Example fact | Presented through the Workbench BFF and Gateway | Owning Lotus service or contract |

Link to [API Surface](../../wiki/API-Surface.md) and
[Integrations](../../wiki/Integrations.md) for shared contract detail.

## Screen States And Recovery

Describe loading, empty, partial or degraded, stale, unavailable, error, and permission-blocked
posture. A visible recovery control must re-contact source authority; otherwise give the first
support action instead of promising recovery.

## Workbench Boundaries

State which calculations, approvals, suitability decisions, client publication, communication,
orders, execution, settlement, or other authority deliberately remains outside the browser.

## Adjacent Handoffs

Link only to implemented adjacent screens or explain why a workflow stops at the current boundary.

## Evidence And Validation

Name focused tests, canonical browser or API evidence where available, the governed portfolio when
relevant, and the supporting runbook. Do not turn a screenshot into readiness proof.

## First Support Step

Give one useful business-facing first response, followed by the relevant diagnostic or runbook
link. Keep client identifiers and sensitive payloads out of support examples.

## Related Documentation

Link to the canonical shared owners instead of repeating their content:

- [Supported Features](../../wiki/Supported-Features.md)
- [API Surface](../../wiki/API-Surface.md)
- [Integrations](../../wiki/Integrations.md)
- [Validation and CI](../../wiki/Validation-and-CI.md)
- [Operations Runbook](../../wiki/Operations-Runbook.md)
- [Technology Risk and Runtime Support](../../wiki/Technology-Risk-and-Runtime-Support.md)

Keep technology certification, dependency support, scalability evidence, resilience posture, and
explicit non-claims in the shared runtime page. A screen guide should state only its source
dependency, user-visible degraded behavior, recovery path, and screen-specific evidence.
