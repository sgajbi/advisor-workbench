# Proposal Detail memo and evidence-pack evidence

This evidence pack supports Workbench #798's Proposal Detail memo slice. It shows the governed
advisor workflow after the action-contract, source-refresh, failure, keyboard, and responsive tests
have passed.

## Business workflow shown

1. prepare the current-version working memo;
2. record the advisor's review against the retained memo evidence;
3. request discussion material only after that review is confirmed; and
4. inspect the retained record, audience view, and optional advisor commentary.

The workflow presents one memo-specific next step and keeps the proposal lifecycle action separate.
It does not invent an advisor identity, promote generated commentary to source evidence, or claim
client release, delivery, suitability approval, order routing, or execution.

## Rendered evidence

- [Desktop — 1440 px](memo-evidence-desktop.png)
- [Compact — 519 px](memo-evidence-compact.png)

## Validation

- `npm test -- --run tests/unit/live-canonical-validation-script.test.ts tests/unit/proposal-memo-posture-panel.test.tsx tests/unit/proposal-memo-posture-view-model.test.ts tests/unit/proposal-memo-action-payloads.test.ts tests/unit/proposals-api.test.ts` — 69 passed.
- `$env:PLAYWRIGHT_PORT='32199'; $env:ISSUE_798_EVIDENCE_DIR='docs/evidence/issue-798-product-copy'; npx playwright test tests/e2e/proposal-memo-posture.spec.ts --project=chromium --workers=1` — 10 passed.
- `$env:PLAYWRIGHT_PORT='32200'; npx playwright test tests/e2e/proposal-workflow-context.spec.ts --project=chromium --workers=1` — 20 passed.
- `$env:PLAYWRIGHT_PORT='32201'; $env:ISSUE_798_EVIDENCE_DIR='docs/evidence/issue-798-product-copy'; npx playwright test tests/e2e/proposal-memo-posture.spec.ts --project=chromium --workers=1 --grep 'supported widths'` — 1 passed at 1440, 768, 640, and 519 pixels with zero visible horizontal overflow.
- `npm run typecheck` — passed.
- Targeted ESLint for the changed component, browser workflow, and tests — passed.

The optimized browser journey uses source-faithful mocked Gateway envelopes. It proves persistence
failure, refresh disagreement, safe error language, action gating, keyboard behavior, and responsive
reflow. The screenshots support visual review; they do not prove canonical data, production
identity, entitlement, source persistence, or bank acceptance.
