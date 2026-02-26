# RFC-0015: Valuation-Ready Default Routing and Workbench Readiness

## Problem Statement
Initial user flows in Decision Console and Proposal Simulation can route to non-valued or non-existent portfolio IDs, creating a broken first-use experience where valuation and holdings context appear unusable.

## Root Cause
- Legacy fallback IDs (`pf_demo_ui_*`) no longer match actual demo portfolios.
- Default proposal simulation portfolio used the same invalid legacy ID.
- Workbench did not explicitly communicate valuation data readiness when lotus-core returns positions without priced valuation.

## Proposed Solution
- Replace fallback routing IDs with canonical lotus-core demo portfolios:
  - `DEMO_ADV_USD_001`
  - `DEMO_DPM_EUR_001`
  - `DEMO_INCOME_CHF_001`
  - `DEMO_BALANCED_SGD_001`
  - `DEMO_REBAL_USD_001`
- Align proposal simulation default portfolio to `DEMO_ADV_USD_001`.
- Add workbench valuation readiness messaging when valuation data is unavailable.

## Architectural Impact
- No API shape changes.
- Improves reliability of the UI entry path by aligning routing defaults with canonical seeded lotus-core data.
- Preserves backend-driven UX: readiness state is surfaced from backend response data.

## Risks and Trade-offs
- If demo portfolio naming changes again, defaults must be updated or driven by a backend capability endpoint in a future increment.
- Readiness messaging may be visible in environments that intentionally do not load demo data.

## High-Level Implementation Approach
1. Update workbench route fallback IDs to canonical demo portfolios.
2. Update proposal simulation defaults to canonical demo portfolio ID.
3. Keep valuation readiness banner visible when `market_value_base` and per-position valuation fields are absent.
4. Validate by rebuilding `lotus-workbench` and navigating `/workbench` and `/proposals/simulate`.

## Status
IMPLEMENTED
