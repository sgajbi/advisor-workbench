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
| Direct dependency admission | 14 exact stable production dependencies | Blocking manifest/lock/inventory reconciliation; no current exceptions |

The versioned source is
[`workbench-runtime-support-policy.v1.json`](../docs/architecture/workbench-runtime-support-policy.v1.json).
The architecture decision is
[`workbench-production-runtime-decision.md`](../docs/architecture/workbench-production-runtime-decision.md).
The direct dependency source is
[`workbench-dependency-risk-inventory.v1.json`](../docs/architecture/workbench-dependency-risk-inventory.v1.json).

## Direct Dependency Architecture

| Boundary | Governed dependencies | Containment and exit posture |
| --- | --- | --- |
| Framework core | Next.js, React, React DOM | Strategic coupling; replacement requires an architecture RFC and staged product migration |
| Design system | MUI, Emotion React, Emotion Styled | Business composition stays in Workbench components; migrate through the design-system facade |
| Server state | TanStack React Query | Query keys, source refresh, and failure rules stay in feature-owned hooks over Gateway contracts |
| Dense records | AG Grid Community and React adapter | Grid registration and behavior stay behind portfolio grid frames and design-system utilities |
| Analytics charts | Apache ECharts and React adapter | Rendering stays behind `WorkbenchECharts`; financial models and labels remain Workbench-owned |
| Forms | React Hook Form and resolvers | Limited to Proposal simulation and paired with repository-owned validation rules |
| Contract validation | Zod | Feature contract modules own schemas and failure posture at external boundaries |

All current entries are `approved_default`, use exact stable versions, and carry MIT or Apache-2.0
package evidence. There are no dependency exceptions in the current inventory. This is engineering
and traceability evidence, not an independent legal opinion or procurement approval.

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
7. A new direct production library cannot pass protected lanes until its license, stewardship,
   stable lifecycle, business purpose, architecture containment, exit path, owner, and review date
   are recorded in the same issue-backed change.

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
stages, or superseded instructions. Docker escape continuations retain token adjacency, alternate
parser escape directives fail closed after leading UTF-8 BOM normalization, `RUN` and `COPY` heredoc
payloads remain payload rather than stage instructions, JSON-form operands cannot masquerade as
heredoc operators, and governed stages reject inherited `ONBUILD` triggers and `SHELL` overrides that could reinterpret or
indirectly add commands. `npm run lint` invokes this control, so Feature, PR, Main, and Docker-parity
quality lanes inherit it.

Existing gates also cover dependency vulnerabilities, lint, TypeScript, coverage, production
builds, bundle budgets, Playwright smoke, Docker parity, container vulnerabilities, and SBOM
publication. See [Validation and CI](Validation-and-CI) for the lane evidence map.

`npm run quality:dependency-risk` is the blocking admission control for direct production
dependencies. It reconciles the manifest, lockfile root, resolved lock entry, executable JSON
Schema, and inventory. It rejects missing or extra entries, duplicate or drifted versions,
prerelease status, license ambiguity, unsupported lifecycle, missing stewardship or security
channels, ownerless purpose/containment/exit posture, expired reviews, prohibited state, and
incomplete exceptions. Transitive dependencies remain governed through the exact lockfile, npm
audits, image scan, and SBOM rather than duplicated as hand-maintained inventory rows.

## Explicit Non-Claims

This baseline does not certify:

1. Firefox, Safari/WebKit, Edge, older managed browsers, or assistive-technology combinations;
2. load, soak, horizontal-scale capacity, high availability, or disaster recovery;
3. production identity, IdP, session, or token-claim integration;
4. independent legal approval of license compatibility or third-party contractual terms;
5. bank architecture, cyber, accessibility, operations, or procurement approval.

## Next Review And Escalation

The runtime policy must be reviewed by 2026-09-15 because Next.js 15 is in Maintenance LTS. The
broader dependency inventory must be reviewed by 2026-11-10; each dependency can carry an earlier
date where its lifecycle requires it. Any security advisory, end-of-support change, critical
dependency abandonment, license change, or browser policy change requires immediate issue-backed
review rather than waiting for the date.

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
10. [Lotus platform technology-governance policy](https://github.com/sgajbi/lotus-platform/blob/2868348d289fc685ecf5a218b6c73256ac3a7742/platform-contracts/technology-governance/lotus-technology-governance-policy.v1.json)
11. [OpenSSF dependency selection guidance](https://best.openssf.org/Concise-Guide-for-Developing-More-Secure-Software)
12. [SPDX license expressions](https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/)
