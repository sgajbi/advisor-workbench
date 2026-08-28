# Documentation Governance

These records define how Workbench product, engineering, and operating truth is documented.

| Record | Purpose |
| --- | --- |
| [Product architecture blueprint](product-architecture-blueprint.md) | Current product composition, responsibility, and boundary model |
| [Product vocabulary](product-vocabulary.md) | Canonical business language and prohibited ambiguity |
| [Implementation documentation standard](implementation-documentation-standard.md) | Minimum documentation and evidence required with change |
| [Screen guide template](workbench-screen-guide-template.md) | Required business, state, authority, and support structure for each screen |
| [Screen registry](workbench-screen-registry.v1.json) | Machine-readable route, mode, guide, source-owner, and evidence mapping |
| [Screen registry schema](workbench-screen-registry.schema.json) | Executable registry shape |
| [Branch protection workflow](git-branch-protection-workflow.md) | Repository branch and pull-request posture |

The registry and template are enforced by `npm run quality:screen-docs`. Published screen guidance
belongs in `wiki/`; deep technical detail belongs in `docs/`. Avoid maintaining the same contract
inventory in both places.

