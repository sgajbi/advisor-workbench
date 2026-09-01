# PM Copilot

PM Copilot is the selected portfolio's internal decision-support workspace. It helps portfolio
managers prepare review-required material from source-owned Manage evidence while keeping evidence
identity, human review, permitted use, and prohibited downstream actions explicit.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/workbench/{portfolioId}?mode=copilot` |
| Navigation | **Mandate management**, then **Copilot** |
| Supported scope | One selected portfolio and the workflow references returned through Gateway |
| Primary reading order | Workflow availability, source/status queue, selected source and readiness, Prepare, result, then operating boundary |
| Evidence posture | Generated material remains separate from source evidence and requires human review |

## Business Purpose

The screen answers three questions: which internal decision-support workflows are available now,
which exact source record will each workflow use, and what review or use restriction applies to the
returned material. It does not turn generated material into advice, approval, client communication,
or execution authority.

## Who Uses This Screen

- **Portfolio managers** prepare internal review material over current mandate evidence.
- **Investment control** reviews evidence, limitations, and permitted use before relying on output.
- **Operations specialists** prepare bounded handoff summaries where a source wave exists.
- **Support teams** use progressive diagnostics to distinguish unavailable source evidence from an
  unavailable AI workflow.

These uses do not imply production entitlement or autonomous decision authority.

## Workflow Position

1. Start in [Manage Overview](Manage-Overview-Screen-Guide) and resolve material mandate attention.
2. Prepare or load the current pack in **Evidence Pack** when a decision memo is required.
3. Move to **PM Copilot** without changing portfolio context.
4. Select a workflow from the queue, then confirm its exact source reference and readiness in the
   decision area before choosing **Prepare**.
5. Review the returned material, evidence disclosure, limitations, human-review state, and permitted
   use. Continue only in the owning business workflow.

A source-confirmed pack prepared or loaded in the current Manage session is shared with the
evidence rail and PM Copilot. The older server snapshot remains initial input only and cannot
authorise a memo after a newer pack is published.

## Implemented Capabilities

- Presents proof-pack decision memo, rebalance memo, operations handoff, monitoring-exception,
  outcome-review, and PM operating-quality workflow families from typed Gateway responses.
- Presents those workflows as one compact worklist with one selected decision area rather than six
  competing action cards. Arrow keys change selection, Enter opens the decision, and Escape returns
  focus to the selected workflow.
- Binds the Evidence Pack Decision Memo label, source reference, readiness, request fence, and
  mutation payload to one current evidence pack.
- Keeps unavailable workflows selectable for blocker review while disabling their Prepare action.
- Keeps the latest result with its selected workflow and exposes only one Prepare action at a time.
- Keeps historical evidence-pack references visible as lineage but non-actionable.
- Invalidates a prior pending result or error when its portfolio, mandate, workflow, or source
  reference no longer matches the visible context.
- Presents preparation method, output availability, evidence, human review, client use, freshness,
  limitations, and support diagnostics as separate source-backed facts.

## Decisions And Actions

| Decision or action | Required source gate | Persisted effect |
| --- | --- | --- |
| Prepare Evidence Pack Decision Memo | Current pack is ready and publishes decision-support evidence | Gateway requests a review-required workflow over that exact pack |
| Prepare rebalance or operations material | Manage returned a current wave reference | Gateway requests the selected internal workflow |
| Prepare monitoring or outcome material | Manage returned the matching exception or outcome-review reference | Gateway requests material over that exact record |
| Use material with a client or execute an order | Not supported | No action is rendered |

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio and mandate context | Preserves selected context | Gateway over owning portfolio and Manage contracts |
| Evidence-pack identity and readiness | Formats and presents; does not calculate | Manage through Gateway |
| Other workflow references | Selects only returned source identities | Manage through Gateway |
| Generated material and review posture | Normalises the typed result into one disclosure | Lotus AI and Manage through Gateway |

The browser uses only the Workbench BFF. See [API Surface](API-Surface) and
[Integrations](Integrations) for shared contract detail.

## Screen States And Recovery

| State | User-visible posture | Recovery |
| --- | --- | --- |
| Loading | No workflow success is claimed | Wait for source responses |
| Ready | Source reference, readiness, and Prepare action are visible | Review before preparing |
| Partial or blocked | Available workflows remain usable; the affected action names its business blocker | Resolve the owning evidence gap |
| Empty | No current reference is available | Prepare or load evidence in the owning Manage mode |
| Historical only | Historical reference is visible but Prepare remains disabled | Obtain a current source pack |
| Request pending | Duplicate actions are disabled | Wait for the current request |
| Error | Business-safe failure is shown without discarding other workflow readiness | Retry only against the unchanged source context |
| Context changed | Prior result is withheld from the new source context | Review and prepare against the current reference |

## Workbench Boundaries

Workbench does not construct prompts, infer source readiness, rebuild evidence, retain generated
text, rank portfolio managers, approve advice, contact clients, create orders, route trades, claim
execution, or infer missing source facts. A successful request remains internal decision support
until its source-recorded human-review and permitted-use posture says otherwise.

## Adjacent Handoffs

- [Manage Overview](Manage-Overview-Screen-Guide) owns the selected portfolio operating checkpoint.
- [Mandate Health](Mandate-Health-Screen-Guide) owns mandate attention and exception review.
- [Rebalance Waves](Rebalance-Waves-Screen-Guide) owns rebalance decisions and handoff posture.
- **Evidence Pack** owns pack preparation, source sections, hashes, and downstream availability.
- [Outcome reviews](Outcome-Reviews-Screen-Guide) owns expected-versus-realised review evidence.

## Evidence And Validation

- `tests/unit/dpm-copilot-workspace.test.tsx` proves current-pack preference, supportability changes,
  exact request identity, historical fail-closed behavior, stale-result fencing, and keyboard
  queue-to-decision navigation.
- `tests/e2e/manage-proof-copilot-workspace.spec.ts` proves the real Evidence Pack to Copilot journey,
  exact source GET and memo POST identities, one selected Prepare action, decision/result order,
  responsive layout, and no page-level overflow at 1440, 1024, 768, and 519 pixels.
- `npm run test:e2e:manage:proof-copilot` is the owned deterministic browser command. Its output is
  fixture evidence, not canonical live-source, deployment, production, or bank-acceptance proof.

## First Support Step

Confirm the selected portfolio and the visible workflow reference. If the reference or readiness is
unavailable, return to the owning Manage mode and re-contact the source before retrying. For runtime
diagnostics, use [Operations Runbook](Operations-Runbook) and [Validation and CI](Validation-and-CI).

## Related Documentation

- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
