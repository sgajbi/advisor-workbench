# Issue #812 Performance Control Bar Evidence

This pack records deterministic optimized-production browser evidence for the Performance control
bar and Return History review introduced under Workbench issue #812. It is engineering and visual
review evidence, not canonical live-service proof, a client demo pack, or bank certification.

## Proven Product Behaviour

- Performance Summary, Analysis, and Risk render one shared, capability-aware source-selection
  control bar.
- Horizon, return basis, and benchmark remain visible across those modes; Frequency remains visible
  only where the governed source request consumes it. Exact dates are disclosed only when
  **Custom dates** is selected.
- Explicit date inputs retain their complete value and action at every tested width.
- Summary defaults to the six-column **Absolute** Return History review. **Relative** and
  **Combined** are optional display choices, not additional source selectors.
- Horizon Comparison inherits the selected horizon and benchmark; its display overrides remain
  behind **Adjust comparison display** and reflow within the comparison panel rather than the
  outer viewport.
- Return measures hold a 4-column desktop/tablet, 2-column compact, and 1-column very-narrow
  hierarchy.
- The page has no horizontal overflow at 1440, 1024, 768, or 519 pixels. At 519 pixels only the
  wide Return History comparison region scrolls, with **Period** and **Window** pinned.

The evidence uses the repository's source-shaped deterministic populated Performance fixture. It
proves Workbench interaction, responsive composition, and Gateway/BFF request behaviour without
claiming that a live upstream service produced these screenshots.

## Reproduction

The captures were regenerated after the exact-head review fixes. Git history preserves the rendered
implementation checkpoint; CI and the linked PR checks validate the complete branch head.

```powershell
node scripts/testing/run-performance-smoke-scenario.mjs populated --grep "one governed control bar"
$env:PLAYWRIGHT_REUSE_VALIDATED_BUILD='1'
node scripts/testing/run-performance-smoke-scenario.mjs populated --grep "populated summary preserves|review context and focus"
```

Results: the issue-specific journey passed at all four governed widths; the two adjacent responsive
Performance regressions also passed. The runner used its checkout-specific optimized production
build and ports and did not start, stop, or modify the shared canonical stack.

## Reviewed Captures

| Width | Control and return measures | Return History |
| --- | --- | --- |
| 1440 | [Desktop control bar](issue-812-performance-control-bar-desktop.png) | [Desktop Return History](issue-812-return-history-desktop.png) |
| 1024 | [Compact desktop control bar](issue-812-performance-control-bar-compact-desktop.png) | [Compact desktop Return History](issue-812-return-history-compact-desktop.png) |
| 768 | [Tablet control bar](issue-812-performance-control-bar-tablet.png) | [Tablet Return History](issue-812-return-history-tablet.png) |
| 519 | [Compact control bar](issue-812-performance-control-bar-compact.png) | [Compact Return History](issue-812-return-history-compact.png) |

Visual review confirmed that the control hierarchy remains readable without shrinking productive
type, date values are not clipped, cumulative column headings wrap inside their cells, and compact
scrolling is confined to the named comparison region. The first implementation pass did not meet
that bar: its 1440-pixel table heading overflowed and its tablet measures formed an unbalanced 3+1
layout. Those product defects were corrected before this pack was retained.

The control-bar captures intentionally show **Custom window** expanded. This is the most demanding
layout state and proves that both full date values and the Apply action remain available without page
overflow. The same browser journey first asserts the production default is collapsed and that the
default 1440-pixel control bar stays within its governed compact-height threshold.
