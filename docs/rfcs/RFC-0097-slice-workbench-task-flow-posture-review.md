# RFC-0097 Workbench Task-Flow Posture Slice Review

## Scope

This slice makes Workbench consume Gateway-published RFC-0097 task-flow posture for the
Performance advisor-brief surface. Workbench remains a renderer of gateway truth: it does not infer
task-flow state, review state, or replacement lineage from narrative text or fallback previews.

## Implemented

1. Added typed `workflow_pack_task_flow` support to the Workbench advisor-brief gateway contract.
2. Added task-flow provenance refs to advisor-brief audit source refs.
3. Added task-flow supportability and replacement-lineage notes to the gateway-backed view model.
4. Kept the existing review-action form governed by `workflow_pack_run.allowed_review_actions`.
5. Updated repository context and wiki integration notes for the new gateway-backed posture.
6. Tightened the canonical live workflow-pack proof so advisor-brief validation now fails if
   gateway responses omit task-flow identity, source-run references, review-state mapping,
   replacement lineage, or `READY_FOR_HANDOFF` posture.

## Review Findings

1. The implementation avoids a new UI surface because the existing supportability rail already
   presents bounded run and review posture clearly.
2. The fallback advisor-brief view model remains untouched so synthetic preview data cannot pretend
   to prove RFC-0097 posture.
3. The UI continues to hide review actions when gateway returns no allowed review actions; task-flow
   posture is read-only.
4. Unit coverage now proves source-ref preservation, supportability rendering, replacement lineage
   rendering, and API payload preservation.
5. The live validator now checks initial task-flow posture before review actions and refreshed
   task-flow posture after `ACCEPT`, `SUPERSEDE`, and `REVISE`; this closes the previous evidence
   gap where live proof could pass on `workflow_pack_run` alone.

## Proof

1. `npm test -- --run tests/unit/performance-advisor-brief-view-model.test.ts tests/unit/performance-advisor-brief-mode.test.tsx tests/unit/workbench-api.test.ts`
   - 44 passed.
2. `npm run typecheck`
   - passed.
3. `npm run lint`
   - passed.
4. `npm run build`
   - passed with existing autoprefixer mixed-support warnings in `src/app/globals.css`.
5. `git diff --check`
   - passed with existing CRLF normalization warnings only.
6. `powershell -ExecutionPolicy Bypass -File <lotus-platform>\automation\Sync-RepoWikis.ps1 -CheckOnly -Repository lotus-workbench`
   - reported expected branch-local drift for `Integrations.md`; publish after merge to `main`.
7. Handoff-readiness follow-up: Workbench now preserves and renders gateway task-flow
   `handoff_refs`.
   `npm test -- --run tests/unit/performance-advisor-brief-view-model.test.ts tests/unit/performance-advisor-brief-mode.test.tsx tests/unit/workbench-api.test.ts`
   - 44 passed.
8. Handoff-readiness follow-up `npm run typecheck`
   - passed.
9. Handoff-readiness follow-up `npm run lint`
   - passed.
10. Live proof hardening follow-up `npm test -- --run tests/unit/live-validation-workflow-pack-proof.test.ts`
    - 2 passed.
11. Live proof hardening follow-up `git diff --check`
    - passed with existing CRLF normalization warnings only.

## Closure Assessment

1. Domain handoff execution remains a future cross-service slice.
2. Live end-to-end validation passed on 2026-04-21 through the governed clean-core proof profile:
   `<lotus-platform>\output\front-office-qa\canonical-front-office-qa-20260421-192148.md`.
3. The proof validated initial advisor-brief workflow-pack posture plus `ACCEPT`, `SUPERSEDE`, and
   `REVISE` task-flow posture through `lotus-ai` -> `lotus-gateway` -> `lotus-workbench`.
4. Final governance review, docs/context/wiki publication, skills assessment, and branch hygiene
   were completed as part of RFC closure.
