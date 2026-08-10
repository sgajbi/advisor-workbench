# Technology Risk And Runtime Support

## Current Scope

This page gives bank architecture, cyber, operations, accessibility, and procurement reviewers a
concise view of the Workbench technology baseline. It distinguishes implemented controls from work
that still needs certification under
[`lotus-workbench#612`](https://github.com/sgajbi/lotus-workbench/issues/612).

The current decision is to retain the mature Workbench foundation and make its lifecycle and build
evidence deterministic. This is not a claim that a bank has approved the stack.

## Governed Runtime Baseline

| Concern | Current decision | Evidence posture |
| --- | --- | --- |
| Build and server runtime | Node `22.23.1` Maintenance LTS | Exact in protected CI and digest-pinned container |
| Package manager | npm `10.9.8`, bundled with the governed Node release | Exact declaration; npm 10 compatibility range for developers |
| Application framework | Next.js `15.5.22` Maintenance LTS | Time-bounded acceptance; review required by 2026-09-15 |
| UI foundation | React `19.1.0` and TypeScript `5.9.3` | Exact manifest and policy reconciliation |
| Production container | Official Debian Bookworm slim Node image | Immutable digest, standalone output, non-root runtime |
| Browser automation | Playwright `1.58.2`, Chromium project | Protected smoke evidence; wider browser certification open |
| Product boundary | Workbench BFF to `lotus-gateway` | Browser owns no financial calculation or durable workflow authority |

The versioned source is
[`workbench-runtime-support-policy.v1.json`](../docs/architecture/workbench-runtime-support-policy.v1.json).
The architecture decision is
[`workbench-production-runtime-decision.md`](../docs/architecture/workbench-production-runtime-decision.md).

## Why This Reduces Bank Technology Risk

1. The stack uses supported, well-documented technologies with broad engineering ecosystems rather
   than experimental framework channels.
2. CI and the production image use the same exact Node patch instead of a moving major-version
   selector.
3. Dependency installation is lockfile-immutable and separate from explicit vulnerability gates.
4. The runtime image is minimal, non-root, health-checked, scanned, and accompanied by a CycloneDX
   SBOM in protected lanes.
5. Domain authority stays in Gateway and source-owning services, limiting browser and application
   server coupling.
6. The policy expires on a fixed date, preventing Maintenance-LTS software from remaining accepted
   by inertia.

## Production And Scaling Posture

Next standalone output and service-owned durable business state make the Workbench container
compatible with a replicated application tier. Each replica can be health-checked, and the browser
continues to use the same Gateway product boundary.

This architecture compatibility is not capacity certification. Workbench does not yet claim
multi-replica behavior, load or soak capacity, high availability, disaster recovery, or production
identity. #612 remains open until those claims have measured evidence or explicit accepted-risk
ownership.

## Deterministic Controls

`npm run quality:runtime-support` fails when the repository drifts across package metadata,
lockfile runtime ranges, exact CI Node versions, container provenance, npm/Playwright declarations,
canonical install commands, explicit Chromium projects, or the review date. It reads active
workflow steps and named Docker stages rather than accepting matching text in comments, unrelated
stages, or superseded instructions. `npm run lint` invokes this control, so Feature, PR, Main, and
Docker-parity quality lanes inherit it.

Existing gates also cover dependency vulnerabilities, lint, TypeScript, coverage, production
builds, bundle budgets, Playwright smoke, Docker parity, container vulnerabilities, and SBOM
publication. See [Validation and CI](Validation-and-CI) for the lane evidence map.

## Explicit Non-Claims

This baseline does not certify:

1. Firefox, Safari/WebKit, Edge, older managed browsers, or assistive-technology combinations;
2. load, soak, horizontal-scale capacity, high availability, or disaster recovery;
3. production identity, IdP, session, or token-claim integration;
4. the license, stewardship, and replaceability posture of every direct dependency;
5. bank architecture, cyber, accessibility, operations, or procurement approval.

## Next Review And Escalation

The runtime policy must be reviewed by 2026-09-15 because Next.js 15 is in Maintenance LTS. Any
security advisory, end-of-support change, critical dependency abandonment, or browser policy change
requires immediate issue-backed review rather than waiting for the date.

Remaining certification work and acceptance evidence belong on
[`lotus-workbench#612`](https://github.com/sgajbi/lotus-workbench/issues/612), keeping GitHub as the
durable execution record.

## Primary Sources

1. [Node.js release lifecycle](https://nodejs.org/en/about/previous-releases)
2. [Node 22.23.1 and bundled npm](https://nodejs.org/en/download/archive/v22.23.1)
3. [Next.js support policy](https://nextjs.org/support-policy)
4. [npm package metadata controls](https://docs.npmjs.com/files/package.json/)
5. [Next.js browser floors](https://nextjs.org/docs/pages/getting-started/installation#supported-browsers)
6. [MDN Baseline scope](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)
7. [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
8. [Dockerfile reference](https://docs.docker.com/reference/dockerfile)
9. [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
