# Discussion pack review

**Client meeting preparation** is the adviser's portfolio-scoped view of one selected discussion
pack. It keeps a bounded proposal worklist beside the meeting rationale, decision memo,
disclosures, and client-use controls needed for the next decision. Internal preparation remains
separate from report production, client consent, release, delivery, and client contact. A lifecycle
stage never becomes permission to use material externally.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals?portfolioId={portfolio_id}&mode=discussion-pack` |
| Navigation | Direct bounded route; the global **Proposal** workspace remains capability-disabled |
| Worklist scope | `AWAITING_CLIENT_CONSENT` proposals in one cursor-bounded Gateway source window |
| Evidence scope | One selected proposal and immutable version through `proposal-discussion-pack-review.v1` |
| Screen authority | Read-only internal meeting preparation and client-use control review |

**In view** is the number of matching records returned in the current source window, not a whole
book, client, household, or global total. Workbench never fans out discussion-pack reads across the
worklist. It asks for evidence only when an adviser selects a record.

## Business Purpose

The screen helps an adviser answer five separate questions before a client discussion:

1. Is the selected narrative recorded and reviewed for internal adviser use?
2. Is the adviser decision memo available and reviewed for the same proposal version?
3. Has a report package been requested or materialized, and does it reference this version?
4. Is client consent recorded for this version, declined, absent, or unavailable?
5. Does the platform currently support client release, publication, delivery, or communication?

Keeping these controls independent prevents an available narrative, memo, PDF, consent record, or
lifecycle state from being mistaken for authority that the source contract has not granted.

## Who Uses This Screen

- **Client advisers and relationship managers** prepare the discussion and identify unresolved
  controls before opening the governed proposal record.
- **Investment and advisory specialists** verify that rationale, material changes, risk discussion,
  suitability context, alternatives, approvals, and limitations are grounded to the selected
  proposal version.
- **Supervisors and compliance reviewers** inspect adviser-use review, disclosure policy, consent,
  and client-release boundaries without interpreting browser-owned status.
- **Support teams** expand **Support details** to use the proposal version, support reference,
  capability, and lineage evidence when locating a source or contract failure.

These are business audiences, not browser-authored roles or entitlements.

## Workflow Position

1. A proposal reaches the client-consent gate through its governed advisory lifecycle.
2. Workbench requests only that state from the Gateway proposal list for the selected portfolio.
3. The adviser selects one proposal with pointer, Up/Down, Home, or End navigation.
4. Workbench requests one Gateway discussion-pack projection bound to proposal, portfolio, version,
   lifecycle state, and request correlation.
5. The adviser resolves the **Client-discussion checklist** before relying on narrative and memo
   detail.
6. Disclosures, limitations, capability posture, and lineage remain available without crowding the
   primary decision.
7. **Open full proposal review** preserves the portfolio and Discussion pack origin for governed
   review or lifecycle actions.

## Implemented Capabilities

- Uses the reusable Workbench proposal selector in an explicit grid presentation: record identity
  and status remain readable without a one-off card stack.
- Uses a full-width selected-record desk when portfolio and workflow rails constrain the centre
  canvas; compact widths retain worklist-before-evidence order.
- Validates proposal, portfolio, immutable version, lifecycle, request correlation, closed enum,
  timestamp, capability, and client-release semantics before presentation.
- Presents five independent controls: adviser narrative, adviser memo, report package, client
  consent record, and client release/delivery.
- Labels deterministic and AI-assisted narrative generation explicitly. **AI-assisted draft** is
  provenance, not advice, approval, or client-ready authority.
- Reports narrative freshness as **Not reported** because the contract publishes proposal-version
  time, not a narrative freshness fact; Workbench does not upgrade that adjacent timestamp.
- Shows source-backed narrative sections with reference and limitation counts.
- Shows memo sections, disclosure requirements, client-use blockers, and limitations without inventing
  owners, deadlines, priority, or completion.
- Keeps capability and lineage evidence in progressive disclosure.
- Preserves confirmed evidence while a refresh is pending; failure does not relabel older evidence
  as current.
- Announces success only after the selected source read succeeds and restores the initiating
  refresh control when focus has not deliberately moved.
- Uses only the same-origin Workbench BFF; the browser never calls Advise or Report directly.

## Decisions And Actions

| Decision or action | Required evidence | Persisted change |
| --- | --- | --- |
| Select a proposal | Proposal is in the current Gateway window | None; changes browser selection only |
| Use narrative internally | Narrative is supported and approved for adviser use | None; read-only evidence |
| Review decision memo | Memo evidence is supported for the selected version | None; read-only evidence |
| Interpret report-package posture | Package state and version correlation are source-confirmed | None; read-only evidence |
| Interpret client consent | Current-version consent record is supported and unambiguous | None; read-only evidence |
| Refresh discussion pack | Current list and exact selected projection both succeed | None; replaces confirmed evidence |
| Open full proposal review | Selected proposal and preserved route context | None; navigates to governed actions |

There is no publish, release, deliver, contact-client, consent, report-generation, or approval
mutation on this screen.

## Information And Source Authority

| Business fact | Workbench boundary | Source authority |
| --- | --- | --- |
| Proposal identity, state, version, and recorded time | Strictly parsed and request-bound | Gateway over Advise |
| Narrative text and grounding references | Presented without regeneration or rewriting | Immutable Advise proposal-version narrative |
| Narrative adviser-use review | Kept separate from client-ready posture | Advise append-only narrative review |
| Disclosure policy and client-use blockers | Presented as selected source policy | Advise narrative policy |
| Adviser memo and memo review | Presented for internal decision support | Persisted Advise memo evidence |
| Report-package state and reference | Presented as preparation/materialization only | Advise summary over Report evidence through Gateway |
| Client consent | Selected only for the immutable current version | Advise approval ledger through Gateway |
| Client release, publication, delivery, communication | Explicit blocked/not-supported boundary | Gateway contract; no browser override |
| Support reference and immutable hashes | Secondary evidence inside **Support details** | Gateway and source lineage |

See [API Surface](API-Surface) and [Integrations](Integrations) for shared contract detail.

## Screen States And Recovery

| State | User-visible posture | Recovery |
| --- | --- | --- |
| Preparing the discussion pack | Exact selected evidence is being checked | Wait; lifecycle stage is not substituted |
| Internal review complete | Meeting material is available for internal use; client release remains separate | Prepare internally and confirm release approval before external use |
| Action required | One or more narrative, memo, package, consent, or release controls need attention | Use the checklist and open the governed record |
| Information incomplete | Some current-version evidence is unavailable | Review only confirmed information and resolve the named gaps |
| Discussion pack access is restricted | Selected evidence is hidden and no retry bypass is offered | Use the bank's access process |
| Discussion pack is unavailable | No discussion posture is inferred | **Retry discussion pack** through the same Workbench BFF read |
| Updating discussion pack | Prior confirmed material remains visible under its prior context | Wait for the selected read to settle |
| Update failed | Prior material remains visible but is not relabelled current | Retry the unchanged selection |
| Current version available | Worklist and selected source evidence reconciled successfully | Continue the current review |
| Source contract invalid | Gateway or Workbench rejects contradictory identity or evidence | Escalate with bounded correlation and proposal version |

## Workbench Boundaries

Workbench validates and presents the Gateway experience contract. Advise remains the proposal,
narrative, memo, policy, review, and consent system of record; Report remains the report-package
source named by Gateway. Workbench does not generate or rewrite the narrative, calculate
suitability or risk, approve a proposal, approve consent, publish or release material, deliver a
document, communicate with a client, or claim execution.

An adviser-use narrative or memo is not client-ready material. A report reference is not delivery.
A consent record is not publication authority. An empty exception register cannot override the
explicit client-release boundary.

## Adjacent Handoffs

| Direction | Workspace | Preserved context |
| --- | --- | --- |
| Inbound | Risk and Impact, Suitability review, Approval Queue, or Proposal Detail | Selected portfolio and proposal lifecycle |
| Detail | Proposal Detail through **Open full proposal review** | Proposal, portfolio, and Discussion pack origin |
| Return | Discussion pack review through the governed detail return link | Source proposal portfolio and Discussion pack mode |
| Reporting | Report package evidence | Reference only; no direct browser-to-Report call or generation action |

## Responsive And Accessible Use

- The worklist exposes one visible selection and Up/Down/Home/End keyboard movement.
- Identity leads status in the reusable grid worklist so long proposal names do not collapse around
  badges.
- Worklist precedes selected evidence in DOM, visual, and focus order at every width.
- The selected record uses the whole centre canvas at wide desktop and reflows at 1280, 1024, 720,
  and 390 pixels without horizontal overflow.
- Native disclosures retain 44-pixel operable summaries and visible focus.
- Pending, confirmed, failed, restricted, and unavailable states use programmatic status semantics.
- Source ids and hashes remain secondary to business decisions and boundaries.

## Current-Product Research

- [FCA COBS 4.2](https://handbook.fca.org.uk/handbook/COBS/4/2.html) informed the boundary that
  client-facing material must remain fair, clear, and not misleading.
- [ESMA MiFID II suitability guidelines](https://www.esma.europa.eu/document/guidelines-certain-aspects-mifid-ii-suitability-requirements)
  informed the need to keep suitability and client-use controls visible in the proposal workflow.
- [FINRA Regulatory Notice 24-09](https://www.finra.org/rules-guidance/notices/24-09) informed the
  explicit AI-assisted provenance and mandatory human-review boundary.
- [SAP Fiori messaging guidance](https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/best-practices/global-patterns/messaging/messaging)
  informed actionable, local, and state-specific recovery messages.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) informed reflow, status announcement, focus continuity,
  and target-size proof.

The screen adopts decision-first workflow, source truth, progressive evidence, and responsive
composition. It rejects competitor visual imitation, decorative card walls, inferred readiness,
and unsupported actions. These sources guide workflow principles; they are not a claim of bank
approval or competitor superiority.

## Evidence And Validation

- `tests/unit/proposal-discussion-pack-contract.test.ts` proves request identity, lifecycle,
  capability, closed-enum, correlation, and release-boundary parsing.
- `tests/unit/proposal-discussion-pack-view-model.test.ts` proves business language and independent
  adviser-use, package, consent, and release presentation.
- `tests/unit/proposal-discussion-pack-copy.test.ts` proves the governed navigation, decision,
  refresh, capability, and unknown-state language.
- `tests/unit/proposals-api.test.ts` proves the browser uses the same-origin BFF with the selected
  portfolio and version query.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves selected-only reads, no N+1,
  server-side lifecycle filtering, source failure, refresh settlement, and focus restoration.
- `tests/e2e/proposal-workflow-context.spec.ts` proves optimized-production keyboard selection,
  truthful refresh confirmation, AI provenance, unsupported-action absence,
  1440/1280/1024/720/519/390 reflow, and zero overflow.
- Reviewed desktop, tablet, and compact images are indexed in
  `docs/evidence/issue-798-product-copy/discussion-pack-review/README.md`.
- Canonical runtime uses `PB_SG_GLOBAL_BAL_001`; screenshots do not replace API and contract proof.

## First Support Step

Read the selected proposal reference, version, control status, and **Support details**, then retry
the same selection once. If the failure persists, record those bounded references and the visible source
state. Do not paste client material or full source payloads into support channels, call Advise or
Report directly from the browser, or bypass the release boundary.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Approval Queue](Approval-Queue-Screen-Guide)
- [Risk and Impact](Risk-And-Impact-Screen-Guide)
- [Implementation Status](Implementation-Status-Screen-Guide)
- [Proposal Detail](Proposal-Detail-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
