import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IntakeTaskSelector } from "@/features/intake/components/intake-task-selector";

describe("IntakeTaskSelector", () => {
  it("keeps every server-rendered task action native-disabled until client readiness", () => {
    const onSelect = vi.fn();
    render(<IntakeTaskSelector isReady={false} onSelect={onSelect} />);

    const actions = screen.getAllByRole("button");
    expect(actions).toHaveLength(6);
    for (const action of actions) {
      expect(action).toBeDisabled();
      fireEvent.click(action);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("enables one business action after client readiness and publishes the exact task", () => {
    const onSelect = vi.fn();
    render(<IntakeTaskSelector isReady onSelect={onSelect} />);

    const action = screen.getByRole("button", { name: /Create portfolio record/i });
    expect(action).toBeEnabled();
    fireEvent.click(action);
    expect(onSelect).toHaveBeenCalledWith("CREATE_PORTFOLIO");
  });
});
