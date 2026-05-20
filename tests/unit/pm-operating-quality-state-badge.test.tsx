import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PmOperatingQualityStateBadge from "../../src/features/workbench/components/pm-operating-quality-state-badge";

describe("PmOperatingQualityStateBadge", () => {
  it("renders private-banking state wording from the shared Manage state vocabulary", () => {
    render(<PmOperatingQualityStateBadge state="PENDING_REVIEW" />);

    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("supports bounded empty-detail labels without changing the upstream state tone", () => {
    render(<PmOperatingQualityStateBadge state="PENDING" label="No detail" />);

    expect(screen.getByText("No detail")).toBeInTheDocument();
  });
});
