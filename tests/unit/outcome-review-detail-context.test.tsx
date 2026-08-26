import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewDetailContext from "../../src/features/workbench/components/outcome-review-detail-context";

describe("OutcomeReviewDetailContext", () => {
  it("renders selected review timing and source-reference posture", () => {
    render(
      <OutcomeReviewDetailContext
        updatedAt="13 May 2026, 09:35 UTC"
        retentionUntil="31 Dec 2026"
        sourceReferenceCount={4}
      />,
    );

    const context = screen.getByLabelText("Selected review evidence status");

    expect(context).toHaveTextContent("Updated 13 May 2026, 09:35 UTC");
    expect(context).toHaveTextContent("Retained until 31 Dec 2026");
    expect(context).toHaveTextContent("4 source references");
  });

  it("keeps source lineage identifiers and unsupported workflow controls out of the row", () => {
    render(
      <OutcomeReviewDetailContext
        updatedAt="13 May 2026, 09:35 UTC"
        retentionUntil="31 Dec 2026"
        sourceReferenceCount={1}
      />,
    );

    expect(screen.queryByText(/source_ref|lineage|sha256|workflow_pack|run_id/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client|communication|approval|delivery/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
