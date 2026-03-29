import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DeferredWorkbenchMount from "../../src/design-system/components/deferred-workbench-mount";

describe("DeferredWorkbenchMount", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps deferred content out of the initial render path", () => {
    vi.useFakeTimers();

    render(
      <DeferredWorkbenchMount placeholder={<div>Placeholder</div>}>
        <div>Deferred content</div>
      </DeferredWorkbenchMount>
    );

    expect(screen.getByText("Placeholder")).toBeInTheDocument();
    expect(screen.queryByText("Deferred content")).not.toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("Deferred content")).toBeInTheDocument();
    expect(screen.queryByText("Placeholder")).not.toBeInTheDocument();
  });

  it("resets deferred content when the guard turns off", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <DeferredWorkbenchMount when placeholder={<div>Placeholder</div>}>
        <div>Deferred content</div>
      </DeferredWorkbenchMount>
    );

    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByText("Deferred content")).toBeInTheDocument();

    rerender(
      <DeferredWorkbenchMount when={false} placeholder={<div>Placeholder</div>}>
        <div>Deferred content</div>
      </DeferredWorkbenchMount>
    );

    expect(screen.getByText("Placeholder")).toBeInTheDocument();
    expect(screen.queryByText("Deferred content")).not.toBeInTheDocument();
  });
});
