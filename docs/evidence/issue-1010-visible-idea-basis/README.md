# Issue #1010 — visible Idea action basis

## Business proof

The captured Recommendations workflow shows a same-candidate source refresh after a review was
saved. Lotus Idea's current queue reasons changed from `high_cash_ratio` to
`concentration_attention`, while the adviser's existing review and conversion drafts remained
visible as:

> Retained draft — Cash balance requires review

The adjacent guidance distinguishes that adviser-owned draft from the latest opportunity reasons.
The saved review receipt separately retains the exact persisted basis. Candidate facts, feedback,
review, conversion and exact-retry controls remain independent.

## Evidence

- `idea-action-visible-retained-basis.png` — optimized-production Chromium capture after the
  Gateway/BFF queue and detail refresh completed.
- Browser assertions prove that a submission without reselection sends the visible retained basis,
  while explicit reselection sends the newly visible current basis.
- Component assertions also cover empty reasons, unchanged reasons, exact retry identity, saved
  receipts and candidate isolation.

## Validation command

```powershell
$env:ISSUE_1010_EVIDENCE_DIR='docs/evidence/issue-1010-visible-idea-basis'
npx playwright test tests/e2e/idea-candidate-actions.spec.ts --grep 'keeps refreshed Idea action drafts visible' --workers=1
```

Result: 1 passed in optimized-production Chromium.

This is deterministic Workbench browser evidence with intercepted Gateway/BFF responses. It is not
presented as canonical live-stack or production authentication evidence.

## Measurable result

| Measure                                                         | Before | After |
| --------------------------------------------------------------- | -----: | ----: |
| Action forms able to display one basis while submitting another |      2 |     0 |
| New browser-owned reason codes or policy defaults               |      0 |     0 |
| Additional backend requests                                     |      0 |     0 |
| Existing action forms covered by the shared correction          |      0 |     2 |
