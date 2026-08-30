import { afterEach, describe, expect, it, vi } from "vitest";

import { restorePerformanceSourceControlFocus } from "../../src/apps/performance/components/performance-source-control-focus";

describe("restorePerformanceSourceControlFocus", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("restores Retry focus to the real Review window control", () => {
    const region = document.createElement("div");
    region.dataset.performanceSourceControlRegion = "true";
    const reviewWindow = document.createElement("button");
    reviewWindow.dataset.performanceWindowControl = "true";
    reviewWindow.textContent = "Review window";
    region.append(reviewWindow);
    document.body.append(region);

    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    restorePerformanceSourceControlFocus({ kind: "window" });
    frames.shift()?.(0);

    expect(reviewWindow).toHaveFocus();
  });
});
