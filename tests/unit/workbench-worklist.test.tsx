import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";

import { WorkbenchWorklist } from "../../src/design-system";

const items = [
  { key: "action-1", title: "Review mandate" },
  { key: "action-2", title: "Confirm liquidity" },
] as const;

describe("WorkbenchWorklist", () => {
  it("returns focus from the decision to the source-selected record", () => {
    function ControlledWorklist() {
      const [selectedKey, setSelectedKey] =
        useState<(typeof items)[number]["key"]>("action-1");
      return (
        <WorkbenchWorklist
          ariaLabel="Advisor actions"
          relationshipIdBase="advisor-actions-focus-loop"
          title="Actions requiring review"
          items={items}
          selectedKey={selectedKey}
          onSelectionChange={setSelectedKey}
          decisionLabel="Selected advisor action"
          decision={<button type="button">Review evidence</button>}
        />
      );
    }

    render(<ControlledWorklist />);

    const secondOption = screen.getByRole("option", {
      name: /Confirm liquidity/,
    });
    fireEvent.keyDown(secondOption, { key: "Enter" });

    const decision = screen.getByRole("region", {
      name: "Selected advisor action",
    });
    expect(decision).toHaveFocus();
    expect(secondOption).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(decision, { key: "Escape" });
    expect(secondOption).toHaveFocus();
  });

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

  it("keeps multiple worklist title and decision relationships collision-free", () => {
    const { container } = render(
      <>
        <WorkbenchWorklist
          ariaLabel="Advisor actions"
          relationshipIdBase="advisor-actions-primary"
          title="Actions requiring review"
          items={items}
          selectedKey="action-1"
          onSelectionChange={() => undefined}
          decisionLabel="Selected advisor action"
          decision={<p>Mandate evidence</p>}
        />
        <WorkbenchWorklist
          ariaLabel="Portfolio actions"
          relationshipIdBase="portfolio-actions-secondary"
          title="Portfolio decisions"
          items={items}
          selectedKey="action-2"
          onSelectionChange={() => undefined}
          decisionLabel="Selected portfolio action"
          decision={<p>Liquidity evidence</p>}
        />
      </>,
    );

    const advisorWorklist = screen.getByRole("listbox", {
      name: "Advisor actions",
    });
    const advisorDecision = screen.getByRole("region", {
      name: "Selected advisor action",
    });
    const portfolioWorklist = screen.getByRole("listbox", {
      name: "Portfolio actions",
    });
    const portfolioDecision = screen.getByRole("region", {
      name: "Selected portfolio action",
    });

    expect(advisorDecision).toHaveAttribute(
      "id",
      "advisor-actions-primary-decision",
    );
    expect(portfolioDecision).toHaveAttribute(
      "id",
      "portfolio-actions-secondary-decision",
    );
    for (const option of within(advisorWorklist).getAllByRole("option")) {
      expect(option).toHaveAttribute(
        "aria-controls",
        "advisor-actions-primary-decision",
      );
    }
    for (const option of within(portfolioWorklist).getAllByRole("option")) {
      expect(option).toHaveAttribute(
        "aria-controls",
        "portfolio-actions-secondary-decision",
      );
    }

    const ids = [...container.querySelectorAll("[id]")].map(
      (element) => element.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
