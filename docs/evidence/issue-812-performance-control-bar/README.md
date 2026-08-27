# Issue #812 Performance Control Bar Evidence

This pack records deterministic optimized-production browser evidence for the Performance control
bar and Return History review introduced under Workbench issue #812. It is engineering and visual
review evidence, not canonical live-service proof, a client demo pack, or bank certification.

## Proven Product Behaviour

- Performance Summary, Analysis, and Risk render one shared, capability-aware source-selection
  control bar.
- Horizon, return basis, and benchmark remain visible across those modes; Frequency remains visible
  only where the governed source request consumes it. The compact **Review window** control always
  exposes the complete source-confirmed range.
- Exact-date drafting is contained in a focused dialog with source bounds, validation, Cancel, and
  Apply actions. Source rejection, invalid input, Cancel, and Escape retain the previous confirmed
  range and restore focus without issuing or accepting a false business-state transition.
- Summary defaults to the six-column **Absolute** Return History review. **Relative** and
  **Combined** are optional display choices, not additional source selectors.
- Horizon Comparison inherits the selected horizon and benchmark; its display overrides remain
  behind **Adjust comparison display** and reflow within the comparison panel rather than the
  outer viewport.
- Return measures hold a 4-column desktop/tablet, 2-column compact, and 1-column very-narrow
  hierarchy.
- The page has no horizontal overflow at 1440, 1024, 768, 561, 519, or 390 pixels. At compact
  widths only an actually overflowing Return History comparison region scrolls, with **Period**
  and **Window** pinned.

The evidence uses the repository's source-shaped deterministic populated Performance fixture. It
proves Workbench interaction, responsive composition, and Gateway/BFF request behaviour without
claiming that a live upstream service produced these screenshots.

## Reproduction

The captures were regenerated after the exact-head review fixes. Git history preserves the rendered
implementation checkpoint; CI and the linked PR checks validate the complete branch head.

```powershell
$env:WORKBENCH_DEPLOYMENT_ID=(git rev-parse HEAD)
node scripts/testing/run-performance-smoke-scenario.mjs populated --focus control-bar
Remove-Item Env:WORKBENCH_DEPLOYMENT_ID
```

Results: the registered issue-specific journey passed at all six governed widths. The runner used
its checkout-specific optimized production build and ports and did not start, stop, or modify the
shared canonical stack. Machine-readable dimensions are retained in
`performance-control-bar-geometry.json`; the 1440px workstation records a 149.125px control bar,
the Return Path stage beginning at 663.40625px, zero initial vertical scroll, and no page overflow.

## Reviewed Captures

| Width | Control and return measures | Return History |
| --- | --- | --- |
| 1440 | [Desktop control bar](issue-812-performance-control-bar-desktop.png) | [Desktop Return History](issue-812-return-history-desktop.png) |
| 1024 | [Compact desktop control bar](issue-812-performance-control-bar-compact-desktop.png) | [Compact desktop Return History](issue-812-return-history-compact-desktop.png) |
| 768 | [Tablet control bar](issue-812-performance-control-bar-tablet.png) | [Tablet Return History](issue-812-return-history-tablet.png) |
| 561 | [Compact-tablet control bar](issue-812-performance-control-bar-compact-tablet.png) | [Compact-tablet Return History](issue-812-return-history-compact-tablet.png) |
| 519 | [Compact control bar](issue-812-performance-control-bar-compact.png) | [Compact Return History](issue-812-return-history-compact.png) |
| 390 | [Phone control bar](issue-812-performance-control-bar-phone.png) | [Phone Return History](issue-812-return-history-phone.png) |

Visual review confirmed that the control hierarchy remains readable without shrinking productive
type, date values are not clipped, cumulative column headings wrap inside their cells, and compact
scrolling is confined to the named comparison region. The first implementation pass did not meet
that bar: its 1440-pixel table heading overflowed and its tablet measures formed an unbalanced 3+1
layout. Those product defects were corrected before this pack was retained.

The control-bar captures show the complete confirmed date range without expanding the workstation
bar. Companion `issue-812-performance-window-dialog-*.png` captures prove the draft workflow at
each governed width, including the full-screen phone treatment. The same browser journey proves
dialog focus, valid request shaping, source confirmation, Escape without a request, focus return,
responsive containment, the 220px bar-height ceiling, and the 700px Return Path fold boundary.
