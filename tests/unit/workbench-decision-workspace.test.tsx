import { render, screen } from "@testing-library/react";

import {
  WorkbenchDecisionWorkspace,
  WorkbenchRefreshStatus,
} from "../../src/design-system";

describe("WorkbenchDecisionWorkspace", () => {
  it("groups one worklist with one labelled decision region", () => {
    render(
      <WorkbenchDecisionWorkspace
        ariaLabel="Selected suitability decision"
        worklist={<p>Policy review worklist</p>}
        decision={<p>Selected policy evidence</p>}
      />,
    );

    expect(screen.getByText("Policy review worklist")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Selected suitability decision" }),
    ).toHaveTextContent("Selected policy evidence");
  });

  it("lets each workflow name its source retry accessibly", () => {
    render(
      <WorkbenchRefreshStatus
        kind="failed"
        eyebrow="Suitability evidence"
        title="Source refresh did not complete"
        message="Earlier evidence remains visible."
        requestedContext="Proposal P-2"
        confirmedContext="Proposal P-1"
        onRetry={() => undefined}
        retryLabel="Retry suitability evidence"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Retry suitability evidence" }),
    ).toBeInTheDocument();
  });
});
