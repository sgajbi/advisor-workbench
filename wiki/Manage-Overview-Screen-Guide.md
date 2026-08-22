# Manage Overview

Manage Overview is the selected portfolio's exception-led portfolio-management checkpoint. It
helps a portfolio manager establish whether mandate evidence is usable, whether open items need
attention, and which source-owned Manage workspace should be opened next. It does not manufacture
readiness, risk profile, priority, alternatives, or workflow completion in the browser.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/workbench/{portfolioId}`; Overview is the default mode, while explicit `mode=overview` is accepted as an equivalent entry |
| Navigation | **Manage** in the selected-portfolio Workbench rail, then **Overview** in Manage workspace navigation |
| Supported scope | One Gateway-backed portfolio and its current Core and Manage evidence |
| Primary reading order | Operating posture, portfolio context, attention worklist, active rebalance posture, then source-owned work areas |
| Primary next action | Resolve an attention item in Mandate Health or continue to the Manage work area required for the next decision |

The screen is portfolio-scoped. It does not aggregate a portfolio-manager book, household, team,
legal entity, or enterprise queue. Advisor Book owns supported portfolio selection; a different
portfolio starts a new source request.

## Business Purpose

Manage Overview helps a portfolio manager answer four bounded questions before working on the
portfolio:

1. Are mandate-health, data-readiness, rebalance, and attention facts available and usable?
2. What portfolio value, position count, cash weight, and mandate risk profile are currently
   reported?
3. Which active mandate items need attention, who is recorded as owner, and what is the next
   source-supported step?
4. Which Manage work area should be opened to continue the portfolio-management workflow?

Incomplete evidence and active exceptions lead the screen. Navigation follows the decision
posture, so the page operates as a work checkpoint rather than a feature catalogue.

## Who Uses This Screen

- **Portfolio managers and discretionary mandate specialists** review operating posture and move
  into mandate, rebalance, construction, memory, quality, outcome-review, or evidence work.
- **Client advisors and investment specialists** use the portfolio context and visible limitations
  to understand whether a mandate discussion is sufficiently supported before deeper review.
- **Investment operations and portfolio support teams** identify missing evidence and source-owned
  attention items without treating the Workbench as the system of record.
- **Product, control, and support teams** distinguish Workbench presentation from Core portfolio or
  Manage workflow-source defects.

These uses do not imply production entitlement, delegated authority, supervisory sign-off,
investment approval, client-delivery authority, or execution authority.

## Workflow Position

1. Enter from Advisor Book, Portfolio Review, or another selected-portfolio surface.
2. Confirm the selected portfolio and the reported portfolio value, positions, cash weight, and
   mandate risk profile.
3. Read **Evidence incomplete**, **Action required**, or **Ready for review** before using the
   remaining posture.
4. Review up to four current-window mandate attention items and open Mandate Health for the full
   source-backed investigation.
5. Review the active rebalance stage and its source readiness without inferring execution.
6. Open the task directory entry that matches the next portfolio-management decision.

The overview does not complete a business action. It preserves selected-portfolio context while
handing the user to a focused Manage mode.

## Implemented Capabilities

- Presents Core-owned portfolio value, position count, cash weight, base currency, and identity
  through the Workbench BFF and Gateway.
- Presents the mandate risk profile only when Manage reports it; an absent value is **Not
  reported** and makes the overview incomplete.
- Summarises Manage-owned mandate health, data readiness, rebalance stage, and active attention
  count without replacing missing values with favourable defaults.
- Claims zero attention items only when the source evidence is complete, non-degraded, and not
  truncated.
- Provides a compact attention worklist with business severity, observation, owner, age, and the
  source-supported next step.
- Keeps active rebalance stage, source readiness, issue count, and support note distinct from order,
  execution, and settlement posture, and presents them only when the wave contract explicitly
  includes the selected portfolio.
- Provides one reusable, keyboard-accessible business-task directory for Mandate Health, Rebalance
  Waves, Construction Alternatives, Portfolio Memory, PM Operating Quality, Outcome Reviews, and
  Evidence Pack.
- Labels Construction Alternatives **Generated on request** because Overview does not load or prove
  an existing alternative set.
- Separates recent source-backed operating activity from current exception and readiness posture.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Decide whether the overview is usable | Core portfolio context plus available Manage mandate, health, exception, and wave evidence | None; read-only review |
| Treat the attention count as zero | Complete, non-degraded, untruncated active-exception response | None |
| Investigate an attention item | Source-returned item and its next-step link | None from Overview; opens Mandate Health |
| Continue portfolio management | An implemented Manage mode in the task directory | None from Overview; preserves portfolio context |
| Generate construction alternatives | Not available on Overview | Performed only from Construction Alternatives through its governed Gateway action |

Opening a work area does not create a recommendation, proposal, client communication, report,
portfolio instruction, order, execution, settlement record, or approval.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio identity, base currency, market value, positions, and cash weight | Formats the selected portfolio context; does not recalculate portfolio accounting | Gateway over Core portfolio contracts |
| Mandate risk profile, health, data readiness, and monitoring posture | Maps source values into business labels and fails closed for missing evidence | Gateway over Manage mandate and command-centre contracts |
| Active attention items, owner, severity, age, and next step | Limits presentation to the current returned window and never infers a whole-book queue | Gateway over Manage exception contracts |
| Rebalance stage, source readiness, issue count, and support note | Presents source-owned wave posture without execution claims | Gateway over Manage rebalance-wave contracts |
| Memory, quality, outcome-review, and proof-pack counts or recent activity | Presents only returned selected-portfolio evidence | Gateway over Manage contracts |
| Task-directory navigation | Builds portfolio-preserving Workbench routes to implemented modes | Workbench over the registered Manage navigation |

Workbench uses the BFF and Gateway. It does not call Core or Manage directly. Shared contract detail
remains in [API Surface](API-Surface), and ownership flow remains in
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Initial loading | Bounded selected-portfolio loading; no fabricated portfolio-management result | Wait for Gateway responses |
| Ready for review | Required overview evidence is present and no active attention item is reported | Continue to the required work area; this is not approval or all-clear authority |
| Action required | Source evidence is usable and one or more active attention items are reported | Review the worklist and open Mandate Health |
| Evidence incomplete | One or more named overview facts or source surfaces are missing or failed | Use the named partial-state list and open the relevant focused mode when available |
| Attention evidence unavailable | No zero-attention conclusion; the worklist explains the missing evidence | Re-establish the source response or follow the support path |
| Empty attention worklist | Source-confirmed statement that the current window has no active items | Continue the review without inferring enterprise-wide absence |
| Missing risk profile | **Not reported** plus a named incomplete surface | Review the Manage mandate source; do not assume a balanced profile |
| No portfolio-scoped wave | **Not available**, **Wave: Not reported**, and no borrowed item or issue count | Open Rebalance Waves for the broader source worklist; do not infer membership from an identifier |
| Portfolio unavailable | Manage workspace unavailable state with supported Portfolio or Performance handoff | Confirm the portfolio context, then follow the approved support process |
| Permission blocked | The owning source request fails closed; restricted evidence is not rendered as current | Use an entitled role or approved support path |

Overview has no screen-local refresh transaction. Reloading the route re-contacts the Workbench BFF;
the page does not preserve failed evidence and relabel it current.

## Workbench Boundaries

Manage Overview deliberately does not:

- calculate portfolio value, cash weight, mandate health, data readiness, risk profile, exception
  severity, owner, age, priority, rebalance state, or source supportability,
- default a missing mandate risk profile to **Balanced** or convert absent evidence into a positive
  state,
- claim construction alternatives are available before the governed generation action succeeds,
- infer selected-portfolio wave membership from a wave id, trigger id, list position, or another
  unstructured identifier,
- turn a low exception count or positive badge into mandate compliance, suitability, approval,
  supervisory sign-off, investment recommendation, or client-readiness authority,
- claim book, team, household, or enterprise-wide totals from a selected-portfolio source window,
- create client communication, portfolio instructions, trades, orders, executions, allocations,
  settlement, reconciliation, or custody records.

Official wealth-platform research informed the exception-led hierarchy, connected workflow, and
source-evidence pattern. Lotus does not copy another product's layout, wording, visual identity, or
unsupported capability, and this guide is not a claim of competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns supported own-book portfolio selection.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the daily selected-portfolio checkpoint.
- Mandate Health owns detailed mandate evidence and attention-item investigation.
- Rebalance Waves owns source-backed wave, campaign, readiness, and evidence workflow.
- Construction Alternatives owns governed generation and comparison of supported alternatives.
- Portfolio Memory owns source-recorded decisions and operating events.
- PM Operating Quality owns Manage-governed policy, score-run, fairness, and review evidence.
- Outcome Reviews and Evidence Pack own selected outcome and proof evidence.

## Evidence And Validation

- `tests/unit/manage-overview-model.test.ts` proves missing risk profile, complete zero-attention
  posture, active-attention hierarchy, source-unavailable posture, explicit portfolio-to-wave
  membership, rejection of an unscoped first wave, generated-on-request copy, business record
  grammar, and portfolio-preserving task routes.
- `tests/unit/manage-workspace-components.test.tsx` proves the attention worklist, named scroll
  region, business task directory, recent activity, incomplete-evidence state, and absence of a
  fabricated alternatives-available claim.
- `tests/unit/design-system-components.test.tsx` proves the reusable task directory's semantic
  navigation, status evidence, full-card links, and action labels.
- `tests/unit/manage-overview-responsive-css.test.ts` proves that posture, value, evidence, and task
  layouts reflow from available content width instead of assuming a full-page viewport.
- `tests/e2e/ui-smoke.spec.ts` proves the production-built Manage route resolves to its governed
  screen or unavailable state.
- Optimized-production diagnostic browser proof on `PB_SG_GLOBAL_BAL_001` verified 1440, 1024,
  720, and 390 pixel viewports without page overflow; centre-rail evidence remained within its
  parent boundary, and a task-directory link retained a visible two-pixel focus outline. The source
  returned partial Manage evidence, so the artifacts under `output/playwright/issue-763/` are
  diagnostic evidence and are not canonical demo-readiness screenshots.
- Protected PR checks, exact-main releasability, wiki publication, and strict parity remain release
  controls.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Confirm the selected portfolio and whether the headline says **Evidence incomplete**, **Action
required**, **Ready for review**, or the whole Manage workspace is unavailable. Record the named
incomplete area and HTTP status when shown, but do not copy client data or raw payloads into an
unapproved channel. If attention evidence is unavailable, do not report zero items; verify the
Gateway and Manage source response through the approved runbook.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
