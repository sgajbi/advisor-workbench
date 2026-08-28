# Architecture Records

This directory separates current architecture authority from historical delivery evidence.

## Current Authority

- [Product architecture blueprint](../documentation/product-architecture-blueprint.md)
- [UI and Gateway capability contract](workbench-ui-gateway-capability-contract.md)
- [UI system usage guide](workbench-ui-system-usage-guide.md)
- [Surface hierarchy system](workbench-surface-hierarchy-system.md)
- [Typography system](workbench-typography-system.md)
- [CSS layer governance](css-layer-governance.md)
- [Production runtime decision](workbench-production-runtime-decision.md)
- [Scalability and availability decision](workbench-scalability-and-availability-decision.md)
- [Runtime support policy](workbench-runtime-support-policy.v1.json)
- [Dependency risk inventory](workbench-dependency-risk-inventory.v1.json)
- [Next.js artifact isolation](next-artifact-isolation.md)
- [Portfolio record route-bundle governance](portfolio-record-route-bundle-governance.md)

The machine-readable JSON inventories are executable policy inputs. Their schemas live beside them.

## Review And Improvement Ledgers

- [Codebase review playbook](CODEBASE-REVIEW-PLAYBOOK.md)
- [Codebase review ledger](CODEBASE-REVIEW-LEDGER.md)
- [UI architecture audit ledger](UI-ARCHITECTURE-AUDIT-LEDGER.md)

Ledgers record evidence and follow-up work; they do not replace current contracts or GitHub issue
state.

## Historical Delivery Records

`RFC-0022-SLICE-*` and `RFC-0023-SLICE-*` files preserve bounded implementation decisions and
validation evidence from the Risk workspace programme. File paths, selectors, and component names
inside them describe the delivery slice at that time. Use current authority above for new design or
refactoring decisions, and verify historical links against current source before reuse.

