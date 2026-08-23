# Next.js Artifact Isolation

## Purpose

Workbench development and production validation must be able to run in the same checkout without
one process deleting files that another process is serving. A broken client chunk prevents the
advisor workstation from hydrating, can leave source-backed panels in their server-rendered loading
posture, and can make a valid product change appear to fail canonical QA.

## Artifact ownership

| Directory | Owner | Permitted consumers |
| --- | --- | --- |
| `.next-dev` | `next dev` | Interactive local Workbench development only |
| `.next-build` | `next typegen` and `next build` | Typecheck, production bundle gates, standalone Playwright, and the production image |
| `.next` | Legacy only | Ignored for migration safety; no governed command reads or writes it |

`scripts/config/next-artifact-layout.mjs` is the single path authority. `next.config.mjs`, bounded
cleanup, bundle analysis, standalone smoke, Docker packaging, and TypeScript configuration consume
that authority or are regression-tested against it. The production cleaner refuses to remove any
directory except the verified repository-local `.next-build` tree, so an active `.next-dev` owner
is never invalidated by `npm run build` or `make check`.

Next regenerates `next-env.d.ts` for the active phase. It is intentionally ignored and must remain
in `tsconfig.json`; `npm run typecheck` runs `next typegen` before `tsc --noEmit` so a clean checkout
does not rely on retained declarations.

## Blocking regression proof

Run:

```text
npm run test:next-artifact-isolation
```

The proof starts a branch-owned development host on port `31983` by default, compiles `/intake`,
and repeatedly requests that page and every published Next static asset while it executes the same
cleaner, production compilation, and portfolio bundle gate as `npm run build`. Any page failure,
missing client asset, production-build failure, or absent production `BUILD_ID` fails the command.
Set `NEXT_ARTIFACT_ISOLATION_PORT` to another unprivileged free port when required.

Machine-readable local evidence is written to `output/next-artifact-isolation.json`. The protected
PR Playwright lane runs this proof before browser smoke and reuses only the build that the proof has
just validated. It does not retry a failed build or accept an unhydrated page.

## Standalone packaging

The standalone server is generated at `.next-build/standalone/server.js`. Static assets must be
staged at `.next-build/standalone/.next-build/static` before that server is launched. The production
image copies the standalone root into `/app` and the static tree into `/app/.next-build/static`,
matching the generated runtime configuration.

`make clean` remains an explicit maintenance operation and removes all legacy, development,
production, and dependency artifacts. Do not run it while a local Workbench server is active.

## Adopted and rejected alternatives

Adopted:

- stable phase-aware `distDir` configuration supported by the pinned Next 15.5 line;
- explicit in-project directories with one shared fail-closed path authority;
- behavioral concurrency proof over rendered HTML and every referenced client asset;
- generated declaration hygiene recommended by Next.js.

Rejected:

- upgrading to Next 16 solely for `isolatedDevBuild`; framework certification remains separately
  governed and the current fix uses the proven pinned stack;
- build retries, assertion weakening, or stopping a shared stack to make validation pass;
- one mutable `.next` tree, arbitrary caller-selected cleanup paths, or directories outside the
  repository;
- treating a successful compiler message as proof when the serving browser can still receive a
  missing chunk.

## References

- [Next.js `distDir` configuration](https://nextjs.org/docs/pages/api-reference/config/next-config-js/distDir)
- [Next.js phase-aware configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [Next.js generated TypeScript declarations](https://nextjs.org/docs/app/api-reference/config/typescript)
- [Next.js 16 isolated development build](https://nextjs.org/docs/pages/api-reference/config/next-config-js/isolatedDevBuild)
