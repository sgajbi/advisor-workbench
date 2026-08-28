# Review Evidence Index

This directory contains issue-scoped diagnostic and reviewer evidence retained with the repository.
Each pack must state its source head, fixture or runtime context, proven behaviour, and non-claims.

Evidence classes are not interchangeable:

| Evidence | Supports | Does not support by itself |
| --- | --- | --- |
| Deterministic fixture render | Workbench behaviour and responsive composition against governed fixtures | Source-service integration or production readiness |
| Canonical runtime artefact | Integrated behavior for the governed seed and recorded service heads | Production identity, resilience, capacity, or bank acceptance |
| Exact-main CI | Releasability of the merged repository head | External-service or production-environment certification |
| Diagnostic capture | Root-cause analysis or reviewer comparison | Product promotion or closure evidence |

The retention, size, replacement, and retirement policy remains tracked in
[Workbench #830](https://github.com/sgajbi/lotus-workbench/issues/830). Until that policy is
implemented, do not add a new pack without an issue-owned evidence requirement; prefer ephemeral CI
artefacts where durable repository evidence is unnecessary.

Use [Validation and CI](../../wiki/Validation-and-CI.md) for the governing evidence map.
