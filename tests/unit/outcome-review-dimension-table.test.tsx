import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OutcomeReviewDimensionTable from "../../src/features/workbench/components/outcome-review-dimension-table";

describe("OutcomeReviewDimensionTable", () => {
  it("renders source-shaped outcome dimensions without exposing source identifiers", () => {
    render(
      <OutcomeReviewDimensionTable
        dimensions={[
          {
            key: "dimension-hidden-source-ref",
            dimension: "DRIFT_REDUCTION",
            expected: "1.2%",
            realized: "1.1%",
            variance: "-0.1%",
            state: "WITHIN_TOLERANCE",
            explanation: "Drift reduction achieved within tolerance.",
          },
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Outcome review dimensions" });
    expect(table).toHaveTextContent("Drift Reduction");
    expect(table).toHaveTextContent("1.2%");
    expect(table).toHaveTextContent("1.1%");
    expect(table).toHaveTextContent("-0.1%");
    expect(table).toHaveTextContent("Within expected tolerance");
    expect(table).not.toHaveTextContent("Within Tolerance");
    expect(screen.queryByText(/source_ref|content_hash|sha256|outcome_review_id/i)).not.toBeInTheDocument();
  });

  it("renders an empty dimension state without adding workflow controls", () => {
    render(<OutcomeReviewDimensionTable dimensions={[]} />);

    const table = screen.getByRole("table", { name: "Outcome review dimensions" });
    expect(table).toHaveTextContent("No dimension results returned");
    expect(table).toHaveTextContent(
      "The review exists, but no expected-versus-realised dimension rows are available.",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /client|communication|approval|delivery/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/order|OMS|execution|fill|settlement/i)).not.toBeInTheDocument();
  });
});
