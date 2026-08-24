import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { WorkbenchWorklist } from "../../src/design-system";

const items = [
  { key: "action-1", title: "Review mandate" },
  { key: "action-2", title: "Confirm liquidity" },
] as const;

describe("WorkbenchWorklist", () => {
  it("connects one business worklist to one keyboard-addressable decision", () => {
    const onSelectionChange = vi.fn();

    render(
      <WorkbenchWorklist
        ariaLabel="Advisor actions"
        relationshipIdBase="advisor-actions-test"
        title="Actions requiring review"
        items={items}
        selectedKey="action-1"
        onSelectionChange={onSelectionChange}
        decisionLabel="Selected advisor action"
        decision={<p>Mandate evidence</p>}
      />,
    );

    const decision = screen.getByRole("region", {
      name: "Selected advisor action",
    });
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-controls", decision.id);
    expect(options[1]).toHaveAttribute("aria-controls", decision.id);

    fireEvent.keyDown(options[1], { key: "Enter" });
    expect(onSelectionChange).toHaveBeenCalledWith("action-2");
    expect(decision).toHaveFocus();
  });

  it("keeps the selected business record stable when source order changes", () => {
    const { rerender } = render(
      <WorkbenchWorklist
        ariaLabel="Advisor actions"
        relationshipIdBase="advisor-actions-test"
        title="Actions requiring review"
        items={items}
        selectedKey="action-2"
        onSelectionChange={() => undefined}
        decisionLabel="Selected advisor action"
        decision={<p>Liquidity evidence</p>}
      />,
    );

    rerender(
      <WorkbenchWorklist
        ariaLabel="Advisor actions"
        relationshipIdBase="advisor-actions-test"
        title="Actions requiring review"
        items={[...items].reverse()}
        selectedKey="action-2"
        onSelectionChange={() => undefined}
        decisionLabel="Selected advisor action"
        decision={<p>Liquidity evidence</p>}
      />,
    );

    expect(
      screen.getByRole("option", { name: /Confirm liquidity/ }),
    ).toHaveAttribute("aria-selected", "true");
  });
});
