import type { PerformanceSourceControlFocusTarget } from "./performance-workspace-types";

const SOURCE_CONTROL_REGION_SELECTOR = '[data-performance-source-control-region="true"]';
const REFRESH_STATUS_SELECTOR = '[data-testid="workbench-refresh-status"]';
const MAX_FOCUS_SETTLEMENT_FRAMES = 12;

export function restorePerformanceSourceControlFocus(
  target: PerformanceSourceControlFocusTarget
) {
  let remainingFrames = MAX_FOCUS_SETTLEMENT_FRAMES;
  let previouslyFocused: HTMLElement | null = null;

  const restoreWhenSettled = () => {
    const activeElement = document.activeElement;
    const activeHtmlElement = activeElement instanceof HTMLElement ? activeElement : null;
    const retryStillSettling = activeHtmlElement?.closest(REFRESH_STATUS_SELECTOR);
    const advisorMovedElsewhere =
      activeHtmlElement?.isConnected &&
      activeHtmlElement !== document.body &&
      activeHtmlElement !== document.documentElement &&
      activeHtmlElement !== previouslyFocused &&
      !retryStillSettling;
    if (advisorMovedElsewhere) {
      return;
    }

    const nextTarget = findPerformanceSourceControl(target);
    if (nextTarget && !retryStillSettling) {
      nextTarget.focus();
      previouslyFocused = nextTarget;
    }

    remainingFrames -= 1;
    if (remainingFrames > 0) {
      window.requestAnimationFrame(restoreWhenSettled);
    }
  };

  window.requestAnimationFrame(restoreWhenSettled);
}

function findPerformanceSourceControl(
  target: PerformanceSourceControlFocusTarget
): HTMLElement | null {
  const controlRegions = Array.from(
    document.querySelectorAll<HTMLElement>(SOURCE_CONTROL_REGION_SELECTOR)
  );

  if (target.kind === "field") {
    return findInRegions(controlRegions, '[aria-label]', (field) =>
      field.getAttribute("aria-label") === target.fieldLabel
    );
  }

  if (target.kind === "choice") {
    const choiceGroup = findInRegions(controlRegions, '[role="radiogroup"]', (group) =>
      group.getAttribute("aria-label") === target.groupLabel
    );
    return (
      Array.from(choiceGroup?.querySelectorAll<HTMLElement>('[role="radio"]') ?? []).find(
        (option) => option.textContent?.trim() === target.optionLabel
      ) ?? null
    );
  }

  return findInRegions(
    controlRegions,
    '[data-performance-window-control="true"]',
    () => true
  );
}

function findInRegions(
  regions: HTMLElement[],
  selector: string,
  predicate: (candidate: HTMLElement) => boolean
) {
  for (const region of regions) {
    const candidate = Array.from(region.querySelectorAll<HTMLElement>(selector)).find(predicate);
    if (candidate) {
      return candidate;
    }
  }
  return null;
}
