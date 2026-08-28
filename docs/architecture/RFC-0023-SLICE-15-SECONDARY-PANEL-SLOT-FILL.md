# RFC-0023 Slice 15: Secondary Panel Slot Fill

## Intent

Fix the remaining white void inside the secondary analytical band by making each secondary panel explicitly fill its assigned slot width instead of shrinking to its content.

## Changes

- Updated [risk-secondary-panel-group.tsx](..\..\src\apps\performance\components\risk\risk-secondary-panel-group.tsx) to add explicit rolling and attribution slot wrappers.
- Updated [globals.css](..\..\src\app\globals.css) so secondary panel slots:
  - fill available width
  - align to the top
  - keep child panels at `width: 100%`

## Why This Matters

- The attribution panel no longer shrinks inside its column and leave a white void beside the table.
- The fix is structural and testable in React markup instead of relying on fragile CSS inference.
- Secondary analytical panels now behave more like intentional workstation columns and less like floating cards inside a wide container.

## Acceptance Criteria

- Secondary rolling and attribution slots render through explicit slot wrappers.
- Child panels inside those slots occupy the full slot width.
- No change to panel order, interaction behavior, or backend-backed content.

## Validation

- `npm run test -- tests/unit/risk-panel-groups.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
