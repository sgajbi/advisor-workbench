import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewEvidenceGrid from "../../src/features/workbench/components/outcome-review-evidence-grid";

describe("OutcomeReviewEvidenceGrid", () => {
  it("renders available evidence posture without exposing source identifiers", () => {
    render(
      <OutcomeReviewEvidenceGrid
        expectedSnapshotHash="sha256:expected-hidden"
        realizedSnapshotHash="sha256:realized-hidden"
        proofPackId="proof-pack-hidden"
        readyEvidenceCount={3}
      />
    );

    const grid = screen.getByLabelText("Outcome review evidence availability");

    expect(grid).toHaveTextContent("Expected outcome Available");
    expect(grid).toHaveTextContent("Realised outcome Available");
    expect(grid).toHaveTextContent("Evidence pack Available");
    expect(grid).toHaveTextContent("Source evidence Available");
    expect(screen.queryByText(/sha256|proof-pack-hidden|source_ref|content_hash/i)).not.toBeInTheDocument();
  });

  it("renders partial evidence posture without workflow controls", () => {
    render(
      <OutcomeReviewEvidenceGrid
        expectedSnapshotHash="N/A"
        realizedSnapshotHash="sha256:realized-hidden"
        proofPackId="N/A"
        readyEvidenceCount={1}
      />
    );

    const grid = screen.getByLabelText("Outcome review evidence availability");

    expect(grid).toHaveTextContent("Expected outcome Not available");
    expect(grid).toHaveTextContent("Realised outcome Available");
    expect(grid).toHaveTextContent("Evidence pack Not available");
    expect(grid).toHaveTextContent("Source evidence Partial");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });

  it("does not overstate a complete absence of source evidence as partial", () => {
    render(
      <OutcomeReviewEvidenceGrid
        expectedSnapshotHash="N/A"
        realizedSnapshotHash="N/A"
        proofPackId="N/A"
        readyEvidenceCount={0}
      />
    );

    const grid = screen.getByLabelText("Outcome review evidence availability");

    expect(grid).toHaveTextContent("Source evidence Not available");
    expect(grid).not.toHaveTextContent("Source evidence Partial");
  });
});
