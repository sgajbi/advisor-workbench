# Portfolio Intake

Portfolio Intake is the controlled preparation and publication workspace for new portfolio data.
It helps portfolio administration, investment operations, reference-data operations, and market-data
operations prepare one bounded request, correct validation issues, review the exact normalized
business information, and publish only after an explicit confirmation step. It does not turn a
browser submission into portfolio activation or downstream readiness.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/intake` |
| Navigation | **Portfolio** workspace, then **Intake** |
| Availability | Active Gateway-backed screen |
| Supported scope | One independent manual request or one supported CSV bundle at a time |
| Primary reading order | Choose a task, prepare information, resolve validation, review the exact request, then publish |
| Primary completion evidence | Source-confirmed publication counts, correlation reference, and contract version |

Task choices remain natively unavailable while the server-rendered page is becoming interactive.
Once Workbench owns the controls, the choice region reports ready and the first advisor action is
accepted without a second click. This readiness boundary prevents a visually available action from
silently disappearing during page hydration.

## Business Purpose

Portfolio Intake supports a four-stage control:

1. choose one operational job without inheriting plausible-looking business defaults,
2. prepare and validate only the information required for that job,
3. inspect the exact normalized request before any publication attempt, and
4. accept completion only when Gateway/Core return matching publication evidence.

The separation reduces accidental writes, makes corrections understandable, and keeps manual and
bulk requests within the same review-before-publication discipline.

## Who Uses This Screen

- **Portfolio and client administration** registers a portfolio record and servicing context.
- **Portfolio and investment operations** loads opening positions or records portfolio activity.
- **Reference-data operations** registers instruments needed by booking and analytics flows.
- **Market-data operations** publishes dated price observations used as governed valuation inputs.
- **Bulk-data operations** parses and reviews a supported CSV bundle before publication.
- **Product and support teams** distinguish browser validation, file parsing, Gateway rejection,
  incomplete confirmation evidence, and downstream readiness questions.

These uses do not imply production entitlement, maker-checker approval, client consent, portfolio
activation, valuation sign-off, or downstream data-quality certification.

## Workflow Position

1. Open Portfolio Intake and choose one of the six independent business tasks.
2. Enter the required information or select a supported CSV file. Reference suggestions are loaded
   only when requested; manual entry remains available when suggestions are unavailable.
3. Resolve the named field or row issues. File selection parses locally and does not publish.
4. Review the normalized request, including the complete record-family counts and requested detail.
5. Publish the reviewed intent. The exact reviewed payload and idempotency key remain immutable
   while the source outcome is pending.
6. Continue only from a source-confirmed receipt. If publication fails, retry the same reviewed
   intent or return to editing; any material edit requires a new review.

The next operational workflow depends on source-owned processing. Workbench does not automatically
move the user to Portfolio Review, Performance, Reporting, or another screen because publication
alone does not prove those workflows are ready.

## Implemented Capabilities

- Starts with no selected task and no fabricated portfolio, client, advisor, instrument, activity,
  or price data.
- Supports six explicit tasks: create a portfolio record, load opening positions, record
  transactions, register instruments, publish price observations, and import a supported CSV file.
- Uses blank keyed rows for manual multi-record entry rather than copying a previous business row.
- Loads portfolio, instrument, and currency suggestions through Gateway on demand while preserving
  an explicit manual-entry posture.
- Parses a selected CSV file into local review state without publishing it.
- Applies one typed normalization boundary before validation, review facts, intent fingerprinting,
  Gateway payload construction, and receipt reconciliation.
- Keeps imported record families collapsed until requested and presents ten source-ordered records
  per page with explicit range, total, page, and keyboard navigation; the full normalized payload
  remains eligible for publication.
- Invalidates review after a material edit and requires a fresh review before publication.
- Keeps the exact reviewed request visible and publication-affecting controls natively disabled
  while publication is pending.
- Reuses the exact payload and bounded idempotency key for an unchanged failed retry.
- Shows acceptance only when a valid Gateway envelope contains payload-matching publication counts,
  correlation evidence, and contract version.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Choose an intake task | Workbench client-readiness confirmation | None; opens a blank request |
| Load reference suggestions | Explicit request from the editor | None; reads Gateway-backed lookups |
| Parse a CSV file | Supported file selected and successfully parsed | None; creates local review state |
| Review a manual or file request | All named validation issues resolved | None; fixes the exact publication intent |
| Edit a reviewed request | Publication is not pending | None; invalidates the prior review |
| Publish a reviewed request | Current draft matches the reviewed intent and no publication is pending | Gateway/Core may persist the request |
| Retry a failed unchanged request | Same reviewed intent remains current | Repeats the same source request and idempotency key |
| Start another request | Prior publication is not pending | Clears local intake state only |

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Task choice, blank draft, local validation, and exact review projection | Owns browser workflow state and presents normalized request facts | Workbench implementation over governed request contracts |
| Portfolio, instrument, and currency suggestions | Requests bounded lookup lists through the Workbench BFF | Gateway over Core reference and portfolio authority |
| Reviewed portfolio bundle publication | Sends one reviewed envelope through the Workbench BFF with a bounded idempotency key | Gateway `POST /api/v1/intake/portfolio-bundle` over Core ingestion authority |
| Publication counts, correlation reference, and contract version | Validates the returned envelope and reconciles task-relevant counts | Gateway/Core source response |
| Replay, duplicate handling, lineage, durable processing, and downstream readiness | Does not infer or manufacture these states | Gateway/Core |

Workbench never calls Core directly. Shared contract detail remains in [API Surface](API-Surface),
and ownership flow remains in [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Becoming interactive | Visible task choices are natively disabled and the choice region is busy | Wait for the region to report ready; no repeated click is required |
| Choose a task | Six independent operational jobs with business purpose and audience | Select one ready task |
| Preparing | Blank task-specific editor and optional reference suggestions | Enter required information or request suggestions |
| Reference suggestions loading or unavailable | Named lookup posture while manual entry remains available | Retry suggestions or continue with verified manual values |
| Validation blocked | Field- or row-specific explanation of what must be corrected | Correct the named information and review again |
| File parsing | Visible file-preparation progress; publication remains unavailable | Wait for the selected file to finish parsing |
| File rejected | Explicit file-preparation error and no reviewed payload | Correct the supported columns or choose another file |
| Ready for review | Exact normalized business facts and bounded record preview | Review every required section before publication |
| Publication pending | Reviewed request stays visible; mutation and duplicate publication are disabled | Wait for the source outcome |
| Publication failed | Explicit source failure with the reviewed intent retained | Retry unchanged or edit and perform a new review |
| Publication confirmed | Matching publication counts, correlation reference, contract version, and explicit downstream non-claim | Continue according to the owning operations process |
| Incomplete confirmation | No success receipt because returned evidence does not match the request | Escalate as a Gateway/Core contract or persistence issue |

## Workbench Boundaries

Portfolio Intake deliberately does not:

- activate or approve a portfolio, client, account, mandate, or relationship,
- calculate valuation, performance, risk, suitability, allocation, tax, or reporting results,
- resolve source duplicates, create lineage, complete asynchronous jobs, or certify data quality,
- infer downstream Portfolio, Performance, Risk, Advice, Proposal, or Report readiness,
- replace production identity, entitlement, maker-checker, segregation-of-duties, or audit controls,
- claim bank approval or competitor superiority from workflow design or browser evidence.

Official financial-services intake, check-before-submit, validation recovery, progressive-disclosure,
pagination, and accessibility guidance informed this workflow. Lotus does not copy another
product's visual identity, data model, control decisions, or unsupported capability.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns source-backed own-book portfolio discovery and context
  switching after a portfolio is eligible to appear there.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the selected mandate's daily decision
  checkpoint after the relevant source contracts are available.
- [Positions](Positions-Screen-Guide) and [Transactions](Transactions-Screen-Guide) own booked-record
  review; they do not use the Intake receipt as proof that records are already available.
- [Report Centre](Report-Centre-Screen-Guide) owns reviewed report ordering after reporting
  eligibility is independently source-confirmed.

## Evidence And Validation

- `tests/unit/intake-task-selector.test.tsx` proves all six server-rendered actions remain native-
  disabled until client readiness and that a ready action publishes the exact task choice.
- `tests/integration/intake-page.test.tsx` proves blank preparation, validation, normalized review,
  edit invalidation, exact retry, pending mutation locks, and source-confirmed receipt behavior.
- `tests/e2e/intake-first-action-readiness.spec.ts` proves Create Portfolio and Import File accept the
  first ready click at 1440px and 390px, begin from disabled server HTML, render the correct editor,
  avoid horizontal overflow, and emit no console or page errors.
- `tests/e2e/intake-publication-lock.spec.ts` and `tests/e2e/intake-record-preview.spec.ts` prove the
  source-pending safety boundary and complete, bounded file-review publication path.
- Run `npm run test:e2e:intake:readiness` for the focused optimized-production browser journey.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence. Browser screenshots alone are not persistence or downstream-readiness
evidence.

## First Support Step

Record the selected task and whether the screen is becoming interactive, preparing, validation
blocked, parsing, ready for review, publication pending, failed, confirmed, or missing matching
confirmation evidence. For a source failure, retain only the correlation reference, contract
version, response status, and non-sensitive task/count posture; do not copy client information or
raw intake payloads into an unapproved channel. Retry only through the retained reviewed intent.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
