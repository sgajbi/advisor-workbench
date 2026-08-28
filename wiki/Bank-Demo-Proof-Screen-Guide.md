# Bank Demo Proof

Bank Demo Proof is an internal, read-only register of the source-approved demonstration scenario,
claim classifications, proof requirements, audience boundaries, and artefact rules.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/recommendations?mode=proof` |
| Navigation | Visible inside the Advisory lifecycle; top-level Advisory capability remains disabled |
| Authority | `lotus-advise:RFC-0028` through Gateway |
| Scope | Canonical source scenario, not a selected-portfolio proof generator |

## Business Purpose

The screen helps advisers, product teams, and pre-sales reviewers distinguish what a demonstration
can truthfully claim, which evidence is required, who may receive it, and which boundaries remain
unsupported.

## Who Uses This Screen

- Advisers and pre-sales teams prepare internal demonstrations.
- Product and control teams review claim classifications and evidence requirements.
- Support teams verify the source scenario and proof marker.

## Workflow Position

Review the source scenario contract and supported-claim register before presenting or sharing demo
material. Use only the permitted audience/material posture and retain the named proof artefacts.

## Implemented Capabilities

- Reads the RFC-0028 scenario contract and supported-claim register through Gateway.
- Presents the canonical portfolio, proof marker, steps, classifications, audiences, materials,
  evidence requirements, and unsupported boundaries.
- Fails closed when either source contract is unavailable.

## Decisions And Actions

The screen is read-only. It provides no approval, publication, client-release, entitlement, or
execution action. A supported classification is evidence guidance, not permission beyond the
source-returned audience and material constraints.

## Information And Source Authority

Advise owns the scenario, primary portfolio identity, proof marker, steps, claim classifications,
audiences, material types, proof requirements, publication boundaries, and artefact rules.
Workbench query state includes the selected portfolio, but the two current APIs accept no portfolio
parameter; the displayed scope therefore comes from the source contract's canonical portfolio.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Loading | Wait; no claim is promoted |
| Ready | Review both source contracts before use |
| Contract failure | No local claim fallback is rendered; retry after Gateway/Advise recovery |
| Planned or unsupported claim | Do not present or publish it as supported |

## Workbench Boundaries

Workbench does not manufacture proof, infer a selected-portfolio scenario, approve material,
publish to clients, certify production controls, or replace canonical validation. Client-ready use
remains blocked wherever the source classification is planned or unsupported.

## Adjacent Handoffs

- [Advisory Overview](Advisory-Overview-Screen-Guide)
- [Supported Features](Supported-Features)
- [Validation and CI](Validation-and-CI)

## Evidence And Validation

- `tests/integration/bank-demo-proof-workspace.test.tsx`
- `tests/unit/bank-demo-proof-view-model.test.ts`
- `scripts/live/validation/browser-workflows.mjs`

## First Support Step

Confirm both Gateway responses, the source `primary_portfolio_id`, proof marker, and claim
classification. Do not infer proof for the portfolio selected elsewhere in the shell.

## Related Documentation

- [Security and Governance](Security-and-Governance)
- [Operations Runbook](Operations-Runbook)
- [Screen Guide Catalogue](Screen-Guide-Catalogue)
