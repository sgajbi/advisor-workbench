import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WorkbenchRecordSelector from "../../src/design-system/components/workbench-record-selector";

const items = [
  {
    key: "review-1",
    title: "Proposal one",
    subtitle: "Version 1",
    facts: [{ label: "Evidence", value: "Complete" }],
    nextAction: "Review suitability evidence.",
    sourceEvidence: {
      source: "suitability-review",
      identity: "review-1",
      state: "READY",
    },
  },
  {
    key: "review-2",
    title: "Proposal two",
    subtitle: "Version 2",
    facts: [{ label: "Evidence", value: "One gap" }],
    nextAction: "Request client consent.",
  },
] as const;

describe("WorkbenchRecordSelector", () => {
  it("exposes the reusable grid presentation without changing listbox semantics", () => {
    render(
      <WorkbenchRecordSelector
        ariaLabel="Proposal worklist"
        items={items}
        selectedKey="review-1"
        onSelectionChange={() => undefined}
        layout="grid"
      />,
    );

    expect(
      screen.getByRole("listbox", { name: "Proposal worklist" }),
    ).toHaveAttribute("data-layout", "grid");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("exposes a visible and semantic single-record selection", () => {
    render(
      <WorkbenchRecordSelector
        ariaLabel="Suitability reviews"
        items={[...items]}
        selectedKey="review-1"
        onSelectionChange={() => undefined}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(
      screen.getByRole("listbox", { name: "Suitability reviews" }),
    ).toBeInTheDocument();
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute(
      "data-source-render-row",
      "suitability-review",
    );
    expect(options[0]).toHaveAttribute("data-source", "suitability-review");
    expect(options[0]).toHaveAttribute("data-source-identity", "review-1");
    expect(options[0]).toHaveAttribute("data-source-state", "READY");
    expect(options[0]).toHaveTextContent("Selected");
    expect(
      options[0].querySelector("[data-workbench-record-facts]"),
    ).toHaveTextContent("EvidenceComplete");
    expect(options[1]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveTextContent("Review");
  });

  it("changes selection with pointer and vertical worklist keys", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <WorkbenchRecordSelector
        ariaLabel="Suitability reviews"
        items={[...items]}
        selectedKey="review-1"
        onSelectionChange={onSelectionChange}
      />,
    );

    const options = screen.getAllByRole("option");
    fireEvent.click(options[1]);
    expect(onSelectionChange).toHaveBeenLastCalledWith("review-2");

    rerender(
      <WorkbenchRecordSelector
        ariaLabel="Suitability reviews"
        items={[...items]}
        selectedKey="review-2"
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(onSelectionChange).toHaveBeenLastCalledWith("review-2");
    expect(options[1]).toHaveFocus();

    fireEvent.keyDown(options[1], { key: "Home" });
    expect(onSelectionChange).toHaveBeenLastCalledWith("review-1");
    expect(options[0]).toHaveFocus();
  });

  it("associates records with their decision and opens it from Enter", () => {
    const onSelectionChange = vi.fn();
    const onOpenDetail = vi.fn();

    render(
      <WorkbenchRecordSelector
        ariaLabel="Suitability reviews"
        items={[...items]}
        selectedKey="review-1"
        onSelectionChange={onSelectionChange}
        detailId="selected-suitability-review"
        onOpenDetail={onOpenDetail}
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute(
      "aria-controls",
      "selected-suitability-review",
    );

    fireEvent.keyDown(options[1], { key: "Enter" });
    expect(onSelectionChange).toHaveBeenCalledWith("review-2");
    expect(onOpenDetail).toHaveBeenCalledWith("review-2");
  });
});
