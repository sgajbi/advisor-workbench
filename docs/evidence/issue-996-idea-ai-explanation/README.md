# Issue #996 Browser Evidence

This evidence was captured from the optimized Workbench Playwright runtime with exact fixture
responses shaped to the merged Gateway contract. It proves browser rendering and interaction; it
is not canonical live-service or production-provenance evidence.

| Evidence | What it proves |
| --- | --- |
| [Governed rationale](idea-governed-rationale.png) | Grounded rationale, exact source reference, evidence gaps, source signals, evaluation status, and unattested provenance are distinct; advisor actions remain present. |
| [Deterministic fallback](idea-deterministic-fallback.png) | AI unavailability is explicit, source fallback is labelled deterministic, and review, feedback, and conversion-intent actions remain usable. |

Command:

```powershell
$env:PLAYWRIGHT_REUSE_VALIDATED_BUILD='1'
$env:ISSUE_996_EVIDENCE_DIR='docs/evidence/issue-996-idea-ai-explanation'
npx playwright test tests/e2e/idea-candidate-actions.spec.ts --project=chromium --grep 'governed idea rationale|deterministic evidence'
```

Run `npm run build` successfully before setting `PLAYWRIGHT_REUSE_VALIDATED_BUILD`.
