# Proposal Detail narrative review evidence

This evidence pack supports Workbench #798's Proposal Detail narrative-review slice. It shows the
advisor decision sequence at desktop and compact widths after the source-contract and action tests
have passed.

## Business workflow shown

1. recommendation rationale;
2. advisor review for the current proposal version;
3. discussion-pack eligibility and preparation status; and
4. downstream delivery activity.

The primary workflow does not expose an editable version or assume an authenticated advisor. The
reviewer reference remains explicit in progressive review-record detail. Client release, document
delivery, order routing and implementation are not promoted from this screen.

## Rendered evidence

- [Desktop — 1440 px](narrative-review-desktop.png)
- [Compact — 519 px](narrative-review-compact.png)

## Validation

- `npm test -- tests/integration/proposal-detail-view.test.tsx tests/unit/proposal-narrative-posture-panel.test.tsx tests/unit/proposal-narrative-posture-view-model.test.ts`
- `$env:PLAYWRIGHT_PORT='3219'; npx playwright test tests/e2e/proposal-memo-posture.spec.ts --project=chromium --workers=1`
- `$env:PLAYWRIGHT_PORT='32202'; $env:ISSUE_798_EVIDENCE_DIR='docs/evidence/issue-798-product-copy'; npx playwright test tests/e2e/proposal-memo-posture.spec.ts --project=chromium --workers=1 --grep 'supported widths'`
- `npm run quality:product-copy`
- `npm run quality:screen-docs`
- `npm run typecheck`
- `npm run lint:css-global`

The optimized browser journey uses mocked Gateway envelopes to prove interaction, source-refresh,
failure, keyboard, container-reflow and visible-overflow behavior. These screenshots are reviewer
evidence, not proof of production identity, entitlement, client delivery or canonical source data.
