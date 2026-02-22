import { render, screen } from "@testing-library/react";
import PartialFailureBanner from "../../src/features/workbench/components/partial-failure-banner";

describe("PartialFailureBanner", () => {
  it("renders service errors", () => {
    render(
      <PartialFailureBanner
        items={[
          {
            source_service: "performance-intelligence-service",
            error_code: "UPSTREAM_TIMEOUT",
            detail: "timeout",
          },
        ]}
      />
    );

    expect(screen.getByText("Partial Data Warning")).toBeInTheDocument();
    expect(screen.getByText(/UPSTREAM_TIMEOUT/)).toBeInTheDocument();
  });
});
