import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SupportDetails from "../../src/design-system/components/support-details";

describe("SupportDetails", () => {
  it("keeps support evidence secondary behind a native disclosure", () => {
    render(
      <SupportDetails context="Source and contract evidence">
        <span>Exact source reference</span>
      </SupportDetails>,
    );

    const disclosure = screen.getByText("Support details").closest("details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(
      screen.getByText("Source and contract evidence"),
    ).toBeInTheDocument();
    expect(screen.getByText("Exact source reference")).toBeInTheDocument();
  });
});
